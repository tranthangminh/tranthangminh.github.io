(function () {
    'use strict';

    function shuffleItems(items) {
        var nextItems = items.slice();
        for (var index = nextItems.length - 1; index > 0; index -= 1) {
            var randomIndex = Math.floor(Math.random() * (index + 1));
            var temp = nextItems[index];
            nextItems[index] = nextItems[randomIndex];
            nextItems[randomIndex] = temp;
        }
        return nextItems;
    }

    function createAltText(prefix, name, fallbackIndex) {
        var baseName = String(name || '').replace(/\.[^.]+$/, '').trim();
        return baseName
            ? prefix + ' ' + baseName
            : prefix + ' ' + String(fallbackIndex + 1);
    }

    function normalizeImageItems(items, options) {
        var opts = options || {};
        var altPrefix = opts.altPrefix || '\u1EA2nh';
        return (Array.isArray(items) ? items : [])
            .map(function (item, index) {
                var nextItem = item || {};
                var src = nextItem.src || '';
                return {
                    src: src,
                    alt: nextItem.alt || createAltText(altPrefix, src, index)
                };
            })
            .filter(function (item) {
                return !!item.src;
            });
    }

    function renderImageGallery(container, items, options) {
        var opts = options || {};
        var cardClass = opts.cardClass || 'masonry-card';
        var imageClass = opts.imageClass || '';
        var nextItems = opts.shuffle === false ? items.slice() : shuffleItems(items);

        if (!container) {
            return [];
        }

        container.innerHTML = '';

        nextItems.forEach(function (item) {
            var figure = document.createElement('figure');
            var image = document.createElement('img');

            figure.className = cardClass;
            image.className = imageClass;
            image.src = item.src;
            image.alt = item.alt;
            image.loading = 'lazy';
            image.decoding = 'async';

            figure.appendChild(image);
            container.appendChild(figure);
        });

        return nextItems;
    }

    window.sharedGallery = {
        shuffleItems: shuffleItems,
        normalizeImageItems: normalizeImageItems,
        renderImageGallery: renderImageGallery
    };
})();

