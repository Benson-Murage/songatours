import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AlertTriangle, DollarSign, Eye, EyeOff, Globe, Loader2, Plus, Trash2, Users } from "lucide-react";
import Layout from "@/components/Layout";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";

const slugify = (value: string) => value.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");

const AdminDashboard = () => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [tourToDelete, setTourToDelete] = useState<any | null>(null);
  const [slotEdits, setSlotEdits] = useState<Record<string, string>>({});

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

  const { data: adminTours, isLoading: toursLoading, error: toursError } = useQuery({
    queryKey: ["admin-tours"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tours")
        .select("id, title, image_url, status, price_per_person, max_total_slots, destinations(name)")
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

  const { data: adminBookings, isLoading: bookingsLoading, error: bookingsError } = useQuery({
    queryKey: ["admin-bookings"],
    queryFn: async () => {
      const { data: bookings, error } = await supabase
        .from("bookings")
        .select("id, created_at, start_date, guests_count, total_price, status, phone_number, user_id, cancelled_by, cancelled_at, tour_id, tours(title)")
        .order("created_at", { ascending: false });
      if (error) throw error;

      const ids = Array.from(new Set((bookings || []).flatMap((b) => [b.user_id, b.cancelled_by]).filter(Boolean)));
      let profileMap: Record<string, { full_name: string | null; email: string | null }> = {};
      if (ids.length > 0) {
        const { data: profiles, error: profileError } = await supabase.from("profiles").select("id, full_name, email").in("id", ids);
        if (profileError) throw profileError;
        profileMap = Object.fromEntries((profiles || []).map((p) => [p.id, { full_name: p.full_name, email: p.email }]));
      }

      return (bookings || []).map((booking) => ({
        ...booking,
        bookedByProfile: profileMap[booking.user_id] || null,
        cancelledByProfile: booking.cancelled_by ? profileMap[booking.cancelled_by] || null : null,
      }));
    },
    enabled: isAdmin,
  });

  const stats = useMemo(() => {
    const totalRevenue = (adminBookings || []).reduce((sum: number, b: any) => sum + (b.status !== "cancelled" ? Number(b.total_price) : 0), 0);
    const activeBookings = (adminBookings || []).filter((b: any) => b.status === "pending" || b.status === "paid").length;
    const cancelledBookings = (adminBookings || []).filter((b: any) => b.status === "cancelled").length;
    return { totalRevenue, activeBookings, cancelledBookings, totalTours: adminTours?.length || 0 };
  }, [adminBookings, adminTours]);

  const activeBookingsByTour = useMemo(() => {
    const out: Record<string, number> = {};
    (adminBookings || []).forEach((b: any) => {
      if (b.status === "cancelled") return;
      out[b.tour_id] = (out[b.tour_id] || 0) + 1;
    });
    return out;
  }, [adminBookings]);

  const soldOutAlerts = useMemo(() => {
    const capacityByTour = Object.fromEntries((adminTours || []).map((tour: any) => [tour.id, Number(tour.max_total_slots || 0)]));
    const keyStats: Record<string, { tourId: string; tourTitle: string; startDate: string; booked: number; capacity: number }> = {};

    (adminBookings || []).forEach((booking: any) => {
      if (booking.status === "cancelled") return;
      const key = `${booking.tour_id}__${booking.start_date}`;
      if (!keyStats[key]) {
        keyStats[key] = {
          tourId: booking.tour_id,
          tourTitle: booking.tours?.title || "Tour",
          startDate: booking.start_date,
          booked: 0,
          capacity: capacityByTour[booking.tour_id] || 0,
        };
      }
      keyStats[key].booked += Number(booking.guests_count || 0);
    });

    return Object.values(keyStats).filter((item) => item.capacity > 0 && item.booked >= item.capacity);
  }, [adminBookings, adminTours]);

  const toggleStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: "published" | "draft" }) => {
      const { error } = await supabase.from("tours").update({ status }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Tour status updated");
      queryClient.invalidateQueries({ queryKey: ["admin-tours"] });
    },
  });

  const deleteTour = useMutation({
    mutationFn: async (tourId: string) => {
      const { error } = await supabase.from("tours").delete().eq("id", tourId);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Tour deleted");
      queryClient.invalidateQueries({ queryKey: ["admin-tours"] });
      queryClient.invalidateQueries({ queryKey: ["admin-bookings"] });
      setTourToDelete(null);
    },
    onError: () => toast.error("Failed to delete tour"),
  });

  const updateTourSlots = useMutation({
    mutationFn: async ({ tourId, maxTotalSlots }: { tourId: string; maxTotalSlots: number }) => {
      const { error } = await supabase.from("tours").update({ max_total_slots: maxTotalSlots }).eq("id", tourId);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Tour capacity updated");
      queryClient.invalidateQueries({ queryKey: ["admin-tours"] });
    },
    onError: () => toast.error("Failed to update capacity"),
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
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Admin Dashboard</h1>
            <p className="text-muted-foreground">Bookings, cancellations, capacity, and tours</p>
          </div>
          <CreateTourDialog destinations={destinations || []} />
        </div>

        <div className="grid gap-4 sm:grid-cols-4">
          <StatCard icon={DollarSign} label="Total Revenue" value={`$${stats.totalRevenue.toLocaleString()}`} />
          <StatCard icon={Users} label="Active Bookings" value={String(stats.activeBookings)} />
          <StatCard icon={Users} label="Cancelled Bookings" value={String(stats.cancelledBookings)} />
          <StatCard icon={Globe} label="Total Tours" value={String(stats.totalTours)} />
        </div>

        {(toursError || bookingsError) && (
          <div className="rounded-xl border border-destructive/40 bg-destructive/5 p-4 text-sm">
            <p className="font-medium text-destructive mb-1">Database migration required</p>
            <p className="text-muted-foreground">
              New admin features need new columns (for capacity, phones, and cancellation audit). Run the latest Supabase migration, then reload.
            </p>
          </div>
        )}

        {soldOutAlerts.length > 0 && (
          <div className="rounded-xl border border-destructive/40 bg-destructive/5 p-4">
            <div className="flex items-center gap-2 mb-2">
              <AlertTriangle className="h-4 w-4 text-destructive" />
              <p className="font-medium text-destructive">Capacity Alerts</p>
            </div>
            <div className="space-y-1 text-sm">
              {soldOutAlerts.map((alert) => (
                <p key={`${alert.tourId}-${alert.startDate}`}>
                  {alert.tourTitle} on {new Date(alert.startDate).toLocaleDateString()} is sold out ({alert.booked}/{alert.capacity}).
                  Increase max slots in tour settings if needed.
                </p>
              ))}
            </div>
          </div>
        )}

        <section>
          <h2 className="text-xl font-semibold mb-4">All Tours</h2>
          {toursLoading ? (
            <div className="space-y-2">{[1, 2, 3].map((i) => <Skeleton key={i} className="h-16 rounded-xl" />)}</div>
          ) : (
            <div className="space-y-2">
              {adminTours?.map((tour: any) => (
                <div key={tour.id} className="flex items-center gap-4 rounded-xl border border-border bg-card p-3">
                  <img
                    src={tour.image_url || "https://images.unsplash.com/photo-1516426122078-c23e76319801?w=100&h=100&fit=crop"}
                    alt={tour.title}
                    className="h-12 w-12 rounded-lg object-cover shrink-0"
                  />
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate">{tour.title}</p>
                    <p className="text-xs text-muted-foreground">
                      {tour.destinations?.name} - ${Number(tour.price_per_person).toLocaleString()}/person - Capacity/date: {tour.max_total_slots} - Active bookings: {activeBookingsByTour[tour.id] || 0}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Input
                      className="w-28 h-8"
                      type="number"
                      min="1"
                      value={slotEdits[tour.id] ?? String(tour.max_total_slots)}
                      onChange={(e) => setSlotEdits((prev) => ({ ...prev, [tour.id]: e.target.value }))}
                    />
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        const nextValue = Number(slotEdits[tour.id] ?? tour.max_total_slots);
                        if (!Number.isInteger(nextValue) || nextValue < 1) {
                          toast.error("Capacity must be at least 1");
                          return;
                        }
                        updateTourSlots.mutate({ tourId: tour.id, maxTotalSlots: nextValue });
                      }}
                    >
                      Update Slots
                    </Button>
                  </div>
                  <span className={`rounded-full px-2 py-0.5 text-xs font-medium shrink-0 ${
                    tour.status === "published" ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"
                  }`}>
                    {tour.status}
                  </span>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => toggleStatus.mutate({ id: tour.id, status: tour.status === "published" ? "draft" : "published" })}
                    title={tour.status === "published" ? "Unpublish" : "Publish"}
                  >
                    {tour.status === "published" ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="text-destructive hover:text-destructive"
                    onClick={() => setTourToDelete(tour)}
                    title="Delete tour"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </section>

        <section>
          <h2 className="text-xl font-semibold mb-4">Bookings and Cancellations</h2>
          {bookingsLoading ? (
            <Skeleton className="h-56 rounded-xl" />
          ) : (
            <div className="rounded-xl border border-border bg-card overflow-x-auto">
              <table className="w-full min-w-[980px] text-sm">
                <thead className="bg-muted/50">
                  <tr className="text-left">
                    <th className="px-4 py-3">Traveler</th>
                    <th className="px-4 py-3">Tour</th>
                    <th className="px-4 py-3">Booked At</th>
                    <th className="px-4 py-3">Start Date</th>
                    <th className="px-4 py-3">Group</th>
                    <th className="px-4 py-3">Phone</th>
                    <th className="px-4 py-3">Details</th>
                    <th className="px-4 py-3">Cancellation</th>
                  </tr>
                </thead>
                <tbody>
                  {adminBookings?.map((booking: any) => (
                    <tr key={booking.id} className="border-t border-border align-top">
                      <td className="px-4 py-3">
                        <p className="font-medium">{booking.bookedByProfile?.full_name || "Unknown User"}</p>
                        <p className="text-xs text-muted-foreground">{booking.bookedByProfile?.email || booking.user_id}</p>
                      </td>
                      <td className="px-4 py-3">{booking.tours?.title || "Unknown Tour"}</td>
                      <td className="px-4 py-3">{new Date(booking.created_at).toLocaleString()}</td>
                      <td className="px-4 py-3">{new Date(booking.start_date).toLocaleDateString()}</td>
                      <td className="px-4 py-3">{booking.guests_count}</td>
                      <td className="px-4 py-3">
                        {booking.phone_number ? (
                          <div className="space-y-1">
                            <p>{booking.phone_number}</p>
                            <button
                              className="text-xs text-primary hover:underline"
                              onClick={() => window.open(`https://wa.me/${String(booking.phone_number).replace(/[^\d]/g, "")}`, "_blank", "noopener,noreferrer")}
                            >
                              Open WhatsApp
                            </button>
                          </div>
                        ) : "N/A"}
                      </td>
                      <td className="px-4 py-3">
                        <p className="capitalize">{booking.status}</p>
                        <p className="text-xs text-muted-foreground">${Number(booking.total_price).toLocaleString()}</p>
                        <p className="text-xs text-muted-foreground">Ref: {booking.id.slice(0, 8).toUpperCase()}</p>
                      </td>
                      <td className="px-4 py-3">
                        {booking.status === "cancelled" ? (
                          <div className="space-y-1">
                            <p className="text-destructive text-xs font-medium">Cancelled</p>
                            <p className="text-xs text-muted-foreground">By: {booking.cancelledByProfile?.full_name || booking.cancelled_by || "Unknown"}</p>
                            <p className="text-xs text-muted-foreground">At: {booking.cancelled_at ? new Date(booking.cancelled_at).toLocaleString() : "N/A"}</p>
                          </div>
                        ) : (
                          <p className="text-xs text-muted-foreground">Active</p>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>

      <AlertDialog open={!!tourToDelete} onOpenChange={(open) => !open && setTourToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this tour?</AlertDialogTitle>
            <AlertDialogDescription>
              This action is permanent and will remove related bookings. Tour: <strong>{tourToDelete?.title}</strong>.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteTour.isPending}>Keep Tour</AlertDialogCancel>
            <AlertDialogAction
              disabled={deleteTour.isPending}
              onClick={() => tourToDelete && deleteTour.mutate(tourToDelete.id)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteTour.isPending && <Loader2 className="mr-1 h-4 w-4 animate-spin" />}
              Delete Tour
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Layout>
  );
};

const StatCard = ({ icon: Icon, label, value }: { icon: any; label: string; value: string }) => (
  <div className="rounded-2xl border border-border bg-card p-5">
    <div className="flex items-center gap-3 mb-2">
      <div className="rounded-xl bg-primary/10 p-2">
        <Icon className="h-5 w-5 text-primary" />
      </div>
      <span className="text-sm text-muted-foreground">{label}</span>
    </div>
    <p className="text-2xl font-bold text-foreground">{value}</p>
  </div>
);

const CreateTourDialog = ({ destinations }: { destinations: any[] }) => {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    title: "",
    description: "",
    destination_id: "none",
    destination_name: "",
    destination_country: "",
    whatsapp_group_link: "",
    price_per_person: "",
    discount_price: "",
    duration_days: "3",
    difficulty: "Easy" as "Easy" | "Medium" | "Hard",
    max_group_size: "10",
    max_total_slots: "250",
    image_url: "",
    highlights: "",
    included: "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title || !form.price_per_person) {
      toast.error("Please fill required fields");
      return;
    }

    const hasManualDestination = !!form.destination_name.trim() || !!form.destination_country.trim();
    if (hasManualDestination && (!form.destination_name.trim() || !form.destination_country.trim())) {
      toast.error("Enter both manual destination and country");
      return;
    }

    if (form.destination_id === "none" && !hasManualDestination) {
      toast.error("Pick destination from list or type manually");
      return;
    }

    if (form.whatsapp_group_link && !/^https?:\/\//i.test(form.whatsapp_group_link.trim())) {
      toast.error("WhatsApp link must start with http:// or https://");
      return;
    }

    if (Number(form.max_total_slots) < 1) {
      toast.error("Max total slots must be at least 1");
      return;
    }

    setSubmitting(true);
    try {
      let destinationId = form.destination_id !== "none" ? form.destination_id : null;

      if (hasManualDestination) {
        const slug = `${slugify(`${form.destination_name}-${form.destination_country}`) || "destination"}-${Date.now()}`;
        const { data: createdDestination, error: destinationError } = await supabase
          .from("destinations")
          .insert({
            name: form.destination_name.trim(),
            country: form.destination_country.trim(),
            slug,
          })
          .select("id")
          .single();

        if (destinationError) throw destinationError;
        destinationId = createdDestination.id;
      }

      const { error } = await supabase.from("tours").insert({
        title: form.title,
        description: form.description,
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
        status: "draft",
      });

      if (error) throw error;
      toast.success("Tour created as draft");
      queryClient.invalidateQueries({ queryKey: ["admin-tours"] });
      queryClient.invalidateQueries({ queryKey: ["destinations"] });
      setOpen(false);
      setForm({
        title: "",
        description: "",
        destination_id: "none",
        destination_name: "",
        destination_country: "",
        whatsapp_group_link: "",
        price_per_person: "",
        discount_price: "",
        duration_days: "3",
        difficulty: "Easy",
        max_group_size: "10",
        max_total_slots: "250",
        image_url: "",
        highlights: "",
        included: "",
      });
    } catch {
      toast.error("Failed to create tour");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="accent"><Plus className="mr-1 h-4 w-4" /> Create Tour</Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create New Tour</DialogTitle>
          <DialogDescription>
            Create a tour with destination, capacity, and optional WhatsApp group link.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="space-y-1.5">
            <Label>Title *</Label>
            <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required />
          </div>
          <div className="space-y-1.5">
            <Label>Description</Label>
            <textarea
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              className="w-full rounded-xl border border-border bg-background p-3 text-sm outline-none focus:ring-2 focus:ring-ring resize-none"
              rows={3}
            />
          </div>

          <div className="space-y-1.5">
            <Label>Existing Destination (optional)</Label>
            <Select value={form.destination_id} onValueChange={(v) => setForm({ ...form, destination_id: v })}>
              <SelectTrigger><SelectValue placeholder="Select destination" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">None - type manually</SelectItem>
                {destinations.map((d) => <SelectItem key={d.id} value={d.id}>{d.name} ({d.country})</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Manual Destination</Label>
              <Input value={form.destination_name} onChange={(e) => setForm({ ...form, destination_name: e.target.value })} placeholder="Serengeti" />
            </div>
            <div className="space-y-1.5">
              <Label>Country</Label>
              <Input value={form.destination_country} onChange={(e) => setForm({ ...form, destination_country: e.target.value })} placeholder="Tanzania" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Difficulty</Label>
              <Select value={form.difficulty} onValueChange={(v: any) => setForm({ ...form, difficulty: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Easy">Easy</SelectItem>
                  <SelectItem value="Medium">Medium</SelectItem>
                  <SelectItem value="Hard">Hard</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>WhatsApp Group Link</Label>
              <Input value={form.whatsapp_group_link} onChange={(e) => setForm({ ...form, whatsapp_group_link: e.target.value })} placeholder="https://chat.whatsapp.com/..." />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Price/person *</Label>
              <Input type="number" min="0" value={form.price_per_person} onChange={(e) => setForm({ ...form, price_per_person: e.target.value })} required />
            </div>
            <div className="space-y-1.5">
              <Label>Discount Price</Label>
              <Input type="number" min="0" value={form.discount_price} onChange={(e) => setForm({ ...form, discount_price: e.target.value })} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Max Group Size (single booking)</Label>
              <Input type="number" min="1" value={form.max_group_size} onChange={(e) => setForm({ ...form, max_group_size: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label>Max Total Slots (per date)</Label>
              <Input type="number" min="1" value={form.max_total_slots} onChange={(e) => setForm({ ...form, max_total_slots: e.target.value })} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Duration (days)</Label>
              <Input type="number" min="1" value={form.duration_days} onChange={(e) => setForm({ ...form, duration_days: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label>Image URL</Label>
              <Input value={form.image_url} onChange={(e) => setForm({ ...form, image_url: e.target.value })} placeholder="https://..." />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Highlights (comma-separated)</Label>
            <Input value={form.highlights} onChange={(e) => setForm({ ...form, highlights: e.target.value })} />
          </div>
          <div className="space-y-1.5">
            <Label>Included (comma-separated)</Label>
            <Input value={form.included} onChange={(e) => setForm({ ...form, included: e.target.value })} />
          </div>

          <Button type="submit" variant="accent" className="w-full" disabled={submitting}>
            {submitting && <Loader2 className="mr-1 h-4 w-4 animate-spin" />}
            Create Tour
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default AdminDashboard;
