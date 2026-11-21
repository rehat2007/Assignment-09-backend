import "dotenv/config";
import { z } from "zod";

const optionalString = z.preprocess(
  (value) =>
    typeof value === "string" && value.trim() === "" ? undefined : value,
  z.string().optional(),
);

const origin = z
  .string()
  .min(1)
  .transform((value) => value.replace(/\/+$/, ""));

const schema = z.object({
  NODE_ENV: z
    .enum(["development", "test", "production"])
    .default("development"),
  PORT: z.coerce.number().int().positive().max(65535).default(4000),
  MONGODB_URI: z.string().min(1).default("mongodb://localhost:27017"),
  MONGODB_DB: z.string().min(1).default("fixmate"),
  MONGODB_DNS_SERVERS: optionalString,
  BETTER_AUTH_SECRET: z
    .string()
    .min(32, "BETTER_AUTH_SECRET must be at least 32 characters."),
  BETTER_AUTH_URL: origin.default("http://localhost:4000"),
  FRONTEND_URL: origin.default("http://localhost:3000"),
  GOOGLE_CLIENT_ID: optionalString,
  GOOGLE_CLIENT_SECRET: optionalString,
  ADMIN_EMAIL: z.string().min(1).default("admin@fixmate.dev"),
  ADMIN_NAME: z.string().min(1).default("FixMate Admin"),
  ADMIN_PASSWORD: optionalString,
  SEED_PASSWORD: z.string().min(8).default("FixMateDemo123!"),
  STRIPE_SECRET_KEY: optionalString,
  STRIPE_WEBHOOK_SECRET: optionalString,
});

const parsed = schema.safeParse(process.env);

if (!parsed.success) {
  const details = parsed.error.issues
    .map((issue) => `  - ${issue.path.join(".") || "env"}: ${issue.message}`)
    .join("\n");

  throw new Error(`Invalid environment variables:\n${details}`);
}

export const env = parsed.data;

// The frontend origin plus the backend origin. Extra localhost origins are
// trusted only in development so a dev server on another port still works.
export const trustedOrigins = Array.from(
  new Set([
    env.FRONTEND_URL,
    env.BETTER_AUTH_URL,
    ...(env.NODE_ENV !== "production"
      ? ["http://localhost:3000", "http://127.0.0.1:3000"]
      : []),
  ]),
);
