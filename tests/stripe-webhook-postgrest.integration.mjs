import test from "node:test";
import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
import { execFileSync } from "node:child_process";
import Stripe from "stripe";
import { createStripeWebhookHandler } from "../supabase/functions/stripe-webhook/core.mjs";

const postgrestUrl = process.env.POSTGREST_URL;
const jwtSecret = process.env.POSTGREST_JWT_SECRET;
const databaseUrl = process.env.DATABASE_URL;
const webhookSecret = "whsec_postgrest_integration_fixture";
const userId = "11111111-1111-4111-8111-111111111111";
const subscriptionId = "sub_postgrest_integration";
const eventId = "evt_postgrest_integration";

function base64url(value) {
  return Buffer.from(value).toString("base64url");
}

function serviceRoleJwt() {
  const header = base64url(JSON.stringify({ alg: "HS256", typ: "JWT" }));
  const payload = base64url(JSON.stringify({
    role: "service_role",
    exp: Math.floor(Date.now() / 1000) + 600,
  }));
  const unsigned = header + "." + payload;
  const signature = createHmac("sha256", jwtSecret).update(unsigned).digest("base64url");
  return unsigned + "." + signature;
}

function readDatabase(query) {
  return execFileSync("psql", [
    databaseUrl,
    "-X",
    "-A",
    "-t",
    "-v",
    "ON_ERROR_STOP=1",
    "-c",
    query,
  ], { encoding: "utf8" }).trim();
}

test("real Stripe-signed event reaches local PostgREST atomic RPC and duplicate is acknowledged", async () => {
  assert.ok(postgrestUrl);
  assert.ok(jwtSecret && jwtSecret.length >= 32);
  assert.ok(databaseUrl);

  const stripe = new Stripe("sk_test_reputix_postgrest_fixture");
  const cryptoProvider = Stripe.createSubtleCryptoProvider();
  const token = serviceRoleJwt();
  const subscription = {
    id: subscriptionId,
    metadata: { user_id: userId, plan: "basic" },
    status: "active",
    customer: "cus_postgrest_integration",
    current_period_start: Math.floor(Date.now() / 1000) - 60,
    current_period_end: Math.floor(Date.now() / 1000) + 86400,
    cancel_at_period_end: false,
  };
  stripe.subscriptions.retrieve = async id => {
    assert.equal(id, subscriptionId);
    return subscription;
  };

  const handler = createStripeWebhookHandler({
    stripe,
    cryptoProvider,
    webhookSecret,
    supabaseUrl: postgrestUrl,
    serviceRoleKey: token,
    expectedLivemode: "false",
    restBasePath: "",
    fetchImpl: fetch,
  });

  const event = {
    id: eventId,
    type: "customer.subscription.updated",
    created: Math.floor(Date.now() / 1000),
    livemode: false,
    data: { object: { id: subscriptionId } },
  };
  const rawBody = JSON.stringify(event);
  const signature = stripe.webhooks.generateTestHeaderString({
    payload: rawBody,
    secret: webhookSecret,
    timestamp: Math.floor(Date.now() / 1000),
  });
  const request = () => new Request(postgrestUrl + "/stripe-webhook", {
    method: "POST",
    headers: { "Stripe-Signature": signature },
    body: rawBody,
  });

  const first = await handler(request());
  assert.equal(first.status, 200);
  assert.deepEqual(await first.json(), { received: true, status: "processed", processed: true });

  const duplicate = await handler(request());
  assert.equal(duplicate.status, 200);
  assert.deepEqual(await duplicate.json(), { received: true, status: "duplicate", processed: false });

  const state = readDatabase(
    "select (select count(*) from public.payment_events where provider_event_id='" + eventId + "')::text || ':' || " +
    "(select status from public.user_subscriptions where provider_subscription_id='" + subscriptionId + "')"
  );
  assert.equal(state, "1:active");
});

test("unknown signed event reaches RPC and is persisted as ignored", async () => {
  const stripe = new Stripe("sk_test_reputix_postgrest_fixture");
  const cryptoProvider = Stripe.createSubtleCryptoProvider();
  const token = serviceRoleJwt();
  const handler = createStripeWebhookHandler({
    stripe,
    cryptoProvider,
    webhookSecret,
    supabaseUrl: postgrestUrl,
    serviceRoleKey: token,
    expectedLivemode: "false",
    fetchImpl: fetch,
  });
  const event = {
    id: "evt_postgrest_unknown",
    type: "customer.created",
    created: Math.floor(Date.now() / 1000),
    livemode: false,
    data: { object: { id: "cus_unknown" } },
  };
  const rawBody = JSON.stringify(event);
  const signature = stripe.webhooks.generateTestHeaderString({
    payload: rawBody,
    secret: webhookSecret,
    timestamp: Math.floor(Date.now() / 1000),
  });
  const response = await handler(new Request(postgrestUrl + "/stripe-webhook", {
    method: "POST",
    headers: { "Stripe-Signature": signature },
    body: rawBody,
  }));
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { received: true, status: "ignored", processed: false });
  const status = readDatabase(
    "select processing_status from public.payment_events where provider_event_id='evt_postgrest_unknown'"
  );
  assert.equal(status, "ignored");
});
