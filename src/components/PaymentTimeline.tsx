import { useBookingTimeline } from "@/hooks/useCheckIn";
import { format } from "date-fns";
import { formatKES } from "@/lib/formatKES";
import { CheckCircle2, Clock, CreditCard, Upload, XCircle, HelpCircle, LogIn } from "lucide-react";

const iconFor = (type: string) => {
  if (type.startsWith("proof_approved") || type === "payment_completed") return CheckCircle2;
  if (type.startsWith("proof_rejected")) return XCircle;
  if (type.startsWith("proof_more_info")) return HelpCircle;
  if (type === "proof_uploaded") return Upload;
  if (type === "payment_updated") return CreditCard;
  if (type === "checked_in") return LogIn;
  return Clock;
};

const labelFor = (type: string) => {
  const map: Record<string, string> = {
    booking_created: "Booking created",
    proof_uploaded: "Payment proof uploaded",
    proof_approved: "Payment proof approved",
    proof_rejected: "Payment proof rejected",
    proof_more_info_requested: "More information requested",
    payment_updated: "Payment updated",
    payment_completed: "Payment completed",
    checked_in: "Guest checked in",
  };
  return map[type] || type.replace(/_/g, " ");
};

const PaymentTimeline = ({ bookingId }: { bookingId: string }) => {
  const { data, isLoading } = useBookingTimeline(bookingId);
  if (isLoading) return <div className="text-sm text-muted-foreground">Loading timeline…</div>;
  if (!data?.length) return <div className="text-sm text-muted-foreground">No events yet.</div>;

  return (
    <ol className="relative border-l border-border ml-3 space-y-4">
      {data.map((ev) => {
        const Icon = iconFor(ev.event_type);
        const p = ev.payload || {};
        return (
          <li key={ev.id} className="ml-4">
            <span className="absolute -left-3 mt-1 flex h-6 w-6 items-center justify-center rounded-full bg-primary/10 ring-4 ring-background">
              <Icon className="h-3.5 w-3.5 text-primary" />
            </span>
            <div className="text-sm font-medium">{labelFor(ev.event_type)}</div>
            <div className="text-xs text-muted-foreground">
              {format(new Date(ev.created_at), "d MMM yyyy · HH:mm")}
              {p.old != null && p.new != null && ` · ${formatKES(Number(p.old))} → ${formatKES(Number(p.new))}`}
              {p.amount_sent != null && ` · ${formatKES(Number(p.amount_sent))}`}
              {p.reason && ` · ${p.reason}`}
            </div>
          </li>
        );
      })}
    </ol>
  );
};

export default PaymentTimeline;
