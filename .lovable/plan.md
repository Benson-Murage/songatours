## Payment Proof Upload & Verification System

A complete, non-breaking addition layered on top of the existing bookings, `payment_audit_logs`, admin dashboard, invoicing, and email systems. All existing payment flows (admin-recorded payments, sync trigger, audit trail, receipts) stay intact.

### 1. Database (single migration)

New table `public.payment_proofs`:
- `booking_id`, `user_id`, `file_path` (storage key), `file_type`, `file_size`
- `payment_method` (enum: mpesa | bank_transfer | cash | card | other)
- `amount_sent` (integer, KES)
- `payment_date` (date)
- `mpesa_code`, `bank_reference`, `notes` (nullable)
- `status` (enum: pending_review | approved | rejected | more_info_requested)
- `reviewed_by`, `reviewed_at`, `review_reason`
- `created_at`, `updated_at`

Extend `bookings` (additive columns only, defaults preserve current behavior):
- `overpayment_credit` (int, default 0) — persisted excess for customer credit display
- Extend the existing `sync_booking_payment_fields` trigger to also derive `overpayment_credit` (no behavior change to existing statuses).

Extend the `payment_status` derivation to expose extra UI-level statuses:
- Keep DB values (`pending`, `partial`, `paid`, `overpaid`) unchanged for backward compatibility.
- Compute UI states (`awaiting_payment`, `proof_uploaded`, `under_review`, `partial`, `paid`, `overpaid`, `rejected`) client-side from `bookings.payment_status` + latest `payment_proofs.status`.

RLS:
- Users: SELECT/INSERT/UPDATE own proofs while `status='pending_review'` only.
- Admins: full access via `has_role`.
- Immutable audit: existing `payment_audit_logs` reused; add rows on approve/reject.

Storage bucket `payment-proofs` (private) with per-user folder policies (`{user_id}/{booking_id}/...`).

### 2. Customer flow

New component `PaymentProofUpload`:
- File picker (camera/gallery/desktop), accepts `image/jpeg,image/png,image/webp,application/pdf`, max 10 MB.
- Client validation, preview (image or PDF icon), upload progress, retry on failure.
- Form fields: method, amount sent, payment date, optional mpesa code / bank ref / notes.
- Shown on `Dashboard.tsx` per pending/partial booking, and on `TourDetailPage` post-booking confirmation.
- Replace-while-pending supported (soft-delete previous proof, keep audit).

New tab in customer dashboard: **Payments** — shows proof history, current balance, overpayment credit, downloadable payment-history PDF.

### 3. Admin flow

New tab **Payment Verification** in `AdminDashboard`:
- Queue of proofs (default filter: `pending_review`).
- Filters: tour, booking ref, customer name/email/phone, status, method, date range.
- Row actions: preview image (zoomable dialog) / open PDF / download / approve / reject / request more info / delete.
- Approve dialog: confirms amount (defaults to `amount_sent`), optional override, reason field → writes to `bookings.amount_paid` (existing trigger derives status) + inserts `payment_audit_logs` row + updates proof status.
- Export current filter to CSV / Excel (SheetJS already used elsewhere or add lightweight CSV) and PDF.

### 4. Emails (edge function extension)

Extend existing `send-booking-email` with new `type` values:
- `proof_uploaded`, `payment_approved`, `payment_rejected`, `more_info_requested`, `partial_payment`, `full_payment`.
Each email uses the existing branded template, includes logo, booking ref, tour, amount paid, balance, status, and attaches receipt/invoice when applicable. Support address stays `salmajeods11@gmail.com`.

Admin gets a notification email on new proof upload.

### 5. Security

- Zod validation on all inputs (client + edge function).
- File MIME + extension + size validated server-side in a new edge function `verify-payment-proof` (used for approve/reject so service-role writes audit rows and bookings atomically).
- Storage RLS: users read/write only under their own `user_id/` prefix; admins read all.
- Payment proofs cannot be edited after approval/rejection.
- Audit log rows are append-only (existing policy).

### 6. Mobile / PWA

- Upload UI uses `<input capture>` for camera on mobile.
- Sheet-based dialogs on small screens; touch-friendly buttons ≥ 44px.
- Progress bar + retry.
- Works inside installed PWA (uses standard File API).

### 7. Files touched (approx.)

New:
- `supabase/migrations/*_payment_proofs.sql`
- `supabase/functions/verify-payment-proof/index.ts`
- `src/components/PaymentProofUpload.tsx`
- `src/components/PaymentHistoryList.tsx`
- `src/components/admin/PaymentVerificationTab.tsx`
- `src/components/admin/ProofPreviewDialog.tsx`
- `src/hooks/usePaymentProofs.ts`
- `src/lib/paymentStatus.ts` (UI status resolver)

Edited (additive only):
- `src/pages/Dashboard.tsx` — add Payments section + upload entry point
- `src/pages/AdminDashboard.tsx` — register new tab
- `supabase/functions/send-booking-email/index.ts` — new templates
- `supabase/functions/create-booking/index.ts` — return booking so upload can start immediately (already returns booking)
- `supabase/config.toml` — register new function with `verify_jwt = false` (auth done in code)

### 8. Testing checklist (manual, per brief)

Booking → upload → admin notified → preview → approve/reject → totals + audit + email + PDF → customer sees updated balance + credit + history.

---

Confirm and I'll implement in one pass (migration first for approval, then code).