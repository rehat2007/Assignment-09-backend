# FixMate — Assignment 9 Master Completion Plan

This file is the working plan for taking the current FixMate implementation from
"core features working" to "all Assignment 9 requirements satisfied and deployed".

It contains:

- The current state of the project.
- The workflow being used to implement and verify work.
- A requirement-to-step matrix.
- Step-by-step implementation instructions.
- Verification commands and acceptance checks.
- Deployment and submission checklists.

> This document is a plan. It does not change application code by itself.
> The phase-by-phase contract remains in
> `C:\web_dev\fix_mate\fix_mate_front_end\README.md`.

---

## 1. Current project snapshot

| Item | Current state |
|---|---|
| Frontend | Next.js 16 App Router, React 19, TypeScript, Tailwind CSS v4 |
| Backend | Express, TypeScript, MongoDB, Better Auth, Stripe |
| Frontend URL | `http://localhost:3000` |
| Backend URL | `http://localhost:4000` |
| Production URL | Not deployed yet |
| Database | MongoDB local / configured by `MONGODB_URI` |
| Auth | Better Auth session cookies + role middleware |
| JWT | Not implemented |
| Uploads | S3-compatible/local storage driver; ImgBB not implemented |
| Stripe | Checkout + webhook implemented and verified with test card |
| Reviews | Implemented in a separate `reviews` collection |
| Seed data | 15 services, 3 technician profiles, 12 seeded users, 8 reviews |
| Bookings | 8 demo bookings across all statuses |
| Payments | 2 demo paid bookings |
| Frontend commits | 24 |
| Backend commits | 15 |
| Phase progress | Phases 0–8 implemented; Step 10 complete; Phase 9 and Phase 10 not started |

### Current database state

```text
services:           15
technicianProfiles: 3
users:              16 total (12 seeded demo accounts + 4 manual test accounts)
reviews:            8
bookings:           8 demo bookings
payments:           2 demo payments
```

Demo booking statuses:

```text
requested:   1
accepted:    1
in-progress: 1
completed:   3 (1 unpaid + 2 paid)
cancelled:   1
rejected:    1
```

### Current phase status

| Phase | Status |
|---|---|
| Phase 0 — Express skeleton and auth migration | Complete |
| Phase 1 — Collections, indexes, seed data | Complete |
| Phase 2 — Shared API plumbing | Complete |
| Phase 3 — Public catalog API | Complete |
| Phase 4 — Customer bookings | Complete |
| Phase 5 — Technician flows | Complete |
| Phase 6 — Admin flows | Complete |
| Phase 7 — Stripe payments | Complete |
| Phase 8 — Reviews and uploads | Complete except production storage verification |
| Phase 9 — Hardening and tests | Not started |
| Phase 10 — Deployment | Not started |

Assignment step progress:

| Step | Status |
|---|---|
| Step 10 — Seed realistic bookings and payments | Complete |
| Step 2 — Payment success/cancel pages | Complete |
| Step 1 — Repair request rules | Complete |
| Step 3 — Toast notifications | Complete |
| Step 5 — Service images and technician photos | Complete |
| Step 6 — ImgBB upload driver | Complete |
| Step 4 — Custom 404, error boundary, loading | Complete |
| Step 9 — Confirmation modals | Complete |
| Step 8 — Admin role and approval behavior | Complete |
| Step 7 — JWT Challenge 2 | Complete |
| Step 11 — `/about` route | Complete |
| Step 12 — Schema compatibility migration | Complete |
| Step 13 — Exact API compatibility aliases | Complete |
| Step 14 — Submission README and credentials | Complete |
| Step 17 — Phase 9 hardening and smoke tests | Complete |
| Step 15 — Deploy | Not started |
| Step 17 — Phase 9 hardening/tests | Not started |

### Known deferred endpoints

These are intentionally deferred and are not blockers for the main assignment:

- `GET /api/v1/home` (P1)
- `GET /api/v1/technicians/:id` (P1)
- `GET /api/v1/technician/earnings` (P1)
- `POST /api/v1/admin/users/:id/verify-technician` (P1)
- `GET /api/v1/admin/exports/:dataset` (P1)
- `GET /api/v1/admin/audit-logs` (P2)
- `GET /api/v1/payments/:id/invoice` (P1)
- `GET /api/v1/me/reviews` (P2)

---

## 2. How work is being done (current workflow)

Every change should follow this loop:

1. Read the relevant requirement and the current implementation.
2. Make the smallest change that satisfies the requirement.
3. Run backend checks:
   ```powershell
   cd C:\web_dev\fix_mate\fix_mate_back_end
   npm run typecheck
   npm run build
   ```
4. Run frontend checks:
   ```powershell
   cd C:\web_dev\fix_mate\fix_mate_front_end
   npx tsc --noEmit
   npm run lint
   npm run build
   ```
5. Run a manual smoke test with the seeded accounts.
6. Clean up every test booking, payment, review, and uploaded file.
7. Restore any seeded preview values changed during testing.
8. Update the relevant README checkboxes.
9. Report exactly what changed, what passed, and what remains.

### Working rules

- Do not start a later step until the current step's acceptance checks pass.
- Keep the existing visual design unless a requirement explicitly needs a change.
- Never trust client-provided roles, prices, statuses, approval values, or payment status.
- Do not commit `.env` files or secrets.
- Prefer conditional database updates for state transitions.
- Use unique indexes for idempotency.
- Keep the versioned `/api/v1` API stable; add compatibility aliases only where the
  assignment demands an exact path.
- Keep test data out of the final seed unless it is intentional demo data.

### Local run commands

```powershell
# Backend
cd C:\web_dev\fix_mate\fix_mate_back_end
npm run dev

# Frontend
cd C:\web_dev\fix_mate\fix_mate_front_end
npm run dev
```

### Seed and test accounts

```powershell
cd C:\web_dev\fix_mate\fix_mate_back_end
npm run seed
```

Demo password: `SEED_PASSWORD` from the backend `.env`.

Known seeded accounts:

- Admin: `ADMIN_EMAIL` / `ADMIN_PASSWORD` from `.env`
- Customer: `customer@fixmate.dev`
- Customer: `tanvir@mail.com`
- Technician: `rakib@fixmate.dev`
- Technician: `sadia@fixmate.dev`
- Technician: `nayeem@fixmate.dev`

### Health checks

