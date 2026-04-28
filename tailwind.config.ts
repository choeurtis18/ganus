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
        navy: 'var(--navy)',
        'navy-light': 'var(--navy-light)',
        gold: 'var(--gold)',
        'gold-light': 'var(--gold-light)',
        emerald: 'var(--emerald)',
        'emerald-light': 'var(--emerald-light)',
        teal: 'var(--teal)',
        cream: 'var(--cream)',
        orange: 'var(--orange)',
        pink: 'var(--pink)',
        lavender: 'var(--lavender)',
        bg: 'var(--bg)',
        'bg-card': 'var(--bg-card)',
        'bg-input': 'var(--bg-input)',
        'bg-sidebar': 'var(--bg-sidebar)',
        'text-primary': 'var(--text-primary)',
        'text-secondary': 'var(--text-secondary)',
        'text-muted': 'var(--text-muted)',
        'border-color': 'var(--border)',
      },
      fontFamily: {
        sans: ['DM Sans', 'sans-serif'],
        display: ['Playfair Display', 'serif'],
      },
      boxShadow: {
        sm: 'var(--shadow-sm)',
        md: 'var(--shadow-md)',
        lg: 'var(--shadow-lg)',
      },
      borderRadius: {
        sm: '8px',
        md: '10px',
        lg: '12px',
      },
    },
  },
  plugins: [],
}

export default config
