import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Document, Page, pdfjs } from 'react-pdf';
import { PDFDocument } from 'pdf-lib';
import { 
  FileCheck, Trash2, ShieldCheck, Layers, 
  ArrowLeft, ArrowRight, UploadCloud, RefreshCw, FileImage
} from 'lucide-react';

if (!pdfjs.GlobalWorkerOptions.workerSrc) {
  pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;
}

interface SourceFile {
  id: string;
  file: File;
  url: string;
  type: 'pdf' | 'image';
}

interface PageItem {
  id: string;
  sourceId: string;
  originalPageIndex: number;
}

export default function LocalPdfOrganizer() {
  const [sources, setSources] = useState<SourceFile[]>([]);
  const [pages, setPages] = useState<PageItem[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [outputFilename, setOutputFilename] = useState('organized_document');
  const [zoom, setZoom] = useState(150);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFilesAdded = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    setIsProcessing(true);

    const newSources: SourceFile[] = [];
    const newPages: PageItem[] = [];

    for (let i = 0; i < e.target.files.length; i++) {
      const file = e.target.files[i];
      const sourceId = Math.random().toString(36).substring(2, 11);
      const url = URL.createObjectURL(file);

      if (file.type === 'application/pdf') {
        try {
          const bytes = await file.arrayBuffer();
          const pdfDoc = await PDFDocument.load(bytes, { ignoreEncryption: true });
          const count = pdfDoc.getPageCount();

          newSources.push({ id: sourceId, file, url, type: 'pdf' });
          for (let p = 0; p < count; p++) {
            newPages.push({ id: Math.random().toString(36).substring(2, 11), sourceId, originalPageIndex: p });
          }
        } catch (err) {
          console.error("Failed to parse PDF", file.name, err);
        }
      } else if (file.type.startsWith('image/')) {
        newSources.push({ id: sourceId, file, url, type: 'image' });
        newPages.push({ id: Math.random().toString(36).substring(2, 11), sourceId, originalPageIndex: 0 });
      }
    }

    setSources(prev => [...prev, ...newSources]);
    setPages(prev => [...prev, ...newPages]);
    setIsProcessing(false);
    
    if (e.target) e.target.value = '';
  };

  const moveLeft = (index: number) => {
    if (index === 0) return;
    setPages(prev => {
      const list = [...prev];
      [list[index], list[index - 1]] = [list[index - 1], list[index]];
      return list;
    });
  };

  const moveRight = (index: number) => {
    if (index === pages.length - 1) return;
    setPages(prev => {
      const list = [...prev];
      [list[index], list[index + 1]] = [list[index + 1], list[index]];
      return list;
    });
  };

  const removePage = (index: number) => {
    setPages(prev => {
      const list = [...prev];
      list.splice(index, 1);
      return list;
    });
  };

  const clearAll = () => {
    setSources([]);
    setPages([]);
  };

  const handleExport = async () => {
    if (pages.length === 0) return;
    setIsProcessing(true);

    try {
      const outDoc = await PDFDocument.create();
      const sourceCache: Record<string, PDFDocument> = {};

      for (const item of pages) {
        const source = sources.find(s => s.id === item.sourceId);
        if (!source) continue;

        if (source.type === 'pdf') {
          if (!sourceCache[source.id]) {
            const bytes = await source.file.arrayBuffer();
            sourceCache[source.id] = await PDFDocument.load(bytes, { ignoreEncryption: true });
          }
          const srcDoc = sourceCache[source.id];
          const [copiedPage] = await outDoc.copyPages(srcDoc, [item.originalPageIndex]);
          outDoc.addPage(copiedPage);
        } else if (source.type === 'image') {
          const bytes = await source.file.arrayBuffer();
          let imageEmbed;
          if (source.file.type === 'image/png') {
            imageEmbed = await outDoc.embedPng(bytes);
          } else {
            imageEmbed = await outDoc.embedJpg(bytes);
          }
          
          const a4Width = 595.28;
          const a4Height = 841.89;
          const scale = Math.min(a4Width / imageEmbed.width, a4Height / imageEmbed.height);
          const scaledWidth = imageEmbed.width * scale;
          const scaledHeight = imageEmbed.height * scale;

          const page = outDoc.addPage([a4Width, a4Height]);
          const x = (a4Width - scaledWidth) / 2;
          const y = (a4Height - scaledHeight) / 2;
          
          page.drawImage(imageEmbed, { x, y, width: scaledWidth, height: scaledHeight });
        }
      }

      const pdfBytes = await outDoc.save();
      const blob = new Blob([pdfBytes], { type: 'application/pdf' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = `${outputFilename.trim() || 'organized_document'}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err) {
      console.error(err);
      alert('Failed to compile PDF. Check console for details.');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="h-full bg-[var(--color-neo-bg)] text-white font-[Inter] antialiased flex flex-col relative overflow-hidden">
      
      {/* Header */}
      <header className="border-b-4 border-black bg-[var(--color-neo-surface)] z-30 shrink-0 brutal-shadow p-5 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-[var(--color-neo-purple)] border-4 border-black flex items-center justify-center text-black brutal-shadow">
            <Layers className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-xl font-black text-white font-[Montserrat] uppercase tracking-tighter">
              PDF Organizer
            </h1>
            <div className="flex items-center gap-1.5 text-[10px] text-[var(--color-neo-lime)] uppercase tracking-widest font-bold">
              <ShieldCheck className="h-3.5 w-3.5" />
              <span>100% Client-Side Engine</span>
            </div>
          </div>
        </div>

        <div className="flex gap-6 items-center">
          {pages.length > 0 && (
            <div className="flex items-center gap-3 bg-[var(--color-neo-bg)] brutal-border px-4 py-2 brutal-shadow">
              <span className="text-[10px] text-[var(--color-neo-white)] font-[Inter] uppercase font-bold">Zoom</span>
              <input 
                type="range" 
                min="80" max="300" 
                value={zoom} 
                onChange={(e) => setZoom(Number(e.target.value))}
                className="w-24 accent-[var(--color-neo-lime)]"
              />
            </div>
          )}
          <input 
            type="file" 
            ref={fileInputRef} 
            onChange={handleFilesAdded} 
            className="hidden" 
            multiple 
            accept=".pdf,image/png,image/jpeg,image/jpg" 
          />
          {pages.length > 0 && (
            <button 
              onClick={() => fileInputRef.current?.click()}
              className="bg-[var(--color-neo-cyan)] text-black px-6 py-3 text-xs font-black uppercase font-[Inter] transition-all brutal-btn brutal-shadow-hover flex items-center gap-2"
            >
              <UploadCloud className="h-4 w-4" /> Add Pages
            </button>
          )}
        </div>
      </header>

      {/* Main Workspace */}
      <main className="flex-1 overflow-auto p-8 flex flex-col relative w-full custom-scrollbar">
        
        {/* Empty State */}
        {pages.length === 0 && (
          <div className="flex-1 flex items-center justify-center min-h-[60vh]">
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="max-w-xl w-full bg-[var(--color-neo-surface)] brutal-border p-12 flex flex-col items-center justify-center text-center brutal-shadow"
            >
              <div className="w-20 h-20 bg-[var(--color-neo-lime)] border-4 border-black flex items-center justify-center text-black mb-8 brutal-shadow">
                <UploadCloud className="h-10 w-10" />
              </div>
              <h2 className="text-2xl font-black text-white mb-4 font-[Montserrat] uppercase tracking-tighter">Start Organizing</h2>
              <p className="text-sm text-[var(--color-neo-white)] mb-10 font-[Inter] uppercase tracking-wider font-bold">
                Click below to upload your base PDF document. You can append more pages or images later.
              </p>
              <button 
                onClick={() => fileInputRef.current?.click()}
                className="bg-[var(--color-neo-pink)] text-black px-8 py-4 text-sm font-black font-[Inter] uppercase hover:bg-white transition-all brutal-btn brutal-shadow-hover"
              >
                Browse Files
              </button>
            </motion.div>
          </div>
        )}

        {/* Processing Overlay */}
        {isProcessing && (
          <div className="absolute inset-0 bg-[#0A0A0A]/90 backdrop-blur-sm z-50 flex items-center justify-center">
            <div className="bg-[var(--color-neo-surface)] brutal-border p-8 flex flex-col items-center gap-6 brutal-shadow text-center">
              <RefreshCw className="h-12 w-12 text-[var(--color-neo-lime)] animate-spin" />
              <span className="text-sm font-black text-white font-[Montserrat] uppercase tracking-widest">Processing Document...</span>
            </div>
          </div>
        )}

        {/* Grid Area */}
        {pages.length > 0 && (
          <div className="bg-[var(--color-neo-surface)] brutal-border p-8 mb-8 flex-1 brutal-shadow">
            <div 
              className="grid gap-8 justify-center" 
              style={{ 
                gridTemplateColumns: `repeat(auto-fill, minmax(${zoom}px, 1fr))`,
                display: 'grid'
              }}
            >
              {sources.map(source => {
                const sourcePages = pages.filter(p => p.sourceId === source.id);
                if (sourcePages.length === 0) return null;

                if (source.type === 'image') {
                  return sourcePages.map(page => {
                    const globalIndex = pages.findIndex(p => p.id === page.id);
                    return (
                      <div key={page.id} className="relative group" style={{ order: globalIndex }}>
                        <div className="bg-white brutal-border overflow-hidden flex items-center justify-center relative brutal-shadow aspect-[1/1.4]">
                          <img src={source.url} className="max-w-full max-h-full object-contain" alt="Upload" />
                          <div className="absolute inset-0 bg-black/80 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3">
                            <button onClick={() => moveLeft(globalIndex)} disabled={globalIndex === 0} className="w-10 h-10 flex items-center justify-center bg-[var(--color-neo-lime)] border-4 border-black hover:bg-white disabled:opacity-50 text-black brutal-btn transition-all">
                              <ArrowLeft className="h-5 w-5 font-black" />
                            </button>
                            <button onClick={() => removePage(globalIndex)} className="w-10 h-10 flex items-center justify-center bg-[var(--color-neo-pink)] border-4 border-black hover:bg-white text-black brutal-btn transition-all">
                              <Trash2 className="h-5 w-5" />
                            </button>
                            <button onClick={() => moveRight(globalIndex)} disabled={globalIndex === pages.length - 1} className="w-10 h-10 flex items-center justify-center bg-[var(--color-neo-lime)] border-4 border-black hover:bg-white disabled:opacity-50 text-black brutal-btn transition-all">
                              <ArrowRight className="h-5 w-5 font-black" />
                            </button>
                          </div>
                        </div>
                        <div className="text-center mt-4 flex flex-col items-center">
                           <span className="text-[10px] font-black font-[Inter] uppercase bg-[var(--color-neo-purple)] text-black px-2 py-1 brutal-border">Page {globalIndex + 1}</span>
                           <div className="flex items-center gap-1 mt-2 font-bold font-[Inter] uppercase">
                             <FileImage className="h-3 w-3 text-[var(--color-neo-lime)]" />
                             <span className="text-[9px] text-[var(--color-neo-white)] truncate max-w-[100px]">{source.file.name}</span>
                           </div>
                        </div>
                      </div>
                    );
                  });
                }

                return (
                  <Document key={source.id} file={source.url} className="contents" renderMode="canvas">
                    {sourcePages.map(page => {
                      const globalIndex = pages.findIndex(p => p.id === page.id);
                      return (
                        <div key={page.id} className="relative group" style={{ order: globalIndex }}>
                          <div className="bg-white brutal-border overflow-hidden flex items-center justify-center relative brutal-shadow">
                            <Page 
                              pageIndex={page.originalPageIndex} 
                              width={zoom} 
                              renderTextLayer={false} 
                              renderAnnotationLayer={false} 
                            />
                            <div className="absolute inset-0 bg-black/80 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3">
                              <button onClick={() => moveLeft(globalIndex)} disabled={globalIndex === 0} className="w-10 h-10 flex items-center justify-center bg-[var(--color-neo-lime)] border-4 border-black hover:bg-white disabled:opacity-50 text-black brutal-btn transition-all">
                                <ArrowLeft className="h-5 w-5" />
                              </button>
                              <button onClick={() => removePage(globalIndex)} className="w-10 h-10 flex items-center justify-center bg-[var(--color-neo-pink)] border-4 border-black hover:bg-white text-black brutal-btn transition-all">
                                <Trash2 className="h-5 w-5" />
                              </button>
                              <button onClick={() => moveRight(globalIndex)} disabled={globalIndex === pages.length - 1} className="w-10 h-10 flex items-center justify-center bg-[var(--color-neo-lime)] border-4 border-black hover:bg-white disabled:opacity-50 text-black brutal-btn transition-all">
                                <ArrowRight className="h-5 w-5" />
                              </button>
                            </div>
                          </div>
                          <div className="text-center mt-4 flex flex-col items-center">
                            <span className="text-[10px] font-black font-[Inter] uppercase bg-[var(--color-neo-purple)] text-black px-2 py-1 brutal-border">Page {globalIndex + 1}</span>
                            <span className="text-[9px] text-[var(--color-neo-white)] mt-2 font-bold font-[Inter] uppercase truncate max-w-[100px]">{source.file.name} (p.{page.originalPageIndex + 1})</span>
                          </div>
                        </div>
                      );
                    })}
                  </Document>
                );
              })}
            </div>
          </div>
        )}
      </main>

      {/* Export Footer */}
      {pages.length > 0 && (
        <footer className="border-t-4 border-black bg-[var(--color-neo-surface)] p-6 shrink-0 relative flex flex-col sm:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-6">
            <button 
              onClick={clearAll}
              className="bg-white hover:bg-gray-200 text-black font-black uppercase font-[Inter] text-xs px-6 py-3 brutal-border brutal-shadow-hover transition-all"
            >
              Discard All
            </button>
            <div className="flex flex-col bg-[var(--color-neo-bg)] brutal-border p-3 brutal-shadow">
              <span className="text-[9px] text-[var(--color-neo-lime)] font-[Montserrat] font-black uppercase tracking-widest mb-1">Output Name</span>
              <div className="flex items-center gap-1">
                <input 
                  type="text" 
                  value={outputFilename}
                  onChange={(e) => setOutputFilename(e.target.value)}
                  className="bg-transparent text-white text-sm font-bold outline-none border-b-2 border-[var(--color-neo-white)] focus:border-[var(--color-neo-lime)] w-48 font-[Inter]"
                />
                <span className="text-[var(--color-neo-white)] text-sm font-bold font-[Inter]">.pdf</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-6">
            <div className="text-right hidden sm:block bg-[var(--color-neo-bg)] brutal-border p-3 brutal-shadow">
              <div className="text-[9px] text-[var(--color-neo-white)] font-[Montserrat] font-black uppercase tracking-widest">Total Pages</div>
              <div className="text-lg text-[var(--color-neo-cyan)] font-black">{pages.length}</div>
            </div>
            <button 
              onClick={handleExport}
              disabled={isProcessing}
              className="bg-[var(--color-neo-lime)] hover:bg-white disabled:opacity-50 disabled:cursor-not-allowed text-black px-8 py-4 text-sm font-black uppercase font-[Inter] brutal-btn brutal-shadow-hover flex items-center gap-3 transition-all"
            >
              <FileCheck className="h-6 w-6" />
              Save Organized PDF
            </button>
          </div>
        </footer>
      )}
    </div>
  );
}
