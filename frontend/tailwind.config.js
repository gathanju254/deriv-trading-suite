/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}"
  ],
  theme: {
    extend: {
      colors: {
        // Primary blue gradient
        primary: { 
          50: '#eff6ff', 
          100: '#dbeafe', 
          200: '#bfdbfe', 
          300: '#93c5fd', 
          400: '#60a5fa', 
          500: '#3b82f6', 
          600: '#2563eb', 
          700: '#1d4ed8', 
          800: '#1e40af', 
          900: '#1e3a8a' 
        },
        // Secondary red gradient
        secondary: { 
          50: '#fef2f2', 
          100: '#fee2e2', 
          200: '#fecaca', 
          300: '#fca5a5', 
          400: '#f87171', 
          500: '#ef4444', 
          600: '#dc2626', 
          700: '#b91c1c', 
          800: '#991b1b', 
          900: '#7f1d1d' 
        },
        // Accent amber gradient
        accent: { 
          50: '#fffbeb', 
          100: '#fef3c7', 
          200: '#fde68a', 
          300: '#fcd34d', 
          400: '#fbbf24', 
          500: '#f59e0b', 
          600: '#d97706', 
          700: '#b45309', 
          800: '#92400e', 
          900: '#78350f' 
        },
        // Gray scale for backgrounds
        gray: {
          850: '#1f2937',
          900: '#111827',
          950: '#030712',
        },
        // Success green
        success: {
          500: '#10b981',
          600: '#059669',
        },
        bgApp: '#0f172a',
      },
      spacing: { 
        '128': '32rem', 
        '144': '36rem',
        '18': '4.5rem',
        '88': '22rem',
      },
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
        mono: ['Fira Code', 'ui-monospace', 'SFMono-Regular', 'Menlo', 'Monaco', 'Consolas', 'monospace'],
      },
      keyframes: {
        'pulse-slow': {
          '0%, 100%': { opacity: 1, boxShadow: '0 0 0 0 rgba(16, 185, 129, 0.4)' },
          '50%': { opacity: 0.8, boxShadow: '0 0 0 6px rgba(16, 185, 129, 0)' },
        },
        'fade-in': {
          '0%': { opacity: 0, transform: 'translateY(10px)' },
          '100%': { opacity: 1, transform: 'translateY(0)' },
        },
        'slide-in-right': {
          '0%': { transform: 'translateX(100%)', opacity: 0 },
          '100%': { transform: 'translateX(0)', opacity: 1 },
        },
        'pulse-soft': {
          '0%, 100%': { opacity: 1 },
          '50%': { opacity: 0.7 },
        },
        'gradient-shift': {
          '0%, 100%': { backgroundPosition: '0% 50%' },
          '50%': { backgroundPosition: '100% 50%' },
        },
        // Floating Contact – Idle Attention
        'soft-pulse-ring': {
          '0%, 100%': {
            boxShadow: '0 0 0 0 rgba(59,130,246,0.35)',
          },
          '50%': {
            boxShadow: '0 0 0 10px rgba(59,130,246,0)',
          },
        },
        // Floating Contact – Item reveal
        'fade-slide-in': {
          '0%': {
            opacity: 0,
            transform: 'translateY(6px) scale(0.96)',
          },
          '100%': {
            opacity: 1,
            transform: 'translateY(0) scale(1)',
          },
        },
      },
      animation: {
        'pulse-slow': 'pulse-slow 3s ease-in-out infinite',
        'fade-in': 'fade-in 0.4s ease-out forwards',
        'slide-in-right': 'slide-in-right 0.3s ease-out forwards',
        'pulse-soft': 'pulse-soft 2s ease-in-out infinite',
        'gradient-shift': 'gradient-shift 3s ease infinite',
        'soft-pulse-ring': 'soft-pulse-ring 2.5s ease-in-out infinite',
        'fade-slide-in': 'fade-slide-in 220ms ease-out forwards',
      },
      backgroundImage: {
        'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
        'gradient-conic': 'conic-gradient(from 180deg at 50% 50%, var(--tw-gradient-stops))',
      },
      backdropBlur: {
        'xs': '2px',
      },
      boxShadow: {
        'inner-lg': 'inset 0 2px 4px 0 rgb(0 0 0 / 0.15)',
        'glow': '0 0 20px rgba(59, 130, 246, 0.3)',
        'glow-success': '0 0 20px rgba(16, 185, 129, 0.3)',
      },
      borderRadius: {
        'xl': '1rem',
        '2xl': '1.5rem',
      },
    },
  },
  corePlugins: { preflight: true },
  plugins: [
    require('@tailwindcss/forms'),
    require('@tailwindcss/typography'),
    require('@tailwindcss/aspect-ratio'),
  ],
};