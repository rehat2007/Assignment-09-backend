import { randomUUID } from "node:crypto";
import type { IncomingHttpHeaders } from "node:http";
import { ObjectId, type Filter } from "mongodb";
import { fromNodeHeaders } from "better-auth/node";
import { auth } from "../auth.js";
import {
  auditLogs,
  bookings,
  payments,
  services,
  technicianProfiles,
} from "../db/collections.js";
import { mongoDb } from "../db/mongo.js";
import { ApiError } from "../http/api-error.js";
import { buildSpendSeries } from "../lib/spend-series.js";
import { logger } from "../lib/logger.js";
import { getAppRole, type AppRole } from "../roles.js";
import type {
  BookingDocument,
  BookingStatus,
  PaymentStatus,
  ServiceCategory,
  ServiceDocument,
  ServiceMode,
} from "../types/models.js";

export type AdminActor = {
  id: string;
  email: string;
};

export type AdminUserDto = {
  id: string;
  name: string;
  email: string;
  role: AppRole;
  accountType: string;
  phone: string;
  area: string;
  bio: string;
  joined: string;
  plan: "free" | "pro";
  rating?: number;
  jobs?: number;
  banned: boolean;
  banReason?: string;
  emailVerified: boolean;
  image: string | null;
};

export type AdminServiceDto = {
  id: string;
  serviceSlug: string;
  title: string;
  category: ServiceCategory;
  description: string;
  location: string;
  duration: string;
  price: number;
  mode: ServiceMode;
  technician: string;
  technicianArea: string;
  approval: "pending" | "approved" | "rejected";
  rejectionReason?: string;
  available: boolean;
  createdAt: string;
  updatedAt: string;
  rating: number;
  reviews: number;
  includes: string[];
  warranty: string;
  availabilityNote: string;
  coverImage: string | null;
};

export type AdminBookingDto = {
  id: string;
  bookingNumber: string;
  serviceId: string;
  serviceSlug: string;
  title: string;
  category: ServiceCategory;
  customer: string;
  customerEmail: string;
  technician: string;
  preferredDate: string;
  status: BookingStatus;
  paymentStatus: PaymentStatus;
  basePrice: number;
  finalAmount: number | null;
  createdAt: string;
  phone: string;
  address: string;
  problem: string;
};

export type AdminBookingDetailDto = AdminBookingDto & {
  statusHistory: Array<{
    status: BookingStatus;
    at: string;
    by: string;
    note?: string;
  }>;
};

export type AdminPaymentDto = {
  id: string;
  bookingId: string;
  bookingNumber: string;
  title: string;
  customer: string;
  customerEmail: string;
  technician: string;
  amount: number;
  paidAt: string;
  transactionId: string;
};

export type AdminOverviewDto = {
  stats: {
    totalUsers: number;
    technicians: number;
    proTechnicians: number;
    customers: number;
    admins: number;
    pendingServices: number;
    revenue: number;
    avgTransaction: number;
    thisMonth: number;
    thisMonthCount: number;
    payments: number;
    techniciansPaid: number;
    newUsers: number;
    listings: number;
    pipelineValue: number;
  };
  revenueSeries: Array<{ label: string; value: number }>;
  roleSummary: Array<{ label: string; value: number; color: string }>;
  categoryJobs: Array<{ label: string; value: number }>;
  pendingServices: AdminServiceDto[];
  recentPayments: AdminPaymentDto[];
  bookingCounts: Record<string, number>;
};

type UserDocument = {
  _id: string | ObjectId;
  name?: string;
  email?: string;
  role?: string | null;
  accountType?: string | null;
  phone?: string | null;
  area?: string | null;
  bio?: string | null;
  image?: string | null;
  banned?: boolean | null;
  banReason?: string | null;
  emailVerified?: boolean | null;
  createdAt?: Date | string;
  updatedAt?: Date | string;
};

type TechnicianInfo = {
  name?: string;
  area?: string;
};

