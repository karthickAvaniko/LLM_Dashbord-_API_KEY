/**
 * Shimmer skeleton for loading states.
 * Usage:
 *   <Skeleton className="h-8 w-48" />          — simple bar
 *   <Skeleton.Card>…children…</Skeleton.Card>   — card wrapper
 */

const shimmer = `
  relative overflow-hidden
  bg-surface rounded-lg
  before:absolute before:inset-0
  before:-translate-x-full
  before:animate-[shimmer_1.4s_infinite]
  before:bg-gradient-to-r
  before:from-transparent before:via-white/[0.05] before:to-transparent
`

// Inject the shimmer keyframe once via a style tag
if (typeof document !== 'undefined' && !document.getElementById('sk-shimmer-style')) {
  const s = document.createElement('style')
  s.id = 'sk-shimmer-style'
  s.textContent = `@keyframes shimmer { 100% { transform: translateX(100%); } }`
  document.head.appendChild(s)
}

export default function Skeleton({ className = '' }) {
  return <div className={`${shimmer} ${className}`} aria-hidden="true" />
}

Skeleton.Card = function SkeletonCard({ children, className = '' }) {
  return (
    <div className={`card p-5 ${className}`}>
      {children}
    </div>
  )
}

Skeleton.Row = function SkeletonRow({ className = '' }) {
  return (
    <div className={`flex items-center gap-3 ${className}`}>
      <Skeleton className="h-4 w-4 rounded-full shrink-0" />
      <Skeleton className="h-3 flex-1" />
    </div>
  )
}
