import type { Config } from 'tailwindcss';

const config: Config = {
  // This config now lives in packages/shared-ui alongside globals.css and the
  // design tokens, because it *is* the design system — the shell and every
  // module zone consume the same one. Globs are therefore relative to this
  // package and reach back into each consuming app: a class used only in a zone
  // route is otherwise never seen by Tailwind and its utilities get purged, so
  // the page mounts unstyled.
  content: [
    './src/**/*.{js,ts,jsx,tsx,mdx}',
    '../shared-core/src/**/*.{js,ts,jsx,tsx,mdx}',
    '../../apps/web/src/**/*.{js,ts,jsx,tsx,mdx}',
    '../../modules/*/frontend/src/**/*.{js,ts,jsx,tsx,mdx}',
  ],

  // ── Dark Mode ─────────────────────────────────────────────────────────────
  darkMode: 'class',

  theme: {
    // ── Custom Screens ────────────────────────────────────────────────────
    // Listed in ascending order. Tailwind sorts breakpoint variants by value
    // when it emits them, so the order here is documentation rather than
    // behaviour — but reading `3xl` before `2xl` invited the wrong conclusion.
    //
    // Each entry is a min-width, so the label names the band it OPENS.
    // `ms` exists because several component styles in globals.css already key
    // off 480px (the category grid, the hotel search form): that band was
    // reachable from hand-written CSS but not from a utility, so a page could
    // not stay in step with its own stylesheet across it.
    screens: {
      '2xs': '320px',   // 1. Small mobile phones      (320–374px)
      xs:    '375px',   // 2. Standard mobile phones   (375–413px)
      // `ph` fills the widest gap in the phone range. Between `xs` and `ms` sat
      // 105px of unaddressable width holding most modern handsets — 390, 393,
      // 412, 414, 428 and 430 — all of which rendered exactly like a 375px
      // iPhone SE. Content grids in particular stayed at two columns to 639px,
      // so a 430px phone got two 193px cards where three 135px ones fit, which
      // is the same tile density a 320px phone already gets at two columns.
      ph:    '414px',   // 2b. Large phones            (414–479px)
      ms:    '480px',   // 3. Phablets                 (480–639px)
      sm:    '640px',   // 4. Small tablets            (640–767px)
      md:    '768px',   // 5. Tablets                  (768–1023px)
      lg:    '1024px',  // 6. Laptops                  (1024–1279px)
      xl:    '1280px',  // 7. Large laptops            (1280–1439px)
      '3xl': '1440px',  // 8. Desktop monitors         (1440–1535px)
      '2xl': '1536px',  //    (back-compat alias — sits between 3xl and 4xl)
      '4xl': '1920px',  // 9. Wide-range desktops      (≥ 1920px)
    },

    // ── Container — responsive max-widths per breakpoint ──────────────────
    container: {
      center: true,
      padding: {
        DEFAULT: '1rem',
        xs:    '1rem',
        ms:    '1.125rem',
        sm:    '1.25rem',
        md:    '1.5rem',
        lg:    '2rem',
        xl:    '2.5rem',
        '3xl': '3rem',
        '4xl': '4rem',
      },
    },

    extend: {
      // ── Brand Colors ─────────────────────────────────────────────────────
      // Values come from src/styles/design-tokens.json via the generated
      // src/styles/design-tokens.css. They are NOT restated here — this block
      // and globals.css used to declare the same hex independently and had
      // already drifted apart (see the note on the removed `module` block).
      //
      // Safe as var() because nothing uses an opacity modifier on these
      // (`bg-brand-600/50` and friends: 0 occurrences). If you need one, the
      // token must be re-expressed as bare channels first.
      colors: {
        brand: {
          50:  'var(--primitive-color-blue-50)',
          100: 'var(--primitive-color-blue-100)',
          200: 'var(--primitive-color-blue-200)',
          300: 'var(--primitive-color-blue-300)',
          400: 'var(--primitive-color-blue-400)',
          500: 'var(--primitive-color-blue-500)',
          600: 'var(--primitive-color-blue-600)',
          700: 'var(--primitive-color-blue-700)',
          800: 'var(--primitive-color-blue-800)',
          900: 'var(--primitive-color-blue-900)',
          950: 'var(--primitive-color-blue-950)',
        },

        // REMOVED: `module` and `surface` colour blocks.
        //
        // Both were dead — `bg-module-*` / `text-surface-*` and every other
        // utility built on them had zero occurrences across src/. They were
        // also the second, drifting copy of the module identities: this block
        // had doctor = #7c3aed (violet) where globals.css had #4f46e5
        // (indigo), and carried a taxi accent that globals.css had no
        // identity for at all. Module identity now has exactly one definition,
        // in design-tokens.json, consumed as --module-<name>-* CSS variables.
      },

      // ── Typography ───────────────────────────────────────────────────────
      fontFamily: {
        sans:    ['Outfit', 'Inter', 'system-ui', 'sans-serif'],
        heading: ['Outfit', 'sans-serif'],
        body:    ['Inter', 'system-ui', 'sans-serif'],
        mono:    ['JetBrains Mono', 'Fira Code', 'Courier New', 'monospace'],
      },
      fontSize: {
        '2xs': ['0.625rem', { lineHeight: '0.875rem', letterSpacing: '0.02em' }],
        xs:    ['0.75rem',  { lineHeight: '1rem'                               }],
        sm:    ['0.875rem', { lineHeight: '1.25rem'                            }],
        base:  ['1rem',     { lineHeight: '1.5rem'                             }],
        lg:    ['1.125rem', { lineHeight: '1.75rem'                            }],
        xl:    ['1.25rem',  { lineHeight: '1.75rem'                            }],
        '2xl': ['1.5rem',   { lineHeight: '2rem'                               }],
        '3xl': ['1.875rem', { lineHeight: '2.25rem'                            }],
        '4xl': ['2.25rem',  { lineHeight: '2.5rem',   letterSpacing: '-0.02em' }],
        '5xl': ['3rem',     { lineHeight: '1.1',      letterSpacing: '-0.03em' }],
        '6xl': ['3.75rem',  { lineHeight: '1',        letterSpacing: '-0.04em' }],
        '7xl': ['4.5rem',   { lineHeight: '1',        letterSpacing: '-0.04em' }],
      },
      letterSpacing: {
        tightest: '-0.04em',
        tighter:  '-0.02em',
        tight:    '-0.01em',
        normal:   '0',
        wide:     '0.02em',
        wider:    '0.05em',
        widest:   '0.1em',
      },
      lineHeight: {
        'extra-tight': '1.1',
        tight:         '1.2',
        snug:          '1.375',
        normal:        '1.5',
        relaxed:       '1.625',
        loose:         '2',
      },

      // ── Spacing ──────────────────────────────────────────────────────────
      spacing: {
        '0.5':  '0.125rem',
        '1.5':  '0.375rem',
        '2.5':  '0.625rem',
        '3.5':  '0.875rem',
        '4.5':  '1.125rem',
        '13':   '3.25rem',
        '15':   '3.75rem',
        '18':   '4.5rem',
        '22':   '5.5rem',
        '26':   '6.5rem',
        '30':   '7.5rem',
        '34':   '8.5rem',
        '38':   '9.5rem',
        '42':   '10.5rem',
        '46':   '11.5rem',
        '50':   '12.5rem',
        '76':   '19rem',
        '84':   '21rem',
        '88':   '22rem',
        '92':   '23rem',
        '100':  '25rem',
        '104':  '26rem',
        '108':  '27rem',
        '112':  '28rem',
        '120':  '30rem',
        '128':  '32rem',
        '144':  '36rem',
      },

      // ── Max Width ────────────────────────────────────────────────────────
      maxWidth: {
        'app':       '1400px',  // default app content max
        'app-wide':  '1600px',  // 3xl desktop
        'app-full':  '1800px',  // 4xl wide desktop
        'prose-sm':  '45ch',
        'prose':     '65ch',
        'prose-lg':  '80ch',
        // Breakpoint-named aliases for responsive containers
        'screen-xs': '375px',
        'screen-sm': '640px',
        'screen-md': '768px',
        'screen-lg': '1024px',
        'screen-xl': '1280px',
        'screen-3xl':'1440px',
        'screen-4xl':'1920px',
      },

      // ── Min Height / Width ───────────────────────────────────────────────
      minHeight: {
        screen:   '100vh',
        'screen-75': '75vh',
        'screen-50': '50vh',
      },

      // ── Border Radius ────────────────────────────────────────────────────
      borderRadius: {
        '4xl': '2rem',
        '5xl': '2.5rem',
        '6xl': '3rem',
      },

      // ── Box Shadows ──────────────────────────────────────────────────────
      // Elevation ramp comes from design-tokens.json. The glow variants are
      // derived from their own primitive via color-mix so the accent colour is
      // stated once, not repeated as a hand-written rgba().
      boxShadow: {
        'xs':          'var(--primitive-shadow-xs)',
        'card':        'var(--primitive-shadow-card)',
        'card-hover':  'var(--primitive-shadow-card-hover)',
        'float':       'var(--primitive-shadow-float)',
        'modal':       'var(--primitive-shadow-modal)',
        'glow':        '0 0 24px color-mix(in srgb, var(--color-brand-primary) 25%, transparent)',
        'glow-sm':     '0 0 12px color-mix(in srgb, var(--color-brand-primary) 20%, transparent)',
        'glow-green':  '0 0 20px color-mix(in srgb, var(--color-feedback-success) 25%, transparent)',
        'glow-amber':  '0 0 20px color-mix(in srgb, var(--color-feedback-warning) 25%, transparent)',
        'inner-lg':    'var(--primitive-shadow-inner-lg)',
        'inner-brand': 'inset 0 0 0 2px color-mix(in srgb, var(--color-brand-primary) 40%, transparent)',
        'nav':         'var(--primitive-shadow-nav)',
      },

      // ── Background Images (Gradients) ────────────────────────────────────
      backgroundImage: {
        // Brand — the two brand colours are referenced, not restated.
        'brand-gradient':  'linear-gradient(135deg, var(--color-brand-primary) 0%, var(--color-brand-secondary) 100%)',
        'brand-subtle':    'linear-gradient(135deg, var(--primitive-color-blue-50) 0%, var(--primitive-color-violet-50) 100%)',
        // Warm
        'warm-gradient':   'linear-gradient(135deg, var(--primitive-color-amber-500) 0%, var(--primitive-color-red-500) 100%)',
        // Greens
        'green-gradient':  'linear-gradient(135deg, var(--primitive-color-emerald-500) 0%, var(--primitive-color-emerald-600) 100%)',
        'teal-gradient':   'linear-gradient(135deg, var(--primitive-color-teal-600) 0%, var(--primitive-color-cyan-600) 100%)',
        // Purples
        'purple-gradient': 'linear-gradient(135deg, var(--primitive-color-violet-600) 0%, var(--primitive-color-pink-600) 100%)',
        'violet-gradient': 'linear-gradient(135deg, var(--primitive-color-violet-700) 0%, var(--primitive-color-indigo-600) 100%)',
        // Heroes
        'hero-gradient':   'linear-gradient(135deg, var(--primitive-color-slate-900) 0%, var(--primitive-color-navy-700) 60%, var(--primitive-color-slate-900) 100%)',
        'hero-warm':       'linear-gradient(135deg, var(--primitive-color-stone-900) 0%, var(--primitive-color-stone-800) 100%)',
        // Cards
        'card-gradient':   'linear-gradient(145deg, var(--color-surface-card) 0%, var(--color-surface-base) 100%)',
        'card-blue':       'linear-gradient(145deg, var(--primitive-color-blue-50) 0%, var(--primitive-color-blue-100) 100%)',
        // Shimmer
        'shimmer':         'linear-gradient(90deg, var(--color-surface-muted) 25%, var(--color-border-subtle) 50%, var(--color-surface-muted) 75%)',
      },

      // ── Background Size ──────────────────────────────────────────────────
      backgroundSize: {
        '200%': '200% 100%',
        'auto': 'auto',
        'cover': 'cover',
        'contain': 'contain',
      },

      // ── Opacity ──────────────────────────────────────────────────────────
      opacity: {
        '3':  '0.03',
        '7':  '0.07',
        '12': '0.12',
        '15': '0.15',
        '35': '0.35',
        '45': '0.45',
        '55': '0.55',
        '65': '0.65',
        '85': '0.85',
        '98': '0.98',
      },

      // ── Blur ─────────────────────────────────────────────────────────────
      blur: {
        'xs': '2px',
        '4xl': '80px',
        '5xl': '128px',
      },

      // ── Z-Index ──────────────────────────────────────────────────────────
      zIndex: {
        '1':      '1',
        '5':      '5',
        '15':     '15',
        '25':     '25',
        '35':     '35',
        '45':     '45',
        '55':     '55',
        '60':     '60',
        '70':     '70',
        '80':     '80',
        '90':     '90',
        'header': '100',
        'drawer': '200',
        'modal':  '300',
        'toast':  '400',
        'top':    '9999',
      },

      // ── Transition Duration ──────────────────────────────────────────────
      transitionDuration: {
        '0':    '0ms',
        '75':   '75ms',
        '100':  '100ms',
        '150':  '150ms',
        '200':  '200ms',
        '250':  '250ms',
        '300':  '300ms',
        '350':  '350ms',
        '400':  '400ms',
        '500':  '500ms',
        '700':  '700ms',
        '1000': '1000ms',
      },

      // ── Transition Timing ────────────────────────────────────────────────
      transitionTimingFunction: {
        'smooth':    'var(--primitive-ease-smooth)',
        'spring':    'var(--primitive-ease-spring)',
        'bounce-in': 'var(--primitive-ease-bounce-in)',
        'sharp':     'var(--primitive-ease-sharp)',
      },

      // ── Animations ───────────────────────────────────────────────────────
      animation: {
        // Entry animations
        'fade-in':       'fadeIn 0.4s cubic-bezier(0.4,0,0.2,1) both',
        'fade-in-fast':  'fadeIn 0.2s cubic-bezier(0.4,0,0.2,1) both',
        'scale-in':      'scaleIn 0.3s cubic-bezier(0.34,1.56,0.64,1) both',
        'scale-in-fast': 'scaleIn 0.15s cubic-bezier(0.34,1.56,0.64,1) both',
        'slide-up':      'slideUp 0.35s cubic-bezier(0.4,0,0.2,1) both',
        'slide-down':    'slideDown 0.35s cubic-bezier(0.4,0,0.2,1) both',
        'slide-left':    'slideLeft 0.35s cubic-bezier(0.4,0,0.2,1) both',
        'slide-right':   'slideRight 0.35s cubic-bezier(0.4,0,0.2,1) both',
        // Continuous
        'float':         'float 3s ease-in-out infinite',
        'float-slow':    'float 5s ease-in-out infinite',
        'pulse-slow':    'pulse 3s ease-in-out infinite',
        'pulse-fast':    'pulse 1s ease-in-out infinite',
        'bounce-gentle': 'bounceGentle 1.5s ease-in-out infinite',
        'spin-slow':     'spin 3s linear infinite',
        'spin-slower':   'spin 6s linear infinite',
        // Shimmer loader
        'shimmer':       'shimmer 1.5s infinite',
        // Alert ping (red dot)
        'ping-slow':     'ping 2s cubic-bezier(0,0,0.2,1) infinite',
        // Radix-style (used by admin dropdown animate-in)
        'in':            'fadeIn 0.15s ease both',
      },
      keyframes: {
        fadeIn:       { from: { opacity: '0', transform: 'translateY(8px)' },    to: { opacity: '1', transform: 'translateY(0)' } },
        scaleIn:      { from: { opacity: '0', transform: 'scale(0.93)' },        to: { opacity: '1', transform: 'scale(1)' } },
        slideUp:      { from: { opacity: '0', transform: 'translateY(16px)' },   to: { opacity: '1', transform: 'translateY(0)' } },
        slideDown:    { from: { opacity: '0', transform: 'translateY(-16px)' },  to: { opacity: '1', transform: 'translateY(0)' } },
        slideLeft:    { from: { opacity: '0', transform: 'translateX(-16px)' },  to: { opacity: '1', transform: 'translateX(0)' } },
        slideRight:   { from: { opacity: '0', transform: 'translateX(16px)' },   to: { opacity: '1', transform: 'translateX(0)' } },
        float:        { '0%,100%': { transform: 'translateY(0)' },               '50%': { transform: 'translateY(-8px)' } },
        bounceGentle: { '0%,100%': { transform: 'translateY(0)' },               '50%': { transform: 'translateY(-4px)' } },
        shimmer:      { '0%': { backgroundPosition: '200% 0' },                  '100%': { backgroundPosition: '-200% 0' } },
      },

      // ── Aspect Ratio ─────────────────────────────────────────────────────
      aspectRatio: {
        'auto':     'auto',
        'square':   '1 / 1',
        'video':    '16 / 9',
        'portrait': '3 / 4',
        'wide':     '21 / 9',
        'product':  '4 / 5',
      },

      // ── Grid Template ────────────────────────────────────────────────────
      gridTemplateColumns: {
        'auto-sm':  'repeat(auto-fill, minmax(120px, 1fr))',
        'auto-md':  'repeat(auto-fill, minmax(180px, 1fr))',
        'auto-lg':  'repeat(auto-fill, minmax(240px, 1fr))',
        'auto-xl':  'repeat(auto-fill, minmax(300px, 1fr))',
        'sidebar':  '240px 1fr',
        'sidebar-lg': '280px 1fr',
      },
    },
  },

  plugins: [
    // Custom plugin: scrollbar utilities
    ({ addUtilities, theme }: { addUtilities: Function; theme: Function }) => {
      addUtilities({
        // Scrollbar hide (used by marketplace, taxi horizontal carousels)
        '.scrollbar-hide': {
          '-ms-overflow-style': 'none',
          'scrollbar-width': 'none',
          '&::-webkit-scrollbar': { display: 'none' },
        },
        // Alias used in older pages
        '.hide-scrollbar': {
          '-ms-overflow-style': 'none',
          'scrollbar-width': 'none',
          '&::-webkit-scrollbar': { display: 'none' },
        },
        // Thin styled scrollbar
        '.scrollbar-thin': {
          'scrollbar-width': 'thin',
          'scrollbar-color': 'var(--color-border-strong) transparent',
          '&::-webkit-scrollbar': { width: '4px', height: '4px' },
          '&::-webkit-scrollbar-track': { background: 'transparent' },
          '&::-webkit-scrollbar-thumb': { background: 'var(--color-border-strong)', borderRadius: '999px' },
          '&::-webkit-scrollbar-thumb:hover': { background: 'var(--color-text-muted)' },
        },
        // Gradient text — these were a third copy of brand/warm/green-gradient
        // above, written out by hand. Same tokens, one definition each.
        '.text-gradient-brand': {
          background: 'linear-gradient(135deg, var(--color-brand-primary) 0%, var(--color-brand-secondary) 100%)',
          '-webkit-background-clip': 'text',
          '-webkit-text-fill-color': 'transparent',
          'background-clip': 'text',
        },
        '.text-gradient-warm': {
          background: 'linear-gradient(135deg, var(--primitive-color-amber-500) 0%, var(--primitive-color-red-500) 100%)',
          '-webkit-background-clip': 'text',
          '-webkit-text-fill-color': 'transparent',
          'background-clip': 'text',
        },
        '.text-gradient-green': {
          background: 'linear-gradient(135deg, var(--primitive-color-emerald-500) 0%, var(--primitive-color-emerald-600) 100%)',
          '-webkit-background-clip': 'text',
          '-webkit-text-fill-color': 'transparent',
          'background-clip': 'text',
        },
        // Glass morphism
        // Alpha derived from the surface/text tokens rather than a literal
        // rgba() restating the same white and slate-900.
        '.glass': {
          background: 'color-mix(in srgb, var(--color-surface-card) 70%, transparent)',
          'backdrop-filter': 'blur(12px)',
          '-webkit-backdrop-filter': 'blur(12px)',
          border: '1px solid color-mix(in srgb, var(--color-surface-card) 40%, transparent)',
        },
        '.glass-dark': {
          background: 'color-mix(in srgb, var(--color-text-primary) 70%, transparent)',
          'backdrop-filter': 'blur(12px)',
          '-webkit-backdrop-filter': 'blur(12px)',
          border: '1px solid color-mix(in srgb, var(--color-surface-card) 8%, transparent)',
        },
        // Radix animate-in/animate-out (used in admin dropdowns)
        '.animate-in': { 'animation-fill-mode': 'both' },
        '.fade-in': { 'animation-name': 'fadeIn' },
        '.fade-out': { 'animation-name': 'fadeOut' },
        '.duration-150': { 'animation-duration': '150ms' },
        '.duration-200': { 'animation-duration': '200ms' },
        '.duration-300': { 'animation-duration': '300ms' },
        // Safe-area padding for mobile
        '.pb-safe': { 'padding-bottom': 'env(safe-area-inset-bottom)' },
        '.pt-safe': { 'padding-top': 'env(safe-area-inset-top)' },
        // Backface visibility (for flip animations)
        '.backface-hidden': { 'backface-visibility': 'hidden' },
        // Text rendering
        '.text-rendering-optimize': { 'text-rendering': 'optimizeLegibility' },
        // Touch action
        '.touch-pan-x': { 'touch-action': 'pan-x' },
        '.touch-pan-y': { 'touch-action': 'pan-y' },
        '.touch-none':  { 'touch-action': 'none' },
      });
    },
  ],
};

export default config;
