/** MCP server: four read-only tools plus the score-card UI resource. Works in ChatGPT and Claude. */
import { RESOURCE_MIME_TYPE, registerAppResource, registerAppTool } from "@modelcontextprotocol/ext-apps/server";
import { McpServer, type CallToolResult } from "@modelcontextprotocol/server";
import { z } from "zod";
import { additiveLine, productText } from "./format.js";
import { WIDGET_URI, widgetHtml } from "./widget.js";
import { PUBLIC_URL } from "../config.js";
import { UserFacingError, analyzeLabel, checkFood, explainAdditive, findAlternatives, type ProductView } from "../service.js";

export const VERSION = "0.1.0";

const INSTRUCTIONS = `FoodChecker rates packaged food and drinks from 0 to 100 (Excellent 75+, Good 50-74, Poor 25-49, Bad 0-24).
The score starts from nutrition quality (Nutri-Score 2023), then takes a percentage off for risky additives and ultra-processing (NOVA). High-risk additives or trans fat cap the score at 49.
- Barcode or product name: call check_food.
- Photo of a label, or pasted ingredients and nutrition facts: transcribe them and call analyze_label. If the photo only shows a barcode, read the digits and call check_food.
- "What can I buy instead?": call find_healthier_alternatives with the barcode.
- Questions about a specific additive (E-number or name): call explain_additive.
When you answer, lead with the score and rating, then the two or three biggest reasons. The card already shows the full breakdown, so don't repeat all of it. Never invent a score; only report what the tools return. This is general information, not medical advice. Mention that briefly when the user has a health condition.`;

function uiMeta(invoking: string, invoked: string) {
  return {
    ui: { resourceUri: WIDGET_URI },
    "openai/outputTemplate": WIDGET_URI,
    "openai/toolInvocation/invoking": invoking,
    "openai/toolInvocation/invoked": invoked,
  };
}

const READ_ONLY = { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: true } as const;

const ORIGIN = new URL(PUBLIC_URL).origin;
// Product photos are proxied through our own origin (see /img in app.ts), so the widget loads nothing from third parties.
const RESOURCE_DOMAINS = [ORIGIN];
// Links the widget may open: the product's Open Food Facts page and our own site.
const LINK_DOMAINS = ["https://world.openfoodfacts.org", ORIGIN];

export interface ServerOptions {
  /**
   * ChatGPT requires `_meta.ui.domain` (an https origin) for directory review, while Claude
   * rejects any value that isn't its own hashed sandbox domain. The /chatgpt/mcp endpoint sets it;
   * /mcp leaves it out so the widget renders everywhere else.
   */
  chatgpt?: boolean;
}

function ok(text: string, structuredContent: Record<string, unknown>): CallToolResult {
  return { content: [{ type: "text", text }], structuredContent };
}

function fail(e: unknown): CallToolResult {
  const message = e instanceof UserFacingError ? e.message : "Something went wrong while checking this product. Please try again.";
  if (!(e instanceof UserFacingError)) console.error(e);
  return { isError: true, content: [{ type: "text", text: message }] };
}

function productResult(view: ProductView): CallToolResult {
  let text = productText(view);
  if (view.otherMatches?.length) {
    text += `\nOther matches for this search: ${view.otherMatches
      .map((m) => `${m.name}${m.brand ? ` (${m.brand})` : ""} ${m.score ?? "?"}/100, barcode ${m.barcode}`)
      .join("; ")}.`;
  }
  return ok(text, view as unknown as Record<string, unknown>);
}

const nutritionSchema = z
  .object({
    basis: z
      .enum(["per_100g", "per_serving"])
      .describe("What the numbers refer to. EU labels are usually per 100 g/ml; US Nutrition Facts are per serving."),
    serving_size: z.number().positive().optional().describe("Serving size in g (or ml for drinks). Required when basis is per_serving."),
    calories_kcal: z.number().nonnegative().optional(),
    energy_kj: z.number().nonnegative().optional(),
    total_fat_g: z.number().nonnegative().optional(),
    saturated_fat_g: z.number().nonnegative().optional(),
    trans_fat_g: z.number().nonnegative().optional(),
    carbohydrates_g: z.number().nonnegative().optional(),
    sugars_g: z.number().nonnegative().optional().describe("Total sugars."),
    added_sugars_g: z.number().nonnegative().optional(),
    fiber_g: z.number().nonnegative().optional(),
    protein_g: z.number().nonnegative().optional(),
    salt_g: z.number().nonnegative().optional(),
    sodium_mg: z.number().nonnegative().optional().describe("Sodium in milligrams (US labels). Use salt_g instead if the label shows salt."),
  })
  .describe("The nutrition facts table, copied exactly.");

