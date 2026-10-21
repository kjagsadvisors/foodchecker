/** Node entry point: `npm start` serves the MCP endpoint at http://localhost:3000/mcp. */
import { createServer } from "node:http";
import { toNodeHandler } from "@modelcontextprotocol/node";
import { handle } from "./app.js";

const port = Number(process.env.PORT ?? 3000);
const nodeHandler = toNodeHandler({ fetch: (request: Request) => handle(request) });

createServer((req, res) => {
  void nodeHandler(req, res);
}).listen(port, () => {
  console.log(`FoodChecker running on http://localhost:${port} (MCP endpoint: /mcp)`);
});
