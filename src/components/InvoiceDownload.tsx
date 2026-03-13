import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";
import { formatKES } from "@/lib/formatKES";

interface InvoiceData {
  booking_reference: string;
  customer_name: string;
  customer_email: string;
  customer_phone: string;
  tour_title: string;
  destination?: string;
  start_date: string;
  guests_count: number;
  price_per_person: number;
  total_price: number;
  discount_amount?: number;
  amount_paid?: number;
  balance_due?: number;
  payment_status: string;
  payment_method?: string;
  created_at: string;
}

const InvoiceDownload = ({ data }: { data: InvoiceData }) => {
  const handleDownload = () => {
    const formattedDate = new Date(data.start_date).toLocaleDateString("en-KE", {
      day: "numeric", month: "long", year: "numeric",
    });
    const invoiceDate = new Date(data.created_at).toLocaleDateString("en-KE", {
      day: "numeric", month: "long", year: "numeric",
    });

    const html = `<!DOCTYPE html>
<html><head><meta charset="utf-8"><title>Invoice ${data.booking_reference}</title>
<style>
  body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 0; padding: 40px; color: #1a1a1a; }
  .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 40px; }
  .logo { font-size: 24px; font-weight: 800; color: #0F766E; }
  .logo span { color: #EA580C; }
  .invoice-title { font-size: 28px; font-weight: 700; color: #374151; }
  .meta { color: #6B7280; font-size: 13px; line-height: 1.8; }
  .section { margin-bottom: 24px; }
  .section-title { font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em; color: #9CA3AF; margin-bottom: 8px; }
  table { width: 100%; border-collapse: collapse; }
  th { text-align: left; padding: 10px 12px; background: #f3f4f6; font-size: 12px; font-weight: 600; color: #6B7280; border-bottom: 1px solid #e5e7eb; }
  td { padding: 12px; font-size: 14px; border-bottom: 1px solid #f3f4f6; }
  .total-row td { border-top: 2px solid #1a1a1a; font-weight: 700; font-size: 16px; padding-top: 16px; }
  .status { display: inline-block; padding: 4px 12px; border-radius: 999px; font-size: 12px; font-weight: 600; }
  .status-pending { background: #FEF3C7; color: #D97706; }
  .status-paid { background: #D1FAE5; color: #059669; }
  .footer { margin-top: 40px; padding-top: 20px; border-top: 1px solid #e5e7eb; text-align: center; color: #9CA3AF; font-size: 12px; }
</style></head><body>
  <div class="header">
    <div>
      <div class="logo">Songa <span>Travel</span></div>
      <p class="meta">Nairobi, Kenya<br>+254 796 102 412<br>salmajeods11@gmail.com</p>
    </div>
    <div style="text-align: right;">
      <div class="invoice-title">INVOICE</div>
      <p class="meta">Ref: <strong>${data.booking_reference}</strong><br>Date: ${invoiceDate}<br>
      Status: <span class="status ${data.payment_status === 'paid' ? 'status-paid' : 'status-pending'}">${data.payment_status.toUpperCase()}</span></p>
    </div>
  </div>
  <div class="section">
    <div class="section-title">Bill To</div>
    <p style="margin:0;font-size:14px;"><strong>${data.customer_name}</strong><br>${data.customer_email}<br>${data.customer_phone}</p>
  </div>
  <div class="section">
    <div class="section-title">Booking Details</div>
    <table>
      <thead><tr><th>Description</th><th>Details</th><th style="text-align:right;">Amount</th></tr></thead>
      <tbody>
        <tr><td><strong>${data.tour_title}</strong>${data.destination ? `<br><span style="color:#6B7280;font-size:12px;">${data.destination}</span>` : ''}</td><td>${formattedDate}<br>${data.guests_count} guest${data.guests_count > 1 ? 's' : ''}${data.payment_method ? `<br><span style="color:#6B7280;font-size:12px;">via ${data.payment_method}</span>` : ''}</td><td style="text-align:right;">${formatKES(data.price_per_person)} × ${data.guests_count}</td></tr>
        ${data.discount_amount && data.discount_amount > 0 ? `<tr><td colspan="2">Discount</td><td style="text-align:right;color:#059669;">-${formatKES(data.discount_amount)}</td></tr>` : ''}
        <tr class="total-row"><td colspan="2">Total</td><td style="text-align:right;">${formatKES(data.total_price)}</td></tr>
        ${data.amount_paid != null && data.amount_paid > 0 ? `<tr><td colspan="2" style="font-size:14px;">Amount Paid</td><td style="text-align:right;color:#059669;font-size:14px;font-weight:600;">${formatKES(data.amount_paid)}</td></tr>` : ''}
        ${data.balance_due != null && data.balance_due > 0 ? `<tr><td colspan="2" style="font-size:14px;">Balance Due</td><td style="text-align:right;color:#D97706;font-size:14px;font-weight:600;">${formatKES(data.balance_due)}</td></tr>` : ''}
      </tbody>
    </table>
  </div>
  <div class="footer">
    <p>Thank you for choosing Songa Travel & Tours</p>
    <p>© 2026 Songa Travel & Tours • Nairobi, Kenya</p>
  </div>
</body></html>`;

    const blob = new Blob([html], { type: "text/html" });
    const url = URL.createObjectURL(blob);
    const printWindow = window.open(url, "_blank");
    if (printWindow) {
      printWindow.onload = () => {
        printWindow.print();
        URL.revokeObjectURL(url);
      };
    }
  };

  return (
    <Button variant="outline" size="sm" onClick={handleDownload}>
      <Download className="mr-1 h-3.5 w-3.5" />
      Invoice
    </Button>
  );
};

export default InvoiceDownload;
