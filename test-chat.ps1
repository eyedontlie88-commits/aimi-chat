# Production Smoke Test Script (PowerShell)
# Tests chat functionality and fallback behavior

param(
    [string]$BaseUrl = "https://aimi-chat-yig9.vercel.app",
    [string]$AuthToken = $env:AUTH_TOKEN,
    [string]$CharacterId = $env:CHARACTER_ID,
    [string]$AdminSecret = $env:ADMIN_SECRET
)

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "AImi Chat - Production Smoke Test" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Check prerequisites
if (-not $AuthToken) {
    Write-Host "❌ ERROR: AUTH_TOKEN not set" -ForegroundColor Red
    Write-Host "Usage: `$env:AUTH_TOKEN='your-token'; `$env:CHARACTER_ID='your-id'; `$env:ADMIN_SECRET='your-secret'; .\test-chat.ps1"
    exit 1
}

if (-not $CharacterId) {
    Write-Host "⚠️  WARNING: CHARACTER_ID not set, using 'test'" -ForegroundColor Yellow
    $CharacterId = "test"
}

Write-Host "Base URL: $BaseUrl"
Write-Host "Character ID: $CharacterId"
Write-Host ""

# Test 1: Provider Status Check
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Test 1: Check Provider Status" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan

if ($AdminSecret) {
    Write-Host "Checking /api/admin/llm-status..."
    
    try {
        $statusResponse = Invoke-RestMethod -Uri "$BaseUrl/api/admin/llm-status" `
            -Headers @{ "x-admin-secret" = $AdminSecret } `
            -Method Get
        
        $statusResponse | ConvertTo-Json -Depth 10
        
        if ($statusResponse.summary.status -eq "operational") {
            Write-Host "✅ Provider status: operational" -ForegroundColor Green
        } else {
            Write-Host "❌ Provider status check failed" -ForegroundColor Red
        }
    } catch {
        Write-Host "❌ Failed to check provider status: $($_.Exception.Message)" -ForegroundColor Red
    }
    Write-Host ""
} else {
    Write-Host "⚠️  ADMIN_SECRET not set, skipping provider status check" -ForegroundColor Yellow
    Write-Host ""
}

# Test 2: Normal Chat Request
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Test 2: Normal Chat Request (Gemini)" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Sending chat request..."

$chatBody = @{
    characterId = $CharacterId
    messages = @(
        @{
            role = "user"
            content = "Hello, how are you today?"
        }
    )
} | ConvertTo-Json -Depth 10

try {
    $chatResponse = Invoke-RestMethod -Uri "$BaseUrl/api/chat" `
        -Headers @{ 
            "Authorization" = "Bearer $AuthToken"
            "Content-Type" = "application/json"
        } `
        -Method Post `
        -Body $chatBody
    
    Write-Host "✅ Chat request successful" -ForegroundColor Green
    Write-Host ""
    Write-Host "Response preview:"
    
    # Show formatted response
    $chatResponse | ConvertTo-Json -Depth 5
    
    Write-Host ""
    Write-Host "Provider used: $($chatResponse.providerUsed)" -ForegroundColor Green
    Write-Host "Fallback used: $($chatResponse.fallbackUsed)"
    Write-Host "Attempt count: $($chatResponse.attemptCount)"
    
} catch {
    Write-Host "❌ Chat request failed" -ForegroundColor Red
    Write-Host "Error: $($_.Exception.Message)"
    
    if ($_.ErrorDetails) {
        Write-Host "Response body:"
        $_.ErrorDetails.Message
    }
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Test Summary" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "To monitor real-time logs:"
Write-Host "  vercel logs --follow"
Write-Host ""
Write-Host "Or in Vercel Dashboard:"
Write-Host "  Project → Deployments → Latest → Logs"
Write-Host ""
Write-Host "Expected log patterns:"
Write-Host "  ✅ [LLM Router] ✅ Success with gemini"
Write-Host "  🔄 [LLM Router] ❌ Provider X failed (if fallback triggered)"
Write-Host "  🔄 [LLM Router] Error is retriable, trying next provider..."
Write-Host ""
