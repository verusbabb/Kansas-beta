/** @type {import('tailwindcss').Config} */
import PrimeUI from 'tailwindcss-primeui';

export default {
  content: [
    "./index.html",
    "./src/**/*.{vue,js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {},
  },
  plugins: [PrimeUI],
  corePlugins: {
    preflight: false, // Disable Preflight so rendered HTML uses browser defaults
  },
}

