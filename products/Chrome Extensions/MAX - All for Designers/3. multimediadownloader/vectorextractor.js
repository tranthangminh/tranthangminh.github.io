// Vector Extractor Feature Logic

let allVectors = [];
let selectedVectors = new Set();
let totalVectorsToLoad = 0;
let loadedVectorsCount = 0;

if (document.readyState !== 'loading') {
  initVectorExtractor();
} else {
  document.addEventListener('DOMContentLoaded', initVectorExtractor);
}

function initVectorExtractor() {
  const vectorsTabBtn = document.querySelector('[data-subtab="vectors"]');
  const searchInput = document.getElementById('vector-search');
  const selectAllCheckbox = document.getElementById('select-all-vectors');
  const downloadBtn = document.getElementById('download-vectors-btn');
  const gridContainer = document.getElementById('vector-grid-container');



  // Handle Refresh Button click (runs unified scan)
  const refreshBtn = document.getElementById('refresh-vectors-btn');
  if (refreshBtn) {
    refreshBtn.addEventListener('click', () => {
      if (typeof window.scanPageResources === 'function') {
        window.scanPageResources();
      }
    });
  }

  // Handle Search Input
  if (searchInput) {
    searchInput.addEventListener('input', () => {
      filterAndRenderVectors();
    });
  }

  // Handle Sort Selector
  const sortSelect = document.getElementById('sort-vectors');
  if (sortSelect) {
    chrome.storage.local.get({ vectorSortPreference: 'none' }, (data) => {
      if (data.vectorSortPreference) {
        sortSelect.value = data.vectorSortPreference;
        if (allVectors.length > 0) {
          filterAndRenderVectors();
        }
      }
    });

    sortSelect.addEventListener('change', () => {
      const val = sortSelect.value;
      chrome.storage.local.set({ vectorSortPreference: val }, () => {
        filterAndRenderVectors();
      });
    });

    const layoutFilter = document.getElementById('filter-vectors-layout');
    if (layoutFilter) {
      layoutFilter.addEventListener('change', () => {
        filterAndRenderVectors();
      });
    }
  }

  // Handle Select All Checkbox
  if (selectAllCheckbox) {
    selectAllCheckbox.addEventListener('change', (e) => {
      const isChecked = e.target.checked;
      const visibleCards = gridContainer.querySelectorAll('.vector-card');
      
      visibleCards.forEach(card => {
        const id = card.getAttribute('data-id');
        const checkbox = card.querySelector('.card-checkbox');
        
        if (isChecked) {
          card.classList.add('selected');
          if (checkbox) checkbox.checked = true;
          selectedVectors.add(id);
        } else {
          card.classList.remove('selected');
          if (checkbox) checkbox.checked = false;
          selectedVectors.delete(id);
        }
      });

      updateVectorDownloadButtonState();
    });
  }

  // Handle Bulk Download Button
  if (downloadBtn) {
    downloadBtn.addEventListener('click', () => {
      if (selectedVectors.size === 0) return;
      downloadSelectedVectors();
    });
  }

  // Card Event Delegation (selecting cards, copying code, downloading)
  if (gridContainer) {
    // Listen for image loading errors in capture phase to replace with fallback icon (avoids inline onerror CSP violations)
    gridContainer.addEventListener('error', (e) => {
      if (e.target.tagName === 'IMG') {
        e.target.src = 'svg/icon48.png';
      }
    }, true);

    gridContainer.addEventListener('click', (e) => {
      const card = e.target.closest('.resource-card');
      if (!card) return;

      const id = card.getAttribute('data-id');
      const index = parseInt(id);
      const vector = allVectors[index];
      if (!vector) return;

      // 1. Handle Preview button click (Eye Icon)
      if (e.target.closest('.preview-btn')) {
        e.stopPropagation();
        const sizeBadge = card.querySelector('.resource-badge-right');
        const sizeLabel = sizeBadge ? sizeBadge.textContent : 'Vector';
        
        let previewUrl = '';
        if (vector.type === 'inline') {
          let content = vector.content.trim();
          previewUrl = window.svgContentToDataUrl(content);
        } else {
          previewUrl = vector.url;
        }
        
        window.previewResource(previewUrl, vector.filename, sizeLabel);
        return;
      }

      // 2. Handle Copy SVG Code button click
      if (e.target.closest('.copy-code-btn')) {
        e.stopPropagation();
        copyVectorCode(vector);
        return;
      }

      // 3. Handle Download button click
      if (e.target.closest('.download-btn')) {
        e.stopPropagation();
        downloadSingleVector(vector);
        return;
      }

      // Handle Open in New Tab click
      if (e.target.closest('.open-tab-btn')) {
        e.stopPropagation();
        let targetUrl = '';
        if (vector.type === 'inline') {
          let content = vector.content.trim();
          targetUrl = window.svgContentToDataUrl(content);
        } else {
          targetUrl = vector.url;
        }
        window.openResourceInNewTab(targetUrl);
        return;
      }

      // 3. Handle card selection click
      const checkbox = card.querySelector('.card-checkbox');
      if (card.classList.contains('selected')) {
        card.classList.remove('selected');
        if (checkbox) checkbox.checked = false;
        selectedVectors.delete(id);
      } else {
        card.classList.add('selected');
        if (checkbox) checkbox.checked = true;
        selectedVectors.add(id);
      }

      updateVectorSelectAllState();
      updateVectorDownloadButtonState();
    });
  }
}

