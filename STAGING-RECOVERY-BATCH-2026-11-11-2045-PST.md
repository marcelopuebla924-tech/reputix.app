# Reputix staging recovery — catalog extraction batch 2
**Date:** 2026-11-11  
**Time:** 8:45 p.m. Pacific (Los Angeles)  
**Production project:** `udvsrmfgjfinwbgvhchs`  
**Staging project:** `lzcyulncvjjxsyyivlty`

## Scope and safety
Read-only PostgreSQL catalog extraction from production. No production DDL/DML, Auth, Storage, domain, Stripe, or user-data changes were made. No production records, identities, objects, or secrets were copied to staging.

Staging was rechecked after extraction: zero public tables, zero migration-history entries, and zero Edge Functions. It remains an empty isolated project; no baseline has been applied.

## Exact columns — batch of 10 tables
Notation: `name type [NOT NULL] [DEFAULT ...]`. Nullable is the default unless NOT NULL is shown.

### ad_campaigns
- id uuid NOT NULL DEFAULT gen_random_uuid()
- business_id uuid NOT NULL
- title text NOT NULL
- description text
- destination_url text
- placement text NOT NULL DEFAULT 'business_carousel'
- status text NOT NULL DEFAULT 'draft'
- budget_cents integer NOT NULL DEFAULT 0
- starts_at timestamptz
- ends_at timestamptz
- created_at timestamptz NOT NULL DEFAULT now()
- updated_at timestamptz NOT NULL DEFAULT now()

### ad_clicks
- id bigint NOT NULL (no column default)
- campaign_id uuid NOT NULL
- occurred_at timestamptz NOT NULL DEFAULT now()
- placement text

### ad_impressions
- id bigint NOT NULL (no column default)
- campaign_id uuid NOT NULL
- occurred_at timestamptz NOT NULL DEFAULT now()
- placement text

### business_monthly_history
- id uuid NOT NULL DEFAULT gen_random_uuid()
- business_id uuid NOT NULL
- month_start date NOT NULL
- total_published_reviews integer NOT NULL DEFAULT 0
- avg_cleanliness numeric
- avg_service_quality numeric
- avg_product_quality numeric
- avg_speed numeric
- avg_value_for_money numeric
- calculated_at timestamptz NOT NULL DEFAULT now()

### business_promotions
- id uuid NOT NULL DEFAULT gen_random_uuid()
- business_id uuid NOT NULL
- title text NOT NULL
- description text
- promo_code text
- starts_at timestamptz
- ends_at timestamptz
- status text NOT NULL DEFAULT 'pending_review'
- created_at timestamptz NOT NULL DEFAULT now()
- updated_at timestamptz NOT NULL DEFAULT now()

### business_subscriptions
- id uuid NOT NULL DEFAULT gen_random_uuid()
- business_id uuid NOT NULL
- plan_code text NOT NULL
- status text NOT NULL DEFAULT 'pending'
- billing_interval text NOT NULL DEFAULT 'month'
- provider text NOT NULL DEFAULT 'stripe'
- provider_customer_id text
- provider_subscription_id text
- current_period_start timestamptz
- current_period_end timestamptz
- cancel_at_period_end boolean NOT NULL DEFAULT false
- created_at timestamptz NOT NULL DEFAULT now()
- updated_at timestamptz NOT NULL DEFAULT now()

### monetization_plans
- code text NOT NULL
- name text NOT NULL
- monthly_price_cents integer NOT NULL
- currency text NOT NULL DEFAULT 'usd'
- description text
- features jsonb NOT NULL DEFAULT '[]'::jsonb
- is_active boolean NOT NULL DEFAULT true
- display_order integer NOT NULL DEFAULT 0
- created_at timestamptz NOT NULL DEFAULT now()
- updated_at timestamptz NOT NULL DEFAULT now()

### payment_events
- id uuid NOT NULL DEFAULT gen_random_uuid()
- provider text NOT NULL DEFAULT 'stripe'
- provider_event_id text NOT NULL
- event_type text NOT NULL
- business_id uuid
- processed_at timestamptz
- processing_status text NOT NULL DEFAULT 'received'
- error_message text
- created_at timestamptz NOT NULL DEFAULT now()

### user_publications
- id uuid NOT NULL DEFAULT gen_random_uuid()
- user_id uuid NOT NULL
- body text NOT NULL
- status text NOT NULL DEFAULT 'published'
- created_at timestamptz NOT NULL DEFAULT now()
- updated_at timestamptz NOT NULL DEFAULT now()

### user_subscriptions
- id uuid NOT NULL DEFAULT gen_random_uuid()
- user_id uuid NOT NULL
- plan_code text NOT NULL
- status text NOT NULL DEFAULT 'incomplete'
- provider text NOT NULL DEFAULT 'stripe'
- provider_customer_id text
- provider_subscription_id text NOT NULL
- current_period_start timestamptz
- current_period_end timestamptz
- cancel_at_period_end boolean NOT NULL DEFAULT false
- created_at timestamptz NOT NULL DEFAULT now()
- updated_at timestamptz NOT NULL DEFAULT now()

## Exact constraints — batch of 10 tables
All extracted constraints below reported `convalidated=true`.

