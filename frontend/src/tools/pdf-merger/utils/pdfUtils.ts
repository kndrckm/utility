/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import { CoverPageConfig, PageNumberConfig } from '../types';

/**
 * Format bytes into readable string (e.g. KB, MB)
 */
export function formatBytes(bytes: number, decimals = 2): string {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}

/**
 * Parses user input for page ranges (e.g., "1-3, 5, 8-6") and translates it to 0-indexed page indices.
 * Supports reverse orders (e.g., "3-1") and repeat pages (e.g., "1,1,2").
 */
export function parsePageRange(rangeStr: string, maxPages: number): number[] {
  const pages: number[] = [];
  const cleanStr = rangeStr.replace(/\s+/g, '');
  
  if (!cleanStr || cleanStr.toLowerCase() === 'all' || cleanStr.toLowerCase() === '') {
    return Array.from({ length: maxPages }, (_, i) => i);
  }

  const parts = cleanStr.split(',');
  for (const part of parts) {
    if (part.includes('-')) {
      const [startStr, endStr] = part.split('-');
      const start = parseInt(startStr, 10);
      const end = parseInt(endStr, 10);
      
      if (!isNaN(start) && !isNaN(end)) {
        if (start <= end) {
          for (let i = start; i <= end; i++) {
            if (i >= 1 && i <= maxPages) {
              pages.push(i - 1);
            }
          }
        } else {
          // Descending ranges (e.g. 3-1)
          for (let i = start; i >= end; i--) {
            if (i >= 1 && i <= maxPages) {
              pages.push(i - 1);
            }
          }
        }
      }
    } else {
      const pageNum = parseInt(part, 10);
      if (!isNaN(pageNum) && pageNum >= 1 && pageNum <= maxPages) {
        pages.push(pageNum - 1);
      }
    }
  }
  return pages;
}

/**
 * Validates a page range string. Returns true if valid format, false otherwise.
 */
export function validateRangeString(rangeStr: string, maxPages: number): { isValid: boolean; error?: string } {
  const cleanStr = rangeStr.replace(/\s+/g, '');
  if (!cleanStr || cleanStr.toLowerCase() === 'all') {
    return { isValid: true };
  }

  const pattern = /^(\d+(-\d+)?)(,\d+(-\d+)?)*$/;
  if (!pattern.test(cleanStr)) {
    return { isValid: false, error: 'Invalid format. Use numbers, hyphens, and commas (e.g., 1-3, 5, 8-10)' };
  }

  const parts = cleanStr.split(',');
  for (const part of parts) {
    if (part.includes('-')) {
      const [startStr, endStr] = part.split('-');
      const start = parseInt(startStr, 10);
      const end = parseInt(endStr, 10);
      if (start < 1 || start > maxPages || end < 1 || end > maxPages) {
        return { isValid: false, error: `Page numbers must be between 1 and ${maxPages}` };
      }
    } else {
      const pageNum = parseInt(part, 10);
      if (pageNum < 1 || pageNum > maxPages) {
        return { isValid: false, error: `Page number ${pageNum} is out of bounds (1 to ${maxPages})` };
      }
    }
  }

  return { isValid: true };
}

/**
 * Hex to normalized RGB object (0.0 to 1.0 values) for pdf-lib
 */
function hexToPdfRgb(hex: string): { r: number; g: number; b: number } {
  const cleanHex = hex.replace('#', '');
  const r = parseInt(cleanHex.substring(0, 2), 16) / 255;
  const g = parseInt(cleanHex.substring(2, 4), 16) / 255;
  const b = parseInt(cleanHex.substring(4, 6), 16) / 255;
  return {
    r: isNaN(r) ? 0.1 : r,
    g: isNaN(g) ? 0.6 : g,
    b: isNaN(b) ? 0.4 : b,
  };
}

/**
 * Creates a cover page as a single-page PDF document
 */
