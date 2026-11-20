import type { ErrorRequestHandler, RequestHandler } from "express";
import { ZodError } from "zod";
import { ApiError } from "../http/api-error.js";
import { fail } from "../http/response.js";
import { HTTP_STATUS } from "../http/status.js";
import { logger } from "../lib/logger.js";
import { formatZodIssues } from "../validation/format.js";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

export const notFoundHandler: RequestHandler = (request, response) => {
  response
    .status(HTTP_STATUS.NOT_FOUND)
    .json(fail("NOT_FOUND", "Route not found."));
};

export const errorHandler: ErrorRequestHandler = (
  error,
  request,
  response,
  next,
) => {
  if (response.headersSent) {
    next(error);
    return;
  }

  if (error instanceof ApiError) {
    response
      .status(error.statusCode)
      .json(fail(error.code, error.message, error.details));
    return;
  }

  if (error instanceof ZodError) {
    response
      .status(HTTP_STATUS.UNPROCESSABLE_ENTITY)
      .json(
        fail(
          "VALIDATION_ERROR",
          "Request validation failed.",
          formatZodIssues(error),
        ),
      );
    return;
  }

  if (isRecord(error) && error.type === "entity.parse.failed") {
    response
      .status(HTTP_STATUS.BAD_REQUEST)
      .json(fail("MALFORMED_JSON", "Request body is not valid JSON."));
    return;
  }

  if (isRecord(error) && error.type === "entity.too.large") {
    response
      .status(HTTP_STATUS.PAYLOAD_TOO_LARGE)
      .json(fail("PAYLOAD_TOO_LARGE", "Request body is too large."));
    return;
  }

  logger.error("request_error", {
    requestId: request.id,
    method: request.method,
    path: request.path,
    error: error instanceof Error ? error.message : String(error),
    ...(process.env.NODE_ENV !== "production" && error instanceof Error
      ? { stack: error.stack }
      : {}),
  });

  response
    .status(HTTP_STATUS.INTERNAL_SERVER_ERROR)
    .json(fail("INTERNAL_ERROR", "Something went wrong."));
};
