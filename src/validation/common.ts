import { z } from "zod";
import { PAGE_SIZES } from "../http/response.js";
import {
  SERVICE_CATEGORIES,
  SERVICE_MODES,
} from "../types/models.js";

export const APP_ROLES = ["customer", "technician", "admin"] as const;
export const ACCOUNT_TYPES = ["customer", "technician"] as const;

export const BOOKING_STATUSES = [
  "requested",
  "accepted",
  "in-progress",
  "completed",
  "cancelled",
  "rejected",
] as const;

export const PAYMENT_STATUSES = ["unpaid", "paid"] as const;
export const APPROVAL_STATUSES = ["pending", "approved", "rejected"] as const;

export const serviceCategorySchema = z.enum(SERVICE_CATEGORIES);
export const serviceModeSchema = z.enum(SERVICE_MODES);
export const roleSchema = z.enum(APP_ROLES);
export const accountTypeSchema = z.enum(ACCOUNT_TYPES);
export const bookingStatusSchema = z.enum(BOOKING_STATUSES);
export const paymentStatusSchema = z.enum(PAYMENT_STATUSES);
export const approvalStatusSchema = z.enum(APPROVAL_STATUSES);

export const idSchema = z.string().trim().min(1).max(64);

export const slugSchema = z
  .string()
  .trim()
  .min(1)
  .max(120)
  .regex(
    /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
    "Use a lowercase, hyphen-separated slug.",
  );

export const isoDateSchema = z
  .string()
  .trim()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Use a date in YYYY-MM-DD format.")
  .refine((value) => {
    const date = new Date(`${value}T00:00:00.000Z`);

    return (
      !Number.isNaN(date.getTime()) &&
      date.toISOString().slice(0, 10) === value
    );
  }, "Use a valid calendar date.");

export const phoneSchema = z.string().trim().min(6).max(30);
export const queryStringSchema = z.string().trim().min(1).max(100);

export const booleanQuerySchema = z
  .enum(["true", "false"])
  .transform((value) => value === "true");

/**
 * Query strings send "" for empty filters. Treat that as an omitted value so
 * optional schemas and defaults behave as expected.
 */
export function emptyToUndefined<T extends z.ZodTypeAny>(schema: T) {
  return z.preprocess(
    (value) =>
      typeof value === "string" && value.trim() === "" ? undefined : value,
    schema,
  );
}

const pageField = z.preprocess(
  (value) => (value === "" || value === undefined ? undefined : value),
  z.coerce.number().int().min(1).default(1),
);

export function pageSizeField(defaultPageSize: number) {
  return z.preprocess(
    (value) => (value === "" || value === undefined ? undefined : value),
    z.coerce
      .number()
      .int()
      .min(1)
      .max(PAGE_SIZES.max)
      .default(defaultPageSize),
  );
}

export function paginationFields(defaultPageSize: number) {
  return {
    page: pageField,
    pageSize: pageSizeField(defaultPageSize),
  };
}

export function paginationSchema(defaultPageSize: number) {
  return z.object(paginationFields(defaultPageSize));
}
