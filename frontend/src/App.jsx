import { useState, useEffect } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { ThemeProvider } from './context/ThemeContext'
import { AuthProvider, useAuth } from './context/AuthContext'
import { ToastProvider } from './context/ToastContext'
import Sidebar from './components/layout/Sidebar'
import Navbar from './components/layout/Navbar'
import CommandPalette from './components/ui/CommandPalette'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import GetKey from './pages/GetKey'
import Playground from './pages/Playground'
import Integrate from './pages/Integrate'
import Docs from './pages/Docs'
import Analytics from './pages/Analytics'
import Activity from './pages/Activity'
import Limits from './pages/Limits'
import { ROUTES } from './constants/routes'

function PrivateLayout() {
  const { isAuthenticated } = useAuth()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [cmdOpen,     setCmdOpen]     = useState(false)

  // Global Cmd+K / Ctrl+K listener
  useEffect(() => {
    const handler = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        setCmdOpen(s => !s)
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [])

  if (!isAuthenticated) return <Navigate to={ROUTES.LOGIN} replace />

  return (
    <div className="flex h-screen w-screen bg-bg overflow-hidden">
      {/* Desktop sidebar — always visible */}
      <div className="hidden md:block">
        <Sidebar />
      </div>

      {/* Mobile sidebar — drawer */}
      {sidebarOpen && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-40 bg-black/60 md:hidden"
            onClick={() => setSidebarOpen(false)}
          />
          {/* Drawer */}
          <div className="fixed inset-y-0 left-0 z-50 md:hidden">
            <Sidebar onClose={() => setSidebarOpen(false)} />
          </div>
        </>
      )}

      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <Navbar onMenuClick={() => setSidebarOpen(s => !s)} onCmdClick={() => setCmdOpen(true)} />
        <CommandPalette isOpen={cmdOpen} onClose={() => setCmdOpen(false)} />
        <Routes>
          <Route path={ROUTES.DASHBOARD} element={<Dashboard />} />
          <Route path={ROUTES.PLAYGROUND} element={<Playground />} />
          <Route path={ROUTES.KEYS}      element={<GetKey />} />
          <Route path={ROUTES.ANALYTICS} element={<Analytics />} />
          <Route path={ROUTES.ACTIVITY} element={<Activity />} />
          <Route path={ROUTES.LIMITS}    element={<Limits />} />
          <Route path="/get-api-key" element={<Navigate to={ROUTES.KEYS} replace />} />
          <Route path={ROUTES.INTEGRATE} element={<Integrate />} />
          <Route path={ROUTES.DOCS}      element={<Docs />} />
          <Route path="*" element={<Navigate to={ROUTES.DASHBOARD} replace />} />
        </Routes>
      </div>
    </div>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <ThemeProvider>
      <AuthProvider>
        <ToastProvider>
          <Routes>
            <Route path={ROUTES.LOGIN} element={<Login />} />
            <Route path="/*" element={<PrivateLayout />} />
          </Routes>
        </ToastProvider>
      </AuthProvider>
      </ThemeProvider>
    </BrowserRouter>
  )
}
