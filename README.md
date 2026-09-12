# Mutiara Cahaya Residence — IPL Management System

Sistem manajemen Iuran Pemeliharaan Lingkungan (IPL) untuk perumahan Mutiara
Cahaya Residence. Next.js 14 (App Router) + TypeScript + Prisma + PostgreSQL
+ Auth.js.

---

## ⚠️ Setup pertama kali (WAJIB dibaca)

Kode ini dikembangkan di sandbox tanpa akses ke `binaries.prisma.sh`, jadi
`prisma generate` / `migrate` / `validate` **belum pernah dijalankan** di
sana. Schema sudah diperiksa manual dan seluruh kode ditulis sesuai tipe
yang akan dihasilkan Prisma, tapi Anda **wajib** menjalankan langkah-langkah
di bawah ini di komputer/server dengan akses internet penuh sebelum
menjalankan aplikasi.

```bash
# 1. Install dependencies
npm install

# 2. Siapkan PostgreSQL, lalu isi DATABASE_URL di .env
cp .env.example .env
# edit .env — isi DATABASE_URL, NEXTAUTH_SECRET (openssl rand -base64 32)

# 3. Generate Prisma Client (mengunduh query engine — butuh internet)
npx prisma generate

# 4. Jalankan migration pertama
npx prisma migrate dev --name init

# 5. Seed data demo (akun login + data master minimal)
npm run db:seed

# 6. Jalankan type-check, lint, build, dan test untuk memastikan semua beres
npm run typecheck
npm run lint
npm run build
npm test

# 7. Jalankan aplikasi
npm run dev
```

Buka http://localhost:3000

### Akun Demo (development only)

| Role        | Email                          | Password      |
|-------------|---------------------------------|---------------|
| Super Admin | admin@mutiaracahaya.test        | `Demo#12345`  |
| Admin       | manager@mutiaracahaya.test      | `Demo#12345`  |
| Resident    | warga@mutiaracahaya.test        | `Demo#12345`  |

**Ganti/nonaktifkan akun ini sebelum deploy ke production.**

---

## FILE STORAGE MIGRATED TO SUPABASE STORAGE (for hosting)

Local-disk file storage (`fs/promises`, `uploads/` folder) worked fine
for local development but **breaks on serverless hosting** like
Vercel — the filesystem there is read-only/ephemeral in production,
so uploaded files would vanish or fail to write. Migrated to Supabase
Storage instead, since this project already uses Supabase for
Postgres — no new provider, no vendor lock-in to whichever platform
hosts the Next.js app itself.

### What changed
- `src/lib/supabase.ts` (new) — lazy server-only Supabase admin
  client (service-role key, bypasses RLS). Lazy on purpose: importing
  this file never throws just because env vars aren't set yet; the
  error only surfaces when something actually tries to touch storage.
- `src/lib/services/file-upload.service.ts` — `saveUploadedFile()` now
  uploads to a private Supabase Storage bucket instead of writing to
  local disk. Same validation (extension/MIME/size), same random
  UUID filename, same subfolder scheme — callers didn't need to
  change. Added `uploadGeneratedFile()` (for server-generated buffers
  like PDFs, no client-upload validation needed) and
  `getSignedFileUrl()` (short-lived, 60s, signed download URL).
- `src/lib/services/receipt.service.ts` — `generateReceiptPdf()` now
  uploads the rendered PDF via `uploadGeneratedFile()` instead of
  `fs.writeFile`.
- `src/app/api/files/[...path]/route.ts` — after the same ownership
  checks as before (unchanged — resident can only reach their own
  files, admin can reach any), the route now **redirects** to a
  signed Supabase URL instead of reading and streaming local bytes.
  The auth gate is identical; only the delivery mechanism changed.
- **Found and removed a genuine bug** in an unrelated, unreferenced
  file (`supabase-admin.service.ts`) from an earlier session that
  attempted this same migration but never got wired up anywhere: it
  used `asserts x is T` on a variable that was only closed over, not
  an actual function parameter — which TypeScript doesn't allow
  (`asserts` type predicates only narrow a function's own parameters
  or `this`). Confirmed nothing referenced it before deleting it,
  rather than trying to fix and wire up a second parallel
  implementation alongside the working one in `src/lib/supabase.ts`.

### Required setup before running with these changes
1. In your Supabase dashboard: **Storage → New bucket** → name it
   exactly `uploads` (or whatever you set `SUPABASE_STORAGE_BUCKET`
   to) → set it **Private** (not public — this app's own auth route
   is the only thing that should ever serve these files).
2. Add to `.env` (see updated `.env.example`):
   ```
   SUPABASE_URL="https://xxxxx.supabase.co"
   SUPABASE_SERVICE_ROLE_KEY="your-service-role-key"
   SUPABASE_STORAGE_BUCKET="uploads"
   ```
   Find both under **Settings → API** in your Supabase dashboard.
   **The service-role key bypasses all Row Level Security — never
   expose it to the browser, never prefix it with `NEXT_PUBLIC_`,
   never commit it.**
3. `UPLOAD_DIR` is no longer used and has been removed from
   `.env.example` — safe to delete from your own `.env` too.

### Verification run in this sandbox
- `npm run lint` — clean
- `npx tsc --noEmit` — zero new errors beyond the standing
  Prisma-stub pattern; the genuine bug in the orphaned duplicate file
  is gone now that the file itself is gone
- `npm test` — same 16/3/4 split as every phase since Phase 9; this
  migration touched no tested logic

---

## SETTINGS PAGE — Built after Phase 9

Follow-up addendum: `/admin/settings` was flagged as still a
placeholder after Phase 9 wrapped up. It was never actually assigned
to any phase in the original roadmap (Phase 9 was scoped to RBAC/
ownership/rate-limiting/testing per the spec's own Phase 9
description) — a genuine planning gap, not an oversight within a
phase. Built now:

