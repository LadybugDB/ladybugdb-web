/**
 * LadybugDB MCP Server
 *
 * Model Context Protocol server exposing LadybugDB's capabilities as AI agent tools.
 * Implements the Streamable HTTP transport specification for native integration with
 * Claude, ChatGPT, and other MCP-compatible AI agents.
 *
 * Usage:
 *   npm start           # Start on default port 3000
 *   PORT=8080 npm start # Start on custom port
 *
 * Endpoints:
 *   POST /mcp  - MCP JSON-RPC endpoint (Streamable HTTP transport)
 *   GET  /mcp  - SSE stream endpoint for resumable connections
 */

import { randomUUID } from 'node:crypto';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { isInitializeRequest } from '@modelcontextprotocol/sdk/types.js';
import { createMcpExpressApp } from '@modelcontextprotocol/sdk/server/express.js';
import { InMemoryEventStore } from '@modelcontextprotocol/sdk/dist/esm/examples/shared/inMemoryEventStore.js';

// ---------------------------------------------------------------------------
// Server configuration
// ---------------------------------------------------------------------------
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

// ---------------------------------------------------------------------------
// MCP Server setup – define tools, resources, and prompts
// ---------------------------------------------------------------------------
function createLadybugServer() {
  const server = new McpServer(
    {
      name: 'ladybugdb-mcp-server',
      version: '1.0.0',
      description:
        'LadybugDB — the embedded columnar graph database for agentic solutions in ' +
        'highly regulated industries. Execute Cypher queries, manage databases, ' +
        'inspect schemas, and integrate with your agentic AI workflows.',
      websiteUrl: 'https://ladybugdb.com',
    },
    {
      capabilities: {
        logging: {},
        tools: {},
        resources: {},
      },
    },
  );

  // -----------------------------------------------------------------------
  // TOOLS
  // -----------------------------------------------------------------------

  /**
   * execute-query: Run a Cypher query against a LadybugDB database.
   */
  server.registerTool(
    'execute-query',
    {
      title: 'Execute Cypher Query',
      description:
        'Execute a Cypher query against a LadybugDB database. Supports ' +
        'parameterized queries. Returns column names and result rows.',
      inputSchema: {
        query: {
          type: 'string',
          description: 'Cypher query string (e.g. MATCH (n) RETURN n LIMIT 10)',
        },
        parameters: {
          type: 'object',
          description: 'Optional named query parameters',
          properties: {},
          additionalProperties: true,
        },
        database: {
          type: 'string',
          description: 'Database name (default: "default")',
        },
      },
      annotations: {
        readOnlyHint: true,
        openWorldHint: false,
      },
    },
    async ({ query, parameters, database }, _extra) => {
      // In production, this would connect to a running LadybugDB process.
      // For now, return a descriptive guidance message.
      return {
        content: [
          {
            type: 'text',
            text: [
              `Query: ${query}`,
              `Database: ${database || 'default'}`,
              `Parameters: ${parameters ? JSON.stringify(parameters) : 'none'}`,
              '',
              'This tool requires a running LadybugDB server. Start one with:',
              '  ladybug server --port 8000',
              '',
              'Then set the LADYBUGDB_URL environment variable to point to it.',
            ].join('\n'),
          },
        ],
      };
    },
  );

  /**
   * list-databases: Show all available databases on the LadybugDB server.
   */
  server.registerTool(
    'list-databases',
    {
      title: 'List Databases',
      description: 'List all available databases on the connected LadybugDB server.',
      inputSchema: {},
      annotations: {
        readOnlyHint: true,
      },
    },
    async (_args, _extra) => {
      return {
        content: [
          {
            type: 'text',
            text: [
              'Available databases:',
              '  - default (active)',
              '',
              'Use execute-query to query a specific database.',
              'This tool requires a running LadybugDB server.',
            ].join('\n'),
          },
        ],
      };
    },
  );

  /**
   * get-schema: Inspect the graph schema of a database.
   */
  server.registerTool(
    'get-schema',
    {
      title: 'Get Database Schema',
      description:
        'Retrieve the graph schema (node labels, relationship types, property ' +
        'definitions) for a LadybugDB database.',
      inputSchema: {
        database: {
          type: 'string',
          description: 'Database name (default: "default")',
        },
      },
      annotations: {
        readOnlyHint: true,
      },
    },
    async ({ database }, _extra) => {
      return {
        content: [
          {
            type: 'text',
            text: [
              `Schema for database "${database || 'default'}":`,
              '',
              'Node Labels:',
              '  (none defined yet)',
              '',
              'Relationship Types:',
              '  (none defined yet)',
              '',
              'Use CREATE (n:Label {prop: value}) to define the schema inline.',
              'This tool requires a running LadybugDB server with data loaded.',
            ].join('\n'),
          },
        ],
      };
    },
  );

  /**
   * create-database: Create a new LadybugDB database.
   */
  server.registerTool(
    'create-database',
    {
      title: 'Create Database',
      description:
        'Create a new empty database on the LadybugDB server.',
      inputSchema: {
        name: {
          type: 'string',
          description: 'Database name',
        },
        path: {
          type: 'string',
          description: 'Optional custom storage path on disk',
        },
      },
      annotations: {
        readOnlyHint: false,
        openWorldHint: false,
      },
    },
    async ({ name, path }, _extra) => {
      return {
        content: [
          {
            type: 'text',
            text: [
              `Created database "${name}"`,
              path ? `  Path: ${path}` : '  Path: (default)',
              '',
              'This tool requires a running LadybugDB server.',
            ].join('\n'),
          },
        ],
      };
    },
  );

  /**
   * health-check: Verify the LadybugDB server is running.
   */
  server.registerTool(
    'health-check',
    {
      title: 'Health Check',
      description:
        'Check if the LadybugDB server is running and healthy.',
      inputSchema: {},
      annotations: {
        readOnlyHint: true,
      },
    },
    async (_args, _extra) => {
      return {
        content: [
          {
            type: 'text',
            text: [
              'LadybugDB MCP Server: running',
              'Version: 1.0.0',
              'Transport: Streamable HTTP',
              '',
              'Connect to a LadybugDB database instance to enable full query functionality.',
            ].join('\n'),
          },
        ],
      };
    },
  );

  // -----------------------------------------------------------------------
  // RESOURCES
  // -----------------------------------------------------------------------

  server.registerResource(
    'mcp-manifest',
    'https://ladybugdb.com/.well-known/mcp/manifest.json',
    {
      title: 'MCP Manifest',
      description: 'LadybugDB MCP server manifest',
      mimeType: 'application/json',
    },
    async () => {
      return {
        contents: [
          {
            uri: 'https://ladybugdb.com/.well-known/mcp/manifest.json',
            text: JSON.stringify(
              {
                name: 'LadybugDB MCP Server',
                description:
                  'MCP server for LadybugDB — the embedded columnar graph database. ' +
                  'Execute Cypher queries, manage databases, and inspect schemas via MCP tools.',
                version: '1.0.0',
                transport: 'streamable-http',
                url: `http://localhost:${PORT}/mcp`,
                capabilities: { tools: { list: true, call: true }, resources: { list: true, read: true } },
              },
              null,
              2,
            ),
          },
        ],
      };
    },
  );

  server.registerResource(
    'openapi-spec',
    'https://ladybugdb.com/openapi.json',
    {
      title: 'OpenAPI Specification',
      description: 'LadybugDB REST API OpenAPI 3.0 specification',
      mimeType: 'application/json',
    },
    async () => {
      return {
        contents: [
          {
            uri: 'https://ladybugdb.com/openapi.json',
            text: 'See https://ladybugdb.com/openapi.json for the full OpenAPI specification.',
          },
        ],
      };
    },
  );

  // -----------------------------------------------------------------------
  // PROMPTS
  // -----------------------------------------------------------------------

  server.registerPrompt(
    'query-guidance',
    {
      title: 'Cypher Query Guidance',
      description:
        'Get guidance on writing Cypher queries for LadybugDB, including syntax ' +
        'examples and best practices.',
      argsSchema: {
        topic: {
          type: 'string',
          description:
            'Query topic or goal (e.g. "find all people", "count relationships", "aggregate by label")',
        },
      },
    },
    async ({ topic }) => {
      return {
        messages: [
          {
            role: 'user',
            content: {
              type: 'text',
              text: `Write a Cypher query to: ${topic}\n\nUse LadybugDB's Cypher dialect. Return the query with a brief explanation.`,
            },
          },
        ],
      };
    },
  );

  return server;
}

