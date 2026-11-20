import { randomInt, randomUUID } from "node:crypto";
import { ObjectId, type UpdateFilter } from "mongodb";
import {
  bookings,
  payments,
  services,
  technicianProfiles,
} from "../db/collections.js";
import { mongoDb } from "../db/mongo.js";
import { ApiError } from "../http/api-error.js";
import { buildSpendSeries } from "../lib/spend-series.js";
import type {
  ApprovalStatus,
  BookingDocument,
  BookingStatus,
  PaymentStatus,
  ServiceCategory,
  ServiceDocument,
  ServiceMode,
} from "../types/models.js";

export type TechnicianServiceDto = {
  id: string;
  serviceSlug: string;
  title: string;
  category: ServiceCategory;
  description: string;
  location: string;
  duration: string;
  price: number;
  mode: ServiceMode;
  approval: ApprovalStatus;
  rejectionReason?: string;
  available: boolean;
  rating: number;
  reviews: number;
  createdAt: string;
  updatedAt: string;
  includes: string[];
  warranty: string;
  availabilityNote: string;
  coverImage: string | null;
};

export type TechnicianRequestDto = {
  id: string;
  bookingNumber: string;
  serviceId: string;
  serviceSlug: string;
  serviceTitle: string;
  category: ServiceCategory;
  customer: string;
  phone: string | null;
  address: string | null;
  preferredDate: string;
  problem: string;
  status: BookingStatus;
  amount: number;
  basePrice: number;
  finalAmount: number | null;
  paymentStatus: PaymentStatus;
  createdAt: string;
  updatedAt: string;
};

export type TechnicianOverviewDto = {
  stats: {
    totalServices: number;
    approved: number;
    pendingServices: number;
    rejectedServices: number;
    availableServices: number;
    pendingRequests: number;
    totalRequests: number;
    completed: number;
    paidJobs: number;
    earnings: number;
    averageJob: number;
    rating: number;
  };
  pipeline: Record<string, number>;
  earnings: Array<{ label: string; value: number }>;
  topServices: TechnicianServiceDto[];
  latestRequest: TechnicianRequestDto | null;
  plan: "free" | "pro";
};

export type CreateTechnicianServiceInput = {
  title: string;
  category: ServiceCategory;
  description: string;
  location: string;
  duration: string;
  price: number;
  mode: ServiceMode;
  coverImage?: string | null;
  includes: string[];
  warranty: string;
  availabilityNote: string;
};

export type UpdateTechnicianServiceInput = Partial<
  Omit<CreateTechnicianServiceInput, "includes"> & { includes: string[] }
>;

export type ListTechnicianServicesOptions = {
  approval?: ApprovalStatus;
  available?: boolean;
  page: number;
  pageSize: number;
};

export type ListTechnicianRequestsOptions = {
  status?: BookingStatus;
  page: number;
  pageSize: number;
};

const DEFAULT_WARRANTY = "30 days on workmanship";
const DEFAULT_AVAILABILITY = "Contact for availability";
const PIPELINE_STATUSES: BookingStatus[] = [
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

function slugify(value: string) {
  return value
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-+/g, "-");
}

function normalizeCoverImage(value: string | null | undefined) {
  if (!value) return null;
  return /^https?:\/\//i.test(value) ? value : null;
}

function isDuplicateKey(error: unknown) {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as { code?: number }).code === 11000
  );
}

async function generateUniqueSlug(title: string) {
  const base = slugify(title).slice(0, 80) || "service";
  let candidate = base;
  let suffix = 2;

  while (
    await services.findOne({ slug: candidate }, { projection: { _id: 1 } })
  ) {
    candidate = `${base}-${suffix}`;
    suffix += 1;

    if (suffix > 50) {
      candidate = `${base}-${randomInt(1000, 9999)}`;
      break;
    }
  }

  return candidate;
}

function toTechnicianService(service: ServiceDocument): TechnicianServiceDto {
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
    approval: service.approval,
    ...(service.rejectionReason
      ? { rejectionReason: service.rejectionReason }
      : {}),
    available: service.available,
    rating: service.ratingAvg,
    reviews: service.reviewCount,
    createdAt: dateOnly(service.createdAt),
    updatedAt: dateOnly(service.updatedAt),
    includes: service.includes,
    warranty: service.warranty,
    availabilityNote: service.availabilityNote,
    coverImage: service.coverImage,
  };
}

