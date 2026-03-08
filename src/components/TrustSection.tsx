import { Star, Users, MapPin, CheckCircle2 } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

const TrustSection = () => {
  const { data: stats } = useQuery({
    queryKey: ["platform-stats"],
    queryFn: async () => {
      const [{ count: bookingsCount }, { count: toursCount }, { data: reviews }] = await Promise.all([
        supabase.from("bookings").select("*", { count: "exact", head: true }).in("status", ["pending", "paid"]),
        supabase.from("tours").select("*", { count: "exact", head: true }).eq("status", "published"),
        supabase.from("reviews").select("rating"),
      ]);
      const avgRating = reviews?.length
        ? (reviews.reduce((s, r) => s + r.rating, 0) / reviews.length).toFixed(1)
        : "5.0";
      return {
        totalBookings: bookingsCount || 0,
        totalTours: toursCount || 0,
        avgRating,
        totalReviews: reviews?.length || 0,
      };
    },
    staleTime: 300_000,
  });

  const items = [
    { icon: Users, label: "Happy Travelers", value: `${stats?.totalBookings ?? 0}+` },
    { icon: MapPin, label: "Tours Available", value: String(stats?.totalTours ?? 0) },
    { icon: Star, label: "Average Rating", value: stats?.avgRating ?? "5.0" },
    { icon: CheckCircle2, label: "Reviews", value: `${stats?.totalReviews ?? 0}+` },
  ];

  return (
    <section className="border-y border-border bg-secondary/30 py-12">
      <div className="container mx-auto px-4">
        <div className="grid grid-cols-2 gap-6 md:grid-cols-4">
          {items.map((item) => (
            <div key={item.label} className="text-center">
              <item.icon className="mx-auto mb-2 h-6 w-6 text-primary" />
              <p className="text-2xl font-bold text-foreground">{item.value}</p>
              <p className="text-xs text-muted-foreground">{item.label}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default TrustSection;
