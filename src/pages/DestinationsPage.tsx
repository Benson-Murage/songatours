import { useSearchParams } from "react-router-dom";
import { X, SlidersHorizontal } from "lucide-react";
import Layout from "@/components/Layout";
import TourCard from "@/components/TourCard";
import TourCardSkeleton from "@/components/TourCardSkeleton";
import { Button } from "@/components/ui/button";
import { useTours, useDestinations } from "@/hooks/useTours";

const DestinationsPage = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const activeSlug = searchParams.get("destination") || "";
  const guestsFilter = searchParams.get("guests") || "";
  const { data: tours, isLoading, isError } = useTours(activeSlug || undefined);
  const { data: destinations } = useDestinations();

  const filteredTours = guestsFilter
    ? tours?.filter((t) => t.max_group_size >= Number(guestsFilter))
    : tours;

  const hasActiveFilters = !!activeSlug || !!guestsFilter;

  const clearFilters = () => setSearchParams({});

  const setDestFilter = (slug: string) => {
    const params = new URLSearchParams(searchParams);
    if (slug) params.set("destination", slug);
    else params.delete("destination");
    setSearchParams(params);
  };

  return (
    <Layout>
      <div className="container mx-auto px-4 py-10">
        <div className="flex items-center justify-between mb-2">
          <h1 className="text-3xl font-bold">Explore Destinations</h1>
          {hasActiveFilters && (
            <Button variant="ghost" size="sm" onClick={clearFilters} className="text-muted-foreground">
              <X className="h-4 w-4 mr-1" /> Clear filters
            </Button>
          )}
        </div>
        <p className="text-muted-foreground mb-6">Find your perfect African adventure</p>

        {/* Active filter badges */}
        {hasActiveFilters && (
          <div className="flex flex-wrap gap-2 mb-6">
            {activeSlug && (
              <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
                <SlidersHorizontal className="h-3 w-3" />
                {destinations?.find((d) => d.slug === activeSlug)?.name || activeSlug}
                <button onClick={() => setDestFilter("")} className="ml-1 hover:text-primary/70"><X className="h-3 w-3" /></button>
              </span>
            )}
            {guestsFilter && (
              <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
                {guestsFilter}+ guests
                <button onClick={() => { const p = new URLSearchParams(searchParams); p.delete("guests"); setSearchParams(p); }} className="ml-1 hover:text-primary/70"><X className="h-3 w-3" /></button>
              </span>
            )}
          </div>
        )}

        {/* Filter chips */}
        <div className="mb-8 flex flex-wrap gap-2">
          <button
            onClick={() => setDestFilter("")}
            className={`rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
              !activeSlug ? "bg-primary text-primary-foreground" : "bg-secondary text-secondary-foreground hover:bg-secondary/80"
            }`}
          >
            All
          </button>
          {destinations?.map((d) => (
            <button
              key={d.id}
              onClick={() => setDestFilter(d.slug)}
              className={`rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
                activeSlug === d.slug ? "bg-primary text-primary-foreground" : "bg-secondary text-secondary-foreground hover:bg-secondary/80"
              }`}
            >
              {d.name}
            </button>
          ))}
        </div>

        {isError ? (
          <div className="py-20 text-center">
            <p className="text-lg font-medium text-foreground mb-1">Something went wrong</p>
            <p className="text-muted-foreground mb-4">We couldn't load tours right now. Please try again.</p>
            <Button variant="outline" onClick={() => window.location.reload()}>Retry</Button>
          </div>
        ) : isLoading ? (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <TourCardSkeleton key={i} />
            ))}
          </div>
        ) : filteredTours && filteredTours.length > 0 ? (
          <>
            <p className="text-sm text-muted-foreground mb-4">{filteredTours.length} tour{filteredTours.length > 1 ? "s" : ""} found</p>
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {filteredTours.map((tour) => (
                <TourCard key={tour.id} tour={tour} />
              ))}
            </div>
          </>
        ) : (
          <div className="py-20 text-center">
            <SlidersHorizontal className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
            <p className="text-lg font-medium text-foreground mb-1">No tours found</p>
            <p className="text-muted-foreground mb-4">Try adjusting your filters or explore all destinations.</p>
            <Button variant="outline" onClick={clearFilters}>Show all tours</Button>
          </div>
        )}
      </div>
    </Layout>
  );
};

export default DestinationsPage;
