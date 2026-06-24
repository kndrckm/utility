export const applyMagicWand = (
  imageData: ImageData,
  startX: number,
  startY: number,
  tolerance: number,
  contiguous: boolean
): ImageData => {
  const { width, height, data } = imageData;
  // Create a copy of the pixel data
  const newImageData = new ImageData(new Uint8ClampedArray(data), width, height);
  const newData = newImageData.data;

  const targetIdx = (startY * width + startX) * 4;
  const tr = data[targetIdx];
  const tg = data[targetIdx + 1];
  const tb = data[targetIdx + 2];
  const ta = data[targetIdx + 3];

  if (ta === 0) return newImageData; // Clicked on a transparent pixel

  const colorMatch = (idx: number) => {
    const r = data[idx];
    const g = data[idx + 1];
    const b = data[idx + 2];
    const a = data[idx + 3];

    if (a === 0) return false;

    // Manhattan-like or Euclidean distance
    const dr = r - tr;
    const dg = g - tg;
    const db = b - tb;
    const dist = Math.sqrt(dr * dr + dg * dg + db * db);
    // Max distance is sqrt(3 * 255^2) ≈ 441.67
    return dist <= (tolerance / 100) * 442;
  };

  if (!contiguous) {
    for (let i = 0; i < newData.length; i += 4) {
      if (colorMatch(i)) {
        newData[i + 3] = 0; // Make transparent
      }
    }
    return newImageData;
  }

  // Contiguous Mode (Flood Fill)
  const seen = new Uint8Array(width * height);
  const stack = new Int32Array(width * height * 2);
  let stackPtr = 0;

  stack[stackPtr++] = startX;
  stack[stackPtr++] = startY;
  seen[startY * width + startX] = 1;

  while (stackPtr > 0) {
    const cy = stack[--stackPtr];
    const cx = stack[--stackPtr];

    const idx = (cy * width + cx) * 4;
    newData[idx + 3] = 0; // Make transparent

    // Check neighbors: Left, Right, Up, Down
    if (cx > 0) {
      const nIdx = cy * width + (cx - 1);
      if (!seen[nIdx]) {
        seen[nIdx] = 1;
        if (colorMatch(nIdx * 4)) {
          stack[stackPtr++] = cx - 1; stack[stackPtr++] = cy;
        }
      }
    }
    if (cx < width - 1) {
      const nIdx = cy * width + (cx + 1);
      if (!seen[nIdx]) {
        seen[nIdx] = 1;
        if (colorMatch(nIdx * 4)) {
          stack[stackPtr++] = cx + 1; stack[stackPtr++] = cy;
        }
      }
    }
    if (cy > 0) {
      const nIdx = (cy - 1) * width + cx;
      if (!seen[nIdx]) {
        seen[nIdx] = 1;
        if (colorMatch(nIdx * 4)) {
          stack[stackPtr++] = cx; stack[stackPtr++] = cy - 1;
        }
      }
    }
    if (cy < height - 1) {
      const nIdx = (cy + 1) * width + cx;
      if (!seen[nIdx]) {
        seen[nIdx] = 1;
        if (colorMatch(nIdx * 4)) {
          stack[stackPtr++] = cx; stack[stackPtr++] = cy + 1;
        }
      }
    }
  }

  return newImageData;
};

export const cropCanvas = (canvas: HTMLCanvasElement): boolean => {
  const ctx = canvas.getContext('2d');
  if (!ctx) return false;

  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const { width, height, data } = imageData;
  let minX = width, minY = height, maxX = -1, maxY = -1;

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const alpha = data[(y * width + x) * 4 + 3];
      if (alpha > 0) {
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      }
    }
  }

  if (maxX < 0) return false; // fully transparent or empty

  const newWidth = maxX - minX + 1;
  const newHeight = maxY - minY + 1;

  if (newWidth === width && newHeight === height) return false; // Nothing to trim

  const cropData = ctx.getImageData(minX, minY, newWidth, newHeight);

  canvas.width = newWidth;
  canvas.height = newHeight;
  ctx.putImageData(cropData, 0, 0);

  return true;
};

export const exportSquare = (canvas: HTMLCanvasElement, targetSize: number): string => {
  const out = document.createElement('canvas');
  out.width = targetSize;
  out.height = targetSize;
  const ctx = out.getContext('2d');
  if (!ctx) return '';

  // Calculate the aspect-ratio-preserving square bounds size
  const size = Math.max(canvas.width, canvas.height);

  const sq = document.createElement('canvas');
  sq.width = size;
  sq.height = size;
  const sqCtx = sq.getContext('2d');
  
  if (sqCtx) {
    const dx = (size - canvas.width) / 2;
    const dy = (size - canvas.height) / 2;
    // Draw the image exactly in the center of the bounding square
    sqCtx.drawImage(canvas, dx, dy);
    
    // Scale that square to fit exactly in targetSize x targetSize
    ctx.imageSmoothingEnabled = true; // Use smoothing for scaling
    ctx.drawImage(sq, 0, 0, size, size, 0, 0, targetSize, targetSize);
  }

  return out.toDataURL('image/png');
};
