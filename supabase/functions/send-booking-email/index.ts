const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

function jsonResponse(body: Record<string, unknown>, status: number) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function formatKES(amount: number): string {
  return `KSh ${amount.toLocaleString("en-KE", { maximumFractionDigits: 0 })}`;
}

interface BookingEmailPayload {
  to_email: string;
  to_name: string;
  booking_id: string;
  booking_reference?: string;
  tour_title: string;
  start_date: string;
  guests_count: number;
  total_price: number;
  whatsapp_group_link?: string | null;
  type: "confirmation" | "cancellation" | "payment_update";
  // Payment-update fields (optional)
  amount_paid_now?: number;
  total_paid?: number;
  balance_due?: number;
  overpayment?: number;
  payment_method?: string;
  payment_reference?: string | null;
}

const LOGO_URL = "https://songatours.lovable.app/icons/songa-logo.png";
const SUPPORT_EMAIL = "info@songatravel.com";
const WHATSAPP = "+254 796 102 412";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const apiKey = Deno.env.get("RESEND_API_KEY");
    if (!apiKey) {
      console.error("RESEND_API_KEY not configured");
      return jsonResponse({ error: "Email service not configured" }, 500);
    }

    const payload: BookingEmailPayload = await req.json();
    const {
      to_email, to_name, booking_id, booking_reference, tour_title,
      start_date, guests_count, total_price, whatsapp_group_link, type,
      amount_paid_now, total_paid, balance_due, overpayment, payment_method, payment_reference,
    } = payload;

    if (!to_email || !booking_id || !tour_title) {
      return jsonResponse({ error: "Missing required fields" }, 400);
    }

    const displayRef = booking_reference || booking_id.slice(0, 8).toUpperCase();
    const formattedDate = new Date(start_date).toLocaleDateString("en-US", {
      weekday: "long", year: "numeric", month: "long", day: "numeric",
    });

    let subject = "";
    let html = "";

    if (type === "payment_update") {
      const isFullyPaid = (balance_due ?? 0) <= 0 && (overpayment ?? 0) <= 0;
      const isOverpaid = (overpayment ?? 0) > 0;
      subject = isFullyPaid
        ? `Payment Received — ${tour_title} (Paid in full)`
        : isOverpaid
        ? `Payment Received — ${tour_title} (Overpayment recorded)`
        : `Payment Received — ${tour_title}`;

      html = `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 40px 20px; background:#ffffff;">
        <div style="text-align: center; margin-bottom: 24px;">
          <img src="${LOGO_URL}" alt="Songa Travel & Tours" style="height:50px;" />
        </div>
        <div style="background: #f0fdf4; border:1px solid #bbf7d0; border-radius: 12px; padding: 24px; margin-bottom: 16px;">
          <h2 style="color: #065f46; font-size: 20px; margin: 0 0 6px;">Payment Received ✅</h2>
          <p style="color: #064e3b; font-size: 14px; margin: 0;">Hi ${to_name || "Traveler"}, we've recorded your payment for <strong>${tour_title}</strong>.</p>
        </div>
        <div style="background: #f9fafb; border-radius: 12px; padding: 24px; margin-bottom: 16px;">
          <h3 style="font-size: 14px; color:#6B7280; text-transform:uppercase; letter-spacing:0.05em; margin:0 0 12px;">Payment Summary</h3>
          <table style="width: 100%; border-collapse: collapse;">
            ${amount_paid_now != null ? `<tr><td style="padding:6px 0; color:#6B7280; font-size:14px;">This payment</td><td style="padding:6px 0; color:#111827; font-size:14px; text-align:right; font-weight:600;">${formatKES(Number(amount_paid_now))}</td></tr>` : ""}
            <tr><td style="padding:6px 0; color:#6B7280; font-size:14px;">Tour total</td><td style="padding:6px 0; color:#111827; font-size:14px; text-align:right;">${formatKES(Number(total_price))}</td></tr>
            <tr><td style="padding:6px 0; color:#6B7280; font-size:14px;">Total paid so far</td><td style="padding:6px 0; color:#0F766E; font-size:14px; text-align:right; font-weight:700;">${formatKES(Number(total_paid ?? 0))}</td></tr>
            ${isOverpaid
              ? `<tr style="border-top:1px solid #e5e7eb;"><td style="padding:10px 0; color:#b91c1c; font-size:15px; font-weight:700;">Overpayment</td><td style="padding:10px 0; color:#b91c1c; font-size:15px; text-align:right; font-weight:700;">${formatKES(Number(overpayment ?? 0))}</td></tr>`
              : `<tr style="border-top:1px solid #e5e7eb;"><td style="padding:10px 0; color:#111827; font-size:15px; font-weight:700;">Balance due</td><td style="padding:10px 0; color:${(balance_due ?? 0) > 0 ? "#D97706" : "#059669"}; font-size:15px; text-align:right; font-weight:700;">${formatKES(Number(balance_due ?? 0))}</td></tr>`}
            ${payment_method ? `<tr><td style="padding:6px 0; color:#6B7280; font-size:13px;">Method</td><td style="padding:6px 0; color:#111827; font-size:13px; text-align:right; text-transform:capitalize;">${payment_method.replace(/_/g, ' ')}</td></tr>` : ""}
            ${payment_reference ? `<tr><td style="padding:6px 0; color:#6B7280; font-size:13px;">Reference</td><td style="padding:6px 0; color:#111827; font-size:13px; text-align:right; font-family:monospace;">${payment_reference}</td></tr>` : ""}
            <tr><td style="padding:6px 0; color:#6B7280; font-size:13px;">Tour date</td><td style="padding:6px 0; color:#111827; font-size:13px; text-align:right;">${formattedDate}</td></tr>
            <tr><td style="padding:6px 0; color:#6B7280; font-size:13px;">Guests</td><td style="padding:6px 0; color:#111827; font-size:13px; text-align:right;">${guests_count}</td></tr>
          </table>
        </div>
        ${isOverpaid ? `<p style="color:#b91c1c; font-size:13px; text-align:center; margin: 0 0 12px;">⚠️ We recorded an overpayment. Our team will be in touch about a refund or credit.</p>` : ""}
        <p style="color: #6B7280; font-size: 13px; text-align: center;">Booking Reference: <strong>${displayRef}</strong></p>
        <p style="color: #9CA3AF; font-size: 12px; text-align: center; margin-top: 16px;">Questions? Contact ${SUPPORT_EMAIL} or WhatsApp ${WHATSAPP}</p>
      </div>`;
    } else {
      const isConfirmation = type === "confirmation";
      subject = isConfirmation
        ? `Booking Confirmed - ${tour_title}`
        : `Booking Cancelled - ${tour_title}`;

      const whatsappCta = isConfirmation && whatsapp_group_link
        ? `<div style="margin-top: 20px; text-align: center;">
            <a href="${whatsapp_group_link}" style="display: inline-block; background: #16a34a; color: white; text-decoration: none; padding: 10px 16px; border-radius: 8px; font-size: 14px; font-weight: 600;">Join Tour WhatsApp Group</a>
          </div>` : "";

      html = isConfirmation ? `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 40px 20px; background:#ffffff;">
          <div style="text-align: center; margin-bottom: 32px;">
            <img src="${LOGO_URL}" alt="Songa Travel & Tours" style="height:50px;" />
          </div>
          <div style="background: #f9fafb; border-radius: 12px; padding: 32px; margin-bottom: 24px;">
            <h2 style="color: #111827; font-size: 20px; margin: 0 0 8px;">Booking Confirmed ✅</h2>
            <p style="color: #6B7280; font-size: 14px; margin: 0 0 24px;">Hi ${to_name || "Traveler"}, your adventure is booked. Payment will be coordinated by our team.</p>
            <table style="width: 100%; border-collapse: collapse;">
              <tr><td style="padding: 8px 0; color: #6B7280; font-size: 14px;">Tour</td><td style="padding: 8px 0; color: #111827; font-size: 14px; font-weight: 600; text-align: right;">${tour_title}</td></tr>
              <tr><td style="padding: 8px 0; color: #6B7280; font-size: 14px;">Date</td><td style="padding: 8px 0; color: #111827; font-size: 14px; text-align: right;">${formattedDate}</td></tr>
              <tr><td style="padding: 8px 0; color: #6B7280; font-size: 14px;">Guests</td><td style="padding: 8px 0; color: #111827; font-size: 14px; text-align: right;">${guests_count}</td></tr>
              <tr style="border-top: 1px solid #e5e7eb;"><td style="padding: 12px 0; color: #111827; font-size: 16px; font-weight: 700;">Total</td><td style="padding: 12px 0; color: #0F766E; font-size: 16px; font-weight: 700; text-align: right;">${formatKES(Number(total_price))}</td></tr>
              <tr><td style="padding: 8px 0; color: #6B7280; font-size: 14px;">Status</td><td style="padding: 8px 0; color: #D97706; font-size: 14px; text-align: right; font-weight:600;">Awaiting payment</td></tr>
            </table>
          </div>
          ${whatsappCta}
          <p style="color: #6B7280; font-size: 13px; text-align: center;">Booking Reference: <strong>${displayRef}</strong></p>
          <p style="color: #6B7280; font-size: 12px; text-align: center; margin-top: 4px;">WhatsApp: ${WHATSAPP}</p>
          <p style="color: #9CA3AF; font-size: 12px; text-align: center; margin-top: 8px;">Free cancellation available. Contact ${SUPPORT_EMAIL} for support.</p>
        </div>` : `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 40px 20px; background:#ffffff;">
          <div style="text-align: center; margin-bottom: 32px;">
            <img src="${LOGO_URL}" alt="Songa Travel & Tours" style="height:50px;" />
          </div>
          <div style="background: #fef2f2; border-radius: 12px; padding: 32px;">
            <h2 style="color: #111827; font-size: 20px; margin: 0 0 8px;">Booking Cancelled</h2>
            <p style="color: #6B7280; font-size: 14px; margin: 0 0 16px;">Hi ${to_name || "Traveler"}, your booking for <strong>${tour_title}</strong> on ${formattedDate} has been cancelled.</p>
            <p style="color: #6B7280; font-size: 14px;">Total: <strong>${formatKES(Number(total_price))}</strong></p>
            <p style="color: #6B7280; font-size: 13px;">Booking Reference: <strong>${displayRef}</strong></p>
          </div>
          <p style="color: #9CA3AF; font-size: 12px; text-align: center; margin-top: 24px;">Questions? Contact ${SUPPORT_EMAIL} or WhatsApp ${WHATSAPP}</p>
        </div>`;
    }

    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "Songa Travel <onboarding@resend.dev>",
        to: [to_email],
        subject,
        html,
      }),
    });

    if (!res.ok) {
      const err = await res.text();
      console.error("Resend error:", err);
      return jsonResponse({ error: "Failed to send email" }, 500);
    }

    const data = await res.json();
    return jsonResponse({ success: true, id: data.id }, 200);
  } catch (err) {
    console.error("Email error:", err);
    return jsonResponse({ error: "Internal server error" }, 500);
  }
});