async function loadCustomerNames(ids: string[]) {
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
        : "Customer",
    ]),
  );
}

function toTechnicianRequest(
  booking: BookingDocument,
  customer: string,
): TechnicianRequestDto {
  const revealContact = booking.status !== "requested";

  return {
    id: booking._id,
    bookingNumber: booking.bookingNumber,
    serviceId: booking.serviceId,
    serviceSlug: booking.serviceSlug,
    serviceTitle: booking.serviceTitle,
    category: booking.category,
    customer,
    phone: revealContact ? booking.phone : null,
    address: revealContact ? booking.address : null,
    preferredDate: booking.preferredDate,
    problem: booking.problem,
    status: booking.status,
    amount: booking.finalAmount ?? booking.basePrice,
    basePrice: booking.basePrice,
    finalAmount: booking.finalAmount,
    paymentStatus: booking.paymentStatus,
    createdAt: dateOnly(booking.createdAt),
    updatedAt: dateOnly(booking.updatedAt),
  };
}

async function toTechnicianRequestWithCustomer(booking: BookingDocument) {
  const names = await loadCustomerNames([booking.customerId]);

  return toTechnicianRequest(
    booking,
    names.get(booking.customerId) ?? "Customer",
  );
}

async function transitionFailure(
  id: string,
  technicianId: string,
  message: string,
): Promise<never> {
  const existing = await bookings.findOne({ _id: id, technicianId });

  if (!existing) {
    throw ApiError.notFound("Request not found.");
  }

  throw ApiError.conflict(message);
}

export async function listTechnicianServices(
  technicianId: string,
  options: ListTechnicianServicesOptions,
) {
  const filter = {
    technicianId,
    deletedAt: null,
    ...(options.approval ? { approval: options.approval } : {}),
    ...(options.available === undefined
      ? {}
      : { available: options.available }),
  };

  const total = await services.countDocuments(filter);
  const totalPages = Math.max(1, Math.ceil(total / options.pageSize));
  const page = Math.min(options.page, totalPages);

  const docs = await services
    .find(filter)
    .sort({ createdAt: -1 })
    .skip((page - 1) * options.pageSize)
    .limit(options.pageSize)
    .toArray();

  return {
    items: docs.map(toTechnicianService),
    page,
    pageSize: options.pageSize,
    total,
    totalPages,
  };
}

export async function getTechnicianService(
  id: string,
  technicianId: string,
) {
  const service = await services.findOne({
    _id: id,
    technicianId,
    deletedAt: null,
  });

  if (!service) {
    throw ApiError.notFound("Listing not found.");
  }

  return toTechnicianService(service);
}

export async function createTechnicianService(
  technicianId: string,
  technicianName: string,
  input: CreateTechnicianServiceInput,
) {
  const now = new Date();

  for (let attempt = 0; attempt < 3; attempt += 1) {
    const slug = await generateUniqueSlug(input.title);
    const service: ServiceDocument = {
      _id: randomUUID(),
      slug,
      technicianId,
      technicianName,
      title: input.title,
      category: input.category,
      description: input.description,
      location: input.location,
      duration: input.duration,
      price: input.price,
      mode: input.mode,
      coverImage: normalizeCoverImage(input.coverImage),
      includes: input.includes,
      warranty: input.warranty || DEFAULT_WARRANTY,
      availabilityNote: input.availabilityNote || DEFAULT_AVAILABILITY,
      approval: "pending",
      available: true,
      ratingAvg: 0,
      reviewCount: 0,
      createdAt: now,
      updatedAt: now,
      deletedAt: null,
    };

    try {
      await services.insertOne(service);
      return toTechnicianService(service);
    } catch (error) {
      if (isDuplicateKey(error) && attempt < 2) {
        continue;
      }

      throw error;
    }
  }

  throw new Error("Could not allocate a unique service slug.");
}

