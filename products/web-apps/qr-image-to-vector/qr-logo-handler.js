/**
 * qr-logo-handler.js - Center Logo Overlay & Sizing Manager
 * Supports PNG, JPG, JPEG, WEBP, AVIF, BMP, ICO and SVG vector logos.
 * Manages integer block reservation ($K \times K$) and inner scale percentage.
 * Complies with _RULE-web-apps.md (< 500 lines)
 * 100% Vanilla JS, Local-First
 */

(function () {
    'use strict';

    const ALLOWED_EXTS = ['svg', 'png', 'jpg', 'jpeg', 'webp', 'avif', 'bmp', 'ico'];

    class QrLogoHandler {
        constructor() {
            this.logoData = null;
            this.logoFileName = '';
            this.logoBlocks = 5; // Default 5 blocks
            this.logoScale = 80;  // Default 80% (remaining 20% is quiet pad)
            this.onChangeCallback = null;

            this.dom = {
                logoInput: null,
                btnUploadLogo: null,
                btnRemoveLogo: null,
                logoCard: null,
                logoPreview: null,
                logoThumb: null,
                logoNameLabel: null,
                logoBlocksSlider: null,
                logoBlocksBadge: null,
                logoScaleSlider: null,
                logoScaleBadge: null,
                logoSettingsGroup: null
            };
        }

        _tr(key, fallback) {
            return window.QrImageToVectorI18n ? window.QrImageToVectorI18n.t(key, fallback) : fallback;
        }

        formatBlocksBadge(isOdd) {
            const tag = isOdd ? this._tr('logo.centerOdd', 'Odd center') : this._tr('logo.centerEven', 'Even center');
            return this._tr('logo.blocksBadge', '{n} blocks\n{tag}').replace('{n}', this.logoBlocks).replace('{tag}', tag);
        }

        init(elements = {}, onChange) {
            this.dom = Object.assign(this.dom, elements);
            this.onChangeCallback = onChange;

            this.bindEvents();
            this.updateUi();
        }

        bindEvents() {
            const {
                logoInput,
                btnUploadLogo,
                btnRemoveLogo,
                logoBlocksSlider,
                logoScaleSlider
            } = this.dom;

            if (btnUploadLogo && logoInput) {
                btnUploadLogo.addEventListener('click', () => logoInput.click());
            }

            if (logoInput) {
                logoInput.addEventListener('change', (e) => {
                    if (e.target.files && e.target.files[0]) {
                        this.handleFile(e.target.files[0]);
                    }
                });
            }

            if (btnRemoveLogo) {
                btnRemoveLogo.addEventListener('click', () => {
                    this.clear();
                    if (this.onChangeCallback) this.onChangeCallback();
                });
            }

            if (logoBlocksSlider) {
                logoBlocksSlider.addEventListener('input', () => {
                    this.logoBlocks = parseInt(logoBlocksSlider.value, 10);
                    if (this.dom.logoBlocksBadge) {
                        this.dom.logoBlocksBadge.textContent = this.formatBlocksBadge(this.logoBlocks % 2 !== 0);
                    }
                    if (this.onChangeCallback) this.onChangeCallback();
                });
            }

            if (logoScaleSlider) {
                logoScaleSlider.addEventListener('input', () => {
                    this.logoScale = parseInt(logoScaleSlider.value, 10);
                    if (this.dom.logoScaleBadge) {
                        this.dom.logoScaleBadge.textContent = `${this.logoScale}%`;
                    }
                    if (this.onChangeCallback) this.onChangeCallback();
                });
            }
        }

        handleFile(file) {
            if (!file) return;

            const ext = (file.name || '').split('.').pop().toLowerCase();
            if (ext === 'gif' || ext === 'pdf' || file.type === 'image/gif' || file.type === 'application/pdf') {
                alert(this._tr('messages.logoUnsupported', 'GIF and PDF formats are not supported for logos!'));
                return;
            }

            const isSvg = file.type === 'image/svg+xml' || ext === 'svg';
            const isRaster = ALLOWED_EXTS.includes(ext) || file.type.startsWith('image/');

            if (!isSvg && !isRaster) {
                alert(this._tr('messages.logoInvalid', 'Please choose a vector (SVG) or image file (PNG, JPG, WEBP, AVIF, BMP, ICO)!'));
                return;
            }

            this.logoFileName = file.name;
            const reader = new FileReader();

            reader.onload = (e) => {
                this.logoData = e.target.result;
                this.updateUi();
                if (this.onChangeCallback) this.onChangeCallback();
            };

            reader.readAsDataURL(file);
        }

        clear() {
            this.logoData = null;
            this.logoFileName = '';
            if (this.dom.logoInput) this.dom.logoInput.value = '';
            this.updateUi();
        }

        hasLogo() {
            return Boolean(this.logoData);
        }

        getOptions() {
            return {
                hasLogo: this.hasLogo(),
                logoData: this.logoData,
                logoBlocks: this.logoBlocks,
                logoScale: this.logoScale
            };
        }

        syncMatrixParity(matrixCols) {
            if (!matrixCols) return;
            const isOdd = (matrixCols % 2 !== 0);
            const slider = this.dom.logoBlocksSlider;
            const badge = this.dom.logoBlocksBadge;

            if (isOdd) {
                const maxK = Math.max(3, Math.min(9, Math.floor(matrixCols * 0.28)));
                if (slider) {
                    slider.min = 3;
                    slider.max = maxK % 2 === 0 ? maxK - 1 : maxK;
                    slider.step = 2;
                }
                if (this.logoBlocks % 2 === 0) {
                    this.logoBlocks = Math.max(3, Math.min(Number(slider?.max || 9), this.logoBlocks + 1));
                }
            } else {
                const maxK = Math.max(2, Math.min(8, Math.floor(matrixCols * 0.28)));
                if (slider) {
                    slider.min = 2;
                    slider.max = maxK % 2 !== 0 ? maxK - 1 : maxK;
                    slider.step = 2;
                }
                if (this.logoBlocks % 2 !== 0) {
                    this.logoBlocks = Math.max(2, Math.min(Number(slider?.max || 8), this.logoBlocks - 1));
                }
            }

            if (slider) slider.value = this.logoBlocks;
            if (badge) badge.textContent = this.formatBlocksBadge(isOdd);
        }

        updateUi() {
            const has = this.hasLogo();
            const {
                logoPreview,
                logoThumb,
                logoNameLabel,
                btnUploadLogo,
                btnRemoveLogo,
                logoSettingsGroup,
                logoBlocksSlider,
                logoBlocksBadge,
                logoScaleSlider,
                logoScaleBadge
            } = this.dom;

            if (logoPreview) logoPreview.style.display = has ? 'flex' : 'none';
            if (btnRemoveLogo) btnRemoveLogo.style.display = has ? 'inline-flex' : 'none';
            if (btnUploadLogo) btnUploadLogo.style.display = has ? 'none' : 'inline-flex';

            if (has && logoThumb) logoThumb.src = this.logoData;
            if (has && logoNameLabel) logoNameLabel.textContent = this.logoFileName || 'logo';

            // Show logo settings only when a logo is loaded
            if (logoSettingsGroup) {
                logoSettingsGroup.style.display = has ? 'flex' : 'none';
            }

            if (logoBlocksSlider) logoBlocksSlider.value = this.logoBlocks;
            if (logoBlocksBadge) logoBlocksBadge.textContent = this.formatBlocksBadge(this.logoBlocks % 2 !== 0);

            if (logoScaleSlider) logoScaleSlider.value = this.logoScale;
            if (logoScaleBadge) logoScaleBadge.textContent = `${this.logoScale}%`;
        }
    }

    if (typeof window !== 'undefined') {
        window.QrLogoHandler = new QrLogoHandler();
    }
    if (typeof module !== 'undefined' && module.exports) {
        module.exports = { QrLogoHandler };
    }
})();
