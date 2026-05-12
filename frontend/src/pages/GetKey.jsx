import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useToast } from '../context/ToastContext'
import { keysApi } from '../services/api'
import Button from '../components/ui/Button'
import Input from '../components/ui/Input'
import Badge from '../components/ui/Badge'
import Modal from '../components/ui/Modal'
import Card from '../components/ui/Card'
import PageWrapper from '../components/layout/PageWrapper'
import { maskKey, formatDate, formatNumber, copyToClipboard } from '../utils/formatters'

/* ─── Environment badge ─── */
function EnvBadge({ env }) {
  const map = {
    production:  { color: '#6366F1', bg: 'rgba(99,102,241,0.10)',  label: 'prod' },
    development: { color: '#10B981', bg: 'rgba(16,185,129,0.10)',  label: 'dev'  },
    testing:     { color: '#F59E0B', bg: 'rgba(245,158,11,0.10)',  label: 'test' },
  }
  const cfg = map[env?.toLowerCase()] || { color: '#6B7280', bg: 'rgba(107,114,128,0.10)', label: env || 'prod' }
  return (
    <span
      className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold uppercase"
      style={{ color: cfg.color, background: cfg.bg }}
    >
      {cfg.label}
    </span>
  )
}

/* ─── Copy button ─── */
function CopyButton({ text }) {
  const [copied, setCopied] = useState(false)
  const { success } = useToast()

  const handle = async () => {
    try {
      await copyToClipboard(text)
      setCopied(true)
      success('Copied to clipboard!')
      setTimeout(() => setCopied(false), 2000)
    } catch {}
  }

  return (
    <button
      onClick={handle}
      className={`inline-flex items-center gap-1 px-2 py-1 rounded text-[10px] font-semibold border transition-all ${
        copied
          ? 'bg-status-success-bg text-status-success border-status-success/20'
          : 'bg-surface text-text-muted border-border hover:bg-surface-hover hover:text-text-secondary'
      }`}
    >
      {copied ? '✓ Copied' : 'Copy'}
    </button>
  )
}

/* ─── Key reveal after creation ─── */
function NewKeyReveal({ apiKey }) {
  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-start gap-2.5 p-3 rounded-lg bg-status-warning-bg border border-status-warning/20">
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-status-warning shrink-0 mt-0.5">
          <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/>
          <line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
        </svg>
        <p className="text-xs text-status-warning font-medium">This key is shown only once. Copy it now before closing.</p>
      </div>

      <div>
        <p className="text-[11px] font-medium text-text-muted uppercase tracking-wider mb-2">API Key</p>
        <div className="flex items-center gap-2 p-3 rounded-lg bg-bg border border-brand/20">
          <code className="flex-1 font-mono text-sm text-brand break-all">{apiKey}</code>
          <CopyButton text={apiKey} />
        </div>
      </div>

      <div>
        <p className="text-[11px] font-medium text-text-muted uppercase tracking-wider mb-2">Usage</p>
        <div className="rounded-lg bg-bg border border-border p-3 font-mono text-[11px] leading-relaxed text-text-secondary overflow-x-auto">
          <span className="text-text-muted"># Python</span>{'\n'}
          <span>import requests</span>{'\n\n'}
          <span>resp = requests.post(</span>{'\n'}
          <span className="pl-4">{`"YOUR_GATEWAY_URL/v1/chat/completions",`}</span>{'\n'}
          <span className="pl-4">{`headers={"X-API-Key": "${apiKey?.slice(0, 12)}..."},`}</span>{'\n'}
          <span className="pl-4">{'json={"prompt": "Hello!"}'}</span>{'\n'}
          <span>)</span>
        </div>
      </div>
    </div>
  )
}

/* ─── Env selector tabs ─── */
function EnvSelector({ value, onChange }) {
  const options = [
    { val: 'production',  label: 'Production',  color: '#6366F1' },
    { val: 'development', label: 'Development', color: '#10B981' },
    { val: 'testing',     label: 'Testing',     color: '#F59E0B' },
  ]
  return (
    <div>
      <p className="text-xs font-medium text-text-secondary mb-1.5">Environment</p>
      <div className="flex gap-2">
        {options.map(o => (
          <button
            key={o.val}
            type="button"
            onClick={() => onChange(o.val)}
            className="flex-1 py-2 rounded-lg border text-xs font-semibold transition-all"
            style={
              value === o.val
                ? { background: o.color, color: '#fff', borderColor: o.color, boxShadow: `0 0 0 2px ${o.color}33` }
                : { color: 'var(--color-text-muted)', borderColor: 'var(--color-border)', background: 'var(--color-surface)' }
            }
          >
            {o.label}
          </button>
        ))}
      </div>
    </div>
  )
}

