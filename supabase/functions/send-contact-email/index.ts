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
    const { name, email, message } = await req.json();

    if (!name?.trim() || !email?.trim() || !message?.trim()) {
      return jsonResponse({ error: "All fields are required" }, 400);
    }

    const sanitizedName = String(name).trim().slice(0, 100);
    const sanitizedEmail = String(email).trim().slice(0, 255);
    const sanitizedMessage = String(message).trim().slice(0, 1000);

    // Store in database
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabaseAdmin = createClient(supabaseUrl, serviceKey);

    const { error: dbError } = await supabaseAdmin
      .from("contact_messages")
      .insert({ name: sanitizedName, email: sanitizedEmail, message: sanitizedMessage });

    if (dbError) {
      console.error("Failed to store contact message:", dbError);
    }

    // Send email via Resend
    const apiKey = Deno.env.get("RESEND_API_KEY");
    if (!apiKey) {
      console.error("RESEND_API_KEY not configured");
      return jsonResponse({ success: true, email_sent: false }, 200);
    }

    const html = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 40px 20px;">
      <h2 style="color: #0F766E; margin: 0 0 24px;">New Contact Message</h2>
      <table style="width: 100%; border-collapse: collapse;">
        <tr><td style="padding: 8px 0; color: #6B7280; font-size: 14px;">Name</td><td style="padding: 8px 0; font-size: 14px; font-weight: 600;">${sanitizedName}</td></tr>
        <tr><td style="padding: 8px 0; color: #6B7280; font-size: 14px;">Email</td><td style="padding: 8px 0; font-size: 14px;"><a href="mailto:${sanitizedEmail}">${sanitizedEmail}</a></td></tr>
      </table>
      <div style="margin-top: 16px; padding: 16px; background: #f9fafb; border-radius: 8px;">
        <p style="margin: 0; font-size: 14px; white-space: pre-wrap;">${sanitizedMessage}</p>
      </div>
    </div>`;

    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "Songa Travel <onboarding@resend.dev>",
        to: ["salmajeods11@gmail.com"],
        reply_to: sanitizedEmail,
        subject: `New Contact Message – ${sanitizedName}`,
        html,
      }),
    });

    if (!res.ok) {
      const err = await res.text();
      console.error("Resend error:", err);
      return jsonResponse({ success: true, email_sent: false }, 200);
    }

    await res.json();
    return jsonResponse({ success: true, email_sent: true }, 200);
  } catch (err) {
    console.error("Contact form error:", err);
    return jsonResponse({ error: "Internal server error" }, 500);
  }
});
