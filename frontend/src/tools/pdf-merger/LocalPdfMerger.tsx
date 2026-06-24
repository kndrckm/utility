/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  FileCheck, 
  Trash2, 
  AlertTriangle, 
  Sparkles, 
  FileSpreadsheet, 
  ArrowRight, 
  Download, 
  RefreshCw, 
  ShieldCheck, 
  Layers, 
  Clock 
} from 'lucide-react';
import { PDFFileItem, CoverPageConfig, PageNumberConfig } from './types';
import PDFUploadZone from './components/PDFUploadZone';
import PDFQueueItem from './components/PDFQueueItem';
import MergeSettings from './components/MergeSettings';
import { mergePDFs, formatBytes } from './utils/pdfUtils';

export default function App() {
  const [files, setFiles] = useState<PDFFileItem[]>([]);
  const [outputFilename, setOutputFilename] = useState<string>('compilation_merged');
  const [isMerging, setIsMerging] = useState<boolean>(false);
  const [mergeError, setMergeError] = useState<string | null>(null);
  const [successInfo, setSuccessInfo] = useState<{
    url: string;
    size: number;
    filename: string;
  } | null>(null);

  // Cover Page configuration state
  const [coverConfig, setCoverConfig] = useState<CoverPageConfig>({
    enabled: false,
    title: 'Project Specification',
    subtitle: 'Compiled Resource Document',
    author: '',
    date: new Date().toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' }),
    themeColor: '#6366f1', // Indigo default
    showBorder: true,
  });

  // Page numbering configuration state
  const [pageNumConfig, setPageNumConfig] = useState<PageNumberConfig>({
    enabled: false,
    position: 'bottom-right',
    prefix: 'Page',
  });

  // Handle addition of newly uploaded PDF files
  const handleFilesAdded = (newFiles: PDFFileItem[]) => {
    setFiles((prev) => [...prev, ...newFiles]);
    setSuccessInfo(null); // Clear previous download link
  };

  // Reordering helpers
  const handleMoveUp = (index: number) => {
    if (index === 0) return;
    setFiles((prev) => {
      const list = [...prev];
      const temp = list[index];
      list[index] = list[index - 1];
      list[index - 1] = temp;
      return list;
    });
  };

  const handleMoveDown = (index: number) => {
    if (index === files.length - 1) return;
    setFiles((prev) => {
      const list = [...prev];
      const temp = list[index];
      list[index] = list[index + 1];
      list[index + 1] = temp;
      return list;
    });
  };

  const handleRemove = (id: string) => {
    setFiles((prev) => prev.filter((f) => f.id !== id));
    setSuccessInfo(null);
  };

  const handleUpdateFile = (id: string, updatedFields: Partial<PDFFileItem>) => {
    setFiles((prev) =>
      prev.map((f) => (f.id === id ? { ...f, ...updatedFields } : f))
    );
  };

  const handleClearAll = () => {
    setFiles([]);
    setSuccessInfo(null);
    setMergeError(null);
  };

  // Execute the local merging process
  const handleMergeAction = async () => {
    if (files.length === 0) return;

    // Check for errors in user range inputs first
    const filesWithErrors = files.filter((f) => f.error);
    if (filesWithErrors.length > 0) {
      setMergeError(`Please correct page range errors before compilation (e.g., in "${filesWithErrors[0].name}").`);
      return;
    }

    setIsMerging(true);
    setMergeError(null);
    setSuccessInfo(null);

    try {
      // Prepare the files for pdf-lib input
      const payload = files.map((f) => ({
        file: f.file,
        parsedPages: f.parsedPages,
      }));

      // Generate the merged PDF file as bytes
      const mergedBytes = await mergePDFs(payload, coverConfig, pageNumConfig);
      const blob = new Blob([mergedBytes], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      const filenameWithExt = `${outputFilename.trim() || 'compilation_merged'}.pdf`;

      setSuccessInfo({
        url,
        size: blob.size,
        filename: filenameWithExt,
      });

      // Automatically download the file to the user's browser
      const link = document.createElement('a');
      link.href = url;
      link.download = filenameWithExt;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err: any) {
      console.error('Local merge failure:', err);
      setMergeError(err.message || 'An unexpected error occurred while compiling your PDFs. Please ensure none of the files are password encrypted.');
    } finally {
      setIsMerging(false);
    }
  };

  // Compute stats for current queue
  const totalFiles = files.length;
  const totalInputPages = files.reduce((sum, f) => sum + f.pageCount, 0);
  const totalOutputPages = files.reduce((sum, f) => sum + (f.error ? 0 : f.parsedPages.length), 0) + (coverConfig.enabled ? 1 : 0);
  const totalInputSize = files.reduce((sum, f) => sum + f.size, 0);

  return (
    <div className="min-h-screen bg-[var(--color-neo-bg)] text-slate-100 font-[Inter] antialiased">
      
      {/* Visual Header Grid Panel */}
      <header className="border-b brutal-border bg-[var(--color-neo-surface)] brutal-shadow backdrop-blur-md sticky top-0 z-30">
        <div className="max-w-5xl mx-auto px-4 py-4 sm:px-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="rounded-none bg-indigo-600/20 border border-indigo-500/30 p-2 text-black">
              <Layers className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-base sm:text-lg font-bold tracking-tight text-white font-[Montserrat] uppercase tracking-tighter">
                Local PDF Merger
              </h1>
              <div className="hidden sm:flex items-center gap-1.5 text-[11px] text-[var(--color-neo-white)] font-bold uppercase">
                <ShieldCheck className="h-3.5 w-3.5 text-black" />
                <span>100% Client-Side Engine • Sandboxed Secure</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 border brutal-border bg-[var(--color-neo-surface)] brutal-shadow px-3 py-1.5 rounded-none">
            <span className="flex h-2 w-2 rounded-none bg-[var(--color-neo-lime)] text-black brutal-btn font-black uppercase animate-pulse"></span>
            <span className="text-[10px] font-semibold text-[var(--color-neo-white)] font-bold uppercase font-mono">Sandbox Environment</span>
          </div>
        </div>
      </header>

      {/* Main Body Stage */}
      <main className="max-w-5xl mx-auto px-4 py-8 sm:px-6">
        
        {/* Pitch Hero/Welcome Message */}
        <div className="mb-10 text-center max-w-2xl mx-auto">
          <h2 className="text-3xl sm:text-4xl font-bold text-white font-[Montserrat] uppercase tracking-tighter tracking-tight mb-2">
            Merge &amp; Organize PDFs Privately
          </h2>
          <p className="text-sm text-[var(--color-neo-white)] font-bold uppercase leading-relaxed">
            Drag, order, select individual pages, and insert custom formatted cover sheets. All file calculations and merging occur entirely within your web browser. None of your data ever leaves this device.
          </p>
        </div>

        {/* Bento Grid layout for Empty State */}
        {files.length === 0 && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Left Big Dropzone Card */}
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="md:col-span-2 bg-[var(--color-neo-surface)] brutal-border brutal-shadow border rounded-none p-6 flex flex-col justify-center"
            >
              <PDFUploadZone onFilesAdded={handleFilesAdded} />
            </motion.div>

            {/* Right Welcome Info Card */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="bg-[var(--color-neo-surface)] brutal-border brutal-shadow border rounded-none p-8 flex flex-col justify-between"
            >
              <div>
                <span className="text-[10px] uppercase tracking-wider font-semibold text-black font-mono">Guaranteed Safety</span>
                <h3 className="text-xl font-bold text-white mt-1.5 mb-3 font-[Montserrat] uppercase tracking-tighter">No Server Uploads</h3>
                <p className="text-xs text-[var(--color-neo-white)] font-bold uppercase leading-relaxed">
                  Most PDF converters upload your documents to servers, risking sensitive files. This utility operates entirely on client memory via Compiled WebAssembly, protecting your private files and records 100%.
                </p>
              </div>

              <div className="border-t brutal-border pt-5 mt-6">
                <div className="flex items-center gap-3 text-xs text-slate-300">
                  <div className="bg-[var(--color-neo-surface)] brutal-border brutal-shadow border p-2 rounded-none text-black">
                    <ShieldCheck className="h-4.5 w-4.5" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-white">Full Encryption</h4>
                    <p className="text-[10px] text-[var(--color-neo-white)] font-bold uppercase">Zero data leaves this tab</p>
                  </div>
                </div>
              </div>
            </motion.div>

            {/* Feature Row - Bento Cards */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="bg-[var(--color-neo-surface)] brutal-border brutal-shadow border rounded-none p-6 flex items-start gap-4"
            >
              <div className="p-3 rounded-none bg-[var(--color-neo-purple)] brutal-border text-black border border-indigo-500/20 mt-0.5">
                <Sparkles className="h-5 w-5" />
              </div>
              <div>
                <h4 className="font-bold text-white text-sm font-[Montserrat] uppercase tracking-tighter">Aesthetic Cover Pages</h4>
                <p className="text-xs text-[var(--color-neo-white)] font-bold uppercase mt-1 leading-normal">
                  Toggle dynamic, gorgeous title cover pages. Configure theme colors, borders, authors and sub-topics effortlessly.
                </p>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.25 }}
              className="bg-[var(--color-neo-surface)] brutal-border brutal-shadow border rounded-none p-6 flex items-start gap-4"
            >
              <div className="p-3 rounded-none bg-[var(--color-neo-purple)] brutal-border text-black border border-indigo-500/20 mt-0.5">
                <Layers className="h-5 w-5" />
              </div>
              <div>
                <h4 className="font-bold text-white text-sm font-[Montserrat] uppercase tracking-tighter">Custom Page Slicing</h4>
                <p className="text-xs text-[var(--color-neo-white)] font-bold uppercase mt-1 leading-normal">
                  Don't merge everything! Select individual pages or custom intervals (e.g., 1-4, 7-10) before stitching PDFs together.
                </p>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="bg-[var(--color-neo-surface)] brutal-border brutal-shadow border rounded-none p-6 flex items-start gap-4"
            >
              <div className="p-3 rounded-none bg-[var(--color-neo-purple)] brutal-border text-black border border-indigo-500/20 mt-0.5">
                <Clock className="h-5 w-5" />
              </div>
              <div>
                <h4 className="font-bold text-white text-sm font-[Montserrat] uppercase tracking-tighter">WebAssembly Engine</h4>
                <p className="text-xs text-[var(--color-neo-white)] font-bold uppercase mt-1 leading-normal">
                  High-speed processing utilizing native memory pools allows compilation of massive documents in milliseconds.
                </p>
              </div>
            </motion.div>
          </div>
        )}

        {/* Workspace Active Queue Bento Layout */}
        {files.length > 0 && (
          <div className="space-y-6">
            
            {/* Main Split Row */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
              
              {/* Document List (Left Span-2 Tile) */}
              <div className="lg:col-span-2 space-y-4">
                
                {/* Active queue header and tools */}
                <div className="flex items-center justify-between gap-3 bg-[var(--color-neo-surface)] brutal-border brutal-shadow border p-5 rounded-none">
                  <div className="flex items-center gap-3">
                    <div className="bg-[var(--color-neo-surface)] brutal-border brutal-shadow border rounded-none px-3 py-1.5 text-xs font-bold text-black font-mono">
                      {totalFiles} {totalFiles === 1 ? 'File' : 'Files'} Loaded
                    </div>
                    <span className="text-xs text-[var(--color-neo-white)] font-bold uppercase font-medium hidden sm:inline">
                      Ready to manage and compile
                    </span>
                  </div>

                  <button
                    onClick={handleClearAll}
                    className="flex items-center gap-1.5 text-xs font-medium text-[var(--color-neo-white)] font-bold uppercase hover:text-red-400 bg-[var(--color-neo-surface)] brutal-border brutal-shadow hover:bg-red-950/20 border hover:border-red-900 px-3.5 py-2 rounded-none transition-all cursor-pointer"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    <span>Clear Queue</span>
                  </button>
                </div>

                {/* Document List Cards */}
                <div className="space-y-3.5">
                  <AnimatePresence initial={false}>
                    {files.map((item, idx) => (
                      <motion.div
                        key={item.id}
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        transition={{ duration: 0.2 }}
                      >
                        <PDFQueueItem
                          item={item}
                          index={idx}
                          totalItems={files.length}
                          onUpdate={handleUpdateFile}
                          onRemove={handleRemove}
                          onMoveUp={handleMoveUp}
                          onMoveDown={handleMoveDown}
                        />
                      </motion.div>
                    ))}
                  </AnimatePresence>
                </div>

                {/* Sub-upload Drop Box for appending additional files */}
                <div className="border border-dashed brutal-border bg-[#141414]/50 rounded-none p-4 transition-all hover:bg-[#141414]">
                  <PDFUploadZone onFilesAdded={handleFilesAdded} />
                </div>
              </div>

              {/* Sidebar Info/Metrics Bento Panel (Right Span-1 Tile) */}
              <div className="space-y-6">
                {/* Stats Tile */}
                <div className="bg-[var(--color-neo-surface)] brutal-border brutal-shadow border rounded-none p-6">
                  <h3 className="font-bold text-white text-base font-[Montserrat] uppercase tracking-tighter pb-3 border-b brutal-border mb-4">
                    Queue Summary
                  </h3>
                  
                  <div className="space-y-3.5 font-mono text-xs">
                    <div className="flex justify-between items-center py-1.5 border-b brutal-border">
                      <span className="text-[var(--color-neo-white)] font-bold uppercase">Document Count:</span>
                      <span className="text-white font-bold">{totalFiles}</span>
                    </div>
                    <div className="flex justify-between items-center py-1.5 border-b brutal-border">
                      <span className="text-[var(--color-neo-white)] font-bold uppercase">Total Input Pages:</span>
                      <span className="text-white">{totalInputPages}</span>
                    </div>
                    <div className="flex justify-between items-center py-1.5 border-b brutal-border">
                      <span className="text-[var(--color-neo-white)] font-bold uppercase">Output Compilation:</span>
                      <span className="text-black font-bold">{totalOutputPages} pages</span>
                    </div>
                    <div className="flex justify-between items-center py-1.5 border-b brutal-border">
                      <span className="text-[var(--color-neo-white)] font-bold uppercase">Payload Size:</span>
                      <span className="text-white">{formatBytes(totalInputSize)}</span>
                    </div>
                    <div className="flex justify-between items-center py-1.5">
                      <span className="text-[var(--color-neo-white)] font-bold uppercase">Local Sandbox:</span>
                      <span className="text-emerald-400 font-bold uppercase text-[10px] tracking-wider">Active</span>
                    </div>
                  </div>
                </div>

                {/* Download / Success info tile */}
                {successInfo && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="bg-indigo-950/20 border border-indigo-900/50 rounded-none p-6 brutal-shadow flex flex-col gap-4"
                  >
                    <div className="flex gap-3">
                      <div className="rounded-none bg-indigo-600/20 text-black border border-indigo-500/20 p-2.5 h-fit">
                        <Download className="h-5 w-5" />
                      </div>
                      <div>
                        <h3 className="font-bold text-[var(--color-neo-purple)] font-black text-sm font-[Montserrat] uppercase tracking-tighter">Download Ready</h3>
                        <p className="text-[11px] text-[var(--color-neo-white)] font-bold uppercase mt-1 leading-relaxed">
                          <b>{successInfo.filename}</b> ({formatBytes(successInfo.size)}) was processed and compiled.
                        </p>
                      </div>
                    </div>

                    <a
                      href={successInfo.url}
                      download={successInfo.filename}
                      className="w-full text-center px-4 py-2.5 bg-[var(--color-neo-lime)] text-black brutal-btn font-black uppercase hover:bg-white brutal-shadow-hover active:scale-95 text-white font-medium text-xs rounded-none shadow transition-all block"
                    >
                      Download Again
                    </a>
                  </motion.div>
                )}
              </div>
            </div>

            {/* Settings Bento Tile */}
            <MergeSettings
              coverConfig={coverConfig}
              onCoverChange={setCoverConfig}
              pageNumConfig={pageNumConfig}
              onPageNumChange={setPageNumConfig}
              outputFilename={outputFilename}
              onFilenameChange={setOutputFilename}
            />

            {/* Warning or Error notifications */}
            {mergeError && (
              <div className="flex items-start gap-3 p-4 bg-red-950/20 border border-red-900/50 text-red-400 rounded-none text-sm animate-fadeIn">
                <AlertTriangle className="h-5 w-5 flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <h4 className="font-semibold text-red-300 text-xs sm:text-sm">Compilation Interrupted</h4>
                  <p className="mt-0.5 text-xs sm:text-sm leading-relaxed text-red-400">{mergeError}</p>
                </div>
              </div>
            )}

            {/* Compile Action Button Banner */}
            <div className="bg-[var(--color-neo-surface)] brutal-border brutal-shadow border rounded-none p-6 flex flex-col sm:flex-row items-center justify-between gap-4">
              <div>
                <h3 className="font-bold text-white text-base font-[Montserrat] uppercase tracking-tighter">Ready to Compile Documents?</h3>
                <p className="text-xs text-[var(--color-neo-white)] font-bold uppercase mt-1">
                  Merging {totalFiles} PDFs ({totalOutputPages} pages total) into <b className="text-black font-mono">{outputFilename || 'merged'}.pdf</b>
                </p>
              </div>

              <button
                onClick={handleMergeAction}
                disabled={isMerging}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3.5 bg-[var(--color-neo-lime)] text-black brutal-btn font-black uppercase hover:bg-white brutal-shadow-hover active:scale-[0.98] text-white font-semibold text-sm rounded-none cursor-pointer brutal-shadow disabled:opacity-50 disabled:cursor-not-allowed transition-all"
              >
                {isMerging ? (
                  <>
                    <RefreshCw className="h-4 w-4 animate-spin" />
                    <span>Compiling PDF Locally...</span>
                  </>
                ) : (
                  <>
                    <FileCheck className="h-4 w-4" />
                    <span>Compile &amp; Download PDF</span>
                  </>
                )}
              </button>
            </div>

          </div>
        )}

      </main>

      {/* Trust & Safe Privacy Indicator Footer */}
      <footer className="max-w-5xl mx-auto px-4 py-12 sm:px-6 text-center border-t brutal-border mt-16">
        <div className="inline-flex items-center gap-1.5 bg-[var(--color-neo-surface)] brutal-border brutal-shadow border px-4 py-2 rounded-none mb-3 text-xs font-medium text-[var(--color-neo-white)] font-bold uppercase">
          <ShieldCheck className="h-4 w-4 text-black" />
          <span>Private Local Engine</span>
        </div>
        <p className="text-xs text-[var(--color-neo-white)] font-bold uppercase max-w-md mx-auto leading-relaxed font-mono">
          No document uploads are processed on server architectures. All PDF parsing, slicing, and merging occur directly in client memory via compiled WebAssembly and native standard libraries.
        </p>
      </footer>

    </div>
  );
}
