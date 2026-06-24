/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useRef, useState } from 'react';
import { Upload, FileUp, AlertCircle, Loader2 } from 'lucide-react';
import { PDFDocument } from 'pdf-lib';
import { PDFFileItem } from '../types';

interface PDFUploadZoneProps {
  onFilesAdded: (newFiles: PDFFileItem[]) => void;
}

export default function PDFUploadZone({ onFilesAdded }: PDFUploadZoneProps) {
  const [isDragActive, setIsDragActive] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Helper to process selected or dropped PDF files
  const processFiles = async (files: FileList) => {
    setIsProcessing(true);
    setErrorMsg(null);
    const validItems: PDFFileItem[] = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      if (file.type !== 'application/pdf' && !file.name.endsWith('.pdf')) {
        continue;
      }

      try {
        // Read file bytes to get dynamic page count safely
        const arrayBuffer = await file.arrayBuffer();
        const pdfDoc = await PDFDocument.load(arrayBuffer, { 
          updateMetadata: false 
        });
        const pageCount = pdfDoc.getPageCount();

        validItems.push({
          id: `${file.name}-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
          file: file,
          name: file.name.replace(/\.pdf$/i, ''),
          size: file.size,
          pageCount: pageCount,
          selectedPagesRange: 'All',
          parsedPages: Array.from({ length: pageCount }, (_, idx) => idx),
        });
      } catch (err) {
        console.error('Error reading PDF:', err);
        setErrorMsg(`Failed to read "${file.name}". Is it password-protected or corrupted?`);
      }
    }

    if (validItems.length > 0) {
      onFilesAdded(validItems);
    } else if (!errorMsg) {
      setErrorMsg('No valid PDF files were selected.');
    }
    setIsProcessing(false);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragActive(true);
  };

  const handleDragLeave = () => {
    setIsDragActive(false);
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      await processFiles(e.dataTransfer.files);
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      await processFiles(e.target.files);
      // Reset input value so same file can be uploaded again
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const triggerFileSelect = () => {
    fileInputRef.current?.click();
  };

  return (
    <div className="w-full">
      <div
        id="pdf-upload-dropzone"
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={triggerFileSelect}
        className={`relative flex flex-col items-center justify-center border-2 border-dashed rounded-none p-10 cursor-pointer transition-all duration-300 ${ isDragActive ? 'border-indigo-500 bg-indigo-950/20 shadow-[0_0_20px_rgba(99,102,241,0.15)]' : 'border-slate-800 hover:border-slate-700 bg-[#141414]' }`}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf,application/pdf"
          multiple
          onChange={handleFileChange}
          className="hidden"
          id="pdf-file-picker"
        />

        <div className="rounded-none bg-[var(--color-neo-surface)] brutal-border brutal-shadow p-4 border mb-4 transition-transform group-hover:scale-110">
          {isProcessing ? (
            <Loader2 className="h-8 w-8 text-indigo-500 animate-spin" />
          ) : (
            <FileUp className="h-8 w-8 text-black" />
          )}
        </div>

        <h3 className="text-lg font-medium text-white mb-1 font-[Montserrat] uppercase tracking-tighter">
          {isProcessing ? 'Analyzing documents...' : 'Upload PDF Files'}
        </h3>
        <p className="text-sm text-[var(--color-neo-white)] font-bold uppercase text-center max-w-sm mb-4">
          Drag and drop your PDF documents here, or <span className="text-black font-semibold hover:underline">browse files</span>
        </p>
        
        <div className="text-xs text-[var(--color-neo-white)] font-bold uppercase border brutal-border rounded-none px-3 py-1.5 bg-[var(--color-neo-surface)] brutal-shadow">
          Client-Side Processing (Files never leave your browser)
        </div>
      </div>

      {errorMsg && (
        <div id="pdf-upload-error" className="mt-4 flex items-start gap-3 p-4 bg-red-950/20 border border-red-900/50 text-red-400 rounded-none text-sm">
          <AlertCircle className="h-5 w-5 flex-shrink-0 mt-0.5" />
          <div>{errorMsg}</div>
        </div>
      )}
    </div>
  );
}
