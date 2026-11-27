import Stripe from "npm:stripe";

const stripeSecretKey = Deno.env.get("STRIPE_SECRET_KEY") ?? "";
const webhookSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET") ?? "";
const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

const stripe = stripeSecretKey ? new Stripe(stripeSecretKey) : null;
const cryptoProvider = Stripe.createSubtleCryptoProvider();

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

async function dbRequest(path: string, method: string, body?: unknown, prefer?: string) {
  const response = await fetch(`${supabaseUrl}/rest/v1/${path}`, {
    method,
    headers: {
      apikey: serviceRoleKey,
      Authorization: `Bearer ${serviceRoleKey}`,
      "Content-Type": "application/json",
      ...(prefer ? { Prefer: prefer } : {}),
    },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
  const responseText = await response.text();
  if (!response.ok) {
    throw new Error(`Supabase REST ${response.status}: ${responseText.slice(0, 500)}`);
  }
  return responseText;
}

function idOf(value: unknown): string | null {
  if (typeof value === "string") return value;
  if (value && typeof value === "object" && "id" in value) {
    const id = (value as { id?: unknown }).id;
    return typeof id === "string" ? id : null;
  }
  return null;
}

function isoFromUnix(value: unknown): string | null {
  return typeof value === "number" ? new Date(value * 1000).toISOString() : null;
}

async function syncSubscription(subscription: any, fallbackMetadata: Record<string, unknown> = {}) {
  const metadata = { ...(fallbackMetadata ?? {}), ...(subscription.metadata ?? {}) };
  const userId = typeof metadata.user_id === "string" ? metadata.user_id : null;
  const plan = metadata.plan;
  const subscriptionId = subscription.id;
  if (!userId || (plan !== "basic" && plan !== "pro") || !subscriptionId) {
    console.warn("Stripe subscription ignored: required user_id or plan metadata is missing", subscriptionId);
    return "ignored";
  }

  const customerId = idOf(subscription.customer);
  const row = {
    user_id: userId,
    plan_code: plan,
    status: subscription.status,
    provider: "stripe",
    provider_customer_id: customerId,
    provider_subscription_id: subscriptionId,
    current_period_start: isoFromUnix(subscription.current_period_start),
    current_period_end: isoFromUnix(subscription.current_period_end),
    cancel_at_period_end: Boolean(subscription.cancel_at_period_end),
    updated_at: new Date().toISOString(),
  };

  await dbRequest(
    "user_subscriptions?on_conflict=provider_subscription_id",
    "POST",
    row,
    "resolution=merge-duplicates,return=minimal",
  );
  return "processed";
}

Deno.serve(async (request: Request) => {
  if (request.method !== "POST") return json({ error: "Method not allowed" }, 405);
  if (!stripeSecretKey || !webhookSecret || !supabaseUrl || !serviceRoleKey || !stripe) {
    console.error("Stripe webhook is missing required server secrets");
    return json({ error: "Webhook is not fully configured" }, 500);
  }

  const signature = request.headers.get("Stripe-Signature");
  if (!signature) return json({ error: "Missing Stripe-Signature" }, 400);

  const rawBody = await request.text();
  let event: Stripe.Event;
  try {
    event = await stripe.webhooks.constructEventAsync(
      rawBody,
      signature,
      webhookSecret,
      undefined,
      cryptoProvider,
    );
  } catch (error) {
    console.error("Stripe webhook signature verification failed", error);
    return json({ error: "Invalid webhook signature" }, 400);
  }

  try {
    let processingStatus = "ignored";
    const object = event.data.object as any;

    if (event.type === "checkout.session.completed" && object.mode === "subscription") {
      const subscriptionId = idOf(object.subscription);
      if (subscriptionId) {
        const subscription = await stripe.subscriptions.retrieve(subscriptionId);
        processingStatus = await syncSubscription(subscription, object.metadata ?? {});
      }
    } else if (
      event.type === "customer.subscription.created" ||
      event.type === "customer.subscription.updated" ||
      event.type === "customer.subscription.deleted"
    ) {
      processingStatus = await syncSubscription(object);
    } else if (event.type === "invoice.payment_failed" || event.type === "invoice.paid") {
      const subscriptionId =
        idOf(object.subscription) ??
        idOf(object.parent?.subscription_details?.subscription);
      if (subscriptionId) {
        const subscription = await stripe.subscriptions.retrieve(subscriptionId);
        if (event.type === "invoice.payment_failed" && subscription.status === "active") {
          // Stripe may not have changed the subscription status yet; record the payment issue.
          subscription.status = "past_due";
        }
        processingStatus = await syncSubscription(subscription);
      }
    }

    await dbRequest(
      "payment_events",
      "POST",
      {
        provider: "stripe",
        provider_event_id: event.id,
        event_type: event.type,
        processing_status: processingStatus,
        processed_at: new Date().toISOString(),
      },
      "resolution=ignore-duplicates,return=minimal",
    );

    return json({ received: true, processed: processingStatus === "processed" });
  } catch (error) {
    console.error("Stripe webhook processing failed", event.id, error);
    return json({ error: "Webhook processing failed; Stripe may retry this event." }, 500);
  }
});