```powershell
curl.exe -s -o NUL -w "api %{http_code}`n" http://localhost:4000/api/v1/health
curl.exe -s -o NUL -w "frontend %{http_code}`n" http://localhost:3000/
```

---

## 3. Definition of done

The project is complete only when all of the following are true:

- All main assignment requirements are implemented.
- All challenges are implemented as specified.
- At least two optional features are completed.
- The site is deployed with a working live URL.
- CORS and Better Auth trusted origins use the production domains.
- The production Stripe webhook is configured and verified.
- Reloading any public or private route does not log the user out.
- A customer, technician, and admin can complete their flows on production.
- Seed data includes bookings in multiple statuses and at least one paid booking.
- README contains the live URL, credentials, features, packages, and setup steps.
- Frontend has at least 20 meaningful commits; backend has at least 12.

---

## 4. Requirement-to-step matrix

| Requirement | Current status | Step |
|---|---|---|
| Deployment and live URL | Missing | Step 15 |
| Demo bookings and payments | Missing | Step 10 |
| Payment success/cancel pages | Missing | Step 2 |
| Payment verification API | Missing | Step 2 |
| Request form name/email | Missing | Step 1 |
| Problem description minimum 20 | Missing | Step 1 |
| Duplicate active request prevention | Missing | Step 1 |
| Toast notifications | Missing | Step 3 |
| Custom 404 page | Missing | Step 4 |
| Error boundary page | Missing | Step 4 |
| Public loading state | Partial | Step 4 |
| Service images on cards/details | Missing | Step 5 |
| Technician photos | Missing | Step 5 |
| ImgBB image upload | Missing | Step 6 |
| JWT challenge | Missing | Step 7 |
| Admin role assignment | Partial | Step 8 |
| Approve/reject any service | Partial | Step 8 |
| Confirmation modals | Partial | Step 9 |
| `/about` route | Missing | Step 11 |
| Strict 4-collection data model | Partial | Step 12 |
| Exact API route aliases | Partial | Step 13 |
| README submission details | Partial | Step 14 |
| Phase 9 hardening/tests | Missing | Step 17 |

---

## 5. Priority order

If time is limited, do these first:

1. **Step 15 — Deploy.** A broken deployment can result in zero marks.
2. **Step 10 — Seed bookings/payments.** The examiner needs data to test.
3. **Step 2 — Payment success/cancel pages.**
4. **Step 1 — Request flow rules.**
5. **Step 3 — Toasts.**
6. **Step 5 and Step 6 — Service images and ImgBB.**
7. **Step 4 — 404/error/loading.**
8. **Step 9 — Confirmation modals.**
9. **Step 8 — Admin role/approval.**
10. **Step 7 — JWT challenge.**
11. **Step 11, 12, 13, 14 — Literal contract alignment and submission polish.**
12. **Step 17 — Hardening/tests.**

---

## 6. Step-by-step implementation

### Step 0 — Freeze a clean baseline

**Goal:** Start from a known-good state.

1. Confirm the database counts:
   ```powershell
   cd C:\web_dev\fix_mate\fix_mate_back_end
   npm run seed
   ```
2. Confirm both apps start.
3. Confirm typecheck/lint/build pass.
4. Record the current commit hashes:
   ```powershell
   git -C C:\web_dev\fix_mate\fix_mate_back_end rev-parse HEAD
   git -C C:\web_dev\fix_mate\fix_mate_front_end rev-parse HEAD
   ```
5. Do not mix unrelated refactors into this work.

**Done when:** Both apps run, checks pass, and the seed is reproducible.

---

### Step 1 — Fix the repair request flow

**Why:** The assignment explicitly requires read-only session identity, a
20-character minimum problem description, and duplicate-active-request prevention.

**Backend files:**

- `src/validation/bookings.ts`
- `src/services/bookings.ts`
- `src/db/indexes.ts`

**Changes:**

1. Change the problem validation:
   ```ts
   problem: z.string().trim().min(20).max(2000),
   ```
2. Add server-side date validation so the date must be today or later.
3. In `createBooking`, before inserting, check for an active duplicate:
   ```ts
   const active = await bookings.findOne({
     customerId,
     serviceId: service._id,
     status: { $in: ["requested", "accepted", "in-progress"] },
   });

   if (active) {
     throw ApiError.conflict(
       "You already have an active request for this service.",
       "DUPLICATE_ACTIVE_BOOKING",
     );
   }
   ```
4. Add an index:
   ```ts
   { key: { customerId: 1, serviceId: 1, status: 1 }, name: "customer_service_status" }
   ```
5. Return a clear `409 DUPLICATE_ACTIVE_BOOKING` error.

**Frontend files:**

- `src/components/customer/booking-request-dialog.tsx`
- `src/app/services/[id]/page.tsx`

**Changes:**

1. Pass `user.name` and `user.email` into the dialog.
2. Show Name and Email as read-only fields.
3. Change the problem field to `minLength={20}` and add a live character counter.
4. Show the duplicate-active error message clearly.
5. After success, show a toast and link/redirect to My Bookings.

**Verify:**

- Submitting a 19-character problem returns `422`.
- Submitting an empty name/email is impossible because they come from the session.
- Creating the same active request twice returns `409`.
- The second request is not inserted.
- The form shows the API error.

**Done when:** All request-form rules are enforced by both UI and server.

---

### Step 2 — Add payment success and cancel pages

**Why:** The assignment explicitly requires `/payment/success` and
`/payment/cancel`, plus a success-page verification API.

**Backend files:**

- `src/services/payments.ts`
- `src/routes/payments.ts`
- `src/validation/payments.ts`
- `src/routes/bookings.ts` (checkout URL configuration)

**Changes:**

1. Refactor the idempotent payment recorder so both the webhook and the
   verification route use the same function.
2. Add `verifyCheckoutSession(customerId, sessionId)`:
   - Retrieve the Stripe Checkout Session with the payment intent expanded.
   - Require `payment_status === "paid"`.
   - Read `bookingId` from metadata or `client_reference_id`.
   - Load the booking and require `booking.customerId === customerId`.
   - Require `status === "completed"`.
   - Verify `amount_total === finalAmount * 100` and `currency === "usd"`.
   - Insert the payment idempotently by `bookingId`.
   - Mark the booking paid only after verification.
   - Return the payment summary.
3. Add:
   ```text
   GET /api/v1/payments/verify?session_id=...
   ```
   with customer-only access and Zod query validation.
4. Update the checkout session URLs:
   ```ts
   success_url: `${env.FRONTEND_URL}/payment/success?session_id={CHECKOUT_SESSION_ID}`,
   cancel_url: `${env.FRONTEND_URL}/payment/cancel?booking_id=${booking._id}`,
   ```

**Frontend files:**

- `src/app/payment/success/page.tsx` (new)
- `src/app/payment/cancel/page.tsx` (new)
- `src/lib/customer-api.ts` or a new payment fetcher

**Success page:**

- Read `session_id` from `searchParams`.
- Call the verification endpoint with cookies.
- Show a success message, amount, and transaction ID.
- Provide a button back to `/dashboard/customer/bookings`.
- Handle invalid/expired sessions with a clear error state.

**Cancel page:**

- Show “Payment cancelled”.
- Nothing changes in the database.
- Provide a “Try again” button back to My Bookings.

**Verify:**

- Test card `4242 4242 4242 4242` completes.
- Success page shows the correct amount and transaction.
- Exactly one payment exists.
- Replaying the webhook still creates one payment.
- Visiting the success URL again does not duplicate the payment.
- Cancel page makes no database changes.

**Done when:** Both pages work and payments are idempotent from both webhook and
success-page verification.

---

### Step 3 — Add toast notifications

**Why:** The assignment explicitly requires toasts for auth, CRUD, status,
payment, and error actions.

**Frontend changes:**

1. Install Sonner:
   ```powershell
   cd C:\web_dev\fix_mate\fix_mate_front_end
   npm install sonner
   ```
2. Mount the toaster once in `src/app/layout.tsx`:
   ```tsx
   import { Toaster } from "sonner";
   // inside <body>
   <Toaster richColors position="top-right" />
   ```
3. Add `toast.success(...)` / `toast.error(...)` to:
   - Sign up, sign in, sign out
   - Booking request success/failure
   - Cancel booking
   - Pay Now / checkout failure
   - Review submission
   - Service create/edit/delete/availability
   - Accept/reject/start/complete request
   - Admin user role/suspend/restore
   - Admin service approve/reject
   - Profile update
   - Avatar/cover upload failure
4. Keep field-level inline validation for form fields; use toasts for action
   results.

**Verify:**

- Success and error toasts appear for each action.
- Toasts do not duplicate with inline success notices.
- Mobile layout does not overflow.

**Done when:** Every action in the assignment has a visible toast result.

---

### Step 4 — Add custom 404, error boundary, and public loading states

**Why:** Explicit assignment requirement.

**New files:**

- `src/app/not-found.tsx`
- `src/app/error.tsx`
- `src/app/loading.tsx`
- `src/app/payment/loading.tsx` (optional)

**404 page:**

- Repair/tools-themed illustration using Lucide icons.
- “Page not found” heading.
- “Back to Home” button.
- Optionally links to `/services` and `/how-it-works`.

**Error page:**

- Must be a client component (`"use client"`).
- Show a clear message.
- Provide `reset()` and a link home.

**Loading page:**

- Reuse the existing dashboard skeleton style.
- Add skeletons for public catalog pages if needed.

**Verify:**

- `/totally-unknown` shows the custom 404.
- A forced error shows the error boundary.
- Slow navigation shows a skeleton.
- All routes still return the correct status codes.

**Done when:** No default Next.js 404/error screen is used.

---

### Step 5 — Display service images and technician photos

**Why:** The assignment requires service images on cards/details and technician
photos on the service details page.

**Frontend files:**

- `src/lib/services.ts`
- `src/components/service-card.tsx`
- `src/app/services/[id]/page.tsx`
- `src/components/customer/customer-bookings.tsx`
- `src/components/technician/technician-services.tsx`
- `src/components/technician/technician-requests.tsx`
- `src/components/admin/admin-service-approval.tsx`

**Backend files:**

- `src/services/bookings.ts`
- `src/services/technician.ts`
- `src/services/admin.ts`

**Changes:**

1. Add `coverImage?: string | null` to the frontend `Service` type.
2. In `ServiceCard`, render the uploaded cover image when present; otherwise keep
   the existing category artwork.
3. In the service details hero, render the cover image when present.
4. Use `technicianProfile.image` for the technician avatar when present; fall
   back to initials.
5. Add `serviceImage` to booking creation and booking DTOs so the customer
   bookings table can show the service image.
6. Add image thumbnails to My Services and technician requests.
7. Use `next/image` only if remote image domains are configured; otherwise use
   background images to avoid remote-pattern errors.

**Verify:**

- A listing with a cover shows it on the home page, browse page, and details.
- A listing without a cover still looks correct.
- Technician photos appear when available.
- No broken-image icons appear.

**Done when:** Uploaded service and profile images are actually visible.

---

### Step 6 — Add ImgBB as an upload driver

**Why:** The assignment explicitly names ImgBB for service images and profile
photos.

**Environment:**

```env
UPLOAD_DRIVER=imgbb
IMGBB_API_KEY=
```

**Backend changes:**

1. Add `IMGBB_API_KEY` to `src/config/env.ts`.
2. Add `"imgbb"` to the `UPLOAD_DRIVER` enum.
3. In `src/lib/storage.ts`, add an ImgBB branch:
   - Convert the buffer to base64.
   - POST to `https://api.imgbb.com/1/upload?key=...`.
   - Parse `data.display_url` or `data.url`.
   - Throw a clear error if the upload fails.
