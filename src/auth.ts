import { betterAuth } from "better-auth";
import { admin } from "better-auth/plugins";
import { mongodbAdapter } from "@better-auth/mongo-adapter";
import { env, trustedOrigins } from "./config/env.js";
import { mongoDb } from "./db/mongo.js";

const googleProvider =
  env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET
    ? {
        google: {
          clientId: env.GOOGLE_CLIENT_ID,
          clientSecret: env.GOOGLE_CLIENT_SECRET,
        },
      }
    : undefined;

export const auth = betterAuth({
  appName: "FixMate",
  baseURL: env.BETTER_AUTH_URL,
  trustedOrigins,
  // No `client` option: works with standalone MongoDB and Atlas alike.
  database: mongodbAdapter(mongoDb),
  emailAndPassword: {
    enabled: true,
  },
  socialProviders: googleProvider,
  user: {
    additionalFields: {
      // Customer vs technician. Admin access comes from Better Auth's admin
      // plugin `role`, which clients cannot set during public sign-up.
      accountType: {
        type: "string",
        required: false,
        defaultValue: "customer",
        input: true,
      },
      phone: {
        type: "string",
        required: false,
        input: true,
      },
      area: {
        type: "string",
        required: false,
        input: true,
      },
      bio: {
        type: "string",
        required: false,
        input: true,
      },
    },
  },
  databaseHooks: {
    user: {
      create: {
        before: async (user) => {
          const requested = (user as { accountType?: unknown }).accountType;

          return {
            data: {
              ...user,
              // Never trust the submitted value beyond these two account types.
              accountType: requested === "technician" ? "technician" : "customer",
            },
          };
        },
      },
    },
  },
  plugins: [admin()],
});
