/** Static pages: landing, privacy policy, terms of use, support. App directories link to these. */

export const REPO_URL = "https://github.com/kjagsadvisors/foodchecker";
export const SUPPORT_URL = `${REPO_URL}/issues`;
const OPERATOR = "Kjags Advisors";
const EFFECTIVE = "October 21, 2026";

export const ICON_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
  <rect width="512" height="512" rx="112" fill="#1e9e57"/>
  <circle cx="256" cy="256" r="150" fill="none" stroke="#ffffff" stroke-opacity="0.28" stroke-width="40"/>
  <path d="M256 106 A150 150 0 1 1 126.1 181" fill="none" stroke="#ffffff" stroke-width="40" stroke-linecap="round"/>
  <path d="M192 262 L238 308 L324 214" fill="none" stroke="#ffffff" stroke-width="40" stroke-linecap="round" stroke-linejoin="round"/>
</svg>`;

function layout(title: string, body: string): string {
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${title}</title>
<link rel="icon" href="/icon.svg" type="image/svg+xml">
<style>
:root{--bg:#fafaf8;--fg:#17181c;--muted:#61656f;--line:#e4e5ea;--card:#fff;--accent:#1e9e57}
@media (prefers-color-scheme:dark){:root{--bg:#141518;--fg:#f1f2f4;--muted:#a0a4ae;--line:#2b2d33;--card:#1c1d21;--accent:#3ccf7f}}
*{box-sizing:border-box}body{margin:0;background:var(--bg);color:var(--fg);font:16px/1.6 ui-sans-serif,-apple-system,"Segoe UI",Roboto,sans-serif}
main{max-width:760px;margin:0 auto;padding:40px 16px 64px}h1{font-size:36px;margin:0 0 8px;letter-spacing:-.02em}
h2{font-size:19px;margin:28px 0 8px}p,li{color:var(--fg)}.muted{color:var(--muted)}
.lead{font-size:19px;color:var(--muted);margin:0 0 28px}code{font:13px ui-monospace,Menlo,monospace}
section{background:var(--card);border:1px solid var(--line);border-radius:14px;padding:20px;margin:16px 0}
section h2{margin-top:0}ol,ul{padding-left:20px}li{margin:4px 0}a{color:var(--accent)}
form{display:flex;gap:8px;margin:12px 0 0}input{flex:1;min-width:0;font:inherit;padding:10px 12px;border-radius:10px;border:1px solid var(--line);background:var(--bg);color:var(--fg)}
button{font:inherit;padding:10px 16px;border-radius:10px;border:0;background:var(--fg);color:var(--bg);cursor:pointer}
.brand{display:flex;align-items:center;gap:12px;margin-bottom:8px}.brand img{width:48px;height:48px}
.scale{display:flex;gap:4px;margin:16px 0 0;font-size:13px}.scale span{flex:1;padding:6px 8px;border-radius:8px;color:#fff;font-weight:600}
nav{display:flex;gap:16px;flex-wrap:wrap;margin-top:40px;font-size:14px}
</style></head><body><main>${body}
<nav><a href="/">Home</a><a href="/privacy">Privacy</a><a href="/terms">Terms</a><a href="/support">Support</a><a href="${REPO_URL}">Source code</a></nav>
</main></body></html>`;
}

