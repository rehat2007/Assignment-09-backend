import type { NextFunction, Request, RequestHandler, Response } from "express";
import { fromNodeHeaders } from "better-auth/node";
import { auth } from "../auth.js";
import { ApiError } from "../http/api-error.js";
import { getAppRole, type AppRole } from "../roles.js";

export type AuthSession = typeof auth.$Infer.Session;

declare global {
  namespace Express {
    interface Request {
      session?: AuthSession;
      appRole?: AppRole;
    }
  }
}

export async function requireUser(
  request: Request,
  _response: Response,
  next: NextFunction,
) {
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

export function requireRole(roles: AppRole[]): RequestHandler[] {
  return [
    requireUser,
    (request: Request, _response: Response, next: NextFunction) => {
      if (!request.appRole || !roles.includes(request.appRole)) {
        next(ApiError.forbidden());
        return;
      }

      next();
    },
  ];
}
