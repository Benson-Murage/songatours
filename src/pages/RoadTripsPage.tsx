import { Car, MapPin, ArrowRight } from "lucide-react";
import Layout from "@/components/Layout";
import TourCard from "@/components/TourCard";
import TourCardSkeleton from "@/components/TourCardSkeleton";
import { useTours } from "@/hooks/useTours";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";

const RoadTripsPage = () => {
  const { data: tours, isLoading, isError } = useTours(undefined, "roadtrip");

  return (
    <Layout>
      {/* Hero */}
      <section className="relative flex min-h-[50vh] items-center justify-center overflow-hidden bg-gradient-to-br from-primary/90 to-primary">
        <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?w=1600&h=800&fit=crop')] bg-cover bg-center opacity-30" />
        <div className="relative z-10 w-full max-w-3xl px-4 text-center">
          <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-accent/20 px-4 py-1.5 text-sm font-medium text-accent-foreground backdrop-blur-sm">
            <Car className="h-4 w-4" /> Road Trips
          </div>
          <h1 className="mb-4 text-4xl font-extrabold tracking-tight text-primary-foreground sm:text-5xl drop-shadow-lg">
            Epic Road Trip Adventures
          </h1>
          <p className="mx-auto mb-6 max-w-xl text-lg text-primary-foreground/80">
            Hit the open road and explore Africa's most stunning routes, scenic stops, and hidden gems along the way.
          </p>
        </div>
      </section>

      <section className="container mx-auto px-4 py-16">
        <div className="mb-8 flex items-end justify-between">
          <div>
            <h2 className="text-3xl font-bold text-foreground">Available Road Trips</h2>
            <p className="mt-1 text-muted-foreground">Adventures on wheels through breathtaking landscapes</p>
          </div>
          <Link to="/destinations">
            <Button variant="ghost" size="sm" className="hidden sm:flex">
              All Tours <ArrowRight className="ml-1 h-4 w-4" />
            </Button>
          </Link>
        </div>

        {isError ? (
          <div className="py-20 text-center">
            <p className="text-lg font-medium text-foreground mb-1">Something went wrong</p>
            <p className="text-muted-foreground mb-4">We couldn't load road trips right now.</p>
            <Button variant="outline" onClick={() => window.location.reload()}>Retry</Button>
          </div>
        ) : isLoading ? (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => <TourCardSkeleton key={i} />)}
          </div>
        ) : tours && tours.length > 0 ? (
          <>
            <p className="text-sm text-muted-foreground mb-4">{tours.length} road trip{tours.length > 1 ? "s" : ""} available</p>
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {tours.map((tour) => <TourCard key={tour.id} tour={tour} />)}
            </div>
          </>
        ) : (
          <div className="py-20 text-center">
            <Car className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
            <p className="text-lg font-medium text-foreground mb-1">No road trips yet</p>
            <p className="text-muted-foreground mb-4">Check back soon for exciting road trip adventures!</p>
            <Link to="/destinations">
              <Button variant="outline">Browse All Tours</Button>
            </Link>
          </div>
        )}
      </section>
    </Layout>
  );
};

export default RoadTripsPage;
