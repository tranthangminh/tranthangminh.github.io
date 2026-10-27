/**
 * history-manager.js - Local-First Offline History Manager via IndexedDB
 * Stores recent uploaded images, thumbnails and vectorize settings.
 * Vector SVG is omitted and recalculated on the fly.
 * Complies with _RULE-web-apps.md (< 500 lines)
 * 100% Vanilla JS
 */

(function () {
    'use strict';

    const DB_NAME = 'qr_vector_history_db';
    const DB_VERSION = 1;
    const STORE_NAME = 'history_items';
    const MAX_ITEMS = 30;

    class HistoryStore {
        static openDb() {
            return new Promise((resolve, reject) => {
                if (typeof indexedDB === 'undefined') {
                    return reject(new Error('IndexedDB not supported'));
                }
                const req = indexedDB.open(DB_NAME, DB_VERSION);
                req.onupgradeneeded = (e) => {
                    const db = e.target.result;
                    if (!db.objectStoreNames.contains(STORE_NAME)) {
                        const store = db.createObjectStore(STORE_NAME, { keyPath: 'id' });
                        store.createIndex('timestamp', 'timestamp', { unique: false });
                    }
                };
                req.onsuccess = () => resolve(req.result);
                req.onerror = () => reject(req.error);
            });
        }

        static async save(item) {
            const db = await this.openDb();
            return new Promise((resolve, reject) => {
                const tx = db.transaction(STORE_NAME, 'readwrite');
                const store = tx.objectStore(STORE_NAME);
                store.put(item);
                tx.oncomplete = async () => {
                    await this.prune(db);
                    resolve(item);
                };
                tx.onerror = () => reject(tx.error);
            });
        }

        static async prune(db) {
            try {
                const tx = db.transaction(STORE_NAME, 'readwrite');
                const store = tx.objectStore(STORE_NAME);
                const req = store.getAll();
                req.onsuccess = () => {
                    const items = req.result || [];
                    if (items.length > MAX_ITEMS) {
                        items.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
                        const excess = items.slice(MAX_ITEMS);
                        const delTx = db.transaction(STORE_NAME, 'readwrite');
                        const delStore = delTx.objectStore(STORE_NAME);
                        excess.forEach(x => delStore.delete(x.id));
                    }
                };
            } catch (err) {
                console.warn('History prune error:', err);
            }
        }

        static async getAll() {
            const db = await this.openDb();
            return new Promise((resolve, reject) => {
                const tx = db.transaction(STORE_NAME, 'readonly');
                const store = tx.objectStore(STORE_NAME);
                const req = store.getAll();
                req.onsuccess = () => {
                    const list = req.result || [];
                    list.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
                    resolve(list);
                };
                req.onerror = () => reject(req.error);
            });
        }

        static async get(id) {
            const db = await this.openDb();
            return new Promise((resolve, reject) => {
                const tx = db.transaction(STORE_NAME, 'readonly');
                const store = tx.objectStore(STORE_NAME);
                const req = store.get(id);
                req.onsuccess = () => resolve(req.result || null);
                req.onerror = () => reject(req.error);
            });
        }

        static async updateSettings(id, newSettings) {
            if (!id || !newSettings) return null;
            const db = await this.openDb();
            return new Promise((resolve, reject) => {
                const tx = db.transaction(STORE_NAME, 'readwrite');
                const store = tx.objectStore(STORE_NAME);
                const req = store.get(id);
                req.onsuccess = () => {
                    const item = req.result;
                    if (!item) return resolve(null);
                    item.settings = Object.assign({}, item.settings || {}, newSettings);
                    store.put(item);
                };
                tx.oncomplete = () => resolve(true);
                tx.onerror = () => reject(tx.error);
            });
        }

        static async delete(id) {
            const db = await this.openDb();
            return new Promise((resolve, reject) => {
                const tx = db.transaction(STORE_NAME, 'readwrite');
                const store = tx.objectStore(STORE_NAME);
                store.delete(id);
                tx.oncomplete = () => resolve(true);
                tx.onerror = () => reject(tx.error);
            });
        }

        static async clearAll() {
            const db = await this.openDb();
            return new Promise((resolve, reject) => {
                const tx = db.transaction(STORE_NAME, 'readwrite');
                const store = tx.objectStore(STORE_NAME);
                store.clear();
                tx.oncomplete = () => resolve(true);
                tx.onerror = () => reject(tx.error);
            });
        }
    }

    class HistoryManager {
        constructor() {
            this.grid = null;
            this.emptyNotice = null;
            this.card = null;
            this.activeId = null;
            this.onRestoreCallback = null;
            this.onToastCallback = null;
            this._saveTimer = null;
            this._pendingSave = null;
        }

        async flushPendingSave() {
            if (this._saveTimer) {
                clearTimeout(this._saveTimer);
                this._saveTimer = null;
            }
            if (this._pendingSave) {
                const { id, settings } = this._pendingSave;
                this._pendingSave = null;
                try { await HistoryStore.updateSettings(id, settings); }
                catch (err) { console.warn('Failed to flush history save:', err); }
            }
        }

        updateActiveSettings(settings) {
            if (!this.activeId || !settings) return;
            const targetId = this.activeId;
            const snapshot = JSON.parse(JSON.stringify(settings));
            this._pendingSave = { id: targetId, settings: snapshot };
            clearTimeout(this._saveTimer);
            this._saveTimer = setTimeout(async () => {
                await this.flushPendingSave();
            }, 300);
        }

        init({ gridId = 'historyGrid', emptyId = 'historyEmpty', cardId = 'historyCard', onRestore, onToast } = {}) {
            this.grid = document.getElementById(gridId);
            this.emptyNotice = document.getElementById(emptyId);
            this.card = document.getElementById(cardId);
            this.onRestoreCallback = onRestore;
            this.onToastCallback = onToast;

            const btnClear = document.getElementById('btnClearHistory');
            if (btnClear) {
                btnClear.addEventListener('click', () => this.clearAll());
            }

            this.reload();
        }

        static createThumbnail(img, maxDim = 96) {
            try {
                const sw = img.naturalWidth || img.width || maxDim;
                const sh = img.naturalHeight || img.height || maxDim;
                const ratio = Math.min(maxDim / sw, maxDim / sh, 1);
                const dw = Math.max(1, Math.round(sw * ratio)), dh = Math.max(1, Math.round(sh * ratio));
                const canvas = document.createElement('canvas');
                canvas.width = dw; canvas.height = dh;
                const ctx = canvas.getContext('2d');
                if (!ctx) return '';
                ctx.imageSmoothingEnabled = false;
                ctx.drawImage(img, 0, 0, sw, sh, 0, 0, dw, dh);
                return canvas.toDataURL('image/webp', 0.85) || canvas.toDataURL('image/png');
            } catch (err) {
                console.warn('Thumbnail generation failed:', err);
                return '';
            }
        }

        static exportFullImage(img) {
            try {
                if (!img) return '';
                const sw = img.naturalWidth || img.width, sh = img.naturalHeight || img.height;
                if (!sw || !sh) return '';
                const canvas = document.createElement('canvas');
                canvas.width = sw; canvas.height = sh;
                const ctx = canvas.getContext('2d');
                if (!ctx) return '';
                ctx.imageSmoothingEnabled = false;
                ctx.drawImage(img, 0, 0, sw, sh);
                return canvas.toDataURL('image/png');
            } catch (err) {
                console.warn('Full image export failed:', err);
                return '';
            }
        }

        async record({ name = 'image', type = 'qr', img, imageBlob = null, decodedText = '', settings = {} }) {
            try {
                const thumb = HistoryManager.createThumbnail(img);
                const fullImage = HistoryManager.exportFullImage(img) || thumb;
                const item = {
                    id: 'hist_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5),
                    name,
                    type,
                    thumbnail: thumb,
                    fullImage,
                    imageBlob: imageBlob || null,
                    decodedText: decodedText || '',
                    settings: JSON.parse(JSON.stringify(settings || {})),
                    timestamp: Date.now()
                };
                await HistoryStore.save(item);
                this.activeId = item.id;
                await this.reload();
                return item;
            } catch (err) {
                console.warn('Failed to record history:', err);
                return null;
            }
        }

        async reload() {
            try {
                const items = await HistoryStore.getAll();
                this.render(items);
            } catch (err) {
                console.warn('Failed to load history:', err);
            }
        }

        render(items = []) {
            if (!this.grid) return;
            this.grid.innerHTML = '';

            if (items.length === 0) {
                if (this.emptyNotice) this.emptyNotice.style.display = 'block';
                return;
            }
            if (this.emptyNotice) this.emptyNotice.style.display = 'none';

            items.forEach((item) => {
                const el = document.createElement('div');
                el.className = 'history-item' + (item.id === this.activeId ? ' is-active' : '');
                el.title = item.name || 'History item';
                el.dataset.id = item.id;

                const img = document.createElement('img');
                img.className = 'history-item-thumb';
                img.alt = item.name;
                img.src = item.thumbnail || '';

                const badge = document.createElement('span');
                badge.className = 'history-item-badge';
                badge.textContent = item.type === 'pixelart' ? '8-Bit' : 'QR';

                const delBtn = document.createElement('button');
                delBtn.type = 'button';
                delBtn.className = 'history-item-del';
                delBtn.innerHTML = '&times;';
                delBtn.title = 'Xóa khỏi lịch sử';
                delBtn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    this.deleteItem(item.id);
                });

                el.appendChild(img);
                el.appendChild(badge);
                el.appendChild(delBtn);

                el.addEventListener('click', async () => {
                    await this.flushPendingSave();
                    this.activeId = item.id;
                    this.highlightActive();
                    if (this.onRestoreCallback) {
                        const freshItem = await HistoryStore.get(item.id) || item;
                        this.onRestoreCallback(freshItem);
                    }
                });

                this.grid.appendChild(el);
            });
        }

        highlightActive() {
            if (!this.grid) return;
            const all = this.grid.querySelectorAll('.history-item');
            all.forEach(el => el.classList.toggle('is-active', el.dataset.id === this.activeId));
        }

        async deleteItem(id) {
            try {
                await HistoryStore.delete(id);
                if (this.activeId === id) this.activeId = null;
                await this.reload();
                if (this.onToastCallback) {
                    const isVi = (window.QrToVectorI18n?.lang || 'vi').startsWith('vi');
                    this.onToastCallback(isVi ? 'Đã xóa mục khỏi lịch sử!' : 'History item deleted!');
                }
            } catch (err) {
                console.warn('Failed to delete history item:', err);
            }
        }

        async clearAll() {
            try {
                await HistoryStore.clearAll();
                this.activeId = null;
                this.render([]);
                if (this.onToastCallback) {
                    const isVi = (window.QrToVectorI18n?.lang || 'vi').startsWith('vi');
                    this.onToastCallback(isVi ? 'Đã xóa toàn bộ lịch sử!' : 'All history cleared!');
                }
            } catch (err) {
                console.warn('Failed to clear history:', err);
            }
        }
    }

    if (typeof window !== 'undefined') {
        window.HistoryStore = HistoryStore;
        window.HistoryManager = new HistoryManager();
    }
})();
