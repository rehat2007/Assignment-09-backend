# FixMate — Test Data & Demo Guide

This file contains the test accounts, demo services, bookings, payments, and
suggested flows for testing the entire FixMate website.

---

## 1. Local URLs

| Service | URL |
|---|---|
| Frontend | `http://localhost:3000` |
| Backend | `http://localhost:4000` |
| Backend health | `http://localhost:4000/api/v1/health` |

Start both apps:

```powershell
# Backend
cd C:\web_dev\fix_mate\fix_mate_back_end
npm run dev

# Frontend
cd C:\web_dev\fix_mate\fix_mate_front_end
npm run dev
```

---

## 2. Restore all demo data

Run this whenever the database is empty or the demo data is stale:

```powershell
cd C:\web_dev\fix_mate\fix_mate_back_end
npm run seed
npm run migrate:schema
```

`npm run seed` creates or updates:

- 12 demo users
- Better Auth credential accounts for password login
- 3 technician profiles
- 15 approved services
- 8 public reviews
- 8 demo bookings in every status
- 2 paid demo payments

The seed is idempotent and does not delete unrelated user accounts.

> Re-running the seed resets demo service cover images to `null` and resets the
> demo bookings/payments. Do not re-run it after uploading real demo covers
> unless you are happy to reset them.

---

## 3. Demo accounts

### Password rules

- Technician and customer password: `SEED_PASSWORD` from the backend `.env`.
- Default value: `FixMateDemo123!`
- Admin password: `ADMIN_PASSWORD` from the backend `.env`.

If you changed `SEED_PASSWORD` or `ADMIN_PASSWORD`, use your current values.

### Admin

| Role | Name | Email | Password |
|---|---|---|---|
| Admin | FixMate Admin | `admin@fixmate.dev` | `ADMIN_PASSWORD` from `.env` |

### Technicians

| Name | Email | Password | Specialty |
|---|---|---|---|
| Rakib Hasan | `rakib@fixmate.dev` | `SEED_PASSWORD` | AC, refrigerators, washing machines |
| Sadia Islam | `sadia@fixmate.dev` | `SEED_PASSWORD` | Phones, laptops, MacBook, TV |
| Nayeem Chowdhury | `nayeem@fixmate.dev` | `SEED_PASSWORD` | PC upgrades, electrical, CCTV |

### Customers

| Name | Email | Password |
|---|---|---|
| Ayesha Rahman | `customer@fixmate.dev` | `SEED_PASSWORD` |
| Tanvir Ahmed | `tanvir@mail.com` | `SEED_PASSWORD` |
| Mehedi Hasan | `mehedi@mail.com` | `SEED_PASSWORD` |
| Nusrat Jahan | `nusrat@mail.com` | `SEED_PASSWORD` |
| Farhan Kabir | `farhan@mail.com` | `SEED_PASSWORD` |
| Sumaiya Akter | `sumaiya@mail.com` | `SEED_PASSWORD` |
| Imran Sheikh | `imran@mail.com` | `SEED_PASSWORD` |
| Rifat Chowdhury | `rifat@mail.com` | `SEED_PASSWORD` |

### Quick login summary

```text
Admin:     admin@fixmate.dev        / ADMIN_PASSWORD from .env
Technician: rakib@fixmate.dev       / FixMateDemo123!
Technician: sadia@fixmate.dev       / FixMateDemo123!
Technician: nayeem@fixmate.dev      / FixMateDemo123!
Customer:  customer@fixmate.dev     / FixMateDemo123!
Customer:  tanvir@mail.com          / FixMateDemo123!
```

If a demo password stops working, re-run:

```powershell
cd C:\web_dev\fix_mate\fix_mate_back_end
npm run seed
```

The seed repairs missing Better Auth credential accounts for demo users.

---

## 4. Demo services

There are 15 approved, available services.

| Category | Services |
|---|---|
| Smartphone | iPhone 13 Screen Replacement, Android Battery Replacement |
| Laptop & PC | MacBook Battery & Service, Laptop Overheating & Fan Cleaning, Gaming PC RAM & SSD Upgrade |
| AC | Split AC Deep Cleaning, AC Gas Refill & Leak Test |
| Refrigerator | Refrigerator Cooling Repair, Refrigerator Door Seal Replacement |
| TV | Smart TV Backlight & Panel Repair |
| Washing Machine | Washing Machine Drum Cleaning, Washing Machine Motor Repair |
| Electrical | Home Electrical Wiring Inspection, Ceiling Fan Installation, CCTV Camera Setup |

Each service is public at:

```text
/services
```

---

## 5. Demo bookings

| Booking | Internal ID | Customer | Technician | Service | Status | Payment |
|---|---|---|---|---|---|---|
| `FM-DEMO-1001` | `demo-booking:requested-ac` | Ayesha | Rakib | Split AC Deep Cleaning | `requested` | Unpaid |
| `FM-DEMO-1002` | `demo-booking:accepted-macbook` | Tanvir | Sadia | MacBook Battery & Service | `accepted` | Unpaid |
| `FM-DEMO-1003` | `demo-booking:in-progress-tv` | Ayesha | Sadia | Smart TV Backlight & Panel Repair | `in-progress` | Unpaid |
| `FM-DEMO-1004` | `demo-booking:completed-unpaid-iphone` | Ayesha | Sadia | iPhone 13 Screen Replacement | `completed` | Unpaid · $55 |
| `FM-DEMO-1005` | `demo-booking:completed-paid-ac` | Ayesha | Rakib | AC Gas Refill & Leak Test | `completed` | Paid · $70 |
| `FM-DEMO-1006` | `demo-booking:completed-paid-cctv` | Farhan | Nayeem | CCTV Camera Setup | `completed` | Paid · $80 |
| `FM-DEMO-1007` | `demo-booking:cancelled-washer` | Mehedi | Rakib | Washing Machine Drum Cleaning | `cancelled` | Unpaid |
| `FM-DEMO-1008` | `demo-booking:rejected-fridge` | Nusrat | Rakib | Refrigerator Cooling Repair | `rejected` | Unpaid |