async function createCoverPage(config: CoverPageConfig): Promise<PDFDocument> {
  const pdfDoc = await PDFDocument.create();
  // Standard A4: 595.28 x 841.89 points
  const width = 595.28;
  const height = 841.89;
  const page = pdfDoc.addPage([width, height]);

  // Fonts
  const titleFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const textFont = await pdfDoc.embedFont(StandardFonts.Helvetica);

  const colors = hexToPdfRgb(config.themeColor);
  const primaryColor = rgb(colors.r, colors.g, colors.b);
  const darkGray = rgb(0.15, 0.15, 0.15);
  const lightGray = rgb(0.4, 0.4, 0.4);

  // 1. Draw theme design block (colored stripe on left)
  page.drawRectangle({
    x: 0,
    y: 0,
    width: 24,
    height: height,
    color: primaryColor,
  });

  // 2. Draw fine borders if selected
  if (config.showBorder) {
    page.drawRectangle({
      x: 40,
      y: 40,
      width: width - 80,
      height: height - 80,
      borderColor: rgb(0.85, 0.85, 0.85),
      borderWidth: 1,
    });
  }

  // 3. Write metadata / titles
  // Let's split title into lines if long
  const title = config.title || 'Document Compilation';
  const subtitle = config.subtitle || '';
  const author = config.author || '';
  const dateStr = config.date || new Date().toLocaleDateString();

  // Title rendering (handles multi-line sizing or wrapping)
  let currentY = height - 200;
  page.drawText(title, {
    x: 70,
    y: currentY,
    size: title.length > 30 ? 28 : 36,
    font: titleFont,
    color: darkGray,
    maxWidth: width - 140,
    lineHeight: 42,
  });

  // Accent divider line
  currentY -= title.length > 30 ? 60 : 50;
  page.drawLine({
    start: { x: 70, y: currentY },
    end: { x: 220, y: currentY },
    thickness: 4,
    color: primaryColor,
  });

  // Subtitle
  if (subtitle) {
    currentY -= 40;
    page.drawText(subtitle, {
      x: 70,
      y: currentY,
      size: 16,
      font: textFont,
      color: lightGray,
      maxWidth: width - 140,
      lineHeight: 22,
    });
  }

  // Author and Date block at the bottom
  const footerY = 150;
  
  if (author) {
    page.drawText('PREPARED BY', {
      x: 70,
      y: footerY + 35,
      size: 10,
      font: titleFont,
      color: primaryColor,
    });
    page.drawText(author, {
      x: 70,
      y: footerY + 15,
      size: 14,
      font: textFont,
      color: darkGray,
    });
  }

  page.drawText('DATE', {
    x: 350,
    y: footerY + 35,
    size: 10,
    font: titleFont,
    color: primaryColor,
  });
  page.drawText(dateStr, {
    x: 350,
    y: footerY + 15,
    size: 14,
    font: textFont,
    color: darkGray,
  });

  return pdfDoc;
}

/**
 * Merges multiple PDF files with optional cover page and page numbers
 */
export async function mergePDFs(
  files: { file: File; parsedPages: number[] }[],
  coverConfig: CoverPageConfig,
  pageNumConfig: PageNumberConfig
): Promise<Uint8Array> {
  const mergedPdf = await PDFDocument.create();

  // 1. Add Cover Page if enabled
  if (coverConfig.enabled) {
    const coverPdf = await createCoverPage(coverConfig);
    const [coverPage] = await mergedPdf.copyPages(coverPdf, [0]);
    mergedPdf.addPage(coverPage);
  }

  // 2. Add each file's selected pages
  for (const fileObj of files) {
    const fileBytes = await fileObj.file.arrayBuffer();
    const srcDoc = await PDFDocument.load(fileBytes);
    
    // Copy only the selected pages from this document
    if (fileObj.parsedPages.length > 0) {
      const copiedPages = await mergedPdf.copyPages(srcDoc, fileObj.parsedPages);
      copiedPages.forEach((page) => {
        mergedPdf.addPage(page);
      });
    }
  }

  // 3. Add Page Numbering if enabled
  if (pageNumConfig.enabled) {
    const totalPages = mergedPdf.getPageCount();
    const pages = mergedPdf.getPages();
    const font = await mergedPdf.embedFont(StandardFonts.Helvetica);
    const fontSize = 9;

    // Start index for numbering. If cover page is enabled, we might want to skip it!
    // Let's start page numbering from page index 1 (the second page) if cover page is enabled,
    // or from page 0 otherwise.
    const startIdx = coverConfig.enabled ? 1 : 0;
    const countOffset = coverConfig.enabled ? 1 : 0;

    for (let i = startIdx; i < totalPages; i++) {
      const page = pages[i];
      const { width, height } = page.getSize();
      
      // Page number text: "Page X of Y" (Y excludes cover page if offset)
      const pageNumStr = `${pageNumConfig.prefix} ${i + 1 - countOffset} of ${totalPages - countOffset}`;
      
      // Calculate coordinates based on selected position
      let x = 30;
      let y = 30;

      switch (pageNumConfig.position) {
        case 'top-left':
          x = 30;
          y = height - 30;
          break;
        case 'top-right':
          x = width - 110;
          y = height - 30;
          break;
        case 'bottom-left':
          x = 30;
          y = 30;
          break;
        case 'bottom-right':
        default:
          x = width - 110;
          y = 30;
          break;
      }

      // Draw background tiny box or just text
      page.drawText(pageNumStr, {
        x,
        y,
        size: fontSize,
        font,
        color: rgb(0.5, 0.5, 0.5),
      });
    }
  }

  // Save the merged PDF as bytes
  return await mergedPdf.save();
}
