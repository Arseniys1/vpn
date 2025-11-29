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
          bg: '#0e1621',
          secondary: '#17212b',
          hover: '#202b36',
          separator: '#0b1015',
          text: '#f5f5f5',
          hint: '#7d8b99',
          blue: '#5288c1',
          red: '#ef5b5b',
          green: '#46d160',
          buttonText: '#ffffff'
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
}

