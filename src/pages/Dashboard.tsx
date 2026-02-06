import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Calendar, MapPin, Users } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Skeleton } from "@/components/ui/skeleton";
import Layout from "@/components/Layout";

const Dashboard = () => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && !user) navigate("/auth");
  }, [user, loading, navigate]);

  const { data: bookings, isLoading } = useQuery({
    queryKey: ["my-bookings", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("bookings")
        .select("*, tours(title, image_url, destinations(name, country))")
        .eq("user_id", user!.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  if (loading) return null;

  return (
    <Layout>
      <div className="container mx-auto px-4 py-10">
        <h1 className="text-3xl font-bold mb-8">My Trips</h1>

        {isLoading ? (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-28 w-full rounded-2xl" />
            ))}
          </div>
        ) : bookings && bookings.length > 0 ? (
          <div className="space-y-4">
            {bookings.map((b: any) => (
              <article
                key={b.id}
                className="flex flex-col md:flex-row gap-4 rounded-2xl border border-border bg-card p-4"
              >
                <img
                  src={b.tours?.image_url || "https://images.unsplash.com/photo-1516426122078-c23e76319801?w=200&h=200&fit=crop"}
                  alt={b.tours?.title}
                  className="h-24 w-24 rounded-xl object-cover shrink-0"
                />
                <div className="flex-1 space-y-1">
                  <h3 className="font-semibold text-foreground">{b.tours?.title}</h3>
                  {b.tours?.destinations && (
                    <p className="flex items-center gap-1 text-xs text-muted-foreground">
                      <MapPin className="h-3 w-3" />
                      {b.tours.destinations.name}, {b.tours.destinations.country}
                    </p>
                  )}
                  <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Calendar className="h-3 w-3" /> {b.start_date}
                    </span>
                    <span className="flex items-center gap-1">
                      <Users className="h-3 w-3" /> {b.guests_count} guests
                    </span>
                  </div>
                </div>
                <div className="flex flex-col items-end justify-between shrink-0">
                  <span
                    className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${
                      b.status === "paid"
                        ? "bg-primary/10 text-primary"
                        : b.status === "cancelled"
                        ? "bg-destructive/10 text-destructive"
                        : "bg-accent/10 text-accent"
                    }`}
                  >
                    {b.status}
                  </span>
                  <span className="text-lg font-bold text-foreground">
                    ${Number(b.total_price).toLocaleString()}
                  </span>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <div className="py-20 text-center">
            <p className="text-lg text-muted-foreground">
              No bookings yet. Start exploring tours!
            </p>
          </div>
        )}
      </div>
    </Layout>
  );
};

export default Dashboard;
