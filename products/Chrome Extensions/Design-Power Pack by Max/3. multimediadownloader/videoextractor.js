// Video Extractor Feature Logic (Streamlined & Anti-Bloat)

let allVideos = [];
let selectedVideos = new Set();
let videoGridController = null;

if (document.readyState !== 'loading') {
  initVideoExtractor();
} else {
  document.addEventListener('DOMContentLoaded', initVideoExtractor);
}

function initVideoExtractor() {
  document.getElementById('filter-videos-type')?.addEventListener('change', filterAndRenderVideos);
  document.getElementById('filter-videos-layout')?.addEventListener('change', filterAndRenderVideos);

  videoGridController = window.setupDownloaderGridController?.({
    searchInputId: 'video-search',
    sortSelectId: 'sort-videos',
    sortPrefKey: 'videoSortPreference',
    selectAllId: 'select-all-videos',
    downloadBtnId: 'download-videos-btn',
    gridContainerId: 'video-grid-container',
    cardSelector: '.resource-card',
    selectedSet: selectedVideos,
    onFilterChange: filterAndRenderVideos,
    onDownloadSelected: downloadSelectedVideos
  });

  const grid = document.getElementById('video-grid-container');
  if (grid) {
    // Hover Play / Pause
    grid.addEventListener('mouseover', (e) => {
      const card = e.target.closest('.resource-card');
      const video = card?.querySelector('.video-preview');
      if (video && typeof video.play === 'function') {
        video.muted = false;
        video.play().catch(() => { video.muted = true; video.play().catch(() => {}); });
      }
    });

    grid.addEventListener('mouseout', (e) => {
      const card = e.target.closest('.resource-card');
      const related = e.relatedTarget ? e.relatedTarget.closest('.resource-card') : null;
      if (card && card !== related) {
        const video = card.querySelector('.video-preview');
        if (video && typeof video.pause === 'function') {
          video.pause();
          if (!video.classList.contains('is-scrubbing')) video.currentTime = 0;
        }
      }
    });

    // Card Action Delegation
    grid.addEventListener('click', (e) => {
      const card = e.target.closest('.resource-card');
      if (!card) return;
      const idx = parseInt(card.getAttribute('data-id'), 10);
      const vid = allVideos[idx];
      if (!vid) return;

      if (e.target.closest('.download-btn')) {
        e.stopPropagation();
        downloadSingleVideo(vid);
      } else if (e.target.closest('.open-tab-btn')) {
        e.stopPropagation();
        window.openResourceInNewTab?.(vid.url, { isVideo: true, title: vid.filename, poster: vid.poster });
      } else if (e.target.closest('.copy-link-btn')) {
        e.stopPropagation();
        window.copyResourceToClipboard?.(vid.url);
      }
    });
  }
}

// ── Master Scanner Integration ──
window.updateVideosData = function (videosList) {
  allVideos = videosList || [];
  selectedVideos.clear();
  filterAndRenderVideos();
  resolveVideoFileSizes(allVideos);
};

window.resetVideosState = function () {
  allVideos = [];
  selectedVideos.clear();
  videoGridController?.updateSelectAllState();
  videoGridController?.updateDownloadBtnState();
};

window.showVideoErrorState = function (message) {
  window.showGridErrorState?.('video-grid-container', message);
};

