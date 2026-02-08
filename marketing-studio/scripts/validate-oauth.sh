#!/bin/bash
#
# OAuth Validation Script for Lyfye Marketing Studio
# Validates NextAuth configuration, providers, and redirect URIs
#
# Usage: ./scripts/validate-oauth.sh [base_url]
# Default: http://localhost:3003
#

set -e

BASE_URL="${1:-http://localhost:3003}"
PASSED=0
FAILED=0

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo "=========================================="
echo "OAuth Validation Script"
echo "Base URL: $BASE_URL"
echo "=========================================="
echo ""

# Test function
test_check() {
    local name="$1"
    local result="$2"
    local expected="$3"

    if [[ "$result" == *"$expected"* ]]; then
        echo -e "${GREEN}✓ PASS${NC}: $name"
        ((PASSED++))
    else
        echo -e "${RED}✗ FAIL${NC}: $name"
        echo "  Expected: $expected"
        echo "  Got: $result"
        ((FAILED++))
    fi
}

# 1. Providers Endpoint
echo "--- 1. Providers Endpoint ---"
PROVIDERS=$(curl -sS "$BASE_URL/api/auth/providers" 2>/dev/null)

test_check "Google provider exists" "$PROVIDERS" '"id":"google"'
test_check "Azure-AD provider exists" "$PROVIDERS" '"id":"azure-ad"'
test_check "Google callback URL correct" "$PROVIDERS" "\"callbackUrl\":\"$BASE_URL/api/auth/callback/google\""
test_check "Azure callback URL correct" "$PROVIDERS" "\"callbackUrl\":\"$BASE_URL/api/auth/callback/azure-ad\""
echo ""

# 2. Session Endpoint
echo "--- 2. Session Endpoint ---"
SESSION=$(curl -sS "$BASE_URL/api/auth/session" 2>/dev/null)
if [[ "$SESSION" == "{}" ]]; then
    echo -e "${GREEN}✓ PASS${NC}: Session endpoint returns empty (no active session)"
    ((PASSED++))
else
    echo -e "${YELLOW}! INFO${NC}: Session endpoint returned: $SESSION"
fi
echo ""

# 3. CSRF Token
echo "--- 3. CSRF Token ---"
CSRF_RESP=$(curl -sS "$BASE_URL/api/auth/csrf" 2>/dev/null)
test_check "CSRF token present" "$CSRF_RESP" '"csrfToken"'
echo ""

# 4. Azure OAuth Redirect URI
echo "--- 4. Azure OAuth Redirect Validation ---"
rm -f /tmp/validate_cookies.txt 2>/dev/null

# Get CSRF
CSRF=$(curl -c /tmp/validate_cookies.txt -sS "$BASE_URL/api/auth/csrf" | grep -o '"csrfToken":"[^"]*"' | cut -d'"' -f4)

# Initiate Azure OAuth
AZURE_REDIRECT=$(curl -c /tmp/validate_cookies.txt -b /tmp/validate_cookies.txt -sS -X POST "$BASE_URL/api/auth/signin/azure-ad" \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "csrfToken=${CSRF}&callbackUrl=/studio" \
  -D - -o /dev/null 2>&1 | grep -i "location:")

# Extract redirect_uri
AZURE_REDIRECT_URI=$(echo "$AZURE_REDIRECT" | grep -oP '(?<=redirect_uri=)[^&]+' | sed 's/%3A/:/g' | sed 's/%2F/\//g')
EXPECTED_AZURE_URI="$BASE_URL/api/auth/callback/azure-ad"

test_check "Azure redirect_uri correct" "$AZURE_REDIRECT_URI" "$EXPECTED_AZURE_URI"

# Extract client_id
AZURE_CLIENT_ID=$(echo "$AZURE_REDIRECT" | grep -oP '(?<=client_id=)[^&]+')
test_check "Azure client_id present" "$AZURE_CLIENT_ID" "57733f8d"
echo ""

# 5. Google OAuth Redirect URI
echo "--- 5. Google OAuth Redirect Validation ---"
rm -f /tmp/validate_cookies.txt 2>/dev/null

# Get fresh CSRF
CSRF=$(curl -c /tmp/validate_cookies.txt -sS "$BASE_URL/api/auth/csrf" | grep -o '"csrfToken":"[^"]*"' | cut -d'"' -f4)

# Initiate Google OAuth
GOOGLE_REDIRECT=$(curl -c /tmp/validate_cookies.txt -b /tmp/validate_cookies.txt -sS -X POST "$BASE_URL/api/auth/signin/google" \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "csrfToken=${CSRF}&callbackUrl=/studio" \
  -D - -o /dev/null 2>&1 | grep -i "location:")

# Extract redirect_uri
GOOGLE_REDIRECT_URI=$(echo "$GOOGLE_REDIRECT" | grep -oP '(?<=redirect_uri=)[^&]+' | sed 's/%3A/:/g' | sed 's/%2F/\//g')
EXPECTED_GOOGLE_URI="$BASE_URL/api/auth/callback/google"

test_check "Google redirect_uri correct" "$GOOGLE_REDIRECT_URI" "$EXPECTED_GOOGLE_URI"
echo ""

# 6. Environment Alignment
echo "--- 6. Environment Alignment ---"
if [ -f ".env.local" ]; then
    ENV_NEXTAUTH_URL=$(grep "^NEXTAUTH_URL=" .env.local | cut -d'"' -f2)
    test_check "NEXTAUTH_URL matches base URL" "$ENV_NEXTAUTH_URL" "$BASE_URL"

    ENV_AZURE_ID=$(grep "^AZURE_AD_CLIENT_ID=" .env.local | cut -d'"' -f2)
    test_check "AZURE_AD_CLIENT_ID present" "$ENV_AZURE_ID" "57733f8d"

    ENV_AZURE_SECRET=$(grep "^AZURE_AD_CLIENT_SECRET=" .env.local | wc -l)
    if [ "$ENV_AZURE_SECRET" -gt 0 ]; then
        echo -e "${GREEN}✓ PASS${NC}: AZURE_AD_CLIENT_SECRET present"
        ((PASSED++))
    else
        echo -e "${RED}✗ FAIL${NC}: AZURE_AD_CLIENT_SECRET missing"
        ((FAILED++))
    fi

    ENV_AZURE_TENANT=$(grep "^AZURE_AD_TENANT_ID=" .env.local | wc -l)
    if [ "$ENV_AZURE_TENANT" -gt 0 ]; then
        echo -e "${GREEN}✓ PASS${NC}: AZURE_AD_TENANT_ID present"
        ((PASSED++))
    else
        echo -e "${RED}✗ FAIL${NC}: AZURE_AD_TENANT_ID missing"
        ((FAILED++))
    fi
else
    echo -e "${YELLOW}! WARN${NC}: .env.local not found in current directory"
fi
echo ""

# Cleanup
rm -f /tmp/validate_cookies.txt 2>/dev/null

# Summary
echo "=========================================="
echo "VALIDATION SUMMARY"
echo "=========================================="
echo -e "Passed: ${GREEN}$PASSED${NC}"
echo -e "Failed: ${RED}$FAILED${NC}"
echo ""

if [ $FAILED -eq 0 ]; then
    echo -e "${GREEN}All validations passed!${NC}"
    exit 0
else
    echo -e "${RED}Some validations failed. Please review above.${NC}"
    exit 1
fi
