import test from "node:test";
import assert from "node:assert/strict";
import { createStripeWebhookHandler } from "../supabase/functions/stripe-webhook/core.mjs";

const USER_ID = "11111111-1111-4111-8111-111111111111";
const BASE_CONFIG = {
  webhookSecret: "whsec_test_fixture",
  supabaseUrl: "https://fixture.supabase.co",
  serviceRoleKey: "service-role-fixture",
  expectedLivemode: "false",
  cryptoProvider: { name: "fixture-crypto" },
};

function request(rawBody = '{"raw": "payload"}', signature = "t=1,v1=fixture", method = "POST") {
  return new Request("https://function.test/stripe-webhook", {
    method,
    headers: signature ? { "Stripe-Signature": signature } : {},
    body: method === "GET" || method === "HEAD" ? undefined : rawBody,
  });
}

function event(overrides = {}) {
  return {
    id: "evt_fixture_1",
    type: "customer.subscription.updated",
    created: 1794500000,
    livemode: false,
    data: { object: { id: "sub_fixture_1" } },
    ...overrides,
  };
}

function makeStripe(eventValue, subscriptionValue = null, onVerify = () => {}) {
  return {
    webhooks: {
      constructEventAsync: async (...args) => {
        onVerify(...args);
        return eventValue;
      },
    },
    subscriptions: {
      retrieve: async id => {
        assert.equal(id, subscriptionValue?.id);
        return subscriptionValue;
      },
    },
  };
}

function makeFetch(rpcResult = "processed", calls = []) {
  return async (url, options) => {
    calls.push({ url, options });
    return new Response(JSON.stringify(rpcResult), { status: 200 });
  };
}

function makeSubscription(overrides = {}) {
  return {
    id: "sub_fixture_1",
    metadata: { user_id: USER_ID, plan: "basic" },
    status: "active",
    customer: "cus_fixture_1",
    current_period_start: 1794000000,
    current_period_end: 1796678400,
    cancel_at_period_end: false,
    ...overrides,
  };
}

test("rejects non-POST requests", async () => {
  const handler = createStripeWebhookHandler({ ...BASE_CONFIG });
  const response = await handler(request("", "", "GET"));
  assert.equal(response.status, 405);
});

test("fails closed when expected Stripe mode is not explicitly configured", async () => {
  const handler = createStripeWebhookHandler({
    ...BASE_CONFIG,
    stripe: makeStripe(event()),
    expectedLivemode: undefined,
  });
  const response = await handler(request());
  assert.equal(response.status, 500);
});

test("rejects a missing Stripe signature without parsing or writing", async () => {
  const calls = [];
  const handler = createStripeWebhookHandler({
    ...BASE_CONFIG,
    stripe: makeStripe(event()),
    fetchImpl: makeFetch("processed", calls),
  });
  const response = await handler(request('{"x":1}', ""));
  assert.equal(response.status, 400);
  assert.equal(calls.length, 0);
});

test("passes the exact raw body and signature to Stripe verification", async () => {
  const rawBody = '{ "id" : "evt_raw", "spacing" : [1,  2] }';
  let verifiedArgs;
  const calls = [];
  const handler = createStripeWebhookHandler({
    ...BASE_CONFIG,
    stripe: makeStripe(event(), null, (...args) => { verifiedArgs = args; }),
    fetchImpl: makeFetch("ignored", calls),
  });
  const response = await handler(request(rawBody, "sig-raw"));
  assert.equal(response.status, 200);
  assert.equal(verifiedArgs[0], rawBody);
  assert.equal(verifiedArgs[1], "sig-raw");
  assert.equal(verifiedArgs[2], BASE_CONFIG.webhookSecret);
  assert.equal(verifiedArgs[4], BASE_CONFIG.cryptoProvider);
  assert.equal(calls.length, 1);
});

test("rejects invalid signatures and performs no database request", async () => {
  const calls = [];
  const stripe = makeStripe(event());
  stripe.webhooks.constructEventAsync = async () => { throw new Error("bad signature"); };
  const handler = createStripeWebhookHandler({
    ...BASE_CONFIG, stripe, fetchImpl: makeFetch("processed", calls),
  });
  const response = await handler(request());
  assert.equal(response.status, 400);
  assert.equal(calls.length, 0);
});

test("rejects live/test mode mismatch before any RPC", async () => {
  const calls = [];
  const handler = createStripeWebhookHandler({
    ...BASE_CONFIG,
    stripe: makeStripe(event({ livemode: true })),
    fetchImpl: makeFetch("processed", calls),
  });
  const response = await handler(request());
  assert.equal(response.status, 400);
  assert.equal(calls.length, 0);
});

