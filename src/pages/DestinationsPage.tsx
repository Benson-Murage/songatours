import { useSearchParams } from "react-router-dom";
import { X, SlidersHorizontal, Search } from "lucide-react";
import useSEO from "@/hooks/useSEO";
import Layout from "@/components/Layout";
import TourCard from "@/components/TourCard";
import TourCardSkeleton from "@/components/TourCardSkeleton";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useTours, useDestinations } from "@/hooks/useTours";
import { useState, useMemo } from "react";

const CATEGORIES = [
  { value: "all", label: "All Categories" },
  { value: "safari", label: "Safari" },
  { value: "roadtrip", label: "Road Trip" },
  { value: "hike", label: "Hiking" },
  { value: "international", label: "International" },
  { value: "beach", label: "Beach" },
  { value: "cultural", label: "Cultural" },
];

const DIFFICULTIES = [
  { value: "all", label: "Any Difficulty" },
  { value: "Easy", label: "Easy" },
  { value: "Medium", label: "Medium" },
  { value: "Hard", label: "Hard" },
];

const DURATIONS = [
  { value: "all", label: "Any Duration" },
  { value: "1-3", label: "1-3 days" },
  { value: "4-7", label: "4-7 days" },
  { value: "8+", label: "8+ days" },
];

const PRICE_RANGES = [
  { value: "all", label: "Any Price" },
  { value: "0-10000", label: "Under KSh 10,000" },
  { value: "10000-30000", label: "KSh 10,000 – 30,000" },
  { value: "30000-60000", label: "KSh 30,000 – 60,000" },
  { value: "60000+", label: "KSh 60,000+" },
];