const BLANK_FORM = { name: '', email: '', environment: 'production', rate_limit: 200, token_budget: 100000, expires_in_days: 0 }

export default function GetKey() {
  const [keys, setKeys]             = useState([])
  const [showCreate, setShowCreate] = useState(false)
  const [newKeyData, setNewKeyData] = useState(null)
  const [form, setForm]             = useState(BLANK_FORM)
  const [loading, setLoading]       = useState(false)
  const [deleteTarget, setDeleteTarget] = useState(null)
  const { success, error: toastError } = useToast()

  useEffect(() => {
    keysApi.list()
      .then(data => {
        const serverKeys = data?.keys || []
        setKeys(serverKeys)
        localStorage.setItem('ai_keys', JSON.stringify(serverKeys))
      })
      .catch(() => {
        try { setKeys(JSON.parse(localStorage.getItem('ai_keys') || '[]')) } catch {}
      })
  }, [])

  const saveKeys = (updated) => {
    setKeys(updated)
    localStorage.setItem('ai_keys', JSON.stringify(updated))
  }

  const handleCreate = async (e) => {
    e.preventDefault()
    if (!form.name) { toastError('Key name is required.'); return }
    setLoading(true)
    try {
      const data = await keysApi.create({
        name:            form.name,
        description:     form.email ? `Created for ${form.email}` : '',
        environment:     form.environment,
        rate_limit:      Number(form.rate_limit) || 200,
        token_budget:    Number(form.token_budget) || 100000,
        expires_in_days: Number(form.expires_in_days) || 0,
      })
      const keyEntry = {
        ...data,
        created_at:   data.created_at || new Date().toISOString(),
        name:         form.name,
        environment:  form.environment,
        rate_limit:   Number(form.rate_limit) || 200,
        token_budget: Number(form.token_budget) || 100000,
      }
      saveKeys([...keys, keyEntry])
      setNewKeyData(data.api_key || data.key)
      setShowCreate(false)
      setForm(BLANK_FORM)
    } catch (err) {
      toastError(err.message || 'Failed to create API key.')
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (target) => {
    try { if (target.id) await keysApi.revoke(target.id) } catch {}
    saveKeys(keys.filter(k => (k.api_key || k.key) !== target.keyVal))
    setDeleteTarget(null)
    success('API key revoked.')
  }

  const activeCount = keys.filter(k => k.is_active !== false).length
  const totalReqs   = keys.reduce((s, k) => s + (k.total_requests || 0), 0)

  return (
    <PageWrapper>

      {/* ── Header ── */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-semibold text-text-primary tracking-tight">API Keys</h2>
          <p className="text-sm text-text-muted mt-0.5">Manage tokens for accessing the Avaniko AI API.</p>
        </div>
        <Button
          onClick={() => setShowCreate(true)}
          icon={
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
            </svg>
          }
        >
          New Key
        </Button>
      </div>

      {/* ── Stats row ── */}
      <div className="grid grid-cols-3 gap-3 mb-5">
        {[
          { label: 'Total Keys',     value: keys.length },
          { label: 'Active',         value: activeCount },
          { label: 'Total Requests', value: formatNumber(totalReqs) },
        ].map(s => (
          <div key={s.label} className="card p-4">
            <p className="text-2xl font-semibold text-text-primary tabular-nums">{s.value}</p>
            <p className="text-xs text-text-muted mt-1">{s.label}</p>
          </div>
        ))}
      </div>

      {/* ── Keys table ── */}
      <Card padding={false}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <p className="text-sm font-medium text-text-primary">Keys</p>
          <span className="text-xs text-text-muted">{keys.length} total</span>
        </div>

        {keys.length === 0 ? (
          <div className="flex flex-col items-center py-20 text-center px-6">
            <div className="relative mb-6">
              <div className="w-20 h-20 rounded-2xl bg-surface border border-border flex items-center justify-center">
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round" className="text-text-muted">
                  <path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 11-7.778 7.778 5.5 5.5 0 017.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4"/>
                </svg>
              </div>
              <span className="absolute -top-1 -right-1 flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-brand opacity-40"/>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-brand"/>
              </span>
            </div>
            <p className="text-base font-semibold text-text-primary mb-1">No API keys yet</p>
            <p className="text-sm text-text-muted max-w-xs mb-6 leading-relaxed">
              Create your first key to start making requests to the Avaniko AI API.
            </p>
            <Button onClick={() => setShowCreate(true)}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
              </svg>
              Create API Key
            </Button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  {['Name', 'Key', 'Env', 'Limit / Budget', 'Created', ''].map(h => (
                    <th key={h} className="px-5 py-3 text-left text-[11px] font-semibold text-text-muted uppercase tracking-wider">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                <AnimatePresence>
                  {keys.map((k, i) => {
                    const keyVal = k.api_key || k.key || ''
                    return (
                      <motion.tr
                        key={keyVal || i}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0, height: 0 }}
                        transition={{ delay: i * 0.04 }}
                        className="border-b border-border last:border-0 hover:bg-surface transition-colors"
                      >
                        <td className="px-5 py-3.5">
                          <p className="font-medium text-text-primary">{k.name}</p>
                          {k.expires_at && (
                            <p className="text-[10px] text-status-warning mt-0.5">Expires {formatDate(k.expires_at)}</p>
                          )}
                        </td>
                        <td className="px-5 py-3.5">
                          <div className="flex items-center gap-2">
                            <code className="font-mono text-xs text-brand">{maskKey(keyVal)}</code>
                            <CopyButton text={keyVal} />
                          </div>
                        </td>
                        <td className="px-5 py-3.5">
                          <EnvBadge env={k.environment || 'production'} />
                        </td>
                        <td className="px-5 py-3.5">
                          <p className="text-xs font-medium text-text-primary">
                            {k.rate_limit || 200}<span className="text-text-muted font-normal">/day</span>
                          </p>
                          <p className="text-[10px] text-text-muted mt-0.5">
                            {(k.token_budget && k.token_budget > 0)
                              ? `${formatNumber(k.token_budget)} tok/day`
                              : 'Unlimited tokens'}
                          </p>
                        </td>
                        <td className="px-5 py-3.5">
                          <span className="text-xs text-text-muted tabular-nums">{formatDate(k.created_at)}</span>
                        </td>
                        <td className="px-5 py-3.5 text-right">
                          <button
                            onClick={() => setDeleteTarget({ id: k.id, keyVal })}
                            className="text-xs font-medium text-text-muted hover:text-status-danger transition-colors"
                          >
                            Revoke
                          </button>
                        </td>
                      </motion.tr>
                    )
                  })}
                </AnimatePresence>
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* ── Create Key Modal ── */}
      <Modal
        isOpen={showCreate}
        onClose={() => { setShowCreate(false); setForm(BLANK_FORM) }}
        title="Create API Key"
        size="sm"
        footer={
          <>
            <Button variant="ghost" size="sm" onClick={() => setShowCreate(false)}>Cancel</Button>
            <Button size="sm" loading={loading} onClick={handleCreate}>Create Key</Button>
          </>
        }
      >
        <form onSubmit={handleCreate} className="flex flex-col gap-4">
          <Input
            label="Key Name"
            placeholder="My Project"
            value={form.name}
            onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
            autoFocus
          />
          <Input
            label="Email (optional)"
            type="email"
            placeholder="you@company.com"
            value={form.email}
            onChange={e => setForm(p => ({ ...p, email: e.target.value }))}
          />
          <EnvSelector value={form.environment} onChange={v => setForm(p => ({ ...p, environment: v }))} />
          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Req/day limit"
              type="number"
              placeholder="200"
              value={form.rate_limit}
              onChange={e => setForm(p => ({ ...p, rate_limit: e.target.value }))}
            />
            <Input
              label="Token budget/day"
              type="number"
              placeholder="100000"
              value={form.token_budget}
              onChange={e => setForm(p => ({ ...p, token_budget: e.target.value }))}
            />
          </div>
          <Input
            label="Expires in days (0 = never)"
            type="number"
            placeholder="0"
            value={form.expires_in_days}
            onChange={e => setForm(p => ({ ...p, expires_in_days: e.target.value }))}
          />
        </form>
      </Modal>

      {/* ── Key Reveal Modal ── */}
      <Modal
        isOpen={!!newKeyData}
        onClose={() => setNewKeyData(null)}
        title="API Key Created"
        size="md"
        footer={<Button onClick={() => setNewKeyData(null)}>Done</Button>}
      >
        {newKeyData && <NewKeyReveal apiKey={newKeyData} />}
      </Modal>

      {/* ── Delete Confirm Modal ── */}
      <Modal
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        title="Revoke API Key"
        size="sm"
        footer={
          <>
            <Button variant="ghost" size="sm" onClick={() => setDeleteTarget(null)}>Cancel</Button>
            <Button variant="danger" size="sm" onClick={() => handleDelete(deleteTarget)}>Revoke</Button>
          </>
        }
      >
        <p className="text-sm text-text-secondary">
          This key will stop working immediately. Any apps using it will lose access.
        </p>
      </Modal>

    </PageWrapper>
  )
}
