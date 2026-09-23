'use strict';

if (typeof initSharedPage === 'function') {
    initSharedPage({
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
