import { useLocation } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { useTheme } from '../../context/ThemeContext'
import { ROUTES } from '../../constants/routes'

const PAGE_META = {
  [ROUTES.DASHBOARD]:  { title: 'Dashboard',      sub: 'Overview & quick stats' },
  [ROUTES.PLAYGROUND]: { title: 'Playground',     sub: 'Test AI models live' },
  [ROUTES.KEYS]:       { title: 'API Keys',       sub: 'Manage access tokens' },
  [ROUTES.ANALYTICS]:  { title: 'Analytics',      sub: 'Usage trends & insights' },
  [ROUTES.LIMITS]:     { title: 'Usage Limits',   sub: 'Rate & token controls' },
  [ROUTES.ACTIVITY]:   { title: 'Activity Log',   sub: 'Per-request audit trail' },
  [ROUTES.INTEGRATE]:  { title: 'Integrate',      sub: 'SDK & code snippets' },
  [ROUTES.DOCS]:       { title: 'Documentation',  sub: 'API reference' },
}

const IconSun = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="5"/>
    <line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/>
    <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/>
    <line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/>
    <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>
  </svg>
)
const IconMoon = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z"/>
  </svg>
)
const IconBell = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
    <path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9"/>
    <path d="M13.73 21a2 2 0 01-3.46 0"/>
  </svg>
)
const IconSearch = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
  </svg>
)
const IconMenu = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="3" y1="6"  x2="21" y2="6"/>
    <line x1="3" y1="12" x2="21" y2="12"/>
    <line x1="3" y1="18" x2="21" y2="18"/>
  </svg>
)

/* Reusable icon button */
function NavBtn({ onClick, title, dot, children }) {
  return (
    <button
      onClick={onClick}
      title={title}
      className="relative w-8 h-8 flex items-center justify-center rounded-lg transition-all text-text-muted hover:text-text-primary"
      style={{ background: 'var(--color-surface)' }}
      onMouseEnter={e => { e.currentTarget.style.background = 'var(--color-surface-hover)' }}
      onMouseLeave={e => { e.currentTarget.style.background = 'var(--color-surface)' }}
    >
      {children}
      {dot && (
        <span
          className="absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full"
          style={{ background: 'var(--color-brand)' }}
        />
      )}
    </button>
  )
}

export default function Navbar({ onMenuClick, onCmdClick }) {
  const { pathname }            = useLocation()
  const { user }                = useAuth()
  const { isDark, toggleTheme } = useTheme()

  const page     = PAGE_META[pathname] || { title: 'Avaniko AI', sub: '' }
  const initials = user?.name?.trim().split(/\s+/).map(w => w[0]).join('').toUpperCase().slice(0, 2) || 'U'

  return (
    <header
      className="h-14 shrink-0 flex items-center justify-between px-4 md:px-5 sticky top-0 z-10"
      style={{
        background:   'var(--color-bg-card)',
        borderBottom: '1px solid var(--color-border)',
        backdropFilter: 'blur(8px)',
      }}
    >
      {/* Left — hamburger (mobile) + breadcrumb */}
      <div className="flex items-center gap-3">
        <button
          onClick={onMenuClick}
          className="md:hidden flex items-center justify-center w-8 h-8 rounded-lg text-text-muted hover:text-text-primary transition-colors"
          style={{ background: 'var(--color-surface)' }}
          aria-label="Toggle menu"
        >
          <IconMenu />
        </button>

        {/* Page title + sub */}
        <div className="hidden sm:block leading-none">
          <h1 className="text-sm font-semibold text-text-primary leading-tight">{page.title}</h1>
          {page.sub && (
            <p className="text-[10px] text-text-muted mt-0.5 leading-tight">{page.sub}</p>
          )}
        </div>
        {/* Mobile: just title */}
        <h1 className="sm:hidden text-sm font-semibold text-text-primary">{page.title}</h1>
      </div>

      {/* Right — search + actions + avatar */}
      <div className="flex items-center gap-1.5">

        {/* Search bar — desktop */}
        <button
          onClick={onCmdClick}
          className="hidden md:flex items-center gap-2 h-8 px-3 rounded-lg text-xs text-text-muted w-48 transition-all"
          style={{
            background:  'var(--color-surface)',
            border:      '1px solid var(--color-border)',
          }}
          onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--color-border-strong)' }}
          onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--color-border)' }}
        >
          <IconSearch />
          <span className="flex-1 text-left">Search…</span>
          <kbd
            className="text-[9px] px-1.5 py-0.5 rounded font-medium"
            style={{ background: 'var(--color-bg)', border: '1px solid var(--color-border)', color: 'var(--color-text-muted)' }}
          >
            ⌘K
          </kbd>
        </button>

        {/* Notification bell */}
        <NavBtn title="Notifications" dot>
          <IconBell />
        </NavBtn>

        {/* Theme toggle */}
        <NavBtn onClick={toggleTheme} title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}>
          {isDark ? <IconSun /> : <IconMoon />}
        </NavBtn>

        {/* Divider */}
        <div className="hidden sm:block w-px h-5 mx-0.5" style={{ background: 'var(--color-border)' }} />

        {/* User avatar */}
        <div
          className="relative flex items-center gap-2 pl-1 pr-2 py-1 rounded-lg cursor-pointer select-none transition-all"
          style={{ background: 'transparent' }}
          onMouseEnter={e => { e.currentTarget.style.background = 'var(--color-surface-hover)' }}
          onMouseLeave={e => { e.currentTarget.style.background = 'transparent' }}
          title={user?.email || user?.name || 'User'}
        >
          <div className="relative">
            <div
              className="w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold text-white shrink-0"
              style={{ background: 'linear-gradient(135deg, #6366F1, #8B5CF6)' }}
            >
              {initials}
            </div>
            <span
              className="absolute -bottom-0.5 -right-0.5 w-2 h-2 rounded-full border-2"
              style={{ background: 'var(--color-status-success)', borderColor: 'var(--color-bg-card)' }}
            />
          </div>
          <div className="hidden lg:block leading-none">
            <p className="text-xs font-medium text-text-primary leading-tight max-w-[90px] truncate">
              {user?.name || 'User'}
            </p>
            <p className="text-[10px] text-text-muted mt-0.5 leading-tight max-w-[90px] truncate">
              {user?.email || ''}
            </p>
          </div>
        </div>

      </div>
    </header>
  )
}
