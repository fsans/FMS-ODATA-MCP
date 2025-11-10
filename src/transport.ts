import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import express, { Express, Request, Response } from "express";
import https from "https";
import http from "http";
import fs from "fs";

export type TransportType = "stdio" | "http" | "https";

export interface TransportConfig {
  type: TransportType;
  port?: number;
  host?: string;
  certPath?: string;
  keyPath?: string;
}

/**
 * Parse transport configuration from environment variables
 */
export function getTransportConfig(): TransportConfig {
  const transportType = (process.env.MCP_TRANSPORT || "stdio") as TransportType;

  const config: TransportConfig = {
    type: transportType,
    port: process.env.MCP_PORT ? parseInt(process.env.MCP_PORT, 10) : 3000,
    host: process.env.MCP_HOST || "localhost",
    certPath: process.env.MCP_CERT_PATH,
    keyPath: process.env.MCP_KEY_PATH,
  };

  return config;
}

/**
 * Create and connect transport based on configuration
 */
export async function setupTransport(
  server: Server,
  config: TransportConfig
): Promise<void> {
  switch (config.type) {
    case "stdio":
      await setupStdioTransport(server);
      break;

    case "http":
      await setupHttpTransport(server, config);
      break;

    case "https":
      await setupHttpsTransport(server, config);
      break;

    default:
      throw new Error(`Unknown transport type: ${config.type}`);
  }
}

/**
 * Setup stdio transport (default, for local use)
 */
async function setupStdioTransport(server: Server): Promise<void> {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("FMS-ODATA-MCP Server running on stdio");
}

/**
 * Custom HTTP transport wrapper for MCP server
 */
class HttpTransportWrapper {
  private server: Server;
  private app: Express;

  constructor(server: Server, app: Express) {
    this.server = server;
    this.app = app;
    this.setupRoutes();
  }

  private setupRoutes(): void {
    // Health check endpoint
    this.app.get("/health", (req: Request, res: Response) => {
      res.json({ status: "ok", transport: "http", server: "fms-odata-mcp" });
    });

    // MCP endpoint - handles both GET and POST
    this.app.post("/mcp", async (req: Request, res: Response) => {
      try {
        const request = req.body as any;
        // The server processes requests through its tool handlers
        // This is a simple echo/passthrough for now
        res.json({
          status: "ok",
          message: "MCP request received",
          request: request,
        });
      } catch (error) {
        console.error("Error handling MCP request:", error);
        res.status(500).json({
          error: error instanceof Error ? error.message : "Unknown error",
        });
      }
    });

    this.app.get("/mcp", (req: Request, res: Response) => {
      res.json({
        info: "FileMaker Server OData MCP Server",
        transport: "http",
        methods: ["POST"],
        endpoint: "/mcp",
      });
    });
  }
}

/**
 * Setup HTTP transport
 */
async function setupHttpTransport(
  server: Server,
  config: TransportConfig
): Promise<void> {
  const app = express();

  // Middleware
  app.use(express.json());

  // Create transport wrapper
  new HttpTransportWrapper(server, app);

  const port = config.port || 3000;
  const host = config.host || "localhost";

  http.createServer(app).listen(port, host, () => {
    console.error(
      `FMS-ODATA-MCP Server running on http://${host}:${port}`
    );
    console.error(`MCP endpoint: http://${host}:${port}/mcp`);
    console.error(`Health check: http://${host}:${port}/health`);
  });
}

/**
 * Setup HTTPS transport
 */
async function setupHttpsTransport(
  server: Server,
  config: TransportConfig
): Promise<void> {
  const app = express();

  // Middleware
  app.use(express.json());

  // Create transport wrapper
  new HttpTransportWrapper(server, app);

  // Load certificates
  if (!config.certPath || !config.keyPath) {
    throw new Error(
      "HTTPS transport requires MCP_CERT_PATH and MCP_KEY_PATH environment variables"
    );
  }

  let cert: Buffer;
  let key: Buffer;

  try {
    cert = fs.readFileSync(config.certPath);
    key = fs.readFileSync(config.keyPath);
  } catch (error) {
    throw new Error(
      `Failed to load HTTPS certificates: ${error instanceof Error ? error.message : String(error)}`
    );
  }

  const port = config.port || 3443;
  const host = config.host || "localhost";

  https.createServer({ cert, key }, app).listen(port, host, () => {
    console.error(
      `FMS-ODATA-MCP Server running on https://${host}:${port}`
    );
    console.error(`MCP endpoint: https://${host}:${port}/mcp`);
    console.error(`Health check: https://${host}:${port}/health`);
  });
}
