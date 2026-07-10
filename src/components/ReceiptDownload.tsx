import { Button } from "@/components/ui/button";
import { Download, Receipt } from "lucide-react";
import { formatKES } from "@/lib/formatKES";
import { LOGO_BASE64 } from "@/lib/logoBase64";
import { useReceiptSettings } from "@/hooks/useReceiptSettings";
import { logReceiptDownload } from "@/hooks/useCheckIn";

interface ReceiptData {
  booking_id: string;
  user_id: string;
  booking_reference: string;
  receipt_number?: string | null;
  verification_code?: string | null;
  customer_name: string;
  customer_email: string;
  customer_phone: string;
  tour_title: string;
  destination?: string;
  start_date: string;
  guests_count: number;
  total_price: number;
  amount_paid: number;
  balance_due: number;
  overpayment_amount?: number;
  payment_status: string;
  payment_method?: string;
  created_at: string;
}

const publicBase =
  typeof window !== "undefined" ? window.location.origin : "https://songatours.lovable.app";

const ReceiptDownload = ({ data }: { data: ReceiptData }) => {
  const { data: settings } = useReceiptSettings();

  const handleDownload = () => {
    logReceiptDownload(data.booking_id, data.user_id, "receipt").catch(() => {});
    const primary = settings?.primary_color || "#0F766E";
    const accent = settings?.accent_color || "#F97316";
    const header = settings?.header_text || "Songa Travel & Tours";
    const footer = settings?.footer_text || "Thank you for choosing Songa Travel & Tours";
    const contact = settings?.contact_details || "Nairobi, Kenya · +254 796 102 412 · salmajeods11@gmail.com";
    const bank = settings?.bank_details || "";
    const instructions = settings?.payment_instructions || "";
    const terms = settings?.terms || "This receipt is proof of payment for the booking above.";
    const logo = settings?.logo_url || LOGO_BASE64;
    const verifyUrl = `${publicBase}/verify/${encodeURIComponent(data.verification_code || "")}`;
    const qrSrc = `https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(verifyUrl)}`;
    const issuedAt = new Date().toLocaleString("en-KE");
    const startDate = new Date(data.start_date).toLocaleDateString("en-KE", {
      day: "numeric", month: "long", year: "numeric",
    });

    const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Receipt ${
      data.receipt_number || data.booking_reference
    }</title>
<style>
  body{font-family:${settings?.font_family || "Inter"},system-ui,sans-serif;margin:0;padding:40px;color:#111;}
  .top{display:flex;justify-content:space-between;align-items:flex-start;gap:16px;padding-bottom:16px;border-bottom:3px solid ${primary};}
  .brand{font-size:22px;font-weight:800;color:${primary};}
  .accent{color:${accent};}
  .meta{color:#555;font-size:12px;line-height:1.6;}
  h1{font-size:26px;color:${primary};margin:0;}
  .badge{display:inline-block;padding:4px 10px;border-radius:999px;font-size:11px;font-weight:700;text-transform:uppercase;}
  .paid{background:#D1FAE5;color:#065F46;}
  .partial{background:#FEF3C7;color:#92400E;}
  .pending{background:#FEE2E2;color:#991B1B;}
  .grid{display:grid;grid-template-columns:1fr 1fr;gap:24px;margin-top:24px;}
  .card{border:1px solid #eee;border-radius:10px;padding:14px;}
  .label{font-size:10px;text-transform:uppercase;letter-spacing:.05em;color:#888;margin-bottom:4px;}
  table{width:100%;border-collapse:collapse;margin-top:24px;}
  th{text-align:left;padding:10px;background:#f8f8f8;font-size:12px;color:#555;}
  td{padding:10px;border-bottom:1px solid #f1f1f1;font-size:13px;}
  .total{font-weight:700;font-size:16px;color:${primary};}
  .qrbox{display:flex;gap:16px;align-items:center;margin-top:24px;padding:16px;border:1px dashed ${primary};border-radius:10px;}
  .qrbox img{width:120px;height:120px;}
  .sig{display:flex;justify-content:space-between;margin-top:36px;gap:24px;}
  .sig .box{flex:1;text-align:center;}
  .sig img{max-height:70px;}
  .footer{margin-top:32px;padding-top:14px;border-top:1px solid #eee;text-align:center;color:#888;font-size:11px;}
  .tamper{background:#fff8ee;border:1px solid ${accent};color:#7a4200;font-size:11px;padding:10px;border-radius:8px;margin-top:20px;}
  @media print{@page{margin:14mm;} body{padding:0;}}
</style></head><body>
  <div class="top">
    <div style="display:flex;gap:12px;align-items:center;">
      <img src="${logo}" alt="logo" style="height:56px;" />
      <div>
        <div class="brand">${header}</div>
        <div class="meta">${contact}</div>
      </div>
    </div>
    <div style="text-align:right;">
      <h1>OFFICIAL RECEIPT</h1>
      <div class="meta">
        Receipt No: <strong>${data.receipt_number || "—"}</strong><br/>
        Booking: <strong>${data.booking_reference}</strong><br/>
        Issued: ${issuedAt}<br/>
        <span class="badge ${
          data.payment_status === "paid" || data.payment_status === "overpaid"
            ? "paid"
            : data.payment_status === "partial"
              ? "partial"
              : "pending"
        }">${data.payment_status}</span>
      </div>
    </div>
  </div>

  <div class="grid">
    <div class="card">
      <div class="label">Customer</div>
      <div><strong>${data.customer_name}</strong></div>
      <div class="meta">${data.customer_email}<br/>${data.customer_phone}</div>
    </div>
    <div class="card">
      <div class="label">Tour</div>
      <div><strong>${data.tour_title}</strong></div>
      <div class="meta">${data.destination || ""}<br/>Departs ${startDate} · ${data.guests_count} guest${
        data.guests_count > 1 ? "s" : ""
      }</div>
    </div>
  </div>

  <table>
    <thead><tr><th>Description</th><th style="text-align:right;">Amount</th></tr></thead>
    <tbody>
      <tr><td>Tour Total</td><td style="text-align:right;">${formatKES(data.total_price)}</td></tr>
      <tr><td>Amount Paid</td><td style="text-align:right;color:#065F46;">${formatKES(data.amount_paid)}</td></tr>
      <tr><td>Balance Due</td><td style="text-align:right;color:#92400E;">${formatKES(data.balance_due)}</td></tr>
      ${data.overpayment_amount && data.overpayment_amount > 0 ? `<tr><td>Overpayment Credit</td><td style="text-align:right;color:#065F46;">${formatKES(data.overpayment_amount)}</td></tr>` : ""}
      <tr><td class="total">Payment Method</td><td style="text-align:right;" class="total">${data.payment_method || "—"}</td></tr>
    </tbody>
  </table>

  <div class="qrbox">
    <img src="${qrSrc}" alt="QR" />
    <div style="flex:1;">
      <div class="label">Verification</div>
      <div style="font-family:ui-monospace,monospace;font-size:16px;font-weight:700;">${data.verification_code || "—"}</div>
      <div class="meta">Scan or visit <strong>${verifyUrl}</strong> to verify this receipt.</div>
    </div>
  </div>

  ${bank ? `<div style="margin-top:20px;"><div class="label">Bank Details</div><div style="white-space:pre-wrap;font-size:12px;">${bank}</div></div>` : ""}
  ${instructions ? `<div style="margin-top:16px;"><div class="label">Payment Instructions</div><div style="white-space:pre-wrap;font-size:12px;">${instructions}</div></div>` : ""}
  ${terms ? `<div style="margin-top:16px;"><div class="label">Terms</div><div style="white-space:pre-wrap;font-size:11px;color:#555;">${terms}</div></div>` : ""}

  <div class="sig">
    ${
      settings?.show_signature !== false
        ? `<div class="box">
        ${settings?.signature_url ? `<img src="${settings.signature_url}" alt="signature" />` : `<div style="height:60px;border-bottom:1px solid #333;"></div>`}
        <div style="margin-top:6px;font-size:12px;font-weight:600;">${settings?.signature_name || "Authorized Signatory"}</div>
      </div>`
        : ""
    }
    ${
      settings?.show_stamp !== false && settings?.stamp_url
        ? `<div class="box"><img src="${settings.stamp_url}" alt="stamp" /><div style="margin-top:6px;font-size:12px;">Company Seal</div></div>`
        : ""
    }
  </div>

  <div class="tamper">
    This receipt is tamper-evident. It can be verified online using the QR code or verification code
    <strong>${data.verification_code || ""}</strong>. Any alteration invalidates this document.
  </div>

  <div class="footer">${footer}</div>

  <script>window.onload=function(){setTimeout(function(){window.print();},400);};</script>
</body></html>`;

    const blob = new Blob([html], { type: "text/html" });
    const url = URL.createObjectURL(blob);
    const w = window.open(url, "_blank");
    if (w) {
      setTimeout(() => URL.revokeObjectURL(url), 20_000);
    }
  };

  return (
    <Button variant="outline" size="sm" onClick={handleDownload}>
      <Receipt className="mr-1 h-3.5 w-3.5" />
      Receipt
    </Button>
  );
};

export default ReceiptDownload;
