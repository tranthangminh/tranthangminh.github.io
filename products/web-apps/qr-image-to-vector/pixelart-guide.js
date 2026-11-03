/**
 * pixelart-guide.js - 3-Page Stepper Guide Modal (2 steps per page + shortcuts) & Session Auto-Popup
 * Complies with _RULE-web-apps.md (< 500 lines) | 100% Vanilla JS
 */

const GUIDE_STEPS = [
    { n: 1, gif: 'B1.gif', title: 'Select the object', desc: 'Drag the box around the character or subject.' },
    { n: 2, gif: 'B2.gif', title: 'Match the grid', desc: 'Adjust Columns & Rows until each cell fits one pixel block.' },
    { n: 3, gif: 'B3.gif', title: 'Pick the colors', desc: 'Lower the color count until it is clean but still looks right.' },
    { n: 4, gif: 'B4.gif', title: 'Fine-tune', desc: 'Optionally tweak corner radius, spacing and colors.' }
];

const GUIDE_PAGE_COUNT = 3;
const GUIDE_MEDIA_VERSION = '20261102-1';

class PixelArtGuide {
    static init() {
        if (this._initialized) return;
        this._initialized = true;
        this._page = 0;
        this._ensureModalDom();
        this._bindEvents();
    }

    static _stepCard({ n, gif, title, desc }) {
        return `
            <article class="guide-step">
                <div class="guide-step-media"><img src="./qr-image-to-vector/guide/${gif}?v=${GUIDE_MEDIA_VERSION}" alt="Step ${n}" data-i18n-attr="alt:guide.altStep${n}"></div>
                <div class="guide-step-text">
                    <span class="step-badge">${n}</span>
                    <div>
                        <div class="guide-step-title" data-i18n="guide.step${n}Title">${title}</div>
                        <div class="guide-step-desc" data-i18n="guide.step${n}Desc">${desc}</div>
                    </div>
                </div>
            </article>`;
    }

    static _ensureModalDom() {
        if (document.getElementById('pixelArtGuideModal')) return;
        const modal = document.createElement('div');
        modal.id = 'pixelArtGuideModal';
        modal.className = 'guide-modal-overlay';
        modal.setAttribute('aria-hidden', 'true');
        const dots = Array.from({ length: GUIDE_PAGE_COUNT }, (_, i) =>
            `<button type="button" class="guide-dot" data-page="${i}" aria-label="${i + 1} / ${GUIDE_PAGE_COUNT}"></button>`).join('');
        modal.innerHTML = `
            <div class="guide-modal-card" role="dialog" aria-modal="true" aria-labelledby="guideModalTitle">
                <div class="guide-modal-header">
                    <div class="guide-modal-title" id="guideModalTitle">
                        <span class="icon-mask icon-guide guide-icon" aria-hidden="true"></span>
                        <span data-i18n="guide.heading">Pixel Art to Vector Conversion Guide</span>
                    </div>
                    <button type="button" class="guide-close-btn" id="btnGuideClose" aria-label="Close" data-i18n-attr="aria-label:guide.close"><span class="icon-mask icon-close" aria-hidden="true"></span></button>
                </div>
                <div class="guide-modal-body">
                    <section class="guide-page is-active" data-page="0"><div class="guide-steps-row">${GUIDE_STEPS.slice(0, 2).map((s) => this._stepCard(s)).join('')}</div></section>
                    <section class="guide-page" data-page="1"><div class="guide-steps-row">${GUIDE_STEPS.slice(2).map((s) => this._stepCard(s)).join('')}</div></section>
                    <section class="guide-page" data-page="2">
                        <div class="guide-shortcuts-title" data-i18n="hud.title">Shortcuts & Gestures</div>
                        <div class="guide-shortcuts-list" id="guideShortcutsList"></div>
                        <div class="guide-reopen-hint"><span class="icon-mask icon-chevron-down guide-arrow-down" aria-hidden="true"></span><span data-i18n="guide.reopenHint">Reopen this guide anytime with the Guide button below</span></div>
                    </section>
                </div>
                <div class="guide-modal-footer">
                    <div class="guide-dots">${dots}</div>
                    <div class="guide-nav">
                        <button type="button" class="btn-secondary guide-nav-btn" id="btnGuideBack" data-i18n="guide.back">Back</button>
                        <button type="button" class="btn-primary guide-nav-btn" id="btnGuideNext" data-i18n="guide.next">Next</button>
                    </div>
                </div>
            </div>
        `;
        document.body.appendChild(modal);
        window.QrShortcuts?.renderRows(document.getElementById('guideShortcutsList'));
        window.QrImageToVectorI18n?.applyTranslations();
        this._goTo(0);
    }

