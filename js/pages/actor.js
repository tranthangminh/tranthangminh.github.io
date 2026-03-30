'use strict';

if (typeof initSharedPage === 'function') {
    initSharedPage({
        titleKey: 'meta.actor.title',
        header: {
            rootId: 'sharedHeaderRoot',
            options: {
                homeHref: '../index.html',
                professionItems: [
                    { labelKey: 'header.profession.actor', label: 'Diễn Viên', href: './' },
                    { labelKey: 'header.profession.artist', label: 'Họa Sĩ' },
                    { labelKey: 'header.profession.photographer', label: 'Nhiếp Ảnh', href: '../photographer/' }
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
                includeReveal: false,
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
            triggerSelector: '.actor-hero-gallery .actor-item img, .timeline-media-item img',
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

var actorPhoneToggle = document.getElementById("actorPhoneToggle");

if (actorPhoneToggle) {
    actorPhoneToggle.addEventListener("click", function () {
        var phone = actorPhoneToggle.getAttribute("data-phone") || "";
        var phoneDisplay = actorPhoneToggle.getAttribute("data-phone-display") || phone;
        if (!phone) {
            return;
        }

        if (actorPhoneToggle.classList.contains("is-revealed")) {
            window.location.href = "tel:" + phone;
            return;
        }

        actorPhoneToggle.classList.add("is-revealed");
        actorPhoneToggle.textContent = phoneDisplay;
    });
}
