/**
 * The 0-100 score.
 *
 *   score = nutrition points (0-100, from Nutri-Score 2023)
 *         x (1 - additive penalty)   high 25%, moderate 10%, limited 3% each; at most 45%
 *         x (1 - processing penalty) NOVA 4: 10%, NOVA 3: 3%
 *   then capped at 49 when a high-risk additive or trans fat is present.
 *
 * Penalties are percentages so that bad products keep their spread instead of
 * all landing on 0, and additives weigh most on otherwise good products.
 *
 * Bands: 75-100 excellent, 50-74 good, 25-49 poor, 0-24 bad.
 * Full rationale: docs/METHODOLOGY.md.
 */
import { analyzeIngredients } from "./ingredients.js";
import { computeNutriScore, energyKj, hasCoreNutrition, nutritionPoints, saltG, type NutriScoreDetail } from "./nutriscore.js";
import type {
  FoodCategory,
  Level,
  NovaGroup,
  NutrientLine,
  Nutrition,
  ProductInput,
  Rating,
  ScoredProduct,
  ScoreResult,
} from "./types.js";

export const ADDITIVE_PENALTY = { high: 25, moderate: 10, limited: 3, none: 0, unknown: 0 } as const;
export const MAX_ADDITIVE_PENALTY = 45;
export const NOVA_PENALTY: Record<NovaGroup, number> = { 1: 0, 2: 0, 3: 3, 4: 10 };
export const HIGH_RISK_CAP = 49;

export function ratingFor(score: number | null): Rating {
  if (score === null) return "unknown";
  if (score >= 75) return "excellent";
  if (score >= 50) return "good";
  if (score >= 25) return "poor";
  return "bad";
}

export const RATING_LABEL: Record<Rating, string> = {
  excellent: "Excellent",
  good: "Good",
  poor: "Poor",
  bad: "Bad",
  unknown: "Not enough data",
};

export function scoreProduct(input: ProductInput): ScoredProduct {
  return {
    product: {
      source: input.source,
      barcode: input.barcode,
      name: input.name?.trim() || (input.barcode ? `Product ${input.barcode}` : "Unnamed product"),
      brand: input.brand,
      quantity: input.quantity,
      imageUrl: input.imageUrl,
      url: input.url,
      labels: input.labels,
      allergens: input.allergens,
    },
    result: score(input),
  };
}