function dateOnly(value: Date | string | undefined) {
  if (!value) return new Date().toISOString().slice(0, 10);
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime())
    ? new Date().toISOString().slice(0, 10)
    : date.toISOString().slice(0, 10);
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function userObjectId(id: string) {
  return ObjectId.isValid(id) ? new ObjectId(id) : null;
}

function appRoleFor(user: UserDocument): AppRole {
  return getAppRole({
    role: typeof user.role === "string" ? user.role : null,
    accountType: typeof user.accountType === "string" ? user.accountType : null,
  });
}

function stringValue(value: unknown, fallback = "") {
  return typeof value === "string" ? value : fallback;
}

function toAdminUser(
  user: UserDocument,
  profile?: {
    plan?: "free" | "pro";
    ratingAvg?: number;
    jobsCompleted?: number;
  },
): AdminUserDto {
  const role = appRoleFor(user);

  return {
    id: String(user._id),
    name: stringValue(user.name, "Unnamed user"),
    email: stringValue(user.email),
    role,
    accountType:
      typeof user.accountType === "string" ? user.accountType : "customer",
    phone: stringValue(user.phone),
    area: stringValue(user.area),
    bio: stringValue(user.bio),
    joined: dateOnly(user.createdAt),
    plan: profile?.plan ?? "free",
    ...(role === "technician" && profile
      ? { rating: profile.ratingAvg ?? 0, jobs: profile.jobsCompleted ?? 0 }
      : {}),
    banned: Boolean(user.banned),
    ...(typeof user.banReason === "string" && user.banReason
      ? { banReason: user.banReason }
      : {}),
    emailVerified: Boolean(user.emailVerified),
    image: typeof user.image === "string" ? user.image : null,
  };
}

async function loadProfiles(userIds: string[]) {
  if (userIds.length === 0) return new Map<string, TechnicianInfo & {
    plan?: "free" | "pro";
    ratingAvg?: number;
    jobsCompleted?: number;
  }>();

  const profiles = await technicianProfiles
    .find({ userId: { $in: userIds } })
    .toArray();

  return new Map(
    profiles.map((profile) => [
      profile.userId,
      {
        plan: profile.plan,
        ratingAvg: profile.ratingAvg,
        jobsCompleted: profile.jobsCompleted,
      },
    ]),
  );
}

async function loadTechnicianInfo(ids: string[]) {
  const objectIds = [...new Set(ids)]
    .filter((id) => ObjectId.isValid(id))
    .map((id) => new ObjectId(id));

  if (objectIds.length === 0) {
    return new Map<string, TechnicianInfo>();
  }

  const users = await mongoDb
    .collection<UserDocument>("user")
    .find({ _id: { $in: objectIds } })
    .project({ name: 1, area: 1 })
    .toArray();

  return new Map(
    users.map((user) => [
      String(user._id),
      {
        name: stringValue(user.name),
        area: stringValue(user.area),
      },
    ]),
  );
}

async function loadUserSummaries(ids: string[]) {
  const objectIds = [...new Set(ids)]
    .filter((id) => ObjectId.isValid(id))
    .map((id) => new ObjectId(id));

  if (objectIds.length === 0) {
    return new Map<string, { name: string; email: string }>();
  }

  const users = await mongoDb
    .collection<UserDocument>("user")
    .find({ _id: { $in: objectIds } })
    .project({ name: 1, email: 1 })
    .toArray();

  return new Map(
    users.map((user) => [
      String(user._id),
      {
        name: stringValue(user.name, "Customer"),
        email: stringValue(user.email),
      },
    ]),
  );
}

function toAdminService(
  service: ServiceDocument,
  technician: TechnicianInfo | undefined,
): AdminServiceDto {
  return {
    id: service._id,
    serviceSlug: service.slug,
    title: service.title,
    category: service.category,
    description: service.description,
    location: service.location,
    duration: service.duration,
    price: service.price,
    mode: service.mode,
    technician: service.technicianName,
    technicianArea: technician?.area || service.location,
    approval: service.approval,
    ...(service.rejectionReason
      ? { rejectionReason: service.rejectionReason }
      : {}),
    available: service.available,
    createdAt: dateOnly(service.createdAt),
    updatedAt: dateOnly(service.updatedAt),
    rating: service.ratingAvg,
    reviews: service.reviewCount,
    includes: service.includes,
    warranty: service.warranty,
    availabilityNote: service.availabilityNote,
    coverImage: service.coverImage,
  };
}