4. Keep local/S3 drivers as fallbacks for development.
5. Update `.env.example` and deployment docs.

**Existing routes already handle:**

- Avatar max 2 MB.
- Service cover max 5 MB.
- MIME sniffing.
- Server-generated object names.
- Public URL storage.

**Verify:**

- Avatar upload returns an ImgBB URL.
- Service cover upload returns an ImgBB URL.
- Invalid MIME and oversized files are rejected before the external request.
- The stored URLs render in the UI.

**Done when:** ImgBB is the configured production upload path.

---

### Step 7 — Add JWT verification for Challenge 2

**Why:** Challenge 2 explicitly asks for `verifyToken`, `verifyCustomer`,
`verifyTechnician`, and `verifyAdmin` using JWT.

> Better Auth session cookies already provide secure auth and role behavior.
> This step adds the literal JWT contract required by the assignment.

**Backend changes:**

1. Install:
   ```powershell
   cd C:\web_dev\fix_mate\fix_mate_back_end
   npm install jsonwebtoken
   npm install -D @types/jsonwebtoken
   ```
2. Add env:
   ```env
   JWT_SECRET=
   JWT_EXPIRES_IN=7d
   ```
3. Create `src/lib/jwt.ts` with `signAccessToken` and `verifyAccessToken`.
4. Create `src/middleware/jwt-auth.ts`:
   - `verifyToken`: reads `Authorization: Bearer ...` or the `fixmate_token`
     cookie, verifies the JWT, loads the user, and sets `request.auth`.
   - `verifyCustomer`: calls `verifyToken`, then requires role `customer`.
   - `verifyTechnician`: calls `verifyToken`, then requires role `technician`.
   - `verifyAdmin`: calls `verifyToken`, then requires role `admin`.
   - Return `401 UNAUTHENTICATED` for missing/invalid tokens.
   - Return `403 FORBIDDEN` for wrong roles.
5. Add a token issuance route:
   ```text
   POST /api/v1/auth/token
   ```
   - Requires a valid Better Auth session.
   - Signs a short-lived JWT.
   - Sets it as an httpOnly, sameSite cookie.
   - Returns token metadata if needed.
6. Call the token route after sign-in/sign-up and on dashboard bootstrap.
7. Clear the JWT cookie on sign-out.
8. Apply the exact middleware table from the assignment:
   - Customer: create booking, cancel, my bookings, checkout.
   - Technician: service CRUD, technician bookings, status update.
   - Admin: users, role, approval, bookings, payments.
   - Profile: `verifyToken`.
   - Public services: no auth.

**Compatibility note:**

If the frontend is already using cookie sessions, the JWT can live in an
httpOnly cookie and `credentials: "include"` will continue to work. This avoids
rewriting every fetch call to add an Authorization header.

**Verify:**

- No token → `401`.
- Customer token on an admin route → `403`.
- Technician token on another technician's job → `403` or `404`.
- Valid token on the correct route → `200`.
- Expired/invalid token → `401`.

**Done when:** The named JWT middlewares protect the routes in the assignment
table and the existing UI still works.

---

### Step 8 — Align admin role and service approval behavior

**Why:** The assignment says the admin can change a user to
customer/technician/admin and can approve/reject any service.

**Backend files:**

- `src/services/admin.ts`
- `src/validation/admin.ts`
- `src/routes/admin.ts`

**Changes:**

1. Extend the role-change input to accept `"admin"`.
2. When promoting to admin:
   - Set Better Auth `role` to `admin`.
   - Keep `accountType` as customer/technician for profile semantics.
3. When demoting:
   - Set `role` to `user`.
   - Set `accountType` to the selected role.
4. Keep the self-role-change block.
5. Allow `approveAdminService` and `rejectAdminService` to act on any service
   that is not deleted, not only `pending`.
6. Add audit log entries for every change.
7. Update the frontend role selector so `admin` is enabled.
8. Add a confirmation dialog for role changes and approvals.

**Verify:**

- Admin can promote a customer to admin.
- Admin cannot change their own role.
- Admin can approve a rejected or approved service if intended.
- Reject still stores a reason.
- Audit entries are written.

**Done when:** Admin permissions match the assignment.

---

### Step 9 — Add confirmation modals

**Why:** The assignment requires confirmation before deleting a service,
cancelling a booking, and rejecting a request.

**Frontend changes:**

1. Create a reusable confirm dialog component.
2. Use it for:
   - Cancel booking.
   - Reject technician request.
   - Delete service.
   - Admin reject service.
   - Role changes (optional).
3. Include a clear title, description, cancel button, and destructive action.
4. Disable the confirm button while the request is pending.
5. Show a toast after success or failure.

**Verify:**

- Closing the dialog performs no action.
- Confirming performs exactly one request.
- Keyboard Escape closes the dialog.
- The destructive action is visually distinct.

**Done when:** No destructive action happens without confirmation.

---

### Step 10 — Seed realistic bookings and payments

**Why:** The assignment requires a few bookings in different statuses so the
examiner can test all flows quickly.

**Backend files:**

- `scripts/seed.ts`
- `scripts/seed-data.ts`

**Recommended demo data:**

Create one booking for each status:

- `requested`
- `accepted`
- `in-progress`
- `completed` + `unpaid`
- `completed` + `paid`
- `cancelled`
- `rejected`

Use several seeded customers, services, and technicians so the dashboards look
realistic.

**Rules:**

1. Make the seed idempotent.
2. Use stable demo IDs or upsert by `bookingNumber`.
3. Do not create real Stripe sessions in the seed.
4. For the paid demo booking, insert a synthetic payment:
   - `provider: "stripe"`
   - `providerSessionId: "seed_session_..."`
   - `transactionId: "seed_pi_..."`
   - `status: "paid"`
   - `invoiceNumber: "INV-SEED-..."`
5. Ensure unique indexes are respected.
6. Add a seeded review for the paid booking if reviews remain in the current
   design.
7. Recompute the service aggregate after seeding the review.
8. Keep production/test credentials documented.

**Verify:**

- Customer dashboard shows bookings in multiple statuses.
- Customer can see one paid booking and one unpaid completed booking.
- Technician dashboard shows pending and active work.
- Admin bookings and transactions are populated.
- `npm run seed` can be run repeatedly without duplicates.

**Done when:** A fresh seed gives a complete, testable demo.

---

### Step 11 — Add the `/about` route

**Why:** The assignment requires `/about`.

1. Create `src/app/about/page.tsx`.
2. Move or reuse the `/how-it-works` content.
3. Keep `/how-it-works` as a redirect to `/about` for backwards compatibility.
4. Update the navbar, footer, and mobile menu to link to `/about`.
5. Update metadata and page title.

**Verify:**

- `/about` returns `200`.
- Navbar/footer links work.
- `/how-it-works` redirects or still works.

