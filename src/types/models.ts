export const SERVICE_CATEGORIES = [
  "Smartphone",
  "Laptop & PC",
  "AC",
  "Refrigerator",
  "TV",
  "Washing Machine",
  "Electrical",
] as const;

export type ServiceCategory = (typeof SERVICE_CATEGORIES)[number];

export const SERVICE_MODES = ["Home Visit", "Shop Drop-off"] as const;

export type ServiceMode = (typeof SERVICE_MODES)[number];

export type ApprovalStatus = "pending" | "approved" | "rejected";

export type BookingStatus =
  | "requested"
  | "accepted"
  | "in-progress"
  | "completed"
  | "cancelled"
  | "rejected";

export type PaymentStatus = "unpaid" | "paid";

export type VerificationStatus = "pending" | "verified" | "rejected";

export type Plan = "free" | "pro";

export type ServiceDocument = {
  _id: string;
  slug: string;
  legacyId?: string;
  technicianId: string;
  technicianName: string;
  title: string;
  category: ServiceCategory;
  description: string;
  location: string;
  duration: string;
  price: number;
  mode: ServiceMode;
  coverImage: string | null;
  includes: string[];
  warranty: string;
  availabilityNote: string;
  approval: ApprovalStatus;
  rejectionReason?: string;
  available: boolean;
  // Assignment 9 compatibility fields.
  image?: string | null;
  basePrice?: number;
  estimatedDuration?: string;
  serviceMode?: ServiceMode;
  serviceArea?: string;
  technicianEmail?: string;
  approvalStatus?: ApprovalStatus;
  isAvailable?: boolean;
  ratingAvg: number;
  reviewCount: number;
  createdAt: Date;
  updatedAt: Date;
  approvedAt?: Date;
  approvedBy?: string;
  deletedAt?: Date | null;
};

export type BookingStatusEvent = {
  status: BookingStatus;
  at: Date;
  by: string;
  note?: string;
};

export type BookingDocument = {
  _id: string;
  bookingNumber: string;
  customerId: string;
  technicianId: string;
  serviceId: string;
  serviceSlug: string;
  serviceTitle: string;
  serviceImage: string | null;
  category: ServiceCategory;
  mode: ServiceMode;
  basePrice: number;
  finalAmount: number | null;
  preferredDate: string;
  phone: string;
  address: string;
  problem: string;
  status: BookingStatus;
  paymentStatus: PaymentStatus;
  // Assignment 9 compatibility fields.
  technicianName?: string;
  technicianEmail?: string;
  customerName?: string;
  customerEmail?: string;
  customerPhone?: string;
  problemDescription?: string;
  rating?: number;
  reviewText?: string;
  reviewedAt?: Date;
  reviewVisible?: boolean;
  statusHistory: BookingStatusEvent[];
  createdAt: Date;
  updatedAt: Date;
  acceptedAt?: Date;
  startedAt?: Date;
  completedAt?: Date;
  cancelledAt?: Date;
  rejectedAt?: Date;
  checkoutSessionId?: string;
};

export type PaymentDocument = {
  _id: string;
  bookingId: string;
  customerId: string;
  technicianId: string;
  amount: number;
  currency: "usd";
  provider: "stripe";
  providerSessionId: string;
  providerPaymentIntentId?: string;
  transactionId: string;
  status: "paid" | "refunded";
  paidAt: Date;
  invoiceNumber: string;
  createdAt: Date;
  // Assignment 9 compatibility fields.
  serviceTitle?: string;
  customerName?: string;
  customerEmail?: string;
  technicianName?: string;
  technicianEmail?: string;
  stripeSessionId?: string;
  paymentStatus?: "paid";
};

export type ReviewDocument = {
  _id: string;
  bookingId: string;
  serviceId: string;
  customerId: string;
  technicianId: string;
  rating: number;
  text: string;
  visible: boolean;
  createdAt: Date;
};

export type TechnicianProfileDocument = {
  _id: string;
  userId: string;
  verificationStatus: VerificationStatus;
  plan: Plan;
  ratingAvg: number;
  jobsCompleted: number;
  repliesIn: string;
  specialties: string[];
  createdAt: Date;
  updatedAt: Date;
};

export type AuditLogDocument = {
  _id: string;
  action: string;
  actorId: string;
  actorEmail: string;
  targetType: "user" | "service" | "booking" | "payment";
  targetId: string;
  metadata: Record<string, unknown>;
  createdAt: Date;
};
