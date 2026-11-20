import { randomUUID } from "node:crypto";
import type { RequestHandler } from "express";
import { logger } from "../lib/logger.js";

const REQUEST_ID_PATTERN = /^[A-Za-z0-9._-]{1,128}$/;

declare global {
  namespace Express {
    interface Request {
      id: string;
    }
  }
}

/**
 * Attaches a request ID, echoes it on the response, and writes one structured
 * access log line when the response finishes.
 */
export const requestContext: RequestHandler = (request, response, next) => {
  const incoming = request.header("x-request-id");

  request.id =
    incoming && REQUEST_ID_PATTERN.test(incoming) ? incoming : randomUUID();

  response.setHeader("X-Request-Id", request.id);

  const startedAt = process.hrtime.bigint();

  response.on("finish", () => {
    const durationMs = Number(process.hrtime.bigint() - startedAt) / 1_000_000;

    logger.info("request", {
      requestId: request.id,
      method: request.method,
      path: request.path,
      status: response.statusCode,
      durationMs: Math.round(durationMs * 100) / 100,
    });
  });

  next();
};
