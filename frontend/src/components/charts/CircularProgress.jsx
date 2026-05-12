import { motion } from 'framer-motion'

export default function CircularProgress({ value = 0, label, color = '#6366F1', size = 88 }) {
  const r = (size / 2) - 8
  const circ = 2 * Math.PI * r
  const offset = circ - (Math.min(value, 100) / 100) * circ

  return (
    <div className="flex flex-col items-center gap-2">
      <div className="relative flex items-center justify-center" style={{ width: size, height: size }}>
        <svg
          width={size}
          height={size}
          className="absolute inset-0"
          style={{ transform: 'rotate(-90deg)' }}
        >
          <circle
            cx={size / 2}
            cy={size / 2}
            r={r}
            fill="none"
            stroke="var(--color-border)"
            strokeWidth="8"
          />
          <motion.circle
            cx={size / 2}
            cy={size / 2}
            r={r}
            fill="none"
            stroke={color}
            strokeWidth="8"
            strokeDasharray={circ}
            initial={{ strokeDashoffset: circ }}
            animate={{ strokeDashoffset: offset }}
            transition={{ duration: 1.2, ease: 'easeOut' }}
            strokeLinecap="round"
            style={{ filter: `drop-shadow(0 0 6px ${color})` }}
          />
        </svg>
        <span className="text-lg font-bold text-text-primary z-10">{value}%</span>
      </div>
      {label && (
        <p className="text-2xs font-semibold text-text-muted uppercase tracking-wider text-center">{label}</p>
      )}
    </div>
  )
}
