import "dotenv/config";
import { z } from "zod";

const optionalString = z.preprocess(
  (value) =>
    typeof value === "string" && value.trim() === "" ? undefined : value,
  z.string().optional(),
);

const optionalUrl = z.preprocess(
  (value) =>
    typeof value === "string" && value.trim() === "" ? undefined : value,
  z.string().url().optional(),
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
  JWT_SECRET: optionalString,
  JWT_EXPIRES_IN: z.string().min(1).default("7d"),
  BETTER_AUTH_URL: origin.default("http://localhost:4000"),
  FRONTEND_URL: origin.default("http://localhost:3000"),
  // Public origin that serves /api/auth/*. Deployments point this at the Next
  // frontend so the rewrite proxies OAuth callbacks and keeps the session
  // cookie on the frontend host. Defaults to FRONTEND_URL when deployed and
  // BETTER_AUTH_URL locally.
  AUTH_PUBLIC_URL: z.preprocess(
    (value) =>
      typeof value === "string" && value.trim() === "" ? undefined : value,
    z
      .string()
      .url()
      .transform((value) => value.replace(/\/+$/, ""))
      .optional(),
  ),
  GOOGLE_CLIENT_ID: optionalString,
  GOOGLE_CLIENT_SECRET: optionalString,
  ADMIN_EMAIL: z.string().min(1).default("admin@fixmate.dev"),
  ADMIN_NAME: z.string().min(1).default("FixMate Admin"),
  ADMIN_PASSWORD: optionalString,
  SEED_PASSWORD: z.string().min(8).default("FixMateDemo123!"),
  STRIPE_SECRET_KEY: optionalString,
  STRIPE_WEBHOOK_SECRET: optionalString,
  UPLOAD_DRIVER: z.enum(["local", "s3", "imgbb"]).default("local"),
  IMGBB_API_KEY: optionalString,
  S3_BUCKET: optionalString,
  S3_REGION: optionalString,
  S3_ACCESS_KEY_ID: optionalString,
  S3_SECRET_ACCESS_KEY: optionalString,
  S3_ENDPOINT: optionalUrl,
  S3_PUBLIC_URL: optionalUrl,
  S3_FORCE_PATH_STYLE: z.enum(["true", "false"]).optional(),
}).superRefine((value, context) => {
  if (value.UPLOAD_DRIVER === "imgbb" && !value.IMGBB_API_KEY) {
    context.addIssue({
      code: "custom",
      path: ["IMGBB_API_KEY"],
      message: "IMGBB_API_KEY is required when UPLOAD_DRIVER=imgbb.",
    });
  }

  if (value.UPLOAD_DRIVER !== "s3") {
    return;
  }

  if (!value.S3_BUCKET) {
    context.addIssue({
      code: "custom",
      path: ["S3_BUCKET"],
      message: "S3_BUCKET is required when UPLOAD_DRIVER=s3.",
    });
  }

  if (!value.S3_REGION) {
    context.addIssue({
      code: "custom",
      path: ["S3_REGION"],
      message: "S3_REGION is required when UPLOAD_DRIVER=s3.",
    });
  }

  if (Boolean(value.S3_ACCESS_KEY_ID) !== Boolean(value.S3_SECRET_ACCESS_KEY)) {
    context.addIssue({
      code: "custom",
      path: ["S3_ACCESS_KEY_ID"],
      message:
        "Set both S3_ACCESS_KEY_ID and S3_SECRET_ACCESS_KEY, or leave both blank to use the default AWS credential chain.",
    });
  }
});

const parsed = schema.safeParse(process.env);

if (!parsed.success) {
  const details = parsed.error.issues
    .map((issue) => `  - ${issue.path.join(".") || "env"}: ${issue.message}`)
    .join("\n");

  throw new Error(`Invalid environment variables:\n${details}`);
}

export const env = parsed.data;

// Vercel sets VERCEL=1 and does not reliably set NODE_ENV for Express apps.
// Treat any deployed environment as production-like.
export const isDeployed =
  env.NODE_ENV === "production" || process.env.VERCEL === "1";

// Better Auth's public origin. In deployments this is the frontend origin,
// which rewrites /api/auth/* to this API, so Google redirects to the frontend
// callback and the session cookie stays on the frontend host.
export const authPublicUrl =
  env.AUTH_PUBLIC_URL ?? (isDeployed ? env.FRONTEND_URL : env.BETTER_AUTH_URL);

// The frontend origin plus the backend origin. Extra localhost origins are
// trusted only outside deployed environments so a dev server on another port
// still works.
export const trustedOrigins = Array.from(
  new Set([
    env.FRONTEND_URL,
    env.BETTER_AUTH_URL,
    authPublicUrl,
    ...(isDeployed ? [] : ["http://localhost:3000", "http://127.0.0.1:3000"]),
  ]),
);
