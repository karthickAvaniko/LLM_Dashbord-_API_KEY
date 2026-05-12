import { NavLink, useNavigate } from 'react-router-dom'

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:1111'

const NAV = [
  {
    to: '/get-api-key', label: 'API Keys',
    icon: (
      <svg width="15" height="15" fill="none" stroke="currentColor" strokeWidth="1.7" viewBox="0 0 24 24">
        <circle cx="7.5" cy="15.5" r="5.5"/><path d="m21 2-9.6 9.6M15.5 7.5l3 3L22 7l-3-3"/>
      </svg>
    ),
  },
  {
    to: '/playground', label: 'Playground',
    icon: (
      <svg width="15" height="15" fill="none" stroke="currentColor" strokeWidth="1.7" viewBox="0 0 24 24">
        <polygon points="5 3 19 12 5 21 5 3"/>
      </svg>
    ),
  },
  {
    to: '/integrate', label: 'Integrate',
    icon: (
      <svg width="15" height="15" fill="none" stroke="currentColor" strokeWidth="1.7" viewBox="0 0 24 24">
        <polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/>
      </svg>
    ),
  },
  {
    to: '/docs', label: 'Documentation',
    icon: (
      <svg width="15" height="15" fill="none" stroke="currentColor" strokeWidth="1.7" viewBox="0 0 24 24">
        <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/>
        <polyline points="14 2 14 8 20 8"/>
        <line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/>
      </svg>
    ),
  },
]