// ── Filter & Render ──
function filterAndRenderVideos() {
  const grid = document.getElementById('video-grid-container');
  if (!grid) return;

  if (allVideos.length === 0) {
    const emptyMsg = window.i18n ? window.i18n.t('downloader.emptyVideos') : 'No videos found on this page.';
    grid.innerHTML = `<div class="loading-state" style="animation: none;"><p>${emptyMsg}</p></div>`;
    updateVideoCountSummary();
    return;
  }

  const typeVal = document.getElementById('filter-videos-type')?.value || 'all';
  const layoutVal = document.getElementById('filter-videos-layout')?.value || 'all';
  const sortVal = document.getElementById('sort-videos')?.value || 'none';

  let filtered = [...allVideos];

  if (typeVal !== 'all') {
    filtered = filtered.filter(v => getVideoFormatLabel(v.url).toLowerCase() === typeVal);
  }

  if (layoutVal !== 'all') {
    filtered = filtered.filter(v => {
      if (!v.width || !v.height) return true;
      const ratio = v.width / v.height;
      if (layoutVal === 'square') return Math.abs(ratio - 1.0) <= 0.05;
      if (layoutVal === 'wide') return ratio > 1.05;
      if (layoutVal === 'tall') return ratio < 0.95;
      return true;
    });
  }

  if (sortVal === 'type') {
    filtered.sort((a, b) => getVideoFormatLabel(a.url).localeCompare(getVideoFormatLabel(b.url)));
  } else if (sortVal === 'size') {
    filtered.sort((a, b) => (b.sizeInBytes || 0) - (a.sizeInBytes || 0));
  } else if (sortVal === 'length') {
    filtered.sort((a, b) => (b.duration || 0) - (a.duration || 0));
  } else if (sortVal === 'name') {
    filtered.sort((a, b) => (a.filename || '').localeCompare(b.filename || ''));
  }

  const t = (k, def) => (window.i18n ? window.i18n.t(k, def) : def);

  grid.innerHTML = filtered.map(vid => {
    const origIdx = allVideos.indexOf(vid);
    const isSelected = selectedVideos.has(origIdx.toString());
    const posterAttr = vid.poster ? `poster="${window.escAttr(vid.poster)}"` : '';
    const resText = (vid.width && vid.height) ? `${vid.width}x${vid.height}` : '';
    const sizeLabel = vid.fileSize ? (resText ? `${resText} • ${vid.fileSize}` : vid.fileSize) : resText;

    const preview = `
      <video class="video-preview" loop playsinline ${posterAttr} preload="metadata">
        <source src="${window.escAttr(vid.url)}" type="video/mp4">
        <source src="${window.escAttr(vid.url)}" type="video/webm">
      </video>
      <div class="video-scrubber-container">
        <input type="range" class="video-scrubber" min="0" max="100" value="0" step="any" title="${t('downloader.scrubVideo', 'Scrub video')}">
      </div>
    `;

    return window.createResourceCardHtml({
      id: origIdx,
      type: 'video',
      dataAttributes: `data-id="${origIdx}" data-filesize="${window.escAttr(String(vid.fileSize || ''))}"`,
      previewHtml: preview,
      isSelected,
      badgeLeft: getVideoFormatLabel(vid.url),
      badgeCenter: formatDuration(vid.duration),
      badgeRight: sizeLabel,
      actionsHtml: `
        <button class="btn btn-ghost btn-icon copy-link-btn" title="${t('downloader.copyVideoUrl', 'Copy video URL')}"><span class="icon-mask" style="mask-image: url('svg/copy.svg'); -webkit-mask-image: url('svg/copy.svg');"></span></button>
        <button class="btn btn-ghost btn-icon open-tab-btn" title="${t('downloader.openNewTab', 'Open in new tab')}"><span class="icon-mask" style="mask-image: url('svg/open-tab.svg'); -webkit-mask-image: url('svg/open-tab.svg');"></span></button>
        <button class="btn btn-ghost btn-icon download-btn" title="${t('downloader.downloadVideoFile', 'Download video file')}"><span class="icon-mask" style="mask-image: url('svg/download.svg'); -webkit-mask-image: url('svg/download.svg');"></span></button>
      `
    });
  }).join('');

  // Wire up metadata and timeline scrubber
  grid.querySelectorAll('.video-preview').forEach(video => {
    const card = video.closest('.resource-card');
    const idx = parseInt(card?.getAttribute('data-id'), 10);
    const vid = allVideos[idx];
    if (!vid) return;

    const onMeta = () => {
      vid.width = video.videoWidth;
      vid.height = video.videoHeight;
      if (video.duration && !isNaN(video.duration)) vid.duration = video.duration;
      const rBadge = card.querySelector('.resource-badge-right');
      if (rBadge && vid.width) rBadge.textContent = `${vid.width}x${vid.height}`;
      const cBadge = card.querySelector('.resource-badge-center');
      if (cBadge && vid.duration) cBadge.textContent = formatDuration(vid.duration);
    };

    video.addEventListener('loadedmetadata', onMeta);
    if (video.videoWidth > 0) onMeta();

    video.addEventListener('timeupdate', () => {
      const scrubber = card?.querySelector('.video-scrubber');
      if (scrubber && video.duration && !video.classList.contains('is-scrubbing')) {
        scrubber.value = (video.currentTime / video.duration) * 100;
      }
    });
  });

  grid.querySelectorAll('.video-scrubber').forEach(scrubber => {
    const card = scrubber.closest('.resource-card');
    const video = card?.querySelector('.video-preview');
    if (!video) return;

    scrubber.addEventListener('input', (e) => {
      e.stopPropagation();
      video.classList.add('is-scrubbing');
      if (video.duration) video.currentTime = (parseFloat(scrubber.value) / 100) * video.duration;
    });

    scrubber.addEventListener('change', (e) => {
      e.stopPropagation();
      video.classList.remove('is-scrubbing');
      if (!card.matches(':hover')) { video.pause(); video.currentTime = 0; }
    });

    ['click', 'mousedown'].forEach(ev => scrubber.addEventListener(ev, e => e.stopPropagation()));
  });

  videoGridController?.updateSelectAllState();
  videoGridController?.updateDownloadBtnState();
  updateVideoCountSummary();
}

