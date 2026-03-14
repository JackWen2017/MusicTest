/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './index.html',
    './src/**/*.{vue,js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
      colors: {
        theme: {
          bg: 'var(--bg-primary)',
          surface: 'var(--bg-surface)',
          accent: 'var(--accent-primary)',
          main: 'var(--text-main)',
          muted: 'var(--text-muted)',
          border: 'var(--border-color)',
        },
        dark: {
          950: '#06040f',
          900: '#0d0a1a',
          800: '#1a1530',
          700: '#251e42',
          600: '#312855',
        },
        accent: {
          purple: '#a855f7',
          violet: '#7c3aed',
          cyan: '#06b6d4',
          green: '#10b981',
          amber: '#f59e0b',
          red: '#ef4444',
        }
      },
      animation: {
        'pulse-fast': 'pulse 0.3s ease-out',
        'glow': 'glow 2s ease-in-out infinite',
        'spin-slow': 'spin 3s linear infinite',
      },
      keyframes: {
        glow: {
          '0%, 100%': { boxShadow: '0 0 10px rgba(168,85,247,0.4)' },
          '50%': { boxShadow: '0 0 25px rgba(168,85,247,0.8), 0 0 50px rgba(168,85,247,0.3)' },
        }
      },
      backdropBlur: {
        xs: '2px',
      }
    },
  },
  plugins: [],
}
