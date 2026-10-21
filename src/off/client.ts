/**
 * Open Food Facts client. Data is © Open Food Facts contributors, ODbL 1.0.
 *
 * OFF asks every app to send a descriptive User-Agent and to stay under
 * 100 product reads/min and 10 searches/min, so responses are cached in memory.
 */
import { hasCoreNutrition } from "../core/nutriscore.js";
import type { FoodCategory, NovaGroup, NutriGrade, Nutrition, ProductInput } from "../core/types.js";

const PRODUCT_API = "https://world.openfoodfacts.org/api/v2/product";
const SEARCH_API = "https://search.openfoodfacts.org/search";
const USER_AGENT =
  process.env.OFF_USER_AGENT ?? "FoodChecker/0.1.0 (https://github.com/kjagsadvisors/foodchecker)";

const PRODUCT_FIELDS = [
  "code",
  "product_name",
  "product_name_en",
  "generic_name",
  "brands",
  "quantity",
  "image_front_url",
  "image_front_small_url",
  "ingredients_text",
  "ingredients_text_en",
  "additives_tags",
  "ingredients_tags",
  "nova_group",
  "nutriscore_grade",
  "nutriscore_score",
  "nutriscore",
  "nutriments",
  "nutrition_data_per",
  "labels_tags",
  "categories_tags",
  "allergens_tags",
  "countries_tags",
].join(",");

// The search index has no ingredient text, additive tags or 2023 Nutri-Score object.
// Additives are recovered from ingredients_tags, and nutriscore_data gives the product family.
const SEARCH_FIELDS = PRODUCT_FIELDS.replace(",nutriscore,", ",nutriscore_data,");

export interface OffProduct {
  code?: string;
  product_name?: string;
  product_name_en?: string;
  generic_name?: string;
  brands?: string | string[];
  quantity?: string;
  image_front_url?: string;
  image_front_small_url?: string;
  ingredients_text?: string;
  ingredients_text_en?: string;
  additives_tags?: string[];
  ingredients_tags?: string[];
  nova_group?: number | string;
  nutriscore_grade?: string;
  nutriscore_score?: number;
  nutriscore?: Record<string, { grade?: string; score?: number; nutriscore_applicable?: number; data?: Record<string, unknown> }>;
  /** Search index only: older Nutri-Score inputs, including the product family flags. */
  nutriscore_data?: Record<string, unknown>;
  nutriments?: Record<string, number | string>;
  labels_tags?: string[];
  categories_tags?: string[];
  allergens_tags?: string[];
  countries_tags?: string[];
}

class TtlCache<V> {
  private store = new Map<string, { value: V; expires: number }>();
  constructor(private ttlMs: number, private max = 2000) {}
  get(key: string): V | undefined {
    const hit = this.store.get(key);
    if (!hit) return undefined;
    if (hit.expires < Date.now()) {
      this.store.delete(key);
      return undefined;
    }
    return hit.value;
  }
  set(key: string, value: V) {
    if (this.store.size >= this.max) this.store.delete(this.store.keys().next().value!);
    this.store.set(key, { value, expires: Date.now() + this.ttlMs });
  }
}

const productCache = new TtlCache<OffProduct | null>(12 * 60 * 60 * 1000);
const searchCache = new TtlCache<OffProduct[]>(60 * 60 * 1000);

export class OffError extends Error {}

async function getJson(url: string): Promise<unknown> {
  const res = await fetch(url, {
    headers: { "User-Agent": USER_AGENT, Accept: "application/json" },
    signal: AbortSignal.timeout(10_000),
  });
  if (res.status === 404) return null;
  if (res.status === 429) throw new OffError("Open Food Facts is rate-limiting requests right now. Try again in a minute.");
  if (!res.ok) throw new OffError(`Open Food Facts returned HTTP ${res.status}.`);
  const type = res.headers.get("content-type") ?? "";
  if (!type.includes("json")) throw new OffError("Open Food Facts is temporarily unavailable.");
  return res.json();
}

export function cleanBarcode(raw: string): string {
  return raw.replace(/\D/g, "");
}

