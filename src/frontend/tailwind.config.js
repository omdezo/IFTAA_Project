/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Islamic Gold & Lecture Blue Theme
        primary: '#D4AF37', // Islamic Gold
        'primary-hover': '#E8D8A8', // Muted Gold (lighter hover state)
        secondary: '#1F4E79', // Lecture Blue
        'bg-main': '#F8F8F5', // Ivory (page background)
        'text-main': '#1A1A1A', // Slate (body text)
        'muted': '#E8D8A8', // Muted Gold
        
        // Extended palette for the theme
        islamic: {
          gold: '#D4AF37',
          'gold-light': '#E8D8A8',
          'gold-dark': '#B8941F',
          'gold-muted': '#E8D8A8',
          blue: '#1F4E79',
          'blue-light': '#2E5F94',
          'blue-dark': '#153A5B',
          ivory: '#F8F8F5',
          slate: '#1A1A1A'
        },
        
        // Neutral palette
        neutral: {
          50: '#FAFAFA',
          100: '#F5F5F5',
          200: '#E5E5E5',
          300: '#D4D4D4',
          400: '#A3A3A3',
          500: '#737373',
          600: '#525252',
          700: '#404040',
          800: '#262626',
          900: '#171717'
        }
      },
      fontFamily: {
        arabic: ['Tajawal', 'Noto Sans Arabic', 'system-ui', 'sans-serif'],
        english: ['Inter', 'system-ui', 'sans-serif'],
        sans: ['Tajawal', 'Inter', 'system-ui', 'sans-serif']
      },
      spacing: {
        '18': '4.5rem',
        '88': '22rem'
      },
      animation: {
        'fade-in': 'fadeIn 0.3s ease-in-out',
        'slide-in-right': 'slideInRight 0.3s ease-out',
        'slide-in-left': 'slideInLeft 0.3s ease-out',
        'bounce-gentle': 'bounceGentle 2s infinite'
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' }
        },
        slideInRight: {
          '0%': { transform: 'translateX(100%)' },
          '100%': { transform: 'translateX(0)' }
        },
        slideInLeft: {
          '0%': { transform: 'translateX(-100%)' },
          '100%': { transform: 'translateX(0)' }
        },
        bounceGentle: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-5px)' }
        }
      }
    },
  },
  plugins: [
    // RTL support plugin
    function({ addUtilities }) {
      const newUtilities = {
        '.rtl': {
          direction: 'rtl',
        },
        '.ltr': {
          direction: 'ltr',
        },
        '.text-start': {
          'text-align': 'start',
        },
        '.text-end': {
          'text-align': 'end',
        },
        '.ms-auto': {
          'margin-inline-start': 'auto',
        },
        '.me-auto': {
          'margin-inline-end': 'auto',
        },
        '.ps-4': {
          'padding-inline-start': '1rem',
        },
        '.pe-4': {
          'padding-inline-end': '1rem',
        },
        '.border-s': {
          'border-inline-start-width': '1px',
        },
        '.border-e': {
          'border-inline-end-width': '1px',
        }
      }
      addUtilities(newUtilities)
    }
  ],
}