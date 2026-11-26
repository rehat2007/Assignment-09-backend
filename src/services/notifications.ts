import { bookings, payments, services } from "../db/collections.js";
import type { AppRole } from "../roles.js";
import type {
  BookingDocument,
  PaymentDocument,
  ServiceDocument,
} from "../types/models.js";

export type NotificationKind =
  | "booking"
  | "request"
  | "payment"
  | "approval"
  | "status";

export type NotificationTone =
  | "blue"
  | "green"
  | "amber"
  | "red"
  | "gray";

export type NotificationDto = {
  id: string;
  title: string;
  message: string;
  at: string;
  href: string;
  kind: NotificationKind;
  tone: NotificationTone;
};

const LIMIT = 12;

function money(value: number | null | undefined) {
  const amount = typeof value === "number" && Number.isFinite(value) ? value : 0;
  return `$${amount.toFixed(2)}`;
}

function at(value: Date | string | null | undefined) {
  const date = value instanceof Date ? value : value ? new Date(value) : new Date();
  return Number.isNaN(date.getTime()) ? new Date().toISOString() : date.toISOString();
}

function technicianName(booking: BookingDocument) {
  return booking.technicianName?.trim() || "FixMate technician";
}

function customerName(booking: BookingDocument) {
  return booking.customerName?.trim() || "Customer";
}

function customerNotifications(bookingsForCustomer: BookingDocument[]) {
  const items: NotificationDto[] = [];

  for (const booking of bookingsForCustomer) {
    const service = `${booking.serviceTitle} · ${technicianName(booking)}`;
    const href = "/dashboard/customer/bookings";

    if (booking.status === "requested") {
      items.push({
        id: `booking:${booking._id}:requested`,
        title: "Job requested",
        message: service,
        at: at(booking.createdAt),
        href,
        kind: "request",
        tone: "blue",
      });
    } else if (booking.status === "accepted") {
      items.push({
        id: `booking:${booking._id}:accepted`,
        title: "Job accepted",
        message: service,
        at: at(booking.acceptedAt ?? booking.updatedAt),
        href,
        kind: "booking",
        tone: "green",
      });
    } else if (booking.status === "in-progress") {
      items.push({
        id: `booking:${booking._id}:in-progress`,
        title: "Job in progress",
        message: service,
        at: at(booking.startedAt ?? booking.updatedAt),
        href,
        kind: "status",
        tone: "amber",
      });
    } else if (booking.status === "completed") {
      if (booking.paymentStatus === "paid") {
        items.push({
          id: `booking:${booking._id}:paid`,
          title: "Payment complete",
          message: `${booking.serviceTitle} · ${money(booking.finalAmount ?? booking.basePrice)} paid.`,
          at: at(booking.updatedAt),
          href: "/dashboard/customer/payments",
          kind: "payment",
          tone: "green",
        });
      } else {
        items.push({
          id: `booking:${booking._id}:payment-due`,
          title: "Payment due",
          message: `${booking.serviceTitle} is complete — ${money(booking.finalAmount ?? booking.basePrice)} is ready to pay.`,
          at: at(booking.completedAt ?? booking.updatedAt),
          href: "/dashboard/customer/payments",
          kind: "payment",
          tone: "amber",
        });
      }
    } else if (booking.status === "cancelled") {
      items.push({
        id: `booking:${booking._id}:cancelled`,
        title: "Request cancelled",
        message: service,
        at: at(booking.cancelledAt ?? booking.updatedAt),
        href,
        kind: "status",
        tone: "gray",
      });
    } else if (booking.status === "rejected") {
      items.push({
        id: `booking:${booking._id}:rejected`,
        title: "Request declined",
        message: service,
        at: at(booking.rejectedAt ?? booking.updatedAt),
        href,
        kind: "status",
        tone: "red",
      });
    }
  }

  return items;
}

