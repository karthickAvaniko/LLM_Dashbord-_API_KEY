import { useState, useEffect, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useAuth } from '../context/AuthContext'
import { authApi } from '../services/api'
import StatCard from '../components/charts/StatCard'
import AreaChart from '../components/charts/AreaChart'
import Card from '../components/ui/Card'
import PageWrapper from '../components/layout/PageWrapper'
import Skeleton from '../components/ui/Skeleton'
import AvanikoLogo from '../components/ui/AvanikoLogo'
import { formatNumber, formatCost } from '../utils/formatters'
import { ROUTES } from '../constants/routes'

/* ── Horizontal bar row ── */
function BarRow({ label, value, max, color = '#6366F1' }) {
  const pct = max > 0 ? Math.min((value / max) * 100, 100) : 0
  return (
    <div className="py-3 border-b border-border last:border-0">
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs text-text-secondary">{label}</span>
        <span className="text-xs font-semibold text-text-primary tabular-nums">
          {typeof value === 'number' ? formatNumber(value) : value}
        </span>
      </div>
      <div className="h-1.5 bg-surface rounded-full overflow-hidden">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.8, ease: [0.4, 0, 0.2, 1] }}
          className="h-full rounded-full"
          style={{ background: color }}
        />
      </div>
    </div>
  )
}

/* ── Icons ── */
const IconRequests = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>
  </svg>
)
const IconTokens = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="M2 17l10 5 10-5"/><path d="M2 12l10 5 10-5"/>
  </svg>
)
const IconCost = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
    <line x1="12" y1="1" x2="12" y2="23"/>
    <path d="M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6"/>
  </svg>
)
const IconKey = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="7.5" cy="15.5" r="5.5"/>
    <path d="m21 2-9.6 9.6M15.5 7.5l3 3L22 7l-3-3"/>
  </svg>
)
const IconCalendar = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
    <line x1="16" y1="2" x2="16" y2="6"/>
    <line x1="8" y1="2" x2="8" y2="6"/>
    <line x1="3" y1="10" x2="21" y2="10"/>
  </svg>
)
const IconRefresh = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="23 4 23 10 17 10"/>
    <path d="M20.49 15a9 9 0 11-2.12-9.36L23 10"/>
  </svg>
)
const IconPlus = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <line x1="12" y1="5" x2="12" y2="19"/>
    <line x1="5" y1="12" x2="19" y2="12"/>
  </svg>
)

/* ── Skeleton loading screen ── */
function DashboardSkeleton() {
  return (
    <PageWrapper>
      <div className="flex items-start justify-between mb-7">
        <div>
          <Skeleton className="h-7 w-52 mb-2" />
          <Skeleton className="h-4 w-36" />
        </div>
        <div className="flex gap-2">
          <Skeleton className="h-8 w-20 rounded-lg" />
          <Skeleton className="h-8 w-20 rounded-lg" />
        </div>
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {[...Array(4)].map((_, i) => (
          <Skeleton.Card key={i} className="p-5">
            <div className="flex items-start justify-between mb-4">
              <Skeleton className="h-3 w-20" />
              <Skeleton className="h-10 w-10 rounded-xl" />
            </div>
            <Skeleton className="h-7 w-24 mb-2" />
            <Skeleton className="h-4 w-14 rounded-full" />
          </Skeleton.Card>
        ))}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Skeleton.Card className="lg:col-span-2 p-5">
          <Skeleton className="h-5 w-36 mb-1" />
          <Skeleton className="h-3 w-24 mb-6" />
          <Skeleton className="h-[150px] w-full rounded-lg" />
        </Skeleton.Card>
        <Skeleton.Card className="p-5">
          <Skeleton className="h-5 w-28 mb-5" />
          {[...Array(4)].map((_, i) => (
            <div key={i} className="py-3 border-b border-border last:border-0">
              <div className="flex justify-between mb-2">
                <Skeleton className="h-3 w-24" />
                <Skeleton className="h-3 w-10" />
              </div>
              <Skeleton className="h-1.5 w-full rounded-full" />
            </div>
          ))}
        </Skeleton.Card>
      </div>
    </PageWrapper>
  )
}

