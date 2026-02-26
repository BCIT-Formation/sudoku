/**
 * Sudoku generator with difficulty control (1-10).
 * Runs entirely in the browser - no server or internet required.
 */

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
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

/**
 * Backtracking solver.
 * When shuffleNums=true it randomises candidate order → random valid board.
 */
function solve(board, shuffleNums = false) {
  for (let i = 0; i < 81; i++) {
    const r = Math.floor(i / 9);
    const c = i % 9;
    if (board[r][c] !== 0) continue;

    const nums = shuffleNums ? shuffle([1, 2, 3, 4, 5, 6, 7, 8, 9]) : [1, 2, 3, 4, 5, 6, 7, 8, 9];
    for (const n of nums) {
      if (isValid(board, r, c, n)) {
        board[r][c] = n;
        if (solve(board, shuffleNums)) return true;
        board[r][c] = 0;
      }
    }
    return false; // no valid number found → backtrack
  }
  return true; // all cells filled
}

/**
 * Generate a sudoku puzzle + its solution for a given difficulty (1-10).
 *
 * Difficulty mapping (cells removed out of 81):
 *   1 → ~25  (56 clues — very easy)
 *   5 → ~40  (41 clues — medium)
 *  10 → ~58  (23 clues — expert)
 *
 * Formula: toRemove = round(25 + (difficulty - 1) * 3.67)
 */
export function generateSudoku(difficulty) {
  // Build a fully-solved board
  const board = Array.from({ length: 9 }, () => new Array(9).fill(0));
  solve(board, true);
  const solution = board.map((row) => [...row]);

  // Remove cells proportional to difficulty
  const toRemove = Math.round(25 + (difficulty - 1) * 3.67);
  const positions = shuffle(Array.from({ length: 81 }, (_, i) => i));

  const puzzle = solution.map((row) => [...row]);
  for (let i = 0; i < toRemove; i++) {
    const idx = positions[i];
    puzzle[Math.floor(idx / 9)][idx % 9] = 0;
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
