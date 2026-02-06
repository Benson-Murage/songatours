import { useSearchParams } from "react-router-dom";
import Layout from "@/components/Layout";
import TourCard from "@/components/TourCard";
import TourCardSkeleton from "@/components/TourCardSkeleton";
import { useTours, useDestinations } from "@/hooks/useTours";

const DestinationsPage = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const activeSlug = searchParams.get("destination") || "";
  const { data: tours, isLoading } = useTours(activeSlug || undefined);
  const { data: destinations } = useDestinations();

  return (
    <Layout>
      <div className="container mx-auto px-4 py-10">
        <h1 className="text-3xl font-bold mb-2">Explore Destinations</h1>
        <p className="text-muted-foreground mb-8">
          Find your perfect African adventure
        </p>

        {/* Filter chips */}
        <div className="mb-8 flex flex-wrap gap-2">
          <button
            onClick={() => setSearchParams({})}
            className={`rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
              !activeSlug
                ? "bg-primary text-primary-foreground"
                : "bg-secondary text-secondary-foreground hover:bg-secondary/80"
            }`}
          >
            All
          </button>
          {destinations?.map((d) => (
            <button
              key={d.id}
              onClick={() => setSearchParams({ destination: d.slug })}
              className={`rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
                activeSlug === d.slug
                  ? "bg-primary text-primary-foreground"
                  : "bg-secondary text-secondary-foreground hover:bg-secondary/80"
              }`}
            >
              {d.name}
            </button>
          ))}
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
              No tours found for this destination.
            </p>
          </div>
        )}
      </div>
    </Layout>
  );
};

export default DestinationsPage;
