import Stripe from "npm:stripe";
import { createStripeWebhookHandler } from "./core.mjs";

const stripeSecretKey = Deno.env.get("STRIPE_SECRET_KEY") ?? "";
const webhookSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET") ?? "";
const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
const expectedLivemode = Deno.env.get("STRIPE_EXPECT_LIVEMODE");
const stripe = stripeSecretKey ? new Stripe(stripeSecretKey) : null;
const cryptoProvider = Stripe.createSubtleCryptoProvider();

Deno.serve(createStripeWebhookHandler({
  stripe,
  cryptoProvider,
  webhookSecret,
  supabaseUrl,
  serviceRoleKey,
  expectedLivemode,
}));