- ad_campaigns:
  - `ad_campaigns_budget_cents_check`: CHECK (budget_cents >= 0)
  - `ad_campaigns_check`: CHECK (ends_at IS NULL OR starts_at IS NULL OR ends_at > starts_at)
  - `ad_campaigns_description_check`: CHECK (description IS NULL OR char_length(description) <= 1000)
  - `ad_campaigns_placement_check`: placement IN ('business_carousel','discovery_feed','category_featured')
  - `ad_campaigns_status_check`: status IN ('draft','pending_review','approved','active','paused','completed','rejected')
  - `ad_campaigns_title_check`: trimmed title length 3–120
  - `ad_campaigns_business_id_fkey`: business_id -> businesses(id) ON DELETE CASCADE
  - `ad_campaigns_pkey`: PRIMARY KEY (id)
- ad_clicks: campaign_id -> ad_campaigns(id) ON DELETE CASCADE; PRIMARY KEY (id)
- ad_impressions: campaign_id -> ad_campaigns(id) ON DELETE CASCADE; PRIMARY KEY (id)
- business_monthly_history:
  - total_published_reviews >= 0
  - business_id -> businesses(id) ON DELETE CASCADE
  - PRIMARY KEY (id)
  - UNIQUE (business_id, month_start)
- business_promotions:
  - ends_at must be later than starts_at when both supplied
  - description length <= 1000 when supplied
  - status IN ('draft','pending_review','approved','active','expired','rejected')
  - trimmed title length 3–120
  - business_id -> businesses(id) ON DELETE CASCADE
  - PRIMARY KEY (id)
- business_subscriptions:
  - billing_interval IN ('month','year')
  - provider = 'stripe'
  - status IN ('pending','trialing','active','past_due','canceled','incomplete','unpaid')
  - business_id -> businesses(id) ON DELETE CASCADE
  - plan_code -> monetization_plans(code)
  - PRIMARY KEY (id)
  - UNIQUE (provider_subscription_id)
- monetization_plans:
  - currency = 'usd'
  - monthly_price_cents >= 0
  - PRIMARY KEY (code)
- payment_events:
  - processing_status IN ('received','processed','failed','ignored')
  - business_id -> businesses(id) ON DELETE SET NULL
  - PRIMARY KEY (id)
  - UNIQUE (provider_event_id)
- user_publications:
  - trimmed body length 1–5000
  - status IN ('draft','published','hidden')
  - user_id -> auth.users(id) ON DELETE CASCADE
  - PRIMARY KEY (id)
- user_subscriptions:
  - provider = 'stripe'
  - status IN ('trialing','active','past_due','canceled','incomplete','unpaid','paused')
  - plan_code -> monetization_plans(code)
  - user_id -> auth.users(id) ON DELETE CASCADE
  - PRIMARY KEY (id)
  - UNIQUE (provider_subscription_id)

## Exact indexes — batch of 10 tables
- ad_campaigns: `ad_campaigns_active_idx` btree(status, starts_at, ends_at); `ad_campaigns_business_idx` btree(business_id); `ad_campaigns_pkey` unique btree(id)
- ad_clicks: `ad_clicks_campaign_time_idx` btree(campaign_id, occurred_at); `ad_clicks_pkey` unique btree(id)
- ad_impressions: `ad_impressions_campaign_time_idx` btree(campaign_id, occurred_at); `ad_impressions_pkey` unique btree(id)
- business_monthly_history: `business_monthly_history_business_id_month_start_key` unique btree(business_id, month_start); `business_monthly_history_pkey` unique btree(id); `idx_business_monthly_history_business_month` btree(business_id, month_start DESC)
- business_promotions: `business_promotions_active_idx` btree(status, starts_at, ends_at); `business_promotions_business_idx` btree(business_id); `business_promotions_pkey` unique btree(id)
- business_subscriptions: `business_subscriptions_business_idx` btree(business_id); `business_subscriptions_pkey` unique btree(id); `business_subscriptions_plan_code_idx` btree(plan_code); `business_subscriptions_provider_subscription_id_key` unique btree(provider_subscription_id); `business_subscriptions_status_idx` btree(status)
- monetization_plans: `monetization_plans_pkey` unique btree(code)
- payment_events: `payment_events_business_idx` btree(business_id); `payment_events_pkey` unique btree(id); `payment_events_provider_event_id_key` unique btree(provider_event_id); `payment_events_status_idx` btree(processing_status, created_at)
- user_publications: `user_publications_pkey` unique btree(id); `user_publications_user_created_idx` btree(user_id, created_at DESC)
- user_subscriptions: `user_subscriptions_pkey` unique btree(id); `user_subscriptions_provider_subscription_id_key` unique btree(provider_subscription_id)

## Reconciliation notes
- This batch adds exact catalog evidence for ten tables; it does not yet constitute an executable schema baseline.
- The global production totals remain 20 public base tables, 93 constraints (40 CHECK, 24 FK, 20 PK, 9 UNIQUE), and 54 public indexes. Reconcile all per-table batches against these totals before staging DDL.
- Preserve the distinct user-level and business-level subscription tables. The current user Basic/Pro Stripe checkout path does not establish that business_subscriptions is wired to billing.
- Preserve bigint identity columns on ad_clicks/ad_impressions exactly; they have no column default in information_schema output.
- Do not copy live Stripe secrets or any production records to staging.
- Do not fabricate the missing historical migrations. A later baseline, if needed, must be explicitly labeled staging-only and independently reviewed.
