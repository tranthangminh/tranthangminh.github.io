// Multimedia Downloader Master Controller (multimediadownloader.js)

if (document.readyState !== 'loading') {
  initMultimediaController();
} else {
  document.addEventListener('DOMContentLoaded', initMultimediaController);
}

function initMultimediaController() {
  document.querySelectorAll('.refresh-btn').forEach(btn => {
    btn.addEventListener('click', () => window.scanPageResources?.());
  });

  initColumnSwitchers();
  initCountSyncObserver();

  // Scan after short defer on startup if not already scanned
  setTimeout(() => {
    if (typeof window.scanPageResources === 'function') {
      window.scanPageResources();
    }
  }, 200);
}

// ── Column Switchers ──
function initColumnSwitchers() {
  ['images', 'vectors', 'videos', 'sounds'].forEach(tab => {
    const switcher = document.querySelector(`.sub-control-group[data-subtab="${tab}"] .col-switcher`);
    const gridId = tab === 'images' ? 'image-grid-container' : `${tab.slice(0, -1)}-grid-container`;
    const grid = document.getElementById(gridId);
    if (!switcher || !grid) return;

    switcher.querySelectorAll('.col-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const cols = btn.getAttribute('data-cols');
        switcher.querySelectorAll('.col-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        grid.classList.remove('cols-1', 'cols-2', 'cols-3');
        grid.classList.add(`cols-${cols}`);
        chrome.storage.local.set({ [`${tab}GridCols`]: cols });
      });
    });

    const defaultCols = tab === 'videos' ? '1' : (tab === 'sounds' ? '2' : '3');
    chrome.storage.local.get({ [`${tab}GridCols`]: defaultCols }, (data) => {
      const cols = data[`${tab}GridCols`];
      switcher.querySelector(`.col-btn[data-cols="${cols}"]`)?.click();
    });
  });
}

// ── Master Webpage Resource Scanner ──
async function scanPageResources() {
  const grids = {
    images: document.getElementById('image-grid-container'),
    vectors: document.getElementById('vector-grid-container'),
    videos: document.getElementById('video-grid-container'),
    sounds: document.getElementById('sound-grid-container')
  };

  const summaries = {
    images: document.getElementById('image-count-summary'),
    vectors: document.getElementById('vector-count-summary'),
    videos: document.getElementById('video-count-summary'),
    sounds: document.getElementById('sound-count-summary')
  };

  Object.values(grids).forEach(g => {
    if (g) g.innerHTML = '<div class="loading-state"><p>Scanning page...</p></div>';
  });
  Object.values(summaries).forEach(s => {
    if (s) s.textContent = 'Scanning...';
  });

  window.resetImagesState?.();
  window.resetVectorsState?.();
  window.resetVideosState?.();
  window.resetSoundsState?.();

  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab) {
    const err = 'Cannot scan: No active tab found.';
    window.showImageErrorState?.(err);
    window.showVectorErrorState?.(err);
    window.showVideoErrorState?.(err);
    window.showSoundErrorState?.(err);
    return;
  }

  window.updatePageInfo?.(tab);

  const isSystemPage = tab.url.startsWith('chrome://') || 
                       tab.url.startsWith('chrome-extension://') || 
                       tab.url.includes('chromewebstore.google.com') ||
                       tab.url.includes('chrome.google.com/webstore');

  if (isSystemPage) {
    const sysErr = 'Scanning is not allowed on Chrome system pages.';
    window.showImageErrorState?.(sysErr);
    window.showVectorErrorState?.(sysErr);
    window.showVideoErrorState?.(sysErr);
    window.showSoundErrorState?.(sysErr);
    return;
  }

  try {
    let results = null;
    for (let attempts = 0; attempts < 3; attempts++) {
      try {
        results = await chrome.scripting.executeScript({
          target: { tabId: tab.id },
          files: ['common_scraper.js']
        });
        break;
      } catch (err) {
        if (attempts < 2) await new Promise(r => setTimeout(r, 350));
        else throw err;
      }
    }

    if (results?.[0]?.result) {
      const data = results[0].result;
      window.updateImagesData?.(data.images || []);
      window.updateVectorsData?.(data.vectors || []);
      window.updateVideosData?.(data.videos || []);
      window.updateSoundsData?.(data.sounds || []);
    } else {
      const noMediaMsg = (window.i18n ? window.i18n.t('downloader.emptyImages', 'No media found.') : 'No media found.');
      window.showImageErrorState?.(noMediaMsg);
      window.showVectorErrorState?.(noMediaMsg);
      window.showVideoErrorState?.(noMediaMsg);
      window.showSoundErrorState?.(noMediaMsg);
    }
  } catch (err) {
    console.error('Page scanning error:', err);
    const failMsg = 'Failed to scan page resources.';
    window.showImageErrorState?.(failMsg);
    window.showVectorErrorState?.(failMsg);
    window.showVideoErrorState?.(failMsg);
    window.showSoundErrorState?.(failMsg);
  }
}
window.scanPageResources = scanPageResources;

