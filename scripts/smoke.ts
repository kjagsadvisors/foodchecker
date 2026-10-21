/**
 * End-to-end smoke test against a running server: lists tools, reads the widget,
 * and calls each tool with real Open Food Facts data.
 *   npm run dev            (in one terminal)
 *   npm run smoke          (in another; MCP_URL overrides the target)
 */
import { Client, StreamableHTTPClientTransport } from "@modelcontextprotocol/client";

const url = new URL(process.env.MCP_URL ?? "http://localhost:3000/mcp");
const client = new Client({ name: "foodchecker-smoke", version: "0.0.0" });
await client.connect(new StreamableHTTPClientTransport(url));

const { tools } = await client.listTools();
console.log("tools:", tools.map((t) => `${t.name} -> ${JSON.stringify((t._meta as any)?.ui)}`).join("\n       "));

const { resources } = await client.listResources();
const widget = await client.readResource({ uri: resources[0].uri });
const c = widget.contents[0] as { mimeType?: string; text?: string; _meta?: unknown };
console.log("widget:", resources[0].uri, c.mimeType, `${c.text?.length} chars`, JSON.stringify(c._meta).slice(0, 120));

async function call(name: string, args: Record<string, unknown>) {
  const t0 = Date.now();
  const res = await client.callTool({ name, arguments: args });
  const text = (res.content as { type: string; text: string }[]).map((b) => b.text).join("\n");
  console.log(`\n=== ${name} ${JSON.stringify(args)} (${Date.now() - t0} ms)${res.isError ? " ERROR" : ""}\n${text}`);
  return res;
}

const barcodes = (process.env.BARCODES ?? "5449000000996,3017620422003").split(",");
for (const b of barcodes) await call("check_food", { barcode: b });
await call("check_food", { query: process.env.QUERY ?? "fage total greek yogurt" });
await call("analyze_label", {
  product_name: "Pasted label",
  ingredients_text: "Whole grain oats, sugar, corn starch, honey, brown sugar syrup, salt, tripotassium phosphate, canola oil, natural almond flavor, vitamin E (mixed tocopherols)",
  nutrition: { basis: "per_serving", serving_size: 37, calories_kcal: 140, total_fat_g: 2, saturated_fat_g: 0.5, sodium_mg: 190, carbohydrates_g: 30, fiber_g: 3, sugars_g: 12, protein_g: 3 },
});
await call("explain_additive", { additive: "Red 40" });
await call("find_healthier_alternatives", { barcode: barcodes[0], limit: 3 });
await client.close();
