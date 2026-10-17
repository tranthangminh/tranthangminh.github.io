// Image Extractor Feature Logic (Streamlined & Anti-Bloat)

let allImages = [];
let selectedImages = new Set();
let currentScanId = 0;
let imageGridController = null;

if (document.readyState !== 'loading') {
  initImageExtractor();
} else {
  document.addEventListener('DOMContentLoaded', initImageExtractor);
}

function initImageExtractor() {
  const imagesTabBtn = document.querySelector('[data-subtab="images"]');
  if (imagesTabBtn) {
    imagesTabBtn.addEventListener('click', () => {
      if (allImages.length === 0) window.scanPageResources?.();
    });
  }

  // Type & layout filters
  document.getElementById('filter-images-type')?.addEventListener('change', filterAndRenderImages);
  document.getElementById('filter-images-layout')?.addEventListener('change', filterAndRenderImages);

  // Setup shared grid controller
  imageGridController = window.setupDownloaderGridController?.({
    searchInputId: 'image-search',
    sortSelectId: 'sort-images',
    sortPrefKey: 'imageSortPreference',
    selectAllId: 'select-all-images',
    downloadBtnId: 'download-images-btn',
    gridContainerId: 'image-grid-container',
    cardSelector: '.resource-card',
    selectedSet: selectedImages,
    onFilterChange: filterAndRenderImages,
    onDownloadSelected: downloadSelectedImages
  });

  // Action button delegation on grid
  const grid = document.getElementById('image-grid-container');
  if (grid) {
    grid.addEventListener('click', (e) => {
      const card = e.target.closest('.resource-card');
      if (!card) return;
      const url = card.getAttribute('data-url');
      const filename = card.getAttribute('data-filename');

      if (e.target.closest('.preview-btn')) {
        e.stopPropagation();
        const sizeBadge = card.querySelector('.resource-badge-right');
        window.previewResource?.(url, filename, sizeBadge?.textContent || 'Dimensions unknown');
      } else if (e.target.closest('.copy-btn')) {
        e.stopPropagation();
        window.copyResourceToClipboard?.(url);
      } else if (e.target.closest('.open-tab-btn')) {
        e.stopPropagation();
        window.openResourceInNewTab?.(url);
      } else if (e.target.closest('.download-btn')) {
        e.stopPropagation();
        downloadSingleImage(url, filename);
      }
    });
  }
}

// ── Master Scanner Integration ──
window.updateImagesData = function (images) {
  allImages = images || [];
  filterAndRenderImages();
};

window.resetImagesState = function () {
  allImages = [];
  selectedImages.clear();
  imageGridController?.updateSelectAllState();
  imageGridController?.updateDownloadBtnState();
};

window.showImageErrorState = function (message) {
  window.showGridErrorState?.('image-grid-container', message);
};

