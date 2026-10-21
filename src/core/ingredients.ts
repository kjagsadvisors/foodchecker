/**
 * Reads a free-text ingredient list (from a label photo, a website, or Open Food Facts)
 * and pulls out additives, ingredients of concern, and markers of ultra-processing.
 */
import { ADDITIVE_ALIASES, lookupAdditive, normaliseAdditiveCode, normaliseText } from "./additives.js";
import type { AdditiveInfo, Flag, NovaGroup } from "./types.js";

export interface IngredientAnalysis {
  additives: (AdditiveInfo & { matchedAs?: string })[];
  flags: Flag[];
  /** Ingredients or additive classes that NOVA treats as signs of ultra-processing. */
  upfMarkers: string[];
  /** Hard caps on the final score, e.g. trans fats. */
  caps: { reason: string; max: number; penalty: number }[];
  ingredientCount: number;
  estimatedNova: NovaGroup | undefined;
  hasNonNutritiveSweeteners: boolean;
}

const ADDED_SUGARS = [
  "high fructose corn syrup",
  "glucose fructose syrup",
  "fructose glucose syrup",
  "glucose syrup",
  "corn syrup solids",
  "corn syrup",
  "invert sugar syrup",
  "invert sugar",
  "brown rice syrup",
  "rice syrup",
  "evaporated cane juice",
  "cane sugar",
  "brown sugar",
  "coconut sugar",
  "beet sugar",
  "icing sugar",
  "powdered sugar",
  "golden syrup",
  "maple syrup",
  "agave syrup",
  "agave nectar",
  "date syrup",
  "malt syrup",
  "barley malt extract",
  "molasses",
  "treacle",
  "honey",
  "dextrose",
  "maltose",
  "fructose",
  "sucrose",
  "sugar",
];

/** Ingredients (not additives) that NOVA lists as typical of ultra-processed foods. */
const UPF_INGREDIENTS: [pattern: RegExp, label: string][] = [
  [/high fructose corn syrup|glucose fructose syrup|fructose glucose syrup|isoglucose/, "High-fructose syrup"],
  [/\b(?:glucose|corn) syrup\b|invert sugar|\bdextrose\b|\bmaltodextrin\b/, "Industrial sugars (syrups, dextrose, maltodextrin)"],
  [/hydrogenated|interesterified/, "Hydrogenated or interesterified fat"],
  [/\b(?:soy|soya|whey|pea|milk|wheat|rice) protein isolate\b|\bprotein isolate\b/, "Protein isolate"],
  [/hydroly[sz]ed (?:vegetable |soy |wheat |corn )?protein/, "Hydrolysed protein"],
  [/mechanically (?:separated|recovered|deboned)/, "Mechanically separated meat"],
  [/\b(?:natural |artificial |nature identical )?flavou?rs?\b|\bflavou?ring\b/, "Flavourings"],
  [/\bmodified (?:food |corn |maize |potato |tapioca |wheat )?starch\b/, "Modified starch"],
];

const SEED_OILS =
  /\b(?:canola|rapeseed|soybean|soya|sunflower|safflower|corn|cottonseed|grapeseed|rice bran)(?: seed)? oils?\b|\bvegetable oils?\b/;
const PALM = /\bpalm(?: kernel)? (?:oil|fat|olein|stearin)\b|\bpalmolein\b/;

/** Words that only describe processed culinary ingredients (NOVA 2) when they appear in a list. */
const CULINARY = /\b(?:salt|sugar|vinegar|oil|butter|honey|syrup|starch|flour)\b/;

