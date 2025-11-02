/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './index.html',
    './src/**/*.{vue,js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Calibri', 'system-ui', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
      },
      fontSize: {
        'body': '16px',
        'caption': ['12px', '16px'],
        'caption-lg': ['14px', '18px'],
        'h3': ['18px', '24px'],
        'h3-lg': ['20px', '26px'],
        'h2': ['22px', '28px'],
        'h2-lg': ['26px', '32px'],
        'h1': ['28px', '36px'],
        'h1-lg': ['34px', '42px'],
      },
      colors: {
        primary: {
          DEFAULT: '#9747FF',
          light: '#B577FF',
          dark: '#7B2FE6',
        },
        secondary: {
          DEFAULT: '#6B46FF',
          light: '#8B6EFF',
          dark: '#5333CC',
        },
        success: {
          DEFAULT: '#10B981',
          light: '#34D399',
          dark: '#059669',
        },
        error: {
          DEFAULT: '#EF4444',
          light: '#F87171',
          dark: '#DC2626',
        },
        neutral: {
          50: '#F9FAFB',
          100: '#F3F4F6',
          200: '#E5E7EB',
          300: '#D1D5DB',
          400: '#9CA3AF',
          500: '#6B7280',
          600: '#4B5563',
          700: '#374151',
          800: '#1F2937',
          900: '#111827',
        },
      },
      borderRadius: {
        DEFAULT: '10px',
        'sm': '6px',
        'md': '10px',
        'lg': '14px',
        'xl': '18px',
      },
      boxShadow: {
        'soft': '0 6px 18px rgba(15, 23, 36, 0.06)',
        'soft-lg': '0 10px 30px rgba(15, 23, 36, 0.08)',
        'card': '0 4px 12px rgba(0, 0, 0, 0.08)',
        'card-hover': '0 8px 24px rgba(0, 0, 0, 0.12)',
      },
      spacing: {
        '18': '4.5rem',
        '88': '22rem',
        '92': '23rem',
        '100': '25rem',
        '104': '26rem',
        '108': '27rem',
      },
      ringWidth: {
        '3': '3px',
      },
      ringColor: {
        DEFAULT: '#9747FF',
      },
      ringOffsetWidth: {
        '3': '3px',
      },
    },
  },
  plugins: [],
}
