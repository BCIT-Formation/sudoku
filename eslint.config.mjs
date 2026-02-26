import nextConfig from 'eslint-config-next';

export default [
  // Ignore generated and third-party directories
  {
    ignores: ['.next/**', 'node_modules/**', 'out/**'],
  },
  // Next.js recommended rules (ESLint 9 flat config array)
  ...nextConfig,
];
