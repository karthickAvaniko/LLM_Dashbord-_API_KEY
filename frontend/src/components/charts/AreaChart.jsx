import { motion } from 'framer-motion'

export default function AreaChart({ data = [], color = '#6366F1', height = 160, id = 'chart' }) {
  if (!data || data.length === 0) {
    return (
      <div className="flex items-center justify-center text-text-muted text-sm" style={{ height }}>
        No data available
      </div>
    )
  }

  const max = Math.max(...data, 1)
  const w = 1000

  let pathD = `M 0,${height}`
  for (let i = 0; i < data.length; i++) {
    const x = (i / (data.length - 1)) * w || 0
    const y = Math.max(8, height - (data[i] / max) * (height * 0.85))
    if (i === 0) {
      pathD += ` L ${x},${y}`
    } else {
      const prevX = ((i - 1) / (data.length - 1)) * w
      const prevY = Math.max(8, height - (data[i - 1] / max) * (height * 0.85))
      const cpX = prevX + (x - prevX) / 2
      pathD += ` C ${cpX},${prevY} ${cpX},${y} ${x},${y}`
    }
  }
  const fillPath = `${pathD} L ${w},${height} Z`

  return (
    <div className="relative w-full" style={{ height }}>
      {/* Grid lines — uses CSS variable so they work in both light and dark */}
      <div className="absolute inset-0 flex flex-col justify-between pointer-events-none">
        {[0, 1, 2, 3].map(i => (
          <div key={i} className="border-t" style={{ borderColor: 'var(--color-border)' }} />
        ))}
      </div>

      <svg
        width="100%"
        height="100%"
        viewBox={`0 0 ${w} ${height}`}
        preserveAspectRatio="none"
        className="relative z-10 overflow-visible"
      >
        <defs>
          <linearGradient id={`grad-${id}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity={0.4} />
            <stop offset="100%" stopColor={color} stopOpacity={0} />
          </linearGradient>
        </defs>
        <motion.path
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.8 }}
          d={fillPath}
          fill={`url(#grad-${id})`}
        />
        <motion.path
          initial={{ pathLength: 0, opacity: 0 }}
          animate={{ pathLength: 1, opacity: 1 }}
          transition={{ duration: 1.5, ease: 'easeInOut' }}
          d={pathD}
          fill="none"
          stroke={color}
          strokeWidth="2.5"
          style={{ filter: `drop-shadow(0 4px 8px ${color})` }}
        />
      </svg>
    </div>
  )
}
