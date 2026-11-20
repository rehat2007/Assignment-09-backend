import { Router } from "express";
import { ApiError } from "../http/api-error.js";
import { ok, paginated } from "../http/response.js";
import {
  getValidatedParams,
  getValidatedQuery,
  validateParams,
  validateQuery,
} from "../middleware/validate.js";
import {
  getCatalogMeta,
  getServiceDetailBySlug,
  listServiceReviews,
  listServices,
} from "../services/catalog.js";
import {
  reviewListQuerySchema,
  type ReviewListQuery,
} from "../validation/reviews.js";
import {
  serviceListQuerySchema,
  serviceSlugParamsSchema,
  type ServiceListQuery,
  type ServiceSlugParams,
} from "../validation/services.js";

const PUBLIC_CACHE_CONTROL =
  "public, max-age=60, stale-while-revalidate=300";

export const catalogRouter = Router();

catalogRouter.get("/meta", async (_request, response) => {
  response.setHeader("Cache-Control", PUBLIC_CACHE_CONTROL);
  response.json(ok(await getCatalogMeta()));
});

catalogRouter.get(
  "/services",
  validateQuery(serviceListQuerySchema),
  async (request, response) => {
    const query = getValidatedQuery<ServiceListQuery>(request);
    const result = await listServices(query);

    response.setHeader("Cache-Control", PUBLIC_CACHE_CONTROL);
    response.json(
      paginated(result.items, result.page, result.pageSize, result.total),
    );
  },
);

catalogRouter.get(
  "/services/:slug/reviews",
  validateParams(serviceSlugParamsSchema),
  validateQuery(reviewListQuerySchema),
  async (request, response) => {
    const { slug } = getValidatedParams<ServiceSlugParams>(request);
    const query = getValidatedQuery<ReviewListQuery>(request);
    const result = await listServiceReviews(slug, query.page, query.pageSize);

    if (!result) {
      throw ApiError.notFound("Service not found.");
    }

    response.setHeader("Cache-Control", PUBLIC_CACHE_CONTROL);
    response.json(
      paginated(result.items, result.page, result.pageSize, result.total),
    );
  },
);

catalogRouter.get(
  "/services/:slug",
  validateParams(serviceSlugParamsSchema),
  async (request, response) => {
    const { slug } = getValidatedParams<ServiceSlugParams>(request);
    const service = await getServiceDetailBySlug(slug);

    if (!service) {
      throw ApiError.notFound("Service not found.");
    }

    response.setHeader("Cache-Control", PUBLIC_CACHE_CONTROL);
    response.json(ok(service));
  },
);
