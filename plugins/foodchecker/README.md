# FoodChecker

FoodChecker tells you how healthy a packaged food or drink is. Give it a barcode or a product name, or share a photo of the label. You get a 0–100 score (Excellent, Good, Poor or Bad) with the reasons:

- **Nutrition:** based on Nutri-Score 2023.
- **Additives:** each one has a risk level and a cited source.
- **Processing:** how processed the food is, on the NOVA scale.
- **Healthier alternatives:** similar products from the same category that score better.

## What's included

- **MCP server** (`foodchecker`): connects to the hosted FoodChecker server at `https://foodchecker-ebon.vercel.app/mcp`. No account or API key needed. It has four read-only tools: `check_food`, `analyze_label`, `find_healthier_alternatives` and `explain_additive`.
- **Skill** (`food-check`): tells Claude when to use each tool and how to read a label photo.

## Try it

- "Is Nutella healthy?"
- "Check barcode 5449000000996"
- A photo of a cereal box's ingredients and nutrition panel, with "is this good for my kids?"
- "What should I buy instead of Coca-Cola?"
- "What is E471 and is it bad?"

## Data and privacy

Product data comes from Open Food Facts (ODbL). The server keeps no personal data, and it never receives your photos; Claude reads the label and sends only the text. See the [privacy policy](https://foodchecker-ebon.vercel.app/privacy) and [how the score works](https://github.com/kjagsadvisors/foodchecker/blob/main/docs/METHODOLOGY.md).

FoodChecker gives general information, not medical advice.
