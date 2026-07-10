import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface ReceiptSettings {
  id: string;
  logo_url: string | null;
  primary_color: string;
  accent_color: string;
  font_family: string;
  header_text: string;
  footer_text: string;
  bank_details: string;
  payment_instructions: string;
  terms: string;
  contact_details: string;
  signature_url: string | null;
  signature_name: string;
  stamp_url: string | null;
  show_signature: boolean;
  show_stamp: boolean;
  sections: string[];
}

export function useReceiptSettings() {
  return useQuery({
    queryKey: ["receipt-settings"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("receipt_settings" as any)
        .select("*")
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return (data as unknown) as ReceiptSettings | null;
    },
    staleTime: 5 * 60_000,
  });
}

export function useUpdateReceiptSettings() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (patch: Partial<ReceiptSettings> & { id: string }) => {
      const { id, ...rest } = patch;
      const { error } = await supabase
        .from("receipt_settings" as any)
        .update(rest as any)
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["receipt-settings"] }),
  });
}
