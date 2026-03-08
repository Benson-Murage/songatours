import { Users } from "lucide-react";

interface SeatIndicatorProps {
  booked: number;
  total: number;
  compact?: boolean;
}

const SeatIndicator = ({ booked, total, compact }: SeatIndicatorProps) => {
  const remaining = Math.max(0, total - booked);
  const pct = total > 0 ? (booked / total) * 100 : 0;

  let color: string;
  let label: string;
  if (remaining <= 0) {
    color = "bg-destructive";
    label = "Sold Out";
  } else if (pct >= 75) {
    color = "bg-destructive";
    label = "Almost Full";
  } else if (pct >= 50) {
    color = "bg-accent";
    label = "Filling Fast";
  } else {
    color = "bg-primary";
    label = "Available";
  }

  if (compact) {
    return (
      <div className="flex items-center gap-1.5 text-xs">
        <div className={`h-2 w-2 rounded-full ${color}`} />
        <span className="text-muted-foreground">{remaining} left</span>
      </div>
    );
  }

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between text-xs">
        <span className="flex items-center gap-1 text-muted-foreground">
          <Users className="h-3.5 w-3.5" />
          {remaining} / {total} seats remaining
        </span>
        <span className={`font-medium ${remaining <= 0 ? "text-destructive" : pct >= 75 ? "text-destructive" : pct >= 50 ? "text-accent" : "text-primary"}`}>
          {label}
        </span>
      </div>
      <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
        <div
          className={`h-full rounded-full transition-all ${color}`}
          style={{ width: `${Math.min(pct, 100)}%` }}
        />
      </div>
    </div>
  );
};

export default SeatIndicator;
