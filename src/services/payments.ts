import { randomUUID } from "node:crypto";
import { ObjectId } from "mongodb";
import type Stripe from "stripe";
import { env } from "../config/env.js";
import { bookings, payments } from "../db/collections.js";
import { mongoDb } from "../db/mongo.js";
import { ApiError } from "../http/api-error.js";
import { HTTP_STATUS } from "../http/status.js";
import { logger } from "../lib/logger.js";
import { stripe } from "../lib/stripe.js";
import type { BookingDocument, PaymentDocument } from "../types/models.js";
import type { AppRole } from "../roles.js";

export type CustomerPaymentDto = {
  id: string;
  bookingId: string;
  bookingNumber: string;
  serviceTitle: string;
  technician: string;
  amount: number;
  paidAt: string;
  transactionId: string;
};

function dateOnly(value: Date) {
  return value.toISOString().slice(0, 10);
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

function toCustomerPayment(
  payment: PaymentDocument,
  booking: BookingDocument | undefined,
  technician: string,
): CustomerPaymentDto {
  return {
    id: payment._id,
    bookingId: payment.bookingId,
    bookingNumber: booking?.bookingNumber ?? payment.bookingId,
    serviceTitle: booking?.serviceTitle ?? "Service",
    technician,
    amount: payment.amount,
    paidAt: dateOnly(payment.paidAt),
    transactionId: payment.transactionId,
  };
}

export async function listCustomerPayments(
  customerId: string,
  page: number,
  pageSize: number,
) {
  const filter = { customerId };
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
  const technicianNames = await loadTechnicianNames(
    docs.map((payment) => payment.technicianId),
  );

  return {
    items: docs.map((payment) =>
      toCustomerPayment(
        payment,
        bookingById.get(payment.bookingId),
        technicianNames.get(payment.technicianId) ?? "FixMate technician",
      ),
    ),
    page: currentPage,
    pageSize,
    total,
    totalPages,
  };
}

export async function getPaymentForUser(
  id: string,
  userId: string,
  role: AppRole,
): Promise<CustomerPaymentDto> {
  const payment = await payments.findOne({ _id: id });

  if (!payment || (role !== "admin" && payment.customerId !== userId)) {
    throw ApiError.notFound("Payment not found.");
  }

  const booking = await bookings.findOne({ _id: payment.bookingId });
  const technicianNames = await loadTechnicianNames([payment.technicianId]);

  return toCustomerPayment(
    payment,
    booking ?? undefined,
    technicianNames.get(payment.technicianId) ?? "FixMate technician",
  );
}

function isDuplicateKey(error: unknown) {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as { code?: number }).code === 11000
  );
}

export async function createCheckoutSession(
  customerId: string,
  customerEmail: string,
  bookingId: string,
) {
  const booking = await bookings.findOne({ _id: bookingId });

  if (!booking || booking.customerId !== customerId) {
    throw ApiError.notFound("Booking not found.");
  }

  if (booking.status !== "completed") {
    throw ApiError.conflict(
      "Only completed jobs can be paid.",
      "INVALID_STATE",
    );
  }

  if (booking.paymentStatus === "paid") {
    throw ApiError.conflict(
      "This booking is already paid.",
      "ALREADY_PAID",
    );
  }

  if (!booking.finalAmount || booking.finalAmount <= 0) {
    throw ApiError.conflict(
      "The final amount has not been set.",
      "FINAL_AMOUNT_REQUIRED",
    );
  }

  const existingPayment = await payments.findOne({ bookingId });
  if (existingPayment) {
    throw ApiError.conflict(
      "This booking is already paid.",
      "ALREADY_PAID",
    );
  }

  if (!stripe) {
    throw new ApiError(
      HTTP_STATUS.SERVICE_UNAVAILABLE,
      "PAYMENTS_NOT_CONFIGURED",
      "Stripe is not configured.",
    );
  }

  const amountCents = Math.round(booking.finalAmount * 100);

  if (booking.checkoutSessionId) {
    try {
      const existingSession = await stripe.checkout.sessions.retrieve(
        booking.checkoutSessionId,
      );

      if (existingSession.status === "open" && existingSession.url) {
        return { url: existingSession.url };
      }

      if (existingSession.status === "complete") {
        throw ApiError.conflict(
          "Payment is already processing for this booking.",
          "PAYMENT_PROCESSING",
        );
      }
    } catch (error) {
      if (error instanceof ApiError) throw error;
      // Expired or missing session: create a fresh one below.
    }
  }

  try {
    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      client_reference_id: booking._id,
      ...(customerEmail ? { customer_email: customerEmail } : {}),
      line_items: [
        {
          quantity: 1,
          price_data: {
            currency: "usd",
            unit_amount: amountCents,
            product_data: {
              name: booking.serviceTitle,
              description: booking.problem.slice(0, 200),
            },
          },
        },
      ],
      metadata: {
        bookingId: booking._id,
        customerId: booking.customerId,
        technicianId: booking.technicianId,
      },
      payment_intent_data: {
        metadata: {
          bookingId: booking._id,
          customerId: booking.customerId,
          technicianId: booking.technicianId,
        },
      },
      success_url: `${env.FRONTEND_URL}/payment/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${env.FRONTEND_URL}/payment/cancel?booking_id=${booking._id}`,
    });

    if (!session.url) {
      throw new Error("Stripe did not return a checkout URL.");
    }

    await bookings.updateOne(
      { _id: booking._id, customerId },
      {
        $set: {
          checkoutSessionId: session.id,
          updatedAt: new Date(),
        },
      },
    );

    return { url: session.url };
  } catch (error) {
    if (error instanceof ApiError) throw error;

    logger.error("stripe_checkout_failed", {
      bookingId,
      error: error instanceof Error ? error.message : String(error),
    });

    throw new ApiError(
      HTTP_STATUS.SERVICE_UNAVAILABLE,
      "PAYMENT_PROVIDER_UNAVAILABLE",
      "Could not start checkout. Please try again.",
    );
  }
}

