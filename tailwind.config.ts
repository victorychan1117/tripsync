import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['var(--font-inter)', 'system-ui', 'sans-serif'],
      },
      colors: {
        brand: {
          50:  '#EEF2FF',
          100: '#E0E7FF',
          400: '#818CF8',
          500: '#6366F1',
          600: '#4F46E5',
          700: '#4338CA',
        },
      },
      animation: {
        'pop-in':       'popIn 0.45s cubic-bezier(0.34,1.56,0.64,1) both',
        'slide-up':     'slideUp 0.3s ease both',
        'slide-in-right': 'slideInRight 0.28s cubic-bezier(0.34,1.56,0.64,1) both',
        'draw-path':    'drawPath 0.9s cubic-bezier(0.4,0,0.2,1) both',
        'pulse-glow':   'pulseGlow 1.8s ease-in-out infinite',
        'card-in':      'cardIn 0.35s ease both',
      },
      keyframes: {
        popIn: {
          '0%':   { transform: 'scale(0.2)', opacity: '0' },
          '70%':  { transform: 'scale(1.12)', opacity: '1' },
          '100%': { transform: 'scale(1)', opacity: '1' },
        },
        slideUp: {
          from: { transform: 'translateY(10px)', opacity: '0' },
          to:   { transform: 'translateY(0)', opacity: '1' },
        },
        slideInRight: {
          from: { transform: 'translateX(16px) scale(0.97)', opacity: '0' },
          to:   { transform: 'translateX(0) scale(1)', opacity: '1' },
        },
        drawPath: {
          from: { strokeDashoffset: '200', opacity: '0' },
          '20%': { opacity: '1' },
          to:   { strokeDashoffset: '0', opacity: '1' },
        },
        pulseGlow: {
          '0%, 100%': { boxShadow: '0 0 0 0 rgba(99,102,241,0.4)' },
          '50%':      { boxShadow: '0 0 0 8px rgba(99,102,241,0)' },
        },
        cardIn: {
          from: { transform: 'translateY(6px)', opacity: '0' },
          to:   { transform: 'translateY(0)', opacity: '1' },
        },
      },
      boxShadow: {
        'brand-sm': '0 4px 14px rgba(99,102,241,0.4)',
        'brand-md': '0 8px 24px rgba(99,102,241,0.5)',
        'card':     '0 1px 4px rgba(0,0,0,0.05)',
        'card-hover': '0 4px 16px rgba(0,0,0,0.1)',
      },
    },
  },
  plugins: [],
};

export default config;