### Booking status coverage

```text
requested:   1
accepted:    1
in-progress: 1
completed:   3 (1 unpaid + 2 paid)
cancelled:   1
rejected:    1
```

---

## 6. Demo payments

| Invoice | Booking | Customer | Technician | Service | Amount | Transaction ID |
|---|---|---|---|---|---|---|
| `INV-FM-DEMO-1005` | `FM-DEMO-1005` | Ayesha Rahman | Rakib Hasan | AC Gas Refill & Leak Test | $70 | `seed_pi_ac_2026` |
| `INV-FM-DEMO-1006` | `FM-DEMO-1006` | Farhan Kabir | Nayeem Chowdhury | CCTV Camera Setup | $80 | `seed_pi_cctv_2026` |

These are **synthetic seed payments**, not real Stripe charges. They do not
appear in the Stripe Dashboard. They populate:

- Customer payment history
- Customer total spent
- Technician earnings
- Admin revenue and transactions

Total demo revenue: **$150**.

---

## 7. What to test

### 7.1 Customer flow

Sign in as:

```text
customer@fixmate.dev
FixMateDemo123!
```

Test:

1. Open **My Bookings**.
2. `FM-DEMO-1001` is `requested` → click **Cancel** and confirm.
3. `FM-DEMO-1003` is `in-progress` → check the timeline.
4. `FM-DEMO-1004` is completed and unpaid → click **Pay now**.
   - Use Stripe test card: `4242 4242 4242 4242`
   - Any future expiry date
   - Any 3-digit CVC
5. `FM-DEMO-1005` is paid and unreviewed → click **Leave a review**.
6. Open **Payment History** and confirm the seeded transactions.
7. Open **Profile** and upload an avatar.
8. Open `/services` and browse/search/filter/sort.
9. Open a service details page and send a new repair request.

Expected:

- Real Stripe payment creates one new payment.
- Booking `FM-DEMO-1004` becomes paid.
- `FM-DEMO-1005` can be reviewed once.
- The review updates the service rating.
- Avatar upload uses ImgBB and returns an `i.ibb.co` URL.

### 7.2 Technician flow

Sign in as:

```text
rakib@fixmate.dev
FixMateDemo123!
```

Test:

1. Open **Requests**.
2. `FM-DEMO-1001` is requested → accept or reject.
3. `FM-DEMO-1005` is completed and paid → check the payment badge.
4. `FM-DEMO-1007` shows cancelled history.
5. `FM-DEMO-1008` shows rejected history.
6. Open **My Services**:
   - Edit a service → approval returns to `pending`.
   - Toggle availability.
   - Delete a service → confirmation modal appears.
7. Add a service with an ImgBB cover.
8. Open the overview and confirm earnings include $70.

Then sign in as:

```text
sadia@fixmate.dev
FixMateDemo123!
```

- `FM-DEMO-1002` is accepted → start work.
- `FM-DEMO-1003` is in-progress → complete it and set a final amount.
- `FM-DEMO-1004` is completed/unpaid → confirm it stays unpaid until the
  customer pays.

Then sign in as:

```text
nayeem@fixmate.dev
FixMateDemo123!
```

- `FM-DEMO-1006` is completed/paid → confirm $80 earnings.

### 7.3 Admin flow

Sign in as:

```text
admin@fixmate.dev
ADMIN_PASSWORD from .env
```

Test:

1. Open **Users**:
   - Change a customer to technician and back.
   - Suspend and restore a user.
   - Confirm self-role change is blocked.
2. Open **Services**:
   - Approve or reject a pending service.
   - Reject an approved service.
   - Re-approve a rejected service.
3. Open **Bookings**:
   - Filter by status.
   - Confirm all 8 demo bookings appear.
4. Open **Transactions**:
   - Confirm both demo payments appear.
   - Confirm total revenue is $150 from seed payments.
5. Open the admin overview:
   - Confirm users, technicians, pending services, bookings, and revenue.

---

## 8. ImgBB test notes

Current upload configuration:

```env
UPLOAD_DRIVER=imgbb
IMGBB_API_KEY=<your real key>
```

Upload limits:

- Avatar: JPG/PNG/WebP, max 2 MB
- Service cover: JPG/PNG/WebP, max 5 MB

Test real images. Extremely small 1×1 images may be rejected by ImgBB with error
code `103`.

---

## 9. Useful commands

```powershell
cd C:\web_dev\fix_mate\fix_mate_back_end

npm run dev             # start API
npm run typecheck       # TypeScript check
npm run build           # compile backend
npm run seed            # restore demo data
npm run migrate:schema  # backfill compatibility fields
npm run test:smoke      # 401/403, IDOR, transitions, payments, roles
```

```powershell
cd C:\web_dev\fix_mate\fix_mate_front_end

npm run dev             # start frontend
npm run lint            # ESLint
npm run build           # production build
npx tsc --noEmit        # TypeScript check
```

---

## 10. Current expected database state

After `npm run seed`:

```text
users:              12
credential accounts: 12
technician profiles: 3
services:           15
bookings:            8
payments:            2
reviews:             8
```

If your counts differ, re-run:

```powershell
npm run seed
npm run migrate:schema
```
