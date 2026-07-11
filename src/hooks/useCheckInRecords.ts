import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface CheckInRecord {
  id: string;
  booking_id: string;
  participant_id: string | null;
  admin_id: string | null;
  action: string;
  device: string | null;
  gps: string | null;
  notes: string | null;
  created_at: string;
  booking?: {
    id: string;
    booking_reference: string | null;
    verification_code: string | null;
    guests_count: number;
    tours?: { title: string; departure_date: string | null } | null;
    profiles?: { full_name: string | null; email: string | null } | null;
  } | null;
  admin?: { full_name: string | null; email: string | null } | null;
  participant?: { full_name: string | null } | null;
}

export function useCheckInRecords(params: {
  search?: string;
  action?: string;
  from?: string;
  to?: string;
  limit?: number;
  offset?: number;
} = {}) {
  const { search = "", action = "all", from, to, limit = 50, offset = 0 } = params;
  return useQuery({
    queryKey: ["check-in-records", search, action, from, to, limit, offset],
    queryFn: async () => {
      let q = supabase
        .from("check_ins" as any)
        .select(
          `id, booking_id, participant_id, admin_id, action, device, gps, notes, created_at,
           booking:bookings!inner(id, booking_reference, verification_code, guests_count,
             tours(title, departure_date),
             profiles:profiles!bookings_user_id_fkey(full_name, email)),
           admin:profiles!check_ins_admin_id_fkey(full_name, email),
           participant:participants(full_name)`,
          { count: "exact" }
        )
        .order("created_at", { ascending: false })
        .range(offset, offset + limit - 1);

      if (action !== "all") q = q.eq("action", action);
      if (from) q = q.gte("created_at", from);
      if (to) q = q.lte("created_at", to);

      const { data, error, count } = await q;
      if (error) throw error;

      let rows = (data as any[]) || [];
      if (search.trim()) {
        const s = search.toLowerCase();
        rows = rows.filter((r) => {
          const hay = [
            r.booking?.booking_reference,
            r.booking?.verification_code,
            r.booking?.profiles?.full_name,
            r.booking?.profiles?.email,
            r.booking?.tours?.title,
            r.admin?.full_name,
            r.admin?.email,
            r.participant?.full_name,
            r.notes,
          ].filter(Boolean).join(" ").toLowerCase();
          return hay.includes(s);
        });
      }
      return { rows: rows as CheckInRecord[], count: count || 0 };
    },
  });
}