// ── Shared Grid UI Controller Helper ──
window.setupDownloaderGridController = function ({
  searchInputId,
  sortSelectId,
  sortPrefKey,
  selectAllId,
  downloadBtnId,
  gridContainerId,
  cardSelector,
  selectedSet,
  onFilterChange,
  onDownloadSelected,
  onCardClick
}) {
  const searchInput = document.getElementById(searchInputId);
  const sortSelect = document.getElementById(sortSelectId);
  const selectAll = document.getElementById(selectAllId);
  const downloadBtn = document.getElementById(downloadBtnId);
  const grid = document.getElementById(gridContainerId);

  // Search input with 150ms debounce
  if (searchInput) {
    let timer = null;
    searchInput.addEventListener('input', () => {
      clearTimeout(timer);
      timer = setTimeout(() => onFilterChange?.(), 150);
    });
  }

  // Sort select with local storage persistence
  if (sortSelect && sortPrefKey) {
    chrome.storage.local.get({ [sortPrefKey]: 'none' }, (data) => {
      if (data[sortPrefKey]) {
        sortSelect.value = data[sortPrefKey];
        onFilterChange?.();
      }
    });

    sortSelect.addEventListener('change', () => {
      chrome.storage.local.set({ [sortPrefKey]: sortSelect.value }, () => onFilterChange?.());
    });
  }

  function updateSelectAllState() {
    if (!selectAll || !grid) return;
    const cards = grid.querySelectorAll(cardSelector);
    if (cards.length === 0) {
      selectAll.checked = false;
      selectAll.indeterminate = false;
      return;
    }
    const count = [...cards].filter(c => c.classList.contains('selected')).length;
    selectAll.checked = count === cards.length;
    selectAll.indeterminate = count > 0 && count < cards.length;
  }

  function updateDownloadBtnState() {
    if (!downloadBtn) return;
    const size = selectedSet.size;
    downloadBtn.textContent = `Download (${size})`;
    downloadBtn.disabled = size === 0;
    downloadBtn.classList.toggle('disabled', size === 0);
  }

  // Select all checkbox
  if (selectAll && grid) {
    selectAll.addEventListener('change', (e) => {
      const isChecked = e.target.checked;
      grid.querySelectorAll(cardSelector).forEach(card => {
        const id = card.getAttribute('data-id') || card.getAttribute('data-url');
        const box = card.querySelector('.card-checkbox');
        card.classList.toggle('selected', isChecked);
        if (box) box.checked = isChecked;
        if (isChecked) selectedSet.add(id);
        else selectedSet.delete(id);
      });
      updateDownloadBtnState();
    });
  }

  // Bulk download button
  if (downloadBtn) {
    downloadBtn.addEventListener('click', () => {
      if (selectedSet.size > 0) onDownloadSelected?.();
    });
  }

  // Card click delegation
  if (grid) {
    grid.addEventListener('click', (e) => {
      const card = e.target.closest(cardSelector);
      if (!card) return;

      // Skip if clicking interactive buttons
      if (e.target.closest('.preview-btn, .copy-btn, .download-btn, .open-tab-btn, .copy-code-btn, .download-code-btn')) {
        return;
      }

      const id = card.getAttribute('data-id') || card.getAttribute('data-url');
      const box = card.querySelector('.card-checkbox');
      const isSel = card.classList.contains('selected');

      card.classList.toggle('selected', !isSel);
      if (box) box.checked = !isSel;
      if (!isSel) selectedSet.add(id);
      else selectedSet.delete(id);

      updateSelectAllState();
      updateDownloadBtnState();
      onCardClick?.(card, id, !isSel);
    });
  }

  return { updateSelectAllState, updateDownloadBtnState };
};

