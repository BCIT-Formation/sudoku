/**
 * Unit tests for lib/sudoku.js
 * Uses the Node.js built-in test runner (node:test) — zero extra dependencies.
 * Run with: npm test
 */

import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import {
  generateSudoku,
  getDifficultyLabel,
  countSolutions,
  analyzePuzzle,
  ratePuzzle,
  MAX_SOLVER_ITERATIONS,
} from '../lib/sudoku.js';

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

  test('difficulty 10 removes up to ~58 cells while staying uniquely solvable', () => {
    const { puzzle } = generateSudoku(10);
    const empty = countEmpty(puzzle);
    // 58 is the target upper bound; uniqueness checking may keep a few extra clues
    assert.ok(empty >= 48 && empty <= 58, `Expected 48-58 empty for diff 10, got ${empty}`);
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

  test('puzzle has exactly one solution', () => {
    [1, 5, 10].forEach((d) => {
      const { puzzle } = generateSudoku(d);
      const copy = puzzle.map((row) => [...row]);
      assert.strictEqual(
        countSolutions(copy, 2),
        1,
        `Puzzle at difficulty ${d} must have exactly one solution`
      );
    });
  });
});

// ─── countSolutions ───────────────────────────────────────────────────────────

describe('countSolutions', () => {
  test('a solved board has exactly one solution', () => {
    const { solution } = generateSudoku(5);
    assert.strictEqual(countSolutions(solution.map((r) => [...r]), 2), 1);
  });

  test('an empty board has multiple solutions (early exit at limit)', () => {
    const empty = Array.from({ length: 9 }, () => new Array(9).fill(0));
    assert.strictEqual(countSolutions(empty, 2), 2);
  });

  test('an unsolvable board has zero solutions', () => {
    const board = Array.from({ length: 9 }, () => new Array(9).fill(0));
    // Row 0 holds 1-8; the 9 in the same column blocks the last cell entirely
    board[0] = [1, 2, 3, 4, 5, 6, 7, 8, 0];
    board[1][8] = 9;
    assert.strictEqual(countSolutions(board, 2), 0);
  });

  test('does not mutate the input board', () => {
    const { puzzle } = generateSudoku(5);
    const copy = puzzle.map((row) => [...row]);
    countSolutions(puzzle, 2);
    assert.deepStrictEqual(puzzle, copy, 'countSolutions must leave the board unchanged');
  });

  test('respects the iteration budget on an empty board', () => {
    const empty = Array.from({ length: 9 }, () => new Array(9).fill(0));
    const budget = { iterations: 0, max: 10, exceeded: false };
    countSolutions(empty, 1000, budget);
    assert.ok(budget.exceeded, 'Tiny budget must be marked exceeded');
    assert.ok(budget.iterations <= 11, 'Search must stop right after the budget is exhausted');
  });
});

// ─── seeded generation ────────────────────────────────────────────────────────

describe('generateSudoku with seed', () => {
  test('same seed produces identical puzzle and solution', () => {
    const a = generateSudoku(6, 'classroom-42');
    const b = generateSudoku(6, 'classroom-42');
    assert.deepStrictEqual(a.puzzle, b.puzzle);
    assert.deepStrictEqual(a.solution, b.solution);
  });

  test('different seeds produce different puzzles', () => {
    const a = generateSudoku(6, 'seed-a');
    const b = generateSudoku(6, 'seed-b');
    const same = a.puzzle.flat().every((v, i) => v === b.puzzle.flat()[i]);
    assert.ok(!same, 'Different seeds should produce different puzzles');
  });

  test('numeric seeds are accepted', () => {
    const a = generateSudoku(4, 12345);
    const b = generateSudoku(4, 12345);
    assert.deepStrictEqual(a.puzzle, b.puzzle);
  });

  test('empty-string seed falls back to random generation', () => {
    const a = generateSudoku(5, '');
    const b = generateSudoku(5, '');
    const same = a.puzzle.flat().every((v, i) => v === b.puzzle.flat()[i]);
    assert.ok(!same, 'Empty seed must not be treated as a fixed seed');
  });
});

// ─── solver guard ─────────────────────────────────────────────────────────────

describe('solver iteration guard', () => {
  test('MAX_SOLVER_ITERATIONS is a sane positive integer', () => {
    assert.ok(Number.isInteger(MAX_SOLVER_ITERATIONS));
    assert.ok(MAX_SOLVER_ITERATIONS > 1000);
  });

  test('normal generation completes well within the budget', () => {
    // Would throw 'solver iteration budget exhausted' if the guard tripped
    assert.doesNotThrow(() => generateSudoku(10));
  });
});

// ─── Difficulty heuristic ─────────────────────────────────────────────────────

describe('difficulty heuristic', () => {
  test('analyzePuzzle solves a single missing cell via a naked single', () => {
    const { solution } = generateSudoku(1, 'heuristic-test');
    const puzzle = solution.map((row) => [...row]);
    puzzle[4][4] = 0;

    const report = analyzePuzzle(puzzle);
    assert.strictEqual(report.solvedByLogic, true);
    assert.strictEqual(report.nakedSingles, 1);
    assert.strictEqual(report.hiddenSingles, 0);
  });

  test('analyzePuzzle does not mutate the input puzzle', () => {
    const { puzzle } = generateSudoku(5, 'heuristic-mutate');
    const snapshot = JSON.stringify(puzzle);
    analyzePuzzle(puzzle);
    assert.strictEqual(JSON.stringify(puzzle), snapshot);
  });

  test('ratePuzzle returns an integer between 1 and 10', () => {
    for (const d of [1, 5, 10]) {
      const rating = ratePuzzle(generateSudoku(d).puzzle);
      assert.ok(Number.isInteger(rating), `rating ${rating} should be an integer`);
      assert.ok(rating >= 1 && rating <= 10, `rating ${rating} out of range`);
    }
  });

  test('easy puzzles rate easy, expert puzzles rate hard', () => {
    assert.ok(ratePuzzle(generateSudoku(1).puzzle) <= 4);
    assert.ok(ratePuzzle(generateSudoku(10).puzzle) >= 6);
  });

  test('generateSudoku attaches the qualitative rating to its result', () => {
    const result = generateSudoku(5);
    assert.ok(Number.isInteger(result.rating));
    assert.ok(result.rating >= 1 && result.rating <= 10);
  });

  test('felt rating stays close to the requested difficulty', () => {
    for (const d of [1, 5, 10]) {
      const { rating } = generateSudoku(d);
      assert.ok(
        Math.abs(rating - d) <= 3,
        `difficulty ${d} produced a rating of ${rating}`
      );
    }
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
