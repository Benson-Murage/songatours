import { useEffect, useState } from "react";
import { CalendarDays, AlertTriangle } from "lucide-react";

interface TourCountdownProps {
  /** ISO date string (YYYY-MM-DD) of the tour departure */
  departureDate: string;
  className?: string;
}

interface TimeLeft {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  totalMs: number;
}

const computeTimeLeft = (target: Date): TimeLeft => {
  const totalMs = Math.max(0, target.getTime() - Date.now());
  const days = Math.floor(totalMs / (1000 * 60 * 60 * 24));
  const hours = Math.floor((totalMs / (1000 * 60 * 60)) % 24);
  const minutes = Math.floor((totalMs / (1000 * 60)) % 60);
  const seconds = Math.floor((totalMs / 1000) % 60);
  return { days, hours, minutes, seconds, totalMs };
};

const Cell = ({ value, label }: { value: number; label: string }) => (
  <div className="flex flex-col items-center rounded-xl bg-card border border-border px-3 py-2 min-w-[64px]">
    <span className="text-xl sm:text-2xl font-bold tabular-nums text-foreground leading-none">
      {String(value).padStart(2, "0")}
    </span>
    <span className="mt-1 text-[10px] uppercase tracking-wide text-muted-foreground">{label}</span>
  </div>
);

const TourCountdown = ({ departureDate, className }: TourCountdownProps) => {
  // Treat the departure date as start-of-day local
  const target = new Date(`${departureDate}T00:00:00`);
  const [time, setTime] = useState<TimeLeft>(() => computeTimeLeft(target));

  useEffect(() => {
    if (time.totalMs <= 0) return;
    const tick = () => setTime(computeTimeLeft(target));
    // Update every second when <24h, else every minute (saves work on PWA)
    const interval = time.totalMs < 24 * 60 * 60 * 1000 ? 1000 : 60 * 1000;
    const id = window.setInterval(tick, interval);
    return () => window.clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [departureDate, time.totalMs < 24 * 60 * 60 * 1000]);

  // Hide once tour has started
  if (time.totalMs <= 0) return null;

  const lessThan24h = time.totalMs < 24 * 60 * 60 * 1000;

  return (
    <div className={className}>
      <div className="flex items-center gap-2 mb-2 text-sm font-medium text-foreground">
        <CalendarDays className="h-4 w-4 text-primary" />
        <span>Time until departure</span>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <Cell value={time.days} label="Days" />
        <Cell value={time.hours} label="Hrs" />
        <Cell value={time.minutes} label="Min" />
        {lessThan24h && <Cell value={time.seconds} label="Sec" />}
      </div>
      {lessThan24h && (
        <p className="mt-2 flex items-center gap-1.5 text-xs font-semibold text-destructive">
          <AlertTriangle className="h-3.5 w-3.5" />
          Less than 24 hours left!
        </p>
      )}
    </div>
  );
};

export default TourCountdown;
