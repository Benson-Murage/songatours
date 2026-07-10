import { useEffect, useState } from "react";
import { useReceiptSettings, useUpdateReceiptSettings, type ReceiptSettings } from "@/hooks/useReceiptSettings";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Loader2, Palette, Save } from "lucide-react";
import ReceiptDownload from "@/components/ReceiptDownload";

const sampleData = {
  booking_id: "sample",
  user_id: "sample",
  booking_reference: "SGT-2026-00001",
  receipt_number: "RCPT-2026-00001",
  verification_code: "SGT-2026-8F4X92Q",
  customer_name: "Jane Wanjiru",
  customer_email: "jane@example.com",
  customer_phone: "+254 700 000 000",
  tour_title: "Maasai Mara Weekend",
  destination: "Maasai Mara",
  start_date: new Date().toISOString(),
  guests_count: 2,
  total_price: 45000,
  amount_paid: 45000,
  balance_due: 0,
  payment_status: "paid",
  payment_method: "mpesa",
  created_at: new Date().toISOString(),
};

const ReceiptDesigner = () => {
  const { data, isLoading } = useReceiptSettings();
  const update = useUpdateReceiptSettings();
  const [form, setForm] = useState<ReceiptSettings | null>(null);

  useEffect(() => {
    if (data && !form) setForm(data);
  }, [data, form]);

  if (isLoading || !form) return <div className="p-6 text-center"><Loader2 className="h-5 w-5 animate-spin inline" /></div>;

  const patch = (k: keyof ReceiptSettings, v: any) => setForm({ ...form, [k]: v });

  const save = async () => {
    try {
      await update.mutateAsync({ id: form.id, ...form });
      toast.success("Receipt template saved");
    } catch (e: any) {
      toast.error(e.message || "Save failed");
    }
  };

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Palette className="h-5 w-5" /> Receipt Designer</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Header Text</Label>
              <Input value={form.header_text} onChange={(e) => patch("header_text", e.target.value)} />
            </div>
            <div>
              <Label>Font Family</Label>
              <Input value={form.font_family} onChange={(e) => patch("font_family", e.target.value)} />
            </div>
            <div>
              <Label>Primary Color</Label>
              <Input type="color" value={form.primary_color} onChange={(e) => patch("primary_color", e.target.value)} />
            </div>
            <div>
              <Label>Accent Color</Label>
              <Input type="color" value={form.accent_color} onChange={(e) => patch("accent_color", e.target.value)} />
            </div>
          </div>
          <div>
            <Label>Logo URL</Label>
            <Input value={form.logo_url || ""} onChange={(e) => patch("logo_url", e.target.value)} placeholder="https://..." />
          </div>
          <div>
            <Label>Contact Details</Label>
            <Textarea rows={2} value={form.contact_details} onChange={(e) => patch("contact_details", e.target.value)} />
          </div>
          <div>
            <Label>Bank Details</Label>
            <Textarea rows={3} value={form.bank_details} onChange={(e) => patch("bank_details", e.target.value)} />
          </div>
          <div>
            <Label>Payment Instructions</Label>
            <Textarea rows={2} value={form.payment_instructions} onChange={(e) => patch("payment_instructions", e.target.value)} />
          </div>
          <div>
            <Label>Terms & Conditions</Label>
            <Textarea rows={3} value={form.terms} onChange={(e) => patch("terms", e.target.value)} />
          </div>
          <div>
            <Label>Footer Text</Label>
            <Input value={form.footer_text} onChange={(e) => patch("footer_text", e.target.value)} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Signature Image URL</Label>
              <Input value={form.signature_url || ""} onChange={(e) => patch("signature_url", e.target.value)} placeholder="https://..." />
              <Input className="mt-2" value={form.signature_name} onChange={(e) => patch("signature_name", e.target.value)} placeholder="Signatory name" />
              <div className="flex items-center gap-2 mt-2">
                <Switch checked={form.show_signature} onCheckedChange={(v) => patch("show_signature", v)} />
                <span className="text-xs">Show signature</span>
              </div>
            </div>
            <div>
              <Label>Stamp Image URL</Label>
              <Input value={form.stamp_url || ""} onChange={(e) => patch("stamp_url", e.target.value)} placeholder="https://..." />
              <div className="flex items-center gap-2 mt-2">
                <Switch checked={form.show_stamp} onCheckedChange={(v) => patch("show_stamp", v)} />
                <span className="text-xs">Show stamp</span>
              </div>
            </div>
          </div>
          <Button onClick={save} disabled={update.isPending} className="w-full">
            {update.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Save className="h-4 w-4 mr-1" />}
            Save Template
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Live Preview</CardTitle>
        </CardHeader>
        <CardContent>
          <div
            className="rounded-lg border p-4 text-xs space-y-2"
            style={{ fontFamily: form.font_family, background: "#fff", color: "#111" }}
          >
            <div className="flex justify-between items-start pb-2" style={{ borderBottom: `3px solid ${form.primary_color}` }}>
              <div>
                <div style={{ color: form.primary_color, fontWeight: 800, fontSize: 16 }}>{form.header_text}</div>
                <div className="text-muted-foreground whitespace-pre-line">{form.contact_details}</div>
              </div>
              <div className="text-right">
                <div style={{ color: form.primary_color, fontWeight: 700 }}>OFFICIAL RECEIPT</div>
                <div>Receipt: <strong>RCPT-2026-00001</strong></div>
                <div>Booking: <strong>SGT-2026-00001</strong></div>
              </div>
            </div>
            <div>Customer: <strong>Jane Wanjiru</strong></div>
            <div>Tour: <strong>Maasai Mara Weekend</strong> · 2 guests</div>
            <div>Total: <strong>KSh 45,000</strong> · Paid <strong>KSh 45,000</strong></div>
            <div className="p-2 rounded border-dashed border" style={{ borderColor: form.primary_color }}>
              <div className="font-mono font-bold" style={{ color: form.primary_color }}>SGT-2026-8F4X92Q</div>
              <div className="text-[10px] text-muted-foreground">Scan QR to verify</div>
            </div>
            {form.terms && <div className="text-[10px] text-muted-foreground whitespace-pre-line">{form.terms}</div>}
            <div className="text-center text-[10px] text-muted-foreground pt-2 border-t">{form.footer_text}</div>
          </div>
          <div className="mt-3">
            <ReceiptDownload data={sampleData as any} />
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default ReceiptDesigner;
