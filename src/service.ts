/** The four things FoodChecker can do, independent of any transport. */
import { findAdditive } from "./core/additives.js";
import { scoreProduct } from "./core/score.js";
import type { AdditiveInfo, FoodCategory, NutriGrade, Nutrition, ProductInput, ScoredProduct } from "./core/types.js";
import { OffError, cleanBarcode, fetchProduct, mostSpecificCategories, searchProducts, toProductInput, type OffProduct } from "./off/client.js";

export interface ListItem {
  barcode?: string;
  name: string;
  brand?: string;
  quantity?: string;
  imageUrl?: string;
  score: number | null;
  rating: ScoredProduct["result"]["rating"];
  nutriGrade: NutriGrade | null;
  novaGroup: number | null;
}

export type ProductView = { kind: "product" } & ScoredProduct & { otherMatches?: ListItem[] };
export type ListView = { kind: "list"; title: string; subtitle?: string; emptyMessage?: string; items: ListItem[] };
export type AdditiveView = { kind: "additive"; additive: AdditiveInfo };

export class UserFacingError extends Error {}

function toItem(sp: ScoredProduct): ListItem {
  return {
    barcode: sp.product.barcode,
    name: sp.product.name,
    brand: sp.product.brand,
    quantity: sp.product.quantity,
    imageUrl: sp.product.imageUrl,
    score: sp.result.score,
    rating: sp.result.rating,
    nutriGrade: sp.result.nutrition.grade,
    novaGroup: sp.result.processing.novaGroup,
  };
}

/** How complete a search hit is, so the best-documented match wins among the top results. */
function completeness(p: OffProduct): number {
  let c = 0;
  if (p.product_name) c += 1;
  if (/^[a-e]$/.test(p.nutriscore_grade ?? "")) c += 3;
  else if (p.nutriments && ["sugars_100g", "saturated-fat_100g", "salt_100g"].every((k) => k in p.nutriments!)) c += 2;
  if (p.ingredients_text || p.ingredients_text_en || p.ingredients_tags?.length) c += 1;
  if (p.nova_group) c += 1;
  if (p.image_front_url || p.image_front_small_url) c += 0.5;
  return c;
}

export async function checkFood(args: { barcode?: string; query?: string; country?: string }): Promise<ProductView> {
  try {
    if (args.barcode && cleanBarcode(args.barcode).length >= 6) {
      const p = await fetchProduct(args.barcode);
      if (!p) {
        throw new UserFacingError(
          `Barcode ${cleanBarcode(args.barcode)} is not in Open Food Facts yet. Share a photo of the ingredient list and nutrition facts and I can score it from the label.`,
        );
      }
      return { kind: "product", ...scoreProduct(toProductInput(p)) };
    }
    const query = args.query?.trim();
    if (!query) throw new UserFacingError("Give me a barcode or a product name to look up.");
    const hits = await searchProducts(query, { limit: 10, country: args.country });
    if (!hits.length) {
      throw new UserFacingError(`No products found for "${query}". Try the brand plus product name, or share a photo of the label.`);
    }
    // Search order is relevance; break near-ties in favour of products with real data.
    const best = hits
      .slice(0, 6)
      .map((h, i) => ({ h, rank: completeness(h) - i * 0.3 }))
      .sort((x, y) => y.rank - x.rank)[0].h;
    const full = (best.code && (await fetchProduct(best.code).catch(() => null))) || best;
    const others = hits
      .filter((h) => h.code !== best.code && h.product_name)
      .slice(0, 4)
      .map((h) => toItem(scoreProduct(toProductInput(h))));
    return { kind: "product", ...scoreProduct(toProductInput(full)), otherMatches: others };
  } catch (e) {
    throw e instanceof OffError ? new UserFacingError(e.message) : e;
  }
}

export interface LabelArgs {
  product_name?: string;
  brand?: string;
  ingredients_text?: string;
  is_drink?: boolean;
  category?: Exclude<FoodCategory, "beverage" | "water"> | "beverage" | "water";
  fruit_veg_percent?: number;
  nutrition?: {
    basis?: "per_100g" | "per_serving";
    serving_size?: number;
    calories_kcal?: number;
    energy_kj?: number;
    total_fat_g?: number;
    saturated_fat_g?: number;
    trans_fat_g?: number;
    carbohydrates_g?: number;
    sugars_g?: number;
    added_sugars_g?: number;
    fiber_g?: number;
    protein_g?: number;
    salt_g?: number;
    sodium_mg?: number;
  };
}

