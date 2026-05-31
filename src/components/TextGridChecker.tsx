import React, { useState, useRef, useEffect } from 'react';

interface TextGridCheckerProps {
  imageSrc: string;
  onMarkChange: (markedCount: number) => void;
  onReset: () => void;
}

export default function TextGridChecker({
  imageSrc,
  onMarkChange,
  onReset,
}: TextGridCheckerProps) {
  // 10x10 grid (100 cells)
  const [grid, setGrid] = useState<boolean[]>(Array(100).fill(false));
  const [isDrawing, setIsDrawing] = useState<boolean>(false);
  const [drawMode, setDrawMode] = useState<boolean>(true); // true = print, false = erase
  const containerRef = useRef<HTMLDivElement>(null);

  const markedCount = grid.filter(Boolean).length;

  useEffect(() => {
    onMarkChange(markedCount);
  }, [grid, markedCount, onMarkChange]);

  const handleCellDown = (index: number, e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    const currentStatus = grid[index];
    const newMode = !currentStatus;
    setDrawMode(newMode);
    setIsDrawing(true);

    const newGrid = [...grid];
    newGrid[index] = newMode;
    setGrid(newGrid);
  };

  const handleCellEnter = (index: number) => {
    if (!isDrawing) return;
    if (grid[index] !== drawMode) {
      const newGrid = [...grid];
      newGrid[index] = drawMode;
      setGrid(newGrid);
    }
  };

  // Touch support for dragging
  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isDrawing || !containerRef.current) return;
    const touch = e.touches[0];
    const element = document.elementFromPoint(touch.clientX, touch.clientY);
    if (!element) return;

    const cellIndexAttr = element.getAttribute('data-cell-index');
    if (cellIndexAttr !== null) {
      const index = parseInt(cellIndexAttr, 10);
      if (!isNaN(index) && index >= 0 && index < 100) {
        if (grid[index] !== drawMode) {
          const newGrid = [...grid];
          newGrid[index] = drawMode;
          setGrid(newGrid);
        }
      }
    }
  };

  const handleStopDrawing = () => {
    setIsDrawing(false);
  };

  useEffect(() => {
    const handleGlobalMouseUp = () => {
      setIsDrawing(false);
    };
    window.addEventListener('mouseup', handleGlobalMouseUp);
    window.addEventListener('touchend', handleGlobalMouseUp);
    return () => {
      window.removeEventListener('mouseup', handleGlobalMouseUp);
      window.removeEventListener('touchend', handleGlobalMouseUp);
    };
  }, []);

  const handleClear = () => {
    setGrid(Array(100).fill(false));
  };

  return (
    <div className="flex flex-col h-full w-full select-none" ref={containerRef}>
      {/* 10x10 Interactive Canvas Viewport */}
      <div 
        className="relative flex-1 min-h-[280px] w-full rounded-2xl bg-slate-950 border border-slate-800/80 overflow-hidden flex items-center justify-center p-4 shadow-2xl"
        onMouseLeave={handleStopDrawing}
        onTouchMove={handleTouchMove}
      >
        {/* Background Image Container */}
        <div className="relative w-full h-full max-h-[38vh] flex items-center justify-center aspect-square md:aspect-[4/3] lg:aspect-square select-none">
          {/* Main User Image */}
          <img
            src={imageSrc}
            alt="Checked Source"
            className="w-full h-full object-contain max-h-[38vh] rounded-lg pointer-events-none opacity-85"
          />

          {/* Overlaid CSS Grid for 10x10 checking */}
          <div 
            className="absolute inset-0 m-auto aspect-square grid grid-cols-10 grid-rows-10 border border-sky-400/35 overflow-hidden rounded-lg bg-transparent shadow-[0_0_20px_rgba(56,189,248,0.1)]"
            style={{
              // Make sure the grid perfect matches the aspect-square containment
              maxHeight: '100%',
              maxWidth: '100%',
            }}
          >
            {grid.map((isMarked, index) => {
              const row = Math.floor(index / 10);
              const col = index % 10;
              return (
                <div
                  key={index}
                  data-cell-index={index}
                  onMouseDown={(e) => handleCellDown(index, e)}
                  onTouchStart={(e) => handleCellDown(index, e)}
                  onMouseEnter={() => handleCellEnter(index)}
                  className={`relative border flex items-start justify-start p-0.5 cursor-pointer transition-all duration-100 select-none
                    ${isMarked 
                      ? 'bg-rose-500/40 border-rose-400 shadow-[inset_0_0_4px_rgba(244,63,94,0.5)]' 
                      : 'border-slate-700/20 hover:bg-sky-500/10 hover:border-sky-500/30'
                    }
                  `}
                >
                  <span 
                    data-cell-index={index}
                    className="font-mono text-[7px] text-slate-500/70 select-none pointer-events-none absolute top-0.5 left-0.5"
                  >
                    {index + 1}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Grid Quick Actions */}
      <div className="flex items-center justify-between mt-3 px-1">
        <div className="flex gap-4 text-xs text-slate-400 select-none items-center">
          <div className="flex items-center gap-1.5">
            <span className="inline-block w-3 h-3 rounded-sm bg-rose-500/30 border border-rose-500/70" />
            <span>追加要素（テキスト/ロゴ等）</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="inline-block w-3 h-3 rounded-sm border border-slate-700" />
            <span>未マーク（余白・背景）</span>
          </div>
        </div>

        <div className="flex gap-2">
          <button
            onClick={handleClear}
            className="px-3 py-1.5 rounded-lg border border-slate-800 bg-slate-900/60 hover:bg-slate-900 text-xs text-slate-300 font-medium transition-all"
          >
            マークを全消去
          </button>
          <button
            onClick={onReset}
            className="px-3 py-1.5 rounded-lg border border-slate-800 bg-slate-900/60 hover:bg-slate-900 text-xs text-slate-300 font-medium transition-all"
          >
            別の画像を選ぶ
          </button>
        </div>
      </div>
    </div>
  );
}
export type { TextGridCheckerProps };
