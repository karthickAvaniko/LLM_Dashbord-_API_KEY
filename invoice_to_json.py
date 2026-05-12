"""
Invoice → JSON Converter (CLI)

Usage:
    python invoice_to_json.py <file_path> [output.json]

Examples:
    python invoice_to_json.py invoice.pdf
    python invoice_to_json.py photo.jpg result.json
"""
import sys
import json
import os
import mimetypes
import requests

# ═══════════════════════════════════════════════════════════════
# CONFIG — edit if needed
# ═══════════════════════════════════════════════════════════════
API_KEY  = "ak_gsu4CbDhJtQYNrLzLarX0fUHQFdrCznC0Bqx58w9hz0"
BASE_URL = "https://wo50dppqmt72bl-1111.proxy.runpod.net"

# ═══════════════════════════════════════════════════════════════


def extract_invoice(file_path: str) -> dict:
    """Send invoice → get structured JSON back."""
    if not os.path.exists(file_path):
        raise FileNotFoundError(f"File not found: {file_path}")

    mime, _ = mimetypes.guess_type(file_path)
    mime = mime or "application/octet-stream"

    print(f"📤 Uploading {os.path.basename(file_path)} ({mime})...")
    with open(file_path, "rb") as f:
        files = {"file": (os.path.basename(file_path), f.read(), mime)}

    data = {
        "prompt": "Extract this invoice. Output valid JSON only — no markdown, no preamble.",
        "mode": "invoice",
        "max_tokens": "4096",
        "temperature": "0",
    }
    headers = {"X-API-Key": API_KEY}

    r = requests.post(
        f"{BASE_URL}/v1/vision/analyze",
        headers=headers, files=files, data=data,
        timeout=300,
    )
    if r.status_code != 200:
        raise RuntimeError(f"API error {r.status_code}: {r.text[:300]}")

    result = r.json()
    raw = result.get("text") or result.get("result", "")
    usage = result.get("usage", {})

    print(f"📊 Tokens used: input={usage.get('input_tokens', 0)} "
          f"output={usage.get('output_tokens', 0)}")

    # Strip code fences if present
    t = raw.strip()
    if t.startswith("```"):
        parts = t.split("```")
        if len(parts) >= 2:
            t = parts[1]
            if t.startswith("json"): t = t[4:]
    t = t.strip()

    try:
        return json.loads(t)
    except json.JSONDecodeError as e:
        # Try to find the first { ... } block
        start = t.find("{")
        end = t.rfind("}")
        if start != -1 and end != -1:
            try:
                return json.loads(t[start:end + 1])
            except json.JSONDecodeError:
                pass
        raise RuntimeError(f"Could not parse JSON from response. Raw:\n{raw[:500]}")


def main():
    if len(sys.argv) < 2:
        print(__doc__)
        sys.exit(1)

    file_path = sys.argv[1]
    output_path = sys.argv[2] if len(sys.argv) > 2 else "invoice.json"

    try:
        data = extract_invoice(file_path)
    except Exception as e:
        print(f"❌ Error: {e}", file=sys.stderr)
        sys.exit(1)

    with open(output_path, "w", encoding="utf-8") as f:
        json.dump(data, f, indent=2, ensure_ascii=False)

    print(f"\n✅ Saved → {output_path}\n")
    print("─" * 60)
    print(json.dumps(data, indent=2, ensure_ascii=False))


if __name__ == "__main__":
    main()
