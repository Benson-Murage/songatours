import { useParams, useNavigate } from "react-router-dom";
import { useState } from "react";
import { MapPin, Clock, Users, Star, ChevronLeft, Loader2, CheckCircle2, Heart, ShieldCheck, Phone, XCircle } from "lucide-react";
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
  const [phoneNumber, setPhoneNumber] = useState("");
  const [booking, setBooking] = useState(false);
  const [reviewText, setReviewText] = useState("");
  const [reviewRating, setReviewRating] = useState(5);
  const [submittingReview, setSubmittingReview] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

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
          <p className="text-muted-foreground mt-2">This tour may have been removed or is no longer available.</p>
          <Button variant="outline" onClick={() => navigate("/")} className="mt-4">Go Home</Button>
        </div>
      </Layout>
    );
  }

  const hasDiscount = tour.discount_price != null && Number(tour.discount_price) < Number(tour.price_per_person);
  const effectivePrice = hasDiscount ? Number(tour.discount_price) : Number(tour.price_per_person);
  const totalPrice = effectivePrice * guests;
  const destination = tour.destinations as { name: string; country: string } | null;

  const validateBooking = (): boolean => {
    const newErrors: Record<string, string> = {};
    if (!startDate) newErrors.startDate = "Please select a start date";
    else if (new Date(startDate) < new Date()) newErrors.startDate = "Date must be in the future";
    if (guests < 1) newErrors.guests = "At least 1 guest required";
    if (guests > tour.max_group_size) newErrors.guests = `Maximum ${tour.max_group_size} guests`;
    if (!phoneNumber.trim()) newErrors.phoneNumber = "Phone number is required";
    else if (!/^[+\d\s\-()]{7,24}$/.test(phoneNumber.trim())) newErrors.phoneNumber = "Enter a valid phone number";
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleBook = async () => {
    if (!user) {
      toast.error("Please sign in to book a tour");
      navigate("/auth");
      return;
    }
    if (!validateBooking()) return;

    setBooking(true);
    try {
      const { data, error } = await supabase.functions.invoke("create-booking", {
        body: { tour_id: tour.id, start_date: startDate, guests_count: guests, phone_number: phoneNumber.trim() },
      });

      if (error || data?.error) {
        toast.error(data?.error || "Booking failed. Please try again.");
      } else {
        toast.success("Booking confirmed!");
        if (data?.whatsapp_group_link) {
          window.open(data.whatsapp_group_link, "_blank", "noopener,noreferrer");
          toast.info("WhatsApp group invite opened in a new tab.");
        }
        navigate("/dashboard");
      }
    } catch {
      toast.error("Something went wrong. Please try again.");
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
      if (error.message.includes("row-level security")) {
        toast.error("You need a booking for this tour before leaving a review");
      } else {
        toast.error("Failed to submit review");
      }
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

  const galleryImages = [
    tour.image_url || "https://images.unsplash.com/photo-1516426122078-c23e76319801?w=800&h=800&fit=crop",
    "https://images.unsplash.com/photo-1523805009345-7448845a9e53?w=600&h=400&fit=crop",
    "https://images.unsplash.com/photo-1547471080-7cc2caa01a7e?w=600&h=400&fit=crop",
    "https://images.unsplash.com/photo-1489392191049-fc10c97e64b6?w=600&h=400&fit=crop",
    "https://images.unsplash.com/photo-1517960413843-0aee8e2b3285?w=600&h=400&fit=crop",
  ];

  const starDistribution = [5, 4, 3, 2, 1].map((star) => ({
    star,
    count: reviews?.filter((r: any) => r.rating === star).length || 0,
  }));
  const totalReviews = reviews?.length || 0;

  return (
    <Layout>
      <div className="container mx-auto px-4 py-6">
        <button
          onClick={() => navigate(-1)}
          className="mb-4 flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ChevronLeft className="h-4 w-4" /> Back
        </button>

        <div className="grid gap-2 rounded-2xl overflow-hidden h-[300px] md:h-[450px] grid-cols-4 grid-rows-2">
          <div className="col-span-2 row-span-2">
            <img src={galleryImages[0]} alt={tour.title} className="h-full w-full object-cover" loading="eager" />
          </div>
          <div><img src={galleryImages[1]} alt="Gallery" className="h-full w-full object-cover" loading="lazy" /></div>
          <div><img src={galleryImages[2]} alt="Gallery" className="h-full w-full object-cover" loading="lazy" /></div>
          <div className="hidden md:block"><img src={galleryImages[3]} alt="Gallery" className="h-full w-full object-cover" loading="lazy" /></div>
          <div className="hidden md:block"><img src={galleryImages[4]} alt="Gallery" className="h-full w-full object-cover" loading="lazy" /></div>
        </div>

        <div className="mt-8 grid gap-8 lg:grid-cols-3">
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
                  {avgRating || "New"} {totalReviews > 0 ? `(${totalReviews} review${totalReviews > 1 ? "s" : ""})` : ""}
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
                <TabsTrigger value="reviews">Reviews ({totalReviews})</TabsTrigger>
              </TabsList>

              <TabsContent value="overview" className="mt-4">
                <p className="leading-relaxed text-muted-foreground">
                  {tour.description || "Experience the beauty of Africa like never before."}
                </p>
              </TabsContent>

              <TabsContent value="included" className="mt-4">
                {tour.included?.length ? (
                  <ul className="space-y-2">
                    {tour.included.map((item, i) => (
                      <li key={i} className="flex items-center gap-2 text-muted-foreground">
                        <CheckCircle2 className="h-4 w-4 text-primary shrink-0" /> {item}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-muted-foreground">Details coming soon.</p>
                )}
              </TabsContent>

              <TabsContent value="highlights" className="mt-4">
                {tour.highlights?.length ? (
                  <ul className="space-y-2">
                    {tour.highlights.map((item, i) => (
                      <li key={i} className="flex items-center gap-2 text-muted-foreground">
                        <Star className="h-4 w-4 text-accent shrink-0" /> {item}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-muted-foreground">Details coming soon.</p>
                )}
              </TabsContent>

              <TabsContent value="reviews" className="mt-4 space-y-6">
                {totalReviews > 0 ? (
                  <div className="flex flex-col sm:flex-row gap-6 rounded-2xl bg-secondary p-5">
                    <div className="text-center">
                      <span className="text-5xl font-bold text-foreground">{avgRating}</span>
                      <div className="flex gap-0.5 justify-center mt-1">
                        {[1, 2, 3, 4, 5].map((s) => (
                          <Star key={s} className={`h-4 w-4 ${s <= Math.round(Number(avgRating)) ? "fill-accent text-accent" : "text-muted-foreground"}`} />
                        ))}
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">{totalReviews} review{totalReviews > 1 ? "s" : ""}</p>
                    </div>
                    <div className="flex-1 space-y-1.5">
                      {starDistribution.map(({ star, count }) => (
                        <div key={star} className="flex items-center gap-2 text-sm">
                          <span className="w-3 text-muted-foreground">{star}</span>
                          <Star className="h-3 w-3 text-accent" />
                          <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                            <div
                              className="h-full bg-accent rounded-full transition-all"
                              style={{ width: totalReviews > 0 ? `${(count / totalReviews) * 100}%` : "0%" }}
                            />
                          </div>
                          <span className="w-6 text-right text-muted-foreground">{count}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="rounded-2xl bg-secondary p-6 text-center">
                    <Star className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                    <p className="font-medium text-foreground">No reviews yet</p>
                    <p className="text-sm text-muted-foreground">Be the first to share your experience</p>
                  </div>
                )}

                {reviews?.map((review: any) => (
                  <div key={review.id} className="border-b border-border pb-4 last:border-0">
                    <div className="flex items-center gap-2 mb-2">
                      <Avatar className="h-8 w-8">
                        <AvatarFallback className="bg-primary text-primary-foreground text-xs">
                          {review.profiles?.full_name?.[0]?.toUpperCase() || "U"}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="text-sm font-medium">{review.profiles?.full_name || "Traveler"}</p>
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

                {user ? (
                  <form onSubmit={handleReview} className="space-y-3 rounded-2xl bg-muted p-4">
                    <h4 className="font-medium text-sm">Leave a Review</h4>
                    <p className="text-xs text-muted-foreground">You must have a booking for this tour to submit a review.</p>
                    <div className="flex gap-1">
                      {[1, 2, 3, 4, 5].map((s) => (
                        <button type="button" key={s} onClick={() => setReviewRating(s)} className="transition-transform hover:scale-110">
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
                ) : (
                  <div className="rounded-2xl bg-muted p-4 text-center">
                    <p className="text-sm text-muted-foreground">
                      <button onClick={() => navigate("/auth")} className="text-primary font-medium hover:underline">Sign in</button> to leave a review
                    </p>
                  </div>
                )}
              </TabsContent>
            </Tabs>
          </div>

          <aside className="hidden lg:block lg:sticky lg:top-24 h-fit">
            <div className="rounded-2xl border border-border bg-card p-6 shadow-sm space-y-4">
              <div className="flex items-baseline gap-2">
                {hasDiscount ? (
                  <>
                    <span className="text-sm text-muted-foreground line-through">${Number(tour.price_per_person).toLocaleString()}</span>
                    <span className="text-2xl font-bold text-accent">${Number(tour.discount_price).toLocaleString()}</span>
                  </>
                ) : (
                  <span className="text-2xl font-bold text-foreground">${Number(tour.price_per_person).toLocaleString()}</span>
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
                    onChange={(e) => { setStartDate(e.target.value); setErrors((p) => ({ ...p, startDate: "" })); }}
                    min={new Date().toISOString().split("T")[0]}
                    className={errors.startDate ? "border-destructive" : ""}
                  />
                  {errors.startDate && <p className="text-xs text-destructive">{errors.startDate}</p>}
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="guests">Guests</Label>
                  <Input
                    id="guests"
                    type="number"
                    min={1}
                    max={tour.max_group_size}
                    value={guests}
                    onChange={(e) => { setGuests(Number(e.target.value)); setErrors((p) => ({ ...p, guests: "" })); }}
                    className={errors.guests ? "border-destructive" : ""}
                  />
                  {errors.guests && <p className="text-xs text-destructive">{errors.guests}</p>}
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="phoneNumber" className="flex items-center gap-1.5">
                    <Phone className="h-3.5 w-3.5" />
                    Phone Number
                  </Label>
                  <Input
                    id="phoneNumber"
                    type="tel"
                    value={phoneNumber}
                    onChange={(e) => { setPhoneNumber(e.target.value); setErrors((p) => ({ ...p, phoneNumber: "" })); }}
                    placeholder="+255 700 000 000"
                    className={errors.phoneNumber ? "border-destructive" : ""}
                  />
                  {errors.phoneNumber && <p className="text-xs text-destructive">{errors.phoneNumber}</p>}
                </div>
              </div>

              <div className="space-y-2 border-t border-border pt-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">${effectivePrice.toLocaleString()} x {guests} guest{guests > 1 ? "s" : ""}</span>
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

              <div className="space-y-2 text-center">
                <p className="text-xs text-muted-foreground">You won't be charged yet</p>
                <div className="flex items-center justify-center gap-4 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1"><ShieldCheck className="h-3.5 w-3.5 text-primary" /> Secure booking</span>
                  <span className="flex items-center gap-1"><XCircle className="h-3.5 w-3.5" /> Free cancellation</span>
                </div>
              </div>
            </div>
          </aside>
        </div>
      </div>

      <div className="fixed bottom-0 left-0 right-0 z-40 border-t border-border bg-card p-4 shadow-[0_-4px_20px_rgba(0,0,0,0.08)] lg:hidden transition-transform">
        <div className="flex items-center justify-between gap-4">
          <div>
            {hasDiscount ? (
              <div className="flex items-baseline gap-1.5">
                <span className="text-xs text-muted-foreground line-through">${Number(tour.price_per_person).toLocaleString()}</span>
                <span className="text-lg font-bold text-accent">${Number(tour.discount_price).toLocaleString()}</span>
                <span className="text-xs text-muted-foreground">/ person</span>
              </div>
            ) : (
              <div className="flex items-baseline gap-1">
                <span className="text-lg font-bold text-foreground">${Number(tour.price_per_person).toLocaleString()}</span>
                <span className="text-xs text-muted-foreground">/ person</span>
              </div>
            )}
            <p className="text-[10px] text-muted-foreground">Free cancellation</p>
          </div>
          <Button variant="accent" size="lg" onClick={handleBook} disabled={booking} className="shrink-0">
            {booking && <Loader2 className="h-4 w-4 animate-spin" />}
            Book Now
          </Button>
        </div>
      </div>

      <div className="h-20 lg:hidden" />
    </Layout>
  );
};

export default TourDetailPage;
