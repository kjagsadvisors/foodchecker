/**
 * Additive risk table.
 *
 * Risk levels are an editorial judgement made from public evaluations, and every
 * level above "none" states its reason. The table is meant to be challenged and
 * improved: open a pull request with a source if you disagree with an entry.
 *
 *   none     - no meaningful concern at normal intake (EFSA/JECFA re-evaluations OK).
 *   limited  - concern only for sensitive groups or very high intakes (allergy, laxative, gout...).
 *   moderate - credible but incomplete evidence of harm, or a regulatory warning label.
 *   high     - classified possible/probable carcinogen, genotoxicity not ruled out, or banned
 *              for food in major jurisdictions over safety.
 *
 * See docs/METHODOLOGY.md for the full rationale and sources.
 */
import type { AdditiveInfo, Risk } from "./types.js";

/** Additive classes NOVA calls "cosmetic" (markers of ultra-processed food). */
const UPF_FUNCTIONS = new Set([
  "colour",
  "sweetener",
  "emulsifier",
  "thickener",
  "gelling agent",
  "flavour enhancer",
  "glazing agent",
  "bulking agent",
  "anti-foaming agent",
  "emulsifying salt",
  "modified starch",
]);

/** Sweeteners counted as "non-nutritive" by Nutri-Score 2023 (polyols are not). */
const NNS = new Set(["e950", "e951", "e952", "e954", "e955", "e957", "e959", "e960", "e961", "e962", "e969"]);

// Reasons shared by several entries.
const SOUTHAMPTON =
  "EU requires the warning 'may have an adverse effect on activity and attention in children' (Southampton study, McCann et al. 2007).";
const SULFITE = "Can trigger reactions in people with asthma or sulfite sensitivity; EFSA 2022 flagged that high consumers may exceed safe levels.";
const ALUMINIUM = "Contains aluminium; EFSA notes the tolerable weekly intake of aluminium is exceeded by part of the population.";
const POLYOL = "Laxative effect at high intake (EU label warning above 10% polyols).";
const PHOSPHATE = "Added phosphates add to total phosphorus intake; EFSA 2019 set a group limit and advises caution for people with kidney disease.";
const BENZOATE = "Can form benzene with vitamin C in drinks; sodium benzoate was part of the Southampton hyperactivity study.";
const EMULSIFIER_COHORT =
  "Linked to higher cardiovascular and cancer risk in the NutriNet-Santé cohort (BMJ 2023, PLOS Med 2024); observational evidence.";
const GUT = "Animal and early human studies suggest it can disturb gut microbiota and promote low-grade inflammation.";
const NNS_WHY =
  "WHO (2023) advises against non-sugar sweeteners for weight control; long-term health effects remain debated.";

type Row = [code: string, name: string, fn: string, risk: Risk, why?: string, aliases?: string[], sources?: string[]];

