import { z } from "zod";
import { PAGE_SIZES } from "../http/response.js";
import {
  bookingStatusSchema,
  emptyToUndefined,
  idSchema,
  isoDateSchema,
  paginationFields,
  paymentStatusSchema,
  phoneSchema,
  queryStringSchema,
  slugSchema,
} from "./common.js";

export const createBookingSchema = z.object({
  serviceSlug: slugSchema,
  preferredDate: isoDateSchema,
  phone: phoneSchema,
  address: z.string().trim().min(5).max(300),
  problem: z.string().trim().min(5).max(2000),
});

export const bookingListQuerySchema = z.object({
  status: emptyToUndefined(bookingStatusSchema.optional()),
  ...paginationFields(PAGE_SIZES.dashboard),
});

export const technicianRequestListQuerySchema = bookingListQuerySchema;

export const adminBookingListQuerySchema = z.object({
  q: emptyToUndefined(queryStringSchema.optional()),
  status: emptyToUndefined(bookingStatusSchema.optional()),
  paymentStatus: emptyToUndefined(paymentStatusSchema.optional()),
  ...paginationFields(PAGE_SIZES.dashboard),
});

export const bookingIdParamsSchema = z.object({
  id: idSchema,
});

export const completeBookingSchema = z.object({
  finalAmount: z.number().int().positive().max(100_000),
});

export const rejectBookingSchema = z.object({
  reason: z.string().trim().max(500).optional(),
});

export type CreateBookingInput = z.infer<typeof createBookingSchema>;
export type BookingListQuery = z.infer<typeof bookingListQuerySchema>;
export type BookingIdParams = z.infer<typeof bookingIdParamsSchema>;
export type RejectBookingInput = z.infer<typeof rejectBookingSchema>;
export type CompleteBookingInput = z.infer<typeof completeBookingSchema>;