    static _bindEvents() {
        const modal = document.getElementById('pixelArtGuideModal');
        document.getElementById('btnToggleGuideModal')?.addEventListener('click', () => this.open());
        document.getElementById('btnGuideClose')?.addEventListener('click', () => this.close());
        document.getElementById('btnGuideBack')?.addEventListener('click', () => this._goTo(this._page - 1));
        document.getElementById('btnGuideNext')?.addEventListener('click', () => {
            if (this._page >= GUIDE_PAGE_COUNT - 1) this.close();
            else this._goTo(this._page + 1);
        });
        modal?.querySelectorAll('.guide-dot').forEach((dot) => {
            dot.addEventListener('click', () => this._goTo(parseInt(dot.dataset.page, 10)));
        });

        modal?.addEventListener('click', (e) => {
            if (e.target === modal) this.close();
        });

        // Capture phase + stopPropagation keeps app shortcuts (Y, Ctrl+Z...) from firing behind the open modal
        window.addEventListener('keydown', (e) => {
            if (!this.isOpen()) return;
            e.stopPropagation();
            if (e.key === 'Escape') this.close();
            else if (e.key === 'ArrowRight') this._goTo(this._page + 1);
            else if (e.key === 'ArrowLeft') this._goTo(this._page - 1);
            else if (e.key === 'Tab') {
                const focusable = [...modal.querySelectorAll('button:not([disabled])')];
                const edge = e.shiftKey ? focusable[0] : focusable.at(-1);
                if (document.activeElement === edge || !modal.contains(document.activeElement)) {
                    e.preventDefault();
                    (e.shiftKey ? focusable.at(-1) : focusable[0]).focus();
                }
            }
        }, true);
    }

    static _goTo(page) {
        const modal = document.getElementById('pixelArtGuideModal');
        if (!modal) return;
        this._page = Math.max(0, Math.min(GUIDE_PAGE_COUNT - 1, page));
        modal.querySelectorAll('.guide-page').forEach((p) => p.classList.toggle('is-active', parseInt(p.dataset.page, 10) === this._page));
        modal.querySelectorAll('.guide-dot').forEach((d) => d.classList.toggle('is-active', parseInt(d.dataset.page, 10) === this._page));

        const isLast = this._page === GUIDE_PAGE_COUNT - 1;
        const back = document.getElementById('btnGuideBack');
        const next = document.getElementById('btnGuideNext');
        if (back) back.disabled = this._page === 0;
        if (next) {
            const key = isLast ? 'guide.understood' : 'guide.next';
            next.setAttribute('data-i18n', key);
            next.textContent = window.QrImageToVectorI18n ? window.QrImageToVectorI18n.t(key) : (isLast ? 'Got it' : 'Next');
        }
    }

    static open() {
        this._ensureModalDom();
        const modal = document.getElementById('pixelArtGuideModal');
        if (!modal) return;
        this._goTo(0);
        this._opener = document.activeElement;
        modal.classList.add('is-open');
        modal.setAttribute('aria-hidden', 'false');
        window.QrImageToVectorI18n?.applyTranslations();
        document.getElementById('btnGuideNext')?.focus();
    }

    static close() {
        const modal = document.getElementById('pixelArtGuideModal');
        if (!modal) return;
        modal.classList.remove('is-open');
        modal.setAttribute('aria-hidden', 'true');
        this._opener?.focus?.();
        this._opener = null;
    }

    static isOpen() {
        const modal = document.getElementById('pixelArtGuideModal');
        return Boolean(modal?.classList.contains('is-open'));
    }

    static checkAutoPopup() {
        this.init();
        try {
            const seen = sessionStorage.getItem('pixelart_guide_seen');
            if (!seen) {
                sessionStorage.setItem('pixelart_guide_seen', '1');
                setTimeout(() => this.open(), 300);
            }
        } catch (err) {
            console.warn('SessionStorage check failed:', err);
        }
    }
}

if (typeof window !== 'undefined') {
    window.PixelArtGuide = PixelArtGuide;
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => PixelArtGuide.init());
    } else {
        PixelArtGuide.init();
    }
}
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { PixelArtGuide };
}
