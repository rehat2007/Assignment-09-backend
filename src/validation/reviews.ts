import { z } from "zod";
import { PAGE_SIZES } from "../http/response.js";
import { paginationFields } from "./common.js";

export const createReviewSchema = z.object({
  rating: z.number().int().min(1).max(5),
  text: z.string().trim().min(1).max(1000),
});

export const reviewListQuerySchema = z.object({
  ...paginationFields(PAGE_SIZES.public),
});

export const meReviewsQuerySchema = z.object({
  ...paginationFields(PAGE_SIZES.dashboard),
});
