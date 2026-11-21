import { randomInt, randomUUID } from "node:crypto";
import { ObjectId } from "mongodb";
import { bookings, payments, reviews, services } from "../db/collections.js";
import { mongoDb } from "../db/mongo.js";
import { ApiError } from "../http/api-error.js";
import { buildSpendSeries } from "../lib/spend-series.js";
import type {
  BookingDocument,
  BookingStatus,
  PaymentStatus,
  ServiceCategory,
} from "../types/models.js";
import type { AppRole } from "../roles.js";

export type CustomerBookingDto = {
  id: string;
  bookingNumber: string;
  serviceId: string;
  serviceSlug: string;
  title: string;
  serviceImage: string | null;
  category: ServiceCategory;
  technician: string;
  preferredDate: string;
  basePrice: number;
  finalAmount: number | null;
  status: BookingStatus;
  paymentStatus: PaymentStatus;
  reviewed: boolean;
  updatedAt: string;
  createdAt: string;
  phone: string;
  address: string;
  problem: string;
};

export type BookingHistoryDto = {
  status: BookingStatus;
  at: string;
  by: string;
  note?: string;
};

export type CustomerBookingDetailDto = CustomerBookingDto & {
  statusHistory: BookingHistoryDto[];
};

export type CustomerOverviewDto = {
  stats: {
    total: number;
    active: number;
    completed: number;
    spent: number;
    completionRate: number;
    paymentCount: number;
  };
  counts: Record<string, number>;
  active: CustomerBookingDto | null;
  recent: CustomerBookingDto[];
  spend: Array<{ label: string; value: number }>;
};

export type CreateBookingInput = {
  serviceSlug: string;
  preferredDate: string;
  phone: string;
  address: string;
  problem: string;
};

export type ListBookingsOptions = {
  status?: BookingStatus;
  page: number;
  pageSize: number;
};

const BOOKING_NUMBER_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const ACTIVE_STATUSES = new Set<BookingStatus>([
  "requested",
  "accepted",
  "in-progress",
]);
const STATUS_KEYS: BookingStatus[] = [
  "requested",
  "accepted",
  "in-progress",
  "completed",
  "cancelled",
  "rejected",
];

function dateOnly(value: Date) {
  return value.toISOString().slice(0, 10);
}

function generateBookingNumber() {
  const day = new Date().toISOString().slice(0, 10).replace(/-/g, "");
  let suffix = "";

  for (let index = 0; index < 5; index += 1) {
    suffix += BOOKING_NUMBER_ALPHABET[randomInt(BOOKING_NUMBER_ALPHABET.length)];
  }

  return `FM-${day}-${suffix}`;
}

function isDuplicateKey(error: unknown) {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as { code?: number }).code === 11000
  );
}

async function loadTechnicianNames(ids: string[]) {
  const objectIds = [...new Set(ids)]
    .filter((id) => ObjectId.isValid(id))
    .map((id) => new ObjectId(id));

  if (objectIds.length === 0) {
    return new Map<string, string>();
  }

  const users = await mongoDb
    .collection("user")
    .find({ _id: { $in: objectIds } })
    .project({ name: 1 })
    .toArray();

  return new Map(
    users.map((user) => [
      user._id.toString(),
      typeof user.name === "string" && user.name.trim()
        ? user.name
        : "FixMate technician",
    ]),
  );
}

function technicianNameFor(
  names: Map<string, string>,
  technicianId: string,
) {
  return names.get(technicianId) ?? "FixMate technician";
}

function toCustomerBooking(
  booking: BookingDocument,
  technician: string,
  reviewed: boolean,
): CustomerBookingDto {
  return {
    id: booking._id,
    bookingNumber: booking.bookingNumber,
    serviceId: booking.serviceId,
    serviceSlug: booking.serviceSlug,
    title: booking.serviceTitle,
    serviceImage: booking.serviceImage ?? null,
    category: booking.category,
    technician,
    preferredDate: booking.preferredDate,
    basePrice: booking.basePrice,
    finalAmount: booking.finalAmount,
    status: booking.status,
    paymentStatus: booking.paymentStatus,
    reviewed,
    updatedAt: dateOnly(booking.updatedAt),
    createdAt: dateOnly(booking.createdAt),
    phone: booking.phone,
    address: booking.address,
    problem: booking.problem,
  };
}

