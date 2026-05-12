/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        amani: {
          ink: '#18211f',
          forest: '#1f5f4a',
          leaf: '#2f8a68',
          sun: '#f4b942',
          clay: '#c96f4a',
          mist: '#eef6f2',
        },
      },
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
