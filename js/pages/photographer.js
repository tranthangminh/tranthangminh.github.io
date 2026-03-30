'use strict';

var photographerGallery = document.querySelector('.photographer-gallery');
var photographerImageManifest = Array.isArray(window.photographerImageManifest)
    ? window.photographerImageManifest
    : [];

if (typeof initSharedPage === 'function') {
    initSharedPage({
        titleKey: 'meta.photographer.title',
        header: {
            rootId: 'sharedHeaderRoot',
            options: {
                homeHref: '../index.html',
                professionItems: [
                    { labelKey: 'header.profession.actor', label: 'Diễn Viên', href: '../actor/' },
                    { labelKey: 'header.profession.artist', label: 'Họa Sĩ' },
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

function shuffleArray(items) {
    var nextItems = items.slice();
    for (var index = nextItems.length - 1; index > 0; index -= 1) {
        var randomIndex = Math.floor(Math.random() * (index + 1));
        var temp = nextItems[index];
        nextItems[index] = nextItems[randomIndex];
        nextItems[randomIndex] = temp;
    }
    return nextItems;
}

function createAltText(name, fallbackIndex) {
    var baseName = String(name || '').replace(/\.[^.]+$/, '').trim();
    return baseName
        ? 'Ảnh nhiếp ảnh ' + baseName
        : 'Ảnh nhiếp ảnh ' + String(fallbackIndex + 1);
}

function getManifestGalleryItems() {
    return photographerImageManifest
        .map(function (item, index) {
            var nextItem = item || {};
            var src = nextItem.src || '';
            var alt = nextItem.alt || createAltText(src, index);
            return {
                src: src,
                alt: alt
            };
        })
        .filter(function (item) {
            return !!item.src;
        });
}

function renderGallery(items) {
    if (!photographerGallery || !items.length) {
        return;
    }

    photographerGallery.innerHTML = '';

    items.forEach(function (item) {
        var figure = document.createElement('figure');
        var image = document.createElement('img');

        figure.className = 'photo-card';
        image.src = item.src;
        image.alt = item.alt;
        image.loading = 'lazy';
        image.decoding = 'async';

        figure.appendChild(image);
        photographerGallery.appendChild(figure);
    });
}

function renderPhotographerGallery() {
    var items = getManifestGalleryItems();
    if (!items.length) {
        return;
    }

    renderGallery(shuffleArray(items));
}

renderPhotographerGallery();