export function score(input: ProductInput): ScoreResult {
  const category: FoodCategory = input.category ?? "general";
  const missing: string[] = [];
  const ing = analyzeIngredients(input.ingredientsText, input.additiveCodes);
  if (!input.ingredientsText && !input.additiveCodes?.length) missing.push("ingredients");

  // 1. Nutrition
  const nutrition: ScoreResult["nutrition"] = { points: null, grade: null, nutriScore: null, category, source: "missing" };
  const n = input.nutrition;
  let ns: NutriScoreDetail | undefined;
  if (input.nutriScoreNotApplicable) {
    nutrition.source = "not_applicable";
  } else if (hasCoreNutrition(n) || category === "water") {
    ns = computeNutriScore(n ?? {}, category, ing.hasNonNutritiveSweeteners);
    const official = input.officialNutriScore;
    // Trust the data source's grade when it disagrees: it knows the product category better.
    if (official && official.grade !== ns.grade) {
      nutrition.grade = official.grade;
      nutrition.nutriScore = official.score ?? null;
      nutrition.points = nutritionPoints(official.grade, official.score, category);
      nutrition.source = "official";
    } else {
      nutrition.grade = ns.grade;
      nutrition.nutriScore = ns.score;
      nutrition.points = nutritionPoints(ns.grade, ns.score, category);
      nutrition.source = official ? "official" : "computed";
    }
  } else if (input.officialNutriScore) {
    const o = input.officialNutriScore;
    nutrition.grade = o.grade;
    nutrition.nutriScore = o.score ?? null;
    nutrition.points = nutritionPoints(o.grade, o.score, category);
    nutrition.source = "official";
  } else {
    missing.push("nutrition facts (energy, sugars, saturated fat, salt)");
  }

  // 2. Additives
  let additivePct = 0;
  for (const a of ing.additives) additivePct += ADDITIVE_PENALTY[a.risk];
  additivePct = Math.min(additivePct, MAX_ADDITIVE_PENALTY);
  const caps: string[] = [];
  let cap = 100;
  const highRisk = ing.additives.filter((a) => a.risk === "high");
  if (highRisk.length) {
    cap = Math.min(cap, HIGH_RISK_CAP);
    caps.push(`Capped at ${HIGH_RISK_CAP}: contains high-risk additive${highRisk.length > 1 ? "s" : ""} (${highRisk.map((a) => a.name).join(", ")})`);
  }
  for (const c of ing.caps) {
    cap = Math.min(cap, c.max);
    additivePct = Math.min(additivePct + c.penalty, MAX_ADDITIVE_PENALTY);
    caps.push(`Capped at ${c.max}: ${c.reason.toLowerCase()}`);
  }

  // 3. Processing
  const nova = input.novaGroup ?? ing.estimatedNova ?? null;
  const processing: ScoreResult["processing"] = {
    penaltyPct: nova ? NOVA_PENALTY[nova] : 0,
    novaGroup: nova,
    estimated: !input.novaGroup && nova !== null,
    markers: ing.upfMarkers,
  };
  if (!nova) missing.push("processing level (needs ingredients)");

  // Combine
  let total: number | null = null;
  if (nutrition.points !== null) {
    total = nutrition.points * (1 - additivePct / 100) * (1 - processing.penaltyPct / 100);
    total = Math.round(Math.max(0, Math.min(cap, total)));
  }
  const rating = ratingFor(total);

  const { negatives, positives } = nutrientLines(n, category, ns);
  const confidence: ScoreResult["confidence"] = total === null ? "low" : missing.length === 0 ? "high" : "medium";

  const result: ScoreResult = {
    score: total,
    rating,
    headline: "",
    nutrition,
    additives: { penaltyPct: additivePct, items: ing.additives },
    processing,
    caps,
    negatives,
    positives,
    flags: ing.flags,
    confidence,
    missing,
  };
  result.headline = headline(result);
  return result;
}

/** UK FSA "traffic light" thresholds per 100 g / 100 ml, which are public and easy to explain. */
const FSA = {
  food: { sugars: [5, 22.5], saturatedFat: [1.5, 5], salt: [0.3, 1.5], energyKcal: [160, 360] },
  drink: { sugars: [2.5, 11.25], saturatedFat: [0.75, 2.5], salt: [0.3, 0.75], energyKcal: [20, 50] },
} as const;

const VERDICTS: Record<string, Record<Level, string>> = {
  energy: { low: "Low in calories", moderate: "Moderately caloric", high: "Very caloric" },
  sugars: { low: "Low sugar", moderate: "Some sugar", high: "Too sweet" },
  saturatedFat: { low: "Low saturated fat", moderate: "Some saturated fat", high: "Too much saturated fat" },
  salt: { low: "Low salt", moderate: "Some salt", high: "Too salty" },
};

/** Nutri-Score component ids for each displayed nutrient. */
const NS_IDS: Record<string, string[]> = {
  energy: ["energy", "energy_from_saturated_fat"],
  sugars: ["sugars"],
  saturatedFat: ["saturated_fat", "saturated_fat_ratio"],
  salt: ["salt"],
};
const LEVEL_RANK: Record<Level, number> = { low: 0, moderate: 1, high: 2 };

