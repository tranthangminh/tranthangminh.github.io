(function () {
    'use strict';

    var API_BASE = 'https://countapi.mileshilliard.com/api/v1';
    var trackedIds = {};

    function getStorageKey(appId) {
        return 'tranthangminh_dl_count_' + appId;
    }

    function getApiKey(appId) {
        return 'tranthangminh_dl_' + appId;
    }

    function formatNumber(num) {
        var n = parseInt(num, 10);
        return isNaN(n) || n < 0 ? 0 : n;
    }

    function updateCountUI(appId, count) {
        if (!appId) return;
        var num = formatNumber(count);
        var selector = '[data-product-id="' + appId + '"] .product-download-count';
        var els = Array.prototype.slice.call(document.querySelectorAll(selector));
        els.forEach(function (el) {
            el.textContent = String(num);
        });
    }

    function trackVisit(appId) {
        if (!appId || trackedIds[appId]) return;
        trackedIds[appId] = true;

        // 1. Optimistic UI & LocalStorage increment
        var current = 0;
        try {
            var cached = localStorage.getItem(getStorageKey(appId));
            if (cached !== null) current = formatNumber(cached);
        } catch (err) {}

        var nextVal = current + 1;
        updateCountUI(appId, nextVal);
        try {
            localStorage.setItem(getStorageKey(appId), String(nextVal));
        } catch (err) {}

        // Broadcast event for other tabs/listeners
        if (typeof window.dispatchEvent === 'function' && typeof CustomEvent === 'function') {
            window.dispatchEvent(new CustomEvent('product-download-updated', {
                detail: { productId: appId, count: nextVal }
            }));
        }

        // 2. Call CountAPI /hit/ endpoint
        var apiKey = getApiKey(appId);
        if (typeof fetch === 'function') {
            fetch(API_BASE + '/hit/' + encodeURIComponent(apiKey))
                .then(function (res) { return res.ok ? res.json() : null; })
                .then(function (data) {
                    if (data && typeof data.value === 'number') {
                        updateCountUI(appId, data.value);
                        try {
                            localStorage.setItem(getStorageKey(appId), String(data.value));
                        } catch (err) {}
                    }
                })
                .catch(function () {});
        }
    }

    // Auto-detect from current script tag data attribute: <script src="..." data-webapp-id="webapp-luckywheel"></script>
    function autoTrack() {
        var scripts = document.querySelectorAll('script[data-webapp-id]');
        for (var i = 0; i < scripts.length; i++) {
            var id = scripts[i].getAttribute('data-webapp-id');
            if (id) {
                trackVisit(id);
            }
        }
    }

    window.sharedWebAppCounter = {
        track: trackVisit
    };

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', autoTrack);
    } else {
        autoTrack();
    }
})();