export default function Sidebar({ user }) {
  const navigate = useNavigate()

  async function handleLogout() {
    const auth = JSON.parse(localStorage.getItem('auth') || 'null')
    if (auth?.token) {
      try {
        await fetch(`${API_BASE}/auth/logout`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${auth.token}` },
        })
      } catch (_) {}
    }
    localStorage.removeItem('auth')
    navigate('/login', { replace: true })
  }

  const initials = user?.name
    ? user.name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()
    : '?'

  return (
    <aside style={{
      width: 220,
      minWidth: 220,
      height: '100vh',
      background: '#0A0A10',
      borderRight: '1px solid rgba(255,255,255,0.05)',
      display: 'flex',
      flexDirection: 'column',
      userSelect: 'none',
    }}>

      {/* ── Brand ── */}
      <div style={{ padding: '16px 14px 12px', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{
            width: 28, height: 28, borderRadius: 8,
            background: 'linear-gradient(135deg, #E8A828, #C88A1A)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            flexShrink: 0,
          }}>
            <img src="/avaniko-logo.png" alt="Avaniko" style={{ width: 20, height: 20, objectFit: 'contain' }} />
          </div>
          <div>
            <div style={{ fontSize: 13, fontWeight: 700, color: '#F0F0F8', letterSpacing: '-0.2px' }}>Avaniko AI</div>
            <div style={{ fontSize: 10, color: '#E8A828', fontWeight: 500, letterSpacing: '0.3px' }}>API Gateway</div>
          </div>
        </div>
      </div>

      {/* ── Nav ── */}
      <nav style={{ padding: '10px 8px', flex: 1 }}>
        <div style={{
          fontSize: 10, fontWeight: 600, color: '#303040',
          letterSpacing: '1px', textTransform: 'uppercase',
          padding: '6px 8px 6px',
        }}>
          Platform
        </div>

        {NAV.map(({ to, label, icon }) => (
          <NavLink key={to} to={to} style={{ display: 'block', marginBottom: 1 }}>
            {({ isActive }) => (
              <div style={{
                display: 'flex', alignItems: 'center', gap: 9,
                padding: '8px 10px', borderRadius: 7,
                fontSize: 13,
                fontWeight: isActive ? 500 : 400,
                color: isActive ? '#E8A828' : '#606070',
                background: isActive ? 'rgba(232,168,40,0.07)' : 'transparent',
                transition: 'all 0.12s',
                cursor: 'pointer',
              }}
                onMouseEnter={e => { if (!isActive) { e.currentTarget.style.background = 'rgba(255,255,255,0.035)'; e.currentTarget.style.color = '#B0B0C0' } }}
                onMouseLeave={e => { if (!isActive) { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#606070' } }}
              >
                <span style={{ opacity: isActive ? 1 : 0.45, flexShrink: 0 }}>{icon}</span>
                {label}
              </div>
            )}
          </NavLink>
        ))}

        {/* ── Status card ── */}
        <div style={{
          marginTop: 16,
          padding: '10px 12px',
          background: '#111118',
          border: '1px solid rgba(255,255,255,0.05)',
          borderRadius: 8,
        }}>
          <div style={{ fontSize: 10, fontWeight: 600, color: '#303040', textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: 8 }}>
            Service Status
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 6 }}>
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#4ADE80', flexShrink: 0, boxShadow: '0 0 6px #4ADE80' }} />
            <span style={{ fontSize: 12, fontWeight: 500, color: '#D0D0E0' }}>All systems operational</span>
          </div>
          <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
            {[
              { t: 'Vision',    c: '#60A5FA' },
              { t: 'Streaming', c: '#4ADE80' },
              { t: 'JSON',      c: '#E8A828' },
            ].map(({ t, c }) => (
              <span key={t} style={{
                fontSize: 10, fontWeight: 600, color: c,
                background: c + '14', border: `1px solid ${c}28`,
                padding: '2px 7px', borderRadius: 4,
              }}>{t}</span>
            ))}
          </div>
        </div>

        {/* ── Quotas ── */}
        <div style={{ marginTop: 6, padding: '10px 12px', background: '#111118', border: '1px solid rgba(255,255,255,0.04)', borderRadius: 8 }}>
          <div style={{ fontSize: 10, fontWeight: 600, color: '#303040', textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: 7 }}>Quotas</div>
          {[['Rate limit', '10 / min'], ['Daily limit', '200 / day']].map(([k, v]) => (
            <div key={k} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
              <span style={{ fontSize: 11, color: '#404050' }}>{k}</span>
              <span style={{ fontSize: 11, color: '#606070', fontFamily: 'JetBrains Mono, monospace' }}>{v}</span>
            </div>
          ))}
        </div>
      </nav>

      {/* ── User + Logout ── */}
      <div style={{ borderTop: '1px solid rgba(255,255,255,0.05)', padding: '12px 12px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 9, marginBottom: 10 }}>
          <div style={{
            width: 30, height: 30, borderRadius: '50%', flexShrink: 0,
            background: 'rgba(232,168,40,0.1)', border: '1px solid rgba(232,168,40,0.22)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 11, fontWeight: 700, color: '#E8A828',
          }}>
            {initials}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: '#D0D0E0', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {user?.name || 'User'}
            </div>
            <div style={{ fontSize: 10, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {user?.role === 'admin'
                ? <span style={{ color: '#E8A828', fontWeight: 600 }}>Admin</span>
                : <span style={{ color: '#404050' }}>{user?.email || ''}</span>
              }
            </div>
          </div>
        </div>

        <button
          onClick={handleLogout}
          style={{
            width: '100%', background: 'transparent',
            border: '1px solid rgba(255,255,255,0.07)',
            borderRadius: 6, padding: '6px 10px',
            fontSize: 11, color: '#505060', cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
            transition: 'all 0.12s', marginBottom: 10,
          }}
          onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(248,113,113,0.3)'; e.currentTarget.style.color = '#F87171' }}
          onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.07)'; e.currentTarget.style.color = '#505060' }}
        >
          <svg width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
            <polyline points="16 17 21 12 16 7"/>
            <line x1="21" y1="12" x2="9" y2="12"/>
          </svg>
          Sign out
        </button>

        <div style={{ display: 'flex', gap: 5, justifyContent: 'center', marginBottom: 6 }}>
          {[
            ['https://in.linkedin.com/company/avaniko-tech', 'Li', '#0A66C2'],
            ['https://www.instagram.com/avaniko_technologies/', 'Ig', '#E1306C'],
            ['https://x.com/Avaniko_tech', 'X', '#8080A0'],
            ['https://www.youtube.com/@avanikotechnologies704', 'Yt', '#FF0000'],
          ].map(([href, label, color]) => (
            <a key={label} href={href} target="_blank" rel="noreferrer" style={{
              width: 22, height: 22, borderRadius: 4,
              background: '#111118', border: '1px solid rgba(255,255,255,0.06)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 7, fontWeight: 700, color, textTransform: 'uppercase',
              transition: 'all 0.12s',
            }}>
              {label}
            </a>
          ))}
        </div>
        <div style={{ textAlign: 'center', fontSize: 9, color: '#252530' }}>© 2025 Avaniko Technologies</div>
      </div>
    </aside>
  )
}
