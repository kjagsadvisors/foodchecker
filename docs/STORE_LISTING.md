# Store submission kit

Every field the stores ask for, ready to paste.

| Store | Status | What's left |
| --- | --- | --- |
| Official MCP Registry | **Live** as `io.github.kjagsadvisors/foodchecker` | Nothing. Re-run the "Publish to MCP Registry" GitHub Action after bumping `server.json`. |
| ChatGPT app directory | Package ready: `store/foodchecker-chatgpt.zip` (`npm run package:chatgpt`) | Verify identity, upload, domain token, demo video, submit |
| Claude connectors directory | Listing, icon and screenshots ready | Paste the fields below, submit |
| Claude plugin directory | `plugins/foodchecker` passes `claude plugin validate` | Connect GitHub in the portal, submit |

Shared links:

| Field | Value |
| --- | --- |
| Website | https://foodchecker-ebon.vercel.app |
| Privacy policy | https://foodchecker-ebon.vercel.app/privacy |
| Terms of use | https://foodchecker-ebon.vercel.app/terms |
| Support | https://foodchecker-ebon.vercel.app/support |
| Docs | https://github.com/kjagsadvisors/foodchecker#readme |
| Icon | `public/icon-1024.png` (1024×1024, square) |
| Publisher | Kjags Advisors |

The hostname `foodchecker-ebon.vercel.app` is now permanent. ChatGPT doesn't allow the MCP origin to change after submission, so moving to a custom domain later means a new ChatGPT submission.

---

## 1. ChatGPT app directory

**MCP URL for the package:** `https://foodchecker-ebon.vercel.app/chatgpt/mcp`. This endpoint carries the `_meta.ui.domain` that ChatGPT review requires.

1. **Verify your identity.** Go to platform.openai.com → Settings → Organization → General. Individual verification publishes under your name; business verification publishes as Kjags Advisors. You must be the org owner or have *Apps Management Write*.
2. **Upload the package.** Go to platform.openai.com/plugins → **Upload new or existing plugin**, choose your developer identity, and upload `store/foodchecker-chatgpt.zip`. The listing text, links, icon, five positive and three negative test cases, and release notes are all inside it.
3. **Connect the server.** In **MCPs → Connect**, set authentication to **None**.
4. **Verify the domain.** Copy the verification token from the Connect drawer. Then either run `vercel env add OPENAI_APPS_CHALLENGE production`, paste the token and redeploy, or send it to Claude to set. The server answers it at `/.well-known/openai-apps-challenge`.
5. **Tool annotation justifications.** The portal asks for one per hint:
   - **readOnlyHint = true** (all tools): "Only reads public food data or scores text the user provides. Nothing is created, changed or deleted."
   - **destructiveHint = false** (all tools): "No data is modified or deleted anywhere."
   - **openWorldHint = true** (`check_food`, `find_healthier_alternatives`): "Queries the public Open Food Facts product database."
   - **openWorldHint = false** (`analyze_label`, `explain_additive`): "Runs entirely on FoodChecker's server with no external calls."
6. **Demo video.** Required. Record 1–2 minutes and upload it as an unlisted YouTube or Loom link, then paste the URL in Review details:
   1. On desktop, ask "Is Nutella healthy?". The card shows Bad. Tap **Find healthier alternatives**.
   2. Ask "Check barcode 5449000000996". Coca-Cola shows Bad, 15/100.
   3. Upload a photo of a cereal box label and ask "Is this healthy?".
   4. Ask "What is E471?".
   5. On the ChatGPT mobile app, repeat step 1.
7. **Review details.** For reviewer access, say no login is needed. For commerce, choose none.
8. **Submit for review.** Accept the policy attestations. After approval, click **Publish plugin**.

---

## 2. Claude connectors directory

Go to claude.ai/directory/manage → **Submit new** → **MCP connector**. You need a Pro, Max, Team or Enterprise plan; on Team or Enterprise, an Owner submits.