export async function fetchProduct(barcode: string): Promise<OffProduct | null> {
  const code = cleanBarcode(barcode);
  if (code.length < 6) throw new OffError(`"${barcode}" does not look like a barcode.`);
  const cached = productCache.get(code);
  if (cached !== undefined) return cached;
  const data = (await getJson(`${PRODUCT_API}/${code}?fields=${PRODUCT_FIELDS}`)) as
    | { status?: number; product?: OffProduct }
    | null;
  const product = data && data.status === 1 && data.product ? data.product : null;
  productCache.set(code, product);
  return product;
}

export interface SearchOptions {
  limit?: number;
  /** Extra Lucene-style filter, e.g. `categories_tags:"en:colas"`. */
  filter?: string;
  /** Country name as used by OFF, e.g. "united-states", "france". */
  country?: string;
  sortByPopularity?: boolean;
}

export async function searchProducts(query: string, opts: SearchOptions = {}): Promise<OffProduct[]> {
  const parts = [query.trim() ? query.trim() : undefined, opts.filter, opts.country ? `countries_tags:"en:${slug(opts.country)}"` : undefined].filter(
    Boolean,
  );
  const q = parts.length > 1 ? parts.map((p) => `(${p})`).join(" AND ") : parts[0] ?? "";
  const params = new URLSearchParams({
    q,
    page_size: String(Math.min(opts.limit ?? 10, 50)),
    fields: SEARCH_FIELDS,
  });
  if (opts.sortByPopularity) params.set("sort_by", "-unique_scans_n");
  const url = `${SEARCH_API}?${params}`;
  const cached = searchCache.get(url);
  if (cached) return cached;
  const data = (await getJson(url)) as { hits?: OffProduct[] } | null;
  const hits = data?.hits ?? [];
  searchCache.set(url, hits);
  return hits;
}

