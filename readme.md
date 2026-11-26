# FixMate — Smart Device & Home Appliance Repair Platform

FixMate is a full-stack, role-based repair marketplace for smartphones, laptops,
ACs, refrigerators, TVs, washing machines, and electrical work. Customers book
verified technicians, track every job, and pay only after the work is completed.
Technicians manage listings and requests, while admins moderate services, users,
bookings, and payments.

> **Status:** Core product, reviews, uploads, payments, JWT authorization, and
> hardening are implemented. Demo data has been removed. Production deployment
> is the remaining step.

---

## Table of Contents

- [What is this project?](#what-is-this-project)
- [What problem does it solve?](#what-problem-does-it-solve)
- [What can I do with it?](#what-can-i-do-with-it)
- [Technologies](#technologies)
- [Architecture](#architecture)
- [Backend organization](#backend-organization)
- [Run it on your computer](#run-it-on-your-computer)
- [Environment variables](#environment-variables)
- [Communicating with the API](#communicating-with-the-api)
- [Authentication and authorization](#authentication-and-authorization)
- [Production data setup](#production-data-setup)
- [Testing and quality checks](#testing-and-quality-checks)
- [Live API, source code, and deployment](#live-api-source-code-and-deployment)

---
## What is this project?

FixMate is an on-demand repair service platform with three roles:

| Role | Capabilities |
|---|---|
| **Customer** | Browse approved services, send repair requests, track status, cancel while requested, pay after completion, view payment history, leave reviews |
| **Technician** | Add and manage services, upload cover images, accept/reject requests, start and complete jobs, set the final amount, view earnings |
| **Admin** | Approve/reject services, manage users and roles, suspend/restore accounts, monitor every booking, view payments and revenue |

The backend is an Express + TypeScript API. The frontend is a Next.js App Router
application. MongoDB stores the marketplace data, Better Auth handles identity,
JWT protects the API, Stripe handles payments, and ImgBB/S3 handles uploads.

---

## What problem does it solve?

Finding a trustworthy repair technician is difficult. Customers often hand over
a device with no visibility into the repair, no clear price, and pressure to pay
before the work is done. Skilled technicians also lack a structured place to
list services and manage incoming jobs.

FixMate solves this by providing:

- A public catalog of admin-approved services.
- A transparent job pipeline:
  `requested → accepted → in-progress → completed → paid`.
- Server-enforced ownership and status rules.
- Pay-after-service with Stripe.
- Payment history, invoice details, technician earnings, and admin revenue.
- Reviews and ratings after paid jobs.
- Image uploads for service covers and profile avatars.
- Admin moderation for listings and users.

---

## What can I do with it?

### As a customer

- Register or sign in as a customer.
- Search, filter, and sort approved services.
- Open a service detail page and submit a repair request.
- Track the job timeline.
- Cancel a request while it is still `requested`.
- Pay a completed, unpaid job through Stripe Checkout.
- View payment history and transaction IDs.
- Leave one review per paid booking.
- Update profile details and upload an avatar.

### As a technician

- Register or sign in as a technician.
- Add services with a cover image; new listings start as `pending`.
- Edit listings; editing an approved/rejected listing sends it back to `pending`.
- Toggle availability.
- Delete listings with confirmation.
- Accept, reject, start, and complete assigned jobs.
- Set the final amount when completing a job.
- View earnings, paid jobs, and request pipeline.

### As an admin

- Approve or reject services.
- Change user roles between customer, technician, and admin.
- Suspend and restore users.
- View all bookings with status filters.
- View all payments and total revenue.
- Review audit history written by admin actions.

---

## Technologies

### Frontend

- Next.js 16 App Router
- React 19
- TypeScript
- Tailwind CSS v4
- shadcn-style UI components
- Lucide React icons
- Sonner toast notifications
- GSAP animations
- Better Auth client

### Backend

- Node.js
- Express 5
- TypeScript
- MongoDB
- Better Auth + MongoDB adapter
- JWT (`jsonwebtoken`)
- Stripe Checkout + webhooks
- ImgBB / S3-compatible storage
- Zod validation
- Multer uploads
- `express-rate-limit`
- Helmet + CORS

### Infrastructure

- MongoDB Atlas or local MongoDB
- Stripe test mode
- ImgBB or S3/R2/MinIO
- Any Node.js host for Express (Render, Railway, Fly.io, etc.)
- Vercel or another Next.js host for the frontend

---

## Architecture

```text
Browser
  |
  +-- Next.js frontend
  |   App Router, SSR, cookies
  |
  +-- Express API
        |
        +-- Better Auth sessions + JWT
        +-- Zod validation
        +-- Role and ownership middleware
        +-- MongoDB (user, services, bookings, payments)
        +-- Stripe Checkout + webhook
        +-- ImgBB / S3 / local uploads
```

### Core data model

| Collection | Purpose |
|---|---|
| `user` | Better Auth users, role, account type, profile fields |
| `services` | Technician listings and admin approval state |
| `bookings` | Repair requests, status history, final amount, reviews |
| `payments` | One payment per paid booking, Stripe IDs, invoice data |

Optional feature collections:

| Collection | Purpose |
|---|---|
| `reviews` | Public review index and rating aggregation |
| `technicianProfiles` | Technician plan, rating, jobs, specialties |
| `auditLogs` | Admin action history |

> The four core collections contain the Assignment 9 compatibility fields. The
> optional collections support reviews, technician profiles, and auditing.

---

## Backend organization

```text
fix_mate_back_end/
|-- src/
|   |-- index.ts                 # Express app, middleware order, route mounts
|   |-- auth.ts                  # Better Auth configuration
|   |-- roles.ts                 # App role resolution
|   |-- config/
|   |   `-- env.ts               # Zod-validated environment variables
|   |-- db/
|   |   |-- mongo.ts             # MongoDB client + database
|   |   |-- collections.ts       # Typed collection exports
|   |   `-- indexes.ts           # Unique and query indexes
|   |-- http/
|   |   |-- api-error.ts         # Expected API errors
|   |   |-- response.ts          # { data, meta } and pagination helpers
|   |   `-- status.ts            # HTTP status constants
|   |-- lib/
|   |   |-- jwt.ts               # JWT signing and verification
|   |   |-- logger.ts            # Structured logs
|   |   |-- storage.ts           # local / S3 / ImgBB upload drivers
|   |   |-- stripe.ts            # Stripe client
|   |   `-- spend-series.ts      # Aggregation helper
|   |-- middleware/
|   |   |-- auth.ts              # Legacy requireUser/requireRole aliases
|   |   |-- jwt-auth.ts          # verifyToken/Customer/Technician/Admin
|   |   |-- rate-limit.ts        # Auth, booking, upload limiters
|   |   |-- validate.ts          # Zod body/query/params validation
|   |   |-- errors.ts            # 404 and central error handler
|   |   `-- request-context.ts   # Request ID + access logs
|   |-- routes/
|   |   |-- auth-token.ts        # POST /api/v1/auth/token, /logout
|   |   |-- catalog.ts           # Public catalog + reviews
|   |   |-- bookings.ts          # Customer bookings + review
|   |   |-- customer.ts          # Customer overview + payments
|   |   |-- payments.ts          # Payment verification + detail
|   |   |-- technician.ts        # Technician services + requests
|   |   |-- admin.ts             # Admin users, services, bookings, payments
|   |   |-- uploads.ts           # Avatar + service-cover uploads
|   |   |-- webhooks.ts          # Stripe webhook
|   |   |-- me.ts                # Current user
|   |   `-- compat.ts            # Assignment-compatible /api aliases
|   |-- services/
|   |   |-- admin.ts             # Admin business logic
|   |   |-- bookings.ts          # Booking lifecycle
|   |   |-- catalog.ts           # Public catalog + reviews
|   |   |-- payments.ts          # Stripe verification + idempotency
|   |   |-- reviews.ts           # Review creation + aggregation
|   |   `-- technician.ts        # Technician services + requests
|   |-- validation/              # Zod schemas by domain
|   `-- types/
|       `-- models.ts            # MongoDB document types
|-- scripts/
|   |-- seed.ts                  # Local demo users, services, bookings, payments
|   |-- seed-data.ts             # Demo fixture data
|   |-- migrate-schema.ts        # Assignment compatibility migration
|   |-- clear-demo-data.ts       # Remove demo data before deployment
|   |-- hardening-smoke.ts       # Repeatable security/flow smoke test
|   `-- create-admin.ts          # Bootstrap an admin account
|-- .env.example                 # Environment template
`-- package.json
```

### Middleware order

The order matters:

1. Request context / request IDs
2. Helmet
3. CORS
4. Auth rate limiter
5. Better Auth handler at `/api/auth/*splat`
6. Stripe webhook with `express.raw()`
7. `express.json()`
8. API routes
9. Static upload serving
10. 404 handler
11. Central error handler

The Stripe webhook must receive the raw body **before** `express.json()`.

---

## Run it on your computer

### Prerequisites

- Node.js 20+ (Node 24 is used in development)
- npm
- MongoDB Atlas or local MongoDB
- Stripe test keys (only for payment testing)
- ImgBB API key (for assignment uploads) or local storage

### 1. Clone the repositories

```powershell
cd C:\web_dev\fix_mate
git clone https://github.com/rehat2007/Assignment-09-backend.git fix_mate_back_end
git clone https://github.com/rehat2007/Assignment-09-frontend-.git fix_mate_front_end
```

### 2. Configure the backend

```powershell
cd C:\web_dev\fix_mate\fix_mate_back_end
Copy-Item .env.example .env
# Edit .env and fill in the real values.
npm install
npm run migrate:schema
npm run auth:admin
npm run dev
```

`npm run auth:admin` creates or promotes the admin account using
`ADMIN_EMAIL` and `ADMIN_PASSWORD` from `.env`.

> `npm run seed` is **local development only**. Do not run it on a production
> database. Use `npm run data:clear-demo` to remove demo data.

Backend URLs:

```text
http://localhost:4000
http://localhost:4000/api/v1/health
```

### 3. Configure the frontend

```powershell
cd C:\web_dev\fix_mate\fix_mate_front_end
# Create .env.local or .env with the values below.
npm install
npm run dev
```

Frontend URL:

```text
http://localhost:3000
```

### 4. Sign in

Use the admin account created by `npm run auth:admin`. Customers and technicians
can create their own accounts through the sign-up page.

### 5. Test payments

Use Stripe test card:

```text
4242 4242 4242 4242
Any future expiry
Any 3-digit CVC
```

For local webhook forwarding:

```powershell
stripe listen --forward-to localhost:4000/api/v1/webhooks/stripe
```

Put the printed `whsec_...` value into `STRIPE_WEBHOOK_SECRET` and restart the
backend.

### 6. Test uploads

Set:

```env
UPLOAD_DRIVER=imgbb
IMGBB_API_KEY=your_imgbb_key
```

Then upload an avatar or service cover. Files are stored by ImgBB and only the
public URL is saved in MongoDB.

---

## Environment variables

### Backend `.env`

```env
# Server
NODE_ENV=development
PORT=4000

# MongoDB
MONGODB_URI=mongodb://localhost:27017
MONGODB_DB=fixmate
# Optional: custom DNS resolver for mongodb+srv on problematic networks
MONGODB_DNS_SERVERS=

# Better Auth
BETTER_AUTH_SECRET=
BETTER_AUTH_URL=http://localhost:4000
FRONTEND_URL=http://localhost:3000
# Public auth/OAuth origin; blank = FRONTEND_URL when deployed, BETTER_AUTH_URL locally
AUTH_PUBLIC_URL=

# JWT
JWT_SECRET=
JWT_EXPIRES_IN=7d

# Admin account + local demo users
ADMIN_EMAIL=admin@fixmate.dev
ADMIN_NAME=FixMate Admin
ADMIN_PASSWORD=
SEED_PASSWORD=FixMateDemo123!

# Optional Google OAuth
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=

# Stripe test mode
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=

# Uploads
UPLOAD_DRIVER=imgbb
IMGBB_API_KEY=

# Optional S3/R2/MinIO
S3_BUCKET=
S3_REGION=
S3_ACCESS_KEY_ID=
S3_SECRET_ACCESS_KEY=
S3_ENDPOINT=
S3_PUBLIC_URL=
S3_FORCE_PATH_STYLE=false
```

### Required vs optional

| Variable | Required? | Notes |
|---|---|---|
| `MONGODB_URI` | Yes | Atlas or local MongoDB connection string |
| `MONGODB_DB` | Yes | Database name, usually `fixmate` |
| `BETTER_AUTH_SECRET` | Yes | At least 32 characters |
| `BETTER_AUTH_URL` | Yes | Backend origin for API/upload URLs and CORS |
| `FRONTEND_URL` | Yes | Exact frontend origin for CORS/trusted origins |
| `AUTH_PUBLIC_URL` | Optional | Public origin for Better Auth/OAuth callbacks. Blank = `FRONTEND_URL` when deployed, `BETTER_AUTH_URL` locally. Set it to the frontend origin in deployments so the Next rewrite proxies the Google callback. |
| `JWT_SECRET` | Recommended | Falls back to `BETTER_AUTH_SECRET` |
| `JWT_EXPIRES_IN` | Optional | Defaults to `7d` |
| `ADMIN_EMAIL` | Yes | Admin login email |
| `ADMIN_PASSWORD` | Yes for admin | Used by `npm run auth:admin` and admin login |
| `SEED_PASSWORD` | Local demo only | Password for demo technician/customer accounts |
| `STRIPE_SECRET_KEY` | For payments | Leave blank to run without checkout |
| `STRIPE_WEBHOOK_SECRET` | For webhooks | Must be the `whsec_...` signing secret |
| `UPLOAD_DRIVER` | Yes | `local`, `imgbb`, or `s3` |
| `IMGBB_API_KEY` | If `imgbb` | Required by the assignment setup |
| `S3_*` | If `s3` | Bucket/region/credentials/endpoint |
| `GOOGLE_CLIENT_ID/SECRET` | Optional | Enables Google login |

### Frontend `.env.local`

```env
API_URL=http://localhost:4000
NEXT_PUBLIC_API_URL=http://localhost:4000
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
```

> `.env` and `.env.local` are gitignored. Only `.env.example` belongs in Git.

---

## Communicating with the API

### Base URLs

```text
Local:       http://localhost:4000/api/v1
Local aliases: http://localhost:4000/api
```

### Response format

Success:

```json
{
  "data": {},
  "meta": {}
}
```

Error:

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "One or more fields are invalid.",
    "details": []
  }
}
```

### Public endpoints

| Method | Endpoint | Purpose |
|---|---|---|
| `GET` | `/api/v1/health` | Health check |
| `GET` | `/api/v1/meta` | Categories, modes, counts |
| `GET` | `/api/v1/services` | Search/filter/sort/paginate services |
| `GET` | `/api/v1/services/:slug` | Service details |
| `GET` | `/api/v1/services/:slug/reviews` | Reviews + rating distribution |

### Authentication endpoints

| Method | Endpoint | Purpose |
|---|---|---|
| `POST` | `/api/auth/sign-up/email` | Better Auth customer/technician sign-up |
| `POST` | `/api/auth/sign-in/email` | Better Auth sign-in |
| `POST` | `/api/auth/sign-out` | Better Auth sign-out |
| `POST` | `/api/v1/auth/token` | Issue JWT from a valid session |
| `POST` | `/api/v1/auth/logout` | Clear the JWT cookie |

### Customer endpoints

| Method | Endpoint | Purpose |
|---|---|---|
| `POST` | `/api/v1/bookings` | Create a repair request |
| `GET` | `/api/v1/bookings` | List own bookings |
| `GET` | `/api/v1/bookings/:id` | Booking detail |
| `POST` | `/api/v1/bookings/:id/cancel` | Cancel a requested booking |
| `POST` | `/api/v1/bookings/:id/review` | Review a paid completed booking |
| `POST` | `/api/v1/bookings/:id/checkout` | Start Stripe Checkout |
| `GET` | `/api/v1/customer/overview` | Customer stats and recent activity |
| `GET` | `/api/v1/customer/payments` | Payment history |
| `GET` | `/api/v1/payments/:id` | Payment detail |
| `GET` | `/api/v1/payments/verify?session_id=...` | Verify Stripe Checkout return |

### Technician endpoints

| Method | Endpoint | Purpose |
|---|---|---|
| `GET` | `/api/v1/technician/overview` | Stats, earnings, pipeline |
| `GET` | `/api/v1/technician/services` | Own listings |
| `POST` | `/api/v1/technician/services` | Create a listing |
| `GET` | `/api/v1/technician/services/:id` | Own listing detail |
| `PATCH` | `/api/v1/technician/services/:id` | Edit listing |
| `PATCH` | `/api/v1/technician/services/:id/availability` | Pause/unpause |
| `DELETE` | `/api/v1/technician/services/:id` | Soft-delete listing |
| `GET` | `/api/v1/technician/requests` | Assigned jobs |
| `GET` | `/api/v1/technician/requests/:id` | Job detail |
| `POST` | `/api/v1/technician/requests/:id/accept` | Accept job |
| `POST` | `/api/v1/technician/requests/:id/reject` | Reject job |
| `POST` | `/api/v1/technician/requests/:id/start` | Start work |
| `POST` | `/api/v1/technician/requests/:id/complete` | Complete + final amount |

### Admin endpoints

| Method | Endpoint | Purpose |
|---|---|---|
| `GET` | `/api/v1/admin/overview` | Platform stats |
| `GET` | `/api/v1/admin/users` | List users |
| `GET` | `/api/v1/admin/users/:id` | User detail |
| `PATCH` | `/api/v1/admin/users/:id/role` | Change role |
| `POST` | `/api/v1/admin/users/:id/suspend` | Suspend user |
| `POST` | `/api/v1/admin/users/:id/restore` | Restore user |
| `GET` | `/api/v1/admin/services` | All services |
| `GET` | `/api/v1/admin/services/:id` | Service detail |
| `POST` | `/api/v1/admin/services/:id/approve` | Approve service |
| `POST` | `/api/v1/admin/services/:id/reject` | Reject service |
| `GET` | `/api/v1/admin/bookings` | All bookings |
| `GET` | `/api/v1/admin/bookings/:id` | Booking detail |
| `GET` | `/api/v1/admin/payments` | All payments |
| `GET` | `/api/v1/admin/payments/:id` | Payment detail |

### Upload endpoints

| Method | Endpoint | Role | Limit |
|---|---|---|---|
| `POST` | `/api/v1/uploads/avatar` | Any signed-in user | 2 MB |
| `POST` | `/api/v1/uploads/service-cover` | Technician | 5 MB |

Allowed types: JPG, PNG, WebP. MIME is detected from bytes, and only the public
URL is stored.

### Webhook endpoint

```text
POST /api/v1/webhooks/stripe
```

Configure in Stripe Dashboard or forward locally with:

```powershell
stripe listen --forward-to localhost:4000/api/v1/webhooks/stripe
```

### Assignment-compatible API aliases

The exact documented paths are also mounted at `/api`:

```text
POST   /api/bookings
PATCH  /api/bookings/:id/cancel
GET    /api/bookings/my
POST   /api/payments/create-checkout-session
POST   /api/services
PATCH  /api/services/:id
DELETE /api/services/:id
GET    /api/bookings/technician
PATCH  /api/bookings/:id/status
GET    /api/admin/users
PATCH  /api/admin/users/:id/role
PATCH  /api/admin/services/:id/approval
GET    /api/admin/bookings
GET    /api/admin/payments
PATCH  /api/users/profile
GET    /api/services
GET    /api/services/:id
```

### Example: fetch public services

```powershell
curl.exe "http://localhost:4000/api/v1/services?category=AC&sort=price-asc"
```

### Example: sign in and get a JWT

```powershell
curl.exe -c cookies.txt -X POST "http://localhost:4000/api/auth/sign-in/email" `
  -H "Content-Type: application/json" `
  -d "{\"email\":\"you@example.com\",\"password\":\"your-password\"}"

curl.exe -b cookies.txt -c cookies.txt -X POST "http://localhost:4000/api/v1/auth/token"
```

Use the returned token:

```powershell
curl.exe -H "Authorization: Bearer <token>" "http://localhost:4000/api/v1/bookings"
```

The token is also stored in the httpOnly `fixmate_token` cookie, so browser
requests using `credentials: "include"` work without manually attaching a
Bearer header.

---

## Authentication and authorization

### Identity

Better Auth manages users, sessions, password hashing, Google login, and the
admin plugin role.

### Browser sessions

- Sign-up/sign-in create Better Auth session cookies.
- Next.js server components read the session through `/api/auth/get-session`.
- Protected pages redirect signed-out users to `/sign-in`.

### JWT API access

- `POST /api/v1/auth/token` signs a JWT from a valid Better Auth session.
- The JWT is set as an httpOnly `fixmate_token` cookie and returned to API
  clients.
- Requests may use either:
  - `Authorization: Bearer <token>`, or
  - the `fixmate_token` cookie.
- Invalid or expired JWTs return `401`.
- A Better Auth session fallback keeps server-rendered pages working while the
  browser acquires its JWT cookie. A request with an invalid JWT never falls
  back.

### Roles

Roles are resolved from:

1. Better Auth admin plugin `role` (admin), then
2. `accountType` (`technician` or `customer`).

Public sign-up can only choose customer or technician. Admin accounts are
created through `npm run auth:admin`.

### Middleware

| Middleware | Behavior |
|---|---|
| `verifyToken` | Valid JWT or valid Better Auth session required |
| `verifyCustomer` | Customer role required |
| `verifyTechnician` | Technician role required |
| `verifyAdmin` | Admin role required |

### Ownership rules

- Customers can read/cancel only their own bookings.
- Technicians can update only jobs assigned to them.
- Technicians can edit/delete only their own services.
- Payments are visible only to the owning customer or an admin.
- Reviews require the owning customer, `completed` + `paid`, and one review per
  booking.
- Admin routes require the admin role.

### Status rules

The server enforces:

```text
requested → accepted | rejected | cancelled
accepted  → in-progress
in-progress → completed (with finalAmount > 0)
completed + unpaid → paid (Stripe only)
```

Invalid transitions return `409`.

### Payment security

- The server loads `finalAmount` from the booking; it never trusts a client amount.
- Stripe Checkout Session is created server-side.
- The webhook verifies the Stripe signature using the raw request body.
- Payments are inserted idempotently with a unique `bookingId` index.
- Success-page verification and webhook use the same idempotent recorder.

### Rate limiting

- Auth: 40 requests / 15 minutes per IP
- Booking creation: 12 requests / minute per IP
- Uploads: 20 requests / minute per IP

Rate-limited responses use the standard `429 RATE_LIMITED` envelope.

---

## Production data setup

The production database should contain **real data only**. Do not run the demo
seed on production.

### 1. Create the admin account

Set unique production values in the backend `.env`:

```env
ADMIN_EMAIL=your-admin@your-domain.com
ADMIN_NAME=Your Admin Name
ADMIN_PASSWORD=a-strong-unique-password
```

Then create or promote the admin:

```powershell
cd C:\web_dev\fix_mate\fix_mate_back_end
npm run auth:admin
```

### 2. Create real technicians and customers

Use the public sign-up page to create technician and customer accounts.
Technicians add their own services, and the admin approves them from the admin
dashboard.

### 3. Remove demo data if it was ever seeded

```powershell
npm run data:clear-demo
```

This removes:

- Demo users except the configured `ADMIN_EMAIL`
- Demo services
- Demo bookings and payments
- Seeded reviews
- Technician profiles
- Admin audit logs
- Orphan auth accounts and sessions

It preserves the configured admin account so you can still sign in.

### 4. Production checklist

- [ ] `MONGODB_URI` points to the production database.
- [ ] `BETTER_AUTH_URL` and `FRONTEND_URL` use production origins.
- [ ] A real admin exists via `npm run auth:admin`.
- [ ] Real technicians and customers have signed up.
- [ ] Real services are approved by the admin.
- [ ] `UPLOAD_DRIVER=imgbb` and `IMGBB_API_KEY` are set.
- [ ] Stripe webhook is configured for the production API.
- [ ] No demo bookings, payments, or reviews remain.

> `npm run seed` is for local development and automated demo testing only.
> Never run it against a production database.

---

## Testing and quality checks

### Backend

```powershell
cd C:\web_dev\fix_mate\fix_mate_back_end
npm run typecheck
npm run build
npm run migrate:schema
# Optional: restore local demo data before the smoke test
npm run seed
npm run test:smoke
```

> `npm run seed` and `npm run test:smoke` use the local demo dataset. Do not run
> them against a production database.

`npm run test:smoke` checks:

- `401` and `403`
- IDOR / ownership
- Booking state transitions
- Payment idempotency
- Role changes
- Approval reset on edit

### Frontend

```powershell
cd C:\web_dev\fix_mate\fix_mate_front_end
npx tsc --noEmit
npm run lint
npm run build
```

---

## Live API, source code, and deployment

### Source code

| Repository | URL |
|---|---|
| Backend | https://github.com/rehat2007/Assignment-09-backend |
| Frontend | https://github.com/rehat2007/Assignment-09-frontend- |

### Live API

The API is currently running locally:

```text
http://localhost:4000/api/v1/health
```

A stable production API has **not been deployed yet**. After deployment, the
production URL will be added here:

```text
https://api.your-domain.com/api/v1/health
```

### Deployment checklist

1. Create a MongoDB Atlas cluster and set `MONGODB_URI`.
2. Deploy the Express API to Render/Railway/Fly.io.
3. Set backend environment variables on the host.
4. Set `BETTER_AUTH_URL` and `FRONTEND_URL` to the production origins, and set
   `AUTH_PUBLIC_URL` to the frontend origin so OAuth callbacks go through the
   Next rewrite. Register `<frontend>/api/auth/callback/google` in Google
   Console when Google login is enabled.
5. Deploy the Next.js frontend to Vercel.
6. Set `API_URL` and `NEXT_PUBLIC_API_URL` on the frontend host.
7. Add the production frontend origin to CORS and Better Auth trusted origins.
8. Add the production Stripe webhook:
   `https://api.your-domain.com/api/v1/webhooks/stripe`
9. Set `UPLOAD_DRIVER=imgbb` and `IMGBB_API_KEY` on the backend host.
10. Run on the production database:
    ```powershell
    npm run migrate:schema
    ```
11. Set `ADMIN_EMAIL`, `ADMIN_PASSWORD`, and `ADMIN_NAME`, then create the real
    admin:
    ```powershell
    npm run auth:admin
    ```
12. Sign up real technicians and customers through the UI.
13. Have technicians add real services and approve them from the admin dashboard.
14. Do **not** run `npm run seed` on production.
15. Test signup, login, booking, payment, review, upload, and reload behavior.

### Known limitations

- Production deployment is pending.
- The four core collections contain the Assignment 9 compatibility fields; the
  optional `reviews`, `technicianProfiles`, and `auditLogs` collections remain as
  feature extensions.
- ImgBB requires a real image; tiny 1×1 test images may be rejected.
- The demo seed is for local development only.

---

## License

This project was built for Assignment 9. Add a license here if you plan to
publish it publicly.