async function recordStripePayment(input: {
  booking: BookingDocument;
  providerSessionId: string;
  providerPaymentIntentId?: string;
  amountCents: number;
  paidAt: Date;
  transactionId: string;
}) {
  const amount = input.amountCents / 100;

  if (!Number.isFinite(amount) || amount <= 0) {
    logger.warn("stripe_payment_invalid_amount", {
      bookingId: input.booking._id,
      amount: input.amountCents,
    });
    return;
  }

  const payment: PaymentDocument = {
    _id: randomUUID(),
    bookingId: input.booking._id,
    customerId: input.booking.customerId,
    technicianId: input.booking.technicianId,
    amount,
    currency: "usd",
    provider: "stripe",
    providerSessionId: input.providerSessionId,
    ...(input.providerPaymentIntentId
      ? { providerPaymentIntentId: input.providerPaymentIntentId }
      : {}),
    transactionId: input.transactionId,
    status: "paid",
    paidAt: input.paidAt,
    invoiceNumber: `INV-${input.booking.bookingNumber}`,
    createdAt: new Date(),
  };

  try {
    await payments.updateOne(
      { bookingId: input.booking._id },
      { $setOnInsert: payment },
      { upsert: true },
    );
  } catch (error) {
    if (isDuplicateKey(error)) {
      logger.info("stripe_payment_duplicate", {
        bookingId: input.booking._id,
        providerSessionId: input.providerSessionId,
      });
    } else {
      throw error;
    }
  }

  const recorded = await payments.findOne({
    bookingId: input.booking._id,
  });

  if (!recorded) {
    logger.error("stripe_payment_missing_after_upsert", {
      bookingId: input.booking._id,
      providerSessionId: input.providerSessionId,
    });
    return;
  }

  await bookings.updateOne(
    { _id: input.booking._id, status: "completed" },
    {
      $set: {
        paymentStatus: "paid",
        updatedAt: new Date(),
      },
    },
  );
}

export async function verifyCheckoutSession(
  customerId: string,
  sessionId: string,
): Promise<CustomerPaymentDto> {
  if (!stripe) {
    throw new ApiError(
      HTTP_STATUS.SERVICE_UNAVAILABLE,
      "PAYMENTS_NOT_CONFIGURED",
      "Stripe is not configured.",
    );
  }

  let session: Stripe.Checkout.Session;

  try {
    session = await stripe.checkout.sessions.retrieve(sessionId, {
      expand: ["payment_intent"],
    });
  } catch (error) {
    logger.warn("stripe_verify_session_failed", {
      sessionId,
      error: error instanceof Error ? error.message : String(error),
    });

    throw ApiError.notFound("Payment session not found.");
  }

  if (session.payment_status !== "paid") {
    throw ApiError.conflict(
      "Payment has not been completed.",
      "PAYMENT_NOT_COMPLETED",
    );
  }

  const bookingId =
    session.metadata?.bookingId ?? session.client_reference_id ?? "";

  if (!bookingId) {
    throw ApiError.notFound("Booking not found.");
  }

  const booking = await bookings.findOne({ _id: bookingId });

  if (!booking || booking.customerId !== customerId) {
    throw ApiError.notFound("Booking not found.");
  }

  if (booking.status !== "completed" || !booking.finalAmount) {
    throw ApiError.conflict(
      "This booking cannot be paid.",
      "INVALID_STATE",
    );
  }

  const expectedCents = Math.round(booking.finalAmount * 100);
  const amountCents = session.amount_total ?? 0;

  if (
    amountCents !== expectedCents ||
    (session.currency ?? "usd") !== "usd"
  ) {
    logger.error("stripe_verify_amount_mismatch", {
      sessionId,
      bookingId,
      expectedCents,
      amountCents,
      currency: session.currency,
    });

    throw ApiError.conflict(
      "The payment amount does not match this booking.",
      "AMOUNT_MISMATCH",
    );
  }

  const paymentIntentId =
    typeof session.payment_intent === "string"
      ? session.payment_intent
      : session.payment_intent?.id;

  await recordStripePayment({
    booking,
    providerSessionId: session.id,
    ...(paymentIntentId
      ? { providerPaymentIntentId: paymentIntentId }
      : {}),
    amountCents,
    paidAt: new Date(
      (session.created ?? Math.floor(Date.now() / 1000)) * 1000,
    ),
    transactionId: paymentIntentId ?? session.id,
  });

  const payment = await payments.findOne({ bookingId });

  if (!payment) {
    throw new ApiError(
      HTTP_STATUS.INTERNAL_SERVER_ERROR,
      "PAYMENT_NOT_RECORDED",
      "The payment could not be recorded.",
    );
  }

  const technicianNames = await loadTechnicianNames([
    payment.technicianId,
  ]);

  return toCustomerPayment(
    payment,
    booking,
    technicianNames.get(payment.technicianId) ?? "FixMate technician",
  );
}

