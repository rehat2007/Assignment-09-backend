import { z } from "zod";
import { PAGE_SIZES } from "../http/response.js";
import {
  approvalStatusSchema,
  booleanQuerySchema,
  emptyToUndefined,
  paginationFields,
  queryStringSchema,
  serviceCategorySchema,
  serviceModeSchema,
  slugSchema,
} from "./common.js";

const serviceSortSchema = z.enum([
  "newest",
  "price-asc",
  "price-desc",
  "rating",
]);

export const serviceListQuerySchema = z.object({
  q: emptyToUndefined(queryStringSchema.optional()),
  category: emptyToUndefined(serviceCategorySchema.optional()),
  mode: emptyToUndefined(serviceModeSchema.optional()),
  sort: emptyToUndefined(serviceSortSchema.default("newest")),
  ...paginationFields(PAGE_SIZES.public),
});

export const serviceSlugParamsSchema = z.object({
  slug: slugSchema,
});

export const serviceIdParamsSchema = z.object({
  id: idSchema,
});

export type ServiceListQuery = z.infer<typeof serviceListQuerySchema>;
export type ServiceSlugParams = z.infer<typeof serviceSlugParamsSchema>;
export type ServiceIdParams = z.infer<typeof serviceIdParamsSchema>;

const serviceFields = {
  title: z.string().trim().min(3).max(120),
  category: serviceCategorySchema,
  description: z.string().trim().min(20).max(2000),
  location: z.string().trim().min(2).max(120),
  duration: z.string().trim().min(1).max(60),
  price: z.number().int().positive().max(100_000),
  mode: serviceModeSchema,
  coverImage: z.string().url().max(500).nullable().optional(),
  includes: z.array(z.string().trim().min(1).max(120)).max(20),
  warranty: z.string().trim().min(1).max(200),
  availabilityNote: z.string().trim().min(1).max(200),
};

export const createServiceSchema = z.object({
  ...serviceFields,
  includes: serviceFields.includes.default([]),
  warranty: serviceFields.warranty.default("30 days on workmanship"),
  availabilityNote: serviceFields.availabilityNote.default(
    "Contact for availability",
  ),
});

export const updateServiceSchema = z
  .object(serviceFields)
  .partial()
  .refine((value) => Object.keys(value).length > 0, {
    message: "At least one field is required.",
  });

export const serviceAvailabilitySchema = z.object({
  available: z.boolean(),
});

export const rejectServiceSchema = z.object({
  reason: z.string().trim().min(1).max(500),
});

export const adminServiceListQuerySchema = z.object({
  q: emptyToUndefined(queryStringSchema.optional()),
  category: emptyToUndefined(serviceCategorySchema.optional()),
  approval: emptyToUndefined(approvalStatusSchema.optional()),
  available: emptyToUndefined(booleanQuerySchema.optional()),
  ...paginationFields(PAGE_SIZES.dashboard),
});

export const technicianServiceListQuerySchema = z.object({
  approval: emptyToUndefined(approvalStatusSchema.optional()),
  available: emptyToUndefined(booleanQuerySchema.optional()),
  ...paginationFields(PAGE_SIZES.dashboard),
});

export type TechnicianServiceListQuery = z.infer<
  typeof technicianServiceListQuerySchema
>;
export type CreateServiceInput = z.infer<typeof createServiceSchema>;
export type UpdateServiceInput = z.infer<typeof updateServiceSchema>;
