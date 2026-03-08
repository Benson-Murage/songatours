import Layout from "@/components/Layout";
import HeroSearch from "@/components/HeroSearch";
import TourCard from "@/components/TourCard";
import TourCardSkeleton from "@/components/TourCardSkeleton";
import DestinationCard from "@/components/DestinationCard";
import TrustSection from "@/components/TrustSection";
import { useTours, useTrendingDestinations } from "@/hooks/useTours";
import { ArrowRight, Car, CalendarDays } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import heroImage from "@/assets/hero-safari.jpg";
import { formatKES } from "@/lib/formatKES";
import { format } from "date-fns";

const Index = () => {
  const { data: tours, isLoading } = useTours();
  const { data: roadTrips } = useTours(undefined, "roadtrip");
  const { data: trendingDestinations } = useTrendingDestinations();

  const dealTours = tours?.filter((t) => t.discount_price != null && t.discount_price < t.price_per_person) ?? [];
  const featuredTours = tours?.slice(0, 8) ?? [];

  const now = new Date();
  const upcomingDepartures = tours
    ?.filter((t) => t.is_fixed_date && t.departure_date && new Date(t.departure_date) >= now)
    .sort((a, b) => new Date(a.departure_date!).getTime() - new Date(b.departure_date!).getTime())
    .slice(0, 6) ?? [];

  return (
    <Layout>
      {/* Hero */}
      <section className="relative flex min-h-[75vh] items-center justify-center overflow-hidden">
        <img src={heroImage} alt="African savanna at golden hour" className="absolute inset-0 h-full w-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-b from-black/50 via-black/20 to-black/60" />
        <div className="relative z-10 w-full max-w-4xl px-4 text-center">
          <p className="mb-3 text-sm font-medium uppercase tracking-widest text-accent animate-fade-in">
            Premium African Tourism
          </p>
          <h1 className="mb-4 text-4xl font-extrabold tracking-tight text-white sm:text-5xl lg:text-6xl drop-shadow-lg animate-fade-in" style={{ animationDelay: "0.1s" }}>
            Discover Africa's <span className="text-accent">Hidden Wonders</span>
          </h1>
          <p className="mx-auto mb-8 max-w-xl text-lg text-white/80 animate-fade-in" style={{ animationDelay: "0.2s" }}>
            Curated tours through breathtaking landscapes, vibrant cultures, and unforgettable wildlife encounters.
          </p>
          <div className="animate-fade-in" style={{ animationDelay: "0.3s" }}>
            <HeroSearch />
          </div>
        </div>
      </section>

      {/* Trust Section */}
      <TrustSection />

      {/* Trending Destinations */}
      {trendingDestinations && trendingDestinations.length > 0 && (
        <section className="container mx-auto px-4 py-16">
          <div className="mb-8 flex items-end justify-between">
            <div>
              <h2 className="text-3xl font-bold text-foreground">🔥 Trending Destinations</h2>
              <p className="mt-1 text-muted-foreground">Most popular destinations right now</p>
            </div>
            <Link to="/destinations">
              <Button variant="ghost" size="sm" className="hidden sm:flex">
                View All <ArrowRight className="ml-1 h-4 w-4" />
              </Button>
            </Link>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
            {trendingDestinations.map((dest) => <DestinationCard key={dest.id} destination={dest} />)}
          </div>
        </section>
      )}

      {/* Upcoming Departures */}
      {upcomingDepartures.length > 0 && (
        <section className="bg-primary/5 py-16">
          <div className="container mx-auto px-4">
            <div className="mb-8 flex items-end justify-between">
              <div className="flex items-center gap-3">
                <CalendarDays className="h-7 w-7 text-primary" />
                <div>
                  <h2 className="text-3xl font-bold text-foreground">Upcoming Trips</h2>
                  <p className="mt-1 text-muted-foreground">Tours with confirmed departure dates</p>
                </div>
              </div>
              <Link to="/destinations">
                <Button variant="ghost" size="sm" className="hidden sm:flex">
                  View All <ArrowRight className="ml-1 h-4 w-4" />
                </Button>
              </Link>
            </div>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {upcomingDepartures.map((tour) => (
                <Link key={tour.id} to={`/tours/${tour.id}`} className="group">
                  <div className="flex items-center gap-4 rounded-2xl border border-border bg-card p-4 transition-all hover:shadow-md hover:-translate-y-0.5">
                    <img
                      src={tour.tour_images?.sort((a, b) => a.display_order - b.display_order)?.[0]?.image_url || tour.image_url || "https://images.unsplash.com/photo-1516426122078-c23e76319801?w=200&h=200&fit=crop"}
                      alt={tour.title}
                      className="h-20 w-20 rounded-xl object-cover shrink-0"
                      loading="lazy"
                      onError={(e) => { (e.target as HTMLImageElement).src = "https://images.unsplash.com/photo-1516426122078-c23e76319801?w=200&h=200&fit=crop"; }}
                    />
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-foreground line-clamp-1 group-hover:text-primary transition-colors">{tour.title}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">{tour.duration_days} days • {tour.difficulty}</p>
                      <div className="mt-1.5 flex items-center gap-1 text-sm text-primary font-medium">
                        <CalendarDays className="h-3.5 w-3.5" />
                        {format(new Date(tour.departure_date!), "d MMM yyyy")}
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-lg font-bold text-foreground">{formatKES(tour.discount_price ?? tour.price_per_person)}</p>
                      <p className="text-xs text-muted-foreground">per person</p>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Road Trips */}
      {roadTrips && roadTrips.length > 0 && (
        <section className="py-16">
          <div className="container mx-auto px-4">
            <div className="mb-8 flex items-end justify-between">
              <div className="flex items-center gap-3">
                <Car className="h-7 w-7 text-primary" />
                <div>
                  <h2 className="text-3xl font-bold text-foreground">Road Trips</h2>
                  <p className="mt-1 text-muted-foreground">Hit the open road and explore Africa</p>
                </div>
              </div>
              <Link to="/road-trips">
                <Button variant="ghost" size="sm" className="hidden sm:flex">
                  View All <ArrowRight className="ml-1 h-4 w-4" />
                </Button>
              </Link>
            </div>
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {roadTrips.slice(0, 4).map((tour) => <TourCard key={tour.id} tour={tour} />)}
            </div>
          </div>
        </section>
      )}

      {/* Last Minute Deals */}
      {dealTours.length > 0 && (
        <section className="bg-secondary/50 py-16">
          <div className="container mx-auto px-4">
            <div className="mb-8">
              <h2 className="text-3xl font-bold text-foreground">🔥 Last Minute Deals</h2>
              <p className="mt-1 text-muted-foreground">Grab these limited-time discounts before they're gone</p>
            </div>
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {dealTours.map((tour) => <TourCard key={tour.id} tour={tour} />)}
            </div>
          </div>
        </section>
      )}

      {/* Featured Tours */}
      <section className="container mx-auto px-4 py-16">
        <div className="mb-8 flex items-end justify-between">
          <div>
            <h2 className="text-3xl font-bold text-foreground">Featured Tours</h2>
            <p className="mt-1 text-muted-foreground">Hand-picked experiences for the adventurous traveler</p>
          </div>
          <Link to="/destinations">
            <Button variant="ghost" size="sm" className="hidden sm:flex">
              Browse All <ArrowRight className="ml-1 h-4 w-4" />
            </Button>
          </Link>
        </div>

        {isLoading ? (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {Array.from({ length: 8 }).map((_, i) => <TourCardSkeleton key={i} />)}
          </div>
        ) : featuredTours.length > 0 ? (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {featuredTours.map((tour) => <TourCard key={tour.id} tour={tour} />)}
          </div>
        ) : (
          <div className="py-20 text-center">
            <p className="text-lg text-muted-foreground">No tours available yet. Check back soon!</p>
          </div>
        )}
      </section>

      {/* CTA */}
      <section className="bg-primary py-16">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-3xl font-bold text-primary-foreground mb-3">Ready for Your African Adventure?</h2>
          <p className="text-primary-foreground/80 mb-6 max-w-md mx-auto">
            Join thousands of travelers who've discovered Africa's magic with Songa.
          </p>
          <Link to="/auth">
            <Button variant="accent" size="lg">Get Started Today</Button>
          </Link>
        </div>
      </section>
    </Layout>
  );
};

export default Index;
