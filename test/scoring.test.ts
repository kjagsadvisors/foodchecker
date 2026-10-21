import { describe, expect, it } from "vitest";
import { findAdditive, normaliseAdditiveCode } from "../src/core/additives.js";
import { analyzeIngredients } from "../src/core/ingredients.js";
import { computeNutriScore, nutritionPoints } from "../src/core/nutriscore.js";
import { ratingFor, score } from "../src/core/score.js";
import { categoryFromOff, looksLikeBeverage } from "../src/off/client.js";
import { analyzeLabel } from "../src/service.js";

const codes = (text: string) => analyzeIngredients(text).additives.map((a) => a.code).sort();

describe("Nutri-Score 2023", () => {
  it("matches Open Food Facts for Coca-Cola (beverage, score 12, grade E)", () => {
    const ns = computeNutriScore({ energyKj: 180, sugars: 10.6, saturatedFat: 0, salt: 0, proteins: 0 }, "beverage");
    expect(ns.score).toBe(12);
    expect(ns.grade).toBe("e");
  });

  it("adds 4 points to drinks with non-nutritive sweeteners", () => {
    const ns = computeNutriScore({ energyKj: 1.3, sugars: 0, saturatedFat: 0, salt: 0.02 }, "beverage", true);
    expect(ns.score).toBe(4);
    expect(ns.grade).toBe("c");
  });

  it("rates olive oil B with the fats rules", () => {
    const ns = computeNutriScore(
      { energyKj: 3700, fat: 100, saturatedFat: 14, sugars: 0, salt: 0, fruitsVegLegumesPercent: 100 },
      "fat_oil_nuts_seeds",
    );
    expect(ns.score).toBe(0);
    expect(ns.grade).toBe("b");
  });

  it("rates oats A", () => {
    const ns = computeNutriScore({ energyKj: 1550, saturatedFat: 1.2, sugars: 1, salt: 0.01, fiber: 10, proteins: 13 }, "general");
    expect(ns.grade).toBe("a");
  });

  it("ignores protein when negative points are 11 or more (general foods)", () => {
    const ns = computeNutriScore({ energyKj: 2100, saturatedFat: 6, sugars: 30, salt: 0.5, proteins: 8 }, "general");
    expect(ns.countProteins).toBe(false);
  });

  it("maps grades onto the 0-100 scale inside their band", () => {
    expect(nutritionPoints("a", -10, "general")).toBe(100);
    expect(nutritionPoints("a", 0, "general")).toBe(80);
    expect(nutritionPoints("e", 32, "general")).toBe(0);
    expect(nutritionPoints("c", undefined, "general")).toBe(55);
    expect(nutritionPoints("a", undefined, "water")).toBe(100);
  });
});

describe("ingredient parsing", () => {
  it("reads US color names and flavor enhancers", () => {
    const text =
      "Corn, Vegetable Oil (Corn, Canola, and/or Sunflower Oil), Maltodextrin (Made from Corn), Salt, Cheddar Cheese (Milk, Cheese Cultures, Salt, Enzymes), Monosodium Glutamate, Natural and Artificial Flavor, Dextrose, Artificial Color (Including Yellow 6, Yellow 5, and Red 40), Lactic Acid, Citric Acid, Sugar, Disodium Inosinate, and Disodium Guanylate.";
    expect(codes(text)).toEqual(["e102", "e110", "e129", "e270", "e330", "e621", "e627", "e631"]);
    const a = analyzeIngredients(text);
    expect(a.estimatedNova).toBe(4);
    expect(a.flags.map((f) => f.id)).toEqual(expect.arrayContaining(["seed_oils", "added_sugar"]));
  });

  it("reads E-numbers in EU style, including FD&C and roman suffixes", () => {
    expect(codes("Water, sugar, colour (E 150d), acid E338, emulsifier E471, E322(i), FD&C Red No. 40")).toEqual([
      "e129",
      "e150d",
      "e322",
      "e338",
      "e471",
    ]);
  });

  it("prefers the longest name and does not double count", () => {
    expect(codes("enriched flour, sodium stearoyl lactylate, calcium disodium EDTA")).toEqual(["e385", "e481"]);
    expect(codes("caramel color (E150d)")).toEqual(["e150d"]);
    expect(codes("modified food starch, E1442")).toEqual(["e1442"]);
  });

  it("flags trans fat and caps the score", () => {
    const r = score({
      source: "label",
      ingredientsText: "enriched flour, partially hydrogenated soybean oil, salt",
      nutrition: { energyKcal: 120, saturatedFat: 0.5, sugars: 1, salt: 0.1, fiber: 6, proteins: 10 },
    });
    expect(r.flags.some((f) => f.id === "trans_fat")).toBe(true);
    expect(r.score).toBeLessThanOrEqual(49);
  });

  it("does not treat plain foods as ultra-processed", () => {
    expect(analyzeIngredients("rolled oats").estimatedNova).toBe(1);
    expect(analyzeIngredients("tomatoes, salt").estimatedNova).toBe(3);
  });
});

