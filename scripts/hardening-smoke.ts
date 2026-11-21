import type Stripe from "stripe";
import { env } from "../src/config/env.js";
import { bookings, payments, services } from "../src/db/collections.js";
import { mongoClient, mongoDb } from "../src/db/mongo.js";
import { stripe } from "../src/lib/stripe.js";
import { verifyCheckoutSession } from "../src/services/payments.js";

const api = env.BETTER_AUTH_URL;
const web = env.FRONTEND_URL;

if (!stripe) {
  throw new Error("Stripe is not configured.");
}

const stripeClient = stripe;

function cookieFrom(response: Response) {
  return response.headers
    .getSetCookie()
    .map((cookie) => cookie.split(";")[0])
    .join("; ");
}

async function signIn(email: string, password: string) {
  const response = await fetch(`${api}/api/auth/sign-in/email`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Origin: web },
    body: JSON.stringify({ email, password }),
  });
  return { status: response.status, cookie: cookieFrom(response) };
}

async function signOut(cookie: string) {
  await fetch(`${api}/api/auth/sign-out`, {
    method: "POST",
    headers: { cookie, Origin: web },
  });
}

async function call(
  path: string,
  cookie: string,
  init: RequestInit = {},
) {
  const response = await fetch(`${api}${path}`, {
    ...init,
    headers: {
      cookie,
      Origin: web,
      ...(init.body ? { "Content-Type": "application/json" } : {}),
    },
  });
  const text = await response.text();
  let body: Record<string, any> | null = null;

  try {
    body = text ? (JSON.parse(text) as Record<string, any>) : null;
  } catch {
    body = null;
  }
  return { status: response.status, body };
}

const customer = await signIn("customer@fixmate.dev", env.SEED_PASSWORD);
const tanvir = await signIn("tanvir@mail.com", env.SEED_PASSWORD);
const technician = await signIn("rakib@fixmate.dev", env.SEED_PASSWORD);
const admin = await signIn(
  env.ADMIN_EMAIL,
  env.ADMIN_PASSWORD ?? env.SEED_PASSWORD,
);

const users = mongoDb.collection("user");
const tanvirUser = await users.findOne({ email: "tanvir@mail.com" });
const mehediUser = await users.findOne({ email: "mehedi@mail.com" });

if (!tanvirUser || !mehediUser) {
  throw new Error("Missing seeded users.");
}

const originalMehedi = {
  role: mehediUser.role ?? "user",
  accountType: mehediUser.accountType ?? "customer",
};
let bookingId: string | null = null;
let serviceId: string | null = null;
const originalRetrieve = stripeClient.checkout.sessions.retrieve.bind(
  stripeClient.checkout.sessions,
);

