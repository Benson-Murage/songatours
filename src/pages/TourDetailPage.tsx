import { useParams, useNavigate } from "react-router-dom";
import { useState, useCallback } from "react";
import {
  MapPin, Clock, Users, Star, ChevronLeft, ChevronRight, Loader2,
  CheckCircle2, Heart, ShieldCheck, Phone, XCircle, AlertTriangle, MessageCircle,
  CalendarDays, Route, Tag,
} from "lucide-react";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import ParticipantForms, { type Participant } from "@/components/ParticipantForms";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { useTour, useReviews, useFavorites, useToggleFavorite, useTourCapacity } from "@/hooks/useTours";
import { useValidateDiscount } from "@/hooks/useDiscountCodes";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import Layout from "@/components/Layout";
import { formatKES } from "@/lib/formatKES";
import ShareButtons from "@/components/ShareButtons";
import SeatIndicator from "@/components/SeatIndicator";
import TourCountdown from "@/components/TourCountdown";

const FALLBACK_IMG = "https://images.unsplash.com/photo-1516426122078-c23e76319801?w=800&h=800&fit=crop";
const WHATSAPP_ADMIN = "254796102412";

const TourDetailPage = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { data: tour, isLoading } = useTour(id!);
  const { data: reviews } = useReviews(id!);
  const { data: favorites } = useFavorites(user?.id);
  const toggleFavorite = useToggleFavorite();
  const validateDiscount = useValidateDiscount();

  const [startDate, setStartDate] = useState("");
  const [guests, setGuests] = useState(1);
  const [phoneNumber, setPhoneNumber] = useState("");
  const [specialRequests, setSpecialRequests] = useState("");
  const [promoCode, setPromoCode] = useState("");
  const [appliedDiscount, setAppliedDiscount] = useState<{ code: string; discountAmount: number } | null>(null);
  const [referralCode, setReferralCode] = useState("");
  const [booking, setBooking] = useState(false);
  const [reviewText, setReviewText] = useState("");
  const [reviewRating, setReviewRating] = useState(5);
  const [submittingReview, setSubmittingReview] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [galleryIndex, setGalleryIndex] = useState(0);
  const [whatsappModal, setWhatsappModal] = useState<string | null>(null);
  const [bookingRef, setBookingRef] = useState<string | null>(null);
  const [bookingSummary, setBookingSummary] = useState<any>(null);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const handleParticipantsChange = useCallback((p: Participant[]) => setParticipants(p), []);

  const effectiveStartDate = tour?.is_fixed_date && tour?.departure_date
    ? tour.departure_date
    : startDate;

  const { data: capacity } = useTourCapacity(id!, effectiveStartDate || undefined);

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

  const isCanceled = tour.status === "canceled";
  const isCompleted = tour.status === "completed" ||
    (tour.is_fixed_date && tour.departure_date && new Date(tour.departure_date) < new Date(new Date().toDateString()));
  const hasDiscount = tour.discount_price != null && Number(tour.discount_price) < Number(tour.price_per_person);
  const effectivePrice = hasDiscount ? Number(tour.discount_price) : Number(tour.price_per_person);
  const subtotal = effectivePrice * guests;
  const discountAmt = appliedDiscount?.discountAmount || 0;
  const totalPrice = subtotal - discountAmt;
  const destination = tour.destinations as { name: string; country: string } | null;
  const isFixedDate = tour.is_fixed_date && !!tour.departure_date;

  const tourImages = (tour.tour_images || [])
    .sort((a, b) => a.display_order - b.display_order)
    .map((img) => img.image_url);
  const galleryImages = tourImages.length > 0
    ? tourImages
    : [tour.image_url || FALLBACK_IMG];

  const soldOut = capacity?.soldOut ?? false;

  const itinerary: { day: number; title: string; description?: string }[] = (() => {
    try {
      const raw = (tour as any).itinerary;
      if (Array.isArray(raw) && raw.length > 0) return raw;
    } catch {}
    return [];
  })();

  const tourUrl = `${window.location.origin}/tours/${tour.id}`;

  const validateBooking = (): boolean => {
    const newErrors: Record<string, string> = {};
    const bookingDate = isFixedDate ? tour.departure_date! : startDate;
    if (!bookingDate) newErrors.startDate = "Please select a start date";
    else if (new Date(bookingDate) < new Date(new Date().toDateString())) newErrors.startDate = "Date must be in the future";
    if (guests < 1) newErrors.guests = "At least 1 guest required";
    if (guests > tour.max_group_size) newErrors.guests = `Maximum ${tour.max_group_size} guests`;
    if (capacity && guests > capacity.remaining) newErrors.guests = `Only ${capacity.remaining} spot(s) left`;
    if (!phoneNumber.trim()) newErrors.phoneNumber = "Phone number is required";
    else if (!/^[+\d\s\-()]{7,24}$/.test(phoneNumber.trim())) newErrors.phoneNumber = "Enter a valid phone number";
    // Validate participants
    participants.forEach((p, i) => {
      if (!p.full_name.trim()) newErrors[`p${i}_name`] = "Name required";
      if (!p.phone_number.trim()) newErrors[`p${i}_phone`] = "Phone required";
      else if (!/^[+\d\s\-()]{7,24}$/.test(p.phone_number.trim())) newErrors[`p${i}_phone`] = "Invalid phone";
    });
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleApplyPromo = () => {
    if (!promoCode.trim()) return;
    validateDiscount.mutate(
      { code: promoCode, tourId: tour.id, subtotal },
      {
        onSuccess: (result) => {
          setAppliedDiscount({ code: result.code, discountAmount: result.discountAmount });
          toast.success(`Promo applied! You save ${formatKES(result.discountAmount)}`);
        },
        onError: (err: any) => {
          setAppliedDiscount(null);
          toast.error(err.message || "Invalid promo code");
        },
      }
    );
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
      const bookingDate = isFixedDate ? tour.departure_date! : startDate;
      const { data, error } = await supabase.functions.invoke("create-booking", {
        body: {
          tour_id: tour.id,
          start_date: bookingDate,
          guests_count: guests,
          phone_number: phoneNumber.trim(),
          special_requests: specialRequests.trim() || null,
          discount_code: appliedDiscount?.code || null,
          referral_code: referralCode.trim() || null,
        },
      });

      if (error || data?.error) {
        toast.error(data?.error || "Booking failed. Please try again.");
      } else {
        // Save participants
        const bookingId = data?.booking?.id;
        if (bookingId && participants.length > 0) {
          const participantRows = participants.map((p) => ({
            booking_id: bookingId,
            full_name: p.full_name.trim(),
            phone_number: p.phone_number.trim(),
            email: p.email.trim() || null,
            nationality: p.nationality.trim() || null,
            emergency_contact: p.emergency_contact.trim() || null,
            dietary_requirements: p.dietary_requirements.trim() || null,
          }));
          await (supabase as any).from("participants").insert(participantRows);
        }

        toast.success("Booking confirmed!");
        setBookingSummary({
          reference: data?.booking?.booking_reference || null,
          tour_title: tour.title,
          start_date: bookingDate,
          guests,
          total_price: data?.booking?.total_price || totalPrice,
          discount_amount: data?.discount_amount || 0,
          phone: phoneNumber.trim(),
          whatsapp_group_link: data?.whatsapp_group_link || null,
        });
        setBookingRef(data?.booking?.booking_reference || null);
        if (data?.whatsapp_group_link) {
          setWhatsappModal(data.whatsapp_group_link);
        } else {
          setWhatsappModal("confirmed");
        }
      }
    } catch {
      toast.error("Something went wrong. Please try again.");
    }
    setBooking(false);
  };

  const handleReview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) { toast.error("Please sign in to leave a review"); return; }
    if (!reviewText.trim()) { toast.error("Please write a comment"); return; }
    setSubmittingReview(true);
    const { error } = await supabase.from("reviews").insert({
      tour_id: tour.id, user_id: user.id, rating: reviewRating, comment: reviewText.trim(),
    });
    if (error) {
      if (error.message.includes("row-level security")) {
        toast.error("You need a booking for this tour before leaving a review");
      } else { toast.error("Failed to submit review"); }
    } else {
      toast.success("Review submitted!");
      setReviewText(""); setReviewRating(5);
    }
    setSubmittingReview(false);
  };

  const handleToggleFavorite = () => {
    if (!user) { toast.error("Sign in to save favorites"); return; }
    toggleFavorite.mutate({ tourId: tour.id, userId: user.id, isFavorited });
  };

  const starDistribution = [5, 4, 3, 2, 1].map((star) => ({
    star, count: reviews?.filter((r: any) => r.rating === star).length || 0,
  }));
  const totalReviews = reviews?.length || 0;

  const nextImage = () => setGalleryIndex((i) => (i + 1) % galleryImages.length);
  const prevImage = () => setGalleryIndex((i) => (i - 1 + galleryImages.length) % galleryImages.length);

  const DateSelector = () => {
    if (isFixedDate) {
      return (
        <div className="space-y-1.5">
          <Label>Departure Date</Label>
          <div className="flex items-center gap-2 rounded-xl border border-border bg-secondary/50 px-3 py-2.5">
            <CalendarDays className="h-4 w-4 text-primary" />
            <span className="text-sm font-medium">
              {format(new Date(tour.departure_date!), "MMMM d, yyyy")}
            </span>
          </div>
          <p className="text-xs text-primary font-medium">Fixed departure — date cannot be changed</p>
        </div>
      );
    }

    const selectedDate = startDate ? new Date(startDate + "T00:00:00") : undefined;

    return (
      <div className="space-y-1.5">
        <Label htmlFor="startDate">Start Date</Label>
        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              className={cn("w-full justify-start text-left font-normal", !startDate && "text-muted-foreground", errors.startDate && "border-destructive")}
            >
              <CalendarDays className="mr-2 h-4 w-4" />
              {startDate ? format(selectedDate!, "PPP") : "Pick a date"}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar
              mode="single"
              selected={selectedDate}
              onSelect={(d) => {
                if (d) {
                  const iso = d.toISOString().split("T")[0];
                  setStartDate(iso);
                  setErrors((p) => ({ ...p, startDate: "" }));
                }
              }}
              disabled={(date) => date < new Date(new Date().toDateString())}
              initialFocus
              className={cn("p-3 pointer-events-auto")}
            />
          </PopoverContent>
        </Popover>
        {errors.startDate && <p className="text-xs text-destructive">{errors.startDate}</p>}
        <p className="text-xs text-muted-foreground">Flexible travel dates available</p>
      </div>
    );
  };

  return (
    <Layout>
      <div className="container mx-auto px-4 py-6">
        <button onClick={() => navigate(-1)} className="mb-4 flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors">
          <ChevronLeft className="h-4 w-4" /> Back
        </button>

        {/* Gallery */}
        <div className="relative rounded-2xl overflow-hidden h-[300px] md:h-[450px]">
          {galleryImages.length > 1 ? (
            <>
              <div className="flex h-full transition-transform duration-500" style={{ transform: `translateX(-${galleryIndex * 100}%)` }}>
                {galleryImages.map((src, i) => (
                  <img
                    key={i}
                    src={src}
                    alt={`${tour.title} - ${i + 1}`}
                    className="h-full w-full object-cover shrink-0"
                    style={{ minWidth: "100%" }}
                    loading={i === 0 ? "eager" : "lazy"}
                    onError={(e) => { (e.target as HTMLImageElement).src = FALLBACK_IMG; }}
                  />
                ))}
              </div>
              <button onClick={prevImage} className="absolute left-3 top-1/2 -translate-y-1/2 rounded-full bg-card/80 p-2 backdrop-blur-sm hover:bg-card transition-colors" aria-label="Previous image">
                <ChevronLeft className="h-5 w-5" />
              </button>
              <button onClick={nextImage} className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full bg-card/80 p-2 backdrop-blur-sm hover:bg-card transition-colors" aria-label="Next image">
                <ChevronRight className="h-5 w-5" />
              </button>
              <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5">
                {galleryImages.map((_, i) => (
                  <button
                    key={i}
                    onClick={() => setGalleryIndex(i)}
                    className={`h-2 w-2 rounded-full transition-all ${i === galleryIndex ? "bg-primary-foreground w-4" : "bg-primary-foreground/50"}`}
                    aria-label={`Go to image ${i + 1}`}
                  />
                ))}
              </div>
            </>
          ) : (
            <img
              src={galleryImages[0]}
              alt={tour.title}
              className="h-full w-full object-cover"
              loading="eager"
              onError={(e) => { (e.target as HTMLImageElement).src = FALLBACK_IMG; }}
            />
          )}

          {soldOut && !isCompleted && (
            <div className="absolute top-4 left-4 rounded-full bg-destructive px-4 py-1.5 text-sm font-bold text-destructive-foreground shadow-lg">
              SOLD OUT
            </div>
          )}
          {isCanceled && (
            <div className="absolute top-4 left-4 rounded-full bg-destructive px-4 py-1.5 text-sm font-bold text-destructive-foreground shadow-lg">
              CANCELLED
            </div>
          )}
          {isCompleted && !isCanceled && (
            <div className="absolute top-4 left-4 rounded-full bg-muted px-4 py-1.5 text-sm font-bold text-muted-foreground shadow-lg">
              COMPLETED
            </div>
          )}
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
                <button onClick={handleToggleFavorite} className="rounded-full bg-secondary p-2.5 transition-all hover:scale-110" aria-label="Toggle favorite">
                  <Heart className={`h-5 w-5 ${isFavorited ? "fill-destructive text-destructive" : "text-muted-foreground"}`} />
                </button>
              </div>

              <div className="mt-3 flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
                <span className="flex items-center gap-1"><Clock className="h-4 w-4" /> {tour.duration_days} days</span>
                <span className="flex items-center gap-1"><Users className="h-4 w-4" /> Max {tour.max_group_size} per group</span>
                <span className="flex items-center gap-1">
                  <Star className="h-4 w-4 fill-accent text-accent" />
                  {avgRating || "New"} {totalReviews > 0 ? `(${totalReviews} review${totalReviews > 1 ? "s" : ""})` : ""}
                </span>
                <span className="rounded-full bg-secondary px-3 py-0.5 text-xs font-medium text-secondary-foreground">{tour.difficulty}</span>
                {tour.category && (
                  <span className="rounded-full bg-primary/10 px-3 py-0.5 text-xs font-medium text-primary capitalize">
                    {tour.category === "roadtrip" ? "Road Trip" : tour.category}
                  </span>
                )}
              </div>

              {/* Fixed/Flexible date badge */}
              <div className="mt-3">
                {isFixedDate ? (
                  <div className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1 text-sm font-medium text-primary">
                    <CalendarDays className="h-4 w-4" />
                    Next Departure: {format(new Date(tour.departure_date!), "d MMMM yyyy")}
                  </div>
                ) : (
                  <div className="inline-flex items-center gap-1.5 rounded-full bg-secondary px-3 py-1 text-sm font-medium text-secondary-foreground">
                    <CalendarDays className="h-4 w-4" />
                    Flexible Travel Dates Available
                  </div>
                )}
              </div>

              {/* Countdown for upcoming fixed-date tours */}
              {isFixedDate && !isCanceled && !isCompleted && (
                <TourCountdown departureDate={tour.departure_date!} className="mt-4" />
              )}

              {/* Seat Indicator */}
              {capacity && !isCanceled && !isCompleted && (
                <div className="mt-4">
                  <SeatIndicator booked={capacity.booked || 0} total={capacity.total} />
                </div>
              )}

              {/* WhatsApp Quick Contact */}
              <div className="mt-4 flex flex-wrap gap-3">
                <a
                  href={`https://wa.me/${WHATSAPP_ADMIN}?text=${encodeURIComponent(`Hi! I'm interested in the tour: ${tour.title}`)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 rounded-full bg-[hsl(142,70%,45%)]/10 px-4 py-2 text-sm font-medium text-[hsl(142,70%,35%)] hover:bg-[hsl(142,70%,45%)]/20 transition-colors"
                >
                  <MessageCircle className="h-4 w-4" />
                  Chat with us on WhatsApp
                </a>
              </div>

              {/* Share */}
              <div className="mt-4">
                <p className="text-xs text-muted-foreground mb-2">Share this tour</p>
                <ShareButtons url={tourUrl} title={tour.title} description={tour.description || undefined} />
              </div>
            </div>

            <Tabs defaultValue="overview">
              <TabsList className="flex-wrap">
                <TabsTrigger value="overview">Overview</TabsTrigger>
                {itinerary.length > 0 && <TabsTrigger value="itinerary">Itinerary</TabsTrigger>}
                <TabsTrigger value="included">Included</TabsTrigger>
                <TabsTrigger value="excluded">Excluded</TabsTrigger>
                <TabsTrigger value="highlights">Highlights</TabsTrigger>
                <TabsTrigger value="reviews">Reviews ({totalReviews})</TabsTrigger>
              </TabsList>

              <TabsContent value="overview" className="mt-4">
                <p className="leading-relaxed text-muted-foreground">
                  {tour.description || "Experience the beauty of Africa like never before."}
                </p>
                {/* Static map embed */}
                {destination && (
                  <div className="mt-6 rounded-xl overflow-hidden border border-border">
                    <iframe
                      title={`Map of ${destination.name}`}
                      width="100%"
                      height="250"
                      style={{ border: 0 }}
                      loading="lazy"
                      src={`https://www.google.com/maps/embed/v1/place?key=AIzaSyBFw0Qbyq9zTFTd-tUY6dZWTgaQzuU17R8&q=${encodeURIComponent(destination.name + ", " + destination.country)}`}
                      allowFullScreen
                    />
                  </div>
                )}
              </TabsContent>

              {itinerary.length > 0 && (
                <TabsContent value="itinerary" className="mt-4">
                  <div className="space-y-4">
                    {itinerary.map((item, i) => (
                      <div key={i} className="flex gap-4">
                        <div className="flex flex-col items-center">
                          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs font-bold shrink-0">
                            {item.day}
                          </div>
                          {i < itinerary.length - 1 && <div className="w-px flex-1 bg-border mt-1" />}
                        </div>
                        <div className="pb-4">
                          <p className="font-semibold text-foreground">Day {item.day} — {item.title}</p>
                          {item.description && (
                            <p className="text-sm text-muted-foreground mt-1">{item.description}</p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </TabsContent>
              )}

              <TabsContent value="included" className="mt-4">
                {tour.included?.length ? (
                  <ul className="space-y-2">
                    {tour.included.map((item, i) => (
                      <li key={i} className="flex items-center gap-2 text-muted-foreground">
                        <CheckCircle2 className="h-4 w-4 text-primary shrink-0" /> {item}
                      </li>
                    ))}
                  </ul>
                ) : <p className="text-muted-foreground">Details coming soon.</p>}
              </TabsContent>

              <TabsContent value="excluded" className="mt-4">
                {tour.excluded?.length ? (
                  <ul className="space-y-2">
                    {tour.excluded.map((item, i) => (
                      <li key={i} className="flex items-center gap-2 text-muted-foreground">
                        <XCircle className="h-4 w-4 text-destructive shrink-0" /> {item}
                      </li>
                    ))}
                  </ul>
                ) : <p className="text-muted-foreground">No exclusions listed.</p>}
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
                ) : <p className="text-muted-foreground">Details coming soon.</p>}
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
                            <div className="h-full bg-accent rounded-full transition-all" style={{ width: totalReviews > 0 ? `${(count / totalReviews) * 100}%` : "0%" }} />
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

          {/* Booking sidebar — visible on mobile too so users can fill the form */}
          <aside id="booking-form" className="lg:sticky lg:top-24 h-fit scroll-mt-24">
            <div className="rounded-2xl border border-border bg-card p-4 sm:p-6 shadow-sm space-y-4">
              {isCanceled && (
                <div className="rounded-lg bg-destructive/10 p-3 text-sm text-destructive font-medium flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4" /> This tour has been cancelled
                </div>
              )}
              {isCompleted && !isCanceled && (
                <div className="rounded-lg bg-muted p-3 text-sm text-muted-foreground font-medium flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4" /> This tour has already taken place
                </div>
              )}

              <div className="flex items-baseline gap-2">
                {hasDiscount ? (
                  <>
                    <span className="text-sm text-muted-foreground line-through">{formatKES(tour.price_per_person)}</span>
                    <span className="text-2xl font-bold text-accent">{formatKES(tour.discount_price!)}</span>
                  </>
                ) : (
                  <span className="text-2xl font-bold text-foreground">{formatKES(tour.price_per_person)}</span>
                )}
                <span className="text-sm text-muted-foreground">/ person</span>
              </div>

              {!isCanceled && !isCompleted && !soldOut && (
                <div className="space-y-3">
                  <DateSelector />
                  <div className="space-y-1.5">
                    <Label htmlFor="guests">Guests</Label>
                    <Input id="guests" type="number" min={1}
                      max={Math.min(tour.max_group_size, capacity?.remaining ?? tour.max_group_size)}
                      value={guests}
                      onChange={(e) => { setGuests(Number(e.target.value)); setErrors((p) => ({ ...p, guests: "" })); setAppliedDiscount(null); }}
                      className={errors.guests ? "border-destructive" : ""} />
                    {errors.guests && <p className="text-xs text-destructive">{errors.guests}</p>}
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="phoneNumber" className="flex items-center gap-1.5">
                      <Phone className="h-3.5 w-3.5" /> Phone Number
                    </Label>
                    <Input id="phoneNumber" type="tel" value={phoneNumber}
                      onChange={(e) => { setPhoneNumber(e.target.value); setErrors((p) => ({ ...p, phoneNumber: "" })); }}
                      placeholder="+254 700 000 000"
                      className={errors.phoneNumber ? "border-destructive" : ""} />
                    {errors.phoneNumber && <p className="text-xs text-destructive">{errors.phoneNumber}</p>}
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="specialRequests">Special Requests (optional)</Label>
                    <textarea id="specialRequests" value={specialRequests}
                      onChange={(e) => setSpecialRequests(e.target.value)}
                      placeholder="Dietary needs, accessibility, etc."
                      className="w-full rounded-xl border border-border bg-background p-3 text-sm outline-none focus:ring-2 focus:ring-ring resize-none"
                      rows={2} maxLength={1000} />
                  </div>

                  {/* Promo Code */}
                  <div className="space-y-1.5">
                    <Label className="flex items-center gap-1.5"><Tag className="h-3.5 w-3.5" /> Promo Code</Label>
                    <div className="flex gap-2">
                      <Input
                        value={promoCode}
                        onChange={(e) => { setPromoCode(e.target.value.toUpperCase()); setAppliedDiscount(null); }}
                        placeholder="e.g. SONGA10"
                        className="flex-1"
                      />
                      <Button type="button" variant="outline" size="sm" onClick={handleApplyPromo}
                        disabled={validateDiscount.isPending || !promoCode.trim()}>
                        {validateDiscount.isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : "Apply"}
                      </Button>
                    </div>
                    {appliedDiscount && (
                      <p className="text-xs text-primary font-medium flex items-center gap-1">
                        <CheckCircle2 className="h-3 w-3" />
                        {appliedDiscount.code} applied — you save {formatKES(appliedDiscount.discountAmount)}
                      </p>
                    )}
                  </div>

                  {/* Referral Code */}
                  <div className="space-y-1.5">
                    <Label>Referral Code (optional)</Label>
                    <Input
                      value={referralCode}
                      onChange={(e) => setReferralCode(e.target.value.toUpperCase())}
                      placeholder="e.g. REF-SONGA-XXXX"
                    />
                  </div>

                  {/* Participant Details */}
                  <ParticipantForms guestCount={guests} onChange={handleParticipantsChange} errors={errors} />
                </div>
              )}

              {!isCanceled && !isCompleted && !soldOut && (
                <>
                  <div className="space-y-2 border-t border-border pt-3 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">{formatKES(effectivePrice)} × {guests} guest{guests > 1 ? "s" : ""}</span>
                      <span className="font-medium">{formatKES(subtotal)}</span>
                    </div>
                    {discountAmt > 0 && (
                      <div className="flex justify-between text-primary">
                        <span>Promo discount</span>
                        <span>-{formatKES(discountAmt)}</span>
                      </div>
                    )}
                    <div className="flex justify-between text-base font-bold">
                      <span>Total</span>
                      <span className="text-foreground">{formatKES(totalPrice)}</span>
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
                </>
              )}

              {soldOut && !isCanceled && !isCompleted && (
                <div className="rounded-lg bg-destructive/10 p-4 text-center">
                  <AlertTriangle className="h-6 w-6 text-destructive mx-auto mb-2" />
                  <p className="font-semibold text-destructive">Sold Out</p>
                  <p className="text-xs text-muted-foreground mt-1">Try selecting a different date</p>
                </div>
              )}
            </div>
          </aside>
        </div>
      </div>

      {/* Mobile bottom bar */}
      {!isCanceled && !isCompleted && !soldOut && (
        <div
          className="fixed bottom-0 left-0 right-0 z-40 border-t border-border bg-card px-4 pt-3 shadow-[0_-4px_20px_rgba(0,0,0,0.08)] lg:hidden"
          style={{ paddingBottom: "calc(env(safe-area-inset-bottom, 0px) + 0.75rem)" }}
        >
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              {hasDiscount ? (
                <div className="flex items-baseline gap-1.5">
                  <span className="text-xs text-muted-foreground line-through">{formatKES(tour.price_per_person)}</span>
                  <span className="text-lg font-bold text-accent">{formatKES(tour.discount_price!)}</span>
                  <span className="text-xs text-muted-foreground">/ person</span>
                </div>
              ) : (
                <div className="flex items-baseline gap-1">
                  <span className="text-lg font-bold text-foreground">{formatKES(tour.price_per_person)}</span>
                  <span className="text-xs text-muted-foreground">/ person</span>
                </div>
              )}
              <p className="text-[10px] text-muted-foreground truncate">
                {isFixedDate
                  ? `Departs ${format(new Date(tour.departure_date!), "MMM d")}`
                  : "Free cancellation"}
              </p>
            </div>
            <Button
              variant="accent"
              size="lg"
              onClick={() => {
                const bookingDate = isFixedDate ? tour.departure_date! : startDate;
                if (!bookingDate || !phoneNumber.trim()) {
                  document.getElementById("booking-form")?.scrollIntoView({ behavior: "smooth", block: "start" });
                  validateBooking();
                  return;
                }
                handleBook();
              }}
              disabled={booking}
              className="shrink-0 min-h-[48px] px-6 pointer-events-auto active:scale-[0.98] transition-transform"
            >
              {booking && <Loader2 className="h-4 w-4 animate-spin" />}
              Book Now
            </Button>
          </div>
        </div>
      )}

      {soldOut && !isCanceled && !isCompleted && (
        <div
          className="fixed bottom-0 left-0 right-0 z-40 border-t border-border bg-destructive/10 px-4 pt-4 lg:hidden text-center"
          style={{ paddingBottom: "calc(env(safe-area-inset-bottom, 0px) + 1rem)" }}
        >
          <p className="font-semibold text-destructive">This departure is sold out</p>
        </div>
      )}

      {/* Spacer so content isn't hidden behind the fixed bottom bar */}
      <div className="h-24 lg:hidden" />

      {/* Booking Confirmation Modal */}
      <Dialog open={!!whatsappModal} onOpenChange={(open) => {
        if (!open) { setWhatsappModal(null); navigate("/dashboard"); }
      }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-primary" />
              Booking Confirmed!
            </DialogTitle>
            <DialogDescription>
              Your booking has been received. Here's your summary.
            </DialogDescription>
          </DialogHeader>
          {bookingSummary && (
            <div className="space-y-4 pt-2">
              <div className="rounded-xl bg-secondary p-4 space-y-2 text-sm">
                {bookingSummary.reference && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Reference</span>
                    <span className="font-bold text-foreground">{bookingSummary.reference}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Tour</span>
                  <span className="font-medium text-foreground">{bookingSummary.tour_title}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Date</span>
                  <span className="text-foreground">{new Date(bookingSummary.start_date).toLocaleDateString("en-KE", { day: "numeric", month: "long", year: "numeric" })}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Guests</span>
                  <span className="text-foreground">{bookingSummary.guests}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Phone</span>
                  <span className="text-foreground">{bookingSummary.phone}</span>
                </div>
                {bookingSummary.discount_amount > 0 && (
                  <div className="flex justify-between text-primary">
                    <span>Discount</span>
                    <span>-{formatKES(bookingSummary.discount_amount)}</span>
                  </div>
                )}
                <div className="flex justify-between border-t border-border pt-2">
                  <span className="font-semibold">Total</span>
                  <span className="font-bold text-foreground">{formatKES(bookingSummary.total_price)}</span>
                </div>
              </div>

              {bookingSummary.whatsapp_group_link && (
                <Button variant="accent" size="lg" className="w-full"
                  onClick={() => window.open(bookingSummary.whatsapp_group_link, "_blank", "noopener,noreferrer")}>
                  <MessageCircle className="mr-2 h-4 w-4" />
                  Join Tour WhatsApp Group
                </Button>
              )}
              <Button variant="outline" className="w-full"
                onClick={() => { setWhatsappModal(null); navigate("/dashboard"); }}>
                Go to My Trips
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </Layout>
  );
};

export default TourDetailPage;
