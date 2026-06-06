/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Noto Sans SC', 'Inter', 'system-ui', 'sans-serif'],
        headline: ['Noto Serif SC', 'Noto Serif', 'STSong', 'SimSun', 'serif'],
        display: ['Noto Serif SC', 'Noto Serif', 'STSong', 'SimSun', 'serif'],
        body: ['Noto Sans SC', 'Inter', 'sans-serif'],
        label: ['Noto Sans SC', 'Public Sans', 'sans-serif'],
      },
      borderRadius: {
        DEFAULT: '0.125rem',
        lg: '0.25rem',
        xl: '0.5rem',
        '2xl': '0.75rem',
        '3xl': '1rem',
        full: '9999px',
      },
      animation: {
        'wave': 'wave 1.2s ease-in-out infinite',
        'fade-in': 'fadeIn 0.15s ease-out',
        'slide-up': 'slideUp 0.25s ease-out',
        'scale-in': 'scaleIn 0.15s ease-out',
        'bounce': 'bounce 0.6s infinite',
      },
      keyframes: {
        wave: {
          '0%, 100%': { transform: 'scaleY(0.3)' },
          '50%': { transform: 'scaleY(1)' },
        },
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { transform: 'translateY(12px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        scaleIn: {
          '0%': { transform: 'scale(0.98)', opacity: '0' },
          '100%': { transform: 'scale(1)', opacity: '1' },
        },
      },
      colors: {
        primary: {
          DEFAULT: '#094cb2',
          container: '#3366cc',
          fixed: '#d9e2ff',
          'fixed-dim': '#b1c5ff',
        },
        surface: {
          DEFAULT: '#faf9fa',
          bright: '#faf9fa',
          dim: '#dbdadb',
          variant: '#e3e2e3',
          tint: '#2259bf',
        },
        'surface-container': {
          lowest: '#ffffff',
          low: '#f5f3f4',
          DEFAULT: '#efedee',
          high: '#e9e8e9',
          highest: '#e3e2e3',
        },
        background: '#faf9fa',
        'on-background': '#1b1c1d',
        'on-surface': {
          DEFAULT: '#1b1c1d',
          variant: '#434653',
        },
        secondary: {
          DEFAULT: '#5a5f63',
          container: '#dfe3e8',
          fixed: '#dfe3e8',
          'fixed-dim': '#c2c7cc',
        },
        'on-secondary': {
          DEFAULT: '#ffffff',
          container: '#606569',
          fixed: '#171c20',
          'fixed-variant': '#42474b',
        },
        tertiary: {
          DEFAULT: '#6d5e00',
          container: '#bfab49',
          fixed: '#f9e37a',
          'fixed-dim': '#dcc661',
        },
        'on-tertiary': {
          DEFAULT: '#ffffff',
          container: '#4a3f00',
          fixed: '#211b00',
          'fixed-variant': '#524600',
        },
        outline: {
          DEFAULT: '#737784',
          variant: '#c3c6d5',
        },
        error: {
          DEFAULT: '#ba1a1a',
          container: '#ffdad6',
        },
        'on-error': {
          DEFAULT: '#ffffff',
          container: '#93000a',
        },
        inverse: {
          surface: '#303031',
          'on-surface': '#f2f0f1',
          primary: '#b1c5ff',
        },
        paper: {
          DEFAULT: '#f5f0e1',
          light: '#faf6ec',
          dark: '#e8e0cc',
        },
      },
    },
  },
  plugins: [],
}