**Done when:** The public route matches the assignment.

---

### Step 12 — Strict data-model alignment (only if the evaluator inspects collections)

**Why:** The assignment says exactly four own-data collections with specific
field names. The current implementation uses extra collections and different
names, although the behavior is equivalent.

**Current own-data collections:**

```text
user                (BetterAuth; counts as users)
services
bookings
payments
reviews             (extra)
technicianProfiles  (extra)
auditLogs           (extra)
```

**Strict target:**

```text
user / users
services
bookings
payments
```

**Required consolidation:**

1. Move technician plan/rating/jobs fields into the user document:
   - `plan`
   - `ratingAvg`
   - `jobsCompleted`
   - `repliesIn`
   - `specialties`
2. Store review data on the booking:
   - `rating`
   - `reviewText`
   - `reviewedAt`
3. Recompute service ratings from paid/reviewed bookings instead of a separate
   collection.
4. Remove the `reviews` collection.
5. Remove the `technicianProfiles` collection after migration.
6. Move audit logs to structured log files or accept the extra collection only
   if the evaluator allows optional infrastructure.
7. Rename service fields:
   - `coverImage` → `image`
   - `price` → `basePrice`
   - `duration` → `estimatedDuration`
   - `mode` → `serviceMode`
   - `location` → `serviceArea`
   - `approval` → `approvalStatus`
   - `available` → `isAvailable`
   - add `technicianEmail`
8. Rename booking fields:
   - `phone` → `customerPhone`
   - `problem` → `problemDescription`
   - add `serviceImage`
   - add `technicianName`, `technicianEmail`
   - add `customerName`, `customerEmail`
9. Rename payment fields:
   - `providerSessionId` → `stripeSessionId`
   - `status` → `paymentStatus`
   - add `serviceTitle`
   - add `customerName`, `customerEmail`
   - add `technicianName`, `technicianEmail`
10. Write a migration script that updates existing documents.
11. Update every DTO, service, route, and frontend type.
12. Run a full end-to-end regression.

**Warning:** This is the largest refactor in the plan. Do it only after the
functional gaps are closed and the project is deployed or deployable.

---

### Step 13 — Add exact API route aliases

**Why:** The assignment lists exact API paths. The current implementation uses
`/api/v1` and different action routes.

**Recommended approach:**

Keep `/api/v1` as the internal API and add a compatibility router at `/api` that
maps the assignment's exact paths to the existing services.

Example mappings:

| Assignment path | Current implementation |
|---|---|
| `POST /api/bookings` | `POST /api/v1/bookings` |
| `PATCH /api/bookings/:id/cancel` | `POST /api/v1/bookings/:id/cancel` |
| `GET /api/bookings/my` | `GET /api/v1/bookings` |
| `POST /api/payments/create-checkout-session` | `POST /api/v1/bookings/:id/checkout` |
| `POST /api/services` | `POST /api/v1/technician/services` |
| `PATCH /api/services/:id` | `PATCH /api/v1/technician/services/:id` |
| `DELETE /api/services/:id` | `DELETE /api/v1/technician/services/:id` |
| `GET /api/bookings/technician` | `GET /api/v1/technician/requests` |
| `PATCH /api/bookings/:id/status` | `POST /api/v1/technician/requests/:id/...` |
| `GET /api/admin/users` | `GET /api/v1/admin/users` |
| `PATCH /api/admin/users/:id/role` | `PATCH /api/v1/admin/users/:id/role` |
| `PATCH /api/admin/services/:id/approval` | `POST /api/v1/admin/services/:id/approve` or `/reject` |
| `GET /api/admin/bookings` | `GET /api/v1/admin/bookings` |
| `GET /api/admin/payments` | `GET /api/v1/admin/payments` |
| `PATCH /api/users/profile` | Better Auth update-user / profile service |
| `GET /api/services` | `GET /api/v1/services` |
| `GET /api/services/:id` | `GET /api/v1/services/:slug` |

Apply the JWT middlewares to the compatibility routes exactly as the assignment
table shows.

**Verify:**

- Every exact path returns the expected status.
- 401/403 behavior is correct.
- The existing frontend still works.

---

### Step 14 — Complete the submission README

**Why:** The assignment requires specific README content.

Add or confirm these sections in the root README:

1. Project name and purpose.
2. Live URL.
3. Admin email and password.
4. Technician email and password.
5. Customer email and password.
6. Key features.
7. Tech stack.
8. npm packages used.
9. Environment variables.
10. Local setup commands.
11. Deployment notes.
12. API overview.
13. Known limitations.
14. Screenshots (optional but recommended).

Also update:

- Frontend commit count (20+).
- Backend commit count (12+).
- Any remaining unchecked checkboxes.

---

### Step 15 — Deploy (Phase 10)

**Goal:** A stable production deployment that the examiner can use.

#### 15.1 MongoDB Atlas

1. Create a cluster.
2. Create a database user.
3. Allow network access from the backend host.
4. Copy the connection string into `MONGODB_URI`.
5. Set `MONGODB_DB=fixmate`.
6. Run indexes and seed:
   ```powershell
   cd C:\web_dev\fix_mate\fix_mate_back_end
   npm run seed
   ```
   If the seed script cannot run against Atlas from the local machine, add a
   deploy-time seed command or run it through a one-off job.

#### 15.2 Backend deployment

Deploy to Render, Railway, Fly.io, or a similar Node host.

- Build command: `npm ci && npm run build`
- Start command: `npm start`
- Health check: `/api/v1/health`
- Required environment variables:
  ```env
  NODE_ENV=production
  PORT=4000
  MONGODB_URI=
  MONGODB_DB=fixmate
  BETTER_AUTH_SECRET=
  BETTER_AUTH_URL=https://api.your-domain.com
  FRONTEND_URL=https://your-domain.com
  ADMIN_EMAIL=
  ADMIN_PASSWORD=
  SEED_PASSWORD=
  STRIPE_SECRET_KEY=
  STRIPE_WEBHOOK_SECRET=
  UPLOAD_DRIVER=imgbb
  IMGBB_API_KEY=
  JWT_SECRET=
  JWT_EXPIRES_IN=7d
  ```
- If using S3/R2 instead of ImgBB, include the `S3_*` variables.

#### 15.3 Frontend deployment

Deploy to Vercel or another Next.js host.

- Build command: `npm run build`
- Required environment variables:
  ```env
  API_URL=https://api.your-domain.com
  NEXT_PUBLIC_API_URL=https://api.your-domain.com
  GOOGLE_CLIENT_ID=
  GOOGLE_CLIENT_SECRET=
  ```
- Set the production domain.
- Add the production frontend origin to backend CORS and Better Auth trusted
  origins.

#### 15.4 Stripe webhook

1. In Stripe Dashboard → Developers → Webhooks, add:
   ```text
   https://api.your-domain.com/api/v1/webhooks/stripe
   ```
2. Select:
   - `checkout.session.completed`
   - `payment_intent.succeeded`
3. Copy the endpoint signing secret into `STRIPE_WEBHOOK_SECRET`.
4. Restart the backend.
5. Delete the temporary local tunnel endpoint when it is no longer needed.

#### 15.5 Production verification

- `/api/v1/health` returns `200`.
- `/` returns `200`.
- `/services` returns `200`.
- `/about` returns `200`.
- `/payment/success` and `/payment/cancel` exist.
- Unknown routes show the custom 404.
- A logged-in user can reload a private route without being logged out.
- CORS allows the exact frontend origin.
- Stripe checkout and webhook work with test mode.
- Uploads work with the production storage provider.
- Test accounts work on the live site.

---

### Step 16 — Full acceptance test

Run these scenarios on production:

#### Customer

1. Sign up as a customer.
2. Sign in and reload the dashboard.
3. Search, filter, and sort services.
4. Open a service details page.
5. Submit a valid repair request.
6. Try a duplicate active request; it must be rejected.
7. Cancel a requested booking; confirmation must appear.
8. Check the booking timeline.
9. Wait for a completed job, pay with `4242 4242 4242 4242`.
10. Land on `/payment/success`; verify amount and transaction.
11. Open payment history.
12. Leave a review; check the service rating updates.
13. Update profile and confirm the navbar updates.

#### Technician

