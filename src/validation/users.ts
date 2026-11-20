import { z } from "zod";
import { PAGE_SIZES } from "../http/response.js";
import {
  accountTypeSchema,
  emptyToUndefined,
  idSchema,
  paginationFields,
  queryStringSchema,
  roleSchema,
} from "./common.js";

export const userIdParamsSchema = z.object({
  id: idSchema,
});

export const adminUsersQuerySchema = z.object({
  q: emptyToUndefined(queryStringSchema.optional()),
  role: emptyToUndefined(roleSchema.optional()),
  ...paginationFields(PAGE_SIZES.dashboard),
});

export const roleChangeSchema = z.object({
  // Customer <-> technician. Admin promotion stays in the seed/admin tooling.
  role: accountTypeSchema,
});

export const suspendUserSchema = z.object({
  reason: z.string().trim().max(500).optional(),
});