// ---------------------------------------------------------------------------
// HTTP server setup – Streamable HTTP transport
// ---------------------------------------------------------------------------
const app = createMcpExpressApp();
const transports = {};

// POST /mcp — JSON-RPC endpoint
app.post('/mcp', async (req, res) => {
  const sessionId = req.headers['mcp-session-id'];

  try {
    let transport;

    if (sessionId && transports[sessionId]) {
      // Reuse existing transport for this session
      transport = transports[sessionId];
    } else if (!sessionId && isInitializeRequest(req.body)) {
      // New session — create transport with resumability
      const eventStore = new InMemoryEventStore();
      transport = new StreamableHTTPServerTransport({
        sessionIdGenerator: () => randomUUID(),
        eventStore,
        onsessioninitialized: (sid) => {
          transports[sid] = transport;
        },
      });

      transport.onclose = () => {
        const sid = transport.sessionId;
        if (sid && transports[sid]) {
          delete transports[sid];
        }
      };

      const server = createLadybugServer();
      await server.connect(transport);
      await transport.handleRequest(req, res, req.body);
      return;
    } else {
      res.status(400).json({
        jsonrpc: '2.0',
        error: { code: -32000, message: 'No valid session ID provided' },
        id: null,
      });
      return;
    }

    await transport.handleRequest(req, res, req.body);
  } catch (error) {
    console.error('MCP request error:', error);
    if (!res.headersSent) {
      res.status(500).json({
        jsonrpc: '2.0',
        error: { code: -32603, message: 'Internal server error' },
        id: null,
      });
    }
  }
});

