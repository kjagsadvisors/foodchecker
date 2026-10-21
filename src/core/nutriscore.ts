/**
 * Nutri-Score, 2023 algorithm.
 *
 * Thresholds are copied from the Open Food Facts reference implementation
 * (openfoodfacts-server lib/ProductOpener/Nutriscore.pm, "points_thresholds_2023"),
 * which follows the Santé publique France 2022/2023 update.
 */
import type { FoodCategory, NutriGrade, Nutrition } from "./types.js";

const T = {
  energy: [335, 670, 1005, 1340, 1675, 2010, 2345, 2680, 3015, 3350],
  energy_beverages: [30, 90, 150, 210, 240, 270, 300, 330, 360, 390],
  sugars: [3.4, 6.8, 10, 14, 17, 20, 24, 27, 31, 34, 37, 41, 44, 48, 51],
  sugars_beverages: [0.5, 2, 3.5, 5, 6, 7, 8, 9, 10, 11],
  saturated_fat: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10],
  salt: [0.2, 0.4, 0.6, 0.8, 1, 1.2, 1.4, 1.6, 1.8, 2, 2.2, 2.4, 2.6, 2.8, 3, 3.2, 3.4, 3.6, 3.8, 4],
  energy_from_saturated_fat: [120, 240, 360, 480, 600, 720, 840, 960, 1080, 1200],
  saturated_fat_ratio: [10, 16, 22, 28, 34, 40, 46, 52, 58, 64],
  fruits_vegetables_legumes: [40, 60, 80, 80, 80],
  fruits_vegetables_legumes_beverages: [40, 40, 60, 60, 80, 80],
  fiber: [3.0, 4.1, 5.2, 6.3, 7.4],
  proteins: [2.4, 4.8, 7.2, 9.6, 12, 14, 17],
  proteins_beverages: [1.2, 1.5, 1.8, 2.1, 2.4, 2.7, 3.0],
} as const;

/** Number of thresholds strictly exceeded (or met, for the saturated fat ratio). */
function points(value: number | undefined, thresholds: readonly number[], inclusive = false): number {
  if (value === undefined || Number.isNaN(value)) return 0;
  let p = 0;
  for (const t of thresholds) if (inclusive ? value >= t : value > t) p++;
  return p;
}

export interface NutriScoreDetail {
  score: number;
  grade: NutriGrade;
  negativePoints: number;
  positivePoints: number;
  countProteins: boolean;
  components: Record<string, { value: number | undefined; points: number; max: number }>;
}

export function energyKj(n: Nutrition): number | undefined {
  if (n.energyKj !== undefined) return n.energyKj;
  if (n.energyKcal !== undefined) return n.energyKcal * 4.184;
  return undefined;
}

export function saltG(n: Nutrition): number | undefined {
  if (n.salt !== undefined) return n.salt;
  if (n.sodium !== undefined) return n.sodium * 2.5;
  return undefined;
}

/** True when there is enough data to compute a Nutri-Score that means something. */
export function hasCoreNutrition(n: Nutrition | undefined): boolean {
  if (!n) return false;
  return energyKj(n) !== undefined && n.sugars !== undefined && n.saturatedFat !== undefined && saltG(n) !== undefined;
}

