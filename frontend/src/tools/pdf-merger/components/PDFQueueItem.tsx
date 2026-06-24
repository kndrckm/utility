/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { ArrowUp, ArrowDown, Trash2, Edit2, Check, FileText, HelpCircle } from 'lucide-react';
import { PDFFileItem } from '../types';
import { formatBytes, validateRangeString, parsePageRange } from '../utils/pdfUtils';

interface PDFQueueItemProps {
  item: PDFFileItem;
  index: number;
  totalItems: number;
  onUpdate: (id: string, updatedFields: Partial<PDFFileItem>) => void;
  onRemove: (id: string) => void;
  onMoveUp: (index: number) => void;
  onMoveDown: (index: number) => void;
}

export default function PDFQueueItem({
  item,
  index,
  totalItems,
  onUpdate,
  onRemove,
  onMoveUp,
  onMoveDown,
}: PDFQueueItemProps) {
  const [isEditingName, setIsEditingName] = useState(false);
  const [tempName, setTempName] = useState(item.name);
  const [rangeInput, setRangeInput] = useState(item.selectedPagesRange);
  const [inputError, setInputError] = useState<string | null>(null);

  // Sync state if item changes from outside
  useEffect(() => {
    setTempName(item.name);
  }, [item.name]);

  // Handle range input change and validation
  const handleRangeChange = (value: string) => {
    setRangeInput(value);
    
    if (value.trim() === '' || value.toLowerCase() === 'all') {
      setInputError(null);
      const allPages = Array.from({ length: item.pageCount }, (_, idx) => idx);
      onUpdate(item.id, {
        selectedPagesRange: value,
        parsedPages: allPages,
        error: undefined,
      });
      return;
    }

    const validation = validateRangeString(value, item.pageCount);
    if (validation.isValid) {
      setInputError(null);
      const parsed = parsePageRange(value, item.pageCount);
      onUpdate(item.id, {
        selectedPagesRange: value,
        parsedPages: parsed,
        error: undefined,
      });
    } else {
      setInputError(validation.error || 'Invalid range');
      onUpdate(item.id, {
        selectedPagesRange: value,
        error: validation.error || 'Invalid range',
      });
    }
  };

  const saveName = () => {
    if (tempName.trim()) {
      onUpdate(item.id, { name: tempName.trim() });
    } else {
      setTempName(item.name);
    }
    setIsEditingName(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      saveName();
    } else if (e.key === 'Escape') {
      setTempName(item.name);
      setIsEditingName(false);
    }
  };

  const pagesSelectedCount = item.error ? 0 : item.parsedPages.length;

  return (
    <div
      id={`pdf-queue-item-${item.id}`}
      className={`group relative flex flex-col md:flex-row md:items-center justify-between gap-4 p-5 rounded-none border transition-all duration-200 ${ item.error ? 'border-red-900/50 bg-red-950/10' : 'border-slate-800 hover:border-slate-700 bg-[#141414]' }`}
    >
      {/* File Info */}
      <div className="flex items-start gap-3.5 flex-1 min-w-0">
        <div className="flex-shrink-0 mt-0.5 rounded-none bg-[var(--color-neo-purple)] brutal-border text-black border border-indigo-500/20 p-2.5">
          <FileText className="h-5 w-5" />
        </div>
        
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            {isEditingName ? (
              <div className="flex items-center gap-1.5 w-full max-w-md">
                <input
                  type="text"
                  value={tempName}
                  onChange={(e) => setTempName(e.target.value)}
                  onBlur={saveName}
                  onKeyDown={handleKeyDown}
                  autoFocus
                  className="w-full text-sm px-2 py-1 bg-[var(--color-neo-surface)] brutal-border brutal-shadow border border-indigo-500 text-white rounded focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
                <button
                  onClick={saveName}
                  className="p-1 text-black hover:bg-indigo-950/40 rounded"
                >
                  <Check className="h-4 w-4" />
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2 group/title max-w-full">
                <span className="font-semibold text-slate-100 truncate text-sm sm:text-base font-[Montserrat] uppercase tracking-tighter">
                  {item.name}
                </span>
                <button
                  onClick={() => setIsEditingName(true)}
                  className="opacity-0 group-hover:opacity-100 group-hover/title:opacity-100 transition-opacity p-1 text-[var(--color-neo-white)] font-bold uppercase hover:text-indigo-400 hover:bg-[#1A1A1A] rounded"
                  title="Rename"
                >
                  <Edit2 className="h-3 w-3" />
                </button>
              </div>
            )}
            <span className="text-xs text-[var(--color-neo-white)] font-bold uppercase font-mono">.pdf</span>
          </div>

          <div className="flex items-center gap-3 mt-1.5 text-xs text-[var(--color-neo-white)] font-bold uppercase font-medium">
            <span>{formatBytes(item.size)}</span>
            <span className="w-1 h-1 rounded-none bg-slate-800"></span>
            <span>{item.pageCount} pages total</span>
          </div>
        </div>
      </div>

      {/* Page Selector & Range Config */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4 md:w-auto w-full">
        <div className="flex-1 sm:flex-initial min-w-[150px] sm:min-w-[190px]">
          <div className="flex items-center justify-between gap-2 mb-1">
            <label className="text-xs font-semibold text-[var(--color-neo-white)] font-bold uppercase flex items-center gap-1">
              <span>Page Range</span>
              <div className="group/help relative">
                <HelpCircle className="h-3 w-3 text-[var(--color-neo-white)] font-bold uppercase hover:text-slate-300 cursor-help" />
                <div className="absolute z-20 bottom-full left-1/2 -translate-x-1/2 mb-2 w-48 p-2.5 bg-slate-900 text-slate-200 text-[10px] border brutal-border rounded brutal-shadow opacity-0 pointer-events-none group-hover/help:opacity-100 transition-opacity duration-200 leading-normal">
                  Enter specific pages or intervals, e.g.: <b>1-3, 5, 2-1</b>. Or type <b>All</b>.
                </div>
              </div>
            </label>
            <span className="text-[11px] text-[var(--color-neo-white)] font-bold uppercase">
              {pagesSelectedCount} of {item.pageCount} selected
            </span>
          </div>
          
          <input
            type="text"
            value={rangeInput}
            onChange={(e) => handleRangeChange(e.target.value)}
            placeholder="e.g., 1-3, 5, 8-10"
            className={`w-full text-xs px-2.5 py-1.5 rounded-none border focus:outline-none focus:ring-1 ${ inputError ? 'border-red-500 focus:ring-red-500 focus:border-red-500 bg-red-950/25 text-red-400' : 'bg-[#1A1A1A] brutal-border text-slate-200 focus:ring-indigo-500 focus:border-indigo-500' }`}
          />
          {inputError && (
            <p className="text-[10px] text-red-400 mt-1 leading-tight">{inputError}</p>
          )}
        </div>

        {/* Ordering and Action Controls */}
        <div className="flex items-center gap-1 bg-[var(--color-neo-surface)] brutal-border brutal-shadow p-1 rounded-none border">
          <button
            onClick={() => onMoveUp(index)}
            disabled={index === 0}
            className="p-1.5 rounded text-[var(--color-neo-white)] font-bold uppercase hover:text-indigo-400 hover:bg-[#141414] disabled:opacity-30 disabled:hover:text-slate-400 disabled:hover:bg-transparent"
            title="Move Up"
          >
            <ArrowUp className="h-4 w-4" />
          </button>
          
          <button
            onClick={() => onMoveDown(index)}
            disabled={index === totalItems - 1}
            className="p-1.5 rounded text-[var(--color-neo-white)] font-bold uppercase hover:text-indigo-400 hover:bg-[#141414] disabled:opacity-30 disabled:hover:text-slate-400 disabled:hover:bg-transparent"
            title="Move Down"
          >
            <ArrowDown className="h-4 w-4" />
          </button>
          
          <div className="w-px h-5 bg-slate-800 mx-1"></div>
          
          <button
            onClick={() => onRemove(item.id)}
            className="p-1.5 rounded text-[var(--color-neo-white)] font-bold uppercase hover:text-red-400 hover:bg-red-950/20"
            title="Remove File"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
