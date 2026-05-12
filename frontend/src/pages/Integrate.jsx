import { useEffect, useState, useMemo } from 'react'
import { motion } from 'framer-motion'
import PageWrapper, { PageHeader } from '../components/layout/PageWrapper'
import Card from '../components/ui/Card'
import Badge from '../components/ui/Badge'
import CodeBlock from '../components/ui/CodeBlock'
import { maskKey, copyToClipboard } from '../utils/formatters'

const API_BASE = import.meta.env.VITE_API_URL || ''

const LANGUAGES = [
  { id: 'curl',   label: 'cURL',       icon: '🌐' },
  { id: 'python', label: 'Python',     icon: '🐍' },
  { id: 'node',   label: 'Node.js',    icon: '🟢' },
  { id: 'js',     label: 'JavaScript', icon: '🟡' },
  { id: 'go',     label: 'Go',         icon: '🐹' },
  { id: 'php',    label: 'PHP',        icon: '🐘' },
  { id: 'java',   label: 'Java',       icon: '☕' },
]

function CopyBtn({ text }) {
  const [copied, setCopied] = useState(false)
  const handle = async () => {
    await copyToClipboard(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 1800)
  }
  return (
    <button
      onClick={handle}
      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-all
        ${copied
          ? 'bg-status-success-bg text-status-success border-status-success/20'
          : 'bg-surface text-text-muted border-border hover:bg-surface-hover hover:text-text-primary'
        }`}
    >
      {copied ? (
        <><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M20 6L9 17l-5-5"/></svg> Copied!</>
      ) : (
        <><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/></svg> Copy</>
      )}
    </button>
  )
}

function buildCode({ lang, mode, apiKey }) {
  const isVision = mode !== 'free' && mode !== 'text'
  const url = `${API_BASE}${isVision ? '/v1/vision/analyze' : '/v1/generate'}`
  const key = apiKey || 'YOUR_API_KEY'

  if (lang === 'curl') {
    if (isVision) return `curl -X POST ${url} \\
  -H "X-API-Key: ${key}" \\
  -F "file=@/path/to/document.pdf" \\
  -F "prompt=Extract data" \\
  -F "mode=${mode}"`
    return `curl -X POST ${url} \\
  -H "Content-Type: application/json" \\
  -H "X-API-Key: ${key}" \\
  -d '{"prompt": "Hello!", "max_tokens": 500, "temperature": 0.7}'`
  }

  if (lang === 'python') {
    if (isVision) return `import requests

API_KEY = "${key}"

with open("document.pdf", "rb") as f:
    response = requests.post(
        "${url}",
        headers={"X-API-Key": API_KEY},
        files={"file": f},
        data={"prompt": "Extract data", "mode": "${mode}"},
        timeout=180,
    )

result = response.json()
print(result["text"])   # extracted JSON/text
print(result["usage"])  # token counts`
    return `import requests

API_KEY = "${key}"

response = requests.post(
    "${url}",
    headers={
        "Content-Type": "application/json",
        "X-API-Key": API_KEY,
    },
    json={"prompt": "Hello!", "max_tokens": 500, "temperature": 0.7},
    timeout=120,
)

result = response.json()
print(result["text"])`
  }

  if (lang === 'node') {
    if (isVision) return `import fs from 'fs';
import FormData from 'form-data';
import axios from 'axios';

const API_KEY = '${key}';
const form = new FormData();
form.append('file', fs.createReadStream('document.pdf'));
form.append('prompt', 'Extract data');
form.append('mode', '${mode}');

const { data } = await axios.post('${url}', form, {
  headers: { ...form.getHeaders(), 'X-API-Key': API_KEY },
  timeout: 180000,
});
console.log(data.text);`
    return `import axios from 'axios';

const { data } = await axios.post('${url}', {
  prompt: 'Hello!',
  max_tokens: 500,
  temperature: 0.7,
}, {
  headers: {
    'Content-Type': 'application/json',
    'X-API-Key': '${key}',
  },
  timeout: 120000,
});
console.log(data.text);`
  }

  if (lang === 'js') {
    return `const response = await fetch('${url}', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'X-API-Key': '${key}',
  },
  body: JSON.stringify({
    prompt: 'Hello!',
    max_tokens: 500,
    temperature: 0.7,
  }),
});

const data = await response.json();
console.log(data.text);`
  }

  if (lang === 'go') {
    return `package main

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
    req, _ := http.NewRequest("POST", "${url}", bytes.NewBuffer(body))
    req.Header.Set("Content-Type", "application/json")
    req.Header.Set("X-API-Key", "${key}")
    resp, _ := http.DefaultClient.Do(req)
    defer resp.Body.Close()
    var result map[string]interface{}
    json.NewDecoder(resp.Body).Decode(&result)
    fmt.Println(result["text"])
}`
  }

  if (lang === 'php') {
    return `<?php
$ch = curl_init('${url}');
curl_setopt_array($ch, [
    CURLOPT_RETURNTRANSFER => true,
    CURLOPT_POST => true,
    CURLOPT_POSTFIELDS => json_encode([
        'prompt'      => 'Hello!',
        'max_tokens'  => 500,
        'temperature' => 0.7,
    ]),
    CURLOPT_HTTPHEADER => [
        'Content-Type: application/json',
        'X-API-Key: ${key}',
    ],
    CURLOPT_TIMEOUT => 120,
]);
$response = json_decode(curl_exec($ch), true);
echo $response['text'];`
  }

  if (lang === 'java') {
    return `import java.net.http.*;
import java.net.URI;

public class Main {
    public static void main(String[] args) throws Exception {
        String body = """
            {"prompt": "Hello!", "max_tokens": 500, "temperature": 0.7}
            """;
        HttpRequest req = HttpRequest.newBuilder()
            .uri(URI.create("${url}"))
            .header("Content-Type", "application/json")
            .header("X-API-Key", "${key}")
            .POST(HttpRequest.BodyPublishers.ofString(body))
            .build();
        HttpResponse<String> resp = HttpClient.newHttpClient()
            .send(req, HttpResponse.BodyHandlers.ofString());
        System.out.println(resp.body());
    }
}`
  }
  return ''
}

