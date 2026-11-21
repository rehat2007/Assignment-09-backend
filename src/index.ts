import express, { type Request, type Response } from "express";
import cors from "cors";
import helmet from "helmet";
import { toNodeHandler } from "better-auth/node";
import { auth } from "./auth.js";
import { env, trustedOrigins } from "./config/env.js";
import { mongoClient, mongoDb } from "./db/mongo.js";
import { fail, ok } from "./http/response.js";
import { HTTP_STATUS } from "./http/status.js";
import { logger } from "./lib/logger.js";
import { localUploadDirectory } from "./lib/storage.js";
import { errorHandler, notFoundHandler } from "./middleware/errors.js";
import { authLimiter } from "./middleware/rate-limit.js";
import { requestContext } from "./middleware/request-context.js";
import { authTokenRouter } from "./routes/auth-token.js";
import { catalogRouter } from "./routes/catalog.js";
import { adminRouter } from "./routes/admin.js";
import { compatRouter } from "./routes/compat.js";
import { bookingsRouter } from "./routes/bookings.js";
import { customerRouter } from "./routes/customer.js";
import { meRouter } from "./routes/me.js";
import { paymentsRouter } from "./routes/payments.js";
import { stripeWebhookHandler } from "./routes/webhooks.js";
import { technicianRouter } from "./routes/technician.js";
import { uploadsRouter, avatarDirectory } from "./routes/uploads.js";

const app = express();

app.disable("x-powered-by");

if (env.NODE_ENV === "production") {
  app.set("trust proxy", 1);
}

app.use(requestContext);

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
    allowedHeaders: ["Content-Type", "Authorization", "X-Request-Id"],
    exposedHeaders: ["X-Request-Id"],
    maxAge: 86_400,
  }),
);

// Better Auth MUST be mounted before express.json().
// Express 5 uses *splat; Express 4 uses *.
app.use("/api/auth", authLimiter);
app.all("/api/auth/*splat", toNodeHandler(auth));

// Stripe webhook must receive the raw body. Mount it before express.json().
app.post(
  "/api/v1/webhooks/stripe",
  express.raw({ type: "application/json" }),
  stripeWebhookHandler,
);

app.use(express.json({ limit: "1mb" }));

app.get("/api/v1/health", async (request: Request, response: Response) => {
  try {
    await mongoDb.command({ ping: 1 });

    response.status(HTTP_STATUS.OK).json(
      ok({
        ok: true,
        service: "fixmate-api",
        database: "up",
        timestamp: new Date().toISOString(),
      }),
    );
  } catch (error) {
    logger.warn("health_check_failed", {
      requestId: request.id,
      error: error instanceof Error ? error.message : String(error),
    });

    response
      .status(HTTP_STATUS.SERVICE_UNAVAILABLE)
      .json(fail("DATABASE_UNAVAILABLE", "MongoDB is not reachable."));
  }
});

app.use("/api/v1/auth", authTokenRouter);
app.use("/api/v1/me", meRouter);
app.use("/api/v1", catalogRouter);
app.use("/api/v1/bookings", bookingsRouter);
app.use("/api/v1/customer", customerRouter);
app.use("/api/v1/payments", paymentsRouter);
app.use("/api/v1/technician", technicianRouter);
app.use("/api/v1/admin", adminRouter);

// Assignment 9 compatibility aliases at the exact documented paths.
app.use("/api", compatRouter);

// New uploads: local development driver or S3-compatible object storage.
app.use(
  "/api/v1/uploads/files",
  express.static(localUploadDirectory, {
    fallthrough: true,
    index: false,
    immutable: true,
    maxAge: "1y",
  }),
);

// Legacy local avatar files uploaded before Phase 8. New avatars never land here.
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

app.use(notFoundHandler);
app.use(errorHandler);

const server = app.listen(env.PORT, () => {
  logger.info("server_started", {
    port: env.PORT,
    url: env.BETTER_AUTH_URL,
    frontendUrl: env.FRONTEND_URL,
  });
});

let shuttingDown = false;

async function shutdown(signal: string) {
  if (shuttingDown) return;
  shuttingDown = true;
  logger.info("server_stopping", { signal });

  server.close(async () => {
    await mongoClient.close().catch(() => undefined);
    process.exit(0);
  });

  // Do not hang forever on stuck connections.
  setTimeout(() => process.exit(1), 10_000).unref();
}

process.on("SIGINT", () => void shutdown("SIGINT"));
process.on("SIGTERM", () => void shutdown("SIGTERM"));
