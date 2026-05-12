import { useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

const CONFIG = {
  success: { icon: '✓', cls: 'bg-bg-card border-status-success/25 text-status-success' },
  danger:  { icon: '✕', cls: 'bg-bg-card border-status-danger/25  text-status-danger'  },
  warning: { icon: '!', cls: 'bg-bg-card border-status-warning/25 text-status-warning' },
  info:    { icon: 'i', cls: 'bg-bg-card border-status-info/25    text-status-info'    },
}

function ToastItem({ id, message, type = 'info', onRemove }) {
  useEffect(() => {
    const t = setTimeout(() => onRemove(id), 4000)
    return () => clearTimeout(t)
  }, [id, onRemove])

  const { icon, cls } = CONFIG[type] ?? CONFIG.info

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: -8, scale: 0.96 }}
      animate={{ opacity: 1, y: 0,  scale: 1    }}
      exit={{    opacity: 0, y: -8, scale: 0.96 }}
      transition={{ duration: 0.18, ease: 'easeOut' }}
      className={`flex items-start gap-3 pl-3 pr-4 py-3 rounded-lg border shadow-modal max-w-[320px] w-full ${cls}`}
    >
      <span className="w-5 h-5 rounded flex items-center justify-center text-[11px] font-bold border border-current/30 shrink-0 mt-0.5">
        {icon}
      </span>
      <p className="text-sm text-text-primary flex-1 leading-snug">{message}</p>
      <button
        onClick={() => onRemove(id)}
        className="shrink-0 text-text-muted hover:text-text-primary transition-colors mt-0.5"
      >
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
          <path d="M18 6L6 18M6 6l12 12"/>
        </svg>
      </button>
    </motion.div>
  )
}

export default function ToastContainer({ toasts, removeToast }) {
  return (
    <div className="fixed top-4 right-4 z-[200] flex flex-col gap-2 pointer-events-none">
      <AnimatePresence mode="popLayout">
        {toasts.map(t => (
          <div key={t.id} className="pointer-events-auto">
            <ToastItem {...t} onRemove={removeToast} />
          </div>
        ))}
      </AnimatePresence>
    </div>
  )
}
