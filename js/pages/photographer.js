'use strict';

var photographerGallery = document.querySelector('.photographer-gallery');
var photographerImageManifest = Array.isArray(window.photographerImageManifest)
    ? window.photographerImageManifest
    : [];
var sharedGallery = window.sharedGallery || null;

if (typeof initSharedPage === 'function') {
    initSharedPage({
        titleKey: 'meta.photographer.title',
        header: {
            rootId: 'sharedHeaderRoot',
            options: {
                homeHref: '../index.html',
                toolBaseHref: '../',
                professionItems: [
                    { labelKey: 'header.profession.actor', label: 'Diễn Viên', href: '../actor/' },
                    { labelKey: 'header.profession.artist', label: 'Họa Sĩ', href: '../artist/' },
                    { labelKey: 'header.profession.photographer', label: 'Nhiếp Ảnh', href: './' }
                ]
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
                initialAltKey: 'lightbox.photographerAlt',
                initialAlt: 'Ảnh nhiếp ảnh phóng to'
            }
        },
        headerMenus: {},
        lightboxInit: {
            triggerSelector: '.photo-card img',
            fallbackAltKey: 'lightbox.photographerAlt',
            fallbackAlt: 'Ảnh nhiếp ảnh phóng to'
        },
        bookNowBehavior: {
            buttonId: 'bookNowButton',
            hideWhenVisible: 'contactSection',
            visibilityThreshold: 0.45
        }
    });
}

function getManifestGalleryItems() {
    if (sharedGallery && typeof sharedGallery.normalizeImageItems === 'function') {
        return sharedGallery.normalizeImageItems(photographerImageManifest, {
            altPrefix: 'Ảnh nhiếp ảnh'
        });
    }

    return photographerImageManifest
        .map(function (item, index) {
            var nextItem = item || {};
            var src = nextItem.src || '';
            var baseName = String(src || '').replace(/\.[^.]+$/, '').trim();
            return {
                src: src,
                alt: nextItem.alt || (baseName ? 'Ảnh nhiếp ảnh ' + baseName : 'Ảnh nhiếp ảnh ' + String(index + 1))
            };
        })
        .filter(function (item) {
            return !!item.src;
        });
}

function renderPhotographerGallery() {
    var items = getManifestGalleryItems();
    if (!photographerGallery || !items.length) {
        return;
    }

    if (sharedGallery && typeof sharedGallery.renderImageGallery === 'function') {
        sharedGallery.renderImageGallery(photographerGallery, items, {
            cardClass: 'photo-card masonry-card'
        });
        return;
    }

    photographerGallery.innerHTML = '';

    items.forEach(function (item) {
        var figure = document.createElement('figure');
        var image = document.createElement('img');

        figure.className = 'photo-card masonry-card';
        image.src = item.src;
        image.alt = item.alt;
        image.loading = 'lazy';
        image.decoding = 'async';

        figure.appendChild(image);
        photographerGallery.appendChild(figure);
    });
}

renderPhotographerGallery();
