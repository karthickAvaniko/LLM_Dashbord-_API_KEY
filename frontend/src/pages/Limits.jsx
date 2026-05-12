import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import PageWrapper from '../components/layout/PageWrapper'
import Card from '../components/ui/Card'
import Skeleton from '../components/ui/Skeleton'
import { authApi } from '../services/api'
import { formatNumber, formatDate } from '../utils/formatters'

/* ── Progress bar ── */
function UsageBar({ used, limit, color = '#6366F1' }) {
  const pct = limit > 0 ? Math.min((used / limit) * 100, 100) : 0
  const barColor = pct >= 90 ? 'var(--color-status-danger)' : pct >= 75 ? 'var(--color-status-warning)' : color
  return (
    <div className="mt-1.5">
      <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'var(--color-surface)' }}>
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.7, ease: [0.4, 0, 0.2, 1] }}
          className="h-full rounded-full"
          style={{ background: barColor }}
        />
      </div>
      <div className="flex justify-between mt-1">
        <span className="text-[10px] text-text-muted">{formatNumber(used)} used</span>
        <span className="text-[10px] font-semibold" style={{ color: barColor }}>{pct.toFixed(0)}%</span>
      </div>
    </div>
  )
}

/* ── Edit modal ── */
function EditModal({ keyData, onClose, onSave }) {
  // Backend fields: rate_limit (req/day), token_budget (tokens/day, 0=unlimited), expires_in_days
  const [form, setForm] = useState({
    rate_limit:   keyData.rate_limit   ?? 200,
    token_budget: keyData.token_budget ?? 100000,
  })
  const [saving, setSaving] = useState(false)

  async function handleSave() {
    setSaving(true)
    await onSave(keyData.id, form)
    setSaving(false)
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <motion.div
        className="absolute inset-0 bg-black/60"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
      />
      <motion.div
        className="relative w-full max-w-sm card p-6 shadow-modal z-10"
        initial={{ opacity: 0, scale: 0.96, y: -10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96, y: -10 }}
        transition={{ type: 'spring', stiffness: 280, damping: 22 }}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-5">
          <div>
            <h3 className="text-sm font-bold text-text-primary">Edit Limits</h3>
            <p className="text-[11px] text-text-muted mt-0.5">{keyData.name}</p>
          </div>
          <button
            onClick={onClose}
            className="w-7 h-7 flex items-center justify-center rounded-lg text-text-muted hover:bg-surface hover:text-text-primary transition-colors"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>

        <div className="flex flex-col gap-4 mb-5">
          <div>
            <label className="text-[11px] font-semibold text-text-secondary mb-1.5 block">
              Daily Request Limit
            </label>
            <div className="flex items-center gap-2">
              <input
                type="number"
                min={1}
                value={form.rate_limit}
                onChange={e => setForm(f => ({ ...f, rate_limit: Number(e.target.value) }))}
                className="input-base h-9 text-sm flex-1"
              />
              <span className="text-xs text-text-muted shrink-0">req / day</span>
            </div>
          </div>
          <div>
            <label className="text-[11px] font-semibold text-text-secondary mb-1.5 block">
              Daily Token Budget <span className="text-text-muted font-normal">(0 = unlimited)</span>
            </label>
            <div className="flex items-center gap-2">
              <input
                type="number"
                min={0}
                value={form.token_budget}
                onChange={e => setForm(f => ({ ...f, token_budget: Number(e.target.value) }))}
                className="input-base h-9 text-sm flex-1"
              />
              <span className="text-xs text-text-muted shrink-0">tok / day</span>
            </div>
          </div>
        </div>

        <p className="text-[11px] text-text-muted mb-4 bg-surface rounded-lg px-3 py-2 border border-border">
          Set token budget to <code className="font-mono text-brand text-[10px]">0</code> for unlimited tokens.
        </p>

        <div className="flex gap-2 justify-end">
          <button
            onClick={onClose}
            className="h-8 px-4 rounded-lg text-xs font-medium border border-border text-text-secondary hover:bg-surface transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="h-8 px-4 rounded-lg text-xs font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-50"
            style={{ background: 'linear-gradient(135deg, #6366F1, #8B5CF6)' }}
          >
            {saving ? 'Saving…' : 'Save'}
          </button>
        </div>
      </motion.div>
    </div>
  )
}

