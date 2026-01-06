#!/bin/bash

# Production Smoke Test Script
# Tests chat functionality and fallback behavior

set -e

# Configuration
BASE_URL="${BASE_URL:-https://aimi-chat-yig9.vercel.app}"
AUTH_TOKEN="${AUTH_TOKEN:-}"
CHARACTER_ID="${CHARACTER_ID:-}"
ADMIN_SECRET="${ADMIN_SECRET:-}"

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo "========================================"
echo "AImi Chat - Production Smoke Test"
echo "========================================"
echo ""

# Check prerequisites
if [ -z "$AUTH_TOKEN" ]; then
    echo -e "${RED}❌ ERROR: AUTH_TOKEN not set${NC}"
    echo "Usage: AUTH_TOKEN=your-token CHARACTER_ID=your-id ADMIN_SECRET=your-secret ./test-chat.sh"
    exit 1
fi

if [ -z "$CHARACTER_ID" ]; then
    echo -e "${YELLOW}⚠️  WARNING: CHARACTER_ID not set, using 'test'${NC}"
    CHARACTER_ID="test"
fi

echo "Base URL: $BASE_URL"
echo "Character ID: $CHARACTER_ID"
echo ""

# Test 1: Provider Status Check
echo "========================================" 
echo "Test 1: Check Provider Status"
echo "========================================" 

if [ -n "$ADMIN_SECRET" ]; then
    echo "Checking /api/admin/llm-status..."
    STATUS_RESPONSE=$(curl -s "$BASE_URL/api/admin/llm-status" \
        -H "x-admin-secret: $ADMIN_SECRET")
    
    echo "$STATUS_RESPONSE" | python -m json.tool 2>/dev/null || echo "$STATUS_RESPONSE"
    
    # Check if operational
    if echo "$STATUS_RESPONSE" | grep -q '"status":"operational"'; then
        echo -e "${GREEN}✅ Provider status: operational${NC}"
    else
        echo -e "${RED}❌ Provider status check failed${NC}"
    fi
    echo ""
else
    echo -e "${YELLOW}⚠️  ADMIN_SECRET not set, skipping provider status check${NC}"
    echo ""
fi

# Test 2: Normal Chat Request
echo "========================================" 
echo "Test 2: Normal Chat Request (Gemini)"
echo "========================================" 
echo "Sending chat request..."

CHAT_RESPONSE=$(curl -s -w "\n%{http_code}" "$BASE_URL/api/chat" \
    -H "Authorization: Bearer $AUTH_TOKEN" \
    -H "Content-Type: application/json" \
    -d "{
        \"characterId\": \"$CHARACTER_ID\",
        \"messages\": [{\"role\": \"user\", \"content\": \"Hello, how are you today?\"}]
    }")

# Split response and status code
HTTP_CODE=$(echo "$CHAT_RESPONSE" | tail -n1)
RESPONSE_BODY=$(echo "$CHAT_RESPONSE" | head -n-1)

echo "HTTP Status: $HTTP_CODE"
echo ""

if [ "$HTTP_CODE" = "200" ]; then
    echo -e "${GREEN}✅ Chat request successful${NC}"
    echo ""
    echo "Response preview:"
    echo "$RESPONSE_BODY" | python -m json.tool 2>/dev/null | head -n 20 || echo "$RESPONSE_BODY" | head -c 500
    echo ""
    
    # Extract provider used
    PROVIDER=$(echo "$RESPONSE_BODY" | grep -o '"providerUsed":"[^"]*"' | cut -d'"' -f4)
    FALLBACK_USED=$(echo "$RESPONSE_BODY" | grep -o '"fallbackUsed":[^,}]*' | cut -d':' -f2)
    
    if [ -n "$PROVIDER" ]; then
        echo -e "Provider used: ${GREEN}$PROVIDER${NC}"
        echo "Fallback used: $FALLBACK_USED"
    fi
else
    echo -e "${RED}❌ Chat request failed${NC}"
    echo "Response:"
    echo "$RESPONSE_BODY" | python -m json.tool 2>/dev/null || echo "$RESPONSE_BODY"
fi

echo ""
echo "========================================" 
echo "Test Summary"
echo "========================================" 
echo ""
echo "To monitor real-time logs:"
echo "  vercel logs --follow"
echo ""
echo "Or in Vercel Dashboard:"
echo "  Project → Deployments → Latest → Logs"
echo ""
echo "Expected log patterns:"
echo "  ✅ [LLM Router] ✅ Success with gemini"
echo "  🔄 [LLM Router] ❌ Provider X failed (if fallback triggered)"
echo "  🔄 [LLM Router] Error is retriable, trying next provider..."
echo ""
