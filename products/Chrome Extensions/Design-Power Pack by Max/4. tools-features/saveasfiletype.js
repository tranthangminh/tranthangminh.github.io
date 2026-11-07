/**
 * saveasfiletype.js — Design-Power Pack by Max
 * Save Image As Type Context Menu Tool (JPG, PNG, WebP, GIF, PDF)
 */

// Convert image blob to valid PDF 1.4 Data URL
async function imageToPdfDataUrl(jpegBlob) {
  const bytes = new Uint8Array(await jpegBlob.arrayBuffer());
  const bitmap = await createImageBitmap(jpegBlob);
  const { width: w, height: h } = bitmap;

  const header = '%PDF-1.4\n';
  const obj1 = '1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n';
  const obj2 = '2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n';
  const obj3 = `3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${w} ${h}] /Resources << /XObject << /Im1 4 0 R >> >> /Contents 5 0 R >>\nendobj\n`;
  const streamText = `q\n${w} 0 0 ${h} 0 0 cm\n/Im1 Do\nQ\n`;
  const obj5 = `5 0 obj\n<< /Length ${streamText.length} >>\nstream\n${streamText}endstream\nendobj\n`;
  const obj4Head = `4 0 obj\n<< /Type /XObject /Subtype /Image /Width ${w} /Height ${h} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${bytes.length} >>\nstream\n`;
  const obj4Tail = '\nendstream\nendobj\n';

  const enc = new TextEncoder();
  const parts = [
    enc.encode(header),
    enc.encode(obj1),
    enc.encode(obj2),
    enc.encode(obj3),
    enc.encode(obj4Head),
    bytes,
    enc.encode(obj4Tail),
    enc.encode(obj5)
  ];

  let offset = header.length;
  const offsets = [0, offset];
  offset += enc.encode(obj1).length; offsets.push(offset);
  offset += enc.encode(obj2).length; offsets.push(offset);
  offset += enc.encode(obj3).length; offsets.push(offset);
  offset += enc.encode(obj4Head).length + bytes.length + enc.encode(obj4Tail).length; offsets.push(offset);
  offset += enc.encode(obj5).length;

  let xref = 'xref\n0 6\n0000000000 65535 f \n';
  for (let i = 1; i <= 5; i++) {
    xref += String(offsets[i]).padStart(10, '0') + ' 00000 n \n';
  }
  const trailer = `trailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n${offset}\n%%EOF\n`;
  parts.push(enc.encode(xref), enc.encode(trailer));

  const pdfBlob = new Blob(parts, { type: 'application/pdf' });
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result);
    reader.readAsDataURL(pdfBlob);
  });
}

