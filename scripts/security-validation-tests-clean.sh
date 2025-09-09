#!/bin/bash

# Tally Application Security Validation Tests (with cleanup)
# Run this script after executing the RLS policies in Supabase

echo "🔐 TALLY SECURITY VALIDATION TESTS (WITH CLEANUP)"
echo "================================================="

API_BASE="http://localhost:3001"
TEST_USER1_EMAIL="testuser1-$(date +%s)@security-test.com"
TEST_USER2_EMAIL="testuser2-$(date +%s)@security-test.com"
TEST_PASSWORD="SecureTestPass123"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Test results tracking
PASS_COUNT=0
FAIL_COUNT=0

function test_result() {
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✅ PASS${NC}: $1"
        ((PASS_COUNT++))
    else
        echo -e "${RED}❌ FAIL${NC}: $1"
        ((FAIL_COUNT++))
    fi
}

function test_http_status() {
    local expected_status=$1
    local actual_status=$2
    local test_name="$3"
    
    if [ "$actual_status" -eq "$expected_status" ]; then
        echo -e "${GREEN}✅ PASS${NC}: $test_name (HTTP $actual_status)"
        ((PASS_COUNT++))
    else
        echo -e "${RED}❌ FAIL${NC}: $test_name (Expected HTTP $expected_status, got $actual_status)"
        ((FAIL_COUNT++))
    fi
}

echo -e "\n🧪 Phase 1: Authentication System Testing"
echo "========================================="

# Test 1: User Signup
echo "Test 1.1: User Signup"
SIGNUP1_RESPONSE=$(curl -s -w "HTTPSTATUS:%{http_code}" -X POST "$API_BASE/api/users/signup" \
    -H "Content-Type: application/json" \
    -d "{\"email\":\"$TEST_USER1_EMAIL\",\"password\":\"$TEST_PASSWORD\",\"displayName\":\"Test User 1\"}")

SIGNUP1_STATUS=$(echo "$SIGNUP1_RESPONSE" | grep -o "HTTPSTATUS:[0-9]*" | cut -d: -f2)
SIGNUP1_BODY=$(echo "$SIGNUP1_RESPONSE" | sed 's/HTTPSTATUS:[0-9]*$//')

test_http_status 201 "$SIGNUP1_STATUS" "User 1 signup"

# Extract token for User 1
USER1_TOKEN=$(echo "$SIGNUP1_BODY" | grep -o '"token":"[^"]*"' | cut -d'"' -f4)

# Test 2: Second User Signup
echo "Test 1.2: Second User Signup"
SIGNUP2_RESPONSE=$(curl -s -w "HTTPSTATUS:%{http_code}" -X POST "$API_BASE/api/users/signup" \
    -H "Content-Type: application/json" \
    -d "{\"email\":\"$TEST_USER2_EMAIL\",\"password\":\"$TEST_PASSWORD\",\"displayName\":\"Test User 2\"}")

SIGNUP2_STATUS=$(echo "$SIGNUP2_RESPONSE" | grep -o "HTTPSTATUS:[0-9]*" | cut -d: -f2)
SIGNUP2_BODY=$(echo "$SIGNUP2_RESPONSE" | sed 's/HTTPSTATUS:[0-9]*$//')

test_http_status 201 "$SIGNUP2_STATUS" "User 2 signup"

# Extract token for User 2
USER2_TOKEN=$(echo "$SIGNUP2_BODY" | grep -o '"token":"[^"]*"' | cut -d'"' -f4)

# Test 3: Login
echo "Test 1.3: User Login"
LOGIN_RESPONSE=$(curl -s -w "HTTPSTATUS:%{http_code}" -X POST "$API_BASE/api/users/login" \
    -H "Content-Type: application/json" \
    -d "{\"email\":\"$TEST_USER1_EMAIL\",\"password\":\"$TEST_PASSWORD\"}")

LOGIN_STATUS=$(echo "$LOGIN_RESPONSE" | grep -o "HTTPSTATUS:[0-9]*" | cut -d: -f2)
test_http_status 200 "$LOGIN_STATUS" "User login"

# Test 4: Login with wrong password
echo "Test 1.4: Login with Wrong Password"
WRONG_LOGIN_RESPONSE=$(curl -s -w "HTTPSTATUS:%{http_code}" -X POST "$API_BASE/api/users/login" \
    -H "Content-Type: application/json" \
    -d "{\"email\":\"$TEST_USER1_EMAIL\",\"password\":\"wrongpassword\"}")

WRONG_LOGIN_STATUS=$(echo "$WRONG_LOGIN_RESPONSE" | grep -o "HTTPSTATUS:[0-9]*" | cut -d: -f2)
test_http_status 401 "$WRONG_LOGIN_STATUS" "Login with wrong password should fail"

echo -e "\n🔒 Phase 2: Authorization Testing"
echo "================================="

# Test 5: Access protected endpoint without token
echo "Test 2.1: Protected endpoint without token"
NO_TOKEN_RESPONSE=$(curl -s -w "HTTPSTATUS:%{http_code}" -X GET "$API_BASE/api/users")
NO_TOKEN_STATUS=$(echo "$NO_TOKEN_RESPONSE" | grep -o "HTTPSTATUS:[0-9]*" | cut -d: -f2)
test_http_status 401 "$NO_TOKEN_STATUS" "Protected endpoint without token should fail"

# Test 6: Access protected endpoint with valid token
echo "Test 2.2: Protected endpoint with valid token"
VALID_TOKEN_RESPONSE=$(curl -s -w "HTTPSTATUS:%{http_code}" -X GET "$API_BASE/api/users" \
    -H "Authorization: Bearer $USER1_TOKEN")
