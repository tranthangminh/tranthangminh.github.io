// Vector Extractor Feature Logic (Streamlined & Anti-Bloat)

let allVectors = [];
let selectedVectors = new Set();
let vectorGridController = null;

if (document.readyState !== 'loading') {
  initVectorExtractor();
} else {
  document.addEventListener('DOMContentLoaded', initVectorExtractor);
}

function initVectorExtractor() {
  const vectorsTabBtn = document.querySelector('[data-subtab="vectors"]');
  if (vectorsTabBtn) {
    vectorsTabBtn.addEventListener('click', () => {
      if (allVectors.length === 0) window.scanPageResources?.();
    });
  }

  document.getElementById('filter-vectors-layout')?.addEventListener('change', filterAndRenderVectors);

  vectorGridController = window.setupDownloaderGridController?.({
    searchInputId: 'vector-search',
    sortSelectId: 'sort-vectors',
    sortPrefKey: 'vectorSortPreference',
    selectAllId: 'select-all-vectors',
    downloadBtnId: 'download-vectors-btn',
    gridContainerId: 'vector-grid-container',
    cardSelector: '.resource-card',
    selectedSet: selectedVectors,
    onFilterChange: filterAndRenderVectors,
    onDownloadSelected: downloadSelectedVectors
  });

  const grid = document.getElementById('vector-grid-container');
  if (grid) {
    grid.addEventListener('error', (e) => {
      if (e.target.tagName === 'IMG') e.target.src = 'svg/icon48.png';
    }, true);

    grid.addEventListener('click', (e) => {
      const card = e.target.closest('.resource-card');
      if (!card) return;
      const idx = parseInt(card.getAttribute('data-id'), 10);
      const vector = allVectors[idx];
      if (!vector) return;

      if (e.target.closest('.preview-btn')) {
        e.stopPropagation();
        const sizeBadge = card.querySelector('.resource-badge-right');
        const previewUrl = vector.type === 'inline' ? window.svgContentToDataUrl(vector.content.trim()) : vector.url;
        window.previewResource?.(previewUrl, vector.filename, sizeBadge?.textContent || 'Vector');
      } else if (e.target.closest('.copy-code-btn')) {
        e.stopPropagation();
        copyVectorCode(vector);
      } else if (e.target.closest('.open-tab-btn')) {
        e.stopPropagation();
        const targetUrl = vector.type === 'inline' ? window.svgContentToDataUrl(vector.content.trim()) : vector.url;
        window.openResourceInNewTab?.(targetUrl);
      } else if (e.target.closest('.download-btn')) {
        e.stopPropagation();
        downloadSingleVector(vector);
      }
    });
  }
}

// ── Master Scanner Integration ──
window.updateVectorsData = function (vectorsList) {
  allVectors = vectorsList || [];
  selectedVectors.clear();
  resolveVectorSizes(allVectors);
  filterAndRenderVectors();
};

window.resetVectorsState = function () {
  allVectors = [];
  selectedVectors.clear();
  vectorGridController?.updateSelectAllState();
  vectorGridController?.updateDownloadBtnState();
};

window.showVectorErrorState = function (message) {
  window.showGridErrorState?.('vector-grid-container', message);
};