// ── Filter & Render ──
function filterAndRenderImages() {
  const grid = document.getElementById('image-grid-container');
  const searchInput = document.getElementById('image-search');
  if (!grid) return;

  const query = searchInput?.value?.toLowerCase().trim() || '';
  const typeVal = document.getElementById('filter-images-type')?.value || 'all';
  const layoutVal = document.getElementById('filter-images-layout')?.value || 'all';
  const sortVal = document.getElementById('sort-images')?.value || 'none';

  let filtered = allImages.filter(img => 
    img.url.toLowerCase().includes(query) || (img.filename || '').toLowerCase().includes(query)
  );

  if (typeVal !== 'all') {
    filtered = filtered.filter(img => {
      const ext = getFileExtension(img.url).toLowerCase();
      if (typeVal === 'png') return ext === 'png' || img.url.includes('image/png');
      if (typeVal === 'jpg') return ext === 'jpg' || ext === 'jpeg' || img.url.includes('image/jpeg');
      if (typeVal === 'webp') return ext === 'webp' || img.url.includes('image/webp');
      if (typeVal === 'gif') return ext === 'gif' || img.url.includes('image/gif');
      return false;
    });
  }

  if (layoutVal !== 'all') {
    filtered = filtered.filter(img => {
      if (!img.width || !img.height) return true;
      const ratio = img.width / img.height;
      if (layoutVal === 'square') return Math.abs(ratio - 1.0) <= 0.05;
      if (layoutVal === 'wide') return ratio > 1.05;
      if (layoutVal === 'tall') return ratio < 0.95;
      return true;
    });
  }

  if (sortVal === 'size' || sortVal === 'resolution') {
    filtered.sort((a, b) => ((b.width || 0) * (b.height || 0)) - ((a.width || 0) * (a.height || 0)));
  } else if (sortVal === 'filesize') {
    filtered.sort((a, b) => (b.sizeInBytes || 0) - (a.sizeInBytes || 0));
  } else if (sortVal === 'name') {
    filtered.sort((a, b) => (a.filename || '').localeCompare(b.filename || ''));
  } else if (sortVal === 'type') {
    filtered.sort((a, b) => getFileExtension(a.url).localeCompare(getFileExtension(b.url)));
  }

  if (filtered.length === 0) {
    const text = query
      ? (window.i18n ? window.i18n.t('downloader.noImagesSearch') : 'No images found matching your search.')
      : (window.i18n ? window.i18n.t('downloader.emptyImages') : 'No images found on this page.');
    grid.innerHTML = `<div class="loading-state" style="animation: none;"><p>${text}</p></div>`;
    updateImageFilterCounts();
    return;
  }

  const t = (k, def) => (window.i18n ? window.i18n.t(k, def) : def);

  grid.innerHTML = filtered.map(img => {
    const isSelected = selectedImages.has(img.url);
    const sizeLabel = sortVal === 'size' && img.sizeInBytes !== undefined
      ? window.formatBytes(img.sizeInBytes)
      : (img.width && img.height ? `${img.width}x${img.height}` : 'Resolving...');

    let typeLabel = 'IMG';
    if (img.url.startsWith('data:')) {
      const match = img.url.match(/^data:image\/([a-zA-Z+]+);/);
      typeLabel = match ? match[1].toUpperCase() : 'DATA';
    } else {
      const ext = getFileExtension(img.url);
      if (ext && ext.length <= 5) typeLabel = ext.toUpperCase();
    }

    return window.createResourceCardHtml({
      id: img.url,
      type: 'image',
      dataAttributes: `data-url="${window.escAttr(img.url)}" data-filename="${window.escAttr(img.filename)}"`,
      previewHtml: `<img class="image-preview checkerboard-bg" src="${window.escAttr(img.url)}" alt="${window.escAttr(img.filename)}" loading="lazy" />`,
      isSelected,
      badgeLeft: typeLabel,
      badgeRight: sizeLabel,
      actionsHtml: `
        <button class="btn btn-ghost btn-icon preview-btn" title="${t('downloader.previewImage', 'Preview image')}"><span class="icon-mask" style="mask-image: url('svg/eye.svg'); -webkit-mask-image: url('svg/eye.svg');"></span></button>
        <button class="btn btn-ghost btn-icon copy-btn" title="${t('downloader.copyImageClipboard', 'Copy image to clipboard')}"><span class="icon-mask" style="mask-image: url('svg/copy.svg'); -webkit-mask-image: url('svg/copy.svg');"></span></button>
        <button class="btn btn-ghost btn-icon open-tab-btn" title="${t('downloader.openNewTab', 'Open in new tab')}"><span class="icon-mask" style="mask-image: url('svg/open-tab.svg'); -webkit-mask-image: url('svg/open-tab.svg');"></span></button>
        <button class="btn btn-ghost btn-icon download-btn" title="${t('downloader.downloadImmediate', 'Download immediately')}"><span class="icon-mask" style="mask-image: url('svg/download.svg'); -webkit-mask-image: url('svg/download.svg');"></span></button>
      `
    });
  }).join('');

  imageGridController?.updateSelectAllState();
  imageGridController?.updateDownloadBtnState();

  const countEl = document.getElementById('image-count-summary');
  if (countEl) {
    countEl.textContent = query
      ? (window.i18n ? window.i18n.t('downloader.foundImagesOf', '{0} of {1} images found', [filtered.length, allImages.length]) : `${filtered.length} of ${allImages.length} images found`)
      : (window.i18n ? window.i18n.t('downloader.foundImages', '{0} images found', [allImages.length]) : `${allImages.length} images found`);
  }

  resolveImageDimensions(filtered);
  updateImageFilterCounts();
}

