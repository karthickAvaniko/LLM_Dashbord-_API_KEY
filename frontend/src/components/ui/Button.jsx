import { forwardRef } from 'react'
import Spinner from './Spinner'

const variants = {
  primary:     'bg-brand text-[#09090B] font-semibold hover:bg-brand-light active:bg-brand-dark shadow-brand-sm',
  ghost:       'text-text-secondary border border-border hover:bg-surface-hover hover:text-text-primary',
  danger:      'text-status-danger border border-status-danger/25 hover:bg-status-danger-bg',
  outline:     'border border-border-strong text-text-secondary hover:bg-surface-hover hover:text-text-primary',
  brand_ghost: 'bg-brand-muted text-brand border border-brand-border hover:bg-brand/15',
}

const sizes = {
  sm: 'h-7 px-3 text-xs gap-1.5 rounded-md',
  md: 'h-9 px-4 text-sm gap-2   rounded-btn',
  lg: 'h-10 px-5 text-sm gap-2   rounded-btn',
  xl: 'h-11 px-6 text-sm gap-2.5 rounded-btn',
}

const Button = forwardRef(({
  children,
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled = false,
  icon,
  iconRight,
  className = '',
  ...props
}, ref) => {
  const isDisabled = disabled || loading
  return (
    <button
      ref={ref}
      disabled={isDisabled}
      className={`
        inline-flex items-center justify-center font-medium
        transition-all duration-150 cursor-pointer select-none
        disabled:opacity-40 disabled:cursor-not-allowed disabled:pointer-events-none
        ${variants[variant] ?? variants.primary}
        ${sizes[size] ?? sizes.md}
        ${className}
      `}
      {...props}
    >
      {loading
        ? <Spinner size="sm" />
        : icon
          ? <span className="shrink-0">{icon}</span>
          : null}
      {children}
      {iconRight && !loading && <span className="shrink-0">{iconRight}</span>}
    </button>
  )
})

Button.displayName = 'Button'
export default Button