export default function Dashboard() {
  const { user }              = useAuth()
  const [stats, setStats]     = useState(null)
  const [loading, setLoading] = useState(true)

  const loadStats = useCallback(() => {
    setLoading(true)
    authApi.myStats()
      .then(data => setStats(data))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => { loadStats() }, [loadStats])

  if (loading) return <DashboardSkeleton />

  const totalReqs   = stats?.total_requests    ?? 0
  const totalTokens = stats?.total_tokens      ?? 0
  const totalCost   = stats?.total_cost        ?? 0
  const activeKeys  = stats?.active_keys       ?? 0
  const promptTok   = stats?.prompt_tokens     ?? 0
  const completeTok = stats?.completion_tokens ?? 0
  const successRate = stats?.success_rate      ?? 100
  const chartData   = stats?.daily_requests    || [0, 0, 0, 0, 0, 0, totalReqs]

  const today = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })

  return (
    <PageWrapper>

      {/* ── Header ── */}
      <div className="flex items-start justify-between mb-7">
        <div>
          <h2 className="text-2xl font-bold text-text-primary tracking-tight">Dashboard</h2>
          <p className="text-sm text-text-muted mt-1 flex items-center gap-1.5">
            <IconCalendar />
            {today}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            to={ROUTES.KEYS}
            className="hidden sm:flex items-center gap-1.5 h-8 px-3 rounded-lg text-xs font-medium border border-border text-text-secondary bg-surface hover:bg-surface-hover hover:text-text-primary transition-colors"
          >
            <IconPlus />
            New Key
          </Link>
          <button
            onClick={loadStats}
            className="flex items-center gap-1.5 h-8 px-3 rounded-lg text-xs font-semibold text-white transition-opacity hover:opacity-90"
            style={{ background: 'linear-gradient(135deg, #6366F1, #8B5CF6)' }}
          >
            <IconRefresh />
            Refresh
          </button>
        </div>
      </div>

      {/* ── Stat cards ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard
          title="Total Requests"
          value={formatNumber(totalReqs)}
          icon={<IconRequests />}
          iconGradient="from-indigo-500 to-violet-600"
          trend={totalReqs > 0 ? 12.5 : null}
          sparkline={chartData}
        />
        <StatCard
          title="Total Tokens"
          value={formatNumber(totalTokens)}
          icon={<IconTokens />}
          iconGradient="from-violet-500 to-purple-700"
          trend={totalTokens > 0 ? 8.2 : null}
        />
        <StatCard
          title="Total Cost"
          value={formatCost(totalCost)}
          icon={<IconCost />}
          iconGradient="from-amber-500 to-orange-600"
          iconColor="#F59E0B"
          trend={totalCost > 0 ? -3.1 : null}
        />
        <StatCard
          title="Active Keys"
          value={activeKeys}
          icon={<IconKey />}
          iconGradient="from-emerald-500 to-teal-600"
          iconColor="#10B981"
        />
      </div>

      {/* ── Charts row ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">

        {/* Area chart — 2/3 */}
        <Card className="lg:col-span-2" padding={false}>
          <div className="flex items-start justify-between px-5 pt-5 pb-4 border-b border-border">
            <div>
              <p className="text-sm font-semibold text-text-primary">Request Activity</p>
              <p className="text-xs text-text-muted mt-0.5">Daily requests · last 7 days</p>
            </div>
            <div className="text-right">
              <p className="text-2xl font-bold text-text-primary tabular-nums">{formatNumber(totalReqs)}</p>
              {totalReqs > 0 && (
                <span className="inline-flex items-center gap-0.5 text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-status-success-bg text-status-success mt-0.5">
                  ↑ 12.5%
                </span>
              )}
            </div>
          </div>
          <div className="px-5 pt-4 pb-2">
            <AreaChart data={chartData} color="#6366F1" height={150} id="requests" />
            <div className="flex justify-between mt-2">
              {['7d', '6d', '5d', '4d', '3d', '2d', 'Today'].map(d => (
                <span key={d} className="text-[10px] text-text-muted">{d}</span>
              ))}
            </div>
          </div>
        </Card>

        {/* Usage breakdown — 1/3 */}
        <Card padding={false}>
          <div className="px-5 pt-5 pb-4 border-b border-border">
            <p className="text-sm font-semibold text-text-primary">Usage Breakdown</p>
            <p className="text-xs text-text-muted mt-0.5">Current period</p>
          </div>
          <div className="px-5 py-1">
            <BarRow label="API Requests"      value={totalReqs}   max={10000}                    color="#6366F1" />
            <BarRow label="Prompt Tokens"      value={promptTok}   max={Math.max(totalTokens, 1)} color="#8B5CF6" />
            <BarRow label="Completion Tokens"  value={completeTok} max={Math.max(totalTokens, 1)} color="#10B981" />
            <BarRow label="Success Rate"       value={successRate} max={100}                      color="#22C55E" />
          </div>
        </Card>

      </div>

      {/* ── Quick-start banner (only when no usage) ── */}
      {totalReqs === 0 && (
        <motion.div
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <div
            className="card p-5 flex items-start gap-4"
            style={{ borderColor: 'rgba(99,102,241,0.28)', background: 'rgba(99,102,241,0.07)' }}
          >
            <AvanikoLogo size={40} delay={0.3} />
            <div className="flex-1">
              <p className="text-sm font-semibold text-text-primary mb-1">Get started with Avaniko AI</p>
              <p className="text-xs text-text-muted mb-3 max-w-sm">
                Create an API key and use it in your project to start making requests to the Qwen model.
              </p>
              <div className="flex items-center gap-4">
                <Link
                  to={ROUTES.KEYS}
                  className="text-xs font-semibold text-white px-3 py-1.5 rounded-lg transition-opacity hover:opacity-90"
                  style={{ background: 'linear-gradient(135deg, #6366F1, #8B5CF6)' }}
                >
                  Create API Key →
                </Link>
                <Link to={ROUTES.DOCS} className="text-xs text-text-muted hover:text-text-secondary transition-colors">
                  View Docs
                </Link>
              </div>
            </div>
          </div>
        </motion.div>
      )}

    </PageWrapper>
  )
}
