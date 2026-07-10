import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) return json({ error: "Unauthorized" }, 401);

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
  const admin = createClient(supabaseUrl, serviceKey);
  const userClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authHeader } },
  });

  const { data: u, error: uErr } = await userClient.auth.getUser();
  if (uErr || !u?.user) return json({ error: "Invalid session" }, 401);
  const adminId = u.user.id;

  const { data: role } = await admin
    .from("user_roles")
    .select("role")
    .eq("user_id", adminId)
    .eq("role", "admin")
    .maybeSingle();
  if (!role) return json({ error: "Admins only" }, 403);

  const body = await req.json().catch(() => ({}));
  const {
    booking_id,
    participant_ids,
    undo = false,
    override = false,
    reason,
    device,
    gps,
    notes,
  } = body || {};

  if (!booking_id) return json({ error: "booking_id required" }, 400);

  const { data: booking, error: bErr } = await admin
    .from("bookings")
    .select("id, checked_in_at, guests_count")
    .eq("id", booking_id)
    .maybeSingle();
  if (bErr || !booking) return json({ error: "Booking not found" }, 404);

  const nowIso = new Date().toISOString();

  if (undo) {
    if (!reason) return json({ error: "Reason required to undo check-in" }, 400);
    if (Array.isArray(participant_ids) && participant_ids.length) {
      await admin
        .from("participants")
        .update({ checked_in_at: null, checked_in_by: null })
        .in("id", participant_ids);
    } else {
      await admin
        .from("bookings")
        .update({ checked_in_at: null, checked_in_by: null })
        .eq("id", booking_id);
      await admin
        .from("participants")
        .update({ checked_in_at: null, checked_in_by: null })
        .eq("booking_id", booking_id);
    }
    await admin.from("check_ins").insert({
      booking_id,
      admin_id: adminId,
      action: "undo",
      device,
      gps,
      notes: reason,
    });
    return json({ ok: true, undone: true });
  }

  if (Array.isArray(participant_ids) && participant_ids.length) {
    // Individual participants
    const { data: existing } = await admin
      .from("participants")
      .select("id, checked_in_at")
      .in("id", participant_ids);
    const already = (existing || []).filter((p) => p.checked_in_at);
    if (already.length && !override) {
      return json({ error: "Some participants already checked in", already: already.map((a) => a.id) }, 409);
    }
    await admin
      .from("participants")
      .update({ checked_in_at: nowIso, checked_in_by: adminId })
      .in("id", participant_ids);
    for (const pid of participant_ids) {
      await admin.from("check_ins").insert({
        booking_id,
        participant_id: pid,
        admin_id: adminId,
        action: "check_in",
        device,
        gps,
        notes,
      });
    }
  } else {
    if (booking.checked_in_at && !override) {
      return json({ error: "Booking already checked in" }, 409);
    }
    await admin
      .from("bookings")
      .update({ checked_in_at: nowIso, checked_in_by: adminId })
      .eq("id", booking_id);
    await admin
      .from("participants")
      .update({ checked_in_at: nowIso, checked_in_by: adminId })
      .eq("booking_id", booking_id)
      .is("checked_in_at", null);
    await admin.from("check_ins").insert({
      booking_id,
      admin_id: adminId,
      action: "check_in",
      device,
      gps,
      notes,
    });
  }

  return json({ ok: true, checked_in_at: nowIso });
});
