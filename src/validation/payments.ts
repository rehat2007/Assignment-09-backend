import { z } from "zod";
import { PAGE_SIZES } from "../http/response.js";
import { idSchema, paginationFields } from "./common.js";

export const paymentListQuerySchema = z.object({
  ...paginationFields(PAGE_SIZES.dashboard),
});

export const paymentIdParamsSchema = z.object({
  id: idSchema,
});

export const refundPaymentSchema = z.object({
  reason: z.string().trim().max(500).optional(),
});
