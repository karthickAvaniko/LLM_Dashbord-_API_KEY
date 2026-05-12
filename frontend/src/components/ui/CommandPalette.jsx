import { useState, useEffect, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { ROUTES } from '../../constants/routes'

const COMMANDS = [
  {
    group: 'Navigate',
    items: [
      { id: 'dashboard',  label: 'Dashboard',     sub: 'Overview of your API usage',    to: ROUTES.DASHBOARD,
        icon: <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/></svg> },
      { id: 'analytics',  label: 'Analytics',     sub: 'Usage trends and token stats',  to: ROUTES.ANALYTICS,
        icon: <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/><line x1="2" y1="20" x2="22" y2="20"/></svg> },
      { id: 'playground', label: 'Playground',    sub: 'Test the AI model live',        to: ROUTES.PLAYGROUND,
        icon: <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><polygon points="5 3 19 12 5 21 5 3"/></svg> },
      { id: 'keys',       label: 'API Keys',      sub: 'Manage your access tokens',     to: ROUTES.KEYS,
        icon: <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 11-7.778 7.778 5.5 5.5 0 017.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4"/></svg> },
      { id: 'limits',     label: 'Usage Limits',  sub: 'Set per-key rate and token caps', to: ROUTES.LIMITS,
        icon: <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg> },
      { id: 'integrate',  label: 'Integrate',     sub: 'Copy code for your project',    to: ROUTES.INTEGRATE,
        icon: <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/></svg> },
      { id: 'docs',       label: 'Documentation', sub: 'API reference and guides',      to: ROUTES.DOCS,
        icon: <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/></svg> },
    ],
  },
  {
    group: 'Actions',
    items: [
      { id: 'create-key', label: 'Create API Key', sub: 'Generate a new access token', to: ROUTES.KEYS,
        icon: <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg> },
      { id: 'run-prompt', label: 'Run a Prompt',   sub: 'Open the AI playground',      to: ROUTES.PLAYGROUND,
        icon: <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 015.83 1c0 2-3 3-3 3"/><circle cx="12" cy="17" r=".5" fill="currentColor"/></svg> },
    ],
  },
]

const ALL_ITEMS = COMMANDS.flatMap(g => g.items)

export default function CommandPalette({ isOpen, onClose }) {
  const [query, setQuery]       = useState('')
  const [cursor, setCursor]     = useState(0)
  const navigate                = useNavigate()
  const inputRef                = useRef(null)
  const listRef                 = useRef(null)

  const filtered = query.trim()
    ? ALL_ITEMS.filter(i =>
        i.label.toLowerCase().includes(query.toLowerCase()) ||
        i.sub.toLowerCase().includes(query.toLowerCase())
      )
    : ALL_ITEMS

  // Reset on open
  useEffect(() => {
    if (isOpen) {
      setQuery('')
      setCursor(0)
      setTimeout(() => inputRef.current?.focus(), 50)
    }
  }, [isOpen])

  // Keep cursor in range
  useEffect(() => {
    setCursor(c => Math.min(c, Math.max(filtered.length - 1, 0)))
  }, [filtered.length])

  const go = useCallback((item) => {
    navigate(item.to)
    onClose()
  }, [navigate, onClose])

  const onKey = useCallback((e) => {
    if (e.key === 'ArrowDown') { e.preventDefault(); setCursor(c => Math.min(c + 1, filtered.length - 1)) }
    if (e.key === 'ArrowUp')   { e.preventDefault(); setCursor(c => Math.max(c - 1, 0)) }
    if (e.key === 'Enter')     { if (filtered[cursor]) go(filtered[cursor]) }
    if (e.key === 'Escape')    { onClose() }
  }, [cursor, filtered, go, onClose])

  // Scroll active item into view
  useEffect(() => {
    if (!listRef.current) return
    const active = listRef.current.querySelector('[data-active="true"]')
    active?.scrollIntoView({ block: 'nearest' })
  }, [cursor])

  // Show groups only in unfiltered state
  const renderContent = () => {
    if (query.trim()) {
      if (filtered.length === 0) {
        return (
          <div className="flex flex-col items-center py-10 text-center">
            <p className="text-sm text-text-muted">No results for <span className="text-text-secondary">"{query}"</span></p>
          </div>
        )
      }
      return filtered.map((item, i) => (
        <Item key={item.id} item={item} active={i === cursor} onClick={() => go(item)} onHover={() => setCursor(i)} />
      ))
    }

    let flatIndex = 0
    return COMMANDS.map(group => (
      <div key={group.group}>
        <p className="px-3 pt-3 pb-1.5 text-[10px] font-semibold text-text-muted uppercase tracking-widest">
          {group.group}
        </p>
        {group.items.map(item => {
          const idx = flatIndex++
          return (
            <Item key={item.id} item={item} active={idx === cursor} onClick={() => go(item)} onHover={() => setCursor(idx)} />
          )
        })}
      </div>
    ))
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            key="backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="fixed inset-0 z-[90] bg-black/60"
            onClick={onClose}
          />

          {/* Panel */}
          <div className="fixed inset-0 z-[100] flex items-start justify-center pt-[15vh] px-4 pointer-events-none">
            <motion.div
              key="panel"
              initial={{ opacity: 0, scale: 0.96, y: -12 }}
              animate={{ opacity: 1, scale: 1,    y: 0   }}
              exit={{    opacity: 0, scale: 0.96, y: -12 }}
              transition={{ duration: 0.18, ease: [0, 0, 0.2, 1] }}
              className="w-full max-w-[520px] bg-bg-card border border-border rounded-xl shadow-modal overflow-hidden pointer-events-auto"
            >
              {/* Search input */}
              <div className="flex items-center gap-3 px-4 py-3.5 border-b border-border">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-text-muted shrink-0">
                  <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
                </svg>
                <input
                  ref={inputRef}
                  value={query}
                  onChange={e => { setQuery(e.target.value); setCursor(0) }}
                  onKeyDown={onKey}
                  placeholder="Search pages, actions…"
                  className="flex-1 bg-transparent text-sm text-text-primary placeholder:text-text-muted outline-none"
                />
                <kbd className="hidden sm:flex items-center gap-0.5 px-1.5 py-0.5 rounded border border-border text-[10px] text-text-muted font-medium">
                  Esc
                </kbd>
              </div>

              {/* Results */}
              <div ref={listRef} className="max-h-[340px] overflow-y-auto scrollable py-1.5">
                {renderContent()}
              </div>

              {/* Footer */}
              <div className="flex items-center gap-4 px-4 py-2.5 border-t border-border">
                {[
                  { keys: ['↑', '↓'], label: 'Navigate' },
                  { keys: ['↵'],      label: 'Open' },
                  { keys: ['Esc'],    label: 'Close' },
                ].map(hint => (
                  <div key={hint.label} className="flex items-center gap-1.5">
                    <div className="flex gap-0.5">
                      {hint.keys.map(k => (
                        <kbd key={k} className="px-1.5 py-0.5 rounded border border-border bg-surface text-[10px] text-text-muted font-medium">{k}</kbd>
                      ))}
                    </div>
                    <span className="text-[11px] text-text-muted">{hint.label}</span>
                  </div>
                ))}
              </div>
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  )
}

function Item({ item, active, onClick, onHover }) {
  return (
    <button
      data-active={active}
      onClick={onClick}
      onMouseEnter={onHover}
      className={`w-full flex items-center gap-3 px-3 py-2.5 text-left transition-colors ${
        active ? 'bg-surface-active' : 'hover:bg-surface-hover'
      }`}
    >
      <span className={`shrink-0 ${active ? 'text-text-primary' : 'text-text-muted'}`}>
        {item.icon}
      </span>
      <div className="flex-1 min-w-0">
        <p className={`text-sm font-medium truncate ${active ? 'text-text-primary' : 'text-text-secondary'}`}>
          {item.label}
        </p>
        <p className="text-xs text-text-muted truncate">{item.sub}</p>
      </div>
      {active && (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-text-muted shrink-0">
          <polyline points="9 10 4 15 9 20"/><path d="M20 4v7a4 4 0 01-4 4H4"/>
        </svg>
      )}
    </button>
  )
}
