export type ComparisonMode = "side-by-side" | "swipe-slider" | "diff-map" | "overlay";

export interface PDFDocumentInfo {
  name: string;
  size: number;
  numPages: number;
  pdfDoc: any; // PDFDocumentProxy from pdfjs
}


export interface TextLineDiff {
  type: "added" | "removed" | "equal" | "modified";
  lineNumA?: number;
  lineNumB?: number;
  textA?: string;
  textB?: string;
}
