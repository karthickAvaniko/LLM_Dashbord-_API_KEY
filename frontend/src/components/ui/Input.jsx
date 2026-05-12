import { forwardRef } from 'react'

const Input = forwardRef(({
  label,
  error,
  hint,
  icon,
  iconRight,
  className = '',
  containerClass = '',
  type = 'text',
  ...props
}, ref) => {
  return (
    <div className={`flex flex-col gap-1.5 ${containerClass}`}>
      {label && (
        <label className="text-xs font-medium text-text-secondary">{label}</label>
      )}
      <div className="relative">
        {icon && (
          <div className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted pointer-events-none">
            {icon}
          </div>
        )}
        <input
          ref={ref}
          type={type}
          className={`
            w-full h-9 rounded-btn bg-bg border px-3 text-sm
            text-text-primary placeholder:text-text-muted
            transition-colors duration-150 outline-none
            ${error
              ? 'border-status-danger/50 focus:border-status-danger/70 focus:ring-2 focus:ring-status-danger/10'
              : 'border-border focus:border-border-strong focus:ring-2 focus:ring-white/5'
            }
            ${icon ? 'pl-9' : ''}
            ${iconRight ? 'pr-9' : ''}
            ${className}
          `}
          {...props}
        />
        {iconRight && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted">
            {iconRight}
          </div>
        )}
      </div>
      {error && <p className="text-[11px] text-status-danger">{error}</p>}
      {hint && !error && <p className="text-[11px] text-text-muted">{hint}</p>}
    </div>
  )
})

Input.displayName = 'Input'
export default Input
