// Image Extractor Feature Logic

let allImages = [];
let selectedImages = new Set();
let totalImagesToLoad = 0;
let loadedImagesCount = 0;
let currentScanId = 0;

if (document.readyState !== 'loading') {
  initImageExtractor();
  // Defer heavy webpage scanning until UI is fully painted and visible
  setTimeout(() => {
    scanPageResources();
  }, 200);
} else {
  document.addEventListener('DOMContentLoaded', () => {
    initImageExtractor();
    // Defer heavy webpage scanning until UI is fully painted and visible
    setTimeout(() => {
      scanPageResources();
    }, 200);
  });
}

function initImageExtractor() {
  const imagesTabBtn = document.querySelector('[data-subtab="images"]');
  const searchInput = document.getElementById('image-search');
  const selectAllCheckbox = document.getElementById('select-all-images');
  const downloadBtn = document.getElementById('download-images-btn');
  const gridContainer = document.getElementById('image-grid-container');

  // Trigger scan when switching to the images tab
  if (imagesTabBtn) {
    imagesTabBtn.addEventListener('click', () => {
      if (allImages.length === 0) {
        scanPageResources();
      }
    });
  }

  // Handle Refresh Button click
  const refreshBtn = document.getElementById('refresh-images-btn');
  if (refreshBtn) {
    refreshBtn.addEventListener('click', () => {
      scanPageResources();
    });
  }

  // Initialize Fullscreen Preview Modal handlers safely
  if (typeof initPreviewModal === 'function') {
    initPreviewModal();
  } else if (typeof window.initPreviewModal === 'function') {
    window.initPreviewModal();
  }

  // Handle Search Input
  if (searchInput) {
    searchInput.addEventListener('input', () => {
      filterAndRenderImages();
    });
  }

  // Handle Sort Selector
  const sortSelect = document.getElementById('sort-images');
  if (sortSelect) {
    chrome.storage.local.get({ imageSortPreference: 'none' }, (data) => {
      if (data.imageSortPreference) {
        sortSelect.value = data.imageSortPreference;
        if (allImages.length > 0) {
          filterAndRenderImages();
        }
      }
    });

    sortSelect.addEventListener('change', () => {
      const val = sortSelect.value;
      chrome.storage.local.set({ imageSortPreference: val }, () => {
        filterAndRenderImages();
      });
    });

    const typeFilter = document.getElementById('filter-images-type');
    const layoutFilter = document.getElementById('filter-images-layout');
    if (typeFilter) typeFilter.addEventListener('change', filterAndRenderImages);
    if (layoutFilter) layoutFilter.addEventListener('change', filterAndRenderImages);
  }

  // Handle Select All Checkbox
  if (selectAllCheckbox) {
    selectAllCheckbox.addEventListener('change', (e) => {
      const isChecked = e.target.checked;
      const visibleCards = gridContainer.querySelectorAll('.image-card');
      
      visibleCards.forEach(card => {
        const url = card.getAttribute('data-url');
        const checkbox = card.querySelector('.card-checkbox');
        
        if (isChecked) {
          card.classList.add('selected');
          if (checkbox) checkbox.checked = true;
          selectedImages.add(url);
        } else {
          card.classList.remove('selected');
          if (checkbox) checkbox.checked = false;
          selectedImages.delete(url);
        }
      });

      updateImageDownloadButtonState();
    });
  }

  // Handle Bulk Download Button
  if (downloadBtn) {
    downloadBtn.addEventListener('click', () => {
      if (selectedImages.size === 0) return;
      downloadSelectedImages();
    });
  }

  // Card Event Delegation (selecting cards, preview, quick download)
  if (gridContainer) {
    gridContainer.addEventListener('click', (e) => {
      const card = e.target.closest('.resource-card');
      if (!card) return;

      const url = card.getAttribute('data-url');
      const filename = card.getAttribute('data-filename');

      // 1. Handle Preview button click (Eye Icon)
      if (e.target.closest('.preview-btn')) {
        e.stopPropagation();
        const sizeBadge = card.querySelector('.resource-badge-right');
        const sizeLabel = sizeBadge ? sizeBadge.textContent : 'Dimensions unknown';
        window.previewResource(url, filename, sizeLabel);
        return;
      }

      // 1b. Handle Copy Image button click
      if (e.target.closest('.copy-btn')) {
        e.stopPropagation();
        window.copyResourceToClipboard(url);
        return;
      }

      // 2. Handle Quick Download click
      if (e.target.closest('.download-btn')) {
        e.stopPropagation();
        downloadSingleImage(url, filename);
        return;
      }

      // 2b. Handle Open in New Tab click
      if (e.target.closest('.open-tab-btn')) {
        e.stopPropagation();
        window.openResourceInNewTab(url);
        return;
      }

      // 3. Handle card selection click
      const checkbox = card.querySelector('.card-checkbox');
      if (card.classList.contains('selected')) {
        card.classList.remove('selected');
        if (checkbox) checkbox.checked = false;
        selectedImages.delete(url);
      } else {
        card.classList.add('selected');
        if (checkbox) checkbox.checked = true;
        selectedImages.add(url);
      }

      // Update the "Select All" checkbox state based on selection
      updateImageSelectAllState();
      updateImageDownloadButtonState();
    });
  }
}

