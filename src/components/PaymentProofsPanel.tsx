import { useEffect, useState } from "react";
import { FileText, Image as ImageIcon, ExternalLink, Trash2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useMyProofsForBooking, useDeletePaymentProof, signedProofUrl, PaymentProof } from "@/hooks/usePaymentProofs";
import PaymentProofUpload from "@/components/PaymentProofUpload";
import { formatKES } from "@/lib/formatKES";
import { UI_STATUS_META, resolveUIPaymentStatus } from "@/lib/paymentStatus";
import { toast } from "sonner";

interface Props {
  bookingId: string;
  totalPrice: number;
  amountPaid: number;
  balanceDue: number;
  overpaymentCredit: number;
  paymentStatus: string;
}

export default function PaymentProofsPanel({
  bookingId, totalPrice, amountPaid, balanceDue, overpaymentCredit, paymentStatus,
}: Props) {
  const { data: proofs, isLoading } = useMyProofsForBooking(bookingId);
  const del = useDeletePaymentProof();

  const latest = proofs?.[0];
  const uiStatus = resolveUIPaymentStatus(paymentStatus, latest);
  const meta = UI_STATUS_META[uiStatus];

  const canUploadNew = uiStatus !== "paid" && uiStatus !== "under_review";

  return (
    <div className="rounded-xl border border-border bg-card p-4 space-y-3">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h3 className="font-semibold text-sm">Payment</h3>
        <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${meta.className}`}>{meta.label}</span>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
        <Stat label="Total" value={formatKES(totalPrice)} />
        <Stat label="Paid" value={formatKES(amountPaid)} tone="text-emerald-700" />
        <Stat label="Balance" value={formatKES(balanceDue)} tone={balanceDue > 0 ? "text-amber-700" : "text-emerald-700"} />
        {overpaymentCredit > 0 && <Stat label="Credit" value={formatKES(overpaymentCredit)} tone="text-purple-700" />}
      </div>

      {isLoading ? (
        <p className="text-xs text-muted-foreground">Loading proofs…</p>
      ) : proofs && proofs.length > 0 ? (
        <ul className="space-y-2">
          {proofs.map((p) => (
            <ProofRow key={p.id} p={p} onDelete={() => del.mutate(p, { onSuccess: () => toast.success("Proof removed") })} />
          ))}
        </ul>
      ) : (
        <p className="text-xs text-muted-foreground">No payment proof uploaded yet.</p>
      )}

      {canUploadNew && (
        <PaymentProofUpload bookingId={bookingId} balanceDue={balanceDue} />
      )}
    </div>
  );
}

const Stat = ({ label, value, tone }: { label: string; value: string; tone?: string }) => (
  <div className="rounded-lg bg-muted/50 p-2">
    <div className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</div>
    <div className={`text-sm font-semibold ${tone || "text-foreground"}`}>{value}</div>
  </div>
);

function ProofRow({ p, onDelete }: { p: PaymentProof; onDelete: () => void }) {
  const [url, setUrl] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    signedProofUrl(p.file_path).then((u) => !cancelled && setUrl(u));
    return () => { cancelled = true; };
  }, [p.file_path]);

  const isImg = p.file_type.startsWith("image/");
  const statusColor =
    p.status === "approved" ? "text-emerald-700"
    : p.status === "rejected" ? "text-destructive"
    : p.status === "more_info_requested" ? "text-amber-700"
    : "text-blue-700";

  return (
    <li className="flex items-center gap-3 rounded-lg border border-border/60 p-2 text-xs">
      <div className="h-10 w-10 rounded bg-muted flex items-center justify-center overflow-hidden shrink-0">
        {isImg && url ? (
          <img src={url} alt="Proof" className="h-full w-full object-cover" />
        ) : isImg ? (
          <ImageIcon className="h-4 w-4 text-muted-foreground" />
        ) : (
          <FileText className="h-4 w-4 text-muted-foreground" />
        )}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-medium">{formatKES(p.amount_sent)}</span>
          <span className="text-muted-foreground capitalize">· {p.payment_method.replace(/_/g, " ")}</span>
          <span className={`font-medium ${statusColor}`}>· {p.status.replace(/_/g, " ")}</span>
        </div>
        <div className="text-[11px] text-muted-foreground">
          {new Date(p.created_at).toLocaleDateString()} · {p.mpesa_code || p.bank_reference || "—"}
        </div>
        {p.review_reason && (
          <div className="text-[11px] text-muted-foreground italic">Admin: {p.review_reason}</div>
        )}
      </div>
      <div className="flex items-center gap-1">
        {url && (
          <Button asChild variant="ghost" size="icon" className="h-8 w-8">
            <a href={url} target="_blank" rel="noopener noreferrer" aria-label="Open proof">
              <ExternalLink className="h-4 w-4" />
            </a>
          </Button>
        )}
        {p.status === "pending_review" && (
          <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={onDelete} aria-label="Delete proof">
            <Trash2 className="h-4 w-4" />
          </Button>
        )}
      </div>
    </li>
  );
}
