# LadybugDB MCP Server

Model Context Protocol (MCP) server for [LadybugDB](https://ladybugdb.com) — the embedded columnar graph database for agentic solutions in highly regulated industries.

This server exposes LadybugDB's capabilities as AI agent tools via the [Streamable HTTP](https://spec.modelcontextprotocol.io/specification/2025-03-26/basic/transport/#streamable-http) transport, enabling Claude, ChatGPT, and other MCP-compatible AI agents to interact with LadybugDB natively.

## Quick Start

```bash
# Install dependencies
npm install

# Start the server
npm start
```

The server listens on `http://localhost:3000` by default. Set the `PORT` environment variable to change the port.

## Endpoints

| Method | Path  | Description                                      |
|--------|-------|--------------------------------------------------|
| POST   | /mcp  | MCP JSON-RPC endpoint (Streamable HTTP)          |
| GET    | /mcp  | SSE stream for resumable connections             |
| DELETE | /mcp  | Session termination                              |

## Available Tools

| Tool              | Description                                    |
|-------------------|------------------------------------------------|
| `execute-query`   | Execute a Cypher query against a database      |
| `list-databases`  | List all available databases                   |
| `get-schema`      | Inspect the graph schema of a database         |
| `create-database` | Create a new empty database                    |
| `health-check`    | Check server health                            |

## MCP Manifest

The MCP server manifest is published at:
- `https://ladybugdb.com/.well-known/mcp/manifest.json`

## Testing with MCP Inspector

```bash
npx @modelcontextprotocol/inspector node server.js
```

## Connecting from Claude Desktop

Add to your `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "ladybugdb": {
      "transport": "streamable-http",
      "url": "http://localhost:3000/mcp"
    }
  }
}
```

## License

MIT
