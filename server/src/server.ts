import Fastify from "fastify";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import { AuthManager } from "./auth-manager.js";
import { WebSocketManager } from "./websocket-manager.js";

import pretty from "pino-pretty";

// Load environment variables
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, "../../.env") });

const stream = pretty({
  levelFirst: true,
  colorize: true,
  ignore: "time,hostname,pid",
});
const fastify = Fastify({
  logger: {
    level: "info",
    transport: {
      target: "pino-pretty",
      options: {
        translateTime: "HH:MM:ss Z",
        ignore: "pid,hostname",
      },
    },
    stream,
  },
});

// Register plugins
await fastify.register(import("@fastify/websocket"));
await fastify.register(import("@fastify/cors"), {
  origin: true,
  credentials: true,
});
await fastify.register(import("@fastify/static"), {
  root: path.join(__dirname, "../public"),
  prefix: "/public/",
});

// Initialize managers
const authManager = new AuthManager();
const wsManager = new WebSocketManager(fastify);

// Health check
fastify.get("/health", async (request, reply) => {
  return { status: "OK", timestamp: new Date().toISOString() };
});

// Start OAuth flow
fastify.post<{
  Body: { platform: "youtube" | "facebook" | "tiktok" };
}>("/auth/start", async (request, reply) => {
  try {
    const { platform } = request.body;

    if (!platform || !["youtube", "facebook", "tiktok"].includes(platform)) {
      return reply.code(400).send({ error: "Invalid platform" });
    }

    const { authUrl, sessionId } = authManager.generateAuthUrl(platform);

    return {
      success: true,
      authUrl,
      sessionId,
      platform,
    };
  } catch (error: any) {
    fastify.log.error("Error starting auth:", error);
    return reply.code(500).send({
      success: false,
      error: error.message,
    });
  }
});

// OAuth callback handler
fastify.get<{
  Params: { platform: string };
  Querystring: { code?: string; state?: string; error?: string };
}>("/oauth2callback/:platform", async (request, reply) => {
  try {
    const { platform } = request.params;
    const { code, state, error } = request.query;

    if (error) {
      const errorMessage = `OAuth error: ${error}`;
      fastify.log.error(errorMessage);

      if (state) {
        const [, sessionId] = state.split(":");
        wsManager.notifyAuthError(sessionId, errorMessage, platform);
      }

      return reply.type("text/html").send(`
        <html>
          <body>
            <h1>Authorization Failed</h1>
            <p>Error: ${error}</p>
            <p>You can close this window.</p>
          </body>
        </html>
      `);
    }

    if (!code || !state) {
      const errorMessage = "Missing code or state parameter";
      fastify.log.error(errorMessage);
      return reply.code(400).send({ error: errorMessage });
    }

    const tokens = await authManager.handleCallback(platform, code, state);
    const [, sessionId] = state.split(":");

    // Notify WebSocket client
    wsManager.notifyAuthComplete(sessionId, tokens, platform);

    return reply.type("text/html").send(`
      <html>
        <head>
          <title>Authorization Successful</title>
          <style>
            body { font-family: Arial, sans-serif; text-align: center; padding: 50px; }
            .success { color: #28a745; }
            .platform { text-transform: capitalize; }
          </style>
        </head>
        <body>
          <h1 class="success">Authorization Successful!</h1>
          <p>You have successfully authorized access to <span class="platform">${platform}</span>.</p>
          <p>Your CLI application will now continue automatically.</p>
          <p>You can close this window.</p>
          <script>
            // Auto-close after 3 seconds
            setTimeout(() => {
              window.close();
            }, 3000);
          </script>
        </body>
      </html>
    `);
  } catch (error: any) {
    fastify.log.error("OAuth callback error:", error);

    const { state } = request.query;
    if (state) {
      const [, sessionId] = state.split(":");
      wsManager.notifyAuthError(
        sessionId,
        error.message,
        request.params.platform,
      );
    }

    return reply.type("text/html").send(`
      <html>
        <body>
          <h1>Authorization Failed</h1>
          <p>Error: ${error.message}</p>
          <p>You can close this window.</p>
        </body>
      </html>
    `);
  }
});

// Get stored tokens
fastify.get<{
  Params: { platform: string };
}>("/tokens/:platform", async (request, reply) => {
  try {
    const { platform } = request.params;

    if (!["youtube", "facebook", "tiktok"].includes(platform)) {
      return reply.code(400).send({ error: "Invalid platform" });
    }

    const tokens = await authManager.getStoredTokens(platform);

    if (!tokens) {
      return reply.code(404).send({ error: "No tokens found for platform" });
    }

    return {
      success: true,
      tokens,
      platform,
    };
  } catch (error: any) {
    fastify.log.error("Error getting tokens:", error);
    return reply.code(500).send({
      success: false,
      error: error.message,
    });
  }
});

// Refresh tokens
fastify.post<{
  Params: { platform: string };
}>("/tokens/:platform/refresh", async (request, reply) => {
  try {
    const { platform } = request.params;

    if (!["youtube", "facebook", "tiktok"].includes(platform)) {
      return reply.code(400).send({ error: "Invalid platform" });
    }

    const tokens = await authManager.refreshTokens(platform);

    if (!tokens) {
      return reply.code(404).send({
        error: "Unable to refresh tokens. Re-authorization may be required.",
      });
    }

    return {
      success: true,
      tokens,
      platform,
    };
  } catch (error: any) {
    fastify.log.error("Error refreshing tokens:", error);
    return reply.code(500).send({
      success: false,
      error: error.message,
    });
  }
});

// Start server
const start = async () => {
  try {
    const port = Number.parseInt(process.env.OAUTH_SERVER_PORT || "8090");
    const host = process.env.OAUTH_SERVER_HOST || "localhost";

    await fastify.listen({ port, host });

    console.log(`🚀 OAuth Proxy Server running on http://${host}:${port}`);
    console.log(`🔗 WebSocket endpoint: ws://${host}:${port}/ws`);
    console.log(`📋 Health check: http://${host}:${port}/health`);

    // Ping WebSocket connections every 30 seconds
    setInterval(() => {
      wsManager.pingConnections();
    }, 30000);
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
};

// Graceful shutdown
["SIGINT", "SIGTERM"].forEach((signal) => {
  process.on(signal, async () => {
    console.log(`\nReceived ${signal}, shutting down gracefully...`);
    await fastify.close();
    process.exit(0);
  });
});

start();
