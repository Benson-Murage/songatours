import { Link } from "react-router-dom";
import type { Destination } from "@/hooks/useTours";

const DestinationCard = ({ destination }: { destination: Destination }) => (
  <Link to={`/destinations?destination=${destination.slug}`} className="group block">
    <article className="relative overflow-hidden rounded-2xl h-64 card-hover">
      <img
        src={destination.image_url || "https://images.unsplash.com/photo-1516426122078-c23e76319801?w=600&h=400&fit=crop"}
        alt={destination.name}
        className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110"
        loading="lazy"
      />
      <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
      <div className="absolute bottom-0 left-0 p-5">
        <h3 className="text-lg font-bold text-white">{destination.name}</h3>
        <p className="text-sm text-white/70">{destination.country}</p>
      </div>
    </article>
  </Link>
);

export default DestinationCard;