const ROWS: Row[] = [
  // Colours
  ["e100", "Curcumin", "colour", "none", undefined, ["curcumin", "turmeric extract"]],
  ["e101", "Riboflavin", "colour", "none", undefined, ["riboflavin"]],
  ["e102", "Tartrazine", "colour", "moderate", SOUTHAMPTON, ["tartrazine", "yellow 5", "yellow 5 lake"], ["EU Reg. 1333/2008 Annex V"]],
  ["e104", "Quinoline yellow", "colour", "moderate", SOUTHAMPTON, ["quinoline yellow"], ["EU Reg. 1333/2008 Annex V"]],
  ["e110", "Sunset yellow FCF", "colour", "moderate", SOUTHAMPTON, ["sunset yellow", "yellow 6", "yellow 6 lake"], ["EU Reg. 1333/2008 Annex V"]],
  ["e120", "Carmine (cochineal)", "colour", "limited", "Rare but serious allergic reactions reported; insect-derived (not vegan).", ["carmine", "cochineal", "carminic acid"]],
  ["e121", "Citrus red 2", "colour", "high", "Not permitted in the EU; IARC Group 2B (possibly carcinogenic).", ["citrus red 2"], ["IARC Monographs vol. 8"]],
  ["e122", "Azorubine (carmoisine)", "colour", "moderate", SOUTHAMPTON, ["azorubine", "carmoisine"], ["EU Reg. 1333/2008 Annex V"]],
  ["e123", "Amaranth", "colour", "moderate", "Banned as a food colour in the US since 1976; tight EU limits.", ["amaranth dye"]],
  ["e124", "Ponceau 4R", "colour", "moderate", SOUTHAMPTON, ["ponceau 4r", "cochineal red a"], ["EU Reg. 1333/2008 Annex V"]],
  ["e127", "Erythrosine", "colour", "high", "FDA revoked its use in food in 2025 (thyroid tumours in rats); EU allows it only in cocktail cherries.", ["erythrosine", "red 3", "red 3 lake"], ["FDA 2025 revocation of FD&C Red No. 3"]],
  ["e128", "Red 2G", "colour", "high", "Banned in the EU since 2007 after a genotoxicity concern (aniline metabolite).", ["red 2g"], ["EFSA 2007"]],
  ["e129", "Allura red AC", "colour", "moderate", SOUTHAMPTON, ["allura red", "red 40", "red 40 lake"], ["EU Reg. 1333/2008 Annex V"]],
  ["e131", "Patent blue V", "colour", "limited", "Allergic reactions reported; not permitted in food in the US.", ["patent blue"]],
  ["e132", "Indigotine", "colour", "limited", "Occasional intolerance reactions reported.", ["indigotine", "indigo carmine", "blue 2", "blue 2 lake"]],
  ["e133", "Brilliant blue FCF", "colour", "limited", "Occasional intolerance reactions reported.", ["brilliant blue", "blue 1", "blue 1 lake"]],
  ["e140", "Chlorophylls", "colour", "none", undefined, ["chlorophyll"]],
  ["e141", "Copper chlorophyllins", "colour", "none", undefined, ["copper chlorophyllin", "sodium copper chlorophyllin"]],
  ["e142", "Green S", "colour", "limited", "Synthetic dye; not permitted in the US.", ["green s"]],
  ["e143", "Fast green FCF", "colour", "limited", "Synthetic dye; not permitted in the EU.", ["fast green", "green 3"]],
  ["e150", "Caramel colour (class not stated)", "colour", "limited", "Classes III and IV (E150c/E150d) can contain 4-MEI, a possible carcinogen; the label does not say which class.", ["caramel color"]],
  ["e150a", "Plain caramel", "colour", "none"],
  ["e150b", "Caustic sulfite caramel", "colour", "limited", "Made with sulfites."],
  ["e150c", "Ammonia caramel", "colour", "moderate", "Can contain 4-MEI (4-methylimidazole), IARC Group 2B.", undefined, ["IARC Monographs vol. 101"]],
  ["e150d", "Sulfite ammonia caramel", "colour", "moderate", "Can contain 4-MEI (4-methylimidazole), IARC Group 2B. Common in colas.", undefined, ["IARC Monographs vol. 101"]],
  ["e151", "Brilliant black BN", "colour", "limited", "Synthetic azo dye; EFSA lowered its acceptable daily intake in 2010.", ["brilliant black"]],
  ["e153", "Vegetable carbon", "colour", "limited", "May contain traces of polycyclic aromatic hydrocarbons; not permitted in the US.", ["vegetable carbon"]],
  ["e155", "Brown HT", "colour", "limited", "Synthetic azo dye; not permitted in the US.", ["brown ht"]],
  ["e160a", "Carotenes", "colour", "none", undefined, ["beta carotene", "carotene", "mixed carotenoids"]],
  ["e160b", "Annatto", "colour", "limited", "Can cause allergic reactions in sensitive people.", ["annatto", "bixin", "norbixin"]],
  ["e160c", "Paprika extract", "colour", "none", undefined, ["paprika extract", "paprika oleoresin"]],
  ["e160d", "Lycopene", "colour", "none", undefined, ["lycopene"]],
  ["e160e", "Beta-apo-8'-carotenal", "colour", "none"],
  ["e161b", "Lutein", "colour", "none", undefined, ["lutein"]],
  ["e162", "Beetroot red", "colour", "none", undefined, ["beetroot red", "beet juice color", "betanin"]],
  ["e163", "Anthocyanins", "colour", "none", undefined, ["anthocyanins"]],
  ["e170", "Calcium carbonate", "acidity regulator", "none", undefined, ["calcium carbonate"]],
  ["e171", "Titanium dioxide", "colour", "high", "EFSA (2021) could not rule out genotoxicity; banned as a food additive in the EU since 2022.", ["titanium dioxide"], ["EFSA Journal 2021;19(5):6585", "EU Reg. 2022/63"]],
  ["e172", "Iron oxides", "colour", "none", undefined, ["iron oxide"]],
  ["e173", "Aluminium", "colour", "moderate", ALUMINIUM],
  ["e174", "Silver", "colour", "limited", "Data gaps on safety; only allowed on confectionery decorations."],
  ["e175", "Gold", "colour", "limited", "Data gaps on safety; only allowed on confectionery decorations."],

  // Preservatives
  ["e200", "Sorbic acid", "preservative", "none", undefined, ["sorbic acid"]],
  ["e202", "Potassium sorbate", "preservative", "none", undefined, ["potassium sorbate"]],
  ["e203", "Calcium sorbate", "preservative", "none", undefined, ["calcium sorbate"]],
  ["e210", "Benzoic acid", "preservative", "moderate", BENZOATE, ["benzoic acid"]],
  ["e211", "Sodium benzoate", "preservative", "moderate", BENZOATE, ["sodium benzoate"], ["McCann et al., Lancet 2007"]],
  ["e212", "Potassium benzoate", "preservative", "moderate", BENZOATE, ["potassium benzoate"]],
  ["e213", "Calcium benzoate", "preservative", "moderate", BENZOATE, ["calcium benzoate"]],
  ["e214", "Ethylparaben", "preservative", "limited", "Paraben; weak endocrine activity observed in lab studies.", ["ethylparaben"]],
  ["e218", "Methylparaben", "preservative", "limited", "Paraben; weak endocrine activity observed in lab studies.", ["methylparaben"]],
  ["e220", "Sulfur dioxide", "preservative", "moderate", SULFITE, ["sulfur dioxide", "sulfites", "sulfite"], ["EFSA Journal 2022;20(11):7594"]],
  ["e221", "Sodium sulfite", "preservative", "moderate", SULFITE, ["sodium sulfite"]],
  ["e222", "Sodium bisulfite", "preservative", "moderate", SULFITE, ["sodium bisulfite", "sodium hydrogen sulfite"]],
  ["e223", "Sodium metabisulfite", "preservative", "moderate", SULFITE, ["sodium metabisulfite"]],
  ["e224", "Potassium metabisulfite", "preservative", "moderate", SULFITE, ["potassium metabisulfite"]],
  ["e226", "Calcium sulfite", "preservative", "moderate", SULFITE],
  ["e227", "Calcium bisulfite", "preservative", "moderate", SULFITE],
  ["e228", "Potassium bisulfite", "preservative", "moderate", SULFITE],
  ["e234", "Nisin", "preservative", "none", undefined, ["nisin"]],
  ["e235", "Natamycin", "preservative", "limited", "Antifungal antibiotic; concern about resistance if overused.", ["natamycin"]],
  ["e239", "Hexamethylenetetramine", "preservative", "moderate", "Releases formaldehyde; restricted to one cheese type in the EU.", ["hexamine"]],
  ["e242", "Dimethyl dicarbonate", "preservative", "limited", "Breaks down to methanol in small amounts.", ["dimethyl dicarbonate"]],
  ["e249", "Potassium nitrite", "preservative", "high", "Forms nitrosamines; IARC classifies ingested nitrite under nitrosating conditions as probably carcinogenic (2A); ANSES 2022 links it to colorectal cancer.", ["potassium nitrite"], ["IARC Monographs vol. 94", "ANSES 2022"]],
  ["e250", "Sodium nitrite", "preservative", "high", "Forms nitrosamines; IARC classifies ingested nitrite under nitrosating conditions as probably carcinogenic (2A); ANSES 2022 links it to colorectal cancer.", ["sodium nitrite"], ["IARC Monographs vol. 94", "ANSES 2022"]],
  ["e251", "Sodium nitrate", "preservative", "high", "Converted to nitrite in the body and in the product; ANSES 2022 recommends reducing exposure.", ["sodium nitrate"], ["ANSES 2022"]],
  ["e252", "Potassium nitrate", "preservative", "high", "Converted to nitrite in the body and in the product; ANSES 2022 recommends reducing exposure.", ["potassium nitrate", "saltpeter"], ["ANSES 2022"]],
  ["e260", "Acetic acid", "acid", "none", undefined, ["acetic acid"]],
  ["e262", "Sodium acetates", "preservative", "none", undefined, ["sodium acetate", "sodium diacetate"]],
  ["e270", "Lactic acid", "acid", "none", undefined, ["lactic acid"]],
  ["e280", "Propionic acid", "preservative", "limited", "Some studies link propionate to metabolic changes; evidence is preliminary.", ["propionic acid"]],
  ["e281", "Sodium propionate", "preservative", "limited", "Some studies link propionate to metabolic changes; evidence is preliminary.", ["sodium propionate"]],
  ["e282", "Calcium propionate", "preservative", "limited", "Some studies link propionate to metabolic changes; evidence is preliminary.", ["calcium propionate"]],
  ["e284", "Boric acid", "preservative", "moderate", "Reproductive toxicity at high doses; EU allows it only in caviar."],
  ["e290", "Carbon dioxide", "propellant", "none", undefined, ["carbon dioxide"]],
  ["e296", "Malic acid", "acid", "none", undefined, ["malic acid"]],
  ["e297", "Fumaric acid", "acid", "none", undefined, ["fumaric acid"]],

  // Antioxidants
  ["e300", "Ascorbic acid (vitamin C)", "antioxidant", "none", undefined, ["ascorbic acid"]],
  ["e301", "Sodium ascorbate", "antioxidant", "none", undefined, ["sodium ascorbate"]],
  ["e302", "Calcium ascorbate", "antioxidant", "none", undefined, ["calcium ascorbate"]],
  ["e304", "Ascorbyl palmitate", "antioxidant", "none", undefined, ["ascorbyl palmitate"]],
  ["e306", "Tocopherols (vitamin E)", "antioxidant", "none", undefined, ["mixed tocopherols", "tocopherols", "tocopherol"]],
  ["e307", "Alpha-tocopherol", "antioxidant", "none", undefined, ["alpha tocopherol"]],
  ["e310", "Propyl gallate", "antioxidant", "moderate", "Possible endocrine disruptor in lab studies; can cause skin and stomach irritation.", ["propyl gallate"]],
  ["e315", "Erythorbic acid", "antioxidant", "none", undefined, ["erythorbic acid"]],
  ["e316", "Sodium erythorbate", "antioxidant", "none", undefined, ["sodium erythorbate"]],
  ["e319", "TBHQ", "antioxidant", "moderate", "Animal studies show effects on the immune system at high doses; EFSA ADI 0.7 mg/kg.", ["tbhq", "tertiary butylhydroquinone", "tert butylhydroquinone"]],
  ["e320", "BHA", "antioxidant", "high", "IARC Group 2B (possibly carcinogenic); suspected endocrine disruptor.", ["bha", "butylated hydroxyanisole"], ["IARC Monographs vol. 40"]],
  ["e321", "BHT", "antioxidant", "moderate", "Mixed evidence on liver and thyroid effects at high doses in animals; suspected endocrine disruptor.", ["bht", "butylated hydroxytoluene"]],
  ["e322", "Lecithins", "emulsifier", "none", undefined, ["soy lecithin", "soya lecithin", "sunflower lecithin", "rapeseed lecithin", "lecithin"]],
  ["e325", "Sodium lactate", "acidity regulator", "none", undefined, ["sodium lactate"]],
  ["e326", "Potassium lactate", "acidity regulator", "none", undefined, ["potassium lactate"]],
  ["e327", "Calcium lactate", "acidity regulator", "none", undefined, ["calcium lactate"]],
  ["e330", "Citric acid", "acid", "none", undefined, ["citric acid"]],
  ["e331", "Sodium citrates", "acidity regulator", "none", undefined, ["sodium citrate", "trisodium citrate"]],
  ["e332", "Potassium citrates", "acidity regulator", "none", undefined, ["potassium citrate"]],
  ["e333", "Calcium citrates", "acidity regulator", "none", undefined, ["calcium citrate"]],
  ["e334", "Tartaric acid", "acid", "none", undefined, ["tartaric acid"]],
  ["e338", "Phosphoric acid", "acid", "limited", PHOSPHATE + " Also erodes tooth enamel in soft drinks.", ["phosphoric acid"], ["EFSA Journal 2019;17(6):5674"]],
  ["e339", "Sodium phosphates", "acidity regulator", "limited", PHOSPHATE, ["sodium phosphate", "disodium phosphate", "trisodium phosphate", "monosodium phosphate"], ["EFSA Journal 2019;17(6):5674"]],
  ["e340", "Potassium phosphates", "acidity regulator", "limited", PHOSPHATE, ["potassium phosphate", "dipotassium phosphate", "monopotassium phosphate", "tripotassium phosphate"], ["EFSA Journal 2019;17(6):5674"]],
  ["e341", "Calcium phosphates", "acidity regulator", "limited", PHOSPHATE, ["calcium phosphate", "tricalcium phosphate", "monocalcium phosphate", "dicalcium phosphate"], ["EFSA Journal 2019;17(6):5674"]],
  ["e385", "Calcium disodium EDTA", "sequestrant", "limited", "Can bind minerals; acceptable at permitted levels but adds to processing.", ["calcium disodium edta", "disodium edta", "edta"]],
  ["e392", "Rosemary extract", "antioxidant", "none", undefined, ["rosemary extract"]],

  // Thickeners, gelling agents, emulsifiers
  ["e400", "Alginic acid", "thickener", "none", undefined, ["alginic acid"]],
  ["e401", "Sodium alginate", "thickener", "none", undefined, ["sodium alginate"]],
  ["e406", "Agar", "gelling agent", "none", undefined, ["agar"]],
  ["e407", "Carrageenan", "thickener", "moderate", GUT + " EFSA (2018) asked for more data on infants and gut effects.", ["carrageenan"], ["EFSA Journal 2018;16(4):5238"]],
  ["e407a", "Processed eucheuma seaweed", "thickener", "moderate", GUT, ["processed eucheuma seaweed"]],
  ["e410", "Locust bean gum", "thickener", "none", undefined, ["locust bean gum", "carob bean gum", "carob gum"]],
  ["e412", "Guar gum", "thickener", "none", undefined, ["guar gum"]],
  ["e413", "Tragacanth", "thickener", "none", undefined, ["tragacanth"]],
  ["e414", "Gum arabic", "thickener", "none", undefined, ["gum arabic", "acacia gum"]],
  ["e415", "Xanthan gum", "thickener", "none", undefined, ["xanthan gum", "xanthan"]],
  ["e416", "Karaya gum", "thickener", "limited", "Occasional allergic reactions.", ["karaya gum"]],
  ["e417", "Tara gum", "thickener", "none", undefined, ["tara gum"]],
  ["e418", "Gellan gum", "gelling agent", "none", undefined, ["gellan gum", "gellan"]],
  ["e420", "Sorbitol", "sweetener", "limited", POLYOL, ["sorbitol"]],
  ["e421", "Mannitol", "sweetener", "limited", POLYOL, ["mannitol"]],
  ["e422", "Glycerol", "humectant", "none", undefined, ["glycerol", "glycerin", "glycerine", "vegetable glycerin"]],
  ["e425", "Konjac", "thickener", "limited", "Choking risk in mini jelly cups (banned in that form in the EU).", ["konjac", "glucomannan"]],
  ["e432", "Polysorbate 20", "emulsifier", "limited", "Same family as polysorbate 80, less studied.", ["polysorbate 20"]],
  ["e433", "Polysorbate 80", "emulsifier", "moderate", GUT + " (Chassaing et al., Nature 2015).", ["polysorbate 80"], ["Chassaing et al., Nature 2015"]],
  ["e435", "Polysorbate 60", "emulsifier", "limited", "Same family as polysorbate 80, less studied.", ["polysorbate 60"]],
  ["e436", "Polysorbate 65", "emulsifier", "limited", "Same family as polysorbate 80, less studied.", ["polysorbate 65"]],
  ["e440", "Pectins", "gelling agent", "none", undefined, ["pectin", "fruit pectin"]],
  ["e442", "Ammonium phosphatides", "emulsifier", "limited", PHOSPHATE],
  ["e443", "Brominated vegetable oil", "emulsifier", "high", "FDA revoked its authorisation in 2024 (bromine build-up, thyroid effects); not permitted in the EU.", ["brominated vegetable oil", "bvo"], ["FDA 2024 final rule"]],
  ["e450", "Diphosphates", "emulsifying salt", "limited", PHOSPHATE, ["sodium acid pyrophosphate", "tetrasodium pyrophosphate", "disodium pyrophosphate", "tetrapotassium pyrophosphate", "diphosphate", "pyrophosphate"], ["EFSA Journal 2019;17(6):5674"]],
  ["e451", "Triphosphates", "emulsifying salt", "limited", PHOSPHATE, ["sodium tripolyphosphate", "pentasodium triphosphate", "triphosphate"], ["EFSA Journal 2019;17(6):5674"]],
  ["e452", "Polyphosphates", "emulsifying salt", "limited", PHOSPHATE, ["sodium hexametaphosphate", "sodium polyphosphate", "polyphosphate"], ["EFSA Journal 2019;17(6):5674"]],
  ["e460", "Cellulose", "bulking agent", "none", undefined, ["microcrystalline cellulose", "powdered cellulose", "cellulose"]],
  ["e461", "Methylcellulose", "thickener", "none", undefined, ["methylcellulose"]],
  ["e464", "Hydroxypropyl methylcellulose", "thickener", "none", undefined, ["hydroxypropyl methylcellulose", "hypromellose", "hpmc"]],
  ["e466", "Carboxymethylcellulose", "thickener", "moderate", GUT + " A 2022 human feeding trial found altered gut bacteria (Chassaing et al., Gastroenterology).", ["carboxymethylcellulose", "sodium carboxymethylcellulose", "cellulose gum", "carboxymethyl cellulose"], ["Chassaing et al., Gastroenterology 2022"]],
  ["e470", "Fatty acid salts", "emulsifier", "none", undefined, ["magnesium stearate", "calcium stearate"]],
  ["e471", "Mono- and diglycerides of fatty acids", "emulsifier", "moderate", EMULSIFIER_COHORT, ["mono and diglycerides", "mono and diglycerides of fatty acids", "monoglycerides", "diglycerides", "mono diglycerides"], ["Sellem et al., BMJ 2023", "Sellem et al., PLOS Med 2024"]],
  ["e472a", "Acetic acid esters of mono- and diglycerides", "emulsifier", "limited", "Emulsifier family studied in the NutriNet-Santé cohort; weaker signal than E471/E472e."],
  ["e472b", "Lactic acid esters of mono- and diglycerides", "emulsifier", "limited", "Emulsifier family studied in the NutriNet-Santé cohort; weaker signal than E471/E472e."],
  ["e472c", "Citric acid esters of mono- and diglycerides", "emulsifier", "limited", "Emulsifier family studied in the NutriNet-Santé cohort; weaker signal than E471/E472e."],
  ["e472e", "DATEM", "emulsifier", "moderate", EMULSIFIER_COHORT, ["datem", "diacetyl tartaric acid esters of mono and diglycerides", "diacetyl tartaric acid ester of mono and diglycerides"], ["Sellem et al., BMJ 2023"]],
  ["e473", "Sucrose esters of fatty acids", "emulsifier", "limited", "Emulsifier; limited long-term data.", ["sucrose esters"]],
  ["e475", "Polyglycerol esters of fatty acids", "emulsifier", "limited", "Emulsifier; limited long-term data.", ["polyglycerol esters"]],
  ["e476", "Polyglycerol polyricinoleate (PGPR)", "emulsifier", "limited", "Emulsifier used to cut cocoa butter; limited long-term data.", ["polyglycerol polyricinoleate", "pgpr"]],
  ["e477", "Propylene glycol esters of fatty acids", "emulsifier", "limited", "Emulsifier; limited long-term data.", ["propylene glycol esters"]],
  ["e481", "Sodium stearoyl lactylate", "emulsifier", "limited", "Emulsifier; limited long-term data.", ["sodium stearoyl lactylate", "sodium stearoyl 2 lactylate"]],
  ["e482", "Calcium stearoyl lactylate", "emulsifier", "limited", "Emulsifier; limited long-term data.", ["calcium stearoyl lactylate"]],
  ["e491", "Sorbitan monostearate", "emulsifier", "limited", "Emulsifier; limited long-term data.", ["sorbitan monostearate"]],

  // Acidity regulators, raising and anti-caking agents
  ["e500", "Sodium carbonates", "raising agent", "none", undefined, ["sodium bicarbonate", "baking soda", "sodium carbonate", "bicarbonate of soda"]],
  ["e501", "Potassium carbonates", "raising agent", "none", undefined, ["potassium carbonate", "potassium bicarbonate"]],
  ["e503", "Ammonium carbonates", "raising agent", "none", undefined, ["ammonium bicarbonate", "ammonium carbonate"]],
  ["e504", "Magnesium carbonates", "anti-caking agent", "none", undefined, ["magnesium carbonate"]],
  ["e507", "Hydrochloric acid", "acid", "none"],
  ["e508", "Potassium chloride", "flavour enhancer", "none", undefined, ["potassium chloride"]],
  ["e509", "Calcium chloride", "firming agent", "none", undefined, ["calcium chloride"]],
  ["e516", "Calcium sulfate", "firming agent", "none", undefined, ["calcium sulfate"]],
  ["e520", "Aluminium sulfate", "firming agent", "moderate", ALUMINIUM, ["aluminum sulfate"]],
  ["e521", "Aluminium sodium sulfate", "firming agent", "moderate", ALUMINIUM, ["sodium aluminum sulfate"]],
  ["e522", "Aluminium potassium sulfate", "firming agent", "moderate", ALUMINIUM, ["potassium aluminum sulfate"]],
  ["e523", "Aluminium ammonium sulfate", "firming agent", "moderate", ALUMINIUM],
  ["e524", "Sodium hydroxide", "acidity regulator", "none", undefined, ["sodium hydroxide"]],
  ["e541", "Sodium aluminium phosphate", "raising agent", "moderate", ALUMINIUM, ["sodium aluminum phosphate"]],
  ["e551", "Silicon dioxide", "anti-caking agent", "limited", "EFSA (2018) found data gaps, including on nano-sized particles.", ["silicon dioxide", "silica"], ["EFSA Journal 2018;16(1):5088"]],
  ["e553b", "Talc", "anti-caking agent", "limited", "Data gaps; possible asbestos contamination is a known concern for talc generally.", ["talc"]],
  ["e554", "Sodium aluminium silicate", "anti-caking agent", "moderate", ALUMINIUM, ["sodium aluminosilicate"]],
  ["e570", "Fatty acids", "glazing agent", "none", undefined, ["stearic acid"]],
  ["e575", "Glucono delta-lactone", "acidity regulator", "none", undefined, ["glucono delta lactone"]],

  // Flavour enhancers
  ["e620", "Glutamic acid", "flavour enhancer", "limited", "EFSA (2017) set a group limit for glutamates that high consumers can exceed.", ["glutamic acid"], ["EFSA Journal 2017;15(7):4910"]],
  ["e621", "Monosodium glutamate (MSG)", "flavour enhancer", "limited", "EFSA (2017) set a group limit for glutamates that high consumers can exceed; some people report sensitivity.", ["monosodium glutamate", "msg"], ["EFSA Journal 2017;15(7):4910"]],
  ["e622", "Monopotassium glutamate", "flavour enhancer", "limited", "EFSA (2017) set a group limit for glutamates.", ["monopotassium glutamate"]],
  ["e627", "Disodium guanylate", "flavour enhancer", "limited", "Purine source; people with gout are advised to limit it.", ["disodium guanylate"]],
  ["e631", "Disodium inosinate", "flavour enhancer", "limited", "Purine source; people with gout are advised to limit it.", ["disodium inosinate"]],
  ["e635", "Disodium 5'-ribonucleotides", "flavour enhancer", "limited", "Purine source; people with gout are advised to limit it.", ["disodium 5 ribonucleotides", "disodium ribonucleotides"]],

  // Glazing agents and misc.
  ["e900", "Dimethylpolysiloxane", "anti-foaming agent", "limited", "Silicone anti-foaming agent; limited long-term data.", ["dimethylpolysiloxane", "polydimethylsiloxane"]],
  ["e901", "Beeswax", "glazing agent", "none", undefined, ["beeswax"]],
  ["e903", "Carnauba wax", "glazing agent", "none", undefined, ["carnauba wax"]],
  ["e904", "Shellac", "glazing agent", "none", undefined, ["shellac", "confectioner's glaze", "confectioners glaze"]],
  ["e920", "L-cysteine", "flour treatment", "none", undefined, ["l cysteine"]],
  ["e924", "Potassium bromate", "flour treatment", "high", "IARC Group 2B (possibly carcinogenic); banned in the EU, UK, Canada and California (from 2027).", ["potassium bromate", "bromated flour"], ["IARC Monographs vol. 73"]],
  ["e927a", "Azodicarbonamide", "flour treatment", "moderate", "Not permitted in the EU; breaks down into semicarbazide, a concern flagged by WHO.", ["azodicarbonamide"]],
  ["e928", "Benzoyl peroxide", "flour treatment", "moderate", "Bleaching agent; not permitted as a flour treatment in the EU.", ["benzoyl peroxide"]],
  ["e941", "Nitrogen", "propellant", "none", undefined, ["nitrogen"]],

  // Sweeteners
  ["e950", "Acesulfame K", "sweetener", "moderate", NNS_WHY + " Associated with cancer and cardiovascular risk in the NutriNet-Santé cohort (2022).", ["acesulfame potassium", "acesulfame k", "ace k", "acesulfame", "acesulfam k", "acesulfam de potasiu", "acesulfamo k", "acesulfam"], ["WHO NSS guideline 2023", "Debras et al., PLOS Med 2022"]],
  ["e951", "Aspartame", "sweetener", "moderate", "IARC Group 2B (possibly carcinogenic, 2023); JECFA kept the 40 mg/kg limit. Dangerous for people with phenylketonuria.", ["aspartame", "aspartam", "aspartamo"], ["IARC Monographs vol. 134", "JECFA 2023"]],
  ["e952", "Cyclamates", "sweetener", "moderate", NNS_WHY + " Not permitted in the US.", ["cyclamate", "sodium cyclamate", "cyclamat", "ciclamato", "zyklamat"]],
  ["e954", "Saccharin", "sweetener", "limited", NNS_WHY, ["saccharin", "sodium saccharin", "sacarina", "saccarina", "sacharin"]],
  ["e955", "Sucralose", "sweetener", "moderate", NNS_WHY + " A 2023 lab study found a breakdown product (sucralose-6-acetate) to be genotoxic.", ["sucralose", "sucralosa", "sukraloza"], ["Schiffman et al., J Toxicol Environ Health B 2023"]],
  ["e957", "Thaumatin", "sweetener", "none", undefined, ["thaumatin"]],
  ["e959", "Neohesperidin DC", "sweetener", "limited", NNS_WHY, ["neohesperidin dihydrochalcone"]],
  ["e960", "Steviol glycosides", "sweetener", "limited", NNS_WHY, ["steviol glycosides", "stevia leaf extract", "stevia extract", "stevia", "rebaudioside a", "reb a", "reb m"]],
  ["e961", "Neotame", "sweetener", "limited", NNS_WHY, ["neotame"]],
  ["e962", "Aspartame-acesulfame salt", "sweetener", "moderate", "Combines aspartame and acesulfame; see both.", ["aspartame acesulfame salt"]],
  ["e965", "Maltitol", "sweetener", "limited", POLYOL, ["maltitol", "maltitol syrup"]],
  ["e966", "Lactitol", "sweetener", "limited", POLYOL, ["lactitol"]],
  ["e967", "Xylitol", "sweetener", "limited", POLYOL + " Highly toxic to dogs.", ["xylitol"]],
  ["e968", "Erythritol", "sweetener", "limited", POLYOL + " A 2023 study associated high blood erythritol with cardiovascular events (Witkowski et al., Nature Medicine); observational.", ["erythritol"], ["Witkowski et al., Nat Med 2023"]],
  ["e969", "Advantame", "sweetener", "limited", NNS_WHY, ["advantame"]],

  // Other
  ["e1105", "Lysozyme", "preservative", "limited", "Derived from egg: allergen.", ["lysozyme"]],
  ["e1200", "Polydextrose", "bulking agent", "limited", "Laxative effect at high intake.", ["polydextrose"]],
  ["e14xx", "Modified starch", "modified starch", "none", undefined, ["modified food starch", "modified corn starch", "modified tapioca starch", "modified potato starch", "modified maize starch", "modified wheat starch", "modified starch"]],
  ["e1422", "Acetylated distarch adipate", "modified starch", "none", undefined, ["acetylated distarch adipate"]],
  ["e1442", "Hydroxypropyl distarch phosphate", "modified starch", "none", undefined, ["hydroxypropyl distarch phosphate"]],
  ["e1450", "Starch sodium octenyl succinate", "modified starch", "none", undefined, ["sodium octenyl succinate", "starch sodium octenyl succinate"]],
  ["e1505", "Triethyl citrate", "carrier", "none", undefined, ["triethyl citrate"]],
  ["e1518", "Triacetin", "carrier", "none", undefined, ["triacetin", "glyceryl triacetate"]],
  ["e1520", "Propylene glycol", "carrier", "limited", "Generally safe at permitted levels; restricted in the EU to carrier uses.", ["propylene glycol"]],
];

