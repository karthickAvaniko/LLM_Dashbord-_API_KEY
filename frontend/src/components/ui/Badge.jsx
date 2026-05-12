const variants = {
  success: 'bg-status-success-bg text-status-success',
  danger:  'bg-status-danger-bg  text-status-danger',
  warning: 'bg-status-warning-bg text-status-warning',
  info:    'bg-status-info-bg    text-status-info',
  brand:   'bg-brand-muted       text-brand',
  neutral: 'bg-surface           text-text-secondary',
}

const dotColor = {
  success: 'bg-status-success',
  danger:  'bg-status-danger',
  warning: 'bg-status-warning',
  info:    'bg-status-info',
  brand:   'bg-brand',
  neutral: 'bg-text-muted',
}

export default function Badge({ children, variant = 'neutral', dot = false, className = '' }) {
  return (
    <span className={`
      inline-flex items-center gap-1 px-1.5 py-0.5
      text-[10px] font-semibold rounded-md tracking-wide
      ${variants[variant] ?? variants.neutral}
      ${className}
    `}>
      {dot && <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${dotColor[variant] ?? dotColor.neutral}`} />}
      {children}
    </span>
  )
}
