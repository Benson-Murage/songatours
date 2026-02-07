import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { BarChart3, DollarSign, Users, Globe, Plus, Pencil, Eye, EyeOff, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import Layout from "@/components/Layout";
import { toast } from "sonner";

const AdminDashboard = () => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data: role } = useQuery({
    queryKey: ["user-role", user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user!.id)
        .eq("role", "admin")
        .maybeSingle();
      return data;
    },
    enabled: !!user,
  });

  useEffect(() => {
    if (!loading && !user) navigate("/auth");
  }, [user, loading, navigate]);

  const isAdmin = !!role;

  // Stats
  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ["admin-stats"],
    queryFn: async () => {
      const [{ data: bookings }, { data: tours }] = await Promise.all([
        supabase.from("bookings").select("total_price, status"),
        supabase.from("tours").select("id, title"),
      ]);
      const totalRevenue = bookings?.reduce((sum, b) => sum + (b.status !== "cancelled" ? Number(b.total_price) : 0), 0) || 0;
      const activeBookings = bookings?.filter((b) => b.status === "pending" || b.status === "paid").length || 0;
      return { totalRevenue, activeBookings, totalTours: tours?.length || 0 };
    },
    enabled: isAdmin,
  });

  // Tours list for admin
  const { data: adminTours, isLoading: toursLoading } = useQuery({
    queryKey: ["admin-tours"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tours")
        .select("*, destinations(name)")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: isAdmin,
  });

  // Destinations for the form
  const { data: destinations } = useQuery({
    queryKey: ["destinations"],
    queryFn: async () => {
      const { data, error } = await supabase.from("destinations").select("*");
      if (error) throw error;
      return data;
    },
    enabled: isAdmin,
  });

  // Toggle publish/draft
  const toggleStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: "published" | "draft" }) => {
      const { error } = await supabase.from("tours").update({ status }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-tours"] });
      toast.success("Tour status updated");
    },
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
      <div className="container mx-auto px-4 py-10">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold">Admin Dashboard</h1>
            <p className="text-muted-foreground">Manage tours, bookings, and analytics</p>
          </div>
          <CreateTourDialog destinations={destinations || []} />
        </div>

        {/* Stats */}
        <div className="grid gap-4 sm:grid-cols-3 mb-10">
          {statsLoading ? (
            Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-28 rounded-2xl" />)
          ) : (
            <>
              <StatCard icon={DollarSign} label="Total Revenue" value={`$${stats?.totalRevenue.toLocaleString()}`} />
              <StatCard icon={Users} label="Active Bookings" value={String(stats?.activeBookings || 0)} />
              <StatCard icon={Globe} label="Total Tours" value={String(stats?.totalTours || 0)} />
            </>
          )}
        </div>

        {/* Tours Table */}
        <h2 className="text-xl font-semibold mb-4">All Tours</h2>
        {toursLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => <Skeleton key={i} className="h-16 rounded-xl" />)}
          </div>
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
                  <p className="text-xs text-muted-foreground">{tour.destinations?.name} · ${Number(tour.price_per_person).toLocaleString()}/person</p>
                </div>
                <span className={`rounded-full px-2 py-0.5 text-xs font-medium shrink-0 ${
                  tour.status === "published" ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"
                }`}>
                  {tour.status}
                </span>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => toggleStatus.mutate({
                    id: tour.id,
                    status: tour.status === "published" ? "draft" : "published",
                  })}
                  title={tour.status === "published" ? "Unpublish" : "Publish"}
                >
                  {tour.status === "published" ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
              </div>
            ))}
          </div>
        )}
      </div>
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
    destination_id: "",
    price_per_person: "",
    discount_price: "",
    duration_days: "3",
    difficulty: "Easy" as "Easy" | "Medium" | "Hard",
    max_group_size: "10",
    image_url: "",
    highlights: "",
    included: "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title || !form.destination_id || !form.price_per_person) {
      toast.error("Please fill required fields");
      return;
    }
    setSubmitting(true);
    const { error } = await supabase.from("tours").insert({
      title: form.title,
      description: form.description,
      destination_id: form.destination_id,
      price_per_person: Number(form.price_per_person),
      discount_price: form.discount_price ? Number(form.discount_price) : null,
      duration_days: Number(form.duration_days),
      difficulty: form.difficulty,
      max_group_size: Number(form.max_group_size),
      image_url: form.image_url || null,
      highlights: form.highlights.split(",").map((s) => s.trim()).filter(Boolean),
      included: form.included.split(",").map((s) => s.trim()).filter(Boolean),
      status: "draft",
    });
    if (error) {
      toast.error("Failed to create tour");
    } else {
      toast.success("Tour created as draft!");
      queryClient.invalidateQueries({ queryKey: ["admin-tours"] });
      setOpen(false);
      setForm({ title: "", description: "", destination_id: "", price_per_person: "", discount_price: "", duration_days: "3", difficulty: "Easy", max_group_size: "10", image_url: "", highlights: "", included: "" });
    }
    setSubmitting(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="accent"><Plus className="mr-1 h-4 w-4" /> Create Tour</Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create New Tour</DialogTitle>
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
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Destination *</Label>
              <Select value={form.destination_id} onValueChange={(v) => setForm({ ...form, destination_id: v })}>
                <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                <SelectContent>
                  {destinations.map((d) => (
                    <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
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
              <Label>Duration (days)</Label>
              <Input type="number" min="1" value={form.duration_days} onChange={(e) => setForm({ ...form, duration_days: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label>Max Group Size</Label>
              <Input type="number" min="1" value={form.max_group_size} onChange={(e) => setForm({ ...form, max_group_size: e.target.value })} />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Image URL</Label>
            <Input value={form.image_url} onChange={(e) => setForm({ ...form, image_url: e.target.value })} placeholder="https://..." />
          </div>
          <div className="space-y-1.5">
            <Label>Highlights (comma-separated)</Label>
            <Input value={form.highlights} onChange={(e) => setForm({ ...form, highlights: e.target.value })} placeholder="Wildlife, Scenery, Culture" />
          </div>
          <div className="space-y-1.5">
            <Label>Included (comma-separated)</Label>
            <Input value={form.included} onChange={(e) => setForm({ ...form, included: e.target.value })} placeholder="Meals, Guide, Transport" />
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
