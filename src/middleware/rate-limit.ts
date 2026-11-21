import rateLimit from "express-rate-limit";
import { fail } from "../http/response.js";
import { HTTP_STATUS } from "../http/status.js";

function createLimiter(options: {
  windowMs: number;
  limit: number;
}) {
  return rateLimit({
    windowMs: options.windowMs,
    limit: options.limit,
    standardHeaders: "draft-7",
    legacyHeaders: false,
    handler: (_request, response) => {
      response
        .status(HTTP_STATUS.TOO_MANY_REQUESTS)
        .json(
          fail(
            "RATE_LIMITED",
            "Too many requests. Please wait a moment and try again.",
          ),
        );
    },
  });
}

export const authLimiter = createLimiter({
  windowMs: 15 * 60 * 1000,
  limit: 40,
});

export const bookingLimiter = createLimiter({
  windowMs: 60 * 1000,
  limit: 12,
});

export const uploadLimiter = createLimiter({
  windowMs: 60 * 1000,
  limit: 20,
});
