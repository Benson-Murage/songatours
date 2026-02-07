import { useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Calendar, MapPin, Users, Download, XCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import Layout from "@/components/Layout";
import { toast } from "sonner";

const Dashboard = () => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!loading && !user) navigate("/auth");
  }, [user, loading, navigate]);

  const { data: bookings, isLoading } = useQuery({
    queryKey: ["my-bookings", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("bookings")
        .select("*, tours(title, image_url, duration_days, destinations(name, country))")
        .eq("user_id", user!.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  const cancelBooking = useMutation({
    mutationFn: async (bookingId: string) => {
      const { error } = await supabase
        .from("bookings")
        .update({ status: "cancelled" as const })
        .eq("id", bookingId)
        .eq("user_id", user!.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Booking cancelled");
      queryClient.invalidateQueries({ queryKey: ["my-bookings"] });
    },
    onError: () => {
      toast.error("Failed to cancel booking");
    },
  });

  if (loading) return null;

  const upcoming = bookings?.filter((b: any) => b.status !== "cancelled" && new Date(b.start_date) >= new Date()) ?? [];
  const past = bookings?.filter((b: any) => b.status === "cancelled" || new Date(b.start_date) < new Date()) ?? [];

  const BookingCard = ({ b }: { b: any }) => (
    <article className="flex flex-col md:flex-row gap-4 rounded-2xl border border-border bg-card p-4 card-hover">
      <Link to={`/tours/${b.tour_id}`} className="shrink-0">
        <img
          src={b.tours?.image_url || "https://images.unsplash.com/photo-1516426122078-c23e76319801?w=200&h=200&fit=crop"}
          alt={b.tours?.title}
          className="h-24 w-24 rounded-xl object-cover"
        />
      </Link>
      <div className="flex-1 space-y-1">
        <Link to={`/tours/${b.tour_id}`} className="font-semibold text-foreground hover:text-primary transition-colors">
          {b.tours?.title}
        </Link>
        {b.tours?.destinations && (
          <p className="flex items-center gap-1 text-xs text-muted-foreground">
            <MapPin className="h-3 w-3" />
            {b.tours.destinations.name}, {b.tours.destinations.country}
          </p>
        )}
        <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
          <span className="flex items-center gap-1"><Calendar className="h-3 w-3" /> {b.start_date}</span>
          <span className="flex items-center gap-1"><Users className="h-3 w-3" /> {b.guests_count} guests</span>
        </div>
      </div>
      <div className="flex flex-col items-end justify-between gap-2 shrink-0">
        <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${
          b.status === "paid" ? "bg-primary/10 text-primary"
            : b.status === "cancelled" ? "bg-destructive/10 text-destructive"
            : "bg-accent/10 text-accent"
        }`}>
          {b.status}
        </span>
        <span className="text-lg font-bold text-foreground">${Number(b.total_price).toLocaleString()}</span>
        <div className="flex gap-2">
          {b.status === "pending" && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => cancelBooking.mutate(b.id)}
              className="text-destructive hover:text-destructive"
            >
              <XCircle className="mr-1 h-3 w-3" /> Cancel
            </Button>
          )}
          {b.status !== "cancelled" && (
            <Button variant="outline" size="sm" onClick={() => toast.info("Voucher download coming soon!")}>
              <Download className="mr-1 h-3 w-3" /> Voucher
            </Button>
          )}
        </div>
      </div>
    </article>
  );

  return (
    <Layout>
      <div className="container mx-auto px-4 py-10">
        <h1 className="text-3xl font-bold mb-2">My Trips</h1>
        <p className="text-muted-foreground mb-8">Manage your bookings and travel plans</p>

        {isLoading ? (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => <Skeleton key={i} className="h-28 w-full rounded-2xl" />)}
          </div>
        ) : bookings && bookings.length > 0 ? (
          <div className="space-y-8">
            {upcoming.length > 0 && (
              <div>
                <h2 className="text-xl font-semibold mb-4">Upcoming</h2>
                <div className="space-y-3">
                  {upcoming.map((b: any) => <BookingCard key={b.id} b={b} />)}
                </div>
              </div>
            )}
            {past.length > 0 && (
              <div>
                <h2 className="text-xl font-semibold mb-4 text-muted-foreground">Past & Cancelled</h2>
                <div className="space-y-3">
                  {past.map((b: any) => <BookingCard key={b.id} b={b} />)}
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="py-20 text-center">
            <p className="text-lg text-muted-foreground mb-4">No bookings yet.</p>
            <Link to="/destinations">
              <Button variant="accent">Explore Tours</Button>
            </Link>
          </div>
        )}
      </div>
    </Layout>
  );
};

export default Dashboard;