test("subscription event uses verified event.created and calls only the atomic RPC", async () => {
  const calls = [];
  const subscription = makeSubscription();
  const handler = createStripeWebhookHandler({
    ...BASE_CONFIG,
    stripe: makeStripe(event(), subscription),
    fetchImpl: makeFetch("processed", calls),
  });
  const response = await handler(request());
  assert.equal(response.status, 200);
  const body = await response.json();
  assert.equal(body.status, "processed");
  assert.equal(calls.length, 1);
  assert.equal(calls[0].url, BASE_CONFIG.supabaseUrl + "/rest/v1/rpc/process_stripe_webhook_event");
  const args = JSON.parse(calls[0].options.body);
  assert.equal(args.p_provider_event_id, "evt_fixture_1");
  assert.equal(args.p_event_created_at, new Date(1794500000 * 1000).toISOString());
  assert.equal(args.p_apply_subscription, true);
  assert.equal(args.p_user_id, USER_ID);
  assert.equal(args.p_plan_code, "basic");
  assert.equal(args.p_subscription_status, "active");
  assert.equal(args.p_provider_subscription_id, "sub_fixture_1");
  assert.equal(args.p_current_period_start, new Date(1794000000 * 1000).toISOString());
  assert.equal(args.p_current_period_end, new Date(1796678400 * 1000).toISOString());
  assert.equal(calls[0].options.headers.Authorization, "Bearer " + BASE_CONFIG.serviceRoleKey);
});

test("checkout completion falls back to session metadata only when subscription metadata is absent", async () => {
  const calls = [];
  const checkoutEvent = event({
    type: "checkout.session.completed",
    data: { object: { mode: "subscription", subscription: "sub_fixture_1", metadata: { user_id: USER_ID, plan: "pro" } } },
  });
  const subscription = makeSubscription({ metadata: {} });
  const handler = createStripeWebhookHandler({
    ...BASE_CONFIG,
    stripe: makeStripe(checkoutEvent, subscription),
    fetchImpl: makeFetch("processed", calls),
  });
  const response = await handler(request());
  assert.equal(response.status, 200);
  const args = JSON.parse(calls[0].options.body);
  assert.equal(args.p_plan_code, "pro");
  assert.equal(args.p_user_id, USER_ID);
});

test("missing trusted metadata records event as ignored without subscription write", async () => {
  const calls = [];
  const subscription = makeSubscription({ metadata: {} });
  const handler = createStripeWebhookHandler({
    ...BASE_CONFIG,
    stripe: makeStripe(event(), subscription),
    fetchImpl: makeFetch("ignored", calls),
  });
  const response = await handler(request());
  assert.equal(response.status, 200);
  const args = JSON.parse(calls[0].options.body);
  assert.equal(args.p_apply_subscription, false);
  assert.equal(args.p_user_id, null);
  assert.equal(args.p_plan_code, null);
  assert.equal(args.p_provider_subscription_id, null);
});

test("invoice.payment_failed preserves Stripe's retrieved active status", async () => {
  const calls = [];
  const invoiceEvent = event({
    type: "invoice.payment_failed",
    data: { object: { subscription: "sub_fixture_1" } },
  });
  const subscription = makeSubscription({ status: "active" });
  const handler = createStripeWebhookHandler({
    ...BASE_CONFIG,
    stripe: makeStripe(invoiceEvent, subscription),
    fetchImpl: makeFetch("processed", calls),
  });
  const response = await handler(request());
  assert.equal(response.status, 200);
  const args = JSON.parse(calls[0].options.body);
  assert.equal(args.p_subscription_status, "active");
});

test("unknown event is recorded as ignored without Stripe subscription retrieval", async () => {
  const calls = [];
  let retrieved = false;
  const stripe = makeStripe(event({ type: "customer.created", data: { object: { id: "cus_1" } } }), null);
  stripe.subscriptions.retrieve = async () => { retrieved = true; throw new Error("should not retrieve"); };
  const handler = createStripeWebhookHandler({
    ...BASE_CONFIG,
    stripe,
    fetchImpl: makeFetch("ignored", calls),
  });
  const response = await handler(request());
  assert.equal(response.status, 200);
  assert.equal(retrieved, false);
  const args = JSON.parse(calls[0].options.body);
  assert.equal(args.p_apply_subscription, false);
});

test("duplicate RPC result is acknowledged without a second direct write", async () => {
  const calls = [];
  const handler = createStripeWebhookHandler({
    ...BASE_CONFIG,
    stripe: makeStripe(event(), makeSubscription()),
    fetchImpl: makeFetch("duplicate", calls),
  });
  const response = await handler(request());
  assert.equal(response.status, 200);
  const body = await response.json();
  assert.equal(body.status, "duplicate");
  assert.equal(body.processed, false);
  assert.equal(calls.length, 1);
});

test("RPC failures return 500 so Stripe can retry", async () => {
  const handler = createStripeWebhookHandler({
    ...BASE_CONFIG,
    stripe: makeStripe(event(), makeSubscription()),
    fetchImpl: async () => new Response('{"message":"database unavailable"}', { status: 500 }),
  });
  const response = await handler(request());
  assert.equal(response.status, 500);
});

test("unknown RPC response is treated as processing failure", async () => {
  const handler = createStripeWebhookHandler({
    ...BASE_CONFIG,
    stripe: makeStripe(event(), makeSubscription()),
    fetchImpl: makeFetch("unexpected"),
  });
  const response = await handler(request());
  assert.equal(response.status, 500);
});
