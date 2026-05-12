import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import PageWrapper from '../components/layout/PageWrapper'
import Card from '../components/ui/Card'
import Badge from '../components/ui/Badge'
import Skeleton from '../components/ui/Skeleton'
import { usageApi, keysApi } from '../services/api'
import { formatDate, formatCost, formatNumber } from '../utils/formatters'

/* ── Status badge colours ── */
function StatusBadge({ status }) {
  const map = {
    success: { variant: 'success', label: 'Success' },
    error:   { variant: 'danger',  label: 'Error'   },
    rate_limited: { variant: 'warning', label: 'Rate limited' },
  }
  const cfg = map[status] || { variant: 'neutral', label: status }
  return <Badge variant={cfg.variant}>{cfg.label}</Badge>
}

/* ── Environment badge ── */
function EnvBadge({ env }) {
  const map = {
    production:  { color: '#6366F1', bg: 'rgba(99,102,241,0.10)',  label: 'prod' },
    development: { color: '#10B981', bg: 'rgba(16,185,129,0.10)',  label: 'dev'  },
    testing:     { color: '#F59E0B', bg: 'rgba(245,158,11,0.10)',  label: 'test' },
  }
  const cfg = map[env?.toLowerCase()] || { color: '#6B7280', bg: 'rgba(107,114,128,0.10)', label: env || '—' }
  return (
    <span
      className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold uppercase"
      style={{ color: cfg.color, background: cfg.bg }}
    >
      {cfg.label}
    </span>
  )
}

/* ── Single log row ── */
function LogRow({ log, keyName, keyEnv, index }) {
  const totalTokens = (log.prompt_tokens || 0) + (log.completion_tokens || 0)
  return (
    <motion.tr
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.02, duration: 0.18 }}
      className="border-b border-border last:border-0 hover:bg-surface transition-colors"
    >
      <td className="px-5 py-3">
        <p className="text-xs font-mono text-text-primary">{log.endpoint || '/v1/chat'}</p>
        <p className="text-[10px] text-text-muted mt-0.5">{formatDate(log.timestamp)}</p>
      </td>
      <td className="px-5 py-3">
        <div className="flex items-center gap-1.5">
          <p className="text-xs font-medium text-text-primary truncate max-w-[100px]">{keyName || '—'}</p>
          {keyEnv && <EnvBadge env={keyEnv} />}
        </div>
      </td>
      <td className="px-5 py-3 tabular-nums">
        <p className="text-xs text-text-primary font-semibold">{formatNumber(totalTokens)}</p>
        <p className="text-[10px] text-text-muted">{formatNumber(log.prompt_tokens || 0)} + {formatNumber(log.completion_tokens || 0)}</p>
      </td>
      <td className="px-5 py-3">
        <p className="text-xs font-medium text-text-primary tabular-nums">{formatCost(log.cost || 0)}</p>
      </td>
      <td className="px-5 py-3">
        <StatusBadge status={log.status || 'success'} />
      </td>
    </motion.tr>
  )
}