function updateImageFilterCounts() {
  const typeSelect = document.getElementById('filter-images-type');
  const layoutSelect = document.getElementById('filter-images-layout');
  if (!typeSelect && !layoutSelect) return;

  const setOpt = window.setOpt;
  let png = 0, jpg = 0, webp = 0, gif = 0;
  let square = 0, wide = 0, tall = 0, layoutAll = 0;

  allImages.forEach(img => {
    const ext = getFileExtension(img.url).toLowerCase();
    if (ext === 'png' || img.url.includes('image/png')) png++;
    else if (ext === 'jpg' || ext === 'jpeg' || img.url.includes('image/jpeg')) jpg++;
    else if (ext === 'webp' || img.url.includes('image/webp')) webp++;
    else if (ext === 'gif' || img.url.includes('image/gif')) gif++;

    if (img.width && img.height) {
      layoutAll++;
      const ratio = img.width / img.height;
      if (Math.abs(ratio - 1.0) <= 0.05) square++;
      else if (ratio > 1.05) wide++;
      else if (ratio < 0.95) tall++;
    }
  });

  const total = allImages.length;
  const allLabel = window.i18n?.t('common.all') || 'All';
  const allLayoutsLabel = window.i18n?.t('downloader.allLayouts') || 'All Layouts';

  if (typeSelect) {
    typeSelect.options[0].text = `${allLabel} (${total})`;
    setOpt(typeSelect.options[1], png, 'PNG');
    setOpt(typeSelect.options[2], jpg, 'JPG');
    setOpt(typeSelect.options[3], webp, 'WEBP');
    setOpt(typeSelect.options[4], gif, 'GIF');
  }
  if (layoutSelect) {
    layoutSelect.options[0].text = `${allLayoutsLabel} (${layoutAll})`;
    setOpt(layoutSelect.options[1], square, window.i18n?.t('downloader.square') || 'Square');
    setOpt(layoutSelect.options[2], wide, window.i18n?.t('downloader.wide') || 'Wide');
    setOpt(layoutSelect.options[3], tall, window.i18n?.t('downloader.tall') || 'Tall');
  }
}

function resolveImageDimensions(imagesList) {
  const unresolved = imagesList.filter(img => !img.width || !img.height);
  currentScanId++;
  const myScanId = currentScanId;

  imagesList.forEach(img => {
    window.fetchResourceSize?.(img.url).then(size => {
      img.sizeInBytes = size;
      if (document.getElementById('sort-images')?.value === 'size') {
        const cards = document.querySelectorAll(`#image-grid-container .resource-card[data-url="${CSS.escape(img.url)}"]`);
        cards.forEach(c => {
          const b = c.querySelector('.resource-badge-right');
          if (b) b.textContent = window.formatBytes(size);
        });
      }
    });

    if (img.width && img.height) return;

    const temp = new Image();
    temp.onload = () => {
      if (myScanId !== currentScanId) return;
      img.width = temp.naturalWidth;
      img.height = temp.naturalHeight;

      const cards = document.querySelectorAll(`#image-grid-container .resource-card[data-url="${CSS.escape(img.url)}"]`);
      cards.forEach(c => {
        const b = c.querySelector('.resource-badge-right');
        if (b) b.textContent = `${temp.naturalWidth}x${temp.naturalHeight}`;
      });
    };
    temp.src = img.url;
  });
}

function downloadSingleImage(url, filename) {
  window.downloadSingleResource?.(url, filename);
}
window.downloadSingleImage = downloadSingleImage;

function downloadSelectedImages() {
  const urls = Array.from(selectedImages);
  if (urls.length === 0) return;

  urls.forEach(url => {
    const imgInfo = allImages.find(img => img.url === url);
    window.downloadSingleResource?.(url, imgInfo?.filename || '');
  });
  window.showToast?.(`Starting ${urls.length} image downloads...`);
}

function getFileExtension(url) {
  if (url.startsWith('data:')) {
    const match = url.match(/^data:image\/([a-zA-Z+]+);/);
    return match ? match[1].toLowerCase() : '';
  }
  const clean = url.split(/[?#]/)[0].toLowerCase();
  const idx = clean.lastIndexOf('.');
  return idx !== -1 ? clean.substring(idx + 1) : '';
}
