// Video Extractor Feature Logic

let allVideos = [];
let selectedVideos = new Set();

if (document.readyState !== 'loading') {
  initVideoExtractor();
} else {
  document.addEventListener('DOMContentLoaded', initVideoExtractor);
}

function initVideoExtractor() {
  const selectAllCheckbox = document.getElementById('select-all-videos');
  const downloadBtn = document.getElementById('download-videos-btn');
  const gridContainer = document.getElementById('video-grid-container');

  // Handle Select All Checkbox
  if (selectAllCheckbox) {
    selectAllCheckbox.addEventListener('change', (e) => {
      const isChecked = e.target.checked;
      const visibleCards = gridContainer.querySelectorAll('.resource-card');
      
      visibleCards.forEach(card => {
        const id = card.getAttribute('data-id');
        const checkbox = card.querySelector('.card-checkbox');
        
        if (isChecked) {
          card.classList.add('selected');
          if (checkbox) checkbox.checked = true;
          selectedVideos.add(id);
        } else {
          card.classList.remove('selected');
          if (checkbox) checkbox.checked = false;
          selectedVideos.delete(id);
        }
      });

      updateVideoDownloadButtonState();
    });
  }

  // Handle Sort Selector
  const sortSelect = document.getElementById('sort-videos');
  if (sortSelect) {
    chrome.storage.local.get({ videoSortPreference: 'none' }, (data) => {
      if (data.videoSortPreference) {
        sortSelect.value = data.videoSortPreference;
        if (allVideos.length > 0) {
          filterAndRenderVideos();
        }
      }
    });

    sortSelect.addEventListener('change', () => {
      const val = sortSelect.value;
      chrome.storage.local.set({ videoSortPreference: val }, () => {
        filterAndRenderVideos();
      });
    });

    const typeFilter = document.getElementById('filter-videos-type');
    const layoutFilter = document.getElementById('filter-videos-layout');
    if (typeFilter) {
      typeFilter.addEventListener('change', () => {
        filterAndRenderVideos();
      });
    }
    if (layoutFilter) {
      layoutFilter.addEventListener('change', () => {
        filterAndRenderVideos();
      });
    }
  }

  // Handle Bulk Download Button
  if (downloadBtn) {
    downloadBtn.addEventListener('click', () => {
      if (selectedVideos.size === 0) return;
      downloadSelectedVideos();
    });
  }

  // Hover Play / Pause logic using card-level event delegation (prevents scrubber mouseout conflicts)
  if (gridContainer) {
    gridContainer.addEventListener('mouseover', (e) => {
      const card = e.target.closest('.resource-card');
      if (card) {
        const video = card.querySelector('.video-preview');
        if (video && typeof video.play === 'function') {
          video.muted = false; // Unmute to play audio
          video.play().catch(() => {
            // Autoplay restriction fallback: mute and play
            video.muted = true;
            video.play().catch(() => {});
          });
          
          // Instantly update badge to show active time tracking
          const durationBadge = card.querySelector('.resource-badge-center');
          if (durationBadge && video.duration) {
            durationBadge.textContent = `${formatDuration(video.currentTime)} / ${formatDuration(video.duration)}`;
          }
        }
      }
    });

    gridContainer.addEventListener('mouseout', (e) => {
      const card = e.target.closest('.resource-card');
      const related = e.relatedTarget ? e.relatedTarget.closest('.resource-card') : null;
      if (card && card !== related) {
        const video = card.querySelector('.video-preview');
        if (video && typeof video.pause === 'function') {
          video.pause();
          if (!video.classList.contains('is-scrubbing')) {
            video.currentTime = 0;
            
            // Revert center badge back to total duration
            const durationBadge = card.querySelector('.resource-badge-center');
            if (durationBadge && video.duration) {
              durationBadge.textContent = formatDuration(video.duration);
            }
          }
        }
      }
    });

    // Card Click Selection & Actions Delegation
    gridContainer.addEventListener('click', (e) => {
      const card = e.target.closest('.resource-card');
      if (!card) return;

      const id = card.getAttribute('data-id');
      const index = parseInt(id);
      const videoInfo = allVideos[index];
      if (!videoInfo) return;

      // 1. Handle Quick Download button click
      if (e.target.closest('.download-btn')) {
        e.stopPropagation();
        downloadSingleVideo(videoInfo);
        return;
      }

      // Handle Open in New Tab click
      if (e.target.closest('.open-tab-btn')) {
        e.stopPropagation();
        window.openResourceInNewTab(videoInfo.url, { isVideo: true, title: videoInfo.filename, poster: videoInfo.poster });
        return;
      }

      // 1b. Handle Copy Link button click
      if (e.target.closest('.copy-link-btn')) {
        e.stopPropagation();
        window.copyResourceToClipboard(videoInfo.url);
        return;
      }

      // 2. Handle card selection click
      const checkbox = card.querySelector('.card-checkbox');
      if (card.classList.contains('selected')) {
        card.classList.remove('selected');
        if (checkbox) checkbox.checked = false;
        selectedVideos.delete(id);
      } else {
        card.classList.add('selected');
        if (checkbox) checkbox.checked = true;
        selectedVideos.add(id);
      }

      updateVideoSelectAllState();
      updateVideoDownloadButtonState();
    });
  }
}

