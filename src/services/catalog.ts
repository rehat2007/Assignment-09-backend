import { ObjectId, type Filter, type Sort } from "mongodb";
import { mongoDb } from "../db/mongo.js";
import { reviews, services, technicianProfiles } from "../db/collections.js";
import { PAGE_SIZES } from "../http/response.js";
import {
  SERVICE_CATEGORIES,
  SERVICE_MODES,
  type Plan,
  type ServiceCategory,
  type ServiceDocument,
  type ServiceMode,
} from "../types/models.js";

export type ServiceSort = "newest" | "price-asc" | "price-desc" | "rating";

export type ServiceSummaryDto = {
  id: string;
  title: string;
  category: ServiceCategory;
  description: string;
  location: string;
  duration: string;
  rating: number;
  reviews: number;
  technician: string;
  price: number;
  mode: ServiceMode;
  createdAt: string;
  coverImage: string | null;
};

export type TechnicianProfileDto = {
  id: string;
  name: string;
  bio: string;
  area: string;
  rating: number;
  jobs: number;
  plan: Plan;
  repliesIn: string;
  image: string | null;
};

export type ServiceDetailDto = ServiceSummaryDto & {
  includes: string[];
  warranty: string;
  availabilityNote: string;
  technicianProfile: TechnicianProfileDto;
};

export type ServiceReviewDto = {
  id: string;
  name: string;
  rating: number;
  text: string;
  at: string;
};

export type CategoryCount = {
  name: ServiceCategory;
  count: number;
};

export type CatalogMetaDto = {
  categories: CategoryCount[];
  modes: ServiceMode[];
  pageSize: number;
  maxPageSize: number;
  stats: {
    services: number;
    technicians: number;
  };
  flags: {
    publicCatalog: boolean;
    reviews: boolean;
  };
};

export type ListServicesOptions = {
  q?: string;
  category?: ServiceCategory;
  mode?: ServiceMode;
  sort: ServiceSort;
  page: number;
  pageSize: number;
};