export function computeNutriScore(
  n: Nutrition,
  category: FoodCategory,
  hasNonNutritiveSweeteners = false,
): NutriScoreDetail {
  const isWater = category === "water";
  const isBeverage = category === "beverage" || isWater;
  const isFat = category === "fat_oil_nuts_seeds";
  const isCheese = category === "cheese";
  const isRedMeat = category === "red_meat";

  const kj = energyKj(n);
  const salt = saltG(n);
  const components: NutriScoreDetail["components"] = {};
  const add = (id: string, value: number | undefined, thresholds: readonly number[], inclusive = false) => {
    components[id] = { value, points: points(value, thresholds, inclusive), max: thresholds.length };
    return components[id].points;
  };

  let negative = 0;
  if (isFat) {
    const satKj = n.saturatedFat !== undefined ? n.saturatedFat * 37 : undefined;
    const ratio =
      n.saturatedFat !== undefined && n.fat !== undefined && n.fat > 0 ? (n.saturatedFat / n.fat) * 100 : undefined;
    negative += add("energy_from_saturated_fat", satKj, T.energy_from_saturated_fat);
    negative += add("saturated_fat_ratio", ratio, T.saturated_fat_ratio, true);
  } else {
    negative += add("energy", kj, isBeverage ? T.energy_beverages : T.energy);
    negative += add("saturated_fat", n.saturatedFat, T.saturated_fat);
  }
  negative += add("sugars", n.sugars, isBeverage ? T.sugars_beverages : T.sugars);
  negative += add("salt", salt, T.salt);
  if (isBeverage) {
    components.non_nutritive_sweeteners = { value: hasNonNutritiveSweeteners ? 1 : 0, points: hasNonNutritiveSweeteners ? 4 : 0, max: 4 };
    negative += components.non_nutritive_sweeteners.points;
  }

  let countProteins: boolean;
  if (isBeverage || isCheese) countProteins = true;
  else if (isFat) countProteins = negative < 7;
  else countProteins = negative < 11;

  let positive = 0;
  positive += add("fiber", n.fiber, T.fiber);
  positive += add(
    "fruits_vegetables_legumes",
    n.fruitsVegLegumesPercent,
    isBeverage ? T.fruits_vegetables_legumes_beverages : T.fruits_vegetables_legumes,
  );
  const proteinPts = add("proteins", n.proteins, isBeverage ? T.proteins_beverages : T.proteins);
  if (isRedMeat && proteinPts > 2) components.proteins.points = 2;
  if (countProteins) positive += components.proteins.points;
  else components.proteins.points = 0;

  const score = negative - positive;
  return {
    score,
    grade: gradeFor(score, category),
    negativePoints: negative,
    positivePoints: positive,
    countProteins,
    components,
  };
}

export function gradeFor(score: number, category: FoodCategory): NutriGrade {
  if (category === "water") return "a";
  if (category === "beverage") {
    if (score <= 2) return "b";
    if (score <= 6) return "c";
    if (score <= 9) return "d";
    return "e";
  }
  if (category === "fat_oil_nuts_seeds") {
    if (score <= -6) return "a";
    if (score <= 2) return "b";
    if (score <= 10) return "c";
    if (score <= 18) return "d";
    return "e";
  }
  if (score <= 0) return "a";
  if (score <= 2) return "b";
  if (score <= 10) return "c";
  if (score <= 18) return "d";
  return "e";
}

/**
 * Raw Nutri-Score range of each grade, best end first, per family.
 * Used to place a product inside its grade band on the 0-100 scale.
 * The open ends (best of A, worst of E) are clamped to typical extremes.
 */
const RAW_BANDS: Record<"general" | "beverage" | "fat", Record<NutriGrade, [number, number]>> = {
  general: { a: [-10, 0], b: [1, 2], c: [3, 10], d: [11, 18], e: [19, 32] },
  beverage: { a: [0, 0], b: [-6, 2], c: [3, 6], d: [7, 9], e: [10, 20] },
  fat: { a: [-12, -6], b: [-5, 2], c: [3, 10], d: [11, 18], e: [19, 30] },
};

/** Where each grade sits on the 0-100 nutrition scale: [best, worst]. */
const POINT_BANDS: Record<NutriGrade, [number, number]> = {
  a: [100, 80],
  b: [79, 65],
  c: [64, 45],
  d: [44, 25],
  e: [24, 0],
};

/** Map a Nutri-Score grade (and raw score when known) to 0-100 nutrition points. */
export function nutritionPoints(grade: NutriGrade, rawScore: number | undefined, category: FoodCategory): number {
  const [top, bottom] = POINT_BANDS[grade];
  if (category === "water") return 100;
  if (rawScore === undefined) return Math.round((top + bottom) / 2);
  const family = category === "beverage" ? "beverage" : category === "fat_oil_nuts_seeds" ? "fat" : "general";
  const [best, worst] = RAW_BANDS[family][grade];
  if (best === worst) return top;
  const t = Math.min(1, Math.max(0, (rawScore - best) / (worst - best)));
  return Math.round(top - t * (top - bottom));
}
