import type { NextFunction, Request, RequestHandler, Response } from "express";
import { ObjectId } from "mongodb";
import { fromNodeHeaders } from "better-auth/node";
import { auth } from "../auth.js";
import { mongoDb } from "../db/mongo.js";
import { ApiError } from "../http/api-error.js";
import {
  JWT_COOKIE_NAME,
  JWT_MAX_AGE_SECONDS,
  verifyAccessToken,
} from "../lib/jwt.js";
import { getAppRole, type AppRole } from "../roles.js";

function cookieValue(header: string | undefined, name: string) {
  if (!header) return undefined;

  for (const part of header.split(";")) {
    const [key, ...value] = part.trim().split("=");
    if (key === name) {
      return decodeURIComponent(value.join("="));
    }
  }

  return undefined;
}

function bearerToken(request: Request) {
  const header = request.header("authorization");

  if (!header?.toLowerCase().startsWith("bearer ")) {
    return undefined;
  }

  return header.slice(7).trim() || undefined;
}

function isBanned(user: Record<string, unknown>) {
  if (user.banned !== true) return false;

  const expires = user.banExpires;

  if (!expires) return true;

  const expiresAt =
    expires instanceof Date ? expires : new Date(String(expires));

  return Number.isNaN(expiresAt.getTime()) || expiresAt.getTime() > Date.now();
}

export async function verifyToken(
  request: Request,
  _response: Response,
  next: NextFunction,
) {
  const authorizationToken = bearerToken(request);

  // Browser requests should follow the current Better Auth session. A stale
  // `fixmate_token` cookie from a previous account must not override it, or
  // signing in as a customer after an admin session keeps hitting customer
  // endpoints as the admin and returning 403. Explicit Bearer tokens still win
  // for API clients.
  if (!authorizationToken) {
    try {
      const session = await auth.api.getSession({
        headers: fromNodeHeaders(request.headers),
      });

      if (session) {
        request.session = session;
        request.appRole = getAppRole(session.user);
        next();
        return;
      }
    } catch {
      // Fall through to the JWT cookie; a failed session lookup should not
      // break clients that authenticated with a token.
    }
  }

  const token =
    authorizationToken ?? cookieValue(request.headers.cookie, JWT_COOKIE_NAME);

  if (token) {
    const payload = verifyAccessToken(token);

    if (!payload) {
      next(ApiError.unauthenticated("Invalid or expired token."));
      return;
    }

    const objectId = ObjectId.isValid(payload.sub)
      ? new ObjectId(payload.sub)
      : null;
    const user = objectId
      ? await mongoDb.collection("user").findOne({ _id: objectId })
      : null;

    if (!user) {
      next(ApiError.unauthenticated("User not found."));
      return;
    }

    if (isBanned(user as Record<string, unknown>)) {
      next(ApiError.forbidden("This account is suspended."));
      return;
    }

    request.appRole = getAppRole(
      user as { role?: string | null; accountType?: string | null },
    );
    request.session = {
      user: {
        id: String(user._id),
        email: typeof user.email === "string" ? user.email : payload.email,
        name: typeof user.name === "string" ? user.name : payload.name,
      },
      session: {
        id: "jwt",
        userId: String(user._id),
        expiresAt: new Date(Date.now() + JWT_MAX_AGE_SECONDS * 1000),
      },
    } as unknown as NonNullable<Request["session"]>;

    next();
    return;
  }

  // Keep Better Auth sessions working for server-rendered pages while the
  // browser acquires its JWT cookie. Requests with an invalid JWT never fall
  // back, so a bad token still returns 401.
  try {
    const session = await auth.api.getSession({
      headers: fromNodeHeaders(request.headers),
    });

    if (!session) {
      next(ApiError.unauthenticated());
      return;
    }

    request.session = session;
    request.appRole = getAppRole(session.user);
    next();
  } catch (error) {
    next(error);
  }
}

export function verifyRole(roles: AppRole[]): RequestHandler[] {
  return [
    verifyToken,
    (request: Request, _response: Response, next: NextFunction) => {
      if (!request.appRole || !roles.includes(request.appRole)) {
        next(ApiError.forbidden());
        return;
      }

      next();
    },
  ];
}

export const verifyCustomer = verifyRole(["customer"]);
export const verifyTechnician = verifyRole(["technician"]);
export const verifyAdmin = verifyRole(["admin"]);
