import { Link } from "react-router-dom";
import { MapPin, Heart, CalendarDays } from "lucide-react";
import { format } from "date-fns";
import { useAuth } from "@/hooks/useAuth";
import { useFavorites, useToggleFavorite } from "@/hooks/useTours";
import type { Tour } from "@/hooks/useTours";
import { toast } from "sonner";
import { formatKES } from "@/lib/formatKES";

interface TourCardProps {
  tour: Tour;
}

const FALLBACK_IMG = "https://images.unsplash.com/photo-1516426122078-c23e76319801?w=600&h=600&fit=crop";

const TourCard = ({ tour }: TourCardProps) => {
  const destination = tour.destinations;
  const { user } = useAuth();
  const { data: favorites } = useFavorites(user?.id);
  const toggleFavorite = useToggleFavorite();
  const isFavorited = favorites?.includes(tour.id) ?? false;
  const hasDiscount = tour.discount_price != null && tour.discount_price < tour.price_per_person;

  const displayImage = tour.tour_images?.sort((a, b) => a.display_order - b.display_order)?.[0]?.image_url
    || tour.image_url
    || FALLBACK_IMG;

  const handleFavorite = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!user) {
      toast.error("Sign in to save favorites");
      return;
    }
    toggleFavorite.mutate({ tourId: tour.id, userId: user.id, isFavorited });
  };

  return (
    <Link to={`/tours/${tour.id}`} className="group block">
      <article className="card-hover overflow-hidden rounded-2xl bg-card border border-border">
        <div className="relative aspect-square overflow-hidden">
          <img
            src={displayImage}
            alt={tour.title}
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110"
            loading="lazy"
            onError={(e) => { (e.target as HTMLImageElement).src = FALLBACK_IMG; }}
          />
          <button
            onClick={handleFavorite}
            className="absolute right-3 top-3 rounded-full bg-card/80 p-2 backdrop-blur-sm transition-all hover:scale-110"
            aria-label={isFavorited ? "Remove from favorites" : "Add to favorites"}
          >
            <Heart
              className={`h-4 w-4 transition-colors ${
                isFavorited ? "fill-destructive text-destructive" : "text-muted-foreground"
              }`}
            />
          </button>
          {hasDiscount && (
            <span className="absolute left-3 top-3 rounded-full bg-destructive px-2.5 py-0.5 text-xs font-semibold text-destructive-foreground">
              Deal
            </span>
          )}
          {tour.category && tour.category !== "safari" && (
            <span className="absolute left-3 bottom-3 rounded-full bg-card/80 backdrop-blur-sm px-2.5 py-0.5 text-xs font-medium text-foreground capitalize">
              {tour.category === "roadtrip" ? "Road Trip" : tour.category}
            </span>
          )}
        </div>
        <div className="p-4">
          {destination && (
            <div className="mb-1 flex items-center gap-1 text-muted-foreground">
              <MapPin className="h-3.5 w-3.5" />
              <span className="text-xs font-medium">
                {destination.name}, {destination.country}
              </span>
            </div>
          )}
          <h3 className="font-semibold text-card-foreground line-clamp-1">
            {tour.title}
          </h3>
          <p className="mt-1 text-sm text-muted-foreground line-clamp-2">
            {tour.description}
          </p>

          {/* Fixed date badge */}
          {tour.is_fixed_date && tour.departure_date && (
            <div className="mt-2 flex items-center gap-1 text-xs text-primary font-medium">
              <CalendarDays className="h-3 w-3" />
              Departs {format(new Date(tour.departure_date), "MMM d, yyyy")}
            </div>
          )}

          <div className="mt-3 flex items-end justify-between">
            <div>
              {hasDiscount ? (
                <>
                  <span className="text-sm text-muted-foreground line-through mr-1">
                    {formatKES(tour.price_per_person)}
                  </span>
                  <span className="text-lg font-bold text-accent">
                    {formatKES(tour.discount_price!)}
                  </span>
                </>
              ) : (
                <span className="text-lg font-bold text-foreground">
                  {formatKES(tour.price_per_person)}
                </span>
              )}
              <span className="text-xs text-muted-foreground"> / person</span>
            </div>
            <span className="rounded-full bg-secondary px-2.5 py-0.5 text-xs font-medium text-secondary-foreground">
              {tour.duration_days} days
            </span>
          </div>
        </div>
      </article>
    </Link>
  );
};

export default TourCard;