function toCustomerBookingDetail(
  booking: BookingDocument,
  technician: string,
  reviewed: boolean,
): CustomerBookingDetailDto {
  return {
    ...toCustomerBooking(booking, technician, reviewed),
    statusHistory: booking.statusHistory.map((entry) => ({
      status: entry.status,
      at: entry.at.toISOString(),
      by: entry.by,
      ...(entry.note ? { note: entry.note } : {}),
    })),
  };
}

async function loadReviewedBookingIds(bookingIds: string[]) {
  if (bookingIds.length === 0) {
    return new Set<string>();
  }

  const docs = await reviews
    .find(
      { bookingId: { $in: bookingIds } },
      { projection: { bookingId: 1 } },
    )
    .toArray();

  return new Set(docs.map((review) => review.bookingId));
}

export async function createBooking(
  customerId: string,
  input: CreateBookingInput,
): Promise<CustomerBookingDto> {
  const service = await services.findOne({
    slug: input.serviceSlug,
    approval: "approved",
    available: true,
    deletedAt: null,
  });

  if (!service) {
    throw ApiError.conflict(
      "This service is no longer available.",
      "SERVICE_UNAVAILABLE",
    );
  }

  if (!service.technicianId) {
    throw ApiError.conflict(
      "This service has no assigned technician.",
      "SERVICE_UNAVAILABLE",
    );
  }

  const activeBooking = await bookings.findOne({
    customerId,
    serviceId: service._id,
    status: { $in: ["requested", "accepted", "in-progress"] },
  });

  if (activeBooking) {
    throw ApiError.conflict(
      "You already have an active request for this service.",
      "DUPLICATE_ACTIVE_BOOKING",
    );
  }

  const now = new Date();
  const booking: BookingDocument = {
    _id: randomUUID(),
    bookingNumber: generateBookingNumber(),
    customerId,
    technicianId: service.technicianId,
    serviceId: service._id,
    serviceSlug: service.slug,
    serviceTitle: service.title,
    serviceImage: service.coverImage,
    category: service.category,
    mode: service.mode,
    basePrice: service.price,
    finalAmount: null,
    preferredDate: input.preferredDate,
    phone: input.phone,
    address: input.address,
    problem: input.problem,
    status: "requested",
    paymentStatus: "unpaid",
    statusHistory: [
      {
        status: "requested",
        at: now,
        by: customerId,
        note: "Booking requested",
      },
    ],
    createdAt: now,
    updatedAt: now,
  };

  let inserted = false;

  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      await bookings.insertOne(booking);
      inserted = true;
      break;
    } catch (error) {
      if (isDuplicateKey(error) && attempt < 2) {
        booking.bookingNumber = generateBookingNumber();
        continue;
      }

      throw error;
    }
  }

  if (!inserted) {
    throw new Error("Could not allocate a unique booking number.");
  }

  return toCustomerBooking(booking, service.technicianName, false);
}

export async function listCustomerBookings(
  customerId: string,
  options: ListBookingsOptions,
) {
  const filter = {
    customerId,
    ...(options.status ? { status: options.status } : {}),
  };

  const total = await bookings.countDocuments(filter);
  const totalPages = Math.max(1, Math.ceil(total / options.pageSize));
  const page = Math.min(options.page, totalPages);

  const docs = await bookings
    .find(filter)
    .sort({ createdAt: -1 })
    .skip((page - 1) * options.pageSize)
    .limit(options.pageSize)
    .toArray();

  const [names, reviewedIds] = await Promise.all([
    loadTechnicianNames(docs.map((booking) => booking.technicianId)),
    loadReviewedBookingIds(docs.map((booking) => booking._id)),
  ]);

  return {
    items: docs.map((booking) =>
      toCustomerBooking(
        booking,
        technicianNameFor(names, booking.technicianId),
        reviewedIds.has(booking._id),
      ),
    ),
    page,
    pageSize: options.pageSize,
    total,
    totalPages,
  };
}

