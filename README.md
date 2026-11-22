# Kiddough Safe Pro: field service app (basic version)

This app is **only for Safe Pros and the Kiddough team**. Customers never visit it: they stay on the official Kiddough Shopify store, where a booking page and two product buttons send their request here.

```
Kiddough Shopify store (customers)            Safe Pro app (this project, on Vercel)
  ├─ Product page: [Book installation]          ├─ /api/requests   receives each request
  │                [Book servicing]  ─────┐      ├─ /admin          Kiddough team assigns a Safe Pro
  └─ /pages/home-care booking form ───────┴────▶ └─ /pro            Safe Pro does the job
        (shows booking ID + completion code)      Nothing is ever written back to Shopify.
```

| Part | URL | Who uses it | Login |
|---|---|---|---|
| Safe Pro app (installable PWA) | `/pro` (the root `/` opens it) | Field agents / installers | Mobile number + OTP |
| Admin dashboard | `/admin` | Kiddough team | Email + password |
| Request endpoint | `/api/requests`, `/api/options` | The Kiddough store's booking page | Allowed websites only |

## Connecting the Kiddough Shopify store

The code to paste is in [shopify/](shopify/). Neither file edits theme code, and both go on a **copy** of the live theme first. To install with the **Shopify CLI** through a collaborator account instead, follow [shopify/README.md](shopify/README.md).

1. **Booking page:** in Shopify, Online Store → Pages → Add page, title **Home Care** (URL `/pages/home-care`). In the theme editor open that page, Add section → **Custom Liquid**, and paste [shopify/home-care-page.liquid](shopify/home-care-page.liquid).
   It loads services, prices, cities and time slots from this app, pre-fills logged-in customers' details, sends the request, and shows the **booking ID and the 4-digit completion code** the customer gives the Safe Pro when the work is done.
2. **Two product buttons:** theme editor → Products → Default product → Product information → Add block → **Custom Liquid**, and paste [shopify/product-buttons.liquid](shopify/product-buttons.liquid). It adds **Book installation** and **Book servicing**, which open the booking page with the product, variant and SKU filled in.
   To show them on collection product cards instead, see the note at the top of that file (that needs a small theme code edit).
3. Preview the theme copy, place a test request, and check it appears in **Admin → Bookings**. Then publish.

Requests are accepted from `https://kiddough.in`, `https://www.kiddough.in` and Shopify theme previews (`*.shopifypreview.com`). Add others, such as the store's `.myshopify.com` address, with `ALLOWED_ORIGINS`. They are rate-limited (10 per hour per visitor, 3 per hour per phone number), and a hidden field blocks simple spam bots. **Admin → Settings → Kiddough website connection** shows the endpoint and the last request received.

The website codes `safety_check`, `installation` and `servicing` link the buttons to services; change prices and codes in Admin → Settings.

## Trying it out: demo data

1. Log in at `/admin/login` with `ADMIN_EMAIL` / `ADMIN_PASSWORD` from Vercel.
2. **Settings → Demo data → Add demo data.** This creates:
   - Safe Pros: **9000000001** Ravi (approved, Mumbai, online), **9000000002** Sunita (pending, so you can test approval), **9000000003** Arjun (approved, Delhi NCR)
   - 5 bookings marked **Demo**: a new website request, one waiting for Ravi to accept, one scheduled for today, a completed one (with photo, unpaid payout), and a new one in Delhi NCR
3. Open `/pro/login` (another browser or a private window), tap a demo account, then **Send OTP**. The code appears on screen. Demo jobs use completion code **1234**.
4. **Settings → Demo data → Remove demo data** deletes exactly these rows. Do this before real use.

## Demo OTP and Aadhaar verification

SMS and Aadhaar e-KYC are not connected yet, so both run in **demo mode** by default:

- **Mobile OTP** (Safe Pro login and registration): after "Send OTP", the 6-digit code appears in a yellow **Demo mode** box on the same screen, with a "Fill it in for me" button. No SMS is sent.
- **Aadhaar OTP** (Safe Pro registration): enter any 12-digit number starting with 2–9 and the OTP is shown on screen. Nothing is sent to UIDAI, and only the last 4 digits are saved. Admins see "OTP verified (demo)" so they still check the Aadhaar photo by hand.

Codes expire after 10 minutes, allow 5 wrong tries, can be resent after 30 seconds, and are stored only as keyed hashes.

> ⚠️ In demo mode, anyone who knows a Safe Pro's mobile number can log in as them, because the code is shown on screen. Use it for demos and testing only, not with real agents.

**Going live:** connect a DLT-registered SMS/WhatsApp provider in `sendOtpSms` ([lib/providers.ts](lib/providers.ts)) and set `OTP_MODE=live`. For Aadhaar, connect a UIDAI-licensed e-KYC partner (e.g. DigiLocker, Surepass, Signzy) and set `AADHAAR_MODE=live`.

## What it does

**Safe Pro app (mobile-first, installable on Android and iPhone)**
- Register with a mobile number verified by OTP, Aadhaar verified by OTP, city, pincode, experience and an Aadhaar card photo. Only the last 4 Aadhaar digits are stored.
- Log in with mobile number + OTP (no password).
- "Under review" screen until an admin approves.
- Go online/offline. While online and the app is open, location is shared every 5 minutes.
- Job list: new requests, in progress, scheduled. Accept or decline jobs (with a reason).
- Customer phone and full address appear only after the job is accepted. One-tap call and Google Maps.
- Check in at the home (GPS recorded), upload before/after photos, add work notes and measurements.
- Complete the job with the customer's 4-digit code, so a job can't be closed without the customer.
- See which product to install or service (sent by the store), plus the customer's notes.
- Earnings: this month, total, pending payout, paid.

