# ════════════════════════════════════════════════════════════════
# Avaniko AI Gateway — 3 Skills Test Script (PowerShell)
# Run: .\test_skills.ps1
# ════════════════════════════════════════════════════════════════

$API_BASE = "https://6picn4vdodn0ao-1111.proxy.runpod.net"
$API_KEY  = "ak_AOGGDlSFdZRBUYnuvntlmgKipUL-Q752uYZujn97DXE"

$headers = @{
    "Content-Type" = "application/json"
    "X-API-Key"    = $API_KEY
}

function Test-Skill {
    param($Title, $Body)
    Write-Host ""
    Write-Host "════════════════════════════════════════════════════════════════" -ForegroundColor Cyan
    Write-Host "  $Title" -ForegroundColor Yellow
    Write-Host "════════════════════════════════════════════════════════════════" -ForegroundColor Cyan
    $sw = [Diagnostics.Stopwatch]::StartNew()
    try {
        $res = Invoke-RestMethod -Uri "$API_BASE/v1/generate" -Method Post -Headers $headers -Body ($Body | ConvertTo-Json -Depth 5)
        $sw.Stop()
        Write-Host ""
        Write-Host "RESPONSE:" -ForegroundColor Green
        Write-Host $res.text
        Write-Host ""
        Write-Host "─────────────────────────────────" -ForegroundColor DarkGray
        Write-Host "Time: $($sw.Elapsed.TotalSeconds.ToString('F1'))s | Tokens: $($res.usage.input_tokens) in / $($res.usage.output_tokens) out" -ForegroundColor DarkGray
    } catch {
        Write-Host "ERROR: $_" -ForegroundColor Red
    }
}

# ════════════════════════════════════════════════════════════════
# SKILL 1: Invoice → JSON
# ════════════════════════════════════════════════════════════════
Test-Skill "🧾 SKILL 1: Invoice Extraction → JSON" @{
    system = "You are an invoice parser. Extract structured data. Return ONLY valid JSON. No prose, no markdown, no explanation."
    prompt = @"
Parse this invoice into JSON:

INVOICE #INV-2026-001
Date: 2026-04-29
Vendor: Avaniko Solutions Pvt Ltd, GSTIN: 33AAACA1234A1Z5
Bill To: ABC Tech, Chennai

Items:
- React Development | 40 hrs | Rate Rs.2500 | Total Rs.100000
- Backend Setup     | 20 hrs | Rate Rs.3000 | Total Rs.60000

Subtotal: Rs.160000
GST 18%:  Rs.28800
TOTAL:    Rs.188800
Payment Terms: Net 30 days
"@
    max_tokens = 800
    temperature = 0
}

# ════════════════════════════════════════════════════════════════
# SKILL 2: Coding
# ════════════════════════════════════════════════════════════════
Test-Skill "💻 SKILL 2: Coding — Python Function" @{
    system = "You are an expert Python developer. Write clean, well-commented, production-ready code. Include test cases."
    prompt = @"
Write a Python function `is_palindrome(s: str) -> bool` that:
1. Ignores case, spaces, and punctuation
2. Returns True if string is palindrome

Include 5 test cases including edge cases (empty string, single char, Tamil text 'மலையாளம்').
"@
    max_tokens = 1500
    temperature = 0.2
}

# ════════════════════════════════════════════════════════════════
# SKILL 3: Reasoning
# ════════════════════════════════════════════════════════════════
Test-Skill "🧠 SKILL 3: Reasoning — Logic Puzzle" @{
    system = "You are a math tutor. Solve step by step. Explain in Tamil and English."
    prompt = @"
3 friends paid Rs.3000 total at a hotel (Rs.1000 each).
Manager realized bill is only Rs.2500 — gave Rs.500 to bellboy to return.
Bellboy kept Rs.200 tip, gave Rs.100 to each friend.

Now each paid Rs.900 (3 x 900 = Rs.2700) + Rs.200 bellboy tip = Rs.2900.
Where is the missing Rs.100?

Solve step by step. Show the accounting clearly.
"@
    max_tokens = 1200
    temperature = 0.3
}

Write-Host ""
Write-Host "════════════════════════════════════════════════════════════════" -ForegroundColor Green
Write-Host "  ✅ All 3 skill tests complete!" -ForegroundColor Green
Write-Host "════════════════════════════════════════════════════════════════" -ForegroundColor Green