// Minimal GIF89a encoder: 252-color RGB cube with Bayer dithering; palette index 252 is transparent.
function encodeGif(width, height, rgba) {
  const TRANSPARENT_INDEX = 252;
  const BAYER_4X4 = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];
  const palette = new Uint8Array(768);
  for (let i = 0; i < TRANSPARENT_INDEX; i++) {
    palette[i * 3] = Math.round(Math.floor(i / 42) * 51);
    palette[i * 3 + 1] = Math.round((Math.floor(i / 6) % 7) * 42.5);
    palette[i * 3 + 2] = (i % 6) * 51;
  }

  const lzw = [];
  let codeSize = 9, nextCode = 258, bitBuffer = 0, bitCount = 0, dictionary = new Map(), prefix = -1;
  const emit = (code) => {
    bitBuffer |= code << bitCount;
    bitCount += codeSize;
    while (bitCount >= 8) {
      lzw.push(bitBuffer & 255);
      bitBuffer >>>= 8;
      bitCount -= 8;
    }
  };

  emit(256);
  for (let i = 0; i < width * height; i++) {
    const x = i % width, y = Math.floor(i / width), p = i * 4;
    const threshold = (BAYER_4X4[(y & 3) * 4 + (x & 3)] + 0.5) / 16 - 0.5;
    const pixel = rgba[p + 3] < 128
      ? TRANSPARENT_INDEX
      : Math.round(rgba[p] / 51 + threshold) * 42 + Math.round(rgba[p + 1] / 42.5 + threshold) * 6 + Math.round(rgba[p + 2] / 51 + threshold);
    if (prefix < 0) {
      prefix = pixel;
      continue;
    }
    const key = prefix * 256 + pixel;
    const known = dictionary.get(key);
    if (known !== undefined) {
      prefix = known;
      continue;
    }
    emit(prefix);
    if (nextCode === 4096) {
      emit(256);
      dictionary = new Map();
      nextCode = 258;
      codeSize = 9;
    } else {
      if (nextCode >= (1 << codeSize)) codeSize++;
      dictionary.set(key, nextCode++);
    }
    prefix = pixel;
  }
  emit(prefix);
  emit(257);
  if (bitCount > 0) lzw.push(bitBuffer & 255);

  const u16 = (n) => [n & 255, n >> 8];
  const blocks = [];
  for (let i = 0; i < lzw.length; i += 255) {
    const block = lzw.slice(i, i + 255);
    blocks.push(new Uint8Array([block.length, ...block]));
  }
  return new Blob([
    new TextEncoder().encode('GIF89a'),
    new Uint8Array([...u16(width), ...u16(height), 0xF7, 0, 0]),
    palette,
    new Uint8Array([0x21, 0xF9, 4, 1, 0, 0, TRANSPARENT_INDEX, 0]),
    new Uint8Array([0x2C, 0, 0, 0, 0, ...u16(width), ...u16(height), 0, 8]),
    ...blocks,
    new Uint8Array([0, 0x3B])
  ], { type: 'image/gif' });
}

// Retry inside the active tab, where page-protected images can still load. Returns source bytes; the caller converts.
async function fetchImageBlobInTab(srcUrl) {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab?.id) throw new Error('No active tab available');

  const results = await chrome.scripting.executeScript({
    target: { tabId: tab.id },
    func: async (url) => {
      try {
        const resp = await fetch(url);
        if (!resp.ok) throw new Error('Fetch failed');
        const blob = await resp.blob();
        return await new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onloadend = () => resolve(reader.result);
          reader.onerror = reject;
          reader.readAsDataURL(blob);
        });
      } catch {
        return new Promise((resolve, reject) => {
          const img = new Image();
          img.crossOrigin = 'anonymous';
          img.onload = () => {
            try {
              const canvas = document.createElement('canvas');
              canvas.width = img.naturalWidth;
              canvas.height = img.naturalHeight;
              canvas.getContext('2d').drawImage(img, 0, 0);
              resolve(canvas.toDataURL('image/png'));
            } catch (err) { reject(err); }
          };
          img.onerror = () => reject(new Error('Image load failed'));
          img.src = url;
        });
      }
    },
    args: [srcUrl]
  });

  if (results?.[0]?.result) return (await fetch(results[0].result)).blob();
  throw new Error('Tab script returned empty result');
}

function blobToDataUrl(blob) {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result);
    reader.readAsDataURL(blob);
  });
}

async function encodeImageBlob(blob, ext) {
  // Real GIF sources keep their original bytes so animation survives.
  if (ext === 'gif' && await blob.slice(0, 3).text() === 'GIF') return blobToDataUrl(blob);

  const bitmap = await createImageBitmap(blob);
  const canvas = new OffscreenCanvas(bitmap.width, bitmap.height);
  const ctx = canvas.getContext('2d');
  ctx.drawImage(bitmap, 0, 0);
  bitmap.close();

  if (ext === 'gif') {
    return blobToDataUrl(encodeGif(canvas.width, canvas.height, ctx.getImageData(0, 0, canvas.width, canvas.height).data));
  }
  const mimeMap = { jpg: 'image/jpeg', png: 'image/png', webp: 'image/webp', pdf: 'image/jpeg' };
  const converted = await canvas.convertToBlob({ type: mimeMap[ext] || 'image/png', quality: 0.95 });
  return ext === 'pdf' ? imageToPdfDataUrl(converted) : blobToDataUrl(converted);
}

