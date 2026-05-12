"""
Example 2 — Bulk invoice extraction → JSON files.

Drops every invoice in ./invoices/ → corresponding ./output/<name>.json

Run:
  export AVANIKO_API_KEY=ak_xxx
  python 02_invoice_extractor.py
"""
import os, json, glob
import avaniko_ai as ai

ai.configure()

INPUT_DIR  = "./invoices"
OUTPUT_DIR = "./output"
os.makedirs(OUTPUT_DIR, exist_ok=True)

files = glob.glob(f"{INPUT_DIR}/*.pdf") + glob.glob(f"{INPUT_DIR}/*.jpg") + glob.glob(f"{INPUT_DIR}/*.png")
print(f"Found {len(files)} invoice(s) to process\n")

for path in files:
    name = os.path.splitext(os.path.basename(path))[0]
    out_path = f"{OUTPUT_DIR}/{name}.json"
    print(f"→ {name}...", end="", flush=True)
    try:
        data = ai.documents.extract_invoice(path)
        with open(out_path, "w", encoding="utf-8") as f:
            json.dump(data, f, indent=2, ensure_ascii=False)
        print(f" ✓ saved (total: ₹{data.get('total', 'N/A')})")
    except Exception as e:
        print(f" ✗ {e}")

print(f"\nDone. JSON files in {OUTPUT_DIR}/")