function toAdminBooking(
  booking: BookingDocument,
  customer: { name: string; email: string } | undefined,
  technician: string,
): AdminBookingDto {
  return {
    id: booking._id,
    bookingNumber: booking.bookingNumber,
    serviceId: booking.serviceId,
    serviceSlug: booking.serviceSlug,
    title: booking.serviceTitle,
    category: booking.category,
    customer: customer?.name ?? "Customer",
    customerEmail: customer?.email ?? "",
    technician,
    preferredDate: booking.preferredDate,
    status: booking.status,
    paymentStatus: booking.paymentStatus,
    basePrice: booking.basePrice,
    finalAmount: booking.finalAmount,
    createdAt: dateOnly(booking.createdAt),
    phone: booking.phone,
    address: booking.address,
    problem: booking.problem,
  };
}

function toAdminPayment(
  payment: {
    _id: string;
    bookingId: string;
    customerId: string;
    technicianId: string;
    amount: number;
    paidAt: Date;
    transactionId: string;
  },
  booking: BookingDocument | undefined,
  customer: { name: string; email: string } | undefined,
  technician: { name: string } | undefined,
): AdminPaymentDto {
  return {
    id: payment._id,
    bookingId: payment.bookingId,
    bookingNumber: booking?.bookingNumber ?? payment.bookingId,
    title: booking?.serviceTitle ?? "Service",
    customer: customer?.name ?? "Customer",
    customerEmail: customer?.email ?? "",
    technician: technician?.name ?? "FixMate technician",
    amount: payment.amount,
    paidAt: dateOnly(payment.paidAt),
    transactionId: payment.transactionId,
  };
}

async function writeAuditLog(
  actor: AdminActor,
  action: string,
  targetType: "user" | "service" | "booking" | "payment",
  targetId: string,
  metadata: Record<string, unknown> = {},
) {
  try {
    await auditLogs.insertOne({
      _id: randomUUID(),
      action,
      actorId: actor.id,
      actorEmail: actor.email,
      targetType,
      targetId,
      metadata,
      createdAt: new Date(),
    });
  } catch (error) {
    logger.warn("audit_log_failed", {
      action,
      targetId,
      error: error instanceof Error ? error.message : String(error),
    });
  }
}

export async function listAdminUsers(options: {
  q?: string;
  role?: AppRole;
  page: number;
  pageSize: number;
}) {
  const users = mongoDb.collection<UserDocument>("user");
  const filter: Filter<UserDocument> = {};
  const adminRolePattern = /(^|,\s*)admin(,|$)/;

  if (options.q) {
    const pattern = escapeRegExp(options.q);
    filter.$or = [
      { name: { $regex: pattern, $options: "i" } },
      { email: { $regex: pattern, $options: "i" } },
      { phone: { $regex: pattern, $options: "i" } },
      { area: { $regex: pattern, $options: "i" } },
    ];
  }

  if (options.role === "admin") {
    filter.role = adminRolePattern;
  } else if (options.role === "technician") {
    filter.accountType = "technician";
    filter.role = { $not: adminRolePattern };
  } else if (options.role === "customer") {
    filter.accountType = { $ne: "technician" };
    filter.role = { $not: adminRolePattern };
  }

  const total = await users.countDocuments(filter);
  const totalPages = Math.max(1, Math.ceil(total / options.pageSize));
  const page = Math.min(options.page, totalPages);

  const docs = await users
    .find(filter)
    .sort({ createdAt: -1 })
    .skip((page - 1) * options.pageSize)
    .limit(options.pageSize)
    .toArray();

  const profiles = await loadProfiles(docs.map((user) => String(user._id)));

  return {
    items: docs.map((user) =>
      toAdminUser(user, profiles.get(String(user._id))),
    ),
    page,
    pageSize: options.pageSize,
    total,
    totalPages,
  };
}

