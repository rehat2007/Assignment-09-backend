import { env } from "../src/config/env.js";
import { auth } from "../src/auth.js";
import { mongoClient, mongoDb } from "../src/db/mongo.js";

async function main() {
  const email = env.ADMIN_EMAIL;
  const password = env.ADMIN_PASSWORD;
  const name = env.ADMIN_NAME;

  if (!password || password.length < 8) {
    throw new Error(
      "Set ADMIN_PASSWORD (at least 8 characters) before running this script.",
    );
  }

  try {
    const users = mongoDb.collection("user");
    const existing = await users.findOne({ email });

    if (!existing) {
      const result = await auth.api.signUpEmail({
        body: { name, email, password, accountType: "customer" },
      });
      console.log(`Created account ${result.user.email}`);
    } else {
      console.log(`Account already exists for ${email}`);
    }

    const update = await users.updateOne(
      { email },
      { $set: { role: "admin", emailVerified: true } },
    );

    if (update.matchedCount === 0) {
      throw new Error(`Could not find the user ${email} after sign-up.`);
    }

    console.log(`${email} is now an admin.`);
  } finally {
    await mongoClient.close();
  }
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
