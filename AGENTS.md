# AGENTS.md

FixMate backend: Express 5 API in TypeScript (ESM), MongoDB, Better Auth + JWT,
Stripe, and pluggable image storage. `README.md` has the full feature/API
overview; trust `package.json`, `.env.example`, and `src/config/env.ts` where
they differ.

## Commands

- `npm run dev` — `tsx watch src/index.ts` on `PORT` (default 4000).
- `npm run typecheck` — the primary/only static check; there is no unit-test
  runner, linter, or CI config.
- `npm run build` then `npm start` — build emits `dist/src/` **and**
  `dist/scripts/` (`rootDir: "."`); `start` runs `dist/src/index.js`.
- `npm run migrate:schema` — backfills Assignment 9 compatibility fields; run
  after schema changes and on deploy.
- `npm run auth:admin` — creates/promotes `ADMIN_EMAIL`; requires an
  `ADMIN_PASSWORD` of at least 8 characters.
- `npm run seed`, `npm run data:clear-demo`, `npm run test:smoke` are
  **local/demo-database only**. Never point them at production.
- `npm run test:smoke` needs a seeded DB, a running server at `BETTER_AUTH_URL`,
  and configured Stripe. It signs in the demo users, creates temporary data, and
  cleans up. Run `npm run seed` first.

## Setup / environment gotchas

- `.env` is loaded by `src/config/env.ts`. Startup (and every script) throws if
  `BETTER_AUTH_SECRET` is missing or shorter than 32 chars.
- `UPLOAD_DRIVER` defaults to `local`; files land in gitignored
  `data/uploads` and are served at `/api/v1/uploads/files/...`. `imgbb`/`s3`
  need their extra variables. The README's ImgBB setup is optional, not the
  default.
- `BETTER_AUTH_URL` is the backend origin (API/upload URLs and CORS);
  `FRONTEND_URL` is the allowed frontend origin for CORS/trusted origins.
- `AUTH_PUBLIC_URL` is Better Auth's public `baseURL` (OAuth callbacks). Leave it
  blank to use `FRONTEND_URL` when deployed and `BETTER_AUTH_URL` locally. In
  deployments set it to the frontend origin so Google redirects to
  `<frontend>/api/auth/callback/google`, the Next rewrite proxies the callback,
  and the session cookie lands on the frontend host.
- Vercel does not reliably set `NODE_ENV` for Express apps. Use `isDeployed`
  from `src/config/env.ts` (`NODE_ENV=production` or `VERCEL=1`) for production
  behavior; do not add `NODE_ENV=production` on Vercel because npm then skips
  devDependencies.
- If `mongodb+srv://` fails on Windows, set `MONGODB_DNS_SERVERS=1.1.1.1`
  (handled in `src/db/mongo.ts`).
- The Mongo client forces IPv4 (`family: 4`) and a 15s selection timeout;
  Vercel can advertise IPv6 without a working route, and Atlas cold starts can
  exceed 5s.

## Architecture conventions

- `src/index.ts` defines middleware order. Better Auth (`/api/auth/*splat`) and
  the Stripe webhook (raw body) must be mounted **before** `express.json()`.
- Better Auth's `baseURL` is `authPublicUrl`, deliberately separate from
  `BETTER_AUTH_URL`; don't collapse them or deployments lose the frontend OAuth
  callback/proxy while upload URLs still need the backend origin.
- Routes stay thin; business rules live in `src/services/`, Zod schemas in
  `src/validation/`, and Mongo access through `src/db/collections.ts`.
- Validate with `validateBody`/`validateQuery`/`validateParams`, then read with
  `getValidatedBody`/`getValidatedQuery`/`getValidatedParams`.
- Responses use `{ data, meta }` (`ok`, `paginated`) or
  `{ error: { code, message, details } }` (`fail`). Throw `ApiError`; don't
  hand-roll error envelopes.
- Both `/api/v1/...` and the legacy `/api/...` aliases in `src/routes/compat.ts`
  use the same service layer. Change services, not just one router.
- Browser requests prefer the current Better Auth session, then fall back to the
  `fixmate_token` JWT cookie; explicit Bearer JWTs still take precedence. A stale
  JWT from an older account must not override the active session. Use
  `verifyToken`, `verifyCustomer`, `verifyTechnician`, `verifyAdmin`. Admin comes
  from Better Auth `role`; otherwise `accountType` decides customer vs technician.

## Data / domain gotchas

- **Mixed `_id` types:** Better Auth collections (`user`, `account`, `session`)
  use MongoDB `ObjectId`; domain documents (`services`, `bookings`, `payments`,
  `reviews`, `technicianProfiles`) use string IDs (`randomUUID()`). Convert
  strings to `ObjectId` only when querying Better Auth users.
- `services`, `bookings`, and `payments` intentionally store canonical fields
  plus Assignment 9 compatibility aliases (`image`, `basePrice`,
  `approvalStatus`, `customerPhone`, `stripeSessionId`, etc.). Keep both sets in
  sync when writing; `npm run migrate:schema` backfills old documents.
- Booking transitions are enforced by atomic `findOneAndUpdate` filters:
  `requested -> accepted | rejected | cancelled`, `accepted -> in-progress`,
  `in-progress -> completed` (final amount > 0), then paid only via Stripe.
  Keep ownership/status filters server-side; never trust a client amount.
- Public catalog only shows `approval: "approved"`, `available: true`,
  `deletedAt: null`. Editing an approved/rejected service resets it to
  `pending`.
- Payments are idempotent: one payment per booking (unique `bookingId`) and
  unique Stripe session/intent IDs. The webhook verifies the signature from the
  raw body.
- Uploads are limited to JPEG/PNG/WebP, detected from bytes; object keys are
  server-generated. Local driver writes under `data/` (gitignored).

## TypeScript style

- ESM + `moduleResolution: NodeNext`: relative imports must end in `.js` even
  for `.ts` sources (e.g. `import { env } from "./config/env.js"`).
- `strict` and `noUncheckedIndexedAccess` are enabled; indexed access can be
  `undefined`. `tsconfig.json` includes both `src/` and `scripts/`.
- TypeScript is pinned to 5.9.x for Vercel compatibility; TypeScript 7 breaks
  Vercel's compiler-API typecheck. Keep `typeRoots` explicit so generated
  configs outside the repo can still resolve `@types/node`.
- Keep the explicit function casts for `helmet` (`src/index.ts`) and
  `express-rate-limit` (`src/middleware/rate-limit.ts`): Vercel's checker can
  resolve dual ESM/CJS types as a namespace instead of a callable default.
