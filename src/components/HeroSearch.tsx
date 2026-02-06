import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Search, MapPin, Users, CalendarDays } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useDestinations } from "@/hooks/useTours";

const HeroSearch = () => {
  const navigate = useNavigate();
  const { data: destinations } = useDestinations();
  const [destination, setDestination] = useState("");
  const [guests, setGuests] = useState("2");

  const handleSearch = () => {
    const params = new URLSearchParams();
    if (destination) params.set("destination", destination);
    if (guests) params.set("guests", guests);
    navigate(`/destinations?${params.toString()}`);
  };

  return (
    <div className="glass rounded-2xl p-2 shadow-xl max-w-3xl mx-auto">
      <div className="flex flex-col gap-2 md:flex-row md:items-center">
        <div className="flex flex-1 items-center gap-2 rounded-xl px-4 py-3">
          <MapPin className="h-5 w-5 shrink-0 text-muted-foreground" />
          <select
            value={destination}
            onChange={(e) => setDestination(e.target.value)}
            className="w-full bg-transparent text-sm font-medium outline-none text-foreground"
          >
            <option value="">Where to?</option>
            {destinations?.map((d) => (
              <option key={d.id} value={d.slug}>
                {d.name}, {d.country}
              </option>
            ))}
          </select>
        </div>

        <div className="hidden md:block h-8 w-px bg-border" />

        <div className="flex flex-1 items-center gap-2 rounded-xl px-4 py-3">
          <CalendarDays className="h-5 w-5 shrink-0 text-muted-foreground" />
          <input
            type="date"
            className="w-full bg-transparent text-sm font-medium outline-none text-foreground"
            placeholder="When?"
          />
        </div>

        <div className="hidden md:block h-8 w-px bg-border" />

        <div className="flex items-center gap-2 rounded-xl px-4 py-3">
          <Users className="h-5 w-5 shrink-0 text-muted-foreground" />
          <input
            type="number"
            min="1"
            max="20"
            value={guests}
            onChange={(e) => setGuests(e.target.value)}
            className="w-16 bg-transparent text-sm font-medium outline-none text-foreground"
            placeholder="Guests"
          />
        </div>

        <Button
          variant="accent"
          size="lg"
          onClick={handleSearch}
          className="shrink-0"
        >
          <Search className="h-4 w-4" />
          <span className="md:hidden">Search</span>
        </Button>
      </div>
    </div>
  );
};

export default HeroSearch;
