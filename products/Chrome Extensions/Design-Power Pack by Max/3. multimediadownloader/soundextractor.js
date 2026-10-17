// Sound Extractor Feature Logic (Streamlined & Anti-Bloat)

let allSounds = [];
let selectedSounds = new Set();
let soundGridController = null;

if (document.readyState !== 'loading') {
  initSoundExtractor();
} else {
  document.addEventListener('DOMContentLoaded', initSoundExtractor);
}

function initSoundExtractor() {
  document.getElementById('filter-sounds-type')?.addEventListener('change', renderSoundsGrid);

  soundGridController = window.setupDownloaderGridController?.({
    searchInputId: 'sound-search',
    sortSelectId: 'sort-sounds',
    sortPrefKey: 'soundSortPreference',
    selectAllId: 'select-all-sounds',
    downloadBtnId: 'download-sounds-btn',
    gridContainerId: 'sound-grid-container',
    cardSelector: '.resource-card',
    selectedSet: selectedSounds,
    onFilterChange: renderSoundsGrid,
    onDownloadSelected: downloadSelectedSounds
  });

  const grid = document.getElementById('sound-grid-container');
  if (grid) {
    // Hover play / pause
    grid.addEventListener('mouseover', (e) => {
      const card = e.target.closest('.resource-card');
      const audio = card?.querySelector('.sound-preview');
      if (card && audio && typeof audio.play === 'function') {
        if (card.classList.contains('playing')) return;
        grid.querySelectorAll('.sound-preview').forEach(a => {
          if (a !== audio && typeof a.pause === 'function') {
            a.pause();
            a.currentTime = 0;
            a.closest('.resource-card')?.classList.remove('playing');
          }
        });
        card.classList.add('playing');
        audio.play().catch(() => card.classList.remove('playing'));
      }
    });

    grid.addEventListener('mouseout', (e) => {
      const card = e.target.closest('.resource-card');
      const rel = e.relatedTarget ? e.relatedTarget.closest('.resource-card') : null;
      if (card && card !== rel) {
        const audio = card.querySelector('.sound-preview');
        if (audio && typeof audio.pause === 'function') {
          audio.pause();
          card.classList.remove('playing');
          if (!audio.classList.contains('is-scrubbing')) audio.currentTime = 0;
        }
      }
    });

    // Action buttons delegation
    grid.addEventListener('click', (e) => {
      const card = e.target.closest('.resource-card');
      if (!card) return;
      const url = card.getAttribute('data-url');
      const filename = card.getAttribute('data-filename');

      if (e.target.closest('.download-btn')) {
        e.stopPropagation();
        downloadSingleSound(url, filename);
      } else if (e.target.closest('.open-tab-btn')) {
        e.stopPropagation();
        window.openResourceInNewTab?.(url);
      }
    });
  }
}

// ── Master Scanner Integration ──
window.updateSoundsData = function (sounds) {
  resetSoundsPreviewState();
  allSounds = sounds || [];
  selectedSounds.clear();
  resolveSoundFileSizes(allSounds);
  renderSoundsGrid();
};

window.resetSoundsState = function () {
  resetSoundsPreviewState();
  allSounds = [];
  selectedSounds.clear();
  soundGridController?.updateSelectAllState();
  soundGridController?.updateDownloadBtnState();
};

window.showSoundErrorState = function (message) {
  window.showGridErrorState?.('sound-grid-container', message);
};

function resetSoundsPreviewState() {
  const grid = document.getElementById('sound-grid-container');
  grid?.querySelectorAll('.sound-preview').forEach(a => {
    a.pause?.();
    a.currentTime = 0;
  });
  grid?.querySelectorAll('.resource-card').forEach(c => c.classList.remove('playing'));
}

