#!/usr/bin/env node
/** Local stdio entry point for Claude Desktop, Claude Code or any MCP client that launches a command. */
import { StdioServerTransport } from "@modelcontextprotocol/server/stdio";
import { createServer } from "./mcp/server.js";

const server = createServer();
await server.connect(new StdioServerTransport());
