import { Router } from "express";
import { ok } from "../http/response.js";
import { verifyToken } from "../middleware/jwt-auth.js";
import { getNotifications } from "../services/notifications.js";

export const notificationsRouter = Router();

notificationsRouter.get("/", verifyToken, async (request, response) => {
  const items = await getNotifications(
    request.session!.user.id,
    request.appRole!,
  );

  response.setHeader("Cache-Control", "no-store");
  response.json(ok(items, { total: items.length }));
});
