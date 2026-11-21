import { Router, type Response } from "express";
import { ObjectId } from "mongodb";
import { z } from "zod";
import { mongoDb } from "../db/mongo.js";
import { services } from "../db/collections.js";
import { ApiError } from "../http/api-error.js";
import { ok, paginated } from "../http/response.js";
import { HTTP_STATUS } from "../http/status.js";
import {
  verifyAdmin,
  verifyCustomer,
  verifyTechnician,
  verifyToken,
} from "../middleware/jwt-auth.js";
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
  listCustomerBookings,
} from "../services/bookings.js";
import {
  getServiceDetailBySlug,
  listServices,
} from "../services/catalog.js";
import {
  getAdminOverview,
  approveAdminService,
  changeAdminUserRole,
  listAdminBookings,
  listAdminPayments,
  listAdminUsers,
  rejectAdminService,
} from "../services/admin.js";
import {
  createCheckoutSession,
  verifyCheckoutSession,
} from "../services/payments.js";
import {
  acceptTechnicianRequest,
  completeTechnicianRequest,
  createTechnicianService,
  deleteTechnicianService,
  listTechnicianRequests,
  rejectTechnicianRequest,
  startTechnicianRequest,
  updateTechnicianService,
  type TechnicianRequestDto,
} from "../services/technician.js";
import {
  adminBookingListQuerySchema,
  bookingIdParamsSchema,
  bookingListQuerySchema,
  createBookingSchema,
  technicianRequestListQuerySchema,
  type AdminBookingListQuery,
  type BookingIdParams,
  type BookingListQuery,
  type CreateBookingInput,
} from "../validation/bookings.js";
import { idSchema } from "../validation/common.js";
import {
  paymentListQuerySchema,
  paymentVerifyQuerySchema,
  type PaymentListQuery,
  type PaymentVerifyQuery,
} from "../validation/payments.js";
import {
  createServiceSchema,
  serviceIdParamsSchema,
  serviceListQuerySchema,
  updateServiceSchema,
  type CreateServiceInput,
  type ServiceIdParams,
  type ServiceListQuery,
  type UpdateServiceInput,
} from "../validation/services.js";
import {
  adminUsersQuerySchema,
  roleChangeSchema,
  userIdParamsSchema,
  type AdminUsersQuery,
  type RoleChangeInput,
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

const checkoutSchema = z.object({
  bookingId: idSchema,
});

const statusSchema = z
  .object({
    status: z.enum(["accepted", "rejected", "in-progress", "completed"]),
    reason: z.string().trim().max(500).optional(),
    finalAmount: z.number().int().positive().max(100_000).optional(),
  })
  .superRefine((value, context) => {
    if (value.status === "completed" && value.finalAmount === undefined) {
      context.addIssue({
        code: "custom",
        path: ["finalAmount"],
        message: "finalAmount is required when completing a job.",
      });
    }
  });

const approvalSchema = z.object({
  approval: z.enum(["approved", "rejected"]),
  reason: z.string().trim().max(500).optional(),
});

const profileSchema = z
  .object({
    name: z.string().trim().min(2).max(120).optional(),
    phone: z.string().trim().min(6).max(30).optional(),
    area: z.string().trim().min(2).max(120).optional(),
    bio: z.string().trim().max(500).optional(),
    image: z.string().url().max(500).nullable().optional(),
  })
  .refine((value) => Object.keys(value).length > 0, {
    message: "At least one profile field is required.",
  });

const serviceParamSchema = z.object({
  id: z.string().trim().min(1).max(120),
});

export const compatRouter = Router();

/* Public catalog */
compatRouter.get(
  "/services",
  validateQuery(serviceListQuerySchema),
  async (request, response) => {
    const query = getValidatedQuery<ServiceListQuery>(request);
    const result = await listServices(query);

    response.setHeader("Cache-Control", "public, max-age=60");
    response.json(
      paginated(result.items, result.page, result.pageSize, result.total),
    );
  },
);

compatRouter.get(
  "/services/:id",
  validateParams(serviceParamSchema),
  async (request, response) => {
    const { id } = getValidatedParams<{ id: string }>(request);
    let service = await getServiceDetailBySlug(id);

    if (!service) {
      const doc = await services.findOne({
        $or: [{ _id: id }, { legacyId: id }],
      });

      if (doc) {
        service = await getServiceDetailBySlug(doc.slug);
      }
    }

    if (!service) {
      throw ApiError.notFound("Service not found.");
    }

    response.setHeader("Cache-Control", "public, max-age=60");
    response.json(ok(service));
  },
);

/* Customer bookings */
compatRouter.post(
  "/bookings",
  ...verifyCustomer,
  validateBody(createBookingSchema),
  async (request, response) => {
    const input = getValidatedBody<CreateBookingInput>(request);
    const booking = await createBooking(request.session!.user.id, input);

    noStore(response);
    response.status(HTTP_STATUS.CREATED).json(ok(booking));
  },
);

compatRouter.get(
  "/bookings/my",
  ...verifyCustomer,
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

compatRouter.patch(
  "/bookings/:id/cancel",
  ...verifyCustomer,
  validateParams(bookingIdParamsSchema),
  async (request, response) => {
    const { id } = getValidatedParams<BookingIdParams>(request);
    const booking = await cancelBooking(id, request.session!.user.id);

    noStore(response);
    response.json(ok(booking));
  },
);

/* Technician services */
compatRouter.post(
  "/services",
  ...verifyTechnician,
  validateBody(createServiceSchema),
  async (request, response) => {
    const input = getValidatedBody<CreateServiceInput>(request);
    const service = await createTechnicianService(
      request.session!.user.id,
      request.session!.user.name,
      request.session!.user.email,
      input,
    );

    noStore(response);
    response.status(HTTP_STATUS.CREATED).json(ok(service));
  },
);

compatRouter.patch(
  "/services/:id",
  ...verifyTechnician,
  validateParams(serviceIdParamsSchema),
  validateBody(updateServiceSchema),
  async (request, response) => {
    const { id } = getValidatedParams<ServiceIdParams>(request);
    const input = getValidatedBody<UpdateServiceInput>(request);
    const service = await updateTechnicianService(
      id,
      request.session!.user.id,
      input,
    );

    noStore(response);
    response.json(ok(service));
  },
);

compatRouter.delete(
  "/services/:id",
  ...verifyTechnician,
  validateParams(serviceIdParamsSchema),
  async (request, response) => {
    const { id } = getValidatedParams<ServiceIdParams>(request);
    await deleteTechnicianService(id, request.session!.user.id);

    noStore(response);
    response.status(HTTP_STATUS.NO_CONTENT).end();
  },
);

/* Technician requests */
compatRouter.get(
  "/bookings/technician",
  ...verifyTechnician,
  validateQuery(technicianRequestListQuerySchema),
  async (request, response) => {
    const query = getValidatedQuery<BookingListQuery>(request);
    const result = await listTechnicianRequests(
      request.session!.user.id,
      query,
    );

    noStore(response);
    response.json(
      paginated(result.items, result.page, result.pageSize, result.total),
    );
  },
);

compatRouter.patch(
  "/bookings/:id/status",
  ...verifyTechnician,
  validateParams(bookingIdParamsSchema),
  validateBody(statusSchema),
  async (request, response) => {
    const { id } = getValidatedParams<BookingIdParams>(request);
    const body = getValidatedBody<z.infer<typeof statusSchema>>(request);
    const technicianId = request.session!.user.id;
    let booking: TechnicianRequestDto;

    switch (body.status) {
      case "accepted":
        booking = await acceptTechnicianRequest(id, technicianId);
        break;
      case "rejected":
        booking = await rejectTechnicianRequest(
          id,
          technicianId,
          body.reason,
        );
        break;
      case "in-progress":
        booking = await startTechnicianRequest(id, technicianId);
        break;
      case "completed":
        booking = await completeTechnicianRequest(
          id,
          technicianId,
          body.finalAmount!,
        );
        break;
      default:
        throw ApiError.validation([], "Unsupported status.");
    }

    noStore(response);
    response.json(ok(booking));
  },
);

/* Customer payments */
compatRouter.post(
  "/payments/create-checkout-session",
  ...verifyCustomer,
  validateBody(checkoutSchema),
  async (request, response) => {
    const { bookingId } = getValidatedBody<z.infer<typeof checkoutSchema>>(
      request,
    );
    const checkout = await createCheckoutSession(
      request.session!.user.id,
      request.session!.user.email,
      bookingId,
    );

    noStore(response);
    response.json(ok(checkout));
  },
);

compatRouter.get(
  "/payments/verify",
  ...verifyCustomer,
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

/* Admin */
compatRouter.get(
  "/admin/overview",
  ...verifyAdmin,
  async (_request, response) => {
    noStore(response);
    response.json(ok(await getAdminOverview()));
  },
);

compatRouter.get(
  "/admin/users",
  ...verifyAdmin,
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

compatRouter.patch(
  "/admin/users/:id/role",
  ...verifyAdmin,
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

compatRouter.patch(
  "/admin/services/:id/approval",
  ...verifyAdmin,
  validateParams(serviceIdParamsSchema),
  validateBody(approvalSchema),
  async (request, response) => {
    const { id } = getValidatedParams<ServiceIdParams>(request);
    const body = getValidatedBody<z.infer<typeof approvalSchema>>(request);
    const service =
      body.approval === "approved"
        ? await approveAdminService(actorFrom(request), id)
        : await rejectAdminService(
            actorFrom(request),
            id,
            body.reason?.trim() || "Rejected by admin.",
          );

    noStore(response);
    response.json(ok(service));
  },
);

compatRouter.get(
  "/admin/bookings",
  ...verifyAdmin,
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

compatRouter.get(
  "/admin/payments",
  ...verifyAdmin,
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

/* Profile */
compatRouter.patch(
  "/users/profile",
  verifyToken,
  validateBody(profileSchema),
  async (request, response) => {
    const objectId = ObjectId.isValid(request.session!.user.id)
      ? new ObjectId(request.session!.user.id)
      : null;

    if (!objectId) {
      throw ApiError.notFound("User not found.");
    }

    const input = getValidatedBody<z.infer<typeof profileSchema>>(request);
    const set: Record<string, unknown> = { updatedAt: new Date() };

    if (input.name !== undefined) set.name = input.name;
    if (input.phone !== undefined) set.phone = input.phone;
    if (input.area !== undefined) set.area = input.area;
    if (input.bio !== undefined) set.bio = input.bio;
    if (input.image !== undefined) set.image = input.image;

    const updated = await mongoDb
      .collection("user")
      .findOneAndUpdate(
        { _id: objectId },
        { $set: set },
        { returnDocument: "after" },
      );

    if (!updated) {
      throw ApiError.notFound("User not found.");
    }

    noStore(response);
    response.json(
      ok({
        id: String(updated._id),
        name: updated.name,
        email: updated.email,
        phone: updated.phone ?? null,
        area: updated.area ?? null,
        bio: updated.bio ?? null,
        image: updated.image ?? null,
        role: request.appRole,
      }),
    );
  },
);
