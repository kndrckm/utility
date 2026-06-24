import { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import ReactCrop from 'react-image-crop';
import { PDFDocument, degrees, rgb } from 'pdf-lib';
import JSZip from 'jszip';
import 'react-image-crop/dist/ReactCrop.css';
import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';

import LocalPdfComparison from './tools/pdf-comparison/LocalPdfComparison';
import LocalPdfMerger from './tools/pdf-merger/LocalPdfMerger';
import LocalSpriteMaker from './tools/sprite-maker/LocalSpriteMaker';
import LocalPdfOrganizer from './tools/pdf-organizer/LocalPdfOrganizer';

pdfjs.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.min.mjs',
  import.meta.url,
).toString();

const CROP_COLORS = [
  '#d97706', // Solid Amber
  '#4f46e5', // Solid Indigo
  '#059669', // Solid Emerald
  '#0d9488', // Solid Teal
  '#e11d48', // Solid Rose
];

const DEFAULT_ZONE_NAMES = ['1', '2', '3', '4', '5'];

// Lazy thumbnail page component with intersection observer
const LazyPage = ({ pageIndex, isSelected, onClick, pdfUrl, width = 150 }) => {
    const [isVisible, setIsVisible] = useState(false);
    const containerRef = useRef(null);

    useEffect(() => {
        const observer = new IntersectionObserver(([entry]) => { 
            if (entry.isIntersecting) { 
                setIsVisible(true); 
                observer.disconnect(); 
            } 
        }, { rootMargin: '200px' });
        if (containerRef.current) observer.observe(containerRef.current);
        return () => observer.disconnect();
    }, []);

    return (
        <div 
            ref={containerRef} 
            onClick={() => onClick && onClick(pageIndex)} 
            className={`relative ${onClick ? 'cursor-pointer' : ''} bg-white flex flex-col overflow-hidden will-change-transform ${
                isSelected 
                    ? 'border-[4px] border-[var(--color-neo-purple)] shadow-[4px_4px_0px_0px_var(--color-black)] z-10 transition-[transform,box-shadow,border-color,opacity] duration-150 scale-100 opacity-100' 
                    : 'border-[2px] border-[var(--color-neo-surface)] transition-[transform,box-shadow,border-color,opacity] duration-150 opacity-40 scale-[0.80] hover:scale-[0.85] hover:opacity-75'
            }`}
        >
            {isVisible && pdfUrl ? (
                <Page 
                    pageNumber={pageIndex + 1} 
                    width={width} 
                    renderTextLayer={false} 
                    renderAnnotationLayer={false} 
                    loading={<div className="flex items-center justify-center text-[10px] text-slate-400 animate-pulse" style={{ width, height: width * 1.41 }}>...</div>} 
                />
            ) : (
                <div className="flex flex-col items-center justify-center text-[10px] text-slate-400" style={{ width, height: width * 1.41 }}>
                    P. {pageIndex + 1}
                </div>
            )}
            <div className={`absolute bottom-0 left-0 right-0 text-center text-[10px] py-1 font-black font-[Montserrat] uppercase tracking-widest ${isSelected ? 'bg-[var(--color-neo-purple)] text-black border-t-4 border-black' : 'bg-[var(--color-neo-surface)] text-[var(--color-neo-white)] border-t-2 border-[var(--color-neo-surface)]'}`}>P. {pageIndex + 1}</div>
        </div>
    );
};

// Result Item Card in Step 5
const ResultItem = ({ result, pdfUrl, onEdit, isSelected, onToggle, onClickPreview, isActivePreview }) => {
    const [isEditing, setIsEditing] = useState(false);
    const [newName, setNewName] = useState(result.fileName);

    return (
        <div 
            onClick={() => onClickPreview(result.pageIndex)}
            className={`flex items-center gap-4 p-4 rounded-xl border cursor-pointer transition-all duration-300 ${
                isActivePreview 
                    ? 'bg-slate-100 border-slate-450 shadow-sm' 
                    : isSelected 
                        ? 'bg-slate-50 border-slate-300' 
                        : 'bg-white border-slate-200 hover:border-slate-300'
            }`}
        >
            <input 
                type="checkbox" 
                checked={isSelected} 
                onClick={(e) => e.stopPropagation()} 
                onChange={() => onToggle(result.pageIndex)} 
                className="w-4 h-4 rounded border-slate-300 bg-white text-slate-800 focus:ring-slate-800/10" 
            />
            <div className="w-12 h-16 shrink-0 rounded overflow-hidden border border-slate-200 bg-slate-50">
                <LazyPage pageIndex={result.pageIndex} isSelected={true} pdfUrl={pdfUrl} width={48} />
            </div>
            <div className="flex-1 min-w-0" onClick={(e) => isEditing && e.stopPropagation()}>
                {isEditing ? (
                    <div className="flex gap-2">
                        <input 
                            value={newName} 
                            onChange={e => setNewName(e.target.value)} 
                            className="flex-1 bg-white border border-slate-300 rounded px-2.5 py-1 text-xs font-mono text-slate-800 focus:outline-none focus:border-slate-500" 
                        />
                        <button 
                            onClick={(e) => { 
                                e.stopPropagation(); 
                                onEdit(result.pageIndex, newName); 
                                setIsEditing(false); 
                            }} 
                            className="bg-slate-900 hover:bg-slate-800 text-white font-bold px-3 py-1 rounded text-2xs transition-colors"
                        >
                            Save
                        </button>
                    </div>
                ) : (
                    <div className="flex flex-col">
                        <span className="text-xs font-mono truncate text-slate-850 font-medium">{result.fileName}</span>
                        <span className="text-[9px] text-slate-550 font-mono truncate mt-0.5">{result.statusInfo || 'Buffered'}</span>
                    </div>
                )}
            </div>
            {!isEditing && (
                <button 
                    onClick={(e) => { 
                        e.stopPropagation(); 
                        setIsEditing(true); 
                    }} 
                    className="px-2.5 py-1.5 hover:bg-slate-50 border border-slate-200 hover:border-slate-300 rounded text-slate-600 hover:text-slate-900 text-2xs transition-colors shrink-0"
                >
                    Rename
                </button>
            )}
        </div>
    );
};

