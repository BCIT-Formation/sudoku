import './globals.css';
import SwRegister from './sw-register';

export const metadata = {
  title: 'Generateur de Sudoku',
  description:
    'Generez et exportez des grilles de sudoku en PDF. Fonctionne entierement dans le navigateur, sans connexion internet.',
  manifest: '/manifest.webmanifest',
};

export const viewport = {
  themeColor: '#1e1b4b',
};

export default function RootLayout({ children }) {
  return (
    <html lang="fr">
      <body>
        {children}
        <SwRegister />
      </body>
    </html>
  );
}