- **Informasi Perumahan** (`SystemSetting` key `app.general`) — name/
  address/phone/email used as the header on invoices, receipts, and
  PDF reports. Editable by `SUPER_ADMIN` only (affects every
  document's identity, so a regular `ADMIN` sees it read-only) —
  audit-logged on change.
- **Jatuh Tempo & Denda** — surfaces the same `PenaltyConfig` already
  built in Phase 3, reusing the existing `PenaltyConfigDialog`
  component rather than duplicating the form.
- **Akun Pengurus** (`SUPER_ADMIN` only) — activate/deactivate Admin
  and Super Admin accounts. A super admin can't deactivate their own
  account (checked server-side, not just hidden in the UI). No
  password data is ever read or displayed here.

### Files
- `src/actions/settings.actions.ts` — `getGeneralSettingsAction`,
  `updateGeneralSettings`, `listAdminUsers`, `setAdminUserStatus`
- `src/lib/services/settings.service.ts` — extended with
  `getGeneralSettings`/`setGeneralSettings`
- `src/components/settings/general-settings-form.tsx`,
  `src/components/settings/admin-user-status-toggle.tsx`

---

## BUG FIX — Prisma Decimal passed across the Server→Client boundary

Same root cause as the earlier `onConfirm`/icon bugs — a value that
can't be serialized was passed as a prop from a Server Component to
a `"use client"` component — but this time it wasn't caught by
`tsc` in this sandbox, because the Prisma-stub limitation documented
throughout this README means every `Decimal`-typed field currently
type-checks as `any` here, so TypeScript couldn't flag the mismatch
against each dialog's declared `number | string` prop type. Found via
the browser runtime error, then fixed by manually auditing **every**
`Decimal` field in the schema (`landArea`, `buildingArea`, `amount`
on `IplRate`/`InvoiceItem`/`Payment`/`IncomeTransaction`/
`ExpenseTransaction`, and `iplAmount`/`additionalFee`/`penalty`/
`discount`/`totalAmount` on `Invoice`) against every place it's
passed into a client dialog, not just the one the error pointed at:

- `admin/houses/page.tsx` — `landArea`/`buildingArea` → `HouseFormDialog`
- `admin/finance/page.tsx` — `amount` → `ExpenseFormDialog`
- `admin/ipl-rates/page.tsx` — `amount` → `IplRateFormDialog`
- `resident/payments/page.tsx` — `totalAmount` → `PaymentFormDialog`

All four now wrap the value in `Number(...)` before passing it down,
matching what each dialog already expected in its prop type. Every
other display of a `Decimal` field in this codebase was already going
through `formatRupiah(Number(...))` or similar before reaching JSX
text content, which is not subject to this issue — only object props
passed whole into a child Client Component are.

### One more instance found after shipping the above
`listHousesForSelect()` (used by `ResidentFormDialog`'s house
dropdown) was fetching **entire** `House` rows via `include: { block:
true }`, which pulls `landArea`/`buildingArea` along with everything
else — the dialog only ever used `id`/`houseNumber`/`block.name`.
Fixed properly this time by narrowing the Prisma query itself
(`select` instead of `include`, listing exactly the three fields
needed) rather than converting-then-discarding the Decimal fields
like the other four fixes — since this function's only job is
populating a dropdown, there was no reason to fetch the extra columns
at all. Verified this is the only remaining "fetch full row for a
select dropdown" helper in the codebase; `listBlocks()` (used by the
same house form) has no `Decimal` fields on `Block` at all, so it was
never at risk.

