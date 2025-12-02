/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        tg: {
          bg: 'var(--tg-bg)',
          secondary: 'var(--tg-secondary)',
          hover: 'var(--tg-hover)',
          separator: {
            DEFAULT: 'var(--tg-separator)',
            50: 'var(--tg-separator-50)',
          },
          text: 'var(--tg-text)',
          hint: 'var(--tg-hint)',
          blue: {
            DEFAULT: 'var(--tg-blue)',
            30: 'var(--tg-blue-30)',
          },
          red: 'var(--tg-red)',
          green: 'var(--tg-green)',
          buttonText: 'var(--tg-button-text)'
        }
      },
      animation: {
        'fade-in': 'fadeIn 0.3s ease-out',
        'marquee': 'marquee 15s linear infinite',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0', transform: 'translateY(10px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        marquee: {
          '0%': { transform: 'translateX(100%)' },
          '100%': { transform: 'translateX(-100%)' },
        }
      }
    },
  },
  plugins: [],
  darkMode: 'class', // Enable dark mode with class strategy
}