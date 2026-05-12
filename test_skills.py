"""
Avaniko AI Gateway — 3 Skills Test (Python)
Run:  python test_skills.py
Deps: pip install requests
"""
import json
import time
import requests

API_BASE = "https://6picn4vdodn0ao-1111.proxy.runpod.net"
API_KEY  = "ak_AOGGDlSFdZRBUYnuvntlmgKipUL-Q752uYZujn97DXE"

HEADERS = {
    "Content-Type": "application/json",
    "X-API-Key":    API_KEY,
}


def call(system: str, prompt: str, max_tokens: int = 1024, temperature: float = 0.2) -> dict:
    body = {
        "system": system,
        "prompt": prompt,
        "max_tokens": max_tokens,
        "temperature": temperature,
    }
    t0 = time.time()
    r = requests.post(f"{API_BASE}/v1/generate", headers=HEADERS, json=body, timeout=120)
    elapsed = time.time() - t0
    r.raise_for_status()
    data = r.json()
    data["_elapsed"] = elapsed
    return data


def banner(title: str):
    print("\n" + "═" * 70)
    print(f"  {title}")
    print("═" * 70)


def show(res: dict):
    print("\n" + res.get("text", ""))
    u = res.get("usage", {})
    print(f"\n────── Time: {res['_elapsed']:.1f}s | "
          f"Tokens: {u.get('input_tokens', 0)} in / {u.get('output_tokens', 0)} out ──────")


# ══════════════════════════════════════════════════════════════════════
# SKILL 1: Invoice → JSON
# ══════════════════════════════════════════════════════════════════════
def test_invoice():
    banner("🧾 SKILL 1: Invoice Extraction → JSON")
    res = call(
        system=(
            "You are an invoice parser. Extract structured data into JSON. "
            "Return ONLY valid JSON, no markdown, no explanation."
        ),
        prompt="""Parse this invoice:

INVOICE #INV-2026-001
Date: 2026-04-29
Vendor: Avaniko Solutions Pvt Ltd
GSTIN: 33AAACA1234A1Z5
Bill To: ABC Tech, Chennai, India

Line Items:
1. React Development | 40 hrs @ Rs.2500/hr | Subtotal Rs.100000
2. Backend Setup     | 20 hrs @ Rs.3000/hr | Subtotal Rs.60000

Subtotal: Rs.160000
GST (18%): Rs.28800
TOTAL: Rs.188800
Payment Terms: Net 30 days""",
        max_tokens=800,
        temperature=0,
    )
    show(res)

    # Try to parse the JSON
    try:
        text = res["text"].strip()
        # Strip code fences if any
        if text.startswith("```"):
            text = text.split("```")[1]
            if text.startswith("json"):
                text = text[4:]
        parsed = json.loads(text.strip())
        print("\n✅ Valid JSON extracted!")
        print(f"   Invoice #: {parsed.get('invoice_number') or parsed.get('invoice_no')}")
        print(f"   Total: {parsed.get('total')}")
    except Exception as e:
        print(f"\n⚠️  JSON parse failed: {e}")


# ══════════════════════════════════════════════════════════════════════
# SKILL 2: Coding
# ══════════════════════════════════════════════════════════════════════
def test_coding():
    banner("💻 SKILL 2: Coding — Python Function")
    res = call(
        system=(
            "You are an expert Python developer. Write clean, well-commented, "
            "production-ready code. Include test cases."
        ),
        prompt="""Write a Python function `is_palindrome(s: str) -> bool` that:
1. Ignores case, spaces, and punctuation
2. Returns True if the string is a palindrome

Include 5 test cases including edge cases:
- empty string
- single character
- regular palindrome ('racecar')
- mixed case with punctuation ('A man, a plan, a canal: Panama')
- Tamil palindrome ('மலையாளம்')

Return: function code + test calls + expected output.""",
        max_tokens=1500,
        temperature=0.2,
    )
    show(res)


# ══════════════════════════════════════════════════════════════════════
# SKILL 3: Reasoning
# ══════════════════════════════════════════════════════════════════════
def test_reasoning():
    banner("🧠 SKILL 3: Reasoning — Logic Puzzle")
    res = call(
        system=(
            "You are a math tutor. Solve step by step with clear reasoning. "
            "Explain in Tamil and English."
        ),
        prompt="""Three friends paid Rs.3000 total at a hotel (Rs.1000 each).
The manager realized the bill was only Rs.2500 and gave Rs.500 to the bellboy
to return to the guests.

The bellboy kept Rs.200 as a tip and returned Rs.100 to each guest.

Now: each guest paid Rs.900 (3 x 900 = Rs.2700) + Rs.200 bellboy tip = Rs.2900.
But they originally paid Rs.3000.

Question: Where is the missing Rs.100?

Solve step by step. Show clear accounting. Identify the flaw in the puzzle's
logic. Answer in both Tamil and English.""",
        max_tokens=1500,
        temperature=0.3,
    )
    show(res)


# ══════════════════════════════════════════════════════════════════════
# BONUS: Tamil generation
# ══════════════════════════════════════════════════════════════════════
def test_tamil():
    banner("🇮🇳 BONUS: Tamil Language Generation")
    res = call(
        system="You are a Tamil literature expert. Reply only in Tamil.",
        prompt="தமிழ்நாட்டின் 5 புகழ்பெற்ற இடங்கள் பற்றி சுருக்கமாக சொல்லு.",
        max_tokens=600,
        temperature=0.7,
    )
    show(res)


if __name__ == "__main__":
    print("🚀 Avaniko AI Gateway — Skill Tests Starting...")
    print(f"   API: {API_BASE}")
    print(f"   Key: {API_KEY[:20]}...")

    try:
        test_invoice()
        test_coding()
        test_reasoning()
        test_tamil()

        print("\n" + "═" * 70)
        print("  ✅ All tests complete!")
        print("═" * 70)
    except requests.exceptions.RequestException as e:
        print(f"\n❌ Network error: {e}")
        print("   Check: backend running? VPN/firewall? RunPod pod alive?")
    except Exception as e:
        print(f"\n❌ Error: {e}")