export default function Integrate() {
  const savedKeys = (() => { try { return JSON.parse(localStorage.getItem('ai_keys') || '[]') } catch { return [] } })()
  const [apiKey, setApiKey] = useState(savedKeys[0]?.api_key || '')
  const [keyHidden, setKeyHidden] = useState(true)
  const [modes, setModes] = useState([
    { id: 'free', label: 'Free-form', icon: '✨', description: 'General chat / prompts' },
  ])
  const [mode, setMode] = useState('free')
  const [lang, setLang] = useState('python')

  useEffect(() => {
    fetch(`${API_BASE}/v1/modes`)
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (data?.modes) setModes([
          { id: 'free', label: 'Free-form', icon: '✨', description: 'General chat / prompts' },
          ...data.modes.filter(m => m.id !== 'free'),
        ])
      })
      .catch(() => {})
  }, [])

  const code = useMemo(() => buildCode({ lang, mode, apiKey }), [lang, mode, apiKey])
  const selectedMode = modes.find(m => m.id === mode) || modes[0]
  const isVision = mode !== 'free'

  return (
    <PageWrapper>
      <PageHeader
        title="Integrate"
        description="Pick a skill, choose a language, copy the code. Your API key is pre-filled."
      />

      <div className="grid grid-cols-1 lg:grid-cols-[300px_1fr] gap-5 items-start">

        {/* ── Left: Config panel ── */}
        <div className="flex flex-col gap-4">

          {/* API Key */}
          <Card>
            <p className="text-2xs font-semibold text-text-muted uppercase tracking-wider mb-3">API Key</p>
            {savedKeys.length > 0 ? (
              <>
                <select
                  value={apiKey}
                  onChange={e => setApiKey(e.target.value)}
                  className="w-full bg-bg-main border border-border rounded-lg px-3 py-2 text-sm text-text-secondary outline-none focus:border-border-brand mb-3"
                >
                  {savedKeys.map(k => (
                    <option key={k.api_key} value={k.api_key}>{k.name} — {k.api_key?.slice(0, 10)}…</option>
                  ))}
                </select>
                <div className="flex items-center gap-2">
                  <code className="flex-1 font-mono text-xs text-brand truncate">
                    {keyHidden ? maskKey(apiKey) : apiKey}
                  </code>
                  <button onClick={() => setKeyHidden(h => !h)}
                    className="text-xs text-text-muted hover:text-text-primary transition-colors px-2 py-1 border border-border rounded">
                    {keyHidden ? 'Show' : 'Hide'}
                  </button>
                  <CopyBtn text={apiKey} />
                </div>
              </>
            ) : (
              <div className="p-3 rounded-lg bg-status-warning-bg border border-status-warning/20">
                <p className="text-xs text-status-warning">
                  No API key found. <a href="/keys" className="underline">Create one</a> first.
                </p>
              </div>
            )}
          </Card>

          {/* Mode picker */}
          <Card>
            <p className="text-2xs font-semibold text-text-muted uppercase tracking-wider mb-3">Skill / Mode</p>
            <div className="flex flex-col gap-1.5">
              {modes.map(m => (
                <button
                  key={m.id}
                  onClick={() => setMode(m.id)}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-all border
                    ${mode === m.id
                      ? 'bg-surface-active border-border-brand'
                      : 'border-transparent hover:bg-surface-hover'
                    }`}
                >
                  {m.icon && <span className="text-lg shrink-0">{m.icon}</span>}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-text-primary">{m.label}</p>
                    <p className="text-xs text-text-muted truncate">{m.description || (m.id === 'free' ? 'No schema' : 'JSON schema output')}</p>
                  </div>
                  {m.id !== 'free' && <Badge variant="success" className="shrink-0">JSON</Badge>}
                </button>
              ))}
            </div>
          </Card>

          {/* Quick links */}
          <div className="flex flex-col gap-2">
            {[
              { href: '/playground', icon: '🧪', label: 'Try in Playground', sub: 'Test your prompt' },
              { href: '/docs', icon: '📖', label: 'API Docs', sub: 'All endpoints & params' },
              { href: '/keys', icon: '🔑', label: 'Manage Keys', sub: 'Create & monitor' },
            ].map(link => (
              <a key={link.href} href={link.href}
                className="flex items-center gap-3 px-3 py-2.5 rounded-lg card hover:border-border-strong transition-colors">
                <span className="text-xl shrink-0">{link.icon}</span>
                <div>
                  <p className="text-sm font-medium text-text-primary">{link.label}</p>
                  <p className="text-xs text-text-muted">{link.sub}</p>
                </div>
              </a>
            ))}
          </div>
        </div>

        {/* ── Right: Code ── */}
        <div className="flex flex-col gap-4">
          {/* Endpoint info */}
          <Card>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-2xs font-semibold text-text-muted uppercase tracking-wider mb-1.5">Endpoint</p>
                <code className="font-mono text-sm text-brand">
                  POST {isVision ? '/v1/vision/analyze' : '/v1/generate'}
                </code>
              </div>
              <div className="flex gap-2">
                {isVision && <Badge variant="success">Schema</Badge>}
                <Badge variant="info">Streaming</Badge>
              </div>
            </div>
            <p className="text-xs text-text-muted mt-3">
              {isVision
                ? `Strict ${selectedMode?.label} extraction. Output is guaranteed valid JSON.`
                : 'Standard text generation. Send a prompt, receive a response.'}
            </p>
          </Card>

          {/* Language tabs */}
          <div className="flex gap-0.5 border-b border-border">
            {LANGUAGES.map(L => (
              <button
                key={L.id}
                onClick={() => setLang(L.id)}
                className={`flex items-center gap-1.5 px-3 py-2.5 text-sm font-medium transition-all border-b-2 -mb-px
                  ${lang === L.id
                    ? 'border-brand text-text-primary'
                    : 'border-transparent text-text-muted hover:text-text-secondary'
                  }`}
              >
                <span>{L.icon}</span>{L.label}
              </button>
            ))}
          </div>

          {/* Code block with syntax highlighting */}
          <CodeBlock
            code={code}
            lang={lang}
            label={`${LANGUAGES.find(L => L.id === lang)?.label} — ${selectedMode?.label}`}
            maxHeight={540}
          />
        </div>
      </div>
    </PageWrapper>
  )
}
