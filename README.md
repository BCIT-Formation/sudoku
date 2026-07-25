# Generateur de Sudoku

<!-- workflow-badges:start -->

[![CI](https://github.com/BCIT-Formation/sudoku/actions/workflows/ci.yml/badge.svg)](https://github.com/BCIT-Formation/sudoku/actions/workflows/ci.yml)
[![Claude Auto-merge](https://github.com/BCIT-Formation/sudoku/actions/workflows/claude-auto-merge.yml/badge.svg)](https://github.com/BCIT-Formation/sudoku/actions/workflows/claude-auto-merge.yml)
[![Dependabot auto-merge](https://github.com/BCIT-Formation/sudoku/actions/workflows/dependabot-auto-merge.yml/badge.svg)](https://github.com/BCIT-Formation/sudoku/actions/workflows/dependabot-auto-merge.yml)
[![PR Check](https://github.com/BCIT-Formation/sudoku/actions/workflows/pr-check.yml/badge.svg)](https://github.com/BCIT-Formation/sudoku/actions/workflows/pr-check.yml)
[![Release](https://github.com/BCIT-Formation/sudoku/actions/workflows/release.yml/badge.svg)](https://github.com/BCIT-Formation/sudoku/actions/workflows/release.yml)
[![Security](https://github.com/BCIT-Formation/sudoku/actions/workflows/security.yml/badge.svg)](https://github.com/BCIT-Formation/sudoku/actions/workflows/security.yml)

<!-- workflow-badges:end -->

[![CI](https://github.com/BCIT-Formation/sudoku/actions/workflows/ci.yml/badge.svg)](https://github.com/BCIT-Formation/sudoku/actions/workflows/ci.yml)
[![Release](https://github.com/BCIT-Formation/sudoku/actions/workflows/release.yml/badge.svg)](https://github.com/BCIT-Formation/sudoku/actions/workflows/release.yml)
[![Security](https://github.com/BCIT-Formation/sudoku/actions/workflows/security.yml/badge.svg)](https://github.com/BCIT-Formation/sudoku/actions/workflows/security.yml)

Application web de generation de grilles de sudoku, exportables en PDF pour impression.
Fonctionne **entierement dans le navigateur** — aucune connexion internet requise apres le premier chargement.

---

## Fonctionnalites

- **Generation aleatoire** de 1 a 99 grilles par lot, asynchrone (l'UI ne se fige pas)
- **Solution unique garantie** : chaque cellule retiree est validee par un second passage du solveur
- **Seed optionnel** : le meme seed regenere exactement les memes grilles
- **Difficulte reglable** de 1 (Tres facile) a 10 (Expert)
- **Export PDF** A4 — 2 grilles par page, mise en page optimisee pour l'impression
- **Solutions optionnelles** en fin de PDF (4 par page)
- **Apercu en direct** des 20 premieres grilles dans le navigateur
- **Impression native** : CSS `@media print` pour imprimer l'apercu via Ctrl+P, en complement du PDF
- **100 % client-side** — Next.js + React, aucun appel serveur, aucune donnee utilisateur collectee
- **PDF genere localement** via jsPDF (charge dynamiquement uniquement au clic)

---

## Architecture

```
sudoku/
├── app/                        # Next.js App Router
│   ├── layout.js               # Metadata, import CSS global
│   ├── page.js                 # UI principale (client component)
│   ├── globals.css             # Tailwind v4 + slider custom + CSS impression
│   └── hooks/
│       └── useGridGenerator.js # Hook de generation asynchrone par chunks
├── lib/
│   ├── sudoku.js               # Algorithme generateur + rendu PDF
│   └── i18n.js                 # Catalogue de chaines (structure i18n minimale)
├── tests/
│   └── sudoku.test.js          # Tests unitaires (node:test natif)
├── .github/
│   ├── CODEOWNERS              # Proprietaires du code
│   ├── dependabot.yml          # Mises a jour auto des dependances
│   └── workflows/
│       ├── ci.yml              # Lint → Test → Build sur chaque push/PR
│       ├── release.yml         # Release automatique via release-please
│       ├── pr-check.yml        # Validation titre PR (Conventional Commits)
│       ├── security.yml        # npm audit + CodeQL (hebdomadaire)
│       ├── claude-auto-merge.yml  # Auto-approve/merge des PRs Claude
│       └── dependabot-auto-merge.yml  # Auto-merge des PRs Dependabot
├── release-please-config.json  # Configuration release-please
├── .release-please-manifest.json  # Version actuelle trackee par release-please
├── jsconfig.json               # Alias de chemins (@/*)
├── next.config.mjs             # Configuration Next.js + headers HTTP securite
├── postcss.config.mjs          # Configuration PostCSS (@tailwindcss/postcss)
├── Dockerfile                  # Build Docker multi-stage (deps → builder → runner)
├── docker-compose.yml          # Compose de production
└── setup.sh                    # Installation + lint + test + build en une commande
```

### Algorithme Sudoku (lib/sudoku.js)

| Fonction | Role |
|---|---|
| `shuffle(arr, rng?)` | Fisher-Yates — melange aleatoire |
| `isValid(board, r, c, n)` | Verifie contraintes ligne/colonne/boite |
| `solve(board, shuffle?, budget?, rng?)` | Backtracking recursif (shuffle=true → generation aleatoire) |
| `countSolutions(board, limit?, budget?)` | Compte les solutions avec arret anticipe a `limit` |
| `generateSudoku(difficulty, seed?)` | Genere un puzzle a solution unique + sa solution |
| `getDifficultyLabel(d)` | Label lisible par l'humain |
| `drawGridOnPDF(doc, board, x, y, size)` | Dessin jsPDF d'une grille |

**Formule difficulte** : `cellules_retirees = round(25 + (difficulte - 1) * 3.67)`
- Difficulte 1 → 25 retirees (56 indices) — Tres facile
- Difficulte 5 → 40 retirees (41 indices) — Moyen
- Difficulte 10 → 58 retirees (23 indices) — Expert

Chaque suppression est validee par `countSolutions` : une cellule n'est retiree
que si la grille conserve exactement une solution. Aux difficultes elevees, le
nombre de cellules retirees est donc un objectif au mieux, jamais garanti.

---

## Prerequis

- **Node.js** 20 ou superieur (22 recommande)
- **npm** 10 ou superieur

---

## Installation

```bash
# Cloner le depot
git clone https://github.com/BCIT-Formation/sudoku.git
cd sudoku

# Installer les dependances
npm install

# Demarrer en mode developpement
npm run dev
```

Ouvrir [http://localhost:3000](http://localhost:3000) dans le navigateur.

---

## Scripts disponibles

| Commande | Description |
|---|---|
| `npm run dev` | Serveur de developpement (hot reload) |
| `npm run build` | Build de production |
| `npm start` | Serveur de production |
| `npm test` | Tests unitaires (node:test) |
| `npm run lint` | Lint ESLint via Next.js |

---

## Usage

1. Choisir la **difficulte** (curseur 1-10)
2. Definir le **nombre de grilles** (1 a 99, via le champ ou les boutons +/-)
3. Saisir un **seed** (optionnel) pour pouvoir regenerer les memes grilles a l'identique
4. Cocher **Inclure les solutions** si souhaite
5. Cliquer **Generer** — apercu immediat dans le navigateur
6. Cliquer **Exporter en PDF** — telechargement du fichier `sudoku-N-grilles-diffX.pdf`

### Utilisation hors-ligne

Apres le premier chargement, l'application fonctionne sans internet.
Pour un deploiement local permanent :

```bash
npm run build
npm start
# Ouvrir http://localhost:3000
```

---

## Variables d'environnement

Aucune variable d'environnement n'est requise.
Ce projet n'utilise pas de backend, base de donnees, ni service tiers.

Voir `.env.example` pour le template reserve aux futurs besoins.

---

## Deploiement Vercel

```bash
# Option 1 : via Vercel CLI
npm i -g vercel
vercel

# Option 2 : via Git
# Connecter le repo BCIT-Formation/sudoku a vercel.com
# Framework detecte automatiquement : Next.js
# Build command : npm run build
# Output directory : .next
```

---

## Contribution

### Workflow Git

```
main          <- production, proteges
develop       <- integration (optionnel)
feat/xxx      <- nouvelles fonctionnalites
fix/xxx       <- corrections de bugs
chore/xxx     <- maintenance
```

### Conventional Commits

Tous les commits et titres de PR doivent suivre le format :

```
<type>(<scope>): <description>

Types valides : feat | fix | docs | style | refactor | test | chore | perf | ci | build | revert
```

Exemples :
```
feat: add print preview mode
fix(pdf): correct grid alignment on A4
chore: update jspdf to v4.3
docs: add offline usage instructions
test: add edge cases for difficulty 10
```

### Protection de branche (a configurer manuellement sur GitHub)

Activer dans **Settings → Branches → Branch protection rules** pour `main` :

- [x] Require a pull request before merging
- [x] Require status checks to pass : `Lint · Test · Build` (ci.yml) + `PR checks passed` (pr-check.yml)
- [x] Do not allow bypassing the above settings
- [x] Restrict who can push to matching branches

### Auto-merge (PRs Claude et Dependabot)

Activer dans **Settings → General → Pull Requests** :

- [x] Allow auto-merge
- [x] Allow squash merging (par defaut)

Activer dans **Settings → Actions → General** :

- [x] Allow GitHub Actions to create and approve pull requests

Une fois ces reglages actifs :
- Les PRs des branches `claude/*` sont auto-approuvees et mergees des que la CI est verte.
- Les PRs Dependabot (patch/minor) sont auto-approuvees et mergees automatiquement.

---

## Ameliorations proposees

Le backlog complet et son etat d'avancement sont tenus a jour dans [TODO.md](TODO.md).
Principaux items ouverts :

### Priorite haute
- [ ] Tests de composant React pour `app/page.js` (`@testing-library/react`)
- [ ] Scores de difficulte qualitatifs (singletons, paires nues) en plus du nombre de cellules retirees

### Priorite moyenne
- [ ] Grilles jouables interactivement dans le navigateur
- [ ] Mode sombre / clair
- [ ] Export PNG par grille
- [ ] Historique des generations (localStorage)

### Nice to have
- [ ] Traductions supplementaires (EN, DE, ES) via la structure `lib/i18n.js` existante
- [ ] QR code imprime sur chaque grille (encodant la solution)
- [ ] Personnalisation police, couleur et format papier du PDF
- [ ] Progressive Web App (manifest + Service Worker)
