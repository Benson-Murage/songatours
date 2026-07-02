import { useMemo, useState, useEffect } from "react";
import {
  Search, Filter, Download, CheckCircle2, XCircle, HelpCircle,
  FileText, ExternalLink, Loader2, Trash2, ZoomIn,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { formatKES } from "@/lib/formatKES";
import { PAYMENT_METHODS } from "@/lib/paymentStatus";
import {
  useAdminPaymentProofs, useReviewPaymentProof, useDeletePaymentProof,
  signedProofUrl, PaymentProof,
} from "@/hooks/usePaymentProofs";
import { toast } from "sonner";

type Row = PaymentProof & { bookings: any };

const STATUS_OPTIONS = [
  { value: "all", label: "All Statuses" },
  { value: "pending_review", label: "Pending Review" },
  { value: "approved", label: "Approved" },
  { value: "rejected", label: "Rejected" },
  { value: "more_info_requested", label: "More Info Requested" },
];

export default function PaymentVerificationTab() {
  const { user } = useAuth();
  const { data: rowsRaw, isLoading } = useAdminPaymentProofs();
  const review = useReviewPaymentProof();
  const del = useDeletePaymentProof();

  // Enrich with customer profile info
  const [profiles, setProfiles] = useState<Record<string, { full_name?: string; email?: string; phone?: string }>>({});
  useEffect(() => {
    const ids = Array.from(new Set((rowsRaw || []).map((r: Row) => r.user_id))).filter(Boolean);
    if (ids.length === 0) return;
    supabase.from("profiles").select("id, full_name, email, phone").in("id", ids).then(({ data }) => {
      const m: Record<string, any> = {};
      (data || []).forEach((p: any) => { m[p.id] = p; });
      setProfiles(m);
    });
  }, [rowsRaw]);

  const [q, setQ] = useState("");
  const [status, setStatus] = useState("pending_review");
  const [method, setMethod] = useState("all");
  const [from, setFrom] = useState<string>("");
  const [to, setTo] = useState<string>("");

  const rows: Row[] = useMemo(() => {
    let list = (rowsRaw as Row[] | undefined) || [];
    if (status !== "all") list = list.filter((r) => r.status === status);
    if (method !== "all") list = list.filter((r) => r.payment_method === method);
    if (from) list = list.filter((r) => r.payment_date >= from);
    if (to) list = list.filter((r) => r.payment_date <= to);
    if (q.trim()) {
      const t = q.trim().toLowerCase();
      list = list.filter((r) => {
        const p = profiles[r.user_id] || {};
        return (
          r.bookings?.booking_reference?.toLowerCase().includes(t) ||
          r.bookings?.tours?.title?.toLowerCase().includes(t) ||
          r.bookings?.phone_number?.toLowerCase().includes(t) ||
          p.full_name?.toLowerCase().includes(t) ||
          p.email?.toLowerCase().includes(t) ||
          p.phone?.toLowerCase().includes(t) ||
          r.mpesa_code?.toLowerCase().includes(t) ||
          r.bank_reference?.toLowerCase().includes(t)
        );
      });
    }
    return list;
  }, [rowsRaw, status, method, from, to, q, profiles]);

  const [preview, setPreview] = useState<Row | null>(null);
  const [reviewOf, setReviewOf] = useState<{ row: Row; decision: "approve" | "reject" | "request_info" } | null>(null);
  const [delTarget, setDelTarget] = useState<Row | null>(null);

  const exportCSV = () => {
    const header = ["Date","Booking","Tour","Customer","Email","Phone","Method","Amount Sent","Reference","Status"];
    const lines = [header.join(",")];
    rows.forEach((r) => {
      const p = profiles[r.user_id] || {};
      lines.push([
        r.payment_date,
        r.bookings?.booking_reference || "",
        (r.bookings?.tours?.title || "").replace(/,/g, " "),
        (p.full_name || "").replace(/,/g, " "),
        p.email || "",
        p.phone || r.bookings?.phone_number || "",
        r.payment_method,
        r.amount_sent,
        r.mpesa_code || r.bank_reference || "",
        r.status,
      ].map((v) => `"${String(v ?? "")}"`).join(","));
    });
    const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `payment-proofs-${new Date().toISOString().slice(0,10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
        <div className="lg:col-span-2">
          <Label htmlFor="pv-q">Search</Label>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input id="pv-q" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Booking ref, name, email, phone, M-Pesa code…" className="pl-9" />
          </div>
        </div>
        <div>
          <Label>Status</Label>
          <Select value={status} onValueChange={setStatus}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {STATUS_OPTIONS.map((s) => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label>Method</Label>
          <Select value={method} onValueChange={setMethod}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All methods</SelectItem>
              {PAYMENT_METHODS.map((m) => <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <Label htmlFor="pv-from">From</Label>
            <Input id="pv-from" type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
          </div>
          <div>
            <Label htmlFor="pv-to">To</Label>
            <Input id="pv-to" type="date" value={to} onChange={(e) => setTo(e.target.value)} />
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">{rows.length} proof{rows.length === 1 ? "" : "s"}</p>
        <Button variant="outline" size="sm" onClick={exportCSV}>
          <Download className="mr-1 h-4 w-4" /> Export CSV
        </Button>
      </div>

      {/* Table (desktop) / cards (mobile) */}
      {isLoading ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : rows.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-8">No proofs match these filters.</p>
      ) : (
        <div className="space-y-2">
          {rows.map((r) => {
            const p = profiles[r.user_id] || {};
            return (
              <div key={r.id} className="rounded-xl border border-border bg-card p-3 flex flex-col md:flex-row md:items-center gap-3">
                <div className="flex-1 min-w-0 space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-semibold">{r.bookings?.booking_reference || r.booking_id.slice(0, 8)}</span>
                    <span className="text-xs text-muted-foreground">· {r.bookings?.tours?.title}</span>
                    <span className={`ml-auto md:ml-0 text-xs rounded-full px-2 py-0.5 font-medium ${
                      r.status === "approved" ? "bg-emerald-100 text-emerald-800"
                      : r.status === "rejected" ? "bg-destructive/10 text-destructive"
                      : r.status === "more_info_requested" ? "bg-amber-100 text-amber-800"
                      : "bg-blue-100 text-blue-800"
                    }`}>{r.status.replace(/_/g, " ")}</span>
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {p.full_name || "—"} · {p.email || "—"} · {p.phone || r.bookings?.phone_number || "—"}
                  </div>
                  <div className="text-xs">
                    <span className="font-medium">{formatKES(r.amount_sent)}</span>
                    <span className="text-muted-foreground capitalize"> · {r.payment_method.replace(/_/g, " ")}</span>
                    <span className="text-muted-foreground"> · {new Date(r.payment_date).toLocaleDateString()}</span>
                    {(r.mpesa_code || r.bank_reference) && (
                      <span className="text-muted-foreground font-mono"> · {r.mpesa_code || r.bank_reference}</span>
                    )}
                  </div>
                  {r.notes && <div className="text-xs italic text-muted-foreground">"{r.notes}"</div>}
                </div>
                <div className="flex flex-wrap items-center gap-1">
                  <Button size="sm" variant="outline" onClick={() => setPreview(r)}>
                    <ZoomIn className="mr-1 h-3 w-3" /> View
                  </Button>
                  {r.status === "pending_review" && (
                    <>
                      <Button size="sm" variant="accent" onClick={() => setReviewOf({ row: r, decision: "approve" })}>
                        <CheckCircle2 className="mr-1 h-3 w-3" /> Approve
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => setReviewOf({ row: r, decision: "request_info" })}>
                        <HelpCircle className="mr-1 h-3 w-3" /> Request info
                      </Button>
                      <Button size="sm" variant="ghost" className="text-destructive" onClick={() => setReviewOf({ row: r, decision: "reject" })}>
                        <XCircle className="mr-1 h-3 w-3" /> Reject
                      </Button>
                    </>
                  )}
                  <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive" onClick={() => setDelTarget(r)} aria-label="Delete proof">
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <ProofPreviewDialog row={preview} onClose={() => setPreview(null)} />

      <ReviewDialog
        state={reviewOf}
        onClose={() => setReviewOf(null)}
        pending={review.isPending}
        onSubmit={async (amount, reason) => {
          if (!reviewOf || !user) return;
          try {
            await review.mutateAsync({
              proof: reviewOf.row,
              decision: reviewOf.decision,
              amountToApply: amount,
              reason,
              adminId: user.id,
            });
            toast.success(
              reviewOf.decision === "approve" ? "Payment approved" :
              reviewOf.decision === "reject" ? "Payment rejected" :
              "Info requested",
            );
            setReviewOf(null);
          } catch (e: any) {
            toast.error(e?.message || "Action failed");
          }
        }}
      />

      <AlertDialog open={!!delTarget} onOpenChange={(o) => !o && setDelTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this payment proof?</AlertDialogTitle>
            <AlertDialogDescription>
              This permanently removes the uploaded file and its metadata. The booking's paid amount is not affected.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => delTarget && del.mutate(delTarget, {
                onSuccess: () => { toast.success("Proof deleted"); setDelTarget(null); },
                onError: (e: any) => toast.error(e?.message || "Delete failed"),
              })}
            >Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function ProofPreviewDialog({ row, onClose }: { row: Row | null; onClose: () => void }) {
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => {
    if (!row) { setUrl(null); return; }
    signedProofUrl(row.file_path, 600).then(setUrl);
  }, [row]);

  return (
    <Dialog open={!!row} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>Payment Proof</DialogTitle>
          <DialogDescription>
            {row?.bookings?.booking_reference} · {formatKES(row?.amount_sent || 0)} · {row?.payment_method}
          </DialogDescription>
        </DialogHeader>
        <div className="max-h-[70vh] overflow-auto flex justify-center bg-muted rounded-lg">
          {!url ? (
            <div className="p-10"><Loader2 className="h-6 w-6 animate-spin" /></div>
          ) : row?.file_type === "application/pdf" ? (
            <iframe title="Proof PDF" src={url} className="w-full h-[70vh] rounded-lg bg-white" />
          ) : (
            <img src={url} alt="Payment proof" className="max-w-full h-auto" />
          )}
        </div>
        {url && (
          <div className="flex justify-end">
            <Button asChild variant="outline" size="sm">
              <a href={url} target="_blank" rel="noopener noreferrer" download>
                <ExternalLink className="mr-1 h-4 w-4" /> Open / Download
              </a>
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

function ReviewDialog({
  state, onClose, onSubmit, pending,
}: {
  state: { row: Row; decision: "approve" | "reject" | "request_info" } | null;
  onClose: () => void;
  onSubmit: (amount: number | undefined, reason: string) => void;
  pending: boolean;
}) {
  const [amount, setAmount] = useState<string>("");
  const [reason, setReason] = useState<string>("");

  useEffect(() => {
    if (state) {
      setAmount(String(state.row.amount_sent));
      setReason("");
    }
  }, [state]);

  const title =
    state?.decision === "approve" ? "Approve Payment"
    : state?.decision === "reject" ? "Reject Payment Proof"
    : "Request More Information";

  return (
    <Dialog open={!!state} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>
            {state?.row.bookings?.booking_reference} · Sent {formatKES(state?.row.amount_sent || 0)}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          {state?.decision === "approve" && (
            <div>
              <Label htmlFor="rv-amount">Amount to apply (KES)</Label>
              <Input id="rv-amount" type="number" min={1} value={amount} onChange={(e) => setAmount(e.target.value)} />
              <p className="text-xs text-muted-foreground mt-1">Defaults to the amount the customer said they sent.</p>
            </div>
          )}
          <div>
            <Label htmlFor="rv-reason">
              {state?.decision === "approve" ? "Note (optional)" : "Reason (visible to customer)"}
            </Label>
            <Textarea id="rv-reason" rows={3} value={reason} onChange={(e) => setReason(e.target.value)} />
          </div>
        </div>
        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={onClose} disabled={pending}>Cancel</Button>
          <Button
            onClick={() => onSubmit(state?.decision === "approve" ? Number(amount) : undefined, reason)}
            disabled={pending}
            variant={state?.decision === "reject" ? "destructive" : "default"}
          >
            {pending && <Loader2 className="mr-1 h-4 w-4 animate-spin" />}
            Confirm
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
