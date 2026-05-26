import { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter'
import Badge from '../components/ui/Badge'
import Spinner from '../components/ui/Spinner'
import Button from '../components/ui/Button'

const API_BASE   = import.meta.env.VITE_API_URL || ''
const ACCEPT     = '.png,.jpg,.jpeg,.webp,.gif,.bmp,.pdf'

/* ── Slider ─────────────────────────────────────────────────────── */
function Slider({ label, val, set, min, max, step, fmt }) {
  return (
    <div>
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-xs font-medium text-text-muted">{label}</span>
        <span className="text-xs font-mono text-brand font-medium">{fmt ? fmt(val) : val}</span>
      </div>
      <input type="range" min={min} max={max} step={step} value={val}
        onChange={e => set(Number(e.target.value))}
        className="w-full cursor-pointer accent-brand" />
      <div className="flex justify-between mt-0.5">
        <span className="text-[10px] text-text-muted/50">{min}</span>
        <span className="text-[10px] text-text-muted/50">{max}</span>
      </div>
    </div>
  )
}

/* ── Token bar ───────────────────────────────────────────────────── */
function TokenBar({ label, value, max, color }) {
  const pct = Math.min((value / Math.max(max, 1)) * 100, 100)
  return (
    <div className="mb-2">
      <div className="flex justify-between mb-1">
        <span className="text-[10px] text-text-muted font-mono">{label}</span>
        <span className="text-[10px] font-mono tabular-nums" style={{ color }}>{value.toLocaleString()}</span>
      </div>
      <div className="h-0.5 bg-surface-hover rounded-full overflow-hidden">
        <motion.div initial={{ width: 0 }} animate={{ width: `${pct}%` }}
          transition={{ duration: 0.4, ease: 'easeOut' }}
          className="h-full rounded-full" style={{ background: color }} />
      </div>
    </div>
  )
}

/* ── File chip ───────────────────────────────────────────────────── */
function FileChip({ file, onRemove }) {
  const isPdf = file.type === 'application/pdf' || /\.pdf$/i.test(file.name)
  const [previewUrl, setPreviewUrl] = useState('')

  useEffect(() => {
    if (isPdf) return
    const url = URL.createObjectURL(file)
    setPreviewUrl(url)
    return () => URL.revokeObjectURL(url)
  }, [file, isPdf])

  return (
    <div className="inline-flex items-center gap-2 bg-bg-raised border border-border rounded-lg px-2.5 py-1.5 text-xs">
      {isPdf ? (
        <div className="w-6 h-7 bg-status-danger rounded flex items-center justify-center text-white text-[9px] font-bold shrink-0">PDF</div>
      ) : previewUrl ? (
        <img src={previewUrl} alt="" className="w-6 h-6 rounded object-cover border border-border shrink-0" />
      ) : (
        <div className="w-6 h-6 bg-surface rounded shrink-0" />
      )}
      <div className="flex flex-col min-w-0 max-w-[160px]">
        <span className="truncate font-medium text-text-secondary">{file.name}</span>
        <span className="text-[10px] text-text-muted font-mono">{(file.size / 1024).toFixed(1)} KB</span>
      </div>
      <button onClick={onRemove} className="text-text-muted hover:text-text-secondary transition-colors ml-0.5">
        <svg width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
          <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
        </svg>
      </button>
    </div>
  )
}

/* ── Main ────────────────────────────────────────────────────────── */
export default function Playground() {
  const saved = (() => { try { return JSON.parse(localStorage.getItem('ai_keys') || '[]') } catch { return [] } })()

  const [apiKey, setApiKey]             = useState(saved[0]?.api_key || '')
  const [prompt, setPrompt]             = useState('')
  const [system, setSystem]             = useState('')
  const [maxTokens, setMaxTokens]       = useState(4096)
  const [temp, setTemp]                 = useState(0.7)
  const [file, setFile]                 = useState(null)
  const [streamText, setStreamText]     = useState('')
  const [thinkingText, setThinkingText] = useState('')
  const [showThinking, setShowThinking] = useState(false)
  const [streamMeta, setStreamMeta]     = useState(null)
  const [error, setError]               = useState('')
  const [loading, setLoading]           = useState(false)
  const [streaming, setStreaming]       = useState(false)
  const [elapsed, setElapsed]           = useState(null)
  const [mode, setMode]                 = useState('free')
  const [availableModes, setAvailableModes] = useState([
    { id: 'free', label: 'Free-form', description: '' }
  ])
  const [dragOver, setDragOver]         = useState(false)

  const fileRef        = useRef(null)
  const abortRef       = useRef(null)
  const scrollRef      = useRef(null)
  const userScrolledUp = useRef(false)

  useEffect(() => {
    if (!apiKey) return
    fetch(`${API_BASE}/v1/modes`, { headers: { 'X-API-Key': apiKey } })
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (!data?.modes) return
        setAvailableModes([
          { id: 'free', label: 'Free-form', description: '' },
          ...data.modes.filter(m => m.id !== 'free'),
        ])
      })
      .catch(() => {})
  }, [apiKey])

  useEffect(() => {
    const el = scrollRef.current
    if (!el || !streaming || userScrolledUp.current) return
    el.scrollTop = el.scrollHeight
  }, [streamText, streaming])

  useEffect(() => {
    const el = scrollRef.current
    if (!el) return
    const onScroll = () => {
      userScrolledUp.current = el.scrollHeight - el.scrollTop - el.clientHeight > 80
    }
    el.addEventListener('scroll', onScroll, { passive: true })
    return () => el.removeEventListener('scroll', onScroll)
  }, [])

  async function resizeImage(f, maxDim = 2048) {
    return new Promise(resolve => {
      const img = new Image()
      const url = URL.createObjectURL(f)
      img.onload = () => {
        URL.revokeObjectURL(url)
        let { width, height } = img
        if (Math.max(width, height) <= maxDim) { resolve(f); return }
        const scale = maxDim / Math.max(width, height)
        width = Math.round(width * scale); height = Math.round(height * scale)
        const canvas = document.createElement('canvas')
        canvas.width = width; canvas.height = height
        const ctx = canvas.getContext('2d')
        ctx.imageSmoothingEnabled = true; ctx.imageSmoothingQuality = 'high'
        ctx.drawImage(img, 0, 0, width, height)
        canvas.toBlob(blob => {
          resolve(blob
            ? new File([blob], f.name.replace(/\.(jpe?g|webp|gif|bmp)$/i, '.png'), { type: 'image/png' })
            : f
          )
        }, 'image/png')
      }
      img.onerror = () => { URL.revokeObjectURL(url); resolve(f) }
      img.src = url
    })
  }

  async function handleFileSelect(f) {
    if (!f) return
    if (f.size > 25 * 1024 * 1024) { setError('File must be under 25 MB.'); return }
    if (!/\.(png|jpe?g|webp|gif|bmp|pdf)$/i.test(f.name)) { setError('Only PNG/JPG/WEBP/PDF allowed.'); return }
    let processed = f
    if (/\.(png|jpe?g|webp|gif|bmp)$/i.test(f.name)) processed = await resizeImage(f, 2048)
    setFile(processed); setError('')
  }

  function onDrop(e) { e.preventDefault(); setDragOver(false); handleFileSelect(e.dataTransfer.files?.[0]) }

  async function run() {
    if (!apiKey || (!file && !prompt.trim())) return
    setLoading(true); setStreaming(true); setError('')
    setStreamText(''); setThinkingText(''); setStreamMeta(null)
    userScrolledUp.current = false
    const t0 = Date.now()
    const ctrl = new AbortController()
    abortRef.current = ctrl
    try {
      let res
      if (file) {
        const fd = new FormData()
        fd.append('file', file)
        fd.append('prompt', prompt.trim() || 'Describe this image/document in detail.')
        fd.append('max_tokens', String(maxTokens))
        fd.append('temperature', String(mode !== 'free' ? 0 : temp))
        if (mode && mode !== 'free') fd.append('mode', mode)
        res = await fetch(`${API_BASE}/v1/vision/analyze/stream`, {
          method: 'POST', headers: { 'X-API-Key': apiKey }, body: fd, signal: ctrl.signal,
        })
      } else {
        res = await fetch(`${API_BASE}/v1/generate/stream`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'X-API-Key': apiKey },
          body: JSON.stringify({ prompt, system: system || undefined, max_tokens: maxTokens, temperature: temp }),
          signal: ctrl.signal,
        })
      }
      if (!res.ok) throw new Error(`${res.status}: ${(await res.text()).slice(0, 300)}`)
      if (!res.body) throw new Error('No stream body')

      const reader = res.body.getReader()
      const decoder = new TextDecoder('utf-8')
      let buffer = '', acc = ''
      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n')
        buffer = lines.pop() || ''
        for (const line of lines) {
          if (!line.startsWith('data:')) continue
          const data = line.slice(5).trim()
          if (!data) continue
          try {
            const evt = JSON.parse(data)
            if (evt.event === 'delta')         { acc += evt.text || ''; setStreamText(acc) }
            else if (evt.event === 'thinking') { setThinkingText(p => p + (evt.text || '')) }
            else if (evt.event === 'done')     { setStreamMeta({ model: evt.model, finish_reason: evt.finish_reason, usage: evt.usage }) }
            else if (evt.event === 'error')    { throw new Error(evt.error || 'stream error') }
            else if (evt.text)                 { acc += evt.text; setStreamText(acc) }
          } catch (e) { if (e.message?.startsWith('stream error')) throw e }
        }
      }
      setElapsed(((Date.now() - t0) / 1000).toFixed(2))
    } catch (err) {
      setError(err.name === 'AbortError' ? 'Generation stopped.' : (err.message || String(err)))
    } finally {
      setLoading(false); setStreaming(false); abortRef.current = null
    }
  }

  const canRun   = apiKey && (file || prompt.trim()) && !loading
  const usage    = streamMeta?.usage
  const truncated = streamMeta?.finish_reason === 'length'

  return (
    <div className="flex h-full overflow-hidden">

      {/* ══ Main Panel ══════════════════════════════════════════════ */}
      <div className="flex-1 flex flex-col overflow-hidden min-w-0">

        {/* Top bar */}
        <div className="h-11 flex items-center justify-between px-4 border-b border-border shrink-0">
          <div className="flex items-center gap-2">
            {file   && <Badge variant="info">{/\.pdf$/i.test(file.name) ? 'PDF' : 'Image'}</Badge>}
            {mode !== 'free' && <Badge variant="brand">{mode}</Badge>}
            {streaming && (
              <span className="flex items-center gap-1 text-[10px] font-medium text-status-success">
                <span className="w-1.5 h-1.5 rounded-full bg-status-success animate-pulse-dot"/>
                Streaming
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            {saved.length > 0 ? (
              <select
                value={apiKey}
                onChange={e => setApiKey(e.target.value)}
                className="bg-bg-raised border border-border rounded-lg px-2.5 py-1 text-xs text-text-secondary outline-none focus:border-border-strong max-w-[160px]"
              >
                {saved.map(k => (
                  <option key={k.api_key || k.key} value={k.api_key || k.key}>{k.name}</option>
                ))}
              </select>
            ) : (
              <a href="/keys" className="text-xs text-text-muted hover:text-brand transition-colors">
                Add API key →
              </a>
            )}
            {streaming
              ? <Button variant="danger" size="sm" onClick={() => abortRef.current?.abort()}>Stop</Button>
              : <Button size="sm" disabled={!canRun} onClick={run} loading={loading}>Run</Button>
            }
            <span className="text-[10px] text-text-muted hidden sm:block">Ctrl+Enter</span>
          </div>
        </div>

        {/* Prompt */}
        <div className="px-4 py-3 border-b border-border shrink-0">
          <div className="flex items-center justify-between mb-2">
            <label className="text-[11px] font-semibold text-text-muted uppercase tracking-wider">
              Prompt {file && <span className="text-status-info ml-1">+ File</span>}
            </label>
            <button
              onClick={() => fileRef.current?.click()}
              className="flex items-center gap-1 text-[11px] text-text-muted hover:text-text-secondary border border-border rounded-md px-2 py-1 transition-colors hover:bg-surface-hover"
            >
              <svg width="11" height="11" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path d="M21.44 11.05l-9.19 9.19a6 6 0 01-8.49-8.49l9.19-9.19a4 4 0 015.66 5.66l-9.2 9.19a2 2 0 01-2.83-2.83l8.49-8.48"/>
              </svg>
              Attach
            </button>
            <input ref={fileRef} type="file" accept={ACCEPT} className="hidden"
              onChange={e => handleFileSelect(e.target.files?.[0])} />
          </div>

          {file && (
            <div className="mb-2">
              <FileChip file={file} onRemove={() => { setFile(null); if (fileRef.current) fileRef.current.value = '' }} />
            </div>
          )}

          <div onDragOver={e => { e.preventDefault(); setDragOver(true) }} onDragLeave={() => setDragOver(false)} onDrop={onDrop} className="relative">
            <textarea
              value={prompt}
              onChange={e => setPrompt(e.target.value)}
              onKeyDown={e => { if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') run() }}
              placeholder={file ? 'Ask about the file…' : 'Enter your prompt here… (Ctrl+Enter to run)'}
              rows={4}
              className={`w-full resize-y rounded-lg border px-3 py-2.5 text-sm text-text-primary bg-bg placeholder:text-text-muted outline-none transition-colors focus:border-border-strong ${dragOver ? 'border-brand/40 bg-brand-muted' : 'border-border'}`}
            />
            {dragOver && (
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none text-brand text-sm font-medium">
                Drop image or PDF
              </div>
            )}
          </div>
        </div>

        {/* Output */}
        <div ref={scrollRef} className="flex-1 overflow-y-auto scrollable px-4 py-4 min-h-0">

          <AnimatePresence mode="wait">
            {error && (
              <motion.div key="err" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                className="flex items-start gap-2 p-3 rounded-lg bg-status-danger-bg border border-status-danger/20 text-status-danger text-sm mb-3"
              >
                <span className="shrink-0 mt-0.5">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
                </span>
                {error}
              </motion.div>
            )}

            {(streamText || (streaming && !error)) && (
              <motion.div key="result" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col gap-3">

                {/* Meta */}
                {streamMeta && (
                  <div className="flex gap-1.5 flex-wrap">
                    {streamMeta.model && <Badge variant="neutral">{streamMeta.model}</Badge>}
                    {elapsed && <Badge variant="neutral">{elapsed}s</Badge>}
                    {truncated && <Badge variant="warning">Truncated</Badge>}
                  </div>
                )}

                {/* Thinking */}
                {thinkingText && (
                  <>
                    <button
                      onClick={() => setShowThinking(s => !s)}
                      className="flex items-center gap-1.5 text-xs text-text-muted hover:text-text-secondary transition-colors"
                    >
                      <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
                        className={`transition-transform ${showThinking ? 'rotate-90' : ''}`}>
                        <polyline points="9 18 15 12 9 6"/>
                      </svg>
                      {showThinking ? 'Hide' : 'Show'} thinking ({thinkingText.length} chars)
                    </button>
                    {showThinking && (
                      <div className="rounded-lg border border-border bg-bg p-3 font-mono text-[11px] text-text-muted italic max-h-36 overflow-y-auto scrollable">
                        {thinkingText}
                      </div>
                    )}
                  </>
                )}

                {/* Output text */}
                <div className="rounded-lg border border-border bg-bg p-4 text-sm text-text-primary leading-relaxed overflow-x-auto">
                  <ReactMarkdown
                    remarkPlugins={[remarkGfm]}
                    components={{
                      h1: ({ children }) => <h1 className="text-xl font-bold text-text-primary mt-4 mb-2 pb-1 border-b border-border">{children}</h1>,
                      h2: ({ children }) => <h2 className="text-lg font-semibold text-text-primary mt-4 mb-2">{children}</h2>,
                      h3: ({ children }) => <h3 className="text-base font-semibold text-text-primary mt-3 mb-1">{children}</h3>,
                      h4: ({ children }) => <h4 className="text-sm font-semibold text-text-primary mt-2 mb-1">{children}</h4>,
                      p:  ({ children }) => <p className="text-text-primary leading-relaxed mb-3 last:mb-0">{children}</p>,
                      ul: ({ children }) => <ul className="list-disc list-outside ml-5 mb-3 space-y-1">{children}</ul>,
                      ol: ({ children }) => <ol className="list-decimal list-outside ml-5 mb-3 space-y-1">{children}</ol>,
                      li: ({ children }) => <li className="text-text-primary leading-relaxed">{children}</li>,
                      strong: ({ children }) => <strong className="font-semibold text-text-primary">{children}</strong>,
                      em: ({ children }) => <em className="italic text-text-secondary">{children}</em>,
                      blockquote: ({ children }) => <blockquote className="border-l-2 border-brand/40 pl-4 my-3 text-text-secondary italic">{children}</blockquote>,
                      code: ({ inline, className, children, ...rest }) => {
                        const lang = /language-(\w+)/.exec(className || '')?.[1]
                        if (!inline && lang) {
                          return (
                            <SyntaxHighlighter
                              language={lang}
                              style={{
                                'code[class*="language-"]': { color:'#A1A1AA', fontFamily:'"JetBrains Mono",monospace', fontSize:'0.8rem', lineHeight:'1.65' },
                                'pre[class*="language-"]':  { background:'#09090B', margin:0, padding:'1rem', borderRadius:'0.5rem', border:'1px solid rgba(255,255,255,0.08)' },
                                keyword:    { color:'#818CF8' },
                                string:     { color:'#86EFAC' },
                                comment:    { color:'#3F3F46', fontStyle:'italic' },
                                function:   { color:'#67E8F9' },
                                number:     { color:'#F472B6' },
                                'class-name':{ color:'#67E8F9' },
                                operator:   { color:'#67E8F9' },
                                punctuation:{ color:'#52525B' },
                                builtin:    { color:'#67E8F9' },
                                variable:   { color:'#E8A828' },
                                boolean:    { color:'#F472B6' },
                              }}
                              customStyle={{ marginBottom:'0.75rem' }}
                              {...rest}
                            >
                              {String(children).replace(/\n$/, '')}
                            </SyntaxHighlighter>
                          )
                        }
                        return inline
                          ? <code className="font-mono text-xs bg-bg-raised border border-border rounded px-1.5 py-0.5 text-brand">{children}</code>
                          : <pre className="bg-bg border border-border rounded-lg p-4 overflow-x-auto font-mono text-xs text-text-secondary mb-3 leading-relaxed"><code>{children}</code></pre>
                      },
                      pre: ({ children }) => <>{children}</>,
                      hr:  () => <hr className="border-border my-4" />,
                      a:   ({ href, children }) => <a href={href} target="_blank" rel="noopener noreferrer" className="text-brand hover:underline">{children}</a>,
                      table: ({ children }) => <div className="overflow-x-auto mb-3"><table className="w-full border-collapse text-xs">{children}</table></div>,
                      th: ({ children }) => <th className="border border-border px-3 py-1.5 text-left font-semibold text-text-muted bg-bg-raised">{children}</th>,
                      td: ({ children }) => <td className="border border-border px-3 py-1.5 text-text-secondary">{children}</td>,
                    }}
                  >
                    {streamText}
                  </ReactMarkdown>
                  {streaming && <span className="inline-block w-0.5 h-4 bg-brand ml-0.5 animate-pulse align-middle" />}
                </div>

                {/* Token usage */}
                {usage && (
                  <div className="card p-3">
                    <p className="text-[10px] font-semibold text-text-muted uppercase tracking-wider mb-2.5">Token Usage</p>
                    <TokenBar label="Prompt"     value={usage.prompt_tokens     || 0} max={maxTokens} color="#E8A828" />
                    <TokenBar label="Completion" value={usage.completion_tokens || 0} max={maxTokens} color="#6366f1" />
                    <TokenBar label="Total"      value={usage.total_tokens      || 0} max={maxTokens} color="#10b981" />
                  </div>
                )}

              </motion.div>
            )}

            {!streamText && !streaming && !error && (
              <div className="flex flex-col items-center justify-center h-full py-16 text-center">
                <div className="w-9 h-9 rounded-lg bg-surface border border-border flex items-center justify-center mb-3">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" className="text-text-muted" strokeLinecap="round" strokeLinejoin="round">
                    <polygon points="5 3 19 12 5 21 5 3"/>
                  </svg>
                </div>
                <p className="text-sm text-text-muted">Enter a prompt and press Run</p>
                <p className="text-[11px] text-text-muted/50 mt-1">Ctrl+Enter</p>
              </div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* ══ Right Settings Panel ════════════════════════════════════ */}
      <div className="w-56 shrink-0 flex flex-col border-l border-border bg-bg-card overflow-y-auto scrollable">

        {/* Mode */}
        <div className="px-3 py-3 border-b border-border">
          <p className="text-[11px] font-semibold text-text-muted uppercase tracking-wider mb-2">Mode</p>
          <div className="flex flex-col gap-0.5">
            {availableModes.map(m => (
              <button
                key={m.id}
                onClick={() => setMode(m.id)}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium text-left transition-all ${
                  mode === m.id
                    ? 'bg-surface-active text-text-primary'
                    : 'text-text-muted hover:bg-surface-hover hover:text-text-secondary'
                }`}
              >
                <span className="truncate">{m.label}</span>
                {m.id !== 'free' && <span className="ml-auto text-[9px] font-bold text-status-success bg-status-success-bg px-1 rounded">JSON</span>}
              </button>
            ))}
          </div>
        </div>

        {/* System prompt */}
        <div className="px-3 py-3 border-b border-border">
          <p className="text-[11px] font-semibold text-text-muted uppercase tracking-wider mb-2">System Prompt</p>
          <textarea
            value={system}
            onChange={e => setSystem(e.target.value)}
            placeholder="Optional system instructions…"
            rows={3}
            className="w-full resize-none rounded-lg border border-border bg-bg px-2.5 py-2 text-xs text-text-primary placeholder:text-text-muted outline-none focus:border-border-strong transition-colors"
          />
        </div>

        {/* Params */}
        <div className="px-3 py-3 flex flex-col gap-4 border-b border-border">
          <Slider label="Max Tokens"  val={maxTokens} set={setMaxTokens} min={256} max={32768} step={256} fmt={v => v.toLocaleString()} />
          <Slider label="Temperature" val={temp}      set={setTemp}      min={0}   max={2}     step={0.05} fmt={v => v.toFixed(2)} />
        </div>

        {/* Manual API key if none saved */}
        {saved.length === 0 && (
          <div className="px-3 py-3">
            <p className="text-[11px] font-semibold text-text-muted uppercase tracking-wider mb-2">API Key</p>
            <input
              type="password"
              value={apiKey}
              onChange={e => setApiKey(e.target.value)}
              placeholder="ak_..."
              className="w-full rounded-lg border border-border bg-bg px-2.5 py-2 text-xs text-text-primary font-mono placeholder:text-text-muted outline-none focus:border-border-strong transition-colors"
            />
          </div>
        )}
      </div>

    </div>
  )
}
