import { Router } from "express";
import { env, isDeployed } from "../config/env.js";
import { ok } from "../http/response.js";
import {
  JWT_COOKIE_NAME,
  JWT_MAX_AGE_SECONDS,
  signAccessToken,
} from "../lib/jwt.js";
import { verifyToken } from "../middleware/jwt-auth.js";

export const authTokenRouter = Router();

function cookieOptions() {
  return {
    httpOnly: true,
    sameSite: isDeployed ? ("none" as const) : ("lax" as const),
    secure: isDeployed,
    path: "/",
    maxAge: JWT_MAX_AGE_SECONDS * 1000,
  };
}

authTokenRouter.post("/token", verifyToken, (request, response) => {
  const user = request.session!.user;
  const token = signAccessToken({
    sub: user.id,
    email: user.email,
    name: user.name,
    role: request.appRole!,
  });

  response.cookie(JWT_COOKIE_NAME, token, cookieOptions());
  response.setHeader("Cache-Control", "no-store");
  response.json(
    ok({
      token,
      tokenType: "Bearer",
      expiresIn: env.JWT_EXPIRES_IN,
    }),
  );
});

authTokenRouter.post("/logout", (_request, response) => {
  response.clearCookie(JWT_COOKIE_NAME, {
    httpOnly: true,
    sameSite: isDeployed ? ("none" as const) : ("lax" as const),
    secure: isDeployed,
    path: "/",
  });
  response.setHeader("Cache-Control", "no-store");
  response.json(ok({ ok: true }));
});
