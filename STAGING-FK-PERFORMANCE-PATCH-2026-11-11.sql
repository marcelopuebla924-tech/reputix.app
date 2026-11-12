-- Staging-only indexes for five foreign keys reported unindexed by Supabase Advisor.
-- Kept separate from the 54-index production-parity baseline.
CREATE INDEX IF NOT EXISTS idx_business_messages_sender_id
  ON public.business_messages (sender_id);
CREATE INDEX IF NOT EXISTS idx_business_owner_claims_user_id
  ON public.business_owner_claims (user_id);
CREATE INDEX IF NOT EXISTS idx_business_verification_documents_business_id
  ON public.business_verification_documents (business_id);
CREATE INDEX IF NOT EXISTS idx_user_subscriptions_plan_code
  ON public.user_subscriptions (plan_code);
CREATE INDEX IF NOT EXISTS idx_user_subscriptions_user_id
  ON public.user_subscriptions (user_id);
