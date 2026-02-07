import type { Config } from 'tailwindcss';

export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        cream: '#F6F1E7',
        oatmeal: '#EFE6D5',
        fog: '#F9F6F0',
        sage: '#BFD3B2',
        leaf: '#8FBF85',
        mint: '#CFE8D8',
        sky: '#C9DDF2',
        peach: '#F7C8A5',
        honey: '#F7E1A0',
        cocoa: '#6B4B3E',
        soil: '#8A6A5B',
        ink: '#3C3A35'
      },
      fontFamily: {
        sans: ['Nunito', 'ui-sans-serif', 'system-ui'],
        display: ['"Baloo 2"', 'Nunito', 'ui-sans-serif', 'system-ui']
      },
      boxShadow: {
        cozy: '0 10px 30px -20px rgba(60, 58, 53, 0.45)',
        floaty: '0 6px 16px -10px rgba(60, 58, 53, 0.35)'
      },
      borderRadius: {
        cozy: '1.25rem'
      },
      keyframes: {
        breathe: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-3px)' }
        },
        pulseOnce: {
          '0%': { transform: 'scale(1)', boxShadow: '0 0 0 0 rgba(143, 191, 133, 0.35)' },
          '60%': { transform: 'scale(1.01)', boxShadow: '0 0 0 8px rgba(143, 191, 133, 0)' },
          '100%': { transform: 'scale(1)', boxShadow: '0 0 0 0 rgba(143, 191, 133, 0)' }
        },
        fadeIn: {
          '0%': { opacity: '0', transform: 'translateY(6px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' }
        }
      },
      animation: {
        breathe: 'breathe 3.5s ease-in-out infinite',
        pulseOnce: 'pulseOnce 450ms ease-out',
        fadeIn: 'fadeIn 0.45s ease-out both'
      }
    }
  },
  plugins: []
} satisfies Config;
