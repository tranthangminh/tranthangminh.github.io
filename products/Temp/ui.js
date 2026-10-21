/**
 * UI.JS - Xử lý hiển thị giao diện, Render bảng, Toast và Clipboard
 */
window.AppUI = (function () {
    const toast = document.getElementById('toast');
    const resultTableBody = document.getElementById('resultTableBody');
    const statTotal = document.getElementById('statTotal');
    const statMatched = document.getElementById('statMatched');
    const statUnmatched = document.getElementById('statUnmatched');
    const masterCount = document.getElementById('masterCount');
    const rawCount = document.getElementById('rawCount');

    function updateLineCounts(masterText, rawText) {
        const masterLines = window.AppMatcher.getNonEmptyLines(masterText);
        const rawLines = window.AppMatcher.getNonEmptyLines(rawText);
        masterCount.textContent = `${masterLines.length} tên`;
        rawCount.textContent = `${rawLines.length} tên`;
    }

    function renderResults(results, filterValue) {
        const filtered = results.filter(r => {
            if (filterValue === 'matched') return r.status === 'matched';
            if (filterValue === 'unmatched') return r.status === 'unmatched';
            return true;
        });

        // Cập nhật thống kê
        statTotal.textContent = results.filter(r => r.raw !== "").length;
        statMatched.textContent = results.filter(r => r.status === 'matched').length;
        statUnmatched.textContent = results.filter(r => r.status === 'unmatched').length;

        if (filtered.length === 0) {
            resultTableBody.innerHTML = `
                <tr>
                    <td colspan="6" class="empty-state">
                        ${results.length === 0 ? 'Chưa có dữ liệu.' : 'Không có dòng nào thỏa mãn bộ lọc hiện tại.'}
                    </td>
                </tr>
            `;
            return;
        }

        let html = '';
        filtered.forEach(item => {
            if (item.status === 'empty') return;

            const isMatched = item.status === 'matched';
            const matchedClass = isMatched ? 'matched-text' : 'empty-text';
            const matchedDisplay = isMatched ? escapeHtml(item.matched) : '— Để trống —';

            let typeBadgeClass = 'type-vol-badge';
            const typeLower = (item.parsed.type || '').toLowerCase();
            if (typeLower.includes('gốc')) typeBadgeClass += ' badge-goc';
            else if (typeLower.includes('refill')) typeBadgeClass += ' badge-refill';
            else if (typeLower.includes('tester')) typeBadgeClass += ' badge-tester';
            else if (typeLower.includes('nobox')) typeBadgeClass += ' badge-nobox';
            else if (typeLower.includes('chiết')) typeBadgeClass += ' badge-chiet';
            else if (typeLower.includes('mini')) typeBadgeClass += ' badge-mini';
            else if (typeLower.includes('full')) typeBadgeClass += ' badge-full';

            const typeDisplay = item.parsed.combo
                ? `<span class="${typeBadgeClass}">${escapeHtml(item.parsed.combo)}</span>`
                : '<span style="color: var(--text-muted); font-style: italic;">—</span>';

            const tokenTags = item.commonWords.length > 0
                ? item.commonWords.map(w => `<span class="token-tag">${escapeHtml(w)}</span>`).join('')
                : '<span style="color: var(--text-muted); font-size: 11px;">0 từ</span>';

            const badge = isMatched
                ? `<span class="badge badge-success">✓ Khớp (${item.matchCount} từ)</span>`
                : `<span class="badge badge-empty">✕ Chưa khớp</span>`;

            html += `
                <tr>
                    <td class="col-stt">${item.index}</td>
                    <td class="col-raw">${escapeHtml(item.raw)}</td>
                    <td class="col-matched ${matchedClass}">${matchedDisplay}</td>
                    <td class="col-type-vol">${typeDisplay}</td>
                    <td class="col-tokens">${tokenTags}</td>
                    <td class="col-status">${badge}</td>
                </tr>
            `;
        });

        resultTableBody.innerHTML = html;
    }

    function showToast(msg) {
        toast.textContent = msg;
        toast.classList.add('show');
        setTimeout(() => {
            toast.classList.remove('show');
        }, 3500);
    }

    function copyToClipboard(text, successMessage) {
        if (navigator.clipboard && window.isSecureContext) {
            navigator.clipboard.writeText(text).then(() => {
                showToast(successMessage);
            }).catch(() => fallbackCopy(text, successMessage));
        } else {
            fallbackCopy(text, successMessage);
        }
    }

    function fallbackCopy(text, successMessage) {
        const ta = document.createElement('textarea');
        ta.value = text;
        ta.style.position = 'fixed';
        ta.style.left = '-9999px';
        document.body.appendChild(ta);
        ta.select();
        try {
            document.execCommand('copy');
            showToast(successMessage);
        } catch (err) {
            alert("Không thể copy tự động, vui lòng copy thủ công!");
        }
        document.body.removeChild(ta);
    }

    function escapeHtml(str) {
        if (!str) return '';
        return str
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;');
    }

    return {
        updateLineCounts,
        renderResults,
        showToast,
        copyToClipboard,
        escapeHtml
    };
})();
