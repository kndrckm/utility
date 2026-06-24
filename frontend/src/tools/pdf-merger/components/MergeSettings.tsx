/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Palette, Hash, Calendar, User, FileText, Check } from 'lucide-react';
import { CoverPageConfig, PageNumberConfig } from '../types';

interface MergeSettingsProps {
  coverConfig: CoverPageConfig;
  onCoverChange: (config: CoverPageConfig) => void;
  pageNumConfig: PageNumberConfig;
  onPageNumChange: (config: PageNumberConfig) => void;
  outputFilename: string;
  onFilenameChange: (name: string) => void;
}

const THEME_PRESETS = [
  { name: 'Indigo', hex: '#6366f1', bg: 'bg-indigo-500' },
  { name: 'Emerald', hex: '#10b981', bg: 'bg-emerald-500' },
  { name: 'Ocean', hex: '#0ea5e9', bg: 'bg-sky-500' },
  { name: 'Crimson', hex: '#f43f5e', bg: 'bg-rose-500' },
  { name: 'Charcoal', hex: '#475569', bg: 'bg-slate-600' },
];

export default function MergeSettings({
  coverConfig,
  onCoverChange,
  pageNumConfig,
  onPageNumChange,
  outputFilename,
  onFilenameChange,
}: MergeSettingsProps) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
      
      {/* Cover Page Options */}
      <div className="border brutal-border bg-[var(--color-neo-surface)] brutal-shadow rounded-none p-6">
        <div className="flex items-center justify-between pb-4 border-b brutal-border mb-5">
          <div className="flex items-center gap-2.5">
            <div className="rounded-none bg-[var(--color-neo-purple)] brutal-border text-black border border-indigo-500/20 p-2">
              <Palette className="h-4.5 w-4.5" />
            </div>
            <h3 className="font-semibold text-white text-base font-[Montserrat] uppercase tracking-tighter">Custom Cover Page</h3>
          </div>
          
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={coverConfig.enabled}
              onChange={(e) => onCoverChange({ ...coverConfig, enabled: e.target.checked })}
              className="sr-only peer"
              id="cover-enable-toggle"
            />
            <div className="w-10 h-5.5 bg-slate-800 peer-focus:outline-none rounded-none peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[3px] after:left-[3px] after:bg-slate-300 after:rounded-full after:h-4 w-4 after:w-4 after:transition-all peer-checked:bg-indigo-600"></div>
            <span className="ml-2 text-xs font-semibold text-[var(--color-neo-white)] font-bold uppercase">
              {coverConfig.enabled ? 'On' : 'Off'}
            </span>
          </label>
        </div>

        {coverConfig.enabled ? (
          <div className="space-y-4 animate-fadeIn">
            {/* Title & Subtitle */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-[var(--color-neo-white)] font-bold uppercase mb-1">
                  Cover Title
                </label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-[var(--color-neo-white)] font-bold uppercase">
                    <FileText className="h-4 w-4" />
                  </span>
                  <input
                    type="text"
                    value={coverConfig.title}
                    onChange={(e) => onCoverChange({ ...coverConfig, title: e.target.value })}
                    placeholder="Document Title"
                    className="w-full text-xs pl-9 pr-3 py-2.5 rounded-none bg-[var(--color-neo-surface)] brutal-border brutal-shadow border text-slate-200 focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500"
                  />
                </div>
              </div>
              
              <div>
                <label className="block text-xs font-semibold text-[var(--color-neo-white)] font-bold uppercase mb-1">
                  Subtitle
                </label>
                <input
                  type="text"
                  value={coverConfig.subtitle}
                  onChange={(e) => onCoverChange({ ...coverConfig, subtitle: e.target.value })}
                  placeholder="Compilation Subtitle"
                  className="w-full text-xs px-3 py-2.5 rounded-none bg-[var(--color-neo-surface)] brutal-border brutal-shadow border text-slate-200 focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500"
                />
              </div>
            </div>

            {/* Author & Date */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-[var(--color-neo-white)] font-bold uppercase mb-1">
                  Prepared By (Author)
                </label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-[var(--color-neo-white)] font-bold uppercase">
                    <User className="h-4 w-4" />
                  </span>
                  <input
                    type="text"
                    value={coverConfig.author}
                    onChange={(e) => onCoverChange({ ...coverConfig, author: e.target.value })}
                    placeholder="Your Name / Org"
                    className="w-full text-xs pl-9 pr-3 py-2.5 rounded-none bg-[var(--color-neo-surface)] brutal-border brutal-shadow border text-slate-200 focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500"
                  />
                </div>
              </div>
              
              <div>
                <label className="block text-xs font-semibold text-[var(--color-neo-white)] font-bold uppercase mb-1">
                  Date
                </label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-[var(--color-neo-white)] font-bold uppercase">
                    <Calendar className="h-4 w-4" />
                  </span>
                  <input
                    type="text"
                    value={coverConfig.date}
                    onChange={(e) => onCoverChange({ ...coverConfig, date: e.target.value })}
                    placeholder={new Date().toLocaleDateString()}
                    className="w-full text-xs pl-9 pr-3 py-2.5 rounded-none bg-[var(--color-neo-surface)] brutal-border brutal-shadow border text-slate-200 focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500"
                  />
                </div>
              </div>
            </div>

            {/* Theme Presets & custom color */}
            <div>
              <label className="block text-xs font-semibold text-[var(--color-neo-white)] font-bold uppercase mb-1.5">
                Accent Theme Color
              </label>
              <div className="flex flex-wrap items-center gap-3">
                <div className="flex gap-1.5">
                  {THEME_PRESETS.map((preset) => (
                    <button
                      key={preset.name}
                      onClick={() => onCoverChange({ ...coverConfig, themeColor: preset.hex })}
                      className={`h-6 w-6 rounded-none${preset.bg}flex items-center justify-center text-white cursor-pointer transition-transform hover:scale-110 active:scale-95`}
                      title={preset.name}
                    >
                      {coverConfig.themeColor.toLowerCase() === preset.hex.toLowerCase() && (
                        <Check className="h-3 w-3" />
                      )}
                    </button>
                  ))}
                </div>
                
                <div className="flex items-center gap-1.5 border brutal-border rounded-none px-2 py-1 bg-[var(--color-neo-surface)] brutal-shadow">
                  <input
                    type="color"
                    value={coverConfig.themeColor}
                    onChange={(e) => onCoverChange({ ...coverConfig, themeColor: e.target.value })}
                    className="w-5 h-5 border-0 rounded cursor-pointer p-0 bg-transparent"
                    id="cover-color-picker"
                  />
                  <span className="text-[10px] font-mono font-medium text-[var(--color-neo-white)] font-bold uppercase">
                    {coverConfig.themeColor.toUpperCase()}
                  </span>
                </div>
              </div>
            </div>

            {/* Cover options */}
            <div className="pt-1.5">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={coverConfig.showBorder}
                  onChange={(e) => onCoverChange({ ...coverConfig, showBorder: e.target.checked })}
                  className="rounded brutal-border bg-[var(--color-neo-surface)] brutal-shadow text-indigo-500 focus:ring-indigo-500 h-3.5 w-3.5"
                  id="cover-border-checkbox"
                />
                <span className="text-xs font-medium text-slate-300">
                  Draw aesthetic fine double-border
                </span>
              </label>
            </div>
          </div>
        ) : (
          <div className="text-xs text-[var(--color-neo-white)] font-bold uppercase py-8 text-center bg-[#1A1A1A]/40 rounded-none border border-dashed brutal-border">
            Enable to automatically generate an elegant cover page as page 1 of your compilation.
          </div>
        )}
      </div>

      {/* Output Settings (Filename & Page Numbers) */}
      <div className="border brutal-border bg-[var(--color-neo-surface)] brutal-shadow rounded-none p-6 flex flex-col justify-between">
        <div className="space-y-5">
          {/* Output Filename */}
          <div>
            <h3 className="font-semibold text-white text-base font-[Montserrat] uppercase tracking-tighter mb-3 pb-2 border-b brutal-border">
              Output Filename
            </h3>
            <div className="flex items-center">
              <input
                type="text"
                value={outputFilename}
                onChange={(e) => onFilenameChange(e.target.value)}
                placeholder="merged"
                className="w-full text-xs px-3 py-2.5 rounded-none bg-[var(--color-neo-surface)] brutal-border brutal-shadow border border-r-0 text-slate-200 focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500"
              />
              <span className="text-xs font-mono px-3 py-2.5 bg-[var(--color-neo-surface)] brutal-border brutal-shadow border border-l-0 text-[var(--color-neo-white)] font-bold uppercase rounded-none">
                .pdf
              </span>
            </div>
          </div>

          {/* Page Numbering Options */}
          <div>
            <div className="flex items-center justify-between pb-3 border-b brutal-border mb-4">
              <div className="flex items-center gap-2.5">
                <div className="rounded-none bg-[var(--color-neo-purple)] brutal-border text-black border border-indigo-500/20 p-2">
                  <Hash className="h-4.5 w-4.5" />
                </div>
                <h4 className="font-semibold text-white text-sm font-[Montserrat] uppercase tracking-tighter">Page Numbering</h4>
              </div>

              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={pageNumConfig.enabled}
                  onChange={(e) => onPageNumChange({ ...pageNumConfig, enabled: e.target.checked })}
                  className="sr-only peer"
                  id="pagenum-enable-toggle"
                />
                <div className="w-10 h-5.5 bg-slate-800 peer-focus:outline-none rounded-none peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[3px] after:left-[3px] after:bg-slate-300 after:rounded-full after:h-4 w-4 after:w-4 after:transition-all peer-checked:bg-indigo-600"></div>
                <span className="ml-2 text-xs font-semibold text-[var(--color-neo-white)] font-bold uppercase">
                  {pageNumConfig.enabled ? 'On' : 'Off'}
                </span>
              </label>
            </div>

            {pageNumConfig.enabled ? (
              <div className="space-y-4 animate-fadeIn">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] sm:text-xs font-semibold text-[var(--color-neo-white)] font-bold uppercase mb-1">
                      Position
                    </label>
                    <select
                      value={pageNumConfig.position}
                      onChange={(e) => onPageNumChange({ ...pageNumConfig, position: e.target.value as any })}
                      className="w-full text-xs px-2.5 py-2 rounded-none bg-[var(--color-neo-surface)] brutal-border brutal-shadow border text-slate-200 focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500"
                    >
                      <option value="bottom-right">Bottom Right</option>
                      <option value="bottom-left">Bottom Left</option>
                      <option value="top-right">Top Right</option>
                      <option value="top-left">Top Left</option>
                    </select>
                  </div>
                  
                  <div>
                    <label className="block text-[10px] sm:text-xs font-semibold text-[var(--color-neo-white)] font-bold uppercase mb-1">
                      Label Prefix
                    </label>
                    <input
                      type="text"
                      value={pageNumConfig.prefix}
                      onChange={(e) => onPageNumChange({ ...pageNumConfig, prefix: e.target.value })}
                      placeholder="e.g., Page"
                      className="w-full text-xs px-3 py-2.5 bg-[var(--color-neo-surface)] brutal-border brutal-shadow border text-slate-200 focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 rounded-none"
                    />
                  </div>
                </div>
                <p className="text-[11px] text-[var(--color-neo-white)] font-bold uppercase leading-normal">
                  Numbering will automatically dynamically compute total pages and label them sequentially (e.g., <i>&quot;{pageNumConfig.prefix} 1 of 5&quot;</i>).
                </p>
              </div>
            ) : (
              <div className="text-xs text-[var(--color-neo-white)] font-bold uppercase py-4 text-center bg-[#1A1A1A]/40 rounded-none border border-dashed brutal-border">
                Numbering is off.
              </div>
            )}
          </div>
        </div>

        <div className="border-t brutal-border mt-5 pt-4 text-xs text-[var(--color-neo-white)] font-bold uppercase leading-normal flex items-start gap-1.5">
          <span className="text-black font-bold">✓</span>
          <span>Your preferences are stored temporarily in browser memory while you compile your files.</span>
        </div>
      </div>

    </div>
  );
}