export async function updateTechnicianService(
  id: string,
  technicianId: string,
  input: UpdateTechnicianServiceInput,
) {
  const existing = await services.findOne({
    _id: id,
    technicianId,
    deletedAt: null,
  });

  if (!existing) {
    throw ApiError.notFound("Listing not found.");
  }

  const now = new Date();
  const set: Partial<ServiceDocument> = { updatedAt: now };
  const unset: Record<string, ""> = {};

  if (input.title !== undefined) set.title = input.title;
  if (input.category !== undefined) set.category = input.category;
  if (input.description !== undefined) set.description = input.description;
  if (input.location !== undefined) set.location = input.location;
  if (input.duration !== undefined) set.duration = input.duration;
  if (input.price !== undefined) set.price = input.price;
  if (input.mode !== undefined) set.mode = input.mode;
  if (input.includes !== undefined) set.includes = input.includes;
  if (input.warranty !== undefined) set.warranty = input.warranty;
  if (input.availabilityNote !== undefined) {
    set.availabilityNote = input.availabilityNote;
  }
  if (input.coverImage !== undefined) {
    set.coverImage = normalizeCoverImage(input.coverImage);
  }

  if (existing.approval === "approved" || existing.approval === "rejected") {
    set.approval = "pending";
    unset.rejectionReason = "";
    unset.approvedAt = "";
    unset.approvedBy = "";
  }

  const update: UpdateFilter<ServiceDocument> = { $set: set };

  if (Object.keys(unset).length > 0) {
    update.$unset = unset;
  }

  const updated = await services.findOneAndUpdate(
    { _id: id, technicianId, deletedAt: null },
    update,
    { returnDocument: "after" },
  );

  if (!updated) {
    throw ApiError.notFound("Listing not found.");
  }

  return toTechnicianService(updated);
}

export async function setTechnicianServiceAvailability(
  id: string,
  technicianId: string,
  available: boolean,
) {
  const updated = await services.findOneAndUpdate(
    { _id: id, technicianId, deletedAt: null },
    { $set: { available, updatedAt: new Date() } },
    { returnDocument: "after" },
  );

  if (!updated) {
    throw ApiError.notFound("Listing not found.");
  }

  return toTechnicianService(updated);
}

export async function deleteTechnicianService(
  id: string,
  technicianId: string,
) {
  const now = new Date();
  const updated = await services.findOneAndUpdate(
    { _id: id, technicianId, deletedAt: null },
    {
      $set: {
        deletedAt: now,
        available: false,
        updatedAt: now,
      },
    },
  );

  if (!updated) {
    throw ApiError.notFound("Listing not found.");
  }
}

