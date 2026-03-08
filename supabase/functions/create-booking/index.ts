import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

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

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return jsonResponse({ error: "Not authenticated" }, 401);
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabaseAdmin = createClient(supabaseUrl, serviceKey);

    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } = await userClient.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) {
      return jsonResponse({ error: "Invalid session" }, 401);
    }
    const userId = claimsData.claims.sub as string;
    const userEmail = claimsData.claims.email as string;

    const { tour_id, start_date, guests_count, phone_number, special_requests } = await req.json();

    if (!tour_id || !start_date || !guests_count || !phone_number) {
      return jsonResponse({ error: "Missing required fields" }, 400);
    }

    const normalizedPhone = String(phone_number).trim();
    if (normalizedPhone.length < 7 || normalizedPhone.length > 24) {
      return jsonResponse({ error: "Please provide a valid phone number" }, 400);
    }

    const guestsNum = Number(guests_count);
    if (!Number.isInteger(guestsNum) || guestsNum < 1 || guestsNum > 100) {
      return jsonResponse({ error: "Invalid guest count" }, 400);
    }

    const parsedDate = new Date(start_date);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (isNaN(parsedDate.getTime()) || parsedDate < today) {
      return jsonResponse({ error: "Start date must be today or in the future" }, 400);
    }

    const sanitizedRequests = special_requests ? String(special_requests).trim().slice(0, 1000) : null;

    // Fetch tour server-side
    const { data: tour, error: tourError } = await supabaseAdmin
      .from("tours")
      .select("id, price_per_person, discount_price, max_group_size, max_total_slots, status, title, whatsapp_group_link, duration_days")
      .eq("id", tour_id)
      .single();

    if (tourError || !tour) {
      return jsonResponse({ error: "Tour not found" }, 404);
    }

    // Block booking on non-published tours
    if (tour.status !== "published") {
      return jsonResponse({ error: "This tour is not available for booking" }, 400);
    }

    if (guestsNum > tour.max_group_size) {
      return jsonResponse({ error: `Maximum group size is ${tour.max_group_size}` }, 400);
    }

    // Check capacity
    const { data: activeBookings, error: activeBookingsError } = await supabaseAdmin
      .from("bookings")
      .select("guests_count")
      .eq("tour_id", tour.id)
      .eq("start_date", start_date)
      .in("status", ["pending", "paid"]);

    if (activeBookingsError) {
      console.error("Failed to check capacity:", activeBookingsError);
      return jsonResponse({ error: "Could not verify availability" }, 500);
    }

    const alreadyBookedSlots = (activeBookings || []).reduce((sum, b) => sum + Number(b.guests_count || 0), 0);
    const remainingSlots = Number(tour.max_total_slots) - alreadyBookedSlots;
    if (guestsNum > remainingSlots) {
      return jsonResponse({
        error: remainingSlots <= 0
          ? "This departure is sold out. Please choose another date."
          : `Only ${remainingSlots} slot(s) left for this date.`,
      }, 409);
    }

    // Prevent duplicate pending bookings
    const { data: existing } = await supabaseAdmin
      .from("bookings")
      .select("id")
      .eq("tour_id", tour.id)
      .eq("user_id", userId)
      .eq("start_date", start_date)
      .eq("status", "pending")
      .maybeSingle();

    if (existing) {
      return jsonResponse({ error: "You already have a pending booking for this tour on this date" }, 409);
    }

    // Price calculation
    const effectivePrice =
      tour.discount_price != null && Number(tour.discount_price) < Number(tour.price_per_person)
        ? Number(tour.discount_price)
        : Number(tour.price_per_person);
    const totalPrice = effectivePrice * guestsNum;

    // Calculate end_date
    const endDate = new Date(parsedDate);
    endDate.setDate(endDate.getDate() + (Number(tour.duration_days) - 1));
    const endDateStr = endDate.toISOString().split("T")[0];

    // Insert booking
    const { data: booking, error: insertError } = await supabaseAdmin
      .from("bookings")
      .insert({
        tour_id: tour.id,
        user_id: userId,
        start_date,
        end_date: endDateStr,
        guests_count: guestsNum,
        phone_number: normalizedPhone,
        special_requests: sanitizedRequests,
        total_price: totalPrice,
        status: "pending",
        balance_due: totalPrice,
        deposit_amount: 0,
      })
      .select("id, total_price, status, booking_reference")
      .single();

    if (insertError) {
      console.error("Booking insert error:", insertError);
      return jsonResponse({ error: "Failed to create booking" }, 500);
    }

    // Get user profile for name
    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("full_name")
      .eq("id", userId)
      .single();

    // Send confirmation email (fire-and-forget)
    const emailUrl = `${supabaseUrl}/functions/v1/send-booking-email`;
    fetch(emailUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${serviceKey}`,
      },
      body: JSON.stringify({
        to_email: userEmail,
        to_name: profile?.full_name || "",
        booking_id: booking.id,
        tour_title: tour.title,
        start_date,
        guests_count: guestsNum,
        total_price: totalPrice,
        whatsapp_group_link: tour.whatsapp_group_link,
        type: "confirmation",
      }),
    }).catch((e) => console.error("Email send failed (non-blocking):", e));

    return jsonResponse({
      booking,
      whatsapp_group_link: tour.whatsapp_group_link,
      remaining_slots: remainingSlots - guestsNum,
      max_total_slots: tour.max_total_slots,
    }, 201);
  } catch (err) {
    console.error("Unexpected error:", err);
    return jsonResponse({ error: "Internal server error" }, 500);
  }
});
