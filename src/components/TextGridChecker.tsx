import React, { useState, useRef, useEffect } from 'react';
import { 
  Sparkles, 
  Trash2, 
  Plus, 
  Download, 
  Layers, 
  MessageSquare,
  Bookmark,
  X,
  Type,
  Maximize2,
  CheckCircle2,
  AlertTriangle,
  Info
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

  // Grid Checker States (Manual User Painting Settings)
  const [grid, setGrid] = useState<boolean[]>(Array(100).fill(false));
  const [autoGrid, setAutoGrid] = useState<boolean[]>(Array(100).fill(false));
  const [isDrawing, setIsDrawing] = useState<boolean>(false);
  const [drawMode, setDrawMode] = useState<boolean>(true); // true = draw, false = erase
  
  // Custom interactive output export dimensions multiplier
  const [exportScale, setExportScale] = useState<number>(1.0);
  const [baseImageDimensions, setBaseImageDimensions] = useState({ width: 800, height: 800 });

  const containerRef = useRef<HTMLDivElement>(null);
  const imageContainerRef = useRef<HTMLDivElement>(null);

  // Simulation Overlay States with Multi-line Default text supports
  const [items, setItems] = useState<DragItem[]>([
    {
      id: 'default-badge',
      type: 'badge',
      text: '',
      badgeNum: '3',
      badgeUnit: '個セット',
      x: 18,
      y: 18,
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
      text: '＼本日限定／\n大感謝祭セール！',
      badgeNum: '',
      badgeUnit: '',
      x: 50,
      y: 78,
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

  // ───────────────────────────────────────────────────────────────
  // DYNAMIC OVERLAPPING AUTOMATIC MATH DETECTOR
  // Calculate bounding boxes of layered items on top of 10x10 grid
  // ───────────────────────────────────────────────────────────────
  useEffect(() => {
    const updatedAutoGrid = Array(100).fill(false);

    items.forEach((item) => {
      // Approximate physical scale percent occupied by elements on overlay.
      // 10x10 grid cell is strictly 10% x 10%.
      let widthPercent = 12;
      let heightPercent = 12;

      if (item.type === 'badge') {
        const diameter = item.fontSize * 3.2;
        widthPercent = Math.max(10, (diameter / 360) * 100);
        heightPercent = widthPercent;
      } else {
        // Evaluate multiple lines of texts bounding widths
        const lines = item.text.split('\n');
        const longestLine = lines.reduce((max, l) => l.length > max.length ? l : max, '');
        const charCount = longestLine.length || 1;
        
        const estTextWidth = charCount * item.fontSize * 0.72;
        const estTextHeight = lines.length * item.fontSize * 1.35;

        const padX = item.type === 'plate' ? item.fontSize * 1.8 : item.type === 'bubble' ? item.fontSize * 1.4 : 10;
        const padY = item.type === 'plate' ? item.fontSize * 0.8 : item.type === 'bubble' ? item.fontSize * 0.8 + 10 : 8;

        widthPercent = Math.max(10, ((estTextWidth + padX) / 360) * 100);
        heightPercent = Math.max(6, ((estTextHeight + padY) / 360) * 100);
      }

      // Compute boundaries relative to total bounding container (0-100%)
      const minX = item.x - widthPercent / 2;
      const maxX = item.x + widthPercent / 2;
      const minY = item.y - heightPercent / 2;
      const maxY = item.y + heightPercent / 2;

      // Map overlapping coordinates directly to grid cells
      for (let i = 0; i < 100; i++) {
        const col = i % 10;
        const row = Math.floor(i / 10);

        const cellMinX = col * 10;
        const cellMaxX = (col + 1) * 10;
        const cellMinY = row * 10;
        const cellMaxY = (row + 1) * 10;

        // Check 2D Rectangle overlap
        const overlapX = Math.max(0, Math.min(cellMaxX, maxX) - Math.max(cellMinX, minX)) > 0.1;
        const overlapY = Math.max(0, Math.min(cellMaxY, maxY) - Math.max(cellMinY, minY)) > 0.1;

        if (overlapX && overlapY) {
          updatedAutoGrid[i] = true;
        }
      }
    });

    setAutoGrid(updatedAutoGrid);
  }, [items]);

  // Read dimensions from original image on load
  useEffect(() => {
    if (!imageSrc) return;
    const img = new Image();
    img.src = imageSrc;
    img.onload = () => {
      setBaseImageDimensions({
        width: img.naturalWidth || 800,
        height: img.naturalHeight || 800
      });
    };
  }, [imageSrc]);

  // Combined Grid: Union of Manual Marks & Automatic Item overlays
  const unifiedGrid = grid.map((isManual, idx) => isManual || autoGrid[idx]);
  const unifiedMarkedCount = unifiedGrid.filter(Boolean).length;

  useEffect(() => {
    onMarkChange(unifiedMarkedCount);
  }, [unifiedMarkedCount, onMarkChange]);

  // Grid Cell Actions (Manually Painting)
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

  // Touch Support for Painting
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

  // Global Mouse release watcher
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

  // Simulator Drag handles
  const handleItemStartDrag = (id: string, e: React.MouseEvent | React.TouchEvent) => {
    if (activeMode !== 'simulation') return;
    e.stopPropagation();
    
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

    let percentageX = (targetXInPx / rect.width) * 100;
    let percentageY = (targetYInPx / rect.height) * 100;

    // Boundaries restraint
    percentageX = Math.max(0, Math.min(100, percentageX));
    percentageY = Math.max(0, Math.min(100, percentageY));

    setItems(prev => prev.map(it => 
      it.id === draggedItemId 
        ? { ...it, x: percentageX, y: percentageY } 
        : it
    ));
  };

  // Add Item to sim deck
  const handleAddItem = (type: DragItem['type']) => {
    const defaultText = {
      badge: '',
      bubble: '＼限定セール／\n大感謝祭実施中！',
      plate: '＼特別価格 50% OFF／',
      text: '追加のキャッチコピー'
    }[type];

    const newItem: DragItem = {
      id: `${type}-${Date.now()}`,
      type,
      text: defaultText,
      badgeNum: type === 'badge' ? '5' : '',
      badgeUnit: type === 'badge' ? '個セット' : '',
      x: 35 + (items.length * 7) % 35,
      y: 35 + (items.length * 7) % 35,
      color: type === 'bubble' ? '#EF4444' : type === 'badge' ? '#F59E0B' : '#FEF08A',
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

  // ───────────────────────────────────────────────────────────────
  // COMPOSING ENGINE (Support customized export bounds scale factor & multi-line wrapped text)
  // ───────────────────────────────────────────────────────────────
  const handleExportComposedImage = () => {
    const baseImg = new Image();
    baseImg.crossOrigin = "anonymous";
    baseImg.src = imageSrc;
    baseImg.onload = () => {
      const canvas = document.createElement('canvas');
      // Apply the exportScale variable dynamically to produce customized size
      canvas.width = Math.round(baseImg.naturalWidth * exportScale);
      canvas.height = Math.round(baseImg.naturalHeight * exportScale);
      
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      // Render the raw base image on output bounds
      ctx.drawImage(baseImg, 0, 0, canvas.width, canvas.height);

      // Compositing added overlays
      items.forEach(item => {
        const xPx = (item.x / 100) * canvas.width;
        const yPx = (item.y / 100) * canvas.height;

        // scale factor depends on base canvas size and multiplier combined
        const scaleFactor = (canvas.width / 400); 
        const fontSizePx = Math.round(item.fontSize * (scaleFactor / exportScale) * exportScale);
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

        // A. TEXT ELEMENT (supports multi-line rendering)
        if (item.type === 'text') {
          ctx.fillStyle = item.textColor;
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          
          const lines = item.text.split('\n');
          const pyLineHeight = fontSizePx * 1.35;
          const totalTextH = lines.length * pyLineHeight;
          const startY = yPx - (totalTextH / 2) + (pyLineHeight / 2);

          lines.forEach((line, index) => {
            ctx.fillText(line, xPx, startY + index * pyLineHeight);
          });
        }

        // B. PLATE/ZABUTON ELEMENT (supports multi-line rendering)
        else if (item.type === 'plate') {
          ctx.font = fontStack;
          const lines = item.text.split('\n');
          const pyLineHeight = fontSizePx * 1.35;
          const totalTextH = lines.length * pyLineHeight;

          // Measure maximum single line width
          let maxLineWidth = 0;
          lines.forEach(line => {
            const w = ctx.measureText(line).width;
            if (w > maxLineWidth) maxLineWidth = w;
          });

          const py = fontSizePx * 0.45;
          const px = fontSizePx * 0.8;
          const plateWidth = maxLineWidth + px * 2;
          const plateHeight = totalTextH + py * 1.5;
          
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

          const startY = yPx - (totalTextH / 2) + (pyLineHeight / 2);
          lines.forEach((line, index) => {
            ctx.fillText(line, xPx, startY + index * pyLineHeight);
          });
        }

        // C. MULTISET / BADGE ELEMENT (Fixed circle layout)
        else if (item.type === 'badge') {
          const radius = fontSizePx * 1.6;
          ctx.fillStyle = item.color;
          ctx.beginPath();
          ctx.arc(xPx, yPx, radius, 0, Math.PI * 2);
          ctx.fill();

          // Outer frame
          ctx.lineWidth = 2 * scaleFactor;
          ctx.strokeStyle = '#FFFFFF';
          ctx.stroke();

          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';

          const numFontSize = Math.round(fontSizePx * 1.5);
          const unitFontSize = Math.round(fontSizePx * 0.7);

          // Value digit text
          ctx.font = `${item.fontWeight} ${numFontSize}px ${item.fontFamily === 'CCPixelArcade' ? '"CCPixelArcade", ' : ''}"Noto Sans JP", sans-serif`;
          ctx.fillStyle = item.textColor;
          ctx.fillText(item.badgeNum, xPx, yPx - radius * 0.15);

          // Units title text
          ctx.font = `700 ${unitFontSize}px "Noto Sans JP", sans-serif`;
          ctx.fillText(item.badgeUnit, xPx, yPx + radius * 0.45);
        }

        // D. SPEECH BUBBLE ELEMENT (supports multi-line rendering)
        else if (item.type === 'bubble') {
          ctx.font = fontStack;
          const lines = item.text.split('\n');
          const pyLineHeight = fontSizePx * 1.35;
          const totalTextH = lines.length * pyLineHeight;

          let maxLineWidth = 0;
          lines.forEach(line => {
            const w = ctx.measureText(line).width;
            if (w > maxLineWidth) maxLineWidth = w;
          });

          const py = fontSizePx * 0.45;
          const px = fontSizePx * 0.7;
          const bubbleW = maxLineWidth + px * 2;
          const bubbleH = totalTextH + py * 1.5;
          const rectX = xPx - bubbleW / 2;
          const rectY = yPx - bubbleH / 2;

          ctx.fillStyle = item.color;
          ctx.beginPath();
          ctx.roundRect(rectX, rectY, bubbleW, bubbleH, 6 * scaleFactor);
          
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
          
          const startY = yPx - (totalTextH / 2) + (pyLineHeight / 2);
          lines.forEach((line, index) => {
            ctx.fillText(line, xPx, startY + index * pyLineHeight);
          });
        }
      });

      const outUrl = canvas.toDataURL('image/png');
      const a = document.createElement('a');
      a.download = `composed_banner_x${exportScale}_${Date.now()}.png`;
      a.href = outUrl;
      a.click();
    };
  };

  const selectedItemObj = items.find(it => it.id === selectedItemId);

  const getCheckerGrade = (count: number) => {
    if (count <= 20) {
      return { 
        label: '◎ 安全 (OK)', 
        text: 'テキスト・ロゴ比率20%以下。ほぼ全ての広告配信プラットフォーム基準を満たしており、露出最大化が保証されます。', 
        color: 'text-emerald-400 border-emerald-500/20 bg-emerald-500/5', 
        colorClass: 'text-emerald-400', 
        mark: '◎' 
      };
    }
    if (count <= 31) {
      return { 
        label: '△ 注意 (Warn)', 
        text: 'テキスト・ロゴ比率20〜31%以下。一部プラットフォームで画像内テキスト規制に引っかかり、配信インプレッションが制限される恐れがあります。要素を削る等の調整を推奨します。', 
        color: 'text-amber-400 border-amber-500/20 bg-amber-500/5', 
        colorClass: 'text-amber-400', 
        mark: '△' 
      };
    }
    return { 
      label: '× 超過 (Critical)', 
      text: 'テキスト・ロゴ比率31%超。テキスト量過多のため審査落ち（入稿拒否）や、配信が極端に制限される可能性が極めて高い状態です。要約や、シミュレータによるレイアウト改善が必要です。', 
      color: 'text-rose-400 border-rose-500/20 bg-rose-500/5', 
      colorClass: 'text-rose-400', 
      mark: '×' 
    };
  };

  const checkerReport = getCheckerGrade(unifiedMarkedCount);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 select-none text-white relative w-full" ref={containerRef}>
      
      {/* 1. LEFT MAIN INTERACTIVE CANVAS VIEWPORT */}
      <div className="lg:col-span-7 flex flex-col gap-4 min-w-0">
        
        {/* Taster modes control */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between p-2.5 bg-slate-900/80 rounded-xl border border-white/10 shadow-lg gap-3">
          <div className="flex gap-1.5">
            <button
              onClick={() => { setActiveMode('mark'); setSelectedItemId(null); }}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-xs font-black transition-all cursor-pointer ${
                activeMode === 'mark' 
                  ? 'bg-slate-800 text-emerald-400 shadow-inner ring-1 ring-white/10' 
                  : 'text-slate-400 hover:text-white hover:bg-white/5'
              }`}
            >
              <Layers size={14} />
              グリッドマーク判定
            </button>
            <button
              onClick={() => setActiveMode('simulation')}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-xs font-black transition-all cursor-pointer ${
                activeMode === 'simulation' 
                  ? 'bg-slate-800 text-emerald-400 shadow-inner ring-1 ring-white/10' 
                  : 'text-slate-400 hover:text-white hover:bg-white/5'
              }`}
            >
              <Sparkles size={14} />
              パーツシミュレータ
            </button>
          </div>

          <div className="flex gap-1.5 sm:pr-1">
            {activeMode === 'mark' ? (
              <button
                onClick={handleClear}
                className="text-xs font-bold px-4 py-2.5 bg-slate-850 hover:bg-slate-800 hover:text-rose-450 rounded-lg border border-white/5 text-slate-305 transition-all cursor-pointer"
              >
                マーク消去
              </button>
            ) : (
              <button
                onClick={handleExportComposedImage}
                className="flex items-center gap-1.5 text-xs font-extrabold tracking-wider px-4 py-2.5 bg-emerald-500 text-slate-950 rounded-lg hover:bg-emerald-450 border border-emerald-600/20 shadow-md transition-all cursor-pointer"
              >
                <Download size={13} strokeWidth={2.5} />
                合成画像を保存 (Export)
              </button>
            )}
          </div>
        </div>

        {/* Live Canvas workspace frame */}
        <div 
          ref={imageContainerRef}
          onMouseMove={handleCanvasMouseMove}
          onTouchMove={handleCanvasMouseMove}
          className="relative aspect-square w-full rounded-2xl bg-neutral-950 border border-slate-800/80 overflow-hidden flex items-center justify-center p-3 shadow-2xl"
        >
          {/* Work area wrapper without rigid height limits */}
          <div className="relative w-full h-full flex items-center justify-center aspect-square select-none">
            
            {/* Background Image */}
            <img
              src={imageSrc}
              alt="Workspace canvas background"
              className="w-full h-full object-contain rounded-lg pointer-events-none opacity-85"
            />

            {/* OVERLAY PANEL: Draggable Overlay elements items */}
            <div className="absolute inset-0 pointer-events-none z-20">
              {items.map((item) => {
                const isSelected = selectedItemId === item.id;
                
                const itemStyles: React.CSSProperties = {
                  left: `${item.x}%`,
                  top: `${item.y}%`,
                  transform: 'translate(-50%, -50%)',
                  position: 'absolute',
                  cursor: activeMode === 'simulation' ? 'move' : 'default',
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
                    className={`pointer-events-auto select-none transition-shadow relative group ${
                      isSelected ? 'ring-2 ring-emerald-400 ring-offset-2 ring-offset-slate-950 shadow-2xl z-30' : 'hover:ring-1 hover:ring-white/40'
                    }`}
                  >
                    {/* Visual styling nodes on multi-line text */}
                    {item.type === 'text' && (
                      <span className="whitespace-pre-line text-center block px-1.5 py-1 leading-normal select-none">
                        {item.text}
                      </span>
                    )}

                    {item.type === 'plate' && (
                      <div 
                        style={{ backgroundColor: item.color }} 
                        className={`px-3.5 py-1.5 text-center whitespace-pre-line select-none shadow-lg leading-normal border border-white/10 ${
                          item.plateRounding === 'full' ? 'rounded-full' : item.plateRounding === 'md' ? 'rounded-md' : 'rounded-none'
                        }`}
                      >
                        {item.text}
                      </div>
                    )}

                    {item.type === 'badge' && (
                      <div 
                        style={{ backgroundColor: item.color, borderColor: '#FFFFFF' }} 
                        className="w-14 h-14 rounded-full flex flex-col justify-center items-center text-center shadow-lg border-2 select-none font-bold"
                      >
                        <span className="text-xl font-black leading-none -mb-0.5" style={{ color: item.textColor }}>
                          {item.badgeNum}
                        </span>
                        <span className="text-[7px] font-bold tracking-tight opacity-95 leading-none" style={{ color: item.textColor }}>
                          {item.badgeUnit}
                        </span>
                      </div>
                    )}

                    {item.type === 'bubble' && (
                      <div 
                        style={{ backgroundColor: item.color }} 
                        className="px-3.5 py-2 text-center whitespace-pre-line rounded-lg relative shadow-xl leading-normal select-none border border-white/5"
                      >
                        <span style={{ color: item.textColor }}>{item.text}</span>
                        {/* Interactive Pointer */}
                        <div 
                          className="absolute w-0 h-0 border-[6px] border-transparent"
                          style={{ 
                            borderColor: 'transparent',
                            borderTopColor: item.bubbleDirection === 'bottom' ? item.color : 'transparent',
                            borderBottomColor: item.bubbleDirection === 'top' ? item.color : 'transparent',
                            borderRightColor: item.bubbleDirection === 'left' ? item.color : 'transparent',
                            borderLeftColor: item.bubbleDirection === 'right' ? item.color : 'transparent',
                            bottom: item.bubbleDirection === 'bottom' ? '-11px' : 'auto',
                            top: item.bubbleDirection === 'top' ? '-11px' : item.bubbleDirection === 'left' || item.bubbleDirection === 'right' ? 'calc(50% - 6px)' : 'auto',
                            left: item.bubbleDirection === 'left' ? '-11px' : item.bubbleDirection === 'bottom' || item.bubbleDirection === 'top' ? 'calc(50% - 6px)' : 'auto',
                            right: item.bubbleDirection === 'right' ? '-11px' : 'auto',
                          }}
                        />
                      </div>
                    )}

                    {/* Fast trash helper in layout */}
                    {activeMode === 'simulation' && (
                      <button
                        onClick={(e) => { e.stopPropagation(); handleDeleteItem(item.id); }}
                        className="absolute -top-3.5 -right-3.5 w-5 h-5 bg-rose-500 hover:bg-rose-600 rounded-full flex items-center justify-center text-white scale-0 group-hover:scale-100 transition-transform shadow-md z-30 cursor-pointer"
                        title="消去"
                      >
                        <X size={10} strokeWidth={3} />
                      </button>
                    )}
                  </div>
                );
              })}
            </div>

            {/* PAINT GRID CELLS: Manual Selector + Auto Overlaps blending */}
            <div 
              className={`absolute inset-0 m-auto aspect-square grid grid-cols-10 grid-rows-10 border border-sky-400/25 overflow-hidden rounded-lg bg-transparent transition-opacity duration-300
                ${activeMode === 'mark' ? 'opacity-[0.88] z-10 shadow-[0_0_50px_rgba(34,197,94,0.15)] bg-slate-950/20' : 'opacity-[0.15] pointer-events-none z-0'}
              `}
              style={{ maxHeight: '100%', maxWidth: '100%' }}
            >
              {unifiedGrid.map((isMarked, index) => {
                // Determine source for color coding
                const isManual = grid[index];
                const isAuto = autoGrid[index];

                let cellColorClass = 'border-slate-700/10 hover:bg-sky-500/15 hover:border-sky-500/30';
                if (isManual) {
                  // User manual click/drawing red markup
                  cellColorClass = 'bg-rose-500/35 border-rose-400/80 shadow-[inset_0_0_4px_rgba(244,63,94,0.5)]';
                } else if (isAuto) {
                  // Auto calculated overlay block markup indicator (fabulous violet)
                  cellColorClass = 'bg-indigo-500/30 border-indigo-400/80 shadow-[inset_0_0_4px_rgba(99,102,241,0.5)]';
                }

                return (
                  <div
                    key={index}
                    data-cell-index={index}
                    onMouseDown={(e) => handleCellDown(index, e)}
                    onTouchStart={(e) => handleCellDown(index, e)}
                    onMouseEnter={() => handleCellEnter(index)}
                    className={`relative border flex items-start justify-start p-1.5 cursor-pointer transition-all duration-100 select-none ${cellColorClass}`}
                  >
                    <span 
                      data-cell-index={index}
                      className="font-mono text-[7.5px] text-slate-400 select-none pointer-events-none absolute top-1 left-1.5 font-bold"
                    >
                      {index + 1}
                    </span>
                  </div>
                );
              })}
            </div>

          </div>
        </div>
      </div>

      {/* 2. RIGHT HAND CONTROLS & COMPREHENSIVE SETTINGS */}
      <div className="lg:col-span-5 flex flex-col gap-5 w-full">
        
        {/* Real-time Layout Safety Audit Report */}
        <div className="bg-slate-950/60 border border-white/5 rounded-2xl p-5 shadow-2xl backdrop-blur-md">
          <h4 className="text-xs font-black uppercase tracking-widest text-emerald-400 flex items-center gap-2 mb-3 select-none">
            <CheckCircle2 size={13} className="animate-pulse" /> Layout Safety Audit Result
          </h4>
          
          {/* Highly visual percentage dial readout */}
          <div className="flex items-center justify-between bg-white/[0.02] border border-white/10 rounded-xl p-4">
            <div className="flex flex-col">
              <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-0.5">占有率 (Occupancy)</span>
              <div className="flex items-baseline gap-1">
                <span className={`text-4xl font-extrabold font-mono tracking-tight leading-none ${checkerReport.colorClass}`}>
                  {unifiedMarkedCount}%
                </span>
                <span className="text-[9px] text-slate-500 font-bold uppercase">Occupied</span>
              </div>
              <span className="text-[9px] text-slate-500 font-mono mt-1">{unifiedMarkedCount} / 100 マス判定</span>
            </div>
            
            <div className="h-12 w-[1px] bg-white/10" />
            
            <div className="flex flex-col items-end text-right">
              <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-1.5">監査結果</span>
              <span className={`text-[11px] font-extrabold uppercase tracking-wide px-2.5 py-1 rounded-md border ${checkerReport.color}`}>
                {checkerReport.label}
              </span>
            </div>
          </div>

          {/* Guidelines Description Readout */}
          <div className="mt-3.5 bg-slate-900/50 p-3 rounded-xl border border-white/5 text-[11px] text-slate-300 leading-relaxed font-sans">
            {checkerReport.text}
          </div>
        </div>

        {/* Configurations, creation, and item editing tools deck */}
        <div className="bg-slate-900/60 border border-white/10 rounded-2xl p-5 flex flex-col gap-5 max-h-[500px] overflow-y-auto scrollbar-thin">
          {activeMode === 'mark' ? (
            
            // DIRECT CHECKER MODE MANUAL GUIDE
            <div className="flex flex-col gap-4 text-slate-300">
              <h4 className="text-xs font-extrabold uppercase tracking-widest text-emerald-400 flex items-center gap-1.5 select-none font-black font-sans">
                <Layers size={13} /> グリッドマーク基本手順
              </h4>
              <p className="text-[11px] text-slate-300 leading-relaxed select-none">
                バナー内の文言・説明・ロゴが重なっている箇所をマウスでクリック、またはドラッグしてペイントしてください。占有マス合計に基づき審査比率がリアルタイム計算されます。
              </p>
              
              <div className="bg-slate-950/65 rounded-xl p-4 border border-white/10 space-y-2.5 select-none text-xs">
                <div className="flex items-center gap-3 text-xs">
                  <div className="w-3.5 h-3.5 rounded bg-rose-500/40 border border-rose-500/80 shadow-[inset_0_0_2px_rgba(244,63,94,0.5)]" />
                  <span className="text-slate-300 font-bold">手動マークしたセル (Manual)</span>
                </div>
                <div className="flex items-center gap-3 text-xs">
                  <div className="w-3.5 h-3.5 rounded bg-indigo-500/40 border border-indigo-500/80 shadow-[inset_0_0_2px_rgba(99,102,241,0.5)]" />
                  <span className="text-slate-300 font-bold">追加パーツ自動検知セル (Simulation)</span>
                </div>
              </div>

              <div className="text-[11px] text-amber-300 leading-normal bg-amber-500/10 border border-amber-500/10 p-3 rounded-xl flex gap-2 select-none">
                <Info size={14} className="flex-shrink-0 mt-0.5 text-amber-400" />
                <span>
                  💡 <b>パーツシミュレータに切り替えて、任意の「吹き出し」「バッジ」「ざぶとん」を配置しながら文字の入稿チェックを作ることも可能です。</b>
                </span>
              </div>
            </div>
        ) : (
          
          // GRAPHICS BUILDER SIMULATOR CONTROLS
          <div className="space-y-4">
            <div>
              <h4 className="text-[11px] font-extrabold uppercase tracking-widest text-emerald-400 flex items-center gap-1 mb-2.5">
                <Plus size={11} /> パーツ作成 (Add-ons)
              </h4>
              
              {/* Presets generator buttons */}
              <div className="grid grid-cols-2 gap-1.5 mb-3.5">
                <button
                  type="button"
                  onClick={() => handleAddItem('bubble')}
                  className="px-2 py-2 bg-slate-800 hover:bg-slate-700/80 rounded-lg text-[10px] font-bold text-left flex items-center gap-1 transition-all text-slate-200 cursor-pointer border border-white/5"
                >
                  <MessageSquare size={11} className="text-pink-400" />
                  吹き出し
                </button>
                <button
                  type="button"
                  onClick={() => handleAddItem('plate')}
                  className="px-2 py-2 bg-slate-800 hover:bg-slate-700/80 rounded-lg text-[10px] font-bold text-left flex items-center gap-1 transition-all text-slate-200 cursor-pointer border border-white/5"
                >
                  <Bookmark size={11} className="text-amber-400" />
                  ざぶとん
                </button>
                <button
                  type="button"
                  onClick={() => handleAddItem('badge')}
                  className="px-2 py-2 bg-slate-800 hover:bg-slate-700/80 rounded-lg text-[10px] font-bold text-left flex items-center gap-1.5 transition-all text-slate-200 cursor-pointer border border-white/5"
                >
                  <Sparkles size={11} className="text-yellow-400" />
                  バッジ/セット
                </button>
                <button
                  type="button"
                  onClick={() => handleAddItem('text')}
                  className="px-2 py-2 bg-slate-800 hover:bg-slate-700/80 rounded-lg text-[10px] font-bold text-left flex items-center gap-1.5 transition-all text-slate-200 cursor-pointer border border-white/5"
                >
                  <Type size={11} className="text-sky-450" />
                  テキスト
                </button>
              </div>

              {/* Dynamic export size resolution controls */}
              <div className="p-2.5 bg-slate-950/70 border border-white/5 rounded-xl space-y-1.5 mb-3 select-none text-[10px]">
                <div className="flex justify-between items-baseline font-bold text-slate-400 uppercase tracking-widest mb-1">
                  <span className="flex items-center gap-1 text-emerald-400"><Maximize2 size={10} /> 書き出しサイズ</span>
                  <span>{exportScale === 1.0 ? '等倍 (1x)' : `${exportScale}x`}</span>
                </div>
                
                <select
                  value={exportScale}
                  onChange={(e) => setExportScale(parseFloat(e.target.value))}
                  className="w-full bg-slate-900 border border-slate-800 rounded px-1.5 py-1 text-[11px] text-white font-medium cursor-pointer outline-none focus:border-emerald-500"
                >
                  <option value="0.5">ハーフサイズ (0.5x)</option>
                  <option value="0.75">携帯重視 (0.75x)</option>
                  <option value="1.0">標準サイズ (1.0x)</option>
                  <option value="1.5">高精細 (1.5x)</option>
                  <option value="2.0">印刷・Retina (2.0x)</option>
                  <option value="3.0">超高画質 (3.0x)</option>
                </select>

                <div className="text-[9px] text-slate-500 font-mono flex justify-between leading-none pt-1">
                  <span>保存解像度:</span>
                  <span className="text-emerald-400 font-bold">
                    {Math.round(baseImageDimensions.width * exportScale)} × {Math.round(baseImageDimensions.height * exportScale)} px
                  </span>
                </div>
              </div>

              {/* Editing details inspector card */}
              {selectedItemObj ? (
                <div className="pt-3 border-t border-white/10 space-y-3">
                  <div className="flex justify-between items-center select-none">
                    <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider">
                      調節オプション
                    </span>
                    <button
                      type="button"
                      onClick={() => setSelectedItemId(null)}
                      className="text-[9px] font-bold text-slate-500 hover:text-white cursor-pointer"
                    >
                      閉じる
                    </button>
                  </div>

                  {/* Multi-line Text Area Support */}
                  {selectedItemObj.type !== 'badge' ? (
                    <div className="space-y-1">
                      <label className="text-[9px] font-bold text-slate-500 uppercase tracking-widest block font-bold">
                        文字入力 (改行可)
                      </label>
                      <textarea
                        value={selectedItemObj.text}
                        onChange={(e) => handleUpdateSelectedItem('text', e.target.value)}
                        rows={2}
                        className="w-full bg-slate-950 border border-slate-800 rounded px-2 py-1 text-xs text-white outline-none focus:border-emerald-500 font-medium leading-relaxed"
                        placeholder="文字を入力（Enterで改行）"
                      />
                    </div>
                  ) : (
                    // Badges count details
                    <div className="grid grid-cols-2 gap-1.5">
                      <div className="space-y-1">
                        <label className="text-[9px] font-bold text-slate-100 uppercase tracking-widest block font-bold text-center">
                          数字
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
                        <label className="text-[9px] font-bold text-slate-200 uppercase tracking-widest block text-center font-bold">
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

                  {/* Font Type options */}
                  <div className="space-y-1">
                    <label className="text-[9px] font-bold text-slate-500 uppercase tracking-widest block">
                      フォント指定
                    </label>
                    <div className="grid grid-cols-2 gap-1">
                      <button
                        type="button"
                        onClick={() => handleUpdateSelectedItem('fontFamily', 'Noto')}
                        className={`py-1 text-[9px] font-bold rounded cursor-pointer ${
                          selectedItemObj.fontFamily === 'Noto' 
                            ? 'bg-emerald-500 text-slate-950 shadow' 
                            : 'bg-slate-950 text-slate-400 hover:text-white border border-white/5'
                        }`}
                      >
                        Noto Sans
                      </button>
                      <button
                        type="button"
                        onClick={() => handleUpdateSelectedItem('fontFamily', 'CCPixelArcade')}
                        className={`py-1 text-[9px] font-bold rounded cursor-pointer ${
                          selectedItemObj.fontFamily === 'CCPixelArcade' 
                            ? 'bg-emerald-500 text-slate-950 shadow' 
                            : 'bg-slate-950 text-slate-400 hover:text-white border border-white/5'
                        }`}
                        title="Adobe (CCPixelArcade) フォント。契約中の端末環境等でレンダリングがサポートされます"
                      >
                        Pixel Arcade
                      </button>
                    </div>
                  </div>

                  {/* Font Weight */}
                  <div className="space-y-1">
                    <div className="flex justify-between items-baseline">
                      <label className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">
                        ウェイト (太さ)
                      </label>
                      <span className="text-[8px] font-bold text-emerald-400">
                        {
                          selectedItemObj.fontWeight === '300' ? '細字' :
                          selectedItemObj.fontWeight === '400' ? '通常' :
                          selectedItemObj.fontWeight === '700' ? '太字' : '極太'
                        }
                      </span>
                    </div>
                    <select
                      value={selectedItemObj.fontWeight}
                      onChange={(e) => handleUpdateSelectedItem('fontWeight', e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded px-1.5 py-1 text-xs text-white font-medium cursor-pointer"
                    >
                      <option value="300">Light (300)</option>
                      <option value="400">Regular (400)</option>
                      <option value="700">Bold (700)</option>
                      <option value="950">Black (950)</option>
                    </select>
                  </div>

                  {/* Range Slider for font-size */}
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

                  {/* Colors background selector */}
                  {selectedItemObj.type !== 'text' && (
                    <div className="space-y-1">
                      <label className="text-[9px] font-bold text-slate-500 uppercase tracking-widest block">
                        背景色 (テーマ設定)
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
                              selectedItemObj.color === clr.bg ? 'scale-125 border-emerald-400 ring-2 ring-emerald-500/30' : 'border-transparent hover:scale-110'
                            }`}
                            style={{ backgroundColor: clr.bg }}
                            title={clr.name}
                          />
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Border rounded modifier plate */}
                  {selectedItemObj.type === 'plate' && (
                    <div className="space-y-1">
                      <label className="text-[9px] font-bold text-slate-500 uppercase tracking-widest block">
                        ざぶとん角丸
                      </label>
                      <select
                        value={selectedItemObj.plateRounding}
                        onChange={(e) => handleUpdateSelectedItem('plateRounding', e.target.value as any)}
                        className="w-full bg-slate-950 border border-slate-800 rounded px-1.5 py-1 text-xs text-white font-medium cursor-pointer"
                      >
                        <option value="none">直角 (0px)</option>
                        <option value="md">標準角丸 (6px)</option>
                        <option value="full">完全丸 (rounded-full)</option>
                      </select>
                    </div>
                  )}

                  {/* Speech pointers */}
                  {selectedItemObj.type === 'bubble' && (
                    <div className="space-y-1">
                      <label className="text-[9px] font-bold text-slate-500 uppercase tracking-widest block">
                        吹き出しの矢印方向
                      </label>
                      <select
                        value={selectedItemObj.bubbleDirection}
                        onChange={(e) => handleUpdateSelectedItem('bubbleDirection', e.target.value as any)}
                        className="w-full bg-slate-950 border border-slate-800 rounded px-1.5 py-1 text-xs text-white font-medium cursor-pointer"
                      >
                        <option value="bottom">下 (Down)</option>
                        <option value="top">上 (Up)</option>
                        <option value="left">左 (Left)</option>
                        <option value="right">右 (Right)</option>
                      </select>
                    </div>
                  )}

                  <button
                    type="button"
                    onClick={() => handleDeleteItem(selectedItemObj.id)}
                    className="flex items-center justify-center gap-1.5 w-full py-1.5 bg-rose-500/10 hover:bg-rose-500 text-rose-400 hover:text-white rounded text-[10px] font-bold transition-colors cursor-pointer"
                  >
                    <Trash2 size={11} /> 
                    このアイテムを消去
                  </button>
                </div>
              ) : (
                <div className="p-3.5 rounded-xl border border-dashed border-white/5 bg-slate-950/20 text-center select-none">
                  <p className="text-[10px] text-slate-500 leading-normal">
                    パーツをクリックすると、ここにフォントの太さ・色・サイズを改修できる調節パネルが表示されます。
                  </p>
                </div>
              )}
            </div>

            <div className="pt-2 border-t border-white/5 space-y-1 text-[9px] text-slate-500 select-none leading-relaxed">
              <p>📌 追加した重ねパーツは画像上で自由にドラッグ移動できます。</p>
            </div>
          </div>
        )}
      </div>
    </div>

  </div>
  );
}
export type { TextGridCheckerProps, DragItem };
