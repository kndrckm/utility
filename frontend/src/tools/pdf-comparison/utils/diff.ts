import { TextLineDiff } from "../types";

/**
 * Computes a pixel-by-pixel visual difference between Canvas A and Canvas B,
 * drawing the resulting highlight overlay onto a Diff Canvas.
 */
export function computeVisualDiff(
  ctxA: CanvasRenderingContext2D,
  ctxB: CanvasRenderingContext2D,
  ctxDiff: CanvasRenderingContext2D,
  width: number,
  height: number,
  threshold: number = 30
): { diffPixelCount: number; diffPercentage: number } {
  // Clear the diff canvas first
  ctxDiff.clearRect(0, 0, width, height);

  // Get image data
  let imgDataA: ImageData;
  let imgDataB: ImageData;

  try {
    imgDataA = ctxA.getImageData(0, 0, width, height);
    imgDataB = ctxB.getImageData(0, 0, width, height);
  } catch (e) {
    console.error("Unable to get image data for visual diff (likely cross-origin canvas issues):", e);
    return { diffPixelCount: 0, diffPercentage: 0 };
  }

  const dataA = imgDataA.data;
  const dataB = imgDataB.data;

  // Create a new image data for output
  const imgDataDiff = ctxDiff.createImageData(width, height);
  const dataDiff = imgDataDiff.data;

  let diffPixelCount = 0;
  const totalPixels = width * height;

  for (let i = 0; i < dataA.length; i += 4) {
    const rA = dataA[i];
    const gA = dataA[i + 1];
    const bA = dataA[i + 2];
    const aA = dataA[i + 3];

    const rB = dataB[i];
    const gB = dataB[i + 1];
    const bB = dataB[i + 2];
    const aB = dataB[i + 3];

    // Calculate absolute differences
    const diffR = Math.abs(rA - rB);
    const diffG = Math.abs(gA - gB);
    const diffB = Math.abs(bA - bB);
    const diffA = Math.abs(aA - aB);

    // Color distance
    const distance = (diffR + diffG + diffB) / 3;

    if (distance > threshold || diffA > 40) {
      // It's a different pixel! Paint it high-visibility magenta/red
      dataDiff[i] = 225;     // Red
      dataDiff[i + 1] = 29;  // Green
      dataDiff[i + 2] = 72;  // Blue
      dataDiff[i + 3] = 220; // Opacity (solid overlay)
      diffPixelCount++;
    } else {
      // Paint a faint, semi-transparent blend of Document A in gray to give spatial context
      const gray = Math.round((rA + gA + bA) / 3);
      dataDiff[i] = gray;
      dataDiff[i + 1] = gray;
      dataDiff[i + 2] = gray;
      dataDiff[i + 3] = aA > 0 ? 30 : 0; // Very faint background
    }
  }

  ctxDiff.putImageData(imgDataDiff, 0, 0);

  const diffPercentage = parseFloat(((diffPixelCount / totalPixels) * 100).toFixed(2));
  return { diffPixelCount, diffPercentage };
}

/**
 * Align lines of text using Longest Common Subsequence (LCS)
 * to output line-by-line differences.
 */
export function generateTextDiff(textA: string, textB: string): TextLineDiff[] {
  const linesA = textA.split("\n").map(l => l.trim()).filter(l => l.length > 0);
  const linesB = textB.split("\n").map(l => l.trim()).filter(l => l.length > 0);

  const m = linesA.length;
  const n = linesB.length;

  // Initialize DP table
  const dp: number[][] = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0));

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (linesA[i - 1] === linesB[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1] + 1;
      } else {
        dp[i][j] = Math.max(dp[i - 1][j], dp[i][j - 1]);
      }
    }
  }

  // Backtrack to build the alignment
  const diffs: TextLineDiff[] = [];
  let i = m;
  let j = n;

  while (i > 0 || j > 0) {
    if (i > 0 && j > 0 && linesA[i - 1] === linesB[j - 1]) {
      diffs.push({
        type: "equal",
        lineNumA: i,
        lineNumB: j,
        textA: linesA[i - 1],
        textB: linesB[j - 1]
      });
      i--;
      j--;
    } else if (j > 0 && (i === 0 || dp[i][j - 1] >= dp[i - 1][j])) {
      diffs.push({
        type: "added",
        lineNumB: j,
        textB: linesB[j - 1]
      });
      j--;
    } else {
      diffs.push({
        type: "removed",
        lineNumA: i,
        textA: linesA[i - 1]
      });
      i--;
    }
  }

  diffs.reverse();

  // post-process adjacent add/remove as "modified" to render nicer in the UI
  const mergedDiffs: TextLineDiff[] = [];
  for (let k = 0; k < diffs.length; k++) {
    const curr = diffs[k];
    const next = diffs[k + 1];

    if (curr.type === "removed" && next && next.type === "added") {
      mergedDiffs.push({
        type: "modified",
        lineNumA: curr.lineNumA,
        lineNumB: next.lineNumB,
        textA: curr.textA,
        textB: next.textB
      });
      k++; // Skip next
    } else {
      mergedDiffs.push(curr);
    }
  }

  return mergedDiffs;
}