export function analyzeIngredients(text: string | undefined, knownCodes: string[] = []): IngredientAnalysis {
  const flags: Flag[] = [];
  const caps: IngredientAnalysis["caps"] = [];
  const upf = new Set<string>();
  const found = new Map<string, AdditiveInfo & { matchedAs?: string }>();

  for (const raw of knownCodes) {
    const code = normaliseAdditiveCode(raw);
    if (code) found.set(code, lookupAdditive(code));
  }

  const norm = text ? normaliseText(text) : "";
  if (norm) {
    // Mask matched spans so "sodium stearoyl lactylate" is not also matched as something shorter.
    let masked = ` ${norm} `;
    const mask = (start: number, len: number) => {
      masked = masked.slice(0, start) + " ".repeat(len) + masked.slice(start + len);
    };

    const eRe = /\b(?:e|ins)\s?-?(\d{3,4})\s?([a-g])?(?:i{1,3}|iv|vi?)?(?![a-z0-9])(?:\s?\((?:i{1,3}|iv|vi?)\))?/g;
    for (const m of masked.matchAll(eRe)) {
      const code = `e${m[1]}${m[2] ?? ""}`;
      if (!found.has(code)) found.set(code, { ...lookupAdditive(code), matchedAs: m[0].trim() });
      mask(m.index!, m[0].length);
    }

    for (const [alias, code] of ADDITIVE_ALIASES) {
      const re = new RegExp(`(?<![a-z0-9])${escapeRe(alias)}(?![a-z0-9])`, "g");
      for (const m of masked.matchAll(re)) {
        // The family entry (e150, e14xx) must not shadow a specific code already found from E-numbers.
        const family = code === "e14xx" ? /^e14\d\d/ : new RegExp(`^${code}[a-z]?$`);
        const already = [...found.keys()].some((k) => family.test(k));
        if (!already) found.set(code, { ...lookupAdditive(code), matchedAs: m[0].trim() });
        mask(m.index!, m[0].length);
      }
    }

    // Ingredients of concern.
    if (/partially hydrogenated/.test(norm)) {
      flags.push({
        id: "trans_fat",
        label: "Partially hydrogenated oil (trans fat)",
        severity: "danger",
        detail:
          "Partially hydrogenated oils are the main source of industrial trans fats, which raise LDL cholesterol and heart disease risk. Banned in the US since 2018 and limited in the EU.",
      });
      caps.push({ reason: "Contains partially hydrogenated oil (trans fat)", max: 49, penalty: 25 });
    } else if (/hydrogenated/.test(norm)) {
      flags.push({
        id: "hydrogenated_fat",
        label: "Hydrogenated fat",
        severity: "warning",
        detail: "Fully hydrogenated fats contain little trans fat but are a marker of heavy processing.",
      });
    }

    if (/high fructose corn syrup|glucose fructose syrup|fructose glucose syrup|isoglucose/.test(norm)) {
      flags.push({
        id: "hfcs",
        label: "High-fructose syrup",
        severity: "warning",
        detail: "A cheap industrial sweetener; high intake of added fructose is linked to fatty liver and metabolic problems.",
      });
    }

    const sugars = new Set<string>();
    let sugarText = norm;
    for (const s of ADDED_SUGARS) {
      const re = new RegExp(`(?<![a-z])${escapeRe(s)}(?![a-z])`, "g");
      if (re.test(sugarText)) {
        sugars.add(s);
        sugarText = sugarText.replace(re, " ");
      }
    }
    if (sugars.size > 0) {
      flags.push({
        id: "added_sugar",
        label: sugars.size >= 3 ? `${sugars.size} kinds of added sugar` : "Contains added sugar",
        severity: sugars.size >= 3 ? "warning" : "info",
        detail: `Found: ${[...sugars].join(", ")}.${sugars.size >= 3 ? " Splitting sugar into several kinds lets each one sit lower in the ingredient list." : ""}`,
      });
    }

    if (PALM.test(norm)) {
      flags.push({
        id: "palm_oil",
        label: "Palm oil",
        severity: "info",
        detail: "Rich in saturated fat (already counted in the nutrition score) and linked to deforestation.",
      });
    }

    if (SEED_OILS.test(norm)) {
      flags.push({
        id: "seed_oils",
        label: "Refined seed oils",
        severity: "info",
        detail:
          "Shown for people who choose to avoid them. Current evidence does not show harm from seed oils at normal intake, so they do not lower the score.",
      });
    }

    if (/\bcaffeine\b|\bguarana\b/.test(norm)) {
      flags.push({
        id: "caffeine",
        label: "Contains caffeine",
        severity: "info",
        detail: "Not recommended for children or during pregnancy in large amounts.",
      });
    }

    for (const [re, label] of UPF_INGREDIENTS) if (re.test(norm)) upf.add(label);
  }

  const additives = [...found.values()].sort((a, b) => riskRank(b.risk) - riskRank(a.risk));
  for (const a of additives) if (a.upf) upf.add(`${capitalise(a.function)}: ${a.name}`);

  const ingredientCount = norm ? splitTopLevel(norm).length : 0;
  return {
    additives,
    flags,
    upfMarkers: [...upf],
    caps,
    ingredientCount,
    estimatedNova: norm ? estimateNova(norm, upf.size, additives.length, ingredientCount) : undefined,
    hasNonNutritiveSweeteners: additives.some((a) => a.nns),
  };
}

function estimateNova(norm: string, upfCount: number, additiveCount: number, count: number): NovaGroup {
  if (upfCount > 0) return 4;
  if (count <= 1 && additiveCount === 0) return CULINARY.test(norm) ? 2 : 1;
  if (CULINARY.test(norm) || additiveCount > 0) return 3;
  return 1;
}

/** Split on commas and semicolons that are not inside brackets. */
function splitTopLevel(s: string): string[] {
  const out: string[] = [];
  let depth = 0;
  let cur = "";
  for (const ch of s) {
    if ("([{".includes(ch)) depth++;
    if (")]}".includes(ch)) depth = Math.max(0, depth - 1);
    if ((ch === "," || ch === ";") && depth === 0) {
      if (cur.trim()) out.push(cur.trim());
      cur = "";
    } else cur += ch;
  }
  if (cur.trim()) out.push(cur.trim().replace(/\.$/, ""));
  return out.filter(Boolean);
}

export function riskRank(r: AdditiveInfo["risk"]): number {
  return { high: 4, moderate: 3, limited: 2, unknown: 1, none: 0 }[r];
}

function escapeRe(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function capitalise(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}
