/**
 * qr-generator-ui.js - QR Generator UI & Form Event Controller
 * Complies with _RULE-web-apps.md (< 500 lines)
 * 100% Vanilla JS, Local-First
 */

(function () {
    'use strict';

    class QrGeneratorUi {
        constructor() {
            this.activeType = 'url';
            this.formState = {};
            this.onPayloadChange = null;
            this.dom = {
                typesList: null,
                formContainer: null
            };
        }

        init(elements = {}, onPayloadChange) {
            this.dom.typesList = elements.typesList || null;
            this.dom.formContainer = elements.formContainer || null;
            this.onPayloadChange = onPayloadChange;

            this.renderTypes();
            this.renderForm();
        }

        renderTypes() {
            const list = this.dom.typesList;
            if (!list || !window.QrGeneratorTypes) return;

            const types = window.QrGeneratorTypes.getTypes();
            list.innerHTML = types.map(t => `
                <button type="button" class="gen-type-btn ${t.id === this.activeType ? 'is-active' : ''}" data-type="${t.id}">
                    <span class="gen-type-icon">${t.icon}</span>
                    <span>${window.QrToVectorI18n ? window.QrToVectorI18n.t(t.labelKey) : t.id}</span>
                </button>
            `).join('');

            list.querySelectorAll('.gen-type-btn').forEach(btn => {
                btn.addEventListener('click', () => {
                    const type = btn.dataset.type;
                    if (this.activeType === type) return;
                    this.activeType = type;
                    list.querySelectorAll('.gen-type-btn').forEach(b => b.classList.toggle('is-active', b.dataset.type === type));
                    this.renderForm();
                });
            });
        }

        renderForm(resetValues = true) {
            const container = this.dom.formContainer;
            if (!container || !window.QrGeneratorTypes) return;

            if (!this.formState[this.activeType] && resetValues) {
                this.formState[this.activeType] = {};
            }

            container.innerHTML = window.QrGeneratorTypes.renderForm(
                this.activeType,
                this.formState[this.activeType] || {},
                window.QrToVectorI18n
            );

            container.querySelectorAll('input, textarea, select').forEach(el => {
                el.addEventListener('input', () => this.handleInput());
                el.addEventListener('change', () => this.handleInput());
            });

            this.handleInput();
        }

        handleInput() {
            const container = this.dom.formContainer;
            if (!container || !window.QrGeneratorTypes) return;

            const inputs = container.querySelectorAll('input, textarea, select');
            const vals = {};
            inputs.forEach(el => {
                if (!el.name) return;
                vals[el.name] = (el.type === 'checkbox') ? el.checked : el.value;
            });
            this.formState[this.activeType] = vals;

            const payload = window.QrGeneratorTypes.formatPayload(this.activeType, vals);
            if (this.onPayloadChange) {
                this.onPayloadChange(payload, this.activeType);
            }
        }

        refreshI18n() {
            const list = this.dom.typesList;
            if (!list || !window.QrGeneratorTypes) return;

            const types = window.QrGeneratorTypes.getTypes();
            list.querySelectorAll('.gen-type-btn').forEach(btn => {
                const t = types.find(x => x.id === btn.dataset.type);
                if (t && window.QrToVectorI18n) {
                    const label = btn.querySelector('span:last-child');
                    if (label) label.textContent = window.QrToVectorI18n.t(t.labelKey);
                }
            });
            this.renderForm(false);
        }

        getActiveType() {
            return this.activeType;
        }

        triggerCurrent() {
            this.handleInput();
        }
    }

    if (typeof window !== 'undefined') {
        window.QrGeneratorUi = new QrGeneratorUi();
    }
    if (typeof module !== 'undefined' && module.exports) {
        module.exports = { QrGeneratorUi };
    }
})();
