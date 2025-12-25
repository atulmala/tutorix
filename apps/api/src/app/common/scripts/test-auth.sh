#!/bin/bash

# Test Authentication Script
# This script helps test the authentication system using cURL

API_URL="http://localhost:3000/api/graphql"

echo "🧪 Testing Authentication System"
echo "=================================="
echo ""

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Test 1: Register Admin
echo -e "${BLUE}Test 1: Registering Admin User...${NC}"
REGISTER_RESPONSE=$(curl -s -X POST "$API_URL" \
  -H "Content-Type: application/json" \
  -d '{
    "query": "mutation { register(input: { role: ADMIN, email: \"admin@tutorix.com\", password: \"Admin123!@#\", firstName: \"Admin\", lastName: \"User\" }) { accessToken refreshToken user { id email role } } }"
  }')

echo "$REGISTER_RESPONSE" | jq '.' 2>/dev/null || echo "$REGISTER_RESPONSE"
echo ""

# Extract access token (requires jq)
ACCESS_TOKEN=$(echo "$REGISTER_RESPONSE" | jq -r '.data.register.accessToken' 2>/dev/null)

if [ "$ACCESS_TOKEN" != "null" ] && [ -n "$ACCESS_TOKEN" ]; then
  echo -e "${GREEN}✅ Registration successful!${NC}"
  echo -e "${YELLOW}Access Token: ${ACCESS_TOKEN:0:50}...${NC}"
  echo ""
  
  # Test 2: Get Current User (requires auth)
  echo -e "${BLUE}Test 2: Getting current user (requires authentication)...${NC}"
  ME_RESPONSE=$(curl -s -X POST "$API_URL" \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer $ACCESS_TOKEN" \
    -d '{
      "query": "query { me { id email role firstName lastName } }"
    }')
  
  echo "$ME_RESPONSE" | jq '.' 2>/dev/null || echo "$ME_RESPONSE"
  echo ""
  
  if echo "$ME_RESPONSE" | jq -e '.data.me' > /dev/null 2>&1; then
    echo -e "${GREEN}✅ Authentication test successful!${NC}"
  else
    echo -e "${YELLOW}⚠️  Authentication test failed. Check the error above.${NC}"
  fi
else
  echo -e "${YELLOW}⚠️  Registration might have failed or user already exists.${NC}"
  echo -e "${BLUE}Trying to login instead...${NC}"
  echo ""
  
  # Test Login
  LOGIN_RESPONSE=$(curl -s -X POST "$API_URL" \
    -H "Content-Type: application/json" \
    -d '{
      "query": "mutation { login(input: { loginId: \"admin@tutorix.com\", password: \"Admin123!@#\" }) { accessToken refreshToken user { id email role } } }"
    }')
  
  echo "$LOGIN_RESPONSE" | jq '.' 2>/dev/null || echo "$LOGIN_RESPONSE"
  echo ""
  
  ACCESS_TOKEN=$(echo "$LOGIN_RESPONSE" | jq -r '.data.login.accessToken' 2>/dev/null)
  
  if [ "$ACCESS_TOKEN" != "null" ] && [ -n "$ACCESS_TOKEN" ]; then
    echo -e "${GREEN}✅ Login successful!${NC}"
    echo -e "${YELLOW}Access Token: ${ACCESS_TOKEN:0:50}...${NC}"
  fi
fi

echo ""
echo -e "${BLUE}==================================${NC}"
echo -e "${GREEN}Testing complete!${NC}"
echo ""
echo "💡 Tip: Use GraphQL Playground at http://localhost:3000/api/graphql for interactive testing"

