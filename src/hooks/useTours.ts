import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface Destination {
  id: string;
  name: string;
  country: string;
  description: string | null;
  image_url: string | null;
  slug: string;
}

export interface Tour {
  id: string;
  destination_id: string | null;
  title: string;
  description: string | null;
  price_per_person: number;
  discount_price: number | null;
  duration_days: number;
  difficulty: "Easy" | "Medium" | "Hard";
  highlights: string[] | null;
  included: string[] | null;
  max_total_slots: number;
  max_group_size: number;
  image_url: string | null;
  status: "published" | "draft";
  destinations?: Destination | null;
}

export const useDestinations = () =>
  useQuery({
    queryKey: ["destinations"],
    queryFn: async () => {
      const { data, error } = await supabase.from("destinations").select("*");
      if (error) throw error;
      return data as Destination[];
    },
  });

export const useTours = (destinationSlug?: string) =>
  useQuery({
    queryKey: ["tours", destinationSlug],
    queryFn: async () => {
      let query = supabase.from("tours").select("*, destinations(*)");
      if (destinationSlug) {
        const { data: dest } = await supabase
          .from("destinations")
          .select("id")
          .eq("slug", destinationSlug)
          .single();
        if (dest) query = query.eq("destination_id", dest.id);
      }
      const { data, error } = await query;
      if (error) throw error;
      return data as Tour[];
    },
  });

export const useTour = (tourId: string) =>
  useQuery({
    queryKey: ["tour", tourId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tours")
        .select("*, destinations(*)")
        .eq("id", tourId)
        .single();
      if (error) throw error;
      return data as Tour;
    },
    enabled: !!tourId,
  });

export const useReviews = (tourId: string) =>
  useQuery({
    queryKey: ["reviews", tourId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("reviews")
        .select("*, profiles(full_name, avatar_url)")
        .eq("tour_id", tourId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!tourId,
  });

export const useFavorites = (userId?: string) =>
  useQuery({
    queryKey: ["favorites", userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("favorites")
        .select("tour_id")
        .eq("user_id", userId!);
      if (error) throw error;
      return data.map((f) => f.tour_id);
    },
    enabled: !!userId,
  });

export const useToggleFavorite = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ tourId, userId, isFavorited }: { tourId: string; userId: string; isFavorited: boolean }) => {
      if (isFavorited) {
        const { error } = await supabase
          .from("favorites")
          .delete()
          .eq("tour_id", tourId)
          .eq("user_id", userId);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("favorites")
          .insert({ tour_id: tourId, user_id: userId });
        if (error) throw error;
      }
    },
    onSuccess: (_, { userId }) => {
      queryClient.invalidateQueries({ queryKey: ["favorites", userId] });
    },
  });
};