**Admin dashboard**
- Dashboard: unassigned bookings, pending Safe Pros, visits today, revenue, payouts due, website requests this week, city-wise summary.
- Safe Pros: filter by status/city, view the ID document, approve, reject or suspend (with a note the Safe Pro sees), last known location, job stats.
- Bookings: requests from the website arrive automatically with the product and Shopify order number; filter, search, create a booking for phone-in customers, assign or reassign manually, **auto-assign** (same city → same pincode → online → least busy, skipping anyone who declined), cancel, see check-in/out GPS and photos, mark payouts paid, full timeline.
- CSV export of bookings.
- Settings: website connection status, services (website code, customer price, Safe Pro payout), cities, admin users, change password.

## Deploy on Vercel

1. **Put this folder in its own Git repository** and push it to GitHub (or deploy straight from the folder with `npx vercel`).
2. In Vercel, **Add New → Project** and import the repository. Framework: Next.js (detected automatically).
3. In the project's **Storage** tab, add:
   - **Neon (Postgres)**. This sets `DATABASE_URL` / `POSTGRES_URL`.
   - **Blob**, created as a **Private** store. This sets `BLOB_READ_WRITE_TOKEN`. Use private because it stores ID documents and photos from inside customers' homes.
4. In **Settings → Environment Variables**, add:
   - `AUTH_SECRET`: a random string of 32+ characters. Generate one with `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`
   - `ADMIN_EMAIL` and `ADMIN_PASSWORD`: the first admin login.
   - `BLOB_ACCESS=public` only if you created a public Blob store (the default is private).
5. **Redeploy** (Deployments → ⋯ → Redeploy). Environment variables only take effect on a new deployment, and every build runs `scripts/migrate.mjs` first, which creates or updates the tables (safe to run repeatedly).
6. **Open `https://<your-app>.vercel.app/api/health`.** It must show `"ok": true`. If not, it says exactly what is missing (no secret values are shown).
7. Open `https://<your-app>.vercel.app/admin` and log in with `ADMIN_EMAIL` / `ADMIN_PASSWORD`. After that first login the account is stored in the database. Change the password and add teammates under **Settings**.
8. In **Settings → Functions**, set the **Function Region** to the region your database is in (for example Mumbai `bom1` / Singapore `sin1`), so pages load quickly.
9. Optional: add a domain, e.g. `book.kiddough.in`, plus `pros.kiddough.in` pointing to the same project for agents.

### Troubleshooting

"Something went wrong", "We couldn't send the code", or a 500 error almost always means setup is incomplete. Open `/api/health`:

| It says | Fix |
|---|---|
| `auth_secret: missing` | Add `AUTH_SECRET` (32+ random characters) to Environment Variables for **Production**, then redeploy |
| `database: missing` | Connect a database under Storage (Neon), or add `DATABASE_URL`, then redeploy |
| `tables are missing` | Redeploy; the build creates the tables. Or run `npm run db:migrate` locally against the same `DATABASE_URL` |
| `cannot connect: …` | Check the `DATABASE_URL` value (use the pooled connection string) |

Neon / Supabase connection strings work as pasted: settings such as `channel_binding` and `supa` are removed automatically.

> Vercel's free Hobby plan is for non-commercial use. For a live business, use the Pro plan.

## Run locally

```bash
npm install
cp .env.example .env.local    # then fill in DATABASE_URL and AUTH_SECRET
npm run db:migrate
npm run dev                   # http://localhost:3000
```

Without `BLOB_READ_WRITE_TOKEN`, uploaded photos are stored inside the database. That is fine for testing; use Vercel Blob in production.

## Customising

- **Brand colours:** edit the `--color-brand-*` values in [app/globals.css](app/globals.css).
- **Logo / app icon:** replace [public/icon.svg](public/icon.svg) and the drawing in [app/icons/[size]/route.tsx](app/icons/[size]/route.tsx).
- **Starter prices and cities** are placeholders (₹499 / ₹999 / ₹399; Mumbai, Delhi NCR, Bengaluru). Change them in Admin → Settings.

## Not in this basic version (planned next)

These came up in the requirements but need third-party accounts or more build time:

- Real SMS delivery for OTPs and SMS/WhatsApp notifications (needs a TRAI DLT-registered SMS sender or the WhatsApp Business API); OTPs are demo-only for now
- Live Aadhaar e-KYC through a licensed partner; Aadhaar verification is demo-only for now
- Online payments, refunds and automated payouts (e.g. Razorpay); payouts are marked as paid manually for now
- Training videos, MCQ exams and certificates for Safe Pros
- 12-language interface
- Native Android/iOS apps (the PWA covers phones for now)
- Live map of all Safe Pros (last known location links to Google Maps for now)
- Admin roles and permissions (all admins currently have full access)

## Tech

Next.js 16 (App Router, server actions) · React 19 · Tailwind CSS 4 · Postgres via `postgres` · Vercel Blob · JWT sessions in httpOnly cookies (`jose`) · scrypt password hashing.
