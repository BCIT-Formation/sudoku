import nextConfig from 'eslint-config-next';

export default [
  // Ignore generated and third-party directories
  {
    ignores: ['.next/**', 'node_modules/**', 'out/**'],
  },
  // Next.js recommended rules (ESLint 9 flat config)
  // Note: eslint-config-next@16 declares support for >=9 but the bundled
  // plugins are not yet compatible with ESLint 10 (addGlobals API mismatch).
  // ESLint is pinned to ^9 until the ecosystem catches up.
  ...nextConfig,
];