function updateVideoCountSummary() {
  const countEl = document.getElementById('video-count-summary');
  if (countEl) {
    countEl.textContent = (window.i18n && typeof window.i18n.t === 'function')
      ? window.i18n.t('downloader.foundVideos', '{0} videos found', [allVideos.length])
      : `${allVideos.length} videos found`;
  }
}

function resolveVideoFileSizes(videosList) {
  videosList.forEach(vid => {
    if (vid.fileSize || vid.sizeInBytes !== undefined) return;
    window.fetchResourceSize?.(vid.url).then(size => {
      if (size > 0) {
        vid.sizeInBytes = size;
        vid.fileSize = window.formatBytes(size);
        const card = document.querySelector(`#video-grid-container .resource-card[data-id="${allVideos.indexOf(vid)}"]`);
        const badge = card?.querySelector('.resource-badge-right');
        if (badge) {
          const res = (vid.width && vid.height) ? `${vid.width}x${vid.height} • ` : '';
          badge.textContent = `${res}${vid.fileSize}`;
        }
      }
    });
  });
}

function getVideoFormatLabel(url) {
  const clean = (url || '').split(/[?#]/)[0].toLowerCase();
  if (clean.endsWith('.mp4') || clean.includes('video/mp4')) return 'MP4';
  if (clean.endsWith('.webm') || clean.includes('video/webm')) return 'WEBM';
  if (clean.endsWith('.mov')) return 'MOV';
  return 'VIDEO';
}

function formatDuration(sec) {
  if (!sec || isNaN(sec) || sec <= 0) return '0:00';
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${s < 10 ? '0' : ''}${s}`;
}

function downloadSingleVideo(video) {
  window.downloadSingleResource?.(video.url, video.filename || 'video.mp4');
}

function downloadSelectedVideos() {
  const indices = Array.from(selectedVideos).map(Number);
  indices.forEach(idx => {
    const vid = allVideos[idx];
    if (vid) downloadSingleVideo(vid);
  });
  window.showToast?.(`Starting ${indices.length} video downloads...`);
}
