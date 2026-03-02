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

export interface TourImage {
  id: string;
  tour_id: string;
  image_url: string;
  display_order: number;
  created_at: string;
}

export interface Tour {
  id: string;
  destination_id: string | null;
  title: string;
  slug: string | null;
  description: string | null;
  price_per_person: number;
  discount_price: number | null;
  duration_days: number;
  difficulty: "Easy" | "Medium" | "Hard";
  highlights: string[] | null;
  included: string[] | null;
  excluded: string[] | null;
  max_group_size: number;
  max_total_slots: number;
  image_url: string | null;
  whatsapp_group_link: string | null;
  category: string;
  status: "published" | "draft" | "canceled" | "completed";
  destinations?: Destination | null;
  tour_images?: TourImage[];
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

export const useTours = (destinationSlug?: string, category?: string) =>
  useQuery({
    queryKey: ["tours", destinationSlug, category],
    queryFn: async () => {
      let query = supabase
        .from("tours")
        .select("*, destinations(*), tour_images(*)")
        .in("status", ["published"]);

      if (category) {
        query = query.eq("category", category);
      }

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
        .select("*, destinations(*), tour_images(*)")
        .eq("id", tourId)
        .single();
      if (error) throw error;
      return data as Tour;
    },
    enabled: !!tourId,
  });

export const useTourCapacity = (tourId: string, startDate?: string) =>
  useQuery({
    queryKey: ["tour-capacity", tourId, startDate],
    queryFn: async () => {
      const { data: tour } = await supabase
        .from("tours")
        .select("max_total_slots")
        .eq("id", tourId)
        .single();

      if (!tour) return { remaining: 0, total: 0, soldOut: true };

      let bookedQuery = supabase
        .from("bookings")
        .select("guests_count")
        .eq("tour_id", tourId)
        .in("status", ["pending", "paid"]);

      if (startDate) {
        bookedQuery = bookedQuery.eq("start_date", startDate);
      }

      const { data: bookings } = await bookedQuery;
      const booked = (bookings || []).reduce((sum, b) => sum + Number(b.guests_count || 0), 0);
      const total = Number(tour.max_total_slots);
      const remaining = Math.max(0, total - booked);

      return { remaining, total, booked, soldOut: remaining <= 0 };
    },
    enabled: !!tourId,
    refetchInterval: 30000,
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