export async function listTechnicianRequests(
  technicianId: string,
  options: ListTechnicianRequestsOptions,
) {
  const filter = {
    technicianId,
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

  const names = await loadCustomerNames(
    docs.map((booking) => booking.customerId),
  );

  return {
    items: docs.map((booking) =>
      toTechnicianRequest(
        booking,
        names.get(booking.customerId) ?? "Customer",
      ),
    ),
    page,
    pageSize: options.pageSize,
    total,
    totalPages,
  };
}

export async function getTechnicianRequest(
  id: string,
  technicianId: string,
) {
  const booking = await bookings.findOne({ _id: id, technicianId });

  if (!booking) {
    throw ApiError.notFound("Request not found.");
  }

  return toTechnicianRequestWithCustomer(booking);
}

export async function acceptTechnicianRequest(
  id: string,
  technicianId: string,
) {
  const now = new Date();
  const updated = await bookings.findOneAndUpdate(
    { _id: id, technicianId, status: "requested" },
    {
      $set: {
        status: "accepted",
        acceptedAt: now,
        updatedAt: now,
      },
      $push: {
        statusHistory: {
          status: "accepted" as const,
          at: now,
          by: technicianId,
          note: "Accepted by technician",
        },
      },
    },
    { returnDocument: "after" },
  );

  if (!updated) {
    return transitionFailure(
      id,
      technicianId,
      "This request can no longer be accepted.",
    );
  }

  return toTechnicianRequestWithCustomer(updated);
}

export async function rejectTechnicianRequest(
  id: string,
  technicianId: string,
  reason?: string,
) {
  const now = new Date();
  const updated = await bookings.findOneAndUpdate(
    { _id: id, technicianId, status: "requested" },
    {
      $set: {
        status: "rejected",
        rejectedAt: now,
        updatedAt: now,
      },
      $push: {
        statusHistory: {
          status: "rejected" as const,
          at: now,
          by: technicianId,
          note: reason?.trim() || "Rejected by technician",
        },
      },
    },
    { returnDocument: "after" },
  );

  if (!updated) {
    return transitionFailure(
      id,
      technicianId,
      "This request can no longer be rejected.",
    );
  }

  return toTechnicianRequestWithCustomer(updated);
}

export async function startTechnicianRequest(
  id: string,
  technicianId: string,
) {
  const now = new Date();
  const updated = await bookings.findOneAndUpdate(
    { _id: id, technicianId, status: "accepted" },
    {
      $set: {
        status: "in-progress",
        startedAt: now,
        updatedAt: now,
      },
      $push: {
        statusHistory: {
          status: "in-progress" as const,
          at: now,
          by: technicianId,
          note: "Work started",
        },
      },
    },
    { returnDocument: "after" },
  );

  if (!updated) {
    return transitionFailure(
      id,
      technicianId,
      "This request can no longer be started.",
    );
  }

  return toTechnicianRequestWithCustomer(updated);
}

export async function completeTechnicianRequest(
  id: string,
  technicianId: string,
  finalAmount: number,
) {
  if (!Number.isInteger(finalAmount) || finalAmount <= 0) {
    throw ApiError.validation(
      [],
      "Final amount must be a whole dollar amount greater than 0.",
    );
  }

  const now = new Date();
  const updated = await bookings.findOneAndUpdate(
    { _id: id, technicianId, status: "in-progress" },
    {
      $set: {
        status: "completed",
        finalAmount,
        completedAt: now,
        updatedAt: now,
      },
      $push: {
        statusHistory: {
          status: "completed" as const,
          at: now,
          by: technicianId,
          note: `Completed with final amount $${finalAmount}`,
        },
      },
    },
    { returnDocument: "after" },
  );

  if (!updated) {
    return transitionFailure(
      id,
      technicianId,
      "This request can no longer be completed.",
    );
  }

  return toTechnicianRequestWithCustomer(updated);
}

export async function getTechnicianOverview(
  technicianId: string,
): Promise<TechnicianOverviewDto> {
  const [technicianServices, technicianBookings, paidPaymentDocs, profile] =
    await Promise.all([
      services.find({ technicianId, deletedAt: null }).toArray(),
      bookings.find({ technicianId }).sort({ createdAt: -1 }).toArray(),
      payments.find({ technicianId, status: "paid" }).toArray(),
      technicianProfiles.findOne({ userId: technicianId }),
    ]);

  const approvedServices = technicianServices.filter(
    (service) => service.approval === "approved",
  );
  const completedBookings = technicianBookings.filter(
    (booking) => booking.status === "completed",
  );
  const totalEarnings = paidPaymentDocs.reduce(
    (sum, payment) => sum + payment.amount,
    0,
  );
  const averageJob =
    completedBookings.length > 0
      ? Math.round(
          completedBookings.reduce(
            (sum, booking) =>
              sum + (booking.finalAmount ?? booking.basePrice),
            0,
          ) / completedBookings.length,
        )
      : 0;

  const pipeline: Record<string, number> = {};

  for (const status of PIPELINE_STATUSES) {
    pipeline[status] = 0;
  }

  for (const booking of technicianBookings) {
    pipeline[booking.status] = (pipeline[booking.status] ?? 0) + 1;
  }

  const latestRequestDoc =
    technicianBookings.find((booking) => booking.status === "requested") ??
    null;

  const latestRequest = latestRequestDoc
    ? await toTechnicianRequestWithCustomer(latestRequestDoc)
    : null;

  const topServices = approvedServices
    .slice()
    .sort(
      (a, b) =>
        b.ratingAvg - a.ratingAvg || b.reviewCount - a.reviewCount,
    )
    .slice(0, 3)
    .map(toTechnicianService);

  return {
    stats: {
      totalServices: technicianServices.length,
      approved: approvedServices.length,
      pendingServices: technicianServices.filter(
        (service) => service.approval === "pending",
      ).length,
      rejectedServices: technicianServices.filter(
        (service) => service.approval === "rejected",
      ).length,
      availableServices: technicianServices.filter(
        (service) => service.available,
      ).length,
      pendingRequests: pipeline.requested ?? 0,
      totalRequests: technicianBookings.length,
      completed: completedBookings.length,
      paidJobs: paidPaymentDocs.length,
      earnings: totalEarnings,
      averageJob,
      rating: profile?.ratingAvg ?? 0,
    },
    pipeline,
    earnings: buildSpendSeries(paidPaymentDocs),
    topServices,
    latestRequest,
    plan: profile?.plan ?? "free",
  };
}