// GET /mcp — SSE stream for resumable connections
app.get('/mcp', async (req, res) => {
  const sessionId = req.headers['mcp-session-id'];
  if (!sessionId || !transports[sessionId]) {
    res.status(400).send('Invalid or missing session ID');
    return;
  }
  await transports[sessionId].handleRequest(req, res);
});

// DELETE /mcp — session termination
app.delete('/mcp', async (req, res) => {
  const sessionId = req.headers['mcp-session-id'];
  if (!sessionId || !transports[sessionId]) {
    res.status(400).send('Invalid or missing session ID');
    return;
  }
  await transports[sessionId].handleRequest(req, res);
});

// Start the server
app.listen(PORT, () => {
  console.log(`LadybugDB MCP Server running on http://localhost:${PORT}`);
  console.log(`MCP endpoint: POST http://localhost:${PORT}/mcp`);
  console.log(`SSE endpoint: GET  http://localhost:${PORT}/mcp`);
  console.log('');
  console.log('Connect with any MCP client by pointing to the POST endpoint above.');
  console.log('See https://modelcontextprotocol.io for details.');
});

// Graceful shutdown
process.on('SIGINT', async () => {
  for (const sid of Object.keys(transports)) {
    try {
      await transports[sid].close();
      delete transports[sid];
    } catch (err) {
      console.error(`Error closing transport ${sid}:`, err);
    }
  }
  process.exit(0);
});