// ── Render Grid ──
function renderSoundsGrid() {
  const grid = document.getElementById('sound-grid-container');
  if (!grid) return;

  if (allSounds.length === 0) {
    const emptyMsg = window.i18n ? window.i18n.t('downloader.emptySounds') : 'No sounds found on this page.';
    grid.innerHTML = `<div class="loading-state" style="animation: none;"><p>${emptyMsg}</p></div>`;
    updateSoundCountLabel();
    return;
  }

  const typeVal = document.getElementById('filter-sounds-type')?.value || 'all';
  const sortVal = document.getElementById('sort-sounds')?.value || 'none';

  let filtered = [...allSounds];

  if (typeVal !== 'all') {
    filtered = filtered.filter(s => {
      const ext = getSoundFormatLabel(s.url).toLowerCase();
      if (typeVal === 'mp3') return ext === 'mp3';
      if (typeVal === 'wav') return ext === 'wav';
      if (typeVal === 'ogg') return ext === 'ogg';
      if (typeVal === 'aac') return ext === 'aac' || ext === 'm4a';
      return false;
    });
  }

  if (sortVal === 'type') {
    filtered.sort((a, b) => getSoundFormatLabel(a.url).localeCompare(getSoundFormatLabel(b.url)));
  } else if (sortVal === 'size') {
    filtered.sort((a, b) => (b.sizeInBytes || 0) - (a.sizeInBytes || 0));
  } else if (sortVal === 'length') {
    filtered.sort((a, b) => (b.duration || 0) - (a.duration || 0));
  } else if (sortVal === 'name') {
    filtered.sort((a, b) => (a.filename || '').localeCompare(b.filename || ''));
  }

  const t = (k, def) => (window.i18n ? window.i18n.t(k, def) : def);

  grid.innerHTML = filtered.map(sound => {
    const isSelected = selectedSounds.has(sound.url);
    const formatLabel = getSoundFormatLabel(sound.url);
    const durationText = sortVal === 'size' && sound.sizeInBytes !== undefined
      ? window.formatBytes(sound.sizeInBytes)
      : (sound.duration ? formatDuration(sound.duration) : '--:--');

    const preview = `
      <div class="sound-preview-wrapper">
        <svg class="sound-wave-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
          <rect x="4" y="9" width="4" height="6" rx="1"></rect>
          <rect x="10" y="4" width="4" height="16" rx="1"></rect>
          <rect x="16" y="7" width="4" height="10" rx="1"></rect>
        </svg>
        <div class="sound-title" title="${window.escAttr(sound.filename)}">${window.escAttr(sound.filename)}</div>
        <audio class="sound-preview" src="${window.escAttr(sound.url)}" loop playsinline preload="metadata"></audio>
        <div class="sound-scrubber-container">
          <input type="range" class="sound-scrubber" min="0" max="100" value="0" step="any" title="${t('downloader.scrubAudio', 'Scrub audio')}">
        </div>
      </div>
    `;

    return window.createResourceCardHtml({
      id: sound.url,
      type: 'sound',
      dataAttributes: `data-url="${window.escAttr(sound.url)}" data-filename="${window.escAttr(sound.filename)}"`,
      previewHtml: preview,
      isSelected,
      badgeLeft: formatLabel,
      badgeRight: durationText,
      actionsHtml: `
        <button class="btn btn-ghost btn-icon open-tab-btn" title="${t('downloader.openNewTab', 'Open in new tab')}"><span class="icon-mask" style="mask-image: url('svg/open-tab.svg'); -webkit-mask-image: url('svg/open-tab.svg');"></span></button>
        <button class="btn btn-ghost btn-icon download-btn" title="${t('downloader.downloadImmediate', 'Download immediately')}"><span class="icon-mask" style="mask-image: url('svg/download.svg'); -webkit-mask-image: url('svg/download.svg');"></span></button>
      `
    });
  }).join('');

  // Audio metadata resolving & scrubber events
  grid.querySelectorAll('.resource-card').forEach(card => {
    const audio = card.querySelector('.sound-preview');
    if (!audio) return;

    const onMeta = () => {
      if (audio.duration && !isNaN(audio.duration)) {
        const sound = allSounds.find(s => s.url === card.getAttribute('data-url'));
        if (sound) sound.duration = audio.duration;
        const b = card.querySelector('.resource-badge-right');
        if (b && !card.matches(':hover')) b.textContent = formatDuration(audio.duration);
      }
    };

    audio.addEventListener('loadedmetadata', onMeta);
    if (audio.duration) onMeta();

    audio.addEventListener('timeupdate', () => {
      const scrubber = card.querySelector('.sound-scrubber');
      if (scrubber && audio.duration && !audio.classList.contains('is-scrubbing')) {
        scrubber.value = (audio.currentTime / audio.duration) * 100;
      }
    });

    const scrubber = card.querySelector('.sound-scrubber');
    if (scrubber) {
      scrubber.addEventListener('input', (e) => {
        e.stopPropagation();
        audio.classList.add('is-scrubbing');
        if (audio.duration) audio.currentTime = (parseFloat(scrubber.value) / 100) * audio.duration;
      });
      scrubber.addEventListener('change', (e) => {
        e.stopPropagation();
        audio.classList.remove('is-scrubbing');
        if (!card.matches(':hover')) { audio.pause(); audio.currentTime = 0; }
      });
      ['click', 'mousedown'].forEach(ev => scrubber.addEventListener(ev, e => e.stopPropagation()));
    }
  });

  soundGridController?.updateSelectAllState();
  soundGridController?.updateDownloadBtnState();
  updateSoundCountLabel();
}

function updateSoundCountLabel() {
  const countEl = document.getElementById('sound-count-summary');
  if (countEl) {
    countEl.textContent = (window.i18n && typeof window.i18n.t === 'function')
      ? window.i18n.t('downloader.foundSounds', '{0} sounds found', [allSounds.length])
      : `${allSounds.length} sounds found`;
  }
}

function resolveSoundFileSizes(soundsList) {
  soundsList.forEach(s => {
    if (s.sizeInBytes !== undefined) return;
    window.fetchResourceSize?.(s.url).then(size => {
      if (size > 0) s.sizeInBytes = size;
    });
  });
}

function getSoundFormatLabel(url) {
  if (url.startsWith('data:')) {
    const match = url.match(/^data:audio\/([a-zA-Z+]+);/);
    return match ? match[1].toUpperCase() : 'DATA';
  }
  const clean = url.split(/[?#]/)[0].toLowerCase();
  const idx = clean.lastIndexOf('.');
  return idx !== -1 ? clean.substring(idx + 1).toUpperCase() : 'MP3';
}

function formatDuration(sec) {
  if (!sec || isNaN(sec) || sec === Infinity) return '0:00';
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${s < 10 ? '0' : ''}${s}`;
}

function downloadSingleSound(url, filename) {
  window.downloadSingleResource?.(url, filename || 'audio.mp3');
}

function downloadSelectedSounds() {
  const urls = Array.from(selectedSounds);
  urls.forEach(url => {
    const s = allSounds.find(item => item.url === url);
    downloadSingleSound(url, s?.filename);
  });
  window.showToast?.(`Starting ${urls.length} sound downloads...`);
}
