import React, { useState, useRef, useEffect } from 'react';
import { 
  Sparkles, 
  Type, 
  Trash2, 
  Plus, 
  Type as FontIcon, 
  Download, 
  MousePointer2, 
  Layers, 
  HelpCircle,
  MessageSquare,
  Bookmark,
  RefreshCw,
  X,
  Palette
} from 'lucide-react';

interface DragItem {
  id: string;
  type: 'badge' | 'bubble' | 'plate' | 'text';
  text: string;
  badgeNum: string; // '2', '3', '5', or any short number/char
  badgeUnit: string; // '個セット', '限', 'OFF' など
  x: number; // percentage coordinates (0 - 100) relative to image container
  y: number; // percentage coordinates (0 - 100) relative to image container
  color: string; // Background color HEX/Tailwind class
  textColor: string; // Text color HEX
  fontSize: number; // px equivalent at standard viewport 
  fontWeight: string; // '300' | '400' | '700' | '950'
  fontFamily: 'Noto' | 'CCPixelArcade' | 'Sans';
  plateRounding: 'none' | 'md' | 'full';
  bubbleDirection: 'bottom' | 'top' | 'left' | 'right';
}

interface TextGridCheckerProps {
  imageSrc: string;
  onMarkChange: (markedCount: number) => void;
  onReset: () => void;
}

const PRESET_COLORS = [
  { name: 'レッド', bg: '#EF4444', text: '#FFFFFF' },
  { name: 'マゼンタ', bg: '#EC4899', text: '#FFFFFF' },
  { name: 'ゴールド', bg: '#F59E0B', text: '#000000' },
  { name: 'イエロー', bg: '#FDE047', text: '#000000' },
  { name: 'ブラック', bg: '#0F172A', text: '#FFFFFF' },
  { name: 'ホワイト', bg: '#FFFFFF', text: '#1E293B' },
  { name: 'エメラルド', bg: '#10B981', text: '#FFFFFF' },
];