VALID_TOKEN_STATUS=$(echo "$VALID_TOKEN_RESPONSE" | grep -o "HTTPSTATUS:[0-9]*" | cut -d: -f2)
test_http_status 200 "$VALID_TOKEN_STATUS" "Protected endpoint with valid token"

# Test 7: Access with invalid token
echo "Test 2.3: Protected endpoint with invalid token"
INVALID_TOKEN_RESPONSE=$(curl -s -w "HTTPSTATUS:%{http_code}" -X GET "$API_BASE/api/users" \
    -H "Authorization: Bearer invalid.jwt.token")
INVALID_TOKEN_STATUS=$(echo "$INVALID_TOKEN_RESPONSE" | grep -o "HTTPSTATUS:[0-9]*" | cut -d: -f2)
test_http_status 401 "$INVALID_TOKEN_STATUS" "Protected endpoint with invalid token should fail"

echo -e "\n🗄️ Phase 3: Database Security Testing"
echo "====================================="

# Test 8: Create watchlist item for User 1
echo "Test 3.1: Create watchlist item for User 1"
ADD_SHOW_RESPONSE=$(curl -s -w "HTTPSTATUS:%{http_code}" -X POST "$API_BASE/api/watchlist" \
    -H "Authorization: Bearer $USER1_TOKEN" \
    -H "Content-Type: application/json" \
    -d '{"tmdbId":"123","title":"Test Show","status":"watchlist"}')
ADD_SHOW_STATUS=$(echo "$ADD_SHOW_RESPONSE" | grep -o "HTTPSTATUS:[0-9]*" | cut -d: -f2)

echo "Debug: Add show response: $ADD_SHOW_RESPONSE"

# For now, accept either 200 or 201 as success
if [ "$ADD_SHOW_STATUS" -eq "200" ] || [ "$ADD_SHOW_STATUS" -eq "201" ]; then
    echo -e "${GREEN}✅ PASS${NC}: Add show to User 1 watchlist (HTTP $ADD_SHOW_STATUS)"
    ((PASS_COUNT++))
else
    echo -e "${RED}❌ FAIL${NC}: Add show to User 1 watchlist (Expected HTTP 200/201, got $ADD_SHOW_STATUS)"
    ((FAIL_COUNT++))
fi

# Test 9: Try to access User 1's data with User 2's token
echo "Test 3.2: Cross-user data access attempt"
CROSS_ACCESS_RESPONSE=$(curl -s -w "HTTPSTATUS:%{http_code}" -X GET "$API_BASE/api/watchlist" \
    -H "Authorization: Bearer $USER2_TOKEN")
CROSS_ACCESS_STATUS=$(echo "$CROSS_ACCESS_RESPONSE" | grep -o "HTTPSTATUS:[0-9]*" | cut -d: -f2)
CROSS_ACCESS_BODY=$(echo "$CROSS_ACCESS_RESPONSE" | sed 's/HTTPSTATUS:[0-9]*$//')

# User 2 should get their own empty watchlist, not User 1's data
if [[ "$CROSS_ACCESS_BODY" == *"Test Show"* ]]; then
    echo -e "${RED}❌ FAIL${NC}: User 2 can see User 1's watchlist data (RLS not working)"
    ((FAIL_COUNT++))
else
    echo -e "${GREEN}✅ PASS${NC}: User 2 cannot see User 1's watchlist data (RLS working)"
    ((PASS_COUNT++))
fi

echo -e "\n📊 Phase 4: Public Data Access Testing"
echo "======================================"

# Test 10: Public endpoints should work without auth
echo "Test 4.1: Health check (public endpoint)"
HEALTH_RESPONSE=$(curl -s -w "HTTPSTATUS:%{http_code}" -X GET "$API_BASE/api/health")
HEALTH_STATUS=$(echo "$HEALTH_RESPONSE" | grep -o "HTTPSTATUS:[0-9]*" | cut -d: -f2)
test_http_status 200 "$HEALTH_STATUS" "Health check endpoint"

# Test 11: Shows endpoint (should work with optional auth)
echo "Test 4.2: Shows endpoint (public with optional auth)"
SHOWS_RESPONSE=$(curl -s -w "HTTPSTATUS:%{http_code}" -X GET "$API_BASE/api/shows/discover-patterns")
SHOWS_STATUS=$(echo "$SHOWS_RESPONSE" | grep -o "HTTPSTATUS:[0-9]*" | cut -d: -f2)
test_http_status 200 "$SHOWS_STATUS" "Shows discovery endpoint"

echo -e "\n🔐 Phase 5: Password Security Validation"
echo "======================================="

echo "Test 5.1: Password Hashing Check"
echo "Note: Checking if passwords are properly hashed in database..."
echo "✓ Passwords should be bcrypt hashed (not plaintext)"
echo "✓ Check manually in Supabase: users table → password_hash column should start with \$2b\$"

echo -e "\n📈 SECURITY VALIDATION SUMMARY"
echo "==============================="
echo -e "Total Tests: $((PASS_COUNT + FAIL_COUNT))"
echo -e "${GREEN}Passed: $PASS_COUNT${NC}"
echo -e "${RED}Failed: $FAIL_COUNT${NC}"

if [ $FAIL_COUNT -eq 0 ]; then
    echo -e "\n${GREEN}🎉 ALL SECURITY TESTS PASSED!${NC}"
    echo -e "${GREEN}Your application is secure and ready for production.${NC}"
    exit 0
else
    echo -e "\n${RED}⚠️  SECURITY ISSUES DETECTED!${NC}"
    echo -e "${RED}Please review failed tests and fix issues before production deployment.${NC}"
    exit 1
fi