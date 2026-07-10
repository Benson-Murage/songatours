
# Receipts, QR Verification & Check-in — Implementation Plan

This extends the existing payment-proof system already in production. Nothing existing is removed; new columns/tables are additive and RLS-safe.

## 1. Database (single migration)

### Bookings (additive columns only)
- `receipt_number TEXT UNIQUE` — `RCPT-YYYY-NNNNN` (issued on first full payment / manual issue)
- `verification_code TEXT UNIQUE` — 12-char base32, unpredictable (`SGT-2026-8F4X92Q` style)
- `checked_in_at TIMESTAMPTZ`, `checked_in_by UUID`
- Trigger: on booking insert, generate `verification_code` immediately; `receipt_number` on first approved payment or admin action.

### New tables
- `check_ins` — one row per check-in event (booking + optional participant_id, admin_id, checked_in_at, device, gps, notes, undone_at, undone_by). Append-only from client; admin can insert "undo" rows.
- `verification_logs` — every QR / manual verification attempt (booking_id nullable, code_tried, ip, user_agent, admin_id nullable, success, at).
- `receipt_downloads` — booking_id, user_id, kind (receipt/invoice/history), at.
- `payment_timeline_events` — append-only chronological log (booking_id, event_type, actor_id, payload jsonb, created_at). Populated by triggers on bookings/payment_proofs/payment_audit_logs plus manual inserts for downloads.
- `receipt_settings` — single-row per workspace: logo_url, colors, fonts, header, footer, bank_details, terms, signature_url, stamp_url, show_signature bool, show_stamp bool, sections jsonb (ordered), updated_by/at.
- `participants` already exists; add `checked_in_at`, `checked_in_by`.

### RLS + GRANTS (every new public table)
- `check_ins`: user SELECT own booking rows; admin ALL. authenticated INSERT via edge function only.
- `verification_logs`: admin-only SELECT; INSERT via service role from edge function.
- `receipt_downloads`: user SELECT own; admin ALL; INSERT via authenticated (own booking).
- `payment_timeline_events`: user SELECT own booking; admin ALL. INSERT via triggers/service role.
- `receipt_settings`: SELECT authenticated + anon (for public verification page branding); UPDATE admin only.

### Triggers
- `bookings` BEFORE INSERT → generate `verification_code`.
- On `payment_proofs` insert/update, `bookings` amount_paid change, `payment_audit_logs` insert → append to `payment_timeline_events`.
- On booking reaching `paid` for first time → set `receipt_number` if null.

## 2. Edge functions

- `verify-booking` (public, no JWT): input `{ code }` or `{ booking_reference, verification_code }`. Rate-limited by IP (in-memory + `verification_logs` lookup last 60s). Returns only safe fields: customer first name + last-initial, tour title, date, guests, payment status label, balance (bool has_balance only for anon; full for admin JWT), check-in status. Logs every attempt.
- `check-in` (JWT required, admin only): input `{ booking_id, participant_ids?, undo?, device?, gps? }`. Validates admin via `has_role`, writes to `check_ins`, updates `bookings.checked_in_at` / `participants.checked_in_at`. Prevents duplicates unless `override:true` supplied with reason.
- Extend `send-booking-email`: include receipt PDF + QR image once payment fully approved.

## 3. Frontend

### Customer
- `Dashboard` booking card: shows receipt number, verification code, QR (via `qrcode` npm lib rendered to canvas), download buttons (Receipt / Invoice / Payment History PDF). All downloads call `receipt_downloads` insert then generate client-side.
- Receipts rendered from `receipt_settings` template (logo, colors, header/footer, bank details, terms, signature, stamp, QR, verification code, tamper-evident footer text).

### Public verification page `/verify/:code`
- Server-side check via `verify-booking`; friendly card showing safe fields + "Verified ✓" badge or "Not found".

### Admin
- `Admin → Verify Booking`: text inputs for booking ref / receipt no / verification code + QR scanner (uses `html5-qrcode`). Shows full booking + payment + check-in details.
- `Admin → Check-in` (accessible from Verify page and TourManifest): buttons "Check in whole booking" / per-participant toggles / "Undo (requires reason)". Shows live "7 of 10 checked in".
- `Admin → Settings → Receipt Designer`: form editor for `receipt_settings` with live preview iframe rendering the receipt component with sample data. Logo/signature/stamp uploaded to existing `tour-images` bucket under `receipt/` prefix (or new `receipt-assets` public bucket).
- `Admin → Financial Dashboard` tab: KPI cards (Expected, Collected, Outstanding, Overpaid, Refunded, Pending Reviews, Awaiting Payment, Awaiting Proof, Today/Week/Month collected) + recharts line/bar. Export CSV.
- `Admin → Payment Verification` (existing) gains a "Timeline" drawer per booking showing `payment_timeline_events`.

### Participants
- Booking flow already collects participants (existing component). Extend `ParticipantForms` with optional National ID / Emergency contact if missing. Manifest PDF (existing `TourManifest`) gains check-in column.

## 4. Receipt PDF

- Single React component `ReceiptDocument` used both for on-screen preview and PDF (via existing `jspdf` + `html2canvas` pipeline used in `InvoiceDownload`).
- Reads live `receipt_settings`. Renders QR from `qrcode` as data-URL. Tamper-evident footer: verification statement + code + issue timestamp.

## 5. Security

- Verification codes: 60 bits entropy, generated with `gen_random_bytes` + base32 in trigger.
- Rate limiting: `verification_logs` check "≥ 10 attempts / IP / minute" ⇒ 429.
- Every verification, check-in, download, regeneration logged.
- Public verify endpoint never returns phone, email, or exact balance amount to unauthenticated callers.
- All financial math server-side (unchanged from current); UI only reads.

## 6. Files

**New**
- migration `*_receipts_and_checkin.sql`
- `supabase/functions/verify-booking/index.ts`
- `supabase/functions/check-in/index.ts`
- `src/components/ReceiptDocument.tsx`
- `src/components/QRCodeImage.tsx`
- `src/components/admin/VerifyBookingPage.tsx`
- `src/components/admin/CheckInPanel.tsx`
- `src/components/admin/ReceiptDesigner.tsx`
- `src/components/admin/FinancialDashboard.tsx`
- `src/components/PaymentTimeline.tsx`
- `src/pages/VerifyPage.tsx` (`/verify/:code`)
- `src/hooks/useReceiptSettings.ts`
- `src/hooks/useCheckIn.ts`
- `src/hooks/useVerification.ts`

**Edited (additive)**
- `src/App.tsx` (route `/verify/:code`)
- `src/pages/Dashboard.tsx` (receipt/QR/downloads section)
- `src/pages/AdminDashboard.tsx` (new tabs)
- `src/components/admin/PaymentVerificationTab.tsx` (timeline drawer)
- `src/components/admin/TourManifest.tsx` (check-in column)
- `supabase/functions/send-booking-email/index.ts` (attach receipt when paid)
- `supabase/config.toml` (register new functions, `verify_jwt = false` on `verify-booking`)
- `package.json` — add `qrcode`, `html5-qrcode`

## 7. Test checklist

Booking → proof → approve → receipt + verification code generated → email includes receipt → customer downloads PDF (logged) → admin scans QR → verify page shows sanitized info → admin checks in group / individuals → duplicate prevented → undo requires reason → timeline shows every step → financial dashboard totals reconcile with sum(bookings).

---
Confirm and I'll implement in one pass, starting with the migration for your approval.