const DestinationsPage = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const activeSlug = searchParams.get("destination") || "";
  const guestsFilter = searchParams.get("guests") || "";
  const categoryFilter = searchParams.get("category") || "";
  const difficultyFilter = searchParams.get("difficulty") || "";
  const durationFilter = searchParams.get("duration") || "";
  const priceFilter = searchParams.get("price") || "";

  const effectiveCategory = categoryFilter && categoryFilter !== "all" ? categoryFilter : undefined;
  const { data: tours, isLoading, isError } = useTours(activeSlug || undefined, effectiveCategory);
  const { data: destinations } = useDestinations();
  const [searchQuery, setSearchQuery] = useState("");

  const filteredTours = useMemo(() => {
    let result = tours || [];
    if (guestsFilter) result = result.filter((t) => t.max_group_size >= Number(guestsFilter));
    if (difficultyFilter && difficultyFilter !== "all") result = result.filter((t) => t.difficulty === difficultyFilter);
    if (durationFilter && durationFilter !== "all") {
      if (durationFilter === "1-3") result = result.filter((t) => t.duration_days >= 1 && t.duration_days <= 3);
      else if (durationFilter === "4-7") result = result.filter((t) => t.duration_days >= 4 && t.duration_days <= 7);
      else if (durationFilter === "8+") result = result.filter((t) => t.duration_days >= 8);
    }
    if (priceFilter && priceFilter !== "all") {
      const effectivePrice = (t: any) => t.discount_price ?? t.price_per_person;
      if (priceFilter === "0-10000") result = result.filter((t) => effectivePrice(t) < 10000);
      else if (priceFilter === "10000-30000") result = result.filter((t) => effectivePrice(t) >= 10000 && effectivePrice(t) <= 30000);
      else if (priceFilter === "30000-60000") result = result.filter((t) => effectivePrice(t) >= 30000 && effectivePrice(t) <= 60000);
      else if (priceFilter === "60000+") result = result.filter((t) => effectivePrice(t) >= 60000);
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter((t) =>
        t.title.toLowerCase().includes(q) ||
        (t.description || "").toLowerCase().includes(q) ||
        (t.destinations?.name || "").toLowerCase().includes(q)
      );
    }
    return result;
  }, [tours, guestsFilter, searchQuery, difficultyFilter, durationFilter, priceFilter]);

  const hasActiveFilters = !!activeSlug || !!guestsFilter || (!!categoryFilter && categoryFilter !== "all") || (!!difficultyFilter && difficultyFilter !== "all") || (!!durationFilter && durationFilter !== "all") || (!!priceFilter && priceFilter !== "all");

  const clearFilters = () => { setSearchParams({}); setSearchQuery(""); };

  const setFilter = (key: string, value: string) => {
    const params = new URLSearchParams(searchParams);
    if (value && value !== "all") params.set(key, value);
    else params.delete(key);
    setSearchParams(params);
  };

  return (
    <Layout>
      <div className="container mx-auto px-4 py-10">
        <div className="flex items-center justify-between mb-2">
          <h1 className="text-3xl font-bold">Explore Tours</h1>
          {hasActiveFilters && (
            <Button variant="ghost" size="sm" onClick={clearFilters} className="text-muted-foreground">
              <X className="h-4 w-4 mr-1" /> Clear filters
            </Button>
          )}
        </div>
        <p className="text-muted-foreground mb-6">Find your perfect African adventure</p>

        {/* Search + Filters */}
        <div className="flex flex-col gap-3 mb-6">
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              className="pl-9"
              placeholder="Search tours..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <div className="flex flex-wrap gap-2">
            <Select value={categoryFilter} onValueChange={(v) => setFilter("category", v)}>
              <SelectTrigger className="w-40"><SelectValue placeholder="Category" /></SelectTrigger>
              <SelectContent>
                {CATEGORIES.map((c) => <SelectItem key={c.value || "all"} value={c.value}>{c.label}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={difficultyFilter} onValueChange={(v) => setFilter("difficulty", v)}>
              <SelectTrigger className="w-40"><SelectValue placeholder="Difficulty" /></SelectTrigger>
              <SelectContent>
                {DIFFICULTIES.map((d) => <SelectItem key={d.value || "all"} value={d.value}>{d.label}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={durationFilter} onValueChange={(v) => setFilter("duration", v)}>
              <SelectTrigger className="w-40"><SelectValue placeholder="Duration" /></SelectTrigger>
              <SelectContent>
                {DURATIONS.map((d) => <SelectItem key={d.value || "all"} value={d.value}>{d.label}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={priceFilter} onValueChange={(v) => setFilter("price", v)}>
              <SelectTrigger className="w-48"><SelectValue placeholder="Price Range" /></SelectTrigger>
              <SelectContent>
                {PRICE_RANGES.map((p) => <SelectItem key={p.value || "all"} value={p.value}>{p.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Active filter badges */}
        {hasActiveFilters && (
          <div className="flex flex-wrap gap-2 mb-6">
            {activeSlug && (
              <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
                <SlidersHorizontal className="h-3 w-3" />
                {destinations?.find((d) => d.slug === activeSlug)?.name || activeSlug}
                <button onClick={() => setFilter("destination", "")} className="ml-1 hover:text-primary/70"><X className="h-3 w-3" /></button>
              </span>
            )}
            {categoryFilter && categoryFilter !== "all" && (
              <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary capitalize">
                {categoryFilter === "roadtrip" ? "Road Trip" : categoryFilter}
                <button onClick={() => setFilter("category", "all")} className="ml-1 hover:text-primary/70"><X className="h-3 w-3" /></button>
              </span>
            )}
            {difficultyFilter && difficultyFilter !== "all" && (
              <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
                {difficultyFilter}
                <button onClick={() => setFilter("difficulty", "all")} className="ml-1 hover:text-primary/70"><X className="h-3 w-3" /></button>
              </span>
            )}
            {durationFilter && durationFilter !== "all" && (
              <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
                {durationFilter} days
                <button onClick={() => setFilter("duration", "all")} className="ml-1 hover:text-primary/70"><X className="h-3 w-3" /></button>
              </span>
            )}
            {priceFilter && priceFilter !== "all" && (
              <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
                {PRICE_RANGES.find((p) => p.value === priceFilter)?.label}
                <button onClick={() => setFilter("price", "all")} className="ml-1 hover:text-primary/70"><X className="h-3 w-3" /></button>
              </span>
            )}
          </div>
        )}

        {/* Destination chips */}
        <div className="mb-8 flex flex-wrap gap-2">
          <button
            onClick={() => setFilter("destination", "")}
            className={`rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
              !activeSlug ? "bg-primary text-primary-foreground" : "bg-secondary text-secondary-foreground hover:bg-secondary/80"
            }`}
          >
            All
          </button>
          {destinations?.map((d) => (
            <button
              key={d.id}
              onClick={() => setFilter("destination", d.slug)}
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
            {Array.from({ length: 8 }).map((_, i) => <TourCardSkeleton key={i} />)}
          </div>
        ) : filteredTours.length > 0 ? (
          <>
            <p className="text-sm text-muted-foreground mb-4">{filteredTours.length} tour{filteredTours.length > 1 ? "s" : ""} found</p>
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {filteredTours.map((tour) => <TourCard key={tour.id} tour={tour} />)}
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