export function createServer(options: ServerOptions = {}): McpServer {
  const server = new McpServer(
    {
      name: "foodchecker",
      version: VERSION,
      title: "FoodChecker",
      websiteUrl: PUBLIC_URL,
      icons: [
        { src: `${PUBLIC_URL}/icon-512.png`, mimeType: "image/png", sizes: ["512x512"] },
        { src: `${PUBLIC_URL}/icon.svg`, mimeType: "image/svg+xml", sizes: ["any"] },
      ],
    },
    { instructions: INSTRUCTIONS },
  );

  registerAppResource(
    server,
    "FoodChecker score card",
    WIDGET_URI,
    { description: "Interactive health score card for a food product." },
    async () => ({
      contents: [
        {
          uri: WIDGET_URI,
          mimeType: RESOURCE_MIME_TYPE,
          text: widgetHtml(),
          _meta: {
            ui: {
              csp: { resourceDomains: RESOURCE_DOMAINS, connectDomains: [] },
              prefersBorder: false,
              ...(options.chatgpt ? { domain: process.env.CHATGPT_WIDGET_DOMAIN ?? ORIGIN } : {}),
            },
            "openai/widgetDescription":
              "Shows the product's 0-100 health score, rating, Nutri-Score, processing level, additives with risk levels, and healthier alternatives.",
            "openai/widgetPrefersBorder": false,
            "openai/widgetCSP": { resource_domains: RESOURCE_DOMAINS, connect_domains: [], redirect_domains: LINK_DOMAINS },
          },
        },
      ],
    }),
  );

  registerAppTool(
    server,
    "check_food",
    {
      title: "Check a food product",
      description:
        "Check how healthy a packaged food or drink is. Looks it up in Open Food Facts (3M+ products) by barcode or by name, and returns a 0-100 health score (Excellent / Good / Poor / Bad) with the reasons: nutrition (Nutri-Score), additives and their risk level, and how processed it is. Use this whenever the user asks whether a food is healthy, mentions a product, or gives a barcode. Prefer the barcode when you have it.",
      inputSchema: z.object({
        // Coerced: clients and models sometimes send the digits as a number.
        barcode: z.coerce.string().optional().describe("EAN/UPC barcode digits, e.g. 3017620422003."),
        query: z.string().optional().describe("Product name, ideally with the brand, e.g. 'Nutella hazelnut spread'. Used when there is no barcode."),
        country: z.string().optional().describe("Optional country to prefer when searching by name, e.g. 'united-states', 'france', 'united-kingdom'."),
      }),
      annotations: { ...READ_ONLY, title: "Check a food product" },
      _meta: uiMeta("Checking the product…", "Product checked"),
    },
    async (args) => {
      try {
        return productResult(await checkFood(args));
      } catch (e) {
        return fail(e);
      }
    },
  );

  registerAppTool(
    server,
    "analyze_label",
    {
      title: "Score a food from its label",
      description:
        "Score a food from its label when the user shares a photo of the packaging or pastes the ingredient list and nutrition facts (also for products that aren't in the database). Transcribe the ingredient list word for word, including E-numbers and words in brackets, and copy the nutrition facts table. For US labels use basis 'per_serving' with the serving size in grams. Pass whatever is legible; the tool reports what is missing.",
      inputSchema: z.object({
        product_name: z.string().optional(),
        brand: z.string().optional(),
        ingredients_text: z.string().optional().describe("The full ingredient list exactly as printed."),
        nutrition: nutritionSchema.optional(),
        is_drink: z.boolean().optional().describe("True for beverages (milk and plant drinks included). Values are then per 100 ml."),
        category: z
          .enum(["general", "beverage", "water", "cheese", "fat_oil_nuts_seeds", "red_meat"])
          .optional()
          .describe("Nutri-Score family. Use fat_oil_nuts_seeds for oils, butter, nuts and nut butters; cheese for cheese; red_meat for beef, pork or lamb products."),
        fruit_veg_percent: z.number().min(0).max(100).optional().describe("% of fruit, vegetables and legumes, if the label states it."),
      }),
      annotations: { ...READ_ONLY, openWorldHint: false, title: "Score a food from its label" },
      _meta: uiMeta("Reading the label…", "Label scored"),
    },
    async (args) => {
      try {
        if (!args.ingredients_text && !args.nutrition) {
          throw new UserFacingError("I need the ingredient list or the nutrition facts from the label to score it.");
        }
        return productResult(analyzeLabel(args));
      } catch (e) {
        return fail(e);
      }
    },
  );

  registerAppTool(
    server,
    "find_healthier_alternatives",
    {
      title: "Find healthier alternatives",
      description:
        "Find similar products (same category in Open Food Facts) that score clearly higher than the given product. Use it when the user asks what to buy instead, or after a product scores Poor or Bad.",
      inputSchema: z.object({
        barcode: z.coerce.string().describe("Barcode of the product to beat."),
        country: z.string().optional().describe("Only suggest products sold in this country, e.g. 'united-states'."),
        limit: z.number().int().min(1).max(10).optional(),
      }),
      annotations: { ...READ_ONLY, title: "Find healthier alternatives" },
      _meta: uiMeta("Finding healthier options…", "Alternatives found"),
    },
    async (args) => {
      try {
        const view = await findAlternatives(args);
        const text = view.items.length
          ? [
              `${view.title}. ${view.subtitle}`,
              ...view.items.map((it, i) => `${i + 1}. ${it.name}${it.brand ? ` (${it.brand})` : ""}: ${it.score}/100, barcode ${it.barcode}`),
              "Data from Open Food Facts (ODbL).",
            ].join("\n")
          : view.emptyMessage ?? "No alternatives found.";
        return ok(text, view as unknown as Record<string, unknown>);
      } catch (e) {
        return fail(e);
      }
    },
  );

  registerAppTool(
    server,
    "explain_additive",
    {
      title: "Explain a food additive",
      description: "Explain what a food additive is, what it does, and its risk level, by E-number (E250) or name (sodium nitrite, Red 40, carrageenan).",
      inputSchema: z.object({ additive: z.string().describe("E-number or name, e.g. 'E471' or 'Red 40'.") }),
      annotations: { ...READ_ONLY, openWorldHint: false, title: "Explain a food additive" },
      _meta: uiMeta("Looking up the additive…", "Additive explained"),
    },
    async (args) => {
      try {
        const view = explainAdditive(args);
        return ok(additiveLine(view.additive), view as unknown as Record<string, unknown>);
      } catch (e) {
        return fail(e);
      }
    },
  );

  return server;
}