// Global methods exposed to coordinate with unified cào scan
window.updateVectorsData = function(vectorsList) {
  allVectors = vectorsList;
  selectedVectors.clear();
  updateVectorDownloadButtonState();
  const selectAllCheckbox = document.getElementById('select-all-vectors');
  if (selectAllCheckbox) selectAllCheckbox.checked = false;
  
  resolveVectorSizes(allVectors);
  filterAndRenderVectors();
};

window.resetVectorsState = function() {
  allVectors = [];
  selectedVectors.clear();
  updateVectorDownloadButtonState();
  const selectAllCheckbox = document.getElementById('select-all-vectors');
  if (selectAllCheckbox) selectAllCheckbox.checked = false;
};

window.showVectorErrorState = showVectorErrorState;

// Filter and Render vectors in the grid
function filterAndRenderVectors() {
  const gridContainer = document.getElementById('vector-grid-container');
  const searchInput = document.getElementById('vector-search');
  if (!gridContainer) return;

  const searchQuery = searchInput ? searchInput.value.toLowerCase().trim() : '';

  // Get active layout filter value
  const layoutFilter = document.getElementById('filter-vectors-layout');
  const layoutVal = layoutFilter ? layoutFilter.value : 'all';

  let filtered = allVectors.filter((vec, index) => {
    if (vec.failed) return false;
    const nameStr = vec.filename.toLowerCase();
    const sourceStr = vec.type === 'url' ? vec.url.toLowerCase() : 'inline';
    return nameStr.includes(searchQuery) || sourceStr.includes(searchQuery);
  });

  // Apply layout aspect ratio filter
  if (layoutVal !== 'all') {
    filtered = filtered.filter(vec => {
      if (!vec.width || !vec.height) return true; // keep unresolved elements so they load natural dimensions
      const ratio = vec.width / vec.height;
      if (layoutVal === 'square') {
        return Math.abs(ratio - 1.0) <= 0.05; // 1:1 ± 5%
      } else if (layoutVal === 'wide') {
        return ratio > 1.05;
      } else if (layoutVal === 'tall') {
        return ratio < 0.95;
      }
      return true;
    });
  }

  // Apply sorting
  const sortSelect = document.getElementById('sort-vectors');
  const sortVal = sortSelect ? sortSelect.value : 'none';
  if (sortVal === 'type') {
    filtered.sort((a, b) => a.type.localeCompare(b.type));
  } else if (sortVal === 'size') {
    filtered.sort((a, b) => (b.sizeInBytes || 0) - (a.sizeInBytes || 0));
  } else if (sortVal === 'name') {
    filtered.sort((a, b) => (a.filename || '').localeCompare(b.filename || ''));
  }

  if (filtered.length === 0) {
    const text = searchQuery ? 'No vectors found matching your search.' : 'No vectors found on this page.';
    gridContainer.innerHTML = `
      <div class="loading-state" style="animation: none;">
        <p>${text}</p>
      </div>
    `;
    return;
  }

  gridContainer.innerHTML = filtered.map((vec) => {
    const originalIndex = allVectors.findIndex(v => v === vec);
    const isSelected = selectedVectors.has(originalIndex.toString());
    
    // Choose badgeRight label based on current sort type
    let sizeLabel = (vec.width && vec.height) ? `${vec.width}x${vec.height}` : 'Vector';
    if (sortVal === 'size') {
      sizeLabel = vec.sizeInBytes !== undefined ? formatBytes(vec.sizeInBytes) : 'Resolving...';
    }
    
    const typeLabel = vec.type === 'inline' ? 'INLINE' : 'URL';

    let previewWrapped = '';
    if (vec.type === 'inline') {
      let content = vec.content ? vec.content.trim() : '';
      content = content.replace(/<script[\s\S]*?<\/script>/gi, '');
      // [D9] Shared helper handles xmlns injection + base64 encoding
      const srcUrl = window.svgContentToDataUrl(content);
      previewWrapped = `<img class="image-preview checkerboard-bg" src="${window.escAttr(srcUrl)}" alt="${window.escAttr(vec.filename)}" loading="lazy" />`;
    } else {
      previewWrapped = `<img class="image-preview checkerboard-bg" src="${window.escAttr(vec.url)}" alt="${window.escAttr(vec.filename)}" loading="lazy" />`;
    }

    return window.createResourceCardHtml({
      id: originalIndex,
      type: 'vector',
      dataAttributes: `data-id="${originalIndex}"`,
      previewHtml: previewWrapped,
      isSelected: isSelected,
      badgeLeft: typeLabel,
      badgeRight: sizeLabel,
      actionsHtml: `
        <button class="btn btn-ghost btn-icon preview-btn" title="Preview vector">
          <span class="icon-mask" style="mask-image: url('svg/eye.svg'); -webkit-mask-image: url('svg/eye.svg');"></span>
        </button>
        <button class="btn btn-ghost btn-icon copy-code-btn" title="Copy SVG Code">
          <span class="icon-mask" style="mask-image: url('svg/copy.svg'); -webkit-mask-image: url('svg/copy.svg');"></span>
        </button>
        <button class="btn btn-ghost btn-icon open-tab-btn" title="Open in new tab">
          <span class="icon-mask" style="mask-image: url('svg/open-tab.svg'); -webkit-mask-image: url('svg/open-tab.svg');"></span>
        </button>
        <button class="btn btn-ghost btn-icon download-btn" title="Download SVG file">
          <span class="icon-mask" style="mask-image: url('svg/download.svg'); -webkit-mask-image: url('svg/download.svg');"></span>
        </button>
      `
    });
  }).join('');

  updateVectorSelectAllState();

  // Update Vector Count Summary
  const countEl = document.getElementById('vector-count-summary');
  if (countEl) {
    const totalActive = allVectors.filter(v => !v.failed).length;
    if (searchQuery) {
      countEl.textContent = `${filtered.length} of ${totalActive} vectors found`;
    } else {
      countEl.textContent = `${totalActive} vectors found`;
    }
  }

  // Lazy resolve size for URL SVGs if size is unknown
  resolveVectorDimensions(filtered);
  updateVectorFilterCounts();
}

