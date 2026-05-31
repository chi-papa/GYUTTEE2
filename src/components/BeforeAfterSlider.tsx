import React, { useState, useRef, useEffect } from 'react';

interface BeforeAfterSliderProps {
  originalSrc: string;
  compressedSrc: string;
  className?: string;
}

export default function BeforeAfterSlider({
  originalSrc,
  compressedSrc,
  className = '',
}: BeforeAfterSliderProps) {
  const [sliderPosition, setSliderPosition] = useState<number>(50); // 0 to 100
  const isDragging = useRef<boolean>(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const handleMove = (clientX: number) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = clientX - rect.left;
    const percentage = Math.max(0, Math.min(100, (x / rect.width) * 100));
    setSliderPosition(percentage);
  };

  const onTouchMove = (e: TouchEvent) => {
    if (!isDragging.current) return;
    handleMove(e.touches[0].clientX);
  };

  const onMouseMove = (e: MouseEvent) => {
    if (!isDragging.current) return;
    handleMove(e.clientX);
  };

  const onMouseUp = () => {
    isDragging.current = false;
  };

  useEffect(() => {
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
    window.addEventListener('touchmove', onTouchMove);
    window.addEventListener('touchend', onMouseUp);

    return () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
      window.removeEventListener('touchmove', onTouchMove);
      window.removeEventListener('touchend', onMouseUp);
    };
  }, []);

  const handleStart = (e: React.MouseEvent | React.TouchEvent) => {
    isDragging.current = true;
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    handleMove(clientX);
  };

  return (
    <div className={`relative select-none overflow-hidden rounded-2xl bg-slate-950 shadow-inner ${className}`}>
      <div
        ref={containerRef}
        onMouseDown={handleStart}
        onTouchStart={handleStart}
        className="relative mx-auto flex h-full w-full items-center justify-center cursor-ew-resize overflow-hidden"
        style={{ aspectRatio: '16/10', maxHeight: '38vh' }}
      >
        {/* Compressed Image (Background) */}
        <div className="absolute inset-0 h-full w-full p-4 flex items-center justify-center">
          <img
            src={compressedSrc}
            alt="Compressed"
            className="h-full w-full rounded-lg object-contain pointer-events-none"
          />
        </div>

        {/* Original Image (Foreground with Clip) */}
        <div
          className="absolute inset-0 h-full w-full p-4 flex items-center justify-center"
          style={{
            clipPath: `polygon(0 0, ${sliderPosition}% 0, ${sliderPosition}% 100%, 0 100%)`,
          }}
        >
          <img
            src={originalSrc}
            alt="Original"
            className="h-full w-full rounded-lg object-contain pointer-events-none"
          />
        </div>

        {/* Slider Divider Line */}
        <div
          className="absolute top-4 bottom-4 w-0.5 bg-sky-400 shadow-[0_0_10px_#38bdf8] z-10 pointer-events-none"
          style={{ left: `calc(${sliderPosition}% - 1px)` }}
        />

        {/* Drag Handle Tag */}
        <div
          className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-8 h-8 rounded-full bg-cyan-400 text-slate-950 font-bold flex items-center justify-center shadow-[0_0_15px_rgba(34,211,238,0.7)] hover:scale-110 active:scale-95 transition-transform z-20 cursor-ew-resize pointer-events-none"
          style={{ left: `${sliderPosition}%` }}
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="m5 12 7-7 7 7" className="rotate-270 origin-center" />
            <path d="m19 12-7 7-7-7" className="rotate-270 origin-center" />
          </svg>
        </div>

        {/* Status Labels */}
        <div className="absolute bottom-6 left-6 px-3 py-1 bg-slate-900/80 backdrop-blur border border-slate-700/50 text-[10px] text-slate-300 font-medium rounded-md pointer-events-none tracking-wider uppercase">
          元の画像 (Before)
        </div>
        <div className="absolute bottom-6 right-6 px-3 py-1 bg-cyan-950/80 backdrop-blur border border-cyan-800/50 text-[10px] text-cyan-300 font-medium rounded-md pointer-events-none tracking-wider uppercase">
          圧縮後 (After)
        </div>
      </div>
    </div>
  );
}
export type { BeforeAfterSliderProps };
