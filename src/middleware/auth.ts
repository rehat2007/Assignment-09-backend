import type { NextFunction, Request, RequestHandler, Response } from "express";
import { fromNodeHeaders } from "better-auth/node";
import { auth } from "../auth.js";
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

function unauthenticated(response: Response) {
  response.status(401).json({
    error: { code: "UNAUTHENTICATED", message: "Sign in required." },
  });
}

function forbidden(response: Response) {
  response.status(403).json({
    error: { code: "FORBIDDEN", message: "You do not have access." },
  });
}

export async function requireUser(
  request: Request,
  response: Response,
  next: NextFunction,
) {
  try {
    const session = await auth.api.getSession({
      headers: fromNodeHeaders(request.headers),
    });

    if (!session) {
      unauthenticated(response);
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
    (request: Request, response: Response, next: NextFunction) => {
      if (!request.appRole || !roles.includes(request.appRole)) {
        forbidden(response);
        return;
      }

      next();
    },
  ];
}
