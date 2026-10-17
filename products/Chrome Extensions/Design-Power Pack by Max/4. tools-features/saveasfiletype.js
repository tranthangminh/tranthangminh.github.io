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

// Fallback to fetch/convert image in the active tab context
async function convertImageInTab(srcUrl, mimeType) {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab?.id) throw new Error('No active tab available');

  const results = await chrome.scripting.executeScript({
    target: { tabId: tab.id },
    func: async (url, type) => {
      try {
        const resp = await fetch(url);
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
              resolve(canvas.toDataURL(type, 0.95));
            } catch (err) { reject(err); }
          };
          img.onerror = () => reject(new Error('Image load failed'));
          img.src = url;
        });
      }
    },
    args: [srcUrl, mimeType]
  });

  if (results?.[0]?.result) return results[0].result;
  throw new Error('Tab script returned empty result');
}

function blobToDataUrl(blob) {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result);
    reader.readAsDataURL(blob);
  });
}

// Convert image URL to target file format
async function convertAndSaveImage(srcUrl, targetFormat) {
  let ext = targetFormat.toLowerCase();
  const mimeMap = { jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png', webp: 'image/webp', gif: 'image/gif' };
  const mimeType = mimeMap[ext] || 'image/png';
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
    const response = await fetch(srcUrl);
    const blob = await response.blob();

    if (ext === 'gif') {
      if (blob.type.includes('gif') || srcUrl.toLowerCase().includes('.gif')) {
        dataUrl = await blobToDataUrl(blob);
      } else {
        const bitmap = await createImageBitmap(blob);
        const canvas = new OffscreenCanvas(bitmap.width, bitmap.height);
        canvas.getContext('2d').drawImage(bitmap, 0, 0);
        const pngBlob = await canvas.convertToBlob({ type: 'image/png' });
        dataUrl = await blobToDataUrl(new Blob([await pngBlob.arrayBuffer()], { type: 'image/gif' }));
      }
    } else if (ext === 'pdf') {
      const bitmap = await createImageBitmap(blob);
      const canvas = new OffscreenCanvas(bitmap.width, bitmap.height);
      canvas.getContext('2d').drawImage(bitmap, 0, 0);
      const jpegBlob = await canvas.convertToBlob({ type: 'image/jpeg', quality: 0.95 });
      dataUrl = await imageToPdfDataUrl(jpegBlob);
    } else {
      const bitmap = await createImageBitmap(blob);
      const canvas = new OffscreenCanvas(bitmap.width, bitmap.height);
      canvas.getContext('2d').drawImage(bitmap, 0, 0);
      const converted = await canvas.convertToBlob({ type: mimeType, quality: 0.95 });
      dataUrl = await blobToDataUrl(converted);
    }
  } catch {
    try {
      dataUrl = await convertImageInTab(srcUrl, mimeType);
      if (ext === 'pdf' && dataUrl) {
        const b = await (await fetch(dataUrl)).blob();
        dataUrl = await imageToPdfDataUrl(b);
      }
    } catch {}
  }

  downloadSingleResource(dataUrl || srcUrl, filename, { saveAs: true });
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
