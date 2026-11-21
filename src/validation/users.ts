import { z } from "zod";
import { PAGE_SIZES } from "../http/response.js";
import {
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
  role: roleSchema,
});

export const suspendUserSchema = z.object({
  reason: z.string().trim().max(500).optional(),
});

export type AdminUsersQuery = z.infer<typeof adminUsersQuerySchema>;
export type UserIdParams = z.infer<typeof userIdParamsSchema>;
export type RoleChangeInput = z.infer<typeof roleChangeSchema>;
export type SuspendUserInput = z.infer<typeof suspendUserSchema>;