// Global methods exposed to coordinate with unified scan

window.updateVideosData = function(videosList) {
  allVideos = videosList;
  selectedVideos.clear();
  updateVideoDownloadButtonState();
  const selectAllCheckbox = document.getElementById('select-all-videos');
  if (selectAllCheckbox) selectAllCheckbox.checked = false;
  filterAndRenderVideos();
  resolveVideoFileSizes(allVideos);
};

window.resetVideosState = function() {
  allVideos = [];
  selectedVideos.clear();
  updateVideoDownloadButtonState();
  const selectAllCheckbox = document.getElementById('select-all-videos');
  if (selectAllCheckbox) selectAllCheckbox.checked = false;
};

// Filter and Render videos in the grid
function filterAndRenderVideos() {
  const gridContainer = document.getElementById('video-grid-container');
  if (!gridContainer) return;

  if (allVideos.length === 0) {
    gridContainer.innerHTML = `
      <div class="loading-state" style="animation: none;">
        <p>No videos found on this page.</p>
      </div>
    `;
    updateVideoCountSummary();
    return;
  }

  // Get active filter values
  const typeFilter = document.getElementById('filter-videos-type');
  const layoutFilter = document.getElementById('filter-videos-layout');
  const typeVal = typeFilter ? typeFilter.value : 'all';
  const layoutVal = layoutFilter ? layoutFilter.value : 'all';

  let filtered = [...allVideos];

  // Apply type filter
  if (typeVal !== 'all') {
    filtered = filtered.filter(vid => {
      const ext = getVideoFormatLabel(vid.url).toLowerCase();
      if (typeVal === 'mp4') return ext === 'mp4';
      if (typeVal === 'webm') return ext === 'webm';
      return false;
    });
  }

  // Apply layout aspect ratio filter
  if (layoutVal !== 'all') {
    filtered = filtered.filter(vid => {
      if (!vid.width || !vid.height) return true; // keep unresolved elements so they load dimensions
      const ratio = vid.width / vid.height;
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
  const sortSelect = document.getElementById('sort-videos');
  const sortVal = sortSelect ? sortSelect.value : 'none';
  if (sortVal === 'type') {
    filtered.sort((a, b) => getVideoFormatLabel(a.url).localeCompare(getVideoFormatLabel(b.url)));
  } else if (sortVal === 'size') {
    filtered.sort((a, b) => (b.sizeInBytes || 0) - (a.sizeInBytes || 0));
  } else if (sortVal === 'length') {
    filtered.sort((a, b) => (b.duration || 0) - (a.duration || 0));
  } else if (sortVal === 'name') {
    filtered.sort((a, b) => (a.filename || '').localeCompare(b.filename || ''));
  }

  gridContainer.innerHTML = filtered.map((vid) => {
    const originalIndex = allVideos.indexOf(vid);
    const isSelected = selectedVideos.has(originalIndex.toString());
    const posterAttr = vid.poster ? `poster="${window.escAttr(vid.poster)}"` : '';
    const formatLabel = getVideoFormatLabel(vid.url);
    const durationLabel = formatDuration(vid.duration);
    
    const sizeText = (vid.width && vid.height) ? `${vid.width}x${vid.height}` : '';
    const sizeLabel = vid.fileSize ? (sizeText ? `${sizeText} • ${vid.fileSize}` : vid.fileSize) : sizeText;

    const previewWrapped = `
      <video class="video-preview" loop playsinline ${posterAttr} preload="metadata">
        <source src="${window.escAttr(vid.url)}" type="video/mp4">
        <source src="${window.escAttr(vid.url)}" type="video/webm">
        Your browser does not support video previews.
      </video>
      <div class="video-scrubber-container">
        <input type="range" class="video-scrubber" min="0" max="100" value="0" step="any" title="Scrub video">
      </div>
    `;

    return window.createResourceCardHtml({
      id: originalIndex,
      type: 'video',
      dataAttributes: `data-id="${originalIndex}" data-filesize="${window.escAttr(String(vid.fileSize || ''))}"`,
      previewHtml: previewWrapped,
      isSelected: isSelected,
      badgeLeft: formatLabel,
      badgeCenter: durationLabel,
      badgeRight: sizeLabel,
      actionsHtml: `
        <button class="btn btn-ghost btn-icon copy-link-btn" title="Copy video URL">
          <span class="icon-mask" style="mask-image: url('svg/copy.svg'); -webkit-mask-image: url('svg/copy.svg');"></span>
        </button>
        <button class="btn btn-ghost btn-icon open-tab-btn" title="Open in new tab">
          <span class="icon-mask" style="mask-image: url('svg/open-tab.svg'); -webkit-mask-image: url('svg/open-tab.svg');"></span>
        </button>
        <button class="btn btn-ghost btn-icon download-btn" title="Download video file">
          <span class="icon-mask" style="mask-image: url('svg/download.svg'); -webkit-mask-image: url('svg/download.svg');"></span>
        </button>
      `
    });
  }).join('');

  // Attach metadata loaded listeners to resolve actual video dimensions and duration
  const videoElements = gridContainer.querySelectorAll('.video-preview');
  videoElements.forEach(video => {
    const card = video.closest('.resource-card');
    const id = card ? card.getAttribute('data-id') : null;
    if (id === null) return;
    const index = parseInt(id);
    const vid = allVideos[index];
    if (!vid) return;

    const updateBadge = (w, h, duration) => {
      vid.width = w;
      vid.height = h;
      if (duration && !isNaN(duration)) vid.duration = duration;

      if (card) {
        const sizeBadge = card.querySelector('.resource-badge-right');
        if (sizeBadge) {
          const resText = `${w}x${h}`;
          const fSize = card.getAttribute('data-filesize') || '';
          sizeBadge.textContent = fSize ? (resText ? `${resText} • ${fSize}` : fSize) : resText;
        }
        const durationBadge = card.querySelector('.resource-badge-center');
        if (durationBadge && duration && !isNaN(duration) && duration > 0) {
          durationBadge.textContent = formatDuration(duration);
        }
      }
    };

    const events = ['loadedmetadata', 'canplay', 'resize', 'durationchange'];
    events.forEach(evt => {
      video.addEventListener(evt, () => {
        updateBadge(video.videoWidth, video.videoHeight, video.duration);
      });
    });

    if (video.videoWidth > 0 && video.videoHeight > 0) {
      updateBadge(video.videoWidth, video.videoHeight, video.duration);
    }

    // Sync scrubber input as video plays
    video.addEventListener('timeupdate', () => {
      const scrubber = card ? card.querySelector('.video-scrubber') : null;
      if (scrubber && video.duration && !video.classList.contains('is-scrubbing')) {
        scrubber.value = (video.currentTime / video.duration) * 100;
      }
      
      // Update center badge with current time / total time if card is hovered
      const durationBadge = card ? card.querySelector('.resource-badge-center') : null;
      if (durationBadge && video.duration) {
        if (card.matches(':hover') || video.classList.contains('is-scrubbing')) {
          durationBadge.textContent = `${formatDuration(video.currentTime)} / ${formatDuration(video.duration)}`;
        }
      }
    });
  });

  // Attach scrubber seek events
  const scrubbers = gridContainer.querySelectorAll('.video-scrubber');
  scrubbers.forEach(scrubber => {
    const card = scrubber.closest('.resource-card');
    const video = card ? card.querySelector('.video-preview') : null;
    if (!video) return;

    scrubber.addEventListener('input', (e) => {
      e.stopPropagation();
      video.classList.add('is-scrubbing');
      if (video.duration) {
        const targetTime = (parseFloat(scrubber.value) / 100) * video.duration;
        video.currentTime = targetTime;
        
        // Update center badge dynamically during scrubbing
        const durationBadge = card ? card.querySelector('.resource-badge-center') : null;
        if (durationBadge) {
          durationBadge.textContent = `${formatDuration(targetTime)} / ${formatDuration(video.duration)}`;
        }
      }
    });

    scrubber.addEventListener('change', (e) => {
      e.stopPropagation();
      video.classList.remove('is-scrubbing');
      const isHovered = card.matches(':hover');
      if (!isHovered) {
        video.pause();
        video.currentTime = 0;
      }
    });

    scrubber.addEventListener('click', (e) => {
      e.stopPropagation(); // Avoid triggering card selection click
    });

    scrubber.addEventListener('mousedown', (e) => {
      e.stopPropagation(); // Avoid triggering drag select conflicts
    });
  });

  updateVideoSelectAllState();
  updateVideoCountSummary();
  updateVideoFilterCounts();
}

// Update video filter dropdown options with live counts
function updateVideoFilterCounts() {
  const typeSelect = document.getElementById('filter-videos-type');
  const layoutSelect = document.getElementById('filter-videos-layout');
  if (!typeSelect && !layoutSelect) return;

  const setOpt = window.setOpt; // [D3] Shared via common_utils.js

  let mp4 = 0, webm = 0;
  let square = 0, wide = 0, tall = 0, layoutAll = 0;

  allVideos.forEach(vid => {
    const fmt = getVideoFormatLabel(vid.url).toLowerCase();
    if (fmt === 'mp4') mp4++;
    else if (fmt === 'webm') webm++;

    if (vid.width && vid.height) {
      layoutAll++;
      const ratio = vid.width / vid.height;
      if (Math.abs(ratio - 1.0) <= 0.05) square++;
      else if (ratio > 1.05) wide++;
      else if (ratio < 0.95) tall++;
    }
  });

  const total = allVideos.length;
  if (typeSelect) {
    typeSelect.options[0].text = `All (${total})`;
    setOpt(typeSelect.options[1], mp4, 'MP4');
    setOpt(typeSelect.options[2], webm, 'WebM');
  }
  if (layoutSelect) {
    layoutSelect.options[0].text = `All Layouts (${layoutAll})`;
    setOpt(layoutSelect.options[1], square, 'Square');
    setOpt(layoutSelect.options[2], wide, 'Wide');
    setOpt(layoutSelect.options[3], tall, 'Tall');
  }
}

// Download a single Video
function downloadSingleVideo(video) {
  if (video.url.includes('.m3u8')) {
    const confirmCopy = confirm(
      "This is an HLS streaming resource (.m3u8) and cannot be downloaded directly as an MP4.\n\n" +
      "We recommend installing the free 'FetchV' extension from the Chrome Web Store, which specializes in capturing and downloading HLS streams locally.\n\n" +
      "• Select 'OK' to open the FetchV Chrome Web Store page (your HLS URL will also be copied to clipboard).\n" +
      "• Select 'Cancel' to copy only the raw .m3u8 link to your clipboard."
    );
    if (confirmCopy) {
      // Open FetchV Web Store page in a new tab
      chrome.tabs.create({
        url: 'https://chromewebstore.google.com/detail/fetchv-video-downloader-f/nfmmmhanepmpifddlkkmihkalkoekpfd'
      });
      // Also copy to clipboard for convenience
      navigator.clipboard.writeText(video.url);
      window.showToast('Opening FetchV Web Store & copied URL!');
    } else {
      navigator.clipboard.writeText(video.url).then(() => {
        window.showToast('Copied video URL!');
      }).catch(() => {
        window.showToast('Failed to copy');
      });
    }
    return;
  }

  if (typeof window.downloadSingleResource === 'function') {
    window.downloadSingleResource(video.url, video.filename);
  } else {
    chrome.downloads.download({
      url: video.url,
      filename: video.filename || 'video.mp4',
      conflictAction: 'uniquify'
    });
  }
}

// Download all selected videos
function downloadSelectedVideos() {
  const indices = Array.from(selectedVideos).map(Number);
  const m3u8Videos = [];
  const normalVideos = [];

  indices.forEach(idx => {
    const video = allVideos[idx];
    if (video) {
      if (video.url.includes('.m3u8')) {
        m3u8Videos.push(video);
      } else {
        normalVideos.push(video);
      }
    }
  });

  if (m3u8Videos.length > 0) {
    alert(
      `There are ${m3u8Videos.length} HLS streaming resources (.m3u8) selected. These files cannot be downloaded directly as MP4.\n\n` +
      `Please use the "Copy URL" button (link icon) on individual cards to copy the stream link and download using VLC, FFmpeg, or an online converter.`
    );
  }

  if (normalVideos.length === 0) return;

  const total = normalVideos.length;

  normalVideos.forEach(video => {
    if (typeof window.downloadSingleResource === 'function') {
      window.downloadSingleResource(video.url, video.filename);
    } else {
      chrome.downloads.download({
        url: video.url,
        filename: video.filename || `video-${Date.now()}.mp4`,
        conflictAction: 'uniquify'
      });
    }
  });
  window.showToast(`Starting ${total} video downloads...`);
}

// Update Download button text and disabled state
function updateVideoDownloadButtonState() {
  // [D5] Delegate to shared helper in common_utils.js
  window.updateDownloadBtnState('download-videos-btn', selectedVideos.size);
}

// Check/uncheck "Select All" checkbox
function updateVideoSelectAllState() {
  // [D6] Delegate to shared helper — videos use 'data-id' as key
  window.updateSelectAllCheckbox('select-all-videos', 'video-grid-container', 'data-id', selectedVideos);
}

// Update Video count summary label
function updateVideoCountSummary() {
  const countEl = document.getElementById('video-count-summary');
  if (countEl) {
    countEl.textContent = `${allVideos.length} videos found`;
  }
}

// Helper to show errors in the grid
window.showVideoErrorState = function(message) {
  // [D4] Delegate to shared helper in common_utils.js
  window.showGridErrorState('video-grid-container', message);
};

// Extract format extension from video URL
function getVideoFormatLabel(url) {
  if (!url) return 'MP4';
  const cleanUrl = url.split(/[?#]/)[0];
  const ext = cleanUrl.substring(cleanUrl.lastIndexOf('.') + 1).toUpperCase();
  return ext && ext.length <= 4 ? ext : 'MP4';
}

// Convert video duration in seconds to standard time format (MM:SS or H:MM:SS)
function formatDuration(seconds) {
  if (!seconds || isNaN(seconds) || seconds <= 0) return '';
  const secs = Math.floor(seconds);
  const h = Math.floor(secs / 3600);
  const m = Math.floor((secs % 3600) / 60);
  const s = secs % 60;

  const pad = (num) => String(num).padStart(2, '0');

  if (h > 0) {
    return `${h}:${pad(m)}:${pad(s)}`;
  } else {
    return `${m}:${pad(s)}`;
  }
}

// Resolve sizes of all videos in the list asynchronously
function resolveVideoFileSizes(videoList) {
  videoList.forEach(async (vid) => {
    if (vid.fileSize) return;
    // HLS streams have no downloadable size
    if (vid.url && vid.url.includes('.m3u8')) {
      vid.fileSize = 'HLS Stream';
      vid.sizeInBytes = 0;
      return;
    }
    if (vid.url.startsWith('blob:') || vid.url.startsWith('data:')) return;

    // [D2] Use shared fetchResourceSize from common_utils.js
    const bytes = await window.fetchResourceSize(vid.url);
    if (bytes > 0) {
      vid.sizeInBytes = bytes;
      vid.fileSize = window.formatBytes(bytes); // [D1]
    }
    const sortSelect = document.getElementById('sort-videos');
    if (sortSelect && sortSelect.value !== 'none') {
      if (window.videoResortTimer) clearTimeout(window.videoResortTimer);
      window.videoResortTimer = setTimeout(() => {
        filterAndRenderVideos();
      }, 350);
    }
  });
}

// [D1, D2] formatBytes and fetchFileSize are now in common_utils.js (window.formatBytes / window.fetchResourceSize)