async function handleCheckoutSessionCompleted(
  event: Stripe.Event,
) {
  const session = event.data.object as Stripe.Checkout.Session;

  if (session.payment_status !== "paid") {
    logger.info("stripe_checkout_not_paid", {
      eventId: event.id,
      sessionId: session.id,
      paymentStatus: session.payment_status,
    });
    return;
  }

  const bookingId =
    session.metadata?.bookingId ?? session.client_reference_id ?? "";

  if (!bookingId) {
    logger.warn("stripe_checkout_missing_booking", {
      eventId: event.id,
      sessionId: session.id,
    });
    return;
  }

  const booking = await bookings.findOne({ _id: bookingId });

  if (!booking) {
    logger.warn("stripe_checkout_unknown_booking", {
      eventId: event.id,
      bookingId,
    });
    return;
  }

  if (booking.status !== "completed" || !booking.finalAmount) {
    logger.warn("stripe_checkout_booking_not_payable", {
      eventId: event.id,
      bookingId,
      status: booking.status,
      finalAmount: booking.finalAmount,
    });
    return;
  }

  const expectedCents = Math.round(booking.finalAmount * 100);
  const amountCents = session.amount_total ?? 0;

  if (
    amountCents !== expectedCents ||
    (session.currency ?? "usd") !== "usd"
  ) {
    logger.error("stripe_checkout_amount_mismatch", {
      eventId: event.id,
      bookingId,
      expectedCents,
      amountCents,
      currency: session.currency,
    });
    return;
  }

  const paymentIntentId =
    typeof session.payment_intent === "string"
      ? session.payment_intent
      : session.payment_intent?.id;

  await recordStripePayment({
    booking,
    providerSessionId: session.id,
    ...(paymentIntentId
      ? { providerPaymentIntentId: paymentIntentId }
      : {}),
    amountCents,
    paidAt: new Date(event.created * 1000),
    transactionId: paymentIntentId ?? session.id,
  });
}

async function handlePaymentIntentSucceeded(event: Stripe.Event) {
  const intent = event.data.object as Stripe.PaymentIntent;
  const bookingId = intent.metadata?.bookingId ?? "";

  if (!bookingId) {
    logger.warn("stripe_intent_missing_booking", {
      eventId: event.id,
      paymentIntentId: intent.id,
    });
    return;
  }

  const booking = await bookings.findOne({ _id: bookingId });

  if (!booking) {
    logger.warn("stripe_intent_unknown_booking", {
      eventId: event.id,
      bookingId,
    });
    return;
  }

  if (booking.status !== "completed" || !booking.finalAmount) {
    logger.warn("stripe_intent_booking_not_payable", {
      eventId: event.id,
      bookingId,
      status: booking.status,
      finalAmount: booking.finalAmount,
    });
    return;
  }

  const expectedCents = Math.round(booking.finalAmount * 100);
  const amountCents = intent.amount_received || intent.amount;

  if (amountCents !== expectedCents || intent.currency !== "usd") {
    logger.error("stripe_intent_amount_mismatch", {
      eventId: event.id,
      bookingId,
      expectedCents,
      amountCents,
      currency: intent.currency,
    });
    return;
  }

  await recordStripePayment({
    booking,
    providerSessionId: booking.checkoutSessionId ?? intent.id,
    providerPaymentIntentId: intent.id,
    amountCents,
    paidAt: new Date(event.created * 1000),
    transactionId: intent.id,
  });
}

export async function handleStripeEvent(event: Stripe.Event) {
  switch (event.type) {
    case "checkout.session.completed":
      await handleCheckoutSessionCompleted(event);
      return;
    case "payment_intent.succeeded":
      await handlePaymentIntentSucceeded(event);
      return;
    default:
      logger.info("stripe_event_ignored", {
        eventId: event.id,
        type: event.type,
      });
  }
}
