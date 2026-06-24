import React, { useRef, useState, useEffect } from 'react';
import { Upload, Crop, Download, Undo, Wand2, RefreshCcw, ChevronDown } from 'lucide-react';
import { applyMagicWand, cropCanvas, exportSquare } from './lib/imageUtils';

export default function App() {
  const cvsRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [hasImage, setHasImage] = useState(false);
  const [tolerance, setTolerance] = useState(25);
  const [contiguous, setContiguous] = useState(true);
  const [history, setHistory] = useState<ImageData[]>([]);
  const [showExportMenu, setShowExportMenu] = useState(false);

  const [isDragging, setIsDragging] = useState(false);

  useEffect(() => {
    const handlePaste = (e: ClipboardEvent) => {
      const items = e.clipboardData?.items;
      if (!items) return;
      for (let i = 0; i < items.length; i++) {
        if (items[i].type.startsWith('image/')) {
          const file = items[i].getAsFile();
          if (file) {
            processFile(file);
            break;
          }
        }
      }
    };

    window.addEventListener('paste', handlePaste);
    return () => {
      window.removeEventListener('paste', handlePaste);
    };
  }, []);

  const pushHistory = () => {
    const canvas = cvsRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const data = ctx.getImageData(0, 0, canvas.width, canvas.height);
    setHistory((prev) => [...prev, data].slice(-20)); // Keep last 20 states
  };

  const handleUndo = () => {
    if (history.length === 0) return;
    const canvas = cvsRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const lastData = history[history.length - 1];
    canvas.width = lastData.width;
    canvas.height = lastData.height;
    ctx.putImageData(lastData, 0, 0);

    setHistory((prev) => prev.slice(0, -1));
  };

  const processFile = (file: File) => {
    const img = new Image();
    img.onload = () => {
      const canvas = cvsRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      canvas.width = img.width;
      canvas.height = img.height;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0);
      setHasImage(true);
      setHistory([]); // Reset history on new upload
      
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    };
    img.src = URL.createObjectURL(file);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      processFile(file);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file && file.type.startsWith('image/')) {
      processFile(file);
    }
  };

  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!hasImage) return;
    const canvas = cvsRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const x = Math.floor((e.clientX - rect.left) * scaleX);
    const y = Math.floor((e.clientY - rect.top) * scaleY);

    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    pushHistory();

    const currentData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const newData = applyMagicWand(currentData, x, y, tolerance, contiguous);
    ctx.putImageData(newData, 0, 0);
  };

  const handleAutoCrop = () => {
    const canvas = cvsRef.current;
    if (!canvas || !hasImage) return;
    
    pushHistory();
    const cropped = cropCanvas(canvas);
    if (!cropped) {
      // Revert history if there was nothing to crop so we don't accumulate pointless states
      setHistory((prev) => prev.slice(0, -1));
    }
  };

  const handleDownload = (size: number) => {
    const canvas = cvsRef.current;
    if (!canvas || !hasImage) return;
    const dataUrl = exportSquare(canvas, size);
    if (!dataUrl) return;

    const a = document.createElement('a');
    a.href = dataUrl;
    a.download = `sprite_${size}x${size}.png`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setShowExportMenu(false);
  };

  // Fun checker pattern for transparent visibility
  const checkerBg = {
    backgroundImage: `repeating-conic-gradient(#f0f0f0 0% 25%, #fff 0% 50%)`,
    backgroundSize: `20px 20px`,
    backgroundPosition: `0 0, 10px 10px`,
  };

  return (
    <div className="min-h-screen bg-[var(--color-neo-bg)] text-[var(--color-neo-white)] flex flex-col font-[Inter] overflow-hidden">
      {/* Header & Toolbar */}
      <div className="h-auto md:h-16 bg-[var(--color-neo-surface)] border-b-4 border-black brutal-shadow px-6 py-4 md:py-0 shrink-0 flex flex-col md:flex-row gap-4 items-center justify-between z-10">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-[var(--color-neo-lime)] text-black brutal-border brutal-shadow font-black uppercase flex items-center justify-center">
            <Wand2 className="w-5 h-5 text-black" />
          </div>
          <h1 className="font-black text-white text-lg font-[Montserrat] uppercase tracking-tighter">Magic Eraser Sprite Maker</h1>
        </div>
        
        <div className="flex flex-wrap items-center justify-center gap-4">
          <input
            type="file"
            accept="image/*"
            className="hidden"
            ref={fileInputRef}
            onChange={handleFileUpload}
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center gap-2 px-4 py-1.5 bg-[var(--color-neo-cyan)] text-black text-xs font-black uppercase brutal-btn brutal-shadow-hover transition-colors"
          >
            <Upload className="w-4 h-4" />
            Upload Image
          </button>
          
          <div className="h-8 w-1 bg-black mx-2 hidden md:block"></div>

          <div className="flex flex-col gap-1">
            <div className="flex items-center justify-between">
              <span className="text-[10px] text-[var(--color-neo-white)] font-bold uppercase tracking-wider">Tolerance</span>
              <span className="text-xs font-mono w-6 text-right text-[var(--color-neo-lime)]">{tolerance}</span>
            </div>
            <input
              type="range"
              min="0"
              max="100"
              value={tolerance}
              onChange={(e) => setTolerance(parseInt(e.target.value))}
              className="w-32 h-2 bg-black rounded-none appearance-none cursor-pointer accent-[var(--color-neo-lime)]"
            />
          </div>

          <div className="flex flex-col gap-1 justify-center ml-2">
            <span className="text-[10px] text-[var(--color-neo-white)] font-bold uppercase tracking-wider">Contiguous</span>
            <label className="flex items-center gap-2 text-sm cursor-pointer mt-0.5">
              <input
                type="checkbox"
                checked={contiguous}
                onChange={(e) => setContiguous(e.target.checked)}
                className="w-4 h-4 rounded-none border-2 border-black text-[var(--color-neo-purple)] focus:ring-[var(--color-neo-lime)] accent-[var(--color-neo-purple)]"
              />
            </label>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handleUndo}
            disabled={history.length === 0}
            className="w-10 h-10 flex items-center justify-center bg-white border-2 border-black text-black hover:bg-gray-200 disabled:opacity-30 brutal-btn brutal-shadow-hover transition-colors"
            title="Undo"
          >
            <Undo className="w-5 h-5" />
          </button>
          <button
            onClick={handleAutoCrop}
            disabled={!hasImage}
            className="flex items-center gap-2 px-4 py-2 bg-[var(--color-neo-pink)] text-black brutal-btn brutal-shadow-hover text-xs font-black uppercase transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Crop className="w-4 h-4" />
            Auto Crop
          </button>
          <div className="relative">
            <button
              onClick={() => setShowExportMenu(!showExportMenu)}
              disabled={!hasImage}
              className="flex items-center gap-2 bg-[var(--color-neo-lime)] text-black brutal-btn brutal-shadow-hover font-black uppercase px-5 py-2 text-xs transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Download className="w-4 h-4" />
              Export
              <ChevronDown className="w-4 h-4" />
            </button>
            {showExportMenu && (
              <div className="absolute right-0 mt-2 w-36 bg-[var(--color-neo-surface)] brutal-border brutal-shadow z-10 p-1 flex flex-col gap-1">
                <button
                  onClick={() => handleDownload(32)}
                  className="px-4 py-2 text-sm text-left hover:bg-[var(--color-neo-bg)] text-[var(--color-neo-white)] rounded-none font-bold uppercase transition-colors"
                >
                  32x32 px
                </button>
                <button
                  onClick={() => handleDownload(96)}
                  className="px-4 py-2 text-sm text-left hover:bg-[var(--color-neo-bg)] text-[var(--color-neo-white)] rounded-none font-bold uppercase transition-colors"
                >
                  96x96 px
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Editor Area */}
      <div 
        className={`flex-1 overflow-auto relative flex items-center justify-center p-12 transition-colors ${ isDragging ? 'bg-[var(--color-neo-purple)]/20 border-4 border-[var(--color-neo-purple)]' : 'bg-[var(--color-neo-bg)]' }`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        {!hasImage && (
          <div className="text-center flex flex-col items-center">
            <div className="w-24 h-24 mb-6 bg-[var(--color-neo-purple)] brutal-border brutal-shadow flex items-center justify-center">
              <Upload className="w-8 h-8 text-black lg:w-10 lg:h-10" />
            </div>
            <h2 className="text-xl font-black text-white font-[Montserrat] uppercase tracking-tighter">Start by uploading an image</h2>
            <p className="text-xs text-[var(--color-neo-white)] font-bold uppercase mt-2 max-w-sm leading-relaxed">
              Use the 'Magic Wand' click behavior to delete backgrounds with solid colors, then auto-crop and export for sprites.
            </p>
            <div className="mt-6 flex flex-wrap justify-center gap-2">
              <span className="px-2 py-1 text-[10px] font-black uppercase text-black bg-[var(--color-neo-lime)] brutal-border">Drag & Drop</span>
              <span className="px-2 py-1 text-[10px] font-black uppercase text-black bg-[var(--color-neo-pink)] brutal-border">Ctrl + V / Paste</span>
              <span className="px-2 py-1 text-[10px] font-black uppercase text-black bg-[var(--color-neo-cyan)] brutal-border">Click to Upload</span>
            </div>
          </div>
        )}

        <div className={`relative group brutal-shadow brutal-border bg-white ${!hasImage ? 'hidden' : ''}`}>
          {/* The canvas displays on top of a checker pattern */}
          <div style={checkerBg} className="relative cursor-crosshair">
            <canvas
              ref={cvsRef}
              onClick={handleCanvasClick}
              className="max-w-full max-h-[75vh] object-contain block mx-auto interactive-canvas"
              style={{ imageRendering: 'pixelated' }}
            />
          </div>
        </div>

        {hasImage && (
          <div className="absolute bottom-8 left-1/2 -translate-x-1/2 bg-[var(--color-neo-surface)] brutal-border brutal-shadow px-4 py-2 text-xs font-bold uppercase text-[var(--color-neo-white)] pointer-events-none">
            Click areas with similar colors to remove background
          </div>
        )}
      </div>

      <footer className="h-10 bg-[var(--color-neo-surface)] border-t-4 border-black flex items-center px-4 justify-between shrink-0 z-10">
        <div className="flex gap-4 items-center">
          <span className="text-[10px] text-[var(--color-neo-lime)] font-mono tracking-widest uppercase">
            {hasImage ? "Click image to start erasing" : "Awaiting input"}
          </span>
        </div>
        <div className="flex gap-3 items-center">
          <div className="w-2 h-2 bg-[var(--color-neo-lime)] border-2 border-black animate-pulse"></div>
          <span className="text-[10px] text-[var(--color-neo-white)] font-bold uppercase tracking-tight">Processing Ready</span>
        </div>
      </footer>
    </div>
  );
}
