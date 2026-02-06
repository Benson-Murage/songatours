import { Link } from "react-router-dom";
import { MapPin } from "lucide-react";
import type { Tour } from "@/hooks/useTours";

interface TourCardProps {
  tour: Tour;
}

const TourCard = ({ tour }: TourCardProps) => {
  const destination = tour.destinations;

  return (
    <Link to={`/tours/${tour.id}`} className="group block">
      <article className="card-hover overflow-hidden rounded-2xl bg-card border border-border">
        <div className="aspect-square overflow-hidden">
          <img
            src={tour.image_url || "https://images.unsplash.com/photo-1516426122078-c23e76319801?w=600&h=600&fit=crop"}
            alt={tour.title}
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110"
            loading="lazy"
          />
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
          <div className="mt-3 flex items-end justify-between">
            <div>
              <span className="text-lg font-bold text-foreground">
                ${Number(tour.price_per_person).toLocaleString()}
              </span>
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
