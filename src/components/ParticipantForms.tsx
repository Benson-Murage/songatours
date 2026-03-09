import { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Users } from "lucide-react";

export interface Participant {
  full_name: string;
  phone_number: string;
  email: string;
  nationality: string;
  emergency_contact: string;
  dietary_requirements: string;
}

const emptyParticipant = (): Participant => ({
  full_name: "",
  phone_number: "",
  email: "",
  nationality: "",
  emergency_contact: "",
  dietary_requirements: "",
});

interface Props {
  guestCount: number;
  onChange: (participants: Participant[]) => void;
  errors?: Record<string, string>;
}

const ParticipantForms = ({ guestCount, onChange, errors }: Props) => {
  const [participants, setParticipants] = useState<Participant[]>([]);

  useEffect(() => {
    setParticipants((prev) => {
      const next = Array.from({ length: guestCount }, (_, i) => prev[i] || emptyParticipant());
      return next;
    });
  }, [guestCount]);

  useEffect(() => {
    onChange(participants);
  }, [participants, onChange]);

  const update = (index: number, field: keyof Participant, value: string) => {
    setParticipants((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], [field]: value };
      return next;
    });
  };

  if (guestCount < 1) return null;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Users className="h-4 w-4 text-primary" />
        <Label className="text-sm font-semibold">Participant Details</Label>
      </div>
      <p className="text-xs text-muted-foreground">
        Please provide details for {guestCount === 1 ? "the traveler" : `all ${guestCount} travelers`}.
      </p>

      {participants.map((p, i) => {
        const prefix = `p${i}`;
        return (
          <div key={i} className="rounded-xl border border-border bg-muted/30 p-3 space-y-2">
            <p className="text-xs font-semibold text-foreground">
              {guestCount === 1 ? "Traveler" : `Traveler ${i + 1}`}
            </p>
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <Label className="text-xs">Full Name *</Label>
                <Input
                  value={p.full_name}
                  onChange={(e) => update(i, "full_name", e.target.value)}
                  placeholder="John Doe"
                  className={`h-8 text-xs ${errors?.[`${prefix}_name`] ? "border-destructive" : ""}`}
                />
                {errors?.[`${prefix}_name`] && <p className="text-[10px] text-destructive">{errors[`${prefix}_name`]}</p>}
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Phone *</Label>
                <Input
                  value={p.phone_number}
                  onChange={(e) => update(i, "phone_number", e.target.value)}
                  placeholder="+254 700 000 000"
                  className={`h-8 text-xs ${errors?.[`${prefix}_phone`] ? "border-destructive" : ""}`}
                />
                {errors?.[`${prefix}_phone`] && <p className="text-[10px] text-destructive">{errors[`${prefix}_phone`]}</p>}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <Label className="text-xs">Nationality</Label>
                <Input
                  value={p.nationality}
                  onChange={(e) => update(i, "nationality", e.target.value)}
                  placeholder="Kenyan"
                  className="h-8 text-xs"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Email</Label>
                <Input
                  type="email"
                  value={p.email}
                  onChange={(e) => update(i, "email", e.target.value)}
                  placeholder="john@example.com"
                  className="h-8 text-xs"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <Label className="text-xs">Emergency Contact</Label>
                <Input
                  value={p.emergency_contact}
                  onChange={(e) => update(i, "emergency_contact", e.target.value)}
                  placeholder="Jane Doe +254..."
                  className="h-8 text-xs"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Dietary Needs</Label>
                <Input
                  value={p.dietary_requirements}
                  onChange={(e) => update(i, "dietary_requirements", e.target.value)}
                  placeholder="Vegetarian, etc."
                  className="h-8 text-xs"
                />
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default ParticipantForms;
