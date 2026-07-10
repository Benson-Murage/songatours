import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Loader2, Search, ShieldCheck, ShieldAlert, User, Calendar, Users } from "lucide-react";
import { useVerifyBooking, type VerifyResult } from "@/hooks/useVerification";
import { formatKES } from "@/lib/formatKES";
import { format } from "date-fns";
import CheckInPanel from "./CheckInPanel";

const VerifyBookingPanel = () => {
  const [code, setCode] = useState("");
  const [ref, setRef] = useState("");
  const [receipt, setReceipt] = useState("");
  const [result, setResult] = useState<VerifyResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const verify = useVerifyBooking();

  const run = async (input: any) => {
    setError(null);
    setResult(null);
    try {
      const r = await verify.mutateAsync(input);
      setResult(r);
    } catch (e: any) {
      setError(e.message || "Verification failed");
    }
  };

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-primary" />
            Verify a Booking
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label>Verification Code</Label>
            <div className="flex gap-2 mt-1">
              <Input
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
                placeholder="SGT-2026-XXXXXXX"
                className="font-mono"
              />
              <Button onClick={() => run({ code })} disabled={!code || verify.isPending}>
                {verify.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
              </Button>
            </div>
          </div>
          <div>
            <Label>Booking Reference</Label>
            <div className="flex gap-2 mt-1">
              <Input value={ref} onChange={(e) => setRef(e.target.value.toUpperCase())} placeholder="SGT-2026-00001" />
              <Button variant="outline" onClick={() => run({ booking_reference: ref })} disabled={!ref}>
                <Search className="h-4 w-4" />
              </Button>
            </div>
          </div>
          <div>
            <Label>Receipt Number</Label>
            <div className="flex gap-2 mt-1">
              <Input value={receipt} onChange={(e) => setReceipt(e.target.value.toUpperCase())} placeholder="RCPT-2026-00001" />
              <Button variant="outline" onClick={() => run({ receipt_number: receipt })} disabled={!receipt}>
                <Search className="h-4 w-4" />
              </Button>
            </div>
          </div>
          {error && (
            <div className="flex items-start gap-2 text-sm text-destructive bg-destructive/5 p-3 rounded">
              <ShieldAlert className="h-4 w-4 mt-0.5" />
              {error}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Result</CardTitle>
        </CardHeader>
        <CardContent>
          {!result ? (
            <p className="text-sm text-muted-foreground">Enter a code above to verify a booking.</p>
          ) : (
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Badge className="bg-emerald-100 text-emerald-800 border-emerald-200">Verified</Badge>
                <Badge variant="outline">{result.booking_status}</Badge>
                <Badge variant="outline">{result.payment_status}</Badge>
                {result.checked_in && <Badge className="bg-blue-100 text-blue-800">Checked-in</Badge>}
              </div>
              <div className="grid gap-2 text-sm">
                <div className="flex items-center gap-2"><User className="h-4 w-4 text-muted-foreground" /> {result.customer_full_name || result.customer_display_name}</div>
                {result.customer_email && <div>{result.customer_email}</div>}
                {result.phone_number && <div>{result.phone_number}</div>}
                <div className="flex items-center gap-2"><Calendar className="h-4 w-4 text-muted-foreground" /> {result.start_date && format(new Date(result.start_date), "PPP")}</div>
                <div className="flex items-center gap-2"><Users className="h-4 w-4 text-muted-foreground" /> {result.guests_count} guest(s)</div>
                <div><strong>{result.tour_title}</strong>{result.destination ? ` — ${result.destination}` : ""}</div>
                {result.total_price != null && (
                  <div>
                    Total {formatKES(Number(result.total_price))} · Paid {formatKES(Number(result.amount_paid || 0))} · Balance{" "}
                    <span className={Number(result.balance_due) > 0 ? "text-amber-600 font-semibold" : "text-emerald-600 font-semibold"}>
                      {formatKES(Number(result.balance_due || 0))}
                    </span>
                  </div>
                )}
                <div className="text-xs text-muted-foreground">
                  Ref {result.booking_reference} · Code {result.verification_code}
                  {result.receipt_number && ` · Receipt ${result.receipt_number}`}
                </div>
              </div>
              {result.booking_id && (
                <div className="pt-3 border-t">
                  <CheckInPanel bookingId={result.booking_id} checkedInAt={result.checked_in_at} />
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default VerifyBookingPanel;
