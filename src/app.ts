/**
 * Web-standard request handler (Request -> Response), so it runs on Node, Vercel,
 * Cloudflare Workers, Deno or Bun.
 *
 *   /mcp           MCP endpoint (Streamable HTTP) for ChatGPT, Claude and other clients
 *   /              landing page with setup instructions
 *   /privacy, /terms, /support   pages that app directories link to
 *   /preview       the score card rendered as a normal web page (?barcode= or ?q=)
 *   /api/tool      JSON tool calls used by /preview
 *   /health        liveness check
 */
import { createMcpHandler } from "@modelcontextprotocol/server";
import { VERSION, createServer } from "./mcp/server.js";
import { widgetHtml } from "./mcp/widget.js";
import { ICON_SVG, landingPage, privacyPage, supportPage, termsPage } from "./pages.js";
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
  if (path === "/privacy") return html(privacyPage());
  if (path === "/terms") return html(termsPage());
  if (path === "/support") return html(supportPage(url.origin));
  if (path === "/icon.svg") return new Response(ICON_SVG, { headers: { "content-type": "image/svg+xml", "cache-control": "public, max-age=86400" } });

  return new Response("Not found", { status: 404 });
}

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
}