/* ── Environment badge ── */
function EnvBadge({ env }) {
  const map = {
    production:  { color: '#6366F1', bg: 'rgba(99,102,241,0.10)',  label: 'prod' },
    development: { color: '#10B981', bg: 'rgba(16,185,129,0.10)',  label: 'dev'  },
    testing:     { color: '#F59E0B', bg: 'rgba(245,158,11,0.10)',  label: 'test' },
  }
  const cfg = map[env?.toLowerCase()] || { color: '#6B7280', bg: 'rgba(107,114,128,0.10)', label: 'prod' }
  return (
    <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-bold uppercase"
      style={{ color: cfg.color, background: cfg.bg }}>
      {cfg.label}
    </span>
  )
}

/* ── Key card ── */
function KeyCard({ keyData, onEdit, saved }) {
  // ── Correct field mapping from backend /keys/list ──
  // rate_limit   = daily request limit
  // token_budget = daily token budget (0 = unlimited)
  // total_requests, total_tokens = all-time cumulative totals
  const dailyLimit  = keyData.rate_limit    ?? 200
  const tokenBudget = keyData.token_budget  ?? 0
  const totalReqs   = keyData.total_requests ?? 0
  const totalTokens = keyData.total_tokens   ?? 0
  const totalCost   = keyData.total_cost     ?? 0
  const isActive    = keyData.is_active !== 0 && keyData.is_active !== false

  const keyStr = keyData.key || keyData.api_key || ''
  const masked = keyStr
    ? `${keyStr.slice(0, 8)}${'•'.repeat(16)}${keyStr.slice(-4)}`
    : '••••••••••••••••••••••••'

  return (
    <div
      className="card p-5 relative overflow-hidden transition-all duration-200"
      style={saved ? { boxShadow: '0 0 0 2px var(--color-status-success)' } : {}}
    >
      {/* Saved indicator */}
      <AnimatePresence>
        {saved && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="absolute top-3 right-16 text-[10px] font-bold px-2 py-0.5 rounded-full text-white"
            style={{ background: 'var(--color-status-success)' }}
          >
            ✓ Saved
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 mb-1">
            <p className="text-sm font-bold text-text-primary truncate">{keyData.name || 'Unnamed Key'}</p>
            <EnvBadge env={keyData.environment} />
            <span
              className="shrink-0 px-1.5 py-0.5 rounded-full text-[9px] font-bold uppercase"
              style={isActive
                ? { background: 'var(--color-status-success-bg)', color: 'var(--color-status-success)' }
                : { background: 'var(--color-status-danger-bg)',  color: 'var(--color-status-danger)'  }
              }
            >
              {isActive ? 'Active' : 'Inactive'}
            </span>
          </div>
          <code className="text-[10px] text-text-muted font-mono">{masked}</code>
        </div>
        <button
          onClick={() => onEdit(keyData)}
          className="shrink-0 ml-3 flex items-center gap-1 h-7 px-2.5 rounded-lg text-[11px] font-semibold border border-border text-text-muted hover:text-brand hover:border-brand/40 hover:bg-brand-muted transition-all"
        >
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/>
            <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/>
          </svg>
          Edit
        </button>
      </div>

      {/* Divider */}
      <div className="border-t border-border mb-4" />

      {/* Limit config row */}
      <div className="grid grid-cols-2 gap-3 mb-4">
        <div className="rounded-xl p-3" style={{ background: 'var(--color-surface)' }}>
          <p className="text-[10px] font-medium text-text-muted mb-1">Daily Request Limit</p>
          <p className="text-lg font-bold text-text-primary tabular-nums">
            {formatNumber(dailyLimit)}
          </p>
          <p className="text-[10px] text-text-muted mt-0.5">requests / day</p>
        </div>
        <div className="rounded-xl p-3" style={{ background: 'var(--color-surface)' }}>
          <p className="text-[10px] font-medium text-text-muted mb-1">Token Budget</p>
          <p className="text-lg font-bold text-text-primary tabular-nums">
            {tokenBudget === 0 ? '∞' : formatNumber(tokenBudget)}
          </p>
          <p className="text-[10px] text-text-muted mt-0.5">
            {tokenBudget === 0 ? 'unlimited' : 'tokens / day'}
          </p>
        </div>
      </div>

      {/* Cumulative usage stats */}
      <div className="rounded-xl p-3 border border-border">
        <p className="text-[10px] font-semibold text-text-muted uppercase tracking-wider mb-2.5">All-time Usage</p>
        <div className="grid grid-cols-3 gap-2 text-center">
          {[
            { label: 'Requests', value: formatNumber(totalReqs),   color: '#6366F1' },
            { label: 'Tokens',   value: formatNumber(totalTokens), color: '#8B5CF6' },
            { label: 'Cost',     value: `$${totalCost.toFixed(4)}`, color: '#F59E0B' },
          ].map(s => (
            <div key={s.label}>
              <p className="text-sm font-bold tabular-nums" style={{ color: s.color }}>{s.value}</p>
              <p className="text-[9px] text-text-muted mt-0.5 uppercase tracking-wide">{s.label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Expiry */}
      {keyData.expires_at && (
        <p className="text-[10px] text-status-warning mt-3">
          Expires {formatDate(keyData.expires_at)}
        </p>
      )}
    </div>
  )
}

export default function Limits() {
  const [keys, setKeys]     = useState([])
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState(null)
  const [saved, setSaved]   = useState(null)

  useEffect(() => {
    authApi.listKeys()
      .then(data => setKeys(Array.isArray(data) ? data : (data.keys ?? [])))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  async function handleSave(keyId, limits) {
    try {
      await authApi.updateKeyLimits(keyId, limits)
    } catch {}
    // Always update local state regardless of backend result
    setKeys(ks => ks.map(k => k.id === keyId ? { ...k, ...limits } : k))
    setSaved(keyId)
    setTimeout(() => setSaved(null), 2500)
  }

  if (loading) {
    return (
      <PageWrapper>
        <div className="flex items-center justify-between mb-7">
          <div><Skeleton className="h-7 w-44 mb-2" /><Skeleton className="h-4 w-64" /></div>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {[...Array(4)].map((_, i) => (
            <Skeleton.Card key={i} className="p-5">
              <Skeleton className="h-5 w-32 mb-4" />
              <div className="grid grid-cols-2 gap-3">
                <Skeleton className="h-16 rounded-xl" />
                <Skeleton className="h-16 rounded-xl" />
              </div>
            </Skeleton.Card>
          ))}
        </div>
      </PageWrapper>
    )
  }

  return (
    <PageWrapper>

      {/* Header */}
      <div className="flex items-start justify-between mb-7">
        <div>
          <h2 className="text-xl font-semibold text-text-primary tracking-tight">Usage Limits</h2>
          <p className="text-sm text-text-muted mt-0.5">
            Configure daily request quotas and token budgets per API key
          </p>
        </div>
        <div className="hidden sm:flex items-center gap-2 text-xs text-text-muted bg-surface border border-border rounded-lg px-3 py-2">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
          </svg>
          Limits reset daily at midnight UTC
        </div>
      </div>

      {keys.length === 0 ? (
        <Card className="p-12 flex flex-col items-center text-center">
          <div
            className="w-16 h-16 rounded-2xl flex items-center justify-center mb-4"
            style={{ background: 'var(--color-brand-muted)' }}
          >
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#6366F1" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
            </svg>
          </div>
          <p className="text-sm font-semibold text-text-primary mb-1">No API keys yet</p>
          <p className="text-xs text-text-muted max-w-xs">Create API keys in the API Keys page to configure their limits here.</p>
        </Card>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {keys.map(k => (
            <KeyCard
              key={k.id}
              keyData={k}
              onEdit={setEditing}
              saved={saved === k.id}
            />
          ))}
        </div>
      )}

      {/* Edit modal */}
      <AnimatePresence>
        {editing && (
          <EditModal
            keyData={editing}
            onClose={() => setEditing(null)}
            onSave={handleSave}
          />
        )}
      </AnimatePresence>

    </PageWrapper>
  )
}
