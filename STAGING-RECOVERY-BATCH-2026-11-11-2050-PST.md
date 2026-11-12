# Reputix staging recovery — catalog extraction batch 3
**Date:** 2026-11-11  
**Time:** 8:50 p.m. Pacific (Los Angeles)  
**Production project:** `udvsrmfgjfinwbgvhchs`  
**Staging project:** `lzcyulncvjjxsyyivlty`

## Scope and safety
Read-only production catalog queries. No production schema/data/Auth/Storage/Stripe/domain writes. No user data or secrets copied. Staging remains empty (0 public tables, 0 migrations, 0 Edge Functions at the latest check).

Notation: `column type [NOT NULL] [DEFAULT ...]`; omitted NOT NULL means nullable.

## Exact columns — remaining 10 public tables

### businesses
- id uuid NOT NULL DEFAULT gen_random_uuid()
- name text NOT NULL
- description text
- address text
- category text
- created_at timestamptz NOT NULL DEFAULT now()
- status text NOT NULL DEFAULT 'pending'
- phone text
- hours text
- city text
- zip text
- instagram_url text
- facebook_url text
- tiktok_url text

### reviews
- id uuid NOT NULL DEFAULT gen_random_uuid()
- business_id uuid NOT NULL
- visit_date date NOT NULL DEFAULT CURRENT_DATE
- visit_time time NOT NULL
- cleanliness integer
- service_quality integer
- product_quality integer
- speed integer
- value_for_money integer
- comment text
- status text NOT NULL DEFAULT 'pending'
- created_at timestamptz NOT NULL DEFAULT now()
- original_language text
- translated_comment text
- translated_language text
- staff_name text
- user_id uuid

### business_owner_claims
- id uuid NOT NULL DEFAULT gen_random_uuid()
- business_id uuid NOT NULL
- user_id uuid NOT NULL
- evidence_note text
- status text NOT NULL DEFAULT 'pending'
- created_at timestamptz NOT NULL DEFAULT now()
- reviewed_at timestamptz
- relationship_type text NOT NULL DEFAULT 'owner'
- verification_level text NOT NULL DEFAULT 'activity'
- evidence_type text NOT NULL DEFAULT 'written_statement'
- evidence_links text[] NOT NULL DEFAULT '{}'::text[]
- reviewer_note text

### business_photos
- id uuid NOT NULL DEFAULT gen_random_uuid()
- business_id text NOT NULL
- storage_path text NOT NULL
- original_filename text
- content_type text
- file_size bigint
- status text NOT NULL DEFAULT 'pending'
- created_at timestamptz NOT NULL DEFAULT now()
- reviewed_at timestamptz

### business_conversations
- id uuid NOT NULL DEFAULT gen_random_uuid()
- business_id uuid NOT NULL
- customer_id uuid NOT NULL
- subject text NOT NULL
- status text NOT NULL DEFAULT 'open'
- created_at timestamptz NOT NULL DEFAULT now()
- updated_at timestamptz NOT NULL DEFAULT now()

### business_messages
- id uuid NOT NULL DEFAULT gen_random_uuid()
- conversation_id uuid NOT NULL
- sender_id uuid NOT NULL
- body text NOT NULL
- created_at timestamptz NOT NULL DEFAULT now()
- read_at timestamptz

### complaints
- id uuid NOT NULL DEFAULT gen_random_uuid()
- business_id uuid NOT NULL
- complaint text NOT NULL
- original_language text
- status text NOT NULL DEFAULT 'pending'
- business_response text
- created_at timestamptz NOT NULL DEFAULT now()
- updated_at timestamptz NOT NULL DEFAULT now()
- user_id uuid

### business_verification_documents
- id uuid NOT NULL DEFAULT gen_random_uuid()
- business_id uuid NOT NULL
- document_type text NOT NULL DEFAULT 'address_proof'
- storage_path text
- original_filename text
- content_type text
- file_size bigint
- status text NOT NULL DEFAULT 'awaiting_upload'
- created_at timestamptz NOT NULL DEFAULT now()
- reviewed_at timestamptz
- review_note text

### review_ai_moderation
- id uuid NOT NULL DEFAULT gen_random_uuid()
- review_id uuid NOT NULL
- outcome text NOT NULL
- reasons text[] NOT NULL DEFAULT '{}'::text[]
- confidence numeric
- model text
- created_at timestamptz NOT NULL DEFAULT now()

### user_profiles
- user_id uuid NOT NULL
- display_name text
- bio text
- avatar_url text
- created_at timestamptz NOT NULL DEFAULT now()
- updated_at timestamptz NOT NULL DEFAULT now()

## Exact constraints — remaining 10 tables
All constraints returned `convalidated=true`.

- business_conversations:
  - status IN ('open','closed')
  - trimmed subject length 1–160
  - business_id -> businesses(id) ON DELETE CASCADE
  - customer_id -> auth.users(id) ON DELETE CASCADE
  - PRIMARY KEY (id)
  - UNIQUE (business_id, customer_id, subject)
- business_messages:
  - trimmed body length 1–5000
  - conversation_id -> business_conversations(id) ON DELETE CASCADE
  - sender_id -> auth.users(id) ON DELETE CASCADE
  - PRIMARY KEY (id)
- business_owner_claims:
  - evidence_type IN ('work_photos','customer_references','business_social','phone_or_email','storefront_photos','business_documents','written_statement','multiple')
  - relationship_type IN ('owner','partner','manager','independent_worker','new_entrepreneur')
  - status IN ('pending','activity_verified','responsible_verified','verified','rejected')
  - verification_level IN ('activity','business_responsible','owner')
  - business_id -> businesses(id) ON DELETE CASCADE
  - user_id -> auth.users(id) ON DELETE CASCADE
  - PRIMARY KEY (id)
  - UNIQUE (business_id, user_id)
