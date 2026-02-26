import './globals.css';

export const metadata = {
  title: 'Generateur de Sudoku',
  description:
    'Generez et exportez des grilles de sudoku en PDF. Fonctionne entierement dans le navigateur, sans connexion internet.',
};

export default function RootLayout({ children }) {
  return (
    <html lang="fr">
      <body>{children}</body>
    </html>
  );
}
