import {
  auditLogs,
  bookings,
  payments,
  reviews,
  services,
  technicianProfiles,
} from "./collections.js";

/**
 * Run this once at seed/deploy time, never on every request.
 */
export async function ensureIndexes() {
  await Promise.all([
    services.createIndexes([
      { key: { slug: 1 }, unique: true, name: "slug_unique" },
      {
        key: { approval: 1, available: 1, createdAt: -1 },
        name: "public_listing",
      },
      { key: { category: 1, price: 1 }, name: "category_price" },
      { key: { technicianId: 1, approval: 1 }, name: "technician_approval" },
      { key: { deletedAt: 1 }, name: "deleted_at" },
    ]),
    bookings.createIndexes([
      { key: { bookingNumber: 1 }, unique: true, name: "booking_number_unique" },
      {
        key: { customerId: 1, status: 1, createdAt: -1 },
        name: "customer_status",
      },
      {
        key: { technicianId: 1, status: 1, createdAt: -1 },
        name: "technician_status",
      },
      { key: { status: 1, createdAt: -1 }, name: "status_created" },
    ]),
    payments.createIndexes([
      { key: { bookingId: 1 }, unique: true, name: "booking_unique" },
      {
        key: { providerSessionId: 1 },
        unique: true,
        name: "provider_session_unique",
      },
      { key: { paidAt: -1 }, name: "paid_at" },
      { key: { customerId: 1, paidAt: -1 }, name: "customer_paid" },
      { key: { technicianId: 1, paidAt: -1 }, name: "technician_paid" },
    ]),
    reviews.createIndexes([
      { key: { bookingId: 1 }, unique: true, name: "booking_unique" },
      { key: { serviceId: 1, createdAt: -1 }, name: "service_created" },
    ]),
    technicianProfiles.createIndexes([
      { key: { userId: 1 }, unique: true, name: "user_unique" },
    ]),
    auditLogs.createIndexes([
      { key: { createdAt: -1 }, name: "created_at" },
      { key: { actorId: 1, createdAt: -1 }, name: "actor_created" },
      { key: { targetType: 1, targetId: 1, createdAt: -1 }, name: "target_created" },
    ]),
  ]);
}
