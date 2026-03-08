import { useEffect, useMemo, useState, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  AlertTriangle, Ban, DollarSign, Edit, Eye, EyeOff, Globe, Image as ImageIcon,
  Loader2, Plus, Search, Trash2, Users, X, Upload, Car, Download, QrCode, CalendarDays,
} from "lucide-react";
import { formatKES } from "@/lib/formatKES";
import { QRCodeSVG } from "qrcode.react";
import { format } from "date-fns";
import Layout from "@/components/Layout";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";

const CATEGORIES = [
  { value: "safari", label: "Safari" },
  { value: "roadtrip", label: "Road Trip" },
  { value: "hike", label: "Hiking" },
  { value: "international", label: "International" },
  { value: "beach", label: "Beach" },
  { value: "cultural", label: "Cultural" },
];

const slugify = (value: string) => value.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");

const AdminDashboard = () => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [tourToDelete, setTourToDelete] = useState<any | null>(null);
  const [tourToCancel, setTourToCancel] = useState<any | null>(null);
  const [bookingToCancel, setBookingToCancel] = useState<any | null>(null);
  const [editingTour, setEditingTour] = useState<any | null>(null);
  const [slotEdits, setSlotEdits] = useState<Record<string, string>>({});
  const [bookingSearch, setBookingSearch] = useState("");
  const [bookingStatusFilter, setBookingStatusFilter] = useState("all");

  const { data: role } = useQuery({
    queryKey: ["user-role", user?.id],
    queryFn: async () => {
      const { data } = await supabase.from("user_roles").select("role").eq("user_id", user!.id).eq("role", "admin").maybeSingle();
      return data;
    },
    enabled: !!user,
  });

  useEffect(() => {
    if (!loading && !user) navigate("/auth");
  }, [loading, user, navigate]);

  const isAdmin = !!role;

  const { data: adminTours, isLoading: toursLoading } = useQuery({
    queryKey: ["admin-tours"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tours")
        .select("*, destinations(name, country), tour_images(id, image_url, display_order)")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: isAdmin,
  });

  const { data: destinations } = useQuery({
    queryKey: ["destinations"],
    queryFn: async () => {
      const { data, error } = await supabase.from("destinations").select("*").order("name", { ascending: true });
      if (error) throw error;
      return data || [];
    },
    enabled: isAdmin,
  });

  const { data: adminBookings, isLoading: bookingsLoading } = useQuery({
    queryKey: ["admin-bookings"],
    queryFn: async () => {
      const { data: bookings, error } = await supabase
        .from("bookings")
        .select("id, created_at, start_date, end_date, guests_count, total_price, status, phone_number, special_requests, user_id, cancelled_by, cancelled_at, tour_id, tours(title, category, destinations(name))")
        .order("created_at", { ascending: false });
      if (error) throw error;

      const ids = Array.from(new Set((bookings || []).flatMap((b: any) => [b.user_id, b.cancelled_by]).filter(Boolean)));
      let profileMap: Record<string, { full_name: string | null; email: string | null; phone: string | null }> = {};
      if (ids.length > 0) {
        const { data: profiles } = await supabase.from("profiles").select("id, full_name, email, phone").in("id", ids);
        profileMap = Object.fromEntries((profiles || []).map((p) => [p.id, { full_name: p.full_name, email: p.email, phone: p.phone }]));
      }

      return (bookings || []).map((booking: any) => ({
        ...booking,
        bookedByProfile: profileMap[booking.user_id] || null,
        cancelledByProfile: booking.cancelled_by ? profileMap[booking.cancelled_by] || null : null,
      }));
    },
    enabled: isAdmin,
  });

  const stats = useMemo(() => {
    const totalRevenue = (adminBookings || []).reduce((sum: number, b: any) => sum + (b.status === "paid" ? Number(b.total_price) : 0), 0);
    const activeBookings = (adminBookings || []).filter((b: any) => b.status === "pending" || b.status === "paid").length;
    const cancelledBookings = (adminBookings || []).filter((b: any) => b.status === "cancelled").length;
    const canceledTours = (adminTours || []).filter((t: any) => t.status === "canceled").length;
    const activeTours = (adminTours || []).filter((t: any) => t.status === "published").length;
    return {
      totalRevenue,
      activeBookings,
      cancelledBookings,
      totalTours: adminTours?.length || 0,
      activeTours,
      totalBookings: adminBookings?.length || 0,
      canceledTours,
    };
  }, [adminBookings, adminTours]);

  const guestsByTour = useMemo(() => {
    const out: Record<string, number> = {};
    (adminBookings || []).forEach((b: any) => {
      if (b.status === "cancelled") return;
      out[b.tour_id] = (out[b.tour_id] || 0) + Number(b.guests_count || 0);
    });
    return out;
  }, [adminBookings]);

  const activeBookingCountByTour = useMemo(() => {
    const out: Record<string, number> = {};
    (adminBookings || []).forEach((b: any) => {
      if (b.status === "cancelled") return;
      out[b.tour_id] = (out[b.tour_id] || 0) + 1;
    });
    return out;
  }, [adminBookings]);

  const soldOutAlerts = useMemo(() => {
    const capacityByTour = Object.fromEntries((adminTours || []).map((t: any) => [t.id, Number(t.max_total_slots || 0)]));
    return (adminTours || [])
      .filter((t: any) => {
        const booked = guestsByTour[t.id] || 0;
        const cap = capacityByTour[t.id] || 0;
        return cap > 0 && booked >= cap;
      })
      .map((t: any) => ({ tourId: t.id, tourTitle: t.title, booked: guestsByTour[t.id] || 0, capacity: capacityByTour[t.id] || 0 }));
  }, [adminTours, guestsByTour]);

  const filteredBookings = useMemo(() => {
    let list = adminBookings || [];
    if (bookingStatusFilter !== "all") {
      list = list.filter((b: any) => b.status === bookingStatusFilter);
    }
    if (bookingSearch.trim()) {
      const q = bookingSearch.toLowerCase();
      list = list.filter((b: any) =>
        (b.bookedByProfile?.full_name || "").toLowerCase().includes(q) ||
        (b.bookedByProfile?.email || "").toLowerCase().includes(q) ||
        (b.tours?.title || "").toLowerCase().includes(q) ||
        (b.phone_number || "").includes(q)
      );
    }
    return list;
  }, [adminBookings, bookingStatusFilter, bookingSearch]);

  const exportBookingsCSV = useCallback(() => {
    const rows = filteredBookings.map((b: any) => ({
      "Customer": b.bookedByProfile?.full_name || "Unknown",
      "Email": b.bookedByProfile?.email || "",
      "Phone": b.phone_number || b.bookedByProfile?.phone || "",
      "Tour": b.tours?.title || "",
      "Category": b.tours?.category || "",
      "Guests": b.guests_count,
      "Total": b.total_price,
      "Start Date": b.start_date,
      "Status": b.status,
      "Booked": new Date(b.created_at).toLocaleDateString(),
    }));
    const headers = Object.keys(rows[0] || {});
    const csv = [headers.join(","), ...rows.map((r: any) => headers.map((h) => `"${String(r[h]).replace(/"/g, '""')}"`).join(","))].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `bookings-${new Date().toISOString().slice(0, 10)}.csv`; a.click();
    URL.revokeObjectURL(url);
    toast.success("CSV exported");
  }, [filteredBookings]);

  /* ── Mutations ── */
  const toggleStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { error } = await supabase.from("tours").update({ status: status as any }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Tour status updated"); queryClient.invalidateQueries({ queryKey: ["admin-tours"] }); },
  });

  const cancelTourMut = useMutation({
    mutationFn: async (tourId: string) => {
      const { error } = await supabase.from("tours").update({ status: "canceled" }).eq("id", tourId);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Tour canceled");
      setTourToCancel(null);
      queryClient.invalidateQueries({ queryKey: ["admin-tours"] });
    },
    onError: () => toast.error("Failed to cancel tour"),
  });

  const deleteTour = useMutation({
    mutationFn: async (tourId: string) => {
      const active = activeBookingCountByTour[tourId] || 0;
      if (active > 0) throw new Error(`Cannot delete: ${active} active booking(s) exist. Cancel or complete them first.`);
      const { error } = await supabase.from("tours").delete().eq("id", tourId);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Tour deleted");
      queryClient.invalidateQueries({ queryKey: ["admin-tours"] });
      queryClient.invalidateQueries({ queryKey: ["admin-bookings"] });
      setTourToDelete(null);
    },
    onError: (err: any) => toast.error(err.message || "Failed to delete tour"),
  });

  const updateTourSlots = useMutation({
    mutationFn: async ({ tourId, maxTotalSlots }: { tourId: string; maxTotalSlots: number }) => {
      const { error } = await supabase.from("tours").update({ max_total_slots: maxTotalSlots }).eq("id", tourId);
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Capacity updated"); queryClient.invalidateQueries({ queryKey: ["admin-tours"] }); },
    onError: () => toast.error("Failed to update capacity"),
  });

  const toggleFixedDate = useMutation({
    mutationFn: async ({ tourId, isFixed, date }: { tourId: string; isFixed: boolean; date: string | null }) => {
      const { error } = await supabase.from("tours").update({
        is_fixed_date: isFixed,
        departure_date: date,
        allow_custom_dates: !isFixed,
      } as any).eq("id", tourId);
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Date mode updated"); queryClient.invalidateQueries({ queryKey: ["admin-tours"] }); },
    onError: () => toast.error("Failed to update date mode"),
  });

  const toggleTrending = useMutation({
    mutationFn: async ({ destId, trending }: { destId: string; trending: boolean }) => {
      const { error } = await supabase.from("destinations").update({ is_trending: trending } as any).eq("id", destId);
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Trending status updated"); queryClient.invalidateQueries({ queryKey: ["destinations"] }); queryClient.invalidateQueries({ queryKey: ["trending-destinations"] }); },
    onError: () => toast.error("Failed to update"),
  });

  const cancelBookingMut = useMutation({
    mutationFn: async (booking: any) => {
      const { error } = await supabase
        .from("bookings")
        .update({ status: "cancelled", cancelled_at: new Date().toISOString(), cancelled_by: user!.id })
        .eq("id", booking.id);
      if (error) throw error;

      supabase.functions.invoke("send-booking-email", {
        body: {
          to_email: booking.bookedByProfile?.email || "",
          to_name: booking.bookedByProfile?.full_name || "",
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
      queryClient.invalidateQueries({ queryKey: ["admin-bookings"] });
    },
    onError: () => toast.error("Failed to cancel booking"),
  });

  if (loading) return null;
  if (!isAdmin) {
    return (
      <Layout>
        <div className="container mx-auto px-4 py-20 text-center">
          <h1 className="text-2xl font-bold mb-2">Access Denied</h1>
          <p className="text-muted-foreground">You need admin privileges to view this page.</p>
          <Button variant="outline" onClick={() => navigate("/")} className="mt-4">Go Home</Button>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="container mx-auto px-4 py-10 space-y-8">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-3xl font-bold">Admin Dashboard</h1>
            <p className="text-muted-foreground">Manage tours, bookings, capacity, and revenue</p>
          </div>
          <CreateTourDialog destinations={destinations || []} />
        </div>

        {/* Stats */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7">
          <StatCard icon={DollarSign} label="Revenue (Paid)" value={formatKES(stats.totalRevenue)} />
          <StatCard icon={Globe} label="Total Tours" value={String(stats.totalTours)} />
          <StatCard icon={Eye} label="Active Tours" value={String(stats.activeTours)} />
          <StatCard icon={Users} label="Total Bookings" value={String(stats.totalBookings)} />
          <StatCard icon={Users} label="Active Bookings" value={String(stats.activeBookings)} />
          <StatCard icon={Ban} label="Cancelled" value={String(stats.cancelledBookings)} />
          <StatCard icon={AlertTriangle} label="Sold Out" value={String(soldOutAlerts.length)} />
        </div>

        {soldOutAlerts.length > 0 && (
          <div className="rounded-xl border border-destructive/40 bg-destructive/5 p-4">
            <div className="flex items-center gap-2 mb-2">
              <AlertTriangle className="h-4 w-4 text-destructive" />
              <p className="font-medium text-destructive">Capacity Alerts — Sold Out Tours</p>
            </div>
            <div className="space-y-1 text-sm">
              {soldOutAlerts.map((a) => (
                <p key={a.tourId}>
                  <strong>{a.tourTitle}</strong> — {a.booked}/{a.capacity} booked 🔴
                </p>
              ))}
            </div>
          </div>
        )}

        <Tabs defaultValue="tours" className="space-y-6">
          <TabsList>
            <TabsTrigger value="tours">Tour Management</TabsTrigger>
            <TabsTrigger value="bookings">Bookings CRM</TabsTrigger>
            <TabsTrigger value="destinations">Destinations</TabsTrigger>
          </TabsList>

          {/* ── TOURS TAB ── */}
          <TabsContent value="tours" className="space-y-4">
            {toursLoading ? (
              <div className="space-y-2">{[1, 2, 3].map((i) => <Skeleton key={i} className="h-20 rounded-xl" />)}</div>
            ) : adminTours && adminTours.length > 0 ? (
              <div className="space-y-3">
                {adminTours.map((tour: any) => {
                  const bookedGuests = guestsByTour[tour.id] || 0;
                  const capacity = Number(tour.max_total_slots || 0);
                  const capacityPct = capacity > 0 ? Math.min((bookedGuests / capacity) * 100, 100) : 0;
                  const isCanceled = tour.status === "canceled";
                  const activeCount = activeBookingCountByTour[tour.id] || 0;
                  const isSoldOut = capacity > 0 && bookedGuests >= capacity;

                  return (
                    <div key={tour.id} className={`rounded-xl border border-border bg-card p-4 space-y-3 ${isCanceled ? "opacity-60" : ""}`}>
                      <div className="flex items-center gap-4">
                        <img
                          src={tour.tour_images?.[0]?.image_url || tour.image_url || "https://images.unsplash.com/photo-1516426122078-c23e76319801?w=100&h=100&fit=crop"}
                          alt={tour.title}
                          className="h-14 w-14 rounded-lg object-cover shrink-0"
                          onError={(e) => { (e.target as HTMLImageElement).src = "https://images.unsplash.com/photo-1516426122078-c23e76319801?w=100&h=100&fit=crop"; }}
                        />
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold truncate">{tour.title}</p>
                          <p className="text-xs text-muted-foreground">
                            {tour.destinations?.name || "No destination"} • {formatKES(tour.price_per_person)}/person • {tour.duration_days} days
                          </p>
                          {tour.is_fixed_date && tour.departure_date && (
                            <p className="text-xs text-primary font-medium mt-0.5">
                              <CalendarDays className="inline h-3 w-3 mr-1" />
                              Fixed: {format(new Date(tour.departure_date), "MMM d, yyyy")}
                            </p>
                          )}
                        </div>
                        <div className="flex items-center gap-2 shrink-0 flex-wrap">
                          <span className="rounded-full bg-secondary px-2 py-0.5 text-xs font-medium text-secondary-foreground capitalize">
                            {tour.category || "safari"}
                          </span>
                          <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${
                            tour.status === "published" ? "bg-primary/10 text-primary"
                            : tour.status === "canceled" ? "bg-destructive/10 text-destructive"
                            : tour.status === "completed" ? "bg-accent/10 text-accent"
                            : "bg-muted text-muted-foreground"
                          }`}>
                            {tour.status}
                          </span>
                          {isSoldOut && (
                            <span className="rounded-full bg-destructive px-2.5 py-0.5 text-xs font-bold text-destructive-foreground">
                              SOLD OUT
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="space-y-1">
                        <div className="flex items-center justify-between text-xs text-muted-foreground">
                          <span>Capacity: {bookedGuests} / {capacity} guests booked • {activeCount} booking(s)</span>
                          <span>{Math.round(capacityPct)}%</span>
                        </div>
                        <Progress value={capacityPct} className="h-2" />
                      </div>

                      <div className="flex items-center gap-2 flex-wrap">
                        <div className="flex items-center gap-1">
                          <Input
                            className="w-20 h-8 text-xs"
                            type="number"
                            min="1"
                            value={slotEdits[tour.id] ?? String(tour.max_total_slots)}
                            onChange={(e) => setSlotEdits((p) => ({ ...p, [tour.id]: e.target.value }))}
                          />
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-8 text-xs"
                            onClick={() => {
                              const v = Number(slotEdits[tour.id] ?? tour.max_total_slots);
                              if (!Number.isInteger(v) || v < 1) { toast.error("Must be at least 1"); return; }
                              updateTourSlots.mutate({ tourId: tour.id, maxTotalSlots: v });
                            }}
                          >
                            Update Slots
                          </Button>
                        </div>

                        <FixedDateToggle tour={tour} onToggle={toggleFixedDate.mutate} />

                        {!isCanceled && tour.status !== "completed" && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 text-xs"
                            onClick={() => toggleStatus.mutate({ id: tour.id, status: tour.status === "published" ? "draft" : "published" })}
                          >
                            {tour.status === "published" ? <><EyeOff className="mr-1 h-3 w-3" /> Unpublish</> : <><Eye className="mr-1 h-3 w-3" /> Publish</>}
                          </Button>
                        )}

                        <Button variant="ghost" size="sm" className="h-8 text-xs" onClick={() => setEditingTour(tour)}>
                          <Edit className="mr-1 h-3 w-3" /> Edit
                        </Button>

                        <ManageImagesDialog tour={tour} />

                        <TourQRCode tour={tour} />

                        {!isCanceled && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 text-xs text-destructive hover:text-destructive"
                            onClick={() => setTourToCancel(tour)}
                          >
                            <Ban className="mr-1 h-3 w-3" /> Cancel Tour
                          </Button>
                        )}

                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-destructive hover:text-destructive ml-auto"
                          onClick={() => setTourToDelete(tour)}
                          title="Delete tour"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="py-16 text-center">
                <Globe className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
                <p className="text-lg font-medium mb-1">No tours yet</p>
                <p className="text-muted-foreground">Create your first tour to get started.</p>
              </div>
            )}
          </TabsContent>

          {/* ── BOOKINGS TAB ── */}
          <TabsContent value="bookings" className="space-y-4">
            <div className="flex flex-wrap gap-3 items-center">
              <div className="relative flex-1 min-w-[200px]">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  className="pl-9"
                  placeholder="Search by name, email, phone, or tour..."
                  value={bookingSearch}
                  onChange={(e) => setBookingSearch(e.target.value)}
                />
              </div>
              <Select value={bookingStatusFilter} onValueChange={setBookingStatusFilter}>
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="Filter status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="paid">Paid</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                </SelectContent>
              </Select>
              <Button variant="outline" size="sm" onClick={exportBookingsCSV} disabled={filteredBookings.length === 0}>
                <Download className="mr-1 h-4 w-4" /> Export CSV
              </Button>
            </div>

            <p className="text-sm text-muted-foreground">{filteredBookings.length} booking{filteredBookings.length !== 1 ? "s" : ""}</p>

            {bookingsLoading ? (
              <Skeleton className="h-56 rounded-xl" />
            ) : (
              <div className="rounded-xl border border-border bg-card overflow-x-auto">
                <table className="w-full min-w-[1200px] text-sm">
                  <thead className="bg-muted/50">
                    <tr className="text-left">
                      <th className="px-4 py-3 font-medium">Customer</th>
                      <th className="px-4 py-3 font-medium">Email</th>
                      <th className="px-4 py-3 font-medium">Phone</th>
                      <th className="px-4 py-3 font-medium">Tour</th>
                      <th className="px-4 py-3 font-medium">Category</th>
                      <th className="px-4 py-3 font-medium">Guests</th>
                      <th className="px-4 py-3 font-medium">Total</th>
                      <th className="px-4 py-3 font-medium">Start</th>
                      <th className="px-4 py-3 font-medium">Status</th>
                      <th className="px-4 py-3 font-medium">Cancelled By</th>
                      <th className="px-4 py-3 font-medium">Booked</th>
                      <th className="px-4 py-3 font-medium">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredBookings.map((b: any) => (
                      <tr key={b.id} className="border-t border-border align-top hover:bg-muted/30 transition-colors">
                        <td className="px-4 py-3 font-medium">{b.bookedByProfile?.full_name || "Unknown"}</td>
                        <td className="px-4 py-3 text-muted-foreground text-xs">{b.bookedByProfile?.email || "—"}</td>
                        <td className="px-4 py-3 text-xs">{b.phone_number || b.bookedByProfile?.phone || "—"}</td>
                        <td className="px-4 py-3">{b.tours?.title || "—"}</td>
                        <td className="px-4 py-3">
                          <span className="rounded-full bg-secondary px-2 py-0.5 text-xs font-medium text-secondary-foreground capitalize">
                            {b.tours?.category || "safari"}
                          </span>
                        </td>
                        <td className="px-4 py-3">{b.guests_count}</td>
                        <td className="px-4 py-3 font-medium">{formatKES(b.total_price)}</td>
                        <td className="px-4 py-3 text-xs">{new Date(b.start_date).toLocaleDateString()}</td>
                        <td className="px-4 py-3">
                          <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                            b.status === "paid" ? "bg-primary/10 text-primary"
                            : b.status === "cancelled" ? "bg-destructive/10 text-destructive"
                            : "bg-accent/10 text-accent"
                          }`}>
                            {b.status}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-xs text-muted-foreground">
                          {b.status === "cancelled" ? (
                            <div>
                              <p>{b.cancelledByProfile?.full_name || "—"}</p>
                              {b.cancelled_at && <p>{new Date(b.cancelled_at).toLocaleDateString()}</p>}
                            </div>
                          ) : "—"}
                        </td>
                        <td className="px-4 py-3 text-xs text-muted-foreground">
                          {new Date(b.created_at).toLocaleDateString()}
                        </td>
                        <td className="px-4 py-3">
                          {b.status !== "cancelled" && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-destructive hover:text-destructive text-xs h-7"
                              onClick={() => setBookingToCancel(b)}
                            >
                              Cancel
                            </Button>
                          )}
                        </td>
                      </tr>
                    ))}
                    {filteredBookings.length === 0 && (
                      <tr>
                        <td colSpan={12} className="px-4 py-8 text-center text-muted-foreground">No bookings found</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </TabsContent>

          {/* ── DESTINATIONS TAB ── */}
          <TabsContent value="destinations" className="space-y-4">
            <p className="text-sm text-muted-foreground">Toggle trending status for destinations shown on the homepage.</p>
            {destinations && destinations.length > 0 ? (
              <div className="space-y-2">
                {destinations.map((d: any) => (
                  <div key={d.id} className="flex items-center justify-between rounded-xl border border-border bg-card p-4">
                    <div className="flex items-center gap-3">
                      <img
                        src={d.image_url || "https://images.unsplash.com/photo-1516426122078-c23e76319801?w=60&h=60&fit=crop"}
                        alt={d.name}
                        className="h-10 w-10 rounded-lg object-cover"
                        onError={(e) => { (e.target as HTMLImageElement).src = "https://images.unsplash.com/photo-1516426122078-c23e76319801?w=60&h=60&fit=crop"; }}
                      />
                      <div>
                        <p className="font-medium">{d.name}</p>
                        <p className="text-xs text-muted-foreground">{d.country}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground">Trending</span>
                      <Switch
                        checked={!!d.is_trending}
                        onCheckedChange={(checked) => toggleTrending.mutate({ destId: d.id, trending: checked })}
                      />
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-muted-foreground text-center py-8">No destinations yet.</p>
            )}
          </TabsContent>
        </Tabs>
      </div>

      {/* Delete Tour Dialog */}
      <AlertDialog open={!!tourToDelete} onOpenChange={(open) => !open && setTourToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this tour?</AlertDialogTitle>
            <AlertDialogDescription>
              {(activeBookingCountByTour[tourToDelete?.id] || 0) > 0
                ? `This tour has ${activeBookingCountByTour[tourToDelete?.id]} active booking(s). You must cancel or complete them before deleting.`
                : `This will permanently remove "${tourToDelete?.title}" and all its images.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteTour.isPending}>Keep Tour</AlertDialogCancel>
            <AlertDialogAction
              disabled={deleteTour.isPending || (activeBookingCountByTour[tourToDelete?.id] || 0) > 0}
              onClick={() => tourToDelete && deleteTour.mutate(tourToDelete.id)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteTour.isPending && <Loader2 className="mr-1 h-4 w-4 animate-spin" />}
              Delete Tour
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Cancel Tour Dialog */}
      <AlertDialog open={!!tourToCancel} onOpenChange={(open) => !open && setTourToCancel(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancel this tour?</AlertDialogTitle>
            <AlertDialogDescription>
              Canceling "{tourToCancel?.title}" will prevent new bookings. Existing bookings will remain but should be manually cancelled. This cannot be easily undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={cancelTourMut.isPending}>Keep Active</AlertDialogCancel>
            <AlertDialogAction
              disabled={cancelTourMut.isPending}
              onClick={() => tourToCancel && cancelTourMut.mutate(tourToCancel.id)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {cancelTourMut.isPending && <Loader2 className="mr-1 h-4 w-4 animate-spin" />}
              Cancel Tour
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Cancel Booking Dialog */}
      <AlertDialog open={!!bookingToCancel} onOpenChange={(open) => !open && setBookingToCancel(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancel this booking?</AlertDialogTitle>
            <AlertDialogDescription>
              Cancel booking by {bookingToCancel?.bookedByProfile?.full_name || "Unknown"} for {bookingToCancel?.tours?.title || "Unknown Tour"}. A cancellation email will be sent.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={cancelBookingMut.isPending}>Keep Booking</AlertDialogCancel>
            <AlertDialogAction
              disabled={cancelBookingMut.isPending}
              onClick={() => bookingToCancel && cancelBookingMut.mutate(bookingToCancel)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {cancelBookingMut.isPending && <Loader2 className="mr-1 h-4 w-4 animate-spin" />}
              Confirm Cancel
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Edit Tour Dialog */}
      {editingTour && (
        <EditTourDialog
          tour={editingTour}
          destinations={destinations || []}
          onClose={() => setEditingTour(null)}
        />
      )}
    </Layout>
  );
};

/* ─── Stat Card ────────────────────────────────────────────────────── */
const StatCard = ({ icon: Icon, label, value }: { icon: any; label: string; value: string }) => (
  <div className="rounded-2xl border border-border bg-card p-5">
    <div className="flex items-center gap-3 mb-2">
      <div className="rounded-xl bg-primary/10 p-2">
        <Icon className="h-5 w-5 text-primary" />
      </div>
      <span className="text-xs text-muted-foreground">{label}</span>
    </div>
    <p className="text-2xl font-bold text-foreground">{value}</p>
  </div>
);

/* ─── Fixed Date Toggle ───────────────────────────────────────────── */
const FixedDateToggle = ({ tour, onToggle }: { tour: any; onToggle: (args: { tourId: string; isFixed: boolean; date: string | null }) => void }) => {
  const [datePickerOpen, setDatePickerOpen] = useState(false);
  const currentDate = tour.departure_date ? new Date(tour.departure_date + "T00:00:00") : undefined;

  if (tour.is_fixed_date) {
    return (
      <div className="flex items-center gap-1">
        <Button variant="outline" size="sm" className="h-8 text-xs" onClick={() => onToggle({ tourId: tour.id, isFixed: false, date: null })}>
          <CalendarDays className="mr-1 h-3 w-3" /> Make Flexible
        </Button>
        <Popover open={datePickerOpen} onOpenChange={setDatePickerOpen}>
          <PopoverTrigger asChild>
            <Button variant="ghost" size="sm" className="h-8 text-xs">
              Change Date
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar
              mode="single"
              selected={currentDate}
              onSelect={(d) => {
                if (d) {
                  onToggle({ tourId: tour.id, isFixed: true, date: d.toISOString().split("T")[0] });
                  setDatePickerOpen(false);
                }
              }}
              disabled={(date) => date < new Date(new Date().toDateString())}
              initialFocus
              className={cn("p-3 pointer-events-auto")}
            />
          </PopoverContent>
        </Popover>
      </div>
    );
  }

  return (
    <Popover open={datePickerOpen} onOpenChange={setDatePickerOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" className="h-8 text-xs">
          <CalendarDays className="mr-1 h-3 w-3" /> Set Fixed Date
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          mode="single"
          selected={currentDate}
          onSelect={(d) => {
            if (d) {
              onToggle({ tourId: tour.id, isFixed: true, date: d.toISOString().split("T")[0] });
              setDatePickerOpen(false);
            }
          }}
          disabled={(date) => date < new Date(new Date().toDateString())}
          initialFocus
          className={cn("p-3 pointer-events-auto")}
        />
      </PopoverContent>
    </Popover>
  );
};

/* ─── Tour QR Code ─────────────────────────────────────────────────── */
const TourQRCode = ({ tour }: { tour: any }) => {
  const [open, setOpen] = useState(false);
  const qrRef = useRef<HTMLDivElement>(null);
  const tourUrl = `${window.location.origin}/tours/${tour.id}`;

  const downloadQR = () => {
    const svg = qrRef.current?.querySelector("svg");
    if (!svg) return;
    const svgData = new XMLSerializer().serializeToString(svg);
    const canvas = document.createElement("canvas");
    canvas.width = 1024;
    canvas.height = 1024;
    const ctx = canvas.getContext("2d")!;
    const img = new Image();
    img.onload = () => {
      ctx.fillStyle = "white";
      ctx.fillRect(0, 0, 1024, 1024);
      ctx.drawImage(img, 0, 0, 1024, 1024);
      const a = document.createElement("a");
      a.download = `qr-${tour.slug || tour.id}.png`;
      a.href = canvas.toDataURL("image/png");
      a.click();
    };
    img.src = "data:image/svg+xml;base64," + btoa(unescape(encodeURIComponent(svgData)));
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm" className="h-8 text-xs">
          <QrCode className="mr-1 h-3 w-3" /> QR
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>QR Code — {tour.title}</DialogTitle>
          <DialogDescription>Scan to view tour page. Download for print marketing.</DialogDescription>
        </DialogHeader>
        <div className="flex flex-col items-center gap-4 py-4">
          <div ref={qrRef} className="rounded-xl border border-border p-4 bg-card">
            <QRCodeSVG value={tourUrl} size={256} level="H" includeMargin fgColor="#1a1a1a" bgColor="#ffffff" />
          </div>
          <p className="text-xs text-muted-foreground text-center break-all">{tourUrl}</p>
          <Button variant="accent" onClick={downloadQR} className="w-full">
            <Download className="mr-2 h-4 w-4" /> Download QR Code
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

/* ─── Create Tour Dialog ──────────────────────────────────────────── */
const CreateTourDialog = ({ destinations }: { destinations: any[] }) => {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [destSearch, setDestSearch] = useState("");
  const [form, setForm] = useState({
    title: "", description: "", destination_id: "none",
    destination_name: "", destination_country: "",
    whatsapp_group_link: "", price_per_person: "", discount_price: "",
    duration_days: "3", difficulty: "Easy" as "Easy" | "Medium" | "Hard",
    max_group_size: "10", max_total_slots: "50",
    image_url: "", highlights: "", included: "", excluded: "",
    category: "safari",
    is_fixed_date: false, departure_date: "",
  });

  const resetForm = () => {
    setForm({
      title: "", description: "", destination_id: "none",
      destination_name: "", destination_country: "",
      whatsapp_group_link: "", price_per_person: "", discount_price: "",
      duration_days: "3", difficulty: "Easy", max_group_size: "10",
      max_total_slots: "50", image_url: "", highlights: "", included: "", excluded: "",
      category: "safari",
      is_fixed_date: false, departure_date: "",
    });
    setDestSearch("");
  };

  const filteredDests = destSearch.trim()
    ? destinations.filter((d) => `${d.name} ${d.country}`.toLowerCase().includes(destSearch.toLowerCase()))
    : destinations;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title || !form.price_per_person) { toast.error("Fill required fields"); return; }

    const hasManual = !!form.destination_name.trim() || !!form.destination_country.trim();
    if (hasManual && (!form.destination_name.trim() || !form.destination_country.trim())) {
      toast.error("Enter both destination name and country"); return;
    }
    if (form.destination_id === "none" && !hasManual) {
      toast.error("Pick or type a destination"); return;
    }
    if (form.whatsapp_group_link && !/^https?:\/\//i.test(form.whatsapp_group_link.trim())) {
      toast.error("WhatsApp link must start with http:// or https://"); return;
    }
    if (form.is_fixed_date && !form.departure_date) {
      toast.error("Set a departure date for fixed-date tours"); return;
    }

    setSubmitting(true);
    try {
      let destinationId = form.destination_id !== "none" ? form.destination_id : null;
      if (hasManual) {
        const slug = `${slugify(`${form.destination_name}-${form.destination_country}`) || "destination"}-${Date.now()}`;
        const { data: created, error } = await supabase.from("destinations").insert({ name: form.destination_name.trim(), country: form.destination_country.trim(), slug }).select("id").single();
        if (error) throw error;
        destinationId = created.id;
      }

      const tourSlug = `${slugify(form.title) || "tour"}-${Date.now()}`;
      const { error } = await supabase.from("tours").insert({
        title: form.title, slug: tourSlug, description: form.description,
        destination_id: destinationId,
        whatsapp_group_link: form.whatsapp_group_link.trim() || null,
        price_per_person: Number(form.price_per_person),
        discount_price: form.discount_price ? Number(form.discount_price) : null,
        duration_days: Number(form.duration_days),
        difficulty: form.difficulty,
        max_group_size: Number(form.max_group_size),
        max_total_slots: Number(form.max_total_slots),
        image_url: form.image_url || null,
        highlights: form.highlights.split(",").map((s) => s.trim()).filter(Boolean),
        included: form.included.split(",").map((s) => s.trim()).filter(Boolean),
        excluded: form.excluded.split(",").map((s) => s.trim()).filter(Boolean),
        category: form.category,
        status: "draft",
        is_fixed_date: form.is_fixed_date,
        departure_date: form.is_fixed_date && form.departure_date ? form.departure_date : null,
        allow_custom_dates: !form.is_fixed_date,
      } as any);
      if (error) throw error;

      toast.success("Tour created as draft");
      queryClient.invalidateQueries({ queryKey: ["admin-tours"] });
      queryClient.invalidateQueries({ queryKey: ["destinations"] });
      setOpen(false);
      resetForm();
    } catch { toast.error("Failed to create tour"); }
    finally { setSubmitting(false); }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="accent"><Plus className="mr-1 h-4 w-4" /> Create Tour</Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create New Tour</DialogTitle>
          <DialogDescription>Create a tour with destination, capacity, category, and optional WhatsApp group link.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="space-y-1.5"><Label>Title *</Label><Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required /></div>
          <div className="space-y-1.5"><Label>Description</Label>
            <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className="w-full rounded-xl border border-border bg-background p-3 text-sm outline-none focus:ring-2 focus:ring-ring resize-none" rows={3} />
          </div>

          {/* Category */}
          <div className="space-y-1.5">
            <Label>Category *</Label>
            <Select value={form.category} onValueChange={(v) => setForm({ ...form, category: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {CATEGORIES.map((c) => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          {/* Fixed Date Toggle */}
          <div className="flex items-center justify-between rounded-xl border border-border p-3">
            <div>
              <Label className="text-sm">Fixed Departure Date</Label>
              <p className="text-xs text-muted-foreground">Enable for tours with a specific departure date</p>
            </div>
            <Switch checked={form.is_fixed_date} onCheckedChange={(v) => setForm({ ...form, is_fixed_date: v })} />
          </div>
          {form.is_fixed_date && (
            <div className="space-y-1.5">
              <Label>Departure Date *</Label>
              <Input type="date" value={form.departure_date}
                onChange={(e) => setForm({ ...form, departure_date: e.target.value })}
                min={new Date().toISOString().split("T")[0]} />
            </div>
          )}

          {/* Searchable Destination */}
          <div className="space-y-1.5">
            <Label>Existing Destination</Label>
            <Input
              placeholder="Search destinations..."
              value={destSearch}
              onChange={(e) => setDestSearch(e.target.value)}
              className="mb-1"
            />
            <Select value={form.destination_id} onValueChange={(v) => setForm({ ...form, destination_id: v })}>
              <SelectTrigger><SelectValue placeholder="Select destination" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">None — type manually below</SelectItem>
                {filteredDests.map((d) => <SelectItem key={d.id} value={d.id}>{d.name} ({d.country})</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5"><Label>New Destination</Label><Input value={form.destination_name} onChange={(e) => setForm({ ...form, destination_name: e.target.value })} placeholder="e.g. Serengeti" /></div>
            <div className="space-y-1.5"><Label>Country</Label><Input value={form.destination_country} onChange={(e) => setForm({ ...form, destination_country: e.target.value })} placeholder="e.g. Tanzania" /></div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5"><Label>Price/person *</Label><Input type="number" min="0" value={form.price_per_person} onChange={(e) => setForm({ ...form, price_per_person: e.target.value })} required /></div>
            <div className="space-y-1.5"><Label>Discount Price</Label><Input type="number" min="0" value={form.discount_price} onChange={(e) => setForm({ ...form, discount_price: e.target.value })} /></div>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-1.5"><Label>Duration (days)</Label><Input type="number" min="1" value={form.duration_days} onChange={(e) => setForm({ ...form, duration_days: e.target.value })} /></div>
            <div className="space-y-1.5"><Label>Difficulty</Label>
              <Select value={form.difficulty} onValueChange={(v: any) => setForm({ ...form, difficulty: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Easy">Easy</SelectItem>
                  <SelectItem value="Medium">Medium</SelectItem>
                  <SelectItem value="Hard">Hard</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5"><Label>Max Group</Label><Input type="number" min="1" value={form.max_group_size} onChange={(e) => setForm({ ...form, max_group_size: e.target.value })} /></div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5"><Label>Max Total Slots</Label><Input type="number" min="1" value={form.max_total_slots} onChange={(e) => setForm({ ...form, max_total_slots: e.target.value })} /></div>
            <div className="space-y-1.5"><Label>WhatsApp Link</Label><Input value={form.whatsapp_group_link} onChange={(e) => setForm({ ...form, whatsapp_group_link: e.target.value })} placeholder="https://chat.whatsapp.com/..." /></div>
          </div>
          <div className="space-y-1.5"><Label>Image URL</Label><Input value={form.image_url} onChange={(e) => setForm({ ...form, image_url: e.target.value })} placeholder="https://..." /></div>
          <div className="space-y-1.5"><Label>Highlights (comma-separated)</Label><Input value={form.highlights} onChange={(e) => setForm({ ...form, highlights: e.target.value })} /></div>
          <div className="space-y-1.5"><Label>Included (comma-separated)</Label><Input value={form.included} onChange={(e) => setForm({ ...form, included: e.target.value })} /></div>
          <div className="space-y-1.5"><Label>Excluded (comma-separated)</Label><Input value={form.excluded} onChange={(e) => setForm({ ...form, excluded: e.target.value })} /></div>
          <Button type="submit" variant="accent" className="w-full" disabled={submitting}>
            {submitting && <Loader2 className="mr-1 h-4 w-4 animate-spin" />} Create Tour
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
};

/* ─── Edit Tour Dialog ─────────────────────────────────────────────── */
const EditTourDialog = ({ tour, destinations, onClose }: { tour: any; destinations: any[]; onClose: () => void }) => {
  const queryClient = useQueryClient();
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    title: tour.title || "",
    description: tour.description || "",
    destination_id: tour.destination_id || "none",
    whatsapp_group_link: tour.whatsapp_group_link || "",
    price_per_person: String(tour.price_per_person || ""),
    discount_price: tour.discount_price != null ? String(tour.discount_price) : "",
    duration_days: String(tour.duration_days || 1),
    difficulty: tour.difficulty || "Easy",
    max_group_size: String(tour.max_group_size || 10),
    max_total_slots: String(tour.max_total_slots || 50),
    image_url: tour.image_url || "",
    highlights: (tour.highlights || []).join(", "),
    included: (tour.included || []).join(", "),
    excluded: (tour.excluded || []).join(", "),
    category: tour.category || "safari",
    is_fixed_date: !!tour.is_fixed_date,
    departure_date: tour.departure_date || "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title || !form.price_per_person) { toast.error("Fill required fields"); return; }
    if (form.is_fixed_date && !form.departure_date) { toast.error("Set a departure date"); return; }
    setSubmitting(true);
    try {
      const { error } = await supabase.from("tours").update({
        title: form.title,
        description: form.description,
        destination_id: form.destination_id !== "none" ? form.destination_id : null,
        whatsapp_group_link: form.whatsapp_group_link.trim() || null,
        price_per_person: Number(form.price_per_person),
        discount_price: form.discount_price ? Number(form.discount_price) : null,
        duration_days: Number(form.duration_days),
        difficulty: form.difficulty,
        max_group_size: Number(form.max_group_size),
        max_total_slots: Number(form.max_total_slots),
        image_url: form.image_url || null,
        highlights: form.highlights.split(",").map((s) => s.trim()).filter(Boolean),
        included: form.included.split(",").map((s) => s.trim()).filter(Boolean),
        excluded: form.excluded.split(",").map((s) => s.trim()).filter(Boolean),
        category: form.category,
        is_fixed_date: form.is_fixed_date,
        departure_date: form.is_fixed_date && form.departure_date ? form.departure_date : null,
        allow_custom_dates: !form.is_fixed_date,
      } as any).eq("id", tour.id);
      if (error) throw error;
      toast.success("Tour updated");
      queryClient.invalidateQueries({ queryKey: ["admin-tours"] });
      onClose();
    } catch { toast.error("Failed to update tour"); }
    finally { setSubmitting(false); }
  };

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Tour</DialogTitle>
          <DialogDescription>Update tour details, pricing, category, and capacity.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="space-y-1.5"><Label>Title *</Label><Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required /></div>
          <div className="space-y-1.5"><Label>Description</Label>
            <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className="w-full rounded-xl border border-border bg-background p-3 text-sm outline-none focus:ring-2 focus:ring-ring resize-none" rows={3} />
          </div>
          <div className="space-y-1.5">
            <Label>Category</Label>
            <Select value={form.category} onValueChange={(v) => setForm({ ...form, category: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {CATEGORIES.map((c) => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          {/* Fixed Date Toggle */}
          <div className="flex items-center justify-between rounded-xl border border-border p-3">
            <div>
              <Label className="text-sm">Fixed Departure Date</Label>
              <p className="text-xs text-muted-foreground">Lock this tour to a specific date</p>
            </div>
            <Switch checked={form.is_fixed_date} onCheckedChange={(v) => setForm({ ...form, is_fixed_date: v })} />
          </div>
          {form.is_fixed_date && (
            <div className="space-y-1.5">
              <Label>Departure Date *</Label>
              <Input type="date" value={form.departure_date}
                onChange={(e) => setForm({ ...form, departure_date: e.target.value })}
                min={new Date().toISOString().split("T")[0]} />
            </div>
          )}

          <div className="space-y-1.5"><Label>Destination</Label>
            <Select value={form.destination_id} onValueChange={(v) => setForm({ ...form, destination_id: v })}>
              <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">None</SelectItem>
                {destinations.map((d) => <SelectItem key={d.id} value={d.id}>{d.name} ({d.country})</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5"><Label>Price/person *</Label><Input type="number" min="0" value={form.price_per_person} onChange={(e) => setForm({ ...form, price_per_person: e.target.value })} required /></div>
            <div className="space-y-1.5"><Label>Discount Price</Label><Input type="number" min="0" value={form.discount_price} onChange={(e) => setForm({ ...form, discount_price: e.target.value })} /></div>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-1.5"><Label>Duration</Label><Input type="number" min="1" value={form.duration_days} onChange={(e) => setForm({ ...form, duration_days: e.target.value })} /></div>
            <div className="space-y-1.5"><Label>Difficulty</Label>
              <Select value={form.difficulty} onValueChange={(v: any) => setForm({ ...form, difficulty: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Easy">Easy</SelectItem>
                  <SelectItem value="Medium">Medium</SelectItem>
                  <SelectItem value="Hard">Hard</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5"><Label>Max Group</Label><Input type="number" min="1" value={form.max_group_size} onChange={(e) => setForm({ ...form, max_group_size: e.target.value })} /></div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5"><Label>Max Slots</Label><Input type="number" min="1" value={form.max_total_slots} onChange={(e) => setForm({ ...form, max_total_slots: e.target.value })} /></div>
            <div className="space-y-1.5"><Label>WhatsApp Link</Label><Input value={form.whatsapp_group_link} onChange={(e) => setForm({ ...form, whatsapp_group_link: e.target.value })} /></div>
          </div>
          <div className="space-y-1.5"><Label>Image URL</Label><Input value={form.image_url} onChange={(e) => setForm({ ...form, image_url: e.target.value })} /></div>
          <div className="space-y-1.5"><Label>Highlights (comma-separated)</Label><Input value={form.highlights} onChange={(e) => setForm({ ...form, highlights: e.target.value })} /></div>
          <div className="space-y-1.5"><Label>Included (comma-separated)</Label><Input value={form.included} onChange={(e) => setForm({ ...form, included: e.target.value })} /></div>
          <div className="space-y-1.5"><Label>Excluded (comma-separated)</Label><Input value={form.excluded} onChange={(e) => setForm({ ...form, excluded: e.target.value })} /></div>
          <Button type="submit" variant="accent" className="w-full" disabled={submitting}>
            {submitting && <Loader2 className="mr-1 h-4 w-4 animate-spin" />} Save Changes
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
};

/* ─── Manage Images Dialog ─────────────────────────────────────────── */
const ManageImagesDialog = ({ tour }: { tour: any }) => {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [newUrl, setNewUrl] = useState("");
  const [adding, setAdding] = useState(false);
  const [uploading, setUploading] = useState(false);

  const images = (tour.tour_images || []).sort((a: any, b: any) => a.display_order - b.display_order);

  const addImage = async () => {
    if (!newUrl.trim() || !/^https?:\/\//i.test(newUrl.trim())) {
      toast.error("Enter a valid image URL");
      return;
    }
    setAdding(true);
    const { error } = await supabase.from("tour_images").insert({
      tour_id: tour.id,
      image_url: newUrl.trim(),
      display_order: images.length,
    });
    if (error) toast.error("Failed to add image");
    else {
      toast.success("Image added");
      setNewUrl("");
      queryClient.invalidateQueries({ queryKey: ["admin-tours"] });
    }
    setAdding(false);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) { toast.error("Please upload an image file"); return; }
    if (file.size > 5 * 1024 * 1024) { toast.error("Image must be under 5MB"); return; }

    setUploading(true);
    const ext = file.name.split(".").pop();
    const path = `${tour.id}/${Date.now()}.${ext}`;

    const { error: uploadError } = await supabase.storage.from("tour-images").upload(path, file);
    if (uploadError) { toast.error("Upload failed: " + uploadError.message); setUploading(false); return; }

    const { data: urlData } = supabase.storage.from("tour-images").getPublicUrl(path);
    const publicUrl = urlData.publicUrl;

    const { error: insertError } = await supabase.from("tour_images").insert({
      tour_id: tour.id,
      image_url: publicUrl,
      display_order: images.length,
    });

    if (insertError) toast.error("Failed to save image record");
    else {
      toast.success("Image uploaded");
      queryClient.invalidateQueries({ queryKey: ["admin-tours"] });
    }
    setUploading(false);
    e.target.value = "";
  };

  const removeImage = async (imageId: string) => {
    const { error } = await supabase.from("tour_images").delete().eq("id", imageId);
    if (error) toast.error("Failed to remove image");
    else {
      toast.success("Image removed");
      queryClient.invalidateQueries({ queryKey: ["admin-tours"] });
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm" className="h-8 text-xs">
          <ImageIcon className="mr-1 h-3 w-3" /> Images ({images.length})
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Tour Gallery — {tour.title}</DialogTitle>
          <DialogDescription>Upload or add tour images by URL. Images display in order added.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          {/* File upload */}
          <div className="space-y-2">
            <Label>Upload Image</Label>
            <label className="flex items-center justify-center gap-2 rounded-xl border-2 border-dashed border-border p-4 cursor-pointer hover:bg-muted/50 transition-colors">
              {uploading ? <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /> : <Upload className="h-5 w-5 text-muted-foreground" />}
              <span className="text-sm text-muted-foreground">{uploading ? "Uploading..." : "Click to upload (max 5MB)"}</span>
              <input type="file" accept="image/*" className="hidden" onChange={handleFileUpload} disabled={uploading} />
            </label>
          </div>

          {/* URL input */}
          <div className="flex gap-2">
            <Input
              value={newUrl}
              onChange={(e) => setNewUrl(e.target.value)}
              placeholder="Or paste image URL..."
              className="flex-1"
            />
            <Button onClick={addImage} disabled={adding} size="sm">
              {adding ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
            </Button>
          </div>

          {images.length > 0 ? (
            <div className="grid grid-cols-3 gap-2">
              {images.map((img: any) => (
                <div key={img.id} className="relative group rounded-lg overflow-hidden aspect-square">
                  <img
                    src={img.image_url}
                    alt="Tour"
                    className="h-full w-full object-cover"
                    onError={(e) => { (e.target as HTMLImageElement).src = "https://images.unsplash.com/photo-1516426122078-c23e76319801?w=200&h=200&fit=crop"; }}
                  />
                  <button
                    onClick={() => removeImage(img.id)}
                    className="absolute top-1 right-1 rounded-full bg-destructive/80 p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <X className="h-3 w-3 text-destructive-foreground" />
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-4">No gallery images yet. Upload or paste a URL above.</p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default AdminDashboard;
