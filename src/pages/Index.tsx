import Layout from "@/components/Layout";
import HeroSearch from "@/components/HeroSearch";
import TourCard from "@/components/TourCard";
import TourCardSkeleton from "@/components/TourCardSkeleton";
import { useTours } from "@/hooks/useTours";
import heroImage from "@/assets/hero-safari.jpg";

const Index = () => {
  const { data: tours, isLoading } = useTours();

  return (
    <Layout>
      {/* Hero */}
      <section className="relative flex min-h-[70vh] items-center justify-center overflow-hidden">
        <img
          src={heroImage}
          alt="African savanna at golden hour"
          className="absolute inset-0 h-full w-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-black/20 to-black/60" />

        <div className="relative z-10 w-full max-w-4xl px-4 text-center">
          <h1 className="mb-4 text-4xl font-extrabold tracking-tight text-white sm:text-5xl lg:text-6xl drop-shadow-lg">
            Discover Africa's <br className="hidden sm:block" />
            <span className="text-accent">Hidden Wonders</span>
          </h1>
          <p className="mx-auto mb-8 max-w-xl text-lg text-white/80">
            Curated tours through breathtaking landscapes, vibrant cultures, and unforgettable wildlife encounters.
          </p>
          <HeroSearch />
        </div>
      </section>

      {/* Featured Tours */}
      <section className="container mx-auto px-4 py-16">
        <div className="mb-8 text-center">
          <h2 className="text-3xl font-bold text-foreground">Featured Tours</h2>
          <p className="mt-2 text-muted-foreground">
            Hand-picked experiences for the adventurous traveler
          </p>
        </div>

        {isLoading ? (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <TourCardSkeleton key={i} />
            ))}
          </div>
        ) : tours && tours.length > 0 ? (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {tours.map((tour) => (
              <TourCard key={tour.id} tour={tour} />
            ))}
          </div>
        ) : (
          <div className="py-20 text-center">
            <p className="text-lg text-muted-foreground">
              No tours available yet. Check back soon!
            </p>
          </div>
        )}
      </section>
    </Layout>
  );
};

export default Index;
