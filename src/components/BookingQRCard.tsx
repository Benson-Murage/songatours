import { QRCodeSVG } from "qrcode.react";
import { Card, CardContent } from "@/components/ui/card";
import { Copy, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

interface Props {
  bookingReference: string;
  verificationCode: string;
  receiptNumber?: string | null;
}

const BookingQRCard = ({ bookingReference, verificationCode, receiptNumber }: Props) => {
  const base = typeof window !== "undefined" ? window.location.origin : "";
  const verifyUrl = `${base}/verify/${encodeURIComponent(verificationCode)}`;

  const copy = () => {
    navigator.clipboard.writeText(verificationCode).then(() => toast.success("Verification code copied"));
  };

  return (
    <Card className="bg-gradient-to-br from-primary/5 to-accent/5 border-primary/20">
      <CardContent className="p-4 flex items-center gap-4">
        <div className="bg-white p-2 rounded-lg shadow-sm shrink-0">
          <QRCodeSVG value={verifyUrl} size={92} level="H" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1 text-primary text-xs font-semibold">
            <ShieldCheck className="h-3.5 w-3.5" />
            <span>Verifiable Receipt</span>
          </div>
          <div className="mt-1 font-mono text-sm font-bold truncate">{verificationCode}</div>
          <div className="text-[11px] text-muted-foreground truncate">
            {receiptNumber ? `Receipt ${receiptNumber} · ` : ""}Ref {bookingReference}
          </div>
          <div className="flex gap-1 mt-2">
            <Button size="sm" variant="ghost" className="h-7 px-2 text-xs" onClick={copy}>
              <Copy className="h-3 w-3 mr-1" /> Copy code
            </Button>
            <Button
              size="sm"
              variant="ghost"
              className="h-7 px-2 text-xs"
              onClick={() => window.open(verifyUrl, "_blank")}
            >
              Verify page
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default BookingQRCard;
