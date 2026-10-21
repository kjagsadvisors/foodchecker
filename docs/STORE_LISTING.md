# Store listing kit

Everything the ChatGPT app directory and the Claude connectors directory ask for, ready to paste.

## Basics

| Field | Value |
| --- | --- |
| Name | FoodChecker |
| MCP server URL | `https://foodchecker-ebon.vercel.app/mcp` |
| Authentication | None (all tools are read-only and public) |
| Website | https://foodchecker-ebon.vercel.app |
| Privacy policy | https://foodchecker-ebon.vercel.app/privacy |
| Terms of use | https://foodchecker-ebon.vercel.app/terms |
| Support | https://foodchecker-ebon.vercel.app/support |
| Source code | https://github.com/kjagsadvisors/foodchecker |
| Icon | `public/icon-1024.png` (1024×1024), `public/icon-512.png`, `public/icon.svg` |
| Category | Lifestyle / Health & fitness (food & nutrition) |
| Publisher | Kjags Advisors |

## Short description (under 80 characters)

> Check if packaged food is healthy: a 0–100 score from the label, with reasons.

## Long description

> FoodChecker tells you how healthy a packaged food or drink is, right in the chat. Give it a barcode or a product name, or snap a photo of the label. You get a 0–100 score (Excellent, Good, Poor or Bad) with the reasons behind it:
>
> - **Nutrition:** based on Nutri-Score 2023.
> - **Additives:** each one has a risk level and a cited source.
> - **Processing:** how processed the food is, on the NOVA scale.
> - **Healthier alternatives:** similar products from the same category that score better.
>
> Product data comes from Open Food Facts, an open database of over 3 million products. The scoring method and the code are open source, so anyone can see exactly why a product got its score. FoodChecker gives general information, not medical advice.

## Tools

| Tool | Read-only | What it does |
| --- | --- | --- |
| `check_food` | Yes | Looks up a product by barcode or name in Open Food Facts and scores it |
| `analyze_label` | Yes | Scores a product from its ingredient list and nutrition facts (photo or pasted text) |
| `find_healthier_alternatives` | Yes | Finds similar products that score clearly higher |
| `explain_additive` | Yes | Explains an additive (E-number or name) and its risk level |

None of the tools write, purchase, send or change anything. They only read public food data.

## Test prompts for reviewers

Positive cases, where FoodChecker should be used:

| Prompt | Expected result |
| --- | --- |
| "Is Nutella healthy?" | `check_food` with a query. Score card shows **Bad**, very sugary, high saturated fat. |
| "Check barcode 5449000000996" | `check_food` with the barcode. Coca-Cola, **Bad (about 15/100)**: too sweet, caramel colour E150d, ultra-processed. |
| A photo of a cereal box's ingredients and nutrition panel, with "is this good for my kids?" | `analyze_label` with the transcribed label. Score card plus missing-data notes if the photo is partial. |
| "What should I buy instead of Coca-Cola?" | `find_healthier_alternatives` with 5449000000996. A list of better-scoring colas. |
| "What is E471 and is it bad?" | `explain_additive`. Mono- and diglycerides, moderate risk, with sources. |

Negative cases, where FoodChecker should *not* be used:

| Prompt | Expected behaviour |
| --- | --- |
| "Give me a recipe for banana bread." | No call; this is a recipe, not a product check. |
| "How many calories should I eat to lose weight?" | No call; personal diet advice is out of scope. |
| "Is ibuprofen safe to take with coffee?" | No call; medication questions are out of scope. |

## Reviewer notes

- No account or test credentials are needed. The server has no authentication.
- Data comes live from Open Food Facts. For a stable demo, use barcodes 5449000000996 (Coca-Cola), 3017620422003 (Nutella) and 5201054016305 (Fage Total 0%).
- Every response includes a plain-text summary, so it also works where the score card isn't shown.
- Health claims: scores come from public standards (Nutri-Score 2023, NOVA) and cited regulatory and scientific sources (EFSA, IARC, FDA). Every result says it is general information, not medical advice. FoodChecker doesn't diagnose, treat or give personalised diet plans, and it tells users not to rely on it for allergens.

## Data and privacy answers

| Question | Answer |
| --- | --- |
| Collects personal data? | No. No accounts, cookies or analytics. |
| What the server receives | Barcodes, product names or search words, and ingredient/nutrition text the assistant read from a label. Never images. |
| Shared with third parties | Barcodes and search words go to Open Food Facts to look up products. Nothing identifies the user. |
| Retention | In-memory cache of product data (12 h) and search results (1 h). Nothing written to disk. Hosting provider (Vercel) keeps standard request logs. |
| Children | Not directed at children under 13. |
