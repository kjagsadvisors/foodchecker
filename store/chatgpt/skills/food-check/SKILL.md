---
name: food-check
description: Check whether a packaged food or drink is healthy and explain why, using the FoodChecker tools. Use when the user asks if a food is healthy or "good for me", shares a photo of a food label, ingredient list, nutrition facts or barcode, asks about an additive or E-number (E471, Red 40, carrageenan), or wants a healthier alternative to something they buy.
---

# Food check

FoodChecker scores packaged food from 0 to 100:
75-100 Excellent, 50-74 Good, 25-49 Poor, 0-24 Bad.
Nutrition quality (Nutri-Score 2023) sets the base. Risky additives and ultra-processing take a percentage off. A high-risk additive or trans fat caps the score at 49.

## Pick the tool

| The user gives you | Call |
| --- | --- |
| A barcode (typed, or readable in a photo) | `check_food` with `barcode` |
| A product name ("Is Nutella healthy?") | `check_food` with `query` (include the brand) |
| A photo of the ingredients and/or nutrition panel, or pasted label text | `analyze_label` |
| "What should I buy instead?" | `find_healthier_alternatives` with the barcode from the last result |
| A question about one additive | `explain_additive` |

## Reading a label photo

- Copy the ingredient list word for word, including brackets and E-numbers. The tool finds additives by name ("sodium nitrite", "Yellow 5"), so don't summarise.
- US Nutrition Facts are per serving. Pass `basis: "per_serving"` and `serving_size` in grams (or ml).
- EU labels are usually per 100 g / 100 ml. Pass `basis: "per_100g"`.
- Set `is_drink: true` for beverages, including milk and plant drinks.
- Set `category` for oils, butter, nuts and nut butters (`fat_oil_nuts_seeds`), cheese (`cheese`), or beef, pork and lamb products (`red_meat`). The Nutri-Score rules differ for these.
- If part of the label is unreadable, pass what you can. The result lists what is missing.

## Presenting the result

- Lead with the score and rating, then the two or three biggest reasons, for example "Bad, 15/100: very sugary, ultra-processed, and contains caramel colour E150d."
- In hosts that show the score card, don't repeat the whole breakdown. In text-only hosts, give a short bulleted summary.
- If the score is Poor or Bad and a barcode is known, offer healthier alternatives.
- Never invent or adjust a score. Report only what the tools return.
- If the user mentions a medical condition, say briefly that this is general information, not medical advice.