export default function App() {
  const [step, setStep] = useState(1);
  const [file, setFile] = useState(null);
  const [pdfBytes, setPdfBytes] = useState(null);
  const [pdfUrl, setPdfUrl] = useState('');
  const [numPages, setNumPages] = useState(null);
  const [pagesToKeep, setPagesToKeep] = useState([]);
  
  // Custom Dynamic Crop Zones
  const [cropZones, setCropZones] = useState([
    { id: 'zone-1', name: DEFAULT_ZONE_NAMES[0], crop: null, color: CROP_COLORS[0] }
  ]);
  const [activeZoneId, setActiveZoneId] = useState('zone-1');
  const [editingZoneId, setEditingZoneId] = useState(null);
  
  // Canvas Control State
  const [scale, setScale] = useState(1.0);
  const [isSpacePressed, setIsSpacePressed] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [hoverCoords, setHoverCoords] = useState(null); // Relative hover coordinates for magnifier
  const viewportRef = useRef(null);

  // File system access / Local Storage variables
  const [dirHandle, setDirHandle] = useState(null);
  const [outputDirName, setOutputDirName] = useState('');
  const [namingFormat, setNamingFormat] = useState('{1}.pdf');
  
  // Grid Zoom Scale
  const [gridWidth, setGridWidth] = useState(120);

  // Processing state
  const [isProcessing, setIsProcessing] = useState(false);
  const [logs, setLogs] = useState([]);
  const [progress, setProgress] = useState(0);
  const [results, setResults] = useState([]);
  const [selectedResults, setSelectedResults] = useState([]);
  const [speedMetrics, setSpeedMetrics] = useState({ timeStart: 0, pageCount: 0, speed: 0 });

  // Audit Screen State
  const [selectedAuditPageIndex, setSelectedAuditPageIndex] = useState(0);

  // Step 3 Preview State
  const [extractionPreview, setExtractionPreview] = useState(null);
  const [isPreviewLoading, setIsPreviewLoading] = useState(false);

  // Step 5 Filter & Sort State
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState('all'); // 'all', 'success', 'unknown'

  // Global Active Navigation Tab
  const [activeTab, setActiveTab] = useState('splitter'); // 'splitter', 'merger', 'rotator', 'watermark', 'extractor'

  // Tool 5: PDF to Image Converter State
  const [converterInputDirHandle, setConverterInputDirHandle] = useState(null);
  const [converterOutputDirHandle, setConverterOutputDirHandle] = useState(null);
  const [converterFilesList, setConverterFilesList] = useState([]); // List of scanned local PDFs
  const [selectedPdfNames, setSelectedPdfNames] = useState([]); // Selected PDF filenames
  const [converterSingleFile, setConverterSingleFile] = useState(null);
  const [converterFormat, setConverterFormat] = useState('png'); // 'png', 'jpeg', 'webp'
  const [converterQuality, setConverterQuality] = useState(90);
  const [converterScale, setConverterScale] = useState(2.0);
  const [converterProcessing, setConverterProcessing] = useState(false);
  const [converterProgress, setConverterProgress] = useState(0);
  const [converterLogs, setConverterLogs] = useState([]);
  const [converterSpeed, setConverterSpeed] = useState({ pages: 0, speed: 0 });

  // Tool 6: Image Cropper & Magic Wand State
  const [cropperInputDirHandle, setCropperInputDirHandle] = useState(null);
  const [cropperFilesList, setCropperFilesList] = useState([]); // Scanned image file handles
  const [cropperFile, setCropperFile] = useState(null);
  const [cropperImageUrl, setCropperImageUrl] = useState('');
  const [cropperDimensions, setCropperDimensions] = useState({ width: 0, height: 0 });
  const [cropperOutputName, setCropperOutputName] = useState('');
  const [cropperFormat, setCropperFormat] = useState('png'); // Default to PNG for alpha checkboard grid support
  const [cropperQuality, setCropperQuality] = useState(90);
  const [cropperCropBox, setCropperCropBox] = useState({ x: 0, y: 0, width: 0, height: 0 }); // In original image pixels
  const [cropperIsDragging, setCropperIsDragging] = useState(false);
  const [cropperDragStart, setCropperDragStart] = useState({ x: 0, y: 0 });
  const [cropperDragHandle, setCropperDragHandle] = useState(null); // 'tl', 'tr', 'bl', 'br', 'draw', 'move'
  const [cropperProcessing, setCropperProcessing] = useState(false);
  const [cropperToolMode, setCropperToolMode] = useState('crop'); // 'crop', 'wand'
  const [cropperWandMode, setCropperWandMode] = useState('global'); // 'global', 'flood'
  const [cropperSensitivity, setCropperSensitivity] = useState(15); // Color delta threshold
  const [cropperRatioLock, setCropperRatioLock] = useState('free'); // 'free', 'original', '1:1', '3:4', '4:6'
  const [cropperZoom, setCropperZoom] = useState(1.0);
  const [cropperHistory, setCropperHistory] = useState([]);
  const [cropperHistoryIndex, setCropperHistoryIndex] = useState(-1);
  const [cropperSyncBox, setCropperSyncBox] = useState(false);

  const [sortBy, setSortBy] = useState('page'); // 'page', 'name-asc', 'name-desc'

  // Handle PDF file selection & in-memory buffering
  const handleFileUpload = (e) => {
      const f = e.target.files[0];
      if (!f) return;
      
      const reader = new FileReader();
      reader.onload = async (event) => {
          const arrayBuffer = event.target.result;
          const u8 = new Uint8Array(arrayBuffer);
          setPdfBytes(u8);
          
          const blob = new Blob([arrayBuffer], { type: 'application/pdf' });
          const url = URL.createObjectURL(blob);
          setPdfUrl(url);
          setFile(f);
      };
      reader.readAsArrayBuffer(f);
  };

  // Keyboard controls for CAD viewport and tool shortcuts
  useEffect(() => {
    const handleKeyDown = (e) => {
        if (step !== 3 || e.target.tagName === 'INPUT') return;
        if (e.code === 'Space') { e.preventDefault(); setIsSpacePressed(true); }
        if (e.ctrlKey && (e.key === '=' || e.key === '+')) { e.preventDefault(); setScale(p => Math.min(5, p + 0.2)); }
        if (e.ctrlKey && (e.key === '-' || e.key === '_')) { e.preventDefault(); setScale(p => Math.max(0.2, p - 0.2)); }
        if (e.ctrlKey && e.key === '0') { e.preventDefault(); setScale(1.0); }
        
        // Dynamic key shortcuts to jump between crop zones (keys 1 to 5)
        const zoneKeys = ['Digit1', 'Digit2', 'Digit3', 'Digit4', 'Digit5'];
        const keyIdx = zoneKeys.indexOf(e.code);
        if (keyIdx !== -1) {
            if (cropZones[keyIdx]) {
                setActiveZoneId(cropZones[keyIdx].id);
            } else {
                const targetNum = keyIdx + 1;
                if (window.confirm(`Selection ${targetNum} is not active. Want to turn it on?`)) {
                    addCropZone();
                }
            }
        }
    };
    
    const handleKeyUp = (e) => { 
        if (e.code === 'Space') { 
            setIsSpacePressed(false); 
            setIsDragging(false); 
        } 
    };
    
    const handleWheel = (e) => { 
        if (e.ctrlKey) { 
            e.preventDefault(); 
            setScale(p => Math.min(5, Math.max(0.2, p + (e.deltaY > 0 ? -0.1 : 0.1)))); 
        } 
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    window.addEventListener('wheel', handleWheel, { passive: false });
    return () => { 
        window.removeEventListener('keydown', handleKeyDown); 
        window.removeEventListener('keyup', handleKeyUp); 
        window.removeEventListener('wheel', handleWheel); 
    };
  }, [step, cropZones]);

  // Request Directory Handle for writing directly to local disk
  const handleSelectDirectory = async () => {
      try {
          const handle = await window.showDirectoryPicker();
          setDirHandle(handle);
          setOutputDirName(handle.name);
      } catch (err) {
          console.warn('User cancelled directory selection or Directory API is unsupported.', err);
      }
  };

  // Add Dynamic Crop Zone
  const addCropZone = () => {
      if (cropZones.length >= 5) return;
      const newNum = cropZones.length + 1;
      const nextColor = CROP_COLORS[cropZones.length % CROP_COLORS.length];
      const defaultName = DEFAULT_ZONE_NAMES[cropZones.length] || `Zone ${newNum}`;
      
      const newZone = {
          id: `zone-${Date.now()}`,
          name: defaultName,
          crop: null,
          color: nextColor
      };
      
      const updatedZones = [...cropZones, newZone];
      setCropZones(updatedZones);
      setActiveZoneId(newZone.id);

      // Dynamically suggest matching format '{1}-{2}.pdf'
      const suggested = updatedZones.map(z => `{${z.name}}`).join('-') + '.pdf';
      setNamingFormat(suggested);
  };

  // Delete dynamic crop zone
  const deleteCropZone = (id) => {
      if (cropZones.length <= 1) return;
      const zone = cropZones.find(z => z.id === id);
      if (!zone) return;

      const updatedZones = cropZones.filter(z => z.id !== id);
      setCropZones(updatedZones);
      
      // Dynamically suggest matching format '{1}.pdf'
      const suggested = updatedZones.map(z => `{${z.name}}`).join('-') + '.pdf';
      setNamingFormat(suggested);
      
      if (activeZoneId === id) {
          setActiveZoneId(updatedZones[0].id);
      }
  };

  // Rename Dynamic Crop Zone and automatically update placeholders in naming format
  const renameCropZone = (id, newName) => {
      const sanitizedName = newName.replace(/[{}]/g, '').trim();
      if (!sanitizedName) return;

      setCropZones(prev => prev.map(z => {
          if (z.id === id) {
              const oldName = z.name;
              setNamingFormat(fmt => {
                  const oldPlaceholder = `{${oldName}}`;
                  const newPlaceholder = `{${sanitizedName}}`;
                  return fmt.replaceAll(oldPlaceholder, newPlaceholder);
              });
              return { ...z, name: sanitizedName };
          }
          return z;
      }));
      setEditingZoneId(null);
  };

  // Step 3: Run real-time single page extraction preview
  const handlePreviewExtraction = async () => {
      if (!pdfBytes) return;
      setIsPreviewLoading(true);
      setExtractionPreview(null);
      try {
          const loadingTask = pdfjs.getDocument({ data: pdfBytes.slice(0) });
          const pdfDoc = await loadingTask.promise;
          const page = await pdfDoc.getPage(previewPageIndex + 1);
          const viewport = page.getViewport({ scale: 1.0 });
          const textContent = await page.getTextContent();
          const extractedValues = {};

          cropZones.forEach(zone => {
              if (!zone.crop) {
                  extractedValues[zone.name] = 'Unknown';
                  return;
              }
              
              const crop = zone.crop;
              const mappedItems = [];
              
              textContent.items.forEach(item => {
                  const [, , , , tx, ty] = item.transform;
                  
                  // Convert raw PDF coordinates to rotated viewport pixel coordinates
                  const [vx, vy] = viewport.convertToViewportPoint(tx, ty);
                  const percentX = (vx / viewport.width) * 100;
                  const percentY = (vy / viewport.height) * 100;

                  if (percentX >= crop.x && 
                      percentX <= (crop.x + crop.width) &&
                      percentY >= crop.y && 
                      percentY <= (crop.y + crop.height)) {
                      mappedItems.push({ item, vx, vy });
                  }
              });

              if (mappedItems.length > 0) {
                  // Sort matches visually: Top-to-Bottom, Left-to-Right
                  mappedItems.sort((a, b) => a.vy - b.vy || a.vx - b.vx);
                  
                  // De-duplicate overlapping identical strings (common in CAD exports where double layers or bold-effects exist)
                  const uniqueItems = [];
                  mappedItems.forEach(item => {
                      const isDuplicate = uniqueItems.some(existing => {
                          const isSameText = existing.item.str.trim() === item.item.str.trim();
                          const isCloseX = Math.abs(existing.vx - item.vx) < (viewport.width * 0.005);
                          const isCloseY = Math.abs(existing.vy - item.vy) < (viewport.height * 0.005);
                          return isSameText && isCloseX && isCloseY;
                      });
                      if (!isDuplicate) {
                          uniqueItems.push(item);
                      }
                  });

                  extractedValues[zone.name] = uniqueItems.map(m => m.item.str).join(' ').trim();
              } else {
                  extractedValues[zone.name] = 'Unknown';
              }
          });

          let expectedName = namingFormat || '{1}.pdf';
          Object.keys(extractedValues).forEach(key => {
              expectedName = expectedName.replaceAll(`{${key}}`, extractedValues[key] || 'Unknown');
          });
          expectedName = expectedName.replace(/[/\\?%*:|"<>]/g, '-');
          if (!expectedName.toLowerCase().endsWith('.pdf')) expectedName += '.pdf';

          setExtractionPreview({
              extractedValues,
              expectedName
          });
      } catch (err) {
          console.error(err);
          alert('Preview extraction failed: ' + err.message);
      } finally {
          setIsPreviewLoading(false);
      }
  };

  // Step 5: Filter and Sort Split results
  const getFilteredAndSortedResults = () => {
      let items = [...results];
      
      if (searchQuery.trim()) {
          const query = searchQuery.toLowerCase();
          items = items.filter(item => item.fileName.toLowerCase().includes(query));
      }
      
      if (filterType === 'success') {
          items = items.filter(item => !item.fileName.toLowerCase().includes('unknown'));
      } else if (filterType === 'unknown') {
          items = items.filter(item => item.fileName.toLowerCase().includes('unknown'));
      }
      
      if (sortBy === 'name-asc') {
          items.sort((a, b) => a.fileName.localeCompare(b.fileName, undefined, { numeric: true, sensitivity: 'base' }));
      } else if (sortBy === 'name-desc') {
          items.sort((a, b) => b.fileName.localeCompare(a.fileName, undefined, { numeric: true, sensitivity: 'base' }));
      } else {
          items.sort((a, b) => a.pageIndex - b.pageIndex);
      }
      
      return items;
  };

  const handleSelectAllFiltered = () => {
      const filtered = getFilteredAndSortedResults();
      const filteredPageIndexes = filtered.map(item => item.pageIndex);
      setSelectedResults(prev => [...new Set([...prev, ...filteredPageIndexes])]);
  };

  const handleUnselectAllFiltered = () => {
      const filtered = getFilteredAndSortedResults();
      const filteredPageIndexes = filtered.map(item => item.pageIndex);
      setSelectedResults(prev => prev.filter(idx => !filteredPageIndexes.includes(idx)));
  };

  // Range-based Shift click selection helper for Grid view (Step 2)
  const handlePageSelectClick = (e, index) => {
      if (e.shiftKey && pagesToKeep.length > 0) {
          const lastSelected = pagesToKeep[pagesToKeep.length - 1];
          const start = Math.min(lastSelected, index);
          const end = Math.max(lastSelected, index);
          
          const range = Array.from({ length: end - start + 1 }, (_, i) => start + i);
          const isAlreadySelected = pagesToKeep.includes(index);
          
          if (isAlreadySelected) {
              setPagesToKeep(prev => prev.filter(p => !range.includes(p)).sort((a,b)=>a-b));
          } else {
              setPagesToKeep(prev => [...new Set([...prev, ...range])].sort((a,b)=>a-b));
          }
      } else {
          setPagesToKeep(prev => 
              prev.includes(index) 
                  ? prev.filter(x => x !== index) 
                  : [...prev, index].sort((a,b)=>a-b)
          );
      }
  };

  // Canvas Mouse events tracking coordinates for the sidebar magnifier lens
  const handleCanvasMouseMove = (e) => {
      const rect = e.currentTarget.getBoundingClientRect();
      const x = ((e.clientX - rect.left) / rect.width) * 100;
      const y = ((e.clientY - rect.top) / rect.height) * 100;
      setHoverCoords({ x, y });
  };

  // Core Processing Loop: In-browser PDF Splitting and Text Extraction
  const handleStartExtraction = async () => {
      if (!pdfBytes) return;
      
      setIsProcessing(true);
      setStep(4);
      setLogs([`[INFO] Starting core split loop for ${pagesToKeep.length} selected pages...`]);
      setProgress(0);
      setResults([]);
      
      const timeStart = Date.now();
      setSpeedMetrics({ timeStart, pageCount: 0, speed: 0 });

      try {
          // Initialize PDF text parser with a fresh copy to prevent Web Worker neutering
          const loadingTask = pdfjs.getDocument({ data: pdfBytes.slice(0) });
          const pdfDoc = await loadingTask.promise;
          
          // Initialize PDF splitting document parser with a fresh copy
          const originalDoc = await PDFDocument.load(pdfBytes.slice(0));
          
          const completedResults = [];

          for (let i = 0; i < pagesToKeep.length; i++) {
              const pageIndex = pagesToKeep[i];
              setLogs(prev => [...prev, `[PAGE ${pageIndex + 1}] Commencing extraction...`]);
              
              // 1. Client-Side Coordinate-Based Text Extraction using pdfjs
              const page = await pdfDoc.getPage(pageIndex + 1);
              const viewport = page.getViewport({ scale: 1.0 });
              const textContent = await page.getTextContent();
              const extractedValues = {};

              // Match coordinates for all dynamic crop zones
              cropZones.forEach(zone => {
                  if (!zone.crop) {
                      extractedValues[zone.name] = 'Unknown';
                      return;
                  }
                  
                  const crop = zone.crop;
                  const mappedItems = [];
                  
                  textContent.items.forEach(item => {
                      const [, , , , tx, ty] = item.transform;
                      
                      // Convert raw PDF coordinates to rotated viewport pixel coordinates
                      const [vx, vy] = viewport.convertToViewportPoint(tx, ty);
                      const percentX = (vx / viewport.width) * 100;
                      const percentY = (vy / viewport.height) * 100;

                      if (percentX >= crop.x && 
                          percentX <= (crop.x + crop.width) &&
                          percentY >= crop.y && 
                          percentY <= (crop.y + crop.height)) {
                          mappedItems.push({ item, vx, vy });
                      }
                  });

                  if (mappedItems.length > 0) {
                      // Sort matches visually: Top-to-Bottom, Left-to-Right
                      mappedItems.sort((a, b) => a.vy - b.vy || a.vx - b.vx);
                      
                      // De-duplicate overlapping identical strings (common in CAD exports where double layers or bold-effects exist)
                      const uniqueItems = [];
                      mappedItems.forEach(item => {
                          const isDuplicate = uniqueItems.some(existing => {
                              const isSameText = existing.item.str.trim() === item.item.str.trim();
                              const isCloseX = Math.abs(existing.vx - item.vx) < (viewport.width * 0.005);
                              const isCloseY = Math.abs(existing.vy - item.vy) < (viewport.height * 0.005);
                              return isSameText && isCloseX && isCloseY;
                          });
                          if (!isDuplicate) {
                              uniqueItems.push(item);
                          }
                      });

                      extractedValues[zone.name] = uniqueItems.map(m => m.item.str).join(' ').trim();
                  } else {
                      extractedValues[zone.name] = 'Unknown';
                  }
              });

              // 2. Client-Side Page Isolation and Splitting via pdf-lib
              const singleDoc = await PDFDocument.create();
              const [copiedPage] = await singleDoc.copyPages(originalDoc, [pageIndex]);
              singleDoc.addPage(copiedPage);
              const splitPdfBytes = await singleDoc.save();

              // 3. File Name Compilation & Collision Management
              let fileName = namingFormat || '{Gambar}-{Lembar}-{Judul}.pdf';
              Object.keys(extractedValues).forEach(key => {
                  const placeholder = `{${key}}`;
                  fileName = fileName.replaceAll(placeholder, extractedValues[key] || 'Unknown');
              });

              // Sanitize name for illegal file system path characters
              fileName = fileName.replace(/[/\\?%*:|"<>]/g, '-');
              if (!fileName.toLowerCase().endsWith('.pdf')) fileName += '.pdf';

              // Prevent duplicates in current session results
              let finalFileName = fileName;
              let counter = 1;
              while (completedResults.some(r => r.fileName === finalFileName)) {
                  const ext = '.pdf';
                  const baseName = finalFileName.slice(0, -4);
                  finalFileName = `${baseName}_${counter}${ext}`;
                  counter++;
              }

              // 4. Native Local File Directory Saving (If selected)
              let statusInfo = 'Buffered in memory';
              if (dirHandle) {
                  try {
                      const fileHandle = await dirHandle.getFileHandle(finalFileName, { create: true });
                      const writable = await fileHandle.createWritable();
                      await writable.write(splitPdfBytes);
                      await writable.close();
                      statusInfo = `Saved to /${dirHandle.name}`;
                  } catch (err) {
                      console.error('Directory write failed, buffering file...', err);
                      statusInfo = 'Write failed; Buffered';
                  }
              }

              const resultPayload = {
                  pageIndex,
                  fileName: finalFileName,
                  pdfBytes: splitPdfBytes,
                  extractedValues,
                  statusInfo
              };
              
              completedResults.push(resultPayload);
              setResults(prev => [...prev, resultPayload]);

              // Update progress and metrics speed
              const curProgress = Math.round(((i + 1) / pagesToKeep.length) * 100);
              setProgress(curProgress);
              
              const elapsedSec = (Date.now() - timeStart) / 1000;
              const rate = parseFloat(((i + 1) / (elapsedSec || 1)).toFixed(2));
              setSpeedMetrics(prev => ({
                  ...prev,
                  pageCount: i + 1,
                  speed: rate
              }));

              setLogs(prev => [
                  ...prev, 
                  `[SUCCESS] Generated: ${finalFileName} (${rate} pages/sec)`
              ]);
          }

          setIsProcessing(false);
          setStep(5);
          if (completedResults.length > 0) {
              setSelectedAuditPageIndex(completedResults[0].pageIndex);
          }

      } catch (error) {
          console.error(error);
          setLogs(prev => [...prev, `[CRITICAL ERROR] Loop failure: ${error.message}`]);
          setIsProcessing(false);
      }
  };

  // In-place Renaming inside the results audit step
  const handleRenameAuditResult = async (pageIndex, newName) => {
      let sanitized = newName.replace(/[/\\?%*:|"<>]/g, '-').trim();
      if (!sanitized) return;
      if (!sanitized.toLowerCase().endsWith('.pdf')) sanitized += '.pdf';

      setResults(prev => prev.map(r => {
          if (r.pageIndex === pageIndex) {
              // If dynamic directory picker is linked, write with the new name to disk
              if (dirHandle) {
                  const saveRenamed = async () => {
                      try {
                          const fileHandle = await dirHandle.getFileHandle(sanitized, { create: true });
                          const writable = await fileHandle.createWritable();
                          await writable.write(r.pdfBytes);
                          await writable.close();
                          // Try to delete old name if desired
                          try {
                              await dirHandle.removeEntry(r.fileName);
                          } catch(e) { console.warn('Failed to remove old file entry during rename', e); }
                      } catch(err) { console.error('Dynamic local write failed on rename', err); }
                  };
                  saveRenamed();
              }
              return { 
                  ...r, 
                  fileName: sanitized, 
                  statusInfo: dirHandle ? `Renamed & Saved to /${dirHandle.name}` : 'Renamed In Buffer' 
              };
          }
          return r;
      }));
  };

  // Compile in-memory files and download a single compiled ZIP package
  const downloadResultsAsZip = async () => {
      const zip = new JSZip();
      
      // Determine which files are selected, or fall back to all if none are checked
      const targets = selectedResults.length > 0 
          ? results.filter(r => selectedResults.includes(r.pageIndex))
          : results;

      if (targets.length === 0) return;

      targets.forEach(res => {
          zip.file(res.fileName, res.pdfBytes);
      });

      const blob = await zip.generateAsync({ type: 'blob' });
      const downloadUrl = URL.createObjectURL(blob);
      
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = `split_pages_${Date.now()}.zip`;
      link.click();
  };

  // Write selected buffers directly to disk (if directory access was linked late)
  const writeBuffersToSelectedFolder = async () => {
      let activeHandle = dirHandle;
      if (!activeHandle) {
          try {
              activeHandle = await window.showDirectoryPicker();
              setDirHandle(activeHandle);
              setOutputDirName(activeHandle.name);
          } catch(err) {
              return;
          }
      }

      setLogs(prev => [...prev, `[INFO] Commencing file write to /${activeHandle.name}...`]);
      const targets = selectedResults.length > 0 
          ? results.filter(r => selectedResults.includes(r.pageIndex))
          : results;

      for (let res of targets) {
          try {
              const fileHandle = await activeHandle.getFileHandle(res.fileName, { create: true });
              const writable = await fileHandle.createWritable();
              await writable.write(res.pdfBytes);
              await writable.close();
              
              setResults(prev => prev.map(r => r.pageIndex === res.pageIndex ? { ...r, statusInfo: `Saved to /${activeHandle.name}` } : r));
          } catch(err) {
              console.error(err);
          }
      }
  };

  const handleRerunSelected = () => {
      setPagesToKeep(selectedResults);
      setPreviewPageIndex(selectedResults[0] || 0);
      setSelectedResults([]);
      setStep(3);
  };

  const [previewPageIndex, setPreviewPageIndex] = useState(0);

  // Return to step 1
  const handleResetApp = () => {
      setFile(null);
      setPdfBytes(null);
      setPdfUrl('');
      setNumPages(null);
      setPagesToKeep([]);
      setCropZones([{ id: 'zone-1', name: DEFAULT_ZONE_NAMES[0], crop: null, color: CROP_COLORS[0] }]);
      setActiveZoneId('zone-1');
      setResults([]);
      setSelectedResults([]);
      setStep(1);
  };

  // Tool 5: Document/Image to Image Converter Logic
  const handleLinkInputDir = async () => {
      if (!window.showDirectoryPicker) {
          alert("Your browser does not support the File System Access API directory pickers. Please use the quick drag-and-drop single file upload fallback.");
          return;
      }
      try {
          const handle = await window.showDirectoryPicker();
          setConverterInputDirHandle(handle);
          setConverterLogs(prev => [...prev, `[INFO] Scanned input directory: "${handle.name}"`]);
          
          const files = [];
          for await (const entry of handle.values()) {
              const nameLower = entry.name.toLowerCase();
              if (entry.kind === 'file' && (
                  nameLower.endsWith('.pdf') ||
                  nameLower.endsWith('.jpg') ||
                  nameLower.endsWith('.jpeg') ||
                  nameLower.endsWith('.png') ||
                  nameLower.endsWith('.webp')
              )) {
                  files.push(entry);
              }
          }
          
          // Sort naturally
          files.sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' }));
          
          setConverterFilesList(files);
          setSelectedPdfNames(files.map(p => p.name));
          setConverterLogs(prev => [...prev, `[INFO] Found ${files.length} drawing/image file(s) in directory.`]);
      } catch (err) {
          console.error(err);
          setConverterLogs(prev => [...prev, `[ERROR] Directory scan failed: ${err.message}`]);
      }
  };

  const handleLinkOutputDir = async () => {
      if (!window.showDirectoryPicker) {
          alert("Your browser does not support the File System Access API directory pickers. fallbacks to ZIP downloads.");
          return;
      }
      try {
          const handle = await window.showDirectoryPicker();
          setConverterOutputDirHandle(handle);
          setConverterLogs(prev => [...prev, `[SUCCESS] Output directory linked: "${handle.name}"`]);
      } catch (err) {
          console.error(err);
          setConverterLogs(prev => [...prev, `[ERROR] Output directory link failed: ${err.message}`]);
      }
  };

  const handleConverterFileSelect = (e) => {
      const selected = e.target.files[0];
      if (!selected) return;
      setConverterSingleFile(selected);
      setConverterLogs(prev => [...prev, `[INFO] Loaded individual file: "${selected.name}" (${(selected.size / 1024 / 1024).toFixed(2)} MB)`]);
  };

  const handleConverterProcess = async () => {
      const isSingleMode = !!converterSingleFile;
      const filesToProcess = isSingleMode 
          ? [converterSingleFile] 
          : converterFilesList.filter(f => selectedPdfNames.includes(f.name));

      if (filesToProcess.length === 0) {
          alert("Please select at least one drawing or image file to convert.");
          return;
      }

      // 🛡️ Request readwrite directory permissions up front within the user gesture window
      if (converterOutputDirHandle) {
          try {
              const perm = await converterOutputDirHandle.queryPermission({ mode: 'readwrite' });
              if (perm !== 'granted') {
                  const req = await converterOutputDirHandle.requestPermission({ mode: 'readwrite' });
                  if (req !== 'granted') {
                      alert("Permission denied. Write access is required to save drawings directly to your linked folder.");
                      return;
                  }
              }
          } catch (err) {
              console.error("Failed to request write permission:", err);
          }
      }

      setConverterProcessing(true);
      setConverterProgress(0);
      setConverterSpeed({ pages: 0, speed: 0 });
      setConverterLogs([`[START] Initializing image conversion at ${new Date().toLocaleTimeString()}...`]);

      try {
          let totalPages = 0;
          const filesMetadata = [];
          
          setConverterLogs(prev => [...prev, `[INFO] Parsing and indexing page metadata...`]);
          
          for (let fIdx = 0; fIdx < filesToProcess.length; fIdx++) {
              const fileEntry = filesToProcess[fIdx];
              const isPdf = fileEntry.name.toLowerCase().endsWith('.pdf');
              const fileObj = fileEntry.getFile ? await fileEntry.getFile() : fileEntry;
              
              if (isPdf) {
                  const arrayBuffer = await fileObj.arrayBuffer();
                  const pdfDoc = await pdfjs.getDocument({ data: arrayBuffer }).promise;
                  totalPages += pdfDoc.numPages;
                  
                  filesMetadata.push({
                      entry: fileEntry,
                      name: fileEntry.name,
                      baseName: fileEntry.name.replace(/\.[^/.]+$/, ""),
                      numPages: pdfDoc.numPages,
                      isPdf: true
                  });
                  
                  // Clean up immediately to release file systems backing store locks
                  await pdfDoc.destroy();
              } else {
                  totalPages += 1;
                  filesMetadata.push({
                      entry: fileEntry,
                      name: fileEntry.name,
                      baseName: fileEntry.name.replace(/\.[^/.]+$/, ""),
                      numPages: 1,
                      isPdf: false
                  });
              }
          }

          setConverterLogs(prev => [...prev, `[INFO] Total rendering queue size: ${totalPages} item(s) across ${filesMetadata.length} file(s).`]);

          const zip = new JSZip();
          const startTime = Date.now();
          let renderedCount = 0;

          for (let dIdx = 0; dIdx < filesMetadata.length; dIdx++) {
              const meta = filesMetadata[dIdx];
              setConverterLogs(prev => [...prev, `[CONVERTING] "${meta.name}"...`]);

              const freshFileObj = meta.entry.getFile ? await meta.entry.getFile() : meta.entry;

              if (meta.isPdf) {
                  const freshArrayBuffer = await freshFileObj.arrayBuffer();
                  const pdfDoc = await pdfjs.getDocument({ data: freshArrayBuffer }).promise;

                  for (let pIdx = 1; pIdx <= meta.numPages; pIdx++) {
                      const page = await pdfDoc.getPage(pIdx);
                      const viewport = page.getViewport({ scale: converterScale });
                      
                      const canvas = document.createElement('canvas');
                      canvas.width = viewport.width;
                      canvas.height = viewport.height;
                      const ctx = canvas.getContext('2d');
                      
                      await page.render({ canvasContext: ctx, viewport }).promise;
                      
                      const mimeType = converterFormat === 'png' 
                          ? 'image/png' 
                          : converterFormat === 'jpeg' 
                              ? 'image/jpeg' 
                              : 'image/webp';
                              
                      const qualityVal = converterQuality / 100;
                      const blob = await new Promise(resolve => canvas.toBlob(resolve, mimeType, qualityVal));
                      
                      if (blob) {
                          const ext = converterFormat;
                          const outputFileName = `${meta.baseName}_page_${pIdx}.${ext}`;
                          
                          if (converterOutputDirHandle) {
                              const fileHandle = await converterOutputDirHandle.getFileHandle(outputFileName, { create: true });
                              const writable = await fileHandle.createWritable();
                              await writable.write(blob);
                              await writable.close();
                              setConverterLogs(prev => [...prev, `[SAVED] Stored "${outputFileName}" to output directory.`]);
                          } else {
                              zip.file(outputFileName, blob);
                              setConverterLogs(prev => [...prev, `[RENDERED] Packed "${outputFileName}" into ZIP.`]);
                          }
                      }

                      renderedCount++;
                      setConverterProgress(Math.round((renderedCount / totalPages) * 100));
                      
                      const elapsedSec = (Date.now() - startTime) / 1000;
                      const pagesPerSec = (renderedCount / (elapsedSec || 0.1)).toFixed(1);
                      setConverterSpeed({ pages: renderedCount, speed: pagesPerSec });
                  }

                  await pdfDoc.destroy();
              } else {
                  // It's an image file
                  const imgUrl = URL.createObjectURL(freshFileObj);
                  const img = new Image();
                  img.src = imgUrl;

                  await new Promise((resolve, reject) => {
                      img.onload = resolve;
                      img.onerror = () => reject(new Error(`Failed to load image "${meta.name}"`));
                  });

                  const targetWidth = img.naturalWidth * converterScale;
                  const targetHeight = img.naturalHeight * converterScale;

                  const canvas = document.createElement('canvas');
                  canvas.width = targetWidth;
                  canvas.height = targetHeight;
                  const ctx = canvas.getContext('2d');
                  ctx.drawImage(img, 0, 0, targetWidth, targetHeight);

                  URL.revokeObjectURL(imgUrl);

                  const mimeType = converterFormat === 'png' 
                      ? 'image/png' 
                      : converterFormat === 'jpeg' 
                          ? 'image/jpeg' 
                          : 'image/webp';
                          
                  const qualityVal = converterQuality / 100;
                  const blob = await new Promise(resolve => canvas.toBlob(resolve, mimeType, qualityVal));

                  if (blob) {
                      const ext = converterFormat;
                      const outputFileName = `${meta.baseName}.${ext}`;
                      
                      if (converterOutputDirHandle) {
                          const fileHandle = await converterOutputDirHandle.getFileHandle(outputFileName, { create: true });
                          const writable = await fileHandle.createWritable();
                          await writable.write(blob);
                          await writable.close();
                          setConverterLogs(prev => [...prev, `[SAVED] Stored "${outputFileName}" to output directory.`]);
                      } else {
                          zip.file(outputFileName, blob);
                          setConverterLogs(prev => [...prev, `[RENDERED] Packed "${outputFileName}" into ZIP.`]);
                      }
                  }

                  renderedCount++;
                  setConverterProgress(Math.round((renderedCount / totalPages) * 100));
                  
                  const elapsedSec = (Date.now() - startTime) / 1000;
                  const pagesPerSec = (renderedCount / (elapsedSec || 0.1)).toFixed(1);
                  setConverterSpeed({ pages: renderedCount, speed: pagesPerSec });
              }
          }

          if (!converterOutputDirHandle) {
              setConverterLogs(prev => [...prev, `[PACKAGING] Compiling ZIP package with ${renderedCount} images...`]);
              const zipBlob = await zip.generateAsync({ type: 'blob' });
              const url = URL.createObjectURL(zipBlob);
              const link = document.createElement('a');
              link.href = url;
              link.download = `converted_images_${Date.now()}.zip`;
              link.click();
              setConverterLogs(prev => [...prev, `[SUCCESS] Batch conversion completed. Downloader triggered.`]);
          } else {
              setConverterLogs(prev => [...prev, `[SUCCESS] All ${renderedCount} pages/images successfully written directly to local folder.`]);
          }

      } catch (err) {
          console.error(err);
          setConverterLogs(prev => [...prev, `[CRITICAL ERROR] Conversion failed: ${err.message}`]);
          alert("Conversion failed: " + err.message);
      } finally {
          setConverterProcessing(false);
      }
  };

  // Tool 6: Image Cropper & Magic Wand Logic
  const imageContainerRef = useRef(null);
  const cropperCanvasRef = useRef(null);
  const cropperViewportRef = useRef(null);

  const cropperHistoryRef = useRef([]);
  const cropperHistoryIndexRef = useRef(-1);

  // Sync state values to refs for keybindings to bypass closures
  useEffect(() => {
      cropperHistoryRef.current = cropperHistory;
      cropperHistoryIndexRef.current = cropperHistoryIndex;
  }, [cropperHistory, cropperHistoryIndex]);

  const saveHistoryState = (customCanvas) => {
      const canvas = customCanvas || cropperCanvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d', { willReadFrequently: true });
      const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      
      const nextHistory = cropperHistoryRef.current.slice(0, cropperHistoryIndexRef.current + 1);
      nextHistory.push(imgData);
      
      if (nextHistory.length > 30) {
          nextHistory.shift();
      }
      
      setCropperHistory(nextHistory);
      setCropperHistoryIndex(nextHistory.length - 1);
  };

  const restoreHistoryState = (idx) => {
      const canvas = cropperCanvasRef.current;
      const hist = cropperHistoryRef.current;
      if (!canvas || !hist[idx]) return;
      const ctx = canvas.getContext('2d', { willReadFrequently: true });
      
      const stateData = hist[idx];
      if (canvas.width !== stateData.width || canvas.height !== stateData.height) {
          canvas.width = stateData.width;
          canvas.height = stateData.height;
          setCropperDimensions({ width: stateData.width, height: stateData.height });
      }
      
      ctx.putImageData(stateData, 0, 0);
  };

  const handleCropperUndo = () => {
      const idx = cropperHistoryIndexRef.current;
      if (idx > 0) {
          const nextIndex = idx - 1;
          setCropperHistoryIndex(nextIndex);
          restoreHistoryState(nextIndex);
      }
  };

  const handleCropperRedo = () => {
      const idx = cropperHistoryIndexRef.current;
      const hist = cropperHistoryRef.current;
      if (idx < hist.length - 1) {
          const nextIndex = idx + 1;
          setCropperHistoryIndex(nextIndex);
          restoreHistoryState(nextIndex);
      }
  };

  const handleExecuteCropWorkspace = () => {
      const canvas = cropperCanvasRef.current;
      if (!canvas) return;
      
      const { x, y, width, height } = cropperCropBox;
      if (width <= 0 || height <= 0) {
          alert("Please draw a bounding box region first before performing workspace crop.");
          return;
      }
      
      try {
          const tempCanvas = document.createElement('canvas');
          tempCanvas.width = width;
          tempCanvas.height = height;
          const tempCtx = tempCanvas.getContext('2d', { willReadFrequently: true });
          
          tempCtx.drawImage(
              canvas,
              x, y, width, height,
              0, 0, width, height
          );
          
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d', { willReadFrequently: true });
          ctx.clearRect(0, 0, width, height);
          ctx.drawImage(tempCanvas, 0, 0);
          
          setCropperDimensions({ width, height });
          resetCropBoxToAspect(width, height, cropperRatioLock);
          
          saveHistoryState(canvas);
          
          console.info(`[CROP WORKSPACE] Cropped canvas to selected region: ${width}x${height}px.`);
      } catch (err) {
          console.error(err);
          alert("Workspace crop failed: " + err.message);
      }
  };

  const handleCropperAutoCrop = () => {
      const canvas = cropperCanvasRef.current;
      if (!canvas || !cropperFile) return;
      
      const ctx = canvas.getContext('2d', { willReadFrequently: true });
      const w = canvas.width;
      const h = canvas.height;
      
      const imgData = ctx.getImageData(0, 0, w, h);
      const pixels = imgData.data;
      
      let minX = w;
      let maxX = -1;
      let minY = h;
      let maxY = -1;
      let foundNonTransparent = false;
      
      for (let y = 0; y < h; y++) {
          for (let x = 0; x < w; x++) {
              const idx = (x + y * w) * 4;
              const r = pixels[idx];
              const g = pixels[idx + 1];
              const b = pixels[idx + 2];
              const a = pixels[idx + 3];
              
              // Visible drawing element if not fully transparent
              if (a > 10) {
                  if (x < minX) minX = x;
                  if (x > maxX) maxX = x;
                  if (y < minY) minY = y;
                  if (y > maxY) maxY = y;
                  foundNonTransparent = true;
              }
          }
      }
      
      if (!foundNonTransparent) {
          alert("All pixels are completely transparent! Cannot auto-crop an empty drawing.");
          return;
      }
      
      const padding = 2;
      const cropX = Math.max(0, minX - padding);
      const cropY = Math.max(0, minY - padding);
      const cropW = Math.min(w - cropX, (maxX - minX) + 1 + padding * 2);
      const cropH = Math.min(h - cropY, (maxY - minY) + 1 + padding * 2);
      
      try {
          const tempCanvas = document.createElement('canvas');
          tempCanvas.width = cropW;
          tempCanvas.height = cropH;
          const tempCtx = tempCanvas.getContext('2d', { willReadFrequently: true });
          
          tempCtx.drawImage(
              canvas,
              cropX,
              cropY,
              cropW,
              cropH,
              0,
              0,
              cropW,
              cropH
          );
          
          canvas.width = cropW;
          canvas.height = cropH;
          ctx.clearRect(0, 0, cropW, cropH);
          ctx.drawImage(tempCanvas, 0, 0);
          
          setCropperDimensions({ width: cropW, height: cropH });
          resetCropBoxToAspect(cropW, cropH, cropperRatioLock);
          
          saveHistoryState(canvas);
          console.info(`[AUTO CROP] Auto-cropped canvas to non-transparent bounds: ${cropW}x${cropH}px.`);
      } catch (err) {
          console.error(err);
          alert("Auto-crop failed: " + err.message);
      }
  };

  // Keyboard controls for Undo/Redo & Zoom
  useEffect(() => {
      if (activeTab !== 'cropper') return;
      
      const handleKeyDown = (e) => {
          if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
          
          if (e.ctrlKey || e.metaKey) {
              if (e.key.toLowerCase() === 'z') {
                  e.preventDefault();
                  handleCropperUndo();
              } else if (e.key.toLowerCase() === 'y') {
                  e.preventDefault();
                  handleCropperRedo();
              } else if (e.key === '=' || e.key === '+' || e.code === 'Equal' || e.code === 'NumpadAdd') {
                  e.preventDefault();
                  setCropperZoom(z => Math.min(5.0, z + 0.25));
              } else if (e.key === '-' || e.key === '_' || e.code === 'Minus' || e.code === 'NumpadSubtract') {
                  e.preventDefault();
                  setCropperZoom(z => Math.max(0.2, z - 0.25));
              } else if (e.key === '0' || e.code === 'Digit0' || e.code === 'Numpad0') {
                  e.preventDefault();
                  setCropperZoom(1.0);
              }
          }
      };
      
      window.addEventListener('keydown', handleKeyDown);
      return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeTab]);

  // Wheel Zoom (Ctrl + Mouse Scroll) for Image Cropper
  useEffect(() => {
      if (activeTab !== 'cropper') return;
      const viewport = cropperViewportRef.current;
      if (!viewport) return;
      
      const handleWheel = (e) => {
          if (e.ctrlKey || e.metaKey) {
              e.preventDefault();
              const zoomDelta = e.deltaY < 0 ? 0.1 : -0.1;
              setCropperZoom(z => Math.min(5.0, Math.max(0.2, z + zoomDelta)));
          }
      };
      
      viewport.addEventListener('wheel', handleWheel, { passive: false });
      return () => {
          viewport.removeEventListener('wheel', handleWheel);
      };
  }, [activeTab]);

  const resetCropBoxToAspect = (imgW, imgH, ratioType) => {
      let aspect = null;
      if (ratioType === 'original') aspect = imgW / imgH;
      else if (ratioType === '1:1') aspect = 1.0;
      else if (ratioType === '3:4') aspect = 3 / 4;
      else if (ratioType === '4:6') aspect = 4 / 6;
      
      if (!aspect) {
          const w = Math.round(imgW * 0.8);
          const h = Math.round(imgH * 0.8);
          const x = Math.round((imgW - w) / 2);
          const y = Math.round((imgH - h) / 2);
          setCropperCropBox({ x, y, width: w, height: h });
          return;
      }
      
      let w = Math.round(imgW * 0.8);
      let h = Math.round(w / aspect);
      if (h > imgH) {
          h = Math.round(imgH * 0.8);
          w = Math.round(h * aspect);
      }
      const x = Math.round((imgW - w) / 2);
      const y = Math.round((imgH - h) / 2);
      setCropperCropBox({ x, y, width: w, height: h });
  };

  useEffect(() => {
      if (cropperDimensions.width > 0) {
          resetCropBoxToAspect(cropperDimensions.width, cropperDimensions.height, cropperRatioLock);
      }
  }, [cropperRatioLock]);

  const loadCropperImageFile = (selected) => {
      setCropperFile(selected);
      setCropperZoom(1.0);
      setCropperHistory([]);
      setCropperHistoryIndex(-1);
      const url = URL.createObjectURL(selected);
      setCropperImageUrl(url);
      
      const img = new Image();
      img.src = url;
      img.onload = () => {
          setCropperDimensions({ width: img.naturalWidth, height: img.naturalHeight });
          resetCropBoxToAspect(img.naturalWidth, img.naturalHeight, cropperRatioLock);
          
          // Draw to visible canvas immediately
          const canvas = cropperCanvasRef.current;
          if (canvas) {
              canvas.width = img.naturalWidth;
              canvas.height = img.naturalHeight;
              const ctx = canvas.getContext('2d');
              ctx.clearRect(0, 0, canvas.width, canvas.height);
              ctx.drawImage(img, 0, 0);
              
              const initialData = ctx.getImageData(0, 0, canvas.width, canvas.height);
              setCropperHistory([initialData]);
              setCropperHistoryIndex(0);
          }
      };
      
      const base = selected.name.substring(0, selected.name.lastIndexOf('.')) || selected.name;
      setCropperOutputName(`${base}_1`);
  };

  const loadCropperDirectoryFile = async (fileHandle) => {
      setCropperFile(fileHandle);
      setCropperZoom(1.0);
      setCropperHistory([]);
      setCropperHistoryIndex(-1);
      const f = await fileHandle.getFile();
      const url = URL.createObjectURL(f);
      setCropperImageUrl(url);
      
      const img = new Image();
      img.src = url;
      img.onload = () => {
          setCropperDimensions({ width: img.naturalWidth, height: img.naturalHeight });
          
          if (cropperSyncBox) {
              const clampedX = Math.max(0, Math.min(img.naturalWidth - 10, cropperCropBox.x));
              const clampedY = Math.max(0, Math.min(img.naturalHeight - 10, cropperCropBox.y));
              const clampedW = Math.max(10, Math.min(img.naturalWidth - clampedX, cropperCropBox.width));
              const clampedH = Math.max(10, Math.min(img.naturalHeight - clampedY, cropperCropBox.height));
              setCropperCropBox({ x: clampedX, y: clampedY, width: clampedW, height: clampedH });
          } else {
              resetCropBoxToAspect(img.naturalWidth, img.naturalHeight, cropperRatioLock);
          }
          
          const canvas = cropperCanvasRef.current;
          if (canvas) {
              canvas.width = img.naturalWidth;
              canvas.height = img.naturalHeight;
              const ctx = canvas.getContext('2d');
              ctx.clearRect(0, 0, canvas.width, canvas.height);
              ctx.drawImage(img, 0, 0);
              
              const initialData = ctx.getImageData(0, 0, canvas.width, canvas.height);
              setCropperHistory([initialData]);
              setCropperHistoryIndex(0);
          }
      };
      
      const base = fileHandle.name.substring(0, fileHandle.name.lastIndexOf('.')) || fileHandle.name;
      setCropperOutputName(`${base}_1`);
  };

  const handleCropperFileSelect = (e) => {
      const selected = e.target.files[0];
      if (!selected) return;
      loadCropperImageFile(selected);
  };

  const handleCropperLinkFolder = async () => {
      if (!window.showDirectoryPicker) {
          alert("Directory pickers require Chromium File System Access API. Please use single file uploads instead.");
          return;
      }
      try {
          const handle = await window.showDirectoryPicker();
          setCropperInputDirHandle(handle);
          const list = [];
          for await (const entry of handle.values()) {
              if (entry.kind === 'file') {
                  const nameLower = entry.name.toLowerCase();
                  if (nameLower.endsWith('.png') || nameLower.endsWith('.jpg') || nameLower.endsWith('.jpeg') || nameLower.endsWith('.webp') || nameLower.endsWith('.bmp') || nameLower.endsWith('.gif')) {
                      list.push(entry);
                  }
              }
          }
          setCropperFilesList(list);
          if (list.length > 0) {
              await loadCropperDirectoryFile(list[0]);
          } else {
              alert("No valid images (PNG, JPG, JPEG, WebP, BMP, GIF) were found in this directory.");
          }
      } catch (err) {
          console.error(err);
          alert("Directory loading failed: " + err.message);
      }
  };

  const handleCropperMouseDown = (e, handleType) => {
      e.preventDefault();
      e.stopPropagation();
      
      if (!imageContainerRef.current) return;
      
      // Do nothing if no tool is active
      if (cropperToolMode === 'none') return;
      
      // If Magic Wand mode is active, handle clicks inside target area instead of box dragging
      if (cropperToolMode === 'wand') {
          handleMagicWandClick(e);
          return;
      }
      
      setCropperIsDragging(true);
      setCropperDragHandle(handleType);
      
      const rect = imageContainerRef.current.getBoundingClientRect();
      const clickX = e.clientX - rect.left;
      const clickY = e.clientY - rect.top;
      
      setCropperDragStart({ x: clickX, y: clickY });
  };

  const handleCropperMouseMove = (e) => {
      if (!cropperIsDragging || !imageContainerRef.current || cropperToolMode === 'wand') return;
      e.preventDefault();
      
      const rect = imageContainerRef.current.getBoundingClientRect();
      const curX = Math.max(0, Math.min(rect.width, e.clientX - rect.left));
      const curY = Math.max(0, Math.min(rect.height, e.clientY - rect.top));
      
      const scaleX = cropperDimensions.width / rect.width;
      const scaleY = cropperDimensions.height / rect.height;
      
      let newBox = { ...cropperCropBox };
      
      const sX = cropperCropBox.x / scaleX;
      const sY = cropperCropBox.y / scaleY;
      const sW = cropperCropBox.width / scaleX;
      const sH = cropperCropBox.height / scaleY;
      
      if (cropperDragHandle === 'move') {
          const dx = curX - cropperDragStart.x;
          const dy = curY - cropperDragStart.y;
          
          let nsX = Math.max(0, Math.min(rect.width - sW, sX + dx));
          let nsY = Math.max(0, Math.min(rect.height - sH, sY + dy));
          
          newBox.x = Math.round(nsX * scaleX);
          newBox.y = Math.round(nsY * scaleY);
          
          setCropperDragStart({ x: curX, y: curY });
      } else if (cropperDragHandle === 'draw') {
          const dx = curX - cropperDragStart.x;
          const dy = curY - cropperDragStart.y;
          
          const nsX = dx > 0 ? cropperDragStart.x : curX;
          const nsY = dy > 0 ? cropperDragStart.y : curY;
          let nsW = Math.abs(dx);
          let nsH = Math.abs(dy);
          
          if (cropperRatioLock !== 'free') {
              let aspect = 1.0;
              if (cropperRatioLock === 'original') aspect = cropperDimensions.width / cropperDimensions.height;
              else if (cropperRatioLock === '1:1') aspect = 1.0;
              else if (cropperRatioLock === '3:4') aspect = 3 / 4;
              else if (cropperRatioLock === '4:6') aspect = 4 / 6;
              nsH = nsW / aspect;
          }
          
          newBox.x = Math.round(nsX * scaleX);
          newBox.y = Math.round(nsY * scaleY);
          newBox.width = Math.round(nsW * scaleX);
          newBox.height = Math.round(nsH * scaleY);
      } else {
          let nsX = sX;
          let nsY = sY;
          let nsW = sW;
          let nsH = sH;
          
          if (cropperDragHandle.includes('t')) {
              const bottomLimit = sY + sH;
              nsY = Math.min(bottomLimit - 10, curY);
              nsH = bottomLimit - nsY;
          }
          if (cropperDragHandle.includes('b')) {
              nsH = Math.max(10, curY - sY);
          }
          if (cropperDragHandle.includes('l')) {
              const rightLimit = sX + sW;
              nsX = Math.min(rightLimit - 10, curX);
              nsW = rightLimit - nsX;
          }
          if (cropperDragHandle.includes('r')) {
              nsW = Math.max(10, curX - sX);
          }
          
          if (cropperRatioLock !== 'free') {
              let aspect = 1.0;
              if (cropperRatioLock === 'original') aspect = cropperDimensions.width / cropperDimensions.height;
              else if (cropperRatioLock === '1:1') aspect = 1.0;
              else if (cropperRatioLock === '3:4') aspect = 3 / 4;
              else if (cropperRatioLock === '4:6') aspect = 4 / 6;
              
              if (cropperDragHandle.includes('r') || cropperDragHandle.includes('l')) {
                  nsH = nsW / aspect;
              } else if (cropperDragHandle.includes('t') || cropperDragHandle.includes('b')) {
                  nsW = nsH * aspect;
              }
          }
          
          newBox.x = Math.round(nsX * scaleX);
          newBox.y = Math.round(nsY * scaleY);
          newBox.width = Math.round(nsW * scaleX);
          newBox.height = Math.round(nsH * scaleY);
      }
      
      newBox.x = Math.max(0, Math.min(cropperDimensions.width - 10, newBox.x));
      newBox.y = Math.max(0, Math.min(cropperDimensions.height - 10, newBox.y));
      newBox.width = Math.max(10, Math.min(cropperDimensions.width - newBox.x, newBox.width));
      newBox.height = Math.max(10, Math.min(cropperDimensions.height - newBox.y, newBox.height));
      
      setCropperCropBox(newBox);
  };

  const handleCropperMouseUp = () => {
      setCropperIsDragging(false);
      setCropperDragHandle(null);
  };

  const handleCropperNewProject = () => {
      if (window.confirm("Are you sure? This will remove all current unsaved files and start a new project.")) {
          setCropperInputDirHandle(null);
          setCropperFilesList([]);
          setCropperFile(null);
          if (cropperImageUrl) URL.revokeObjectURL(cropperImageUrl);
          setCropperImageUrl('');
          setCropperHistory([]);
          setCropperHistoryIndex(-1);
      }
  };

  const handleCropperReset = () => {
      if (!cropperImageUrl) return;
      const canvas = cropperCanvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      
      const img = new Image();
      img.src = cropperImageUrl;
      img.onload = () => {
          canvas.width = img.naturalWidth;
          canvas.height = img.naturalHeight;
          ctx.clearRect(0, 0, canvas.width, canvas.height);
          ctx.drawImage(img, 0, 0);
          setCropperDimensions({ width: img.naturalWidth, height: img.naturalHeight });
          resetCropBoxToAspect(img.naturalWidth, img.naturalHeight, cropperRatioLock);
          setCropperZoom(1.0);
          saveHistoryState(canvas);
      };
  };

  const handleMagicWandClick = (e) => {
      const canvas = cropperCanvasRef.current;
      if (!canvas) return;
      
      const rect = imageContainerRef.current.getBoundingClientRect();
      const clickX = e.clientX - rect.left;
      const clickY = e.clientY - rect.top;
      
      const scaleX = canvas.width / rect.width;
      const scaleY = canvas.height / rect.height;
      
      const px = Math.round(clickX * scaleX);
      const py = Math.round(clickY * scaleY);
      
      if (px < 0 || px >= canvas.width || py < 0 || py >= canvas.height) return;
      
      const ctx = canvas.getContext('2d');
      const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const pixels = imgData.data;
      
      const startIdx = (py * canvas.width + px) * 4;
      const tR = pixels[startIdx];
      const tG = pixels[startIdx+1];
      const tB = pixels[startIdx+2];
      const tA = pixels[startIdx+3];
      
      // Sensitivity maps from 0-100 to max Euclidean RGB distance (~441)
      const threshold = (cropperSensitivity / 100) * 441.67;
      
      if (cropperWandMode === 'global') {
          for (let i = 0; i < pixels.length; i += 4) {
              const r = pixels[i];
              const g = pixels[i+1];
              const b = pixels[i+2];
              const a = pixels[i+3];
              
              if (a === 0) continue; // Already transparent
              
              const dist = Math.sqrt((r - tR)**2 + (g - tG)**2 + (b - tB)**2);
              if (dist <= threshold) {
                  pixels[i+3] = 0; // Make transparent
              }
          }
      } else {
          // Contiguous Flood Fill using Fast O(1) Breadth-First-Search
          const w = canvas.width;
          const h = canvas.height;
          const visited = new Uint8Array(w * h);
          const queue = new Int32Array(w * h);
          let qHead = 0;
          let qTail = 0;
          
          const startIdxVal = px + py * w;
          queue[qTail++] = startIdxVal;
          visited[startIdxVal] = 1;
          
          while (qHead < qTail) {
              const idxVal = queue[qHead++];
              const curX = idxVal % w;
              const curY = (idxVal / w) | 0; // Fast bitwise OR integer conversion
              
              const pIdx = idxVal * 4;
              pixels[pIdx+3] = 0; // Make transparent
              
              // Inlined 4-way neighbors to maximize execution speed and bypass allocations
              // 1. Left neighbor
              if (curX > 0) {
                  const nIdx = idxVal - 1;
                  if (!visited[nIdx]) {
                      visited[nIdx] = 1;
                      const npIdx = nIdx * 4;
                      if (pixels[npIdx+3] > 0) {
                          const ndist = Math.sqrt((pixels[npIdx] - tR)**2 + (pixels[npIdx+1] - tG)**2 + (pixels[npIdx+2] - tB)**2);
                          if (ndist <= threshold) {
                              queue[qTail++] = nIdx;
                          }
                      }
                  }
              }
              // 2. Right neighbor
              if (curX < w - 1) {
                  const nIdx = idxVal + 1;
                  if (!visited[nIdx]) {
                      visited[nIdx] = 1;
                      const npIdx = nIdx * 4;
                      if (pixels[npIdx+3] > 0) {
                          const ndist = Math.sqrt((pixels[npIdx] - tR)**2 + (pixels[npIdx+1] - tG)**2 + (pixels[npIdx+2] - tB)**2);
                          if (ndist <= threshold) {
                              queue[qTail++] = nIdx;
                          }
                      }
                  }
              }
              // 3. Top neighbor
              if (curY > 0) {
                  const nIdx = idxVal - w;
                  if (!visited[nIdx]) {
                      visited[nIdx] = 1;
                      const npIdx = nIdx * 4;
                      if (pixels[npIdx+3] > 0) {
                          const ndist = Math.sqrt((pixels[npIdx] - tR)**2 + (pixels[npIdx+1] - tG)**2 + (pixels[npIdx+2] - tB)**2);
                          if (ndist <= threshold) {
                              queue[qTail++] = nIdx;
                          }
                      }
                  }
              }
              // 4. Bottom neighbor
              if (curY < h - 1) {
                  const nIdx = idxVal + w;
                  if (!visited[nIdx]) {
                      visited[nIdx] = 1;
                      const npIdx = nIdx * 4;
                      if (pixels[npIdx+3] > 0) {
                          const ndist = Math.sqrt((pixels[npIdx] - tR)**2 + (pixels[npIdx+1] - tG)**2 + (pixels[npIdx+2] - tB)**2);
                          if (ndist <= threshold) {
                              queue[qTail++] = nIdx;
                          }
                      }
                  }
              }
          }
      }
      
      ctx.putImageData(imgData, 0, 0);
      saveHistoryState(canvas);
  };

  const handleExecuteCrop = async () => {
      const canvas = cropperCanvasRef.current;
      if (!canvas || !cropperFile) return;
      
      let writeToFolder = false;
      let folderHandle = cropperInputDirHandle || converterOutputDirHandle;
      
      if (folderHandle) {
          try {
              const perm = await folderHandle.queryPermission({ mode: 'readwrite' });
              if (perm === 'granted') {
                  writeToFolder = true;
              } else {
                  const req = await folderHandle.requestPermission({ mode: 'readwrite' });
                  if (req === 'granted') {
                      writeToFolder = true;
                  } else {
                      alert("Folder permission denied. Falling back to default web download.");
                  }
              }
          } catch (err) {
              console.error("Folder permission check failed:", err);
          }
      }
      
      setCropperProcessing(true);
      
      try {
          // Crop from our active visual canvas directly so erasures are retained!
          const exportCanvas = document.createElement('canvas');
          exportCanvas.width = cropperCropBox.width;
          exportCanvas.height = cropperCropBox.height;
          const exportCtx = exportCanvas.getContext('2d');
          
          exportCtx.drawImage(
              canvas, 
              cropperCropBox.x, 
              cropperCropBox.y, 
              cropperCropBox.width, 
              cropperCropBox.height, 
              0, 
              0, 
              cropperCropBox.width, 
              cropperCropBox.height
          );
          
          let mimeType = 'image/png';
          if (cropperFormat === 'jpeg') mimeType = 'image/jpeg';
          else if (cropperFormat === 'webp') mimeType = 'image/webp';
          
          const quality = cropperQuality / 100;
          const blob = await new Promise((resolve) => {
              exportCanvas.toBlob(resolve, mimeType, mimeType === 'image/png' ? undefined : quality);
          });
          
          const outputFileName = `${cropperOutputName || 'cropped_drawing'}.${cropperFormat}`;
          
          if (writeToFolder && folderHandle) {
              const fileHandle = await folderHandle.getFileHandle(outputFileName, { create: true });
              const writable = await fileHandle.createWritable();
              await writable.write(blob);
              await writable.close();
              alert(`[SUCCESS] Image cropped and saved directly to linked directory: "${outputFileName}"`);
          } else {
              const url = URL.createObjectURL(blob);
              const link = document.createElement('a');
              link.href = url;
              link.download = outputFileName;
              link.click();
          }
      } catch (err) {
          console.error(err);
          alert("Crop execution failed: " + err.message);
      } finally {
          setCropperProcessing(false);
      }
  };

  const activeZone = useMemo(() => cropZones.find(z => z.id === activeZoneId), [cropZones, activeZoneId]);

  return (
    <div className="min-h-screen bg-[var(--color-neo-bg)] text-[var(--color-neo-white)] font-sans select-none overflow-hidden h-screen flex w-full">
      {/* 🧭 PREMIUM COLLAPSIBLE LEFT SIDEBAR */}
      <aside className="w-20 hover:w-72 bg-[var(--color-neo-surface)] brutal-border border-l-0 border-t-0 border-b-0 flex flex-col shrink-0 z-50 transition-all duration-300 ease-in-out group overflow-hidden">
        <div className="h-[76px] px-[10px] brutal-border border-l-0 border-t-0 border-r-0 flex items-center transition-all duration-300 ease-in-out shrink-0">
          <div className="w-[56px] h-[56px] flex items-center justify-center shrink-0">
            <svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg" className="w-10 h-10 shrink-0">
              <rect x="10" y="10" width="80" height="80" fill="var(--color-neo-purple)" stroke="var(--color-black)" strokeWidth="6" />
              <path d="M30 30V55C30 65 35 70 50 70C65 70 70 65 70 55V30H55V55C55 58 53 60 50 60C47 60 45 58 45 55V30H30Z" fill="white" stroke="var(--color-black)" strokeWidth="4"/>
              <rect x="15" y="15" width="80" height="80" fill="none" stroke="var(--color-black)" strokeWidth="2" transform="translate(4, 4)" />
            </svg>
          </div>
          <h1 className="text-xl font-black text-white tracking-tighter uppercase font-[Montserrat] max-w-0 group-hover:max-w-xs opacity-0 group-hover:opacity-100 transition-all duration-300 overflow-hidden whitespace-nowrap pl-0 group-hover:pl-4">PDF Studio</h1>
        </div>
        
        {/* Navigation Tabs */}
        <div className="flex-1 px-[10px] py-6 space-y-4 transition-all duration-300 ease-in-out">
          <button 
            onClick={() => setActiveTab('splitter')}
            className={`w-full h-14 flex items-center transition-all ${
              activeTab === 'splitter' 
                ? 'bg-[var(--color-neo-purple)] text-black brutal-border brutal-shadow' 
                : 'hover:bg-white hover:text-black text-[var(--color-neo-white)] brutal-border border-transparent hover:border-black'
            }`}
          >
            <div className="w-12 h-12 flex items-center justify-center shrink-0">
              <i className="bi bi-scissors text-base"></i>
            </div>
            <span className="opacity-0 group-hover:opacity-100 max-w-0 group-hover:max-w-xs transition-all duration-300 overflow-hidden whitespace-nowrap font-bold font-[Inter] uppercase tracking-wide text-xs">
              PDF Splitter
            </span>
          </button>

          <button 
            onClick={() => setActiveTab('converter')}
            className={`w-full h-14 flex items-center transition-all ${
              activeTab === 'converter' 
                ? 'bg-[var(--color-neo-purple)] text-black brutal-border brutal-shadow' 
                : 'hover:bg-white hover:text-black text-[var(--color-neo-white)] brutal-border border-transparent hover:border-black'
            }`}
          >
            <div className="w-12 h-12 flex items-center justify-center shrink-0">
              <i className="bi bi-card-image text-base"></i>
            </div>
            <span className="opacity-0 group-hover:opacity-100 max-w-0 group-hover:max-w-xs transition-all duration-300 overflow-hidden whitespace-nowrap font-bold font-[Inter] uppercase tracking-wide text-xs">
              PDF to Image
            </span>
          </button>

          <button 
            onClick={() => setActiveTab('cropper')}
            className={`w-full h-14 flex items-center transition-all ${
              activeTab === 'cropper' 
                ? 'bg-[var(--color-neo-purple)] text-black brutal-border brutal-shadow' 
                : 'hover:bg-white hover:text-black text-[var(--color-neo-white)] brutal-border border-transparent hover:border-black'
            }`}
          >
            <div className="w-12 h-12 flex items-center justify-center shrink-0">
              <i className="bi bi-crop text-base"></i>
            </div>
            <span className="opacity-0 group-hover:opacity-100 max-w-0 group-hover:max-w-xs transition-all duration-300 overflow-hidden whitespace-nowrap font-bold font-[Inter] uppercase tracking-wide text-xs">
              Image Cropper
            </span>
          </button>
          
          <button 
            onClick={() => setActiveTab('merger')}
            className={`w-full h-14 flex items-center transition-all ${
              activeTab === 'merger' 
                ? 'bg-[var(--color-neo-purple)] text-black brutal-border brutal-shadow' 
                : 'hover:bg-white hover:text-black text-[var(--color-neo-white)] brutal-border border-transparent hover:border-black'
            }`}
          >
            <div className="w-12 h-12 flex items-center justify-center shrink-0">
              <i className="bi bi-plus-square text-base"></i>
            </div>
            <span className="opacity-0 group-hover:opacity-100 max-w-0 group-hover:max-w-xs transition-all duration-300 overflow-hidden whitespace-nowrap font-bold font-[Inter] uppercase tracking-wide text-xs">
              Visual Drawer Merger
            </span>
          </button>
          
          <button 
            onClick={() => setActiveTab('organizer')}
            className={`w-full h-14 flex items-center transition-all ${
              activeTab === 'organizer' 
                ? 'bg-[var(--color-neo-purple)] text-black brutal-border brutal-shadow' 
                : 'hover:bg-white hover:text-black text-[var(--color-neo-white)] brutal-border border-transparent hover:border-black'
            }`}
          >
            <div className="w-12 h-12 flex items-center justify-center shrink-0">
              <i className="bi bi-file-earmark-pdf text-base"></i>
            </div>
            <span className="opacity-0 group-hover:opacity-100 max-w-0 group-hover:max-w-xs transition-all duration-300 overflow-hidden whitespace-nowrap font-bold font-[Inter] uppercase tracking-wide text-xs">
              PDF Organizer
            </span>
          </button>
          
          <button 
            onClick={() => setActiveTab('comparison')}
            className={`w-full h-14 flex items-center transition-all ${
              activeTab === 'comparison' 
                ? 'bg-[var(--color-neo-purple)] text-black brutal-border brutal-shadow' 
                : 'hover:bg-white hover:text-black text-[var(--color-neo-white)] brutal-border border-transparent hover:border-black'
            }`}
          >
            <div className="w-12 h-12 flex items-center justify-center shrink-0">
              <i className="bi bi-layout-split text-base"></i>
            </div>
            <span className="opacity-0 group-hover:opacity-100 max-w-0 group-hover:max-w-xs transition-all duration-300 overflow-hidden whitespace-nowrap font-bold font-[Inter] uppercase tracking-wide text-xs">
              PDF Comparison
            </span>
          </button>
          
          <button 
            onClick={() => setActiveTab('sprite')}
            className={`w-full h-14 flex items-center transition-all ${
              activeTab === 'sprite' 
                ? 'bg-[var(--color-neo-purple)] text-black brutal-border brutal-shadow' 
                : 'hover:bg-white hover:text-black text-[var(--color-neo-white)] brutal-border border-transparent hover:border-black'
            }`}
          >
            <div className="w-12 h-12 flex items-center justify-center shrink-0">
              <i className="bi bi-grid-1x2 text-base"></i>
            </div>
            <span className="opacity-0 group-hover:opacity-100 max-w-0 group-hover:max-w-xs transition-all duration-300 overflow-hidden whitespace-nowrap font-bold font-[Inter] uppercase tracking-wide text-xs">
              Sprite Maker
            </span>
          </button>
        </div>
        
        {/* Sidebar Footer */}
        <div className="p-4 border-t border-slate-800 flex items-center justify-center group-hover:justify-between text-[9px] font-mono text-slate-500 transition-all duration-300 ease-in-out overflow-hidden whitespace-nowrap">
          <span className="opacity-0 group-hover:opacity-100 max-w-0 group-hover:max-w-xs transition-all duration-300 overflow-hidden">v1.2.0</span>
          <span className="text-emerald-500 flex items-center gap-1 font-semibold shrink-0">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse shrink-0"></span>
            <span className="opacity-0 group-hover:opacity-100 max-w-0 group-hover:max-w-xs transition-all duration-300 overflow-hidden">100% Offline</span>
          </span>
        </div>
      </aside>
      
      {/* 💻 MAIN CONTENT DECK */}
      <main className="flex-1 flex flex-col h-screen overflow-hidden p-6 relative">
        {/* 🛠️ TAB WORKSPACES */}
        <div className="flex-1 flex flex-col overflow-hidden min-h-0 relative mt-2">
          
          {activeTab === 'splitter' && (
            <div className="flex-1 flex flex-col overflow-hidden min-h-0">
              {step === 1 && (
                <div className="max-w-xl mx-auto bg-[var(--color-neo-surface)] p-10 brutal-border brutal-shadow flex flex-col justify-center items-center w-full space-y-8 my-auto">
                  <div className="text-center space-y-4">
                    <div className="w-20 h-20 bg-[var(--color-neo-purple)] brutal-border flex items-center justify-center mx-auto text-black brutal-shadow">
                      <i className="bi bi-cloud-arrow-up text-4xl"></i>
                    </div>
                    <h3 className="text-lg font-black text-white font-[Montserrat] uppercase tracking-tighter">Upload CAD Drawing Set</h3>
                    <p className="text-[12px] text-[var(--color-neo-pink)] max-w-sm leading-relaxed font-[Inter] uppercase tracking-wide font-bold mx-auto">
                      Select a consolidated PDF drawing package containing standard title blocks to begin.
                    </p>
                  </div>

                  <label className="w-full max-w-md bg-[var(--color-neo-bg)] brutal-border p-8 flex flex-col items-center justify-center cursor-pointer brutal-shadow-hover group">
                    <input 
                      type="file" 
                      accept=".pdf" 
                      onChange={handleFileUpload} 
                      className="hidden" 
                    />
                    <span className="bg-[var(--color-neo-lime)] text-black text-sm font-bold font-[Inter] uppercase px-6 py-3 brutal-btn">
                      {file ? "Change PDF File" : "Select PDF File"}
                    </span>
                    {file ? (
                        <span className="text-[10px] text-[var(--color-neo-lime)] mt-4 font-[Inter] uppercase tracking-wider font-bold truncate w-full text-center px-4" title={file.name}>Selected: {file.name}</span>
                    ) : (
                        <span className="text-[10px] text-[var(--color-neo-white)] mt-4 font-[Inter] uppercase tracking-wider font-bold">or drag & drop drawing here</span>
                    )}
                  </label>

                  <div className="w-full max-w-md space-y-3 p-5 brutal-border bg-[var(--color-neo-bg)]">
                    <div className="flex justify-between items-center">
                      <label className="text-[10px] font-bold text-[var(--color-neo-white)] uppercase tracking-wider font-[Inter]">Output Directory (Optional)</label>
                      <span className="text-[9px] bg-[var(--color-neo-purple)] text-black px-2 py-1 font-[Inter] uppercase font-bold brutal-border">Direct Write</span>
                    </div>
                    <div className="flex gap-2">
                      <input 
                        readOnly 
                        value={outputDirName ? `Linked: /${outputDirName}` : 'ZIP download fallback (default)'} 
                        className={`flex-1 bg-[var(--color-neo-surface)] brutal-border px-4 py-3 text-xs font-[Inter] font-bold outline-none ${
                          outputDirName ? 'text-[var(--color-neo-lime)]' : 'text-[var(--color-neo-white)]'
                        }`} 
                      />
                      <button 
                        onClick={handleSelectDirectory} 
                        className="bg-white text-black px-4 text-xs font-bold font-[Inter] uppercase brutal-btn brutal-shadow-hover shrink-0"
                      >
                        Select Folder
                      </button>
                    </div>
                    <p className="text-[9px] text-[var(--color-neo-white)] font-[Inter] uppercase opacity-70">
                      Allows saving split pages directly to your computer's folders without zip file extraction.
                    </p>
                  </div>

                  {file && (
                    <button 
                      onClick={() => setStep(2)} 
                      className="w-full max-w-md bg-[var(--color-neo-lime)] hover:bg-white text-black font-black font-[Montserrat] uppercase tracking-widest py-4 px-6 brutal-btn brutal-shadow-hover text-sm transition-all"
                    >
                      Proceed to Select Pages
                    </button>
                  )}
                </div>
              )}

              {/* Step 2: Page List & Range Selector Grid */}
              {step === 2 && (
                <div className="space-y-6 flex-1 flex flex-col overflow-hidden">
                  <div className="flex justify-between items-center bg-[var(--color-neo-surface)] brutal-border p-5 shrink-0 brutal-shadow">
                    <div>
                      <h2 className="text-xs font-black text-white font-[Montserrat] uppercase tracking-widest">Select pages ({pagesToKeep.length}/{numPages} selected)</h2>
                    </div>
                    <div className="flex items-center gap-6">
                      <div className="flex items-center gap-3 border-r-4 border-black pr-6">
                        <span className="text-[10px] text-[var(--color-neo-lime)] uppercase tracking-widest font-black font-[Inter]">Thumb size</span>
                        <input 
                            type="range" 
                            min="80" 
                            max="240" 
                            value={gridWidth} 
                            onChange={e => setGridWidth(parseInt(e.target.value))} 
                            className="w-24 accent-[var(--color-neo-lime)] h-2 bg-[var(--color-neo-bg)] brutal-border cursor-pointer appearance-none" 
                        />
                      </div>
                      <div className="flex gap-2">
                        <button 
                            onClick={() => setPagesToKeep(Array.from({length: numPages || 0}, (_, i) => i))} 
                            className="px-4 py-2 hover:bg-white border-2 border-black text-[10px] font-black font-[Inter] uppercase brutal-shadow-hover bg-[var(--color-neo-bg)] text-[var(--color-neo-white)] hover:text-black transition-all"
                        >
                            All
                        </button>
                        <button 
                            onClick={() => setPagesToKeep([])} 
                            className="px-4 py-2 hover:bg-white border-2 border-black text-[10px] font-black font-[Inter] uppercase brutal-shadow-hover bg-[var(--color-neo-bg)] text-[var(--color-neo-white)] hover:text-black transition-all"
                        >
                            Clear
                        </button>
                        <button 
                            onClick={() => setPagesToKeep(p => Array.from({length: numPages || 0}, (_, i) => i).filter(x => !p.includes(x)))} 
                            className="px-4 py-2 hover:bg-white border-2 border-black text-[10px] font-black font-[Inter] uppercase brutal-shadow-hover bg-[var(--color-neo-bg)] text-[var(--color-neo-white)] hover:text-black transition-all"
                        >
                            Invert
                        </button>
                      </div>
                      <button 
                          onClick={() => { 
                              setPreviewPageIndex(pagesToKeep[0] || 0); 
                              setStep(3); 
                          }} 
                          disabled={pagesToKeep.length === 0} 
                          className="bg-[var(--color-neo-lime)] hover:bg-white disabled:opacity-50 text-black font-black font-[Montserrat] uppercase tracking-widest py-3 px-6 brutal-btn brutal-shadow-hover text-xs transition-all shrink-0"
                      >
                          Next: Calibrate Crops
                      </button>
                    </div>
                  </div>

                  <div className="bg-[var(--color-neo-bg)] p-6 brutal-border brutal-shadow flex-1 overflow-y-auto">
                    <Document 
                        file={pdfUrl} 
                        onLoadSuccess={({numPages}) => { 
                            setNumPages(numPages); 
                            if(pagesToKeep.length === 0) {
                                setPagesToKeep(Array.from({length: numPages}, (_, i) => i)); 
                            }
                        }}
                    >
                      <div className="grid gap-6 pb-20 justify-center" style={{ gridTemplateColumns: `repeat(auto-fill, minmax(${gridWidth}px, 1fr))` }}>
                        {Array.from({ length: numPages || 0 }, (_, i) => (
                            <LazyPage 
                                key={i} 
                                pageIndex={i} 
                                isSelected={pagesToKeep.includes(i)} 
                                onClick={(idx) => handlePageSelectClick(window.event, idx)} 
                                pdfUrl={pdfUrl} 
                                width={gridWidth} 
                            />
                        ))}
                      </div>
                    </Document>
                  </div>
                </div>
              )}

              {/* Step 3: Drawing Canvas — fully stripped, inline zone buttons */}
              {step === 3 && (
                <div className="space-y-4 flex-1 flex flex-col overflow-hidden h-full">

                  {/* Single compact top bar */}
                  <div className="flex items-center gap-5 bg-[var(--color-neo-surface)] brutal-border px-6 py-4 shrink-0 brutal-shadow">

                    {/* Zone pills: numbered buttons + add */}
                    <div className="flex items-center gap-2">
                      {cropZones.map((zone, idx) => (
                        <button
                          key={zone.id}
                          onClick={() => setActiveZoneId(zone.id)}
                          className={`w-9 h-9 flex items-center justify-center text-xs font-black font-[Montserrat] uppercase border-2 border-black transition-all ${
                            activeZoneId === zone.id
                              ? 'text-black brutal-shadow-hover'
                              : 'bg-[var(--color-neo-bg)] text-[var(--color-neo-white)] hover:bg-white hover:text-black'
                          }`}
                          style={activeZoneId === zone.id ? { backgroundColor: zone.color, borderColor: 'black' } : {}}
                          title={zone.crop ? `Zone ${zone.name} — cropped` : `Zone ${zone.name} — uncropped`}
                        >
                          {zone.name}
                        </button>
                      ))}
                      {cropZones.length < 5 && (
                        <button
                          onClick={addCropZone}
                          className="w-9 h-9 flex items-center justify-center text-lg font-black border-2 border-black border-dashed bg-white text-black hover:bg-[var(--color-neo-lime)] brutal-shadow-hover transition-all"
                          title="Add zone"
                        >
                          +
                        </button>
                      )}
                      {cropZones.length > 1 && (
                        <button
                          onClick={() => deleteCropZone(activeZoneId)}
                          className="w-9 h-9 flex items-center justify-center text-lg font-black border-2 border-black bg-[var(--color-neo-pink)] text-black brutal-shadow-hover transition-all hover:bg-white"
                          title="Remove active zone"
                        >
                          ×
                        </button>
                      )}
                    </div>

                    {/* Divider */}
                    <div className="w-1 h-8 bg-black" />

                    {/* Page nav */}
                    <div className="flex items-center gap-3 bg-[var(--color-neo-bg)] px-4 h-9 border-2 border-black shadow-[2px_2px_0px_0px_var(--color-black)]">
                      <button
                        onClick={() => { const i = pagesToKeep.indexOf(previewPageIndex); if(i > 0) setPreviewPageIndex(pagesToKeep[i-1]); }}
                        disabled={pagesToKeep.indexOf(previewPageIndex) <= 0}
                        className="text-[var(--color-neo-white)] hover:text-white disabled:opacity-30 font-black text-xs"
                      >◀</button>
                      <span className="text-[10px] font-black font-[Montserrat] text-[var(--color-neo-lime)] uppercase tracking-wider">
                        {previewPageIndex + 1} / {pagesToKeep.length}
                      </span>
                      <button
                        onClick={() => { const i = pagesToKeep.indexOf(previewPageIndex); if(i < pagesToKeep.length-1) setPreviewPageIndex(pagesToKeep[i+1]); }}
                        disabled={pagesToKeep.indexOf(previewPageIndex) >= pagesToKeep.length-1}
                        className="text-[var(--color-neo-white)] hover:text-white disabled:opacity-30 font-black text-xs"
                      >▶</button>
                    </div>

                    {/* Divider */}
                    <div className="w-1 h-8 bg-black" />

                    {/* Zoom controls */}
                    <div className="flex items-center gap-2">
                      <button onClick={() => setScale(p => Math.min(5, p + 0.2))} className="w-9 h-9 bg-white hover:bg-[var(--color-neo-lime)] border-2 border-black text-sm flex items-center justify-center font-black brutal-shadow-hover text-black">+</button>
                      <button onClick={() => setScale(p => Math.max(0.2, p - 0.2))} className="w-9 h-9 bg-white hover:bg-[var(--color-neo-lime)] border-2 border-black text-sm flex items-center justify-center font-black brutal-shadow-hover text-black">−</button>
                      <button onClick={() => setScale(1.0)} className="px-4 h-9 bg-black border-2 border-black text-[10px] font-black font-[Inter] uppercase text-white tracking-widest">1:1</button>
                    </div>

                    {/* Divider */}
                    <div className="w-1 h-8 bg-black" />

                    {/* Naming format */}
                    <input
                      type="text"
                      value={namingFormat}
                      onChange={(e) => setNamingFormat(e.target.value)}
                      className="flex-1 bg-[var(--color-neo-bg)] border-2 border-black text-white px-4 py-3 text-xs font-bold font-[Inter] focus:outline-none focus:border-[var(--color-neo-lime)]"
                      placeholder="{1}-{2}-{3}.pdf"
                    />

                    <button
                      onClick={handlePreviewExtraction}
                      disabled={cropZones.some(z => !z.crop)}
                      className="bg-white hover:bg-[var(--color-neo-lime)] border-2 border-black text-black font-black font-[Montserrat] tracking-widest uppercase h-11 px-8 text-xs transition-all shrink-0 brutal-shadow-hover disabled:opacity-50"
                    >
                      Preview
                    </button>

                    <button
                      onClick={handleStartExtraction}
                      disabled={cropZones.some(z => !z.crop)}
                      className="bg-[var(--color-neo-purple)] hover:bg-white disabled:opacity-30 disabled:pointer-events-none text-black font-black font-[Montserrat] tracking-widest uppercase h-11 px-10 text-xs transition-all shrink-0 brutal-border brutal-shadow-hover"
                    >
                      Split
                    </button>
                  </div>

                  {/* Full-width canvas */}
                  <div
                    ref={viewportRef}
                    onMouseDown={e => {
                      if (!isSpacePressed) return;
                      setIsDragging(true);
                      setDragStart({ x: e.clientX + (viewportRef.current?.scrollLeft || 0), y: e.clientY + (viewportRef.current?.scrollTop || 0) });
                    }}
                    onMouseMove={e => {
                      if (!isDragging || !viewportRef.current) return;
                      viewportRef.current.scrollLeft = dragStart.x - e.clientX;
                      viewportRef.current.scrollTop = dragStart.y - e.clientY;
                    }}
                    onMouseUp={() => setIsDragging(false)}
                    onMouseLeave={() => setIsDragging(false)}
                    className={`flex-1 bg-white brutal-border overflow-auto relative brutal-shadow ${
                      isSpacePressed ? 'cursor-grab' : 'pdf-viewport-area'
                    } ${isDragging ? 'cursor-grabbing' : ''}`}
                  >
                    <div className="inline-block relative">
                      <ReactCrop
                        crop={activeZone?.crop}
                        onChange={(_, p) => {
                          if (isSpacePressed) return;
                          setCropZones(prev => prev.map(z => z.id === activeZoneId ? { ...z, crop: p } : z));
                        }}
                      >
                        <div className="relative">
                          <Document file={pdfUrl}>
                            <Page
                              pageNumber={previewPageIndex + 1}
                              renderTextLayer={false}
                              renderAnnotationLayer={false}
                              width={800}
                              scale={scale}
                            />
                          </Document>

                          {/* Inactive zone overlays */}
                          {cropZones.map(zone => {
                            if (!zone.crop || zone.id === activeZoneId) return null;
                            return (
                              <div
                                key={zone.id}
                                className="absolute border-2 pointer-events-none"
                                style={{
                                  left: `${zone.crop.x}%`,
                                  top: `${zone.crop.y}%`,
                                  width: `${zone.crop.width}%`,
                                  height: `${zone.crop.height}%`,
                                  borderColor: zone.color,
                                  backgroundColor: `${zone.color}08`
                                }}
                              >
                                <span
                                  className="absolute -top-4 left-0 text-[9px] font-bold text-white px-1.5 py-0.5 select-none font-mono"
                                  style={{ backgroundColor: zone.color }}
                                >
                                  {zone.name}
                                </span>
                              </div>
                            );
                          })}
                        </div>
                      </ReactCrop>
                    </div>

                  </div>
                </div>
              )}

              {/* Step 4: Active Loop progress & Dynamic logs */}
              {step === 4 && (
                  <div className="max-w-xl mx-auto bg-white rounded-2xl p-8 border border-slate-200 shadow-sm flex-1 flex flex-col h-full overflow-hidden transition-all duration-300 w-full justify-center">
                      <div className="text-center mb-6">
                          <h2 className="text-sm font-bold text-slate-900 font-mono tracking-tight">Processing PDF package</h2>
                      </div>

                      <div className="w-full bg-slate-100 border border-slate-200 rounded-full h-3 mb-6 overflow-hidden relative shadow-inner">
                          <div className="bg-slate-900 h-3 rounded-full transition-all duration-500" style={{ width: `${progress}%` }}></div>
                      </div>

                      {/* Progress speed metrics */}
                      <div className="grid grid-cols-3 gap-3 mb-6">
                          <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 text-center">
                              <span className="text-[8px] text-slate-450 font-mono uppercase tracking-wider">Rate</span>
                              <div className="text-xs font-bold text-slate-800 mt-1 font-mono">{speedMetrics.speed} P/s</div>
                          </div>
                          <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 text-center">
                              <span className="text-[8px] text-slate-450 font-mono uppercase tracking-wider">Progress</span>
                              <div className="text-xs font-bold text-slate-800 mt-1 font-mono">{progress}%</div>
                          </div>
                          <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 text-center">
                              <span className="text-[8px] text-slate-450 font-mono uppercase tracking-wider">Processed</span>
                              <div className="text-xs font-bold text-slate-800 mt-1 font-mono">{speedMetrics.pageCount}/{pagesToKeep.length}</div>
                          </div>
                      </div>

                      {/* Beautified terminal logs */}
                      <div className="bg-slate-50 border border-slate-200 rounded-xl p-5 flex-1 overflow-y-auto font-mono text-[9px] text-slate-700 space-y-1.5 shadow-inner">
                          {logs.map((log, i) => {
                              let colorClass = 'text-slate-500';
                              if (log.startsWith('[SUCCESS]')) colorClass = 'text-slate-800 font-semibold';
                              if (log.startsWith('[INFO]')) colorClass = 'text-slate-600';
                              if (log.startsWith('[CRITICAL ERROR]')) colorClass = 'text-red-650 font-bold';
                              
                              return (
                                  <div key={i} className={colorClass}>
                                      <span className="text-slate-400 mr-2">[{new Date().toLocaleTimeString()}]</span>
                                      {log}
                                  </div>
                              );
                          })}
                      </div>
                  </div>
              )}

              {/* Step 5: Interactive Audit & Verification Split Pane */}
              {step === 5 && (
                  <div className="space-y-4 flex-1 flex flex-col overflow-hidden h-full">
                      
                      {/* Results Audit Header control deck */}
                      <div className="flex justify-between items-center bg-white border border-slate-200 rounded-2xl px-6 py-4 shrink-0 shadow-sm">
                          <div>
                              <h2 className="text-xs font-bold text-slate-800 font-mono">Verify extraction results</h2>
                          </div>
                          <div className="flex gap-2">
                              {/* Write to folder (direct File system access) */}
                              <button 
                                  onClick={writeBuffersToSelectedFolder}
                                  className="bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs py-2 px-5 rounded-lg shadow-sm transition-colors"
                              >
                                  {dirHandle ? `Save directly to /${dirHandle.name}` : 'Link folder & Save'}
                              </button>
                              
                              {/* Download as compiled ZIP archive */}
                              <button 
                                  onClick={downloadResultsAsZip} 
                                  className="bg-white hover:bg-slate-55 border border-slate-250 hover:border-slate-350 text-slate-700 font-bold text-xs py-2 px-5 rounded-lg transition-colors shadow-2xs"
                              >
                                  Download ZIP ({selectedResults.length > 0 ? selectedResults.length : results.length})
                              </button>
                              
                              <button 
                                  onClick={handleRerunSelected} 
                                  disabled={selectedResults.length === 0} 
                                  className="bg-white hover:bg-slate-55 disabled:opacity-20 border border-slate-250 text-slate-700 font-bold text-xs py-2 px-5 rounded-lg transition-colors shadow-2xs"
                              >
                                  Recalibrate ({selectedResults.length})
                              </button>
                              
                              <button 
                                  onClick={handleResetApp} 
                                  className="bg-slate-105 hover:bg-slate-200 border border-slate-200 text-slate-605 font-bold text-xs py-2 px-5 rounded-lg transition-colors shadow-2xs"
                              >
                                  Reset
                              </button>
                          </div>
                      </div>

                      {/* Audit workspace split layout */}
                      <div className="flex-1 flex overflow-hidden gap-4">
                          
                          {/* Left results card list */}
                          <div className="w-1/2 flex flex-col gap-3 overflow-hidden h-full">
                              {/* Interactive Filter, Search, Sort & Bulk Selection Deck */}
                              <div className="bg-slate-55 border border-slate-200 rounded-xl p-3.5 shrink-0 shadow-2xs space-y-2.5 bg-white">
                                  <div className="flex gap-2">
                                      <input 
                                          type="text"
                                          placeholder="Search files..."
                                          value={searchQuery}
                                          onChange={(e) => setSearchQuery(e.target.value)}
                                          className="flex-1 bg-white border border-slate-200 rounded-lg px-3 py-1.5 text-xs font-mono outline-none focus:border-slate-350 focus:ring-1 focus:ring-slate-300 transition-all shadow-3xs"
                                      />
                                      <select
                                          value={sortBy}
                                          onChange={(e) => setSortBy(e.target.value)}
                                          className="bg-white border border-slate-200 rounded-lg px-2 py-1.5 text-xs font-mono outline-none cursor-pointer focus:border-slate-350 shrink-0 shadow-3xs"
                                      >
                                          <option value="page">Page order</option>
                                          <option value="name-asc">Name A-Z</option>
                                          <option value="name-desc">Name Z-A</option>
                                      </select>
                                  </div>
                                  
                                  <div className="flex justify-between items-center gap-2 pt-0.5">
                                      <div className="flex border border-slate-200 rounded-lg p-0.5 bg-slate-50 shrink-0">
                                          <button 
                                              onClick={() => setFilterType('all')}
                                              className={`px-2.5 py-1 text-[9px] font-bold rounded-md transition-all ${
                                                  filterType === 'all' ? 'bg-slate-900 text-white shadow-xs' : 'text-slate-400 hover:text-slate-650'
                                              }`}
                                          >
                                              All ({results.length})
                                          </button>
                                          <button 
                                              onClick={() => setFilterType('success')}
                                              className={`px-2.5 py-1 text-[9px] font-bold rounded-md transition-all ${
                                                  filterType === 'success' ? 'bg-slate-900 text-white shadow-xs' : 'text-slate-400 hover:text-slate-650'
                                              }`}
                                          >
                                              Success ({results.filter(r => !r.fileName.toLowerCase().includes('unknown')).length})
                                          </button>
                                          <button 
                                              onClick={() => setFilterType('unknown')}
                                              className={`px-2.5 py-1 text-[9px] font-bold rounded-md transition-all ${
                                                  filterType === 'unknown' ? 'bg-slate-900 text-white shadow-xs' : 'text-slate-400 hover:text-slate-650'
                                              }`}
                                          >
                                              Unknown ({results.filter(r => r.fileName.toLowerCase().includes('unknown')).length})
                                          </button>
                                      </div>
                                      
                                      <div className="flex gap-1.5">
                                          <button 
                                              onClick={handleSelectAllFiltered}
                                              className="px-2.5 py-1 hover:bg-slate-100 border border-slate-250 rounded-lg text-[9px] font-bold text-slate-600 transition-colors shadow-2xs bg-white"
                                          >
                                              Select All
                                          </button>
                                          <button 
                                              onClick={handleUnselectAllFiltered}
                                              className="px-2.5 py-1 hover:bg-slate-100 border border-slate-250 rounded-lg text-[9px] font-bold text-slate-600 transition-colors shadow-2xs bg-white"
                                          >
                                              Unselect All
                                          </button>
                                      </div>
                                  </div>
                              </div>

                              {/* Scrollable list */}
                              <div className="flex-1 overflow-y-auto pr-1 flex flex-col gap-3">
                                  <Document file={pdfUrl}>
                                      {getFilteredAndSortedResults().map((res, i) => (
                                          <ResultItem 
                                              key={res.pageIndex} 
                                              result={res} 
                                              pdfUrl={pdfUrl} 
                                              onEdit={handleRenameAuditResult} 
                                              isSelected={selectedResults.includes(res.pageIndex)} 
                                              onToggle={(idx) => setSelectedResults(p => p.includes(idx) ? p.filter(x => x !== idx) : [...p, idx])} 
                                              onClickPreview={(idx) => setSelectedAuditPageIndex(idx)}
                                              isActivePreview={selectedAuditPageIndex === res.pageIndex}
                                          />
                                      ))}
                                  </Document>
                              </div>
                          </div>

                          {/* Right Live zoom sheet validation viewport */}
                          <div className="w-1/2 bg-white border border-slate-200 rounded-2xl p-4 flex flex-col h-full overflow-hidden shadow-sm">
                              <div className="flex items-center justify-between mb-3 border-b border-slate-100 pb-2">
                                  <span className="text-[9px] font-bold text-slate-455 uppercase tracking-wider font-mono">Title block zoom verification</span>
                                  <span className="text-[9px] bg-slate-100 border border-slate-200 px-2 py-0.5 rounded text-slate-600 font-mono">Page {selectedAuditPageIndex + 1}</span>
                              </div>
                              
                              {/* Auto zoom to Zone 1 crop */}
                              <div className="flex-1 bg-slate-100 rounded-xl overflow-hidden relative border border-slate-200 shadow-inner flex items-center justify-center">
                                  {cropZones[0] && cropZones[0].crop ? (
                                      <div 
                                        className="absolute origin-center transition-all duration-300"
                                        style={{
                                          transform: `scale(4.2) translate(${- (cropZones[0].crop.x + cropZones[0].crop.width / 2) + 50}%, ${- (cropZones[0].crop.y + cropZones[0].crop.height / 2) + 50}%)`,
                                          width: '800px',
                                          height: '565px',
                                          left: '50%',
                                          top: '50%',
                                          marginLeft: '-400px',
                                          marginTop: '-282.5px'
                                        }}
                                      >
                                        <Document file={pdfUrl}>
                                          <Page 
                                              pageNumber={selectedAuditPageIndex + 1} 
                                              renderTextLayer={false} 
                                              renderAnnotationLayer={false} 
                                              width={800} 
                                          />
                                        </Document>
                                      </div>
                                  ) : (
                                      <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-400 text-xs font-mono">
                                        No validation zoom available
                                      </div>
                                  )}
                              </div>
                          </div>
                      </div>
                  </div>
              )}
            </div>
          )}

          {/* Tool 5: PDF to Image Converter Workspace */}
          {activeTab === 'converter' && (
            <div className="flex-1 flex gap-6 overflow-hidden min-h-0 h-full animate-in fade-in duration-200">
              
              {/* Left panel: Settings & Configurations */}
              <div className="w-80 bg-[var(--color-neo-surface)] brutal-border brutal-shadow p-6 flex flex-col gap-6 overflow-y-auto shrink-0 z-10 m-2">
                <div className="space-y-2 border-b-4 border-black pb-4">
                  <h3 className="text-sm font-black text-white font-[Montserrat] uppercase tracking-tighter">Image Converter Settings</h3>
                  <p className="text-[10px] text-[var(--color-neo-purple)] font-bold font-[Inter] uppercase">Configure resolution formats, crispness scale, and local output directories.</p>
                </div>

                {/* 1. Input folder picker */}
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-[var(--color-neo-white)] font-[Montserrat] uppercase tracking-wider">1. Input PDF / Image Location</label>
                  <div className="flex flex-col gap-2">
                    <button
                      onClick={handleLinkInputDir}
                      className={`w-full flex items-center justify-center gap-2 py-3 px-4 text-xs font-bold font-[Inter] uppercase tracking-wide transition-all ${
                        converterInputDirHandle 
                          ? 'bg-[var(--color-neo-lime)] text-black brutal-btn brutal-shadow-hover' 
                          : 'bg-white text-black brutal-btn brutal-shadow-hover'
                      }`}
                    >
                      <i className={`bi ${converterInputDirHandle ? 'bi-folder-check' : 'bi-folder-plus'} text-lg`}></i>
                      <span>{converterInputDirHandle ? `Scanned: ${converterInputDirHandle.name}` : 'Link Input Folder'}</span>
                    </button>

                    {/* Standard fallback drag & drop upload */}
                    {!converterInputDirHandle && (
                      <div className="relative brutal-border bg-[var(--color-neo-bg)] p-4 brutal-shadow-hover group flex flex-col items-center justify-center text-center cursor-pointer mt-2">
                        <input 
                          type="file" 
                          accept=".pdf,.jpg,.jpeg,.png,.webp" 
                          onChange={handleConverterFileSelect}
                          className="absolute inset-0 opacity-0 cursor-pointer"
                        />
                        <i className={`bi ${converterSingleFile && !converterSingleFile.name.toLowerCase().endsWith('.pdf') ? 'bi-file-earmark-image' : 'bi-file-earmark-pdf'} text-[var(--color-neo-purple)] text-xl group-hover:scale-110 transition-transform`}></i>
                        <span className="text-[10px] font-bold text-white font-[Inter] mt-2 uppercase tracking-wide">Quick Individual File</span>
                        <span className="text-[9px] text-[var(--color-neo-white)] font-[Inter] font-bold uppercase tracking-wider px-2 mt-1 truncate max-w-full">
                          {converterSingleFile ? converterSingleFile.name : 'Choose or drop PDF or Image file'}
                        </span>
                      </div>
                    )}
                    
                    {converterSingleFile && (
                      <button
                        onClick={() => { setConverterSingleFile(null); setConverterLogs(prev => [...prev, '[INFO] Cleared quick individual file.']); }}
                        className="w-full text-center py-2 text-[10px] font-bold font-[Inter] text-[var(--color-neo-pink)] hover:text-white hover:bg-[var(--color-neo-pink)] brutal-border uppercase tracking-widest mt-2"
                      >
                        Clear Quick File
                      </button>
                    )}
                  </div>
                </div>

                {/* 2. Output folder picker */}
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-[var(--color-neo-white)] font-[Montserrat] uppercase tracking-wider">2. Output Save Location</label>
                  <button
                    onClick={handleLinkOutputDir}
                    className={`w-full flex items-center justify-center gap-2 py-3 px-4 text-xs font-bold font-[Inter] uppercase tracking-wide transition-all ${
                      converterOutputDirHandle 
                        ? 'bg-[var(--color-neo-lime)] text-black brutal-btn brutal-shadow-hover' 
                        : 'bg-white text-black brutal-btn brutal-shadow-hover'
                    }`}
                  >
                    <i className={`bi ${converterOutputDirHandle ? 'bi-folder-check' : 'bi-folder-plus'} text-lg`}></i>
                    <span>{converterOutputDirHandle ? `Saving to: ${converterOutputDirHandle.name}` : 'Link Export Folder'}</span>
                  </button>
                  <p className="text-[9px] text-[var(--color-neo-white)] font-[Inter] font-bold leading-relaxed pl-1 mt-2 uppercase">
                    {converterOutputDirHandle 
                      ? '✓ Converted images will write directly to your hard drive with zero browser popup restrictions.' 
                      : 'ℹ No output folder linked. Images will bundle and download inside a single consolidated ZIP archive.'}
                  </p>
                </div>

                {/* 3. Output Quality Config */}
                <div className="space-y-4 pt-4 border-t-4 border-black">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-[var(--color-neo-white)] font-[Montserrat] uppercase tracking-wider">3. Export Picture Format</label>
                    <div className="grid grid-cols-3 gap-2">
                      {['png', 'jpeg', 'webp'].map(fmt => (
                        <button
                          key={fmt}
                          type="button"
                          onClick={() => setConverterFormat(fmt)}
                          className={`py-2 text-[10px] font-bold font-[Inter] uppercase tracking-widest transition-all ${
                            converterFormat === fmt 
                              ? 'bg-[var(--color-neo-purple)] text-black brutal-btn' 
                              : 'bg-[var(--color-neo-bg)] text-[var(--color-neo-white)] brutal-border hover:bg-white hover:text-black'
                          }`}
                        >
                          {fmt}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Quality rating (hidden for lossless png) */}
                  {converterFormat !== 'png' && (
                    <div className="space-y-2">
                      <div className="flex justify-between text-[10px] font-black text-[var(--color-neo-white)] font-[Montserrat] uppercase">
                        <span>Compression Quality</span>
                        <span className="text-[var(--color-neo-lime)]">{converterQuality}%</span>
                      </div>
                      <input
                        type="range"
                        min="10"
                        max="100"
                        step="5"
                        value={converterQuality}
                        onChange={(e) => setConverterQuality(Number(e.target.value))}
                        className="w-full accent-[var(--color-neo-lime)] cursor-pointer h-2 bg-black brutal-border appearance-none"
                      />
                    </div>
                  )}

                  {/* DPI Scale Multiplier */}
                  <div className="space-y-2">
                    <div className="flex justify-between text-[10px] font-black text-[var(--color-neo-white)] font-[Montserrat] uppercase">
                      <span>Crispness Scale multiplier</span>
                      <span className="text-[var(--color-neo-lime)]">{converterScale.toFixed(1)}x</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <input
                        type="range"
                        min="1.0"
                        max="4.0"
                        step="0.5"
                        value={converterScale}
                        onChange={(e) => setConverterScale(Number(e.target.value))}
                        className="flex-1 accent-[var(--color-neo-lime)] cursor-pointer h-2 bg-black brutal-border appearance-none"
                      />
                      <span className="text-[9px] font-bold font-[Inter] uppercase tracking-wider text-black bg-[var(--color-neo-purple)] px-2 py-1 brutal-border shrink-0">
                        {converterScale === 1.0 ? 'Standard' : converterScale === 2.0 ? 'Crisp (A3)' : converterScale >= 3.0 ? 'Ultra-HD' : 'Balanced'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Processing status deck */}
                {converterProcessing && (
                  <div className="space-y-3 p-4 bg-[var(--color-neo-bg)] brutal-border animate-in fade-in zoom-in-95 duration-200 mt-auto">
                    <div className="flex justify-between items-center text-[10px] font-black text-white font-[Montserrat] uppercase">
                      <span>Rendering Drawings...</span>
                      <span className="text-[var(--color-neo-lime)]">{converterProgress}%</span>
                    </div>
                    <div className="w-full bg-black h-3 brutal-border overflow-hidden relative">
                      <div className="bg-[var(--color-neo-lime)] h-3 transition-all duration-300" style={{ width: `${converterProgress}%` }}></div>
                    </div>
                    <div className="flex justify-between items-center text-[9px] font-bold font-[Inter] uppercase text-[var(--color-neo-purple)]">
                      <span>Rendered: {converterSpeed.pages} sheets</span>
                      <span>Speed: {converterSpeed.speed} sheets/s</span>
                    </div>
                  </div>
                )}

                {/* Execute conversion button */}
                <button
                  type="button"
                  onClick={handleConverterProcess}
                  disabled={converterProcessing || (!converterSingleFile && selectedPdfNames.length === 0)}
                  className="w-full bg-[var(--color-neo-pink)] disabled:opacity-40 text-black font-black font-[Montserrat] uppercase tracking-widest text-sm py-4 brutal-btn brutal-shadow-hover transition-all flex items-center justify-center gap-3 mt-auto"
                >
                  {converterProcessing ? (
                    <>
                      <div className="w-4 h-4 border-4 border-black border-t-transparent animate-spin"></div>
                      <span>Processing...</span>
                    </>
                  ) : (
                    <>
                      <i className="bi bi-play-fill text-lg"></i>
                      <span>Convert Images</span>
                    </>
                  )}
                </button>
              </div>

              {/* Right panel: Checklist grid of scanned PDFs & real-time log viewer */}
              <div className="flex-1 flex flex-col gap-6 overflow-hidden min-h-0 m-2">
                
                {/* Visual file scanned grid */}
                <div className="flex-1 bg-[var(--color-neo-surface)] brutal-border brutal-shadow p-6 flex flex-col overflow-hidden">
                  <div className="flex items-center justify-between border-b-4 border-black pb-4 mb-4 shrink-0">
                    <div>
                      <h4 className="text-sm font-black text-white font-[Montserrat] uppercase tracking-tighter">
                        {converterSingleFile ? 'Quick Convert Single File' : 'Scanned Files Queue'}
                      </h4>
                      <p className="text-[10px] text-[var(--color-neo-pink)] font-[Inter] font-bold mt-1 text-left uppercase">
                        {converterSingleFile 
                          ? 'Converting single local file upload.'
                          : `Select files to convert (${selectedPdfNames.length} of ${converterFilesList.length} checked)`}
                      </p>
                    </div>
                    
                    {/* Bulk selectors */}
                    {!converterSingleFile && converterFilesList.length > 0 && (
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => setSelectedPdfNames(converterFilesList.map(p => p.name))}
                          className="px-3 py-2 text-[10px] font-bold font-[Inter] uppercase bg-[var(--color-neo-lime)] text-black brutal-btn brutal-shadow-hover"
                        >
                          Check All
                        </button>
                        <button
                          type="button"
                          onClick={() => setSelectedPdfNames([])}
                          className="px-3 py-2 text-[10px] font-bold font-[Inter] uppercase bg-[var(--color-neo-pink)] text-black brutal-btn brutal-shadow-hover"
                        >
                          Uncheck All
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Scanned files checklist grid */}
                  <div className="flex-1 overflow-y-auto min-h-0 pr-2">
                    {converterSingleFile ? (
                      <div className="flex items-center gap-4 p-8 bg-[var(--color-neo-bg)] brutal-border justify-center text-center py-12">
                        <i className={`bi ${converterSingleFile.name.toLowerCase().endsWith('.pdf') ? 'bi-file-earmark-pdf' : 'bi-file-earmark-image'} text-5xl text-[var(--color-neo-purple)]`}></i>
                        <div className="text-left space-y-2">
                          <div className="text-sm font-black text-white font-[Inter] truncate max-w-sm uppercase">{converterSingleFile.name}</div>
                          <div className="text-[10px] text-[var(--color-neo-white)] font-[Inter] font-bold uppercase">
                            Size: {(converterSingleFile.size / 1024 / 1024).toFixed(2)} MB • Pure client-side canvas render
                          </div>
                        </div>
                      </div>
                    ) : converterFilesList.length > 0 ? (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pb-4">
                        {converterFilesList.map(entry => {
                          const isChecked = selectedPdfNames.includes(entry.name);
                          const isPdf = entry.name.toLowerCase().endsWith('.pdf');
                          return (
                            <div
                              key={entry.name}
                              onClick={() => {
                                if (isChecked) {
                                  setSelectedPdfNames(prev => prev.filter(name => name !== entry.name));
                                } else {
                                  setSelectedPdfNames(prev => [...prev, entry.name]);
                                }
                              }}
                              className={`flex items-start gap-3 p-4 brutal-btn cursor-pointer select-none transition-all ${
                                isChecked 
                                  ? 'bg-[var(--color-neo-purple)] text-black brutal-shadow-hover' 
                                  : 'bg-[var(--color-neo-bg)] text-[var(--color-neo-white)] hover:bg-white hover:text-black brutal-shadow-hover'
                              }`}
                            >
                              <div className="pt-0.5 shrink-0">
                                <div className={`w-4 h-4 flex items-center justify-center brutal-border transition-all ${
                                  isChecked 
                                    ? 'bg-black text-[var(--color-neo-lime)]' 
                                    : 'bg-white'
                                }`}>
                                  {isChecked && <i className="bi bi-check-lg text-[10px] font-black"></i>}
                                </div>
                              </div>
                              
                              <div className="flex-1 min-w-0 space-y-1 text-left">
                                <h5 className="text-[11px] font-bold font-[Inter] uppercase truncate leading-normal">
                                  {entry.name}
                                </h5>
                                <p className={`text-[9px] font-[Inter] font-bold uppercase leading-none ${isChecked ? 'text-black opacity-80' : 'text-[var(--color-neo-pink)]'}`}>
                                  {isPdf ? 'Blueprint Drawing Package • PDF Format' : 'Image Drawing/File • Raster Format'}
                                </p>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <div className="flex flex-col items-center justify-center py-24 text-center space-y-4">
                        <div className="w-16 h-16 bg-[var(--color-neo-bg)] brutal-border flex items-center justify-center text-[var(--color-neo-white)] brutal-shadow">
                          <i className="bi bi-folder-x text-3xl animate-pulse"></i>
                        </div>
                        <div className="space-y-2">
                          <h5 className="text-sm font-black text-white font-[Montserrat] uppercase tracking-tighter">No Files Scanned Yet</h5>
                          <p className="text-[10px] text-[var(--color-neo-pink)] font-bold max-w-sm leading-relaxed font-[Inter] uppercase">
                            Link an input directory to list PDF/image drawings, or choose a single document package to begin conversion.
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Real-time terminal log viewer */}
                <div className="h-48 bg-black brutal-border p-4 flex flex-col brutal-shadow">
                  <div className="flex items-center justify-between border-b-4 border-[var(--color-neo-surface)] pb-3 mb-3 shrink-0">
                    <div className="flex items-center gap-3">
                      <span className="w-3 h-3 bg-[var(--color-neo-lime)] brutal-border animate-pulse"></span>
                      <span className="text-[10px] font-bold font-[Inter] text-white uppercase tracking-widest">Live Conversion Console Logs</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setConverterLogs([])}
                      className="text-[9px] font-bold font-[Inter] text-[var(--color-neo-pink)] hover:text-white uppercase tracking-wider brutal-border px-2 py-1"
                    >
                      Clear Logs
                    </button>
                  </div>
                  
                  <div className="flex-1 overflow-y-auto font-[Inter] font-bold text-[10px] text-[var(--color-neo-white)] space-y-1 pr-1 text-left leading-relaxed selection:bg-white selection:text-black">
                    {converterLogs.length > 0 ? (
                      converterLogs.map((log, idx) => {
                        let color = 'text-[var(--color-neo-white)]';
                        if (log.startsWith('[SUCCESS]')) color = 'text-[var(--color-neo-lime)]';
                        else if (log.startsWith('[ERROR]') || log.startsWith('[CRITICAL ERROR]')) color = 'text-[var(--color-neo-pink)]';
                        else if (log.startsWith('[START]')) color = 'text-[var(--color-neo-purple)]';
                        else if (log.startsWith('[PROCESSING]') || log.startsWith('[CONVERTING]')) color = 'text-white';
                        else if (log.startsWith('[SAVED]')) color = 'text-[var(--color-neo-lime)] opacity-80';
                        return (
                          <div key={idx} className={color}>
                            {log}
                          </div>
                        );
                      })
                    ) : (
                      <div className="text-[var(--color-neo-white)] opacity-50 italic select-none uppercase">Console is silent. Click Convert Images to stream process logs...</div>
                    )}
                  </div>
                </div>

              </div>
            </div>
          )}

          {activeTab === 'cropper' && (
            <div className="flex-1 flex gap-6 overflow-hidden min-h-0 relative text-left">
              
              {/* Left Column: Local Folder Image List (if directory linked) */}
              {cropperInputDirHandle && cropperFilesList.length > 0 && (
                <div className="w-64 bg-[var(--color-neo-surface)] brutal-border p-6 flex flex-col gap-4 overflow-hidden shrink-0 brutal-shadow z-10 m-2">
                  <div className="border-b-4 border-black pb-4 flex items-center justify-between shrink-0">
                    <div>
                      <h5 className="text-[12px] font-black text-white font-[Montserrat] uppercase tracking-wider">Folder Drawings</h5>
                      <p className="text-[10px] text-[var(--color-neo-pink)] font-bold font-[Inter] mt-1">{cropperFilesList.length} images found</p>
                    </div>
                    <button
                      onClick={() => {
                        setCropperInputDirHandle(null);
                        setCropperFilesList([]);
                      }}
                      className="text-[10px] font-bold font-[Inter] bg-[var(--color-neo-pink)] text-black brutal-border hover:bg-white uppercase tracking-widest px-2 py-1"
                    >
                      Disconnect
                    </button>
                  </div>
                  
                  {/* File List */}
                  <div className="flex-1 overflow-y-auto space-y-2 pr-1">
                    {cropperFilesList.map((entry) => {
                      const isActive = cropperFile && cropperFile.name === entry.name;
                      return (
                        <div
                          key={entry.name}
                          onClick={() => loadCropperDirectoryFile(entry)}
                          className={`p-3 brutal-border cursor-pointer select-none transition-all duration-150 text-left font-bold font-[Inter] text-[10px] truncate uppercase tracking-wide ${
                            isActive
                              ? 'bg-[var(--color-neo-lime)] text-black brutal-shadow-hover'
                              : 'bg-[var(--color-neo-bg)] text-[var(--color-neo-white)] hover:bg-white hover:text-black brutal-shadow-hover'
                          }`}
                        >
                          <i className={`bi ${isActive ? 'bi-image-fill' : 'bi-image'} mr-2 text-sm`}></i>
                          {entry.name}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Center Column: Visual Creative Canvas & Responsive Viewport */}
              <div className="flex-1 flex flex-col overflow-hidden bg-[var(--color-neo-bg)] relative">
                
                {/* Visual Canvas Toolbar Header */}
                <div className="p-4 bg-[var(--color-neo-surface)] border-b-4 border-black flex flex-wrap items-center justify-start gap-4 shrink-0 z-20">
                  {cropperFile && (
                    <div className="flex flex-wrap items-center gap-4 w-full">
                      {/* Undo / Redo Group */}
                      <div className="flex gap-2">
                        <button
                          type="button"
                          disabled={cropperHistoryIndex <= 0}
                          onClick={handleCropperUndo}
                          className={`flex items-center justify-center w-10 h-10 transition-all font-bold ${
                            cropperHistoryIndex <= 0
                              ? 'opacity-30 cursor-not-allowed bg-[var(--color-neo-surface)] brutal-border text-gray-500'
                              : 'bg-white text-black brutal-btn brutal-shadow-hover'
                          }`}
                          title="Undo last action (Ctrl+Z)"
                        >
                          <i className="bi bi-arrow-90deg-left text-sm"></i>
                        </button>
                        <button
                          type="button"
                          disabled={cropperHistoryIndex >= cropperHistory.length - 1}
                          onClick={handleCropperRedo}
                          className={`flex items-center justify-center w-10 h-10 transition-all font-bold ${
                            cropperHistoryIndex >= cropperHistory.length - 1
                              ? 'opacity-30 cursor-not-allowed bg-[var(--color-neo-surface)] brutal-border text-gray-500'
                              : 'bg-white text-black brutal-btn brutal-shadow-hover'
                          }`}
                          title="Redo action (Ctrl+Y)"
                        >
                          <i className="bi bi-arrow-90deg-right text-sm"></i>
                        </button>
                      </div>

                      {/* Zoom Controls Group */}
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => setCropperZoom(z => Math.max(0.2, z - 0.25))}
                          className="flex items-center justify-center w-10 h-10 bg-[var(--color-neo-lime)] text-black brutal-btn brutal-shadow-hover transition-all"
                          title="Zoom Out (Ctrl+-)"
                        >
                          <i className="bi bi-zoom-out text-sm"></i>
                        </button>
                        
                        <span 
                          onClick={() => setCropperZoom(1.0)}
                          className="text-xs font-bold font-[Inter] px-2 py-2 bg-white text-black brutal-border cursor-pointer hover:bg-[var(--color-neo-lime)] select-none transition-all"
                          title="Click to reset zoom to 100% (Ctrl+0)"
                        >
                          {Math.round(cropperZoom * 100)}%
                        </span>

                        <button
                          type="button"
                          onClick={() => setCropperZoom(z => Math.min(5.0, z + 0.25))}
                          className="flex items-center justify-center w-10 h-10 bg-[var(--color-neo-lime)] text-black brutal-btn brutal-shadow-hover transition-all"
                          title="Zoom In (Ctrl++)"
                        >
                          <i className="bi bi-zoom-in text-sm"></i>
                        </button>
                      </div>

                      {/* Editor Tool Mode Pill Selection */}
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => setCropperToolMode(m => m === 'crop' ? 'none' : 'crop')}
                          className={`flex items-center gap-2 px-4 py-2 text-[10px] font-bold font-[Inter] uppercase tracking-wider transition-all ${
                            cropperToolMode === 'crop'
                              ? 'bg-[var(--color-neo-purple)] text-black brutal-btn'
                              : 'bg-[var(--color-neo-surface)] text-[var(--color-neo-white)] brutal-border hover:bg-white hover:text-black'
                          }`}
                        >
                          <i className="bi bi-crop text-sm"></i>
                          <span>Crop Box</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => setCropperToolMode(m => m === 'wand' ? 'none' : 'wand')}
                          className={`flex items-center gap-2 px-4 py-2 text-[10px] font-bold font-[Inter] uppercase tracking-wider transition-all ${
                            cropperToolMode === 'wand'
                              ? 'bg-[var(--color-neo-purple)] text-black brutal-btn'
                              : 'bg-[var(--color-neo-surface)] text-[var(--color-neo-white)] brutal-border hover:bg-white hover:text-black'
                          }`}
                        >
                          <i className="bi bi-magic text-sm"></i>
                          <span>Magic Eraser</span>
                        </button>
                      </div>

                      {/* Crop Workspace Action (Only visible in crop mode) */}
                      {cropperToolMode === 'crop' && (
                        <button
                          type="button"
                          onClick={handleExecuteCropWorkspace}
                          className="px-4 py-2 bg-white text-black text-[10px] font-bold font-[Inter] uppercase tracking-wide brutal-btn brutal-shadow-hover flex items-center gap-2 animate-in fade-in duration-200"
                          title="Crop workspace to bounding box to continue editing inside selected area"
                        >
                          <i className="bi bi-crop text-sm text-[var(--color-neo-pink)]"></i>
                          <span>Crop Selection</span>
                        </button>
                      )}

                      {/* Auto Crop Action (Only visible in Magic Wand mode) */}
                      {cropperToolMode === 'wand' && (
                        <button
                          type="button"
                          onClick={handleCropperAutoCrop}
                          className="px-4 py-2 bg-[var(--color-neo-pink)] text-black text-[10px] font-bold font-[Inter] uppercase tracking-wide brutal-btn brutal-shadow-hover flex items-center gap-2 animate-in fade-in duration-200"
                          title="Automatically crop the drawing to the exact bounding box of non-transparent elements"
                        >
                          <i className="bi bi-magic text-sm"></i>
                          <span>Auto Crop Drawing</span>
                        </button>
                      )}

                      {/* Reset & New Project buttons */}
                      <div className="flex items-center gap-3">
                        <button
                          onClick={handleCropperReset}
                          className="px-4 py-2 bg-[var(--color-neo-pink)] text-black text-[10px] font-bold font-[Inter] uppercase tracking-wide brutal-btn brutal-shadow-hover flex items-center transition-all"
                          title="Restore original un-edited image drawing"
                        >
                          <i className="bi bi-arrow-counterclockwise mr-2 text-sm"></i>
                          Reset Image
                        </button>
                        <button
                          onClick={handleCropperNewProject}
                          className="px-4 py-2 bg-red-500 text-white text-[10px] font-bold font-[Inter] uppercase tracking-wide brutal-btn brutal-shadow-hover flex items-center transition-all"
                          title="Start a new Cropper project (Clears all unsaved files)"
                        >
                          <i className="bi bi-folder-plus mr-2 text-sm"></i>
                          New Project
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                {/* Magic Wand Context Sub-Toolbar (Renders only in wand mode) */}
                {cropperFile && cropperToolMode === 'wand' && (
                  <div className="bg-[var(--color-neo-purple)] border-b-4 border-black text-black px-5 py-4 flex flex-wrap items-center justify-between gap-4 shrink-0 animate-in slide-in-from-top-2 duration-200 z-10">
                    <div className="flex items-center gap-6">
                      {/* Wand Method Selection */}
                      <div className="flex items-center gap-3">
                        <span className="text-[10px] font-black font-[Montserrat] uppercase tracking-wider">Eraser Area:</span>
                        <div className="flex bg-[var(--color-neo-surface)] brutal-border p-1">
                          <button
                            type="button"
                            onClick={() => setCropperWandMode('global')}
                            className={`px-3 py-1.5 text-[9px] font-bold font-[Inter] uppercase tracking-wider transition-all ${
                              cropperWandMode === 'global' ? 'bg-white text-black brutal-border brutal-shadow-hover' : 'text-[var(--color-neo-white)] hover:text-white'
                            }`}
                          >
                            Global Color
                          </button>
                          <button
                            type="button"
                            onClick={() => setCropperWandMode('flood')}
                            className={`px-3 py-1.5 text-[9px] font-bold font-[Inter] uppercase tracking-wider transition-all ${
                              cropperWandMode === 'flood' ? 'bg-white text-black brutal-border brutal-shadow-hover' : 'text-[var(--color-neo-white)] hover:text-white'
                            }`}
                          >
                            Contiguous Flood
                          </button>
                        </div>
                      </div>

                      {/* Sensitivity Slide */}
                      <div className="flex items-center gap-3">
                        <span className="text-[10px] font-black font-[Montserrat] uppercase tracking-wider">Color Similarity Threshold:</span>
                        <input
                          type="range"
                          min="1"
                          max="95"
                          step="1"
                          value={cropperSensitivity}
                          onChange={(e) => setCropperSensitivity(Number(e.target.value))}
                          className="accent-black h-2 brutal-border w-28 cursor-pointer"
                        />
                        <span className="text-[10px] font-[Inter] font-black bg-black px-2 py-1 text-[var(--color-neo-lime)] min-w-[36px] text-center brutal-border">
                          {cropperSensitivity}%
                        </span>
                      </div>
                    </div>
                    <div className="text-[9px] font-[Inter] font-bold uppercase tracking-wide opacity-80">
                      💡 Click anywhere on canvas to erase pixels matching clicked color!
                    </div>
                  </div>
                )}

                {/* Main Interactive Editor Area */}
                <div 
                  ref={cropperViewportRef}
                  className="flex-1 flex p-6 bg-[var(--color-neo-bg)] overflow-auto min-h-0 relative select-none"
                  onMouseMove={handleCropperMouseMove}
                  onMouseUp={handleCropperMouseUp}
                  onMouseLeave={handleCropperMouseUp}
                >
                  {cropperImageUrl ? (() => {
                    const maxW = 800;
                    const maxH = 500;
                    let displayW = 0;
                    let displayH = 0;
                    
                    if (cropperDimensions.width > 0 && cropperDimensions.height > 0) {
                        const scale = Math.min(maxW / cropperDimensions.width, maxH / cropperDimensions.height, 1.0);
                        displayW = Math.round(cropperDimensions.width * scale * cropperZoom);
                        displayH = Math.round(cropperDimensions.height * scale * cropperZoom);
                    }
                    
                    return (
                      <div 
                        ref={imageContainerRef}
                        className={`relative brutal-border brutal-shadow bg-white overflow-hidden shrink-0 select-none m-auto ${
                          cropperToolMode === 'wand' ? 'cursor-crosshair' : 'cursor-default'
                        }`}
                        style={{
                          width: displayW ? `${displayW}px` : 'auto',
                          height: displayH ? `${displayH}px` : 'auto',
                          backgroundImage: 'linear-gradient(45deg, #e2e8f0 25%, transparent 25%), linear-gradient(-45deg, #e2e8f0 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #e2e8f0 75%), linear-gradient(-45deg, transparent 75%, #e2e8f0 75%)',
                          backgroundSize: '16px 16px',
                          backgroundPosition: '0 0, 0 8px, 8px -8px, -8px 0px',
                          backgroundColor: '#f8fafc'
                        }}
                        onMouseDown={(e) => handleCropperMouseDown(e, 'draw')}
                      >
                        {/* Active Offscreen Drawing Render Target */}
                        <canvas
                          ref={cropperCanvasRef}
                          className="pointer-events-none select-none w-full h-full block"
                        />
                        
                        {/* Render crop overlays only when not erasing */}
                        {cropperToolMode === 'crop' && cropperDimensions.width > 0 && displayW > 0 && (() => {
                          const scaleX = cropperDimensions.width / displayW;
                          const scaleY = cropperDimensions.height / displayH;
                          
                          const left = cropperCropBox.x / scaleX;
                          const top = cropperCropBox.y / scaleY;
                          const width = cropperCropBox.width / scaleX;
                          const height = cropperCropBox.height / scaleY;
                          
                          return (
                            <>
                              {/* Overlay Mask Segments (outside crop box) */}
                              <div className="absolute bg-[var(--color-neo-bg)] opacity-80 pointer-events-none" style={{ top: 0, left: 0, right: 0, height: top }} />
                              <div className="absolute bg-[var(--color-neo-bg)] opacity-80 pointer-events-none" style={{ top: top + height, bottom: 0, left: 0, right: 0 }} />
                              <div className="absolute bg-[var(--color-neo-bg)] opacity-80 pointer-events-none" style={{ top, height, left: 0, width: left }} />
                              <div className="absolute bg-[var(--color-neo-bg)] opacity-80 pointer-events-none" style={{ top, height, left: left + width, right: 0 }} />

                              {/* Crop Box Selector Border */}
                              <div 
                                className="absolute border-[3px] border-dashed border-[var(--color-neo-pink)] cursor-move shadow-inner"
                                style={{ left, top, width, height }}
                                onMouseDown={(e) => handleCropperMouseDown(e, 'move')}
                              >
                                {/* Corner Handles */}
                                <div 
                                  className="absolute w-4 h-4 bg-[var(--color-neo-lime)] border-2 border-black cursor-nwse-resize shadow-xs" 
                                  style={{ top: -8, left: -8 }}
                                  onMouseDown={(e) => handleCropperMouseDown(e, 'tl')}
                                />
                                <div 
                                  className="absolute w-4 h-4 bg-[var(--color-neo-lime)] border-2 border-black cursor-nesw-resize shadow-xs" 
                                  style={{ top: -8, right: -8 }}
                                  onMouseDown={(e) => handleCropperMouseDown(e, 'tr')}
                                />
                                <div 
                                  className="absolute w-4 h-4 bg-[var(--color-neo-lime)] border-2 border-black cursor-nesw-resize shadow-xs" 
                                  style={{ bottom: -8, left: -8 }}
                                  onMouseDown={(e) => handleCropperMouseDown(e, 'bl')}
                                />
                                <div 
                                  className="absolute w-4 h-4 bg-[var(--color-neo-lime)] border-2 border-black cursor-nwse-resize shadow-xs" 
                                  style={{ bottom: -8, right: -8 }}
                                  onMouseDown={(e) => handleCropperMouseDown(e, 'br')}
                                />
                                
                                {/* Overlay resolution tag inside cropbox */}
                                <div className="absolute bottom-2 right-2 bg-black text-white font-mono text-[8px] font-bold px-2 py-1 shadow-2xs pointer-events-none select-none uppercase tracking-wider">
                                  {cropperCropBox.width} × {cropperCropBox.height} px
                                </div>
                              </div>
                            </>
                          );
                        })()}
                      </div>
                    );
                  })() : (
                    <div className="w-full max-w-xl space-y-6 m-auto animate-in zoom-in-95 duration-300">
                      {/* Directory Select + Individual Files Selection Dual Deck */}
                      <div className="grid grid-cols-2 gap-6">
                        <button
                          onClick={handleCropperLinkFolder}
                          className="flex flex-col items-center justify-center bg-[var(--color-neo-bg)] brutal-border p-12 text-center cursor-pointer brutal-shadow-hover group"
                        >
                          <div className="w-16 h-16 bg-[var(--color-neo-purple)] brutal-border flex items-center justify-center text-black brutal-shadow mb-6 transition-transform group-hover:-translate-y-1">
                            <i className="bi bi-folder-check text-3xl"></i>
                          </div>
                          <h5 className="text-sm font-black text-white font-[Montserrat] uppercase tracking-tighter">Link Image Folder</h5>
                          <p className="text-[10px] text-[var(--color-neo-white)] font-[Inter] font-bold max-w-[200px] mx-auto mt-2 uppercase">
                            Batch load, browse, and edit all drawings inside a selected local directory.
                          </p>
                        </button>

                        <label className="flex flex-col items-center justify-center bg-[var(--color-neo-bg)] brutal-border p-12 text-center cursor-pointer brutal-shadow-hover group">
                          <input 
                            type="file" 
                            accept="image/*" 
                            onChange={handleCropperFileSelect} 
                            className="hidden" 
                          />
                          <div className="w-16 h-16 bg-[var(--color-neo-lime)] brutal-border flex items-center justify-center text-black brutal-shadow mb-6 transition-transform group-hover:-translate-y-1">
                            <i className="bi bi-cloud-arrow-up text-3xl"></i>
                          </div>
                          <h5 className="text-sm font-black text-white font-[Montserrat] uppercase tracking-tighter">Quick Modify 1 Image</h5>
                          <p className="text-[10px] text-[var(--color-neo-white)] font-[Inter] font-bold max-w-[200px] mx-auto mt-2 uppercase">
                            Browse your local file system to load one individual blueprint picture.
                          </p>
                        </label>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Right Column: Configuration & Coordinates Panel */}
              <div className="w-80 shrink-0 bg-[var(--color-neo-surface)] p-6 flex flex-col justify-between text-white overflow-y-auto custom-scrollbar">
                <div className="space-y-6">
                  
                  {/* Image Info & Meta */}
                  <div className="space-y-2">
                    <div className="text-[10px] font-black text-[var(--color-neo-white)] font-[Montserrat] uppercase tracking-wider">Image Metadata</div>
                    {cropperFile ? (
                      <div className="bg-[var(--color-neo-surface)] brutal-border p-3 space-y-1 font-[Inter] font-bold text-[9px] text-left leading-normal uppercase">
                        <div className="truncate text-white"><span className="text-[var(--color-neo-pink)] mr-1">File:</span> {cropperFile.name}</div>
                        <div><span className="text-[var(--color-neo-pink)] mr-1">Resolution:</span> {cropperDimensions.width} × {cropperDimensions.height} px</div>
                      </div>
                    ) : (
                      <div className="text-[9px] text-[var(--color-neo-white)] italic font-[Inter] uppercase">No drawing active. Load a drawing to inspect metadata.</div>
                    )}
                  </div>

                  {/* Bounding Box Ratio lock */}
                  <div className="space-y-2">
                    <div className="text-[10px] font-black text-[var(--color-neo-white)] font-[Montserrat] uppercase tracking-wider">Crop Ratio Constraints</div>
                    <div className="grid grid-cols-2 gap-2">
                      {[
                        { id: 'free', name: 'Freeform' },
                        { id: 'original', name: 'Original Ratio' },
                        { id: '1:1', name: '1:1 (Square)' },
                        { id: '3:4', name: '3:4 (Portrait)' },
                        { id: '4:6', name: '4:6 (Landscape)' }
                      ].map(ratio => (
                        <button
                          key={ratio.id}
                          type="button"
                          disabled={!cropperFile}
                          onClick={() => setCropperRatioLock(ratio.id)}
                          className={`text-[9px] font-bold font-[Inter] py-2 px-2 uppercase tracking-wider transition-all disabled:opacity-20 ${
                            cropperRatioLock === ratio.id 
                              ? 'bg-[var(--color-neo-pink)] text-black brutal-btn brutal-shadow' 
                              : 'bg-[var(--color-neo-surface)] text-[var(--color-neo-white)] brutal-border hover:bg-white hover:text-black'
                          }`}
                        >
                          {ratio.name}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Batch Sync Coordinates Checkbox */}
                  <div className="space-y-2 pt-4 border-t border-[var(--color-neo-bg)]">
                    <button 
                      type="button"
                      disabled={!cropperFile}
                      onClick={() => setCropperSyncBox(!cropperSyncBox)}
                      className={`w-full text-left brutal-border p-4 transition-all disabled:opacity-50 select-none group ${
                        cropperSyncBox 
                          ? 'bg-[var(--color-neo-lime)] text-black brutal-shadow' 
                          : 'bg-[var(--color-neo-bg)] text-[var(--color-neo-white)] hover:bg-white hover:text-black brutal-shadow-hover'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className="text-[10px] font-black font-[Montserrat] uppercase tracking-wide">
                          Lock Coordinates
                        </div>
                        <div className={`w-8 h-4 brutal-border flex items-center p-0.5 ${cropperSyncBox ? 'bg-white' : 'bg-[var(--color-neo-surface)]'}`}>
                          <div className={`w-2 h-2 brutal-border bg-black transition-transform ${cropperSyncBox ? 'translate-x-3.5' : ''}`}></div>
                        </div>
                      </div>
                      <div className={`text-[8px] font-[Inter] font-bold uppercase leading-tight ${cropperSyncBox ? 'text-black' : 'text-[var(--color-neo-purple)] group-hover:text-black'}`}>
                        Apply this crop box exactly to other drawings when switching in the sidebar list.
                      </div>
                    </button>
                  </div>

                  {/* High-Precision Crop Coordinates */}
                  <div className="space-y-3">
                    <div className="text-[10px] font-black text-[var(--color-neo-white)] font-[Montserrat] uppercase tracking-wider">Precision Crop Coordinates</div>
                    
                    <div className="grid grid-cols-2 gap-3 text-left">
                      <div className="space-y-1">
                        <label className="text-[9px] font-black font-[Inter] text-[var(--color-neo-white)] uppercase">Start X (px)</label>
                        <input
                          type="number"
                          min="0"
                          max={Math.max(0, cropperDimensions.width - 10)}
                          value={cropperCropBox.x}
                          disabled={!cropperFile}
                          onChange={(e) => {
                            const val = Math.max(0, Math.min(cropperDimensions.width - 10, Number(e.target.value)));
                            setCropperCropBox(prev => ({
                              ...prev,
                              x: val,
                              width: Math.min(cropperDimensions.width - val, prev.width)
                            }));
                          }}
                          className="w-full bg-[var(--color-neo-surface)] brutal-border px-3 py-2 text-xs font-[Inter] font-bold text-[var(--color-neo-lime)] focus:outline-none transition-all disabled:opacity-50"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[9px] font-black font-[Inter] text-[var(--color-neo-white)] uppercase">Start Y (px)</label>
                        <input
                          type="number"
                          min="0"
                          max={Math.max(0, cropperDimensions.height - 10)}
                          value={cropperCropBox.y}
                          disabled={!cropperFile}
                          onChange={(e) => {
                            const val = Math.max(0, Math.min(cropperDimensions.height - 10, Number(e.target.value)));
                            setCropperCropBox(prev => ({
                              ...prev,
                              y: val,
                              height: Math.min(cropperDimensions.height - val, prev.height)
                            }));
                          }}
                          className="w-full bg-[var(--color-neo-surface)] brutal-border px-3 py-2 text-xs font-[Inter] font-bold text-[var(--color-neo-lime)] focus:outline-none transition-all disabled:opacity-50"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[9px] font-black font-[Inter] text-[var(--color-neo-white)] uppercase">Width (px)</label>
                        <input
                          type="number"
                          min="10"
                          max={cropperDimensions.width - cropperCropBox.x}
                          value={cropperCropBox.width}
                          disabled={!cropperFile}
                          onChange={(e) => {
                            const val = Math.max(10, Math.min(cropperDimensions.width - cropperCropBox.x, Number(e.target.value)));
                            setCropperCropBox(prev => ({ ...prev, width: val }));
                          }}
                          className="w-full bg-[var(--color-neo-surface)] brutal-border px-3 py-2 text-xs font-[Inter] font-bold text-[var(--color-neo-lime)] focus:outline-none transition-all disabled:opacity-50"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[9px] font-black font-[Inter] text-[var(--color-neo-white)] uppercase">Height (px)</label>
                        <input
                          type="number"
                          min="10"
                          max={cropperDimensions.height - cropperCropBox.y}
                          value={cropperCropBox.height}
                          disabled={!cropperFile}
                          onChange={(e) => {
                            const val = Math.max(10, Math.min(cropperDimensions.height - cropperCropBox.y, Number(e.target.value)));
                            setCropperCropBox(prev => ({ ...prev, height: val }));
                          }}
                          className="w-full bg-[var(--color-neo-surface)] brutal-border px-3 py-2 text-xs font-[Inter] font-bold text-[var(--color-neo-lime)] focus:outline-none transition-all disabled:opacity-50"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Re-Save Custom Naming */}
                  <div className="space-y-2">
                    <div className="text-[10px] font-black text-[var(--color-neo-white)] font-[Montserrat] uppercase tracking-wider">Re-Save Custom Name</div>
                    <div className="flex bg-[var(--color-neo-surface)] brutal-border px-3 py-3 transition-all">
                      <input
                        type="text"
                        disabled={!cropperFile}
                        value={cropperOutputName}
                        onChange={(e) => setCropperOutputName(e.target.value)}
                        placeholder="Export Filename"
                        className="flex-1 bg-transparent text-xs font-[Inter] font-bold text-[var(--color-neo-lime)] focus:outline-none disabled:opacity-50"
                      />
                      <span className="text-[10px] font-[Inter] text-[var(--color-neo-white)] font-bold shrink-0 self-center uppercase">.{cropperFormat}</span>
                    </div>
                  </div>

                  {/* Output Image Format Selection */}
                  <div className="space-y-2">
                    <div className="text-[10px] font-black text-[var(--color-neo-white)] font-[Montserrat] uppercase tracking-wider">Output File Format</div>
                    <div className="flex gap-2">
                      {['png', 'jpeg', 'webp'].map(fmt => (
                        <button
                          key={fmt}
                          type="button"
                          disabled={!cropperFile}
                          onClick={() => setCropperFormat(fmt)}
                          className={`flex-1 text-[10px] font-bold font-[Inter] py-2 uppercase transition-all disabled:opacity-30 ${
                            cropperFormat === fmt 
                              ? 'bg-[var(--color-neo-purple)] text-black brutal-btn' 
                              : 'bg-[var(--color-neo-surface)] text-[var(--color-neo-white)] brutal-border hover:bg-white hover:text-black'
                          }`}
                        >
                          {fmt}
                        </button>
                      ))}
                    </div>
                    {cropperFormat === 'png' && (
                      <p className="text-[9px] font-[Inter] font-bold text-[var(--color-neo-lime)] leading-normal text-left uppercase pt-1">
                        💡 PNG format strongly recommended to preserve transparent areas cleared by the Magic Wand!
                      </p>
                    )}
                  </div>

                  {/* Quality Settings (for JPEG & WebP) */}
                  {(cropperFormat === 'jpeg' || cropperFormat === 'webp') && (
                    <div className="space-y-2">
                      <div className="flex justify-between text-[10px] font-black text-[var(--color-neo-white)] font-[Montserrat] uppercase tracking-wider">
                        <span>Quality Compression</span>
                        <span className="text-[var(--color-neo-lime)]">{cropperQuality}%</span>
                      </div>
                      <input
                        type="range"
                        min="10"
                        max="100"
                        step="5"
                        disabled={!cropperFile}
                        value={cropperQuality}
                        onChange={(e) => setCropperQuality(Number(e.target.value))}
                        className="w-full accent-[var(--color-neo-lime)] cursor-pointer h-2 bg-[var(--color-neo-surface)] brutal-border appearance-none disabled:opacity-50"
                      />
                    </div>
                  )}

                  {/* Linked output directory connection */}
                  <div className="space-y-2">
                    <div className="text-[10px] font-black text-[var(--color-neo-white)] font-[Montserrat] uppercase tracking-wider">Output Destination</div>
                    {cropperInputDirHandle || converterOutputDirHandle ? (
                      <div className="flex items-center justify-between bg-[var(--color-neo-surface)] p-3 brutal-border font-[Inter] font-bold text-[9px] text-left leading-normal">
                        <div className="truncate text-white uppercase">
                          <i className="bi bi-folder-check text-[var(--color-neo-lime)] text-xs mr-2"></i>
                          Saving directly to <span className="text-[var(--color-neo-lime)] border-b-2 border-[var(--color-neo-lime)]">"{cropperInputDirHandle ? cropperInputDirHandle.name : converterOutputDirHandle.name}"</span>
                        </div>
                      </div>
                    ) : (
                      <div className="bg-[var(--color-neo-surface)] p-3 brutal-border font-[Inter] font-bold text-[9px] text-left leading-normal text-[var(--color-neo-pink)] uppercase">
                        <i className="bi bi-cloud-arrow-down-fill mr-2"></i>
                        No directory active. Cropped images will save to browser Downloads.
                      </div>
                    )}
                  </div>

                </div>

                <div className="pt-6 border-t-4 border-[var(--color-neo-surface)] shrink-0 mt-6">
                  <button
                    type="button"
                    disabled={!cropperFile || cropperProcessing}
                    onClick={handleExecuteCrop}
                    className="w-full flex items-center justify-center gap-3 bg-[var(--color-neo-lime)] text-black font-[Montserrat] font-black text-sm py-4 brutal-btn brutal-shadow-hover transition-all disabled:opacity-40 disabled:pointer-events-none uppercase tracking-widest"
                  >
                    {cropperProcessing ? (
                      <>
                        <div className="w-4 h-4 border-4 border-black border-t-transparent animate-spin"></div>
                        <span>Processing Crop...</span>
                      </>
                    ) : (
                      <>
                        <i className="bi bi-crop text-lg"></i>
                        <span>Crop & Save Image</span>
                      </>
                    )}
                  </button>
                </div>

              </div>
            </div>
          )}

                    {activeTab === 'merger' && <LocalPdfMerger />}
          {activeTab === 'organizer' && <LocalPdfOrganizer />}
          {activeTab === 'comparison' && <LocalPdfComparison />}
          {activeTab === 'sprite' && <LocalSpriteMaker />}


        </div>
      </main>

      {/* 1. Extraction Preview Modal */}
      {extractionPreview && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-6">
              <div className="bg-[var(--color-neo-surface)] p-8 max-w-lg w-full brutal-border brutal-shadow space-y-6 animate-in zoom-in-95 duration-200">
                  <div className="flex justify-between items-center border-b-4 border-black pb-4">
                      <h3 className="text-sm font-black text-white font-[Montserrat] uppercase tracking-tighter">Extraction Preview (Page {previewPageIndex + 1})</h3>
                      <button onClick={() => setExtractionPreview(null)} className="text-[var(--color-neo-pink)] hover:text-white font-bold text-xl select-none brutal-border px-2 py-0 bg-black">×</button>
                  </div>
                  <div className="space-y-4">
                      {cropZones.map(zone => (
                          <div key={zone.id} className="bg-[var(--color-neo-bg)] brutal-border p-4 flex justify-between items-center gap-4">
                              <div className="flex items-center gap-3 shrink-0">
                                  <span className="w-6 h-6 flex items-center justify-center text-[10px] font-[Inter] font-black text-black brutal-border bg-white" style={{ backgroundColor: zone.color }}>
                                      {zone.name}
                                  </span>
                                  <span className="text-[10px] font-black text-white font-[Montserrat] uppercase tracking-wider">Zone {zone.name}</span>
                              </div>
                              <span className="text-[10px] font-[Inter] text-black bg-[var(--color-neo-lime)] brutal-border px-3 py-2 max-w-[200px] truncate font-bold uppercase">
                                  {extractionPreview.extractedValues[zone.name] || 'Unknown'}
                              </span>
                          </div>
                      ))}
                      <div className="bg-black brutal-border text-white p-5 space-y-2 mt-4 brutal-shadow-hover">
                          <div className="text-[10px] text-[var(--color-neo-purple)] font-bold uppercase tracking-widest font-[Inter]">Expected Output File Name</div>
                          <div className="text-sm font-black truncate text-[var(--color-neo-white)] font-[Inter]">{extractionPreview.expectedName}</div>
                      </div>
                  </div>
                  <div className="flex justify-end pt-4">
                      <button onClick={() => setExtractionPreview(null)} className="bg-white text-black font-black font-[Montserrat] text-xs py-3 px-8 brutal-btn brutal-shadow-hover uppercase tracking-widest">
                          Close Preview
                      </button>
                  </div>
              </div>
          </div>
      )}

      {/* 2. Loading Spinner */}
      {isPreviewLoading && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50">
              <div className="bg-[var(--color-neo-lime)] p-6 brutal-border brutal-shadow flex items-center gap-6">
                  <div className="w-8 h-8 border-4 border-black border-t-transparent animate-spin"></div>
                  <span className="text-sm font-black font-[Montserrat] text-black uppercase tracking-widest">Extracting Coordinates...</span>
              </div>
          </div>
      )}
    </div>
  );
}
