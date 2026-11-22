import { ObjectId } from "mongodb";
import {
  bookings,
  payments,
  reviews,
  services,
  technicianProfiles,
} from "../src/db/collections.js";
import { ensureIndexes } from "../src/db/indexes.js";
import { mongoClient, mongoDb } from "../src/db/mongo.js";

const users = mongoDb.collection("user");

async function userById(id: string) {
  const objectId = ObjectId.isValid(id) ? new ObjectId(id) : null;
  return objectId ? users.findOne({ _id: objectId }) : null;
}

async function migrateUsers() {
  const profiles = await technicianProfiles.find().toArray();
  let updated = 0;

  for (const profile of profiles) {
    const objectId = ObjectId.isValid(profile.userId)
      ? new ObjectId(profile.userId)
      : null;

    if (!objectId) continue;

    const result = await users.updateOne(
      { _id: objectId },
      {
        $set: {
          plan: profile.plan,
          ratingAvg: profile.ratingAvg,
          jobsCompleted: profile.jobsCompleted,
          repliesIn: profile.repliesIn,
          specialties: profile.specialties,
          verificationStatus: profile.verificationStatus,
          updatedAt: profile.updatedAt,
        },
      },
    );

    if (result.matchedCount > 0) updated += 1;
  }

  console.log(`Users: ${updated} profile fields backfilled`);
}

async function migrateServices() {
  const docs = await services.find().toArray();
  let updated = 0;

  for (const service of docs) {
    const technician = await userById(service.technicianId);

    await services.updateOne(
      { _id: service._id },
      {
        $set: {
          image: service.coverImage,
          basePrice: service.price,
          estimatedDuration: service.duration,
          serviceMode: service.mode,
          serviceArea: service.location,
          technicianEmail:
            service.technicianEmail ??
            (typeof technician?.email === "string" ? technician.email : ""),
          approvalStatus: service.approval,
          isAvailable: service.available,
        },
      },
    );
    updated += 1;
  }

  console.log(`Services: ${updated} compatibility fields backfilled`);
}

async function migrateBookings() {
  const docs = await bookings.find().toArray();
  let updated = 0;

  for (const booking of docs) {
    const [customer, technician, review] = await Promise.all([
      userById(booking.customerId),
      userById(booking.technicianId),
      reviews.findOne({ bookingId: booking._id }),
    ]);

    await bookings.updateOne(
      { _id: booking._id },
      {
        $set: {
          technicianName:
            booking.technicianName ??
            (typeof technician?.name === "string" ? technician.name : ""),
          technicianEmail:
            booking.technicianEmail ??
            (typeof technician?.email === "string" ? technician.email : ""),
          customerName:
            booking.customerName ??
            (typeof customer?.name === "string" ? customer.name : ""),
          customerEmail:
            booking.customerEmail ??
            (typeof customer?.email === "string" ? customer.email : ""),
          customerPhone: booking.customerPhone ?? booking.phone,
          problemDescription: booking.problemDescription ?? booking.problem,
          ...(review
            ? {
                rating: review.rating,
                reviewText: review.text,
                reviewedAt: review.createdAt,
                reviewVisible: review.visible,
              }
            : {}),
        },
      },
    );
    updated += 1;
  }

  console.log(`Bookings: ${updated} compatibility fields backfilled`);
}

async function migratePayments() {
  const docs = await payments.find().toArray();
  let updated = 0;

  for (const payment of docs) {
    const booking = await bookings.findOne({ _id: payment.bookingId });
    const [customer, technician] = await Promise.all([
      userById(payment.customerId),
      userById(payment.technicianId),
    ]);

    await payments.updateOne(
      { _id: payment._id },
      {
        $set: {
          serviceTitle:
            payment.serviceTitle ?? booking?.serviceTitle ?? "Service",
          customerName:
            payment.customerName ??
            booking?.customerName ??
            (typeof customer?.name === "string" ? customer.name : ""),
          customerEmail:
            payment.customerEmail ??
            booking?.customerEmail ??
            (typeof customer?.email === "string" ? customer.email : ""),
          technicianName:
            payment.technicianName ??
            booking?.technicianName ??
            (typeof technician?.name === "string" ? technician.name : ""),
          technicianEmail:
            payment.technicianEmail ??
            booking?.technicianEmail ??
            (typeof technician?.email === "string" ? technician.email : ""),
          stripeSessionId:
            payment.stripeSessionId ?? payment.providerSessionId,
          paymentStatus: "paid",
        },
      },
    );
    updated += 1;
  }

  console.log(`Payments: ${updated} compatibility fields backfilled`);
}

async function main() {
  await migrateUsers();
  await migrateServices();
  await migrateBookings();
  await migratePayments();
  await ensureIndexes();
  console.log("Schema compatibility migration and indexes complete.");
}

main()
  .catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await mongoClient.close().catch(() => undefined);
  });
