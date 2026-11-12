# Reputix — Client Delivery Readiness

Last reviewed: 2026-11-11 (America/Los_Angeles)

This is the internal source of truth for what Reputix can currently deliver, what a customer should receive, and what must be verified before launch. It is intentionally conservative: do not promise a capability merely because a button or code path exists.

## Product promise

Reputix is an independent platform for authentic community reviews, business discovery, and business insights. Advertising is a separate monetization channel and must never influence reviews, ratings, moderation, organic recommendations, or statistics.

## Current service tiers

| Capability | Public / Free | Basic — $13/month | Pro — $25/month |
|---|---|---|---|
| Public business discovery and map | Available | Available | Available |
| Public business profiles and community reviews | Available | Available | Available |
| Business owner account and claim request | Available | Available | Available |
| Owner dashboard with published-review count, average score, criteria averages, and recent activity | Not included | Included after verified ownership and active subscription | Included |
| Time-of-day review patterns | Not included | Not included | Included when there are enough reviews (minimum 3 per time slot) |
| Reputix AI business assistant | Not included | Not included | Included, subject to server-side Pro entitlement |
| AI review moderation | Advisory/admin workflow only; no automatic publish/reject | Same | Same |

**Important:** Reputix AI currently receives a limited context sample (up to 20 approved businesses and up to 3 recent published reviews per business). It must not be marketed as a complete analysis of every review or the entire business database.

## What a customer receives during onboarding

1. A Reputix account registered with the customer's own email address.
2. Help locating an existing public business listing or submitting a new business proposal.
3. A claim request for an existing listing, with a clear explanation of acceptable ownership/representative evidence.
4. Manual review of the claim. A claim is not approved merely because a form was submitted.
5. Once verified, access to the owner workspace and the features included in the active subscription.
6. A short orientation covering the dashboard, published-review data, customer messages, and how to respond professionally to feedback.
7. A handoff checklist confirming the public listing details and owner access.

Do not collect or store a customer's password. The customer should create and retain their own credentials.

## What must not be promised yet

- Guaranteed customers, sales, leads, positive reviews, or a particular rating.
- Automatic owner verification or automatic publication of review content.
- A self-service subscription management portal, card update flow, invoice center, or cancellation button. The current “Ver planes / View plans” control only navigates to the plan section.
- Paid advertising delivery, public sponsored placements, impression/click reporting, or advertiser billing. The admin campaign form can create a campaign for review, but public delivery and tracking are not complete.
- Full-database AI analytics or an exhaustive AI ranking of every business.
- Exportable PDF reports or custom integrations unless separately implemented and tested.

## Internal delivery checklist

### Before accepting a customer
- [ ] Confirm the public listing is present and the name/category/address are correct.
- [ ] If the listing is missing, submit a proposal and wait for approval.
- [ ] Customer creates their own Reputix account and confirms their email.
- [ ] Customer submits an owner claim with identity and valid evidence.
- [ ] Authorized admin reviews evidence and verifies the claim only after checking it.
- [ ] Confirm the customer sees only the businesses and statistics they are authorized to access.

### Before handing over a paid plan
- [ ] Confirm the selected plan and price in Stripe test mode.
- [ ] Verify the signed webhook event updates the correct subscription record.
- [ ] Confirm Basic receives essential dashboard metrics.
- [ ] Confirm Pro receives hourly patterns and Reputix AI.
- [ ] Confirm expired, unpaid, or cancelled subscriptions do not retain paid features.
- [ ] Explain that subscription self-service management is not available yet.

### Final customer handoff
- [ ] Verify business name, category, address, hours, phone, website/social links, and approved photos.
- [ ] Explain how published reviews feed the dashboard and why pending reviews are not counted.
- [ ] Explain that AI moderation is advisory and a human makes publication decisions.
- [ ] Show the customer how to read feedback and respond without manipulating ratings.
- [ ] Give the customer a support contact and written service terms before charging a real subscription.

## Launch blockers / validation still required

1. End-to-end sign-up, email confirmation, sign-in, and password recovery using a dedicated test account. The browser smoke suite currently checks only safe empty-field validation, not a real account.
2. End-to-end owner claim submission and authorized verification using a dedicated test business/account. The current browser suite checks only that the claim picker opens and closes.
3. End-to-end customer review submission, publication moderation, and business response.
4. End-to-end business photo upload, private storage, signed URL, and public card display.
5. Stripe test-mode checkout and signed webhook verification for both plans, including failed payment and cancellation. The active Edge Function code alone does not prove Stripe Dashboard configuration.
6. A secure Stripe Billing Portal or an explicitly documented manual cancellation process.
7. Privacy Policy, Terms of Service, review guidelines, contact/support information, and clear data-retention disclosures. These were not found in the current repository tree at this review.
8. Protected public ad delivery/tracking and advertiser billing, before selling advertising campaigns.
9. Accessibility and responsive review across supported mobile and desktop browsers.

## Browser QA completed

The automated Playwright smoke suite passed 15 checks on 2026-11-11, including:
- Homepage and unique DOM IDs.
- Spanish/English language switching.
- Business search and button recovery.
- An approved business card's Profile and Reviews actions, including review form fields.
- Public AI modal open/close.
- Empty sign-in/sign-up and password recovery validation.
- Logged-out Basic/Pro checkout behavior.
- Owner plan navigation.
- Business/professional proposal forms.
- Reviews/statistics feature navigation.
- Business claim picker open/close (without submitting a claim).
- Map filters and reset.
- Mobile touch interactions for AI, account access, and map filters.

These tests do not replace authenticated account, live payment, admin, or real data-flow tests.
