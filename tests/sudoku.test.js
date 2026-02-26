/**
 * Unit tests for lib/sudoku.js
 * Uses the Node.js built-in test runner (node:test) — zero extra dependencies.
 * Run with: npm test
 */

import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { generateSudoku, getDifficultyLabel } from '../lib/sudoku.js';

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Validates that a 9x9 board is a fully-solved, legal sudoku. */
function isCompleteAndValid(board) {
  for (let i = 0; i < 9; i++) {
    // Each row must contain exactly 1–9
    const row = new Set(board[i]);
    if (row.size !== 9 || !row.has(1) || !row.has(9)) return false;
    for (const v of row) if (v < 1 || v > 9) return false;

    // Each column must contain exactly 1–9
    const col = new Set(board.map((r) => r[i]));
    if (col.size !== 9) return false;
  }
  // Each 3x3 box must contain exactly 1–9
  for (let br = 0; br < 3; br++) {
    for (let bc = 0; bc < 3; bc++) {
      const box = new Set();
      for (let r = br * 3; r < br * 3 + 3; r++) {
        for (let c = bc * 3; c < bc * 3 + 3; c++) {
          box.add(board[r][c]);
        }
      }
      if (box.size !== 9) return false;
    }
  }
  return true;
}

const countEmpty = (puzzle) => puzzle.flat().filter((c) => c === 0).length;

// ─── generateSudoku ───────────────────────────────────────────────────────────

describe('generateSudoku', () => {
  test('returns an object with puzzle and solution arrays', () => {
    const result = generateSudoku(5);
    assert.ok(result && typeof result === 'object', 'Must return an object');
    assert.ok(Array.isArray(result.puzzle), 'puzzle must be an array');
    assert.ok(Array.isArray(result.solution), 'solution must be an array');
  });

  test('puzzle and solution are 9x9 grids', () => {
    const { puzzle, solution } = generateSudoku(5);
    assert.strictEqual(puzzle.length, 9);
    assert.strictEqual(solution.length, 9);
    puzzle.forEach((row) => assert.strictEqual(row.length, 9));
    solution.forEach((row) => assert.strictEqual(row.length, 9));
  });

  test('solution is a valid complete sudoku board', () => {
    const { solution } = generateSudoku(3);
    assert.ok(isCompleteAndValid(solution), 'Solution must be a fully valid sudoku board');
  });

  test('solution is valid for multiple difficulty levels', () => {
    [1, 5, 10].forEach((d) => {
      const { solution } = generateSudoku(d);
      assert.ok(isCompleteAndValid(solution), `Solution invalid for difficulty ${d}`);
    });
  });

  test('non-empty puzzle cells match the corresponding solution cells', () => {
    const { puzzle, solution } = generateSudoku(5);
    for (let r = 0; r < 9; r++) {
      for (let c = 0; c < 9; c++) {
        if (puzzle[r][c] !== 0) {
          assert.strictEqual(
            puzzle[r][c],
            solution[r][c],
            `Mismatch at [${r}][${c}]: puzzle=${puzzle[r][c]}, solution=${solution[r][c]}`
          );
        }
      }
    }
  });

  test('difficulty 1 has fewer empty cells than difficulty 10', () => {
    const easy = generateSudoku(1);
    const hard = generateSudoku(10);
    assert.ok(
      countEmpty(easy.puzzle) < countEmpty(hard.puzzle),
      `Easy should have fewer empty cells than hard`
    );
  });

  test('difficulty 1 removes approximately 25 cells (±3)', () => {
    const { puzzle } = generateSudoku(1);
    const empty = countEmpty(puzzle);
    assert.ok(empty >= 22 && empty <= 28, `Expected ~25 empty for diff 1, got ${empty}`);
  });

  test('difficulty 10 removes approximately 58 cells (±3)', () => {
    const { puzzle } = generateSudoku(10);
    const empty = countEmpty(puzzle);
    assert.ok(empty >= 55 && empty <= 61, `Expected ~58 empty for diff 10, got ${empty}`);
  });

  test('all cell values in puzzle are integers between 0 and 9', () => {
    const { puzzle } = generateSudoku(5);
    puzzle.flat().forEach((v) => {
      assert.ok(Number.isInteger(v), `Non-integer value: ${v}`);
      assert.ok(v >= 0 && v <= 9, `Out-of-range value: ${v}`);
    });
  });

  test('all cell values in solution are integers between 1 and 9', () => {
    const { solution } = generateSudoku(5);
    solution.flat().forEach((v) => {
      assert.ok(Number.isInteger(v), `Non-integer value: ${v}`);
      assert.ok(v >= 1 && v <= 9, `Out-of-range or zero value in solution: ${v}`);
    });
  });

  test('two consecutive calls produce different puzzles', () => {
    const a = generateSudoku(5);
    const b = generateSudoku(5);
    const same = a.puzzle.flat().every((v, i) => v === b.puzzle.flat()[i]);
    assert.ok(!same, 'Two calls should produce different puzzles (randomised)');
  });
});

// ─── getDifficultyLabel ───────────────────────────────────────────────────────

describe('getDifficultyLabel', () => {
  const expected = [
    [1, 'Tres facile'],
    [2, 'Tres facile'],
    [3, 'Facile'],
    [4, 'Facile'],
    [5, 'Moyen'],
    [6, 'Moyen'],
    [7, 'Difficile'],
    [8, 'Difficile'],
    [9, 'Tres difficile'],
    [10, 'Expert'],
  ];

  for (const [d, label] of expected) {
    test(`difficulty ${d} returns "${label}"`, () => {
      assert.strictEqual(getDifficultyLabel(d), label);
    });
  }
});
