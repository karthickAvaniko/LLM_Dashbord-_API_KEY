# 🤖 Avaniko AI — Gemini-style Usage Guide (தமிழ்)

Gemini-மாதிரி API key வச்சு multiple skills (Invoice, Coding, Reasoning) எல்லா இடத்திலும் use பண்றது.

---

## 🎯 Big Picture — Gemini vs Avaniko

| Feature | Gemini | Avaniko AI |
|---------|--------|------------|
| API Key | `AIza...` | `ak_...` |
| Endpoint | `generativelanguage.googleapis.com` | `6picn4vdodn0ao-1111.proxy.runpod.net` |
| Model | `gemini-pro` | `qwen3.6-35b` |
| SDK | `google-generativeai` | `avaniko-ai` |
| Auth header | `?key=AIza...` | `X-API-Key: ak_...` |
| Free tier | Yes | Yes (200 req/day) |

API call structure same — only auth + URL different.

---

## 🐍 Python — Quick Start

### Install (local)
```bash
cd D:\llmDashboard\llmDashboard\sdk\python
pip install -e .
```

### Use anywhere
```python
import avaniko_ai as ai

# 1. Configure (once per app)
ai.configure(api_key="ak_AOGGDlSFdZRBUYnuvntlmgKipUL-Q752uYZujn97DXE")

# 2. Generic generation (Gemini-style)
model = ai.GenerativeModel("qwen3.6-35b")
response = model.generate_content("வணக்கம்! நீ யார்?")
print(response.text)
print(f"Tokens used: {response.total_tokens}")
```

---

## 🧾 Skill 1: Invoice → JSON

### Text invoice:
```python
import avaniko_ai as ai

ai.configure(api_key="ak_xxx")

invoice_text = """
INVOICE #INV-2026-001
Date: 2026-04-29
Vendor: Avaniko Solutions
Total: Rs.188800
"""

skill = ai.InvoiceSkill()
data = skill.parse_text(invoice_text)
print(data)
# {"invoice_number": "INV-2026-001", "total": 188800, ...}
```

### Image invoice (PDF/JPG/PNG):
```python
skill = ai.InvoiceSkill()
data = skill.parse_image("invoice.jpg")
print(data["total"])
```

---

## 💻 Skill 2: Coding

```python
import avaniko_ai as ai

ai.configure(api_key="ak_xxx")
coder = ai.CodingSkill()

# Write code
code = coder.write(
    "Function to validate Indian PAN number",
    language="python"
)
print(code)

# Explain code
explanation = coder.explain(my_code)

# Fix bug
fixed = coder.fix(buggy_code, error="IndexError on line 5")

# Code review
feedback = coder.review(my_module)
```

---

## 🧠 Skill 3: Reasoning

```python
import avaniko_ai as ai

ai.configure(api_key="ak_xxx")
brain = ai.ReasoningSkill()

# Solve logic problems
answer = brain.solve(
    "If 5 cats catch 5 mice in 5 minutes, "
    "how many cats are needed for 100 mice in 100 minutes?"
)
print(answer)

# Make plans
plan = brain.plan("Launch a SaaS product in 30 days")
```

---

## 🌐 JavaScript / Browser

### HTML / Vanilla JS:
```html
<script type="module">
  import * as ai from './avaniko-ai.js';

  ai.configure({ apiKey: 'ak_xxx' });

  const model = new ai.GenerativeModel();
  const resp = await model.generateContent('வணக்கம்!');
  console.log(resp.text);
</script>
```

### React Component:
```jsx
import { useState } from 'react';
import * as ai from './avaniko-ai.js';

ai.configure({ apiKey: import.meta.env.VITE_API_KEY });

function Chat() {
  const [response, setResponse] = useState('');
  const model = new ai.GenerativeModel();

  const handleSubmit = async (prompt) => {
    const r = await model.generateContent(prompt);
    setResponse(r.text);
  };

  return <div>{response}</div>;
}
```

### Node.js:
```javascript
const ai = require('./avaniko-ai');

ai.configure({ apiKey: process.env.AVANIKO_API_KEY });

(async () => {
  const skill = new ai.CodingSkill();
  const code = await skill.write('Express middleware for rate limiting');
  console.log(code);
})();
```

---

## 🔌 Direct REST API (Any Language)

SDK இல்லாம, direct HTTP call:

### Python (requests):
```python
import requests

r = requests.post(
    "https://6picn4vdodn0ao-1111.proxy.runpod.net/v1/generate",
    headers={
        "Content-Type": "application/json",
        "X-API-Key": "ak_xxx"
    },
    json={
        "prompt": "Hello!",
        "max_tokens": 500,
        "temperature": 0.7
    }
)
print(r.json()["text"])
```