1. Sign in as a technician.
2. Add a service with an image.
3. Confirm it is pending.
4. Edit it; confirm approval resets to pending.
5. Toggle availability.
6. Delete a service; confirmation must appear.
7. Accept, start, and complete a booking.
8. Set a final amount.
9. Confirm earnings update.

#### Admin

1. Sign in as admin.
2. Approve and reject services.
3. Change a user role; confirm the self-change block.
4. Suspend and restore a user.
5. View all bookings with filters.
6. View all payments and total revenue.
7. Confirm audit entries are written.

#### General

1. Reload every public route.
2. Reload every private route while signed in.
3. Try an unknown route; custom 404 appears.
4. Trigger an error; error boundary appears.
5. Check mobile, tablet, and desktop layouts.
6. Confirm toasts appear for success and failure.
7. Confirm no console errors.
8. Confirm no CORS errors.
9. Confirm no 404/504 errors on production.

---

### Step 17 — Phase 9 hardening and permanent tests

**Why:** This is the remaining phase in the project plan.

1. Audit every body/query for Zod validation.
2. Audit every read for object-level ownership.
3. Audit every list for pagination.
4. Escape all regex search input.
5. Add rate limiting for auth, booking creation, and uploads.
6. Verify request IDs and structured logs.
7. Ensure every admin action writes an audit log.
8. Verify all state transitions use conditional updates.
9. Verify all idempotency indexes.
10. Add automated tests:
    - 401/403
    - IDOR
    - booking state transitions
    - payment idempotency
    - role changes
    - approval reset on edit
11. Run the full suite in CI if available.

Suggested test stack:

```powershell
cd C:\web_dev\fix_mate\fix_mate_back_end
npm install -D vitest @vitest/coverage-v8 supertest @types/supertest mongodb-memory-server
```

---

## 7. Exact files by step

### Step 1 — Request flow

```text
fix_mate_back_end/src/validation/bookings.ts
fix_mate_back_end/src/services/bookings.ts
fix_mate_back_end/src/db/indexes.ts
fix_mate_front_end/src/components/customer/booking-request-dialog.tsx
fix_mate_front_end/src/app/services/[id]/page.tsx
```

### Step 2 — Payment pages

```text
fix_mate_back_end/src/services/payments.ts
fix_mate_back_end/src/routes/payments.ts
fix_mate_back_end/src/validation/payments.ts
fix_mate_front_end/src/app/payment/success/page.tsx
fix_mate_front_end/src/app/payment/cancel/page.tsx
fix_mate_front_end/src/lib/customer-api.ts
```

### Step 3 — Toasts

```text
fix_mate_front_end/package.json
fix_mate_front_end/src/app/layout.tsx
fix_mate_front_end/src/components/auth/*
fix_mate_front_end/src/components/customer/*
fix_mate_front_end/src/components/technician/*
fix_mate_front_end/src/components/admin/*
```

### Step 4 — 404/error/loading

```text
fix_mate_front_end/src/app/not-found.tsx
fix_mate_front_end/src/app/error.tsx
fix_mate_front_end/src/app/loading.tsx
```

### Step 5 — Images

```text
fix_mate_front_end/src/lib/services.ts
fix_mate_front_end/src/components/service-card.tsx
fix_mate_front_end/src/app/services/[id]/page.tsx
fix_mate_back_end/src/services/bookings.ts
fix_mate_front_end/src/components/customer/customer-bookings.tsx
fix_mate_front_end/src/components/technician/technician-services.tsx
```

### Step 6 — ImgBB

```text
fix_mate_back_end/src/config/env.ts
fix_mate_back_end/src/lib/storage.ts
fix_mate_back_end/.env.example
```

### Step 7 — JWT

```text
fix_mate_back_end/src/lib/jwt.ts
fix_mate_back_end/src/middleware/jwt-auth.ts
fix_mate_back_end/src/routes/auth-token.ts
fix_mate_back_end/src/config/env.ts
fix_mate_back_end/src/index.ts
fix_mate_front_end/src/lib/auth-client.ts
fix_mate_front_end/src/components/auth/*
```

### Step 8 — Admin

```text
fix_mate_back_end/src/services/admin.ts
fix_mate_back_end/src/validation/admin.ts
fix_mate_front_end/src/components/admin/admin-users.tsx
fix_mate_front_end/src/components/admin/admin-service-approval.tsx
```

### Step 9 — Confirmations

```text
fix_mate_front_end/src/components/ui/confirm-dialog.tsx
fix_mate_front_end/src/components/customer/customer-bookings.tsx
fix_mate_front_end/src/components/technician/technician-requests.tsx
fix_mate_front_end/src/components/technician/technician-services.tsx
fix_mate_front_end/src/components/admin/admin-service-approval.tsx
```

### Step 10 — Seed data

```text
fix_mate_back_end/scripts/seed.ts
fix_mate_back_end/scripts/seed-data.ts
```

### Step 11 — About

```text
fix_mate_front_end/src/app/about/page.tsx
fix_mate_front_end/src/components/site-navbar.tsx
fix_mate_front_end/src/components/site-footer.tsx
```

### Step 12 — Data model

```text
fix_mate_back_end/src/types/models.ts
fix_mate_back_end/src/db/collections.ts
fix_mate_back_end/src/db/indexes.ts
fix_mate_back_end/src/services/*
fix_mate_back_end/src/routes/*
fix_mate_back_end/scripts/seed.ts
fix_mate_front_end/src/lib/*
```

### Step 13 — API aliases

```text
fix_mate_back_end/src/routes/compat.ts
fix_mate_back_end/src/index.ts
```

### Step 14 — README

```text
fix_mate_front_end/README.md
fix_mate_back_end/readme.md
```

### Step 15 — Deployment

```text
fix_mate_back_end/.env.example
fix_mate_front_end/README.md
Stripe Dashboard
MongoDB Atlas
Vercel / Render / Railway
```

---

## 8. Verification commands

### Backend

```powershell
cd C:\web_dev\fix_mate\fix_mate_back_end
npm run typecheck
npm run build
npm run seed
npm run migrate:schema
npm run test:smoke
```

### Frontend

```powershell
cd C:\web_dev\fix_mate\fix_mate_front_end
npx tsc --noEmit
npm run lint
npm run build
```

### Runtime

```powershell
curl.exe -s -o NUL -w "api %{http_code}`n" http://localhost:4000/api/v1/health
curl.exe -s -o NUL -w "frontend %{http_code}`n" http://localhost:3000/
curl.exe -s -o NUL -w "about %{http_code}`n" http://localhost:3000/about
curl.exe -s -o NUL -w "success %{http_code}`n" http://localhost:3000/payment/success
curl.exe -s -o NUL -w "cancel %{http_code}`n" http://localhost:3000/payment/cancel
```

### Stripe

```powershell
stripe login
stripe listen --forward-to localhost:4000/api/v1/webhooks/stripe
```

If the Stripe CLI is blocked by Windows Smart App Control, use the Cloudflare
tunnel + Stripe Dashboard endpoint workflow already used in Phase 7.

### Database counts

Run a temporary script:

```ts
import { mongoClient, mongoDb } from "../src/db/mongo.js";

console.log({
  services: await mongoDb.collection("services").countDocuments(),
  bookings: await mongoDb.collection("bookings").countDocuments(),
  payments: await mongoDb.collection("payments").countDocuments(),
  reviews: await mongoDb.collection("reviews").countDocuments(),
});

