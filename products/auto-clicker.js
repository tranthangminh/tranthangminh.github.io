'use strict';

if (typeof initSharedPage === 'function') {
    initSharedPage({
        titleKey: 'autoClicker.docTitle',
        header: {
            rootId: 'sharedHeaderRoot',
            options: {
                homeHref: '../index.html',
                professionBaseHref: '../jobs/',
                assetBase: '../'
            }
        },
        contact: {
            rootId: 'sharedContactRoot',
            options: {
                pageClass: 'contact-page',
                id: 'contactSection',
                includeReveal: false,
                assetBase: '../'
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

function initAppDetailTabs() {
    if (window.sharedTabs && typeof window.sharedTabs.init === 'function') {
        window.sharedTabs.init({
            container: '.app-detail-tabs',
            btnSelector: '.segmented-tabs-btn',
            indicatorSelector: '.segmented-tabs-indicator',
            activeLabelSelector: '.segmented-tabs-active-label',
            activeTextSelector: '.segmented-tabs-active-text',
            textSelector: '.segmented-tabs-text',
            tabDataAttr: 'data-tab',
            defaultTab: 'description',
            urlParam: null,
            onTabChange: function (tabId) {
                var panes = document.querySelectorAll('.app-tab-pane');
                panes.forEach(function (pane) {
                    var active = pane.getAttribute('data-tab-pane') === tabId;
                    pane.classList.toggle('is-active', active);
                });
            }
        });
    }
}

function initAppSpotlightGallery() {
    if (window.sharedSpotlight && typeof window.sharedSpotlight.init === 'function') {
        window.sharedSpotlight.init({
            container: '.app-preview-wrap',
            spotlightImg: '#appFeaturedImg',
            caption: '#appFeaturedLabel',
            strip: '.spotlight-strip',
            itemSelector: '.spotlight-item',
            activeClass: 'active-thumb',
            trigger: 'both'
        });
    }
}

document.addEventListener('DOMContentLoaded', function () {
    initAppSpotlightGallery();
    initAppDetailTabs();
});
if (document.readyState === 'interactive' || document.readyState === 'complete') {
    initAppSpotlightGallery();
    initAppDetailTabs();
}
