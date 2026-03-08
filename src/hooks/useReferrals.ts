import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface Referral {
  id: string;
  referrer_id: string;
  referral_code: string;
  referred_email: string | null;
  referred_booking_id: string | null;
  reward_amount: number;
  status: string;
  created_at: string;
}

export const useMyReferralCode = (userId?: string) =>
  useQuery({
    queryKey: ["my-referral", userId],
    queryFn: async () => {
      // Check if user already has a referral code
      const { data, error } = await supabase
        .from("referrals")
        .select("referral_code")
        .eq("referrer_id", userId!)
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      if (data) return data.referral_code;

      // Generate new code
      const code = `REF-SONGA-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
      const { error: insertErr } = await supabase.from("referrals").insert({
        referrer_id: userId!,
        referral_code: code,
      } as any);
      if (insertErr) throw insertErr;
      return code;
    },
    enabled: !!userId,
  });

export const useMyReferralStats = (userId?: string) =>
  useQuery({
    queryKey: ["my-referral-stats", userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("referrals")
        .select("*")
        .eq("referrer_id", userId!);
      if (error) throw error;
      const referrals = data || [];
      const completed = referrals.filter((r: any) => r.status === "completed");
      return {
        totalReferrals: referrals.length,
        completedReferrals: completed.length,
        totalRewards: completed.reduce((s: number, r: any) => s + Number(r.reward_amount), 0),
      };
    },
    enabled: !!userId,
  });

export const useAllReferrals = () =>
  useQuery({
    queryKey: ["admin-referrals"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("referrals")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as Referral[];
    },
  });
