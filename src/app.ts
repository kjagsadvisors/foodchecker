/**
 * Web-standard request handler (Request -> Response), so it runs on Node, Vercel,
 * Cloudflare Workers, Deno or Bun.
 *
 *   /mcp           MCP endpoint (Streamable HTTP) for ChatGPT, Claude and other clients
 *   /              landing page with setup instructions
 *   /preview       the score card rendered as a normal web page (?barcode= or ?q=)
 *   /api/tool      JSON tool calls used by /preview
 *   /health        liveness check
 */
import { createMcpHandler } from "@modelcontextprotocol/server";
import { VERSION, createServer } from "./mcp/server.js";
import { widgetHtml } from "./mcp/widget.js";
import { UserFacingError, analyzeLabel, checkFood, explainAdditive, findAlternatives } from "./service.js";

const mcp = createMcpHandler(() => createServer());

const CORS: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "*",
  "Access-Control-Expose-Headers": "Mcp-Session-Id, MCP-Protocol-Version, WWW-Authenticate",
};

function withHeaders(res: Response, extra: Record<string, string>): Response {
  const headers = new Headers(res.headers);
  for (const [k, v] of Object.entries(extra)) headers.set(k, v);
  return new Response(res.body, { status: res.status, statusText: res.statusText, headers });
}

const html = (body: string, status = 200) =>
  new Response(body, { status, headers: { "content-type": "text/html; charset=utf-8" } });
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });

async function runTool(name: string, args: Record<string, unknown>) {
  switch (name) {
    case "check_food":
      return checkFood(args as Parameters<typeof checkFood>[0]);
    case "analyze_label":
      return analyzeLabel(args as Parameters<typeof analyzeLabel>[0]);
    case "find_healthier_alternatives":
      return findAlternatives(args as Parameters<typeof findAlternatives>[0]);
    case "explain_additive":
      return explainAdditive(args as Parameters<typeof explainAdditive>[0]);
    default:
      throw new UserFacingError(`Unknown tool ${name}`);
  }
}

export async function handle(request: Request): Promise<Response> {
  const url = new URL(request.url);
  const path = url.pathname.replace(/\/+$/, "") || "/";

  if (request.method === "OPTIONS") return new Response(null, { status: 204, headers: CORS });

  if (path === "/mcp") return withHeaders(await mcp.fetch(request), CORS);

  if (path === "/health") return json({ ok: true, name: "foodchecker", version: VERSION });

  if (path === "/.well-known/openai-apps-challenge" && process.env.OPENAI_APPS_CHALLENGE) {
    return new Response(process.env.OPENAI_APPS_CHALLENGE, { headers: { "content-type": "text/plain" } });
  }

  if (path === "/api/tool" && request.method === "POST") {
    try {
      const body = (await request.json()) as { name?: string; arguments?: Record<string, unknown> };
      const view = await runTool(body.name ?? "", body.arguments ?? {});
      return json({ structuredContent: view });
    } catch (e) {
      const message = e instanceof UserFacingError ? e.message : "Something went wrong.";
      if (!(e instanceof UserFacingError)) console.error(e);
      return json({ error: message }, 400);
    }
  }

  if (path === "/preview") {
    const barcode = url.searchParams.get("barcode") ?? undefined;
    const q = url.searchParams.get("q") ?? undefined;
    const additive = url.searchParams.get("additive");
    try {
      const view = additive
        ? explainAdditive({ additive })
        : url.searchParams.get("alternatives")
          ? await findAlternatives({ barcode: url.searchParams.get("alternatives")! })
          : await checkFood({ barcode, query: q ?? (barcode ? undefined : "nutella") });
      return html(widgetHtml(view, "/api/tool"));
    } catch (e) {
      const message = e instanceof UserFacingError ? e.message : "Something went wrong.";
      return html(`<p style="font-family:system-ui;padding:24px">${escapeHtml(message)}</p>`, 404);
    }
  }

  // Local-only harness that embeds the widget with the official MCP Apps host bridge (npm run dev:host).
  if ((path === "/dev/host" || path === "/dev/host.js") && process.env.NODE_ENV !== "production") {
    const { readFile } = await import("node:fs/promises");
    const file = path === "/dev/host" ? "scripts/dev-host/index.html" : "scripts/dev-host/dist/host.js";
    try {
      const body = await readFile(file, "utf8");
      return new Response(body, { headers: { "content-type": path.endsWith(".js") ? "text/javascript" : "text/html; charset=utf-8" } });
    } catch {
      return new Response("Run `npm run dev:host` first.", { status: 404 });
    }
  }

  if (path === "/") return html(landingPage(url.origin));

  return new Response("Not found", { status: 404 });
}

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
}

