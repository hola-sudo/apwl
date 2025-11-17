#!/bin/bash

# Verification script for APWL deployment
# Tests backend and frontend endpoints

set -e

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

echo "🔍 APWL Deployment Verification"
echo "================================"
echo ""

# Get URLs from environment or prompt
BACKEND_URL="${BACKEND_URL:-}"
FRONTEND_URL="${FRONTEND_URL:-}"
API_KEY="${API_KEY:-frontend-admin-key-2024}"

if [ -z "$BACKEND_URL" ]; then
    read -p "Enter Backend URL: " BACKEND_URL
fi

if [ -z "$FRONTEND_URL" ]; then
    read -p "Enter Frontend URL: " FRONTEND_URL
fi

echo ""
echo "Testing Backend: $BACKEND_URL"
echo "Testing Frontend: $FRONTEND_URL"
echo ""

# Test backend health endpoint
echo -e "${YELLOW}1. Testing Backend Health Endpoint...${NC}"
if curl -s -f "$BACKEND_URL/health" > /dev/null; then
    echo -e "${GREEN}✅ Backend health endpoint is responding${NC}"
    curl -s "$BACKEND_URL/health" | jq '.' 2>/dev/null || curl -s "$BACKEND_URL/health"
else
    echo -e "${RED}❌ Backend health endpoint failed${NC}"
fi
echo ""

# Test API health endpoint
echo -e "${YELLOW}2. Testing API Health Endpoint...${NC}"
if curl -s -f "$BACKEND_URL/api/health" > /dev/null; then
    echo -e "${GREEN}✅ API health endpoint is responding${NC}"
    curl -s "$BACKEND_URL/api/health" | jq '.' 2>/dev/null || curl -s "$BACKEND_URL/api/health"
else
    echo -e "${RED}❌ API health endpoint failed${NC}"
fi
echo ""

# Test admin health endpoint (requires API key)
echo -e "${YELLOW}3. Testing Admin Health Endpoint (with API key)...${NC}"
if curl -s -f -H "x-api-key: $API_KEY" "$BACKEND_URL/api/admin/health" > /dev/null; then
    echo -e "${GREEN}✅ Admin health endpoint is responding${NC}"
    curl -s -H "x-api-key: $API_KEY" "$BACKEND_URL/api/admin/health" | jq '.' 2>/dev/null || curl -s -H "x-api-key: $API_KEY" "$BACKEND_URL/api/admin/health"
else
    echo -e "${RED}❌ Admin health endpoint failed${NC}"
fi
echo ""

# Test clients endpoint
echo -e "${YELLOW}4. Testing Clients Endpoint...${NC}"
if curl -s -f -H "x-api-key: $API_KEY" "$BACKEND_URL/api/admin/clients" > /dev/null; then
    echo -e "${GREEN}✅ Clients endpoint is responding${NC}"
    curl -s -H "x-api-key: $API_KEY" "$BACKEND_URL/api/admin/clients" | jq '.' 2>/dev/null || curl -s -H "x-api-key: $API_KEY" "$BACKEND_URL/api/admin/clients"
else
    echo -e "${RED}❌ Clients endpoint failed${NC}"
fi
echo ""

# Test agents endpoint
echo -e "${YELLOW}5. Testing Agents Endpoint...${NC}"
if curl -s -f -H "x-api-key: $API_KEY" "$BACKEND_URL/api/admin/agents" > /dev/null; then
    echo -e "${GREEN}✅ Agents endpoint is responding${NC}"
    curl -s -H "x-api-key: $API_KEY" "$BACKEND_URL/api/admin/agents" | jq '.' 2>/dev/null || curl -s -H "x-api-key: $API_KEY" "$BACKEND_URL/api/admin/agents"
else
    echo -e "${RED}❌ Agents endpoint failed${NC}"
fi
echo ""

# Test frontend
echo -e "${YELLOW}6. Testing Frontend...${NC}"
if curl -s -f "$FRONTEND_URL" > /dev/null; then
    echo -e "${GREEN}✅ Frontend is accessible${NC}"
    echo "Frontend URL: $FRONTEND_URL"
else
    echo -e "${RED}❌ Frontend is not accessible${NC}"
fi
echo ""

# Check CORS
echo -e "${YELLOW}7. Testing CORS Configuration...${NC}"
CORS_RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" -H "Origin: $FRONTEND_URL" -H "Access-Control-Request-Method: GET" -X OPTIONS "$BACKEND_URL/api/health")
if [ "$CORS_RESPONSE" = "200" ] || [ "$CORS_RESPONSE" = "204" ]; then
    echo -e "${GREEN}✅ CORS appears to be configured correctly${NC}"
else
    echo -e "${YELLOW}⚠️  CORS check returned status: $CORS_RESPONSE${NC}"
fi
echo ""

echo -e "${GREEN}✅ Verification complete!${NC}"
echo ""
echo "Next steps:"
echo "1. Open frontend in browser: $FRONTEND_URL"
echo "2. Check browser console for errors"
echo "3. Test authentication flow"
echo "4. Verify API calls are working"
