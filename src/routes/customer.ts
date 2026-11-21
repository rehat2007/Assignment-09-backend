import { Router, type Response } from "express";
import { ok, paginated } from "../http/response.js";
import { verifyCustomer } from "../middleware/jwt-auth.js";
import {
  getValidatedQuery,
  validateQuery,
} from "../middleware/validate.js";
import { getCustomerOverview } from "../services/bookings.js";
import { listCustomerPayments } from "../services/payments.js";
import {
  paymentListQuerySchema,
  type PaymentListQuery,
} from "../validation/payments.js";

function noStore(response: Response) {
  response.setHeader("Cache-Control", "no-store");
}

export const customerRouter = Router();

customerRouter.get(
  "/overview",
  ...verifyCustomer,
  async (request, response) => {
    const overview = await getCustomerOverview(request.session!.user.id);

    noStore(response);
    response.json(ok(overview));
  },
);

customerRouter.get(
  "/payments",
  ...verifyCustomer,
  validateQuery(paymentListQuerySchema),
  async (request, response) => {
    const query = getValidatedQuery<PaymentListQuery>(request);
    const result = await listCustomerPayments(
      request.session!.user.id,
      query.page,
      query.pageSize,
    );

    noStore(response);
    response.json(
      paginated(result.items, result.page, result.pageSize, result.total),
    );
  },
);
