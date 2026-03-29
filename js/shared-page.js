(function () {
    'use strict';

    function toArray(value) {
        if (!value) {
            return [];
        }

        return Array.isArray(value) ? value : [value];
    }

    window.initSharedPage = function (options) {
        var opts = options || {};
        var i18n = window.sharedI18n;

        if (i18n && typeof i18n.initLanguage === 'function') {
            i18n.initLanguage({
                defaultLanguage: 'vi',
                supportedLanguages: ['vi', 'en']
            });
        }

        if (opts.titleKey && i18n && typeof i18n.t === 'function') {
            document.title = i18n.t(opts.titleKey, document.title);
        }

        if (opts.header && typeof window.renderSharedHeader === 'function') {
            window.renderSharedHeader(opts.header.rootId || 'sharedHeaderRoot', opts.header.options || {});
        }

        if (opts.welcome && typeof window.renderSharedWelcome === 'function') {
            window.renderSharedWelcome(opts.welcome.rootId || 'sharedWelcomeRoot', opts.welcome.options || {});
        }

        if (opts.contact && typeof window.renderSharedContact === 'function') {
            window.renderSharedContact(opts.contact.rootId || 'sharedContactRoot', opts.contact.options || {});
        }

        if (opts.bookNow && typeof window.renderSharedBookNow === 'function') {
            window.renderSharedBookNow(opts.bookNow.rootId || 'sharedBookNowRoot', opts.bookNow.options || {});
        }

        if (opts.lightbox && typeof window.renderSharedLightbox === 'function') {
            window.renderSharedLightbox(opts.lightbox.rootId || 'sharedLightboxRoot', opts.lightbox.options || {});
        }

        if (i18n && typeof i18n.apply === 'function') {
            i18n.apply(document);
        }

        var instances = {};

        if (opts.headerMenus !== false && typeof window.initSharedHeaderMenus === 'function') {
            instances.headerMenus = window.initSharedHeaderMenus(opts.headerMenus || {});
        }

        if (opts.welcomeBehavior && typeof window.initSharedWelcome === 'function') {
            instances.welcome = window.initSharedWelcome(opts.welcomeBehavior || {});
        }

        if (opts.lightboxInit && typeof window.initSharedLightbox === 'function') {
            instances.lightbox = window.initSharedLightbox(opts.lightboxInit || {});
        }

        if (opts.bookNowBehavior && typeof window.initSharedBookNowBehavior === 'function') {
            instances.bookNow = window.initSharedBookNowBehavior(opts.bookNowBehavior || {});
        }

        if (opts.momentum && typeof window.initSharedMomentumScroller === 'function') {
            instances.momentum = toArray(opts.momentum).map(function (config) {
                return window.initSharedMomentumScroller(config || {});
            });
        }

        return instances;
    };
})();