// ── Shared Card HTML Builder ──
window.createResourceCardHtml = function({
  id,
  type,
  dataAttributes = '',
  previewHtml,
  isSelected = false,
  badgeLeft = '',
  badgeCenter = '',
  badgeRight = '',
  actionsHtml = ''
}) {
  return `
    <div class="resource-card ${type}-card ${isSelected ? 'selected' : ''}" data-id="${id}" ${dataAttributes}>
      <div class="resource-checkbox-overlay ${type}-checkbox-overlay">
        <input type="checkbox" class="card-checkbox" ${isSelected ? 'checked' : ''} />
      </div>
      <div class="resource-actions-overlay ${type}-actions-overlay">
        ${actionsHtml}
      </div>
      <div class="resource-preview-wrapper ${type}-preview-wrapper">
        ${previewHtml}
      </div>
      <div class="badge resource-badge-left ${type}-type-badge">${badgeLeft}</div>
      <div class="badge resource-badge-center ${type}-duration-badge">${badgeCenter}</div>
      <div class="badge resource-badge-right ${type}-size-badge">${badgeRight}</div>
    </div>
  `;
};

// ── Page Info Updater ──
window.updatePageInfo = function(tabInfo) {
  const faviconUrl = tabInfo?.favIconUrl || 'svg/icon16.png';
  let hostname = '';
  let fullUrl = tabInfo?.url || '';
  if (fullUrl) {
    try { hostname = new URL(fullUrl).hostname; } catch { hostname = fullUrl; }
  }
  const displayTitle = tabInfo?.title || hostname || 'Webpage';
  const annotation = fullUrl ? `${displayTitle}\n${fullUrl}` : displayTitle;

  document.querySelectorAll('.page-favicon').forEach(el => el.src = faviconUrl);
  document.querySelectorAll('.page-title').forEach(el => {
    el.textContent = displayTitle;
    el.title = annotation;
  });
};

// ── Subtab Count Observer ──
function initCountSyncObserver() {
  ['images', 'vectors', 'videos', 'sounds'].forEach(tab => {
    const summaryId = tab === 'images' ? 'image-count-summary' : `${tab.slice(0, -1)}-count-summary`;
    const summaryEl = document.getElementById(summaryId);
    const subtabCountEl = document.getElementById(`subtab-${tab}-count`);
    if (!summaryEl || !subtabCountEl) return;

    const updateSubtabCount = () => {
      const match = (summaryEl.textContent || '').match(/\d+/);
      const count = match ? match[0] : '0';
      const label = (window.i18n ? window.i18n.t(`downloader.${tab}Tab`) : (tab.charAt(0).toUpperCase() + tab.slice(1)));
      subtabCountEl.textContent = `${count} ${label}`;
      subtabCountEl.closest('.sub-tab-btn')?.classList.toggle('count-zero', parseInt(count, 10) === 0);
    };

    updateSubtabCount();
    new MutationObserver(updateSubtabCount).observe(summaryEl, { childList: true, characterData: true, subtree: true });
    window.addEventListener('maxLanguageChanged', updateSubtabCount);
  });
}