- business_photos:
  - status IN ('pending','approved','rejected')
  - PRIMARY KEY (id)
  - UNIQUE (storage_path)
  - No FK on business_id; it is text, not uuid.
- business_verification_documents:
  - status IN ('awaiting_upload','pending_review','verified','rejected')
  - business_id -> businesses(id) ON DELETE CASCADE
  - PRIMARY KEY (id)
  - UNIQUE (storage_path)
- businesses: PRIMARY KEY (id); active proposal uniqueness is a partial expression index, not a table constraint.
- complaints:
  - trimmed complaint length 10–5000
  - status IN ('pending','published','rejected','resolved')
  - business_id -> businesses(id) ON DELETE RESTRICT
  - user_id -> auth.users(id) ON DELETE SET NULL
  - PRIMARY KEY (id)
- review_ai_moderation:
  - outcome IN ('clear','needs_review','high_risk','unavailable')
  - review_id -> reviews(id) ON DELETE CASCADE
  - PRIMARY KEY (id)
  - UNIQUE (review_id)
- reviews:
  - cleanliness, product_quality, service_quality, speed, value_for_money each constrained to 1–5
  - status IN ('pending','published','rejected')
  - business_id -> businesses(id) ON DELETE CASCADE
  - user_id -> auth.users(id) ON DELETE SET NULL
  - PRIMARY KEY (id)
- user_profiles:
  - bio IS NULL OR char_length(bio) <= 500
  - user_id -> auth.users(id) ON DELETE CASCADE
  - PRIMARY KEY (user_id)

## Exact indexes — remaining 10 tables
- business_conversations:
  - `business_conversations_business_id_customer_id_subject_key`: UNIQUE btree(business_id, customer_id, subject)
  - `business_conversations_business_idx`: btree(business_id, updated_at DESC)
  - `business_conversations_customer_idx`: btree(customer_id, updated_at DESC)
  - `business_conversations_pkey`: UNIQUE btree(id)
- business_messages:
  - `business_messages_conversation_idx`: btree(conversation_id, created_at)
  - `business_messages_pkey`: UNIQUE btree(id)
- business_owner_claims:
  - `business_owner_claims_business_id_user_id_key`: UNIQUE btree(business_id, user_id)
  - `business_owner_claims_pkey`: UNIQUE btree(id)
  - `one_verified_owner_per_business`: UNIQUE btree(business_id) WHERE status='verified'
- business_photos:
  - `business_photos_pkey`: UNIQUE btree(id)
  - `business_photos_storage_path_key`: UNIQUE btree(storage_path)
- business_verification_documents:
  - `business_verification_documents_pkey`: UNIQUE btree(id)
  - `business_verification_documents_storage_path_key`: UNIQUE btree(storage_path)
- businesses:
  - `businesses_active_proposal_unique`: UNIQUE btree(lower(btrim(name)), lower(btrim(category)), lower(btrim(city)), COALESCE(lower(btrim(address)), '')) WHERE status IN ('pending','approved')
  - `businesses_pkey`: UNIQUE btree(id)
- complaints:
  - `complaints_business_created_idx`: btree(business_id, created_at DESC)
  - `complaints_pkey`: UNIQUE btree(id)
  - `complaints_user_created_idx`: btree(user_id, created_at DESC)
- review_ai_moderation:
  - `review_ai_moderation_pkey`: UNIQUE btree(id)
  - `review_ai_moderation_review_id_key`: UNIQUE btree(review_id)
- reviews:
  - `reviews_business_visit_date_idx`: btree(business_id, visit_date DESC)
  - `reviews_pkey`: UNIQUE btree(id)
  - `reviews_published_business_time_idx`: btree(business_id, visit_time) WHERE status='published'
  - `reviews_published_visit_date_idx`: btree(visit_date, business_id) WHERE status='published'
  - `reviews_status_visit_date_idx`: btree(status, visit_date DESC)
  - `reviews_user_created_idx`: btree(user_id, created_at DESC)
- user_profiles:
  - `user_profiles_pkey`: UNIQUE btree(user_id)

## Important schema-preservation findings
- `business_photos.business_id` is TEXT and intentionally has no FK in the inspected catalog. Do not coerce it to uuid during staging reconstruction.
- `businesses_active_proposal_unique` and `one_verified_owner_per_business` are partial/expression indexes; preserve the predicates and expressions exactly.
- `business_conversations` and `business_messages` carry customer/owner private communication. Preserve their RLS and narrowly scoped column grants.
- Verification-document storage must remain private; do not create public access policies for that bucket.
- AI moderation audit rows must remain backend-only unless a separately reviewed access model justifies otherwise.

## Reconciliation status
Together with batch 2, exact column, constraint, and index extraction now covers all 20 public base tables. Global counts to reconcile before any staging DDL: 20 tables, 93 constraints (40 CHECK, 24 FK, 20 PK, 9 UNIQUE), 54 indexes. Views, routines, grants, extensions, storage policies/configuration, triggers, and dependencies still require final exact reconciliation before generating a staging-only baseline.

## Next safe action
Capture a fresh single-query inventory of triggers, sequences/identity generation, extensions, full view definitions, routine definitions/ACLs, and storage configuration; then reconcile all extracted catalogs. Do not apply migrations to staging yet.
