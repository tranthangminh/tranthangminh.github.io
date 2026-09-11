'use strict';

if (typeof initSharedPage === 'function') {
    initSharedPage({
        titleKey: 'meta.products.title',
        header: {
            rootId: 'sharedHeaderRoot',
            options: {
                homeHref: 'index.html',
                assetBase: '',
                productBaseHref: 'products.html',
                professionBaseHref: 'jobs/'
            }
        },
        contact: {
            rootId: 'sharedContactRoot',
            options: {
                pageClass: 'contact-page',
                id: 'contactSection',
                includeReveal: false,
                assetBase: ''
            }
        },
        bookNow: {
            rootId: 'sharedBookNowRoot',
            options: { id: 'bookNowButton' }
        },
        headerMenus: {},
        bookNowBehavior: {
            buttonId: 'bookNowButton',
            hideWhenVisible: 'contactSection',
            visibilityThreshold: 0.45
        }
    });
}

function initProductsTabs() {
    var switchButtons = Array.prototype.slice.call(document.querySelectorAll('.products-switch-btn[data-product-tab]'));
    var categorySections = Array.prototype.slice.call(document.querySelectorAll('.products-category-section[data-product-section]'));

    if (!switchButtons.length || !categorySections.length) {
        return;
    }

    function setActiveTab(targetTab, updateUrl) {
        var validTab = targetTab || 'all';

        switchButtons.forEach(function (btn) {
            var btnTab = btn.getAttribute('data-product-tab');
            var isActive = btnTab === validTab;
            btn.classList.toggle('is-active', isActive);
            btn.setAttribute('aria-pressed', isActive ? 'true' : 'false');
        });

        categorySections.forEach(function (section) {
            var sectionCategory = section.getAttribute('data-product-section');
            var shouldShow = validTab === 'all' || sectionCategory === validTab;
            section.classList.toggle('is-hidden', !shouldShow);
        });

        if (updateUrl) {
            try {
                var url = new URL(window.location.href);
                if (validTab === 'all') {
                    url.searchParams.delete('tab');
                } else {
                    url.searchParams.set('tab', validTab);
                }
                window.history.replaceState({}, '', url.toString());
            } catch (error) {}
        }
    }

    switchButtons.forEach(function (btn) {
        btn.addEventListener('click', function () {
            var tab = btn.getAttribute('data-product-tab');
            setActiveTab(tab, true);
        });
    });

    // Initialize from URL search params or hash
    var initialTab = 'all';
    try {
        var urlParams = new URLSearchParams(window.location.search);
        var tabParam = urlParams.get('tab');
        if (tabParam) {
            initialTab = tabParam.toLowerCase();
        } else if (window.location.hash) {
            initialTab = window.location.hash.replace('#', '').toLowerCase();
        }
    } catch (error) {}

    var hasMatchingTab = switchButtons.some(function (btn) {
        return btn.getAttribute('data-product-tab') === initialTab;
    });

    setActiveTab(hasMatchingTab ? initialTab : 'all', false);
}

function initProductDownloadCounters() {
    if (window.sharedDownloadCounter && typeof window.sharedDownloadCounter.init === 'function') {
        window.sharedDownloadCounter.init();
    }
}

function initProducts() {
    initProductsTabs();
    initProductDownloadCounters();
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initProducts);
} else {
    initProducts();
}
