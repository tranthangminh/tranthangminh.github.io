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

function initCategoryPillsRainbow() {
    const pills = Array.from(document.querySelectorAll('.product-category-pill'));
    if (!pills.length) return;

    const uniqueCategories = [];
    pills.forEach(pill => {
        const text = pill.innerText.trim();
        if (text && !uniqueCategories.includes(text)) {
            uniqueCategories.push(text);
        }
    });

    const total = uniqueCategories.length;
    const colorMap = {};

    uniqueCategories.forEach((cat, index) => {
        let hue = 5;
        if (total > 1) {
            hue = Math.round(5 + (index * (285 - 5)) / (total - 1));
        }
        let lightness = 48;
        if (hue >= 40 && hue <= 85) {
            lightness = 38;
        } else if (hue > 85 && hue <= 165) {
            lightness = 38;
        } else if (hue > 165 && hue <= 200) {
            lightness = 42;
        }
        const color = `hsl(${hue}, 82%, ${lightness}%)`;
        const glow = `hsla(${hue}, 82%, ${lightness}%, 0.45)`;
        colorMap[cat] = { color, glow };
    });

    pills.forEach(pill => {
        const text = pill.innerText.trim();
        if (colorMap[text] && !pill.style.getPropertyValue('--pill-color')) {
            pill.style.setProperty('--pill-color', colorMap[text].color);
            pill.style.setProperty('--pill-glow', colorMap[text].glow);
        }
    });
}

function initProducts() {
    initProductsTabs();
    initProductDownloadCounters();
    initCategoryPillsRainbow();
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initProducts);
} else {
    initProducts();
}