// Convert image URL to target file format
async function convertAndSaveImage(srcUrl, targetFormat) {
  let ext = targetFormat.toLowerCase();
  if (ext === 'jpeg') ext = 'jpg';

  let baseName = 'image';
  try {
    const pathname = new URL(srcUrl).pathname;
    const filePart = pathname.substring(pathname.lastIndexOf('/') + 1);
    baseName = filePart.includes('.') ? filePart.substring(0, filePart.lastIndexOf('.')) : (filePart || 'image');
  } catch {}

  const filename = `${baseName}.${ext}`;
  let dataUrl = null;

  try {
    dataUrl = await encodeImageBlob(await (await fetch(srcUrl)).blob(), ext);
  } catch {
    try {
      dataUrl = await encodeImageBlob(await fetchImageBlobInTab(srcUrl), ext);
    } catch {}
  }

  // When conversion fails, save the source under its own name rather than label it with a format it is not.
  downloadSingleResource(dataUrl || srcUrl, dataUrl ? filename : '', { saveAs: true });
}

// Context Menu Spec Provider
function getSaveAsContextMenuSpecs(data, lang = 'vi') {
  if (data.saveAsFileTypeEnabled === false) return [];
  const isVi = lang === 'vi';
  const formats = [
    { key: 'png',  id: 'save_as_png',  title: isVi ? '🖼️ Lưu ảnh dạng PNG' : '🖼️ Save Image as PNG' },
    { key: 'jpg',  id: 'save_as_jpg',  title: isVi ? '🖼️ Lưu ảnh dạng JPG' : '🖼️ Save Image as JPG' },
    { key: 'webp', id: 'save_as_webp', title: isVi ? '🖼️ Lưu ảnh dạng WebP' : '🖼️ Save Image as WebP' },
    { key: 'gif',  id: 'save_as_gif',  title: isVi ? '🖼️ Lưu ảnh dạng GIF' : '🖼️ Save Image as GIF' },
    { key: 'pdf',  id: 'save_as_pdf',  title: isVi ? '📄 Lưu ảnh dạng PDF' : '📄 Save Image as PDF' }
  ];

  return formats
    .filter(f => data[`saveAsFileType_${f.key}`] !== false)
    .map(f => ({
      id: f.id,
      parentId: 'max_tools_parent',
      title: f.title,
      contexts: ['page', 'selection', 'link', 'image', 'video']
    }));
}

// Context Menu Action Handler
function handleSaveAsContextMenuClick(info, tab) {
  if (['save_as_jpg', 'save_as_png', 'save_as_webp', 'save_as_gif', 'save_as_pdf'].includes(info.menuItemId)) {
    // Priority 1: If Chrome natively detected the image URL, convert & save directly
    if (info.srcUrl) {
      executeFallbackAction(info.menuItemId, info.srcUrl);
      return true;
    }
    // Priority 2: When right-clicked on wrapper/overlay, query content script to inspect elements under cursor
    if (typeof routeContextMenuToContentScript === 'function') {
      routeContextMenuToContentScript(info, tab);
    }
    return true;
  }
  return false;
}

// Direct Context Action Fallback
function executeFallbackAction(menuItemId, srcUrl) {
  if (!srcUrl) return;
  const searchMap = {
    yandex_search_image: typeof performYandexImageSearch === 'function' ? performYandexImageSearch : searchImageOnYandex,
    tineye_search_image: typeof performTinEyeImageSearch === 'function' ? performTinEyeImageSearch : searchImageOnTinEye
  };
  if (searchMap[menuItemId]) {
    searchMap[menuItemId](srcUrl);
    return;
  }
  const format = menuItemId.replace('save_as_', '');
  if (['jpg', 'png', 'webp', 'gif', 'pdf'].includes(format)) {
    convertAndSaveImage(srcUrl, format);
  }
}

// Exports
(function(g) {
  g.getSaveAsContextMenuSpecs = getSaveAsContextMenuSpecs;
  g.handleSaveAsContextMenuClick = handleSaveAsContextMenuClick;
  g.convertAndSaveImage = convertAndSaveImage;
  g.executeFallbackAction = executeFallbackAction;
})(typeof self !== 'undefined' ? self : (typeof window !== 'undefined' ? window : globalThis));
