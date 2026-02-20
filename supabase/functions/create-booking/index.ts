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

    // Verify user via JWT claims
    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } = await userClient.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) {
      return jsonResponse({ error: "Invalid session" }, 401);
    }
    const userId = claimsData.claims.sub as string;

    const { tour_id, start_date, guests_count } = await req.json();

    // Validate inputs
    if (!tour_id || !start_date || !guests_count) {
      return jsonResponse({ error: "Missing required fields" }, 400);
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

    // Fetch tour server-side to get real price
    const { data: tour, error: tourError } = await supabaseAdmin
      .from("tours")
      .select("id, price_per_person, discount_price, max_group_size, status, title")
      .eq("id", tour_id)
      .eq("status", "published")
      .single();

    if (tourError || !tour) {
      return jsonResponse({ error: "Tour not found or not available" }, 404);
    }

    if (guestsNum > tour.max_group_size) {
      return jsonResponse({ error: `Maximum group size is ${tour.max_group_size}` }, 400);
    }

    // Prevent duplicate pending bookings for same tour+user+date
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

    // Server-side price calculation — never trust frontend
    const effectivePrice =
      tour.discount_price != null && Number(tour.discount_price) < Number(tour.price_per_person)
        ? Number(tour.discount_price)
        : Number(tour.price_per_person);
    const totalPrice = effectivePrice * guestsNum;

    // Insert booking
    const { data: booking, error: insertError } = await supabaseAdmin
      .from("bookings")
      .insert({
        tour_id: tour.id,
        user_id: userId,
        start_date,
        guests_count: guestsNum,
        total_price: totalPrice,
        status: "pending",
      })
      .select("id, total_price, status")
      .single();

    if (insertError) {
      console.error("Booking insert error:", insertError);
      return jsonResponse({ error: "Failed to create booking" }, 500);
    }

    return jsonResponse({ booking }, 201);
  } catch (err) {
    console.error("Unexpected error:", err);
    return jsonResponse({ error: "Internal server error" }, 500);
  }
});
