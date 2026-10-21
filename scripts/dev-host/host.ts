/**
 * A minimal MCP Apps host built on the official AppBridge, for checking the widget
 * the way ChatGPT and Claude embed it. Build with `npm run dev:host`, then open
 * http://localhost:3000/dev/host?barcode=5449000000996 while `npm run dev` is running.
 */
import { AppBridge, PostMessageTransport } from "@modelcontextprotocol/ext-apps/app-bridge";
import { Client, StreamableHTTPClientTransport } from "@modelcontextprotocol/client";

const log = (msg: string) => {
  const li = document.createElement("li");
  li.textContent = `${new Date().toLocaleTimeString()} ${msg}`;
  document.getElementById("log")!.prepend(li);
};

async function main() {
  const params = new URLSearchParams(location.search);
  const tool = params.get("tool") ?? "check_food";
  const args: Record<string, unknown> = params.get("barcode")
    ? { barcode: params.get("barcode") }
    : params.get("additive")
      ? { additive: params.get("additive") }
      : { query: params.get("q") ?? "nutella" };

  const client = new Client({ name: "foodchecker-dev-host", version: "0.0.0" });
  await client.connect(new StreamableHTTPClientTransport(new URL("/mcp", location.origin)));
  const { tools } = await client.listTools();
  const uri = (tools.find((t) => t.name === tool)?._meta as { ui?: { resourceUri?: string } })?.ui?.resourceUri;
  if (!uri) throw new Error(`Tool ${tool} has no UI resource`);
  const res = await client.readResource({ uri });
  const html = (res.contents[0] as { text: string }).text;
  log(`read ${uri} (${html.length} chars)`);

  const iframe = document.getElementById("view") as HTMLIFrameElement;
  iframe.srcdoc = html;
  await new Promise((r) => iframe.addEventListener("load", r, { once: true }));

  const theme = params.get("theme") === "dark" ? "dark" : "light";
  const bridge = new AppBridge(
    client,
    { name: "foodchecker-dev-host", version: "0.0.0" },
    { openLinks: {}, serverTools: {}, logging: {} },
    { hostContext: { theme, displayMode: "inline", platform: "web" } },
  );
  bridge.onsizechange = ({ height }) => {
    if (height) iframe.style.height = `${height}px`;
    log(`size-changed height=${height}`);
  };
  bridge.onopenlink = async ({ url }) => {
    log(`open-link ${url}`);
    return {};
  };
  bridge.onmessage = async ({ content }) => {
    log(`message: ${JSON.stringify(content)}`);
    return {};
  };
  bridge.oninitialized = async () => {
    log("view initialized");
    await bridge.sendToolInput({ arguments: args });
    const result = await client.callTool({ name: tool, arguments: args });
    await bridge.sendToolResult(result as Parameters<typeof bridge.sendToolResult>[0]);
    log(`sent tool-result for ${tool}`);
  };
  await bridge.connect(new PostMessageTransport(iframe.contentWindow!, iframe.contentWindow!));
  log("bridge connected");
}

main().catch((e) => log(`ERROR ${e?.message ?? e}`));
