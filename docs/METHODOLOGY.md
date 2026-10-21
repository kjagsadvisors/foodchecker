# How the FoodChecker score works

The score is meant to be **explainable**. Every point can be traced back to a number on the label, a public rule or a cited source. If you disagree with a rule, open an issue or a pull request with your evidence.

FoodChecker is general information about packaged food. It is not medical or dietary advice.

## The formula

```
score = nutrition points (0-100)
        × (1 − additive penalty %)
        × (1 − processing penalty %)
        then capped at 49 if a high-risk additive or trans fat is present
```

| Score | Rating |
| --- | --- |
| 75-100 | Excellent |
| 50-74 | Good |
| 25-49 | Poor |
| 0-24 | Bad |

Penalties are percentages, not fixed points. With fixed points every junk food piles up at 0. With percentages a soda (15) still ranks above a chocolate spread (2), and an additive costs a near-perfect product the most.

## 1. Nutrition (the base, 0-100)

FoodChecker uses the **Nutri-Score 2023 algorithm**, the version in force in France, Belgium, Germany, Spain, the Netherlands, Luxembourg and Switzerland since 2024. The thresholds are copied from the Open Food Facts reference implementation (`lib/ProductOpener/Nutriscore.pm`, `points_thresholds_2023`).

- **Negative points:** energy, sugars, saturated fat and salt. Beverages also get 4 extra points if they contain non-nutritive sweeteners.
- **Positive points:** fibre, protein, and the share of fruit, vegetables and legumes.
- **Product families** each have their own rules: general foods, beverages, water, cheese, fats/oils/nuts/seeds, and red meat (which has a protein cap).

When Open Food Facts has an official Nutri-Score for a product, FoodChecker uses that grade, because OFF knows the product's category better than a parser does. When only the label is available, FoodChecker computes the score itself.

The grade sets the band, and the raw Nutri-Score places the product inside it:

| Grade | Nutrition points |
| --- | --- |
| A | 80-100 |
| B | 65-79 |
| C | 45-64 |
| D | 25-44 |
| E | 0-24 |

Plain water always gets 100.

If the nutrition facts are missing (energy, sugars, saturated fat and salt are all needed), **there is no overall score**. FoodChecker still lists the additives and ingredient notes, and asks for a photo of the nutrition panel. It never guesses.

## 2. Additives (up to −45%)

Each additive in `src/core/additives.ts` has one risk level and a written reason.

| Level | Meaning | Penalty |
| --- | --- | --- |
| none | No meaningful concern at normal intake (recent EFSA/JECFA re-evaluation OK) | 0% |
| limited | Concern only for sensitive groups or very high intakes (allergy, laxative effect, gout, kidney disease) | −3% |
| moderate | Credible but incomplete evidence of harm, or a mandatory EU warning label | −10% |
| high | IARC possible/probable carcinogen, genotoxicity not ruled out, or banned for food in major jurisdictions over safety | −25% and score capped at 49 |

Examples and the evidence behind them:

- **High:** sodium nitrite E250 (IARC 2A under nitrosating conditions; ANSES 2022), titanium dioxide E171 (EFSA 2021; EU ban 2022), BHA E320 (IARC 2B), potassium bromate E924 (IARC 2B; banned in the EU, UK and Canada), erythrosine / Red 3 E127 (FDA revocation 2025), brominated vegetable oil (FDA revocation 2024).
- **Moderate:**
  - The six "Southampton" colours, which carry a mandatory EU hyperactivity warning: E102, E104, E110, E122, E124, E129.
  - Caramel colours III/IV, E150c/d (4-MEI, IARC 2B).
  - Aspartame E951 (IARC 2B, 2023).
  - Sucralose and acesulfame K.
  - Carrageenan E407, carboxymethylcellulose E466 and polysorbate 80 E433 (gut-microbiota studies).
  - Emulsifiers E471 and E472e (NutriNet-Santé cohort, BMJ 2023).
  - Sulfites, benzoates, BHT and TBHQ.
- **Limited:** phosphates (EFSA 2019), MSG and the other glutamates (EFSA 2017), polyols (laxative effect), carmine and annatto (allergy).

Additives with no known concern are still listed, so nothing is hidden. An additive not in the table shows as "not rated" and costs nothing. Adding it is a welcome contribution.

## 3. Processing (up to −10%)

FoodChecker uses the **NOVA** classification:

| NOVA | Meaning | Penalty |
| --- | --- | --- |
| 1 | Unprocessed or minimally processed | 0% |
| 2 | Processed culinary ingredients (oil, sugar, salt, butter) | 0% |
| 3 | Processed foods | −3% |
| 4 | Ultra-processed foods | −10% |

When Open Food Facts gives a NOVA group, FoodChecker uses it. Otherwise it estimates the group from the ingredient list. The food counts as NOVA 4 if it contains any marker NOVA lists as "cosmetic" or industrial:

- flavourings, colours, sweeteners, emulsifiers, thickeners, gelling or glazing agents;
- modified starch, maltodextrin, dextrose or glucose syrups, high-fructose syrup;
- hydrogenated or interesterified fat;
- protein isolates or hydrolysed protein.

The card shows which markers it found.

## 4. Ingredient notes

These are shown on the card. Most do not change the score:

| Note | Effect on score |
| --- | --- |
| Partially hydrogenated oil (industrial trans fat) | −25% and capped at 49 |
| High-fructose syrup | Warning only |
| Several kinds of added sugar | Warning only |
| Palm oil | Info only; its saturated fat is already counted |
| Refined seed oils | Info only, for people who choose to avoid them |
| Caffeine | Info only |

Seed oils carry no penalty: current evidence does not show harm at normal intake.

## 5. Negatives and positives on the card

Calories, sugar, saturated fat and salt are each labelled low, moderate or high. FoodChecker takes the stricter of two signals:

- the **UK FSA front-of-pack traffic-light thresholds** (per 100 g, or per 100 ml for drinks);
- the share of the maximum Nutri-Score points that nutrient earned.

Fibre, protein and fruit/veg are shown as positives:

| Nutrient | Shown as a positive when |
| --- | --- |
| Fibre | At least 3 g per 100 g ("source of fibre" under EU claim rules) |
| Protein | At least 12% of energy |
| Fruit / veg / legumes | At least 40% |

## Data and its limits

- **Product data** comes from [Open Food Facts](https://world.openfoodfacts.org) under the ODbL licence. The data is crowd-sourced. A product with a missing or wrong ingredient list gets a less accurate score, and the card says what is missing. Fixing the product on Open Food Facts fixes it for everyone.
- **Search results** come from the Open Food Facts search index. It has no ingredient text, so for alternatives FoodChecker rebuilds the additives from the index's ingredient tags.
- **Organic labels** are shown but not scored. Evidence that organic food is healthier for the eater is weak; its benefits are mostly environmental.
- **Portion size** is not scored. Like Nutri-Score, FoodChecker compares foods per 100 g or 100 ml.
