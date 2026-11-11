/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
  	extend: {
  		colors: {
  			studio: {
  				bg: 'var(--color-bg)',
  				card: 'var(--color-card)',
  				raised: 'var(--color-raised)',
  				text: 'var(--color-text)',
  				muted: 'var(--color-muted)',
  				accent: 'var(--color-accent)',
  				border: 'var(--color-border)'
  			},
  			status: {
  				contradiction: '#EF4444',
  				consistent: '#10B981',
  				warning: '#F59E0B'
  			},
  			enchanted: {
  				forest: '#101C19',
  				moss: '#263F35',
  				sage: '#58745C',
  				gold: '#C1A66B',
  				ivory: '#E9E2CE',
  				cream: '#F4F0E5',
  				paleSage: '#DCE5D6',
  				olive: '#87977A',
  				warmWhite: '#FAF9F3',
  				goldBorder: '#D7C397'
  			}
  		},
  		fontFamily: {
  			serif: [
  				'"Fraunces"',
  				'Georgia',
  				'serif'
  			],
  			sans: [
  				'"Inter"',
  				'-apple-system',
  				'BlinkMacSystemFont',
  				'sans-serif'
  			]
  		},
  		minHeight: {
  			touch: '44px'
  		},
  		minWidth: {
  			touch: '44px'
  		},
  		keyframes: {
  			'accordion-down': {
  				from: {
  					height: '0'
  				},
  				to: {
  					height: 'var(--radix-accordion-content-height)'
  				}
  			},
  			'accordion-up': {
  				from: {
  					height: 'var(--radix-accordion-content-height)'
  				},
  				to: {
  					height: '0'
  				}
  			}
  		},
  		animation: {
  			'accordion-down': 'accordion-down 0.2s ease-out',
  			'accordion-up': 'accordion-up 0.2s ease-out'
  		}
  	}
  },
  plugins: [],
}
