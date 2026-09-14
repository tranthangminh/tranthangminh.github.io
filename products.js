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
                includeReveal: true,
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
    if (window.sharedTabs && typeof window.sharedTabs.init === 'function') {
        window.sharedTabs.init({
            container: '.products-switch',
            btnSelector: '.products-switch-btn',
            indicatorSelector: '.products-switch-indicator',
            activeLabelSelector: '.products-switch-active-label',
            activeTextSelector: '.products-switch-active-text',
            textSelector: '.products-switch-text',
            targetSections: '.products-category-section',
            tabDataAttr: 'data-product-tab',
            sectionDataAttr: 'data-product-section',
            urlParam: 'tab',
            defaultTab: 'all'
        });
    }
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
