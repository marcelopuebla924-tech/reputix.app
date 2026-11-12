# Constraint extraction — second bounded batch
Date: 2026-11-11 (PST)
Source: production pg_catalog, read-only.
This complements SCHEMA-RECOVERY-CONSTRAINTS-AND-INDEXES-2026-11-11.md.

## Exact definitions captured in this batch

### ad_campaigns
- ad_campaigns_budget_cents_check — CHECK (budget_cents >= 0)
- ad_campaigns_business_id_fkey — FOREIGN KEY (business_id) REFERENCES businesses(id) ON DELETE CASCADE
- ad_campaigns_check — CHECK (ends_at IS NULL OR starts_at IS NULL OR ends_at > starts_at)
- ad_campaigns_description_check — CHECK (description IS NULL OR char_length(description) <= 1000)
- ad_campaigns_pkey — PRIMARY KEY (id)
- ad_campaigns_placement_check — CHECK (placement = ANY (ARRAY['business_carousel','discovery_feed','category_featured']))
- ad_campaigns_status_check — CHECK (status = ANY (ARRAY['draft','pending_review','approved','active','paused','completed','rejected']))
- ad_campaigns_title_check — CHECK (char_length(btrim(title)) BETWEEN 3 AND 120)

### ad_clicks
- ad_clicks_campaign_id_fkey — FOREIGN KEY (campaign_id) REFERENCES ad_campaigns(id) ON DELETE CASCADE
- ad_clicks_pkey — PRIMARY KEY (id)

### ad_impressions
- ad_impressions_campaign_id_fkey — FOREIGN KEY (campaign_id) REFERENCES ad_campaigns(id) ON DELETE CASCADE
- ad_impressions_pkey — PRIMARY KEY (id)

### business_monthly_history
- business_monthly_history_business_id_fkey — FOREIGN KEY (business_id) REFERENCES businesses(id) ON DELETE CASCADE
- business_monthly_history_business_id_month_start_key — UNIQUE (business_id, month_start)
- business_monthly_history_pkey — PRIMARY KEY (id)
- business_monthly_history_total_published_reviews_check — CHECK (total_published_reviews >= 0)

### business_promotions
- business_promotions_business_id_fkey — FOREIGN KEY (business_id) REFERENCES businesses(id) ON DELETE CASCADE
- business_promotions_check — CHECK (ends_at IS NULL OR starts_at IS NULL OR ends_at > starts_at)
- business_promotions_description_check — CHECK (description IS NULL OR char_length(description) <= 1000)
- business_promotions_pkey — PRIMARY KEY (id)
- business_promotions_status_check — CHECK (status = ANY (ARRAY['draft','pending_review','approved','active','expired','rejected']))
- business_promotions_title_check — CHECK (char_length(btrim(title)) BETWEEN 3 AND 120)

### business_subscriptions
- business_subscriptions_billing_interval_check — CHECK (billing_interval = ANY (ARRAY['month','year']))
- business_subscriptions_business_id_fkey — FOREIGN KEY (business_id) REFERENCES businesses(id) ON DELETE CASCADE
- business_subscriptions_pkey — PRIMARY KEY (id)
- business_subscriptions_plan_code_fkey — FOREIGN KEY (plan_code) REFERENCES monetization_plans(code)
- business_subscriptions_provider_check — CHECK (provider = 'stripe')
- business_subscriptions_provider_subscription_id_key — UNIQUE (provider_subscription_id)
- business_subscriptions_status_check — CHECK (status = ANY (ARRAY['pending','trialing','active','past_due','canceled','incomplete','unpaid']))

### monetization_plans
- monetization_plans_currency_check — CHECK (currency = 'usd')
- monetization_plans_monthly_price_cents_check — CHECK (monthly_price_cents >= 0)
- monetization_plans_pkey — PRIMARY KEY (code)

### payment_events
- payment_events_business_id_fkey — FOREIGN KEY (business_id) REFERENCES businesses(id) ON DELETE SET NULL
- payment_events_pkey — PRIMARY KEY (id)
- payment_events_processing_status_check — CHECK (processing_status = ANY (ARRAY['received','processed','failed','ignored']))
- payment_events_provider_event_id_key — UNIQUE (provider_event_id)

### user_publications
- user_publications_body_check — CHECK (char_length(btrim(body)) BETWEEN 1 AND 5000)
- user_publications_pkey — PRIMARY KEY (id)
- user_publications_status_check — CHECK (status = ANY (ARRAY['draft','published','hidden']))
- user_publications_user_id_fkey — FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE

### user_subscriptions
- user_subscriptions_pkey — PRIMARY KEY (id)
- user_subscriptions_plan_code_fkey — FOREIGN KEY (plan_code) REFERENCES monetization_plans(code)
- user_subscriptions_provider_check — CHECK (provider = 'stripe')
- user_subscriptions_provider_subscription_id_key — UNIQUE (provider_subscription_id)
- user_subscriptions_status_check — CHECK (status = ANY (ARRAY['trialing','active','past_due','canceled','incomplete','unpaid','paused']))
- user_subscriptions_user_id_fkey — FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE

## Validation
The second batch returned 44 definitions. The first bounded batch returned the remaining 49. Fresh aggregate count was 40 CHECK + 24 FOREIGN KEY + 20 PRIMARY KEY + 9 UNIQUE = 93. Every returned constraint was validated.
