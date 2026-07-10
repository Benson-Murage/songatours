import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { format } from "date-fns";
import { CheckCircle2, LogIn, RotateCcw, Loader2 } from "lucide-react";
import { useBookingParticipants, useCheckIn } from "@/hooks/useCheckIn";

interface Props {
  bookingId: string;
  checkedInAt?: string | null;
}

const CheckInPanel = ({ bookingId, checkedInAt }: Props) => {
  const { data: participants } = useBookingParticipants(bookingId);
  const checkIn = useCheckIn();
  const [selected, setSelected] = useState<string[]>([]);
  const [undoReason, setUndoReason] = useState("");
  const [showUndo, setShowUndo] = useState(false);

  const toggle = (id: string) => setSelected((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));

  const totalCheckedIn = (participants || []).filter((p) => p.checked_in_at).length;
  const totalParticipants = participants?.length || 0;

  const runCheckIn = async (payload: any) => {
    try {
      await checkIn.mutateAsync({
        booking_id: bookingId,
        device: navigator.userAgent.slice(0, 100),
        ...payload,
      });
      toast.success("Checked in successfully");
      setSelected([]);
      setShowUndo(false);
      setUndoReason("");
    } catch (e: any) {
      toast.error(e.message || "Check-in failed");
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="text-sm font-medium">
          Check-in <span className="text-muted-foreground">({totalCheckedIn}/{totalParticipants || "—"} participants)</span>
        </div>
        {checkedInAt && (
          <div className="text-xs text-emerald-600 flex items-center gap-1">
            <CheckCircle2 className="h-3.5 w-3.5" /> Checked in {format(new Date(checkedInAt), "d MMM HH:mm")}
          </div>
        )}
      </div>

      {participants && participants.length > 0 && (
        <div className="space-y-1 max-h-48 overflow-y-auto rounded border p-2">
          {participants.map((p) => (
            <label key={p.id} className="flex items-center gap-2 text-sm py-1">
              <Checkbox checked={selected.includes(p.id)} onCheckedChange={() => toggle(p.id)} disabled={!!p.checked_in_at} />
              <span className="flex-1">{p.full_name}</span>
              {p.checked_in_at ? (
                <span className="text-xs text-emerald-600">✓ checked in</span>
              ) : (
                <span className="text-xs text-muted-foreground">pending</span>
              )}
            </label>
          ))}
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        <Button size="sm" onClick={() => runCheckIn({})} disabled={checkIn.isPending || !!checkedInAt}>
          {checkIn.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <LogIn className="h-4 w-4 mr-1" />}
          Check in entire booking
        </Button>
        <Button
          size="sm"
          variant="outline"
          onClick={() => runCheckIn({ participant_ids: selected })}
          disabled={!selected.length || checkIn.isPending}
        >
          Check in selected ({selected.length})
        </Button>
        <Button size="sm" variant="ghost" onClick={() => setShowUndo((s) => !s)}>
          <RotateCcw className="h-4 w-4 mr-1" /> Undo
        </Button>
      </div>

      {showUndo && (
        <div className="space-y-2 p-3 border rounded bg-muted/30">
          <Label className="text-xs">Reason for undoing check-in (required)</Label>
          <Textarea value={undoReason} onChange={(e) => setUndoReason(e.target.value)} rows={2} />
          <Button
            size="sm"
            variant="destructive"
            disabled={!undoReason.trim() || checkIn.isPending}
            onClick={() => runCheckIn({ undo: true, reason: undoReason, participant_ids: selected.length ? selected : undefined })}
          >
            Confirm undo
          </Button>
        </div>
      )}
    </div>
  );
};

export default CheckInPanel;
