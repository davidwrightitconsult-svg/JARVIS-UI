/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // J.A.R.V.I.S. core palette — deep space blues with cyan accents
        jarvis: {
          bg:        "#050a14",   // main background
          panel:     "#0a1420",   // panel background
          border:    "#1a2f4a",   // panel borders
          gridline:  "#0f1f33",   // subtle grid lines
          cyan:      "#22d3ee",   // primary accent (bright cyan)
          cyanDim:   "#0891b2",   // dimmed cyan for hover states
          blue:      "#3b82f6",   // secondary accent
          green:     "#10b981",   // bullish / success
          red:       "#ef4444",   // bearish / error
          amber:     "#f59e0b",   // warning
          purple:    "#a855f7",   // learning / processing
          text:      "#e2e8f0",   // primary text
          textDim:   "#94a3b8",   // secondary text
          textMuted: "#475569",   // tertiary text
        },
      },
      fontFamily: {
        mono: ['"JetBrains Mono"', '"Fira Code"', 'Consolas', 'monospace'],
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
      },
      boxShadow: {
        'glow-cyan':  '0 0 12px rgba(34, 211, 238, 0.5), 0 0 4px rgba(34, 211, 238, 0.8)',
        'glow-sm':    '0 0 6px rgba(34, 211, 238, 0.4)',
        'glow-lg':    '0 0 24px rgba(34, 211, 238, 0.6), 0 0 8px rgba(34, 211, 238, 0.9)',
        'panel':      '0 0 0 1px rgba(26, 47, 74, 0.8), 0 4px 24px rgba(0, 0, 0, 0.5)',
      },
      animation: {
        'pulse-slow':  'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'pulse-fast':  'pulse 1.5s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'fade-in':     'fadeIn 0.4s ease-out',
      },
      keyframes: {
        fadeIn: {
          '0%':   { opacity: '0', transform: 'translateY(4px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
      },
    },
  },
  plugins: [],
}