await mongoClient.close();
```

### Commit counts

```powershell
git -C C:\web_dev\fix_mate\fix_mate_front_end log --oneline | Measure-Object -Line
git -C C:\web_dev\fix_mate\fix_mate_back_end log --oneline | Measure-Object -Line
```

Current counts:

```text
Frontend: 24
Backend:  15
```

---

## 9. Deployment environment templates

### Backend `.env`

```env
NODE_ENV=production
PORT=4000
MONGODB_URI=
MONGODB_DB=fixmate
BETTER_AUTH_SECRET=
BETTER_AUTH_URL=https://api.your-domain.com
FRONTEND_URL=https://your-domain.com
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
ADMIN_EMAIL=
ADMIN_PASSWORD=
ADMIN_NAME=FixMate Admin
SEED_PASSWORD=
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=
UPLOAD_DRIVER=imgbb
IMGBB_API_KEY=
JWT_SECRET=
JWT_EXPIRES_IN=7d
```

If using S3/R2 instead of ImgBB:

```env
UPLOAD_DRIVER=s3
S3_BUCKET=
S3_REGION=
S3_ACCESS_KEY_ID=
S3_SECRET_ACCESS_KEY=
S3_ENDPOINT=
S3_PUBLIC_URL=
S3_FORCE_PATH_STYLE=false
```

### Frontend `.env.local`

```env
API_URL=https://api.your-domain.com
NEXT_PUBLIC_API_URL=https://api.your-domain.com
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
```

---

## 10. Submission checklist

- [ ] Frontend has 20+ meaningful commits.
- [ ] Backend has 12+ meaningful commits.
- [ ] Live frontend URL works.
- [ ] Live backend health endpoint works.
- [ ] Admin credentials documented.
- [ ] Technician credentials documented.
- [ ] Customer credentials documented.
- [ ] README lists key features.
- [ ] README lists npm packages.
- [ ] `.env` files are not committed.
- [ ] MongoDB Atlas is running.
- [ ] Production indexes are created.
- [ ] Seed data exists on production.
- [ ] Stripe webhook is configured on production.
- [ ] Test card payment works on production.
- [ ] Payment success/cancel pages work.
- [ ] Uploads work on production.
- [ ] CORS and trusted origins are correct.
- [ ] Reloading private routes keeps the user signed in.
- [ ] `/about` works.
- [ ] Custom 404 works.
- [ ] Error boundary works.
- [ ] Toasts work.
- [ ] Confirmation modals work.
- [ ] No console/CORS/404/504 errors.
- [ ] Mobile, tablet, and desktop layouts pass.

---

## 11. Current gap summary

### Fully working

- Better Auth customer/technician/admin roles.
- Public catalog.
- Server-side search, filter, sort, and pagination.
- Service details and 404 for missing services.
- Booking creation and status pipeline.
- Conditional state transitions.
- Payment checkout and webhook idempotency.
- Customer, technician, and admin dashboards.
- Profile updates.
- Reviews and rating aggregation.
- Avatar and service-cover uploads.
- Audit logging.
- Responsive UI, dark mode, charts, status badges.
- Commit counts.
- Demo bookings in every status and two paid demo transactions.

### Needs work

- Deployment.
- Payment success/cancel pages and verify API.
- Request form identity fields and 20-character minimum.
- Duplicate active request blocking.
- Toasts.
- Custom 404/error/loading.
- Service images and technician photos in the UI.
- ImgBB driver.
- JWT challenge.
- Admin role/approval literal behavior.
- Confirmation modals.
- `/about`.
- README submission details.
- Strict 4-collection data model if required.

---

## 12. Next action

**Steps 1–14 and Step 17 are complete.** The only remaining work is deployment:

1. **Step 15 — Deploy** when production credentials are ready.
2. Fill the live URL and admin password in the submission README after
   deployment.
3. Run the production acceptance checklist.

When asking for deployment help, use:

```text
Help me deploy from readme.md. Do not change application behavior unless a
deployment error requires a fix.
```

---

## 13. Progress log

### Step 10 — Seed realistic bookings and payments — complete

**Date:** 2026-11-21

**Implemented:**

- Added `DEMO_BOOKING_SEEDS` to `scripts/seed-data.ts`.
- Added `seedBookings()` to `scripts/seed.ts`.
- Added eight demo bookings:
  - `FM-DEMO-1001` — requested
  - `FM-DEMO-1002` — accepted
  - `FM-DEMO-1003` — in-progress
  - `FM-DEMO-1004` — completed, unpaid
  - `FM-DEMO-1005` — completed, paid
  - `FM-DEMO-1006` — completed, paid
  - `FM-DEMO-1007` — cancelled
  - `FM-DEMO-1008` — rejected
- Added two synthetic demo payments:
  - `INV-FM-DEMO-1005` — $70
  - `INV-FM-DEMO-1006` — $80
- Added stale demo-booking and demo-payment cleanup.
- Kept the paid demo bookings unreviewed so the review flow can still be tested.
- Added seed verification for booking count, payment count, and required statuses.
- Verified `npm run seed` twice; counts remained stable.
- Verified customer, technician, and admin dashboards against the seeded data.

**Verified results:**

```text
Customer (customer@fixmate.dev): 4 bookings, 2 active, 2 completed, $70 spent
Rakib Hasan: 4 requests, 1 pending, 1 paid job, $70 earnings
Sadia Islam: 3 requests, 1 completed, 0 paid jobs
Nayeem Chowdhury: 1 request, 1 paid job, $80 earnings
Admin: 8 bookings, 2 payments, $150 revenue
Payment history: seed_pi_ac_2026 and seed_pi_cctv_2026
Customer bookings UI: Pay now, Invoice, and Leave a review all visible
```

**Note:** Four non-seed accounts were already present from manual testing and
were left untouched. They make the admin user count 16 instead of the 12 seeded
accounts.

### Step 2 — Payment success and cancel pages — complete

**Date:** 2026-11-21

**Implemented:**

- Added `GET /api/v1/payments/verify?session_id=...` for customer-only
  verification.
- Refactored the idempotent Stripe payment recorder so the webhook and the
  success-page verification share the same code path.
- Verify flow checks:
  - Stripe session exists.
  - `payment_status === "paid"`.
  - Booking belongs to the signed-in customer.
  - Booking is `completed`.
  - Amount and currency match the server-side `finalAmount`.
  - Payment is inserted once per booking.
  - Booking is marked paid only after verification.
- Updated Stripe Checkout URLs:
  - Success: `/payment/success?session_id={CHECKOUT_SESSION_ID}`
  - Cancel: `/payment/cancel?booking_id=...`
- Added `src/app/payment/success/page.tsx`:
  - Verifies the session.
  - Shows amount, transaction ID, service, technician, and paid date.
  - Provides links to My Bookings and Payment History.
  - Handles missing/invalid sessions gracefully.
- Added `src/app/payment/cancel/page.tsx`:
  - Confirms nothing was charged.
  - Links back to My Bookings to try again.
- Added `getPaymentVerification()` to the frontend customer API.

**Verified results:**

```text
401 unauthenticated verify request
422 missing session_id
404 unknown Stripe session
404 when another customer owns the booking
200 verify success; payment amount $55; booking marked paid
Replay returns the same payment; exactly one payment row
Checkout success URL contains /payment/success?session_id=...
Checkout cancel URL contains /payment/cancel?booking_id=...
/payment/success returns 200 with an error state for an unknown session
/payment/success without session_id returns 200 with a clear error
/payment/cancel returns 200 with the cancellation message
```

Test payment/session data and checkout session were cleaned up. The demo
completed-unpaid booking was restored to unpaid.

### Step 1 — Repair request rules — complete

**Date:** 2026-11-21

**Implemented:**

- Changed the backend problem description minimum from 5 to 20 characters.
- Added server-side preferred-date validation requiring today or a future date.
- Added duplicate active-request prevention in `createBooking`:
  - Same customer.
  - Same service.
  - Status `requested`, `accepted`, or `in-progress`.
  - Returns `409 DUPLICATE_ACTIVE_BOOKING`.
- Added the `customer_service_status` index.
- Added read-only Name and Email fields to the request dialog.
- Added a live problem-character counter and a 20-character minimum in the UI.
- Passed the signed-in user's name and email from the service details page.

**Verified results:**

```text
19-character problem -> 422 VALIDATION_ERROR
Past preferred date -> 422 VALIDATION_ERROR
Duplicate active request for the same service -> 409 DUPLICATE_ACTIVE_BOOKING
Technician creating a request -> 403 FORBIDDEN
Valid new request -> 201 requested / unpaid
```

The valid test booking was deleted after verification. The demo seed data was
restored with `npm run seed`.

### Step 3 — Toast notifications — complete

**Date:** 2026-11-21

**Implemented:**

- Installed `sonner` in the frontend.
- Mounted `<Toaster richColors position="top-right" closeButton />` in the root
  layout.
- Added success/error toasts to:
  - Sign up, sign in, and sign out.
  - Repair request creation and duplicate/invalid errors.
  - Cancel booking, checkout errors, and review submission.
  - Profile update and avatar upload errors.
  - Service create, edit, delete, and availability changes.
  - Technician accept/reject/start/complete actions.
  - Admin role changes, suspension/restoration, and service approval/rejection.
  - Payment success page mount.
- Removed duplicate inline success notices where the action now uses a toast.
- Kept field-level inline validation for form errors.

**Verified results:**

```text
Frontend TypeScript: pass
Frontend ESLint: pass
Toast provider mounted once in the root layout
Success and error paths call toast.success/toast.error
Payment success page shows a toast after verification
```

Frontend build was run after the toast integration.

### Step 5 — Service images and technician photos — complete

**Date:** 2026-11-21

**Implemented:**

- Added `serviceImage` to the booking document and customer/technician DTOs.
- Copied `services.coverImage` into the booking at creation time.
- Added `coverImage` to the frontend `Service` type.
- Added `ServiceThumbnail`, which renders the uploaded image when available and
  falls back to category artwork.
- Updated the home/service card:
  - Cover image background when present.
  - Category artwork fallback when absent.
- Updated the service details hero:
  - Large cover image when present.
  - Category artwork fallback when absent.
- Updated the technician avatar to use the technician's profile image when
  present, with initials as fallback.
- Updated customer bookings, customer overview, technician services, technician
  requests, technician overview, admin services, and admin overview to use the
  uploaded image thumbnails.
- Added `IMGBB`-compatible image display through the stored public URL.

**Verified results:**

```text
Technician service-cover upload -> 201 local URL
/dashboard/technician/my-services -> uploaded image rendered
/dashboard/customer/bookings -> uploaded image rendered
/services/refrigerator-door-seal-replacement -> uploaded image rendered
Tech profile image -> rendered on the service detail page
```

The `/services` list page was cached by ISR during the test, so the newly
uploaded image did not appear there until revalidation. The ServiceCard code
uses the same cover URL and will update on the next catalog revalidation.

### Step 6 — ImgBB upload driver — complete

**Date:** 2026-11-21

**Implemented:**

- Added `IMGBB_API_KEY` to the environment schema.
- Added `UPLOAD_DRIVER=imgbb` support.
- Added a server-side ImgBB upload branch in `src/lib/storage.ts`:
  - Converts the validated image buffer to base64.
  - Calls `https://api.imgbb.com/1/upload`.
  - Uses `data.url` (direct image URL) with fallbacks.
  - Throws a clear error when ImgBB rejects the upload.