export async function getAdminUser(id: string): Promise<AdminUserDto> {
  const objectId = userObjectId(id);

  if (!objectId) {
    throw ApiError.notFound("User not found.");
  }

  const user = await mongoDb
    .collection<UserDocument>("user")
    .findOne({ _id: objectId });

  if (!user) {
    throw ApiError.notFound("User not found.");
  }

  const profile = await technicianProfiles.findOne({
    userId: String(user._id),
  });

  return toAdminUser(user, profile ?? undefined);
}

export async function changeAdminUserRole(
  actor: AdminActor,
  targetId: string,
  role: "customer" | "technician",
): Promise<AdminUserDto> {
  const objectId = userObjectId(targetId);

  if (!objectId) {
    throw ApiError.notFound("User not found.");
  }

  const users = mongoDb.collection<UserDocument>("user");
  const target = await users.findOne({ _id: objectId });

  if (!target) {
    throw ApiError.notFound("User not found.");
  }

  if (String(target._id) === actor.id) {
    throw ApiError.conflict(
      "You cannot change your own role.",
      "CANNOT_CHANGE_OWN_ROLE",
    );
  }

  const previousRole = appRoleFor(target);
  const nextRole = role === "technician" ? "technician" : "user";

  await users.updateOne(
    { _id: objectId },
    {
      $set: {
        role: nextRole,
        accountType: role,
        updatedAt: new Date(),
      },
    },
  );

  await writeAuditLog(actor, "user.role_changed", "user", targetId, {
    from: previousRole,
    to: role,
  });

  return getAdminUser(targetId);
}

export async function suspendAdminUser(
  actor: AdminActor,
  targetId: string,
  reason: string | undefined,
  headers: IncomingHttpHeaders,
): Promise<AdminUserDto> {
  const objectId = userObjectId(targetId);

  if (!objectId) {
    throw ApiError.notFound("User not found.");
  }

  const users = mongoDb.collection<UserDocument>("user");
  const target = await users.findOne({ _id: objectId });

  if (!target) {
    throw ApiError.notFound("User not found.");
  }

  if (String(target._id) === actor.id) {
    throw ApiError.conflict(
      "You cannot suspend your own account.",
      "CANNOT_SUSPEND_SELF",
    );
  }

  if (appRoleFor(target) === "admin") {
    throw ApiError.conflict(
      "Admin accounts cannot be suspended here.",
      "CANNOT_SUSPEND_ADMIN",
    );
  }

  try {
    await auth.api.banUser({
      body: {
        userId: targetId,
        ...(reason ? { banReason: reason } : {}),
      },
      headers: fromNodeHeaders(headers),
    });
  } catch (error) {
    throw ApiError.badRequest(
      error instanceof Error ? error.message : "Could not suspend this user.",
      "SUSPEND_FAILED",
    );
  }

  await writeAuditLog(actor, "user.suspended", "user", targetId, {
    ...(reason ? { reason } : {}),
  });

  return getAdminUser(targetId);
}

export async function restoreAdminUser(
  actor: AdminActor,
  targetId: string,
  headers: IncomingHttpHeaders,
): Promise<AdminUserDto> {
  const objectId = userObjectId(targetId);

  if (!objectId) {
    throw ApiError.notFound("User not found.");
  }

  const users = mongoDb.collection<UserDocument>("user");
  const target = await users.findOne({ _id: objectId });

  if (!target) {
    throw ApiError.notFound("User not found.");
  }

  try {
    await auth.api.unbanUser({
      body: { userId: targetId },
      headers: fromNodeHeaders(headers),
    });
  } catch (error) {
    throw ApiError.badRequest(
      error instanceof Error ? error.message : "Could not restore this user.",
      "RESTORE_FAILED",
    );
  }

  await writeAuditLog(actor, "user.restored", "user", targetId);

  return getAdminUser(targetId);
}

