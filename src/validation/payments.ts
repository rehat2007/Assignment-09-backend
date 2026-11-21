import { z } from "zod";
import { PAGE_SIZES } from "../http/response.js";
import { idSchema, paginationFields } from "./common.js";

export const paymentListQuerySchema = z.object({
  ...paginationFields(PAGE_SIZES.dashboard),
});

export const paymentIdParamsSchema = z.object({
  id: idSchema,
});

export const paymentVerifyQuerySchema = z.object({
  session_id: z.string().trim().min(1).max(200),
});

export const refundPaymentSchema = z.object({
  reason: z.string().trim().max(500).optional(),
});

export type PaymentListQuery = z.infer<typeof paymentListQuerySchema>;
export type PaymentIdParams = z.infer<typeof paymentIdParamsSchema>;
export type PaymentVerifyQuery = z.infer<typeof paymentVerifyQuerySchema>;