export type ListServicesResult = {
  items: ServiceSummaryDto[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
};

export type ListReviewsResult = {
  items: ServiceReviewDto[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
};

const PUBLIC_SERVICE_FILTER: Filter<ServiceDocument> = {
  approval: "approved",
  available: true,
  deletedAt: null,
};

const SORT_MAP: Record<ServiceSort, Sort> = {
  newest: { createdAt: -1 },
  "price-asc": { price: 1 },
  "price-desc": { price: -1 },
  rating: { ratingAvg: -1, reviewCount: -1 },
};

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function dateOnly(value: Date) {
  return value.toISOString().slice(0, 10);
}

function stringOr(value: unknown, fallback: string) {
  return typeof value === "string" && value.trim() ? value : fallback;
}

function stringOrNull(value: unknown) {
  return typeof value === "string" && value.trim() ? value : null;
}

function toServiceSummary(service: ServiceDocument): ServiceSummaryDto {
  return {
    id: service.slug,
    title: service.title,
    category: service.category,
    description: service.description,
    location: service.location,
    duration: service.duration,
    rating: service.ratingAvg,
    reviews: service.reviewCount,
    technician: service.technicianName,
    price: service.price,
    mode: service.mode,
    createdAt: dateOnly(service.createdAt),
    coverImage: service.coverImage,
  };
}

export async function getCatalogMeta(): Promise<CatalogMetaDto> {
  const [categoryCounts, serviceCount, technicianIds] = await Promise.all([
    services
      .aggregate<{ _id: ServiceCategory; count: number }>([
        { $match: PUBLIC_SERVICE_FILTER },
        { $group: { _id: "$category", count: { $sum: 1 } } },
      ])
      .toArray(),
    services.countDocuments(PUBLIC_SERVICE_FILTER),
    services.distinct("technicianId", PUBLIC_SERVICE_FILTER),
  ]);

  const countsByName = new Map(
    categoryCounts.map((row) => [row._id, row.count]),
  );

  return {
    categories: SERVICE_CATEGORIES.map((name) => ({
      name,
      count: countsByName.get(name) ?? 0,
    })),
    modes: [...SERVICE_MODES],
    pageSize: PAGE_SIZES.public,
    maxPageSize: PAGE_SIZES.max,
    stats: {
      services: serviceCount,
      technicians: technicianIds.length,
    },
    flags: {
      publicCatalog: true,
      reviews: true,
    },
  };
}

export async function listServices(
  options: ListServicesOptions,
): Promise<ListServicesResult> {
  const filter: Filter<ServiceDocument> = { ...PUBLIC_SERVICE_FILTER };

  if (options.category) {
    filter.category = options.category;
  }

  if (options.mode) {
    filter.mode = options.mode;
  }

  if (options.q) {
    const pattern = escapeRegExp(options.q.trim());

    filter.$or = [
      { title: { $regex: pattern, $options: "i" } },
      { description: { $regex: pattern, $options: "i" } },
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
    .sort(SORT_MAP[options.sort])
    .skip((page - 1) * options.pageSize)
    .limit(options.pageSize)
    .toArray();

  return {
    items: docs.map(toServiceSummary),
    page,
    pageSize: options.pageSize,
    total,
    totalPages,
  };
}

async function getTechnicianProfile(
  technicianId: string,
  fallbackName: string,
  fallbackArea: string,
  fallbackRating: number,
): Promise<TechnicianProfileDto> {
  const objectId = ObjectId.isValid(technicianId)
    ? new ObjectId(technicianId)
    : null;

  const [user, profile] = await Promise.all([
    objectId
      ? mongoDb.collection("user").findOne({ _id: objectId })
      : Promise.resolve(null),
    technicianProfiles.findOne({ userId: technicianId }),
  ]);

  return {
    id: technicianId,
    name: stringOr(user?.name, fallbackName),
    bio: stringOr(user?.bio, "Verified FixMate technician."),
    area: stringOr(user?.area, fallbackArea),
    rating: profile?.ratingAvg ?? fallbackRating,
    jobs: profile?.jobsCompleted ?? 0,
    plan: profile?.plan ?? "free",
    repliesIn: profile?.repliesIn ?? "~12 min",
    image: stringOrNull(user?.image),
  };
}

export async function getServiceDetailBySlug(
  slug: string,
): Promise<ServiceDetailDto | null> {
  const service = await services.findOne({
    ...PUBLIC_SERVICE_FILTER,
    slug,
  });

  if (!service) {
    return null;
  }

  return {
    ...toServiceSummary(service),
    includes: service.includes,
    warranty: service.warranty,
    availabilityNote: service.availabilityNote,
    technicianProfile: await getTechnicianProfile(
      service.technicianId,
      service.technicianName,
      service.location,
      service.ratingAvg,
    ),
  };
}

export async function listServiceReviews(
  slug: string,
  page: number,
  pageSize: number,
): Promise<ListReviewsResult | null> {
  const service = await services.findOne(
    { ...PUBLIC_SERVICE_FILTER, slug },
    { projection: { _id: 1 } },
  );

  if (!service) {
    return null;
  }

  const filter = { serviceId: service._id, visible: true };
  const total = await reviews.countDocuments(filter);
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const currentPage = Math.min(page, totalPages);

  const docs = await reviews
    .find(filter)
    .sort({ createdAt: -1 })
    .skip((currentPage - 1) * pageSize)
    .limit(pageSize)
    .toArray();

  const customerIds = docs
    .map((review) =>
      ObjectId.isValid(review.customerId)
        ? new ObjectId(review.customerId)
        : null,
    )
    .filter((id): id is ObjectId => id !== null);

  const customers =
    customerIds.length > 0
      ? await mongoDb
          .collection("user")
          .find({ _id: { $in: customerIds } })
          .project({ name: 1 })
          .toArray()
      : [];

  const nameById = new Map(
    customers.map((customer) => [
      customer._id.toString(),
      stringOr(customer.name, "FixMate customer"),
    ]),
  );

  return {
    items: docs.map((review) => ({
      id: review._id,
      name: nameById.get(review.customerId) ?? "FixMate customer",
      rating: review.rating,
      text: review.text,
      at: dateOnly(review.createdAt),
    })),
    page: currentPage,
    pageSize,
    total,
    totalPages,
  };
}