export async function listAdminServices(options: {
  q?: string;
  category?: ServiceCategory;
  approval?: "pending" | "approved" | "rejected";
  available?: boolean;
  page: number;
  pageSize: number;
}) {
  const filter: Filter<ServiceDocument> = { deletedAt: null };

  if (options.category) filter.category = options.category;
  if (options.approval) filter.approval = options.approval;
  if (options.available !== undefined) filter.available = options.available;

  if (options.q) {
    const pattern = escapeRegExp(options.q);
    filter.$or = [
      { title: { $regex: pattern, $options: "i" } },
      { technicianName: { $regex: pattern, $options: "i" } },
      { category: { $regex: pattern, $options: "i" } },
      { location: { $regex: pattern, $options: "i" } },
    ];
  }

  const total = await services.countDocuments(filter);
  const totalPages = Math.max(1, Math.ceil(total / options.pageSize));
  const page = Math.min(options.page, totalPages);

  const docs = await services
    .find(filter)
    .sort({ createdAt: -1 })
    .skip((page - 1) * options.pageSize)
    .limit(options.pageSize)
    .toArray();

  const technicianInfo = await loadTechnicianInfo(
    docs.map((service) => service.technicianId),
  );

  return {
    items: docs.map((service) =>
      toAdminService(service, technicianInfo.get(service.technicianId)),
    ),
    page,
    pageSize: options.pageSize,
    total,
    totalPages,
  };
}

export async function getAdminService(
  id: string,
): Promise<AdminServiceDto> {
  const service = await services.findOne({ _id: id, deletedAt: null });

  if (!service) {
    throw ApiError.notFound("Listing not found.");
  }

  const technicianInfo = await loadTechnicianInfo([service.technicianId]);

  return toAdminService(service, technicianInfo.get(service.technicianId));
}

async function serviceTransitionFailure(
  id: string,
  message: string,
): Promise<never> {
  const existing = await services.findOne({ _id: id, deletedAt: null });

  if (!existing) {
    throw ApiError.notFound("Listing not found.");
  }

  throw ApiError.conflict(message);
}

export async function approveAdminService(
  actor: AdminActor,
  id: string,
): Promise<AdminServiceDto> {
  const now = new Date();
  const updated = await services.findOneAndUpdate(
    { _id: id, approval: "pending", deletedAt: null },
    {
      $set: {
        approval: "approved",
        available: true,
        approvedAt: now,
        approvedBy: actor.id,
        updatedAt: now,
      },
      $unset: { rejectionReason: "" },
    },
    { returnDocument: "after" },
  );

  if (!updated) {
    return serviceTransitionFailure(
      id,
      "This listing is not pending review.",
    );
  }

  await writeAuditLog(actor, "service.approved", "service", id);

  const technicianInfo = await loadTechnicianInfo([updated.technicianId]);

  return toAdminService(
    updated,
    technicianInfo.get(updated.technicianId),
  );
}

export async function rejectAdminService(
  actor: AdminActor,
  id: string,
  reason: string,
): Promise<AdminServiceDto> {
  const now = new Date();
  const updated = await services.findOneAndUpdate(
    { _id: id, approval: "pending", deletedAt: null },
    {
      $set: {
        approval: "rejected",
        rejectionReason: reason,
        updatedAt: now,
      },
      $unset: {
        approvedAt: "",
        approvedBy: "",
      },
    },
    { returnDocument: "after" },
  );

  if (!updated) {
    return serviceTransitionFailure(
      id,
      "This listing is not pending review.",
    );
  }

  await writeAuditLog(actor, "service.rejected", "service", id, {
    reason,
  });

  const technicianInfo = await loadTechnicianInfo([updated.technicianId]);

  return toAdminService(
    updated,
    technicianInfo.get(updated.technicianId),
  );
}

