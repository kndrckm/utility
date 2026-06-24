/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface PDFFileItem {
  id: string;
  file: File;
  name: string;
  size: number; // in bytes
  pageCount: number;
  selectedPagesRange: string; // e.g. "All", "1-3, 5", "2, 1"
  parsedPages: number[]; // actual 0-indexed page indices
  error?: string;
}

export interface CoverPageConfig {
  enabled: boolean;
  title: string;
  subtitle: string;
  author: string;
  date: string;
  themeColor: string; // hex color for style accents
  showBorder: boolean;
}

export interface PageNumberConfig {
  enabled: boolean;
  position: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';
  prefix: string; // e.g. "Page"
}
