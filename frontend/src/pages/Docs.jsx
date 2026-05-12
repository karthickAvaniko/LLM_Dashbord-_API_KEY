import { useState } from 'react'
import PageWrapper from '../components/layout/PageWrapper'
import Card from '../components/ui/Card'

// Gateway URL — replace with your server URL (do NOT hardcode RunPod URLs here)
const API_BASE = import.meta.env.VITE_API_URL || 'https://your-gateway-url'

/* ── Copy button ── */
function CopyBtn({ text }) {
  const [copied, setCopied] = useState(false)
  function handle() {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }
  return (
    <button
      onClick={handle}
      className="flex items-center gap-1 text-[10px] font-semibold px-2 py-1 rounded transition-colors"
      style={{
        color:      copied ? 'var(--color-status-success)' : 'var(--color-text-muted)',
        background: 'rgba(255,255,255,0.06)',
      }}
    >
      {copied ? (
        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg>
      ) : (
        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/></svg>
      )}
      {copied ? 'Copied' : 'Copy'}
    </button>
  )
}

/* ── Code block ── */
function Code({ code, lang = 'bash' }) {
  return (
    <div
      className="rounded-xl overflow-hidden border border-border"
      style={{ background: '#0D0B22' }}
    >
      <div
        className="flex items-center justify-between px-4 py-2 border-b"
        style={{ borderColor: 'rgba(255,255,255,0.06)', background: '#100D30' }}
      >
        <span className="text-[10px] font-semibold tracking-widest uppercase" style={{ color: '#6B5F98' }}>
          {lang}
        </span>
        <CopyBtn text={code} />
      </div>
      <pre
        className="px-4 py-4 text-xs overflow-x-auto no-scrollbar"
        style={{ color: '#C4BFEE', fontFamily: 'JetBrains Mono, Fira Code, monospace', lineHeight: 1.7 }}
      >
        <code>{code}</code>
      </pre>
    </div>
  )
}

/* ── Section heading ── */
function Section({ id, title, description, children }) {
  return (
    <section id={id} className="scroll-mt-6">
      <h3 className="text-base font-bold text-text-primary mb-1">{title}</h3>
      {description && <p className="text-sm text-text-muted mb-4">{description}</p>}
      {children}
    </section>
  )
}

/* ── Method badge ── */
function Method({ m }) {
  const colors = { GET:'#10B981', POST:'#6366F1', DELETE:'#EF4444', PUT:'#F59E0B' }
  return (
    <span
      className="text-[10px] font-bold px-2 py-0.5 rounded"
      style={{ background: (colors[m] ?? '#6B7280') + '22', color: colors[m] ?? '#6B7280' }}
    >
      {m}
    </span>
  )
}

