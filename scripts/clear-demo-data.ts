import { env } from "../src/config/env.js";
import {
  auditLogs,
  bookings,
  payments,
  reviews,
  services,
  technicianProfiles,
} from "../src/db/collections.js";
import { mongoClient, mongoDb } from "../src/db/mongo.js";
import { DEMO_USERS, SERVICE_SEEDS } from "./seed-data.js";

const users = mongoDb.collection("user");
const accounts = mongoDb.collection("account");
const sessions = mongoDb.collection("session");
const verifications = mongoDb.collection("verification");

async function main() {
  const demoEmails = DEMO_USERS.map((seed) => seed.email).filter(
    (email) => email !== env.ADMIN_EMAIL,
  );
  const demoUsers = await users
    .find({ email: { $in: demoEmails } }, { projection: { _id: 1 } })
    .toArray();
  const demoUserIds = demoUsers.map((user) => String(user._id));
  const demoObjectIds = demoUsers.map((user) => user._id);

  const demoServiceDocs = await services
    .find(
      {
        $or: [
          { technicianId: { $in: demoUserIds } },
          { legacyId: { $in: SERVICE_SEEDS.map((seed) => seed.legacyId) } },
        ],
      },
      { projection: { _id: 1 } },
    )
    .toArray();
  const demoServiceIds = demoServiceDocs.map((service) => service._id);

  const demoBookingDocs = await bookings
    .find(
      {
        $or: [
          { _id: { $regex: "^demo-booking:" } },
          { customerId: { $in: demoUserIds } },
          { technicianId: { $in: demoUserIds } },
        ],
      },
      { projection: { _id: 1 } },
    )
    .toArray();
  const demoBookingIds = demoBookingDocs.map((booking) => booking._id);

  const paymentResult = await payments.deleteMany({
    $or: [
      { bookingId: { $in: demoBookingIds } },
      { customerId: { $in: demoUserIds } },
      { technicianId: { $in: demoUserIds } },
    ],
  });

  const reviewResult = await reviews.deleteMany({
    $or: [
      { bookingId: { $regex: "^seed-review:" } },
      { bookingId: { $in: demoBookingIds } },
      { serviceId: { $in: demoServiceIds } },
      { customerId: { $in: demoUserIds } },
      { technicianId: { $in: demoUserIds } },
    ],
  });

  const bookingResult = await bookings.deleteMany({
    _id: { $in: demoBookingIds },
  });

  const serviceResult = await services.deleteMany({
    _id: { $in: demoServiceIds },
  });

  const profileResult = await technicianProfiles.deleteMany({
    userId: { $in: demoUserIds },
  });

  const auditResult = await auditLogs.deleteMany({});

  let accountResult = { deletedCount: 0 };
  let sessionResult = { deletedCount: 0 };

  if (demoUserIds.length > 0) {
    accountResult = await accounts.deleteMany({
      $or: [
        { userId: { $in: demoUserIds } },
        { userId: { $in: demoObjectIds } },
      ],
    });
    sessionResult = await sessions.deleteMany({
      $or: [
        { userId: { $in: demoUserIds } },
        { userId: { $in: demoObjectIds } },
      ],
    });
    await users.deleteMany({ _id: { $in: demoObjectIds } });
  }

  const remainingUsers = await users
    .find({}, { projection: { _id: 1 } })
    .toArray();
  const remainingIds = remainingUsers.map((user) => String(user._id));
  const remainingObjectIds = remainingUsers.map((user) => user._id);

  const orphanAccountResult = await accounts.deleteMany({
    $and: [
      { userId: { $nin: remainingIds } },
      { userId: { $nin: remainingObjectIds } },
    ],
  });
  const orphanSessionResult = await sessions.deleteMany({
    $and: [
      { userId: { $nin: remainingIds } },
      { userId: { $nin: remainingObjectIds } },
    ],
  });
  const verificationResult = await verifications.deleteMany({});

  console.log(
    JSON.stringify(
      {
        demoUsersRemoved: demoUserIds.length,
        demoBookingsRemoved: bookingResult.deletedCount,
        demoPaymentsRemoved: paymentResult.deletedCount,
        demoReviewsRemoved: reviewResult.deletedCount,
        demoServicesRemoved: serviceResult.deletedCount,
        technicianProfilesRemoved: profileResult.deletedCount,
        auditLogsRemoved: auditResult.deletedCount,
        authAccountsRemoved: accountResult.deletedCount,
        authSessionsRemoved: sessionResult.deletedCount,
        orphanAccountsRemoved: orphanAccountResult.deletedCount,
        orphanSessionsRemoved: orphanSessionResult.deletedCount,
        verificationsRemoved: verificationResult.deletedCount,
        remainingUsers: remainingUsers.length,
        remainingServices: await services.countDocuments(),
        remainingBookings: await bookings.countDocuments(),
        remainingPayments: await payments.countDocuments(),
        remainingReviews: await reviews.countDocuments(),
        remainingProfiles: await technicianProfiles.countDocuments(),
        remainingAuditLogs: await auditLogs.countDocuments(),
      },
      null,
      2,
    ),
  );
}

main()
  .catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await mongoClient.close().catch(() => undefined);
  });
