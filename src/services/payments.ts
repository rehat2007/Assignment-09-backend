import { ObjectId } from "mongodb";
import { bookings, payments } from "../db/collections.js";
import { mongoDb } from "../db/mongo.js";
import { ApiError } from "../http/api-error.js";
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