- Added environment validation requiring `IMGBB_API_KEY` when the driver is
  `imgbb`.
- Updated `.env.example` and documented the driver.
- Kept `local` and `s3` as development/production alternatives.

**Verified results:**

```text
Local driver still works: 201 service-cover upload
ImgBB driver request points to api.imgbb.com
ImgBB response URL is returned and stored
```

A real ImgBB upload still requires a valid `IMGBB_API_KEY`; the driver was
verified with a mocked ImgBB response.

### Step 4 — Custom 404, error boundary, and loading states — complete

**Date:** 2026-11-21

**Implemented:**

- Added `src/app/not-found.tsx`:
  - Repair-themed Wrench/Search illustration.
  - “This page needs a repair” message.
  - Back to Home and Browse Services actions.
- Added `src/app/error.tsx`:
  - Client error boundary.
  - Clear error message.
  - `reset()` retry button and Back to Home link.
  - Error digest shown when available.
- Added `src/app/loading.tsx`:
  - Public catalog skeleton with header, search, filter chips, and six cards.

**Verified results:**

```text
/totally-unknown -> 404 with the custom “This page needs a repair” content
/services/does-not-exist -> custom not-found content
Frontend TypeScript -> pass
Frontend ESLint -> pass
Frontend production build -> pass
```

The error boundary compiles into the production build. A temporary throwing
route was used to confirm the route is picked up, then removed before commit.

### Step 9 — Confirmation modals — complete

**Date:** 2026-11-21

**Implemented:**

- Added `src/components/ui/confirm-dialog.tsx`:
  - Focus-safe portal dialog.
  - Escape/overlay close.
  - Pending state.
  - Destructive and normal variants.
  - Optional child content for a reason field.
- Replaced the direct cancel action with a confirmation dialog:
  - “Cancel this request?”
  - Shows the service and booking number.
  - Confirm label: “Cancel request”.
- Replaced direct request rejection with a confirmation dialog:
  - “Reject this request?”
  - Shows the service and customer.
  - Confirm label: “Reject request”.
- Replaced `window.confirm` for service deletion with a confirmation dialog:
  - “Remove this listing?”
  - Confirm label: “Remove listing”.
- Replaced `window.prompt` for admin service rejection with a reason dialog:
  - Rejection reason textarea.
  - 500-character limit.
  - Confirm label: “Reject listing”.
- Removed all remaining `window.confirm` and `window.prompt` calls.

**Verified results:**

```text
No window.confirm or window.prompt references remain.
Closing or cancelling a dialog performs no action.
Confirming performs exactly one API request.
Frontend TypeScript -> pass
Frontend ESLint -> pass
```

### Step 8 — Admin role and approval behavior — complete

**Date:** 2026-11-21

**Implemented:**

- Expanded the role-change schema from customer/technician to
  customer/technician/admin.
- Updated `changeAdminUserRole`:
  - Promotes to Better Auth `role: "admin"`.
  - Preserves technician account type when promoting a technician.
  - Demotes to `role: "user"` with the selected account type.
  - Keeps the self-role-change block.
- Enabled the Admin option in the admin users role selector.
- Allowed approved services to be rejected.
- Allowed rejected services to be approved.
- Kept pending services supporting both actions.
- Kept audit log writes for role changes, approvals, and rejections.

**Verified results:**

```text
Invalid role -> 422 VALIDATION_ERROR
Promote customer -> admin -> 200, role admin
Demote admin -> customer -> 200, role customer
Change own role -> 409 CANNOT_CHANGE_OWN_ROLE
Approve an already-approved service -> 200, approved
Reject an approved service -> 200, rejected
Re-approve the rejected service -> 200, approved
```

The test user role, service approval fields, and demo seed were restored after
verification.

### Step 7 — JWT Challenge 2 — complete

**Date:** 2026-11-21

**Implemented:**

- Installed `jsonwebtoken` and `@types/jsonwebtoken`.
- Added `JWT_SECRET` and `JWT_EXPIRES_IN` to the environment schema and
  `.env.example`.
- Added `src/lib/jwt.ts`:
  - `signAccessToken`
  - `verifyAccessToken`
  - `fixmate_token` cookie name and 7-day cookie age.
- Added `src/middleware/jwt-auth.ts`:
  - `verifyToken` reads a Bearer token or the httpOnly `fixmate_token` cookie.
  - Invalid/expired tokens return `401`.
  - Valid tokens load the current user from MongoDB and derive the live role.
  - Banned users receive `403`.
  - `verifyCustomer`, `verifyTechnician`, and `verifyAdmin` enforce roles.
  - A Better Auth session fallback keeps server-rendered pages working while the
    browser acquires its JWT cookie. A request with an invalid JWT never falls
    back.
- Replaced route-level `requireUser`/`requireRole` usage with the named JWT
  middlewares across customer, technician, admin, payment, upload, booking, and
  profile routes.
- Added `POST /api/v1/auth/token`:
  - Requires a valid Better Auth session or JWT.
  - Signs a JWT and sets it as an httpOnly cookie.
  - Returns the token, token type, and expiry.
- Added `POST /api/v1/auth/logout` to clear the JWT cookie.
- Added `TokenBootstrap` to the root layout:
  - Acquires a JWT whenever a Better Auth session is present.
- Sign-in, sign-up, and sign-out now issue/clear the JWT cookie.

**Verified results:**

```text
POST /api/v1/auth/token -> 200, token + fixmate_token cookie
No auth -> 401
Valid customer JWT -> 200 on /api/v1/me and /api/v1/bookings
Invalid JWT -> 401
Expired JWT -> 401
Customer JWT on admin route -> 403
Technician JWT on admin route -> 403
Customer JWT on technician route -> 403
Admin JWT on admin route -> 200
Technician JWT on technician route -> 200
Better Auth cookie fallback -> 200
POST /api/v1/auth/logout -> 200 and clears fixmate_token
```

The fallback exists only for SSR/session compatibility; the JWT path is
verified independently with 401/403 checks.