export async function listAdminBookings(options: {
  q?: string;
  status?: BookingStatus;
  paymentStatus?: PaymentStatus;
  page: number;
  pageSize: number;
}) {
  const filter: Filter<BookingDocument> = {};

  if (options.status) filter.status = options.status;
  if (options.paymentStatus) filter.paymentStatus = options.paymentStatus;

  if (options.q) {
    const pattern = escapeRegExp(options.q);
    filter.$or = [
      { serviceTitle: { $regex: pattern, $options: "i" } },
      { bookingNumber: { $regex: pattern, $options: "i" } },
      { serviceSlug: { $regex: pattern, $options: "i" } },
    ];
  }

  const total = await bookings.countDocuments(filter);
  const totalPages = Math.max(1, Math.ceil(total / options.pageSize));
  const page = Math.min(options.page, totalPages);

  const docs = await bookings
    .find(filter)
    .sort({ createdAt: -1 })
    .skip((page - 1) * options.pageSize)
    .limit(options.pageSize)
    .toArray();

  const customers = await loadUserSummaries(
    docs.map((booking) => booking.customerId),
  );
  const technicians = await loadUserSummaries(
    docs.map((booking) => booking.technicianId),
  );

  return {
    items: docs.map((booking) =>
      toAdminBooking(
        booking,
        customers.get(booking.customerId),
        technicians.get(booking.technicianId)?.name ?? "FixMate technician",
      ),
    ),
    page,
    pageSize: options.pageSize,
    total,
    totalPages,
  };
}

export async function getAdminBooking(
  id: string,
): Promise<AdminBookingDetailDto> {
  const booking = await bookings.findOne({ _id: id });

  if (!booking) {
    throw ApiError.notFound("Booking not found.");
  }

  const customers = await loadUserSummaries([booking.customerId]);
  const technicians = await loadUserSummaries([booking.technicianId]);

  return {
    ...toAdminBooking(
      booking,
      customers.get(booking.customerId),
      technicians.get(booking.technicianId)?.name ?? "FixMate technician",
    ),
    statusHistory: booking.statusHistory.map((entry) => ({
      status: entry.status,
      at: entry.at.toISOString(),
      by: entry.by,
      ...(entry.note ? { note: entry.note } : {}),
    })),
  };
}

export async function listAdminPayments(
  page: number,
  pageSize: number,
) {
  const filter = { status: "paid" as const };
  const total = await payments.countDocuments(filter);
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const currentPage = Math.min(page, totalPages);

  const docs = await payments
    .find(filter)
    .sort({ paidAt: -1 })
    .skip((currentPage - 1) * pageSize)
    .limit(pageSize)
    .toArray();

  const bookingIds = [...new Set(docs.map((payment) => payment.bookingId))];
  const bookingDocs =
    bookingIds.length > 0
      ? await bookings.find({ _id: { $in: bookingIds } }).toArray()
      : [];
  const bookingById = new Map(
    bookingDocs.map((booking) => [booking._id, booking]),
  );
  const customers = await loadUserSummaries(
    docs.map((payment) => payment.customerId),
  );
  const technicians = await loadUserSummaries(
    docs.map((payment) => payment.technicianId),
  );

  return {
    items: docs.map((payment) =>
      toAdminPayment(
        payment,
        bookingById.get(payment.bookingId),
        customers.get(payment.customerId),
        technicians.get(payment.technicianId),
      ),
    ),
    page: currentPage,
    pageSize,
    total,
    totalPages,
  };
}

export async function getAdminPayment(
  id: string,
): Promise<AdminPaymentDto> {
  const payment = await payments.findOne({ _id: id });

  if (!payment) {
    throw ApiError.notFound("Payment not found.");
  }

  const [booking, customers, technicians] = await Promise.all([
    bookings.findOne({ _id: payment.bookingId }),
    loadUserSummaries([payment.customerId]),
    loadUserSummaries([payment.technicianId]),
  ]);

  return toAdminPayment(
    payment,
    booking ?? undefined,
    customers.get(payment.customerId),
    technicians.get(payment.technicianId),
  );
}

