import { useState } from 'react'
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter'
import { copyToClipboard } from '../../utils/formatters'

/* ── Custom dark theme matching our design tokens ── */
const avanikoTheme = {
  'code[class*="language-"]': {
    color: '#A1A1AA',
    background: 'none',
    fontFamily: '"JetBrains Mono", "Fira Code", Consolas, monospace',
    fontSize: '0.8125rem',
    lineHeight: '1.7',
    textAlign: 'left',
    whiteSpace: 'pre',
    wordSpacing: 'normal',
    wordBreak: 'normal',
    wordWrap: 'normal',
    tabSize: 2,
    hyphens: 'none',
  },
  'pre[class*="language-"]': {
    color: '#A1A1AA',
    background: '#09090B',
    overflow: 'auto',
    padding: '1.25rem',
    margin: 0,
  },
  comment:    { color: '#3F3F46', fontStyle: 'italic' },
  prolog:     { color: '#3F3F46' },
  doctype:    { color: '#3F3F46' },
  cdata:      { color: '#3F3F46' },
  punctuation:{ color: '#52525B' },
  namespace:  { opacity: 0.7 },
  // keywords
  keyword:    { color: '#818CF8' },  // indigo
  'control-flow': { color: '#818CF8' },
  tag:        { color: '#F87171' },  // red
  'attr-name':{ color: '#E8A828' },  // brand amber
  'attr-value':{ color: '#86EFAC' }, // green
  boolean:    { color: '#F472B6' },  // pink
  number:     { color: '#F472B6' },
  constant:   { color: '#F472B6' },
  property:   { color: '#E8A828' },  // amber
  'class-name':{ color: '#67E8F9' }, // cyan
  string:     { color: '#86EFAC' },  // green
  char:       { color: '#86EFAC' },
  selector:   { color: '#818CF8' },
  operator:   { color: '#67E8F9' },  // cyan
  regex:      { color: '#F59E0B' },
  'important':{ color: '#F59E0B', fontWeight: 'bold' },
  atrule:     { color: '#818CF8' },
  'attr-equals':{ color: '#52525B' },
  variable:   { color: '#E8A828' },
  builtin:    { color: '#67E8F9' },
  function:   { color: '#67E8F9' },
  parameter:  { color: '#A1A1AA' },
  url:        { color: '#86EFAC' },
  symbol:     { color: '#F59E0B' },
  deleted:    { color: '#F87171' },
  inserted:   { color: '#86EFAC' },
  bold:       { fontWeight: 'bold' },
  italic:     { fontStyle: 'italic' },
}

const LANG_MAP = {
  curl: 'bash', node: 'javascript', js: 'javascript',
  python: 'python', go: 'go', php: 'php', java: 'java',
  bash: 'bash', json: 'json', html: 'markup', css: 'css',
}

export default function CodeBlock({ code, lang = 'bash', label, maxHeight = 520 }) {
  const [copied, setCopied] = useState(false)

  const handleCopy = async () => {
    await copyToClipboard(code)
    setCopied(true)
    setTimeout(() => setCopied(false), 1800)
  }

  const prismLang = LANG_MAP[lang] || lang

  return (
    <div className="rounded-card border border-border overflow-hidden">
      {/* Header bar */}
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-border bg-bg-raised">
        <div className="flex items-center gap-2">
          {/* Traffic-light dots */}
          <div className="flex gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-status-danger/60" />
            <span className="w-2.5 h-2.5 rounded-full bg-status-warning/60" />
            <span className="w-2.5 h-2.5 rounded-full bg-status-success/60" />
          </div>
          {label && (
            <span className="text-[11px] font-mono text-text-muted ml-1">{label}</span>
          )}
        </div>
        <button
          onClick={handleCopy}
          className={`flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-medium border transition-all ${
            copied
              ? 'bg-status-success-bg text-status-success border-status-success/20'
              : 'bg-surface text-text-muted border-border hover:bg-surface-hover hover:text-text-secondary'
          }`}
        >
          {copied ? (
            <><svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M20 6L9 17l-5-5"/></svg> Copied!</>
          ) : (
            <><svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/></svg> Copy</>
          )}
        </button>
      </div>

      {/* Code */}
      <div style={{ maxHeight, overflowY: 'auto' }} className="scrollable">
        <SyntaxHighlighter
          language={prismLang}
          style={avanikoTheme}
          customStyle={{ margin: 0, background: '#09090B', borderRadius: 0 }}
          showLineNumbers={false}
          wrapLines={false}
        >
          {code}
        </SyntaxHighlighter>
      </div>
    </div>
  )
}