function technicianNotifications(
  bookingsForTechnician: BookingDocument[],
  listings: ServiceDocument[],
  recentPayments: PaymentDocument[],
) {
  const items: NotificationDto[] = [];

  for (const booking of bookingsForTechnician) {
    const service = `${booking.serviceTitle} · ${customerName(booking)}`;
    const href = "/dashboard/technician/requests";

    if (booking.status === "requested") {
      items.push({
        id: `booking:${booking._id}:requested`,
        title: "New job request",
        message: service,
        at: at(booking.createdAt),
        href,
        kind: "request",
        tone: "blue",
      });
    } else if (booking.status === "accepted") {
      items.push({
        id: `booking:${booking._id}:accepted`,
        title: "Job accepted",
        message: service,
        at: at(booking.acceptedAt ?? booking.updatedAt),
        href,
        kind: "booking",
        tone: "green",
      });
    } else if (booking.status === "in-progress") {
      items.push({
        id: `booking:${booking._id}:in-progress`,
        title: "Job in progress",
        message: service,
        at: at(booking.startedAt ?? booking.updatedAt),
        href,
        kind: "status",
        tone: "amber",
      });
    } else if (booking.status === "completed") {
      items.push({
        id: `booking:${booking._id}:completed`,
        title: "Job completed",
        message: `${booking.serviceTitle} · ${money(booking.finalAmount ?? booking.basePrice)}`,
        at: at(booking.completedAt ?? booking.updatedAt),
        href,
        kind: "status",
        tone: "green",
      });
    } else if (booking.status === "cancelled") {
      items.push({
        id: `booking:${booking._id}:cancelled`,
        title: "Job cancelled",
        message: service,
        at: at(booking.cancelledAt ?? booking.updatedAt),
        href,
        kind: "status",
        tone: "gray",
      });
    }
  }

  for (const listing of listings) {
    if (listing.approval === "pending") {
      items.push({
        id: `service:${listing._id}:pending`,
        title: "Listing awaiting approval",
        message: `${listing.title} · ${money(listing.price)}`,
        at: at(listing.updatedAt),
        href: "/dashboard/technician/my-services",
        kind: "approval",
        tone: "amber",
      });
    } else if (listing.approval === "rejected") {
      items.push({
        id: `service:${listing._id}:rejected`,
        title: "Listing rejected",
        message: `${listing.title} · ${listing.rejectionReason?.trim() || "Review the listing and resubmit."}`,
        at: at(listing.updatedAt),
        href: "/dashboard/technician/my-services",
        kind: "approval",
        tone: "red",
      });
    }
  }

  for (const payment of recentPayments) {
    items.push({
      id: `payment:${payment._id}:paid`,
      title: "Payment received",
      message: `${payment.serviceTitle?.trim() || "Completed repair"} · ${money(payment.amount)}`,
      at: at(payment.paidAt),
      href: "/dashboard/technician",
      kind: "payment",
      tone: "green",
    });
  }

  return items;
}

function adminNotifications(
  pendingListings: ServiceDocument[],
  recentBookings: BookingDocument[],
  recentPayments: PaymentDocument[],
) {
  const items: NotificationDto[] = [];

  for (const listing of pendingListings) {
    items.push({
      id: `service:${listing._id}:pending`,
      title: "Listing awaiting approval",
      message: `${listing.title} · ${listing.technicianName || "Technician"}`,
      at: at(listing.updatedAt),
      href: "/dashboard/admin/services",
      kind: "approval",
      tone: "amber",
    });
  }

  for (const booking of recentBookings) {
    items.push({
      id: `booking:${booking._id}:${booking.status}`,
      title: booking.status === "requested" ? "New booking" : "Booking update",
      message: `${booking.serviceTitle} · ${customerName(booking)}`,
      at: at(booking.updatedAt),
      href: "/dashboard/admin/bookings",
      kind: "booking",
      tone: booking.status === "requested" ? "blue" : "gray",
    });
  }

  for (const payment of recentPayments) {
    items.push({
      id: `payment:${payment._id}:paid`,
      title: "Payment received",
      message: `${payment.serviceTitle?.trim() || "Repair"} · ${money(payment.amount)}`,
      at: at(payment.paidAt),
      href: "/dashboard/admin/transactions",
      kind: "payment",
      tone: "green",
    });
  }

  return items;
}

export async function getNotifications(userId: string, role: AppRole) {
  let items: NotificationDto[] = [];

  if (role === "customer") {
    const customerBookings = await bookings
      .find({ customerId: userId })
      .sort({ updatedAt: -1 })
      .limit(20)
      .toArray();

    items = customerNotifications(customerBookings);
  } else if (role === "technician") {
    const [technicianBookings, listings, recentPayments] = await Promise.all([
      bookings
        .find({ technicianId: userId })
        .sort({ updatedAt: -1 })
        .limit(20)
        .toArray(),
      services
        .find({
          technicianId: userId,
          deletedAt: null,
          approval: { $in: ["pending", "rejected"] },
        })
        .sort({ updatedAt: -1 })
        .limit(10)
        .toArray(),
      payments
        .find({ technicianId: userId, status: "paid" })
        .sort({ paidAt: -1 })
        .limit(5)
        .toArray(),
    ]);

    items = technicianNotifications(technicianBookings, listings, recentPayments);
  } else {
    const [pendingListings, recentBookings, recentPayments] = await Promise.all([
      services
        .find({ approval: "pending", deletedAt: null })
        .sort({ updatedAt: -1 })
        .limit(10)
        .toArray(),
      bookings.find({}).sort({ updatedAt: -1 }).limit(10).toArray(),
      payments
        .find({ status: "paid" })
        .sort({ paidAt: -1 })
        .limit(5)
        .toArray(),
    ]);

    items = adminNotifications(pendingListings, recentBookings, recentPayments);
  }

  items.sort(
    (left, right) => new Date(right.at).getTime() - new Date(left.at).getTime(),
  );

  return items.slice(0, LIMIT);
}
