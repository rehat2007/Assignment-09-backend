import { Router, type Response } from "express";
import { ok } from "../http/response.js";
import { requireUser } from "../middleware/auth.js";
import {
  getValidatedParams,
  validateParams,
} from "../middleware/validate.js";
import { getPaymentForUser } from "../services/payments.js";
import {
  paymentIdParamsSchema,
  type PaymentIdParams,
} from "../validation/payments.js";

function noStore(response: Response) {
  response.setHeader("Cache-Control", "no-store");
}

export const paymentsRouter = Router();

paymentsRouter.get(
  "/:id",
  requireUser,
  validateParams(paymentIdParamsSchema),
  async (request, response) => {
    const { id } = getValidatedParams<PaymentIdParams>(request);
    const payment = await getPaymentForUser(
      id,
      request.session!.user.id,
      request.appRole!,
    );

    noStore(response);
    response.json(ok(payment));
  },
);