function slug(s: string): string {
  return s
    .toLowerCase()
    .replace(/^en:/, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

// ---------- Normalisation into the scorer's input ----------

const num = (v: unknown): number | undefined => {
  const n = typeof v === "string" ? Number.parseFloat(v) : typeof v === "number" ? v : NaN;
  return Number.isFinite(n) ? n : undefined;
};

export function nutritionFromOff(nm: OffProduct["nutriments"]): Nutrition | undefined {
  if (!nm) return undefined;
  const n: Nutrition = {
    energyKj: num(nm["energy-kj_100g"]) ?? num(nm["energy_100g"]),
    energyKcal: num(nm["energy-kcal_100g"]),
    fat: num(nm["fat_100g"]),
    saturatedFat: num(nm["saturated-fat_100g"]),
    transFat: num(nm["trans-fat_100g"]),
    carbohydrates: num(nm["carbohydrates_100g"]),
    sugars: num(nm["sugars_100g"]),
    addedSugars: num(nm["added-sugars_100g"]),
    fiber: num(nm["fiber_100g"]),
    proteins: num(nm["proteins_100g"]),
    salt: num(nm["salt_100g"]),
    sodium: num(nm["sodium_100g"]),
    fruitsVegLegumesPercent:
      num(nm["fruits-vegetables-legumes-estimate-from-ingredients_100g"]) ??
      num(nm["fruits-vegetables-nuts-estimate-from-ingredients_100g"]),
  };
  const defined = Object.values(n).some((v) => v !== undefined);
  return defined ? n : undefined;
}

export function categoryFromOff(p: OffProduct): FoodCategory {
  const flags = p.nutriscore?.["2023"]?.data;
  if (flags) {
    if (flags.is_water) return "water";
    if (flags.is_beverage) return "beverage";
    if (flags.is_cheese) return "cheese";
    if (flags.is_fat_oil_nuts_seeds) return "fat_oil_nuts_seeds";
    if (flags.is_red_meat_product) return "red_meat";
    return "general";
  }
  const old = p.nutriscore_data;
  if (old?.is_water) return "water";
  if (old?.is_beverage) return "beverage";
  if (old?.is_cheese) return "cheese";
  const tags = new Set(p.categories_tags ?? []);
  const has = (...t: string[]) => t.some((x) => tags.has(x));
  if (has("en:waters", "en:spring-waters", "en:mineral-waters") && !has("en:flavored-waters", "en:sweetened-beverages")) return "water";
  if (has("en:beverages", "en:milks", "en:plant-based-milks") && !has("en:alcoholic-beverages")) return "beverage";
  if (has("en:cheeses")) return "cheese";
  if (has("en:fats", "en:vegetable-oils", "en:olive-oils", "en:nuts", "en:seeds", "en:butters", "en:margarines", "en:nut-butters", "en:peanut-butters"))
    return "fat_oil_nuts_seeds";
  if ([...tags].some((t) => /^en:(beef|pork|veal|lamb|mutton|bacons?|hams?|salamis?|chorizos?)\b/.test(t))) return "red_meat";
  return "general";
}

function officialGrade(p: OffProduct, nutrition: Nutrition | undefined): { grade: NutriGrade; score?: number } | undefined {
  // Search hits may carry a grade from the 2021 algorithm; prefer computing it ourselves when we can.
  if (!p.nutriscore && hasCoreNutrition(nutrition)) return undefined;
  const v2023 = p.nutriscore?.["2023"];
  const g = (v2023?.grade ?? p.nutriscore_grade ?? "").toLowerCase();
  if (!/^[a-e]$/.test(g)) return undefined;
  return { grade: g as NutriGrade, score: num(v2023?.score) ?? num(p.nutriscore_score) };
}

const NOT_APPLICABLE_CATEGORIES = ["en:alcoholic-beverages", "en:baby-foods", "en:baby-milks", "en:dietary-supplements"];

export function toProductInput(p: OffProduct): ProductInput {
  const brand = Array.isArray(p.brands) ? p.brands.join(", ") : p.brands;
  const nova = num(p.nova_group);
  const grade = (p.nutriscore?.["2023"]?.grade ?? p.nutriscore_grade ?? "").toLowerCase();
  // nutriscore_applicable is also 0 when OFF simply lacks data, so only trust the explicit grade.
  const notApplicable =
    grade === "not-applicable" || (p.categories_tags ?? []).some((t) => NOT_APPLICABLE_CATEGORIES.includes(t));
  const nutrition = nutritionFromOff(p.nutriments);
  const tags = p.ingredients_tags ?? [];
  const tagText = tags.length ? tags.map((t) => t.replace(/^[a-z]{2}:/, "").replace(/-/g, " ")).join(", ") : undefined;
  const additiveCodes = p.additives_tags ?? tags.filter((t) => /^en:e\d{3,4}[a-z]*$/.test(t));
  return {
    source: "openfoodfacts",
    barcode: p.code,
    name: p.product_name_en || p.product_name || p.generic_name,
    brand: brand?.split(",")[0]?.trim() || undefined,
    quantity: p.quantity,
    imageUrl: p.image_front_url || p.image_front_small_url,
    url: p.code ? `https://world.openfoodfacts.org/product/${p.code}` : undefined,
    category: categoryFromOff(p),
    nutrition,
    ingredientsText: p.ingredients_text_en || p.ingredients_text || tagText,
    additiveCodes,
    novaGroup: nova && nova >= 1 && nova <= 4 ? (nova as NovaGroup) : undefined,
    officialNutriScore: notApplicable ? undefined : officialGrade(p, nutrition),
    nutriScoreNotApplicable: notApplicable || undefined,
    labels: (p.labels_tags ?? []).filter((t) => t.startsWith("en:")).map(tagLabel).slice(0, 8),
    allergens: (p.allergens_tags ?? []).map(tagLabel),
    categories: p.categories_tags,
  };
}

function tagLabel(tag: string): string {
  const s = tag.replace(/^[a-z]{2}:/, "").replace(/-/g, " ");
  return s.charAt(0).toUpperCase() + s.slice(1);
}

/** Most specific English category, used to look for alternatives. */
export function mostSpecificCategories(p: OffProduct): string[] {
  // Some records carry unnormalised tags such as "en:Pâtes à tartiner"; the search index only knows slugs.
  return (p.categories_tags ?? []).filter((t) => /^en:[a-z0-9-]+$/.test(t)).reverse();
}