// ── Filter & Render ──
function filterAndRenderVectors() {
  const grid = document.getElementById('vector-grid-container');
  const searchInput = document.getElementById('vector-search');
  if (!grid) return;

  const query = searchInput?.value?.toLowerCase().trim() || '';
  const layoutVal = document.getElementById('filter-vectors-layout')?.value || 'all';
  const sortVal = document.getElementById('sort-vectors')?.value || 'none';

  let filtered = allVectors.map((v, i) => ({ ...v, originalIndex: i })).filter(vec => {
    if (vec.failed) return false;
    const nameStr = (vec.filename || '').toLowerCase();
    const srcStr = vec.type === 'url' ? (vec.url || '').toLowerCase() : 'inline';
    return nameStr.includes(query) || srcStr.includes(query);
  });

  if (layoutVal !== 'all') {
    filtered = filtered.filter(vec => {
      if (!vec.width || !vec.height) return true;
      const ratio = vec.width / vec.height;
      if (layoutVal === 'square') return Math.abs(ratio - 1.0) <= 0.05;
      if (layoutVal === 'wide') return ratio > 1.05;
      if (layoutVal === 'tall') return ratio < 0.95;
      return true;
    });
  }

  if (sortVal === 'type') {
    filtered.sort((a, b) => a.type.localeCompare(b.type));
  } else if (sortVal === 'size') {
    filtered.sort((a, b) => (b.sizeInBytes || 0) - (a.sizeInBytes || 0));
  } else if (sortVal === 'name') {
    filtered.sort((a, b) => (a.filename || '').localeCompare(b.filename || ''));
  }

  if (filtered.length === 0) {
    const text = query
      ? (window.i18n ? window.i18n.t('downloader.noVectorsSearch') : 'No vectors found matching your search.')
      : (window.i18n ? window.i18n.t('downloader.emptyVectors') : 'No vector SVG elements found on this page.');
    grid.innerHTML = `<div class="loading-state" style="animation: none;"><p>${text}</p></div>`;
    updateVectorFilterCounts();
    return;
  }

  const t = (k, def) => (window.i18n ? window.i18n.t(k, def) : def);

  grid.innerHTML = filtered.map(vec => {
    const idx = String(vec.originalIndex);
    const isSelected = selectedVectors.has(idx);
    let previewHtml = '';

    if (vec.type === 'inline') {
      previewHtml = `<div class="vector-preview-inline">${vec.content}</div>`;
    } else {
      previewHtml = `<img class="vector-preview-img checkerboard-bg" src="${window.escAttr(vec.url)}" alt="${window.escAttr(vec.filename)}" loading="lazy" />`;
    }

    const sizeLabel = vec.sizeInBytes !== undefined ? window.formatBytes(vec.sizeInBytes) : 'SVG';
    const typeLabel = vec.type === 'inline' ? 'INLINE' : 'SVG';

    return window.createResourceCardHtml({
      id: idx,
      type: 'vector',
      dataAttributes: `data-type="${vec.type}"`,
      previewHtml,
      isSelected,
      badgeLeft: typeLabel,
      badgeRight: sizeLabel,
      actionsHtml: `
        <button class="btn btn-ghost btn-icon preview-btn" title="${t('downloader.previewVector', 'Preview vector')}"><span class="icon-mask" style="mask-image: url('svg/eye.svg'); -webkit-mask-image: url('svg/eye.svg');"></span></button>
        <button class="btn btn-ghost btn-icon copy-code-btn" title="${t('downloader.copySvgCode', 'Copy SVG code')}"><span class="icon-mask" style="mask-image: url('svg/copy.svg'); -webkit-mask-image: url('svg/copy.svg');"></span></button>
        <button class="btn btn-ghost btn-icon open-tab-btn" title="${t('downloader.openNewTab', 'Open in new tab')}"><span class="icon-mask" style="mask-image: url('svg/open-tab.svg'); -webkit-mask-image: url('svg/open-tab.svg');"></span></button>
        <button class="btn btn-ghost btn-icon download-btn" title="${t('downloader.downloadImmediate', 'Download immediately')}"><span class="icon-mask" style="mask-image: url('svg/download.svg'); -webkit-mask-image: url('svg/download.svg');"></span></button>
      `
    });
  }).join('');

  vectorGridController?.updateSelectAllState();
  vectorGridController?.updateDownloadBtnState();

  const countEl = document.getElementById('vector-count-summary');
  if (countEl) {
    const totalActive = allVectors.filter(v => !v.failed).length;
    countEl.textContent = query
      ? (window.i18n ? window.i18n.t('downloader.foundVectorsOf', '{0} of {1} vectors found', [filtered.length, totalActive]) : `${filtered.length} of ${totalActive} vectors found`)
      : (window.i18n ? window.i18n.t('downloader.foundVectors', '{0} vectors found', [totalActive]) : `${totalActive} vectors found`);
  }

  resolveVectorDimensions(filtered);
  updateVectorFilterCounts();
}

