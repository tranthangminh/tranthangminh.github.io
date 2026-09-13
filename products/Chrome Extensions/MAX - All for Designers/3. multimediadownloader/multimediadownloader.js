// Multimedia Downloader Tab Controller (multimediadownloader.js)

if (document.readyState !== 'loading') {
  initMultimediaController();
} else {
  document.addEventListener('DOMContentLoaded', initMultimediaController);
}

function initMultimediaController() {
  // 1. Bind all Rescan/Refresh buttons to window.scanPageResources
  const refreshButtons = document.querySelectorAll('.refresh-btn');
  refreshButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      if (typeof window.scanPageResources === 'function') {
        window.scanPageResources();
      }
    });
  });

  // 2. Initialize Column Switchers for each multimedia subtab
  initColumnSwitchers();

  // 3. Initialize Count Synchronizer Observer
  initCountSyncObserver();
}

function initColumnSwitchers() {
  const tabs = ['images', 'vectors', 'videos', 'sounds'];
  
  tabs.forEach(tab => {
    const switcher = document.querySelector(`.sub-control-group[data-subtab="${tab}"] .col-switcher`);
    const gridId = tab === 'images' ? 'image-grid-container' : `${tab.slice(0, -1)}-grid-container`;
    const grid = document.getElementById(gridId);
    
    if (!switcher || !grid) return;
    
    const buttons = switcher.querySelectorAll('.col-btn');
    buttons.forEach(btn => {
      btn.addEventListener('click', () => {
        const cols = btn.getAttribute('data-cols');
        
        buttons.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        
        grid.classList.remove('cols-1', 'cols-2', 'cols-3');
        grid.classList.add(`cols-${cols}`);
        
        chrome.storage.local.set({ [`${tab}GridCols`]: cols });
      });
    });
    
    // Restore preference (Default: Videos -> 1 column, Sounds -> 2 columns, others -> 3 columns)
    const defaultCols = tab === 'videos' ? '1' : (tab === 'sounds' ? '2' : '3');
    chrome.storage.local.get({ [`${tab}GridCols`]: defaultCols }, (data) => {
      const cols = data[`${tab}GridCols`];
      const targetBtn = switcher.querySelector(`.col-btn[data-cols="${cols}"]`);
      if (targetBtn) {
        targetBtn.click();
      }
    });
  });
}

// Global hook to update favicon and title across all tabs
window.updatePageInfo = function(tabInfo) {
  const faviconEls = document.querySelectorAll('.page-favicon');
  const titleEls = document.querySelectorAll('.page-title');
  
  const faviconUrl = (tabInfo && tabInfo.favIconUrl) || 'svg/icon16.png';
  let hostname = '';
  let fullUrl = '';
  if (tabInfo && tabInfo.url) {
    fullUrl = tabInfo.url;
    try {
      hostname = new URL(tabInfo.url).hostname;
    } catch (e) {
      hostname = tabInfo.url;
    }
  }
  const displayTitle = (tabInfo && tabInfo.title) || hostname || 'Webpage';
  const annotation = fullUrl ? `${displayTitle}\n${fullUrl}` : displayTitle;
  
  faviconEls.forEach(el => {
    el.src = faviconUrl;
  });
  
  titleEls.forEach(el => {
    el.textContent = displayTitle;
    el.title = annotation;
  });
};

// Card HTML builder helper for Multimedia Downloader
window.createResourceCardHtml = function({
  id,
  type, // 'image' | 'vector' | 'video'
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
      <!-- Checkbox overlay -->
      <div class="resource-checkbox-overlay ${type}-checkbox-overlay">
        <input type="checkbox" class="card-checkbox" ${isSelected ? 'checked' : ''} />
      </div>
      
      <!-- Actions overlay -->
      <div class="resource-actions-overlay ${type}-actions-overlay">
        ${actionsHtml}
      </div>
      
      <!-- Preview Wrapper -->
      <div class="resource-preview-wrapper ${type}-preview-wrapper">
        ${previewHtml}
      </div>
      
      <!-- Badges -->
      <div class="badge resource-badge-left ${type}-type-badge">${badgeLeft}</div>
      <div class="badge resource-badge-center ${type}-duration-badge">${badgeCenter}</div>
      <div class="badge resource-badge-right ${type}-size-badge">${badgeRight}</div>
    </div>
  `;
};

// MutationObserver to automatically sync counts to subtab labels
function initCountSyncObserver() {
  const tabs = ['images', 'vectors', 'videos', 'sounds'];
  
  tabs.forEach(tab => {
    const summaryId = tab === 'images' ? 'image-count-summary' : `${tab.slice(0, -1)}-count-summary`;
    const summaryEl = document.getElementById(summaryId);
    const subtabCountEl = document.getElementById(`subtab-${tab}-count`);
    
    if (!summaryEl || !subtabCountEl) return;
    
    const updateSubtabCount = () => {
      const text = summaryEl.textContent || '';
      const match = text.match(/\d+/);
      const count = match ? match[0] : '0';
      subtabCountEl.textContent = `${count} ${tab.charAt(0).toUpperCase() + tab.slice(1)}`;
      
      const subtabBtn = subtabCountEl.closest('.sub-tab-btn');
      if (subtabBtn) {
        if (parseInt(count, 10) === 0) {
          subtabBtn.classList.add('count-zero');
        } else {
          subtabBtn.classList.remove('count-zero');
        }
      }
    };
    
    // Run initially
    updateSubtabCount();
    
    // Observe text changes
    const observer = new MutationObserver(updateSubtabCount);
    observer.observe(summaryEl, { childList: true, characterData: true, subtree: true });
  });
}
