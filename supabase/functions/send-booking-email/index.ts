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
  to_email?: string;
  to_name?: string;
  booking_id: string;
  booking_reference?: string;
  tour_title?: string;
  start_date?: string;
  guests_count?: number;
  total_price?: number;
  whatsapp_group_link?: string | null;
  type:
    | "confirmation"
    | "cancellation"
    | "payment_update"
    | "proof_uploaded"
    | "payment_approved"
    | "payment_rejected"
    | "more_info_requested";
  // Payment fields (optional)
  amount_paid_now?: number;
  total_paid?: number;
  balance_due?: number;
  overpayment?: number;
  payment_method?: string;
  payment_reference?: string | null;
  review_reason?: string | null;
}

const LOGO_URL = "https://songatours.lovable.app/icons/songa-logo.png";
const SUPPORT_EMAIL = "salmajeods11@gmail.com";
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
    const PROOF_TYPES = ["proof_uploaded","payment_approved","payment_rejected","more_info_requested"];

    // Hydrate booking + customer data from DB for proof-related emails
    let hydrated = payload;
    if (PROOF_TYPES.includes(payload.type) && payload.booking_id) {
      try {
        const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
        const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
        const rest = async (path: string) => {
          const r = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
            headers: { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}` },
          });
          return r.ok ? await r.json() : [];
        };
        const bookings = await rest(
          `bookings?id=eq.${payload.booking_id}&select=booking_reference,start_date,guests_count,total_price,amount_paid,balance_due,overpayment_amount,user_id,tour_id,phone_number,tours(title,whatsapp_group_link)`,
        );
        const b = bookings?.[0];
        if (b) {
          hydrated = {
            ...payload,
            booking_reference: payload.booking_reference || b.booking_reference,
            tour_title: payload.tour_title || b.tours?.title || "Your tour",
            start_date: payload.start_date || b.start_date,
            guests_count: payload.guests_count || b.guests_count,
            total_price: payload.total_price ?? b.total_price,
            total_paid: payload.total_paid ?? b.amount_paid,
            balance_due: payload.balance_due ?? b.balance_due,
            overpayment: payload.overpayment ?? b.overpayment_amount,
            whatsapp_group_link: payload.whatsapp_group_link ?? b.tours?.whatsapp_group_link,
          };
          if (!hydrated.to_email && b.user_id) {
            const profs = await rest(`profiles?id=eq.${b.user_id}&select=email,full_name`);
            if (profs?.[0]) {
              hydrated.to_email = hydrated.to_email || profs[0].email;
              hydrated.to_name = hydrated.to_name || profs[0].full_name;
            }
          }
        }
      } catch (e) {
        console.error("hydrate error", e);
      }
    }

    const {
      to_email, to_name, booking_id, booking_reference, tour_title,
      start_date, guests_count, total_price, whatsapp_group_link, type,
      amount_paid_now, total_paid, balance_due, overpayment, payment_method, payment_reference,
      review_reason,
    } = hydrated;

    if (!booking_id || !type) {
      return jsonResponse({ error: "Missing required fields" }, 400);
    }
    // For proof emails, allow silent skip if no email available
    if (!to_email) {
      if (PROOF_TYPES.includes(type)) {
        return jsonResponse({ skipped: true, reason: "no recipient email" }, 200);
      }
      return jsonResponse({ error: "Missing recipient email" }, 400);
    }
    if (!tour_title) {
      return jsonResponse({ error: "Missing tour title" }, 400);
    }

    const displayRef = booking_reference || booking_id.slice(0, 8).toUpperCase();
    const formattedDate = start_date ? new Date(start_date).toLocaleDateString("en-US", {
      weekday: "long", year: "numeric", month: "long", day: "numeric",
    }) : "";

    let subject = "";
    let html = "";

    // Simple branded wrapper used by proof-related emails
    const wrap = (headerBg: string, headerColor: string, title: string, body: string) => `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 40px 20px; background:#ffffff;">
        <div style="text-align:center; margin-bottom:24px;"><img src="${LOGO_URL}" alt="Songa Travel & Tours" style="height:50px;" /></div>
        <div style="background:${headerBg}; border-radius:12px; padding:24px; margin-bottom:16px;">
          <h2 style="color:${headerColor}; font-size:20px; margin:0 0 6px;">${title}</h2>
          <p style="color:${headerColor}; font-size:14px; margin:0;">Hi ${to_name || "Traveler"}, this is an update on your booking for <strong>${tour_title}</strong>.</p>
        </div>
        ${body}
        <p style="color:#6B7280; font-size:13px; text-align:center;">Booking Reference: <strong>${displayRef}</strong></p>
        <p style="color:#9CA3AF; font-size:12px; text-align:center; margin-top:16px;">Questions? Contact ${SUPPORT_EMAIL} or WhatsApp ${WHATSAPP}</p>
      </div>`;

    const summaryTable = () => `
      <div style="background:#f9fafb; border-radius:12px; padding:20px; margin-bottom:16px;">
        <table style="width:100%; border-collapse:collapse; font-size:14px;">
          <tr><td style="padding:6px 0; color:#6B7280;">Tour total</td><td style="text-align:right; color:#111827;">${formatKES(Number(total_price || 0))}</td></tr>
          <tr><td style="padding:6px 0; color:#6B7280;">Total paid</td><td style="text-align:right; color:#0F766E; font-weight:700;">${formatKES(Number(total_paid ?? 0))}</td></tr>
          <tr style="border-top:1px solid #e5e7eb;"><td style="padding:10px 0; color:#111827; font-weight:700;">Balance</td><td style="text-align:right; color:${(balance_due ?? 0) > 0 ? "#D97706" : "#059669"}; font-weight:700;">${formatKES(Number(balance_due ?? 0))}</td></tr>
          ${(overpayment ?? 0) > 0 ? `<tr><td style="padding:6px 0; color:#7C3AED;">Overpayment credit</td><td style="text-align:right; color:#7C3AED; font-weight:700;">${formatKES(Number(overpayment))}</td></tr>` : ""}
        </table>
      </div>`;

    if (type === "proof_uploaded") {
      subject = `Payment proof received — ${tour_title}`;
      html = wrap("#eff6ff", "#1e40af", "Payment Proof Received 📤",
        `<p style="color:#374151; font-size:14px;">Thanks! We've received your ${payment_method?.replace(/_/g, " ") || "payment"} proof${amount_paid_now ? ` of <strong>${formatKES(Number(amount_paid_now))}</strong>` : ""}. Our team will verify it shortly and email you once it's confirmed.</p>` + summaryTable());
    } else if (type === "payment_approved") {
      subject = `Payment approved — ${tour_title}`;
      const isFull = (balance_due ?? 0) <= 0;
      html = wrap("#f0fdf4", "#065f46", isFull ? "Payment Approved — Paid in Full ✅" : "Payment Approved ✅",
        `<p style="color:#374151; font-size:14px;">Your payment${amount_paid_now ? ` of <strong>${formatKES(Number(amount_paid_now))}</strong>` : ""} has been verified and applied to your booking.</p>` + summaryTable());
    } else if (type === "payment_rejected") {
      subject = `Payment proof needs attention — ${tour_title}`;
      html = wrap("#fef2f2", "#991b1b", "Payment Proof Rejected",
        `<p style="color:#374151; font-size:14px;">We couldn't verify the payment proof you uploaded${review_reason ? `. Reason: <em>${review_reason}</em>` : "."} Please upload a new one from your dashboard.</p>` + summaryTable());
    } else if (type === "more_info_requested") {
      subject = `More information needed — ${tour_title}`;
      html = wrap("#fffbeb", "#92400e", "More Information Needed",
        `<p style="color:#374151; font-size:14px;">${review_reason ? review_reason : "Please share more details about your recent payment so we can verify it."} You can reply to this email or upload a clearer proof from your dashboard.</p>` + summaryTable());
    } else if (type === "payment_update") {
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
