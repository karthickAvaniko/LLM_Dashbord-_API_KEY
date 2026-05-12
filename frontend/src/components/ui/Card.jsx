export default function Card({ children, className = '', hover = false, padding = true, ...props }) {
  return (
    <div
      className={`
        card
        ${padding ? 'p-5' : ''}
        ${hover ? 'transition-colors duration-150 hover:border-border-strong cursor-pointer' : ''}
        ${className}
      `}
      {...props}
    >
      {children}
    </div>
  )
}

export function CardHeader({ children, className = '' }) {
  return (
    <div className={`flex items-center justify-between mb-4 ${className}`}>
      {children}
    </div>
  )
}

export function CardTitle({ children, className = '' }) {
  return (
    <p className={`text-xs font-semibold text-text-muted uppercase tracking-widest ${className}`}>
      {children}
    </p>
  )
}
