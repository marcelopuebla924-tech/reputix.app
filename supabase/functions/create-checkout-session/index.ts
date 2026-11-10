import Stripe from "npm:stripe";

const allowedOrigins = new Set([
  "https://reputixapp.com",
  "https://www.reputixapp.com",
  "https://marcelopuebla924-tech.github.io",
]);

function corsHeaders(origin: string | null) {
  const allowedOrigin = origin && allowedOrigins.has(origin) ? origin : "https://reputixapp.com";
  return {
    "Access-Control-Allow-Origin": allowedOrigin,
    "Access-Control-Allow-Headers": "authorization, apikey, content-type, x-client-info",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Vary": "Origin",
  };
}

function json(body: unknown, status = 200, origin: string | null = null) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders(origin), "Content-Type": "application/json" },
  });
}

function getPublishableKey(): string | null {
  const keys = Deno.env.get("SUPABASE_PUBLISHABLE_KEYS");
  if (keys) {
    try {
      const parsed = JSON.parse(keys);
      if (typeof parsed?.default === "string" && parsed.default) return parsed.default;
    } catch {
      console.error("SUPABASE_PUBLISHABLE_KEYS is not valid JSON");
    }
  }
  return Deno.env.get("SUPABASE_ANON_KEY") || null;
}

Deno.serve(async (req: Request) => {
  const origin = req.headers.get("Origin");
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders(origin) });
  }
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405, origin);

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const publishableKey = getPublishableKey();
  const authorization = req.headers.get("Authorization");
  if (!supabaseUrl || !publishableKey || !authorization?.startsWith("Bearer ")) {
    return json({ error: "A valid Reputix sign-in is required." }, 401, origin);
  }

  const userResponse = await fetch(`${supabaseUrl}/auth/v1/user`, {
    headers: { apikey: publishableKey, Authorization: authorization },
  });
  if (!userResponse.ok) return json({ error: "Your Reputix session is invalid or expired." }, 401, origin);
  const user = await userResponse.json();
  if (!user?.id) return json({ error: "A signed-in Reputix account is required." }, 401, origin);

  let body: { plan?: unknown };
  try {
    body = await req.json();
  } catch {
    return json({ error: "Invalid request body." }, 400, origin);
  }

  const plan = body?.plan;
  if (plan !== "basic" && plan !== "pro") {
    return json({ error: "Choose the Basic or Pro plan." }, 400, origin);
  }

  const stripeSecretKey = Deno.env.get("STRIPE_SECRET_KEY");
  const priceId = Deno.env.get(plan === "basic" ? "STRIPE_PRICE_BASIC" : "STRIPE_PRICE_PRO");
  if (!stripeSecretKey || !priceId) {
    return json({
      error: "Stripe is not fully configured. Add STRIPE_SECRET_KEY and both Stripe Price IDs to Supabase Function Secrets.",
    }, 503, origin);
  }

  try {
    const stripe = new Stripe(stripeSecretKey);
    const session = await stripe.checkout.sessions.create({
      ui_mode: "hosted_page",
      mode: "subscription",
      billing_address_collection: "auto",
      phone_number_collection: { enabled: false },
      automatic_tax: { enabled: false },
      allow_promotion_codes: false,
      payment_method_collection: "always",
      submit_type: "auto",
      name_collection: {
        individual: { enabled: true },
        business: { enabled: true },
      },
      integration_identifier: "hosted_mobile_app_0001",
      origin_context: "mobile_app",
      success_url: "https://reputixapp.com/?checkout=success&session_id={CHECKOUT_SESSION_ID}",
      cancel_url: "https://reputixapp.com/?checkout=cancelled",
      line_items: [{ price: priceId, quantity: 1 }],
      client_reference_id: user.id,
      metadata: { user_id: user.id, plan },
      subscription_data: { metadata: { user_id: user.id, plan } },
    });
    if (!session.url) return json({ error: "Stripe did not return a checkout URL." }, 502, origin);
    return json({ url: session.url, session_id: session.id }, 200, origin);
  } catch (error) {
    console.error("Stripe Checkout session creation failed:", error);
    return json({ error: "Could not create the Stripe Checkout session." }, 502, origin);
  }
});
