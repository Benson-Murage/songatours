import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Not authenticated" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get user from token
    const userClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_PUBLISHABLE_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: userError } = await userClient.auth.getUser();
    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Invalid session" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { tour_id, start_date, guests_count } = await req.json();

    // Validate inputs
    if (!tour_id || !start_date || !guests_count) {
      return new Response(JSON.stringify({ error: "Missing required fields" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (guests_count < 1 || guests_count > 100) {
      return new Response(JSON.stringify({ error: "Invalid guest count" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const parsedDate = new Date(start_date);
    if (isNaN(parsedDate.getTime()) || parsedDate < new Date()) {
      return new Response(JSON.stringify({ error: "Start date must be in the future" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fetch tour server-side to get real price
    const { data: tour, error: tourError } = await supabase
      .from("tours")
      .select("id, price_per_person, discount_price, max_group_size, status")
      .eq("id", tour_id)
      .eq("status", "published")
      .single();

    if (tourError || !tour) {
      return new Response(JSON.stringify({ error: "Tour not found or not available" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (guests_count > tour.max_group_size) {
      return new Response(
        JSON.stringify({ error: `Maximum group size is ${tour.max_group_size}` }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Server-side price calculation — never trust frontend
    const effectivePrice =
      tour.discount_price != null && Number(tour.discount_price) < Number(tour.price_per_person)
        ? Number(tour.discount_price)
        : Number(tour.price_per_person);
    const totalPrice = effectivePrice * guests_count;

    // Insert booking using service role
    const { data: booking, error: insertError } = await supabase
      .from("bookings")
      .insert({
        tour_id: tour.id,
        user_id: user.id,
        start_date,
        guests_count,
        total_price: totalPrice,
        status: "pending",
      })
      .select("id, total_price, status")
      .single();

    if (insertError) {
      console.error("Booking insert error:", insertError);
      return new Response(JSON.stringify({ error: "Failed to create booking" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ booking }), {
      status: 201,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("Unexpected error:", err);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