| Step | Field | Value |
| --- | --- | --- |
| Connection | Server URL | `https://foodchecker-ebon.vercel.app/mcp` |
| Listing | Name | FoodChecker |
| | One-liner (≤200) | Check whether packaged food is healthy: a 0–100 score from nutrition, additives and processing, with the reasons and healthier alternatives. |
| | Categories | Health & wellness / Lifestyle (closest available) |
| | Documentation | https://github.com/kjagsadvisors/foodchecker#readme |
| | Privacy policy | https://foodchecker-ebon.vercel.app/privacy |
| | Support | https://foodchecker-ebon.vercel.app/support |
| | Icon | `public/icon-1024.png` |
| | Slug (permanent) | `foodchecker` |
| Use cases | | Shoppers checking a product before buying it; reading a label photo; understanding an additive; finding a healthier alternative. Read-only. |
| Company | | Kjags Advisors, https://github.com/kjagsadvisors |
| Authentication | | None |
| Data handling | Whose API | Third-party open API: Open Food Facts, a free public database under the ODbL licence, built for apps like this one. FoodChecker sends it only barcodes and search words, and identifies itself with a User-Agent as Open Food Facts asks. Product photos are proxied through FoodChecker's own domain. |
| | Personal health data | No. Users ask about products; nothing about the user is collected or stored. |
| | Sponsored content | No |
| Test & launch | Reviewer access | No login needed. Example prompts: "Is Nutella healthy?", "Check barcode 5449000000996", "What should I buy instead of Coca-Cola?", "What is E471 and is it bad?" |
| | Allowed link URIs | `https://world.openfoodfacts.org`, `https://foodchecker-ebon.vercel.app` |

**Description (≤2,000 characters):**

> FoodChecker tells you how healthy a packaged food or drink is. Give Claude a barcode or a product name, or share a photo of the label. You get a 0–100 score (Excellent, Good, Poor or Bad) on an interactive card, with the reasons behind it:
>
> - **Nutrition:** based on Nutri-Score 2023.
> - **Additives:** each one has a risk level and a cited source (EFSA, IARC, FDA and peer-reviewed studies).
> - **Processing:** how processed the food is, on the NOVA scale.
>
> FoodChecker can also find similar products that score better, and explain any additive by E-number or name.
>
> All four tools are read-only and need no account. Product data comes from Open Food Facts, an open database of over 3 million products. When an entry is incomplete, the card says what's missing, and a label photo fills the gap. The scoring method and code are open source. FoodChecker gives general information, not medical advice.

**Screenshots** (in `store/screenshots/`; PNG, 1280 px wide, cropped to the card):

| File | Prompt to enter with it |
| --- | --- |
| `1-coca-cola-bad.png` | Is Coca-Cola healthy? The barcode is 5449000000996. |
| `2-fage-yogurt-excellent.png` | Is Fage Total 0% Greek yogurt a good snack? |
| `3-healthier-alternatives.png` | What should I drink instead of Coca-Cola? |
| `4-additive-e471.png` | What is E471 and is it bad for me? |

---

## 3. Claude plugin directory

Use the same portal: claude.ai/directory/manage → **Submit new** → **Plugin bundle**.

1. Connect GitHub with an account that has push access to `kjagsadvisors/foodchecker`.
2. **Repository:** `kjagsadvisors/foodchecker`. **Plugin path:** `plugins/foodchecker`. **Branch:** `main`.
3. Click **Validate**. The listing details come from `plugins/foodchecker/.claude-plugin/plugin.json` and its README.
4. **Data handling:** same answers as the connector above.
5. **Compliance:** enter a contact email and accept the acknowledgements.
6. Submit. After review, click **Publish**.

---

## 4. Optional extra listings

| Directory | How |
| --- | --- |
| Smithery | smithery.ai/new → paste `https://foodchecker-ebon.vercel.app/mcp` |
| Glama | `glama.json` is in the repo. glama.ai/mcp/servers → **Add Server** → the GitHub repo. |
| mcp.so | mcp.so/submit → the GitHub repo |

## Test prompts

Positive cases, where FoodChecker should be used:

| Prompt | Expected result |
| --- | --- |
| "Is Nutella healthy?" | `check_food`. The Ferrero jar, **Bad** (2/100): very sugary, high in saturated fat. |
| "Check barcode 5449000000996" | `check_food`. Coca-Cola, **Bad** (15/100): too sweet, caramel colour E150d, ultra-processed. |
| A pasted or photographed cereal label | `analyze_label`. Per-serving values are converted to per 100 g; **Poor** (about 29/100). |
| "What should I buy instead of Coca-Cola?" | `find_healthier_alternatives`. Better-scoring colas, best first. |
| "What is E471 and is it bad?" | `explain_additive`. Mono- and diglycerides, moderate risk, with sources. |

Negative cases, where FoodChecker should not be used:

| Prompt | Why |
| --- | --- |
| A medical diagnosis or medication question | Out of scope |
| A request to order or buy groceries | No commerce |
| An unrelated recipe request | Not a product check |
