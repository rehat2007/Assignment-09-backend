import { Router, type Response } from "express";
import { ok, paginated } from "../http/response.js";
import { verifyAdmin } from "../middleware/jwt-auth.js";
import {
  getValidatedBody,
  getValidatedParams,
  getValidatedQuery,
  validateBody,
  validateParams,
  validateQuery,
} from "../middleware/validate.js";
import {
  approveAdminService,
  changeAdminUserRole,
  getAdminBooking,
  getAdminOverview,
  getAdminPayment,
  getAdminService,
  getAdminUser,
  listAdminBookings,
  listAdminPayments,
  listAdminServices,
  listAdminUsers,
  rejectAdminService,
  restoreAdminUser,
  suspendAdminUser,
} from "../services/admin.js";
import {
  adminBookingListQuerySchema,
  bookingIdParamsSchema,
  type AdminBookingListQuery,
  type BookingIdParams,
} from "../validation/bookings.js";
import {
  paymentIdParamsSchema,
  paymentListQuerySchema,
  type PaymentIdParams,
  type PaymentListQuery,
} from "../validation/payments.js";
import {
  adminServiceListQuerySchema,
  rejectServiceSchema,
  serviceIdParamsSchema,
  type AdminServiceListQuery,
  type RejectServiceInput,
  type ServiceIdParams,
} from "../validation/services.js";
import {
  adminUsersQuerySchema,
  roleChangeSchema,
  suspendUserSchema,
  userIdParamsSchema,
  type AdminUsersQuery,
  type RoleChangeInput,
  type SuspendUserInput,
  type UserIdParams,
} from "../validation/users.js";

function noStore(response: Response) {
  response.setHeader("Cache-Control", "no-store");
}

function actorFrom(request: {
  session?: { user: { id: string; email: string } };
}) {
  return {
    id: request.session!.user.id,
    email: request.session!.user.email,
  };
}

export const adminRouter = Router();
const adminOnly = verifyAdmin;

adminRouter.get("/overview", ...adminOnly, async (request, response) => {
  const overview = await getAdminOverview();

  noStore(response);
  response.json(ok(overview));
});

adminRouter.get(
  "/users",
  ...adminOnly,
  validateQuery(adminUsersQuerySchema),
  async (request, response) => {
    const query = getValidatedQuery<AdminUsersQuery>(request);
    const result = await listAdminUsers(query);

    noStore(response);
    response.json(
      paginated(result.items, result.page, result.pageSize, result.total),
    );
  },
);

adminRouter.get(
  "/users/:id",
  ...adminOnly,
  validateParams(userIdParamsSchema),
  async (request, response) => {
    const { id } = getValidatedParams<UserIdParams>(request);
    const user = await getAdminUser(id);

    noStore(response);
    response.json(ok(user));
  },
);

adminRouter.patch(
  "/users/:id/role",
  ...adminOnly,
  validateParams(userIdParamsSchema),
  validateBody(roleChangeSchema),
  async (request, response) => {
    const { id } = getValidatedParams<UserIdParams>(request);
    const { role } = getValidatedBody<RoleChangeInput>(request);
    const user = await changeAdminUserRole(actorFrom(request), id, role);

    noStore(response);
    response.json(ok(user));
  },
);

adminRouter.post(
  "/users/:id/suspend",
  ...adminOnly,
  validateParams(userIdParamsSchema),
  validateBody(suspendUserSchema),
  async (request, response) => {
    const { id } = getValidatedParams<UserIdParams>(request);
    const input = getValidatedBody<SuspendUserInput>(request);
    const user = await suspendAdminUser(
      actorFrom(request),
      id,
      input.reason,
      request.headers,
    );

    noStore(response);
    response.json(ok(user));
  },
);

adminRouter.post(
  "/users/:id/restore",
  ...adminOnly,
  validateParams(userIdParamsSchema),
  async (request, response) => {
    const { id } = getValidatedParams<UserIdParams>(request);
    const user = await restoreAdminUser(
      actorFrom(request),
      id,
      request.headers,
    );

    noStore(response);
    response.json(ok(user));
  },
);

adminRouter.get(
  "/services",
  ...adminOnly,
  validateQuery(adminServiceListQuerySchema),
  async (request, response) => {
    const query = getValidatedQuery<AdminServiceListQuery>(request);
    const result = await listAdminServices(query);

    noStore(response);
    response.json(
      paginated(result.items, result.page, result.pageSize, result.total),
    );
  },
);

adminRouter.get(
  "/services/:id",
  ...adminOnly,
  validateParams(serviceIdParamsSchema),
  async (request, response) => {
    const { id } = getValidatedParams<ServiceIdParams>(request);
    const service = await getAdminService(id);

    noStore(response);
    response.json(ok(service));
  },
);

adminRouter.post(
  "/services/:id/approve",
  ...adminOnly,
  validateParams(serviceIdParamsSchema),
  async (request, response) => {
    const { id } = getValidatedParams<ServiceIdParams>(request);
    const service = await approveAdminService(actorFrom(request), id);

    noStore(response);
    response.json(ok(service));
  },
);

adminRouter.post(
  "/services/:id/reject",
  ...adminOnly,
  validateParams(serviceIdParamsSchema),
  validateBody(rejectServiceSchema),
  async (request, response) => {
    const { id } = getValidatedParams<ServiceIdParams>(request);
    const input = getValidatedBody<RejectServiceInput>(request);
    const service = await rejectAdminService(
      actorFrom(request),
      id,
      input.reason,
    );

    noStore(response);
    response.json(ok(service));
  },
);

adminRouter.get(
  "/bookings",
  ...adminOnly,
  validateQuery(adminBookingListQuerySchema),
  async (request, response) => {
    const query = getValidatedQuery<AdminBookingListQuery>(request);
    const result = await listAdminBookings(query);

    noStore(response);
    response.json(
      paginated(result.items, result.page, result.pageSize, result.total),
    );
  },
);

adminRouter.get(
  "/bookings/:id",
  ...adminOnly,
  validateParams(bookingIdParamsSchema),
  async (request, response) => {
    const { id } = getValidatedParams<BookingIdParams>(request);
    const booking = await getAdminBooking(id);

    noStore(response);
    response.json(ok(booking));
  },
);

adminRouter.get(
  "/payments",
  ...adminOnly,
  validateQuery(paymentListQuerySchema),
  async (request, response) => {
    const query = getValidatedQuery<PaymentListQuery>(request);
    const result = await listAdminPayments(query.page, query.pageSize);

    noStore(response);
    response.json(
      paginated(result.items, result.page, result.pageSize, result.total),
    );
  },
);

adminRouter.get(
  "/payments/:id",
  ...adminOnly,
  validateParams(paymentIdParamsSchema),
  async (request, response) => {
    const { id } = getValidatedParams<PaymentIdParams>(request);
    const payment = await getAdminPayment(id);

    noStore(response);
    response.json(ok(payment));
  },
);
