import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import PageWrapper from '../components/layout/PageWrapper'
import AreaChart from '../components/charts/AreaChart'
import CircularProgress from '../components/charts/CircularProgress'
import Card from '../components/ui/Card'
import Skeleton from '../components/ui/Skeleton'
import { authApi, usageApi } from '../services/api'
import { formatNumber, formatCost } from '../utils/formatters'

/* ── Period selector ── */
const PERIODS = [
  { label: '7 days',  value: 7  },
  { label: '30 days', value: 30 },
  { label: '90 days', value: 90 },
]

/* ── Metric row inside a table ── */
function MetricRow({ rank, name, requests, tokens, cost, pct, color }) {
  return (
    <div className="flex items-center gap-3 py-3 border-b border-border last:border-0">
      <span
        className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold text-white shrink-0"
        style={{ background: `linear-gradient(135deg, ${color}CC, ${color}88)` }}
      >
        {rank}
      </span>
      <div className="flex-1 min-w-0">
        <p className="text-xs font-semibold text-text-primary truncate">{name}</p>
        <div className="mt-1 h-1 bg-surface rounded-full overflow-hidden">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${pct}%` }}
            transition={{ duration: 0.8, ease: [0.4,0,0.2,1] }}
            className="h-full rounded-full"
            style={{ background: color }}
          />
        </div>
      </div>
      <div className="text-right shrink-0">
        <p className="text-xs font-semibold text-text-primary tabular-nums">{formatNumber(requests)}</p>
        <p className="text-[10px] text-text-muted">{formatNumber(tokens)} tok</p>
      </div>
    </div>
  )
}

/* ── Stat tile ── */
function Tile({ label, value, sub, color = '#6366F1' }) {
  return (
    <div className="card p-4 flex flex-col gap-1">
      <p className="text-[11px] text-text-muted font-medium">{label}</p>
      <p className="text-xl font-bold text-text-primary tabular-nums" style={{ color }}>{value}</p>
      {sub && <p className="text-[10px] text-text-muted">{sub}</p>}
    </div>
  )
}

export default function Analytics() {
  const [period, setPeriod]     = useState(7)
  const [stats, setStats]       = useState(null)
  const [loading, setLoading]   = useState(true)
  const [exporting, setExporting] = useState(false)

  const handleExport = async () => {
    setExporting(true)
    try { await usageApi.exportCsv() } catch {}
    finally { setExporting(false) }
  }

  useEffect(() => {
    setLoading(true)
    authApi.myStats()
      .then(d => setStats(d))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [period])

  /* ── Derived values ── */
  const totalReqs   = stats?.total_requests    ?? 0
  const totalTokens = stats?.total_tokens      ?? 0
  const totalCost   = stats?.total_cost        ?? 0
  const promptTok   = stats?.prompt_tokens     ?? 0
  const completeTok = stats?.completion_tokens ?? 0
  const successRate = stats?.success_rate      ?? 100
  const chartData   = stats?.daily_requests    || Array(period).fill(0)
  const keys        = stats?.keys              || []

  const promptPct   = totalTokens > 0 ? Math.round((promptTok   / totalTokens) * 100) : 0
  const completePct = totalTokens > 0 ? Math.round((completeTok / totalTokens) * 100) : 0

  const KEY_COLORS = ['#6366F1','#8B5CF6','#EC4899','#10B981','#F59E0B','#3B82F6']

  if (loading) {
    return (
      <PageWrapper>
        <div className="flex items-center justify-between mb-7">
          <div><Skeleton className="h-7 w-40 mb-2" /><Skeleton className="h-4 w-28" /></div>
          <Skeleton className="h-8 w-48 rounded-lg" />
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          {[...Array(4)].map((_, i) => <Skeleton.Card key={i} className="p-4"><Skeleton className="h-4 w-20 mb-2" /><Skeleton className="h-6 w-16" /></Skeleton.Card>)}
        </div>
        <Skeleton.Card className="p-5 mb-6"><Skeleton className="h-[180px] w-full" /></Skeleton.Card>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {[...Array(3)].map((_, i) => <Skeleton.Card key={i} className="p-5"><Skeleton className="h-32 w-full" /></Skeleton.Card>)}
        </div>
      </PageWrapper>
    )
  }

  return (
    <PageWrapper>

      {/* Header */}
      <div className="flex items-start justify-between mb-7">
        <div>
          <h2 className="text-2xl font-bold text-text-primary tracking-tight">Analytics</h2>
          <p className="text-sm text-text-muted mt-1">Token usage, request trends & key performance</p>
        </div>
        <div className="flex items-center gap-2">
          {/* Export CSV */}
          <button
            onClick={handleExport}
            disabled={exporting}
            className="flex items-center gap-1.5 h-9 px-3 rounded-lg border border-border text-xs font-medium text-text-secondary hover:text-text-primary hover:bg-surface-hover transition-all"
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>
            </svg>
            {exporting ? 'Exporting…' : 'Export CSV'}
          </button>
          {/* Period selector */}
          <div className="flex items-center gap-1 p-1 rounded-lg border border-border bg-bg-raised">
          {PERIODS.map(p => (
            <button
              key={p.value}
              onClick={() => setPeriod(p.value)}
              className="px-3 py-1.5 rounded-md text-xs font-semibold transition-all"
              style={
                period === p.value
                  ? { background: '#6366F1', color: '#fff', boxShadow: '0 2px 8px rgba(99,102,241,0.35)' }
                  : { color: 'var(--color-text-muted)' }
              }
            >
              {p.label}
            </button>
          ))}
          </div>
        </div>
      </div>

      {/* Summary tiles */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <Tile label="Total Requests"   value={formatNumber(totalReqs)}   color="#6366F1" sub={`Last ${period} days`} />
        <Tile label="Total Tokens"     value={formatNumber(totalTokens)} color="#8B5CF6" sub="Prompt + completion" />
        <Tile label="Total Cost"       value={formatCost(totalCost)}     color="#F59E0B" sub="Estimated USD" />
        <Tile label="Success Rate"     value={`${successRate}%`}         color="#10B981" sub="Of all requests" />
      </div>

      {/* Request trend chart */}
      <Card padding={false} className="mb-6">
        <div className="flex items-center justify-between px-5 pt-5 pb-4 border-b border-border">
          <div>
            <p className="text-sm font-semibold text-text-primary">Request Trend</p>
            <p className="text-xs text-text-muted mt-0.5">Daily request volume</p>
          </div>
          <span className="text-2xl font-bold text-text-primary tabular-nums">{formatNumber(totalReqs)}</span>
        </div>
        <div className="px-5 pt-4 pb-4">
          <AreaChart data={chartData} color="#6366F1" height={160} id="analytics" />
          <div className="flex justify-between mt-2">
            {chartData.length > 0
              ? [...Array(Math.min(chartData.length, 7))].map((_, i) => (
                  <span key={i} className="text-[10px] text-text-muted">
                    {`-${chartData.length - 1 - i}d`}
                  </span>
                ))
              : null}
          </div>
        </div>
      </Card>

      {/* Bottom row: token split + key breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

        {/* Token split donuts */}
        <Card className="p-5">
          <p className="text-sm font-semibold text-text-primary mb-1">Token Split</p>
          <p className="text-xs text-text-muted mb-5">Prompt vs completion</p>
          <div className="flex items-center justify-around">
            <div className="flex flex-col items-center gap-3">
              <CircularProgress value={promptPct} color="#6366F1" size={80} />
              <div className="text-center">
                <p className="text-[10px] font-semibold text-text-secondary">Prompt</p>
                <p className="text-xs font-bold text-text-primary tabular-nums">{formatNumber(promptTok)}</p>
              </div>
            </div>
            <div className="flex flex-col items-center gap-3">
              <CircularProgress value={completePct} color="#8B5CF6" size={80} />
              <div className="text-center">
                <p className="text-[10px] font-semibold text-text-secondary">Completion</p>
                <p className="text-xs font-bold text-text-primary tabular-nums">{formatNumber(completeTok)}</p>
              </div>
            </div>
          </div>
          {/* Legend */}
          <div className="mt-4 pt-4 border-t border-border flex justify-around">
            {[
              { label: 'Avg / request', value: totalReqs > 0 ? formatNumber(Math.round(promptTok / totalReqs)) : '0', color: '#6366F1' },
              { label: 'Avg / request', value: totalReqs > 0 ? formatNumber(Math.round(completeTok / totalReqs)) : '0', color: '#8B5CF6' },
            ].map((item, i) => (
              <div key={i} className="text-center">
                <p className="text-[10px] text-text-muted">{item.label}</p>
                <p className="text-sm font-bold tabular-nums" style={{ color: item.color }}>{item.value}</p>
              </div>
            ))}
          </div>
        </Card>

        {/* Per-key breakdown */}
        <Card className="p-5 lg:col-span-2">
          <p className="text-sm font-semibold text-text-primary mb-1">Per-Key Usage</p>
          <p className="text-xs text-text-muted mb-4">Requests by API key this period</p>
          {keys.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <div
                className="w-12 h-12 rounded-xl flex items-center justify-center mb-3"
                style={{ background: 'var(--color-brand-muted)' }}
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#6366F1" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="7.5" cy="15.5" r="5.5"/><path d="m21 2-9.6 9.6M15.5 7.5l3 3L22 7l-3-3"/>
                </svg>
              </div>
              <p className="text-sm font-medium text-text-secondary">No keys used yet</p>
              <p className="text-xs text-text-muted mt-1">Create an API key to start tracking usage</p>
            </div>
          ) : (
            <div>
              {keys.slice(0, 6).map((k, i) => {
                const maxReqs = Math.max(...keys.map(x => x.requests ?? 0), 1)
                return (
                  <MetricRow
                    key={k.id || i}
                    rank={i + 1}
                    name={k.name || `Key ${i + 1}`}
                    requests={k.requests ?? 0}
                    tokens={k.tokens ?? 0}
                    cost={k.cost ?? 0}
                    pct={((k.requests ?? 0) / maxReqs) * 100}
                    color={KEY_COLORS[i % KEY_COLORS.length]}
                  />
                )
              })}
            </div>
          )}
        </Card>

      </div>

    </PageWrapper>
  )
}
