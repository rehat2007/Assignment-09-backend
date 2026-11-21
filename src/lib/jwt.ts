import jwt, { type SignOptions } from "jsonwebtoken";
import { env } from "../config/env.js";
import type { AppRole } from "../roles.js";

export const JWT_COOKIE_NAME = "fixmate_token";
export const JWT_MAX_AGE_SECONDS = 7 * 24 * 60 * 60;

export type AccessTokenPayload = {
  sub: string;
  email: string;
  name: string;
  role: AppRole;
};

const ROLES: AppRole[] = ["customer", "technician", "admin"];

function jwtSecret() {
  return env.JWT_SECRET ?? env.BETTER_AUTH_SECRET;
}

export function signAccessToken(payload: AccessTokenPayload) {
  return jwt.sign(payload, jwtSecret(), {
    expiresIn: env.JWT_EXPIRES_IN as SignOptions["expiresIn"],
  });
}

export function verifyAccessToken(token: string): AccessTokenPayload | null {
  try {
    const decoded = jwt.verify(token, jwtSecret());

    if (typeof decoded === "string") {
      return null;
    }

    const role = decoded.role;
    const sub = decoded.sub;

    if (
      typeof sub !== "string" ||
      typeof decoded.email !== "string" ||
      typeof decoded.name !== "string" ||
      typeof role !== "string" ||
      !ROLES.includes(role as AppRole)
    ) {
      return null;
    }

    return {
      sub,
      email: decoded.email,
      name: decoded.name,
      role: role as AppRole,
    };
  } catch {
    return null;
  }
}
