/* Mini 7-point sparkline SVG */
function MiniSparkline({ data = [], color = '#6366F1' }) {
  if (!data || data.length < 2) return null
  const max = Math.max(...data, 1)
  const W = 56, H = 22
  const pts = data.map((v, i) => {
    const x = (i / (data.length - 1)) * W
    const y = H - Math.max(2, (v / max) * (H - 4))
    return `${x.toFixed(1)},${y.toFixed(1)}`
  }).join(' ')

  return (
    <svg width={W} height={H} className="overflow-visible opacity-80">
      <polyline
        points={pts}
        fill="none"
        stroke={color}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        style={{ filter: `drop-shadow(0 2px 4px ${color}80)` }}
      />
      {/* Tiny dot at the last point */}
      {(() => {
        const last = data[data.length - 1]
        const x = W
        const y = H - Math.max(2, (last / max) * (H - 4))
        return <circle cx={x} cy={y} r="2.5" fill={color} />
      })()}
    </svg>
  )
}

/**
 * Master-X style stat card.
 *
 * Props:
 *   title        — metric label
 *   value        — formatted value string
 *   prefix       — e.g. "$"
 *   suffix       — e.g. "%"
 *   icon         — SVG element
 *   iconGradient — Tailwind gradient class, e.g. "from-indigo-500 to-violet-600"
 *   iconColor    — hex for sparkline (auto-derived from gradient if omitted)
 *   trend        — number (+ = up, - = down), null to hide
 *   sparkline    — number[] (7 data points)
 */
export default function StatCard({
  title,
  value,
  prefix = '',
  suffix = '',
  icon,
  iconGradient = 'from-indigo-500 to-violet-600',
  iconColor,
  trend,
  sparkline,
}) {
  const trendUp = trend != null && trend >= 0

  // Derive sparkline color from gradient string
  const sparkColor = iconColor
    ?? (iconGradient.includes('amber') || iconGradient.includes('orange') ? '#F59E0B'
      : iconGradient.includes('emerald') || iconGradient.includes('teal') ? '#10B981'
      : iconGradient.includes('rose') || iconGradient.includes('red') ? '#F87171'
      : '#6366F1')

  return (
    <div className="card p-5 flex flex-col gap-3 hover:border-border-strong transition-colors duration-150 cursor-default">
      {/* Top row: label + gradient icon */}
      <div className="flex items-start justify-between">
        <p className="text-xs font-medium text-text-muted leading-tight pr-2">{title}</p>
        {icon && (
          <div
            className={`w-10 h-10 rounded-xl flex items-center justify-center text-white shrink-0 bg-gradient-to-br ${iconGradient}`}
            style={{ boxShadow: `0 4px 14px ${sparkColor}40` }}
          >
            {icon}
          </div>
        )}
      </div>

      {/* Value + trend pill */}
      <div>
        <div className="flex items-baseline gap-1">
          {prefix && <span className="text-sm text-text-muted">{prefix}</span>}
          <span className="text-2xl font-bold text-text-primary tracking-tight tabular-nums">{value}</span>
          {suffix && <span className="text-sm text-text-muted ml-0.5">{suffix}</span>}
        </div>
        {trend != null && (
          <span
            className={`inline-flex items-center gap-0.5 mt-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold ${
              trendUp
                ? 'bg-status-success-bg text-status-success'
                : 'bg-status-danger-bg text-status-danger'
            }`}
          >
            {trendUp ? '↑' : '↓'} {Math.abs(trend)}%
          </span>
        )}
      </div>

      {/* Sparkline */}
      {sparkline && sparkline.length >= 2 && (
        <div className="flex justify-end mt-auto pt-1">
          <MiniSparkline data={sparkline} color={sparkColor} />
        </div>
      )}
    </div>
  )
}
