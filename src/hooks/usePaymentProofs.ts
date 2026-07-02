import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { ACCEPTED_PROOF_TYPES, MAX_PROOF_BYTES } from "@/lib/paymentStatus";

export interface PaymentProof {
  id: string;
  booking_id: string;
  user_id: string;
  file_path: string;
  file_type: string;
  file_size: number;
  payment_method: "mpesa" | "bank_transfer" | "cash" | "card" | "other";
  amount_sent: number;
  payment_date: string;
  mpesa_code: string | null;
  bank_reference: string | null;
  notes: string | null;
  status: "pending_review" | "approved" | "rejected" | "more_info_requested";
  reviewed_by: string | null;
  reviewed_at: string | null;
  review_reason: string | null;
  created_at: string;
  updated_at: string;
}

export function validateProofFile(file: File): string | null {
  if (!ACCEPTED_PROOF_TYPES.includes(file.type)) {
    return "Unsupported file type. Please upload a JPG, PNG, WEBP, or PDF.";
  }
  if (file.size > MAX_PROOF_BYTES) {
    return "File is too large. Maximum size is 10 MB.";
  }
  return null;
}

export function useMyProofsForBooking(bookingId?: string) {
  return useQuery({
    queryKey: ["payment-proofs", bookingId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("payment_proofs")
        .select("*")
        .eq("booking_id", bookingId!)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as PaymentProof[];
    },
    enabled: !!bookingId,
    staleTime: 30_000,
  });
}

interface UploadArgs {
  bookingId: string;
  userId: string;
  file: File;
  paymentMethod: PaymentProof["payment_method"];
  amountSent: number;
  paymentDate: string;
  mpesaCode?: string;
  bankReference?: string;
  notes?: string;
}

export function useUploadPaymentProof() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (args: UploadArgs) => {
      const err = validateProofFile(args.file);
      if (err) throw new Error(err);

      const ext = args.file.name.split(".").pop()?.toLowerCase() || "bin";
      const safeExt = /^[a-z0-9]+$/.test(ext) ? ext : "bin";
      const path = `${args.userId}/${args.bookingId}/${Date.now()}.${safeExt}`;

      const { error: upErr } = await supabase.storage
        .from("payment-proofs")
        .upload(path, args.file, { contentType: args.file.type, upsert: false });
      if (upErr) throw upErr;

      const { data, error } = await supabase
        .from("payment_proofs")
        .insert({
          booking_id: args.bookingId,
          user_id: args.userId,
          file_path: path,
          file_type: args.file.type,
          file_size: args.file.size,
          payment_method: args.paymentMethod,
          amount_sent: args.amountSent,
          payment_date: args.paymentDate,
          mpesa_code: args.mpesaCode || null,
          bank_reference: args.bankReference || null,
          notes: args.notes || null,
        })
        .select()
        .single();
      if (error) throw error;

      // Notify (fire-and-forget)
      supabase.functions
        .invoke("send-booking-email", {
          body: {
            booking_id: args.bookingId,
            type: "proof_uploaded",
            amount_paid_now: args.amountSent,
            payment_method: args.paymentMethod,
            payment_reference: args.mpesaCode || args.bankReference || null,
          },
        })
        .catch(() => {});

      return data as PaymentProof;
    },
    onSuccess: (proof) => {
      qc.invalidateQueries({ queryKey: ["payment-proofs", proof.booking_id] });
      qc.invalidateQueries({ queryKey: ["my-bookings"] });
      qc.invalidateQueries({ queryKey: ["admin-payment-proofs"] });
    },
  });
}

export function useDeletePaymentProof() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (proof: PaymentProof) => {
      await supabase.storage.from("payment-proofs").remove([proof.file_path]);
      const { error } = await supabase.from("payment_proofs").delete().eq("id", proof.id);
      if (error) throw error;
      return proof;
    },
    onSuccess: (p) => {
      qc.invalidateQueries({ queryKey: ["payment-proofs", p.booking_id] });
      qc.invalidateQueries({ queryKey: ["admin-payment-proofs"] });
    },
  });
}

export async function signedProofUrl(path: string, expiresIn = 300): Promise<string | null> {
  const { data } = await supabase.storage.from("payment-proofs").createSignedUrl(path, expiresIn);
  return data?.signedUrl ?? null;
}

export function useAdminPaymentProofs() {
  return useQuery({
    queryKey: ["admin-payment-proofs"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("payment_proofs")
        .select(
          "*, bookings(id, booking_reference, total_price, amount_paid, balance_due, overpayment_amount, phone_number, user_id, tour_id, tours(title))",
        )
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as any[];
    },
    staleTime: 15_000,
  });
}

interface ReviewArgs {
  proof: PaymentProof & { bookings?: any };
  decision: "approve" | "reject" | "request_info";
  amountToApply?: number;
  reason?: string;
  adminId: string;
}

export function useReviewPaymentProof() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ proof, decision, amountToApply, reason, adminId }: ReviewArgs) => {
      const nowIso = new Date().toISOString();

      if (decision === "approve") {
        // Fetch booking snapshot
        const { data: booking, error: bErr } = await supabase
          .from("bookings")
          .select("id, user_id, amount_paid, total_price, payment_status")
          .eq("id", proof.booking_id)
          .single();
        if (bErr) throw bErr;

        const oldPaid = Number(booking.amount_paid ?? 0);
        const applied = Number(amountToApply ?? proof.amount_sent);
        const newPaid = oldPaid + applied;

        const { error: uErr } = await supabase
          .from("bookings")
          .update({
            amount_paid: newPaid,
            payment_method: proof.payment_method,
            payment_reference: proof.mpesa_code || proof.bank_reference || null,
          } as any)
          .eq("id", proof.booking_id);
        if (uErr) throw uErr;

        await supabase.from("payment_audit_logs" as any).insert({
          booking_id: proof.booking_id,
          admin_id: adminId,
          old_amount_paid: oldPaid,
          new_amount_paid: newPaid,
          old_status: booking.payment_status,
          reason: `Approved payment proof (${proof.payment_method})${reason ? `: ${reason}` : ""}`,
        } as any);

        await supabase
          .from("payment_proofs")
          .update({
            status: "approved",
            reviewed_by: adminId,
            reviewed_at: nowIso,
            review_reason: reason || null,
          })
          .eq("id", proof.id);

        // Email customer
        supabase.functions
          .invoke("send-booking-email", {
            body: {
              booking_id: proof.booking_id,
              type: "payment_approved",
              amount_paid_now: applied,
            },
          })
          .catch(() => {});
      } else {
        const newStatus = decision === "reject" ? "rejected" : "more_info_requested";
        await supabase
          .from("payment_proofs")
          .update({
            status: newStatus,
            reviewed_by: adminId,
            reviewed_at: nowIso,
            review_reason: reason || null,
          })
          .eq("id", proof.id);

        supabase.functions
          .invoke("send-booking-email", {
            body: {
              booking_id: proof.booking_id,
              type: decision === "reject" ? "payment_rejected" : "more_info_requested",
              review_reason: reason || null,
            },
          })
          .catch(() => {});
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-payment-proofs"] });
      qc.invalidateQueries({ queryKey: ["admin-bookings"] });
      qc.invalidateQueries({ queryKey: ["payment-proofs"] });
    },
  });
}
