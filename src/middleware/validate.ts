import type { Request, RequestHandler } from "express";
import type { ZodError, ZodType } from "zod";
import { ApiError } from "../http/api-error.js";
import { formatZodIssues } from "../validation/format.js";

declare global {
  namespace Express {
    interface Request {
      validatedQuery?: unknown;
      validatedParams?: unknown;
    }
  }
}

function validationError(error: ZodError, message: string) {
  return ApiError.validation(formatZodIssues(error), message);
}

export function validateBody<T>(schema: ZodType<T>): RequestHandler {
  return (request, _response, next) => {
    const result = schema.safeParse(request.body);

    if (!result.success) {
      next(validationError(result.error, "Request body is invalid."));
      return;
    }

    request.body = result.data;
    next();
  };
}

export function validateQuery<T>(schema: ZodType<T>): RequestHandler {
  return (request, _response, next) => {
    const result = schema.safeParse(request.query);

    if (!result.success) {
      next(validationError(result.error, "Query parameters are invalid."));
      return;
    }

    request.validatedQuery = result.data;
    next();
  };
}

export function validateParams<T>(schema: ZodType<T>): RequestHandler {
  return (request, _response, next) => {
    const result = schema.safeParse(request.params);

    if (!result.success) {
      next(validationError(result.error, "Route parameters are invalid."));
      return;
    }

    request.validatedParams = result.data;
    next();
  };
}

export function getValidatedBody<T>(request: Request): T {
  return request.body as T;
}

export function getValidatedQuery<T>(request: Request): T {
  return request.validatedQuery as T;
}

export function getValidatedParams<T>(request: Request): T {
  return request.validatedParams as T;
}
