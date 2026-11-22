import { randomUUID } from "node:crypto";
import { ObjectId } from "mongodb";
import { hashPassword } from "better-auth/crypto";
import { auth } from "../src/auth.js";
import { env } from "../src/config/env.js";
import {
  bookings,
  payments,
  reviews,
  services,
  technicianProfiles,
} from "../src/db/collections.js";
import { ensureIndexes } from "../src/db/indexes.js";
import { mongoClient, mongoDb } from "../src/db/mongo.js";
import type {
  BookingDocument,
  BookingStatus,
  BookingStatusEvent,
  PaymentDocument,
} from "../src/types/models.js";
import {
  DEMO_BOOKING_SEEDS,
  DEMO_USERS,
  SERVICE_SEEDS,
  type DemoUserSeed,
} from "./seed-data.js";

const usersCollection = mongoDb.collection("user");
const REVIEW_ID_PREFIX = "seed-review:";
const DEMO_BOOKING_PREFIX = "demo-booking:";

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

function dateTime(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    throw new Error(`Invalid seed timestamp: ${value}`);
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

async function ensureCredentialAccounts(
  seeds: DemoUserSeed[],
  usersByEmail: Map<string, SeededUser>,
) {
  const accounts = mongoDb.collection("account");
  let created = 0;

  for (const seed of seeds) {
    const user = usersByEmail.get(seed.email);

    if (!user) continue;

    const objectId = ObjectId.isValid(user.id)
      ? new ObjectId(user.id)
      : null;

    if (!objectId) continue;

    const existing = await accounts.findOne({
      userId: objectId,
      providerId: "credential",
    });

    if (existing) continue;

    const password =
      seed.role === "admin"
        ? (env.ADMIN_PASSWORD ?? env.SEED_PASSWORD)
        : env.SEED_PASSWORD;
    const now = new Date();

    await accounts.updateOne(
      { userId: objectId, providerId: "credential" },
      {
        $setOnInsert: {
          _id: new ObjectId(),
          accountId: user.id,
          providerId: "credential",
          userId: objectId,
          password: await hashPassword(password),
          createdAt: now,
          updatedAt: now,
        },
      },
      { upsert: true },
    );
    created += 1;
  }

  console.log(`Credential accounts: ${created} created for demo users`);
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

    const specialtyList = [
      ...(specialties.get(seed.name) ?? new Set<string>()),
    ].sort();

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
          specialties: specialtyList,
          updatedAt: now,
        },
        $setOnInsert: {
          _id: randomUUID(),
          createdAt: dateAtMidnight(seed.joined),
        },
      },
      { upsert: true },
    );

    await usersCollection.updateOne(
      { email: seed.email },
      {
        $set: {
          plan: seed.plan,
          ratingAvg: seed.rating ?? 0,
          jobsCompleted: seed.jobs ?? 0,
          repliesIn: "~12 min",
          specialties: specialtyList,
          verificationStatus: "verified",
          updatedAt: now,
        },
      },
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
  const technicianEmailByName = new Map<string, string>();

  for (const seed of seeds.filter((user) => user.accountType === "technician")) {
    const user = usersByEmail.get(seed.email);

    if (user) {
      technicianIdByName.set(seed.name, user.id);
      technicianEmailByName.set(seed.name, seed.email);
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
          technicianEmail:
            technicianEmailByName.get(seed.technicianName) ?? "",
          title: seed.title,
          category: seed.category,
          description: seed.description,
          location: seed.location,
          duration: seed.duration,
          price: seed.price,
          mode: seed.mode,
          coverImage: null,
          image: null,
          basePrice: seed.price,
          estimatedDuration: seed.duration,
          serviceMode: seed.mode,
          serviceArea: seed.location,
          includes: seed.includes,
          warranty: seed.warranty,
          availabilityNote: seed.availabilityNote,
          approval: "approved",
          approvalStatus: "approved",
          available: true,
          isAvailable: true,
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

async function seedBookings(
  seeds: DemoUserSeed[],
  usersByEmail: Map<string, SeededUser>,
) {
  const serviceSlugs = [
    ...new Set(DEMO_BOOKING_SEEDS.map((seed) => seed.serviceSlug)),
  ];
  const serviceDocs = await services
    .find({ slug: { $in: serviceSlugs } })
    .toArray();
  const serviceBySlug = new Map(
    serviceDocs.map((service) => [service.slug, service]),
  );
  const customerSeedsByEmail = new Map(
    seeds
      .filter((seed) => seed.role === "customer")
      .map((seed) => [seed.email, seed]),
  );

  const activeIds = DEMO_BOOKING_SEEDS.map((seed) => seed.id);

  await bookings.deleteMany({
    $and: [
      { _id: { $regex: `^${DEMO_BOOKING_PREFIX}` } },
      { _id: { $nin: activeIds } },
    ],
  });
  await payments.deleteMany({
    $and: [
      { bookingId: { $regex: `^${DEMO_BOOKING_PREFIX}` } },
      { bookingId: { $nin: activeIds } },
    ],
  });

  // Demo bookings intentionally stay unreviewed so the paid-booking review
  // flow can still be tested from the customer dashboard.
  await reviews.deleteMany({
    bookingId: { $regex: `^${DEMO_BOOKING_PREFIX}` },
  });
  await payments.deleteMany({ bookingId: { $in: activeIds } });

  let bookingCount = 0;
  let paymentCount = 0;

  for (const seed of DEMO_BOOKING_SEEDS) {
    const service = serviceBySlug.get(seed.serviceSlug);

    if (!service) {
      throw new Error(`Missing service for demo booking: ${seed.serviceSlug}`);
    }

    const customerUser = usersByEmail.get(seed.customerEmail);

    if (!customerUser) {
      throw new Error(`Missing customer for demo booking: ${seed.customerEmail}`);
    }

    const customerSeed = customerSeedsByEmail.get(seed.customerEmail);
    const technicianId = service.technicianId;
    const createdAt = dateTime(seed.createdAt);
    const finalAmount =
      seed.status === "completed"
        ? (seed.finalAmount ?? service.price)
        : null;
    const events: BookingStatusEvent[] = [
      {
        status: "requested",
        at: createdAt,
        by: customerUser.id,
        note: "Booking requested",
      },
    ];

    if (seed.acceptedAt) {
      events.push({
        status: "accepted",
        at: dateTime(seed.acceptedAt),
        by: technicianId,
        note: "Request accepted by technician",
      });
    }

    if (seed.startedAt) {
      events.push({
        status: "in-progress",
        at: dateTime(seed.startedAt),
        by: technicianId,
        note: "Work started",
      });
    }

    if (seed.completedAt) {
      events.push({
        status: "completed",
        at: dateTime(seed.completedAt),
        by: technicianId,
        note: `Job completed · final amount $${finalAmount}`,
      });
    }

    if (seed.cancelledAt) {
      events.push({
        status: "cancelled",
        at: dateTime(seed.cancelledAt),
        by: customerUser.id,
        note: "Cancelled by customer",
      });
    }

    if (seed.rejectedAt) {
      events.push({
        status: "rejected",
        at: dateTime(seed.rejectedAt),
        by: technicianId,
        note: "Declined by technician",
      });
    }

    const updatedAt = dateTime(
      seed.paidAt ??
        seed.completedAt ??
        seed.cancelledAt ??
        seed.rejectedAt ??
        seed.startedAt ??
        seed.acceptedAt ??
        seed.createdAt,
    );

    const booking: BookingDocument = {
      _id: seed.id,
      bookingNumber: seed.bookingNumber,
      customerId: customerUser.id,
      technicianId,
      serviceId: service._id,
      serviceSlug: service.slug,
      serviceTitle: service.title,
      serviceImage: service.coverImage,
      category: service.category,
      mode: service.mode,
      basePrice: service.price,
      finalAmount,
      preferredDate: seed.preferredDate,
      phone: customerSeed?.phone || "+880 1700 000000",
      address: `House 12, Road 4, ${customerSeed?.area || "Dhaka"}`,
      problem: seed.problem,
      technicianName: service.technicianName,
      technicianEmail: service.technicianEmail ?? "",
      customerName: customerUser.name,
      customerEmail: customerUser.email,
      customerPhone: customerSeed?.phone || "+880 1700 000000",
      problemDescription: seed.problem,
      status: seed.status,
      paymentStatus: seed.payment ? "paid" : "unpaid",
      statusHistory: events,
      createdAt,
      updatedAt,
      ...(seed.acceptedAt
        ? { acceptedAt: dateTime(seed.acceptedAt) }
        : {}),
      ...(seed.startedAt ? { startedAt: dateTime(seed.startedAt) } : {}),
      ...(seed.completedAt
        ? { completedAt: dateTime(seed.completedAt) }
        : {}),
      ...(seed.cancelledAt
        ? { cancelledAt: dateTime(seed.cancelledAt) }
        : {}),
      ...(seed.rejectedAt
        ? { rejectedAt: dateTime(seed.rejectedAt) }
        : {}),
    };

    await bookings.updateOne(
      { _id: seed.id },
      { $set: booking },
      { upsert: true },
    );
    bookingCount += 1;

    if (seed.payment) {
      const paidAt = dateTime(
        seed.paidAt ?? seed.completedAt ?? seed.createdAt,
      );
      const payment: PaymentDocument = {
        _id: seed.id.replace(DEMO_BOOKING_PREFIX, "demo-payment:"),
        bookingId: seed.id,
        customerId: customerUser.id,
        technicianId,
        amount: seed.payment.amount,
        currency: "usd",
        provider: "stripe",
        providerSessionId: seed.payment.sessionId,
        providerPaymentIntentId: seed.payment.intentId,
        transactionId: seed.payment.intentId,
        status: "paid",
        paidAt,
        invoiceNumber: seed.payment.invoiceNumber,
        createdAt: paidAt,
        serviceTitle: service.title,
        customerName: customerUser.name,
        customerEmail: customerUser.email,
        technicianName: service.technicianName,
        technicianEmail: service.technicianEmail ?? "",
        stripeSessionId: seed.payment.sessionId,
        paymentStatus: "paid",
      };

      await payments.updateOne(
        { _id: payment._id },
        { $set: payment },
        { upsert: true },
      );
      paymentCount += 1;
    }
  }

  console.log(
    `Demo bookings: ${bookingCount} upserted, ${paymentCount} demo payments`,
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

  const demoBookingFilter = {
    _id: { $regex: `^${DEMO_BOOKING_PREFIX}` },
  };
  const [
    seededServices,
    publicServices,
    technicianUsers,
    profiles,
    seededReviews,
    demoBookings,
    demoPayments,
    demoStatuses,
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
    bookings.countDocuments(demoBookingFilter),
    payments.countDocuments({
      bookingId: { $regex: `^${DEMO_BOOKING_PREFIX}` },
    }),
    bookings.distinct("status", demoBookingFilter),
  ]);

  console.log(
    `Done: ${seededServices} services (${publicServices} public), ` +
      `${technicianUsers} technicians, ${profiles} profiles, ` +
      `${seededReviews} seeded reviews, ${demoBookings} demo bookings ` +
      `(${demoStatuses.join(", ")}), ${demoPayments} demo payments`,
  );

  if (
    seededServices !== 15 ||
    publicServices !== 15 ||
    technicianUsers !== 3 ||
    profiles !== 3
  ) {
    throw new Error("Seed verification failed.");
  }

  const expectedDemoBookings = DEMO_BOOKING_SEEDS.length;
  const expectedDemoPayments = DEMO_BOOKING_SEEDS.filter(
    (seed) => seed.payment,
  ).length;
  const expectedStatuses: BookingStatus[] = [
    "requested",
    "accepted",
    "in-progress",
    "completed",
    "cancelled",
    "rejected",
  ];
  const missingStatuses = expectedStatuses.filter(
    (status) => !demoStatuses.includes(status),
  );

  if (
    demoBookings !== expectedDemoBookings ||
    demoPayments !== expectedDemoPayments ||
    missingStatuses.length > 0
  ) {
    throw new Error(
      `Demo booking verification failed. Bookings ${demoBookings}/${expectedDemoBookings}, ` +
        `payments ${demoPayments}/${expectedDemoPayments}, ` +
        `missing statuses: ${missingStatuses.join(", ") || "none"}.`,
    );
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

  await ensureCredentialAccounts(seeds, usersByEmail);
  await seedProfiles(seeds, usersByEmail);
  await seedServices(seeds, usersByEmail, admin.id);
  await seedReviews(seeds, usersByEmail);
  await seedBookings(seeds, usersByEmail);
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
