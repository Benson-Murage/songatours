import { useState, useRef } from "react";
import { Upload, Loader2, FileText, X, Camera } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { PAYMENT_METHODS, ACCEPTED_PROOF_TYPES } from "@/lib/paymentStatus";
import { useUploadPaymentProof, validateProofFile } from "@/hooks/usePaymentProofs";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";

interface Props {
  bookingId: string;
  balanceDue: number;
  trigger?: React.ReactNode;
}

export default function PaymentProofUpload({ bookingId, balanceDue, trigger }: Props) {
  const { user } = useAuth();
  const upload = useUploadPaymentProof();
  const fileRef = useRef<HTMLInputElement>(null);
  const cameraRef = useRef<HTMLInputElement>(null);

  const [open, setOpen] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);
  const [method, setMethod] = useState<string>("mpesa");
  const [amount, setAmount] = useState<string>(balanceDue > 0 ? String(balanceDue) : "");
  const [date, setDate] = useState<string>(new Date().toISOString().slice(0, 10));
  const [mpesa, setMpesa] = useState("");
  const [bankRef, setBankRef] = useState("");
  const [notes, setNotes] = useState("");

  const reset = () => {
    setFile(null);
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(null);
    setProgress(0);
    setMpesa("");
    setBankRef("");
    setNotes("");
  };

  const onPick = (f: File | null) => {
    if (!f) return;
    const err = validateProofFile(f);
    if (err) {
      toast.error(err);
      return;
    }
    setFile(f);
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(f.type.startsWith("image/") ? URL.createObjectURL(f) : null);
  };

  const submit = async () => {
    if (!user) return toast.error("Please sign in");
    if (!file) return toast.error("Please choose a file to upload");
    const amt = Number(amount);
    if (!amt || amt <= 0) return toast.error("Enter the amount you sent");

    setProgress(15);
    const tick = setInterval(() => setProgress((p) => Math.min(p + 10, 85)), 250);
    try {
      await upload.mutateAsync({
        bookingId,
        userId: user.id,
        file,
        paymentMethod: method as any,
        amountSent: Math.round(amt),
        paymentDate: date,
        mpesaCode: mpesa || undefined,
        bankReference: bankRef || undefined,
        notes: notes || undefined,
      });
      setProgress(100);
      toast.success("Payment proof uploaded. We'll notify you once it's verified.");
      reset();
      setOpen(false);
    } catch (e: any) {
      toast.error(e?.message || "Upload failed. Please retry.");
    } finally {
      clearInterval(tick);
      setTimeout(() => setProgress(0), 400);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) reset(); }}>
      <DialogTrigger asChild>
        {trigger || (
          <Button size="sm" variant="accent">
            <Upload className="mr-1 h-4 w-4" /> Upload Payment Proof
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-md sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Upload Payment Proof</DialogTitle>
          <DialogDescription>
            Send us your receipt or screenshot and we'll verify your payment.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* File picker */}
          <div>
            <Label>Receipt / Screenshot</Label>
            <div className="mt-1 flex flex-wrap gap-2">
              <Button type="button" variant="outline" size="sm" onClick={() => fileRef.current?.click()}>
                <Upload className="mr-1 h-4 w-4" /> Choose file
              </Button>
              <Button type="button" variant="outline" size="sm" onClick={() => cameraRef.current?.click()}>
                <Camera className="mr-1 h-4 w-4" /> Camera
              </Button>
              <input
                ref={fileRef}
                type="file"
                accept={ACCEPTED_PROOF_TYPES.join(",")}
                className="hidden"
                onChange={(e) => onPick(e.target.files?.[0] || null)}
              />
              <input
                ref={cameraRef}
                type="file"
                accept="image/*"
                capture="environment"
                className="hidden"
                onChange={(e) => onPick(e.target.files?.[0] || null)}
              />
            </div>
            <p className="text-xs text-muted-foreground mt-1">JPG, PNG, WEBP or PDF — up to 10 MB.</p>

            {file && (
              <div className="mt-3 flex items-start gap-3 rounded-lg border border-border p-3">
                {previewUrl ? (
                  <img src={previewUrl} alt="Preview" className="h-16 w-16 rounded object-cover" />
                ) : (
                  <div className="h-16 w-16 rounded bg-muted flex items-center justify-center">
                    <FileText className="h-6 w-6 text-muted-foreground" />
                  </div>
                )}
                <div className="flex-1 min-w-0 text-sm">
                  <p className="truncate font-medium">{file.name}</p>
                  <p className="text-xs text-muted-foreground">{(file.size / 1024).toFixed(0)} KB</p>
                </div>
                <Button type="button" variant="ghost" size="icon" onClick={() => { setFile(null); setPreviewUrl(null); }} aria-label="Remove file">
                  <X className="h-4 w-4" />
                </Button>
              </div>
            )}
          </div>

          {/* Fields */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <Label htmlFor="pp-method">Payment method</Label>
              <Select value={method} onValueChange={setMethod}>
                <SelectTrigger id="pp-method" className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {PAYMENT_METHODS.map((m) => (
                    <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="pp-amount">Amount sent (KES)</Label>
              <Input id="pp-amount" type="number" inputMode="numeric" min={1} value={amount} onChange={(e) => setAmount(e.target.value)} className="mt-1" />
            </div>
            <div>
              <Label htmlFor="pp-date">Payment date</Label>
              <Input id="pp-date" type="date" value={date} onChange={(e) => setDate(e.target.value)} className="mt-1" />
            </div>
            {method === "mpesa" && (
              <div>
                <Label htmlFor="pp-mpesa">M-Pesa code</Label>
                <Input id="pp-mpesa" value={mpesa} onChange={(e) => setMpesa(e.target.value.toUpperCase())} placeholder="e.g. SGH7HK92X" className="mt-1" />
              </div>
            )}
            {method === "bank_transfer" && (
              <div>
                <Label htmlFor="pp-bank">Bank reference</Label>
                <Input id="pp-bank" value={bankRef} onChange={(e) => setBankRef(e.target.value)} className="mt-1" />
              </div>
            )}
          </div>

          <div>
            <Label htmlFor="pp-notes">Notes (optional)</Label>
            <Textarea id="pp-notes" value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} className="mt-1" />
          </div>

          {progress > 0 && <Progress value={progress} />}

          <div className="flex justify-end gap-2 pt-1">
            <Button type="button" variant="ghost" onClick={() => setOpen(false)} disabled={upload.isPending}>Cancel</Button>
            <Button onClick={submit} disabled={upload.isPending || !file}>
              {upload.isPending && <Loader2 className="mr-1 h-4 w-4 animate-spin" />} Submit for review
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
