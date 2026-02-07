import Layout from "@/components/Layout";
import HeroSearch from "@/components/HeroSearch";
import TourCard from "@/components/TourCard";
import TourCardSkeleton from "@/components/TourCardSkeleton";
import DestinationCard from "@/components/DestinationCard";
import { useTours, useDestinations } from "@/hooks/useTours";
import { ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import heroImage from "@/assets/hero-safari.jpg";

const Index = () => {
  const { data: tours, isLoading } = useTours();
  const { data: destinations } = useDestinations();

  const dealTours = tours?.filter((t) => t.discount_price != null && t.discount_price < t.price_per_person) ?? [];
  const featuredTours = tours?.slice(0, 8) ?? [];

  return (
    <Layout>
      {/* Hero */}
      <section className="relative flex min-h-[75vh] items-center justify-center overflow-hidden">
        <img
          src={heroImage}
          alt="African savanna at golden hour"
          className="absolute inset-0 h-full w-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-black/50 via-black/20 to-black/60" />
        <div className="relative z-10 w-full max-w-4xl px-4 text-center">
          <p className="mb-3 text-sm font-medium uppercase tracking-widest text-accent animate-fade-in">
            Premium African Tourism
          </p>
          <h1 className="mb-4 text-4xl font-extrabold tracking-tight text-white sm:text-5xl lg:text-6xl drop-shadow-lg animate-fade-in" style={{ animationDelay: "0.1s" }}>
            Discover Africa's{" "}
            <span className="text-accent">Hidden Wonders</span>
          </h1>
          <p className="mx-auto mb-8 max-w-xl text-lg text-white/80 animate-fade-in" style={{ animationDelay: "0.2s" }}>
            Curated tours through breathtaking landscapes, vibrant cultures, and unforgettable wildlife encounters.
          </p>
          <div className="animate-fade-in" style={{ animationDelay: "0.3s" }}>
            <HeroSearch />
          </div>
        </div>
      </section>

      {/* Trending Destinations */}
      {destinations && destinations.length > 0 && (
        <section className="container mx-auto px-4 py-16">
          <div className="mb-8 flex items-end justify-between">
            <div>
              <h2 className="text-3xl font-bold text-foreground">Trending Destinations</h2>
              <p className="mt-1 text-muted-foreground">Explore Africa's most sought-after locations</p>
            </div>
            <Link to="/destinations">
              <Button variant="ghost" size="sm" className="hidden sm:flex">
                View All <ArrowRight className="ml-1 h-4 w-4" />
              </Button>
            </Link>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
            {destinations.map((dest) => (
              <DestinationCard key={dest.id} destination={dest} />
            ))}
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
              {dealTours.map((tour) => (
                <TourCard key={tour.id} tour={tour} />
              ))}
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
            {Array.from({ length: 8 }).map((_, i) => (
              <TourCardSkeleton key={i} />
            ))}
          </div>
        ) : featuredTours.length > 0 ? (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {featuredTours.map((tour) => (
              <TourCard key={tour.id} tour={tour} />
            ))}
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
            <Button variant="accent" size="lg">
              Get Started Today
            </Button>
          </Link>
        </div>
      </section>
    </Layout>
  );
};

export default Index;
