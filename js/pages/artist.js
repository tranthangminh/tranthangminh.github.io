'use strict';

var artistGallery = document.getElementById('artistGallery');
var artistTabButtons = Array.prototype.slice.call(document.querySelectorAll('.artist-switch-btn'));
var artistImageSets = {
    '2d': Array.isArray(window.artist2dImageManifest) ? window.artist2dImageManifest : [],
    '3d': Array.isArray(window.artist3dImageManifest) ? window.artist3dImageManifest : []
};
var activeArtistMedium = '2d';
var sharedGallery = window.sharedGallery || null;

if (typeof initSharedPage === 'function') {
    initSharedPage({
        titleKey: 'meta.artist.title',
        header: {
            rootId: 'sharedHeaderRoot',
            options: {
                homeHref: '../index.html',
                toolBaseHref: '../',
                professionItems: [
                    { labelKey: 'header.profession.actor', label: 'Diễn Viên', href: '../actor/' },
                    { labelKey: 'header.profession.artist', label: 'Họa Sĩ', href: './' },
                    { labelKey: 'header.profession.photographer', label: 'Nhiếp Ảnh', href: '../photographer/' }
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
                initialAltKey: 'lightbox.artistAlt',
                initialAlt: 'Ảnh họa sĩ phóng to'
            }
        },
        headerMenus: {},
        lightboxInit: {
            triggerSelector: '.artist-card img',
            fallbackAltKey: 'lightbox.artistAlt',
            fallbackAlt: 'Ảnh họa sĩ phóng to'
        },
        bookNowBehavior: {
            buttonId: 'bookNowButton',
            hideWhenVisible: 'contactSection',
            visibilityThreshold: 0.45
        }
    });
}

function getArtistItems(medium) {
    var items = artistImageSets[medium] || [];

    if (sharedGallery && typeof sharedGallery.normalizeImageItems === 'function') {
        return sharedGallery.normalizeImageItems(items, {
            altPrefix: medium === '3d' ? 'Ảnh 3D' : 'Ảnh 2D'
        });
    }

    return items
        .map(function (item, index) {
            var nextItem = item || {};
            var src = nextItem.src || '';
            var baseName = String(src || '').replace(/\.[^.]+$/, '').trim();
            return {
                src: src,
                alt: nextItem.alt || (baseName ? 'Ảnh ' + medium.toUpperCase() + ' ' + baseName : 'Ảnh ' + medium.toUpperCase() + ' ' + String(index + 1))
            };
        })
        .filter(function (item) {
            return !!item.src;
        });
}

function renderArtistGallery(medium) {
    var items = getArtistItems(medium);
    if (!artistGallery || !items.length) {
        return;
    }

    if (sharedGallery && typeof sharedGallery.renderImageGallery === 'function') {
        sharedGallery.renderImageGallery(artistGallery, items, {
            cardClass: 'artist-card masonry-card'
        });
        return;
    }

    artistGallery.innerHTML = '';

    items.forEach(function (item) {
        var figure = document.createElement('figure');
        var image = document.createElement('img');

        figure.className = 'artist-card masonry-card';
        image.src = item.src;
        image.alt = item.alt;
        image.loading = 'lazy';
        image.decoding = 'async';

        figure.appendChild(image);
        artistGallery.appendChild(figure);
    });
}

function setArtistMedium(nextMedium) {
    if (!artistImageSets[nextMedium]) {
        return;
    }

    activeArtistMedium = nextMedium;

    artistTabButtons.forEach(function (button) {
        var isActive = button.getAttribute('data-medium') === nextMedium;
        button.classList.toggle('is-active', isActive);
        button.setAttribute('aria-pressed', isActive ? 'true' : 'false');
    });

    renderArtistGallery(nextMedium);
}

artistTabButtons.forEach(function (button) {
    button.addEventListener('click', function () {
        setArtistMedium(button.getAttribute('data-medium') || '2d');
    });
});

setArtistMedium(activeArtistMedium);