// Update vector filter dropdown options with live counts
function updateVectorFilterCounts() {
  const layoutSelect = document.getElementById('filter-vectors-layout');
  if (!layoutSelect) return;

  const setOpt = window.setOpt; // [D3] Shared via common_utils.js

  const active = allVectors.filter(v => !v.failed);
  let square = 0, wide = 0, tall = 0, layoutAll = 0;

  active.forEach(vec => {
    if (vec.width && vec.height) {
      layoutAll++;
      const ratio = vec.width / vec.height;
      if (Math.abs(ratio - 1.0) <= 0.05) square++;
      else if (ratio > 1.05) wide++;
      else if (ratio < 0.95) tall++;
    }
  });

  layoutSelect.options[0].text = `All Layouts (${active.length})`;
  setOpt(layoutSelect.options[1], square, 'Square');
  setOpt(layoutSelect.options[2], wide, 'Wide');
  setOpt(layoutSelect.options[3], tall, 'Tall');
}

// Asynchronously resolve dimension for URL vector images
function resolveVectorDimensions(vectorList) {
  vectorList.forEach(vec => {
    if (vec.type !== 'url' || (vec.width && vec.height)) return;

    const tempImg = new Image();
    tempImg.onload = () => {
      vec.width = tempImg.naturalWidth;
      vec.height = tempImg.naturalHeight;

      const originalIndex = allVectors.findIndex(v => v === vec);
      const gridContainer = document.getElementById('vector-grid-container');
      const cards = gridContainer ? gridContainer.querySelectorAll(`.resource-card[data-id="${originalIndex}"]`) : [];
      cards.forEach(card => {
        const badge = card.querySelector('.resource-badge-right');
        if (badge) {
          badge.textContent = `${tempImg.naturalWidth}x${tempImg.naturalHeight}`;
        }
      });
    };
    tempImg.onerror = () => {
      const originalIndex = allVectors.findIndex(v => v === vec);
      if (originalIndex !== -1) {
        const gridContainer = document.getElementById('vector-grid-container');
        const cards = gridContainer ? gridContainer.querySelectorAll(`.resource-card[data-id="${originalIndex}"]`) : [];
        cards.forEach(card => card.remove());
        vec.failed = true; // Mark as failed instead of filtering to prevent index shifting!
        selectedVectors.delete(originalIndex.toString());
        updateVectorDownloadButtonState();
        updateVectorSelectAllState();
        const countEl = document.getElementById('vector-count-summary');
        if (countEl) {
          const totalActive = allVectors.filter(v => !v.failed).length;
          countEl.textContent = `${totalActive} vectors found`;
        }
      }
    };
    tempImg.src = vec.url;
  });
}