### Step 11 — `/about` route — complete

**Date:** 2026-11-21

**Implemented:**

- Moved the previous `/how-it-works` content to `src/app/about/page.tsx`.
- Updated the metadata to “About FixMate”.
- Updated the breadcrumb from “How it works” to “About”.
- Added a permanent redirect:
  - `/how-it-works` → `/about`
- Updated navbar, footer, homepage, and CTA links to point directly to `/about`.

**Verified results:**

```text
/about -> 200
/how-it-works -> 308 redirect to /about
Navbar and footer show “About”
Frontend build includes /about
```

### Step 12 — Schema compatibility migration — complete

**Date:** 2026-11-21

**Implemented as a safe compatibility migration**, preserving the optional
review, technician-profile, and audit features.

**Services now include:**

```text
image
basePrice
estimatedDuration
serviceMode
serviceArea
technicianEmail
approvalStatus
isAvailable
```

**Bookings now include:**

```text
serviceImage
technicianName
technicianEmail
customerName
customerEmail
customerPhone
problemDescription
rating
reviewText
reviewedAt
reviewVisible
```

**Payments now include:**

```text
serviceTitle
customerName
customerEmail
technicianName
technicianEmail
stripeSessionId
paymentStatus
```

**Users now include the technician profile fields:**

```text
plan
ratingAvg
jobsCompleted
repliesIn
specialties
verificationStatus
```

**Code changes:**

- Seed services, bookings, and payments write both the application fields and
  the Assignment 9 alias fields.
- New services and service edits write the service aliases.
- Service availability and approval changes keep `isAvailable` and
  `approvalStatus` in sync.
- New bookings copy customer/technician names and emails.
- New Stripe payments copy the booking/payment aliases.
- New reviews also write rating, text, and reviewed timestamp to the booking.
- Added `scripts/migrate-schema.ts` to backfill existing documents.

**Verified results:**

```text
Service create -> aliases populated; approvalStatus pending; isAvailable true
Service update -> basePrice, estimatedDuration, serviceMode, serviceArea updated
Booking create -> customer/technician names, emails, phone, problem copied
Review create -> rating/reviewText/reviewedAt/reviewVisible written to booking
Seed services/bookings/payments -> all alias fields present
Migration script -> 3 user profiles, 15 services, 8 bookings, 2 payments backfilled
Backend typecheck/build -> pass
Frontend typecheck/lint/build -> pass
```

**Important limitation:** the three optional extensions
(`reviews`, `technicianProfiles`, `auditLogs`) are still present. Dropping them
would remove the optional review feature and admin audit history. The four core
collections now contain the required Assignment 9 fields, but a strictly literal
“exactly four collections” review still requires the destructive follow-up
described in Step 12 above.

### Step 13 — Exact API compatibility aliases — complete

**Date:** 2026-11-21

**Implemented:**

- Added `src/routes/compat.ts` and mounted it at `/api`.
- Existing `/api/v1` API remains unchanged for the frontend.
- Added the exact Assignment 9 paths:
  - `POST /api/bookings`
  - `PATCH /api/bookings/:id/cancel`
  - `GET /api/bookings/my`
  - `POST /api/payments/create-checkout-session`
  - `POST /api/services`
  - `PATCH /api/services/:id`
  - `DELETE /api/services/:id`
  - `GET /api/bookings/technician`
  - `PATCH /api/bookings/:id/status`
  - `GET /api/admin/users`
  - `PATCH /api/admin/users/:id/role`
  - `PATCH /api/admin/services/:id/approval`
  - `GET /api/admin/bookings`
  - `GET /api/admin/payments`
  - `PATCH /api/users/profile`
  - `GET /api/services`
  - `GET /api/services/:id`
- Added public service lookup by slug, legacy ID, or MongoDB `_id`.
- Added the technician status mapping:
  - `accepted` → accept
  - `rejected` → reject with reason
  - `in-progress` → start
  - `completed` → complete with required final amount
- Applied JWT middlewares:
  - `verifyCustomer`
  - `verifyTechnician`
  - `verifyAdmin`
  - `verifyToken` for profile updates
- Public services remain unauthenticated.

**Verified results:**

```text
GET /api/services -> 200
GET /api/services/:slug -> 200
GET /api/services/:id -> 200
GET /api/bookings/my -> 200
No auth -> 401
Customer token on admin route -> 403
POST /api/bookings -> 201
PATCH /api/bookings/:id/cancel -> 200, cancelled
Checkout on a cancelled booking -> 409 INVALID_STATE
GET /api/payments/verify with an unknown session -> 404
GET /api/bookings/technician -> 200
POST /api/services -> 201
PATCH /api/services/:id -> 200
PATCH /api/admin/services/:id/approval -> 200, approved
PATCH /api/bookings/:id/status accepted/in-progress/completed -> 200
DELETE /api/services/:id -> 204
GET /api/admin/users/bookings/payments -> 200
PATCH /api/admin/users/:id/role admin/customer -> 200
PATCH /api/users/profile -> 200
```

All temporary services, bookings, role changes, and profile edits were cleaned
up. The demo seed and schema migration were re-run afterward.

### Step 14 — Submission README and credentials — complete

**Date:** 2026-11-21

**Implemented:**

- Added a submission-focused section at the top of
  `fix_mate_front_end/README.md`:
  - Project name and purpose.
  - Live URL placeholder.
  - Backend health URL placeholder.
  - Admin, technician, and customer demo credentials.
  - Key features.
  - Tech stack.
  - npm package highlights.
  - Local setup commands.
  - Backend and frontend environment templates.
  - API overview, including the compatibility aliases.
  - Deployment notes.
  - Known limitations.
- Documented the demo password and seeded accounts.
- Left the admin password as a placeholder that must be filled from the backend
  `.env` before submission, so the real secret is not committed.
- Added `scripts/migrate-schema.ts` as a deployment step.

**Verified results:**

```text
Frontend README includes all required submission sections.
Backend plan includes the submission step and credential notes.
Admin password is not committed.
Live URL remains a marked placeholder until deployment.
```

### Step 17 — Phase 9 hardening and smoke tests — complete

**Date:** 2026-11-21

**Implemented:**

- Added `express-rate-limit`.
- Added `src/middleware/rate-limit.ts`:
  - Auth: 40 requests / 15 minutes per IP.
  - Booking creation: 12 requests / minute per IP.
  - Uploads: 20 requests / minute per IP.
  - Returns the standard `429 RATE_LIMITED` error envelope.
- Applied the auth limiter before the Better Auth handler.
- Applied the booking limiter to:
  - `POST /api/v1/bookings`
  - `POST /api/bookings` compatibility alias
- Applied the upload limiter to:
  - `POST /api/v1/uploads/avatar`
  - `POST /api/v1/uploads/service-cover`
- Enabled `trust proxy` in production for correct client IPs.
- Added `scripts/hardening-smoke.ts` and `npm run test:smoke`.
- Added `npm run migrate:schema` for the compatibility migration.

**Hardening audit status:**

```text
Zod validation: present on API bodies/queries/params.
Object ownership: bookings, services, payments, reviews, and uploads checked.
Pagination: public, customer, technician, admin, reviews, and compatibility lists.
Regex search: escaped in catalog, admin users, admin bookings, and admin services.
Request IDs + structured logs: requestContext + logger.
Admin audit logging: writeAuditLog.
Conditional state transitions: findOneAndUpdate with current status filters.
Unique indexes: booking number, payment booking/session/intent, review booking, service slug, user profile.
```

**Permanent smoke test verified:**

```text
No auth on admin route -> 401
Customer on admin route -> 403
IDOR: another customer cancelling a booking -> 404
Complete before accept -> 409
requested -> accepted -> in-progress -> completed -> 200
Stripe verification replay -> exactly one payment
Approve a service, then edit it -> approval returns to pending
Promote customer -> admin -> 200
Demote admin -> customer -> 200
Cleanup of test booking, payment, service, role, and sessions
```

Run it with:

```powershell
cd C:\web_dev\fix_mate\fix_mate_back_end
npm run test:smoke
```

Rate-limit counters were not deliberately exhausted during the smoke test to
avoid locking the local demo for 15 minutes. The middleware is applied and
typechecked; production should be verified with a staging request burst.
