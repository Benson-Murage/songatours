import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

interface CheckInArgs {
  booking_id: string;
  participant_ids?: string[];
  undo?: boolean;
  override?: boolean;
  reason?: string;
  device?: string;
  gps?: string;
  notes?: string;
}

export function useCheckIn() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (args: CheckInArgs) => {
      const { data, error } = await supabase.functions.invoke("check-in", { body: args });
      if (error) {
        const msg = (error as any)?.context?.error || (error as any)?.message || "Check-in failed";
        throw new Error(msg);
      }
      if ((data as any)?.error) throw new Error((data as any).error);
      return data;
    },
    onSuccess: (_d, args) => {
      qc.invalidateQueries({ queryKey: ["check-ins", args.booking_id] });
      qc.invalidateQueries({ queryKey: ["admin-bookings"] });
      qc.invalidateQueries({ queryKey: ["participants", args.booking_id] });
    },
  });
}

export function useBookingParticipants(bookingId?: string) {
  return useQuery({
    queryKey: ["participants", bookingId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("participants")
        .select("*")
        .eq("booking_id", bookingId!);
      if (error) throw error;
      return data as any[];
    },
    enabled: !!bookingId,
  });
}

export function useBookingTimeline(bookingId?: string) {
  return useQuery({
    queryKey: ["timeline", bookingId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("payment_timeline_events" as any)
        .select("*")
        .eq("booking_id", bookingId!)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return data as any[];
    },
    enabled: !!bookingId,
  });
}

export async function logReceiptDownload(bookingId: string, userId: string, kind: "receipt" | "invoice" | "payment_history") {
  try {
    await supabase.from("receipt_downloads" as any).insert({ booking_id: bookingId, user_id: userId, kind });
  } catch (_) {}
}
