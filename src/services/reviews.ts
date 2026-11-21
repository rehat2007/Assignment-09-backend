import { randomUUID } from "node:crypto";
import { bookings, reviews, services } from "../db/collections.js";
import { ApiError } from "../http/api-error.js";
import type { ReviewDocument } from "../types/models.js";

export type CreateReviewInput = {
  rating: number;
  text: string;
};

export type CreatedReviewDto = {
  id: string;
  bookingId: string;
  serviceId: string;
  serviceSlug: string;
  serviceTitle: string;
  rating: number;
  text: string;
  createdAt: string;
};

function isDuplicateKey(error: unknown) {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as { code?: number }).code === 11000
  );
}

export async function recomputeServiceRating(serviceId: string) {
  const [summary] = await reviews
    .aggregate<{ average: number; count: number }>([
      { $match: { serviceId, visible: true } },
      {
        $group: {
          _id: null,
          average: { $avg: "$rating" },
          count: { $sum: 1 },
        },
      },
    ])
    .toArray();

  const count = summary?.count ?? 0;
  const average = summary?.average ?? 0;
  const ratingAvg =
    count > 0 && Number.isFinite(average)
      ? Math.round(average * 10) / 10
      : 0;

  await services.updateOne(
    { _id: serviceId },
    {
      $set: {
        ratingAvg,
        reviewCount: count,
        updatedAt: new Date(),
      },
    },
  );

  return { ratingAvg, reviewCount: count };
}

export async function createReview(
  customerId: string,
  bookingId: string,
  input: CreateReviewInput,
): Promise<CreatedReviewDto> {
  const booking = await bookings.findOne({ _id: bookingId });

  if (!booking || booking.customerId !== customerId) {
    throw ApiError.notFound("Booking not found.");
  }

  if (booking.status !== "completed" || booking.paymentStatus !== "paid") {
    throw ApiError.conflict(
      "Only completed and paid bookings can be reviewed.",
      "REVIEW_NOT_ALLOWED",
    );
  }

  const existing = await reviews.findOne(
    { bookingId },
    { projection: { _id: 1 } },
  );

  if (existing) {
    throw ApiError.conflict(
      "This booking already has a review.",
      "ALREADY_REVIEWED",
    );
  }

  const review: ReviewDocument = {
    _id: randomUUID(),
    bookingId,
    serviceId: booking.serviceId,
    customerId,
    technicianId: booking.technicianId,
    rating: input.rating,
    text: input.text,
    visible: true,
    createdAt: new Date(),
  };

  try {
    await reviews.insertOne(review);
  } catch (error) {
    if (isDuplicateKey(error)) {
      throw ApiError.conflict(
        "This booking already has a review.",
        "ALREADY_REVIEWED",
      );
    }

    throw error;
  }

  await bookings.updateOne(
    { _id: bookingId, customerId },
    {
      $set: {
        rating: review.rating,
        reviewText: review.text,
        reviewedAt: review.createdAt,
        reviewVisible: true,
        updatedAt: new Date(),
      },
    },
  );

  await recomputeServiceRating(review.serviceId);

  return {
    id: review._id,
    bookingId: review.bookingId,
    serviceId: review.serviceId,
    serviceSlug: booking.serviceSlug,
    serviceTitle: booking.serviceTitle,
    rating: review.rating,
    text: review.text,
    createdAt: review.createdAt.toISOString(),
  };
}
