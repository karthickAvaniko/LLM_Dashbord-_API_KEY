const sizes = {
  xs: 'w-3 h-3 border',
  sm: 'w-4 h-4 border-2',
  md: 'w-6 h-6 border-2',
  lg: 'w-8 h-8 border-2',
  xl: 'w-12 h-12 border-[3px]',
}

export default function Spinner({ size = 'md', className = '' }) {
  return (
    <div
      className={`
        rounded-full border-border-strong border-t-brand animate-spin
        ${sizes[size] ?? sizes.md}
        ${className}
      `}
      role="status"
      aria-label="Loading"
    />
  )
}
