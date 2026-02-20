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

interface BookingEmailPayload {
  to_email: string;
  to_name: string;
  booking_id: string;
  tour_title: string;
  start_date: string;
  guests_count: number;
  total_price: number;
  type: "confirmation" | "cancellation";
}

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
    const { to_email, to_name, booking_id, tour_title, start_date, guests_count, total_price, type } = payload;

    if (!to_email || !booking_id || !tour_title) {
      return jsonResponse({ error: "Missing required fields" }, 400);
    }

    const formattedDate = new Date(start_date).toLocaleDateString("en-US", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });

    const isConfirmation = type === "confirmation";
    const subject = isConfirmation
      ? `Booking Confirmed — ${tour_title}`
      : `Booking Cancelled — ${tour_title}`;

    const html = isConfirmation
      ? `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 40px 20px;">
        <div style="text-align: center; margin-bottom: 32px;">
          <h1 style="color: #0F766E; font-size: 24px; margin: 0;">Songa Travel & Tours</h1>
        </div>
        <div style="background: #f9fafb; border-radius: 12px; padding: 32px; margin-bottom: 24px;">
          <h2 style="color: #111827; font-size: 20px; margin: 0 0 8px;">Booking Confirmed! 🎉</h2>
          <p style="color: #6B7280; font-size: 14px; margin: 0 0 24px;">Hi ${to_name || "Traveler"}, your adventure is booked.</p>
          <table style="width: 100%; border-collapse: collapse;">
            <tr><td style="padding: 8px 0; color: #6B7280; font-size: 14px;">Tour</td><td style="padding: 8px 0; color: #111827; font-size: 14px; font-weight: 600; text-align: right;">${tour_title}</td></tr>
            <tr><td style="padding: 8px 0; color: #6B7280; font-size: 14px;">Date</td><td style="padding: 8px 0; color: #111827; font-size: 14px; text-align: right;">${formattedDate}</td></tr>
            <tr><td style="padding: 8px 0; color: #6B7280; font-size: 14px;">Guests</td><td style="padding: 8px 0; color: #111827; font-size: 14px; text-align: right;">${guests_count}</td></tr>
            <tr style="border-top: 1px solid #e5e7eb;"><td style="padding: 12px 0; color: #111827; font-size: 16px; font-weight: 700;">Total</td><td style="padding: 12px 0; color: #0F766E; font-size: 16px; font-weight: 700; text-align: right;">$${Number(total_price).toLocaleString()}</td></tr>
          </table>
        </div>
        <p style="color: #6B7280; font-size: 13px; text-align: center;">Booking Reference: <strong>${booking_id.slice(0, 8).toUpperCase()}</strong></p>
        <p style="color: #9CA3AF; font-size: 12px; text-align: center; margin-top: 8px;">Free cancellation available. Contact info@songatravel.com for support.</p>
      </div>`
      : `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 40px 20px;">
        <div style="text-align: center; margin-bottom: 32px;">
          <h1 style="color: #0F766E; font-size: 24px; margin: 0;">Songa Travel & Tours</h1>
        </div>
        <div style="background: #fef2f2; border-radius: 12px; padding: 32px;">
          <h2 style="color: #111827; font-size: 20px; margin: 0 0 8px;">Booking Cancelled</h2>
          <p style="color: #6B7280; font-size: 14px; margin: 0 0 16px;">Hi ${to_name || "Traveler"}, your booking for <strong>${tour_title}</strong> on ${formattedDate} has been cancelled.</p>
          <p style="color: #6B7280; font-size: 13px;">Booking Reference: <strong>${booking_id.slice(0, 8).toUpperCase()}</strong></p>
        </div>
        <p style="color: #9CA3AF; font-size: 12px; text-align: center; margin-top: 24px;">Questions? Contact info@songatravel.com</p>
      </div>`;

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