function landingPage(origin: string): string {
  const mcpUrl = `${origin}/mcp`;
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>FoodChecker</title>
<style>
:root{--bg:#fafaf8;--fg:#17181c;--muted:#61656f;--line:#e4e5ea;--card:#fff;--accent:#1e9e57}
@media (prefers-color-scheme:dark){:root{--bg:#141518;--fg:#f1f2f4;--muted:#a0a4ae;--line:#2b2d33;--card:#1c1d21}}
*{box-sizing:border-box}body{margin:0;background:var(--bg);color:var(--fg);font:16px/1.55 ui-sans-serif,-apple-system,"Segoe UI",Roboto,sans-serif}
main{max-width:760px;margin:0 auto;padding:48px 16px 64px}h1{font-size:40px;margin:0 0 8px;letter-spacing:-.02em}
.lead{font-size:19px;color:var(--muted);margin:0 0 28px}code,pre{font:13px ui-monospace,Menlo,monospace}
pre{background:var(--card);border:1px solid var(--line);border-radius:10px;padding:12px 14px;overflow:auto}
section{background:var(--card);border:1px solid var(--line);border-radius:14px;padding:20px;margin:16px 0}
h2{font-size:18px;margin:0 0 8px}ol{margin:8px 0 0;padding-left:20px}li{margin:4px 0}a{color:var(--accent)}
form{display:flex;gap:8px;margin:12px 0 0}input{flex:1;font:inherit;padding:10px 12px;border-radius:10px;border:1px solid var(--line);background:var(--bg);color:var(--fg)}
button{font:inherit;padding:10px 16px;border-radius:10px;border:0;background:var(--fg);color:var(--bg);cursor:pointer}
.scale{display:flex;gap:4px;margin:16px 0 0;font-size:13px}.scale span{flex:1;padding:6px 8px;border-radius:8px;color:#fff;font-weight:600}
</style></head><body><main>
<h1>FoodChecker</h1>
<p class="lead">An open-source food label checker that runs inside ChatGPT and Claude. Ask "is this healthy?" with a barcode, a product name or a photo of the label, and get a 0–100 score with the reasons.</p>
<div class="scale"><span style="background:#e5484d">0–24 Bad</span><span style="background:#ef8f2f">25–49 Poor</span><span style="background:#79b94a">50–74 Good</span><span style="background:#1e9e57">75–100 Excellent</span></div>
<section><h2>Try the score card</h2>
<form action="/preview"><input name="q" placeholder="Product name, e.g. Coca-Cola, Oreo, Fage yogurt" aria-label="Product name"><button>Check</button></form>
<form action="/preview"><input name="barcode" placeholder="Or a barcode, e.g. 3017620422003" inputmode="numeric" aria-label="Barcode"><button>Check</button></form></section>
<section><h2>Add to ChatGPT</h2><ol>
<li>Open <b>chatgpt.com/plugins</b>, click <b>+</b>, then <b>Add custom MCP server</b>.</li>
<li>Server URL: <code>${mcpUrl}</code>. Authentication: <b>No authentication</b>.</li>
<li>Create it, then mention FoodChecker in a chat: "Is Nutella healthy?"</li></ol></section>
<section><h2>Add to Claude</h2><ol>
<li>claude.ai or Claude Desktop: <b>Customize → Connectors → Add custom connector</b>.</li>
<li>URL: <code>${mcpUrl}</code>, choose <b>No sign-in</b>.</li>
<li>Claude Code: <code>claude mcp add --transport http foodchecker ${mcpUrl}</code></li></ol></section>
<section><h2>How the score works</h2>
<p>Nutrition quality (Nutri-Score 2023) sets the base from 0 to 100. Risky additives take points off (high −25, moderate −10, limited −3), ultra-processed food takes −10, and a high-risk additive or trans fat caps the score at 49. Every additive rating states its reason and source, and the whole method is open for review.</p></section>
<p style="color:var(--muted);font-size:13px">Product data © Open Food Facts contributors, ODbL. Not medical advice.</p>
</main></body></html>`;
}
