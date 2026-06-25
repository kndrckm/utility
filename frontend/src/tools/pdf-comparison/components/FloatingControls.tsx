import React from "react";
import {
  ChevronLeft,
  ChevronRight,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Minimize2,
  Columns,
  Layers,
  SplitSquareHorizontal,
  Eye,
} from "lucide-react";
import { Type as FontIcon, Link, Link2Off, MessageSquare, MessageSquareOff } from "lucide-react";
import { ComparisonMode } from "../types";
import { motion } from "motion/react";

interface FloatingControlsProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  zoom: number;
  onZoomChange: (zoom: number) => void;
  mode: ComparisonMode;
  onModeChange: (mode: ComparisonMode) => void;
  isFullscreen: boolean;
  onToggleFullscreen: () => void;
  overlayOpacity?: number;
  onOverlayOpacityChange?: (opacity: number) => void;

  showAnnotationsA: boolean;
  onShowAnnotationsAChange: (show: boolean) => void;
  showAnnotationsB: boolean;
  onShowAnnotationsBChange: (show: boolean) => void;
}

export const FloatingControls: React.FC<FloatingControlsProps> = ({
  currentPage,
  totalPages,
  onPageChange,
  zoom,
  onZoomChange,
  mode,
  onModeChange,
  isFullscreen,
  onToggleFullscreen,
  overlayOpacity = 0.5,
  onOverlayOpacityChange,

  showAnnotationsA,
  onShowAnnotationsAChange,
  showAnnotationsB,
  onShowAnnotationsBChange,
}) => {
  return (
    <motion.div
      initial={{ y: 80, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      exit={{ y: 80, opacity: 0 }}
      className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex flex-wrap items-center justify-center gap-2 p-3 bg-[var(--color-neo-surface)] text-[var(--color-neo-white)] border-4 border-black brutal-shadow max-w-[95vw] md:max-w-none"
    >
      {/* View Mode Selectors */}
      <div className="flex items-center gap-1 bg-[var(--color-neo-bg)] border-2 border-black p-1">
        <button
          onClick={() => onModeChange("side-by-side")}
          title="Side-by-Side View"
          className={`p-2 transition-all border-2 border-transparent ${ mode === "side-by-side" ? "bg-[var(--color-neo-pink)] text-black border-black brutal-shadow" : "text-[var(--color-neo-white)] hover:border-black hover:bg-white hover:text-black" }`}
        >
          <Columns className="h-4 w-4" />
        </button>

        <button
          onClick={() => onModeChange("swipe-slider")}
          title="Overlay Slider View"
          className={`p-2 transition-all border-2 border-transparent ${ mode === "swipe-slider" ? "bg-[var(--color-neo-pink)] text-black border-black brutal-shadow" : "text-[var(--color-neo-white)] hover:border-black hover:bg-white hover:text-black" }`}
        >
          <SplitSquareHorizontal className="h-4 w-4" />
        </button>

        <button
          onClick={() => onModeChange("overlay")}
          title="Transparent Overlay View"
          className={`p-2 transition-all border-2 border-transparent ${ mode === "overlay" ? "bg-[var(--color-neo-pink)] text-black border-black brutal-shadow" : "text-[var(--color-neo-white)] hover:border-black hover:bg-white hover:text-black" }`}
        >
          <Eye className="h-4 w-4" />
        </button>
      </div>

      <div className="h-6 w-1 bg-black mx-1 hidden sm:block" />

      {/* Page Navigation */}
      <div className="flex items-center gap-2 bg-[var(--color-neo-bg)] border-2 border-black p-1">
        <button
          disabled={currentPage <= 1}
          onClick={() => onPageChange(currentPage - 1)}
          className="p-1.5 border-2 border-transparent hover:border-black hover:bg-white hover:text-black text-[var(--color-neo-white)] disabled:opacity-40 transition-colors"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>

        <span className="text-xs px-2 font-mono tracking-tight select-none min-w-[50px] text-center text-[var(--color-neo-white)]">
          {currentPage} / {totalPages || 1}
        </span>

        <button
          disabled={currentPage >= totalPages}
          onClick={() => onPageChange(currentPage + 1)}
          className="p-1.5 border-2 border-transparent hover:border-black hover:bg-white hover:text-black text-[var(--color-neo-white)] disabled:opacity-40 transition-colors"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>

      <div className="h-6 w-1 bg-black mx-1 hidden sm:block" />

      {/* Annotation Toggles */}
      <div className="flex items-center gap-1 bg-[var(--color-neo-bg)] border-2 border-black p-1">
        <button
          onClick={() => onShowAnnotationsAChange(!showAnnotationsA)}
          title={showAnnotationsA ? "Hide Annotations A" : "Show Annotations A"}
          className={`px-2 py-1 transition-all border-2 border-transparent text-[10px] font-black uppercase flex items-center gap-1 ${ showAnnotationsA ? "bg-[var(--color-neo-lime)] text-black border-black brutal-shadow" : "text-[var(--color-neo-white)] hover:border-black hover:bg-white hover:text-black" }`}
        >
          {showAnnotationsA ? <MessageSquare className="h-3.5 w-3.5" /> : <MessageSquareOff className="h-3.5 w-3.5" />}
          A
        </button>
        <button
          onClick={() => onShowAnnotationsBChange(!showAnnotationsB)}
          title={showAnnotationsB ? "Hide Annotations B" : "Show Annotations B"}
          className={`px-2 py-1 transition-all border-2 border-transparent text-[10px] font-black uppercase flex items-center gap-1 ${ showAnnotationsB ? "bg-[var(--color-neo-cyan)] text-black border-black brutal-shadow" : "text-[var(--color-neo-white)] hover:border-black hover:bg-white hover:text-black" }`}
        >
          {showAnnotationsB ? <MessageSquare className="h-3.5 w-3.5" /> : <MessageSquareOff className="h-3.5 w-3.5" />}
          B
        </button>
      </div>

      <div className="h-6 w-1 bg-black mx-1 hidden sm:block" />

      {/* Zoom controls */}
      <div className="flex items-center gap-1 bg-[var(--color-neo-bg)] border-2 border-black p-1">
        <button
          onClick={() => onZoomChange(Math.max(0.5, zoom - 0.25))}
          title="Zoom Out"
          className="p-2 border-2 border-transparent hover:border-black hover:bg-white hover:text-black text-[var(--color-neo-white)] transition-colors"
        >
          <ZoomOut className="h-4 w-4" />
        </button>

        <span className="text-xs px-2 font-mono select-none text-[var(--color-neo-lime)] min-w-[45px] text-center">
          {Math.round(zoom * 100)}%
        </span>

        <button
          onClick={() => onZoomChange(Math.min(3.0, zoom + 0.25))}
          title="Zoom In"
          className="p-2 border-2 border-transparent hover:border-black hover:bg-white hover:text-black text-[var(--color-neo-white)] transition-colors"
        >
          <ZoomIn className="h-4 w-4" />
        </button>
      </div>

      {mode === "overlay" && onOverlayOpacityChange && (
        <>
          <div className="h-6 w-1 bg-black mx-1 hidden sm:block" />
          <div className="flex items-center gap-2 bg-[var(--color-neo-bg)] border-2 border-black p-1.5">
            <span className="text-[10px] text-[var(--color-neo-white)] font-bold uppercase tracking-wider px-1 select-none">
              Opacity:
            </span>
            <input
              type="range"
              min="0"
              max="1"
              step="0.05"
              value={overlayOpacity}
              onChange={(e) =>
                onOverlayOpacityChange(parseFloat(e.target.value))
              }
              className="w-20 cursor-pointer h-2 bg-black appearance-none accent-[var(--color-neo-lime)]"
            />
            <span className="text-xs font-mono text-[var(--color-neo-lime)] min-w-[32px] text-right pr-1">
              {Math.round(overlayOpacity * 100)}%
            </span>
          </div>
        </>
      )}

    </motion.div>
  );
};