export default function Activity() {
  const [logs,     setLogs]     = useState([])
  const [keys,     setKeys]     = useState([])
  const [loading,  setLoading]  = useState(true)
  const [filter,   setFilter]   = useState('all')   // all | success | error
  const [keyFilter, setKeyFilter] = useState('all')
  const [exporting, setExporting] = useState(false)

  const load = useCallback(() => {
    setLoading(true)
    Promise.all([
      usageApi.getLogs(),
      keysApi.list(),
    ]).then(([usageData, keysData]) => {
      setLogs(usageData?.logs || [])
      setKeys(keysData?.keys || [])
    }).catch(() => {
      setLogs([])
      setKeys([])
    }).finally(() => setLoading(false))
  }, [])

  useEffect(() => { load() }, [load])

  const handleExport = async () => {
    setExporting(true)
    try { await usageApi.exportCsv() } catch {}
    finally { setExporting(false) }
  }

  /* Key lookup map */
  const keyMap = Object.fromEntries(keys.map(k => [k.id, k]))

  /* Filtered logs */
  const filtered = logs.filter(l => {
    const statusOk = filter === 'all' || l.status === filter
    const keyOk    = keyFilter === 'all' || String(l.api_key_id) === keyFilter
    return statusOk && keyOk
  })

  /* Summary stats */
  const totalTokens = logs.reduce((s, l) => s + (l.prompt_tokens || 0) + (l.completion_tokens || 0), 0)
  const totalCost   = logs.reduce((s, l) => s + (l.cost || 0), 0)
  const successCount = logs.filter(l => l.status === 'success' || !l.status).length
  const successRate  = logs.length > 0 ? Math.round((successCount / logs.length) * 100) : 100

  if (loading) {
    return (
      <PageWrapper>
        <div className="flex items-center justify-between mb-7">
          <div><Skeleton className="h-7 w-40 mb-2" /><Skeleton className="h-4 w-32" /></div>
          <Skeleton className="h-9 w-32 rounded-lg" />
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          {[...Array(4)].map((_, i) => <Skeleton.Card key={i} className="p-4"><Skeleton className="h-4 w-20 mb-2" /><Skeleton className="h-6 w-16" /></Skeleton.Card>)}
        </div>
        <Skeleton.Card className="p-4"><Skeleton className="h-[300px] w-full" /></Skeleton.Card>
      </PageWrapper>
    )
  }

  return (
    <PageWrapper>

      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <h2 className="text-xl font-semibold text-text-primary tracking-tight">Activity Log</h2>
          <p className="text-sm text-text-muted mt-0.5">Per-request audit trail — last 100 requests</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={load}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border text-xs font-medium text-text-secondary hover:text-text-primary hover:bg-surface-hover transition-all"
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 11-2.12-9.36L23 10"/>
            </svg>
            Refresh
          </button>
          <button
            onClick={handleExport}
            disabled={exporting}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-white transition-all"
            style={{ background: 'linear-gradient(135deg, #6366F1, #8B5CF6)', opacity: exporting ? 0.7 : 1 }}
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>
            </svg>
            {exporting ? 'Exporting…' : 'Export CSV'}
          </button>
        </div>
      </div>

      {/* Summary tiles */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {[
          { label: 'Total Requests', value: formatNumber(logs.length),     color: '#6366F1' },
          { label: 'Total Tokens',   value: formatNumber(totalTokens),     color: '#8B5CF6' },
          { label: 'Total Cost',     value: formatCost(totalCost),         color: '#F59E0B' },
          { label: 'Success Rate',   value: `${successRate}%`,             color: '#10B981' },
        ].map(t => (
          <div key={t.label} className="card p-4">
            <p className="text-[11px] text-text-muted font-medium mb-1">{t.label}</p>
            <p className="text-xl font-bold tabular-nums" style={{ color: t.color }}>{t.value}</p>
          </div>
        ))}
      </div>

      {/* Filter bar */}
      <div className="flex items-center gap-3 mb-4">
        {/* Status filter */}
        <div className="flex items-center gap-1 p-1 rounded-lg border border-border bg-bg-raised">
          {['all', 'success', 'error'].map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className="px-3 py-1.5 rounded-md text-xs font-semibold capitalize transition-all"
              style={
                filter === f
                  ? { background: '#6366F1', color: '#fff' }
                  : { color: 'var(--color-text-muted)' }
              }
            >
              {f === 'all' ? 'All' : f.charAt(0).toUpperCase() + f.slice(1)}
            </button>
          ))}
        </div>

        {/* Key filter */}
        <select
          value={keyFilter}
          onChange={e => setKeyFilter(e.target.value)}
          className="h-9 px-3 rounded-lg border border-border bg-bg-raised text-xs text-text-primary outline-none cursor-pointer"
        >
          <option value="all">All keys</option>
          {keys.map(k => (
            <option key={k.id} value={String(k.id)}>{k.name}</option>
          ))}
        </select>

        <span className="ml-auto text-xs text-text-muted">
          {filtered.length} of {logs.length} entries
        </span>
      </div>

      {/* Log table */}
      <Card padding={false}>
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center py-20 text-center px-6">
            <div className="w-16 h-16 rounded-2xl flex items-center justify-center mb-4" style={{ background: 'var(--color-brand-muted)' }}>
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#6366F1" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>
              </svg>
            </div>
            <p className="text-sm font-semibold text-text-primary mb-1">No activity yet</p>
            <p className="text-xs text-text-muted max-w-xs">
              {logs.length === 0
                ? 'Make your first API request to see activity here.'
                : 'No entries match the current filter.'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  {['Endpoint / Time', 'API Key', 'Tokens', 'Cost', 'Status'].map(h => (
                    <th key={h} className="px-5 py-3 text-left text-[11px] font-semibold text-text-muted uppercase tracking-wider">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                <AnimatePresence>
                  {filtered.slice(0, 100).map((log, i) => {
                    const k = keyMap[log.api_key_id]
                    return (
                      <LogRow
                        key={log.id || i}
                        log={log}
                        keyName={k?.name}
                        keyEnv={k?.environment}
                        index={i}
                      />
                    )
                  })}
                </AnimatePresence>
              </tbody>
            </table>
          </div>
        )}
      </Card>

    </PageWrapper>
  )
}
