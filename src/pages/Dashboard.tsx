import { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Calendar, MapPin, Users, Download, XCircle, Plane, CheckCircle2, MessageCircle, FileText } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import Layout from "@/components/Layout";
import { toast } from "sonner";
import { formatKES } from "@/lib/formatKES";
import InvoiceDownload from "@/components/InvoiceDownload";

const statusConfig: Record<string, { label: string; className: string }> = {
  pending: { label: "Pending", className: "bg-accent/10 text-accent" },
  paid: { label: "Confirmed", className: "bg-primary/10 text-primary" },
  cancelled: { label: "Cancelled", className: "bg-destructive/10 text-destructive" },
};

const Dashboard = () => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [bookingToCancel, setBookingToCancel] = useState<any | null>(null);

  useEffect(() => {
    if (!loading && !user) navigate("/auth");
  }, [user, loading, navigate]);

  const { data: bookings, isLoading, isError } = useQuery({
    queryKey: ["my-bookings", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("bookings")
        .select("*, tours(title, image_url, duration_days, whatsapp_group_link, destinations(name, country))")
        .eq("user_id", user!.id)
        .order("start_date", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!user,
    staleTime: 30_000,
  });

  const cancelBooking = useMutation({
    mutationFn: async (booking: any) => {
      const { error } = await supabase
        .from("bookings")
        .update({
          status: "cancelled" as any,
          cancelled_at: new Date().toISOString(),
          cancelled_by: user!.id,
        } as any)
        .eq("id", booking.id)
        .eq("user_id", user!.id);
      if (error) throw error;

      supabase.functions.invoke("send-booking-email", {
        body: {
          to_email: user!.email,
          to_name: user!.user_metadata?.full_name || "",
          booking_id: booking.id,
          tour_title: booking.tours?.title || "Tour",
          start_date: booking.start_date,
          guests_count: booking.guests_count,
          total_price: booking.total_price,
          type: "cancellation",
        },
      }).catch(() => {});
    },
    onSuccess: () => {
      toast.success("Booking cancelled");
      setBookingToCancel(null);
      queryClient.invalidateQueries({ queryKey: ["my-bookings"] });
    },
    onError: () => toast.error("Failed to cancel booking"),
  });

  if (loading) return null;

  const now = new Date();
  const upcoming = bookings?.filter((b: any) => b.status !== "cancelled" && new Date(b.start_date) >= now) ?? [];
  const completed = bookings?.filter((b: any) => b.status !== "cancelled" && new Date(b.start_date) < now) ?? [];
  const cancelled = bookings?.filter((b: any) => b.status === "cancelled") ?? [];

  const BookingCard = ({ b }: { b: any }) => {
    const status = statusConfig[b.status] || statusConfig.pending;
    return (
      <article className="flex flex-col sm:flex-row gap-4 rounded-2xl border border-border bg-card p-4 transition-all hover:shadow-md">
        <Link to={`/tours/${b.tour_id}`} className="shrink-0">
          <img
            src={b.tours?.image_url || "https://images.unsplash.com/photo-1516426122078-c23e76319801?w=200&h=200&fit=crop"}
            alt={b.tours?.title}
            className="h-24 w-full sm:w-24 rounded-xl object-cover"
            loading="lazy"
          />
        </Link>
        <div className="flex-1 min-w-0 space-y-1">
          <Link to={`/tours/${b.tour_id}`} className="font-semibold text-foreground hover:text-primary transition-colors line-clamp-1">
            {b.tours?.title}
          </Link>
          {b.tours?.destinations && (
            <p className="flex items-center gap-1 text-xs text-muted-foreground">
              <MapPin className="h-3 w-3 shrink-0" />
              {b.tours.destinations.name}, {b.tours.destinations.country}
            </p>
          )}
          <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
            <span className="flex items-center gap-1"><Calendar className="h-3 w-3" /> {new Date(b.start_date).toLocaleDateString("en-KE", { month: "short", day: "numeric", year: "numeric" })}</span>
            <span className="flex items-center gap-1"><Users className="h-3 w-3" /> {b.guests_count} guest{b.guests_count > 1 ? "s" : ""}</span>
          </div>
          {(b as any).booking_reference && (
            <p className="text-xs text-muted-foreground font-mono">Ref: {(b as any).booking_reference}</p>
          )}
        </div>
        <div className="flex flex-row sm:flex-col items-center sm:items-end justify-between gap-2 shrink-0">
          <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${status.className}`}>{status.label}</span>
          <span className="text-lg font-bold text-foreground">{formatKES(b.total_price)}</span>
          <div className="flex gap-2 flex-wrap justify-end">
            {b.status !== "cancelled" && b.tours?.whatsapp_group_link && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => window.open(b.tours.whatsapp_group_link, "_blank", "noopener,noreferrer")}
              >
                <MessageCircle className="mr-1 h-3 w-3" /> WhatsApp Group
              </Button>
            )}
            {b.status !== "cancelled" && (
              <InvoiceDownload data={{
                booking_reference: (b as any).booking_reference || b.id.slice(0, 8),
                customer_name: user?.user_metadata?.full_name || "Customer",
                customer_email: user?.email || "",
                customer_phone: (b as any).phone_number || "",
                tour_title: b.tours?.title || "Tour",
                destination: b.tours?.destinations?.name,
                start_date: b.start_date,
                guests_count: b.guests_count,
                price_per_person: Number(b.total_price) / b.guests_count,
                total_price: Number(b.total_price),
                discount_amount: Number((b as any).discount_amount || 0),
                amount_paid: Number((b as any).deposit_amount || 0),
                balance_due: Number((b as any).balance_due || 0),
                payment_status: (b as any).payment_status || (b.status === "paid" ? "paid" : "pending"),
                payment_method: (b as any).payment_method || undefined,
                created_at: b.created_at,
              }} />
            )}
            {b.status === "pending" && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setBookingToCancel(b)}
                className="text-destructive hover:text-destructive"
                disabled={cancelBooking.isPending}
              >
                <XCircle className="mr-1 h-3 w-3" /> Cancel
              </Button>
            )}
          </div>
        </div>
      </article>
    );
  };

  const SectionHeader = ({ icon: Icon, title, count }: { icon: any; title: string; count: number }) => (
    <div className="flex items-center gap-2 mb-4">
      <Icon className="h-5 w-5 text-muted-foreground" />
      <h2 className="text-lg font-semibold">{title}</h2>
      <span className="rounded-full bg-secondary px-2 py-0.5 text-xs font-medium text-muted-foreground">{count}</span>
    </div>
  );

  return (
    <Layout>
      <div className="container mx-auto px-4 py-10">
        <h1 className="text-3xl font-bold mb-1">My Trips</h1>
        <p className="text-muted-foreground mb-8">Manage your bookings and travel plans</p>

        {isError ? (
          <div className="py-20 text-center">
            <p className="text-lg font-medium mb-1">Something went wrong</p>
            <p className="text-muted-foreground mb-4">We couldn't load your bookings. Please try again.</p>
            <Button variant="outline" onClick={() => queryClient.invalidateQueries({ queryKey: ["my-bookings"] })}>Retry</Button>
          </div>
        ) : isLoading ? (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => <Skeleton key={i} className="h-28 w-full rounded-2xl" />)}
          </div>
        ) : bookings && bookings.length > 0 ? (
          <div className="space-y-10">
            {upcoming.length > 0 && (
              <section>
                <SectionHeader icon={Plane} title="Upcoming" count={upcoming.length} />
                <div className="space-y-3">{upcoming.map((b: any) => <BookingCard key={b.id} b={b} />)}</div>
              </section>
            )}
            {completed.length > 0 && (
              <section>
                <SectionHeader icon={CheckCircle2} title="Completed" count={completed.length} />
                <div className="space-y-3">{completed.map((b: any) => <BookingCard key={b.id} b={b} />)}</div>
              </section>
            )}
            {cancelled.length > 0 && (
              <section>
                <SectionHeader icon={XCircle} title="Cancelled" count={cancelled.length} />
                <div className="space-y-3 opacity-60">{cancelled.map((b: any) => <BookingCard key={b.id} b={b} />)}</div>
              </section>
            )}
          </div>
        ) : (
          <div className="py-20 text-center">
            <Plane className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
            <p className="text-lg font-medium text-foreground mb-1">No trips yet</p>
            <p className="text-muted-foreground mb-4">Your African adventure is just a click away.</p>
            <Link to="/destinations">
              <Button variant="accent">Explore Tours</Button>
            </Link>
          </div>
        )}
      </div>

      <AlertDialog open={!!bookingToCancel} onOpenChange={(open) => !open && setBookingToCancel(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancel this booking?</AlertDialogTitle>
            <AlertDialogDescription>
              This action marks your booking as cancelled and cannot be undone automatically. Contact support if you need help restoring it.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={cancelBooking.isPending}>Keep Booking</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => bookingToCancel && cancelBooking.mutate(bookingToCancel)}
              disabled={cancelBooking.isPending}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Confirm Cancel
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Layout>
  );
};

export default Dashboard;
