import { z } from "zod";
import { accountTypeSchema, phoneSchema } from "./common.js";

/*
 * Better Auth owns /api/auth/*. These schemas mirror the supported payloads for
 * shared typing and future non-auth handlers. Do not add a second auth route
 * that duplicates Better Auth's sign-up/sign-in/update-user endpoints.
 */

export const signUpEmailSchema = z.object({
  name: z.string().trim().min(1).max(120),
  email: z.string().trim().toLowerCase().email().max(254),
  password: z.string().min(8).max(128),
  accountType: accountTypeSchema.default("customer"),
  phone: phoneSchema.optional(),
  area: z.string().trim().max(120).optional(),
  bio: z.string().trim().max(240).optional(),
});

export const signInEmailSchema = z.object({
  email: z.string().trim().toLowerCase().email().max(254),
  password: z.string().min(1).max(128),
  rememberMe: z.boolean().optional(),
});

export const updateProfileSchema = z
  .object({
    name: z.string().trim().min(1).max(120).optional(),
    phone: phoneSchema.optional(),
    area: z.string().trim().max(120).optional(),
    bio: z.string().trim().max(240).optional(),
    image: z.string().url().max(500).nullable().optional(),
  })
  .refine((value) => Object.keys(value).length > 0, {
    message: "At least one field is required.",
  });
