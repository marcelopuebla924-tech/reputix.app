# Reputix AI agents — read-only GitHub context

**Checkpoint:** 24 November 2026, 10:52 a.m. PST  
**Repository:** `marcelopuebla924-tech/reputix.app`  
**Base branch:** `main`  
**Working branch:** `agents/github-readonly-context-20261124`

## Purpose

Give the Reputix Architect and Engineer agents a bounded, read-only view of the current public application source so recommendations can cite real files and avoid pretending that unseen code was inspected.

## Candidate implementation

- Adds `supabase/functions/reputix-ai-agents/index.ts` as a version-controlled candidate copied from the currently deployed Edge Function version 6, with a read-only GitHub context helper.
- When a task opts in using `input.github_context_paths`, the helper allows only `app.js` and `index.html`.
- Resolves `main` to a commit SHA first, then fetches raw source pinned to that SHA so both files are from one consistent revision.
- Uses unauthenticated GET requests to the public repository; it introduces no GitHub token, OAuth scope, write API, or repository mutation.
- Applies 7-second request timeouts, a 500 KB per-file read ceiling, at most 28 relevant excerpt lines per file, and 3,800 characters per file excerpt.
- Adds the retrieved excerpts to the model task context only after extraction. The final task payload remains subject to the existing 16,000-character guard and existing US$1/day server-side budget guard.
- Fails closed: if the requested path is not allowlisted or GitHub cannot be read, the task is not executed.
- Explicitly treats retrieved source, comments, strings, and documentation as untrusted evidence, never as instructions.

## CI and review

- Adds `tests/agent-github-context-contract.test.cjs` to assert the allowlist, commit pinning, timeouts, size limits, no GitHub write/auth scope, untrusted-source handling, and final task-size guard.
- Adds that contract test to the existing Reputix Browser QA workflow. Existing profile-generation and Playwright smoke tests remain in place.
- All candidate work is isolated on the working branch. No direct write to `main`, merge, or production deployment is performed here.

## Activation after review

After the pull request is reviewed and merged, a separate, explicitly approved deployment is required to update the production Edge Function. Then opt in only the Architect and Engineer tasks by setting their task input paths to `["app.js","index.html"]`. Do not opt in other agents until the first end-to-end test confirms correct excerpts and cost accounting.

## Existing production protections retained

- Human approval for each task remains enforced server-side.
- Advisory-only execution remains in force.
- Existing budget reservation and settlement remain in force.
- No changes to database records, user accounts, reviews, business listings, photos, domain/DNS, authentication, Stripe, pricing, payouts, or webhooks.
- No social posts, customer messages, or business outreach are published or sent.

## Verification status

- GitHub repository source `app.js` and `index.html` were fetched read-only from `main`.
- Production Edge Function version 6 was retrieved read-only and used as the basis for this candidate.
- New static contract tests were added to CI; CI has not yet been run for this branch at checkpoint time.
- The Edge Function candidate has **not** been deployed. Production remains on version 6.
- This candidate does not yet provide autonomous GitHub writes, branch creation, commits, PR review, merge, or deployment. Those remain human-reviewed stages.