export async function getAdminOverview(): Promise<AdminOverviewDto> {
  const [users, allServices, allBookings, allPayments, profiles] =
    await Promise.all([
      mongoDb.collection<UserDocument>("user").find().toArray(),
      services.find({ deletedAt: null }).toArray(),
      bookings.find().toArray(),
      payments.find({ status: "paid" }).toArray(),
      technicianProfiles.find().toArray(),
    ]);

  const now = new Date();
  const roleSummary = { customer: 0, technician: 0, admin: 0 };

  for (const user of users) {
    roleSummary[appRoleFor(user)] += 1;
  }

  const paidPayments = allPayments;
  const revenue = paidPayments.reduce(
    (sum, payment) => sum + payment.amount,
    0,
  );
  const thisMonthPayments = paidPayments.filter(
    (payment) =>
      payment.paidAt.getFullYear() === now.getFullYear() &&
      payment.paidAt.getMonth() === now.getMonth(),
  );
  const thisMonth = thisMonthPayments.reduce(
    (sum, payment) => sum + payment.amount,
    0,
  );
  const pendingServices = allServices.filter(
    (service) => service.approval === "pending",
  );
  const categoryCounts = new Map<string, number>();
  const bookingCounts: Record<string, number> = { all: allBookings.length };

  for (const status of [
    "requested",
    "accepted",
    "in-progress",
    "completed",
    "cancelled",
    "rejected",
  ] as BookingStatus[]) {
    bookingCounts[status] = 0;
  }

  for (const booking of allBookings) {
    bookingCounts[booking.status] =
      (bookingCounts[booking.status] ?? 0) + 1;
    categoryCounts.set(
      booking.category,
      (categoryCounts.get(booking.category) ?? 0) + 1,
    );
  }

  const technicianInfo = await loadTechnicianInfo(
    pendingServices.map((service) => service.technicianId),
  );

  const recentPaymentDocs = paidPayments
    .slice()
    .sort((a, b) => b.paidAt.getTime() - a.paidAt.getTime())
    .slice(0, 5);
  const bookingById = new Map(
    allBookings.map((booking) => [booking._id, booking]),
  );
  const customers = await loadUserSummaries(
    recentPaymentDocs.map((payment) => payment.customerId),
  );
  const technicians = await loadUserSummaries(
    recentPaymentDocs.map((payment) => payment.technicianId),
  );

  return {
    stats: {
      totalUsers: users.length,
      technicians: roleSummary.technician,
      proTechnicians: profiles.filter((profile) => profile.plan === "pro")
        .length,
      customers: roleSummary.customer,
      admins: roleSummary.admin,
      pendingServices: pendingServices.length,
      revenue,
      avgTransaction:
        paidPayments.length > 0
          ? Math.round(revenue / paidPayments.length)
          : 0,
      thisMonth,
      thisMonthCount: thisMonthPayments.length,
      payments: paidPayments.length,
      techniciansPaid: new Set(
        paidPayments.map((payment) => payment.technicianId),
      ).size,
      newUsers: users.filter((user) => {
        if (!user.createdAt) return false;
        const date =
          user.createdAt instanceof Date
            ? user.createdAt
            : new Date(user.createdAt);
        return (
          !Number.isNaN(date.getTime()) &&
          date.getFullYear() === now.getFullYear() &&
          date.getMonth() === now.getMonth()
        );
      }).length,
      listings: allServices.length,
      pipelineValue: allBookings.reduce(
        (sum, booking) =>
          sum + (booking.finalAmount ?? booking.basePrice),
        0,
      ),
    },
    revenueSeries: buildSpendSeries(paidPayments),
    roleSummary: [
      { label: "Customers", value: roleSummary.customer, color: "#7c8cf8" },
      {
        label: "Technicians",
        value: roleSummary.technician,
        color: "#3ddc97",
      },
      { label: "Admins", value: roleSummary.admin, color: "#f0bb6a" },
    ],
    categoryJobs: [...categoryCounts.entries()]
      .map(([label, value]) => ({ label, value }))
      .sort((a, b) => b.value - a.value),
    pendingServices: pendingServices
      .slice()
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      .map((service) =>
        toAdminService(service, technicianInfo.get(service.technicianId)),
      ),
    recentPayments: recentPaymentDocs.map((payment) =>
      toAdminPayment(
        payment,
        bookingById.get(payment.bookingId),
        customers.get(payment.customerId),
        technicians.get(payment.technicianId),
      ),
    ),
    bookingCounts,
  };
}
