import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
  const admin = createClient(supabaseUrl, serviceKey);

  const ip =
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    req.headers.get("cf-connecting-ip") ||
    "unknown";
  const ua = req.headers.get("user-agent") || "";

  // Rate limit: 15 req / IP / minute
  const { count } = await admin
    .from("verification_logs")
    .select("*", { count: "exact", head: true })
    .eq("ip", ip)
    .gte("created_at", new Date(Date.now() - 60_000).toISOString());
  if ((count ?? 0) > 15) {
    return json({ error: "Too many verification attempts. Please try again shortly." }, 429);
  }

  let body: any = {};
  try {
    body = await req.json();
  } catch {
    return json({ error: "Invalid JSON" }, 400);
  }
  const rawCode = String(body.code || body.verification_code || "").trim().toUpperCase();
  const ref = body.booking_reference ? String(body.booking_reference).trim().toUpperCase() : null;
  const receipt = body.receipt_number ? String(body.receipt_number).trim().toUpperCase() : null;

  if (!rawCode && !ref && !receipt) {
    return json({ error: "Provide a verification code, booking reference, or receipt number." }, 400);
  }

  // Check admin identity (optional). If present, we return full details.
  let isAdmin = false;
  const authHeader = req.headers.get("Authorization");
  let adminId: string | null = null;
  if (authHeader?.startsWith("Bearer ")) {
    try {
      const userClient = createClient(supabaseUrl, anonKey, {
        global: { headers: { Authorization: authHeader } },
      });
      const { data: userData } = await userClient.auth.getUser();
      if (userData?.user) {
        const { data: role } = await admin
          .from("user_roles")
          .select("role")
          .eq("user_id", userData.user.id)
          .eq("role", "admin")
          .maybeSingle();
        if (role) {
          isAdmin = true;
          adminId = userData.user.id;
        }
      }
    } catch (_) {}
  }

  let query = admin
    .from("bookings")
    .select(
      "id, booking_reference, verification_code, receipt_number, status, start_date, guests_count, total_price, amount_paid, balance_due, payment_status, checked_in_at, phone_number, user_id, tour_id, tours(title, destinations(name)), profiles:user_id(full_name, email)",
    )
    .limit(1);

  if (rawCode) query = query.eq("verification_code", rawCode);
  else if (receipt) query = query.eq("receipt_number", receipt);
  else if (ref) query = query.eq("booking_reference", ref);

  const { data: bookings, error } = await query;
  const booking = bookings?.[0] ?? null;

  await admin.from("verification_logs").insert({
    booking_id: booking?.id ?? null,
    code_tried: rawCode || ref || receipt,
    ip,
    user_agent: ua,
    admin_id: adminId,
    success: !!booking,
  });

  if (error || !booking) {
    return json({ verified: false, error: "Booking not found" }, 404);
  }

  const profile: any = (booking as any).profiles;
  const tour: any = (booking as any).tours;

  const publicResponse = {
    verified: true,
    booking_reference: booking.booking_reference,
    receipt_number: booking.receipt_number,
    verification_code: booking.verification_code,
    tour_title: tour?.title,
    destination: tour?.destinations?.name,
    start_date: booking.start_date,
    guests_count: booking.guests_count,
    payment_status: booking.payment_status,
    has_balance: Number(booking.balance_due ?? 0) > 0,
    checked_in: !!booking.checked_in_at,
    checked_in_at: booking.checked_in_at,
    booking_status: booking.status,
    customer_display_name: profile?.full_name
      ? profile.full_name.split(" ")[0] +
        (profile.full_name.split(" ")[1] ? " " + profile.full_name.split(" ")[1][0] + "." : "")
      : "Guest",
  };

  if (!isAdmin) return json(publicResponse);

  return json({
    ...publicResponse,
    admin: true,
    booking_id: booking.id,
    tour_id: booking.tour_id,
    user_id: booking.user_id,
    customer_full_name: profile?.full_name,
    customer_email: profile?.email,
    phone_number: booking.phone_number,
    total_price: booking.total_price,
    amount_paid: booking.amount_paid,
    balance_due: booking.balance_due,
  });
});
