import { Router } from "express";
import { ok } from "../http/response.js";
import { verifyToken } from "../middleware/jwt-auth.js";
import { getAppRole } from "../roles.js";

export const meRouter = Router();

/*
 * Read-only current-user endpoint.
 *
 * Profile mutations intentionally stay on Better Auth's
 * `POST /api/auth/update-user`; do not add a second PATCH /me path.
 */
meRouter.get("/", verifyToken, (request, response) => {
  const session = request.session;

  if (!session) {
    throw new Error("verifyToken did not attach a session.");
  }

  response.json(
    ok({
      user: session.user,
      role: request.appRole ?? getAppRole(session.user),
      session: {
        expiresAt: session.session.expiresAt,
      },
    }),
  );
});
