import { HTTP_STATUS } from "./status.js";

/**
 * An expected API failure. Throw this from routes/middleware and let the
 * central error handler convert it to the standard error envelope.
 */
export class ApiError extends Error {
  readonly statusCode: number;
  readonly code: string;
  readonly details: unknown[];

  constructor(
    statusCode: number,
    code: string,
    message: string,
    details: unknown[] = [],
  ) {
    super(message);
    this.name = "ApiError";
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
  }

  static badRequest(
    message: string,
    code = "BAD_REQUEST",
    details: unknown[] = [],
  ) {
    return new ApiError(HTTP_STATUS.BAD_REQUEST, code, message, details);
  }

  static unauthenticated(message = "Sign in required.") {
    return new ApiError(
      HTTP_STATUS.UNAUTHORIZED,
      "UNAUTHENTICATED",
      message,
    );
  }

  static forbidden(message = "You do not have access.") {
    return new ApiError(HTTP_STATUS.FORBIDDEN, "FORBIDDEN", message);
  }

  static notFound(message = "Resource not found.", code = "NOT_FOUND") {
    return new ApiError(HTTP_STATUS.NOT_FOUND, code, message);
  }

  static conflict(
    message: string,
    code = "INVALID_STATE",
    details: unknown[] = [],
  ) {
    return new ApiError(HTTP_STATUS.CONFLICT, code, message, details);
  }

  static validation(
    details: unknown[],
    message = "One or more fields are invalid.",
  ) {
    return new ApiError(
      HTTP_STATUS.UNPROCESSABLE_ENTITY,
      "VALIDATION_ERROR",
      message,
      details,
    );
  }

  static internal(message = "Something went wrong.") {
    return new ApiError(
      HTTP_STATUS.INTERNAL_SERVER_ERROR,
      "INTERNAL_ERROR",
      message,
    );
  }
}
