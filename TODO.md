# TODO — Generateur de Sudoku

> Derniere mise a jour : 2026-07-25

---

## Critique — Bugs, securite, donnees manquantes

- [x] **Peer-dep React/react-dom** : conflit ERESOLVE sur Vercel — corrige en passant react + react-dom a `^19` (2026-03-02).
- [x] **CSP manquante** : aucun header Content-Security-Policy — corrige via `next.config.mjs` (2026-03-02).
- [x] **Bugs workflows CI/CD** : release.yml (PR URL mal formee), security.yml (job orphelin), pr-check.yml (sentinel job trompeur) — corriges (2026-03-02).
- [x] **Unicite de la solution non garantie** : l'algorithme retire des cellules aleatoirement sans verifier que la grille resultante a une solution unique. Un puzzle valide doit avoir exactement une solution. Implementer une verification post-suppression via un second appel au solveur avec detection de solutions multiples. — corrige via `countSolutions` dans `lib/sudoku.js` (2026-07-25).
- [x] **Blocage de l'UI pour 50+ grilles** : la generation est synchrone sur le thread principal. Pour gridCount > ~20, l'interface se fige plusieurs secondes. Utiliser un Web Worker ou un generateur asynchrone par chunks. — corrige via generation asynchrone par chunks dans `useGridGenerator` (2026-07-25).
- [ ] **Aucun test de composant React** : `app/page.js` n'est pas couvert par les tests. Ajouter des tests de composant avec `@testing-library/react` si la couverture devient un critere CI bloquant.

---

## Important — Refactoring, DX, qualite

- [x] **Accessibilite (a11y)** : les cellules de la grille HTML n'ont pas de roles ARIA. Ajouter `role="grid"`, `role="row"`, `role="gridcell"`, et des labels pour les lecteurs d'ecran. — fait (2026-07-25).
- [x] **Mode impression natif** : ajouter une feuille de style `@media print` dans `globals.css` pour permettre Ctrl+P directement depuis l'apercu, sans passer par jsPDF. Les deux modes seraient complementaires. — fait (2026-07-25).
- [x] **Separations de responsabilites** : `app/page.js` melange logique metier (comptage de grilles, validation) et UI. Extraire la logique dans un hook custom `useGridGenerator`. — fait, voir `app/hooks/useGridGenerator.js` (2026-07-25).
- [x] **Scores de difficulte plus precis** : la difficulte actuelle est basee sur le nombre de cellules retirees (metrique quantitative). Integrer une heuristique qualitative (nombre de cases singletons, paires nues, etc.) pour calibrer le ressenti utilisateur. Fait via `analyzePuzzle`/`ratePuzzle` (singletons nus + caches) dans `lib/sudoku.js` (2026-07-25).
- [x] **Internationalisation** : le texte est en francais hardcode dans les composants. Preparer la structure i18n (meme minimale) pour faciliter une traduction future. — structure minimale dans `lib/i18n.js` (2026-07-25).
- [x] **Timeout sur le solveur** : si le backtracking venait a boucler (cas degenere), il n'y a pas de garde-fou. Ajouter un compteur d'iterations max avec fallback. — fait via `MAX_SOLVER_ITERATIONS` (2026-07-25).

---

## Nice to have — Performances, features, UX

- [x] **Grille jouable** : rendre les cellules vides editables dans le navigateur, avec validation en temps reel (couleur rouge si doublon) et bouton "Verifier". Fait (2026-07-25).
- [x] **Export PNG** : permettre l'export d'une grille individuelle en image PNG via Canvas ou html2canvas. Fait via Canvas natif (`drawGridOnCanvas`), sans dependance (2026-07-25).
- [x] **Historique** : sauvegarder les 10 dernieres generations dans `localStorage` pour y revenir sans regenerer. Fait (2026-07-25).
- [x] **QR code** : imprimer un QR code sur chaque grille (encodant la solution) pour permettre la verification sans internet. Fait, option du PDF via `qrcode-generator` charge a la demande (2026-07-25).
- [x] **Personnalisation PDF** : choix de la police, couleur des nombres, format papier (Letter US en plus de A4), nombre de grilles par page (1 ou 2). Fait (2026-07-25).
- [x] **Progressive Web App (PWA)** : ajouter un `manifest.json` et un Service Worker pour installation sur mobile et utilisation hors-ligne certifiee. Fait : `public/manifest.webmanifest` + `public/sw.js` (2026-07-25).
- [x] **Mode sombre** : toggle dark/light theme persistant via `localStorage`. Fait (2026-07-25).
- [x] **Seed de generation** : permettre de saisir un seed pour reproduire une serie de grilles identiques (utile pour les enseignants qui veulent reediter le meme exercice). — fait, champ seed optionnel + PRNG deterministe (2026-07-25).
