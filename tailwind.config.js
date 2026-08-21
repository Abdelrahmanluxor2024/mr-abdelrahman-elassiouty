/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: ['class'],
  content: ['./src/**/*.{ts,tsx,js,jsx,mdx}'],
  theme: {
    container: {
      center: true,
      padding: '1rem',
      screens: {
        '2xl': '1400px',
      },
    },
    extend: {
      colors: {
        brand: {
          50: '#EFF6FF',
          100: '#DBEAFE',
          200: '#BFDBFE',
          300: '#93C5FD',
          400: '#60A5FA',
          500: '#3B82F6',
          600: '#2563EB',
          700: '#1E40AF',
          800: '#1E3A8A',
          900: '#0A1F44',
          950: '#06112A',
        },
        success: '#10B981',
        error: '#EF4444',
        warning: '#F59E0B',
        soft: '#F1F5F9',
      },
      fontFamily: {
        sans: ['Cairo', 'Tajawal', 'var(--font-cairo)', 'system-ui', 'sans-serif'],
        display: ['Tajawal', 'Cairo', 'var(--font-tajawal)', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        'blue-glow': '0 0 40px -10px rgba(59, 130, 246, 0.45)',
        'blue-soft': '0 10px 30px -15px rgba(37, 99, 235, 0.35)',
      },
      keyframes: {
        'fade-in': {
          '0%': { opacity: 0, transform: 'translateY(8px)' },
          '100%': { opacity: 1, transform: 'translateY(0)' },
        },
        'pulse-glow': {
          '0%, 100%': { boxShadow: '0 0 0 0 rgba(59, 130, 246, 0.6)' },
          '50%': { boxShadow: '0 0 0 18px rgba(59, 130, 246, 0)' },
        },
      },
      animation: {
        'fade-in': 'fade-in 0.5s ease-out',
        'pulse-glow': 'pulse-glow 2.4s ease-out infinite',
      },
      backgroundImage: {
        'brand-gradient': 'linear-gradient(135deg, #0A1F44 0%, #1E40AF 50%, #2563EB 100%)',
        'brand-soft': 'linear-gradient(135deg, #1E40AF 0%, #3B82F6 100%)',
      },
    },
  },
  plugins: [require('tailwindcss-animate')],
};
