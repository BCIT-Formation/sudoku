/**
 * Sudoku generator with difficulty control (1-10).
 * Runs entirely in the browser - no server or internet required.
 */

/**
 * Safety guard for the backtracking solver: maximum number of solver
 * invocations (one per visited cell) before a run is aborted. A normal
 * generation uses a few thousand iterations; this ceiling only trips on
 * degenerate inputs and prevents an infinite-feeling freeze.
 */
export const MAX_SOLVER_ITERATIONS = 500000;

/** How many times generateSudoku retries when a solver budget is exhausted. */
const MAX_GENERATION_ATTEMPTS = 5;

/**
 * Deterministic PRNG (mulberry32). Returns a function compatible with
 * Math.random: () => number in [0, 1).
 */
function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Hash an arbitrary string seed into a 32-bit integer (FNV-1a). */
function hashSeed(str) {
  let h = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

/** Build a Math.random-compatible RNG from an optional seed. */
function createRng(seed) {
  if (seed === undefined || seed === null || seed === '') return Math.random;
  return mulberry32(hashSeed(String(seed)));
}

function shuffle(arr, rng = Math.random) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/**
 * Checks whether placing `num` at board[row][col] is valid.
 */
function isValid(board, row, col, num) {
  for (let x = 0; x < 9; x++) {
    // Check row
    if (board[row][x] === num) return false;
    // Check column
    if (board[x][col] === num) return false;
    // Check 3x3 box (clever index trick)
    const br = 3 * Math.floor(row / 3) + Math.floor(x / 3);
    const bc = 3 * Math.floor(col / 3) + (x % 3);
    if (board[br][bc] === num) return false;
  }
  return true;
}

/** Create a fresh iteration budget for one solver run. */
function createBudget(max = MAX_SOLVER_ITERATIONS) {
  return { iterations: 0, max, exceeded: false };
}

/** Consume one iteration; returns false when the budget is exhausted. */
function consume(budget) {
  if (!budget) return true;
  if (++budget.iterations > budget.max) {
    budget.exceeded = true;
    return false;
  }
  return true;
}

/**
 * Backtracking solver.
 * When shuffleNums=true it randomises candidate order → random valid board.
 * The optional `budget` (see createBudget) aborts runaway runs: when it is
 * exhausted the function returns false and budget.exceeded is set.
 */
function solve(board, shuffleNums = false, budget = null, rng = Math.random) {
  if (!consume(budget)) return false;

  for (let i = 0; i < 81; i++) {
    const r = Math.floor(i / 9);
    const c = i % 9;
    if (board[r][c] !== 0) continue;

    const nums = shuffleNums
      ? shuffle([1, 2, 3, 4, 5, 6, 7, 8, 9], rng)
      : [1, 2, 3, 4, 5, 6, 7, 8, 9];
    for (const n of nums) {
      if (isValid(board, r, c, n)) {
        board[r][c] = n;
        if (solve(board, shuffleNums, budget, rng)) return true;
        board[r][c] = 0;
        if (budget && budget.exceeded) return false;
      }
    }
    return false; // no valid number found → backtrack
  }
  return true; // all cells filled
}

/**
 * Count the solutions of a puzzle, stopping early at `limit`.
 * The board is left unmodified. Returns a number in [0, limit].
 *
 * @param {number[][]} board  - 9x9 array (0 = empty)
 * @param {number} limit      - stop counting once this many solutions are found
 * @param {object} [budget]   - optional iteration budget (see createBudget)
 */
export function countSolutions(board, limit = 2, budget = null) {
  let count = 0;

  function search() {
    if (!consume(budget)) return;

    for (let i = 0; i < 81; i++) {
      const r = Math.floor(i / 9);
      const c = i % 9;
      if (board[r][c] !== 0) continue;

      for (let n = 1; n <= 9; n++) {
        if (isValid(board, r, c, n)) {
          board[r][c] = n;
          search();
          board[r][c] = 0;
          if (count >= limit || (budget && budget.exceeded)) return;
        }
      }
      return; // empty cell with no candidate → dead end
    }
    count++; // all cells filled → one solution
  }

  search();
  return count;
}

/**
 * Generate a sudoku puzzle + its solution for a given difficulty (1-10).
 *
 * Difficulty mapping (cells removed out of 81, upper bound):
 *   1 → ~25  (56 clues — very easy)
 *   5 → ~40  (41 clues — medium)
 *  10 → ~58  (23 clues — expert)
 *
 * Formula: toRemove = round(25 + (difficulty - 1) * 3.67)
 *
 * Every removal is validated with a second solver pass (countSolutions):
 * a cell is only removed when the puzzle keeps exactly one solution, so the
 * returned puzzle is always uniquely solvable. At high difficulties the
 * target removal count is a best effort — removal stops when no more cells
 * can be taken out without breaking uniqueness.
 *
 * @param {number} difficulty     - 1 (very easy) to 10 (expert)
 * @param {string|number} [seed]  - optional seed for reproducible output;
 *                                  same seed + difficulty → same grid
 */
export function generateSudoku(difficulty, seed) {
  const rng = createRng(seed);

  for (let attempt = 0; attempt < MAX_GENERATION_ATTEMPTS; attempt++) {
    const result = tryGenerate(difficulty, rng);
    if (result) return result;
  }
  throw new Error('generateSudoku: solver iteration budget exhausted');
}

function tryGenerate(difficulty, rng) {
  // Build a fully-solved board
  const board = Array.from({ length: 9 }, () => new Array(9).fill(0));
  const fillBudget = createBudget();
  if (!solve(board, true, fillBudget, rng)) return null;

  const solution = board.map((row) => [...row]);

  // Remove cells proportional to difficulty, keeping the solution unique
  const toRemove = Math.round(25 + (difficulty - 1) * 3.67);
  const positions = shuffle(Array.from({ length: 81 }, (_, i) => i), rng);

  const puzzle = solution.map((row) => [...row]);
  let removed = 0;
  for (const idx of positions) {
    if (removed >= toRemove) break;

    const r = Math.floor(idx / 9);
    const c = idx % 9;
    const backup = puzzle[r][c];
    puzzle[r][c] = 0;

    const uniqueBudget = createBudget();
    const solutions = countSolutions(puzzle, 2, uniqueBudget);
    if (uniqueBudget.exceeded) {
      puzzle[r][c] = backup;
      return null; // degenerate case — retry from a fresh board
    }
    if (solutions === 1) {
      removed++;
    } else {
      puzzle[r][c] = backup; // removal broke uniqueness → keep the clue
    }
  }

  return { puzzle, solution };
}

/** Human-readable label for a difficulty level 1-10 */
export function getDifficultyLabel(d) {
  if (d <= 2) return 'Tres facile';
  if (d <= 4) return 'Facile';
  if (d <= 6) return 'Moyen';
  if (d <= 8) return 'Difficile';
  if (d === 9) return 'Tres difficile';
  return 'Expert';
}

/**
 * Draw one sudoku grid onto a jsPDF document.
 *
 * @param {jsPDF} doc
 * @param {number[][]} board  - 9x9 array (0 = empty)
 * @param {number} x         - left edge in mm
 * @param {number} y         - top edge in mm
 * @param {number} size      - grid width/height in mm (square)
 */
export function drawGridOnPDF(doc, board, x, y, size) {
  const cell = size / 9;

  // White background
  doc.setFillColor(255, 255, 255);
  doc.rect(x, y, size, size, 'F');

  // Numbers
  const fontSize = Math.max(8, Math.floor(cell * 0.55));
  doc.setFontSize(fontSize);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(30, 30, 30);

  for (let r = 0; r < 9; r++) {
    for (let c = 0; c < 9; c++) {
      if (board[r][c] !== 0) {
        const cx = x + c * cell + cell / 2;
        const cy = y + r * cell + cell / 2 + fontSize * 0.36;
        doc.text(String(board[r][c]), cx, cy, { align: 'center' });
      }
    }
  }

  // Grid lines (thin for cells, thick for boxes)
  for (let i = 0; i <= 9; i++) {
    const isBox = i % 3 === 0;
    doc.setLineWidth(isBox ? 0.9 : 0.25);
    doc.setDrawColor(isBox ? 0 : 160, isBox ? 0 : 160, isBox ? 0 : 160);
    doc.line(x, y + i * cell, x + size, y + i * cell); // horizontal
    doc.line(x + i * cell, y, x + i * cell, y + size); // vertical
  }
}
