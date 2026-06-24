import React, { useState } from "react";
import { generateTextDiff } from "../utils/diff";
import { List, AlignJustify, HelpCircle, Columns } from "lucide-react";

interface TextDiffPanelProps {
  textA: string;
  textB: string;
}

export const TextDiffPanel: React.FC<TextDiffPanelProps> = ({ textA, textB }) => {
  const [viewType, setViewType] = useState<"split" | "unified">("split");

  const diffItems = generateTextDiff(textA, textB);

    if (!textA && !textB) {
      return (
        <div className="p-8 text-center bg-[var(--color-neo-surface)] border-4 border-black brutal-shadow rounded-none relative overflow-hidden">
          <HelpCircle className="h-8 w-8 text-[var(--color-neo-white)] font-bold uppercase mx-auto mb-2 relative z-10" />
          <p className="text-sm font-black uppercase text-white font-[Montserrat] tracking-tighter relative z-10">
            No extracted text available
          </p>
          <p className="text-xs text-[var(--color-neo-white)] font-bold uppercase mt-1 relative z-10 max-w-[340px] mx-auto leading-relaxed">
            Make sure your PDF files have selectable text layers.
          </p>
        </div>
      );
    }

  return (
    <div className="border-4 border-black brutal-shadow rounded-none bg-[var(--color-neo-surface)] overflow-hidden flex flex-col h-full">
      {/* Control panel */}
      <div className="px-4 py-3 border-b-4 border-black flex items-center justify-between bg-[var(--color-neo-surface)] z-10">
        <div className="flex items-center gap-2">
          <span className="text-sm font-black text-white font-[Montserrat] uppercase tracking-tighter">
            Text Comparison
          </span>
          <span className="text-[10px] bg-[var(--color-neo-purple)] text-black border-2 border-black px-1.5 py-0.5 rounded-none font-mono font-bold uppercase">
            Local Diff Engine
          </span>
        </div>

        {/* View toggles */}
        <div className="flex items-center gap-1 bg-[var(--color-neo-bg)] p-0.5 rounded-none border-2 border-black">
          <button
            onClick={() => setViewType("split")}
            className={`px-3 py-1.5 rounded-none transition-all flex items-center gap-1.5 text-xs font-bold uppercase cursor-pointer border-2 border-transparent ${ viewType === "split" ? "bg-[var(--color-neo-cyan)] text-black border-black brutal-shadow" : "text-[var(--color-neo-white)] hover:border-black hover:text-black hover:bg-white" }`}
          >
            <Columns className="h-3 w-3" />
            <span>Split View</span>
          </button>
          <button
            onClick={() => setViewType("unified")}
            className={`px-3 py-1.5 rounded-none transition-all flex items-center gap-1.5 text-xs font-bold uppercase cursor-pointer border-2 border-transparent ${ viewType === "unified" ? "bg-[var(--color-neo-cyan)] text-black border-black brutal-shadow" : "text-[var(--color-neo-white)] hover:border-black hover:text-black hover:bg-white" }`}
          >
            <AlignJustify className="h-3 w-3" />
            <span>Unified View</span>
          </button>
        </div>
      </div>

      {/* Diff Output */}
      <div className="flex-1 overflow-y-auto font-mono text-xs p-4 bg-[var(--color-neo-bg)] text-[var(--color-neo-white)] leading-relaxed min-h-[300px]">
        {viewType === "split" ? (
          <div className="grid grid-cols-2 gap-4 h-full">
            {/* Document A Column */}
            <div className="space-y-[1px] border-r-2 border-black pr-2">
              <div className="text-[10px] uppercase font-bold tracking-wider text-white pb-2 mb-2 border-b-2 border-black select-none">
                Original Page Text (A)
              </div>
              {diffItems.map((item, idx) => {
                if (item.type === "added") {
                  // Blank line on A side to align with newly added line on B
                  return <div key={idx} className="h-5 bg-white/5 select-none" />;
                }

                const bgColor =
                  item.type === "removed"
                    ? "bg-rose-500 text-black border-l-4 border-black font-semibold pl-1"
                    : item.type === "modified"
                    ? "bg-amber-500 text-black border-l-4 border-black font-semibold pl-1"
                    : "pl-2.5 text-[var(--color-neo-white)]";

                return (
                  <div key={idx} className={`h-5 truncate flex items-center${bgColor}`}>
                    <span className={`w-6 shrink-0 text-right select-none pr-1.5 text-[9px] ${item.type === 'equal' ? 'text-slate-500' : 'text-black'}`}>
                      {item.lineNumA}
                    </span>
                    <span className="whitespace-pre">{item.textA}</span>
                  </div>
                );
              })}
            </div>

            {/* Document B Column */}
            <div className="space-y-[1px] pl-2">
              <div className="text-[10px] uppercase font-bold tracking-wider text-white pb-2 mb-2 border-b-2 border-black select-none">
                Revised Page Text (B)
              </div>
              {diffItems.map((item, idx) => {
                if (item.type === "removed") {
                  // Blank line on B side to align with deleted line on A
                  return <div key={idx} className="h-5 bg-white/5 select-none" />;
                }

                const bgColor =
                  item.type === "added"
                    ? "bg-[var(--color-neo-lime)] text-black border-l-4 border-black font-semibold pl-1"
                    : item.type === "modified"
                    ? "bg-amber-500 text-black border-l-4 border-black font-semibold pl-1"
                    : "pl-2.5 text-[var(--color-neo-white)]";

                return (
                  <div key={idx} className={`h-5 truncate flex items-center${bgColor}`}>
                    <span className={`w-6 shrink-0 text-right select-none pr-1.5 text-[9px] ${item.type === 'equal' ? 'text-slate-500' : 'text-black'}`}>
                      {item.lineNumB}
                    </span>
                    <span className="whitespace-pre">{item.textB}</span>
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          <div className="space-y-[1px]">
            <div className="text-[10px] uppercase font-bold tracking-wider text-white pb-2 mb-2 border-b-2 border-black select-none">
              Unified Linear Difference Flow
            </div>
            {diffItems.map((item, idx) => {
              if (item.type === "equal") {
                return (
                  <div key={idx} className="h-5 flex items-center pl-2.5 text-[var(--color-neo-white)]">
                    <span className="w-12 shrink-0 text-slate-500 select-none text-[9px]">
                      {item.lineNumA} ➔ {item.lineNumB}
                    </span>
                    <span className="whitespace-pre pl-2">{item.textA}</span>
                  </div>
                );
              }

              if (item.type === "removed") {
                return (
                  <div
                    key={idx}
                    className="h-5 flex items-center bg-rose-500 text-black border-l-4 border-black font-semibold pl-1"
                  >
                    <span className="w-12 shrink-0 text-black select-none text-[9px]">
                      {item.lineNumA} ➔ -
                    </span>
                    <span className="whitespace-pre pl-2">- {item.textA}</span>
                  </div>
                );
              }

              if (item.type === "added") {
                return (
                  <div
                    key={idx}
                    className="h-5 flex items-center bg-[var(--color-neo-lime)] text-black border-l-4 border-black font-semibold pl-1"
                  >
                    <span className="w-12 shrink-0 text-black select-none text-[9px]">
                      - ➔ {item.lineNumB}
                    </span>
                    <span className="whitespace-pre pl-2">+ {item.textB}</span>
                  </div>
                );
              }

              // Modified
              return (
                <React.Fragment key={idx}>
                  <div className="h-5 flex items-center bg-amber-500/50 text-black border-l-4 border-black font-semibold pl-1">
                    <span className="w-12 shrink-0 text-black select-none text-[9px]">
                      {item.lineNumA} ➔ [MOD]
                    </span>
                    <span className="whitespace-pre pl-2">- {item.textA}</span>
                  </div>
                  <div className="h-5 flex items-center bg-amber-500 text-black border-l-4 border-black font-semibold pl-1">
                    <span className="w-12 shrink-0 text-black select-none text-[9px]">
                      [MOD] ➔ {item.lineNumB}
                    </span>
                    <span className="whitespace-pre pl-2">+ {item.textB}</span>
                  </div>
                </React.Fragment>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
