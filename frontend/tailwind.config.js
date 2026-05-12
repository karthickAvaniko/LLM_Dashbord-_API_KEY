/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',   // toggled via .dark on <html> by ThemeContext
  theme: {
    extend: {
      colors: {
        brand: {
          DEFAULT: 'var(--color-brand)',
          light:   'var(--color-brand-light)',
          dark:    'var(--color-brand-dark)',
          muted:   'var(--color-brand-muted)',
          border:  'var(--color-brand-border)',
        },
        bg: {
          DEFAULT:  'var(--color-bg)',
          main:     'var(--color-bg)',          // backward-compat
          card:     'var(--color-bg-card)',
          elevated: 'var(--color-bg-elevated)',
          raised:   'var(--color-bg-raised)',
          hover:    'var(--color-bg-hover)',
          input:    'var(--color-bg-input)',
          overlay:  'rgba(0,0,0,0.72)',
          sidebar:  'var(--color-sidebar-bg)',
        },
        surface: {
          DEFAULT: 'var(--color-surface)',
          hover:   'var(--color-surface-hover)',
          active:  'var(--color-surface-active)',
          brand:   'var(--color-brand-muted)',
        },
        border: {
          DEFAULT: 'var(--color-border)',
          strong:  'var(--color-border-strong)',
          brand:   'var(--color-brand-border)',
          sidebar: 'var(--color-sidebar-border)',
        },
        text: {
          primary:   'var(--color-text-primary)',
          secondary: 'var(--color-text-secondary)',
          muted:     'var(--color-text-muted)',
          brand:     'var(--color-brand)',
          sidebar:   'var(--color-sidebar-text)',
        },
        status: {
          success:      'var(--color-status-success)',
          'success-bg': 'var(--color-status-success-bg)',
          danger:       'var(--color-status-danger)',
          'danger-bg':  'var(--color-status-danger-bg)',
          warning:      'var(--color-status-warning)',
          'warning-bg': 'var(--color-status-warning-bg)',
          info:         'var(--color-status-info)',
          'info-bg':    'var(--color-status-info-bg)',
        },
      },
      fontFamily: {
        sans: ['Inter', '-apple-system', 'BlinkMacSystemFont', 'sans-serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'Consolas', 'monospace'],
      },
      fontSize: {
        '2xs': ['0.65rem', { lineHeight: '1rem' }],
      },
      borderRadius: {
        card: '14px',
        btn:  '8px',
        tag:  '5px',
      },
      boxShadow: {
        card:      '0 1px 4px rgba(0,0,0,0.12), 0 1px 2px rgba(0,0,0,0.08)',
        'card-md': '0 4px 20px rgba(0,0,0,0.14)',
        brand:     '0 0 20px rgba(99,102,241,0.30)',
        'brand-sm':'0 0 10px rgba(99,102,241,0.22)',
        modal:     '0 20px 60px rgba(0,0,0,0.50)',
        inner:     'inset 0 1px 0 rgba(255,255,255,0.06)',
        sidebar:   '4px 0 24px rgba(0,0,0,0.30)',
      },
      animation: {
        'fade-in':   'fadeIn 0.2s ease-out',
        'slide-up':  'slideUp 0.25s cubic-bezier(0,0,0.2,1)',
        'pulse-dot': 'pulseDot 2s ease-in-out infinite',
        shimmer:     'shimmer 1.4s infinite',
      },
      keyframes: {
        fadeIn: {
          '0%':   { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%':   { opacity: '0', transform: 'translateY(10px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        pulseDot: {
          '0%, 100%': { opacity: '1', transform: 'scale(1)' },
          '50%':      { opacity: '0.5', transform: 'scale(0.85)' },
        },
        shimmer: {
          '0%':   { transform: 'translateX(-100%)' },
          '100%': { transform: 'translateX(100%)' },
        },
      },
      transitionTimingFunction: {
        smooth: 'cubic-bezier(0.4,0,0.2,1)',
      },
    },
  },
  plugins: [],
}
