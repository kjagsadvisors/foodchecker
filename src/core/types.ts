/** Nutri-Score 2023 product families. They change the thresholds that apply. */
export type FoodCategory =
  | "general"
  | "beverage"
  | "water"
  | "cheese"
  | "fat_oil_nuts_seeds"
  | "red_meat";

/** All values per 100 g (solids) or per 100 ml (drinks). Grams unless noted. */
export interface Nutrition {
  energyKj?: number;
  energyKcal?: number;
  fat?: number;
  saturatedFat?: number;
  transFat?: number;
  carbohydrates?: number;
  sugars?: number;
  addedSugars?: number;
  fiber?: number;
  proteins?: number;
  salt?: number;
  /** Sodium in grams. Converted to salt (x 2.5) when salt is missing. */
  sodium?: number;
  /** Share of fruit, vegetables, legumes (and olive/rapeseed/walnut oils) in %. */
  fruitsVegLegumesPercent?: number;
}

export type NutriGrade = "a" | "b" | "c" | "d" | "e";
export type NovaGroup = 1 | 2 | 3 | 4;

/** Everything the scorer needs, whatever the source (Open Food Facts or a pasted label). */
export interface ProductInput {
  source: "openfoodfacts" | "label";
  barcode?: string;
  name?: string;
  brand?: string;
  quantity?: string;
  imageUrl?: string;
  url?: string;
  category?: FoodCategory;
  nutrition?: Nutrition;
  ingredientsText?: string;
  /** Normalised additive codes such as "e330", when the source already parsed them. */
  additiveCodes?: string[];
  novaGroup?: NovaGroup;
  /** Nutri-Score computed by the data source (Open Food Facts), if any. */
  officialNutriScore?: { grade: NutriGrade; score?: number };
  /** True when the source says Nutri-Score does not apply (alcohol, baby food, ...). */
  nutriScoreNotApplicable?: boolean;
  labels?: string[];
  allergens?: string[];
  categories?: string[];
}

export type Risk = "none" | "limited" | "moderate" | "high" | "unknown";

export interface AdditiveInfo {
  code: string;
  name: string;
  function: string;
  risk: Risk;
  why?: string;
  sources?: string[];
  /** Cosmetic additive class that marks a food as ultra-processed (NOVA 4). */
  upf?: boolean;
  /** Non-nutritive sweetener for the Nutri-Score beverage rule. */
  nns?: boolean;
}

export type Rating = "excellent" | "good" | "poor" | "bad" | "unknown";
export type Level = "low" | "moderate" | "high";

export interface NutrientLine {
  id: "energy" | "sugars" | "saturatedFat" | "salt" | "fiber" | "proteins" | "fruitsVeg";
  label: string;
  value: number;
  unit: string;
  level: Level;
  /** Short verdict, e.g. "Too sweet". */
  verdict: string;
}

export interface Flag {
  id: string;
  label: string;
  severity: "info" | "warning" | "danger";
  detail: string;
}

export interface ScoreResult {
  /** 0-100, or null when there is not enough data for a fair score. */
  score: number | null;
  rating: Rating;
  headline: string;
  nutrition: {
    points: number | null;
    grade: NutriGrade | null;
    nutriScore: number | null;
    category: FoodCategory;
    source: "official" | "computed" | "missing" | "not_applicable";
  };
  additives: {
    /** Percentage taken off the nutrition points. */
    penaltyPct: number;
    items: (AdditiveInfo & { matchedAs?: string })[];
  };
  processing: {
    /** Percentage taken off the nutrition points. */
    penaltyPct: number;
    novaGroup: NovaGroup | null;
    estimated: boolean;
    markers: string[];
  };
  caps: string[];
  negatives: NutrientLine[];
  positives: NutrientLine[];
  flags: Flag[];
  confidence: "high" | "medium" | "low";
  missing: string[];
}

export interface ScoredProduct {
  product: {
    source: ProductInput["source"];
    barcode?: string;
    name: string;
    brand?: string;
    quantity?: string;
    imageUrl?: string;
    url?: string;
    labels?: string[];
    allergens?: string[];
  };
  result: ScoreResult;
}
