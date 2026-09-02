import type { Config } from 'tailwindcss';

/** Tailwind theme — mobile-first player training app (Phase 1H-A). */
const config: Config = {
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        pitch: {
          50: '#f4f9f4',
          100: '#e3f0e3',
          600: '#2d6a4f',
          700: '#1b4332',
          900: '#081c15',
        },
      },
      fontFamily: {
        sans: ['var(--font-geist-sans)', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
};

export default config;
