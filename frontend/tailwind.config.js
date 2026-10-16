/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        navy: {
          950: 'rgb(var(--color-navy-950) / <alpha-value>)',
          900: 'rgb(var(--color-navy-900) / <alpha-value>)',
          800: 'rgb(var(--color-navy-800) / <alpha-value>)',
        },
        surface: {
          DEFAULT: '#f9f9f9',
          dim: '#dadada',
          bright: '#f9f9f9',
          lowest: '#ffffff',
          low: '#f3f3f4',
          container: '#eeeeee',
          high: '#e8e8e8',
          highest: '#e2e2e2',
          variant: '#e2e2e2',
        },
        'on-surface': {
          DEFAULT: '#1a1c1c',
          variant: '#434654',
        },
        'precision-blue': {
          DEFAULT: '#0052cc',
          dark: '#003d9b',
          light: '#c4d2ff',
        },
        'precision-border': '#DFE1E6',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
    },
  },
  plugins: [
    require("tailwindcss-animate"),
  ],
}