export const ADDITIVES: Map<string, AdditiveInfo> = new Map(
  ROWS.map(([code, name, fn, risk, why, , sources]) => [
    code,
    {
      code,
      name,
      function: fn,
      risk,
      ...(why ? { why } : {}),
      ...(sources ? { sources } : {}),
      ...(UPF_FUNCTIONS.has(fn) ? { upf: true } : {}),
      ...(NNS.has(code) ? { nns: true } : {}),
    },
  ]),
);

/** Lower-case label names mapped to codes, longest first so specific names win. */
export const ADDITIVE_ALIASES: [alias: string, code: string][] = ROWS.flatMap(([code, , , , , aliases]) =>
  (aliases ?? []).map((alias) => [normaliseText(alias), code] as [string, string]),
).sort((a, b) => b[0].length - a[0].length);

/** Normalise "E 150 d", "en:e150d", "E471(ii)", "INS 330" to "e150d" / "e471" / "e330". */
export function normaliseAdditiveCode(raw: string): string | undefined {
  const m = raw
    .toLowerCase()
    .replace(/^[a-z]{2}:/, "")
    .match(/^(?:e|ins)?\s*-?\s*(\d{3,4})\s*([a-g])?/);
  if (!m) return undefined;
  return `e${m[1]}${m[2] ?? ""}`;
}

