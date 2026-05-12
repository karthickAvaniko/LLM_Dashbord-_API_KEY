import { NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { ROUTES } from '../../constants/routes'
import AvanikoLogo from '../ui/AvanikoLogo'

/* ── Icons ── */
const Ic = ({ d, d2 }) => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
    <path d={d}/>{d2 && <path d={d2}/>}
  </svg>
)

const Icons = {
  Dashboard:  () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/></svg>,
  Analytics:  () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/><line x1="2" y1="20" x2="22" y2="20"/></svg>,
  Activity:   () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>,
  Playground: () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><polygon points="5 3 19 12 5 21 5 3"/></svg>,
  Keys:       () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><circle cx="7.5" cy="15.5" r="5.5"/><path d="m21 2-9.6 9.6M15.5 7.5l3 3L22 7l-3-3"/></svg>,
  Limits:     () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>,
  Integrate:  () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/></svg>,
  Docs:       () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>,
  Logout:     () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>,
}

const NAV_SECTIONS = [
  {
    label: 'Platform',
    items: [
      { to: ROUTES.DASHBOARD,  label: 'Dashboard',    Icon: Icons.Dashboard },
      { to: ROUTES.ANALYTICS,  label: 'Analytics',    Icon: Icons.Analytics },
      { to: ROUTES.ACTIVITY,   label: 'Activity Log', Icon: Icons.Activity },
      { to: ROUTES.PLAYGROUND, label: 'Playground',   Icon: Icons.Playground },
    ],
  },
  {
    label: 'API Management',
    items: [
      { to: ROUTES.KEYS,      label: 'API Keys',      Icon: Icons.Keys },
      { to: ROUTES.LIMITS,    label: 'Usage Limits',  Icon: Icons.Limits },
      { to: ROUTES.INTEGRATE, label: 'Integrate',     Icon: Icons.Integrate },
    ],
  },
  {
    label: 'Resources',
    items: [
      { to: ROUTES.DOCS, label: 'Documentation', Icon: Icons.Docs },
    ],
  },
]

