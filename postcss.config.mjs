// Tailwind v4: PostCSS plugin moved to @tailwindcss/postcss
// autoprefixer is now bundled inside Tailwind v4 — no longer needed separately
const config = {
  plugins: {
    '@tailwindcss/postcss': {},
  },
};

export default config;
