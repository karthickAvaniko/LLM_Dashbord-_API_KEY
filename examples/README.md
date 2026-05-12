# Avaniko AI — Examples

Real working code for every use case. **One API key, all skills.**

## Setup

```bash
# Python
cd ..
pip install -e ./sdk/python
export AVANIKO_API_KEY=ak_your_key

# Node.js (>= 18)
cd sdk/javascript
npm link
export AVANIKO_API_KEY=ak_your_key
```

## Examples

| File | What it does | Use case |
|------|-------------|----------|
| `01_chatbot.py` | Multi-turn chat with streaming | Customer support, virtual assistants |
| `02_invoice_extractor.py` | Bulk PDF/image → JSON | Accounting automation |
| `03_code_generator.py` | Generate, explain, fix, SQL from NL | Dev tooling, IDE plugins |
| `04_translator_summarizer.py` | Translate, summarize, sentiment, Q&A, NER | Content workflows |
| `05_node_chatbot.js` | Same as #1 in Node.js | Server-side chatbots |
| `06_browser_invoice_app.html` | Browser-based invoice extractor (demo only) | Quick prototypes |

## Production Recommendation

⚠ **Don't put your API key in browser code.** Use the customer proxy template:

```
customer-proxy-template/  # FastAPI backend that hides your key
```

Your customers' apps call YOUR backend → your backend calls Avaniko API.

## API Key

Get yours at: `https://avaniko.com/get-api-key` (or wherever your gateway is hosted).
