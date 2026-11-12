const UUID_PATTERN = /^[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}$/i;
const ALLOWED_RPC_RESULTS = new Set(["duplicate", "processed", "ignored"]);

function json(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function idOf(value) {
  if (typeof value === "string") return value;
  if (value && typeof value === "object" && typeof value.id === "string") return value.id;
  return null;
}

function isoFromUnix(value) {
  if (!Number.isInteger(value) || value < 0) return null;
  return new Date(value * 1000).toISOString();
}

function subscriptionIdForEvent(event) {
  const object = event?.data?.object ?? {};
  if (event.type === "checkout.session.completed" && object.mode === "subscription") {
    return idOf(object.subscription);
  }
  if (
    event.type === "customer.subscription.created" ||
    event.type === "customer.subscription.updated" ||
    event.type === "customer.subscription.deleted"
  ) {
    return idOf(object);
  }
  if (event.type === "invoice.payment_failed" || event.type === "invoice.paid") {
    return idOf(object.subscription) ??
      idOf(object.parent?.subscription_details?.subscription);
  }
  return null;
}

function shouldSyncSubscription(event) {
  const object = event?.data?.object ?? {};
  if (event.type === "checkout.session.completed") return object.mode === "subscription";
  return event.type === "customer.subscription.created" ||
    event.type === "customer.subscription.updated" ||
    event.type === "customer.subscription.deleted" ||
    event.type === "invoice.payment_failed" ||
    event.type === "invoice.paid";
}

async function parseRpcStatus(response) {
  const responseText = await response.text();
  if (!response.ok) {
    throw new Error("Subscription event RPC failed with HTTP " + response.status);
  }
  let result;
  try {
    result = JSON.parse(responseText);
  } catch {
    throw new Error("Subscription event RPC returned invalid JSON");
  }
  if (!ALLOWED_RPC_RESULTS.has(result)) {
    throw new Error("Subscription event RPC returned an unexpected result");
  }
  return result;
}

export function createStripeWebhookHandler({
  stripe,
  cryptoProvider,
  webhookSecret,
  supabaseUrl,
  serviceRoleKey,
  expectedLivemode,
  restBasePath = "/rest/v1",
  fetchImpl = fetch,
}) {
  return async function handleStripeWebhook(request) {
    if (request.method !== "POST") return json({ error: "Method not allowed" }, 405);

    if (
      !stripe ||
      !webhookSecret ||
      !supabaseUrl ||
      !serviceRoleKey ||
      (expectedLivemode !== "true" && expectedLivemode !== "false")
    ) {
      return json({ error: "Webhook is not fully configured" }, 500);
    }

    const signature = request.headers.get("Stripe-Signature");
    if (!signature) return json({ error: "Missing Stripe-Signature" }, 400);

    // Read the body exactly once and pass the untouched text to Stripe's verifier.
    const rawBody = await request.text();
    let event;
    try {
      event = await stripe.webhooks.constructEventAsync(
        rawBody,
        signature,
        webhookSecret,
        undefined,
        cryptoProvider,
      );
    } catch {
      return json({ error: "Invalid webhook signature" }, 400);
    }

    if (event.livemode !== (expectedLivemode === "true")) {
      return json({ error: "Webhook mode does not match configured environment" }, 400);
    }

    const eventCreatedAt = isoFromUnix(event.created);
    if (!event.id || !event.type || !eventCreatedAt) {
      return json({ error: "Verified Stripe event is missing required fields" }, 400);
    }

    try {
      let subscription = null;
      let fallbackMetadata = {};

      if (shouldSyncSubscription(event)) {
        const subscriptionId = subscriptionIdForEvent(event);
        if (subscriptionId) {
          subscription = await stripe.subscriptions.retrieve(subscriptionId);
          if (event.type === "checkout.session.completed") {
            fallbackMetadata = event.data.object?.metadata ?? {};
          }
        }
      }

      const metadata = {
        ...(fallbackMetadata ?? {}),
        ...(subscription?.metadata ?? {}),
      };
      const userId = typeof metadata.user_id === "string" && UUID_PATTERN.test(metadata.user_id)
        ? metadata.user_id
        : null;
      const plan = metadata.plan === "basic" || metadata.plan === "pro"
        ? metadata.plan
        : null;
      const subscriptionId = subscription && typeof subscription.id === "string"
        ? subscription.id
        : null;
      const applySubscription = Boolean(userId && plan && subscriptionId);

      const rpcArgs = {
        p_provider_event_id: event.id,
        p_event_type: event.type,
        p_event_created_at: eventCreatedAt,
        p_apply_subscription: applySubscription,
        p_user_id: applySubscription ? userId : null,
        p_plan_code: applySubscription ? plan : null,
        p_subscription_status: applySubscription ? subscription.status : null,
        p_provider_customer_id: applySubscription ? idOf(subscription.customer) : null,
        p_provider_subscription_id: applySubscription ? subscriptionId : null,
        p_current_period_start: applySubscription
          ? isoFromUnix(subscription.current_period_start)
          : null,
        p_current_period_end: applySubscription
          ? isoFromUnix(subscription.current_period_end)
          : null,
        p_cancel_at_period_end: applySubscription
          ? Boolean(subscription.cancel_at_period_end)
          : false,
      };

      const baseUrl = supabaseUrl.replace(/\/+$/, "");
      const normalizedRestPath = String(restBasePath).replace(/^\/+|\/+$/g, "");
      const rpcPath = (normalizedRestPath ? "/" + normalizedRestPath : "") +
        "/rpc/process_stripe_webhook_event";
      const rpcResponse = await fetchImpl(
        baseUrl + rpcPath,
        {
          method: "POST",
          headers: {
            apikey: serviceRoleKey,
            Authorization: "Bearer " + serviceRoleKey,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(rpcArgs),
        },
      );

      const rpcStatus = await parseRpcStatus(rpcResponse);
      return json({
        received: true,
        status: rpcStatus,
        processed: rpcStatus === "processed",
      });
    } catch {
      // Do not log payloads, user metadata, tokens, or secret values.
      console.error("Stripe webhook processing failed", event.id);
      return json({ error: "Webhook processing failed; Stripe may retry this event." }, 500);
    }
  };
}
