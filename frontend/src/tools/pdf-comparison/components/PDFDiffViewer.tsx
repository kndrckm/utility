import React, { useEffect, useRef, useState } from "react";
import { loadPdfJs } from "../utils/pdfHelper";
import { computeVisualDiff } from "../utils/diff";
import { ComparisonMode, PDFDocumentInfo } from "../types";
import { FloatingControls } from "./FloatingControls";
import { TextDiffPanel } from "./TextDiffPanel";
import {
  FileText,
  Sparkles,
  Columns,
  SplitSquareHorizontal,
  Layers,
  Maximize2,
  Minimize2,
  Link,
  Link2Off,
  ChevronLeft,
  ChevronRight,
  ZoomIn,
  ZoomOut,
  Sliders,
  Type as FontIcon,
  Eye,
  Upload,
  X,
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

export const PDFDiffViewer: React.FC = () => {
  // Library loaded state
  const [pdfjs, setPdfjs] = useState<any>(null);
  const [loadingLib, setLoadingLib] = useState(true);
  const [libError, setLibError] = useState<string | null>(null);

  // File States
  const [fileA, setFileA] = useState<File | null>(null);
  const [fileB, setFileB] = useState<File | null>(null);
  const [docAInfo, setDocAInfo] = useState<PDFDocumentInfo | null>(null);
  const [docBInfo, setDocBInfo] = useState<PDFDocumentInfo | null>(null);
  const [loadingDocs, setLoadingDocs] = useState(false);

  // Viewing State
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [syncPages, setSyncPages] = useState<boolean>(true);
  const [pageBOffset, setPageBOffset] = useState<number>(0); // manual page offset if unsynced
  const [zoom, setZoom] = useState<number>(1.25);
  const [mode, setMode] = useState<ComparisonMode>("swipe-slider");
  const [activeTab, setActiveTab] = useState<"visual" | "text">("visual");

  // Render & Diff Canvases
  const canvasRefA = useRef<HTMLCanvasElement>(null);
  const canvasRefB = useRef<HTMLCanvasElement>(null);
  const canvasRefDiff = useRef<HTMLCanvasElement>(null);
  const renderTaskRefA = useRef<any>(null);
  const renderTaskRefB = useRef<any>(null);

  // Extracted plain texts
  const [textA, setTextA] = useState<string>("");
  const [textB, setTextB] = useState<string>("");

  // Swipe slider state
  const [sliderPosition, setSliderPosition] = useState<number>(50);
  const [isDraggingSlider, setIsDraggingSlider] = useState<boolean>(false);
  const [overlayOpacity, setOverlayOpacity] = useState<number>(0.5);
  const sliderContainerRef = useRef<HTMLDivElement>(null);

  // Panning & Keyboard states
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [isSpaceHolding, setIsSpaceHolding] = useState(false);
  const [isPanning, setIsPanning] = useState(false);
  const panStartRef = useRef({ x: 0, y: 0, scrollLeft: 0, scrollTop: 0 });



  // File inputs & drag/drop states
  const fileInputRefA = useRef<HTMLInputElement>(null);
  const fileInputRefB = useRef<HTMLInputElement>(null);
  const [isDragActiveA, setIsDragActiveA] = useState(false);
  const [isDragActiveB, setIsDragActiveB] = useState(false);

  const handleDragA = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setIsDragActiveA(true);
    } else if (e.type === "dragleave") {
      setIsDragActiveA(false);
    }
  };

  const handleDropA = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragActiveA(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      if (file.type === "application/pdf" || file.name.endsWith(".pdf")) {
        setFileA(file);
      } else {
        alert("Please drop a valid PDF file.");
      }
    }
  };

  const handleDragB = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setIsDragActiveB(true);
    } else if (e.type === "dragleave") {
      setIsDragActiveB(false);
    }
  };

  const handleDropB = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragActiveB(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      if (file.type === "application/pdf" || file.name.endsWith(".pdf")) {
        setFileB(file);
      } else {
        alert("Please drop a valid PDF file.");
      }
    }
  };

  // Visual Diff stats
  const [visualDiffStats, setVisualDiffStats] = useState<{
    diffPixelCount: number;
    diffPercentage: number;
  }>({ diffPixelCount: 0, diffPercentage: 0 });

  // Load PDF.js library on mount
  useEffect(() => {
    loadPdfJs()
      .then((lib) => {
        setPdfjs(lib);
        setLoadingLib(false);
      })
      .catch((err) => {
        console.error("Library load error:", err);
        setLibError(
          "Failed to initialize PDF rendering engine. Please reload.",
        );
        setLoadingLib(false);
      });
  }, []);

  // Handle Document Loading A
  useEffect(() => {
    if (!pdfjs || !fileA) return;
    setLoadingDocs(true);
    const fileReader = new FileReader();
    fileReader.onload = async (e) => {
      const typedArray = new Uint8Array(e.target?.result as ArrayBuffer);
      try {
        const pdfDoc = await pdfjs.getDocument({ data: typedArray }).promise;
        setDocAInfo({
          name: fileA.name,
          size: fileA.size,
          numPages: pdfDoc.numPages,
          pdfDoc: pdfDoc,
        });
      } catch (err) {
        console.error("PDF A parse error:", err);
        alert("Unable to parse Document A. Please check if it is a valid PDF.");
      } finally {
        setLoadingDocs(false);
      }
    };
    fileReader.readAsArrayBuffer(fileA);
  }, [pdfjs, fileA]);

  // Handle Document Loading B
  useEffect(() => {
    if (!pdfjs || !fileB) return;
    setLoadingDocs(true);
    const fileReader = new FileReader();
    fileReader.onload = async (e) => {
      const typedArray = new Uint8Array(e.target?.result as ArrayBuffer);
      try {
        const pdfDoc = await pdfjs.getDocument({ data: typedArray }).promise;
        setDocBInfo({
          name: fileB.name,
          size: fileB.size,
          numPages: pdfDoc.numPages,
          pdfDoc: pdfDoc,
        });
      } catch (err) {
        console.error("PDF B parse error:", err);
        alert("Unable to parse Document B. Please check if it is a valid PDF.");
      } finally {
        setLoadingDocs(false);
      }
    };
    fileReader.readAsArrayBuffer(fileB);
  }, [pdfjs, fileB]);

  // Extract textual lines by Y coordinate sorting (preserves tabular structural sentences)
  const extractTextContent = async (page: any): Promise<string> => {
    try {
      const textContent = await page.getTextContent();
      const items = textContent.items;

      if (!items || items.length === 0) return "";

      // Group items sharing similar Y coordinate (transform[5])
      // transform: [a, b, c, d, tx, ty]
      const linesMap: Record<number, any[]> = {};
      const tolerance = 4; // pixels tolerance to group as the same line

      items.forEach((item: any) => {
        if (!item.str || item.str.trim() === "") return;
        const y = item.transform[5];

        // Find existing key with matching tolerance
        const matchedKey = Object.keys(linesMap).find(
          (k) => Math.abs(parseFloat(k) - y) <= tolerance,
        );

        if (matchedKey !== undefined) {
          linesMap[parseFloat(matchedKey)].push(item);
        } else {
          linesMap[y] = [item];
        }
      });

      // Sort lines top-to-bottom (Y descending)
      const sortedY = Object.keys(linesMap)
        .map(Number)
        .sort((a, b) => b - a);

      const lines = sortedY.map((y) => {
        // Sort items inside this line left-to-right (X ascending, transform[4])
        const rowItems = linesMap[y];
        rowItems.sort((a, b) => a.transform[4] - b.transform[4]);
        return rowItems.map((item) => item.str).join(" ");
      });

      return lines.join("\n");
    } catch (err) {
      console.error("Text extraction failed:", err);
      return "";
    }
  };

  // Main rendering loop for current page of A and B
  useEffect(() => {
    if (!docAInfo && !docBInfo) return;

    let active = true;

    const renderPages = async () => {
      // Find pages to load
      const pageNumA = Math.min(currentPage, docAInfo?.numPages || 1);
      const pageNumB = syncPages
        ? Math.min(currentPage, docBInfo?.numPages || 1)
        : Math.min(currentPage + pageBOffset, docBInfo?.numPages || 1);

      // Render Document A
      let pageA: any = null;
      let widthA = 0;
      let heightA = 0;

      if (docAInfo) {
        try {
          pageA = await docAInfo.pdfDoc.getPage(pageNumA);
          const viewportA = pageA.getViewport({ scale: zoom });

          if (canvasRefA.current && active) {
            const canvasA = canvasRefA.current;
            const ctxA = canvasA.getContext("2d");
            canvasA.width = viewportA.width;
            canvasA.height = viewportA.height;
            widthA = viewportA.width;
            heightA = viewportA.height;

            if (ctxA) {
              ctxA.fillStyle = "#ffffff";
              ctxA.fillRect(0, 0, canvasA.width, canvasA.height);

              if (renderTaskRefA.current) {
                try {
                  renderTaskRefA.current.cancel();
                } catch (cErr) {}
              }
              const renderTask = pageA.render({
                canvasContext: ctxA,
                viewport: viewportA,
              });
              renderTaskRefA.current = renderTask;
              await renderTask.promise;
              renderTaskRefA.current = null;
            }
          }

          // Local text extraction
          const extractedTextA = await extractTextContent(pageA);
          if (active) setTextA(extractedTextA);
        } catch (err: any) {
          if (err?.name !== "RenderingCancelledException") {
            console.error("Error rendering page A:", err);
          }
        }
      }

      // Render Document B
      let pageB: any = null;
      let widthB = 0;
      let heightB = 0;

      if (docBInfo) {
        try {
          pageB = await docBInfo.pdfDoc.getPage(pageNumB);
          const viewportB = pageB.getViewport({ scale: zoom });

          if (canvasRefB.current && active) {
            const canvasB = canvasRefB.current;
            const ctxB = canvasB.getContext("2d");
            canvasB.width = viewportB.width;
            canvasB.height = viewportB.height;
            widthB = viewportB.width;
            heightB = viewportB.height;

            if (ctxB) {
              ctxB.fillStyle = "#ffffff";
              ctxB.fillRect(0, 0, canvasB.width, canvasB.height);

              if (renderTaskRefB.current) {
                try {
                  renderTaskRefB.current.cancel();
                } catch (cErr) {}
              }
              const renderTask = pageB.render({
                canvasContext: ctxB,
                viewport: viewportB,
              });
              renderTaskRefB.current = renderTask;
              await renderTask.promise;
              renderTaskRefB.current = null;
            }
          }

          // Local text extraction
          const extractedTextB = await extractTextContent(pageB);
          if (active) setTextB(extractedTextB);
        } catch (err: any) {
          if (err?.name !== "RenderingCancelledException") {
            console.error("Error rendering page B:", err);
          }
        }
      }

      // Render difference map if both rendered successfully and same dimensions
      if (
        docAInfo &&
        docBInfo &&
        canvasRefA.current &&
        canvasRefB.current &&
        canvasRefDiff.current &&
        active
      ) {
        const canvasA = canvasRefA.current;
        const canvasB = canvasRefB.current;
        const canvasDiff = canvasRefDiff.current;

        // Ensure diff canvas matches dimensions (using the larger of the two to prevent clipping)
        const diffW = Math.max(widthA, widthB);
        const diffH = Math.max(heightA, heightB);

        canvasDiff.width = diffW;
        canvasDiff.height = diffH;

        const ctxA = canvasA.getContext("2d");
        const ctxB = canvasB.getContext("2d");
        const ctxDiff = canvasDiff.getContext("2d");

        if (ctxA && ctxB && ctxDiff) {
          const stats = computeVisualDiff(ctxA, ctxB, ctxDiff, diffW, diffH);
          if (active) setVisualDiffStats(stats);
        }
      }
    };

    renderPages();

    return () => {
      active = false;
      if (renderTaskRefA.current) {
        try {
          renderTaskRefA.current.cancel();
        } catch (e) {}
        renderTaskRefA.current = null;
      }
      if (renderTaskRefB.current) {
        try {
          renderTaskRefB.current.cancel();
        } catch (e) {}
        renderTaskRefB.current = null;
      }
    };
  }, [
    docAInfo,
    docBInfo,
    currentPage,
    zoom,
    syncPages,
    pageBOffset,
    mode,
    activeTab,
  ]);

  // Global Keyboard Shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if typing in input
      if (
        document.activeElement?.tagName === "INPUT" ||
        document.activeElement?.tagName === "TEXTAREA"
      ) {
        return;
      }

      if (e.code === "Space") {
        setIsSpaceHolding(true);
        e.preventDefault();
      }

      if (e.key === "1") setMode("side-by-side");
      if (e.key === "2") setMode("swipe-slider");
      if (e.key === "3") setMode("diff-map");
      if (e.key === "4") setMode("overlay");

      const maxP = Math.max(docAInfo?.numPages || 1, docBInfo?.numPages || 1);
      if (e.key === "ArrowLeft") {
        setCurrentPage((prev) => Math.max(prev - 1, 1));
      }
      if (e.key === "ArrowRight") {
        setCurrentPage((prev) => Math.min(prev + 1, maxP));
      }
    };
    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.code === "Space") {
        setIsSpaceHolding(false);
        setIsPanning(false);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
    };
  }, [docAInfo, docBInfo]);

  // Handle Panning
  const handlePanStart = (e: React.MouseEvent) => {
    if (isSpaceHolding) {
      setIsPanning(true);
      if (scrollContainerRef.current) {
        panStartRef.current = {
          x: e.clientX,
          y: e.clientY,
          scrollLeft: scrollContainerRef.current.scrollLeft,
          scrollTop: scrollContainerRef.current.scrollTop,
        };
      }
    }
  };

  const handlePanMove = (e: React.MouseEvent) => {
    if (isPanning && scrollContainerRef.current) {
      const dx = e.clientX - panStartRef.current.x;
      const dy = e.clientY - panStartRef.current.y;
      scrollContainerRef.current.scrollLeft =
        panStartRef.current.scrollLeft - dx;
      scrollContainerRef.current.scrollTop = panStartRef.current.scrollTop - dy;
    }
  };

  const handlePanEnd = () => {
    setIsPanning(false);
  };

  // Handle Swipe Slider Drags
  const handleSliderMove = (clientX: number) => {
    if (!sliderContainerRef.current) return;
    const rect = sliderContainerRef.current.getBoundingClientRect();
    const x = clientX - rect.left;
    const percentage = Math.max(0, Math.min(100, (x / rect.width) * 100));
    setSliderPosition(percentage);
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if (isSpaceHolding) return;
    setIsDraggingSlider(true);
    handleSliderMove(e.clientX);
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    if (isSpaceHolding) return;
    setIsDraggingSlider(true);
    if (e.touches[0]) {
      handleSliderMove(e.touches[0].clientX);
    }
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDraggingSlider) return;
      handleSliderMove(e.clientX);
    };

    const handleMouseUp = () => {
      setIsDraggingSlider(false);
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (!isDraggingSlider) return;
      if (e.touches[0]) {
        handleSliderMove(e.touches[0].clientX);
      }
    };

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
    window.addEventListener("touchmove", handleTouchMove);
    window.addEventListener("touchend", handleMouseUp);

    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
      window.removeEventListener("touchmove", handleTouchMove);
      window.removeEventListener("touchend", handleMouseUp);
    };
  }, [isDraggingSlider]);



  // Page maximum count
  const maxPages = Math.max(docAInfo?.numPages || 1, docBInfo?.numPages || 1);

  return (
    <div className="w-full h-full flex flex-col bg-[var(--color-neo-bg)]">
      {/* Invisible file inputs for quick uploading from docked buttons */}
      <input
        type="file"
        ref={fileInputRefA}
        onChange={(e) => {
          if (e.target.files && e.target.files[0]) {
            setFileA(e.target.files[0]);
          }
        }}
        accept="application/pdf"
        className="hidden"
      />
      <input
        type="file"
        ref={fileInputRefB}
        onChange={(e) => {
          if (e.target.files && e.target.files[0]) {
            setFileB(e.target.files[0]);
          }
        }}
        accept="application/pdf"
        className="hidden"
      />

      {/* Main Sandbox Container Card (fully screen-sized layout) */}
      <div className="relative w-full h-full overflow-hidden flex flex-col flex-1 bg-[var(--color-neo-bg)]">
        {/* Top Panel Controls */}
        <div className="px-5 py-3 border-b-4 border-black bg-[var(--color-neo-surface)] brutal-shadow flex flex-wrap items-center justify-between gap-4 select-none z-10">
          {/* Docked Document Uploaders & Linked status */}
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1 bg-[var(--color-neo-surface)] brutal-border brutal-shadow p-1 rounded-none border border-black">
              {/* Docked Original Document Selector */}
              <button
                onClick={() => fileInputRefA.current?.click()}
                className={`px-2.5 py-1.5 rounded-none text-xs font-bold uppercase flex items-center gap-2 transition-all cursor-pointer max-w-[150px] border-2 border-transparent ${ fileA ? "bg-[var(--color-neo-lime)] text-black brutal-border brutal-shadow" : "text-[var(--color-neo-white)] hover:border-black hover:text-black hover:bg-white" }`}
                title={
                  fileA
                    ? `Original Document (A): ${fileA.name}`
                    : "Upload Original Document (A)"
                }
              >
                <FileText className="h-3.5 w-3.5 shrink-0" />
                <span className="truncate text-[11px]">
                  {fileA ? fileA.name : "Upload Original (A)"}
                </span>
              </button>

              <span className="text-[var(--color-neo-white)] font-black uppercase text-xs px-1 select-none">➔</span>

              {/* Docked Revised Document Selector */}
              <button
                onClick={() => fileInputRefB.current?.click()}
                className={`px-2.5 py-1.5 rounded-none text-xs font-bold uppercase flex items-center gap-2 transition-all cursor-pointer max-w-[150px] border-2 border-transparent ${ fileB ? "bg-[var(--color-neo-cyan)] text-black brutal-border brutal-shadow" : "text-[var(--color-neo-white)] hover:border-black hover:text-black hover:bg-white" }`}
                title={
                  fileB
                    ? `Revised Document (B): ${fileB.name}`
                    : "Upload Revised Document (B)"
                }
              >
                <FileText className="h-3.5 w-3.5 shrink-0" />
                <span className="truncate text-[11px]">
                  {fileB ? fileB.name : "Upload Revised (B)"}
                </span>
              </button>
            </div>

            {/* Page Link Toggle (Visible only when documents are loaded) */}
            {docAInfo && docBInfo && (
              <button
                onClick={() => setSyncPages(!syncPages)}
                title={
                  syncPages
                    ? "Unlink Document Pages"
                    : "Synchronize Document Pages"
                }
                className={`p-2 rounded-none border-2 text-xs font-bold uppercase flex items-center gap-1.5 transition-all cursor-pointer ${ syncPages ? "border-black bg-[var(--color-neo-lime)] text-black brutal-shadow" : "border-transparent text-[var(--color-neo-white)] hover:border-black hover:text-black hover:bg-white" }`}
              >
                {syncPages ? (
                  <Link className="h-3.5 w-3.5" />
                ) : (
                  <Link2Off className="h-3.5 w-3.5" />
                )}
                <span className="hidden lg:inline text-[11px]">
                  {syncPages ? "Linked Pages" : "Unlinked"}
                </span>
              </button>
            )}
          </div>

          {/* View/Text Tab Selector (Visible only when documents are loaded) */}
          {docAInfo && docBInfo && (
            <div className="flex items-center gap-1 bg-[var(--color-neo-surface)] brutal-border brutal-shadow p-0.5 rounded-none border">
              <button
                onClick={() => setActiveTab("visual")}
                className={`px-3 py-1.5 rounded-none text-xs font-bold uppercase transition-all flex items-center gap-1.5 cursor-pointer border-2 border-transparent ${ activeTab === "visual" ? "bg-[var(--color-neo-pink)] text-black brutal-shadow border-black" : "text-[var(--color-neo-white)] hover:border-black hover:text-black hover:bg-white" }`}
              >
                <Sliders className="h-3.5 w-3.5" />
                <span className="text-[11px]">Visual Slider</span>
              </button>
              <button
                onClick={() => setActiveTab("text")}
                className={`px-3 py-1.5 rounded-none text-xs font-bold uppercase transition-all flex items-center gap-1.5 cursor-pointer border-2 border-transparent ${ activeTab === "text" ? "bg-[var(--color-neo-pink)] text-black brutal-shadow border-black" : "text-[var(--color-neo-white)] hover:border-black hover:text-black hover:bg-white" }`}
              >
                <FontIcon className="h-3.5 w-3.5" />
                <span className="text-[11px]">Text Diff</span>
              </button>
            </div>
          )}

          {/* Central Controls Strip (Visible only when documents are loaded) */}
          {docAInfo && docBInfo ? (
            <div className="flex items-center gap-3">
              {/* Visual statistics */}
              {mode === "diff-map" && activeTab === "visual" && (
                <div className="text-[11px] font-black uppercase px-3 py-1.5 rounded-none bg-[var(--color-neo-pink)] border-2 border-black brutal-shadow text-black hidden xl:block">
                  Diff: {visualDiffStats.diffPercentage}%
                </div>
              )}

              {/* Mode controls */}
              {activeTab === "visual" && (
                <div className="flex items-center gap-0.5 bg-[var(--color-neo-surface)] brutal-border brutal-shadow p-0.5 rounded-none border">
                  <button
                    onClick={() => setMode("side-by-side")}
                    className={`p-1.5 rounded-none transition-all cursor-pointer border-2 border-transparent ${ mode === "side-by-side" ? "bg-[var(--color-neo-purple)] text-black border-black brutal-shadow" : "text-[var(--color-neo-white)] hover:text-black hover:bg-white hover:border-black" }`}
                    title="Side-by-Side"
                  >
                    <Columns className="h-3.5 w-3.5" />
                  </button>
                  <button
                    onClick={() => setMode("swipe-slider")}
                    className={`p-1.5 rounded-none transition-all cursor-pointer border-2 border-transparent ${ mode === "swipe-slider" ? "bg-[var(--color-neo-purple)] text-black border-black brutal-shadow" : "text-[var(--color-neo-white)] hover:text-black hover:bg-white hover:border-black" }`}
                    title="Swipe Slider"
                  >
                    <SplitSquareHorizontal className="h-3.5 w-3.5" />
                  </button>
                  <button
                    onClick={() => setMode("diff-map")}
                    className={`p-1.5 rounded-none transition-all cursor-pointer border-2 border-transparent ${ mode === "diff-map" ? "bg-[var(--color-neo-purple)] text-black border-black brutal-shadow" : "text-[var(--color-neo-white)] hover:text-black hover:bg-white hover:border-black" }`}
                    title="Difference Map"
                  >
                    <Layers className="h-3.5 w-3.5" />
                  </button>
                  <button
                    onClick={() => setMode("overlay")}
                    className={`p-1.5 rounded-none transition-all cursor-pointer border-2 border-transparent ${ mode === "overlay" ? "bg-[var(--color-neo-purple)] text-black border-black brutal-shadow" : "text-[var(--color-neo-white)] hover:text-black hover:bg-white hover:border-black" }`}
                    title="Transparent Overlay"
                  >
                    <Eye className="h-3.5 w-3.5" />
                  </button>
                </div>
              )}
            </div>
          ) : (
            /* If documents are not loaded, show standard brand tag */
            <div className="flex items-center gap-2">
              <span className="text-[10px] bg-[var(--color-neo-lime)] text-black brutal-btn font-black uppercase text-white font-extrabold px-1.5 py-0.5 rounded tracking-wider">
                PDF
              </span>
              <span className="text-xs font-bold tracking-wider text-slate-300 font-[Montserrat] uppercase tracking-tighter">
                V-DIFF ENGINE v2.4
              </span>
            </div>
          )}
        </div>
        {/* Core Display Body */}
        <div
          ref={scrollContainerRef}
          onMouseDown={handlePanStart}
          onMouseMove={handlePanMove}
          onMouseUp={handlePanEnd}
          onMouseLeave={handlePanEnd}
          className={`flex-1 relative overflow-auto bg-[var(--color-neo-bg)]${isSpaceHolding ? "cursor-grab" : ""}${isPanning ? "cursor-grabbing" : ""}`}
        >
          {activeTab === "visual" ? (
            <div className="relative min-w-max min-h-max p-6 flex flex-col items-center justify-center">
              {!docAInfo || !docBInfo ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full max-w-5xl h-full p-4 items-center select-none">
                  {/* Document A Selector/Status */}
                  <div
                    onDragEnter={handleDragA}
                    onDragOver={handleDragA}
                    onDragLeave={handleDragA}
                    onDrop={handleDropA}
                    onClick={() => fileInputRefA.current?.click()}
                    className={`relative flex flex-col items-center justify-center border-4 border-black bg-[var(--color-neo-surface)] rounded-none p-8 text-center cursor-pointer transition-all duration-300 h-64 md:h-80 group overflow-hidden ${ docAInfo ? "bg-[var(--color-neo-lime)] text-black" : isDragActiveA ? "bg-[var(--color-neo-purple)] text-black" : "hover:bg-[var(--color-neo-white)] brutal-shadow-hover text-[var(--color-neo-white)] hover:text-black" }`}
                  >
                    <div className="absolute inset-0 pointer-events-none" />
                    <div
                      className={`p-4 rounded-none mb-4 transition-all duration-300 border-2 border-transparent ${ docAInfo ? "bg-[var(--color-neo-surface)] text-black brutal-shadow border-black" : "bg-[var(--color-neo-bg)] text-[var(--color-neo-white)] font-bold uppercase group-hover:bg-[var(--color-neo-lime)] group-hover:text-black group-hover:scale-110 group-hover:border-black group-hover:brutal-shadow" }`}
                    >
                      <Upload className="h-8 w-8" />
                    </div>
                    <h3 className="text-sm font-black text-[var(--color-neo-white)] group-hover:text-black mb-1.5 font-[Montserrat] uppercase tracking-tighter transition-colors">
                      Original Document (A)
                    </h3>
                    {docAInfo ? (
                      <div className="flex flex-col items-center gap-1">
                        <p className="text-xs text-black font-mono max-w-[200px] truncate">
                          ✓ {docAInfo.name}
                        </p>
                        <p className="text-[10px] text-[var(--color-neo-white)] font-bold uppercase font-mono">
                          {Math.round(docAInfo.size / 1024)} KB ·{" "}
                          {docAInfo.numPages} Pages
                        </p>
                      </div>
                    ) : (
                      <p className="text-xs text-[var(--color-neo-white)] group-hover:text-black font-bold uppercase max-w-[220px] leading-relaxed font-[Inter]">
                        Drag & drop or{" "}
                        <span className="text-black font-black underline group-hover:underline">
                          browse
                        </span>{" "}
                        to load the master baseline document
                      </p>
                    )}
                  </div>

                  {/* Document B Selector/Status */}
                  <div
                    onDragEnter={handleDragB}
                    onDragOver={handleDragB}
                    onDragLeave={handleDragB}
                    onDrop={handleDropB}
                    onClick={() => fileInputRefB.current?.click()}
                    className={`relative flex flex-col items-center justify-center border-4 border-black bg-[var(--color-neo-surface)] rounded-none p-8 text-center cursor-pointer transition-all duration-300 h-64 md:h-80 group overflow-hidden ${ docBInfo ? "bg-[var(--color-neo-cyan)] text-black" : isDragActiveB ? "bg-[var(--color-neo-purple)] text-black" : "hover:bg-[var(--color-neo-white)] brutal-shadow-hover text-[var(--color-neo-white)] hover:text-black" }`}
                  >
                    <div className="absolute inset-0 pointer-events-none" />
                    <div
                      className={`p-4 rounded-none mb-4 transition-all duration-300 border-2 border-transparent ${ docBInfo ? "bg-[var(--color-neo-surface)] text-black brutal-shadow border-black" : "bg-[var(--color-neo-bg)] text-[var(--color-neo-white)] font-bold uppercase group-hover:bg-[var(--color-neo-cyan)] group-hover:text-black group-hover:scale-110 group-hover:border-black group-hover:brutal-shadow" }`}
                    >
                      <Upload className="h-8 w-8" />
                    </div>
                    <h3 className="text-sm font-black text-[var(--color-neo-white)] group-hover:text-black mb-1.5 font-[Montserrat] uppercase tracking-tighter transition-colors">
                      Revised Document (B)
                    </h3>
                    {docBInfo ? (
                      <div className="flex flex-col items-center gap-1">
                        <p className="text-xs text-emerald-400 font-mono max-w-[200px] truncate">
                          ✓ {docBInfo.name}
                        </p>
                        <p className="text-[10px] text-[var(--color-neo-white)] font-bold uppercase font-mono">
                          {Math.round(docBInfo.size / 1024)} KB ·{" "}
                          {docBInfo.numPages} Pages
                        </p>
                      </div>
                    ) : (
                      <p className="text-xs text-[var(--color-neo-white)] group-hover:text-black font-bold uppercase max-w-[220px] leading-relaxed font-[Inter]">
                        Drag & drop or{" "}
                        <span className="text-black font-black underline group-hover:underline">
                          browse
                        </span>{" "}
                        to load the modified/revised version
                      </p>
                    )}
                  </div>
                </div>
              ) : (
                <div className="relative flex max-h-full items-center justify-center">
                  {/* 1. Side-by-Side View */}
                  {mode === "side-by-side" && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full max-w-7xl">
                      {/* Document A panel */}
                      <div className="flex flex-col items-center">
                        <span className="text-[10px] bg-[var(--color-neo-lime)] text-black font-black uppercase tracking-wider px-2.5 py-1 rounded-none mb-2 select-none brutal-shadow brutal-border">
                          Original Document (A)
                        </span>
                        <div className="border-4 border-black brutal-shadow rounded-none bg-white overflow-hidden max-w-full">
                          <canvas ref={canvasRefA} />
                        </div>
                      </div>

                      {/* Document B panel */}
                      <div className="flex flex-col items-center">
                        <span className="text-[10px] bg-[var(--color-neo-cyan)] text-black font-black tracking-wider uppercase px-2.5 py-1 rounded-none mb-2 select-none brutal-shadow brutal-border">
                          Revised Document (B)
                        </span>
                        <div className="border-4 border-black brutal-shadow rounded-none bg-white overflow-hidden max-w-full">
                          <canvas ref={canvasRefB} />
                        </div>
                      </div>
                    </div>
                  )}

                  {/* 2. Swipe Overlay Slider View */}
                  {mode === "swipe-slider" && (
                    <div
                      ref={sliderContainerRef}
                      onMouseDown={handleMouseDown}
                      onTouchStart={handleTouchStart}
                      className="relative border-4 border-black brutal-shadow rounded-none overflow-hidden cursor-ew-resize select-none bg-white flex items-center justify-center"
                      style={{
                        width: canvasRefA.current?.width || "auto",
                        height: canvasRefA.current?.height || "auto",
                      }}
                    >
                      {/* Background Layer: PDF A */}
                      <canvas
                        ref={canvasRefA}
                        className="absolute inset-0 block pointer-events-none"
                      />

                      {/* Foreground Layer: PDF B (clipped based on slider) */}
                      <div
                        className="absolute inset-0 overflow-hidden pointer-events-none"
                        style={{
                          clipPath: `inset(0px ${100 - sliderPosition}% 0px 0px)`,
                        }}
                      >
                        <canvas
                          ref={canvasRefB}
                          className="absolute inset-0 block"
                        />
                      </div>

                      {/* Vertical Split Indicator / Drag handle */}
                      <div
                        className="absolute top-0 bottom-0 w-[4px] bg-black z-30"
                        style={{ left: `${sliderPosition}%` }}
                      >
                        <div className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-10 h-10 bg-[var(--color-neo-lime)] border-2 border-black rounded-none flex items-center justify-center cursor-ew-resize brutal-shadow hover:scale-105 active:scale-95 transition-all">
                          <div className="flex gap-1">
                            <div className="w-1 h-3 bg-black rounded-none"></div>
                            <div className="w-1 h-3 bg-black rounded-none"></div>
                          </div>
                        </div>
                      </div>

                      {/* Quick Labels inside swipe container */}
                      <div className="absolute left-4 top-4 bg-[var(--color-neo-surface)] text-[var(--color-neo-white)] text-[10px] font-black px-2 py-0.5 rounded-none uppercase tracking-wider select-none z-10 border-2 border-black brutal-shadow">
                        Original Document A
                      </div>
                      <div className="absolute right-4 top-4 bg-[var(--color-neo-cyan)] text-black text-[10px] font-black px-2 py-0.5 rounded-none uppercase tracking-wider select-none z-10 brutal-shadow border-2 border-black">
                        Revised Document B
                      </div>
                    </div>
                  )}

                  {/* 3. Visual Difference Map View */}
                  {mode === "diff-map" && (
                    <div
                      ref={sliderContainerRef}
                      onMouseDown={handleMouseDown}
                      onTouchStart={handleTouchStart}
                      className="relative border-4 border-black brutal-shadow rounded-none overflow-hidden cursor-ew-resize select-none bg-[var(--color-neo-surface)] flex items-center justify-center"
                      style={{
                        width: canvasRefA.current?.width || "auto",
                        height: canvasRefA.current?.height || "auto",
                      }}
                    >
                      {/* Background Layer: PDF A (Original) */}
                      <canvas
                        ref={canvasRefA}
                        className="absolute inset-0 block pointer-events-none"
                      />

                      {/* Foreground Layer: Calculated pixel difference canvas (clipped based on slider) */}
                      <div
                        className="absolute inset-0 overflow-hidden pointer-events-none"
                        style={{
                          clipPath: `inset(0px ${100 - sliderPosition}% 0px 0px)`,
                        }}
                      >
                        <canvas
                          ref={canvasRefDiff}
                          className="absolute inset-0 block bg-[var(--color-neo-bg)]"
                        />
                      </div>

                      {/* Drag handle */}
                      <div
                        className="absolute top-0 bottom-0 w-[4px] bg-black z-30"
                        style={{ left: `${sliderPosition}%` }}
                      >
                        <div className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-10 h-10 bg-[var(--color-neo-pink)] border-2 border-black rounded-none flex items-center justify-center cursor-ew-resize brutal-shadow hover:scale-105 active:scale-95 transition-all">
                          <div className="flex gap-1">
                            <div className="w-1 h-3 bg-black rounded-none"></div>
                            <div className="w-1 h-3 bg-black rounded-none"></div>
                          </div>
                        </div>
                      </div>

                      {/* Overlay descriptive tags */}
                      <div className="absolute left-4 top-4 bg-[var(--color-neo-surface)] text-[var(--color-neo-white)] text-[10px] font-black px-2 py-0.5 rounded-none uppercase tracking-wider select-none z-10 border-2 border-black brutal-shadow">
                        Original Document A
                      </div>
                      <div className="absolute right-4 top-4 bg-[var(--color-neo-pink)] text-black text-[10px] font-black px-2 py-0.5 rounded-none uppercase tracking-wider select-none z-10 border-2 border-black brutal-shadow">
                        Visual Differences (Highlights)
                      </div>
                    </div>
                  )}

                  {/* 4. Overlay Transparent View */}
                  {mode === "overlay" && (
                    <div
                      className="relative border-4 border-black brutal-shadow rounded-none overflow-hidden select-none bg-white flex items-center justify-center"
                      style={{
                        width: canvasRefA.current?.width || "auto",
                        height: canvasRefA.current?.height || "auto",
                      }}
                    >
                      {/* Background Layer: PDF A (Original) */}
                      <canvas
                        ref={canvasRefA}
                        className="absolute inset-0 block pointer-events-none"
                      />

                      {/* Foreground Layer: PDF B with transparency */}
                      <div
                        className="absolute inset-0 pointer-events-none"
                        style={{
                          opacity: overlayOpacity,
                        }}
                      >
                        <canvas
                          ref={canvasRefB}
                          className="absolute inset-0 block mix-blend-multiply"
                        />
                      </div>

                      {/* Overlay descriptive tags */}
                      <div className="absolute left-4 top-4 bg-[var(--color-neo-surface)] text-[var(--color-neo-white)] text-[10px] font-black px-2 py-0.5 rounded-none uppercase tracking-wider select-none z-10 border-2 border-black brutal-shadow">
                        Original Document A
                      </div>
                      <div className="absolute right-4 top-4 bg-[var(--color-neo-purple)] text-black text-[10px] font-black px-2 py-0.5 rounded-none uppercase tracking-wider select-none z-10 border-2 border-black brutal-shadow">
                        Revised Document B (Opacity:{" "}
                        {Math.round(overlayOpacity * 100)}%)
                      </div>
                    </div>
                  )}

                  {/* Render offscreen targets for computing difference */}
                  <div className="hidden">
                    <canvas ref={canvasRefA} />
                    <canvas ref={canvasRefB} />
                    <canvas ref={canvasRefDiff} />
                  </div>
                </div>
              )}
            </div>
          ) : (
            // Logical text diff layer (offline LCS results)
            <div className="w-full max-w-5xl h-full flex flex-col">
              <TextDiffPanel textA={textA} textB={textB} />
            </div>
          )}
        </div>

        {/* Floating Controls Overlay (Always visible) */}
        <FloatingControls
          currentPage={currentPage}
          totalPages={maxPages}
          onPageChange={setCurrentPage}
          zoom={zoom}
          onZoomChange={setZoom}
          mode={mode}
          onModeChange={setMode}
          isFullscreen={true}
          onToggleFullscreen={() => {}}
          overlayOpacity={overlayOpacity}
          onOverlayOpacityChange={setOverlayOpacity}
        />
      </div>
    </div>
  );
};
