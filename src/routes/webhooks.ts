import type { Request, Response } from "express";
import type Stripe from "stripe";
import { fail } from "../http/response.js";
import { HTTP_STATUS } from "../http/status.js";
import { logger } from "../lib/logger.js";
import { stripe, stripeWebhookSecret } from "../lib/stripe.js";
import { handleStripeEvent } from "../services/payments.js";

export async function stripeWebhookHandler(
  request: Request,
  response: Response,
) {
  if (!stripe || !stripeWebhookSecret) {
    response
      .status(HTTP_STATUS.SERVICE_UNAVAILABLE)
      .json(
        fail(
          "PAYMENTS_NOT_CONFIGURED",
          "Stripe webhooks are not configured.",
        ),
      );
    return;
  }

  const signature = request.header("stripe-signature");

  if (!signature) {
    response
      .status(HTTP_STATUS.BAD_REQUEST)
      .json(fail("INVALID_SIGNATURE", "Missing Stripe signature."));
    return;
  }

  const rawBody = request.body;

  if (!Buffer.isBuffer(rawBody)) {
    response
      .status(HTTP_STATUS.BAD_REQUEST)
      .json(fail("INVALID_BODY", "Stripe webhook body must be raw JSON."));
    return;
  }

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(
      rawBody,
      signature,
      stripeWebhookSecret,
    );
  } catch (error) {
    logger.warn("stripe_signature_invalid", {
      requestId: request.id,
      error: error instanceof Error ? error.message : String(error),
    });

    response
      .status(HTTP_STATUS.BAD_REQUEST)
      .json(fail("INVALID_SIGNATURE", "Invalid Stripe signature."));
    return;
  }

  try {
    await handleStripeEvent(event);
    response.json({ received: true });
  } catch (error) {
    logger.error("stripe_webhook_failed", {
      requestId: request.id,
      eventId: event.id,
      type: event.type,
      error: error instanceof Error ? error.message : String(error),
    });

    response
      .status(HTTP_STATUS.INTERNAL_SERVER_ERROR)
      .json(fail("WEBHOOK_FAILED", "Could not process the Stripe webhook."));
  }
}
