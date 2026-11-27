#!/usr/bin/env bash
set -euo pipefail
: "${DATABASE_URL:?DATABASE_URL is required}"
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
psql "$DATABASE_URL" -v ON_ERROR_STOP=1 \
  -f "$ROOT/tests/fixtures/owner-complaint-rpc-fixture.sql" \
  -f "$ROOT/docs/proposals/owner-complaint-rpc-hardening.sql"

call_as() {
  local user_id="$1" complaint_id="$2" response="$3"
  psql "$DATABASE_URL" -X -v ON_ERROR_STOP=1 -c "
    BEGIN;
    SET LOCAL ROLE authenticated;
    SELECT set_config('request.jwt.claim.sub', '$user_id', true);
    SELECT public.owner_respond_to_complaint('$complaint_id'::uuid, '$response');
    COMMIT;"
}

# Approved business: verified owner can respond.
call_as 11111111-1111-4111-8111-111111111111 dddddddd-dddd-4ddd-8ddd-dddddddddddd "We reviewed this and will resolve it."
stored="$(psql "$DATABASE_URL" -X -A -t -c "select business_response from public.complaints where id='dddddddd-dddd-4ddd-8ddd-dddddddddddd'")"
[[ "$stored" == "We reviewed this and will resolve it." ]] || { echo "Verified owner response was not saved"; exit 1; }

# Cross-business owner cannot respond to another business's complaint.
if call_as 22222222-2222-4222-8222-222222222222 dddddddd-dddd-4ddd-8ddd-dddddddddddd "Cross business attempt"; then
  echo "Cross-business owner was incorrectly allowed"
  exit 1
fi

# A pending/unverified claim cannot respond.
if call_as 33333333-3333-4333-8333-333333333333 dddddddd-dddd-4ddd-8ddd-dddddddddddd "Pending claim attempt"; then
  echo "Unverified owner was incorrectly allowed"
  exit 1
fi

# Intermediate verification levels are not equivalent to final verified ownership.
if call_as 55555555-5555-4555-8555-555555555555 dddddddd-dddd-4ddd-8ddd-dddddddddddd "Activity verification attempt"; then
  echo "Activity-verified claim was incorrectly allowed"
  exit 1
fi
if call_as 66666666-6666-4666-8666-666666666666 dddddddd-dddd-4ddd-8ddd-dddddddddddd "Responsible verification attempt"; then
  echo "Responsible-verified claim was incorrectly allowed"
  exit 1
fi

# A verified claim on a non-approved business cannot respond (SECURITY DEFINER must match RLS).
if call_as 44444444-4444-4444-8444-444444444444 eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee "Unapproved business attempt"; then
  echo "Owner of unapproved business was incorrectly allowed"
  exit 1
fi

# Anonymous/null identity cannot respond.
if psql "$DATABASE_URL" -X -v ON_ERROR_STOP=1 -c "BEGIN; SET LOCAL ROLE anon; SELECT public.owner_respond_to_complaint('dddddddd-dddd-4ddd-8ddd-dddddddddddd','Anonymous attempt'); COMMIT;"; then
  echo "Unauthenticated call was incorrectly allowed"
  exit 1
fi

# Response validation rejects too-short, whitespace-only, and overlong messages.
if call_as 11111111-1111-4111-8111-111111111111 dddddddd-dddd-4ddd-8ddd-dddddddddddd "x"; then
  echo "Too-short response was incorrectly allowed"
  exit 1
fi
if call_as 11111111-1111-4111-8111-111111111111 dddddddd-dddd-4ddd-8ddd-dddddddddddd "   "; then
  echo "Whitespace-only response was incorrectly allowed"
  exit 1
fi
long_response="$(printf '%3001s' 'x' | tr ' ' 'x')"
if call_as 11111111-1111-4111-8111-111111111111 dddddddd-dddd-4ddd-8ddd-dddddddddddd "$long_response"; then
  echo "Overlong response was incorrectly allowed"
  exit 1
fi

acl="$(psql "$DATABASE_URL" -X -A -t -c "select has_function_privilege('anon','public.owner_respond_to_complaint(uuid,text)','EXECUTE') || ':' || has_function_privilege('authenticated','public.owner_respond_to_complaint(uuid,text)','EXECUTE') || ':' || has_function_privilege('service_role','public.owner_respond_to_complaint(uuid,text)','EXECUTE')")"
[[ "$acl" == "false:true:true" ]] || { echo "Unexpected execute grants: $acl"; exit 1; }

echo "PASS: verified owner, cross-business isolation, all non-final claim states, unapproved business, unauthenticated caller, response length validation, and RPC grants."
