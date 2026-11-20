import { randomUUID } from "node:crypto";
import { auth } from "../src/auth.js";
import { env } from "../src/config/env.js";
import { reviews, services, technicianProfiles } from "../src/db/collections.js";
import { ensureIndexes } from "../src/db/indexes.js";
import { mongoClient, mongoDb } from "../src/db/mongo.js";
import { DEMO_USERS, SERVICE_SEEDS, type DemoUserSeed } from "./seed-data.js";

const usersCollection = mongoDb.collection("user");
const REVIEW_ID_PREFIX = "seed-review:";

type SeededUser = {
  id: string;
  email: string;
  name: string;
};

function dateAtMidnight(value: string) {
  const date = new Date(`${value}T00:00:00.000Z`);

  if (Number.isNaN(date.getTime())) {
    throw new Error(`Invalid seed date: ${value}`);
  }

  return date;
}

function seedCustomerId(name: string) {
  const slug = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

  return `seed-customer:${slug || "unknown"}`;
}

async function seedUsers(seeds: DemoUserSeed[]) {
  const usersByEmail = new Map<string, SeededUser>();
  let created = 0;
  let existing = 0;

  for (const seed of seeds) {
    const isEnvAdmin = seed.role === "admin" && seed.email === env.ADMIN_EMAIL;
    const name = isEnvAdmin ? env.ADMIN_NAME : seed.name;
    const password =
      seed.role === "admin"
        ? (env.ADMIN_PASSWORD ?? env.SEED_PASSWORD)
        : env.SEED_PASSWORD;

    const found = await usersCollection.findOne({ email: seed.email });
    let id: string;

    if (found) {
      id = String(found._id);
      existing += 1;

      const patch: Record<string, unknown> = {};

      if (seed.accountType === "technician" && found.accountType !== "technician") {
        patch.accountType = "technician";
      }

      if (seed.accountType === "customer" && !found.accountType) {
        patch.accountType = "customer";
      }

      if (!found.phone && seed.phone) patch.phone = seed.phone;
      if (!found.area && seed.area) patch.area = seed.area;
      if (!found.bio && seed.bio) patch.bio = seed.bio;

      if (Object.keys(patch).length > 0) {
        await usersCollection.updateOne(
          { email: seed.email },
          { $set: patch },
        );
      }
    } else {
      const result = await auth.api.signUpEmail({
        body: {
          name,
          email: seed.email,
          password,
          accountType: seed.accountType,
          ...(seed.phone ? { phone: seed.phone } : {}),
          ...(seed.area ? { area: seed.area } : {}),
          ...(seed.bio ? { bio: seed.bio } : {}),
        },
      });

      id = result.user.id;
      created += 1;
    }

    if (seed.role === "admin") {
      await usersCollection.updateOne(
        { email: seed.email },
        { $set: { role: "admin", emailVerified: true } },
      );
    }

    usersByEmail.set(seed.email, { id, email: seed.email, name });
  }

  console.log(`Users: ${created} created, ${existing} already existed`);

  return usersByEmail;
}

async function seedProfiles(
  seeds: DemoUserSeed[],
  usersByEmail: Map<string, SeededUser>,
) {
  const specialties = new Map<string, Set<string>>();

  for (const service of SERVICE_SEEDS) {
    const set = specialties.get(service.technicianName) ?? new Set<string>();
    set.add(service.category);
    specialties.set(service.technicianName, set);
  }

  const technicians = seeds.filter((seed) => seed.accountType === "technician");
  const now = new Date();

  for (const seed of technicians) {
    const user = usersByEmail.get(seed.email);

    if (!user) {
      throw new Error(`Missing technician user for ${seed.email}`);
    }

    await technicianProfiles.updateOne(
      { userId: user.id },
      {
        $set: {
          userId: user.id,
          verificationStatus: "verified",
          plan: seed.plan,
          ratingAvg: seed.rating ?? 0,
          jobsCompleted: seed.jobs ?? 0,
          repliesIn: "~12 min",
          specialties: [...(specialties.get(seed.name) ?? new Set<string>())].sort(),
          updatedAt: now,
        },
        $setOnInsert: {
          _id: randomUUID(),
          createdAt: dateAtMidnight(seed.joined),
        },
      },
      { upsert: true },
    );
  }

  console.log(`Technician profiles: ${technicians.length} upserted`);
}

async function seedServices(
  seeds: DemoUserSeed[],
  usersByEmail: Map<string, SeededUser>,
  adminUserId: string,
) {
  const technicianIdByName = new Map<string, string>();

  for (const seed of seeds.filter((user) => user.accountType === "technician")) {
    const user = usersByEmail.get(seed.email);

    if (user) {
      technicianIdByName.set(seed.name, user.id);
    }
  }

  const now = new Date();

  for (const seed of SERVICE_SEEDS) {
    const technicianId = technicianIdByName.get(seed.technicianName);

    if (!technicianId) {
      throw new Error(`Missing technician for service ${seed.slug}`);
    }

    const createdAt = dateAtMidnight(seed.createdAt);

    await services.updateOne(
      { slug: seed.slug },
      {
        $set: {
          slug: seed.slug,
          legacyId: seed.legacyId,
          technicianId,
          technicianName: seed.technicianName,
          title: seed.title,
          category: seed.category,
          description: seed.description,
          location: seed.location,
          duration: seed.duration,
          price: seed.price,
          mode: seed.mode,
          coverImage: null,
          includes: seed.includes,
          warranty: seed.warranty,
          availabilityNote: seed.availabilityNote,
          approval: "approved",
          available: true,
          ratingAvg: seed.rating,
          reviewCount: seed.reviewCount,
          createdAt,
          updatedAt: now,
          approvedAt: createdAt,
          approvedBy: adminUserId,
          deletedAt: null,
        },
        $setOnInsert: { _id: randomUUID() },
      },
      { upsert: true },
    );
  }

  console.log(`Services: ${SERVICE_SEEDS.length} approved listings upserted`);
}

