import { createContext, useContext, useState, useCallback } from 'react'
import ToastContainer from '../components/ui/Toast'

const ToastContext = createContext(null)

let toastId = 0

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([])

  const addToast = useCallback((message, type = 'info') => {
    const id = ++toastId
    setToasts(prev => [...prev, { id, message, type }])
  }, [])

  const removeToast = useCallback((id) => {
    setToasts(prev => prev.filter(t => t.id !== id))
  }, [])

  return (
    <ToastContext.Provider value={{ addToast }}>
      {children}
      <ToastContainer toasts={toasts} removeToast={removeToast} />
    </ToastContext.Provider>
  )
}

export function useToast() {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error('useToast must be used within ToastProvider')

  return {
    toast: ctx.addToast,
    success: (msg) => ctx.addToast(msg, 'success'),
    error: (msg) => ctx.addToast(msg, 'danger'),
    warning: (msg) => ctx.addToast(msg, 'warning'),
    info: (msg) => ctx.addToast(msg, 'info'),
  }
}
