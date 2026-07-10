import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { formatKES } from "@/lib/formatKES";
import { Loader2, TrendingUp, Wallet, AlertCircle, CheckCircle2, ArrowUp } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";
import { Button } from "@/components/ui/button";
import { format, startOfDay, startOfWeek, startOfMonth } from "date-fns";

const KPI = ({ label, value, icon: Icon, tone }: any) => (
  <Card>
    <CardContent className="p-4">
      <div className="flex items-center justify-between">
        <div>
          <div className="text-xs text-muted-foreground uppercase tracking-wider">{label}</div>
          <div className="text-2xl font-bold mt-1">{value}</div>
        </div>
        <div className={`p-2 rounded-lg ${tone || "bg-primary/10 text-primary"}`}>
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </CardContent>
  </Card>
);

const FinancialDashboard = () => {
  const { data, isLoading } = useQuery({
    queryKey: ["financial-dashboard"],
    queryFn: async () => {
      const { data: bookings } = await supabase
        .from("bookings")
        .select("id, total_price, amount_paid, balance_due, overpayment_amount, payment_status, status, created_at");
      const { count: pendingProofs } = await supabase
        .from("payment_proofs" as any)
        .select("*", { count: "exact", head: true })
        .eq("status", "pending_review");
      return { bookings: bookings || [], pendingProofs: pendingProofs || 0 };
    },
    staleTime: 60_000,
  });

  if (isLoading || !data) {
    return <div className="p-8 text-center"><Loader2 className="h-6 w-6 animate-spin inline" /></div>;
  }

  const active = data.bookings.filter((b: any) => b.status !== "cancelled");
  const expected = active.reduce((s: number, b: any) => s + Number(b.total_price || 0), 0);
  const collected = active.reduce((s: number, b: any) => s + Number(b.amount_paid || 0), 0);
  const outstanding = active.reduce((s: number, b: any) => s + Number(b.balance_due || 0), 0);
  const overpaid = active.reduce((s: number, b: any) => s + Number(b.overpayment_amount || 0), 0);
  const awaitingPayment = active.filter((b: any) => Number(b.amount_paid || 0) === 0).length;

  const today = startOfDay(new Date()).getTime();
  const week = startOfWeek(new Date()).getTime();
  const month = startOfMonth(new Date()).getTime();
  const todaySum = active.filter((b: any) => new Date(b.created_at).getTime() >= today).reduce((s: number, b: any) => s + Number(b.amount_paid || 0), 0);
  const weekSum = active.filter((b: any) => new Date(b.created_at).getTime() >= week).reduce((s: number, b: any) => s + Number(b.amount_paid || 0), 0);
  const monthSum = active.filter((b: any) => new Date(b.created_at).getTime() >= month).reduce((s: number, b: any) => s + Number(b.amount_paid || 0), 0);

  // Chart: last 14 days revenue
  const days: Record<string, number> = {};
  for (let i = 13; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    days[format(d, "MMM d")] = 0;
  }
  active.forEach((b: any) => {
    const key = format(new Date(b.created_at), "MMM d");
    if (key in days) days[key] += Number(b.amount_paid || 0);
  });
  const chartData = Object.entries(days).map(([date, revenue]) => ({ date, revenue }));

  const exportCsv = () => {
    const header = "booking_id,total_price,amount_paid,balance_due,payment_status,status,created_at\n";
    const rows = data.bookings
      .map((b: any) => `${b.id},${b.total_price},${b.amount_paid},${b.balance_due},${b.payment_status},${b.status},${b.created_at}`)
      .join("\n");
    const blob = new Blob([header + rows], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `financial-${format(new Date(), "yyyy-MM-dd")}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-4">
      <div className="grid gap-3 grid-cols-2 md:grid-cols-4">
        <KPI label="Expected Revenue" value={formatKES(expected)} icon={TrendingUp} />
        <KPI label="Collected" value={formatKES(collected)} icon={CheckCircle2} tone="bg-emerald-100 text-emerald-700" />
        <KPI label="Outstanding" value={formatKES(outstanding)} icon={AlertCircle} tone="bg-amber-100 text-amber-700" />
        <KPI label="Overpayments" value={formatKES(overpaid)} icon={ArrowUp} tone="bg-blue-100 text-blue-700" />
        <KPI label="Today" value={formatKES(todaySum)} icon={Wallet} />
        <KPI label="This Week" value={formatKES(weekSum)} icon={Wallet} />
        <KPI label="This Month" value={formatKES(monthSum)} icon={Wallet} />
        <KPI label="Proofs Awaiting Review" value={data.pendingProofs} icon={AlertCircle} tone="bg-orange-100 text-orange-700" />
      </div>

      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold">Revenue — last 14 days</h3>
            <Button size="sm" variant="outline" onClick={exportCsv}>Export CSV</Button>
          </div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" fontSize={11} />
                <YAxis fontSize={11} />
                <Tooltip formatter={(v: any) => formatKES(Number(v))} />
                <Bar dataKey="revenue" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      <div className="text-sm text-muted-foreground">
        Awaiting payment: <strong>{awaitingPayment}</strong> booking(s).
      </div>
    </div>
  );
};

export default FinancialDashboard;