async function seedReviews(
  seeds: DemoUserSeed[],
  usersByEmail: Map<string, SeededUser>,
) {
  const serviceDocs = await services
    .find({ slug: { $in: SERVICE_SEEDS.map((seed) => seed.slug) } })
    .project({ _id: 1, slug: 1, technicianId: 1 })
    .toArray();

  const serviceBySlug = new Map(serviceDocs.map((doc) => [doc.slug, doc]));
  const customerByName = new Map<string, SeededUser>();

  for (const seed of seeds.filter((user) => user.role === "customer")) {
    const user = usersByEmail.get(seed.email);

    if (user) {
      customerByName.set(seed.name, user);
    }
  }

  const activeKeys = new Set<string>();
  let upserted = 0;

  for (const seed of SERVICE_SEEDS) {
    const service = serviceBySlug.get(seed.slug);

    if (!service) {
      throw new Error(`Missing service for review seeding: ${seed.slug}`);
    }

    for (const [index, review] of seed.reviews.entries()) {
      const bookingId = `${REVIEW_ID_PREFIX}${seed.slug}:${index + 1}`;
      activeKeys.add(bookingId);

      const customer = customerByName.get(review.name);

      await reviews.updateOne(
        { bookingId },
        {
          $set: {
            bookingId,
            serviceId: service._id,
            customerId: customer?.id ?? seedCustomerId(review.name),
            technicianId: service.technicianId,
            rating: review.rating,
            text: review.text,
            visible: true,
            createdAt: dateAtMidnight(review.at),
          },
          $setOnInsert: { _id: randomUUID() },
        },
        { upsert: true },
      );

      upserted += 1;
    }
  }

  const seededReviews = await reviews
    .find({ bookingId: { $regex: `^${REVIEW_ID_PREFIX}` } })
    .project({ bookingId: 1 })
    .toArray();

  const stale = seededReviews
    .map((review) => review.bookingId)
    .filter((bookingId) => !activeKeys.has(bookingId));

  if (stale.length > 0) {
    await reviews.deleteMany({ bookingId: { $in: stale } });
  }

  console.log(
    `Reviews: ${upserted} upserted${
      stale.length > 0 ? `, ${stale.length} stale removed` : ""
    }`,
  );
}

async function report(
  seeds: DemoUserSeed[],
  usersByEmail: Map<string, SeededUser>,
) {
  const legacyIds = SERVICE_SEEDS.map((seed) => seed.legacyId);
  const technicianSeeds = seeds.filter(
    (seed) => seed.accountType === "technician",
  );
  const technicianEmails = technicianSeeds.map((seed) => seed.email);
  const technicianIds = technicianSeeds
    .map((seed) => usersByEmail.get(seed.email)?.id)
    .filter((id): id is string => Boolean(id));

  const [
    seededServices,
    publicServices,
    technicianUsers,
    profiles,
    seededReviews,
  ] = await Promise.all([
    services.countDocuments({ legacyId: { $in: legacyIds } }),
    services.countDocuments({
      legacyId: { $in: legacyIds },
      approval: "approved",
      available: true,
      deletedAt: null,
    }),
    usersCollection.countDocuments({ email: { $in: technicianEmails } }),
    technicianProfiles.countDocuments({ userId: { $in: technicianIds } }),
    reviews.countDocuments({ bookingId: { $regex: `^${REVIEW_ID_PREFIX}` } }),
  ]);

  console.log(
    `Done: ${seededServices} services (${publicServices} public), ` +
      `${technicianUsers} technicians, ${profiles} profiles, ` +
      `${seededReviews} seeded reviews`,
  );

  if (
    seededServices !== 15 ||
    publicServices !== 15 ||
    technicianUsers !== 3 ||
    profiles !== 3
  ) {
    throw new Error("Seed verification failed.");
  }
}

async function main() {
  const seeds = [...DEMO_USERS];

  if (!seeds.some((seed) => seed.email === env.ADMIN_EMAIL)) {
    seeds.push({
      name: env.ADMIN_NAME,
      email: env.ADMIN_EMAIL,
      role: "admin",
      accountType: "customer",
      phone: "",
      area: "",
      bio: "",
      joined: new Date().toISOString().slice(0, 10),
      plan: "free",
    });
  }

  console.log("Ensuring indexes...");
  await ensureIndexes();

  const usersByEmail = await seedUsers(seeds);
  const admin = usersByEmail.get(env.ADMIN_EMAIL);

  if (!admin) {
    throw new Error(`Missing admin user ${env.ADMIN_EMAIL}`);
  }

  await seedProfiles(seeds, usersByEmail);
  await seedServices(seeds, usersByEmail, admin.id);
  await seedReviews(seeds, usersByEmail);
  await report(seeds, usersByEmail);

  console.log(
    "Demo accounts use SEED_PASSWORD from .env; the admin uses ADMIN_PASSWORD when set.",
  );
}

main()
  .catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  })
  .finally(async () => {
    // Better Auth creates its own indexes in the background after the first
    // sign-up. Wait briefly so closing the client does not abort that work.
    await new Promise((resolve) => setTimeout(resolve, 1_000));
    await mongoClient.close().catch(() => undefined);
  });
