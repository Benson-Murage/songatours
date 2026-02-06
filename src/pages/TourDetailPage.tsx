import { useParams, useNavigate } from "react-router-dom";
import { useState } from "react";
import { MapPin, Clock, Users, Star, ChevronLeft, Loader2, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { useTour } from "@/hooks/useTours";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import Layout from "@/components/Layout";

const TourDetailPage = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { data: tour, isLoading } = useTour(id!);
  const [startDate, setStartDate] = useState("");
  const [guests, setGuests] = useState(1);
  const [booking, setBooking] = useState(false);

  if (isLoading) {
    return (
      <Layout>
        <div className="container mx-auto px-4 py-8 space-y-6">
          <Skeleton className="h-[400px] w-full rounded-2xl" />
          <Skeleton className="h-8 w-1/2" />
          <Skeleton className="h-4 w-1/3" />
        </div>
      </Layout>
    );
  }

  if (!tour) {
    return (
      <Layout>
        <div className="container mx-auto px-4 py-20 text-center">
          <h1 className="text-2xl font-bold">Tour not found</h1>
          <Button variant="outline" onClick={() => navigate("/")} className="mt-4">
            Go Home
          </Button>
        </div>
      </Layout>
    );
  }

  const totalPrice = Number(tour.price_per_person) * guests;
  const destination = tour.destinations as { name: string; country: string } | null;

  const handleBook = async () => {
    if (!user) {
      toast.error("Please sign in to book a tour");
      navigate("/auth");
      return;
    }
    if (!startDate) {
      toast.error("Please select a start date");
      return;
    }
    if (guests > tour.max_group_size) {
      toast.error(`Maximum group size is ${tour.max_group_size}`);
      return;
    }

    setBooking(true);
    const { error } = await supabase.from("bookings").insert({
      tour_id: tour.id,
      user_id: user.id,
      start_date: startDate,
      guests_count: guests,
      total_price: totalPrice,
    });

    if (error) {
      toast.error("Booking failed. Please try again.");
    } else {
      toast.success("Booking confirmed! 🎉");
      navigate("/dashboard");
    }
    setBooking(false);
  };

  return (
    <Layout>
      <div className="container mx-auto px-4 py-6">
        <button
          onClick={() => navigate(-1)}
          className="mb-4 flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ChevronLeft className="h-4 w-4" /> Back
        </button>

        {/* Image Gallery */}
        <div className="grid gap-2 rounded-2xl overflow-hidden md:grid-cols-2 md:grid-rows-2 h-[300px] md:h-[450px]">
          <div className="md:row-span-2">
            <img
              src={tour.image_url || "https://images.unsplash.com/photo-1516426122078-c23e76319801?w=800&h=800&fit=crop"}
              alt={tour.title}
              className="h-full w-full object-cover"
            />
          </div>
          <div className="hidden md:block">
            <img
              src="https://images.unsplash.com/photo-1523805009345-7448845a9e53?w=600&h=300&fit=crop"
              alt="Tour landscape"
              className="h-full w-full object-cover"
            />
          </div>
          <div className="hidden md:block">
            <img
              src="https://images.unsplash.com/photo-1547471080-7cc2caa01a7e?w=600&h=300&fit=crop"
              alt="Wildlife"
              className="h-full w-full object-cover"
            />
          </div>
        </div>

        <div className="mt-8 grid gap-8 lg:grid-cols-3">
          {/* Tour Info */}
          <div className="lg:col-span-2 space-y-6">
            <div>
              {destination && (
                <div className="flex items-center gap-1 text-muted-foreground mb-2">
                  <MapPin className="h-4 w-4" />
                  <span className="text-sm font-medium">
                    {destination.name}, {destination.country}
                  </span>
                </div>
              )}
              <h1 className="text-3xl font-bold text-foreground">{tour.title}</h1>
              <div className="mt-3 flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
                <span className="flex items-center gap-1">
                  <Clock className="h-4 w-4" /> {tour.duration_days} days
                </span>
                <span className="flex items-center gap-1">
                  <Users className="h-4 w-4" /> Max {tour.max_group_size} guests
                </span>
                <span className="flex items-center gap-1">
                  <Star className="h-4 w-4 fill-accent text-accent" /> 4.9
                </span>
                <span className="rounded-full bg-secondary px-3 py-0.5 text-xs font-medium text-secondary-foreground">
                  {tour.difficulty}
                </span>
              </div>
            </div>

            <Tabs defaultValue="overview">
              <TabsList>
                <TabsTrigger value="overview">Overview</TabsTrigger>
                <TabsTrigger value="included">What's Included</TabsTrigger>
                <TabsTrigger value="highlights">Highlights</TabsTrigger>
              </TabsList>
              <TabsContent value="overview" className="mt-4">
                <p className="leading-relaxed text-muted-foreground">
                  {tour.description || "Experience the beauty of Africa like never before. This carefully curated tour takes you through stunning landscapes and incredible wildlife encounters."}
                </p>
              </TabsContent>
              <TabsContent value="included" className="mt-4">
                <ul className="space-y-2">
                  {(tour.included?.length ? tour.included : ["Professional guide", "Accommodation", "Meals", "Transport"]).map(
                    (item, i) => (
                      <li key={i} className="flex items-center gap-2 text-muted-foreground">
                        <CheckCircle2 className="h-4 w-4 text-primary" />
                        {item}
                      </li>
                    )
                  )}
                </ul>
              </TabsContent>
              <TabsContent value="highlights" className="mt-4">
                <ul className="space-y-2">
                  {(tour.highlights?.length ? tour.highlights : ["Scenic landscapes", "Wildlife viewing", "Cultural immersion"]).map(
                    (item, i) => (
                      <li key={i} className="flex items-center gap-2 text-muted-foreground">
                        <Star className="h-4 w-4 text-accent" />
                        {item}
                      </li>
                    )
                  )}
                </ul>
              </TabsContent>
            </Tabs>
          </div>

          {/* Booking Card */}
          <aside className="lg:sticky lg:top-24 h-fit">
            <div className="rounded-2xl border border-border bg-card p-6 shadow-sm space-y-4">
              <div className="flex items-baseline gap-1">
                <span className="text-2xl font-bold text-foreground">
                  ${Number(tour.price_per_person).toLocaleString()}
                </span>
                <span className="text-sm text-muted-foreground">/ person</span>
              </div>

              <div className="space-y-3">
                <div className="space-y-1.5">
                  <Label htmlFor="startDate">Start Date</Label>
                  <Input
                    id="startDate"
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    min={new Date().toISOString().split("T")[0]}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="guests">Guests</Label>
                  <Input
                    id="guests"
                    type="number"
                    min={1}
                    max={tour.max_group_size}
                    value={guests}
                    onChange={(e) => setGuests(Number(e.target.value))}
                  />
                </div>
              </div>

              <div className="flex justify-between border-t border-border pt-3 text-sm">
                <span className="text-muted-foreground">Total</span>
                <span className="text-lg font-bold text-foreground">
                  ${totalPrice.toLocaleString()}
                </span>
              </div>

              <Button
                variant="accent"
                className="w-full"
                size="lg"
                onClick={handleBook}
                disabled={booking}
              >
                {booking && <Loader2 className="h-4 w-4 animate-spin" />}
                Book Now
              </Button>
            </div>
          </aside>
        </div>
      </div>
    </Layout>
  );
};

export default TourDetailPage;
