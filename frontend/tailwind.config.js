/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      // Custom colors
      colors: {
        primary: {
          50: '#f0f9ff',
          500: '#3b82f6',
          600: '#2563eb',
          700: '#1d4ed8',
        },
        secondary: {
          50: '#fef2f2',
          500: '#ef4444',
          600: '#dc2626',
          700: '#b91c1c',
        },
        accent: {
          50: '#fefce8',
          500: '#f59e0b',
          600: '#d97706',
          700: '#b45309',
        },
      },

      // Custom spacing (optional)
      spacing: {
        '128': '32rem', // useful for large containers
        '144': '36rem',
      },

      // Font families
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui'],
        mono: ['Fira Code', 'ui-monospace', 'monospace'],
      },

      // Custom keyframes
      keyframes: {
        'pulse-slow': {
          '0%, 100%': { boxShadow: '0 0 0 0 rgba(16, 185, 129, 0.4)' },
          '50%': { boxShadow: '0 0 0 4px rgba(16, 185, 129, 0)' },
        },
        'fade-in': {
          '0%': { opacity: 0, transform: 'translateY(8px)' },
          '100%': { opacity: 1, transform: 'translateY(0)' },
        },
      },

      // Custom animations
      animation: {
        'pulse-slow': 'pulse-slow 3s infinite',
        'fade-in': 'fade-in 0.3s ease-out forwards',
      },
    },
  },

  // Respect prefers-reduced-motion
  corePlugins: {
    preflight: true, // reset CSS
  },

  plugins: [
    // Optional: add forms, typography, aspect-ratio, line-clamp
    require('@tailwindcss/forms'),
    require('@tailwindcss/typography'),
    require('@tailwindcss/aspect-ratio'),
    require('@tailwindcss/line-clamp'),
  ],
};