/** Look up an additive by code, falling back to its family (e150d -> e150) or to "unknown". */
export function lookupAdditive(code: string): AdditiveInfo {
  const exact = ADDITIVES.get(code);
  if (exact) return exact;
  const family = ADDITIVES.get(code.replace(/[a-z]$/, ""));
  if (family) return { ...family, code };
  return { code, name: code.toUpperCase(), function: "additive", risk: "unknown" };
}

/** Find an additive by code ("E250"), name ("sodium nitrite") or label alias ("Red 40"). */
export function findAdditive(query: string): AdditiveInfo | undefined {
  const code = normaliseAdditiveCode(query.trim());
  if (code && /\d/.test(query)) {
    const hit = lookupAdditive(code);
    if (hit.risk !== "unknown" || ADDITIVES.has(code)) return hit;
  }
  const q = normaliseText(query);
  for (const [alias, c] of ADDITIVE_ALIASES) if (q === alias) return ADDITIVES.get(c);
  for (const info of ADDITIVES.values()) if (normaliseText(info.name) === q) return info;
  for (const [alias, c] of ADDITIVE_ALIASES) if (q.includes(alias)) return ADDITIVES.get(c);
  return undefined;
}

/** Lower-case, strip accents and US label noise ("FD&C", "No.", "#") so aliases match. */
export function normaliseText(s: string): string {
  return s
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/fd\s*&\s*c\s*/g, "")
    .replace(/\bno\.\s*/g, "")
    .replace(/#\s*/g, "")
    .replace(/colour/g, "color")
    .replace(/sulph/g, "sulf")
    .replace(/aluminium/g, "aluminum")
    .replace(/flavour/g, "flavor")
    .replace(/[‐-―-]/g, " ")
    .replace(/[’']/g, "")
    .replace(/\s+/g, " ")
    .trim();
}
