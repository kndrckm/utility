export type ComparisonMode = "side-by-side" | "swipe-slider" | "overlay";

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

export interface PDFAnnotation {
  id: string;
  subtype: string;
  contents: string;
  title?: string;
  rect: number[];
  color?: number[];
  creationDate?: string;
}
