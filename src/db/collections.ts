import type { Collection } from "mongodb";
import type {
  BookingDocument,
  PaymentDocument,
  ReviewDocument,
  ServiceDocument,
  TechnicianProfileDocument,
} from "../types/models.js";
import { mongoDb } from "./mongo.js";

export const services: Collection<ServiceDocument> =
  mongoDb.collection<ServiceDocument>("services");

export const bookings: Collection<BookingDocument> =
  mongoDb.collection<BookingDocument>("bookings");

export const payments: Collection<PaymentDocument> =
  mongoDb.collection<PaymentDocument>("payments");

export const reviews: Collection<ReviewDocument> =
  mongoDb.collection<ReviewDocument>("reviews");

export const technicianProfiles: Collection<TechnicianProfileDocument> =
  mongoDb.collection<TechnicianProfileDocument>("technicianProfiles");
