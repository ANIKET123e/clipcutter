import type { Config } from 'tailwindcss';

const config: Config = {
  darkMode: 'class',
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        base: {
          950: '#07070b',
          900: '#0c0c14',
          800: '#12121d',
          700: '#1b1b29'
        },
        accent: {
          violet: '#7c5cff',
          blue: '#4fa3ff',
          cyan: '#3fe0d0'
        }
      },
      fontFamily: {
        display: ['var(--font-display)'],
        body: ['var(--font-body)'],
        mono: ['var(--font-mono)']
      },
      borderRadius: {
        xl2: '1.25rem'
      },
      backgroundImage: {
        'grid-glow': 'radial-gradient(circle at 20% -10%, rgba(124,92,255,0.25), transparent 45%), radial-gradient(circle at 90% 10%, rgba(79,163,255,0.15), transparent 40%)'
      }
    }
  },
  plugins: []
};

export default config;