export async function getBookingForUser(
  id: string,
  userId: string,
  role: AppRole,
): Promise<CustomerBookingDetailDto> {
  const booking = await bookings.findOne({ _id: id });

  if (!booking || (role !== "admin" && booking.customerId !== userId)) {
    throw ApiError.notFound("Booking not found.");
  }

  const [names, reviewed] = await Promise.all([
    loadTechnicianNames([booking.technicianId]),
    reviews.countDocuments({ bookingId: booking._id }, { limit: 1 }),
  ]);

  return toCustomerBookingDetail(
    booking,
    technicianNameFor(names, booking.technicianId),
    reviewed > 0,
  );
}

export async function cancelBooking(
  id: string,
  customerId: string,
): Promise<CustomerBookingDto> {
  const now = new Date();

  const updated = await bookings.findOneAndUpdate(
    { _id: id, customerId, status: "requested" },
    {
      $set: {
        status: "cancelled",
        cancelledAt: now,
        updatedAt: now,
      },
      $push: {
        statusHistory: {
          status: "cancelled" as const,
          at: now,
          by: customerId,
          note: "Cancelled by customer",
        },
      },
    },
    { returnDocument: "after" },
  );

  if (updated) {
    const [names, reviewed] = await Promise.all([
      loadTechnicianNames([updated.technicianId]),
      reviews.countDocuments({ bookingId: updated._id }, { limit: 1 }),
    ]);

    return toCustomerBooking(
      updated,
      technicianNameFor(names, updated.technicianId),
      reviewed > 0,
    );
  }

  const existing = await bookings.findOne({ _id: id, customerId });

  if (!existing) {
    throw ApiError.notFound("Booking not found.");
  }

  throw ApiError.conflict("This booking can no longer be cancelled.");
}

export async function getCustomerOverview(
  customerId: string,
): Promise<CustomerOverviewDto> {
  const [customerBookings, customerPayments] = await Promise.all([
    bookings.find({ customerId }).sort({ createdAt: -1 }).toArray(),
    payments.find({ customerId }).toArray(),
  ]);

  const paidPayments = customerPayments.filter(
    (payment) => payment.status === "paid",
  );
  const total = customerBookings.length;
  const activeCount = customerBookings.filter((booking) =>
    ACTIVE_STATUSES.has(booking.status),
  ).length;
  const completed = customerBookings.filter(
    (booking) => booking.status === "completed",
  ).length;
  const spent = paidPayments.reduce(
    (sum, payment) => sum + payment.amount,
    0,
  );

  const counts: Record<string, number> = { all: total };

  for (const status of STATUS_KEYS) {
    counts[status] = 0;
  }

  for (const booking of customerBookings) {
    counts[booking.status] = (counts[booking.status] ?? 0) + 1;
  }

  const active =
    customerBookings.find((booking) => booking.status === "in-progress") ??
    customerBookings.find((booking) => booking.status === "accepted") ??
    customerBookings.find((booking) => booking.status === "requested") ??
    null;

  const recentDocs = customerBookings.slice(0, 4);
  const technicianIds = [
    ...(active ? [active.technicianId] : []),
    ...recentDocs.map((booking) => booking.technicianId),
  ];
  const [names, reviewedIds] = await Promise.all([
    loadTechnicianNames(technicianIds),
    loadReviewedBookingIds(customerBookings.map((booking) => booking._id)),
  ]);

  return {
    stats: {
      total,
      active: activeCount,
      completed,
      spent,
      completionRate: total > 0 ? Math.round((completed / total) * 100) : 0,
      paymentCount: paidPayments.length,
    },
    counts,
    active: active
      ? toCustomerBooking(
          active,
          technicianNameFor(names, active.technicianId),
          reviewedIds.has(active._id),
        )
      : null,
    recent: recentDocs.map((booking) =>
      toCustomerBooking(
        booking,
        technicianNameFor(names, booking.technicianId),
        reviewedIds.has(booking._id),
      ),
    ),
    spend: buildSpendSeries(paidPayments),
  };
}
