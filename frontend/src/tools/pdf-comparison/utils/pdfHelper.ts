/**
 * Dynamically loads PDF.js from a CDN to bypass Vite bundler/worker limitations.
 */
export function loadPdfJs(): Promise<any> {
  return new Promise((resolve, reject) => {
    // If pdfjsLib is already loaded, return it
    if ((window as any).pdfjsLib) {
      resolve((window as any).pdfjsLib);
      return;
    }

    // Check if script is already in document
    const existingScript = document.getElementById("pdfjs-script");
    if (existingScript) {
      existingScript.addEventListener("load", () => {
        resolve((window as any).pdfjsLib);
      });
      existingScript.addEventListener("error", (err) => {
        reject(err);
      });
      return;
    }

    const script = document.createElement("script");
    script.id = "pdfjs-script";
    script.src = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js";
    script.async = true;

    script.onload = () => {
      const pdfjsLib = (window as any).pdfjsLib;
      if (pdfjsLib) {
        // Configure worker CDN
        pdfjsLib.GlobalWorkerOptions.workerSrc =
          "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js";
        resolve(pdfjsLib);
      } else {
        reject(new Error("pdfjsLib was not found on the window object after loading script."));
      }
    };

    script.onerror = (err) => {
      reject(new Error("Failed to load PDF.js CDN script: " + err));
    };

    document.head.appendChild(script);
  });
}
