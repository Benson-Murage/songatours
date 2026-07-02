// UI-level payment status resolver, layered over DB payment_status + latest proof

export type UIPaymentStatus =
  | "awaiting_payment"
  | "proof_uploaded"
  | "under_review"
  | "partial"
  | "paid"
  | "overpaid"
  | "rejected"
  | "more_info";

export interface ProofLike {
  status: "pending_review" | "approved" | "rejected" | "more_info_requested";
  created_at?: string;
}

export function resolveUIPaymentStatus(
  dbPaymentStatus: string | null | undefined,
  latestProof?: ProofLike | null,
): UIPaymentStatus {
  const db = (dbPaymentStatus || "pending").toLowerCase();
  if (db === "paid") return "paid";
  if (db === "overpaid") return "overpaid";
  if (db === "partial") return "partial";

  // db === "pending"
  if (!latestProof) return "awaiting_payment";
  if (latestProof.status === "pending_review") return "under_review";
  if (latestProof.status === "rejected") return "rejected";
  if (latestProof.status === "more_info_requested") return "more_info";
  return "proof_uploaded";
}

export const UI_STATUS_META: Record<
  UIPaymentStatus,
  { label: string; className: string }
> = {
  awaiting_payment: { label: "Awaiting Payment", className: "bg-muted text-muted-foreground" },
  proof_uploaded: { label: "Proof Uploaded", className: "bg-blue-100 text-blue-800" },
  under_review: { label: "Under Review", className: "bg-amber-100 text-amber-800" },
  partial: { label: "Partially Paid", className: "bg-orange-100 text-orange-800" },
  paid: { label: "Fully Paid", className: "bg-emerald-100 text-emerald-800" },
  overpaid: { label: "Overpaid", className: "bg-purple-100 text-purple-800" },
  rejected: { label: "Payment Rejected", className: "bg-destructive/10 text-destructive" },
  more_info: { label: "More Info Requested", className: "bg-amber-100 text-amber-800" },
};

export const PAYMENT_METHODS = [
  { value: "mpesa", label: "M-Pesa" },
  { value: "bank_transfer", label: "Bank Transfer" },
  { value: "cash", label: "Cash" },
  { value: "card", label: "Card" },
  { value: "other", label: "Other" },
] as const;

export const ACCEPTED_PROOF_TYPES = ["image/jpeg", "image/jpg", "image/png", "image/webp", "application/pdf"];
export const MAX_PROOF_BYTES = 10 * 1024 * 1024; // 10 MB
