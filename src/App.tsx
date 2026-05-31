import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Sparkles, 
  Zap, 
  HardDrive, 
  RefreshCw, 
  TrendingDown, 
  Download, 
  Image as ImageIcon, 
  LayoutGrid, 
  AlertTriangle, 
  CheckCircle2, 
  Maximize2, 
  Gauge, 
  ArrowRight,
  Info
} from 'lucide-react';
import { 
  ImageFileInfo, 
  CompressionSettings, 
  formatBytes 
} from './types';
import BeforeAfterSlider from './components/BeforeAfterSlider';
import TextGridChecker from './components/TextGridChecker';

export default function App() {
  // Navigation tab states
  const [activeTab, setActiveTab] = useState<'compress' | 'checker'>('compress');

  // Input file states
  const [originalFile, setOriginalFile] = useState<File | null>(null);
  const [originalSrc, setOriginalSrc] = useState<string>('');
  const [originalInfo, setOriginalInfo] = useState<ImageFileInfo | null>(null);

  // Compress specific states
  const [compressedSrc, setCompressedSrc] = useState<string>('');
  const [compressedSize, setCompressedSize] = useState<number>(0);
  const [isCompressing, setIsCompressing] = useState<boolean>(false);
  const [settings, setSettings] = useState<CompressionSettings>({
    format: 'webp',
    quality: 80,
    scale: 1.0,
    maxWidth: 0, // no limit
  });

  // Drag over files state
  const [isDragOver, setIsDragOver] = useState<boolean>(false);

  // Checker specific states
  const [checkerMarkedCount, setCheckerMarkedCount] = useState<number>(0);

  // Dropzone ref for file trigger
  const fileInputRef = useRef<HTMLInputElement>(null);
  const checkerFileInputRef = useRef<HTMLInputElement>(null);

  // Handle original file load
  const loadFile = (file: File) => {
    if (!file.type.startsWith('image/')) return;
    setOriginalFile(file);

    const reader = new FileReader();
    reader.onload = (e) => {
      const src = e.target?.result as string;
      setOriginalSrc(src);

      const img = new Image();
      img.onload = () => {
        setOriginalInfo({
          name: file.name,
          size: file.size,
          width: img.width,
          height: img.height,
          type: file.type,
        });
      };
      img.src = src;
    };
    reader.readAsDataURL(file);
  };

  // Drag-and-drop mechanics
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = () => {
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      loadFile(files[0]);
    }
  };

  // Perform Image Compression on Canvas
  const runCompression = useCallback(() => {
    if (!originalSrc || !originalInfo) return;
    setIsCompressing(true);

    const img = new Image();
    img.onload = () => {
      // Calculate output size
      let outWidth = img.width * settings.scale;
      let outHeight = img.height * settings.scale;

      // Apply max width constraint if any
      if (settings.maxWidth > 0 && outWidth > settings.maxWidth) {
        const ratio = settings.maxWidth / outWidth;
        outWidth = settings.maxWidth;
        outHeight = outHeight * ratio;
      }

      outWidth = Math.round(outWidth);
      outHeight = Math.round(outHeight);

      // Draw inside offscreen canvas
      const canvas = document.createElement('canvas');
      canvas.width = outWidth;
      canvas.height = outHeight;
      const ctx = canvas.getContext('2d');
      
      if (!ctx) return;
      ctx.drawImage(img, 0, 0, outWidth, outHeight);

      // Determine correct mime
      let mimeType = 'image/webp';
      if (settings.format === 'jpeg') mimeType = 'image/jpeg';
      if (settings.format === 'png') mimeType = 'image/png';

      // Compress format values (PNG does not support quality options in toDataURL)
      const mimeQuality = settings.format === 'png' ? undefined : settings.quality / 100;
      const dataUrl = canvas.toDataURL(mimeType, mimeQuality);
      
      setCompressedSrc(dataUrl);

      // Estimate compressed size from Base64 string
      const head = `data:${mimeType};base64,`;
      const sizeInBytes = Math.round((dataUrl.length - head.length) * 3 / 4);
      setCompressedSize(sizeInBytes);
      setIsCompressing(false);
    };
    img.src = originalSrc;
  }, [originalSrc, originalInfo, settings]);

  // Trigger compression when settings or original image changes
  useEffect(() => {
    if (originalSrc && originalInfo) {
      // Debounce compress a bit to allow smooth slider adjustments
      const handler = setTimeout(() => {
        runCompression();
      }, 150);
      return () => clearTimeout(handler);
    }
  }, [originalSrc, originalInfo, settings, runCompression]);

  // Handle format conversion and download
  const handleDownload = () => {
    if (!compressedSrc || !originalInfo) return;
    const a = document.createElement('a');
    const ext = settings.format === 'jpeg' ? 'jpg' : settings.format;
    const baseName = originalInfo.name.substring(0, originalInfo.name.lastIndexOf('.')) || 'image';
    a.download = `${baseName}_gyutted.${ext}`;
    a.href = compressedSrc;
    a.click();
  };

  const handleReset = () => {
    setOriginalFile(null);
    setOriginalSrc('');
    setOriginalInfo(null);
    setCompressedSrc('');
    setCompressedSize(0);
    setCheckerMarkedCount(0);
  };

  // Compute stats helper
  const sizeDiff = (originalInfo?.size || 0) - compressedSize;
  const reductionPercentage = originalInfo?.size 
    ? Math.max(0, Math.round((sizeDiff / originalInfo.size) * 100)) 
    : 0;

  // Checker specific grading
  const getCheckerGrade = (count: number) => {
    if (count <= 20) return { label: '◎ 安全 (OK)', text: 'テキスト比率20%以下。多くの広告プラットフォームで追加テキストに規制されず快適に入稿できます。', color: 'text-emerald-400 border-emerald-500/20 bg-emerald-500/5', colorClass: 'text-emerald-400', mark: '◎' };
    if (count <= 31) return { label: '△ 注意 (Warn)', text: 'テキスト比率20〜31%以下。広告出稿時に配信量が制限されたり警告を受けるリスクがあります。要素を絞ることを推奨します。', color: 'text-amber-400 border-amber-500/20 bg-amber-500/5', colorClass: 'text-amber-400', mark: '△' };
    return { label: '× 超過 (Critical)', text: 'テキスト比率31%超。テキスト量が過多です。バナーの露出低下や入稿拒否、パフォーマンス低下の可能性が高いため、要約が必要です。', color: 'text-rose-400 border-rose-500/20 bg-rose-500/5', colorClass: 'text-rose-400', mark: '×' };
  };

  const checkerReport = getCheckerGrade(checkerMarkedCount);

  return (
    <div className="flex flex-col lg:flex-row min-h-screen bg-[#F1F5F9] text-slate-900 font-sans overflow-x-hidden selection:bg-emerald-500/20 selection:text-emerald-800">
      
      {/* ───────────────────────────────────────────────────────────────
          LEFT SIDEBAR: Configurations & Branding (Sleek Interface style)
          ─────────────────────────────────────────────────────────────── */}
      <div className="w-full lg:w-[410px] bg-white border-b lg:border-b-0 lg:border-r border-slate-200 p-8 lg:p-12 flex flex-col justify-between flex-shrink-0 relative z-10 shadow-sm">
        <div>
          {/* Logo element with extreme negative tracking and Arial Black / Syne style */}
          <div className="mb-10 lg:mb-14">
            <h1 
              style={{ fontFamily: "'Space Grotesk', 'Arial Black', sans-serif", letterSpacing: "-3px" }} 
              className="text-4xl font-black text-slate-900 leading-none"
            >
              GYUTT<span className="text-emerald-500">E</span>E.
            </h1>
            <p className="text-[9px] tracking-[0.25em] text-slate-400 mt-2.5 uppercase font-mono font-bold">
              Image Optimization Guardian
            </p>
          </div>

          {/* Tab Switcher - Simple high contrast buttons inside a light well */}
          <div className="flex flex-col gap-2 p-1 bg-slate-100 rounded-xl mb-8">
            <button
              onClick={() => { setActiveTab('compress'); }}
              className={`flex items-center gap-2.5 px-4 py-3 rounded-lg text-xs font-bold uppercase tracking-wider transition-all duration-200 ${
                activeTab === 'compress' 
                  ? 'bg-slate-900 text-white shadow-sm' 
                  : 'text-slate-500 hover:text-slate-900 hover:bg-slate-200/50'
              }`}
            >
              <Zap size={14} className={activeTab === 'compress' ? 'text-emerald-400' : 'text-slate-500'} />
              画像圧縮・リサイズ
            </button>
            <button
              onClick={() => { setActiveTab('checker'); }}
              className={`flex items-center gap-2.5 px-4 py-3 rounded-lg text-xs font-bold uppercase tracking-wider transition-all duration-200 ${
                activeTab === 'checker' 
                  ? 'bg-slate-900 text-white shadow-sm' 
                  : 'text-slate-500 hover:text-slate-900 hover:bg-slate-200/50'
              }`}
            >
              <LayoutGrid size={14} className={activeTab === 'checker' ? 'text-emerald-400' : 'text-slate-500'} />
              バナー占有率チェック
            </button>
          </div>

          {/* Form controls with abundant whitespace */}
          <div className="space-y-6">
            {originalSrc ? (
              activeTab === 'compress' ? (
                // ───── COMPRESS CONFIG CONTROLS ─────
                <div className="space-y-6 pt-1">
                  
                  {/* Format Settings */}
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
                      出力形式 (Output Format)
                    </label>
                    <div className="flex gap-2">
                      {(['webp', 'jpeg', 'png'] as const).map((fmt) => (
                        <button
                          key={fmt}
                          onClick={() => setSettings(s => ({ ...s, format: fmt }))}
                          className={`flex-1 py-2.5 px-3 rounded-lg text-xs font-bold tracking-wider uppercase transition-all duration-150 ${
                            settings.format === fmt
                              ? 'bg-slate-900 text-white shadow-sm'
                              : 'bg-slate-100 text-slate-500 hover:bg-slate-200/60'
                          }`}
                        >
                          {fmt}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Quality quality slider (JPEG / WEBP only) */}
                  {settings.format !== 'png' && (
                    <div className="space-y-2 pt-2">
                      <div className="flex justify-between items-baseline">
                        <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
                          データ圧縮品質 (Quality)
                        </label>
                        <span className="text-xs font-mono font-bold text-slate-900">
                          {settings.quality}%
                        </span>
                      </div>
                      
                      {/* Interactive custom slider track */}
                      <input
                        type="range"
                        min="5"
                        max="100"
                        value={settings.quality}
                        onChange={(e) => setSettings(s => ({ ...s, quality: parseInt(e.target.value, 10) }))}
                        className="w-full accent-slate-900 h-1.5 bg-slate-100 rounded-lg cursor-pointer py-1.5 focus:outline-none"
                      />
                      
                      <div className="flex justify-between text-[9px] text-slate-400 uppercase tracking-widest font-bold">
                        <span>容量重視 (Low)</span>
                        <span>標準 (Balanced)</span>
                        <span>画質重視 (Max)</span>
                      </div>
                    </div>
                  )}

                  {/* Resolution scale controls */}
                  <div className="space-y-2 pt-2">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
                      解像度の変更 (Dimensions)
                    </label>
                    <select
                      value={settings.scale}
                      onChange={(e) => setSettings(s => ({ ...s, scale: parseFloat(e.target.value) }))}
                      className="w-full px-3.5 py-3 bg-slate-50 border border-slate-200 hover:border-slate-300 rounded-lg text-xs font-bold text-slate-900 outline-none focus:border-slate-800 transition-all cursor-pointer appearance-none bg-[url('data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20viewBox%3D%220%200%2020%2020%22%20fill%3D%22none%22%3E%3Cpath%20d%3D%22M7%209l3%203%203-3%22%20stroke%3D%22%2364748b%22%20stroke-width%3D%221.5%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%2F%3E%3C%2Fsvg%3E')] bg-[length:20px_20px] bg-[right_10px_center] bg-no-repeat pr-10"
                    >
                      <option value="1.0">100% (等倍サイズ保存)</option>
                      <option value="0.75">75% (容量カット)</option>
                      <option value="0.5">50% (ハーフサイズダウン)</option>
                      <option value="0.25">25% (サムネイルサイズ)</option>
                    </select>
                  </div>

                  {/* Display active file sizes specs */}
                  <div className="pt-4 border-t border-slate-100 flex flex-col gap-2.5">
                    <div className="flex justify-between text-xs">
                      <span className="text-slate-400 font-medium">元の画像解像度:</span>
                      <span className="font-mono text-slate-800 font-semibold">{originalInfo?.width} × {originalInfo?.height} px</span>
                    </div>
                    <div className="flex justify-between text-xs">
                      <span className="text-slate-400 font-medium">出力解像度:</span>
                      <span className="font-mono text-emerald-600 font-bold">
                        {originalInfo ? Math.round(originalInfo.width * settings.scale) : 0} × {originalInfo ? Math.round(originalInfo.height * settings.scale) : 0} px
                      </span>
                    </div>
                  </div>

                </div>
              ) : (
                // ───── AD TEXT CHECK CONFIG CONTROLS ─────
                <div className="space-y-5 pt-1">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 block mb-1">
                      グリッド判定基準
                    </label>
                    <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-600 leading-relaxed space-y-2">
                      <p>
                        広告バナー上に配置された<b>ロゴ、コピー、装飾</b>が占めるエリア(マス)を選択してください。
                      </p>
                      <p className="text-slate-400">
                        ※ 商品自体のパッケージに描かれた背景文字は除外しても構いません。
                      </p>
                    </div>
                  </div>

                  <div className="space-y-2.5 pt-1">
                    <div className="flex justify-between text-xs">
                      <span className="text-slate-400">判定基準 (制限枠):</span>
                      <span className="font-bold text-slate-700">20%以下 (20マス)</span>
                    </div>
                    <div className="flex justify-between text-xs">
                      <span className="text-slate-400">要点:</span>
                      <span className="text-emerald-600 font-bold">少ないほど出稿効率UP</span>
                    </div>
                  </div>
                </div>
              )
            ) : (
              // ───── EMPTY UNLOADED STATE PLACEHOLDERS ─────
              <div className="space-y-4 pt-4">
                <p className="text-xs text-slate-500 leading-relaxed">
                  GYUTTEE は、ローカルのみで処理されるセキュアかつ超高速な画像ツール。機密データもサーバーに送信せず安全に処理されます。
                </p>
                <button
                  onClick={() => activeTab === 'compress' ? fileInputRef.current?.click() : checkerFileInputRef.current?.click()}
                  className="py-3.5 px-6 bg-slate-900 border border-slate-900 hover:bg-slate-800 text-white text-xs font-bold tracking-widest uppercase rounded-lg w-full transition-colors font-mono"
                >
                  ローカルファイルを選択する
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Workspace instruction footprint footer */}
        <div className="pt-8 border-t border-slate-100 hidden lg:block">
          <p className="text-xs text-slate-400 leading-relaxed">
            調整したパラメータに応じた、リアルタイムの<span className="text-slate-900 font-semibold">効率化効果・削減率</span>を右側のダッシュボードに反映します。
          </p>
        </div>
      </div>

      {/* ───────────────────────────────────────────────────────────────
          RIGHT CONTENT: Results & Visualizer Dashboard (Sleek Interface style)
          ─────────────────────────────────────────────────────────────── */}
      <div className="flex-1 bg-[#0F172A] p-6 sm:p-10 lg:p-16 flex flex-col justify-center relative min-h-[500px] lg:min-h-screen text-white">
        
        {/* Decorative emerald gradient glow elements from design */}
        <div className="absolute top-0 right-0 w-80 h-80 bg-emerald-500/10 rounded-full blur-3xl -mr-32 -mt-32 pointer-events-none"></div>
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-teal-500/5 rounded-full blur-3xl -ml-20 -mb-20 pointer-events-none"></div>

        <div className="max-w-4xl w-full mx-auto flex flex-col justify-center z-10">
          
          <header className="mb-8">
            <h2 className="text-emerald-400 text-[10px] sm:text-xs font-bold tracking-[0.25em] uppercase mb-2">
              {activeTab === 'compress' ? 'Optimized Real-time Outcome' : 'Layout Safety Audit Result'}
            </h2>
            <div className="h-1 w-12 bg-emerald-500"></div>
          </header>

          <AnimatePresence mode="wait">
            {!originalSrc ? (
              // ───── EMPTY STATE SCREEN DRAG & DROP ─────
              <motion.div
                key="dropzone-pane"
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.98 }}
                onClick={() => activeTab === 'compress' ? fileInputRef.current?.click() : checkerFileInputRef.current?.click()}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                className={`w-full aspect-[16/10] bg-white/[0.02] border-2 border-dashed rounded-3xl p-12 transition-all duration-300 flex flex-col items-center justify-center text-center cursor-pointer relative group overflow-hidden
                  ${isDragOver 
                    ? 'border-emerald-400 bg-emerald-500/5 shadow-[0_0_40px_rgba(16,185,129,0.15)]' 
                    : 'border-white/10 hover:border-white/20 hover:bg-white/[0.04]'
                  }
                `}
              >
                {/* Embedded hidden file triggers */}
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={(e) => e.target.files && loadFile(e.target.files[0])}
                  className="hidden"
                  accept="image/jpeg,image/png,image/webp,image/gif"
                />
                <input
                  type="file"
                  ref={checkerFileInputRef}
                  onChange={(e) => e.target.files && loadFile(e.target.files[0])}
                  className="hidden"
                  accept="image/jpeg,image/png,image/webp,image/gif"
                />
                
                <div className={`p-5 rounded-2xl mb-4 transition-all duration-300 ${
                  isDragOver ? 'bg-emerald-500 text-slate-900' : 'bg-white/5 text-slate-300'
                }`}>
                  <ImageIcon size={30} />
                </div>
                <h3 className="text-lg font-bold text-slate-100 tracking-wide mb-1">
                  判定・圧縮する画像をドロップしてください
                </h3>
                <p className="text-slate-400 text-xs tracking-wider max-w-sm mb-6">
                  ドラッグ＆ドロップまたはクリックでファイルをアップロード
                </p>
                <span className="px-5 py-2.5 rounded-lg bg-white text-slate-900 hover:bg-slate-100 text-xs font-bold tracking-widest uppercase shadow transition-all">
                  BROWSE FILE
                </span>
              </motion.div>
            ) : (
              // ───── WORKSPACE OUTCOME VIEW (Dual Columns or Bento Layout) ─────
              <motion.div
                key="mediaspace-pane"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="grid grid-cols-1 md:grid-cols-12 gap-8 items-start"
              >
                {/* Graphical widget pane (Slider or Interactive Grid) */}
                <div className="md:col-span-7 xl:col-span-8 space-y-4">
                  <div className="bg-slate-950/60 p-2.5 rounded-2xl border border-white/5 shadow-2xl">
                    {activeTab === 'compress' ? (
                      <BeforeAfterSlider
                        originalSrc={originalSrc}
                        compressedSrc={compressedSrc || originalSrc}
                        className="w-full"
                      />
                    ) : (
                      <TextGridChecker
                        imageSrc={originalSrc}
                        onMarkChange={setCheckerMarkedCount}
                        onReset={handleReset}
                      />
                    )}
                  </div>
                </div>

                {/* Outcome Metrics pane (Right-side display, big numbers, arrow icons) */}
                <div className="md:col-span-12 lg:col-span-5 xl:col-span-4 space-y-6">
                  
                  {activeTab === 'compress' ? (
                    // ───── COMPRESSION OUTCOMES VIEW ─────
                    <div className="space-y-6">
                      
                      {/* Cost metrics Savings rate header */}
                      <div>
                        <p className="text-slate-400 text-[10px] uppercase tracking-widest mb-3 font-semibold">
                          データ容量削減効果 (Reduction Volume)
                        </p>
                        <div className="flex items-baseline gap-4">
                          <span className="text-7xl lg:text-8xl font-light text-white tracking-tighter leading-none font-sans">
                            {reductionPercentage}%
                          </span>
                          
                          <div className={`px-3 py-1.5 rounded-full text-[10px] font-bold flex items-center gap-1 uppercase tracking-wider
                            ${reductionPercentage > 0 
                              ? 'bg-emerald-500/20 text-emerald-400 shadow-[0_0_15px_rgba(16,185,129,0.1)]' 
                              : 'bg-amber-500/20 text-amber-400'
                            }`}
                          >
                            <svg className="w-3 h-3 stroke-[3]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7"></path>
                            </svg>
                            {reductionPercentage > 0 ? 'SAVED' : 'READY'}
                          </div>
                        </div>
                      </div>

                      {/* Icon-based metrics cards layout from "Sleek Interface" */}
                      <div className="grid grid-cols-2 gap-4">
                        
                        {/* Original Stats */}
                        <div className="bg-white/5 border border-white/10 p-5 rounded-2xl flex flex-col justify-between">
                          <div className="w-9 h-9 bg-slate-800 rounded-xl flex items-center justify-center mb-5 text-slate-300">
                            <HardDrive size={16} />
                          </div>
                          <div>
                            <div className="text-xl sm:text-2xl font-mono font-medium text-slate-300 leading-tight">
                              {originalInfo ? formatBytes(originalInfo.size) : '—'}
                            </div>
                            <div className="text-[9px] text-slate-500 uppercase tracking-widest font-bold mt-1.5">
                              Before Compress
                            </div>
                          </div>
                        </div>

                        {/* Squeezed Outcome Stats */}
                        <div className="bg-white/5 border border-white/10 p-5 rounded-2xl flex flex-col justify-between ring-1 ring-emerald-500/20">
                          <div className="w-9 h-9 bg-emerald-500 rounded-xl flex items-center justify-center mb-5 text-slate-950">
                            <Sparkles size={16} />
                          </div>
                          <div>
                            <div className="text-xl sm:text-2xl font-mono font-bold text-emerald-400 leading-tight">
                              {formatBytes(compressedSize)}
                            </div>
                            <div className="text-[9px] text-slate-500 uppercase tracking-widest font-bold mt-1.5">
                              After Outcome
                            </div>
                          </div>
                        </div>

                      </div>

                      {/* Warnings if larger */}
                      {compressedSize > (originalInfo?.size || 0) && (
                        <div className="flex gap-2.5 bg-rose-500/10 border border-rose-500/20 text-rose-300 rounded-xl p-4 text-xs">
                          <AlertTriangle size={15} className="text-rose-400 flex-shrink-0 mt-0.5" />
                          <p>形式の特性上、サイズが大きくなっています。WebP等を推奨します。</p>
                        </div>
                      )}

                      {/* Call to actions following Sleek Interface Group Hover */}
                      <div className="pt-4 border-t border-white/5 flex flex-col gap-3">
                        <button
                          onClick={handleDownload}
                          className="group flex items-center justify-between w-full p-4 border border-emerald-500/30 hover:border-emerald-500 rounded-xl bg-emerald-500/10 hover:bg-emerald-500 text-white hover:text-slate-950 transition-all duration-300 text-left"
                        >
                          <span className="text-xs font-bold uppercase tracking-widest">
                            ダウンロードする (出力保存)
                          </span>
                          <div className="w-8 h-8 rounded-full flex items-center justify-center bg-white/10 group-hover:bg-slate-900/10 text-current transition-colors">
                            <Download size={14} />
                          </div>
                        </button>

                        <button
                          onClick={handleReset}
                          className="flex items-center justify-center py-2.5 text-xs text-slate-400 hover:text-white transition-all font-mono font-bold uppercase tracking-widest"
                        >
                          別のファイルを最適化 ↩
                        </button>
                      </div>

                    </div>
                  ) : (
                    // ───── GRID SAFETY VERDICTS CHECKER RESULTS ─────
                    <div className="space-y-6">
                      
                      {/* Big super-readable Occupancy percentage read */}
                      <div>
                        <p className="text-slate-400 text-[10px] uppercase tracking-widest mb-3 font-semibold">
                          追加テキスト・ロゴ占有率 (Ad Text Occupancy)
                        </p>
                        <div className="flex items-baseline gap-4">
                          <span className={`text-7xl lg:text-8xl font-light tracking-tighter leading-none font-sans ${checkerReport.colorClass}`}>
                            {checkerMarkedCount}%
                          </span>

                          <div className={`px-3 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-wider
                            ${checkerMarkedCount <= 20 
                              ? 'bg-emerald-500/20 text-emerald-400' 
                              : checkerMarkedCount <= 31 
                                ? 'bg-amber-500/20 text-amber-400' 
                                : 'bg-rose-500/20 text-rose-400 shadow-[0_0_15px_rgba(244,63,94,0.1)]'
                            }`}
                          >
                            LIMIT: 20%
                          </div>
                        </div>
                      </div>

                      {/* Two column visual cards */}
                      <div className="grid grid-cols-2 gap-4">
                        
                        <div className="bg-white/5 border border-white/10 p-5 rounded-2xl flex flex-col justify-between">
                          <div className="w-9 h-9 bg-white rounded-xl flex items-center justify-center mb-5 text-slate-900">
                            <LayoutGrid size={16} />
                          </div>
                          <div>
                            <div className="text-xl sm:text-2xl font-mono font-bold text-white leading-tight">
                              {checkerMarkedCount} / 100
                            </div>
                            <div className="text-[9px] text-slate-500 uppercase tracking-widest font-bold mt-1.5">
                              Marked Cells
                            </div>
                          </div>
                        </div>

                        <div className={`border p-5 rounded-2xl flex flex-col justify-between ${checkerReport.color}`}>
                          <div className="w-9 h-9 rounded-xl flex items-center justify-center mb-5 text-slate-900 font-extrabold font-logo text-base bg-white">
                            {checkerReport.mark}
                          </div>
                          <div>
                            <div className="text-sm font-bold truncate leading-tight">
                              {checkerReport.label}
                            </div>
                            <div className="text-[9px] text-slate-400 uppercase tracking-widest font-bold mt-2">
                              Safety Standard
                            </div>
                          </div>
                        </div>

                      </div>

                      {/* Description status readout */}
                      <div className={`p-4 rounded-xl border text-xs leading-relaxed ${checkerReport.color}`}>
                        {checkerReport.text}
                      </div>

                      {/* Audit back reset */}
                      <div className="pt-4 border-t border-white/5">
                        <button
                          onClick={handleReset}
                          className="w-full py-3 border border-white/10 hover:border-white/20 rounded-xl bg-white/5 hover:bg-white/10 transition-all text-xs font-bold uppercase tracking-widest"
                        >
                          別の画像をクリア判定
                        </button>
                      </div>

                    </div>
                  )}

                </div>
              </motion.div>
            )}
          </AnimatePresence>

        </div>

        {/* Floating tiny footer copyright in right dashboard pane */}
        <footer className="absolute bottom-6 left-6 right-6 flex items-center justify-between text-[9px] text-slate-500 uppercase tracking-widest font-mono pointer-events-none">
          <span>GYUTTEE © {new Date().getFullYear()}</span>
          <span className="flex items-center gap-1">
            <CheckCircle2 size={10} className="text-emerald-500" />
            100% Secure Sandbox Client-Engine
          </span>
        </footer>

      </div>

    </div>
  );
}
