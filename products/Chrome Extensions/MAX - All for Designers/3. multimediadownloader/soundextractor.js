// Sound Extractor Feature Logic

let allSounds = [];
let selectedSounds = new Set();

if (document.readyState !== 'loading') {
  initSoundExtractor();
} else {
  document.addEventListener('DOMContentLoaded', initSoundExtractor);
}

function initSoundExtractor() {
  const soundsTabBtn = document.querySelector('[data-subtab="sounds"]');
  const selectAllCheckbox = document.getElementById('select-all-sounds');
  const downloadBtn = document.getElementById('download-sounds-btn');
  const gridContainer = document.getElementById('sound-grid-container');



  // Handle Refresh Button click
  const refreshBtn = document.getElementById('refresh-sounds-btn');
  if (refreshBtn) {
    refreshBtn.addEventListener('click', () => {
      if (typeof window.scanPageResources === 'function') {
        window.scanPageResources();
      }
    });
  }

  // Handle Select All Checkbox
  if (selectAllCheckbox) {
    selectAllCheckbox.addEventListener('change', (e) => {
      const isChecked = e.target.checked;
      const visibleCards = gridContainer.querySelectorAll('.resource-card');
      
      visibleCards.forEach(card => {
        const url = card.getAttribute('data-url');
        const checkbox = card.querySelector('.card-checkbox');
        
        if (isChecked) {
          card.classList.add('selected');
          if (checkbox) checkbox.checked = true;
          selectedSounds.add(url);
        } else {
          card.classList.remove('selected');
          if (checkbox) checkbox.checked = false;
          selectedSounds.delete(url);
        }
      });

      updateSoundDownloadButtonState();
    });
  }

  // Handle Sort Selector
  const sortSelect = document.getElementById('sort-sounds');
  if (sortSelect) {
    chrome.storage.local.get({ soundSortPreference: 'none' }, (data) => {
      if (data.soundSortPreference) {
        sortSelect.value = data.soundSortPreference;
        if (allSounds.length > 0) {
          renderSoundsGrid();
        }
      }
    });

    sortSelect.addEventListener('change', () => {
      const val = sortSelect.value;
      chrome.storage.local.set({ soundSortPreference: val }, () => {
        renderSoundsGrid();
      });
    });

    const typeFilter = document.getElementById('filter-sounds-type');
    if (typeFilter) {
      typeFilter.addEventListener('change', () => {
        renderSoundsGrid();
      });
    }
  }

  // Handle Bulk Download Button
  if (downloadBtn) {
    downloadBtn.addEventListener('click', () => {
      if (selectedSounds.size === 0) return;
      downloadSelectedSounds();
    });
  }

  // Card Event Delegation (selecting cards, hover play, download)
  if (gridContainer) {
    // 1. Hover Play Preview logic
    gridContainer.addEventListener('mouseover', (e) => {
      const card = e.target.closest('.resource-card');
      if (card) {
        if (card.classList.contains('playing')) return; // Avoid re-triggering while already playing
        const audio = card.querySelector('.sound-preview');
        if (audio && typeof audio.play === 'function') {
          // Stop any other playing audio on the page
          const allAudios = gridContainer.querySelectorAll('.sound-preview');
          allAudios.forEach(aud => {
            if (aud !== audio && typeof aud.pause === 'function') {
              aud.pause();
              aud.currentTime = 0;
              const otherCard = aud.closest('.resource-card');
              if (otherCard) {
                otherCard.classList.remove('playing');
                const otherBadge = otherCard.querySelector('.resource-badge-right');
                if (otherBadge && aud.duration) {
                  otherBadge.textContent = formatDuration(aud.duration);
                }
              }
            }
          });

          card.classList.add('playing');
          audio.play().catch(err => {
            // Silence autoplay rejections to prevent extension warning logs
            card.classList.remove('playing');
          });
          
          // Instantly update badge to show active time tracking
          const durationBadge = card.querySelector('.resource-badge-right');
          if (durationBadge && audio.duration) {
            durationBadge.textContent = `${formatDuration(audio.currentTime)} / ${formatDuration(audio.duration)}`;
          }
        }
      }
    });

    // 2. Hover Pause Preview logic
    gridContainer.addEventListener('mouseout', (e) => {
      const card = e.target.closest('.resource-card');
      const related = e.relatedTarget ? e.relatedTarget.closest('.resource-card') : null;
      if (card && card !== related) {
        const audio = card.querySelector('.sound-preview');
        if (audio && typeof audio.pause === 'function') {
          audio.pause();
          card.classList.remove('playing');
          if (!audio.classList.contains('is-scrubbing')) {
            audio.currentTime = 0;
            
            // Revert right badge back to total duration
            const durationBadge = card.querySelector('.resource-badge-right');
            if (durationBadge && audio.duration) {
              durationBadge.textContent = formatDuration(audio.duration);
            }
          }
        }
      }
    });

    // 3. Card click logic (download, checkbox toggle)
    gridContainer.addEventListener('click', (e) => {
      const card = e.target.closest('.resource-card');
      if (!card) return;

      const url = card.getAttribute('data-url');
      const filename = card.getAttribute('data-filename');

      // Handle single download button click
      const singleDownloadBtn = e.target.closest('.download-btn');
      if (singleDownloadBtn) {
        e.stopPropagation();
        downloadSingleSound(url, filename);
        return;
      }

      // Handle Open in New Tab click
      if (e.target.closest('.open-tab-btn')) {
        e.stopPropagation();
        window.openResourceInNewTab(url);
        return;
      }

      // Handle card body click (checkbox toggling)
      if (e.target.closest('.resource-checkbox-overlay') || e.target.tagName !== 'INPUT') {
        e.preventDefault(); // Prevent double triggering
        
        const checkbox = card.querySelector('.card-checkbox');
        if (checkbox) {
          checkbox.checked = !checkbox.checked;
          const isChecked = checkbox.checked;
          
          if (isChecked) {
            card.classList.add('selected');
            selectedSounds.add(url);
          } else {
            card.classList.remove('selected');
            selectedSounds.delete(url);
          }
          
          updateSoundSelectAllState();
          updateSoundDownloadButtonState();
        }
      }
    });
  }
}