export function analyzeLabel(args: LabelArgs): ProductView {
  const notes: string[] = [];
  let nutrition: Nutrition | undefined;
  const n = args.nutrition;
  if (n) {
    let factor = 1;
    if (n.basis === "per_serving") {
      if (n.serving_size && n.serving_size > 0) factor = 100 / n.serving_size;
      else notes.push("serving size (needed to convert per-serving values to per 100 g)");
    }
    if (!notes.length) {
      const f = (v: number | undefined) => (v === undefined ? undefined : v * factor);
      nutrition = {
        energyKcal: f(n.calories_kcal),
        energyKj: f(n.energy_kj),
        fat: f(n.total_fat_g),
        saturatedFat: f(n.saturated_fat_g),
        transFat: f(n.trans_fat_g),
        carbohydrates: f(n.carbohydrates_g),
        sugars: f(n.sugars_g),
        addedSugars: f(n.added_sugars_g),
        fiber: f(n.fiber_g),
        proteins: f(n.protein_g),
        salt: f(n.salt_g),
        sodium: n.sodium_mg === undefined ? undefined : f(n.sodium_mg / 1000),
        fruitsVegLegumesPercent: args.fruit_veg_percent,
      };
    }
  }
  const category: FoodCategory = args.category ?? (args.is_drink ? "beverage" : "general");
  const input: ProductInput = {
    source: "label",
    name: args.product_name,
    brand: args.brand,
    category,
    nutrition,
    ingredientsText: args.ingredients_text,
  };
  const scored = scoreProduct(input);
  scored.result.missing.push(...notes);
  if (nutrition?.transFat && nutrition.transFat > 0.5 && !scored.result.flags.some((f) => f.id === "trans_fat")) {
    scored.result.flags.push({
      id: "trans_fat_label",
      label: "Trans fat on the label",
      severity: "warning",
      detail: "The label declares trans fat. Industrial trans fat raises LDL cholesterol; natural trans fat in dairy and meat is less of a concern.",
    });
  }
  return { kind: "product", ...scored };
}

export async function findAlternatives(args: { barcode: string; country?: string; limit?: number }): Promise<ListView> {
  const limit = Math.min(args.limit ?? 5, 10);
  let p: OffProduct | null;
  try {
    p = await fetchProduct(args.barcode);
  } catch (e) {
    throw e instanceof OffError ? new UserFacingError(e.message) : e;
  }
  if (!p) throw new UserFacingError(`Barcode ${cleanBarcode(args.barcode)} is not in Open Food Facts, so I can't look for similar products.`);
  const base = scoreProduct(toProductInput(p));
  const baseScore = base.result.score ?? 0;
  const seen = new Set([p.code]);
  const better: ScoredProduct[] = [];
  let usedCategory = "";

  // Same or better Nutri-Score than the product (for an E product that is a-e, since additives can still differ).
  const grades = "abcde".slice(0, "abcde".indexOf(base.result.nutrition.grade ?? "c") + 1).split("");
  for (const cat of mostSpecificCategories(p).slice(0, 3)) {
    let hits: OffProduct[] = [];
    try {
      hits = await searchProducts("", {
        filter: `categories_tags:"${cat}" AND nutriscore_grade:(${grades.join(" OR ")})`,
        country: args.country,
        limit: 40,
        sortByPopularity: true,
      });
    } catch (e) {
      if (better.length) break;
      throw e instanceof OffError ? new UserFacingError(e.message) : e;
    }
    for (const h of hits) {
      // Without an ingredient list we can't see additives, so the score would look better than it is.
      if (!h.code || seen.has(h.code) || !h.product_name || !(h.ingredients_text || h.ingredients_tags?.length)) continue;
      seen.add(h.code);
      const sp = scoreProduct(toProductInput(h));
      if (sp.result.score !== null && sp.result.score >= baseScore + 5) better.push(sp);
    }
    if (better.length && !usedCategory) usedCategory = cat;
    if (better.length >= limit) break;
  }

  better.sort((a, b) => (b.result.score ?? 0) - (a.result.score ?? 0));
  const catName = usedCategory.replace(/^en:/, "").replace(/-/g, " ");
  return {
    kind: "list",
    title: `Healthier than ${base.product.name}`,
    subtitle: `Current: ${base.result.score ?? "?"}/100. Similar products${catName ? ` in "${catName}"` : ""}, best first.`,
    emptyMessage: "No clearly healthier products found in the same category yet.",
    items: better.slice(0, limit).map(toItem),
  };
}

export function explainAdditive(args: { additive: string }): AdditiveView {
  const hit = findAdditive(args.additive);
  if (!hit) throw new UserFacingError(`I don't have "${args.additive}" in the additive table yet. Try its E-number (for example E471).`);
  return { kind: "additive", additive: hit };
}
