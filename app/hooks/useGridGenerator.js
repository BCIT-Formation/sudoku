'use client';

import { useState, useCallback, useRef } from 'react';
import { generateSudoku } from '@/lib/sudoku';

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
 */
export function useGridGenerator() {
  const [grids, setGrids] = useState([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedCount, setGeneratedCount] = useState(0);
  // Monotonic id: lets a newer run invalidate an in-flight older one
  const runIdRef = useRef(0);

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
    } finally {
      if (runIdRef.current === runId) setIsGenerating(false);
    }
  }, []);

  return { grids, isGenerating, generatedCount, generate };
}
