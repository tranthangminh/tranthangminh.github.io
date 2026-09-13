/**
 * changelog.js — MAX Design Power-Pack
 * Version Changelog Modal & CSV Data Loader
 */

if (document.readyState !== 'loading') {
  initChangelog();
} else {
  document.addEventListener('DOMContentLoaded', initChangelog);
}

function initChangelog() {
  const changelogBtn = document.getElementById('changelog-btn');
  const changelogPanel = document.getElementById('changelog-panel');
  const changelogOverlay = document.getElementById('changelog-overlay');
  const closeBtn = document.getElementById('changelog-close-btn');

  if (!changelogBtn || !changelogPanel || !changelogOverlay) return;

  function openChangelog() {
    changelogPanel.classList.remove('hidden');
    changelogOverlay.classList.remove('hidden');
    // Load CSV data dynamically when opening panel if not loaded yet
    loadChangelogData();
  }

  function closeChangelog() {
    changelogPanel.classList.add('hidden');
    changelogOverlay.classList.add('hidden');
  }

  changelogBtn.addEventListener('click', openChangelog);
  if (closeBtn) closeBtn.addEventListener('click', closeChangelog);
  changelogOverlay.addEventListener('click', closeChangelog);
}

let isChangelogLoaded = false;

// Fetch and parse changelog.csv file
async function loadChangelogData() {
  if (isChangelogLoaded) return;

  const container = document.getElementById('changelog-body');
  if (!container) return;

  try {
    const response = await fetch('changelog.csv');
    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
    
    const csvText = await response.text();
    const rows = parseCSVText(csvText);

    if (rows.length === 0) return;

    renderChangelog(container, rows);
    isChangelogLoaded = true;
  } catch (err) {
    console.error('Failed to load changelog.csv:', err);
  }
}

// RFC 4180 compliant CSV Parser handling multiline quoted fields, escaped quotes, and commas
function parseCSVText(text) {
  if (!text || !text.trim()) return [];

  const rows = [];
  let currentRow = [];
  let currentValue = '';
  let insideQuote = false;

  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    const nextChar = text[i + 1];

    if (char === '"') {
      if (insideQuote && nextChar === '"') {
        // Escaped double quote ("")
        currentValue += '"';
        i++;
      } else {
        // Toggle quote state
        insideQuote = !insideQuote;
      }
    } else if (char === ',' && !insideQuote) {
      currentRow.push(currentValue.trim());
      currentValue = '';
    } else if ((char === '\r' || char === '\n') && !insideQuote) {
      if (char === '\r' && nextChar === '\n') i++; // Handle \r\n
      currentRow.push(currentValue.trim());
      if (currentRow.some(cell => cell.length > 0)) {
        rows.push(currentRow);
      }
      currentRow = [];
      currentValue = '';
    } else {
      currentValue += char;
    }
  }

  // Push final remaining cell & row
  if (currentValue || currentRow.length > 0) {
    currentRow.push(currentValue.trim());
    if (currentRow.some(cell => cell.length > 0)) {
      rows.push(currentRow);
    }
  }

  if (rows.length <= 1) return [];

  const headers = rows[0].map(h => h.trim().toLowerCase());
  const results = [];

  for (let i = 1; i < rows.length; i++) {
    const values = rows[i];
    const rowObj = {};
    headers.forEach((header, idx) => {
      rowObj[header] = (values[idx] || '').replace(/^"|"$/g, '');
    });
    results.push(rowObj);
  }

  return results;
}

// Group CSV entries by version and render HTML
function renderChangelog(container, rows) {
  const grouped = {};
  const versionOrder = [];

  rows.forEach(row => {
    const ver = row.version || 'v1.0';
    const isCurrStr = String(row.is_current || '').toLowerCase().trim().replace(/['"]/g, '');
    const isCurrentFlag = isCurrStr === 'true' || isCurrStr === '1' || isCurrStr === 'yes';

    if (!grouped[ver]) {
      grouped[ver] = {
        isCurrent: isCurrentFlag,
        items: []
      };
      versionOrder.push(ver);
    } else if (isCurrentFlag) {
      grouped[ver].isCurrent = true;
    }

    grouped[ver].items.push({
      category: row.category || 'tweak',
      title: row.title || '',
      details: row.details || ''
    });
  });

  // Fallback: If no version has is_current = true, set the top version as current
  if (versionOrder.length > 0) {
    const hasCurrent = versionOrder.some(ver => grouped[ver].isCurrent);
    if (!hasCurrent) {
      grouped[versionOrder[0]].isCurrent = true;
    }
  }

  let html = '';
  versionOrder.forEach(ver => {
    const group = grouped[ver];
    const badgeClass = group.isCurrent ? 'changelog-version-badge current' : 'changelog-version-badge';
    const badgeText = group.isCurrent ? `${ver} (Current)` : ver;

    // Update header badge dynamically if current
    if (group.isCurrent) {
      const headerBadge = document.querySelector('.changelog-header .changelog-version-badge');
      if (headerBadge) {
        headerBadge.textContent = ver;
      }
    }

    html += `
      <div class="changelog-item ${group.isCurrent ? 'is-current-version' : ''}">
        <div class="${badgeClass}">${badgeText}</div>
        <ul class="changelog-list">
          ${group.items.map(item => {
            const formattedDetails = escapeHTML(item.details).replace(/\n/g, '<br>');
            const hasTitle = item.title && item.title.trim().length > 0;
            return `
              <li class="changelog-entry">
                ${getCategoryBadge(item.category)}
                <div class="changelog-entry-text">
                  ${hasTitle ? `<div class="changelog-entry-title"><strong>${escapeHTML(item.title)}</strong></div>` : ''}
                  <div class="changelog-entry-details">${formattedDetails}</div>
                </div>
              </li>
            `;
          }).join('')}
        </ul>
      </div>
    `;
  });

  container.innerHTML = html;
}

function getCategoryBadge(cat) {
  const category = (cat || '').toLowerCase().trim();
  if (category === 'feature' || category === 'new') {
    return `<span class="badge changelog-type-badge feature" title="New Feature">✨</span>`;
  } else if (category === 'tweak' || category === 'adjust' || category === 'improvement') {
    return `<span class="badge changelog-type-badge tweak" title="Feature Tweak & Improvement">🛠️</span>`;
  } else if (category === 'bug' || category === 'fix') {
    return `<span class="badge changelog-type-badge bug" title="Bug Fix">🐛</span>`;
  } else if (category === 'optimize' || category === 'perf' || category === 'speed') {
    return `<span class="badge changelog-type-badge optimize" title="Performance Optimization">⚡</span>`;
  }
  return `<span class="badge changelog-type-badge other" title="Other Updates">📌</span>`;
}

function escapeHTML(str) {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
