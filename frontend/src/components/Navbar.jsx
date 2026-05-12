import { NavLink } from 'react-router-dom'
import { motion } from 'framer-motion'

export default function Navbar() {
  return (
    <motion.nav
      initial={{ y: -80, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
      style={{
        position: 'sticky', top: 0, zIndex: 100,
        display: 'flex', alignItems: 'center',
        padding: '0 32px', height: 64,
        background: 'rgba(5,5,8,0.7)',
        backdropFilter: 'blur(20px)',
        borderBottom: '1px solid rgba(255,255,255,0.06)',
      }}
    >
      {/* Logo */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginRight: 40 }}>
        <div style={{
          width: 32, height: 32, borderRadius: 8,
          background: 'linear-gradient(135deg, #6366f1, #a78bfa)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: '0 0 20px rgba(99,102,241,0.5)',
          fontSize: 16, fontWeight: 700, color: '#fff',
        }}>
          AI
        </div>
        <span style={{ fontWeight: 600, fontSize: 16, color: '#f1f5f9', letterSpacing: '-0.3px' }}>
          Gateway
        </span>
        <span style={{
          fontSize: 10, fontWeight: 600, color: '#6366f1',
          background: 'rgba(99,102,241,0.15)', border: '1px solid rgba(99,102,241,0.3)',
          padding: '2px 6px', borderRadius: 4, letterSpacing: 0.5, textTransform: 'uppercase',
        }}>
          Beta
        </span>
      </div>

      {/* Nav links */}
      <div style={{ display: 'flex', gap: 2, flex: 1 }}>
        {[
          ['/get-api-key', 'API Keys', '🔑'],
          ['/playground', 'Playground', '⚡'],
          ['/docs', 'Docs', '📖'],
        ].map(([to, label, icon]) => (
          <NavLink key={to} to={to}>
            {({ isActive }) => (
              <motion.button
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
                style={{
                  padding: '7px 16px', borderRadius: 8, fontSize: 14, fontWeight: 500,
                  border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6,
                  background: isActive ? 'rgba(99,102,241,0.15)' : 'transparent',
                  color: isActive ? '#818cf8' : '#94a3b8',
                  boxShadow: isActive ? 'inset 0 0 0 1px rgba(99,102,241,0.3)' : 'none',
                  transition: 'all 0.2s',
                }}
              >
                <span style={{ fontSize: 13 }}>{icon}</span>
                {label}
              </motion.button>
            )}
          </NavLink>
        ))}
      </div>

      {/* Model badge */}
      <div style={{
        fontSize: 12, color: '#64748b', fontFamily: 'JetBrains Mono, monospace',
        background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)',
        padding: '5px 12px', borderRadius: 6,
        display: 'flex', alignItems: 'center', gap: 6,
      }}>
        <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#10b981', boxShadow: '0 0 6px #10b981', display: 'inline-block' }} />
        Qwen3.6-35B-A3B
      </div>
    </motion.nav>
  )
}
