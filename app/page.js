'use client';

import { useState, useCallback, useEffect } from 'react';
import { getDifficultyLabel, drawGridOnPDF, drawGridOnCanvas } from '@/lib/sudoku';
import { t } from '@/lib/i18n';
import { useGridGenerator } from '@/app/hooks/useGridGenerator';

/* ─────────────────────────────────────────────────────────
   Theme palettes — dark (default) and light
───────────────────────────────────────────────────────── */
const THEMES = {
  dark: {
    pageBg: 'linear-gradient(135deg, #0f172a 0%, #1e1b4b 60%, #0c1a3a 100%)',
    headerBorder: '1px solid rgba(255,255,255,0.12)',
    panelBg: 'rgba(255,255,255,0.07)',
    panelBorder: '1px solid rgba(255,255,255,0.15)',
    inputBg: 'rgba(255,255,255,0.15)',
    inputBorder: '1px solid rgba(255,255,255,0.25)',
    heading: 'text-white',
    label: 'text-white',
    accent: 'text-indigo-300',
    body: 'text-indigo-200',
    hint: 'text-indigo-400',
    subtle: 'text-indigo-500',
    footer: 'text-indigo-600',
    emptyTileBg: 'rgba(255,255,255,0.08)',
    emptyTileBorder: '2px dashed rgba(255,255,255,0.2)',
  },
  light: {
    pageBg: 'linear-gradient(135deg, #eef2ff 0%, #e0e7ff 60%, #f1f5f9 100%)',
    headerBorder: '1px solid rgba(30,27,75,0.1)',
    panelBg: 'rgba(255,255,255,0.85)',
    panelBorder: '1px solid rgba(99,102,241,0.25)',
    inputBg: 'rgba(99,102,241,0.08)',
    inputBorder: '1px solid rgba(99,102,241,0.35)',
    heading: 'text-slate-900',
    label: 'text-slate-800',
    accent: 'text-indigo-600',
    body: 'text-slate-700',
    hint: 'text-indigo-500',
    subtle: 'text-slate-500',
    footer: 'text-slate-400',
    emptyTileBg: 'rgba(99,102,241,0.08)',
    emptyTileBorder: '2px dashed rgba(99,102,241,0.35)',
  },
};

const THEME_KEY = 'sudoku.theme';

/* ─────────────────────────────────────────────────────────
   Helpers
───────────────────────────────────────────────────────── */

/** '#rrggbb' → [r, g, b] (falls back to near-black). */
function hexToRgb(hex) {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex);
  if (!m) return [30, 30, 30];
  const v = parseInt(m[1], 16);
  return [(v >> 16) & 255, (v >> 8) & 255, v & 255];
}

/** Render a QR code of `text` (digits only) to a PNG data URL. */
async function qrDataUrl(text) {
  const mod = await import('qrcode-generator');
  const qrFactory = mod.default ?? mod;
  const qr = qrFactory(0, 'M'); // type 0 = auto-size
  qr.addData(text, 'Numeric');
  qr.make();

  const n = qr.getModuleCount();
  const scale = 4;
  const quiet = 2; // quiet-zone modules on each side
  const px = (n + quiet * 2) * scale;

  const canvas = document.createElement('canvas');
  canvas.width = px;
  canvas.height = px;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, px, px);
  ctx.fillStyle = '#000000';
  for (let r = 0; r < n; r++) {
    for (let c = 0; c < n; c++) {
      if (qr.isDark(r, c)) {
        ctx.fillRect((c + quiet) * scale, (r + quiet) * scale, scale, scale);
      }
    }
  }
  return canvas.toDataURL('image/png');
}

