import { useParams, useNavigate } from "react-router-dom";
import { useState } from "react";
import { MapPin, Clock, Users, Star, ChevronLeft, Loader2, CheckCircle2, Heart } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useTour, useReviews, useFavorites, useToggleFavorite } from "@/hooks/useTours";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import Layout from "@/components/Layout";

const TourDetailPage = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { data: tour, isLoading } = useTour(id!);
  const { data: reviews } = useReviews(id!);
  const { data: favorites } = useFavorites(user?.id);
  const toggleFavorite = useToggleFavorite();
  const [startDate, setStartDate] = useState("");
  const [guests, setGuests] = useState(1);
  const [booking, setBooking] = useState(false);
  const [reviewText, setReviewText] = useState("");
  const [reviewRating, setReviewRating] = useState(5);
  const [submittingReview, setSubmittingReview] = useState(false);

  const isFavorited = favorites?.includes(id!) ?? false;
  const avgRating = reviews?.length
    ? (reviews.reduce((sum: number, r: any) => sum + r.rating, 0) / reviews.length).toFixed(1)
    : null;

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
          <Button variant="outline" onClick={() => navigate("/")} className="mt-4">Go Home</Button>
        </div>
      </Layout>
    );
  }

  const hasDiscount = tour.discount_price != null && Number(tour.discount_price) < Number(tour.price_per_person);
  const effectivePrice = hasDiscount ? Number(tour.discount_price) : Number(tour.price_per_person);
  const totalPrice = effectivePrice * guests;
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
    if (guests < 1) {
      toast.error("At least 1 guest is required");
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

  const handleReview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      toast.error("Please sign in to leave a review");
      return;
    }
    if (!reviewText.trim()) {
      toast.error("Please write a comment");
      return;
    }
    setSubmittingReview(true);
    const { error } = await supabase.from("reviews").insert({
      tour_id: tour.id,
      user_id: user.id,
      rating: reviewRating,
      comment: reviewText.trim(),
    });
    if (error) {
      toast.error("Failed to submit review");
    } else {
      toast.success("Review submitted!");
      setReviewText("");
      setReviewRating(5);
    }
    setSubmittingReview(false);
  };

  const handleToggleFavorite = () => {
    if (!user) {
      toast.error("Sign in to save favorites");
      return;
    }
    toggleFavorite.mutate({ tourId: tour.id, userId: user.id, isFavorited });
  };

  // Gallery images
  const galleryImages = [
    tour.image_url || "https://images.unsplash.com/photo-1516426122078-c23e76319801?w=800&h=800&fit=crop",
    "https://images.unsplash.com/photo-1523805009345-7448845a9e53?w=600&h=400&fit=crop",
    "https://images.unsplash.com/photo-1547471080-7cc2caa01a7e?w=600&h=400&fit=crop",
    "https://images.unsplash.com/photo-1489392191049-fc10c97e64b6?w=600&h=400&fit=crop",
    "https://images.unsplash.com/photo-1517960413843-0aee8e2b3285?w=600&h=400&fit=crop",
  ];

  return (
    <Layout>
      <div className="container mx-auto px-4 py-6">
        <button
          onClick={() => navigate(-1)}
          className="mb-4 flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ChevronLeft className="h-4 w-4" /> Back
        </button>

        {/* Image Gallery - 5 images masonry */}
        <div className="grid gap-2 rounded-2xl overflow-hidden h-[300px] md:h-[450px] grid-cols-4 grid-rows-2">
          <div className="col-span-2 row-span-2">
            <img src={galleryImages[0]} alt={tour.title} className="h-full w-full object-cover" />
          </div>
          <div><img src={galleryImages[1]} alt="Gallery" className="h-full w-full object-cover" /></div>
          <div><img src={galleryImages[2]} alt="Gallery" className="h-full w-full object-cover" /></div>
          <div className="hidden md:block"><img src={galleryImages[3]} alt="Gallery" className="h-full w-full object-cover" /></div>
          <div className="hidden md:block"><img src={galleryImages[4]} alt="Gallery" className="h-full w-full object-cover" /></div>
        </div>

        <div className="mt-8 grid gap-8 lg:grid-cols-3">
          {/* Tour Info */}
          <div className="lg:col-span-2 space-y-6">
            <div>
              <div className="flex items-start justify-between">
                <div>
                  {destination && (
                    <div className="flex items-center gap-1 text-muted-foreground mb-2">
                      <MapPin className="h-4 w-4" />
                      <span className="text-sm font-medium">{destination.name}, {destination.country}</span>
                    </div>
                  )}
                  <h1 className="text-3xl font-bold text-foreground">{tour.title}</h1>
                </div>
                <button
                  onClick={handleToggleFavorite}
                  className="rounded-full bg-secondary p-2.5 transition-all hover:scale-110"
                  aria-label="Toggle favorite"
                >
                  <Heart className={`h-5 w-5 ${isFavorited ? "fill-destructive text-destructive" : "text-muted-foreground"}`} />
                </button>
              </div>

              <div className="mt-3 flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
                <span className="flex items-center gap-1"><Clock className="h-4 w-4" /> {tour.duration_days} days</span>
                <span className="flex items-center gap-1"><Users className="h-4 w-4" /> Max {tour.max_group_size} guests</span>
                <span className="flex items-center gap-1">
                  <Star className="h-4 w-4 fill-accent text-accent" />
                  {avgRating || "New"} {reviews?.length ? `(${reviews.length} reviews)` : ""}
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
                <TabsTrigger value="reviews">Reviews</TabsTrigger>
              </TabsList>

              <TabsContent value="overview" className="mt-4">
                <p className="leading-relaxed text-muted-foreground">
                  {tour.description || "Experience the beauty of Africa like never before."}
                </p>
              </TabsContent>

              <TabsContent value="included" className="mt-4">
                <ul className="space-y-2">
                  {(tour.included?.length ? tour.included : ["Professional guide", "Accommodation", "Meals", "Transport"]).map(
                    (item, i) => (
                      <li key={i} className="flex items-center gap-2 text-muted-foreground">
                        <CheckCircle2 className="h-4 w-4 text-primary shrink-0" /> {item}
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
                        <Star className="h-4 w-4 text-accent shrink-0" /> {item}
                      </li>
                    )
                  )}
                </ul>
              </TabsContent>

              <TabsContent value="reviews" className="mt-4 space-y-6">
                {/* Average Rating */}
                {avgRating && (
                  <div className="flex items-center gap-3 rounded-2xl bg-secondary p-4">
                    <span className="text-4xl font-bold text-foreground">{avgRating}</span>
                    <div>
                      <div className="flex gap-0.5">
                        {[1, 2, 3, 4, 5].map((s) => (
                          <Star
                            key={s}
                            className={`h-4 w-4 ${s <= Math.round(Number(avgRating)) ? "fill-accent text-accent" : "text-muted-foreground"}`}
                          />
                        ))}
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">{reviews?.length} reviews</p>
                    </div>
                  </div>
                )}

                {/* Review List */}
                {reviews?.map((review: any) => (
                  <div key={review.id} className="border-b border-border pb-4 last:border-0">
                    <div className="flex items-center gap-2 mb-2">
                      <Avatar className="h-8 w-8">
                        <AvatarFallback className="bg-primary text-primary-foreground text-xs">
                          {review.profiles?.full_name?.[0]?.toUpperCase() || "U"}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="text-sm font-medium">{review.profiles?.full_name || "Anonymous"}</p>
                        <div className="flex gap-0.5">
                          {[1, 2, 3, 4, 5].map((s) => (
                            <Star key={s} className={`h-3 w-3 ${s <= review.rating ? "fill-accent text-accent" : "text-muted-foreground"}`} />
                          ))}
                        </div>
                      </div>
                    </div>
                    <p className="text-sm text-muted-foreground">{review.comment}</p>
                  </div>
                ))}

                {/* Write Review */}
                {user && (
                  <form onSubmit={handleReview} className="space-y-3 rounded-2xl bg-muted p-4">
                    <h4 className="font-medium text-sm">Leave a Review</h4>
                    <div className="flex gap-1">
                      {[1, 2, 3, 4, 5].map((s) => (
                        <button
                          type="button"
                          key={s}
                          onClick={() => setReviewRating(s)}
                          className="transition-transform hover:scale-110"
                        >
                          <Star className={`h-5 w-5 ${s <= reviewRating ? "fill-accent text-accent" : "text-muted-foreground"}`} />
                        </button>
                      ))}
                    </div>
                    <textarea
                      value={reviewText}
                      onChange={(e) => setReviewText(e.target.value)}
                      placeholder="Share your experience..."
                      className="w-full rounded-xl border border-border bg-background p-3 text-sm outline-none focus:ring-2 focus:ring-ring resize-none"
                      rows={3}
                      maxLength={500}
                    />
                    <Button type="submit" variant="accent" size="sm" disabled={submittingReview}>
                      {submittingReview && <Loader2 className="h-3 w-3 animate-spin" />}
                      Submit Review
                    </Button>
                  </form>
                )}
              </TabsContent>
            </Tabs>
          </div>

          {/* Booking Card */}
          <aside className="lg:sticky lg:top-24 h-fit">
            <div className="rounded-2xl border border-border bg-card p-6 shadow-sm space-y-4">
              <div className="flex items-baseline gap-2">
                {hasDiscount ? (
                  <>
                    <span className="text-sm text-muted-foreground line-through">
                      ${Number(tour.price_per_person).toLocaleString()}
                    </span>
                    <span className="text-2xl font-bold text-accent">
                      ${Number(tour.discount_price).toLocaleString()}
                    </span>
                  </>
                ) : (
                  <span className="text-2xl font-bold text-foreground">
                    ${Number(tour.price_per_person).toLocaleString()}
                  </span>
                )}
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

              <div className="space-y-2 border-t border-border pt-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">${effectivePrice.toLocaleString()} × {guests} guests</span>
                  <span className="font-medium">${totalPrice.toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-base font-bold">
                  <span>Total</span>
                  <span className="text-foreground">${totalPrice.toLocaleString()}</span>
                </div>
              </div>

              <Button variant="accent" className="w-full" size="lg" onClick={handleBook} disabled={booking}>
                {booking && <Loader2 className="h-4 w-4 animate-spin" />}
                Book Now
              </Button>
              <p className="text-xs text-center text-muted-foreground">You won't be charged yet</p>
            </div>
          </aside>
        </div>
      </div>

      {/* Mobile Fixed Bottom Booking Bar */}
      <div className="fixed bottom-0 left-0 right-0 z-40 border-t border-border bg-card p-4 shadow-[0_-4px_20px_rgba(0,0,0,0.08)] lg:hidden">
        <div className="flex items-center justify-between gap-4">
          <div>
            {hasDiscount ? (
              <div className="flex items-baseline gap-1.5">
                <span className="text-xs text-muted-foreground line-through">
                  ${Number(tour.price_per_person).toLocaleString()}
                </span>
                <span className="text-lg font-bold text-accent">
                  ${Number(tour.discount_price).toLocaleString()}
                </span>
                <span className="text-xs text-muted-foreground">/ person</span>
              </div>
            ) : (
              <div className="flex items-baseline gap-1">
                <span className="text-lg font-bold text-foreground">
                  ${Number(tour.price_per_person).toLocaleString()}
                </span>
                <span className="text-xs text-muted-foreground">/ person</span>
              </div>
            )}
          </div>
          <Button variant="accent" size="lg" onClick={handleBook} disabled={booking} className="shrink-0">
            {booking && <Loader2 className="h-4 w-4 animate-spin" />}
            Book Now
          </Button>
        </div>
      </div>

      {/* Spacer for mobile bottom bar */}
      <div className="h-20 lg:hidden" />
    </Layout>
  );
};

export default TourDetailPage;