// Copy SVG content to clipboard
async function copyVectorCode(vector) {
  try {
    let svgCode = '';
    if (vector.type === 'inline') {
      svgCode = vector.content;
    } else {
      // Fetch SVG code from URL if possible
      window.showToast('Fetching SVG code...');
      const response = await fetch(vector.url);
      if (!response.ok) throw new Error('Network error');
      svgCode = await response.text();
      // Validate if it is XML/SVG
      if (!svgCode.includes('<svg')) {
        throw new Error('Not a valid SVG file source');
      }
    }

    await navigator.clipboard.writeText(svgCode);
    window.showToast('SVG code copied!');
  } catch (err) {
    console.error('Failed to copy SVG:', err);
    window.showToast('Cannot fetch SVG code (CORS limit). Download instead.');
  }
}

// Download a single SVG vector
function downloadSingleVector(vector) {
  if (vector.type === 'inline') {
    const blob = new Blob([vector.content], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    chrome.downloads.download({
      url: url,
      filename: vector.filename,
      conflictAction: 'uniquify'
    }, () => {
      URL.revokeObjectURL(url);
      if (chrome.runtime.lastError) {
        window.showToast('Download failed');
      } else {
        window.showToast('Vector downloaded!'); if (window.showDonateNudge) window.showDonateNudge();
      }
    });
  } else {
    if (typeof window.downloadSingleResource === 'function') {
      window.downloadSingleResource(vector.url, vector.filename);
    } else {
      chrome.downloads.download({
        url: vector.url,
        filename: vector.filename || 'vector.svg',
        conflictAction: 'uniquify'
      });
    }
  }
}

// Download all selected vectors
function downloadSelectedVectors() {
  const indices = Array.from(selectedVectors).map(Number);
  const total = indices.length;
  if (total === 0) return;

  indices.forEach(idx => {
    const vector = allVectors[idx];
    if (!vector || vector.failed) return;

    if (vector.type === 'inline') {
      const blob = new Blob([vector.content], { type: 'image/svg+xml;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      if (typeof window.downloadSingleResource === 'function') {
        window.downloadSingleResource(url, vector.filename);
      } else {
        chrome.downloads.download({
          url: url,
          filename: vector.filename || `vector-${Date.now()}.svg`,
          conflictAction: 'uniquify'
        });
      }
    } else {
      if (typeof window.downloadSingleResource === 'function') {
        window.downloadSingleResource(vector.url, vector.filename);
      } else {
        chrome.downloads.download({
          url: vector.url,
          filename: vector.filename || `vector-${Date.now()}.svg`,
          conflictAction: 'uniquify'
        });
      }
    }
  });
  window.showToast(`Starting ${total} vector downloads...`);
}

// Update Download button text and disabled state
function updateVectorDownloadButtonState() {
  // [D5] Delegate to shared helper in common_utils.js
  window.updateDownloadBtnState('download-vectors-btn', selectedVectors.size);
}

// Check/uncheck "Select All" checkbox
function updateVectorSelectAllState() {
  // [D6] Delegate to shared helper — vectors use 'data-id' as key
  window.updateSelectAllCheckbox('select-all-vectors', 'vector-grid-container', 'data-id', selectedVectors);
}

// Show error in vector grid
function showVectorErrorState(message) {
  // [D4] Delegate to shared helper in common_utils.js
  window.showGridErrorState('vector-grid-container', message);
}

// Resolve vector sizes in the background
function resolveVectorSizes(vectorsList) {
  vectorsList.forEach(vec => {
    if (vec.sizeInBytes !== undefined) return;
    if (vec.type === 'inline') {
      vec.sizeInBytes = vec.content.length;
      return;
    }
    if (vec.url.startsWith('data:')) {
      vec.sizeInBytes = Math.round(vec.url.length * 0.75);
      return;
    }

    // [D2] Use shared fetchResourceSize from common_utils.js
    window.fetchResourceSize(vec.url).then(size => {
      vec.sizeInBytes = size;
      const sortSelect = document.getElementById('sort-vectors');
      if (sortSelect && sortSelect.value !== 'none') {
        if (window.vectorResortTimer) clearTimeout(window.vectorResortTimer);
        window.vectorResortTimer = setTimeout(() => {
          filterAndRenderVectors();
        }, 350);
      }
    });
  });
}

// [D1, D2] formatBytes and fetchVectorSize are now in common_utils.js (window.formatBytes / window.fetchResourceSize)