window.scanPageResources = scanPageResources;

// Scrape page for images and vectors using chrome.scripting
async function scanPageResources() {
  const gridContainer = document.getElementById('image-grid-container');
  const vectorGridContainer = document.getElementById('vector-grid-container');
  const videoGridContainer = document.getElementById('video-grid-container');

  if (gridContainer) {
    gridContainer.innerHTML = `
      <div class="loading-state">
        <p>Scanning page for images...</p>
      </div>
    `;
  }
  if (vectorGridContainer) {
    vectorGridContainer.innerHTML = `
      <div class="loading-state">
        <p>Scanning page for vectors...</p>
      </div>
    `;
  }
  if (videoGridContainer) {
    videoGridContainer.innerHTML = `
      <div class="loading-state">
        <p>Scanning page for videos...</p>
      </div>
    `;
  }

  // Reset states
  allImages = [];
  selectedImages.clear();
  totalImagesToLoad = 0;
  loadedImagesCount = 0;
  updateImageDownloadButtonState();
  const selectAllCheckbox = document.getElementById('select-all-images');
  if (selectAllCheckbox) selectAllCheckbox.checked = false;

  // Reset vectors state
  if (typeof window.resetVectorsState === 'function') {
    window.resetVectorsState();
  }

  // Reset videos state
  if (typeof window.resetVideosState === 'function') {
    window.resetVideosState();
  }

  // Query active tab
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab) {
    showErrorState('Cannot scan: No active tab found.');
    if (typeof window.showVectorErrorState === 'function') {
      window.showVectorErrorState('Cannot scan: No active tab found.');
    }
    return;
  }

  // Populate Page Info Header across all tabs
  if (typeof window.updatePageInfo === 'function') {
    window.updatePageInfo(tab);
  }

  // Reset count summaries
  const imageCountEl = document.getElementById('image-count-summary');
  const vectorCountEl = document.getElementById('vector-count-summary');
  const videoCountEl = document.getElementById('video-count-summary');
  const soundCountEl = document.getElementById('sound-count-summary');
  if (imageCountEl) imageCountEl.textContent = 'Scanning...';
  if (vectorCountEl) vectorCountEl.textContent = 'Scanning...';
  if (videoCountEl) videoCountEl.textContent = 'Scanning...';
  if (soundCountEl) soundCountEl.textContent = 'Scanning...';

  const isSystemPage = tab.url.startsWith('chrome://') || 
                       tab.url.startsWith('chrome-extension://') || 
                       tab.url.startsWith('https://chrome.google.com/webstore');

  if (isSystemPage) {
    showErrorState('Scanning is not allowed on Chrome system pages.');
    if (typeof window.showVectorErrorState === 'function') {
      window.showVectorErrorState('Scanning is not allowed on Chrome system pages.');
    }
    if (typeof window.showSoundErrorState === 'function') {
      window.showSoundErrorState('Scanning is not allowed on Chrome system pages.');
    }
    return;
  }

  try {
    let results = null;
    let attempts = 0;
    const maxAttempts = 3;

    while (attempts < maxAttempts) {
      try {
        results = await chrome.scripting.executeScript({
          target: { tabId: tab.id },
          files: ['common_scraper.js']
        });
        break;
      } catch (scriptErr) {
        const errStr = (scriptErr && scriptErr.message) ? scriptErr.message : '';
        const isFrameRemoved = errStr.includes('Frame with ID 0 was removed') || 
                               errStr.includes('frame was removed') || 
                               errStr.includes('tab was closed');
        
        attempts++;
        if (isFrameRemoved && attempts < maxAttempts) {
          // Wait 400ms for frame navigation to stabilize before retrying
          await new Promise(resolve => setTimeout(resolve, 400));
        } else {
          throw scriptErr;
        }
      }
    }

    if (results && results[0] && results[0].result) {
      const data = results[0].result;
      
      // 1. Process Images
      allImages = data.images || [];
      filterAndRenderImages();
      
      // 2. Process Vectors
      if (typeof window.updateVectorsData === 'function') {
        window.updateVectorsData(data.vectors || []);
      }
      
      // 3. Process Videos
      if (typeof window.updateVideosData === 'function') {
        window.updateVideosData(data.videos || []);
      }

      // 4. Process Sounds
      if (typeof window.updateSoundsData === 'function') {
        window.updateSoundsData(data.sounds || []);
      }
    } else {
      showErrorState('No images found on this page.');
      if (typeof window.showVectorErrorState === 'function') {
        window.showVectorErrorState('No vectors found on this page.');
      }
      if (typeof window.showVideoErrorState === 'function') {
        window.showVideoErrorState('No videos found on this page.');
      }
      if (typeof window.showSoundErrorState === 'function') {
        window.showSoundErrorState('No sounds found on this page.');
      }
    }
  } catch (err) {
    console.error('Error scanning page:', err);
    let userMsg = err.message || 'Unknown error';
    if (userMsg.includes('Frame with ID 0 was removed') || userMsg.includes('frame was removed')) {
      userMsg = 'Page frame was reloaded or detached. Click Refresh to scan again.';
    } else if (userMsg.includes('Cannot access contents of url')) {
      userMsg = 'Cannot access page content due to browser security restrictions.';
    }

    showErrorState(`Error scanning page: ${userMsg}`);
    if (typeof window.showVectorErrorState === 'function') {
      window.showVectorErrorState(`Error scanning vectors: ${userMsg}`);
    }
    if (typeof window.showVideoErrorState === 'function') {
      window.showVideoErrorState(`Error scanning videos: ${userMsg}`);
    }
    if (typeof window.showSoundErrorState === 'function') {
      window.showSoundErrorState(`Error scanning sounds: ${userMsg}`);
    }
  }
}