/* ── Endpoint row ── */
function Endpoint({ method, path, description, params = [], response }) {
  const [open, setOpen] = useState(false)
  return (
    <div className="border border-border rounded-xl overflow-hidden mb-3 transition-colors hover:border-border-strong">
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center gap-3 px-4 py-3 text-left bg-bg-card hover:bg-bg-raised transition-colors"
      >
        <Method m={method} />
        <code className="text-xs font-mono text-text-primary flex-1">{path}</code>
        <span className="text-xs text-text-muted hidden sm:block">{description}</span>
        <svg
          width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"
          strokeLinecap="round" strokeLinejoin="round"
          className="shrink-0 text-text-muted transition-transform"
          style={{ transform: open ? 'rotate(180deg)' : 'rotate(0deg)' }}
        >
          <polyline points="6 9 12 15 18 9"/>
        </svg>
      </button>
      {open && (
        <div className="border-t border-border px-4 py-4 bg-bg-raised" style={{ background: 'var(--color-bg-raised)' }}>
          <p className="text-xs text-text-secondary mb-3">{description}</p>
          {params.length > 0 && (
            <div className="mb-4">
              <p className="text-[11px] font-semibold text-text-muted uppercase tracking-wider mb-2">Parameters</p>
              <table className="w-full text-xs border-collapse">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left py-1.5 pr-4 text-text-muted font-medium">Name</th>
                    <th className="text-left py-1.5 pr-4 text-text-muted font-medium">Type</th>
                    <th className="text-left py-1.5 text-text-muted font-medium">Description</th>
                  </tr>
                </thead>
                <tbody>
                  {params.map(p => (
                    <tr key={p.name} className="border-b border-border last:border-0">
                      <td className="py-2 pr-4">
                        <code className="font-mono text-brand text-[11px]">{p.name}</code>
                        {p.required && <span className="ml-1 text-[9px] text-status-danger font-bold">*</span>}
                      </td>
                      <td className="py-2 pr-4 text-text-muted">{p.type}</td>
                      <td className="py-2 text-text-secondary">{p.desc}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          {response && (
            <div>
              <p className="text-[11px] font-semibold text-text-muted uppercase tracking-wider mb-2">Response</p>
              <Code code={response} lang="json" />
            </div>
          )}
        </div>
      )}
    </div>
  )
}

/* ── Error code row ── */
function ErrRow({ code, text, desc }) {
  const color = code < 400 ? '#10B981' : code < 500 ? '#F59E0B' : '#EF4444'
  return (
    <tr className="border-b border-border last:border-0">
      <td className="py-2.5 pr-4">
        <span className="font-mono font-bold text-xs" style={{ color }}>{code}</span>
      </td>
      <td className="py-2.5 pr-4 text-xs font-medium text-text-primary">{text}</td>
      <td className="py-2.5 text-xs text-text-muted">{desc}</td>
    </tr>
  )
}

/* ── TOC entries ── */
const TOC = [
  { id: 'auth',       label: 'Authentication' },
  { id: 'baseurl',    label: 'Base URL' },
  { id: 'chat',       label: 'Chat Completions' },
  { id: 'models',     label: 'Models' },
  { id: 'keys',       label: 'API Keys' },
  { id: 'stream',     label: 'Streaming' },
  { id: 'limits',     label: 'Rate Limits' },
  { id: 'errors',     label: 'Error Codes' },
  { id: 'examples',   label: 'Code Examples' },
]

export default function Docs() {
  const [activeSection, setActiveSection] = useState('auth')

  return (
    <PageWrapper className="!p-0">
      <div className="flex h-full">

        {/* ── Left TOC (desktop) ── */}
        <aside
          className="hidden lg:flex flex-col w-52 shrink-0 px-4 py-6 overflow-y-auto no-scrollbar border-r border-border"
          style={{ background: 'var(--color-bg-card)' }}
        >
          <p className="text-[10px] font-bold uppercase tracking-wider text-text-muted mb-3">Contents</p>
          <nav className="flex flex-col gap-0.5">
            {TOC.map(item => (
              <a
                key={item.id}
                href={`#${item.id}`}
                onClick={() => setActiveSection(item.id)}
                className="px-3 py-1.5 rounded-lg text-xs font-medium transition-colors"
                style={
                  activeSection === item.id
                    ? { color: 'var(--color-brand)', background: 'var(--color-brand-muted)' }
                    : { color: 'var(--color-text-muted)' }
                }
              >
                {item.label}
              </a>
            ))}
          </nav>

          {/* Model info */}
          <div
            className="mt-auto rounded-xl p-3 border border-border"
            style={{ background: 'var(--color-bg-raised)' }}
          >
            <p className="text-[10px] font-bold text-text-muted mb-1.5">Active model</p>
            <p className="text-xs font-semibold text-text-primary font-mono">Qwen3-32B</p>
            <div className="flex items-center gap-1.5 mt-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-status-success" style={{ boxShadow: '0 0 4px var(--color-status-success)' }} />
              <span className="text-[10px] text-text-muted">vLLM · RunPod</span>
            </div>
          </div>
        </aside>

        {/* ── Main content ── */}
        <div className="flex-1 overflow-y-auto scrollable px-6 py-6 flex flex-col gap-8">

          {/* ── Authentication ── */}
          <Section id="auth" title="Authentication"
            description="All API requests require an API key passed via the X-API-Key header or Bearer token."
          >
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
              <div className="rounded-xl p-4 border border-border bg-bg-raised">
                <p className="text-[10px] font-bold text-text-muted uppercase tracking-wider mb-2">Header</p>
                <code className="text-xs font-mono text-brand">X-API-Key: ak_your_key</code>
              </div>
              <div className="rounded-xl p-4 border border-border bg-bg-raised">
                <p className="text-[10px] font-bold text-text-muted uppercase tracking-wider mb-2">Bearer token</p>
                <code className="text-xs font-mono text-brand">Authorization: Bearer ak_your_key</code>
              </div>
            </div>
            <Code
              lang="bash"
              code={`curl -H "X-API-Key: ak_your_key" ${API_BASE}/v1/models`}
            />
          </Section>

          {/* ── Base URL ── */}
          <Section id="baseurl" title="Base URL">
            <div className="rounded-xl p-4 border border-border bg-bg-raised flex items-center justify-between">
              <code className="text-sm font-mono text-text-primary">{API_BASE}</code>
              <CopyBtn text={API_BASE} />
            </div>
            <p className="text-xs text-text-muted mt-3">
              All endpoints are relative to this base. The gateway proxies requests to the vLLM backend.
              Keep your API key confidential — do not expose it in client-side code.
            </p>
          </Section>

          {/* ── Chat Completions ── */}
          <Section id="chat" title="Chat Completions"
            description="OpenAI-compatible chat completions endpoint. Supports streaming, multi-turn conversations and system prompts."
          >
            <Endpoint
              method="POST"
              path="/v1/chat/completions"
              description="Generate a chat completion from a list of messages"
              params={[
                { name: 'model',       type: 'string',   required: true,  desc: 'Model name, e.g. "Qwen3-32B"' },
                { name: 'messages',    type: 'array',    required: true,  desc: 'Array of {role, content} message objects' },
                { name: 'max_tokens',  type: 'integer',  required: false, desc: 'Maximum tokens to generate (default: 2048)' },
                { name: 'temperature', type: 'float',    required: false, desc: 'Sampling temperature 0–2 (default: 0.7)' },
                { name: 'top_p',       type: 'float',    required: false, desc: 'Nucleus sampling threshold (default: 0.95)' },
                { name: 'stream',      type: 'boolean',  required: false, desc: 'Stream response as SSE (default: false)' },
                { name: 'stop',        type: 'string[]', required: false, desc: 'Stop sequences' },
              ]}
              response={`{
  "id": "chatcmpl-abc123",
  "object": "chat.completion",
  "created": 1716000000,
  "model": "Qwen3-32B",
  "choices": [
    {
      "index": 0,
      "message": { "role": "assistant", "content": "Hello! How can I help?" },
      "finish_reason": "stop"
    }
  ],
  "usage": {
    "prompt_tokens": 15,
    "completion_tokens": 9,
    "total_tokens": 24
  }
}`}
            />
          </Section>

          {/* ── Models ── */}
          <Section id="models" title="Models" description="List available models on this gateway.">
            <Endpoint
              method="GET"
              path="/v1/models"
              description="Returns all models available on the vLLM backend"
              response={`{
  "object": "list",
  "data": [
    {
      "id": "Qwen3-32B",
      "object": "model",
      "created": 1716000000,
      "owned_by": "avaniko"
    }
  ]
}`}
            />
          </Section>

          {/* ── API Keys ── */}
          <Section id="keys" title="API Keys" description="Manage API keys via the gateway REST API.">
            <Endpoint
              method="GET"
              path="/auth/my-keys"
              description="List all API keys belonging to the authenticated user"
              response={`[
  {
    "id": "key_abc",
    "name": "Production",
    "key_preview": "ak_prod_xxxx...1234",
    "is_active": true,
    "rate_limit": 30,
    "daily_limit": 1000,
    "created_at": "2025-01-15T10:00:00Z"
  }
]`}
            />
            <Endpoint
              method="POST"
              path="/auth/create-key"
              description="Create a new API key"
              params={[
                { name: 'name',        type: 'string',  required: true,  desc: 'Human-readable label for this key' },
                { name: 'rate_limit',  type: 'integer', required: false, desc: 'Requests per minute (default: 10)' },
                { name: 'daily_limit', type: 'integer', required: false, desc: 'Requests per day (default: 200)' },
              ]}
              response={`{
  "id": "key_xyz",
  "key": "ak_live_FULL_KEY_SHOWN_ONCE",
  "name": "My Key",
  "is_active": true,
  "created_at": "2025-05-11T12:00:00Z"
}`}
            />
            <Endpoint
              method="DELETE"
              path="/auth/delete-key/{key_id}"
              description="Permanently revoke an API key"
              params={[{ name: 'key_id', type: 'string', required: true, desc: 'Key ID to delete' }]}
              response={`{ "message": "Key deleted" }`}
            />
          </Section>

          {/* ── Streaming ── */}
          <Section id="stream" title="Streaming" description="Stream tokens as server-sent events (SSE) for real-time output.">
            <Code lang="python" code={`import requests, json

headers = {"X-API-Key": "ak_your_key", "Accept": "text/event-stream"}
payload = {
    "model": "Qwen3-32B",
    "messages": [{"role": "user", "content": "Hello"}],
    "stream": True,
    "max_tokens": 512
}

with requests.post("${API_BASE}/v1/chat/completions",
                   headers=headers, json=payload, stream=True) as r:
    for line in r.iter_lines():
        if line and line.startswith(b"data: "):
            chunk = line[6:]
            if chunk == b"[DONE]":
                break
            data = json.loads(chunk)
            delta = data["choices"][0]["delta"].get("content", "")
            print(delta, end="", flush=True)`} />
          </Section>

          {/* ── Rate Limits ── */}
          <Section id="limits" title="Rate Limits"
            description="Limits are enforced per API key and are configurable in the Usage Limits page."
          >
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
              {[
                { label: 'Default rate limit', value: '10 req / min',    icon: '⚡' },
                { label: 'Default daily limit', value: '200 req / day',  icon: '📅' },
                { label: 'Default max tokens',  value: '2048 / request', icon: '🔠' },
              ].map(item => (
                <div key={item.label} className="rounded-xl p-4 border border-border bg-bg-raised text-center">
                  <p className="text-lg mb-1">{item.icon}</p>
                  <p className="text-sm font-bold text-text-primary">{item.value}</p>
                  <p className="text-[10px] text-text-muted mt-0.5">{item.label}</p>
                </div>
              ))}
            </div>
            <p className="text-xs text-text-muted bg-bg-raised rounded-xl p-3 border border-border">
              When a limit is exceeded, the API returns HTTP <code className="font-mono text-status-danger text-[11px]">429 Too Many Requests</code>.
              Daily limits reset at midnight UTC. Configure custom limits per key in the <strong className="text-text-secondary">Usage Limits</strong> page.
            </p>
          </Section>

          {/* ── Error Codes ── */}
          <Section id="errors" title="Error Codes">
            <div className="rounded-xl border border-border overflow-hidden bg-bg-card">
              <table className="w-full text-sm border-collapse">
                <thead>
                  <tr className="border-b border-border bg-bg-raised">
                    <th className="text-left py-2.5 px-4 text-[11px] font-semibold text-text-muted uppercase tracking-wider">Code</th>
                    <th className="text-left py-2.5 px-4 text-[11px] font-semibold text-text-muted uppercase tracking-wider">Status</th>
                    <th className="text-left py-2.5 px-4 text-[11px] font-semibold text-text-muted uppercase tracking-wider">Meaning</th>
                  </tr>
                </thead>
                <tbody className="px-4">
                  {[
                    [200, 'OK',                    'Request succeeded'],
                    [400, 'Bad Request',           'Invalid parameters or malformed JSON body'],
                    [401, 'Unauthorized',          'Missing or invalid API key'],
                    [403, 'Forbidden',             'Key is disabled or lacks permission'],
                    [404, 'Not Found',             'Endpoint or resource does not exist'],
                    [422, 'Unprocessable Entity',  'Validation failed — check request body schema'],
                    [429, 'Too Many Requests',     'Rate limit or daily quota exceeded'],
                    [500, 'Internal Server Error', 'Gateway or vLLM backend error'],
                    [503, 'Service Unavailable',   'vLLM backend is loading or restarting'],
                  ].map(([code, text, desc]) => (
                    <tr key={code} className="border-b border-border last:border-0">
                      <td className="py-2.5 px-4">
                        <span className="font-mono font-bold text-xs" style={{ color: code < 300 ? 'var(--color-status-success)' : code < 500 ? 'var(--color-status-warning)' : 'var(--color-status-danger)' }}>{code}</span>
                      </td>
                      <td className="py-2.5 px-4 text-xs font-medium text-text-primary">{text}</td>
                      <td className="py-2.5 px-4 text-xs text-text-muted">{desc}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Section>

          {/* ── Code Examples ── */}
          <Section id="examples" title="Code Examples" description="Copy-ready snippets for common use cases.">
            <div className="flex flex-col gap-4">
              <div>
                <p className="text-xs font-semibold text-text-secondary mb-2">cURL</p>
                <Code lang="bash" code={`curl -X POST ${API_BASE}/v1/chat/completions \\
  -H "Content-Type: application/json" \\
  -H "X-API-Key: ak_your_key" \\
  -d '{
    "model": "Qwen3-32B",
    "messages": [{"role": "user", "content": "Explain quantum computing briefly"}],
    "max_tokens": 256,
    "temperature": 0.7
  }'`} />
              </div>
              <div>
                <p className="text-xs font-semibold text-text-secondary mb-2">Python</p>
                <Code lang="python" code={`from openai import OpenAI

client = OpenAI(
    base_url="${API_BASE}/v1",
    api_key="ak_your_key",
)

response = client.chat.completions.create(
    model="Qwen3-32B",
    messages=[{"role": "user", "content": "Hello, world!"}],
    max_tokens=256,
)

print(response.choices[0].message.content)`} />
              </div>
              <div>
                <p className="text-xs font-semibold text-text-secondary mb-2">Node.js</p>
                <Code lang="javascript" code={`import OpenAI from 'openai';

const client = new OpenAI({
  baseURL: '${API_BASE}/v1',
  apiKey:  'ak_your_key',
});

const res = await client.chat.completions.create({
  model:     'Qwen3-32B',
  messages:  [{ role: 'user', content: 'Hello!' }],
  max_tokens: 256,
});

console.log(res.choices[0].message.content);`} />
              </div>
            </div>
          </Section>

        </div>
      </div>
    </PageWrapper>
  )
}
