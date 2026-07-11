import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface AppSettings {
  id: boolean;
  company: {
    name: string; tagline: string; description: string; address: string;
    registration_number: string; tax_id: string;
  };
  branding: { logo_url: string; favicon_url: string; primary_color: string; accent_color: string };
  contact: {
    support_email: string; sales_email: string; phone_primary: string; phone_secondary: string;
    whatsapp: string; address_lines: string[];
  };
  financial: {
    currency: string; currency_symbol: string;
    bank_name: string; bank_account_name: string; bank_account_number: string; bank_branch: string; bank_swift: string;
    mpesa_paybill: string; mpesa_till: string; mpesa_account_name: string;
    payment_instructions: string;
  };
  social: { instagram: string; facebook: string; twitter: string; tiktok: string; youtube: string; linkedin: string };
  business_hours: Record<string, string>;
  legal: { terms_url: string; privacy_url: string; refund_url: string };
  seo: { default_title: string; default_description: string; og_image: string; keywords: string[] };
  pwa: { app_name: string; short_name: string; theme_color: string; background_color: string };
  notifications: {
    admin_email_alerts: boolean; new_booking_alert: boolean; payment_alert: boolean;
    capacity_alert_threshold: number; low_seat_alert: boolean;
  };
}

export function useAppSettings() {
  return useQuery({
    queryKey: ["app-settings"],
    queryFn: async () => {
      const { data, error } = await supabase.from("app_settings" as any).select("*").maybeSingle();
      if (error) throw error;
      return data as unknown as AppSettings | null;
    },
    staleTime: 5 * 60_000,
  });
}

export function useUpdateAppSettings() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (patch: Partial<AppSettings>) => {
      const { error } = await supabase.from("app_settings" as any).update(patch as any).eq("id", true);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["app-settings"] }),
  });
}