describe("overall score", () => {
  it("gives plain water 100", () => {
    const r = score({ source: "label", category: "water", ingredientsText: "natural mineral water" });
    expect(r.score).toBe(100);
    expect(r.rating).toBe("excellent");
  });

  it("caps cured meat with nitrite at 49 or less", () => {
    const r = score({
      source: "label",
      category: "red_meat",
      ingredientsText: "pork, water, salt, sugar, sodium phosphate, sodium erythorbate, sodium nitrite",
      nutrition: { energyKcal: 120, saturatedFat: 1.5, sugars: 1, salt: 2.5, proteins: 20 },
    });
    expect(r.additives.items[0].code).toBe("e250");
    expect(r.score).toBeLessThanOrEqual(49);
    expect(r.caps[0]).toMatch(/Sodium nitrite/);
  });

  it("rates a sugary soda Bad and plain Greek yogurt Excellent", () => {
    const soda = score({
      source: "label",
      category: "beverage",
      ingredientsText: "carbonated water, sugar, colour (caramel E150d), acid (phosphoric acid), natural flavourings, caffeine",
      nutrition: { energyKj: 180, sugars: 10.6, saturatedFat: 0, salt: 0 },
    });
    expect(soda.rating).toBe("bad");
    const yogurt = score({
      source: "label",
      ingredientsText: "pasteurized milk, live active yogurt cultures",
      nutrition: { energyKcal: 97, saturatedFat: 3, sugars: 3.6, salt: 0.1, proteins: 9 },
    });
    expect(yogurt.rating).toBe("excellent");
    expect(yogurt.additives.items).toHaveLength(0);
  });

  it("returns no score without nutrition facts, but still lists additives", () => {
    const r = score({ source: "label", ingredientsText: "sugar, E129" });
    expect(r.score).toBeNull();
    expect(r.rating).toBe("unknown");
    expect(r.additives.items[0].code).toBe("e129");
  });

  it("uses the rating bands 75/50/25", () => {
    expect([ratingFor(75), ratingFor(74), ratingFor(50), ratingFor(49), ratingFor(25), ratingFor(24)]).toEqual([
      "excellent",
      "good",
      "good",
      "poor",
      "poor",
      "bad",
    ]);
  });
});

describe("label tool", () => {
  it("converts US per-serving values to per 100 g", () => {
    const v = analyzeLabel({
      product_name: "Test cereal",
      ingredients_text: "whole grain oats, sugar, salt",
      nutrition: { basis: "per_serving", serving_size: 40, calories_kcal: 150, saturated_fat_g: 0.5, sugars_g: 2, sodium_mg: 140, fiber_g: 4, protein_g: 5 },
    });
    expect(v.result.negatives.concat(v.result.positives).find((l) => l.id === "salt")?.value).toBe(0.9);
    expect(v.result.score).not.toBeNull();
  });

  it("asks for the serving size when it is missing", () => {
    const v = analyzeLabel({ nutrition: { basis: "per_serving", calories_kcal: 150, sugars_g: 2 } });
    expect(v.result.score).toBeNull();
    expect(v.result.missing.join(" ")).toMatch(/serving size/);
  });
});

describe("additive lookup", () => {
  it("finds additives by code, name and US label name", () => {
    expect(findAdditive("E250")?.name).toBe("Sodium nitrite");
    expect(findAdditive("red 40")?.code).toBe("e129");
    expect(findAdditive("Carrageenan")?.risk).toBe("moderate");
    expect(normaliseAdditiveCode("en:e150d")).toBe("e150d");
    expect(normaliseAdditiveCode("en:e322i")).toBe("e322");
  });
});

describe("Open Food Facts records", () => {
  it("treats a soda with unparsed French categories as a drink", () => {
    const p = {
      categories_tags: ["en:Boissons avec sucre ajouté", "en:Sodas au cola"],
      nutriscore: { "2023": { grade: "c", data: { is_beverage: 0 } } },
    };
    expect(looksLikeBeverage(p)).toBe(true);
    expect(categoryFromOff(p)).toBe("beverage");
  });

  it("does not treat soups, oils or alcohol as soft drinks", () => {
    expect(looksLikeBeverage({ categories_tags: ["en:soups", "en:meals"] })).toBe(false);
    expect(looksLikeBeverage({ categories_tags: ["en:olive-oils"] })).toBe(false);
    expect(looksLikeBeverage({ categories_tags: ["en:beverages", "en:alcoholic-beverages", "en:beers"] })).toBe(false);
  });
});
