'use strict';

if (typeof initSharedPage === 'function') {
    initSharedPage({
        titleKey: 'meta.actor.title',
        header: {
            rootId: 'sharedHeaderRoot',
            options: {
                homeHref: '../index.html',
                toolBaseHref: '../',
                assetBase: '../',
                professionItems: [
                    { labelKey: 'header.profession.actor', label: 'Diễn Viên', href: 'actor.html' },
                    { labelKey: 'header.profession.artist', label: 'Họa Sĩ', href: 'artist.html' },
                    { labelKey: 'header.profession.photographer', label: 'Nhiếp Ảnh', href: 'photographer.html' },
                    { labelKey: 'header.profession.bunGioHeo', label: 'Bún Giò Heo Minh Nhật', href: 'bun-gio-heo-minh-nhat.html' },
                    { labelKey: 'header.profession.harryPerfume', label: 'Harry Perfume', href: 'https://harryperfume.vn/gioi-thieu', target: '_blank' }
                ]
            }
        },
        welcome: {
            rootId: 'sharedWelcomeRoot',
            options: {
                variant: 'actor',
                kickerKey: 'welcome.actor.kicker',
                titleKey: 'welcome.actor.title'
            }
        },
        contact: {
            rootId: 'sharedContactRoot',
            options: {
                pageClass: 'contact-page',
                id: 'contactSection',
                includeReveal: true,
                assetBase: '../'
            }
        },
        bookNow: {
            rootId: 'sharedBookNowRoot',
            options: { id: 'bookNowButton' }
        },
        lightbox: {
            rootId: 'sharedLightboxRoot',
            options: {
                initialAltKey: 'lightbox.actorAlt',
                initialAlt: 'Ảnh diễn viên phóng to'
            }
        },
        headerMenus: {},
        welcomeBehavior: {
            showFrames: 2,
            hideAfter: 1500
        },
        lightboxInit: {
            triggerSelector: '.actor-spotlight-frame img, .actor-hero-gallery .actor-item img, .timeline-media-item img',
            fallbackAltKey: 'lightbox.actorAlt',
            fallbackAlt: 'Ảnh diễn viên phóng to'
        },
        momentum: {
            selector: '.actor-hero-gallery'
        },
        bookNowBehavior: {
            buttonId: 'bookNowButton',
            hideWhenVisible: 'contactSection',
            visibilityThreshold: 0.45
        }
    });
}

var actorPhoneToggle = document.getElementById('actorPhoneToggle');

if (actorPhoneToggle) {
    actorPhoneToggle.addEventListener('click', function () {
        var phone = actorPhoneToggle.getAttribute('data-phone') || '';
        var phoneDisplay = actorPhoneToggle.getAttribute('data-phone-display') || phone;
        if (!phone) {
            return;
        }

        if (actorPhoneToggle.classList.contains('is-revealed')) {
            window.location.href = 'tel:' + phone;
            return;
        }

        actorPhoneToggle.classList.add('is-revealed');
        actorPhoneToggle.removeAttribute('data-i18n');
        actorPhoneToggle.textContent = phoneDisplay;
    });
}

// Interactive Spotlight Sync with Gallery Lookbook
var heroGallery = document.querySelector('.actor-hero-gallery');
var spotlightImg = document.getElementById('actorFeaturedImg');

if (heroGallery && spotlightImg) {
    heroGallery.addEventListener('mouseover', function (e) {
        var img = e.target.closest('.actor-item img');
        if (img && img.src) {
            spotlightImg.src = img.src;
            var currentActive = heroGallery.querySelector('.active-thumb');
            if (currentActive) {
                currentActive.classList.remove('active-thumb');
            }
            var item = img.closest('.actor-item');
            if (item) {
                item.classList.add('active-thumb');
            }
        }
    });
}