function nutrientLines(n: Nutrition | undefined, category: FoodCategory, ns: NutriScoreDetail | undefined) {
  const negatives: NutrientLine[] = [];
  const positives: NutrientLine[] = [];
  if (!n) return { negatives, positives };
  const t = category === "beverage" || category === "water" ? FSA.drink : FSA.food;
  const kcal = n.energyKcal ?? (energyKj(n) !== undefined ? energyKj(n)! / 4.184 : undefined);
  const salt = saltG(n);
  const rows: [NutrientLine["id"], string, number | undefined, string, readonly [number, number]][] = [
    ["energy", "Calories", kcal, "kcal", t.energyKcal],
    ["sugars", "Sugar", n.sugars, "g", t.sugars],
    ["saturatedFat", "Saturated fat", n.saturatedFat, "g", t.saturatedFat],
    ["salt", "Salt", salt, "g", t.salt],
  ];
  for (const [id, label, value, unit, [lo, hi]] of rows) {
    if (value === undefined) continue;
    // Take the stricter of the FSA traffic light and the Nutri-Score points share,
    // so a can of cola reads "too sweet" even though FSA drink thresholds are per 100 ml.
    let level: Level = value <= lo ? "low" : value > hi ? "high" : "moderate";
    const comp = NS_IDS[id].map((k) => ns?.components[k]).find(Boolean);
    if (comp && comp.max > 0) {
      const share = comp.points / comp.max;
      const nsLevel: Level = share >= 0.5 ? "high" : share >= 0.2 ? "moderate" : "low";
      if (LEVEL_RANK[nsLevel] > LEVEL_RANK[level]) level = nsLevel;
    }
    const line = { id, label, value: round1(value), unit, level, verdict: VERDICTS[id][level] };
    (level === "low" ? positives : negatives).push(line);
  }
  if (n.fiber !== undefined && n.fiber >= 3) {
    positives.push({ id: "fiber", label: "Fiber", value: round1(n.fiber), unit: "g", level: n.fiber >= 6 ? "high" : "moderate", verdict: n.fiber >= 6 ? "High in fiber" : "Source of fiber" });
  }
  if (n.proteins !== undefined && kcal && kcal > 0) {
    const share = (n.proteins * 4) / kcal;
    if (share >= 0.12) {
      positives.push({ id: "proteins", label: "Protein", value: round1(n.proteins), unit: "g", level: share >= 0.2 ? "high" : "moderate", verdict: share >= 0.2 ? "High in protein" : "Source of protein" });
    }
  }
  if (n.fruitsVegLegumesPercent !== undefined && n.fruitsVegLegumesPercent >= 40) {
    positives.push({ id: "fruitsVeg", label: "Fruit & veg", value: round1(n.fruitsVegLegumesPercent), unit: "%", level: n.fruitsVegLegumesPercent > 80 ? "high" : "moderate", verdict: "Rich in fruit, vegetables or legumes" });
  }
  // Worst first.
  negatives.sort((a, b) => (a.level === b.level ? 0 : a.level === "high" ? -1 : 1));
  return { negatives, positives };
}

function headline(r: ScoreResult): string {
  if (r.score === null) {
    if (r.nutrition.source === "not_applicable") return "Nutri-Score does not apply to this kind of product, so there is no overall score.";
    return "Not enough data for a score: add the nutrition facts (calories, sugar, saturated fat, salt).";
  }
  const reasons: string[] = [];
  const worstAdditive = r.additives.items.find((a) => a.risk === "high" || a.risk === "moderate");
  const highs = r.negatives.filter((l) => l.level === "high").map((l) => l.verdict.toLowerCase());
  if (r.caps.length && worstAdditive?.risk === "high") reasons.push(`contains ${worstAdditive.name} (high risk)`);
  else if (r.flags.some((f) => f.id === "trans_fat")) reasons.push("contains trans fat");
  if (highs.length) reasons.push(highs.slice(0, 2).join(" and "));
  if (r.processing.novaGroup === 4) reasons.push("ultra-processed");
  const risky = r.additives.items.filter((a) => a.risk === "moderate").length;
  if (risky && !(worstAdditive?.risk === "high")) reasons.push(`${risky} additive${risky > 1 ? "s" : ""} of concern`);
  const goods = r.positives.filter((l) => l.id === "fiber" || l.id === "proteins" || l.id === "fruitsVeg").map((l) => l.verdict.toLowerCase());

  const label = RATING_LABEL[r.rating];
  if (r.rating === "excellent" || r.rating === "good") {
    const plus = goods.length ? goods.slice(0, 2).join(" and ") : r.additives.items.length === 0 ? "no additives" : "a decent nutrition profile";
    const minus = reasons.length ? `, but ${reasons[0]}` : "";
    return `${label} (${r.score}/100): ${plus}${minus}.`;
  }
  return `${label} (${r.score}/100): ${reasons.length ? reasons.slice(0, 3).join(", ") : "weak nutrition profile"}.`;
}

function round1(v: number): number {
  return Math.round(v * 10) / 10;
}
