import { useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface VerifyResult {
  verified: boolean;
  admin?: boolean;
  booking_reference?: string;
  receipt_number?: string | null;
  verification_code?: string;
  tour_title?: string;
  destination?: string;
  start_date?: string;
  guests_count?: number;
  payment_status?: string;
  has_balance?: boolean;
  checked_in?: boolean;
  checked_in_at?: string | null;
  booking_status?: string;
  customer_display_name?: string;
  // admin-only
  booking_id?: string;
  tour_id?: string;
  user_id?: string;
  customer_full_name?: string;
  customer_email?: string;
  phone_number?: string;
  total_price?: number;
  amount_paid?: number;
  balance_due?: number;
  error?: string;
}

export function useVerifyBooking() {
  return useMutation({
    mutationFn: async (input: { code?: string; booking_reference?: string; receipt_number?: string }) => {
      const { data, error } = await supabase.functions.invoke("verify-booking", {
        body: input,
      });
      if (error) {
        const msg = (error as any)?.context?.error || (error as any)?.message || "Verification failed";
        throw new Error(msg);
      }
      return data as VerifyResult;
    },
  });
}