export default function TextGridChecker({
  imageSrc,
  onMarkChange,
  onReset,
}: TextGridCheckerProps) {
  // Mode selection: 'mark' = 10x10 selector, 'simulation' = add overlays
  const [activeMode, setActiveMode] = useState<'mark' | 'simulation'>('mark');

  // Grid Checker States
  const [grid, setGrid] = useState<boolean[]>(Array(100).fill(false));
  const [isDrawing, setIsDrawing] = useState<boolean>(false);
  const [drawMode, setDrawMode] = useState<boolean>(true); // true = draw, false = erase
  const containerRef = useRef<HTMLDivElement>(null);
  const imageContainerRef = useRef<HTMLDivElement>(null);

  // Simulation Overlay States
  const [items, setItems] = useState<DragItem[]>([
    {
      id: 'default-badge',
      type: 'badge',
      text: '',
      badgeNum: '3',
      badgeUnit: '個セット',
      x: 15,
      y: 15,
      color: '#F59E0B',
      textColor: '#000000',
      fontSize: 16,
      fontWeight: '950',
      fontFamily: 'Noto',
      plateRounding: 'full',
      bubbleDirection: 'bottom',
    },
    {
      id: 'default-bubble',
      type: 'bubble',
      text: '特別限定価格キャンペーン！',
      badgeNum: '',
      badgeUnit: '',
      x: 45,
      y: 75,
      color: '#EF4444',
      textColor: '#FFFFFF',
      fontSize: 13,
      fontWeight: '700',
      fontFamily: 'Noto',
      plateRounding: 'md',
      bubbleDirection: 'bottom',
    }
  ]);
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);

  // Drag States
  const [draggedItemId, setDraggedItemId] = useState<string | null>(null);
  const dragStartOffset = useRef({ x: 0, y: 0 });

  const markedCount = grid.filter(Boolean).length;

  useEffect(() => {
    onMarkChange(markedCount);
  }, [grid, markedCount, onMarkChange]);

  // Grid Cell Actions
  const handleCellDown = (index: number, e: React.MouseEvent | React.TouchEvent) => {
    if (activeMode !== 'mark') return;
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
    if (activeMode !== 'mark' || !isDrawing) return;
    if (grid[index] !== drawMode) {
      const newGrid = [...grid];
      newGrid[index] = drawMode;
      setGrid(newGrid);
    }
  };

  // Touch Support for Grid Painting
  const handleTouchMove = (e: React.TouchEvent) => {
    if (activeMode !== 'mark' || !isDrawing || !containerRef.current) return;
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

  // Global mouse/touch release
  useEffect(() => {
    const handleGlobalMouseUp = () => {
      setIsDrawing(false);
      setDraggedItemId(null);
    };
    window.addEventListener('mouseup', handleGlobalMouseUp);
    window.addEventListener('touchend', handleGlobalMouseUp);
    return () => {
      window.removeEventListener('mouseup', handleGlobalMouseUp);
      window.removeEventListener('touchend', handleGlobalMouseUp);
    };
  }, []);

  // Item Drag Action Handlers
  const handleItemStartDrag = (id: string, e: React.MouseEvent | React.TouchEvent) => {
    if (activeMode !== 'simulation') return;
    e.stopPropagation();
    
    // Select the item
    setSelectedItemId(id);
    setDraggedItemId(id);

    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;

    const item = items.find(it => it.id === id);
    const container = imageContainerRef.current;
    if (!item || !container) return;

    const rect = container.getBoundingClientRect();
    const itemXInPixels = (item.x / 100) * rect.width;
    const itemYInPixels = (item.y / 100) * rect.height;

    const rawMouseX = clientX - rect.left;
    const rawMouseY = clientY - rect.top;

    dragStartOffset.current = {
      x: rawMouseX - itemXInPixels,
      y: rawMouseY - itemYInPixels
    };
  };

  const handleCanvasMouseMove = (e: React.MouseEvent | React.TouchEvent) => {
    if (activeMode !== 'simulation' || !draggedItemId || !imageContainerRef.current) return;
    
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;

    const container = imageContainerRef.current;
    const rect = container.getBoundingClientRect();

    const mouseX = clientX - rect.left;
    const mouseY = clientY - rect.top;

    let targetXInPx = mouseX - dragStartOffset.current.x;
    let targetYInPx = mouseY - dragStartOffset.current.y;

    // Convert back to percentages
    let percentageX = (targetXInPx / rect.width) * 100;
    let percentageY = (targetYInPx / rect.height) * 100;

    // Boundary snap lock
    percentageX = Math.max(0, Math.min(100, percentageX));
    percentageY = Math.max(0, Math.min(100, percentageY));

    setItems(prev => prev.map(it => 
      it.id === draggedItemId 
        ? { ...it, x: percentageX, y: percentageY } 
        : it
    ));
  };

  // Add items
  const handleAddItem = (type: DragItem['type']) => {
    const defaultText = {
      badge: '',
      bubble: '特別大特価セール！',
      plate: '＼ 本日限定 50%OFF ／',
      text: 'ここに文字を挿入'
    }[type];

    const newItem: DragItem = {
      id: `${type}-${Date.now()}`,
      type,
      text: defaultText,
      badgeNum: type === 'badge' ? '2' : '',
      badgeUnit: type === 'badge' ? '個セット' : '',
      x: 30 + (items.length * 5) % 40,
      y: 30 + (items.length * 5) % 40,
      color: type === 'bubble' ? '#EC4899' : type === 'badge' ? '#F59E0B' : '#FEF08A',
      textColor: type === 'plate' ? '#0F172A' : '#FFFFFF',
      fontSize: type === 'badge' ? 16 : 14,
      fontWeight: '700',
      fontFamily: 'Noto',
      plateRounding: 'md',
      bubbleDirection: 'bottom',
    };

    setItems(prev => [...prev, newItem]);
    setSelectedItemId(newItem.id);
  };

  const handleUpdateSelectedItem = <K extends keyof DragItem>(key: K, value: DragItem[K]) => {
    if (!selectedItemId) return;
    setItems(prev => prev.map(it => it.id === selectedItemId ? { ...it, [key]: value } : it));
  };

  const handleDeleteItem = (id: string) => {
    setItems(prev => prev.filter(it => it.id !== id));
    if (selectedItemId === id) setSelectedItemId(null);
  };

  const handleClear = () => {
    setGrid(Array(100).fill(false));
  };

  // Safe client-side Canvas compositor of Image overlays
  const handleExportComposedImage = () => {
    const baseImg = new Image();
    baseImg.crossOrigin = "anonymous";
    baseImg.src = imageSrc;
    baseImg.onload = () => {
      // Setup canvas with exactly match the uploaded file dimensions
      const canvas = document.createElement('canvas');
      canvas.width = baseImg.naturalWidth;
      canvas.height = baseImg.naturalHeight;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      // Draw standard original image
      ctx.drawImage(baseImg, 0, 0, canvas.width, canvas.height);

      // Render overlapping items sequentially matching original scale ratio
      items.forEach(item => {
        const xPx = (item.x / 100) * canvas.width;
        const yPx = (item.y / 100) * canvas.height;

        // Custom responsive font scale relative to original width (assumed base standard 800px width)
        const scaleFactor = canvas.width / 400; 
        const fontSizePx = Math.round(item.fontSize * scaleFactor);
        const fontWeightStr = item.fontWeight;
        
        let fontStack = '';
        if (item.fontFamily === 'CCPixelArcade') {
          fontStack = `${fontWeightStr} ${fontSizePx}px "CCPixelArcade", "Noto Sans JP", sans-serif`;
        } else if (item.fontFamily === 'Noto') {
          fontStack = `${fontWeightStr} ${fontSizePx}px "Noto Sans JP", sans-serif`;
        } else {
          fontStack = `${fontWeightStr} ${fontSizePx}px sans-serif`;
        }
        ctx.font = fontStack;

        if (item.type === 'text') {
          ctx.fillStyle = item.textColor;
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(item.text, xPx, yPx);
        }

        else if (item.type === 'plate') {
          ctx.font = fontStack;
          const textMetrics = ctx.measureText(item.text);
          const py = fontSizePx * 0.4;
          const px = fontSizePx * 0.8;
          const plateWidth = textMetrics.width + px * 2;
          const plateHeight = fontSizePx + py * 2;
          
          ctx.fillStyle = item.color;
          ctx.beginPath();
          if (item.plateRounding === 'full') {
            ctx.roundRect(xPx - plateWidth / 2, yPx - plateHeight / 2, plateWidth, plateHeight, plateHeight / 2);
          } else if (item.plateRounding === 'md') {
            ctx.roundRect(xPx - plateWidth / 2, yPx - plateHeight / 2, plateWidth, plateHeight, 8 * scaleFactor);
          } else {
            ctx.rect(xPx - plateWidth / 2, yPx - plateHeight / 2, plateWidth, plateHeight);
          }
          ctx.fill();

          ctx.fillStyle = item.textColor;
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(item.text, xPx, yPx);
        }

        else if (item.type === 'badge') {
          const radius = fontSizePx * 1.6;
          ctx.fillStyle = item.color;
          ctx.beginPath();
          ctx.arc(xPx, yPx, radius, 0, Math.PI * 2);
          ctx.fill();

          // Stroke border
          ctx.lineWidth = 2 * scaleFactor;
          ctx.strokeStyle = '#FFFFFF';
          ctx.stroke();

          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';

          // Separate big number and unit text lines
          const numFontSize = Math.round(fontSizePx * 1.5);
          const unitFontSize = Math.round(fontSizePx * 0.7);

          // Big number draw
          ctx.font = `${item.fontWeight} ${numFontSize}px ${item.fontFamily === 'CCPixelArcade' ? '"CCPixelArcade", ' : ''}"Noto Sans JP", sans-serif`;
          ctx.fillStyle = item.textColor;
          ctx.fillText(item.badgeNum, xPx, yPx - radius * 0.15);

          // Unit text draw
          ctx.font = `700 ${unitFontSize}px "Noto Sans JP", sans-serif`;
          ctx.fillText(item.badgeUnit, xPx, yPx + radius * 0.45);
        }

        else if (item.type === 'bubble') {
          ctx.font = fontStack;
          const textMetrics = ctx.measureText(item.text);
          const py = fontSizePx * 0.4;
          const px = fontSizePx * 0.7;
          const bubbleW = textMetrics.width + px * 2;
          const bubbleH = fontSizePx + py * 2;
          const rectX = xPx - bubbleW / 2;
          const rectY = yPx - bubbleH / 2;

          ctx.fillStyle = item.color;
          ctx.beginPath();
          // Draw rect body
          ctx.roundRect(rectX, rectY, bubbleW, bubbleH, 6 * scaleFactor);
          // Draw speech node arrow
          const arrowOffset = 8 * scaleFactor;
          if (item.bubbleDirection === 'bottom') {
            ctx.moveTo(xPx - arrowOffset, rectY + bubbleH);
            ctx.lineTo(xPx, rectY + bubbleH + arrowOffset);
            ctx.lineTo(xPx + arrowOffset, rectY + bubbleH);
          } else if (item.bubbleDirection === 'top') {
            ctx.moveTo(xPx - arrowOffset, rectY);
            ctx.lineTo(xPx, rectY - arrowOffset);
            ctx.lineTo(xPx + arrowOffset, rectY);
          } else if (item.bubbleDirection === 'left') {
            ctx.moveTo(rectX, yPx - arrowOffset);
            ctx.lineTo(rectX - arrowOffset, yPx);
            ctx.lineTo(rectX, yPx + arrowOffset);
          } else if (item.bubbleDirection === 'right') {
            ctx.moveTo(rectX + bubbleW, yPx - arrowOffset);
            ctx.lineTo(rectX + bubbleW + arrowOffset, yPx);
            ctx.lineTo(rectX + bubbleW, yPx + arrowOffset);
          }
          ctx.closePath();
          ctx.fill();

          ctx.fillStyle = item.textColor;
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(item.text, xPx, yPx);
        }
      });

      // Save compositor result
      const outUrl = canvas.toDataURL('image/png');
      const a = document.createElement('a');
      a.download = `gyuttee_composite_${Date.now()}.png`;
      a.href = outUrl;
      a.click();
    };
  };

  const selectedItemObj = items.find(it => it.id === selectedItemId);

  return (
    <div className="flex flex-col lg:flex-row h-full w-full gap-5 select-none text-white" ref={containerRef}>
      
      {/* 1. LEFT MAIN CANVAS CONTAINER VORTEX */}
      <div className="flex-1 flex flex-col gap-3">
        {/* Mode & Action Control Header Tabs */}
        <div className="flex items-center justify-between p-1 bg-slate-900/60 rounded-xl border border-white/5">
          <div className="flex gap-1">
            <button
              onClick={() => { setActiveMode('mark'); setSelectedItemId(null); }}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                activeMode === 'mark' 
                  ? 'bg-slate-800 text-emerald-400 shadow-inner' 
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Layers size={13} />
              グリッドマーク判定
            </button>
            <button
              onClick={() => setActiveMode('simulation')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                activeMode === 'simulation' 
                  ? 'bg-slate-800 text-emerald-400 shadow-inner' 
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Sparkles size={13} />
              シミュレータ (追加パーツ重ね)
            </button>
          </div>

          <div className="flex gap-1.5 pr-1">
            {activeMode === 'mark' ? (
              <button
                onClick={handleClear}
                className="text-[10px] uppercase font-bold tracking-wider px-2 py-1 bg-slate-800/80 hover:bg-slate-800 rounded text-slate-300 transition-all"
              >
                全マーク消去
              </button>
            ) : (
              <button
                onClick={handleExportComposedImage}
                className="flex items-center gap-1 text-[10px] uppercase font-bold tracking-widest px-2.5 py-1 bg-emerald-500 text-slate-950 rounded hover:bg-emerald-400 transition-all"
              >
                <Download size={10} />
                合成画像を保存
              </button>
            )}
          </div>
        </div>

        {/* The Live Interactive Canvas Wrapper */}
        <div 
          ref={imageContainerRef}
          onMouseMove={handleCanvasMouseMove}
          onTouchMove={handleCanvasMouseMove}
          className="relative min-h-[300px] aspect-square w-full rounded-2xl bg-neutral-950 border border-slate-800/80 overflow-hidden flex items-center justify-center p-3 shadow-2xl"
        >
          {/* Contain Wrapper to exactly overlap elements on aspect proportion */}
          <div className="relative w-full h-full max-h-[36vh] flex items-center justify-center aspect-square select-none">
            {/* Base Uploaded User Banner */}
            <img
              src={imageSrc}
              alt="Simulation Source"
              className="w-full h-full object-contain max-h-[36vh] rounded-lg pointer-events-none opacity-80"
            />

            {/* LAYER 1: Interactive Overlay Draggable Items Panel */}
            <div className="absolute inset-0 pointer-events-none z-20">
              {items.map((item) => {
                const isSelected = selectedItemId === item.id;
                
                // Set interactive properties
                const itemStyles: React.CSSProperties = {
                  left: `${item.x}%`,
                  top: `${item.y}%`,
                  transform: 'translate(-50%, -50%)',
                  position: 'absolute',
                  cursor: activeMode === 'simulation' ? 'move' : 'default',
                  // Noto Sans, fallback pixel, fallback sans
                  fontFamily: item.fontFamily === 'CCPixelArcade' 
                    ? '"CCPixelArcade", "Noto Sans JP", sans-serif'
                    : '"Noto Sans JP", sans-serif',
                  fontWeight: item.fontWeight,
                  fontSize: `${item.fontSize}px`,
                  color: item.textColor,
                };

                return (
                  <div
                    key={item.id}
                    style={itemStyles}
                    onMouseDown={(e) => handleItemStartDrag(item.id, e)}
                    onTouchStart={(e) => handleItemStartDrag(item.id, e)}
                    className={`pointer-events-auto select-none select-all transition-shadow relative group ${
                      isSelected ? 'ring-2 ring-emerald-400 ring-offset-2 ring-offset-slate-950' : 'hover:ring-1 hover:ring-white/30'
                    }`}
                  >
                    {/* Visualizer output according to item type */}
                    {item.type === 'text' && (
                      <span className="whitespace-nowrap px-1 py-0.5">{item.text}</span>
                    )}

                    {item.type === 'plate' && (
                      <div 
                        style={{ backgroundColor: item.color }} 
                        className={`px-3 py-1.5 whitespace-nowrap shadow-md select-none ${
                          item.plateRounding === 'full' ? 'rounded-full' : item.plateRounding === 'md' ? 'rounded-md' : 'rounded-none'
                        }`}
                      >
                        {item.text}
                      </div>
                    )}

                    {item.type === 'badge' && (
                      <div 
                        style={{ backgroundColor: item.color, borderColor: '#FFFFFF' }} 
                        className="w-14 h-14 rounded-full flex flex-col justify-center items-center text-center shadow-lg border-2"
                      >
                        <span className="text-xl font-black leading-none -mb-0.5" style={{ color: item.textColor }}>
                          {item.badgeNum}
                        </span>
                        <span className="text-[7px] font-bold tracking-tight opacity-90 leading-none" style={{ color: item.textColor }}>
                          {item.badgeUnit}
                        </span>
                      </div>
                    )}

                    {item.type === 'bubble' && (
                      <div 
                        style={{ backgroundColor: item.color }} 
                        className="px-3 py-1.5 whitespace-nowrap rounded-md relative shadow-md"
                      >
                        <span style={{ color: item.textColor }}>{item.text}</span>
                        {/* Triangular pointer */}
                        <div 
                          style={{ borderColor: item.color }}
                          className={`absolute w-0 h-0 border-[5px] border-transparent 
                            ${item.bubbleDirection === 'bottom' ? 'bottom-[-10px] left-1/2 -translate-x-1/2 border-t-current' : ''}
                            ${item.bubbleDirection === 'top' ? 'top-[-10px] left-1/2 -translate-x-1/2 border-b-current' : ''}
                            ${item.bubbleDirection === 'left' ? 'left-[-10px] top-1/2 -translate-y-1/2 border-r-current' : ''}
                            ${item.bubbleDirection === 'right' ? 'right-[-10px] top-1/2 -translate-y-1/2 border-l-current' : ''}
                          `}
                        />
                      </div>
                    )}

                    {/* Simple quick remover button when in Simulation mode */}
                    {activeMode === 'simulation' && (
                      <button
                        onClick={(e) => { e.stopPropagation(); handleDeleteItem(item.id); }}
                        className="absolute -top-3.5 -right-3.5 w-5 h-5 bg-rose-500 hover:bg-rose-600 rounded-full flex items-center justify-center text-white scale-0 group-hover:scale-100 transition-transform shadow-md z-30 cursor-pointer"
                      >
                        <X size={10} />
                      </button>
                    )}
                  </div>
                );
              })}
            </div>

            {/* LAYER 2: Grid Cells Painting Selector (Mark Mode only) */}
            <div 
              className={`absolute inset-0 m-auto aspect-square grid grid-cols-10 grid-rows-10 border border-sky-400/25 overflow-hidden rounded-lg bg-transparent transition-opacity duration-300
                ${activeMode === 'mark' ? 'opacity-100 z-10' : 'opacity-25 pointer-events-none z-0'}
              `}
              style={{ maxHeight: '100%', maxWidth: '100%' }}
            >
              {grid.map((isMarked, index) => (
                <div
                  key={index}
                  data-cell-index={index}
                  onMouseDown={(e) => handleCellDown(index, e)}
                  onTouchStart={(e) => handleCellDown(index, e)}
                  onMouseEnter={() => handleCellEnter(index)}
                  className={`relative border flex items-start justify-start p-0.5 cursor-pointer transition-all duration-100 select-none
                    ${isMarked 
                      ? 'bg-rose-500/35 border-rose-400/80 shadow-[inset_0_0_4px_rgba(244,63,94,0.5)]' 
                      : 'border-slate-700/10 hover:bg-sky-500/10 hover:border-sky-500/20'
                    }
                  `}
                >
                  <span 
                    data-cell-index={index}
                    className="font-mono text-[6px] text-slate-500/50 select-none pointer-events-none absolute top-0.5 left-0.5"
                  >
                    {index + 1}
                  </span>
                </div>
              ))}
            </div>

          </div>
        </div>
      </div>

      {/* 2. RIGHT GRAPHICAL CONFIGURATION PANEL FOR SIMULATION / DECOR */}
      <div className="w-full lg:w-[220px] flex flex-col gap-3.5 bg-slate-900/40 border border-white/5 rounded-2xl p-4 flex-shrink-0">
        {activeMode === 'mark' ? (
          // MARK GUIDE MANUAL
          <div className="space-y-3 my-auto text-slate-300">
            <h4 className="text-[10px] font-extrabold uppercase tracking-widest text-emerald-400 flex items-center gap-1 select-none">
              <Layers size={11} /> Grid Instructions
            </h4>
            <p className="text-[11px] leading-relaxed select-none">
              画像上の 10x10 マスの中で、広告の <b>[文字コピー/ロゴ/追加装飾]</b> が重なっているマスをドラッグまたはクリックしてマークしてください。
            </p>
            <div className="bg-slate-950/50 rounded-xl p-3 border border-white/5 space-y-2 select-none">
              <div className="flex items-center gap-2 text-xs">
                <div className="w-2.5 h-2.5 rounded bg-rose-500/30 border border-rose-500/75" />
                <span className="text-[11px] text-slate-400 font-medium">追加ロゴ・文字</span>
              </div>
              <div className="flex items-center gap-2 text-xs">
                <div className="w-2.5 h-2.5 rounded border border-slate-700 bg-transparent" />
                <span className="text-[11px] text-slate-400 font-medium">未マーク (空き・安全エリア)</span>
              </div>
            </div>
            <p className="text-[10px] text-slate-500 italic leading-snug">
              ※ マークされた個数(%)は自動感知され、リアルタイムに配信安全性にフィードバックされます。
            </p>
          </div>
        ) : (
          // INTERACTIVE SIMULATOR ITEM CONFIG
          <div className="space-y-4 flex-1 flex flex-col justify-between">
            <div>
              <h4 className="text-[11px] font-extrabold uppercase tracking-widest text-emerald-400 flex items-center gap-1 mb-2.5">
                <Plus size={11} /> パーツ追加 (Overlay)
              </h4>
              
              {/* Overlay Preset Adders */}
              <div className="grid grid-cols-2 gap-1.5 mb-4">
                <button
                  type="button"
                  onClick={() => handleAddItem('bubble')}
                  className="px-2 py-2 bg-slate-800 hover:bg-slate-700 rounded-lg text-[10px] font-bold text-left flex items-center gap-1.5 transition-all text-slate-200 cursor-pointer"
                >
                  <MessageSquare size={12} className="text-pink-400" />
                  吹き出し
                </button>
                <button
                  type="button"
                  onClick={() => handleAddItem('plate')}
                  className="px-2 py-2 bg-slate-800 hover:bg-slate-700 rounded-lg text-[10px] font-bold text-left flex items-center gap-1.5 transition-all text-slate-200 cursor-pointer"
                >
                  <Bookmark size={12} className="text-amber-400" />
                  ざぶとん
                </button>
                <button
                  type="button"
                  onClick={() => handleAddItem('badge')}
                  className="px-2 py-2 bg-slate-800 hover:bg-slate-700 rounded-lg text-[10px] font-bold text-left flex items-center gap-1.5 transition-all text-slate-200 cursor-pointer"
                >
                  <Sparkles size={12} className="text-yellow-400" />
                  バッジ/セット
                </button>
                <button
                  type="button"
                  onClick={() => handleAddItem('text')}
                  className="px-2 py-2 bg-slate-800 hover:bg-slate-700 rounded-lg text-[10px] font-bold text-left flex items-center gap-1.5 transition-all text-slate-200 cursor-pointer"
                >
                  <Type size={12} className="text-sky-400" />
                  一般テキスト
                </button>
              </div>

              {/* Selected Item Properties tuner */}
              {selectedItemObj ? (
                <div className="pt-3 border-t border-white/5 space-y-3">
                  <div className="flex justify-between items-center select-none">
                    <span className="text-[9px] font-black uppercase text-slate-400 tracking-wider">
                      パーツ調節パネル
                    </span>
                    <button
                      onClick={() => setSelectedItemId(null)}
                      className="text-[9px] font-bold text-slate-500 hover:text-white"
                    >
                      閉じる
                    </button>
                  </div>

                  {/* Text Contents input flow */}
                  {selectedItemObj.type !== 'badge' ? (
                    <div className="space-y-1">
                      <label className="text-[9px] font-bold text-slate-500 uppercase tracking-widest block">
                        テキスト編集
                      </label>
                      <input
                        type="text"
                        value={selectedItemObj.text}
                        onChange={(e) => handleUpdateSelectedItem('text', e.target.value)}
                        className="w-full bg-slate-950 border border-slate-800 rounded px-2 py-1 text-xs text-white outline-none focus:border-emerald-500 font-medium"
                      />
                    </div>
                  ) : (
                    // Badge Number setup
                    <div className="grid grid-cols-2 gap-1.5">
                      <div className="space-y-1">
                        <label className="text-[9px] font-bold text-slate-500 uppercase tracking-widest block">
                          数字/値
                        </label>
                        <input
                          type="text"
                          maxLength={3}
                          value={selectedItemObj.badgeNum}
                          onChange={(e) => handleUpdateSelectedItem('badgeNum', e.target.value)}
                          className="w-full bg-slate-950 border border-slate-800 rounded px-2 py-1 text-xs text-white text-center outline-none focus:border-emerald-500 font-bold"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[9px] font-bold text-slate-500 uppercase tracking-widest block">
                          単位・ラベル
                        </label>
                        <input
                          type="text"
                          value={selectedItemObj.badgeUnit}
                          onChange={(e) => handleUpdateSelectedItem('badgeUnit', e.target.value)}
                          className="w-full bg-slate-950 border border-slate-800 rounded px-2 py-1 text-xs text-white text-center outline-none focus:border-emerald-500 font-semibold"
                        />
                      </div>
                    </div>
                  )}

                  {/* Font Setting Options */}
                  <div className="space-y-1">
                    <label className="text-[9px] font-bold text-slate-500 uppercase tracking-widest block">
                      フォント指定
                    </label>
                    <div className="grid grid-cols-2 gap-1">
                      <button
                        type="button"
                        onClick={() => handleUpdateSelectedItem('fontFamily', 'Noto')}
                        className={`py-1 text-[9px] font-bold rounded ${
                          selectedItemObj.fontFamily === 'Noto' 
                            ? 'bg-emerald-500 text-slate-950 shadow' 
                            : 'bg-slate-950 text-slate-400 hover:text-white'
                        }`}
                      >
                        Noto Sans
                      </button>
                      <button
                        type="button"
                        onClick={() => handleUpdateSelectedItem('fontFamily', 'CCPixelArcade')}
                        className={`py-1 text-[9px] font-bold rounded ${
                          selectedItemObj.fontFamily === 'CCPixelArcade' 
                            ? 'bg-emerald-500 text-slate-950 shadow' 
                            : 'bg-slate-950 text-slate-400 hover:text-white'
                        }`}
                        title="Adobe 'CCPixelArcade' フォント。契約されているPC等で有効になります"
                      >
                        CCPixelArcade
                      </button>
                    </div>
                  </div>

                  {/* Weight setup */}
                  <div className="space-y-1">
                    <div className="flex justify-between items-baseline">
                      <label className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">
                        ウェイト (太さ)
                      </label>
                      <span className="text-[9px] font-bold text-emerald-400">
                        {
                          selectedItemObj.fontWeight === '300' ? '細 (Light)' :
                          selectedItemObj.fontWeight === '400' ? '通常 (Regular)' :
                          selectedItemObj.fontWeight === '700' ? '太字 (Bold)' : '極太 (Black)'
                        }
                      </span>
                    </div>
                    <select
                      value={selectedItemObj.fontWeight}
                      onChange={(e) => handleUpdateSelectedItem('fontWeight', e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded px-2 py-1 text-xs text-white font-medium cursor-pointer"
                    >
                      <option value="300">Light (300)</option>
                      <option value="400">Regular (400)</option>
                      <option value="700">Bold (700)</option>
                      <option value="950">Black (950)</option>
                    </select>
                  </div>

                  {/* Size customization bar */}
                  <div className="space-y-1">
                    <div className="flex justify-between items-baseline text-[9px] font-bold text-slate-500 uppercase tracking-widest">
                      <span>文字サイズ</span>
                      <span>{selectedItemObj.fontSize}px</span>
                    </div>
                    <input
                      type="range"
                      min="9"
                      max="32"
                      value={selectedItemObj.fontSize}
                      onChange={(e) => handleUpdateSelectedItem('fontSize', parseInt(e.target.value, 10))}
                      className="w-full accent-emerald-400 h-1 bg-slate-950 rounded cursor-pointer"
                    />
                  </div>

                  {/* Presets Overlay Background Colors */}
                  {selectedItemObj.type !== 'text' && (
                    <div className="space-y-1">
                      <label className="text-[9px] font-bold text-slate-500 uppercase tracking-widest block">
                        背景テーマ色 (ざぶとん/バッジ)
                      </label>
                      <div className="flex flex-wrap gap-1">
                        {PRESET_COLORS.map((clr) => (
                          <button
                            key={clr.name}
                            type="button"
                            onClick={() => {
                              handleUpdateSelectedItem('color', clr.bg);
                              handleUpdateSelectedItem('textColor', clr.text);
                            }}
                            className={`w-4 h-4 rounded-full border transition-all ${
                              selectedItemObj.color === clr.bg ? 'scale-125 border-emerald-400' : 'border-transparent hover:scale-110'
                            }`}
                            style={{ backgroundColor: clr.bg }}
                            title={clr.name}
                          />
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Plate rounding specific */}
                  {selectedItemObj.type === 'plate' && (
                    <div className="space-y-1">
                      <label className="text-[9px] font-bold text-slate-500 uppercase tracking-widest block">
                        ざぶとんの角丸
                      </label>
                      <select
                        value={selectedItemObj.plateRounding}
                        onChange={(e) => handleUpdateSelectedItem('plateRounding', e.target.value as any)}
                        className="w-full bg-slate-950 border border-slate-800 rounded px-2 py-1 text-xs text-white font-medium cursor-pointer"
                      >
                        <option value="none">直角 (0px)</option>
                        <option value="md">やや丸み (6px)</option>
                        <option value="full">完全丸み (50%)</option>
                      </select>
                    </div>
                  )}

                  {/* Bubble pointer specific */}
                  {selectedItemObj.type === 'bubble' && (
                    <div className="space-y-1">
                      <label className="text-[9px] font-bold text-slate-500 uppercase tracking-widest block">
                        吹き出しの矢印方向
                      </label>
                      <select
                        value={selectedItemObj.bubbleDirection}
                        onChange={(e) => handleUpdateSelectedItem('bubbleDirection', e.target.value as any)}
                        className="w-full bg-slate-950 border border-slate-800 rounded px-2 py-1 text-xs text-white font-medium cursor-pointer"
                      >
                        <option value="bottom">下へ (Down)</option>
                        <option value="top">上へ (Up)</option>
                        <option value="left">左へ (Left)</option>
                        <option value="right">右へ (Right)</option>
                      </select>
                    </div>
                  )}

                  <button
                    onClick={() => handleDeleteItem(selectedItemObj.id)}
                    className="flex items-center justify-center gap-1.5 w-full py-1.5 bg-rose-500/10 hover:bg-rose-500 text-rose-400 hover:text-white rounded text-[10px] font-bold transition-colors cursor-pointer"
                  >
                    <Trash2 size={11} /> 
                    このアイテムを消去
                  </button>
                </div>
              ) : (
                <div className="p-4 rounded-xl border border-dashed border-white/5 bg-slate-950/20 text-center select-none">
                  <p className="text-[10px] text-slate-500 leading-normal">
                    追加した重ねパーツや文字をクリックすると、ここにフォントの太さ・色・文字サイズを動的に変更できる詳細調整パネルが開きます。
                  </p>
                </div>
              )}
            </div>

            <div className="pt-2.5 border-t border-white/5 space-y-1 text-[9px] text-slate-500 select-none">
              <p>📌 追加した重ねパーツは画像上で自由に<b>ドラッグ移動</b>できます。</p>
            </div>
          </div>
        )}
      </div>

    </div>
  );
}
export type { TextGridCheckerProps, DragItem };
