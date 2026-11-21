import { Router, type Response } from "express";
import { ok } from "../http/response.js";
import { requireRole, requireUser } from "../middleware/auth.js";
import {
  getValidatedParams,
  getValidatedQuery,
  validateParams,
  validateQuery,
} from "../middleware/validate.js";
import {
  getPaymentForUser,
  verifyCheckoutSession,
} from "../services/payments.js";
import {
  paymentIdParamsSchema,
  paymentVerifyQuerySchema,
  type PaymentIdParams,
  type PaymentVerifyQuery,
} from "../validation/payments.js";

function noStore(response: Response) {
  response.setHeader("Cache-Control", "no-store");
}

export const paymentsRouter = Router();

paymentsRouter.get(
  "/verify",
  ...requireRole(["customer"]),
  validateQuery(paymentVerifyQuerySchema),
  async (request, response) => {
    const { session_id: sessionId } =
      getValidatedQuery<PaymentVerifyQuery>(request);
    const payment = await verifyCheckoutSession(
      request.session!.user.id,
      sessionId,
    );

    noStore(response);
    response.json(ok(payment));
  },
);

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
