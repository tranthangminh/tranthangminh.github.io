// Image Edit Overlay Export Operations Module (image_previewmodal-editor-export.js)

function saveEditChanges() {
  if (typeof commitObjectSession === 'function') commitObjectSession();
  const modalImg = document.getElementById('modal-image-preview');
  if (!modalImg || !editCanvas) return;

  const tempCanvas = document.createElement('canvas');
  tempCanvas.width = modalImg.naturalWidth || editCanvas.width;
  tempCanvas.height = modalImg.naturalHeight || editCanvas.height;
  const tempCtx = tempCanvas.getContext('2d');

  const cleanBgUrl = window.originalModalPreviewUrl || modalImg.src;
  const bgImg = new Image();
  bgImg.crossOrigin = 'anonymous';

  bgImg.onload = () => {
    tempCtx.drawImage(bgImg, 0, 0, tempCanvas.width, tempCanvas.height);
    tempCtx.drawImage(editCanvas, 0, 0, tempCanvas.width, tempCanvas.height);

    const mergedDataUrl = tempCanvas.toDataURL('image/png');

    // Trigger browser download without mutating original background image
    const downloadName = window.modalPreviewFilename ? `edited_${window.modalPreviewFilename}` : 'edited_image.png';
    if (typeof window.downloadSingleResource === 'function') {
      window.downloadSingleResource(mergedDataUrl, downloadName);
    } else if (typeof window.downloadSingleImage === 'function') {
      window.downloadSingleImage(mergedDataUrl, downloadName);
    } else {
      const a = document.createElement('a');
      a.href = mergedDataUrl;
      a.download = downloadName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    }

    if (window.showToast) window.showToast('Downloaded edited image!');
  };

  bgImg.onerror = () => {
    // Fallback if image fails cross-origin load
    tempCtx.drawImage(modalImg, 0, 0, tempCanvas.width, tempCanvas.height);
    tempCtx.drawImage(editCanvas, 0, 0, tempCanvas.width, tempCanvas.height);
    const mergedDataUrl = tempCanvas.toDataURL('image/png');
    const downloadName = window.modalPreviewFilename ? `edited_${window.modalPreviewFilename}` : 'edited_image.png';
    const a = document.createElement('a');
    a.href = mergedDataUrl;
    a.download = downloadName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    if (window.showToast) window.showToast('Downloaded edited image!');
  };

  bgImg.src = cleanBgUrl;
}
window.saveEditChanges = saveEditChanges;

function copyEditedImage() {
  if (typeof commitObjectSession === 'function') commitObjectSession();
  const modalImg = document.getElementById('modal-image-preview');
  if (!modalImg || !editCanvas) return;

  const tempCanvas = document.createElement('canvas');
  tempCanvas.width = modalImg.naturalWidth || editCanvas.width;
  tempCanvas.height = modalImg.naturalHeight || editCanvas.height;
  const tempCtx = tempCanvas.getContext('2d');

  const copyBlobToClipboard = (canvas) => {
    canvas.toBlob(async (blob) => {
      if (!blob) {
        if (window.showToast) window.showToast('Failed to copy image');
        return;
      }
      try {
        if (navigator.clipboard && typeof ClipboardItem !== 'undefined') {
          const item = new ClipboardItem({ 'image/png': blob });
          await navigator.clipboard.write([item]);
          if (window.showToast) window.showToast('Copied edited image to clipboard!');
        } else {
          if (window.showToast) window.showToast('Clipboard API not supported');
        }
      } catch (err) {
        console.error('Clipboard write error:', err);
        if (window.showToast) window.showToast('Failed to copy image to clipboard');
      }
    }, 'image/png');
  };

  const cleanBgUrl = window.originalModalPreviewUrl || modalImg.src;
  const bgImg = new Image();
  bgImg.crossOrigin = 'anonymous';

  bgImg.onload = () => {
    tempCtx.drawImage(bgImg, 0, 0, tempCanvas.width, tempCanvas.height);
    tempCtx.drawImage(editCanvas, 0, 0, tempCanvas.width, tempCanvas.height);
    copyBlobToClipboard(tempCanvas);
  };

  bgImg.onerror = () => {
    tempCtx.drawImage(modalImg, 0, 0, tempCanvas.width, tempCanvas.height);
    tempCtx.drawImage(editCanvas, 0, 0, tempCanvas.width, tempCanvas.height);
    copyBlobToClipboard(tempCanvas);
  };

  bgImg.src = cleanBgUrl;
}
window.copyEditedImage = copyEditedImage;