// Reset playing preview states when scanning or tab switches
function resetSoundsPreviewState() {
  const gridContainer = document.getElementById('sound-grid-container');
  if (gridContainer) {
    const allAudios = gridContainer.querySelectorAll('.sound-preview');
    allAudios.forEach(audio => {
      if (typeof audio.pause === 'function') {
        audio.pause();
        audio.currentTime = 0;
      }
    });
    const allCards = gridContainer.querySelectorAll('.resource-card');
    allCards.forEach(card => {
      card.classList.remove('playing');
      const audio = card.querySelector('.sound-preview');
      const durationBadge = card.querySelector('.resource-badge-right');
      if (durationBadge && audio && audio.duration) {
        durationBadge.textContent = formatDuration(audio.duration);
      }
    });
  }
}

// Format duration to string mm:ss
function formatDuration(sec) {
  if (!sec || isNaN(sec) || sec === Infinity) return '0:00';
  const minutes = Math.floor(sec / 60);
  const seconds = Math.floor(sec % 60);
  return `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
}

// Extract sound format label
function getSoundFormatLabel(url) {
  if (url.startsWith('data:')) {
    const match = url.match(/^data:audio\/([a-zA-Z+]+);/);
    return match ? match[1].toUpperCase() : 'DATA';
  }
  const cleanUrl = url.split(/[?#]/)[0].toLowerCase();
  const dotIndex = cleanUrl.lastIndexOf('.');
  if (dotIndex !== -1) {
    const ext = cleanUrl.substring(dotIndex + 1);
    if (ext && ext.length <= 5) {
      return ext.toUpperCase();
    }
  }
  return 'MP3';
}

// Update sounds data list and render
window.updateSoundsData = function(sounds) {
  resetSoundsPreviewState();
  selectedSounds.clear();
  allSounds = sounds;
  
  resolveSoundFileSizes(allSounds);

  updateSoundSelectAllState();
  updateSoundDownloadButtonState();
  renderSoundsGrid();
};

// Render sounds grid container
function renderSoundsGrid() {
  const gridContainer = document.getElementById('sound-grid-container');
  if (!gridContainer) return;

  if (allSounds.length === 0) {
    gridContainer.innerHTML = `
      <div class="loading-state" style="animation: none;">
        <p>No sounds found on this page.</p>
      </div>
    `;
    updateSoundCountLabel();
    return;
  }

  // Get active type filter value
  const typeFilter = document.getElementById('filter-sounds-type');
  const typeVal = typeFilter ? typeFilter.value : 'all';

  let filtered = [...allSounds];

  // Apply format filter
  if (typeVal !== 'all') {
    filtered = filtered.filter(sound => {
      const ext = getSoundFormatLabel(sound.url).toLowerCase();
      if (typeVal === 'mp3') return ext === 'mp3';
      if (typeVal === 'wav') return ext === 'wav';
      if (typeVal === 'ogg') return ext === 'ogg';
      if (typeVal === 'aac') return ext === 'aac' || ext === 'm4a';
      return false;
    });
  }

  const sortSelect = document.getElementById('sort-sounds');
  const sortVal = sortSelect ? sortSelect.value : 'none';
  if (sortVal === 'type') {
    filtered.sort((a, b) => getSoundFormatLabel(a.url).localeCompare(getSoundFormatLabel(b.url)));
  } else if (sortVal === 'size') {
    filtered.sort((a, b) => (b.sizeInBytes || 0) - (a.sizeInBytes || 0));
  } else if (sortVal === 'length') {
    filtered.sort((a, b) => (b.duration || 0) - (a.duration || 0));
  } else if (sortVal === 'name') {
    filtered.sort((a, b) => (a.filename || '').localeCompare(b.filename || ''));
  }

  gridContainer.innerHTML = filtered.map(sound => {
    const isSelected = selectedSounds.has(sound.url);
    const formatLabel = getSoundFormatLabel(sound.url);
    
    // Choose badgeRight label based on current sort type
    let durationText = '--:--';
    if (sortVal === 'size') {
      durationText = sound.sizeInBytes !== undefined ? formatBytes(sound.sizeInBytes) : 'Resolving...';
    } else {
      durationText = sound.duration ? formatDuration(sound.duration) : '--:--';
    }

    const previewWrapped = `
      <div class="sound-preview-wrapper">
        <svg class="sound-wave-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
          <rect x="4" y="9" width="4" height="6" rx="1"></rect>
          <rect x="10" y="4" width="4" height="16" rx="1"></rect>
          <rect x="16" y="7" width="4" height="10" rx="1"></rect>
        </svg>
        <div class="sound-title" title="${window.escAttr(sound.filename)}">${window.escAttr(sound.filename)}</div>
        <audio class="sound-preview" src="${window.escAttr(sound.url)}" loop playsinline preload="metadata"></audio>
        <div class="sound-scrubber-container">
          <input type="range" class="sound-scrubber" min="0" max="100" value="0" step="any" title="Scrub audio">
        </div>
      </div>
    `;

    return window.createResourceCardHtml({
      id: sound.url,
      type: 'sound',
      dataAttributes: `data-url="${window.escAttr(sound.url)}" data-filename="${window.escAttr(sound.filename)}"`,
      previewHtml: previewWrapped,
      isSelected: isSelected,
      badgeLeft: formatLabel,
      badgeRight: durationText,
      actionsHtml: `
        <button class="btn btn-ghost btn-icon open-tab-btn" title="Open in new tab">
          <span class="icon-mask" style="mask-image: url('svg/open-tab.svg'); -webkit-mask-image: url('svg/open-tab.svg');"></span>
        </button>
        <button class="btn btn-ghost btn-icon download-btn" title="Download immediately">
          <span class="icon-mask" style="mask-image: url('svg/download.svg'); -webkit-mask-image: url('svg/download.svg');"></span>
        </button>
      `
    });
  }).join('');

  updateSoundCountLabel();

  // Attach audio metadata resolving and sync events
  const cards = gridContainer.querySelectorAll('.resource-card');
  cards.forEach(card => {
    const audio = card.querySelector('.sound-preview');
    if (!audio) return;

    const updateBadge = (duration) => {
      if (duration && !isNaN(duration) && duration > 0) {
        const url = card.getAttribute('data-url');
        const sound = allSounds.find(s => s.url === url);
        if (sound) sound.duration = duration;

        const sortSelect = document.getElementById('sort-sounds');
        const sortVal = sortSelect ? sortSelect.value : 'none';

        if (sortVal !== 'size') {
          const durationBadge = card.querySelector('.resource-badge-right');
          if (durationBadge && !card.matches(':hover') && !audio.classList.contains('is-scrubbing')) {
            durationBadge.textContent = formatDuration(duration);
          }
        }
      }
    };

    const events = ['loadedmetadata', 'canplay', 'durationchange'];
    events.forEach(evt => {
      audio.addEventListener(evt, () => {
        updateBadge(audio.duration);
      });
    });

    if (audio.duration) {
      updateBadge(audio.duration);
    }

    // Sync scrubber input as audio plays
    audio.addEventListener('timeupdate', () => {
      const scrubber = card.querySelector('.sound-scrubber');
      if (scrubber && audio.duration && !audio.classList.contains('is-scrubbing')) {
        scrubber.value = (audio.currentTime / audio.duration) * 100;
      }
      
      // Update badge with current time / total time if card is hovered
      const durationBadge = card.querySelector('.resource-badge-right');
      if (durationBadge && audio.duration) {
        if (card.matches(':hover') || audio.classList.contains('is-scrubbing')) {
          durationBadge.textContent = `${formatDuration(audio.currentTime)} / ${formatDuration(audio.duration)}`;
        }
      }
    });

    // Scrubber seek events
    const scrubber = card.querySelector('.sound-scrubber');
    if (scrubber) {
      scrubber.addEventListener('input', (e) => {
        e.stopPropagation();
        audio.classList.add('is-scrubbing');
        if (audio.duration) {
          const targetTime = (parseFloat(scrubber.value) / 100) * audio.duration;
          audio.currentTime = targetTime;
          
          const durationBadge = card.querySelector('.resource-badge-right');
          if (durationBadge) {
            durationBadge.textContent = `${formatDuration(targetTime)} / ${formatDuration(audio.duration)}`;
          }
        }
      });

      scrubber.addEventListener('change', (e) => {
        e.stopPropagation();
        audio.classList.remove('is-scrubbing');
        const isHovered = card.matches(':hover');
        if (!isHovered) {
          audio.pause();
          audio.currentTime = 0;
          card.classList.remove('playing');
        }
      });

      scrubber.addEventListener('click', (e) => {
        e.stopPropagation(); // Avoid triggering card selection click
      });

      scrubber.addEventListener('mousedown', (e) => {
        e.stopPropagation(); // Avoid triggering drag select conflicts
      });
    }
  });
  updateSoundFilterCounts();
}

// Update sound filter dropdown options with live counts
function updateSoundFilterCounts() {
  const typeSelect = document.getElementById('filter-sounds-type');
  if (!typeSelect) return;

  const setOpt = window.setOpt; // [D3] Shared via common_utils.js

  let mp3 = 0, wav = 0, ogg = 0, aac = 0;

  allSounds.forEach(sound => {
    const ext = getSoundFormatLabel(sound.url).toLowerCase();
    if (ext === 'mp3') mp3++;
    else if (ext === 'wav') wav++;
    else if (ext === 'ogg') ogg++;
    else if (ext === 'aac' || ext === 'm4a') aac++;
  });

  const total = allSounds.length;
  typeSelect.options[0].text = `All (${total})`;
  setOpt(typeSelect.options[1], mp3, 'MP3');
  setOpt(typeSelect.options[2], wav, 'WAV');
  setOpt(typeSelect.options[3], ogg, 'OGG');
  setOpt(typeSelect.options[4], aac, 'AAC/M4A');
}

function updateSoundCountLabel() {
  const countEl = document.getElementById('sound-count-summary');
  if (countEl) {
    countEl.textContent = `${allSounds.length} sounds found`;
  }
}

// Display error state inside the grid
window.showSoundErrorState = function(message) {
  resetSoundsPreviewState(); // sound-specific cleanup
  // [D4] Delegate grid error rendering to shared helper in common_utils.js
  window.showGridErrorState('sound-grid-container', message);
};

// Update download button state
function updateSoundDownloadButtonState() {
  // [D5] Delegate to shared helper in common_utils.js
  window.updateDownloadBtnState('download-sounds-btn', selectedSounds.size);
}

// Update select-all checkbox state
function updateSoundSelectAllState() {
  // [D6] Delegate to shared helper — sounds use 'data-url' as key
  window.updateSelectAllCheckbox('select-all-sounds', 'sound-grid-container', 'data-url', selectedSounds);
}

// Single Sound download
function downloadSingleSound(url, filename) {
  if (typeof window.downloadSingleResource === 'function') {
    window.downloadSingleResource(url, filename);
  } else {
    chrome.downloads.download({
      url: url,
      filename: filename || 'sound.mp3',
      conflictAction: 'uniquify'
    });
  }
}

// Bulk Sound downloads
function downloadSelectedSounds() {
  const urls = Array.from(selectedSounds);
  if (urls.length === 0) return;

  urls.forEach(url => {
    const soundInfo = allSounds.find(s => s.url === url);
    const filename = soundInfo ? soundInfo.filename : '';
    if (typeof window.downloadSingleResource === 'function') {
      window.downloadSingleResource(url, filename);
    } else {
      chrome.downloads.download({
        url: url,
        filename: filename || `sound-${Date.now()}.mp3`,
        conflictAction: 'uniquify'
      });
    }
  });
  window.showToast(`Starting ${urls.length} sound downloads...`);
}

// Resolve sizes of all sounds in background asynchronously
function resolveSoundFileSizes(soundsList) {
  soundsList.forEach(sound => {
    if (sound.sizeInBytes !== undefined) return;
    if (sound.url.startsWith('data:')) {
      sound.sizeInBytes = Math.round(sound.url.length * 0.75);
      return;
    }

    // [D2] Use shared fetchResourceSize from common_utils.js
    window.fetchResourceSize(sound.url).then(size => {
      sound.sizeInBytes = size;
      const sortSelect = document.getElementById('sort-sounds');
      if (sortSelect && sortSelect.value !== 'none') {
        if (window.soundResortTimer) clearTimeout(window.soundResortTimer);
        window.soundResortTimer = setTimeout(() => {
          renderSoundsGrid();
        }, 350);
      }
    });
  });
}

// [D1, D2] formatBytes and fetchSoundSize are now in common_utils.js (window.formatBytes / window.fetchResourceSize)


