import express, { type NextFunction, type Request, type Response } from "express";
import cors from "cors";
import helmet from "helmet";
import { toNodeHandler } from "better-auth/node";
import { auth } from "./auth.js";
import { env, trustedOrigins } from "./config/env.js";
import { mongoClient, mongoDb } from "./db/mongo.js";
import { uploadsRouter, avatarDirectory } from "./routes/uploads.js";

const app = express();

app.disable("x-powered-by");

app.use(
  helmet({
    // Avatars are served from the API origin and embedded on the frontend.
    crossOriginResourcePolicy: { policy: "cross-origin" },
  }),
);

app.use(
  cors({
    origin(origin, callback) {
      // Same-origin, curl, and server-side requests have no Origin header.
      if (!origin || trustedOrigins.includes(origin)) {
        callback(null, true);
        return;
      }

      callback(null, false);
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
    maxAge: 86_400,
  }),
);

// Better Auth MUST be mounted before express.json().
// Express 5 uses *splat; Express 4 uses *.
app.all("/api/auth/*splat", toNodeHandler(auth));

// Stripe webhook must receive the raw body.
// Mount it before express.json() when Phase 7 is implemented.
// app.post("/api/v1/webhooks/stripe", express.raw({ type: "application/json" }), stripeWebhook);

app.use(express.json({ limit: "1mb" }));

app.get("/api/v1/health", async (_request: Request, response: Response) => {
  try {
    await mongoDb.command({ ping: 1 });

    response.status(200).json({
      ok: true,
      service: "fixmate-api",
      database: "up",
      timestamp: new Date().toISOString(),
    });
  } catch {
    response.status(503).json({
      ok: false,
      service: "fixmate-api",
      database: "down",
      timestamp: new Date().toISOString(),
    });
  }
});

app.use(
  "/api/v1/uploads/avatars",
  express.static(avatarDirectory, {
    fallthrough: true,
    index: false,
    immutable: true,
    maxAge: "1y",
  }),
);

app.use("/api/v1/uploads", uploadsRouter);

app.use((_request: Request, response: Response) => {
  response.status(404).json({
    error: { code: "NOT_FOUND", message: "Route not found." },
  });
});

app.use(
  (
    error: unknown,
    _request: Request,
    response: Response,
    _next: NextFunction,
  ) => {
    if (
      typeof error === "object" &&
      error !== null &&
      "type" in error &&
      (error as { type?: unknown }).type === "entity.parse.failed"
    ) {
      response.status(400).json({
        error: { code: "MALFORMED_JSON", message: "Request body is not valid JSON." },
      });
      return;
    }

    console.error("[api] unhandled error", error);

    response.status(500).json({
      error: { code: "INTERNAL_ERROR", message: "Something went wrong." },
    });
  },
);

const server = app.listen(env.PORT, () => {
  console.log(`[api] listening on ${env.BETTER_AUTH_URL}`);
  console.log(`[api] frontend origin ${env.FRONTEND_URL}`);
});

let shuttingDown = false;

async function shutdown(signal: string) {
  if (shuttingDown) return;
  shuttingDown = true;
  console.log(`[api] ${signal} received, shutting down`);

  server.close(async () => {
    await mongoClient.close().catch(() => undefined);
    process.exit(0);
  });

  // Do not hang forever on stuck connections.
  setTimeout(() => process.exit(1), 10_000).unref();
}

process.on("SIGINT", () => void shutdown("SIGINT"));
process.on("SIGTERM", () => void shutdown("SIGTERM"));