**Takeaway for anyone extending this app**: when adding a new
`Decimal` field to a form dialog's props, always pass
`Number(record.field)`, never the raw Prisma value — and prefer
narrowing the query with `select` when a helper only feeds a
dropdown/select list, rather than fetching (and then converting) full
rows. Don't rely on `tsc` to catch either mistake until `prisma
generate` has actually run, since the un-generated stub silently
types every Prisma field as `any`.

---

## AUDIT LOG PAGE — Built after Settings

Same story as Settings: `/admin/audit-logs` was flagged as still a
placeholder. `AuditLog` rows have actually been written since Phase 2
— nearly every mutating action across the whole app calls
`recordAuditLog()` — the data was there the whole time, just no page
to view it. Built now:

- Filterable by module and action (both derived from distinct values
  actually present in the table, not a hardcoded list — new modules
  automatically show up as filters as soon as they're used)
- Searchable by actor name/email or record ID
- Each row expands (native `<details>`, no client JS needed) to show
  IP address, user agent, and a before/after JSON diff
- **Bug caught and fixed before shipping**: my first draft added a
  module-level blocklist (`isDiffSafeToShow`) meant to hide the
  password-change entry's diff, but it was scoped to the whole
  `PROFILE` module — which would have also hidden legitimate
  phone/email change diffs, not just the password one. The
  `CHANGE_PASSWORD` audit entry already omits `oldValue`/`newValue`
  entirely (per spec §22, checked in `profile.actions.ts`), so the
  extra module-level check was both redundant and overly broad.
  Removed it — the natural absence of the values is what correctly
  hides the password entry's (nonexistent) diff.

### Files
- `src/actions/audit-log.actions.ts` — `listAuditLogs`
- `src/app/(dashboard)/admin/audit-logs/page.tsx`

---

## URGENT SECURITY UPDATE — Next.js CVE-2026-75604 (post Phase 9)

**If you deployed this app before this update, upgrade immediately —
especially if hosted on Windows.**

Next.js 14.2.35 (the version this project was originally built on)
is affected by **CVE-2026-75604 / GHSA-p293-qw3h-jr36**, disclosed
August 25, 2026: an **unauthenticated remote code execution**
vulnerability affecting any Next.js server (App Router + Pages
Router, without Cache Components — which describes this app) hosted
on a **Windows filesystem**. Linux/macOS deployments are not
affected. There is no workaround short of upgrading; a working
exploit is public.

### What changed
- **`next` upgraded to `15.5.24`** (the patched release).
- Next.js 15 makes `params`, `searchParams`, and `headers()` async
  (`Promise`-based) — fixed across **16 page/route files** that
  previously destructured them synchronously, plus
  `src/lib/utils/request-context.ts` (`headers()`) and its **12
  callers** across every `*.actions.ts` file.
- Caught and fixed a bug **I introduced while making that exact
  fix**: three `[id]` detail pages (`admin/invoices/[id]`,
  `admin/complaints/[id]`, `resident/complaints/[id]`) destructured
  the route param as `const { id } = await params`, which **shadowed**
  the `id` locale import from `date-fns/locale` already used in the
  same files for Indonesian date formatting. Renamed to
  `invoiceId`/`complaintId` — caught this because a real `tsc` run
  surfaced `Type 'string' is not assignable to type 'Pick<Locale, ...>'`
  errors, not because I re-derived it by inspection alone.
- `react`/`react-dom` were **not** upgraded to 19 — Next 15.5.24 still
  supports React 18.2+, so this stayed a minimal, targeted fix rather
  than a bigger React major-version migration.
- Re-ran `npm audit` after the upgrade: the Next.js RCE (and the
  other ~20 Next.js CVEs that were bundled into the same advisory
  range) are confirmed gone from the report.
- Bumped `vitest` to `2.1.9` (latest patch in the 2.1.x line) while
  investigating a separately-flagged `vitest` critical advisory —
  this did **not** actually clear that advisory, because the real fix
  requires jumping to `vitest@4.x`, a bigger API-breaking jump than
  the 2.1.x line this project's tests are written against. Accepted as
  a known risk: the advisory only matters if `vitest --ui`'s dev
  server is run and exposed to a network, which this project never
  does (`npm test` = `vitest run`, no UI server). Flagging this
  explicitly rather than silently leaving the version bump looking
  like a full fix.
- `package-lock.json` is intentionally **not** included in the
  downloadable zip — it was generated on Linux and caused an SWC
  lockfile-patching crash on Windows (`Cannot read properties of
  undefined (reading 'os')`). Run `npm install` fresh in your own
  environment to generate a lockfile matching your platform.

### Verification run in this sandbox
- `npm run lint` — clean
- `npx tsc --noEmit` — same confirmed Prisma-stub-only error set as
  every prior phase (spot-checked: zero new errors beyond that
  pattern after this migration)
- `npm test` — same 16 passed / 3 failed (Decimal, documented) / 4
  skipped (ownership template) as before the upgrade — the migration
  didn't change test behavior
- `npm audit` — Next.js critical/high entries gone; remaining items
  are the same categories as before (bundled `postcss` inside `next`,
  `xlsx` with no upstream fix, dev-only tooling)

---

## PHASE STATUS — PHASE 9 (SECURITY & TESTING)

### Completed
- **Rate limiting** (spec §37 — previously the one item on the
  security checklist with zero implementation): `checkRateLimit()`,
  an in-memory token-bucket limiter, wired into the login
  `authorize()` callback — 5 attempts per email per 15 minutes, blunts
  credential-stuffing/brute-force against a single account. Documented
  limitation stated plainly in the code: in-memory state doesn't
  survive a restart or scale across multiple instances — fine for one
  Node process, and the function signature is designed so swapping in
  Redis/Upstash later doesn't touch any call site.
- **Testing** (spec §44) — and this is the phase where I actually ran
  the test suite for real, not just wrote code I expected to work:
  - Refactored `reminder.service.ts` and `invoice.service.ts` so their
    *pure* logic (`daysBetween`, `bucketFor`, `computeDueDate`) no
    longer transitively imports `prisma.ts` — previously, importing
    those functions crashed immediately (`new PrismaClient()` throws
    without a generated client) even though the functions themselves
    touch no database. This is a real testability bug I found and
    fixed this phase, independent of the sandbox limitation.
  - **16 unit tests actually pass, right now, in this sandbox**:
    `daysBetween`/`bucketFor` (9 tests, spec §52's H-7/H-3/H-1/Hari H/
    Overdue timing), `computeDueDate` including leap-year clamping (3
    tests), and the rate limiter (4 tests, including a fake-timers
    test of the window-reset behavior).
  - `calculateInvoiceTotal` (spec §48) has 3 tests written and correct
    — I ran them and they fail with the exact same
    `Prisma.Decimal is not a constructor` error documented in every
    phase since Phase 1, because `Prisma.Decimal` genuinely doesn't
    exist until `prisma generate` runs. This isn't a logic bug; it's
    the same environment ceiling as everywhere else, now demonstrated
    with an actual failing test run instead of just a written claim.
  - A skipped ownership/RBAC test file
    (`ownership-security.test.ts`) documents the pattern spec §44
    asks for (resident A can never reach resident B's data, admin-only
    actions reject a RESIDENT session) with `describe.skip` and
    commented-out mock code — it needs a generated client + seeded
    test database to actually run, which this sandbox can't provide,
    so I didn't pretend otherwise by leaving it unskipped and green.
  - Run everything yourself: `npm test`. Expect 16 passed, 3 failed
    (Decimal), 4 skipped (ownership template) until you've run
    `prisma generate`; after that, only the ownership tests should
    still need manual un-skipping + a seeded test DB.
- **Security checklist review against spec §37** — going through it
  item by item against what's already in the codebase from Phase 1–8:
  Authentication ✅ (NextAuth Credentials + bcrypt), Authorization/RBAC
  ✅ (middleware + `requireAuth/requireRole/requireAdmin/
  requireResident` on every action and route), Password hashing ✅
  (bcrypt, 12 rounds), Input validation ✅ (Zod on every form/action),
  Server-side validation ✅ (never trusts client-only checks — e.g.
  payment amount is re-validated at both submit and verify time),
  Rate limiting ✅ (new this phase), Secure cookies ✅ (NextAuth sets
  `httpOnly`/`secure` automatically based on `NEXTAUTH_URL`'s
  protocol — no code change needed, just deploy behind https), CSRF
  protection ✅ (Next.js Server Actions check the request origin
  automatically; NextAuth's credentials flow has its own CSRF token),
  File upload validation ✅ (extension + MIME + size, Phase 4), Audit
  log ✅ (every mutating action across every phase), API authorization
  ✅ (every Server Action and Route Handler checks the session before
  touching data).

### Database changes
- None.

### API changes
- `src/lib/services/rate-limit.service.ts` (new)
- `src/lib/services/reminder-bucket.util.ts`,
  `src/lib/services/invoice-calculation.util.ts` (new — pure logic
  extracted for testability)
- `src/lib/auth.ts` — rate limit check added to `authorize()`

### UI changes
- None this phase (all backend/testing/security hardening).

### Tests
- `src/lib/services/reminder-bucket.util.test.ts` — 9 passing
- `src/lib/services/invoice-calculation.util.test.ts` — 3 passing
  (`computeDueDate`) + 3 failing on the documented Decimal blocker
- `src/lib/services/rate-limit.service.test.ts` — 4 passing
- `src/lib/services/ownership-security.test.ts` — 4 skipped
  (template, needs generated client + seeded DB)

### Remaining
This was the last phase on the original roadmap. What's left is what
was flagged honestly at each step along the way rather than hidden:
- Run `prisma generate` + `migrate dev` + `db:seed` + `npm run build`
  + `npm test` in your own environment (full internet access) — this
  has been the standing blocker since Phase 1 and nothing in this
  codebase has been able to verify against a real generated client.
- Un-skip and wire up `ownership-security.test.ts` against a seeded
  test database.
- Swap the in-memory rate limiter for Redis/Upstash if you deploy
  across multiple instances.
- Wire a real cron provider (Vercel Cron, etc.) to
  `applyOverduePenalties()` and `checkAndSendDueReminders()` — both
  have been cron-ready since Phase 3/7, currently exposed as
  admin-triggered buttons.
- Swap the WhatsApp/Email/Push notification channel stubs for a real
  provider when you're ready to use them (Phase 7).
- Everything under §26/§27 (payment gateway integration, webhook
  handling) — the schema and `PaymentMethod` enum are ready for it,
  but no real gateway is connected; manual bank transfer + upload is
  the only active payment path, as scoped from Phase 4 onward.

### Known limitation (unchanged, now demonstrated rather than just stated)
Same `prisma generate` sandbox restriction as every phase before this
one. The difference this phase: instead of only reasoning about it,
I ran `npx vitest run` and captured the actual pass/fail output above.

---

## PHASE STATUS — PHASE 8 (REPORTS)

### Completed
- **Laporan Tagihan** (spec §50): total/paid/unpaid/overdue counts and
  amounts, filterable by period.
- **Laporan Pembayaran**: verified-payment count/total, broken down
  by payment method.
- **Laporan Tunggakan**: reuses Phase 3's `listArrears()` (count,
  total, aging buckets) — no duplicate logic.
- **Laporan Keuangan**: reuses Phase 5's `getFinanceSummary()`
  (opening/income/expense/closing) — no duplicate logic.
- **Income vs expense trend chart** (6 months, `recharts`) — the
  "dashboard analytics" part of this phase.
- **Export to Excel/CSV** (spec §36) for all seven listed resources —
  Rumah, Warga, Invoice, Pembayaran, Tunggakan, Pemasukan, Pengeluaran
  — through one generic, reusable `/api/export/[resource]` route
  rather than seven near-duplicate route files. CSV includes a UTF-8
  BOM so Excel renders Indonesian characters correctly; Excel export
  reuses the same column/row definitions so the two formats can never
  drift apart.
- **Export to PDF + Print** for the consolidated "Laporan" itself
  (spec §36's 8th item): `/api/export/report-pdf` renders all four
  report sections into one PDF via `pdfkit`. "Print" is handled by
  the browser's native print on the on-screen report page (with
  `print:hidden` on the toolbar/chart so the printed page only shows
  the report content) rather than a separate code path — this is a
  deliberate scoping choice, not an oversight: building a from-scratch
  print renderer would just re-implement what `window.print()` on a
  clean layout already does correctly.
- Scoping note: per-row PDF export was **not** built for the other six
  resources (only combined-report PDF + CSV/Excel for those) — Excel/
  CSV already satisfy spec §36 for tabular data, and a row-by-row PDF
  table adds real engineering cost for a format admins rarely choose
  over Excel for raw data. Flagging this explicitly rather than
  silently narrowing scope.

### Database changes
- None.

### API changes
- `src/actions/report.actions.ts` — `getInvoiceReport`,
  `getPaymentReport`, `getMonthlyTrend`
- `src/lib/services/export.service.ts` — `rowsToCSV`,
  `rowsToExcelBuffer`, `tableToPdfBuffer` (generic, reusable helpers)
- `src/app/api/export/[resource]/route.ts` — CSV/Excel for 7 resources
- `src/app/api/export/report-pdf/route.ts` — combined report PDF

### UI changes
- `/admin/reports` — real data, no more placeholder; period selector,
  print button, per-section export buttons, trend chart

### Tests
- Still none — Phase 9 per roadmap.

### Remaining (roadmap)
- Phase 9: Security & testing (RBAC/ownership tests, rate limiting,
  wiring a real cron provider to the reminder/penalty functions that
  have been cron-ready since Phase 3/7)

### Known limitation (unchanged)
Same `prisma generate` sandbox restriction — now affecting essentially
every file that touches a Prisma-generated type/enum, which is
expected at this project size. Every error was either already
confirmed in an earlier phase or matches the identical pattern
(missing enum export, missing `WhereInput`, missing `Decimal`,
implicit-`any` from an unresolved return type). No new logic bugs.

---

## PHASE STATUS — PHASE 7 (NOTIFICATION)

### Completed
- **In-app notification inbox**: bell icon in the shared `Topbar`
  (used by both admin and resident layouts) — polls unread count every
  30s, dropdown lists recent notifications, click-to-mark-read,
  "tandai semua dibaca". Full history at `/admin/notifications`
  (resident side uses the bell only, no separate nav item, matching
  the original folder structure which only listed `notifications`
  under `admin/`).
- **Reminder scheduling** (spec §52 — H-7/H-3/H-1/Hari H/Overdue):
  `checkAndSendDueReminders()` (already present from an earlier pass —
  verified correct on audit) checks every unpaid/overdue invoice,
  buckets it by days-until-due, and is **idempotent per calendar
  day** — it checks whether the same resident already got that exact
  reminder today before creating another, so re-running it repeatedly
  never spams anyone. Exposed as an admin-triggered button for now,
  written so a future cron job calls the identical function (spec
  §51).
- **Channel abstraction** (spec §52): `NotificationChannel` interface
  with `send(recipient, payload)`. `InAppChannel` is the only one
  actually wired to the database. `WhatsAppChannel`, `EmailChannel`,
  `PushNotificationChannel` exist as typed stubs that **throw an
  explicit "not connected to a provider" error** rather than silently
  no-op'ing or pretending to succeed — so nothing in this codebase can
  accidentally report "sent" when nothing was actually delivered.
- Fixed a real bug caught during this phase's review before it
  shipped: the new dropdown-menu component referenced a `popover`
  Tailwind color token that was never defined in `tailwind.config.ts`
  (copy-paste artifact from a generic shadcn template) — replaced
  with the `card` token that's actually defined, so the notification
  dropdown renders with a solid background instead of transparent.

### Database changes
- None — Phase 1's `Notification` model already covered this.

### API changes
- `src/actions/notification.actions.ts` — `listMyNotifications`,
  `getUnreadNotificationCount`, `markNotificationRead`,
  `markAllNotificationsRead`, `runDueDateReminders`
- `src/lib/services/notification-channel.service.ts` (new)

### UI changes
- `src/components/shared/notification-bell.tsx` — added to `Topbar`
  for both admin and resident
- `src/components/ui/dropdown-menu.tsx` — new primitive
- `/admin/notifications` — real data, no more placeholder

### Tests
- Still none — Phase 9 per roadmap.

### Remaining (roadmap)
- Phase 8: Reports (PDF/Excel/CSV export, dashboard analytics)
- Phase 9: Security & testing — this is also where a real cron
  provider (Vercel Cron, etc.) would get wired to
  `checkAndSendDueReminders()` and `applyOverduePenalties()` instead
  of the current admin-triggered buttons.

### Known limitation (unchanged)
Same `prisma generate` sandbox restriction. Every new TypeScript error
this phase follows the exact same confirmed pattern — spot-checked, no
new logic bugs (aside from the popover-token CSS bug already fixed
above, which was a build-time/visual issue, not a TS error).

---

## PHASE STATUS — PHASE 6 (RESIDENT FEATURES)

### Completed
- **Complaint**: resident submits (title/category/description/location),
  admin gets notified immediately; admin adds status updates
  (`ComplaintUpdate` — status + message + optional photo), resident
  gets notified on every update; full thread history shown to both
  sides. Ownership enforced the same way as invoices/payments: a
  resident's complaint detail is fetched by `id AND residentId`
  together, never by `id` alone.
- **Announcement**: admin creates/edits/deletes with optional image +
  PDF attachment, publish/expiry dates, and audience targeting (Everyone
  vs Residents-only); resident view only shows currently-live,
  correctly-targeted announcements (`publishAt <= now`, `expiresAt`
  null-or-future, `targetAudience` null-or-RESIDENT) — matches what
  Phase 1's dashboard "Pengumuman Terbaru" card was already reading.
- **Profile**: resident can update their own phone/email (name and
  house are admin-managed, since those affect billing/identity) and
  change their own password (verifies the current password with
  bcrypt before allowing a change; the change itself is audit-logged
  without ever writing a password hash to the log, per spec §22).
- File-serving route extended with two more cases: `complaint-photos/`
  (ownership-checked the same way as payment proofs) and
  `announcements/` (broadly viewable by any authenticated user, since
  these are posters/attachments meant for wide distribution rather
  than personal documents).
- All six pages now have real data: `/admin/complaints`,
  `/admin/complaints/[id]`, `/admin/announcements`,
  `/resident/complaints`, `/resident/complaints/[id]`,
  `/resident/announcements`, `/resident/profile` — Phase 1's
  placeholders are gone for every module now except Notifications,
  Reports, Settings, and Audit Logs (all explicitly Phase 7–9).

### Database changes
- None — Phase 1's schema (`Complaint`, `ComplaintUpdate`,
  `Announcement`) already covered this.

### API changes
- `src/actions/complaint.actions.ts` — `createComplaint`,
  `listMyComplaints`, `getMyComplaintDetail`, `listComplaints`,
  `getComplaintDetail`, `addComplaintUpdate`
- `src/actions/announcement.actions.ts` — `listAnnouncements`,
  `createAnnouncement`, `updateAnnouncement`, `deleteAnnouncement`,
  `listActiveAnnouncementsForResident`
- `src/actions/profile.actions.ts` — `getMyProfile`,
  `updateMyProfile`, `changeMyPassword`
- `src/app/api/files/[...path]/route.ts` — added `complaint-photos/`
  and `announcements/` cases

### UI changes
- `/admin/complaints`, `/admin/complaints/[id]`,
  `/admin/announcements`, `/resident/complaints`,
  `/resident/complaints/[id]`, `/resident/announcements`,
  `/resident/profile` — all real, no more placeholders

### Tests
- Still none — Phase 9 per roadmap.

### Remaining (roadmap)
- Phase 7: Notification (in-app notification list UI — the underlying
  `Notification` rows have been created by every phase since Phase 4;
  Phase 7 builds the inbox/reminder UI and WhatsApp/email abstraction
  on top), plus H-7/H-3/H-1/overdue reminder scheduling
- Phase 8: Reports (PDF/Excel/CSV export, dashboard analytics)
- Phase 9: Security & testing

### Known limitation (unchanged)
Same `prisma generate` sandbox restriction. Every new TypeScript error
this phase follows the exact same confirmed pattern from Phase 1–5 —
spot-checked, no new logic bugs.

---

## PHASE STATUS — PHASE 5 (FINANCE)

### Completed
- **Income**: read-only ledger (rows are created automatically by
  Phase 4's payment verification — never entered by hand, so there's
  no create/edit/delete for income, only a visibility toggle)
- **Expense**: full CRUD, category restricted to the 8 values from
  spec §31 (Keamanan/Kebersihan/Sampah/PJU/Taman/Perbaikan/
  Administrasi/Lainnya), optional receipt upload (reuses the same
  validated file-upload service from Phase 4 — jpg/png/pdf, 5MB,
  random filename), each transaction numbered via the same
  concurrency-safe generator (`EXP/2026/09/0001`)
- **Per-transaction visibility control** (spec §31: "Admin menentukan
  apakah transaksi dapat dipublikasikan"): both `IncomeTransaction`
  and `ExpenseTransaction` carry `isPublic`; admin toggles it per row
- **Financial report** (spec §50): `getFinanceSummary()` computes
  Opening Balance (all transactions before the period) + Income +
  Expense (within the period) + Closing Balance, shown on
  `/admin/finance`
- **Public transparency page** (spec §31): `/resident/transparency`
  shows only aggregated totals (income, expense, balance) and an
  expense-by-category breakdown — built from `isPublic: true` rows
  only, and deliberately **never lists individual transactions**, so
  no house number, resident name, or per-payment amount is exposed to
  other residents even though the admin-side ledger shows all of that
  detail
- Expense receipts are treated as internal financial documents: the
  `/api/files/[...path]` route was extended with an `expense-receipts/`
  case that's **admin-only**, never resident-accessible, even though
  the aggregate category total built from that expense is shown
  publicly
- `/admin/finance` and `/resident/transparency` — real data, no more
  placeholders

### Database changes
- None — Phase 1's schema (`IncomeTransaction`, `ExpenseTransaction`,
  both already had `isPublic`) already covered this.

### API changes
- `src/actions/finance.actions.ts` — `listIncomeTransactions`,
  `setIncomeVisibility`, `listExpenseTransactions`,
  `createExpenseTransaction`, `updateExpenseTransaction`,
  `deleteExpenseTransaction`, `getFinanceSummary`,
  `getPublicTransparency`
- `src/app/api/files/[...path]/route.ts` — added `expense-receipts/`
  case

### UI changes
- `/admin/finance` — summary cards, income ledger (visibility toggle),
  expense ledger (CRUD + visibility toggle + receipt link)
- `/resident/transparency` — aggregate summary + category breakdown,
  no per-transaction detail

### Tests
- Still none — Phase 9 per roadmap.

### Remaining (roadmap)
- Phase 6: Resident features (complaint, announcement — transparency
  itself is now done)
- Phase 7–9 unchanged from before.

### Known limitation (unchanged)
Same `prisma generate` sandbox restriction. All new TypeScript errors
in this phase follow the exact same confirmed pattern — spot-checked,
no new logic bugs.

---

## PHASE STATUS — PHASE 4 (PAYMENT)

### Completed
- **File upload validation** (spec §38): `file-upload.service.ts`
  checks extension AND MIME type AND size (5MB max, jpg/jpeg/png/pdf
  only), stores under a random UUID filename — never the client's
  original filename — outside `/public`.
- **Authenticated file serving**: `/api/files/[...path]` — the only
  way to reach a payment-proof image or receipt PDF. Every request
  re-checks ownership server-side (resident can only fetch files tied
  to their own payment/receipt; admin can fetch any) — never a public
  static URL, per spec §39's "never fetch by ID alone" principle
  extended to files.
- **Payment submission workflow** (spec §24): resident picks an unpaid
  invoice → method (Bank Transfer or Cash — QRIS/VA are modeled in the
  schema for a future gateway but intentionally **not offered** yet
  since no real provider is wired up; spec §26 says don't fake it) →
  amount is locked to the invoice total (spec §25: **no partial
  payment** in this version, enforced server-side, not just
  disabled in the UI) → uploads proof → `Payment` created as
  `PENDING`, invoice flips to `PENDING_VERIFICATION`, all admins get a
  `Notification` row, everything inside one transaction.
- **Verification** (spec §25 — the critical transaction): re-validates
  `amount == invoice.totalAmount` at verify time too (not just at
  submission), then in a single `$transaction`: payment → `VERIFIED`,
  invoice → `PAID` + `paidAt`, an `IncomeTransaction` is created, a
  `Receipt` row is created, and the resident gets notified — any
  failure rolls back all of it. The receipt PDF itself is rendered
  with `pdfkit` **after** the transaction commits (file I/O
  deliberately kept out of the DB transaction) and the row is patched
  with the resulting `pdfUrl`; if PDF rendering fails, verification
  has still succeeded and the receipt can be regenerated later instead
  of the money-critical part failing.
- **Rejection**: reverts the invoice to `UNPAID` or `OVERDUE`
  (whichever it should be based on due date) rather than leaving it
  stuck, notifies the resident with the reason, audit-logged.
- **Payment gateway readiness** (spec §26): `PaymentMethod` enum
  already includes `QRIS`/`VIRTUAL_ACCOUNT` in the schema and nothing
  here hardcodes "manual transfer" into the core Invoice/Payment
  model — swapping in a real provider later is additive, not a
  rewrite.
- UI: `/resident/payments` (payable invoices + "Bayar" dialog + own
  payment history), `/resident/receipts` (list + PDF download via the
  authenticated file route), `/admin/payments` (list + status filter +
  Verify/Reject actions + link to view uploaded proof)

### Database changes
- None — Phase 1's schema (`Payment`, `PaymentProof`, `Receipt`,
  `IncomeTransaction`, `Notification`) already covered this.

### API changes
- `src/actions/payment.actions.ts` — `submitPayment`, `listPayments`,
  `getPaymentDetail`, `verifyPayment`, `rejectPayment`,
  `listMyPayments`, `listMyReceipts`, `listMyPayableInvoices`
- `src/app/api/files/[...path]/route.ts` — authenticated file serving
- `src/lib/services/file-upload.service.ts`,
  `src/lib/services/receipt.service.ts`,
  `src/lib/services/notification.service.ts`

### UI changes
- `/admin/payments`, `/resident/payments`, `/resident/receipts` — real
  data, no more placeholders

### Tests
- Still none — Phase 9 per roadmap.

### Remaining (roadmap)
- Phase 5: Finance (income/expense ledger UI, financial reports —
  `IncomeTransaction` rows are already being created by payment
  verification; Phase 5 builds the ledger/report views on top)
- Phase 6–9 unchanged from before.

### Known limitation (unchanged)
Same `prisma generate` sandbox restriction. All new TypeScript errors
in this phase follow the exact same confirmed pattern from Phase 1–3
(implicit `any` cascading from the un-generated `@prisma/client`
stub) — spot-checked, none are new logic bugs.

---

## PHASE STATUS — PHASE 3 (BILLING)

### Completed
- **Concurrency-safe document numbering** (spec §34): `nextDocumentNumber()`
  uses an atomic Postgres upsert against a per-period counter row
  (`DocumentSequence`), not `count()+1` — format `IPL/2026/09/0001`.
- **Invoice generation** (`generateInvoicesForPeriod`, spec §23): admin
  picks a period → system finds active houses (OWNER_OCCUPIED/RENTED)
  → looks up each house's block's currently-active `IplRate` → creates
  one `UNPAID` invoice per house with the rate **snapshotted** into
  `iplAmount`/`totalAmount` (spec §11/§28: later rate edits never
  retroactively change it) → whole batch runs in one `$transaction`
  (spec §45) → re-running the same period safely skips houses that
  already have an invoice instead of duplicating (enforced by the
  `houseId+periodMonth+periodYear` unique constraint from Phase 1).
  Houses whose block has no active rate are skipped and reported by
  name in the result, not silently dropped.
- **Invoice calculation** (spec §48): `calculateInvoiceTotal()` —
  `Total = (IPL + Additional Fee) + Penalty − Discount`, floored at 0,
  using `Prisma.Decimal` throughout (spec §47 — no JS floating point
  for money).
- **Penalty configuration + application** (spec §28): admin sets due
  day / grace period / penalty type (fixed or %) / amount via
  `PenaltyConfigDialog` (stored in `SystemSetting`); an admin-triggered
  "Cek & Terapkan Denda" action (`applyOverduePenalties`) flips
  past-due `UNPAID` invoices to `OVERDUE` and adds the penalty —
  written as a plain service function so a future cron job (Phase 51)
  can call the exact same code path.
- **Arrears / aging** (spec §49): `listArrears()` computes 1 bulan /
  2 bulan / 3–5 bulan / >5 bulan buckets and a total-outstanding
  figure, all from live `Invoice` rows (`status != PAID AND dueDate <
  today`).
- **Cancel invoice** (spec §40 API list): blocked for already-`PAID`
  invoices; every cancel is audit-logged.
- Admin UI: `/admin/invoices` (real list, search/sort/pagination/status
  filter, Generate + Penalty-Config dialogs) → `/admin/invoices/[id]`
  (full detail: breakdown, due date, payment history, cancel action) →
  `/admin/arrears` (aging summary cards + table + penalty trigger)
- Resident UI: `/resident/invoices` now shows the resident's own real
  invoices (ownership enforced via `requireResident()` + `residentId`
  scoping — never fetched by ID alone, consistent with Phase 1's rule)

### Database changes
- None — Phase 1's schema (`Invoice`, `IplRate`, `DocumentSequence`,
  `SystemSetting`) already covered everything Phase 3 needed.

### API changes (Server Actions)
- `src/actions/invoice.actions.ts` — `listInvoices`, `getInvoiceDetail`,
  `listMyInvoices`, `generateInvoices`, `cancelInvoice`, `listArrears`,
  `runApplyOverduePenalties`, `getPenaltyConfigAction`,
  `updatePenaltyConfig`
- `src/lib/services/invoice.service.ts`,
  `src/lib/services/document-number.service.ts`,
  `src/lib/services/settings.service.ts`

### UI changes
- `/admin/invoices`, `/admin/invoices/[id]`, `/admin/arrears` — real
  data, no more placeholders
- `/resident/invoices` — real data, no more placeholder

### Tests
- Still none — Phase 9 per roadmap. (Invoice-calculation and
  penalty-calculation unit tests are explicitly listed there.)

### Remaining (roadmap)
- Phase 4: Payment (upload bukti, verifikasi admin, receipt PDF) — the
  resident dashboard's "Bayar Sekarang" button and `/resident/payments`
  are still Phase 1 placeholders on purpose; wiring them up is Phase 4.
- Phase 5–9 unchanged from before.

### Known limitation (unchanged)
Same `prisma generate` sandbox restriction as Phase 1–2. I traced every
remaining TypeScript error in this phase back to the same root cause —
even opened the actual stub file Prisma ships pre-generation and
confirmed it literally types `Prisma.TransactionClient` as `any` and
has no `Decimal`/enum/model types at all. Nothing found in this phase
required a logic fix beyond what's already patched.

---

## PHASE STATUS — PHASE 2 (MASTER DATA)

### Completed
- **Block**: `listBlocks`/`createBlock` server actions + `BlockManagerDialog`
  (quick-add UI, embedded in the Houses page toolbar since Block only
  exists to group Houses/IplRates — no dedicated nav item was specced)
- **House**: full CRUD (`house.actions.ts`) — list with search/sort/
  pagination, create, update, delete (blocked if the house still has
  residents or invoices — spec-required referential-integrity guard),
  Excel import (`house-import-dialog.tsx`, upload → parse with SheetJS
  → validate → preview per-row errors → confirm → DB transaction,
  rolls back entirely if any row is still invalid at confirm time)
- **Resident**: full CRUD (`resident.actions.ts`) — list with search/
  sort/pagination, create (with optional "create login account"
  toggle that hashes a password with bcrypt and links a new `User`),
  update, delete (deactivates rather than deletes the linked login
  account to preserve audit-log referential integrity; blocked if the
  resident has invoice/payment history), Excel import
- **IPL Rate**: full CRUD (`ipl-rate.actions.ts`) — per spec §11/§28,
  editing or deleting a rate never touches previously generated
  invoices (invoices snapshot their own `iplAmount`/`totalAmount`);
  delete is blocked if the rate has already been used on an invoice
- Every mutation writes an `AuditLog` entry (action/module/record/old/
  new value, IP, user agent) via `recordAuditLog`, and never logs
  password hashes
- All three admin pages (`/admin/houses`, `/admin/residents`,
  `/admin/ipl-rates`) now render **real data** — the Phase 1 "coming
  soon" placeholders are gone for these three
- Reusable list-page primitives added: `SearchInput`, `SortableHeader`,
  `DataPagination`, `EmptyState`, `ConfirmDeleteButton`, `Table`,
  `Dialog`, `Select` — shared across all three modules and ready for
  Phase 3+ to reuse
- `sonner` toasts wired up for success/error feedback on every action

### Database changes
- No schema changes — Phase 1's schema already modeled these tables
  correctly

### API changes (Server Actions)
- `src/actions/block.actions.ts` — `listBlocks`, `createBlock`
- `src/actions/house.actions.ts` — `listHouses`, `createHouse`,
  `updateHouse`, `deleteHouse`, `importHouses`
- `src/actions/resident.actions.ts` — `listResidents`,
  `listHousesForSelect`, `createResident`, `updateResident`,
  `deleteResident`, `importResidents`
- `src/actions/ipl-rate.actions.ts` — `listIplRates`, `createIplRate`,
  `updateIplRate`, `deleteIplRate`

### UI changes
- `/admin/houses` — real table, search, sort, pagination, create/edit
  dialog, delete confirmation, Excel import, block manager
- `/admin/residents` — same pattern, plus optional login-account
  creation
- `/admin/ipl-rates` — same pattern, plus active/inactive badge based
  on `effectiveFrom`/`effectiveTo`

### Tests
- Still none — Phase 9 per roadmap.

### Remaining (roadmap)
- Phase 3: Billing (generate invoice, penalty, arrears)
- Phase 4: Payment (upload bukti, verifikasi admin, receipt PDF)
- Phase 5: Finance (income/expense, laporan keuangan)
- Phase 6: Resident features (complaint, announcement, transparency)
- Phase 7: Notification (reminder, WhatsApp/email abstraction)
- Phase 8: Reports (PDF/Excel/CSV export, analytics)
- Phase 9: Security & testing

### Known limitation (unchanged from Phase 1)
`prisma generate/validate/migrate` still can't run in this sandbox
(network-blocked). TypeScript shows a batch of `@prisma/client has no
exported member` / implicit-`any` errors that are 100% downstream of
the un-generated client stub — every one of them was individually
traced back to that root cause (not a logic bug) and will disappear
the moment you run `npx prisma generate` for real. Two genuine bugs
*were* found and fixed during this phase: an unsafe union-type access
in the Excel-import preview UI, and a possibly-undefined array index
in the request-context helper — both are patched in this codebase.

---

## PHASE STATUS — PHASE 1 (FOUNDATION)

### Completed
- Project setup: Next.js 14 App Router, TypeScript strict mode, Tailwind,
  shadcn-style UI primitives (Button, Input, Label, Card, Badge)
- PostgreSQL connection via Prisma (`DATABASE_URL`)
- Prisma schema — **semua model dari spesifikasi** (User, Block, House,
  Resident, IplRate, Invoice, InvoiceItem, Payment, PaymentProof, Receipt,
  IncomeTransaction, ExpenseTransaction, Complaint, ComplaintUpdate,
  Announcement, Notification, AuditLog, SystemSetting, DocumentSequence)
  dengan relasi, index, dan constraint unique (`houseId+periodMonth+periodYear`
  pada Invoice; `blockId+houseNumber` pada House) sesuai spesifikasi.
- Authentication: Auth.js (NextAuth) Credentials Provider + bcrypt hashing
  (12 rounds), JWT session (8 jam), server-side validation di `authorize()`
- RBAC: enum `UserRole` (SUPER_ADMIN/ADMIN/RESIDENT), middleware route-level
  protection (`/admin/*`, `/resident/*`), helper `requireAuth/requireRole/
  requireAdmin/requireSuperAdmin/requireResident` untuk Server
  Actions/Route Handlers, dan `requireAuthOrRedirect/requireRoleOrRedirect`
  untuk Server Components
- Admin layout: sidebar lengkap (14 modul sesuai struktur folder), topbar
  dengan sign-out fungsional
- Resident layout: sidebar + bottom nav mobile-first, topbar sign-out
- Login page: form tervalidasi (Zod + React Hook Form), error handling,
  tanpa fake "forgot password" flow (diganti halaman jujur yang mengarahkan
  ke admin, karena reset password mandiri belum dibangun)
- Dashboard Admin: **query database sungguhan** (Prisma aggregate/count) —
  Total Rumah, Total Warga, Tagihan Bulan Ini, Sudah Dibayar, Belum
  Dibayar, Tunggakan, Pemasukan, Pengeluaran, Saldo, Pengaduan Baru,
  Payment Collection Rate. Tidak ada data hardcode — modul billing/finance
  akan menampilkan 0 secara jujur sampai Phase 3–5 mengisi data.
- Dashboard Warga: query database sungguhan, di-scope ke `residentId` milik
  user yang login (tidak pernah mengambil data berdasarkan ID dari client
  tanpa cek kepemilikan)
- Error handling: `global-error.tsx`, `not-found.tsx`, helper
  `apiSuccess`/`apiError` dengan format konsisten
  `{ success, message, code }`, tidak expose stack trace ke client
- Halaman placeholder yang jujur untuk 21 modul yang belum dibangun
  (bukan UI palsu/tombol mati — setiap halaman menyatakan jelas modul apa
  dan akan dibangun di phase berapa)
- Seed script: 1 Super Admin, 1 Admin, 1 Resident + 1 Block + 1 House
  minimal, dengan peringatan jelas bahwa password hanya untuk development

### Database changes
- `prisma/schema.prisma` — full schema (18 model + enum pendukung)
- `prisma/seed.ts` — seed script

### API changes
- `POST/GET /api/auth/[...nextauth]` — NextAuth handler

### UI changes
- `/login`, `/forgot-password`
- `/admin/dashboard` (real data) + 13 placeholder pages
- `/resident/dashboard` (real data) + 7 placeholder pages

### Files created
Lihat struktur folder di `src/` — mengikuti arsitektur pada spesifikasi
(`app/(auth)`, `app/(dashboard)/admin`, `app/(dashboard)/resident`,
`components/ui`, `components/shared`, `lib/`, `prisma/`).

### Tests
- **Belum ada** — unit/integration/security test masuk Phase 9 sesuai
  roadmap. Tidak diklaim selesai.

### Known limitation (environment, bukan bug)
- `prisma generate/validate/migrate` tidak bisa dijalankan di sandbox
  pengembangan karena `binaries.prisma.sh` diblokir jaringan sandbox.
  Schema sudah diverifikasi manual; ESLint bersih. **Wajib** jalankan
  langkah setup di atas sebelum pakai.
- 4 kerentanan npm audit tersisa berasal dari `postcss` yang di-bundle
  di dalam paket `next@14.2.35` sendiri (bukan dependency langsung project
  ini) — hanya bisa diperbaiki dengan upgrade mayor ke Next 16, yang di
  luar scope stack yang diminta. Risiko rendah untuk app ini (celah
  terkait pemrosesan CSS saat build, bukan runtime user-facing).

### Remaining (roadmap)
- Phase 2: Master Data (Block, House, Resident, IPL Rate — CRUD + import Excel)
- Phase 3: Billing (generate invoice, penalty, arrears)
- Phase 4: Payment (upload bukti, verifikasi admin, receipt PDF)
- Phase 5: Finance (income/expense, laporan keuangan)
- Phase 6: Resident features (complaint, announcement, transparency)
- Phase 7: Notification (reminder, WhatsApp/email abstraction)
- Phase 8: Reports (PDF/Excel/CSV export, analytics)
- Phase 9: Security & testing (RBAC test, ownership test, rate limiting, audit log wiring)

**Jangan lanjut ke Phase 2 sebelum Anda menjalankan `prisma generate` +
`migrate` + `seed` + `build` di environment Anda dan memastikan semuanya
berjalan tanpa error**, sesuai prinsip pengembangan pada spesifikasi.