try {
  const noAuth = await call("/api/v1/admin/overview", "");
  const wrongRole = await call("/api/v1/admin/overview", customer.cookie);

  const created = await call("/api/v1/bookings", tanvir.cookie, {
    method: "POST",
    body: JSON.stringify({
      serviceSlug: "refrigerator-door-seal-replacement",
      preferredDate: "2026-12-24",
      phone: "+880 1555 902211",
      address: "House 8, Road 2, Mirpur, Dhaka",
      problem:
        "Hardening smoke test booking. The fridge door seal is loose and leaking.",
    }),
  });
  bookingId = created.body?.data?.id ?? null;

  const idor = bookingId
    ? await call(`/api/v1/bookings/${bookingId}/cancel`, customer.cookie, {
        method: "POST",
      })
    : null;

  const invalidTransition = bookingId
    ? await call(
        `/api/v1/technician/requests/${bookingId}/complete`,
        technician.cookie,
        {
          method: "POST",
          body: JSON.stringify({ finalAmount: 40 }),
        },
      )
    : null;

  const accepted = bookingId
    ? await call(
        `/api/v1/technician/requests/${bookingId}/accept`,
        technician.cookie,
        { method: "POST" },
      )
    : null;
  const started = bookingId
    ? await call(
        `/api/v1/technician/requests/${bookingId}/start`,
        technician.cookie,
        { method: "POST" },
      )
    : null;
  const completed = bookingId
    ? await call(
        `/api/v1/technician/requests/${bookingId}/complete`,
        technician.cookie,
        {
          method: "POST",
          body: JSON.stringify({ finalAmount: 40 }),
        },
      )
    : null;

  const fakeSessionId = `cs_test_hardening_${Date.now()}`;
  const fakeIntentId = `pi_test_hardening_${Date.now()}`;

  if (bookingId) {
    await bookings.updateOne(
      { _id: bookingId },
      { $set: { paymentStatus: "unpaid" } },
    );

    stripeClient.checkout.sessions.retrieve = (async () =>
      ({
        id: fakeSessionId,
        object: "checkout.session",
        payment_status: "paid",
        payment_intent: fakeIntentId,
        amount_total: 4000,
        currency: "usd",
        metadata: { bookingId },
        client_reference_id: bookingId,
        created: Math.floor(Date.now() / 1000),
      }) as unknown as Stripe.Checkout.Session) as unknown as typeof stripeClient.checkout.sessions.retrieve;

    await verifyCheckoutSession(String(tanvirUser._id), fakeSessionId);
    await verifyCheckoutSession(String(tanvirUser._id), fakeSessionId);

    stripeClient.checkout.sessions.retrieve = originalRetrieve;
  }

  const paymentCount = bookingId
    ? await payments.countDocuments({ bookingId })
    : 0;
  const paidBooking = bookingId
    ? await bookings.findOne({ _id: bookingId })
    : null;

  const createdService = await call(
    "/api/v1/technician/services",
    technician.cookie,
    {
      method: "POST",
      body: JSON.stringify({
        title: "Hardening Smoke Service",
        category: "Electrical",
        description:
          "Temporary service used by the repeatable hardening smoke test.",
        location: "Mirpur, Dhaka",
        duration: "1 hour",
        price: 30,
        mode: "Home Visit",
        includes: ["Smoke test"],
      }),
    },
  );
  serviceId = createdService.body?.data?.id ?? null;

  const approved = serviceId
    ? await call(
        `/api/v1/admin/services/${serviceId}/approve`,
        admin.cookie,
        { method: "POST" },
      )
    : null;
  const edited = serviceId
    ? await call(
        `/api/v1/technician/services/${serviceId}`,
        technician.cookie,
        {
          method: "PATCH",
          body: JSON.stringify({ price: 35 }),
        },
      )
    : null;
  const editedDoc = serviceId
    ? await services.findOne({ _id: serviceId })
    : null;

  const promote = await call(
    `/api/v1/admin/users/${String(mehediUser._id)}/role`,
    admin.cookie,
    { method: "PATCH", body: JSON.stringify({ role: "admin" }) },
  );
  const demote = await call(
    `/api/v1/admin/users/${String(mehediUser._id)}/role`,
    admin.cookie,
    { method: "PATCH", body: JSON.stringify({ role: "customer" }) },
  );

  console.log(
    "auth:",
    noAuth.status,
    wrongRole.status,
    "| idor:",
    idor?.status,
    "| transitions:",
    invalidTransition?.status,
    accepted?.status,
    started?.status,
    completed?.status,
  );
  console.log(
    "payment idempotency:",
    paymentCount,
    paidBooking?.paymentStatus,
    "| approval reset:",
    approved?.status,
    edited?.status,
    editedDoc?.approval,
    "| roles:",
    promote.status,
    promote.body?.data?.role,
    demote.status,
    demote.body?.data?.role,
  );
} finally {
  stripeClient.checkout.sessions.retrieve = originalRetrieve;

  if (bookingId) {
    await payments.deleteMany({ bookingId });
    await bookings.deleteOne({ _id: bookingId });
  }

  if (serviceId) {
    await services.deleteOne({ _id: serviceId });
  }

  await users.updateOne(
    { _id: mehediUser._id },
    {
      $set: {
        role: originalMehedi.role,
        accountType: originalMehedi.accountType,
      },
    },
  );

  await signOut(customer.cookie);
  await signOut(tanvir.cookie);
  await signOut(technician.cookie);
  await signOut(admin.cookie);
  await mongoClient.close();
  console.log("hardening smoke test cleaned up");
}