function updateVectorFilterCounts() {
  const layoutSelect = document.getElementById('filter-vectors-layout');
  if (!layoutSelect) return;

  const setOpt = window.setOpt;
  let square = 0, wide = 0, tall = 0, layoutAll = 0;

  allVectors.forEach(vec => {
    if (vec.failed) return;
    if (vec.width && vec.height) {
      layoutAll++;
      const ratio = vec.width / vec.height;
      if (Math.abs(ratio - 1.0) <= 0.05) square++;
      else if (ratio > 1.05) wide++;
      else if (ratio < 0.95) tall++;
    }
  });

  const allLayoutsLabel = window.i18n?.t('downloader.allLayouts') || 'All Layouts';
  layoutSelect.options[0].text = `${allLayoutsLabel} (${layoutAll})`;
  setOpt(layoutSelect.options[1], square, window.i18n?.t('downloader.square') || 'Square');
  setOpt(layoutSelect.options[2], wide, window.i18n?.t('downloader.wide') || 'Wide');
  setOpt(layoutSelect.options[3], tall, window.i18n?.t('downloader.tall') || 'Tall');
}

function resolveVectorSizes(vectorsList) {
  vectorsList.forEach(vec => {
    if (vec.sizeInBytes !== undefined) return;
    if (vec.type === 'inline') {
      vec.sizeInBytes = vec.content?.length || 0;
      return;
    }
    if (vec.url?.startsWith('data:')) {
      vec.sizeInBytes = Math.round(vec.url.length * 0.75);
      return;
    }
    window.fetchResourceSize?.(vec.url).then(size => {
      vec.sizeInBytes = size;
      const cards = document.querySelectorAll(`#vector-grid-container .resource-card[data-id="${allVectors.indexOf(vec)}"]`);
      cards.forEach(c => {
        const b = c.querySelector('.resource-badge-right');
        if (b) b.textContent = window.formatBytes(size);
      });
    });
  });
}

function resolveVectorDimensions(vectorsList) {
  vectorsList.forEach(vec => {
    if (vec.width && vec.height) return;
    if (vec.type === 'inline') {
      const match = vec.content.match(/viewBox=["']\s*[\d.-]+\s+[\d.-]+\s+([\d.-]+)\s+([\d.-]+)\s*["']/i);
      if (match) {
        vec.width = parseFloat(match[1]);
        vec.height = parseFloat(match[2]);
      }
    }
  });
}

async function copyVectorCode(vector) {
  try {
    let code = vector.content;
    if (vector.type !== 'inline') {
      window.showToast?.('Fetching SVG code...');
      const res = await fetch(vector.url);
      code = await res.text();
    }
    await navigator.clipboard.writeText(code);
    window.showToast?.('SVG code copied!');
  } catch {
    window.showToast?.('Cannot copy SVG code. Download instead.');
  }
}

function downloadSingleVector(vector) {
  if (vector.type === 'inline') {
    const blob = new Blob([vector.content], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    window.downloadSingleResource?.(url, vector.filename, {
      callback: () => setTimeout(() => URL.revokeObjectURL(url), 2000)
    });
  } else {
    window.downloadSingleResource?.(vector.url, vector.filename || 'vector.svg');
  }
}

function downloadSelectedVectors() {
  const indices = Array.from(selectedVectors).map(Number);
  indices.forEach(idx => {
    const vector = allVectors[idx];
    if (vector && !vector.failed) downloadSingleVector(vector);
  });
  window.showToast?.(`Starting ${indices.length} vector downloads...`);
}
