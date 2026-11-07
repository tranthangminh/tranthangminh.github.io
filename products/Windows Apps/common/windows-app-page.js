'use strict';

// Shared by the product page of every Windows app. See README.md in this folder.
window.initWindowsAppPage = function (options) {
    if (typeof initSharedPage === 'function') {
        initSharedPage({
            titleKey: options.titleKey,
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

    function initDetailTabs() {
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
                document.querySelectorAll('.app-tab-pane').forEach(function (pane) {
                    pane.classList.toggle('is-active', pane.getAttribute('data-tab-pane') === tabId);
                });
            }
        });
    }

    function initScreenshotGallery() {
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

    function init() {
        initScreenshotGallery();
        initDetailTabs();
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
};