/* ─────────────────────────────────────────────────────────
   SudokuGrid – renders one puzzle as an accessible,
   playable grid with PNG export
───────────────────────────────────────────────────────── */
function SudokuGrid({ puzzle, solution, index, difficulty }) {
  const CELL = 36; // px

  // Play state resets on a new puzzle because the parent keys this
  // component by the puzzle's content (remount = fresh state).
  const [entries, setEntries] = useState({});
  const [wrongCells, setWrongCells] = useState(() => new Set());
  const [verifyMsg, setVerifyMsg] = useState('');

  /** Combined value at (r, c): given clue or user entry (0 when empty). */
  const valueAt = (r, c) => puzzle[r][c] || Number(entries[`${r}-${c}`] || 0);

  /** Real-time duplicate detection for a user-entered cell. */
  const isConflict = (r, c) => {
    const v = Number(entries[`${r}-${c}`] || 0);
    if (!v) return false;
    for (let x = 0; x < 9; x++) {
      if (x !== c && valueAt(r, x) === v) return true;
      if (x !== r && valueAt(x, c) === v) return true;
      const br = 3 * Math.floor(r / 3) + Math.floor(x / 3);
      const bc = 3 * Math.floor(c / 3) + (x % 3);
      if ((br !== r || bc !== c) && valueAt(br, bc) === v) return true;
    }
    return false;
  };

  const handleEntry = (r, c, raw) => {
    const v = raw.slice(-1);
    if (v !== '' && !/^[1-9]$/.test(v)) return;
    setEntries((prev) => ({ ...prev, [`${r}-${c}`]: v }));
    setWrongCells(new Set());
    setVerifyMsg('');
  };

  const handleVerify = () => {
    let correct = 0;
    let wrong = 0;
    let filled = 0;
    const wrongSet = new Set();

    for (let r = 0; r < 9; r++) {
      for (let c = 0; c < 9; c++) {
        if (puzzle[r][c] !== 0) continue;
        const v = Number(entries[`${r}-${c}`] || 0);
        if (!v) continue;
        filled++;
        if (v === solution[r][c]) {
          correct++;
        } else {
          wrong++;
          wrongSet.add(`${r}-${c}`);
        }
      }
    }

    const emptyCount = puzzle.flat().filter((v) => v === 0).length;
    setWrongCells(wrongSet);
    if (filled === 0) setVerifyMsg(t('play.empty'));
    else if (wrong === 0 && filled === emptyCount) setVerifyMsg(t('play.solved'));
    else setVerifyMsg(t('play.result', { correct, wrong }));
  };

  const handleReset = () => {
    setEntries({});
    setWrongCells(new Set());
    setVerifyMsg('');
  };

  /** Export this puzzle as a standalone PNG image (vanilla Canvas, no deps). */
  const handleExportPNG = () => {
    const SIZE = 540;
    const MARGIN = 20;
    const canvas = document.createElement('canvas');
    canvas.width = SIZE + MARGIN * 2;
    canvas.height = SIZE + MARGIN * 2;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    drawGridOnCanvas(ctx, puzzle, MARGIN, MARGIN, SIZE);
    canvas.toBlob((blob) => {
      if (!blob) return;
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = t('png.filename', { number: index + 1 });
      a.click();
      URL.revokeObjectURL(url);
    }, 'image/png');
  };

  return (
    <div className="sudoku-card bg-white rounded-xl shadow-lg overflow-hidden">
      {/* Card header */}
      <div className="bg-indigo-50 border-b border-indigo-100 px-4 py-2 flex items-center justify-between gap-2">
        <span className="text-indigo-700 font-bold text-sm">
          {t('grid.title', { number: index + 1 })}
        </span>
        <span className="text-indigo-500 text-xs font-medium">
          {t('grid.difficulty', { value: difficulty, label: getDifficultyLabel(difficulty) })}
        </span>
        <button
          onClick={handleExportPNG}
          aria-label={t('png.aria', { number: index + 1 })}
          className="no-print text-xs font-bold px-2 py-1 rounded bg-indigo-600 hover:bg-indigo-500 text-white transition-colors"
        >
          {t('png.export')}
        </button>
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
                const key = `${r}-${c}`;
                const bad = isConflict(r, c) || wrongCells.has(key);

                if (cell !== 0) {
                  return (
                    <div
                      key={key}
                      role="gridcell"
                      aria-label={t('grid.cell.value', { row: r + 1, col: c + 1, value: cell })}
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
                        color: '#1e293b',
                        backgroundColor: '#fff',
                        userSelect: 'none',
                      }}
                    >
                      {cell}
                    </div>
                  );
                }

                return (
                  <div
                    key={key}
                    role="gridcell"
                    style={{ width: CELL, height: CELL, borderRight, borderBottom }}
                  >
                    <input
                      type="text"
                      inputMode="numeric"
                      autoComplete="off"
                      value={entries[key] || ''}
                      onChange={(e) => handleEntry(r, c, e.target.value)}
                      aria-label={t('grid.cell.input', { row: r + 1, col: c + 1 })}
                      className="cell-input"
                      style={{
                        color: bad ? '#dc2626' : '#4f46e5',
                        backgroundColor: bad ? '#fee2e2' : '#f8fafc',
                      }}
                    />
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>

      {/* Play controls */}
      <div className="no-print px-4 pb-3 flex items-center gap-2">
        <button
          onClick={handleVerify}
          className="text-xs font-bold px-3 py-1.5 rounded bg-emerald-600 hover:bg-emerald-500 text-white transition-colors"
        >
          {t('play.verify')}
        </button>
        <button
          onClick={handleReset}
          className="text-xs font-bold px-3 py-1.5 rounded bg-slate-200 hover:bg-slate-300 text-slate-700 transition-colors"
        >
          {t('play.reset')}
        </button>
        {verifyMsg && (
          <span className="text-xs font-medium text-slate-600" role="status">
            {verifyMsg}
          </span>
        )}
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
  const [theme, setTheme] = useState('dark');

  // PDF customisation
  const [paperFormat, setPaperFormat] = useState('a4');
  const [gridsPerPage, setGridsPerPage] = useState(2);
  const [pdfFont, setPdfFont] = useState('helvetica');
  const [numberColor, setNumberColor] = useState('#1e1e1e');
  const [includeQR, setIncludeQR] = useState(false);

  const { grids, isGenerating, generatedCount, generate, history, restore, clearHistory } =
    useGridGenerator();

  /* ── Theme (persisted in localStorage) ── */
  useEffect(() => {
    try {
      const saved = localStorage.getItem(THEME_KEY);
      if (saved === 'light' || saved === 'dark') setTheme(saved);
    } catch {
      // storage unavailable — keep the default theme
    }
  }, []);

  const toggleTheme = () => {
    setTheme((prev) => {
      const next = prev === 'dark' ? 'light' : 'dark';
      try {
        localStorage.setItem(THEME_KEY, next);
      } catch {
        // best effort only
      }
      return next;
    });
  };

  const T = THEMES[theme];

  /* ── Generate ── */
  const handleGenerate = useCallback(() => {
    generate(difficulty, gridCount, seed.trim());
  }, [generate, difficulty, gridCount, seed]);

  /* ── Restore a past generation from the history ── */
  const handleRestore = useCallback(
    (entry) => {
      restore(entry);
      setDifficulty(entry.difficulty);
      setGridCount(entry.gridCount);
      setSeed(entry.seed || '');
    },
    [restore]
  );

  /* ── Export PDF ── */
  const handleExportPDF = useCallback(async () => {
    if (grids.length === 0) return;
    setIsExporting(true);
    setExportProgress(t('export.loadingLib'));

    try {
      const { jsPDF } = await import('jspdf');

      setExportProgress(t('export.generatingPages'));

      const PAPER = {
        a4: { w: 210, h: 297 },
        letter: { w: 215.9, h: 279.4 },
      };
      const { w: PAGE_W, h: PAGE_H } = PAPER[paperFormat] ?? PAPER.a4;
      const MARGIN = 15;
      const HEADER_H = 9; // mm above each grid
      const GAP = 11; // mm between grids on the same page

      const drawOptions = { font: pdfFont, color: hexToRgb(numberColor) };

      // ── Puzzle pages: 1 or 2 grids per page ────────────────────────
      const perPage = gridsPerPage === 1 ? 1 : 2;
      const QR_W = includeQR ? 20 : 0; // mm reserved right of each grid
      const availH = PAGE_H - 2 * MARGIN - perPage * HEADER_H - (perPage - 1) * GAP;
      const GRID_SIZE = Math.min(PAGE_W - 2 * MARGIN - QR_W, availH / perPage);
      const GRID_X = (PAGE_W - GRID_SIZE - QR_W) / 2;
      const slotY = (k) => MARGIN + HEADER_H + k * (GRID_SIZE + GAP + HEADER_H);

      const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: paperFormat });

      for (const [idx, grid] of grids.entries()) {
        const posOnPage = idx % perPage;

        if (idx > 0 && posOnPage === 0) {
          doc.addPage();
        }

        const gridY = slotY(posOnPage);
        const headerY = gridY - 3;

        // Header label
        doc.setFontSize(9);
        doc.setFont(pdfFont, 'bold');
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
        drawGridOnPDF(doc, grid.puzzle, GRID_X, gridY, GRID_SIZE, drawOptions);

        // Optional QR code of the solution (81 digits, numeric mode)
        if (includeQR) {
          const dataUrl = await qrDataUrl(grid.solution.flat().join(''));
          const QR_SIZE = 16; // mm
          const qrX = GRID_X + GRID_SIZE + 3;
          doc.addImage(dataUrl, 'PNG', qrX, gridY, QR_SIZE, QR_SIZE);
          doc.setFontSize(6.5);
          doc.setFont(pdfFont, 'normal');
          doc.setTextColor(120, 120, 140);
          doc.text(t('pdf.qrLabel'), qrX + QR_SIZE / 2, gridY + QR_SIZE + 3, { align: 'center' });
        }
      }

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
            doc.setFont(pdfFont, 'bold');
            doc.setTextColor(30, 30, 80);
            doc.text(t('pdf.solutionsContinued'), PAGE_W / 2, MARGIN + 10, { align: 'center' });
          } else if (idx === 0) {
            // First solution page title
            doc.setFontSize(14);
            doc.setFont(pdfFont, 'bold');
            doc.setTextColor(30, 30, 80);
            doc.text(t('pdf.solutions'), PAGE_W / 2, MARGIN + 10, { align: 'center' });
          }

          const sx = solXs[posOnPage];
          const sy = solYs[posOnPage];

          // Label
          doc.setFontSize(7.5);
          doc.setFont(pdfFont, 'bold');
          doc.setTextColor(80, 80, 120);
          doc.text(t('pdf.solutionLabel', { number: idx + 1 }), sx, sy - 2);

          drawGridOnPDF(doc, grid.solution, sx, sy, SOL_SIZE, drawOptions);
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
  }, [grids, difficulty, includeSolutions, paperFormat, gridsPerPage, pdfFont, numberColor, includeQR]);

  /* ── Clamped grid count input ── */
  const handleGridCountChange = (e) => {
    const raw = parseInt(e.target.value, 10);
    if (isNaN(raw)) return;
    setGridCount(Math.min(99, Math.max(1, raw)));
  };

  const diffLabel = getDifficultyLabel(difficulty);
  const previewCount = Math.min(grids.length, 20);
  const hiddenCount = grids.length - previewCount;

  const selectStyle = {
    background: T.inputBg,
    border: T.inputBorder,
  };

  return (
    <main className="min-h-screen" style={{ background: T.pageBg }}>
      {/* ── Header ── */}
      <header
        style={{ borderBottom: T.headerBorder, backdropFilter: 'blur(8px)' }}
        className="no-print px-6 py-5 text-center relative"
      >
        <h1 className={`text-4xl font-extrabold tracking-tight ${T.heading}`}>
          {t('app.title')}
        </h1>
        <p className={`mt-1 text-sm ${T.accent}`}>
          {t('app.tagline')}
        </p>
        <button
          onClick={toggleTheme}
          aria-label={t('theme.toggle')}
          className={`absolute top-4 right-4 text-xs font-bold px-3 py-1.5 rounded-lg transition-colors ${T.body}`}
          style={{ background: T.panelBg, border: T.panelBorder }}
        >
          {theme === 'dark' ? t('theme.toLight') : t('theme.toDark')}
        </button>
      </header>

      <div className="max-w-5xl mx-auto px-4 py-8 space-y-8">
        {/* ── Controls card ── */}
        <section
          className="no-print rounded-2xl p-6 space-y-6"
          style={{ background: T.panelBg, border: T.panelBorder }}
        >
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Difficulty */}
            <div>
              <label htmlFor="difficulty" className={`block font-semibold mb-1 ${T.label}`}>
                {t('controls.difficulty')}
                <span className={`ml-2 font-bold ${T.accent}`}>
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
                style={{ background: T.inputBg, borderRadius: 4 }}
                aria-valuetext={`${difficulty}/10 — ${diffLabel}`}
              />
              <DifficultyBar value={difficulty} />
              <div className={`flex justify-between text-xs mt-1 ${T.hint}`}>
                <span>{t('controls.difficulty.min')}</span>
                <span>{t('controls.difficulty.max')}</span>
              </div>
            </div>

            {/* Grid count */}
            <div>
              <label htmlFor="grid-count" className={`block font-semibold mb-1 ${T.label}`}>
                {t('controls.gridCount')}
                <span className={`ml-2 font-bold ${T.accent}`}>({gridCount})</span>
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
                  className={`flex-1 text-center py-2 rounded-lg font-bold text-xl focus:outline-none focus:ring-2 focus:ring-indigo-400 ${T.label}`}
                  style={selectStyle}
                />
                <button
                  onClick={() => setGridCount((v) => Math.min(99, v + 1))}
                  aria-label={t('controls.gridCount.increase')}
                  className="w-10 h-10 rounded-lg bg-indigo-700 hover:bg-indigo-600 text-white font-bold text-xl flex items-center justify-center transition-colors"
                >
                  +
                </button>
              </div>
              <p className={`text-xs mt-2 text-center ${T.hint}`}>{t('controls.gridCount.hint')}</p>
            </div>
          </div>

          {/* Seed */}
          <div>
            <label htmlFor="seed" className={`block font-semibold mb-1 ${T.label}`}>
              {t('controls.seed')}
            </label>
            <input
              type="text"
              id="seed"
              value={seed}
              onChange={(e) => setSeed(e.target.value)}
              placeholder={t('controls.seed.placeholder')}
              className={`w-full py-2 px-3 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 ${T.label}`}
              style={selectStyle}
            />
            <p className={`text-xs mt-1 ${T.hint}`}>{t('controls.seed.hint')}</p>
          </div>

          {/* PDF options */}
          <fieldset className="space-y-4">
            <legend className={`font-semibold ${T.label}`}>{t('controls.pdfOptions')}</legend>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div>
                <label htmlFor="paper" className={`block text-xs font-semibold mb-1 ${T.body}`}>
                  {t('controls.paper')}
                </label>
                <select
                  id="paper"
                  value={paperFormat}
                  onChange={(e) => setPaperFormat(e.target.value)}
                  className={`w-full py-2 px-2 rounded-lg text-sm ${T.label}`}
                  style={selectStyle}
                >
                  <option value="a4">{t('controls.paper.a4')}</option>
                  <option value="letter">{t('controls.paper.letter')}</option>
                </select>
              </div>

              <div>
                <label htmlFor="grids-per-page" className={`block text-xs font-semibold mb-1 ${T.body}`}>
                  {t('controls.gridsPerPage')}
                </label>
                <select
                  id="grids-per-page"
                  value={gridsPerPage}
                  onChange={(e) => setGridsPerPage(Number(e.target.value))}
                  className={`w-full py-2 px-2 rounded-lg text-sm ${T.label}`}
                  style={selectStyle}
                >
                  <option value={1}>1</option>
                  <option value={2}>2</option>
                </select>
              </div>

              <div>
                <label htmlFor="pdf-font" className={`block text-xs font-semibold mb-1 ${T.body}`}>
                  {t('controls.font')}
                </label>
                <select
                  id="pdf-font"
                  value={pdfFont}
                  onChange={(e) => setPdfFont(e.target.value)}
                  className={`w-full py-2 px-2 rounded-lg text-sm ${T.label}`}
                  style={selectStyle}
                >
                  <option value="helvetica">Helvetica</option>
                  <option value="times">Times</option>
                  <option value="courier">Courier</option>
                </select>
              </div>

              <div>
                <label htmlFor="number-color" className={`block text-xs font-semibold mb-1 ${T.body}`}>
                  {t('controls.numberColor')}
                </label>
                <input
                  type="color"
                  id="number-color"
                  value={numberColor}
                  onChange={(e) => setNumberColor(e.target.value)}
                  className="w-full h-9 rounded-lg cursor-pointer"
                  style={selectStyle}
                />
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  id="solutions"
                  checked={includeSolutions}
                  onChange={(e) => setIncludeSolutions(e.target.checked)}
                  className="w-4 h-4 rounded accent-indigo-500 cursor-pointer"
                />
                <label htmlFor="solutions" className={`text-sm cursor-pointer select-none ${T.body}`}>
                  {t('controls.includeSolutions')}
                </label>
              </div>

              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  id="include-qr"
                  checked={includeQR}
                  onChange={(e) => setIncludeQR(e.target.checked)}
                  className="w-4 h-4 rounded accent-indigo-500 cursor-pointer"
                />
                <label htmlFor="include-qr" className={`text-sm cursor-pointer select-none ${T.body}`}>
                  {t('controls.includeQR')}
                </label>
              </div>
            </div>
          </fieldset>

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

        {/* ── History ── */}
        {history.length > 0 && (
          <section
            className="no-print rounded-2xl p-6"
            style={{ background: T.panelBg, border: T.panelBorder }}
          >
            <div className="flex items-baseline justify-between mb-1">
              <h2 className={`font-bold text-lg ${T.heading}`}>{t('history.title')}</h2>
              <button onClick={clearHistory} className={`text-xs underline ${T.hint}`}>
                {t('history.clear')}
              </button>
            </div>
            <p className={`text-xs mb-3 ${T.subtle}`}>{t('history.subtitle', { count: 10 })}</p>
            <ul className="space-y-2">
              {history.map((entry) => (
                <li key={entry.id} className="flex flex-wrap items-center justify-between gap-2 text-sm">
                  <div className="flex flex-wrap items-baseline gap-x-3">
                    <span className={`font-medium ${T.body}`}>
                      {t('history.entry', { count: entry.grids.length, value: entry.difficulty })}
                    </span>
                    <span className={`text-xs ${T.subtle}`}>
                      {new Date(entry.date).toLocaleString('fr-FR')}
                    </span>
                    {entry.seed && (
                      <span className={`text-xs ${T.subtle}`}>
                        {t('history.seed', { seed: entry.seed })}
                      </span>
                    )}
                  </div>
                  <button
                    onClick={() => handleRestore(entry)}
                    className="text-xs font-bold px-3 py-1.5 rounded bg-indigo-600 hover:bg-indigo-500 text-white transition-colors"
                  >
                    {t('history.restore')}
                  </button>
                </li>
              ))}
            </ul>
          </section>
        )}

        {/* ── Grid preview ── */}
        {grids.length > 0 && (
          <section className="print-area">
            <div className="no-print flex items-baseline justify-between mb-4">
              <h2 className={`font-bold text-xl ${T.heading}`}>
                {t('preview.title')}
                <span className={`ml-2 font-normal text-base ${T.accent}`}>
                  {t('preview.count', { count: grids.length })}
                </span>
              </h2>
              {hiddenCount > 0 && (
                <span className={`text-sm ${T.hint}`}>
                  {t('preview.hidden', { count: hiddenCount })}
                </span>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {grids.slice(0, previewCount).map((grid, i) => (
                <SudokuGrid
                  key={`${i}-${grid.puzzle.flat().join('')}`}
                  puzzle={grid.puzzle}
                  solution={grid.solution}
                  index={i}
                  difficulty={difficulty}
                />
              ))}
            </div>

            {hiddenCount > 0 && (
              <p className={`no-print text-center text-sm mt-6 ${T.hint}`}>
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
              style={{ background: T.emptyTileBg, border: T.emptyTileBorder }}
            >
              <span className={`text-4xl select-none ${T.heading}`}>9</span>
            </div>
            <p className={`text-lg font-medium ${T.accent}`}>
              {t('empty.instruction')}<br />
              {t('empty.instruction2')}
            </p>
            <p className={`text-sm ${T.subtle}`}>
              {t('empty.offline')}
            </p>
          </div>
        )}
      </div>

      {/* ── Footer ── */}
      <footer className={`no-print text-center text-xs py-6 mt-4 ${T.footer}`}>
        {t('footer.note')}
      </footer>
    </main>
  );
}
