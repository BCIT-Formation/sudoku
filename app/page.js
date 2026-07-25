'use client';

import { useState, useCallback } from 'react';
import { getDifficultyLabel, drawGridOnPDF } from '@/lib/sudoku';
import { t } from '@/lib/i18n';
import { useGridGenerator } from '@/app/hooks/useGridGenerator';

/* ─────────────────────────────────────────────────────────
   SudokuGrid – renders one puzzle as an accessible grid
───────────────────────────────────────────────────────── */
function SudokuGrid({ puzzle, index, difficulty }) {
  const CELL = 36; // px

  return (
    <div className="sudoku-card bg-white rounded-xl shadow-lg overflow-hidden">
      {/* Card header */}
      <div className="bg-indigo-50 border-b border-indigo-100 px-4 py-2 flex items-center justify-between">
        <span className="text-indigo-700 font-bold text-sm">
          {t('grid.title', { number: index + 1 })}
        </span>
        <span className="text-indigo-500 text-xs font-medium">
          {t('grid.difficulty', { value: difficulty, label: getDifficultyLabel(difficulty) })}
        </span>
      </div>

      {/* Grid */}
      <div className="p-3 flex justify-center">
        <div
          role="grid"
          aria-label={t('grid.aria', { number: index + 1, value: difficulty })}
          style={{ display: 'inline-block', border: '2.5px solid #1e293b' }}
        >
          {puzzle.map((row, r) => (
            <div key={r} role="row" style={{ display: 'flex' }}>
              {row.map((cell, c) => {
                const borderRight =
                  (c + 1) % 3 === 0 && c !== 8
                    ? '2.5px solid #1e293b'
                    : '1px solid #cbd5e1';
                const borderBottom =
                  (r + 1) % 3 === 0 && r !== 8
                    ? '2.5px solid #1e293b'
                    : '1px solid #cbd5e1';
                const cellLabel = cell
                  ? t('grid.cell.value', { row: r + 1, col: c + 1, value: cell })
                  : t('grid.cell.empty', { row: r + 1, col: c + 1 });

                return (
                  <div
                    key={`${r}-${c}`}
                    role="gridcell"
                    aria-label={cellLabel}
                    style={{
                      width: CELL,
                      height: CELL,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      borderRight,
                      borderBottom,
                      fontSize: 17,
                      fontWeight: 700,
                      color: cell ? '#1e293b' : 'transparent',
                      backgroundColor: cell ? '#fff' : '#f8fafc',
                      userSelect: 'none',
                    }}
                  >
                    {cell || ''}
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────
   DifficultyBar – visual colour gradient under the slider
───────────────────────────────────────────────────────── */
function DifficultyBar({ value }) {
  const colours = [
    '#22c55e', '#4ade80', '#86efac', '#fbbf24', '#fb923c',
    '#f97316', '#ef4444', '#dc2626', '#b91c1c', '#7f1d1d',
  ];
  return (
    <div className="flex rounded-full overflow-hidden h-2 mt-2" aria-hidden="true">
      {colours.map((c, i) => (
        <div
          key={i}
          style={{
            flex: 1,
            backgroundColor: c,
            opacity: i < value ? 1 : 0.2,
            transition: 'opacity 0.2s',
          }}
        />
      ))}
    </div>
  );
}

/* ─────────────────────────────────────────────────────────
   Main page
───────────────────────────────────────────────────────── */
export default function Home() {
  const [difficulty, setDifficulty] = useState(5);
  const [gridCount, setGridCount] = useState(4);
  const [seed, setSeed] = useState('');
  const [isExporting, setIsExporting] = useState(false);
  const [includeSolutions, setIncludeSolutions] = useState(false);
  const [exportProgress, setExportProgress] = useState('');

  const { grids, isGenerating, generatedCount, generate } = useGridGenerator();

  /* ── Generate ── */
  const handleGenerate = useCallback(() => {
    generate(difficulty, gridCount, seed.trim());
  }, [generate, difficulty, gridCount, seed]);

  /* ── Export PDF ── */
  const handleExportPDF = useCallback(async () => {
    if (grids.length === 0) return;
    setIsExporting(true);
    setExportProgress(t('export.loadingLib'));

    try {
      // Deliberate lazy import (ADR-002): jsPDF weighs ~500 kB, so it is only
      // fetched on first export to keep the initial bundle small. Do not hoist
      // this to a top-level import.
      const { jsPDF } = await import('jspdf');

      setExportProgress(t('export.generatingPages'));

      const PAGE_W = 210; // A4 mm
      const PAGE_H = 297;
      const MARGIN = 15;

      // ── Puzzle pages: 2 grids per A4 page ──────────────────────────
      // Available height per page: 297 - 2*15 = 267 mm
      // Two grids + spacing: 267 - 2*header(8) - gap(14) = 237 mm → each grid ~118mm
      const GRID_SIZE = 118; // mm, square
      const GRID_X = (PAGE_W - GRID_SIZE) / 2; // centered horizontally
      const HEADER_H = 9; // mm above each grid
      const GAP = 11; // mm between grid 1 and grid 2
      const GRID1_Y = MARGIN + HEADER_H;
      const GRID2_Y = MARGIN + HEADER_H + GRID_SIZE + GAP + HEADER_H;

      const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });

      grids.forEach((grid, idx) => {
        const posOnPage = idx % 2;

        if (idx > 0 && posOnPage === 0) {
          doc.addPage();
        }

        const gridY = posOnPage === 0 ? GRID1_Y : GRID2_Y;
        const headerY = gridY - 3;

        // Header label
        doc.setFontSize(9);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(80, 80, 120);
        doc.text(
          t('pdf.gridHeader', {
            number: idx + 1,
            value: difficulty,
            label: getDifficultyLabel(difficulty),
          }),
          GRID_X,
          headerY
        );

        // Grid
        drawGridOnPDF(doc, grid.puzzle, GRID_X, gridY, GRID_SIZE);
      });

      // ── Solution pages (optional): 4 per page ──────────────────────
      if (includeSolutions) {
        doc.addPage();

        const SOL_SIZE = 80; // mm
        const SOL_GAP_X = 10;
        const SOL_GAP_Y = 14;
        const SOL_HEADER = 7;
        // 2 columns
        const col0X = MARGIN;
        const col1X = MARGIN + SOL_SIZE + SOL_GAP_X;
        // 2 rows
        const row0Y = MARGIN + 18 + SOL_HEADER;
        const row1Y = MARGIN + 18 + SOL_HEADER + SOL_SIZE + SOL_GAP_Y + SOL_HEADER;

        const solXs = [col0X, col1X, col0X, col1X];
        const solYs = [row0Y, row0Y, row1Y, row1Y];

        grids.forEach((grid, idx) => {
          const posOnPage = idx % 4;

          if (idx > 0 && posOnPage === 0) {
            doc.addPage();
            // Page title
            doc.setFontSize(14);
            doc.setFont('helvetica', 'bold');
            doc.setTextColor(30, 30, 80);
            doc.text(t('pdf.solutionsContinued'), PAGE_W / 2, MARGIN + 10, { align: 'center' });
          } else if (idx === 0) {
            // First solution page title
            doc.setFontSize(14);
            doc.setFont('helvetica', 'bold');
            doc.setTextColor(30, 30, 80);
            doc.text(t('pdf.solutions'), PAGE_W / 2, MARGIN + 10, { align: 'center' });
          }

          const sx = solXs[posOnPage];
          const sy = solYs[posOnPage];

          // Label
          doc.setFontSize(7.5);
          doc.setFont('helvetica', 'bold');
          doc.setTextColor(80, 80, 120);
          doc.text(t('pdf.solutionLabel', { number: idx + 1 }), sx, sy - 2);

          drawGridOnPDF(doc, grid.solution, sx, sy, SOL_SIZE);
        });
      }

      setExportProgress(t('export.downloading'));
      doc.save(t('pdf.filename', { count: grids.length, value: difficulty }));
    } catch (err) {
      console.error(err);
      alert(t('export.error'));
    } finally {
      setIsExporting(false);
      setExportProgress('');
    }
  }, [grids, difficulty, includeSolutions]);

  /* ── Clamped grid count input ── */
  const handleGridCountChange = (e) => {
    const raw = parseInt(e.target.value, 10);
    if (isNaN(raw)) return;
    setGridCount(Math.min(99, Math.max(1, raw)));
  };

  const diffLabel = getDifficultyLabel(difficulty);
  const previewCount = Math.min(grids.length, 20);
  const hiddenCount = grids.length - previewCount;

  return (
    <main className="min-h-screen" style={{ background: 'linear-gradient(135deg, #0f172a 0%, #1e1b4b 60%, #0c1a3a 100%)' }}>
      {/* ── Header ── */}
      <header
        style={{ borderBottom: '1px solid rgba(255,255,255,0.12)', backdropFilter: 'blur(8px)' }}
        className="no-print px-6 py-5 text-center"
      >
        <h1 className="text-4xl font-extrabold text-white tracking-tight">
          {t('app.title')}
        </h1>
        <p className="text-indigo-300 mt-1 text-sm">
          {t('app.tagline')}
        </p>
      </header>

      <div className="max-w-5xl mx-auto px-4 py-8 space-y-8">
        {/* ── Controls card ── */}
        <section
          className="no-print rounded-2xl p-6 space-y-6"
          style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.15)' }}
        >
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Difficulty */}
            <div>
              <label htmlFor="difficulty" className="block text-white font-semibold mb-1">
                {t('controls.difficulty')}
                <span className="ml-2 text-indigo-300 font-bold">
                  {difficulty}/10 &mdash; {diffLabel}
                </span>
              </label>
              <input
                type="range"
                id="difficulty"
                min="1"
                max="10"
                value={difficulty}
                onChange={(e) => setDifficulty(Number(e.target.value))}
                className="w-full"
                style={{ background: 'rgba(255,255,255,0.2)', borderRadius: 4 }}
                aria-valuetext={`${difficulty}/10 — ${diffLabel}`}
              />
              <DifficultyBar value={difficulty} />
              <div className="flex justify-between text-xs text-indigo-400 mt-1">
                <span>{t('controls.difficulty.min')}</span>
                <span>{t('controls.difficulty.max')}</span>
              </div>
            </div>

            {/* Grid count */}
            <div>
              <label htmlFor="grid-count" className="block text-white font-semibold mb-1">
                {t('controls.gridCount')}
                <span className="ml-2 text-indigo-300 font-bold">({gridCount})</span>
              </label>
              <div className="flex items-center gap-3 mt-2">
                <button
                  onClick={() => setGridCount((v) => Math.max(1, v - 1))}
                  aria-label={t('controls.gridCount.decrease')}
                  className="w-10 h-10 rounded-lg bg-indigo-700 hover:bg-indigo-600 text-white font-bold text-xl flex items-center justify-center transition-colors"
                >
                  -
                </button>
                <input
                  type="number"
                  id="grid-count"
                  min="1"
                  max="99"
                  value={gridCount}
                  onChange={handleGridCountChange}
                  className="flex-1 text-center py-2 rounded-lg text-white font-bold text-xl focus:outline-none focus:ring-2 focus:ring-indigo-400"
                  style={{ background: 'rgba(255,255,255,0.15)', border: '1px solid rgba(255,255,255,0.25)' }}
                />
                <button
                  onClick={() => setGridCount((v) => Math.min(99, v + 1))}
                  aria-label={t('controls.gridCount.increase')}
                  className="w-10 h-10 rounded-lg bg-indigo-700 hover:bg-indigo-600 text-white font-bold text-xl flex items-center justify-center transition-colors"
                >
                  +
                </button>
              </div>
              <p className="text-xs text-indigo-400 mt-2 text-center">{t('controls.gridCount.hint')}</p>
            </div>
          </div>

          {/* Seed */}
          <div>
            <label htmlFor="seed" className="block text-white font-semibold mb-1">
              {t('controls.seed')}
            </label>
            <input
              type="text"
              id="seed"
              value={seed}
              onChange={(e) => setSeed(e.target.value)}
              placeholder={t('controls.seed.placeholder')}
              className="w-full py-2 px-3 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
              style={{ background: 'rgba(255,255,255,0.15)', border: '1px solid rgba(255,255,255,0.25)' }}
            />
            <p className="text-xs text-indigo-400 mt-1">{t('controls.seed.hint')}</p>
          </div>

          {/* Solutions toggle */}
          <div className="flex items-center gap-3">
            <input
              type="checkbox"
              id="solutions"
              checked={includeSolutions}
              onChange={(e) => setIncludeSolutions(e.target.checked)}
              className="w-4 h-4 rounded accent-indigo-500 cursor-pointer"
            />
            <label htmlFor="solutions" className="text-indigo-200 text-sm cursor-pointer select-none">
              {t('controls.includeSolutions')}
            </label>
          </div>

          {/* Action buttons */}
          <div className="flex flex-col sm:flex-row gap-3 pt-1">
            <button
              onClick={handleGenerate}
              disabled={isGenerating}
              className="flex-1 py-3 px-6 rounded-xl font-bold text-white text-base transition-all shadow-lg disabled:opacity-60"
              style={{
                background: isGenerating
                  ? 'rgba(99,102,241,0.5)'
                  : 'linear-gradient(90deg, #6366f1, #818cf8)',
              }}
            >
              {isGenerating
                ? t('controls.generating', { done: generatedCount, count: gridCount })
                : t('controls.generate', { count: gridCount })}
            </button>

            {grids.length > 0 && (
              <button
                onClick={handleExportPDF}
                disabled={isExporting}
                className="flex-1 py-3 px-6 rounded-xl font-bold text-white text-base transition-all shadow-lg disabled:opacity-60"
                style={{
                  background: isExporting
                    ? 'rgba(16,185,129,0.5)'
                    : 'linear-gradient(90deg, #059669, #10b981)',
                }}
              >
                {isExporting
                  ? exportProgress || t('controls.exporting')
                  : t('controls.export', { count: grids.length })}
              </button>
            )}
          </div>
        </section>

        {/* ── Grid preview ── */}
        {grids.length > 0 && (
          <section className="print-area">
            <div className="no-print flex items-baseline justify-between mb-4">
              <h2 className="text-white font-bold text-xl">
                {t('preview.title')}
                <span className="ml-2 text-indigo-300 font-normal text-base">
                  {t('preview.count', { count: grids.length })}
                </span>
              </h2>
              {hiddenCount > 0 && (
                <span className="text-indigo-400 text-sm">
                  {t('preview.hidden', { count: hiddenCount })}
                </span>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {grids.slice(0, previewCount).map((grid, i) => (
                <SudokuGrid key={i} puzzle={grid.puzzle} index={i} difficulty={difficulty} />
              ))}
            </div>

            {hiddenCount > 0 && (
              <p className="no-print text-indigo-400 text-center text-sm mt-6">
                {t('preview.hiddenNote', { count: grids.length })}
              </p>
            )}
          </section>
        )}

        {/* ── Empty state ── */}
        {grids.length === 0 && (
          <div className="no-print text-center py-20 space-y-4">
            <div
              className="w-24 h-24 mx-auto rounded-2xl flex items-center justify-center"
              style={{ background: 'rgba(255,255,255,0.08)', border: '2px dashed rgba(255,255,255,0.2)' }}
            >
              <span className="text-4xl select-none">9</span>
            </div>
            <p className="text-indigo-300 text-lg font-medium">
              {t('empty.instruction')}<br />
              {t('empty.instruction2')}
            </p>
            <p className="text-indigo-500 text-sm">
              {t('empty.offline')}
            </p>
          </div>
        )}
      </div>

      {/* ── Footer ── */}
      <footer className="no-print text-center text-indigo-600 text-xs py-6 mt-4">
        {t('footer.note')}
      </footer>
    </main>
  );
}
