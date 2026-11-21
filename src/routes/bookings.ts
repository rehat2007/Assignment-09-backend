import { Router, type Response } from "express";
import { ok, paginated } from "../http/response.js";
import { HTTP_STATUS } from "../http/status.js";
import { requireRole, requireUser } from "../middleware/auth.js";
import {
  getValidatedBody,
  getValidatedParams,
  getValidatedQuery,
  validateBody,
  validateParams,
  validateQuery,
} from "../middleware/validate.js";
import {
  cancelBooking,
  createBooking,
  getBookingForUser,
  listCustomerBookings,
} from "../services/bookings.js";
import { createCheckoutSession } from "../services/payments.js";
import {
  bookingIdParamsSchema,
  bookingListQuerySchema,
  createBookingSchema,
  type BookingIdParams,
  type BookingListQuery,
  type CreateBookingInput,
} from "../validation/bookings.js";

function noStore(response: Response) {
  response.setHeader("Cache-Control", "no-store");
}

export const bookingsRouter = Router();

bookingsRouter.post(
  "/",
  ...requireRole(["customer"]),
  validateBody(createBookingSchema),
  async (request, response) => {
    const input = getValidatedBody<CreateBookingInput>(request);
    const booking = await createBooking(request.session!.user.id, input);

    noStore(response);
    response.status(HTTP_STATUS.CREATED).json(ok(booking));
  },
);

bookingsRouter.get(
  "/",
  ...requireRole(["customer"]),
  validateQuery(bookingListQuerySchema),
  async (request, response) => {
    const query = getValidatedQuery<BookingListQuery>(request);
    const result = await listCustomerBookings(
      request.session!.user.id,
      query,
    );

    noStore(response);
    response.json(
      paginated(result.items, result.page, result.pageSize, result.total),
    );
  },
);

bookingsRouter.get(
  "/:id",
  requireUser,
  validateParams(bookingIdParamsSchema),
  async (request, response) => {
    const { id } = getValidatedParams<BookingIdParams>(request);
    const booking = await getBookingForUser(
      id,
      request.session!.user.id,
      request.appRole!,
    );

    noStore(response);
    response.json(ok(booking));
  },
);

bookingsRouter.post(
  "/:id/cancel",
  ...requireRole(["customer"]),
  validateParams(bookingIdParamsSchema),
  async (request, response) => {
    const { id } = getValidatedParams<BookingIdParams>(request);
    const booking = await cancelBooking(id, request.session!.user.id);

    noStore(response);
    response.json(ok(booking));
  },
);

bookingsRouter.post(
  "/:id/checkout",
  ...requireRole(["customer"]),
  validateParams(bookingIdParamsSchema),
  async (request, response) => {
    const { id } = getValidatedParams<BookingIdParams>(request);
    const checkout = await createCheckoutSession(
      request.session!.user.id,
      request.session!.user.email,
      id,
    );

    noStore(response);
    response.json(ok(checkout));
  },
);
