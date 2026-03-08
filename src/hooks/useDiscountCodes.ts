import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface DiscountCode {
  id: string;
  code: string;
  discount_type: "percentage" | "fixed";
  discount_value: number;
  max_uses: number | null;
  times_used: number;
  applicable_tour_id: string | null;
  is_active: boolean;
  created_at: string;
  expires_at: string | null;
}

export const useDiscountCodes = () =>
  useQuery({
    queryKey: ["discount-codes"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("discount_codes")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as DiscountCode[];
    },
  });

export const useValidateDiscount = () =>
  useMutation({
    mutationFn: async ({ code, tourId, subtotal }: { code: string; tourId: string; subtotal: number }) => {
      const { data, error } = await supabase
        .from("discount_codes")
        .select("*")
        .eq("code", code.toUpperCase().trim())
        .eq("is_active", true)
        .maybeSingle();

      if (error) throw error;
      if (!data) throw new Error("Invalid promo code");

      const dc = data as DiscountCode;

      if (dc.expires_at && new Date(dc.expires_at) < new Date()) {
        throw new Error("This promo code has expired");
      }
      if (dc.max_uses !== null && dc.times_used >= dc.max_uses) {
        throw new Error("This promo code has reached its usage limit");
      }
      if (dc.applicable_tour_id && dc.applicable_tour_id !== tourId) {
        throw new Error("This promo code is not valid for this tour");
      }

      let discountAmount = 0;
      if (dc.discount_type === "percentage") {
        discountAmount = Math.round(subtotal * (dc.discount_value / 100));
      } else {
        discountAmount = Math.min(dc.discount_value, subtotal);
      }

      return { code: dc.code, discountAmount, discountType: dc.discount_type, discountValue: dc.discount_value };
    },
  });

export const useCreateDiscountCode = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      code: string;
      discount_type: string;
      discount_value: number;
      max_uses: number | null;
      applicable_tour_id: string | null;
      expires_at: string | null;
    }) => {
      const { error } = await supabase.from("discount_codes").insert({
        code: input.code.toUpperCase().trim(),
        discount_type: input.discount_type,
        discount_value: input.discount_value,
        max_uses: input.max_uses,
        applicable_tour_id: input.applicable_tour_id,
        expires_at: input.expires_at,
      } as any);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["discount-codes"] }),
  });
};

export const useToggleDiscountCode = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const { error } = await supabase.from("discount_codes").update({ is_active } as any).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["discount-codes"] }),
  });
};

export const useDeleteDiscountCode = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("discount_codes").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["discount-codes"] }),
  });
};