export function landingPage(origin: string): string {
  const mcpUrl = `${origin}/mcp`;
  return layout(
    "FoodChecker",
    `<div class="brand"><img src="/icon.svg" alt=""><h1>FoodChecker</h1></div>
<p class="lead">An open-source food label checker that runs inside ChatGPT and Claude. Ask "is this healthy?" with a barcode, a product name or a photo of the label, and get a 0–100 score with the reasons.</p>
<div class="scale"><span style="background:#e5484d">0–24 Bad</span><span style="background:#ef8f2f">25–49 Poor</span><span style="background:#79b94a">50–74 Good</span><span style="background:#1e9e57">75–100 Excellent</span></div>
<section><h2>Try the score card</h2>
<form action="/preview"><input name="q" placeholder="Product name, e.g. Coca-Cola, Oreo, Fage yogurt" aria-label="Product name"><button>Check</button></form>
<form action="/preview"><input name="barcode" placeholder="Or a barcode, e.g. 3017620422003" inputmode="numeric" aria-label="Barcode"><button>Check</button></form></section>
<section><h2>Add to ChatGPT</h2><ol>
<li>Open <b>chatgpt.com/plugins</b>, click <b>+</b>, then <b>Add custom MCP server</b>.</li>
<li>Server URL: <code>${mcpUrl}</code>. Authentication: <b>No authentication</b>.</li>
<li>Create it, then ask in a chat: "Is Nutella healthy?"</li></ol></section>
<section><h2>Add to Claude</h2><ol>
<li>claude.ai or Claude Desktop: <b>Customize → Connectors → Add custom connector</b>.</li>
<li>URL: <code>${mcpUrl}</code>, choose <b>No sign-in</b>.</li>
<li>Claude Code: <code>claude mcp add --transport http foodchecker ${mcpUrl}</code></li></ol></section>
<section><h2>How the score works</h2>
<p>Nutrition quality (Nutri-Score 2023) sets the base from 0 to 100. Risky additives take a percentage off (high 25%, moderate 10%, limited 3%), and ultra-processed food loses another 10%. A high-risk additive or trans fat caps the score at 49. Every additive rating states its reason and source. <a href="${REPO_URL}/blob/main/docs/METHODOLOGY.md">Read the full method</a>.</p></section>
<p class="muted" style="font-size:13px">Product data © Open Food Facts contributors, ODbL. General information, not medical advice.</p>`,
  );
}

export function privacyPage(): string {
  return layout(
    "Privacy policy · FoodChecker",
    `<h1>Privacy policy</h1>
<p class="muted">Effective ${EFFECTIVE}. FoodChecker is an open-source service operated by ${OPERATOR}. The full source code is public at <a href="${REPO_URL}">${REPO_URL}</a>, so you can check every claim below.</p>

<h2>The short version</h2>
<ul>
<li>No accounts, no sign-in, no cookies, no ads, no analytics or tracking.</li>
<li>We don't sell, share or keep the food questions you ask.</li>
<li>We never receive your photos. Your AI assistant reads the label and sends us only the text it read.</li>
</ul>

<h2>What FoodChecker receives</h2>
<p>When you use FoodChecker in ChatGPT, Claude or another AI assistant, the assistant calls our server with the details needed for that request:</p>
<ul>
<li>a barcode, a product name or search words, and optionally a country;</li>
<li>for label checks, the ingredient list and nutrition values that the assistant read from your photo or text;</li>
<li>for additive questions, the additive's name or E-number.</li>
</ul>
<p>We don't receive your name, email, account details, the rest of your conversation, or your photos. Your conversation with the assistant is covered by that assistant's own privacy policy (for example OpenAI's or Anthropic's).</p>

<h2>How it's used</h2>
<ul>
<li><b>Barcodes and search words</b> are sent to <a href="https://world.openfoodfacts.org">Open Food Facts</a>, an open food database, to look up the product. Open Food Facts sees our server's request, not your identity or IP address.</li>
<li><b>Label text and nutrition values</b> are scored on our server and are not sent to anyone else.</li>
<li>Results are returned to your assistant to show you.</li>
</ul>

<h2>What is stored</h2>
<ul>
<li>We keep product data from Open Food Facts in server memory for up to 12 hours, and search results for up to 1 hour, so repeat lookups are fast. That cache contains the search words used, not who searched. It is never written to disk and is cleared whenever the server restarts.</li>
<li>We don't log the questions you ask. When something breaks unexpectedly, we log the technical error, without your inputs.</li>
<li>Our hosting provider, Vercel, records standard request metadata (such as IP address, time and the page requested) for security and reliability, under <a href="https://vercel.com/legal/privacy-policy">Vercel's privacy policy</a>.</li>
</ul>

<h2>Service providers</h2>
<ul>
<li>Vercel Inc.: hosting.</li>
<li>Open Food Facts: product database. Their data is © Open Food Facts contributors, under the Open Database License.</li>
</ul>

<h2>Children</h2>
<p>FoodChecker isn't directed at children under 13 and doesn't knowingly collect information from them.</p>

<h2>Your choices</h2>
<p>Since we don't keep personal information, there is nothing to access or delete. You can stop using FoodChecker at any time by removing it from your assistant's connectors or apps.</p>

<h2>Changes and contact</h2>
<p>If this policy changes, we'll update this page and its date. You can see every past version in the public repository. Questions: <a href="${SUPPORT_URL}">open an issue on GitHub</a>.</p>`,
  );
}

