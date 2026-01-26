import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        apex: {
          primary: '#00c2cb',      // Brand teal - matches main site
          secondary: '#0d1321',    // Brand dark navy
          accent: '#00d4de',       // Lighter teal for hover
          dark: '#0d1321',
          light: '#f8fafc',
          success: '#22c55e',
          warning: '#f59e0b',
          error: '#ef4444',
          muted: '#64748b',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
export default config
