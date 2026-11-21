import { Router, type Response } from "express";
import { ok, paginated } from "../http/response.js";
import { HTTP_STATUS } from "../http/status.js";
import { verifyTechnician } from "../middleware/jwt-auth.js";
import {
  getValidatedBody,
  getValidatedParams,
  getValidatedQuery,
  validateBody,
  validateParams,
  validateQuery,
} from "../middleware/validate.js";
import {
  acceptTechnicianRequest,
  completeTechnicianRequest,
  createTechnicianService,
  deleteTechnicianService,
  getTechnicianOverview,
  getTechnicianRequest,
  getTechnicianService,
  listTechnicianRequests,
  listTechnicianServices,
  rejectTechnicianRequest,
  setTechnicianServiceAvailability,
  startTechnicianRequest,
  updateTechnicianService,
} from "../services/technician.js";
import {
  bookingIdParamsSchema,
  completeBookingSchema,
  rejectBookingSchema,
  technicianRequestListQuerySchema,
  type BookingIdParams,
  type BookingListQuery,
  type CompleteBookingInput,
  type RejectBookingInput,
} from "../validation/bookings.js";
import {
  createServiceSchema,
  serviceAvailabilitySchema,
  serviceIdParamsSchema,
  technicianServiceListQuerySchema,
  updateServiceSchema,
  type CreateServiceInput,
  type ServiceIdParams,
  type TechnicianServiceListQuery,
  type UpdateServiceInput,
} from "../validation/services.js";

function noStore(response: Response) {
  response.setHeader("Cache-Control", "no-store");
}

export const technicianRouter = Router();
const technicianOnly = verifyTechnician;

technicianRouter.get(
  "/overview",
  ...technicianOnly,
  async (request, response) => {
    const overview = await getTechnicianOverview(request.session!.user.id);

    noStore(response);
    response.json(ok(overview));
  },
);

technicianRouter.get(
  "/services",
  ...technicianOnly,
  validateQuery(technicianServiceListQuerySchema),
  async (request, response) => {
    const query = getValidatedQuery<TechnicianServiceListQuery>(request);
    const result = await listTechnicianServices(
      request.session!.user.id,
      query,
    );

    noStore(response);
    response.json(
      paginated(result.items, result.page, result.pageSize, result.total),
    );
  },
);

technicianRouter.post(
  "/services",
  ...technicianOnly,
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

technicianRouter.patch(
  "/services/:id/availability",
  ...technicianOnly,
  validateParams(serviceIdParamsSchema),
  validateBody(serviceAvailabilitySchema),
  async (request, response) => {
    const { id } = getValidatedParams<ServiceIdParams>(request);
    const { available } = getValidatedBody<{ available: boolean }>(request);
    const service = await setTechnicianServiceAvailability(
      id,
      request.session!.user.id,
      available,
    );

    noStore(response);
    response.json(ok(service));
  },
);

technicianRouter.get(
  "/services/:id",
  ...technicianOnly,
  validateParams(serviceIdParamsSchema),
  async (request, response) => {
    const { id } = getValidatedParams<ServiceIdParams>(request);
    const service = await getTechnicianService(id, request.session!.user.id);

    noStore(response);
    response.json(ok(service));
  },
);

technicianRouter.patch(
  "/services/:id",
  ...technicianOnly,
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

technicianRouter.delete(
  "/services/:id",
  ...technicianOnly,
  validateParams(serviceIdParamsSchema),
  async (request, response) => {
    const { id } = getValidatedParams<ServiceIdParams>(request);
    await deleteTechnicianService(id, request.session!.user.id);

    noStore(response);
    response.status(HTTP_STATUS.NO_CONTENT).end();
  },
);

technicianRouter.get(
  "/requests",
  ...technicianOnly,
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

technicianRouter.get(
  "/requests/:id",
  ...technicianOnly,
  validateParams(bookingIdParamsSchema),
  async (request, response) => {
    const { id } = getValidatedParams<BookingIdParams>(request);
    const booking = await getTechnicianRequest(id, request.session!.user.id);

    noStore(response);
    response.json(ok(booking));
  },
);

technicianRouter.post(
  "/requests/:id/accept",
  ...technicianOnly,
  validateParams(bookingIdParamsSchema),
  async (request, response) => {
    const { id } = getValidatedParams<BookingIdParams>(request);
    const booking = await acceptTechnicianRequest(
      id,
      request.session!.user.id,
    );

    noStore(response);
    response.json(ok(booking));
  },
);

technicianRouter.post(
  "/requests/:id/reject",
  ...technicianOnly,
  validateParams(bookingIdParamsSchema),
  validateBody(rejectBookingSchema),
  async (request, response) => {
    const { id } = getValidatedParams<BookingIdParams>(request);
    const input = getValidatedBody<RejectBookingInput>(request);
    const booking = await rejectTechnicianRequest(
      id,
      request.session!.user.id,
      input.reason,
    );

    noStore(response);
    response.json(ok(booking));
  },
);

technicianRouter.post(
  "/requests/:id/start",
  ...technicianOnly,
  validateParams(bookingIdParamsSchema),
  async (request, response) => {
    const { id } = getValidatedParams<BookingIdParams>(request);
    const booking = await startTechnicianRequest(
      id,
      request.session!.user.id,
    );

    noStore(response);
    response.json(ok(booking));
  },
);

technicianRouter.post(
  "/requests/:id/complete",
  ...technicianOnly,
  validateParams(bookingIdParamsSchema),
  validateBody(completeBookingSchema),
  async (request, response) => {
    const { id } = getValidatedParams<BookingIdParams>(request);
    const input = getValidatedBody<CompleteBookingInput>(request);
    const booking = await completeTechnicianRequest(
      id,
      request.session!.user.id,
      input.finalAmount,
    );

    noStore(response);
    response.json(ok(booking));
  },
);
