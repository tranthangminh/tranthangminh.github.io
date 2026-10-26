'use strict';

if (typeof initSharedPage === 'function') {
    initSharedPage({
        titleKey: 'donatePage.metaTitle',
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