export function termsPage(): string {
  return layout(
    "Terms of use · FoodChecker",
    `<h1>Terms of use</h1>
<p class="muted">Effective ${EFFECTIVE}. These terms cover the hosted FoodChecker service, operated by ${OPERATOR}. The source code is licensed separately under the MIT License.</p>

<h2>What FoodChecker is</h2>
<p>FoodChecker gives packaged food and drinks a 0–100 score based on nutrition (Nutri-Score), additives and processing, and suggests alternatives. It's free to use.</p>

<h2>Not medical advice</h2>
<p>Scores and explanations are general information. They aren't medical, dietary or allergy advice, and they don't replace a doctor or registered dietitian. Always read the actual product label, especially if you have an allergy or a medical condition. Don't rely on FoodChecker to detect allergens.</p>

<h2>Accuracy</h2>
<p>Product data comes from Open Food Facts, a crowd-sourced database, and from labels read by your AI assistant. Either can be incomplete or wrong. Additive risk levels are an editorial judgement based on published evaluations, explained in our <a href="${REPO_URL}/blob/main/docs/METHODOLOGY.md">methodology</a>. Scores can change as data and evidence improve.</p>

<h2>Acceptable use</h2>
<p>Don't use the service in a way that harms it or others, such as overloading it with automated requests, trying to break into it, or using it to violate the law. Open Food Facts limits request rates, and we may limit or block abusive traffic.</p>

<h2>Data and attribution</h2>
<p>Product data is © Open Food Facts contributors, available under the Open Database License (ODbL). Product images are under CC BY-SA. If you reuse the data, follow those licences.</p>

<h2>No warranty</h2>
<p>The service is provided "as is" and "as available", without warranties of any kind, including fitness for a particular purpose or uninterrupted availability. We may change or stop the service at any time.</p>

<h2>Limitation of liability</h2>
<p>To the fullest extent allowed by law, ${OPERATOR} and FoodChecker's contributors aren't liable for any damages arising from your use of the service, including decisions made based on its scores.</p>

<h2>Changes and contact</h2>
<p>We may update these terms; the date above will change when we do. Questions: <a href="${SUPPORT_URL}">open an issue on GitHub</a>.</p>`,
  );
}

export function supportPage(origin: string): string {
  return layout(
    "Support · FoodChecker",
    `<h1>Support</h1>
<p class="lead">Need help, found a wrong score, or have an idea? We'd like to hear it.</p>
<section><h2>Get help</h2>
<ul>
<li><b>Report a problem or ask a question:</b> <a href="${SUPPORT_URL}">open an issue on GitHub</a>.</li>
<li><b>Wrong product details</b> (name, ingredients, nutrition): fix them on <a href="https://world.openfoodfacts.org">Open Food Facts</a>. FoodChecker picks up the change automatically.</li>
<li><b>Disagree with an additive rating?</b> Open an issue with your source. The ratings and their reasons are in <a href="${REPO_URL}/blob/main/src/core/additives.ts">the additive table</a>.</li>
</ul></section>
<section><h2>Common questions</h2>
<p><b>Why no score?</b> A fair score needs calories, sugar, saturated fat and salt. If the database is missing them, send a photo of the nutrition panel and FoodChecker scores it from the label.</p>
<p><b>Why is a "healthy-looking" product rated low?</b> The card shows the exact math: nutrition points, then the percentages taken off for additives and processing.</p>
<p><b>How do I connect it?</b> Use <code>${origin}/mcp</code> as a custom connector in ChatGPT or Claude. <a href="/">Setup steps</a>.</p>
</section>`,
  );
}
