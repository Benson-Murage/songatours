import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import Layout from "@/components/Layout";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ShieldCheck, ShieldAlert, Loader2, Calendar, Users } from "lucide-react";
import { useSEO } from "@/hooks/useSEO";
import { useVerifyBooking, type VerifyResult } from "@/hooks/useVerification";
import { format } from "date-fns";

const VerifyPage = () => {
  const { code } = useParams<{ code: string }>();
  const verify = useVerifyBooking();
  const [result, setResult] = useState<VerifyResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  useSEO({
    title: "Verify Booking · Songa Tours",
    description: "Verify the authenticity of a Songa Travel & Tours booking receipt.",
    canonicalPath: `/verify/${code || ""}`,
  });

  useEffect(() => {
    if (!code) return;
    verify.mutateAsync({ code }).then(setResult).catch((e) => setError(e.message));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [code]);

  return (
    <Layout>
      <div className="max-w-xl mx-auto py-16 px-4">
        <Card>
          <CardContent className="p-6">
            {verify.isPending && !result && !error && (
              <div className="text-center py-8">
                <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto" />
                <p className="mt-3 text-sm text-muted-foreground">Verifying receipt…</p>
              </div>
            )}
            {error && (
              <div className="text-center py-8">
                <ShieldAlert className="h-12 w-12 text-destructive mx-auto" />
                <h1 className="text-xl font-bold mt-3">Not verified</h1>
                <p className="text-sm text-muted-foreground mt-2">{error}</p>
                <p className="text-xs text-muted-foreground mt-4 font-mono">Code: {code}</p>
              </div>
            )}
            {result?.verified && (
              <div>
                <div className="flex items-center gap-2 justify-center">
                  <ShieldCheck className="h-8 w-8 text-emerald-600" />
                  <h1 className="text-2xl font-bold text-emerald-600">Verified</h1>
                </div>
                <div className="mt-6 space-y-3">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Customer</span>
                    <span className="font-medium">{result.customer_display_name}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Tour</span>
                    <span className="font-medium text-right">{result.tour_title}</span>
                  </div>
                  {result.destination && (
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Destination</span>
                      <span>{result.destination}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground flex items-center gap-1"><Calendar className="h-3.5 w-3.5" /> Departs</span>
                    <span>{result.start_date && format(new Date(result.start_date), "PPP")}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground flex items-center gap-1"><Users className="h-3.5 w-3.5" /> Guests</span>
                    <span>{result.guests_count}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Payment</span>
                    <Badge variant={result.has_balance ? "outline" : "default"} className={result.has_balance ? "" : "bg-emerald-600"}>
                      {result.has_balance ? `${result.payment_status} · balance due` : "fully paid"}
                    </Badge>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Check-in</span>
                    <Badge variant="outline">
                      {result.checked_in ? `Checked in ${result.checked_in_at ? format(new Date(result.checked_in_at), "d MMM HH:mm") : ""}` : "Not yet checked in"}
                    </Badge>
                  </div>
                  <div className="pt-3 border-t mt-4 text-xs text-muted-foreground font-mono text-center">
                    {result.receipt_number ? `${result.receipt_number} · ` : ""}Ref {result.booking_reference}
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
};

export default VerifyPage;