### curl:
```bash
curl -X POST https://6picn4vdodn0ao-1111.proxy.runpod.net/v1/generate \
  -H "Content-Type: application/json" \
  -H "X-API-Key: ak_xxx" \
  -d '{"prompt":"Hello","max_tokens":500}'
```

### Go:
```go
package main

import (
    "bytes"
    "encoding/json"
    "fmt"
    "net/http"
)

func main() {
    body, _ := json.Marshal(map[string]interface{}{
        "prompt":      "Hello!",
        "max_tokens":  500,
        "temperature": 0.7,
    })
    req, _ := http.NewRequest("POST",
        "https://6picn4vdodn0ao-1111.proxy.runpod.net/v1/generate",
        bytes.NewBuffer(body))
    req.Header.Set("Content-Type", "application/json")
    req.Header.Set("X-API-Key", "ak_xxx")

    resp, _ := http.DefaultClient.Do(req)
    var result map[string]interface{}
    json.NewDecoder(resp.Body).Decode(&result)
    fmt.Println(result["text"])
}
```

### Java:
```java
HttpRequest request = HttpRequest.newBuilder()
    .uri(URI.create("https://6picn4vdodn0ao-1111.proxy.runpod.net/v1/generate"))
    .header("Content-Type", "application/json")
    .header("X-API-Key", "ak_xxx")
    .POST(BodyPublishers.ofString(
        "{\"prompt\":\"Hello\",\"max_tokens\":500}"))
    .build();
HttpResponse<String> response = HttpClient.newHttpClient()
    .send(request, BodyHandlers.ofString());
System.out.println(response.body());
```

---

## 📦 Real-World Use Case Examples

### 1. Invoice automation pipeline
```python
import avaniko_ai as ai
import os

ai.configure(api_key=os.getenv("AVANIKO_API_KEY"))
inv = ai.InvoiceSkill()

for file in os.listdir("./invoices"):
    data = inv.parse_image(f"./invoices/{file}")
    save_to_database(data)
```

### 2. AI coding assistant in VS Code
```javascript
const ai = require('avaniko-ai');
ai.configure({ apiKey: process.env.AVANIKO_API_KEY });

vscode.commands.registerCommand('avaniko.explain', async () => {
  const code = vscode.window.activeTextEditor.document.getText();
  const coder = new ai.CodingSkill();
  const explanation = await coder.explain(code);
  vscode.window.showInformationMessage(explanation);
});
```

### 3. Customer support chatbot (multi-turn)
```python
import avaniko_ai as ai

ai.configure(api_key="ak_xxx")
model = ai.GenerativeModel(system_instruction="You are Avaniko's customer support agent.")

history = []
while True:
    user_msg = input("You: ")
    history.append({"role": "user", "content": user_msg})
    resp = model.chat(history)
    bot_msg = resp["choices"][0]["message"]["content"]
    history.append({"role": "assistant", "content": bot_msg})
    print(f"Bot: {bot_msg}")
```

---

## 🔐 Security Best Practices

### ❌ Don't:
```python
# Never hardcode API key in code
api_key = "ak_AOGGDlSFdZRBUYnuvntlmgKipUL-Q752uYZujn97DXE"
```

### ✅ Do:
```python
# Use environment variable
import os
ai.configure(api_key=os.getenv("AVANIKO_API_KEY"))
```

### Browser security:
Frontend-ல API key directly use பண்ணினா → **users see it in DevTools**.

**Solution:** Backend proxy create பண்ணுங்க:
```
Browser → Your Backend (key stored) → Avaniko AI
```

---

## 💰 Pricing & Limits

| Tier | Rate Limit | Daily Limit | Cost |
|------|-----------|-------------|------|
| Free (default) | 10 req/min | 200 req/day | Free |
| Pro | 60 req/min | 10,000 req/day | TBD |

---

## 🚀 Next Steps Roadmap

| Phase | Feature | Status |
|-------|---------|--------|
| 1 | API key auth | ✅ Done |
| 2 | Python SDK | ✅ Done |
| 3 | JS/Node SDK | ✅ Done |
| 4 | Streaming (SSE) | ⏳ Pending |
| 5 | Function calling | ⏳ Pending |
| 6 | Custom domain (api.avaniko.com) | ⏳ Pending |
| 7 | Documentation site | ⏳ Pending |
| 8 | Pip/npm publish | ⏳ Pending |
| 9 | Usage dashboard | ⏳ Pending |
| 10 | Multi-key per user | ⏳ Pending |

---

## 📞 Support

Issues? Bug? Feature request?
- GitHub: TBD
- Email: support@avaniko.com
- Slack: #avaniko-ai