export default function Sidebar({ onClose }) {
  const { user, logout, isAdmin } = useAuth()
  const navigate = useNavigate()

  const initials = user?.name
    ? user.name.trim().split(/\s+/).map(w => w[0]).join('').toUpperCase().slice(0, 2)
    : 'U'

  function handleLogout() {
    logout()
    navigate(ROUTES.LOGIN)
    onClose?.()
  }

  return (
    <aside
      className="w-[230px] shrink-0 h-screen flex flex-col overflow-hidden"
      style={{
        background:  'var(--color-sidebar-bg)',
        borderRight: '1px solid var(--color-sidebar-border)',
        boxShadow:   '2px 0 16px rgba(0,0,0,0.06)',
      }}
    >
      {/* ── Logo ── */}
      <div
        className="h-16 px-4 flex items-center gap-3 shrink-0"
        style={{ borderBottom: '1px solid var(--color-sidebar-border)' }}
      >
        {/* Logo — no border wrapper, no spin, static */}
        <AvanikoLogo size={34} delay={0} glow={false} spin={false} />
        <div className="leading-none min-w-0">
          <p className="text-sm font-bold tracking-tight truncate" style={{ color: 'var(--color-text-primary)' }}>
            Avaniko AI
          </p>
          <p className="text-[10px] mt-0.5 font-medium" style={{ color: 'var(--color-sidebar-text)' }}>
            API Gateway
          </p>
        </div>
        {onClose && (
          <button
            onClick={onClose}
            className="ml-auto w-7 h-7 flex items-center justify-center rounded-lg transition-colors shrink-0"
            style={{ color: 'var(--color-sidebar-text)' }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        )}
      </div>

      {/* ── Nav ── */}
      <nav className="flex-1 px-3 py-4 flex flex-col gap-5 overflow-y-auto no-scrollbar">
        {NAV_SECTIONS.map(section => (
          <div key={section.label}>
            <p
              className="px-2 pb-1.5 text-[10px] font-semibold tracking-[0.08em] uppercase select-none"
              style={{ color: 'var(--color-sidebar-muted)' }}
            >
              {section.label}
            </p>
            <div className="flex flex-col gap-0.5">
              {section.items.map(({ to, label, Icon }) => (
                <NavLink
                  key={to}
                  to={to}
                  onClick={onClose}
                  className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`}
                >
                  <span className="shrink-0"><Icon /></span>
                  <span>{label}</span>
                </NavLink>
              ))}
            </div>
          </div>
        ))}

        {/* ── Status chip ── */}
        <div
          className="mt-auto rounded-xl p-3"
          style={{
            background: 'var(--color-brand-muted)',
            border:     '1px solid var(--color-brand-border)',
          }}
        >
          <div className="flex items-center gap-2 mb-2">
            <span
              className="w-2 h-2 rounded-full shrink-0"
              style={{ background: 'var(--color-status-success)', boxShadow: '0 0 6px var(--color-status-success)' }}
            />
            <span className="text-[11px] font-semibold" style={{ color: 'var(--color-text-primary)' }}>
              All systems online
            </span>
          </div>
          <div className="flex gap-1.5 flex-wrap">
            {[
              { label: 'Vision',  color: '#60A5FA' },
              { label: 'Stream',  color: '#4ADE80' },
              { label: 'JSON',    color: '#818CF8' },
            ].map(({ label, color }) => (
              <span
                key={label}
                className="text-[9px] font-bold px-1.5 py-0.5 rounded"
                style={{ color, background: `${color}18`, border: `1px solid ${color}28` }}
              >
                {label}
              </span>
            ))}
          </div>
        </div>
      </nav>

      {/* ── User footer ── */}
      <div
        className="px-3 py-3 shrink-0"
        style={{ borderTop: '1px solid var(--color-sidebar-border)' }}
      >
        {isAdmin && (
          <div className="mb-2 px-2">
            <span
              className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full"
              style={{
                color:      '#6366F1',
                background: 'rgba(99,102,241,0.10)',
                border:     '1px solid rgba(99,102,241,0.22)',
              }}
            >
              <span className="w-1.5 h-1.5 rounded-full inline-block bg-brand" />
              Admin
            </span>
          </div>
        )}

        {/* User card */}
        <div
          className="flex items-center gap-2.5 px-2 py-2 rounded-xl mb-1"
          style={{ background: 'var(--color-surface)' }}
        >
          <div
            className="w-8 h-8 rounded-full flex items-center justify-center text-[11px] font-bold text-white shrink-0"
            style={{ background: 'linear-gradient(135deg, #6366F1, #8B5CF6)' }}
          >
            {initials}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold truncate leading-none" style={{ color: 'var(--color-text-primary)' }}>
              {user?.name || 'User'}
            </p>
            <p className="text-[10px] truncate mt-0.5" style={{ color: 'var(--color-sidebar-text)' }}>
              {user?.email || ''}
            </p>
          </div>
          <button
            onClick={handleLogout}
            title="Sign out"
            className="shrink-0 w-7 h-7 flex items-center justify-center rounded-lg transition-all"
            style={{ color: 'var(--color-sidebar-text)' }}
            onMouseEnter={e => { e.currentTarget.style.color = 'var(--color-status-danger)'; e.currentTarget.style.background = 'var(--color-status-danger-bg)' }}
            onMouseLeave={e => { e.currentTarget.style.color = 'var(--color-sidebar-text)'; e.currentTarget.style.background = 'transparent' }}
          >
            <Icons.Logout />
          </button>
        </div>

        <p className="text-center text-[9px] mt-1" style={{ color: 'var(--color-sidebar-muted)' }}>
          © {new Date().getFullYear()} Avaniko Technologies
        </p>
      </div>
    </aside>
  )
}
