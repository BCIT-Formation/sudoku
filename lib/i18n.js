/**
 * Minimal i18n structure — no dependency, no framework.
 *
 * All user-facing strings live in one catalog per locale. Adding a language
 * means copying the `fr` block, translating the values, and switching
 * DEFAULT_LOCALE (or wiring a runtime locale picker later).
 *
 * Placeholders use single braces: t('preview.title', { count: 4 })
 * replaces every `{count}` occurrence. The special `{plural}` placeholder
 * is filled with 's' when params.count > 1 (French pluralisation).
 */

export const DEFAULT_LOCALE = 'fr';

export const messages = {
  fr: {
    // Header
    'app.title': 'Generateur de Sudoku',
    'app.tagline': 'Generation et export PDF — 100 % dans le navigateur, aucune connexion requise',

    // Controls
    'controls.difficulty': 'Difficulte',
    'controls.difficulty.min': '1 - Tres facile',
    'controls.difficulty.max': '10 - Expert',
    'controls.gridCount': 'Nombre de grilles',
    'controls.gridCount.hint': 'Entre 1 et 99 grilles',
    'controls.gridCount.decrease': 'Diminuer le nombre de grilles',
    'controls.gridCount.increase': 'Augmenter le nombre de grilles',
    'controls.seed': 'Seed (optionnel)',
    'controls.seed.placeholder': 'ex: exercice-2026-s12',
    'controls.seed.hint': 'Le meme seed regenere exactement les memes grilles',
    'controls.includeSolutions': 'Inclure les solutions a la fin du PDF',
    'controls.generate': 'Generer {count} grille{plural}',
    'controls.generating': 'Generation... ({done}/{count})',
    'controls.export': 'Exporter {count} grille{plural} en PDF',
    'controls.exporting': 'Export en cours...',

    // PDF options
    'controls.pdfOptions': 'Options du PDF',
    'controls.paper': 'Format papier',
    'controls.paper.a4': 'A4 (210 x 297 mm)',
    'controls.paper.letter': 'Letter US (216 x 279 mm)',
    'controls.gridsPerPage': 'Grilles par page',
    'controls.font': 'Police des chiffres',
    'controls.numberColor': 'Couleur des chiffres',
    'controls.includeQR': 'Imprimer un QR code de la solution sur chaque grille',

    // Theme
    'theme.toLight': 'Mode clair',
    'theme.toDark': 'Mode sombre',
    'theme.toggle': 'Basculer entre le mode clair et le mode sombre',

    // Export progress
    'export.loadingLib': 'Chargement de la librairie PDF...',
    'export.generatingPages': 'Generation des pages...',
    'export.downloading': 'Telechargement...',
    'export.error': 'Erreur lors de la generation du PDF. Verifiez la console pour les details.',

    // Preview
    'preview.title': 'Apercu',
    'preview.count': '({count} grille{plural} generee{plural})',
    'preview.hidden': '+ {count} grille{plural} dans le PDF',
    'preview.hiddenNote':
      'Seules les 20 premieres grilles sont affichees — toutes les {count} grilles seront dans le PDF.',

    // Grid card
    'grid.title': 'Grille #{number}',
    'grid.difficulty': 'Difficulte {value}/10 — {label}',
    'grid.aria': 'Grille de sudoku numero {number}, difficulte {value} sur 10',
    'grid.cell.empty': 'Ligne {row}, colonne {col}, vide',
    'grid.cell.value': 'Ligne {row}, colonne {col}, valeur {value}',
    'grid.cell.input': 'Ligne {row}, colonne {col}, saisir un chiffre',

    // Playable grid
    'play.verify': 'Verifier',
    'play.reset': 'Effacer',
    'play.solved': 'Bravo, grille resolue !',
    'play.result': 'Correctes : {correct} / Erreurs : {wrong}',
    'play.empty': 'Aucune case remplie.',

    // PNG export
    'png.export': 'PNG',
    'png.aria': 'Exporter la grille {number} en image PNG',
    'png.filename': 'sudoku-grille-{number}.png',

    // History
    'history.title': 'Historique',
    'history.subtitle': 'Les {count} dernieres generations sont conservees dans ce navigateur.',
    'history.entry': '{count} grille{plural}, difficulte {value}/10',
    'history.seed': 'seed : {seed}',
    'history.restore': 'Recharger',
    'history.clear': "Effacer l'historique",

    // Empty state
    'empty.instruction': 'Choisissez votre difficulte et le nombre de grilles,',
    'empty.instruction2': 'puis cliquez sur Generer.',
    'empty.offline': 'Tout fonctionne dans le navigateur — aucune connexion internet necessaire.',

    // PDF content
    'pdf.gridHeader': 'Grille #{number}   |   Difficulte : {value}/10 — {label}',
    'pdf.solutions': 'Solutions',
    'pdf.solutionsContinued': 'Solutions (suite)',
    'pdf.solutionLabel': 'Solution #{number}',
    'pdf.qrLabel': 'Solution',
    'pdf.filename': 'sudoku-{count}-grilles-diff{value}.pdf',

    // Footer
    'footer.note': 'Generateur de Sudoku — fonctionne entierement hors ligne apres le premier chargement',
  },
};

/**
 * Translate a key for the current locale, interpolating {placeholders}.
 *
 * @param {string} key             - catalog key, e.g. 'controls.generate'
 * @param {object} [params]        - placeholder values; `count` also drives {plural}
 * @param {string} [locale]        - override locale (defaults to DEFAULT_LOCALE)
 * @returns {string}
 */
export function t(key, params = {}, locale = DEFAULT_LOCALE) {
  const catalog = messages[locale] ?? messages[DEFAULT_LOCALE];
  let str = catalog[key];
  if (str === undefined) return key; // fail soft: show the key, never crash the UI

  if (typeof params.count === 'number') {
    str = str.replaceAll('{plural}', params.count > 1 ? 's' : '');
  }
  for (const [name, value] of Object.entries(params)) {
    str = str.replaceAll(`{${name}}`, String(value));
  }
  return str;
}
