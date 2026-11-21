import type { NextFunction, Request, RequestHandler, Response } from "express";
import { auth } from "../auth.js";
import type { AppRole } from "../roles.js";
import { verifyRole, verifyToken } from "./jwt-auth.js";

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
  response: Response,
  next: NextFunction,
) {
  await verifyToken(request, response, next);
}

export function requireRole(roles: AppRole[]): RequestHandler[] {
  return verifyRole(roles);
}
