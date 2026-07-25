'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { generateSudoku } from '@/lib/sudoku';

const HISTORY_KEY = 'sudoku.history.v1';
const HISTORY_MAX = 10;

/** Encode a 9x9 board as a compact 81-character string. */
function encodeBoard(board) {
  return board.flat().join('');
}

/** Decode an 81-character string back into a 9x9 board. */
function decodeBoard(str) {
  return Array.from({ length: 9 }, (_, r) =>
    Array.from({ length: 9 }, (_, c) => Number(str[r * 9 + c]))
  );
}

function readHistory() {
  try {
    const raw = localStorage.getItem(HISTORY_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return []; // corrupted or unavailable storage — start fresh
  }
}

function writeHistory(entries) {
  try {
    localStorage.setItem(HISTORY_KEY, JSON.stringify(entries));
  } catch {
    // Quota exceeded or storage disabled — history is best-effort only
  }
}

/**
 * useGridGenerator — owns the grid-generation business logic so app/page.js
 * stays a pure view layer.
 *
 * Generation is asynchronous and chunked: the loop yields back to the event
 * loop between grids, so the browser can repaint and the UI never freezes,
 * even for 99 grids (the old implementation ran the whole loop synchronously
 * and blocked the main thread for several seconds past ~20 grids).
 *
 * When a seed is provided, each grid derives its own sub-seed (`seed#index`)
 * so the series is fully reproducible without every grid being identical.
 *
 * The last HISTORY_MAX generations are persisted to localStorage (boards are
 * stored as compact 81-character strings) and can be reloaded with restore().
 */
export function useGridGenerator() {
  const [grids, setGrids] = useState([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedCount, setGeneratedCount] = useState(0);
  const [history, setHistory] = useState([]);
  // Monotonic id: lets a newer run invalidate an in-flight older one
  const runIdRef = useRef(0);

  // localStorage is browser-only — hydrate the history after mount
  useEffect(() => {
    setHistory(readHistory());
  }, []);

  const generate = useCallback(async (difficulty, gridCount, seed = '') => {
    const runId = ++runIdRef.current;
    setIsGenerating(true);
    setGeneratedCount(0);

    const result = [];
    try {
      for (let i = 0; i < gridCount; i++) {
        // Yield to the event loop so React can repaint between grids
        await new Promise((resolve) => setTimeout(resolve, 0));
        if (runIdRef.current !== runId) return; // superseded by a newer run

        const gridSeed = seed ? `${seed}#${i}` : undefined;
        result.push(generateSudoku(difficulty, gridSeed));
        setGeneratedCount(i + 1);
      }
      setGrids(result);

      // Record the generation in the history (most recent first)
      const entry = {
        id: Date.now(),
        date: new Date().toISOString(),
        difficulty,
        gridCount,
        seed,
        grids: result.map((g) => ({ p: encodeBoard(g.puzzle), s: encodeBoard(g.solution) })),
      };
      setHistory((prev) => {
        const next = [entry, ...prev].slice(0, HISTORY_MAX);
        writeHistory(next);
        return next;
      });
    } finally {
      if (runIdRef.current === runId) setIsGenerating(false);
    }
  }, []);

  /** Reload a past generation from a history entry. */
  const restore = useCallback((entry) => {
    runIdRef.current++; // cancel any in-flight generation
    setIsGenerating(false);
    setGrids(entry.grids.map((g) => ({ puzzle: decodeBoard(g.p), solution: decodeBoard(g.s) })));
  }, []);

  const clearHistory = useCallback(() => {
    setHistory([]);
    writeHistory([]);
  }, []);

  return { grids, isGenerating, generatedCount, generate, history, restore, clearHistory };
}
