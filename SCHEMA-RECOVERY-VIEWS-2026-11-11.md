# Reputix production views — exact catalog snapshot
Date: 2026-11-11 (PST)
Read-only source: pg_class / pg_namespace / pg_get_viewdef on production project udvsrmfgjfinwbgvhchs.
No production changes.

Five public views were returned.

## business_hourly_patterns
reloptions: security_invoker=true
Definition:
```sql
SELECT business_id,
       EXTRACT(hour FROM visit_time)::integer AS visit_hour,
       count(*)::integer AS review_count,
       round(avg((cleanliness + service_quality + product_quality + speed + value_for_money)::numeric / 5::numeric), 2) AS average_score,
       round(avg(speed), 2) AS average_speed,
       round(avg(service_quality), 2) AS average_service_quality,
       round(avg(cleanliness), 2) AS average_cleanliness
FROM reviews r
WHERE status = 'published' AND visit_time IS NOT NULL
GROUP BY business_id, EXTRACT(hour FROM visit_time)
HAVING count(*) >= 5;
```

## owner_business_dashboard
reloptions: none (security_invoker not enabled)
Definition:
```sql
SELECT b.id AS business_id, b.name AS business_name, b.category, b.city,
       count(r.id)::integer AS published_reviews,
       round(avg((r.cleanliness + r.service_quality + r.product_quality + r.speed + r.value_for_money)::numeric / 5::numeric), 2) AS average_score,
       round(avg(r.cleanliness), 2) AS average_cleanliness,
       round(avg(r.service_quality), 2) AS average_service_quality,
       round(avg(r.product_quality), 2) AS average_product_quality,
       round(avg(r.speed), 2) AS average_speed,
       round(avg(r.value_for_money), 2) AS average_value_for_money,
       count(r.id) FILTER (WHERE r.visit_date >= CURRENT_DATE - 7)::integer AS reviews_last_7_days
FROM business_owner_claims c
JOIN businesses b ON b.id = c.business_id
LEFT JOIN reviews r ON r.business_id = b.id AND r.status = 'published'
WHERE c.user_id = (SELECT auth.uid()) AND c.status = 'verified'
  AND b.status = 'approved'
  AND EXISTS (
    SELECT 1 FROM user_subscriptions s
    WHERE s.user_id = (SELECT auth.uid())
      AND s.plan_code = ANY (ARRAY['basic','pro'])
      AND s.status = ANY (ARRAY['active','trialing'])
      AND (s.current_period_end IS NULL OR s.current_period_end > now())
  )
GROUP BY b.id, b.name, b.category, b.city;
```

## owner_business_hourly_patterns
reloptions: none (security_invoker not enabled)
Definition:
```sql
SELECT b.id AS business_id, EXTRACT(hour FROM r.visit_time)::integer AS visit_hour,
       count(*)::integer AS review_count,
       round(avg(r.service_quality), 2) AS average_service_quality,
       round(avg(r.speed), 2) AS average_speed,
       round(avg(r.cleanliness), 2) AS average_cleanliness,
       round(avg((r.cleanliness + r.service_quality + r.product_quality + r.speed + r.value_for_money)::numeric / 5::numeric), 2) AS average_score
FROM business_owner_claims c
JOIN businesses b ON b.id = c.business_id
JOIN reviews r ON r.business_id = b.id AND r.status = 'published'
WHERE c.user_id = (SELECT auth.uid()) AND c.status = 'verified'
  AND b.status = 'approved' AND r.visit_time IS NOT NULL
  AND EXISTS (
    SELECT 1 FROM user_subscriptions s
    WHERE s.user_id = (SELECT auth.uid()) AND s.plan_code = 'pro'
      AND s.status = ANY (ARRAY['active','trialing'])
      AND (s.current_period_end IS NULL OR s.current_period_end > now())
  )
GROUP BY b.id, EXTRACT(hour FROM r.visit_time)
HAVING count(*) >= 3;
```

## recent_review_highlights
reloptions: security_invoker=true
Definition:
```sql
SELECT r.id AS review_id, b.id AS business_id, b.name AS business_name,
       r.visit_date, r.visit_time,
       round((r.cleanliness + r.service_quality + r.product_quality + r.speed + r.value_for_money)::numeric / 5::numeric, 1) AS average_score,
       left(COALESCE(r.comment, ''), 220) AS review_excerpt
FROM reviews r JOIN businesses b ON b.id = r.business_id
WHERE r.status = 'published' AND b.status = 'approved'
  AND r.created_at >= now() - interval '30 days'
ORDER BY r.created_at DESC;
```

## weekly_business_rankings
reloptions: security_invoker=true
Definition (equivalent structure; retain original timezone/week semantics):
- current_week computes date_trunc('week', now() AT TIME ZONE 'America/Los_Angeles')::date.
- scores joins approved businesses to published reviews with visit_date >= week_start and < week_start + 7.
- Aggregates review_count, average of five score dimensions, and positive_reviews where the average is >= 4.
- HAVING count(review.id) >= 5.
- Output row_number ordered by average_score DESC, positive_reviews DESC, review_count DESC, business_name; plus business/category/city/week metrics.

## Critical staging checks
- Preserve all five definitions and reloptions.
- Owner views intentionally do not set security_invoker; access grants were separately restricted in migration history. Re-test owner isolation with two independent owners and ensure anon has no SELECT on owner views.
- The other three views use security_invoker=true.
- Do not blindly grant default view privileges. Review exact grants and the two restrictive migrations before baseline application.
