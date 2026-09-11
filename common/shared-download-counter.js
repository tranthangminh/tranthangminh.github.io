(function () {
    'use strict';

    var API_BASE = 'https://countapi.mileshilliard.com/api/v1';

    function getStorageKey(productId) {
        return 'tranthangminh_dl_count_' + productId;
    }

    function getApiKey(productId) {
        return 'tranthangminh_dl_' + productId;
    }

    function formatNumber(num) {
        var n = parseInt(num, 10);
        return isNaN(n) || n < 0 ? 0 : n;
    }

    function updateProductCountElements(productId, count) {
        if (!productId) return;
        var num = formatNumber(count);
        var selector = '[data-product-id="' + productId + '"] .product-download-count';
        var els = Array.prototype.slice.call(document.querySelectorAll(selector));
        els.forEach(function (el) {
            el.textContent = String(num);
        });
    }

    function executeDownload(btn, e) {
        if (e) {
            if (typeof e.preventDefault === 'function') e.preventDefault();
            if (typeof e.stopPropagation === 'function') e.stopPropagation();
        }

        var productId = btn.getAttribute('data-product-id');
        var downloadUrl = btn.getAttribute('data-download-url');
        var downloadName = btn.getAttribute('data-download-name');
        var isDirect = btn.getAttribute('data-direct-download') === 'true';
        var chromeId = btn.getAttribute('data-chrome-id');

        if (productId && !chromeId) {
            // 1. Optimistic UI update
            var current = 0;
            try {
                var cached = localStorage.getItem(getStorageKey(productId));
                if (cached !== null) current = formatNumber(cached);
            } catch (err) {}

            var nextVal = current + 1;
            updateProductCountElements(productId, nextVal);
            try {
                localStorage.setItem(getStorageKey(productId), String(nextVal));
            } catch (err) {}

            // Broadcast event within same window
            if (typeof window.dispatchEvent === 'function' && typeof CustomEvent === 'function') {
                window.dispatchEvent(new CustomEvent('product-download-updated', {
                    detail: { productId: productId, count: nextVal }
                }));
            }

            // 2. Persist globally via CountAPI /hit/
            var apiKey = getApiKey(productId);
            if (typeof fetch === 'function') {
                fetch(API_BASE + '/hit/' + encodeURIComponent(apiKey))
                    .then(function (res) { return res.ok ? res.json() : null; })
                    .then(function (data) {
                        if (data && typeof data.value === 'number') {
                            updateProductCountElements(productId, data.value);
                            try {
                                localStorage.setItem(getStorageKey(productId), String(data.value));
                            } catch (err) {}
                        }
                    })
                    .catch(function () {});
            }
        }

        // 3. Trigger actual file download or open external store URL
        if (downloadUrl) {
            if (isDirect) {
                var a = document.createElement('a');
                a.href = downloadUrl;
                if (downloadName) {
                    a.download = downloadName;
                }
                a.target = '_blank';
                a.rel = 'noopener noreferrer';
                document.body.appendChild(a);
                a.click();
                setTimeout(function () {
                    if (a.parentNode) {
                        a.parentNode.removeChild(a);
                    }
                }, 200);
            } else {
                window.open(downloadUrl, '_blank', 'noopener,noreferrer');
            }
        }
    }

    function initDownloadButtons() {
        var buttons = Array.prototype.slice.call(document.querySelectorAll('[data-product-id]'));
        if (!buttons.length) return;

        var registeredIds = {};

        buttons.forEach(function (btn) {
            var productId = btn.getAttribute('data-product-id');
            var chromeId = btn.getAttribute('data-chrome-id');
            if (!productId) return;

            // Bind click & keyboard handlers if not already bound
            if (!btn._hasDownloadHandler) {
                btn._hasDownloadHandler = true;
                btn.addEventListener('click', function (e) {
                    executeDownload(btn, e);
                });
                btn.addEventListener('keydown', function (e) {
                    if (e.key === 'Enter' || e.key === ' ') {
                        executeDownload(btn, e);
                    }
                });
            }

            // Prevent duplicate network requests for the same productId on the same page
            if (registeredIds[productId]) return;
            registeredIds[productId] = true;

            if (chromeId) {
                // Chrome Extension users count from Shields.io
                try {
                    var cachedChrome = localStorage.getItem('tranthangminh_chrome_users_' + chromeId);
                    if (cachedChrome !== null) {
                        updateProductCountElements(productId, cachedChrome);
                    }
                } catch (err) {}

                if (typeof fetch === 'function') {
                    fetch('https://img.shields.io/chrome-web-store/users/' + encodeURIComponent(chromeId) + '.json')
                        .then(function (res) { return res.ok ? res.json() : null; })
                        .then(function (data) {
                            if (data && (data.value || data.message)) {
                                var users = data.value || data.message;
                                updateProductCountElements(productId, users);
                                try {
                                    localStorage.setItem('tranthangminh_chrome_users_' + chromeId, String(users));
                                } catch (err) {}
                            }
                        })
                        .catch(function () {});
                }
            } else {
                // Downloadable items count
                // 1. Read cached count from localStorage immediately
                try {
                    var cached = localStorage.getItem(getStorageKey(productId));
                    if (cached !== null) {
                        updateProductCountElements(productId, cached);
                    }
                } catch (err) {}

                // 2. Fetch latest count from CountAPI
                var apiKey = getApiKey(productId);
                if (typeof fetch === 'function') {
                    fetch(API_BASE + '/get/' + encodeURIComponent(apiKey))
                        .then(function (res) { return res.ok ? res.json() : null; })
                        .then(function (data) {
                            if (data && typeof data.value === 'number') {
                                updateProductCountElements(productId, data.value);
                                try {
                                    localStorage.setItem(getStorageKey(productId), String(data.value));
                                } catch (err) {}
                            }
                        })
                        .catch(function () {});
                }
            }
        });
    }

    // Cross-tab synchronization via window 'storage' event
    window.addEventListener('storage', function (e) {
        if (!e || !e.key) return;
        var prefix = 'tranthangminh_dl_count_';
        if (e.key.indexOf(prefix) === 0) {
            var productId = e.key.substring(prefix.length);
            var newCount = formatNumber(e.newValue);
            updateProductCountElements(productId, newCount);
        }
    });

    // Same-window custom event listener
    window.addEventListener('product-download-updated', function (e) {
        if (e && e.detail && e.detail.productId) {
            updateProductCountElements(e.detail.productId, e.detail.count);
        }
    });

    window.sharedDownloadCounter = {
        init: initDownloadButtons,
        execute: executeDownload,
        updateUI: updateProductCountElements
    };

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initDownloadButtons);
    } else {
        initDownloadButtons();
    }
})();
