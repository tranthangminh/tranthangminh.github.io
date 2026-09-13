/**
 * screencapture_full_stitcher.js — MAX Design Power-Pack
 * Offscreen Canvas Slice Crop & Stitching Engine + 16,000px Multi-Part Canvas Splitter
 */

(function (globalScope) {
  const MAX_CANVAS_HEIGHT_LIMIT = 16000;

  /**
   * Convert Data URL to ImageBitmap for OffscreenCanvas
   */
  async function dataUrlToImageBitmap(dataUrl) {
    const response = await fetch(dataUrl);
    const blob = await response.blob();
    return await createImageBitmap(blob);
  }

  /**
   * Stitch screenshot slices into an OffscreenCanvas.
   * Handles last slice crop offset, Retina DPI scaling, format conversion, and 16,000px multi-part splitting.
   *
   * @param {string[]} screenshots         - Array of data URLs, one per captured slice.
   * @param {number[]} scrollSteps         - Actual scroll Y positions measured AFTER each scroll+settle
   *                                         (not the intended target positions). Passed from orchestrator's
   *                                         actualScrollPositions[] array.
   * @param {number}   scrollHeight        - Total scrollable height of the page in CSS pixels.
   * @param {number}   clientHeight        - Visible viewport height in CSS pixels.
   * @param {number}   clientWidth         - Visible viewport width in CSS pixels.
   * @param {number}   devicePixelRatio    - Base device DPR.
   * @param {string}   format             - Output format: 'png' | 'jpg' | 'jpeg' | 'webp'.
   * @param {number|null} scaleMultiplier  - If CDP scaling was used, the combined DPR multiplier; else null.
   * @param {number|null} targetWidth      - Target canvas width (if maxCaptureWidth limit applied).
   * @param {number|null} targetHeight     - Target canvas height (if maxCaptureHeight limit applied).
   */
  async function stitchScreenshotsOffscreen({
    screenshots,
    scrollSteps,
    scrollHeight,
    clientHeight,
    clientWidth,
    devicePixelRatio = 1,
    format = 'png',
    scaleMultiplier = null,
    targetWidth = null,
    targetHeight = null
  }) {
    if (!screenshots || screenshots.length === 0) {
      throw new Error('No screenshot slices provided for stitching.');
    }

    const dpr = scaleMultiplier || devicePixelRatio || 1;
    const baseCanvasWidth = Math.max(1, Math.round((clientWidth || 1920) * dpr));
    const baseCanvasHeight = Math.max(1, Math.round((scrollHeight || 1080) * dpr));

    const canvasWidth = (targetWidth && targetWidth > 0) ? targetWidth : baseCanvasWidth;
    const canvasHeight = (targetHeight && targetHeight > 0) ? targetHeight : baseCanvasHeight;

    const widthScaleRatio = canvasWidth / baseCanvasWidth;
    const sliceHeightPx = Math.max(1, Math.round((clientHeight || 1080) * dpr * widthScaleRatio));

    // Mime type & export format configuration
    let mimeType = 'image/png';
    let quality = 1.0;
    if (format === 'jpeg' || format === 'jpg') {
      mimeType = 'image/jpeg';
      quality = 0.92;
    } else if (format === 'webp') {
      mimeType = 'image/webp';
      quality = 0.92;
    }

    // Check if total canvas height exceeds 16,000px safety limit
    const requiresMultiPart = canvasHeight > MAX_CANVAS_HEIGHT_LIMIT;

    if (!requiresMultiPart) {
      // Single Canvas Stitching
      const canvas = new OffscreenCanvas(canvasWidth, canvasHeight);
      const ctx = canvas.getContext('2d');

      for (let i = 0; i < screenshots.length; i++) {
        const dataUrl = screenshots[i];
        const bitmap = await dataUrlToImageBitmap(dataUrl);

        const targetY = Math.round(scrollSteps[i] * dpr * widthScaleRatio);
        const isLastSlice = i === screenshots.length - 1;

        if (isLastSlice && scrollSteps.length > 1) {
          const actualSliceTopCrop = Math.max(0, bitmap.height - (canvasHeight - targetY));
          const sourceHeight = bitmap.height - actualSliceTopCrop;

          ctx.drawImage(
            bitmap,
            0,
            actualSliceTopCrop,
            bitmap.width,
            sourceHeight,
            0,
            targetY,
            canvasWidth,
            Math.round(sourceHeight * widthScaleRatio)
          );
        } else {
          ctx.drawImage(
            bitmap,
            0,
            0,
            bitmap.width,
            bitmap.height,
            0,
            targetY,
            canvasWidth,
            sliceHeightPx
          );
        }

        if (typeof bitmap.close === 'function') bitmap.close();
      }

      const blob = await canvas.convertToBlob({ type: mimeType, quality: quality });
      const reader = new FileReader();
      const resultDataUrl = await new Promise((resolve, reject) => {
        reader.onloadend = () => resolve(reader.result);
        reader.onerror = reject;
        reader.readAsDataURL(blob);
      });

      return {
        parts: [resultDataUrl],
        format: format,
        width: canvasWidth,
        height: canvasHeight
      };
    } else {
      // Multi-Part Canvas Splitting (> 16,000px safety threshold)
      const partsCount = Math.ceil(canvasHeight / MAX_CANVAS_HEIGHT_LIMIT);
      const partsDataUrls = [];

      for (let partIdx = 0; partIdx < partsCount; partIdx++) {
        const partStartY = partIdx * MAX_CANVAS_HEIGHT_LIMIT;
        const partEndY = Math.min(canvasHeight, (partIdx + 1) * MAX_CANVAS_HEIGHT_LIMIT);
        const currentPartHeight = partEndY - partStartY;

        const partCanvas = new OffscreenCanvas(canvasWidth, currentPartHeight);
        const partCtx = partCanvas.getContext('2d');

        for (let i = 0; i < screenshots.length; i++) {
          const sliceTopY = Math.round(scrollSteps[i] * dpr);
          const sliceBottomY = sliceTopY + sliceHeightPx;

          if (sliceBottomY <= partStartY || sliceTopY >= partEndY) continue;

          const dataUrl = screenshots[i];
          const bitmap = await dataUrlToImageBitmap(dataUrl);

          const drawSourceY = Math.max(0, partStartY - sliceTopY);
          const drawTargetY = Math.max(0, sliceTopY - partStartY);
          const drawHeight = Math.min(sliceHeightPx - drawSourceY, currentPartHeight - drawTargetY);

          partCtx.drawImage(
            bitmap,
            0,
            drawSourceY,
            bitmap.width,
            drawHeight,
            0,
            drawTargetY,
            canvasWidth,
            drawHeight
          );

          if (typeof bitmap.close === 'function') bitmap.close();
        }

        const partBlob = await partCanvas.convertToBlob({ type: mimeType, quality: quality });
        const reader = new FileReader();
        const partDataUrl = await new Promise((resolve, reject) => {
          reader.onloadend = () => resolve(reader.result);
          reader.onerror = reject;
          reader.readAsDataURL(partBlob);
        });

        partsDataUrls.push(partDataUrl);
      }

      return {
        parts: partsDataUrls,
        format: format,
        width: canvasWidth,
        height: canvasHeight
      };
    }
  }

  // Export module to global scope or service worker scope
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = { stitchScreenshotsOffscreen };
  } else {
    globalScope.stitchScreenshotsOffscreen = stitchScreenshotsOffscreen;
  }
})(typeof self !== 'undefined' ? self : this);