// Filter and Render images in the grid
function filterAndRenderImages() {
  const gridContainer = document.getElementById('image-grid-container');
  const searchInput = document.getElementById('image-search');
  if (!gridContainer) return;

  const searchQuery = searchInput ? searchInput.value.toLowerCase().trim() : '';

  // Get active filter values
  const typeFilter = document.getElementById('filter-images-type');
  const layoutFilter = document.getElementById('filter-images-layout');
  const typeVal = typeFilter ? typeFilter.value : 'all';
  const layoutVal = layoutFilter ? layoutFilter.value : 'all';

  let filtered = allImages.filter(img => 
    img.url.toLowerCase().includes(searchQuery) || 
    img.filename.toLowerCase().includes(searchQuery)
  );

  // Apply type filter
  if (typeVal !== 'all') {
    filtered = filtered.filter(img => {
      const ext = getFileExtension(img.url).toLowerCase();
      if (typeVal === 'png') return ext === 'png' || img.url.includes('image/png');
      if (typeVal === 'jpg') return ext === 'jpg' || ext === 'jpeg' || img.url.includes('image/jpeg') || img.url.includes('image/jpg');
      if (typeVal === 'webp') return ext === 'webp' || img.url.includes('image/webp');
      if (typeVal === 'gif') return ext === 'gif' || img.url.includes('image/gif');
      return false;
    });
  }

  // Apply layout aspect ratio filter
  if (layoutVal !== 'all') {
    filtered = filtered.filter(img => {
      if (!img.width || !img.height) return true; // keep unresolved images so they resolve dimensions
      const ratio = img.width / img.height;
      if (layoutVal === 'square') {
        return Math.abs(ratio - 1.0) <= 0.05; // 1:1 Â± 5%
      } else if (layoutVal === 'wide') {
        return ratio > 1.05;
      } else if (layoutVal === 'tall') {
        return ratio < 0.95;
      }
      return true;
    });
  }

  // Apply sorting
  const sortSelect = document.getElementById('sort-images');
  const sortVal = sortSelect ? sortSelect.value : 'none';
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
    const text = searchQuery ? 'No images found matching your search.' : 'No images found on this page.';
    gridContainer.innerHTML = `
      <div class="loading-state" style="animation: none;">
        <p>${text}</p>
      </div>
    `;
    updateImageFilterCounts();
    return;
  }

  gridContainer.innerHTML = filtered.map(img => {
    const isSelected = selectedImages.has(img.url);
    
    // Choose badgeRight label based on current sort type
    let sizeLabel = 'Resolving...';
    if (sortVal === 'size') {
      sizeLabel = img.sizeInBytes !== undefined ? formatBytes(img.sizeInBytes) : 'Resolving...';
    } else {
      sizeLabel = (img.width && img.height) ? `${img.width}x${img.height}` : 'Resolving...';
    }
    
    // Determine the image format type badge (e.g. JPG, PNG, WEBP, GIF, etc.)
    let typeLabel = 'IMG';
    if (img.url.startsWith('data:')) {
      const match = img.url.match(/^data:image\/([a-zA-Z+]+);/);
      typeLabel = match ? match[1].toUpperCase() : 'DATA';
    } else {
      const cleanUrl = img.url.split(/[?#]/)[0].toLowerCase();
      const dotIndex = cleanUrl.lastIndexOf('.');
      if (dotIndex !== -1) {
        const ext = cleanUrl.substring(dotIndex + 1);
        if (ext && ext.length <= 5) {
          typeLabel = ext.toUpperCase();
        }
      }
    }
    
    return window.createResourceCardHtml({
      id: img.url,
      type: 'image',
      dataAttributes: `data-url="${window.escAttr(img.url)}" data-filename="${window.escAttr(img.filename)}"`,
      previewHtml: `<img class="image-preview checkerboard-bg" src="${window.escAttr(img.url)}" alt="${window.escAttr(img.filename)}" loading="lazy" />`,
      isSelected: isSelected,
      badgeLeft: typeLabel,
      badgeRight: sizeLabel,
      actionsHtml: `
        <button class="btn btn-ghost btn-icon preview-btn" title="Preview image">
          <span class="icon-mask" style="mask-image: url('svg/eye.svg'); -webkit-mask-image: url('svg/eye.svg');"></span>
        </button>
        <button class="btn btn-ghost btn-icon copy-btn" title="Copy image to clipboard">
          <span class="icon-mask" style="mask-image: url('svg/copy.svg'); -webkit-mask-image: url('svg/copy.svg');"></span>
        </button>
        <button class="btn btn-ghost btn-icon open-tab-btn" title="Open in new tab">
          <span class="icon-mask" style="mask-image: url('svg/open-tab.svg'); -webkit-mask-image: url('svg/open-tab.svg');"></span>
        </button>
        <button class="btn btn-ghost btn-icon download-btn" title="Download immediately">
          <span class="icon-mask" style="mask-image: url('svg/download.svg'); -webkit-mask-image: url('svg/download.svg');"></span>
        </button>
      `
    });
  }).join('');

  updateImageSelectAllState();
  updateImageDownloadButtonState();

  // Update Image Count Badge
  const countEl = document.getElementById('image-count-summary');
  if (countEl) {
    if (searchQuery) {
      countEl.textContent = `${filtered.length} of ${allImages.length} images found`;
    } else {
      countEl.textContent = `${allImages.length} images found`;
    }
  }

  resolveImageDimensions(filtered);
  updateImageFilterCounts();
}

function updateImageCountLabel() {
  const countEl = document.getElementById('image-count-summary');
  if (countEl) {
    countEl.textContent = `${allImages.length} images found`;
  }
}

// Update filter dropdown options with live counts
function updateImageFilterCounts() {
  const typeSelect = document.getElementById('filter-images-type');
  const layoutSelect = document.getElementById('filter-images-layout');
  if (!typeSelect && !layoutSelect) return;

  // Helper: update a single option's text, disabled, and visibility
  const setOpt = window.setOpt; // [D3] Shared via common_utils.js

  // Count by extension/mime type
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
  if (typeSelect) {
    typeSelect.options[0].text = `All (${total})`;
    setOpt(typeSelect.options[1], png, 'PNG');
    setOpt(typeSelect.options[2], jpg, 'JPG');
    setOpt(typeSelect.options[3], webp, 'WEBP');
    setOpt(typeSelect.options[4], gif, 'GIF');
  }
  if (layoutSelect) {
    layoutSelect.options[0].text = `All Layouts (${layoutAll})`;
    setOpt(layoutSelect.options[1], square, 'Square');
    setOpt(layoutSelect.options[2], wide, 'Wide');
    setOpt(layoutSelect.options[3], tall, 'Tall');
  }
}

// Asynchronously resolve image dimensions by loading them in the background
function resolveImageDimensions(imagesList) {
  // Count how many images actually need their dimensions resolved
  const unresolvedImages = imagesList.filter(img => !img.width || !img.height);
  
  currentScanId++;
  const myScanId = currentScanId;

  totalImagesToLoad = imagesList.length;
  loadedImagesCount = totalImagesToLoad - unresolvedImages.length;

  if (unresolvedImages.length === 0) {
    return;
  }

  imagesList.forEach(img => {
    // Fetch size asynchronously in background
    // [D1,D2] Use shared fetchResourceSize + formatBytes from common_utils.js
    window.fetchResourceSize(img.url).then(size => {
      img.sizeInBytes = size;
      const sortSelect = document.getElementById('sort-images');
      if (sortSelect && sortSelect.value === 'size') {
        const gridContainer = document.getElementById('image-grid-container');
        const cards = gridContainer ? gridContainer.querySelectorAll(`.resource-card[data-url="${CSS.escape(img.url)}"]`) : [];
        cards.forEach(card => {
          const badge = card.querySelector('.resource-badge-right');
          if (badge) {
            badge.textContent = window.formatBytes(size);
          }
        });
      }
    });

    // If we already resolved the dimensions, skip
    if (img.width && img.height) return;

    const tempImg = new Image();
    tempImg.onload = () => {
      if (myScanId !== currentScanId) return;

      // Save dimensions to the original image object
      img.width = tempImg.naturalWidth;
      img.height = tempImg.naturalHeight;
      
      // Update DOM badge for this specific image card
      const gridContainer = document.getElementById('image-grid-container');
      const cards = gridContainer ? gridContainer.querySelectorAll(`.resource-card[data-url="${CSS.escape(img.url)}"]`) : [];
      cards.forEach(card => {
        const badge = card.querySelector('.resource-badge-right');
        if (badge) {
          badge.textContent = `${tempImg.naturalWidth}x${tempImg.naturalHeight}`;
        }
      });

      loadedImagesCount++;

      // Debounce automatic re-sorting as items resolve dimensions & sizes
      if (window.imageResortTimer) clearTimeout(window.imageResortTimer);
      window.imageResortTimer = setTimeout(() => {
        const sortSelect = document.getElementById('sort-images');
        if (sortSelect && sortSelect.value !== 'none') {
          filterAndRenderImages();
        }
      }, 350);
    };
    tempImg.onerror = () => {
      if (myScanId !== currentScanId) return;

      // Failed to load in popup (e.g. invalid URL) - remove it completely
      const gridContainer = document.getElementById('image-grid-container');
      const cards = gridContainer ? gridContainer.querySelectorAll(`.resource-card[data-url="${CSS.escape(img.url)}"]`) : [];
      cards.forEach(card => card.remove());
      allImages = allImages.filter(i => i.url !== img.url);
      selectedImages.delete(img.url);
      updateImageCountLabel();
      updateImageSelectAllState();
      updateImageDownloadButtonState();

      loadedImagesCount++;

      if (window.imageResortTimer) clearTimeout(window.imageResortTimer);
      window.imageResortTimer = setTimeout(() => {
        const sortSelect = document.getElementById('sort-images');
        if (sortSelect && sortSelect.value !== 'none') {
          filterAndRenderImages();
        }
      }, 350);
    };
    tempImg.src = img.url;
  });
}

// Update "Download Selected" button text and state
function updateImageDownloadButtonState() {
  // [D5] Delegate to shared helper in common_utils.js
  window.updateDownloadBtnState('download-images-btn', selectedImages.size);
}

// Update the "Select All" checkbox state based on current grid selection
function updateImageSelectAllState() {
  // [D6] Delegate to shared helper — images use 'data-url' as key
  window.updateSelectAllCheckbox('select-all-images', 'image-grid-container', 'data-url', selectedImages);
}

// Download a single image using unified download helper
function downloadSingleImage(url, filename) {
  if (typeof window.downloadSingleResource === 'function') {
    window.downloadSingleResource(url, filename);
  } else {
    chrome.downloads.download({
      url: url,
      filename: filename || 'image.png',
      conflictAction: 'uniquify'
    });
  }
}
window.downloadSingleImage = downloadSingleImage;

// Bulk download all selected images
function downloadSelectedImages() {
  const urls = Array.from(selectedImages);
  if (urls.length === 0) return;

  urls.forEach(url => {
    const imgInfo = allImages.find(img => img.url === url);
    const filename = imgInfo ? imgInfo.filename : '';
    if (typeof window.downloadSingleResource === 'function') {
      window.downloadSingleResource(url, filename);
    } else {
      chrome.downloads.download({
        url: url,
        filename: filename || `image-${Date.now()}.png`,
        conflictAction: 'uniquify'
      });
    }
  });
  window.showToast(`Starting ${urls.length} image downloads...`);
}

// Helper to show errors in the grid
function showErrorState(message) {
  // [D4] Delegate to shared helper in common_utils.js
  window.showGridErrorState('image-grid-container', message);
}

// Helper to get image format type extension
function getFileExtension(url) {
  if (url.startsWith('data:')) {
    const match = url.match(/^data:image\/([a-zA-Z+]+);/);
    return match ? match[1].toLowerCase() : '';
  }
  const cleanUrl = url.split(/[?#]/)[0].toLowerCase();
  const dotIndex = cleanUrl.lastIndexOf('.');
  return dotIndex !== -1 ? cleanUrl.substring(dotIndex + 1) : '';
}

// [D1, D2] formatBytes and fetchResourceSize are now in common_utils.js (window.formatBytes / window.fetchResourceSize)






