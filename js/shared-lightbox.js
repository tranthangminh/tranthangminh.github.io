(function () {
    'use strict';

    var escapeHtml = window.sharedUtils.escapeHtml;
    function translate(key, fallback) {
        if (window.sharedI18n && typeof window.sharedI18n.t === 'function') {
            return window.sharedI18n.t(key, fallback);
        }

        return fallback != null ? fallback : key;
    }

    window.renderSharedLightbox = function (rootId, options) {
        var opts = options || {};
        var root = document.getElementById(rootId);
        if (!root) {
            return;
        }

        var overlayId = escapeHtml(opts.overlayId || 'sharedLightbox');
        var imageId = escapeHtml(opts.imageId || 'sharedLightboxImage');
        var closeId = escapeHtml(opts.closeId || 'sharedLightboxClose');
        var prevId = escapeHtml(opts.prevId || 'sharedLightboxPrev');
        var nextId = escapeHtml(opts.nextId || 'sharedLightboxNext');
        var counterId = escapeHtml(opts.counterId || 'sharedLightboxCounter');
        var thumbsId = escapeHtml(opts.thumbsId || 'sharedLightboxThumbs');
        var closeLabel = escapeHtml(translate(opts.closeLabelKey || 'lightbox.close', opts.closeLabel || '\u0110\u00f3ng \u1ea3nh'));
        var prevLabel = escapeHtml(translate(opts.prevLabelKey || 'lightbox.prev', opts.prevLabel || '\u1ea2nh tr\u01b0\u1edbc'));
        var nextLabel = escapeHtml(translate(opts.nextLabelKey || 'lightbox.next', opts.nextLabel || '\u1ea2nh ti\u1ebfp theo'));
        var thumbsLabel = escapeHtml(translate(opts.thumbsLabelKey || 'lightbox.thumbs', opts.thumbsLabel || 'Danh s\u00e1ch \u1ea3nh'));
        var initialAlt = escapeHtml(translate(opts.initialAltKey || 'lightbox.fallbackAlt', opts.initialAlt || '\u1ea2nh ph\u00f3ng to'));
        var closeText = escapeHtml(opts.closeText || '\u00d7');
        var prevText = escapeHtml(opts.prevText || '\u2039');
        var nextText = escapeHtml(opts.nextText || '\u203a');

        root.innerHTML = '' +
            '<div class="lightbox" id="' + overlayId + '" aria-hidden="true">' +
            '    <div class="lightbox-panel">' +
            '        <button class="lightbox-close" id="' + closeId + '" type="button" aria-label="' + closeLabel + '">' + closeText + '</button>' +
            '        <div class="lightbox-stage-wrap">' +
            '            <button class="lightbox-nav lightbox-nav-prev" id="' + prevId + '" type="button" aria-label="' + prevLabel + '">' + prevText + '</button>' +
            '            <div class="lightbox-stage">' +
            '                <img id="' + imageId + '" src="" alt="' + initialAlt + '" draggable="false">' +
            '            </div>' +
            '            <button class="lightbox-nav lightbox-nav-next" id="' + nextId + '" type="button" aria-label="' + nextLabel + '">' + nextText + '</button>' +
            '        </div>' +
            '        <div class="lightbox-meta">' +
            '            <div class="lightbox-counter" id="' + counterId + '" aria-live="polite"></div>' +
            '            <div class="lightbox-thumbs" id="' + thumbsId + '" aria-label="' + thumbsLabel + '"></div>' +
            '        </div>' +
            '    </div>' +
            '</div>';
    };

    window.initSharedLightbox = function (options) {
        var opts = options || {};
        var overlay = document.getElementById(opts.overlayId || 'sharedLightbox');
        var image = document.getElementById(opts.imageId || 'sharedLightboxImage');
        var closeButton = document.getElementById(opts.closeId || 'sharedLightboxClose');
        var prevButton = document.getElementById(opts.prevId || 'sharedLightboxPrev');
        var nextButton = document.getElementById(opts.nextId || 'sharedLightboxNext');
        var counter = document.getElementById(opts.counterId || 'sharedLightboxCounter');
        var thumbs = document.getElementById(opts.thumbsId || 'sharedLightboxThumbs');
        var triggerSelector = opts.triggerSelector || '.actor-item img';
        var groupSelector = typeof opts.groupSelector === 'string'
            ? opts.groupSelector
            : '[data-lightbox-group], .actor-grid, .actor-hero-gallery, .timeline-media-grid';
        var fallbackAlt = translate(opts.fallbackAltKey || 'lightbox.fallbackAlt', opts.fallbackAlt || '\u1ea2nh ph\u00f3ng to');
        var minScale = typeof opts.minScale === 'number' ? opts.minScale : 1;
        var maxScale = typeof opts.maxScale === 'number' ? opts.maxScale : 4;
        var zoomStep = typeof opts.zoomStep === 'number' ? opts.zoomStep : 0.24;
        var zoomToggleScale = typeof opts.zoomToggleScale === 'number' ? opts.zoomToggleScale : 2;
        var panThreshold = typeof opts.panThreshold === 'number' ? opts.panThreshold : 6;
        var scale = minScale;
        var translateX = 0;
        var translateY = 0;
        var isPanning = false;
        var activePointerId = null;
        var startPointerX = 0;
        var startPointerY = 0;
        var startTranslateX = 0;
        var startTranslateY = 0;
        var activePointers = {};
        var pointerStarts = {};
        var pinchStartDistance = 0;
        var pinchStartScale = minScale;
        var pinchStartTranslateX = 0;
        var pinchStartTranslateY = 0;
        var pinchStartCenterX = 0;
        var pinchStartCenterY = 0;
        var lastTapTime = 0;
        var lastTapX = 0;
        var lastTapY = 0;
        var doubleTapDelay = typeof opts.doubleTapDelay === 'number' ? opts.doubleTapDelay : 280;
        var doubleTapDistance = typeof opts.doubleTapDistance === 'number' ? opts.doubleTapDistance : 24;
        var currentItems = [];
        var currentIndex = -1;

        if (!overlay || !image || !closeButton || !prevButton || !nextButton || !counter || !thumbs || !triggerSelector) {
            return null;
        }

        function clamp(value, min, max) {
            return Math.min(max, Math.max(min, value));
        }

        function toArray(list) {
            return Array.prototype.slice.call(list || []);
        }

        function getImageSource(target) {
            if (!target) {
                return '';
            }

            if (target.dataset && target.dataset.lightboxSrc) {
                return target.dataset.lightboxSrc;
            }

            return target.currentSrc || target.src || '';
        }

        function getItemAlt(target) {
            if (!target) {
                return fallbackAlt;
            }

            if (target.dataset && target.dataset.lightboxAlt) {
                return target.dataset.lightboxAlt;
            }

            return target.alt || fallbackAlt;
        }

        function getGroupRoot(target) {
            if (!target || !groupSelector || typeof target.closest !== 'function') {
                return null;
            }

            return target.closest(groupSelector);
        }

        function collectGalleryItems(target) {
            var groupRoot = getGroupRoot(target);
            var items = toArray(document.querySelectorAll(triggerSelector))
                .filter(function (node) {
                    return (!groupRoot || groupRoot.contains(node)) && !!getImageSource(node);
                })
                .map(function (node) {
                    return {
                        element: node,
                        src: getImageSource(node),
                        thumbSrc: node.currentSrc || node.src || getImageSource(node),
                        alt: getItemAlt(node)
                    };
                });
            var index = items.findIndex(function (item) {
                return item.element === target;
            });

            if (index === -1 && target && getImageSource(target)) {
                items.unshift({
                    element: target,
                    src: getImageSource(target),
                    thumbSrc: target.currentSrc || target.src || getImageSource(target),
                    alt: getItemAlt(target)
                });
                index = 0;
            }

            return {
                items: items,
                index: index
            };
        }

        function getPointerIds() {
            return Object.keys(activePointers);
        }

        function getPointerCount() {
            return getPointerIds().length;
        }

        function getPointerList() {
            return getPointerIds().map(function (pointerId) {
                return activePointers[pointerId];
            });
        }

        function getDistance(pointA, pointB) {
            var dx = pointA.x - pointB.x;
            var dy = pointA.y - pointB.y;
            return Math.sqrt((dx * dx) + (dy * dy));
        }

        function getMidpoint(pointA, pointB) {
            return {
                x: (pointA.x + pointB.x) / 2,
                y: (pointA.y + pointB.y) / 2
            };
        }

        function beginPinch() {
            var pointers = getPointerList();
            if (pointers.length < 2) {
                pinchStartDistance = 0;
                return;
            }

            var center = getMidpoint(pointers[0], pointers[1]);
            pinchStartDistance = Math.max(getDistance(pointers[0], pointers[1]), 1);
            pinchStartScale = scale;
            pinchStartTranslateX = translateX;
            pinchStartTranslateY = translateY;
            pinchStartCenterX = center.x;
            pinchStartCenterY = center.y;
        }

        function clearPinch() {
            pinchStartDistance = 0;
        }

        function clampTranslation() {
            if (scale <= minScale) {
                translateX = 0;
                translateY = 0;
                return;
            }

            var maxOffsetX = Math.max(0, (image.clientWidth * (scale - 1)) / 2);
            var maxOffsetY = Math.max(0, (image.clientHeight * (scale - 1)) / 2);

            translateX = clamp(translateX, -maxOffsetX, maxOffsetX);
            translateY = clamp(translateY, -maxOffsetY, maxOffsetY);
        }

        function applyTransform() {
            clampTranslation();
            image.style.transform = 'translate3d(' + translateX + 'px, ' + translateY + 'px, 0) scale(' + scale + ')';
            overlay.classList.toggle('zoomed', scale > minScale + 0.001);
            overlay.classList.toggle('is-panning', isPanning);
        }

        function resetZoom() {
            scale = minScale;
            translateX = 0;
            translateY = 0;
            isPanning = false;
            activePointerId = null;
            activePointers = {};
            pointerStarts = {};
            clearPinch();
            applyTransform();
        }

        function setScale(nextScale) {
            scale = clamp(nextScale, minScale, maxScale);

            if (scale <= minScale + 0.001) {
                scale = minScale;
                translateX = 0;
                translateY = 0;
            }

            applyTransform();
        }

        function zoomBy(delta) {
            setScale(scale + delta);
        }

        function updateNavState() {
            var hasGallery = currentItems.length > 1;
            overlay.classList.toggle('has-gallery', hasGallery);
            prevButton.disabled = !hasGallery;
            nextButton.disabled = !hasGallery;
            counter.textContent = hasGallery && currentIndex >= 0
                ? String(currentIndex + 1) + ' / ' + String(currentItems.length)
                : '';
        }

        function renderThumbs() {
            thumbs.innerHTML = '';

            if (currentItems.length <= 1) {
                return;
            }

            currentItems.forEach(function (item, index) {
                var button = document.createElement('button');
                var thumbImage = document.createElement('img');

                button.type = 'button';
                button.className = 'lightbox-thumb' + (index === currentIndex ? ' active' : '');
                button.setAttribute('aria-label', 'M\u1edf \u1ea3nh ' + String(index + 1));
                button.dataset.lightboxIndex = String(index);

                thumbImage.src = item.thumbSrc || item.src;
                thumbImage.alt = item.alt || fallbackAlt;
                thumbImage.loading = 'lazy';
                thumbImage.decoding = 'async';

                button.appendChild(thumbImage);
                thumbs.appendChild(button);
            });

            var activeThumb = thumbs.querySelector('.lightbox-thumb.active');
            if (activeThumb && typeof activeThumb.scrollIntoView === 'function') {
                activeThumb.scrollIntoView({
                    block: 'nearest',
                    inline: 'center',
                    behavior: 'smooth'
                });
            }
        }

        function showItem(index) {
            if (!currentItems.length) {
                return;
            }

            currentIndex = ((index % currentItems.length) + currentItems.length) % currentItems.length;
            image.src = currentItems[currentIndex].src;
            image.alt = currentItems[currentIndex].alt || fallbackAlt;
            resetZoom();
            updateNavState();
            renderThumbs();
        }

        function goToNext() {
            if (currentItems.length <= 1) {
                return;
            }

            showItem(currentIndex + 1);
        }

        function goToPrev() {
            if (currentItems.length <= 1) {
                return;
            }

            showItem(currentIndex - 1);
        }

        function openLightbox(target) {
            var gallery = collectGalleryItems(target);
            if (!gallery.items.length) {
                return;
            }

            currentItems = gallery.items;
            showItem(gallery.index >= 0 ? gallery.index : 0);
            overlay.classList.add('open');
            overlay.setAttribute('aria-hidden', 'false');
        }

        function closeLightbox() {
            resetZoom();
            overlay.classList.remove('open');
            overlay.classList.remove('zoomed');
            overlay.classList.remove('is-panning');
            overlay.classList.remove('has-gallery');
            overlay.setAttribute('aria-hidden', 'true');
            currentItems = [];
            currentIndex = -1;
            counter.textContent = '';
            thumbs.innerHTML = '';
            image.src = '';
            image.alt = fallbackAlt;
        }

        document.addEventListener('click', function (event) {
            var trigger = event.target.closest(triggerSelector);
            if (!trigger || !document.documentElement.contains(trigger)) {
                return;
            }
            openLightbox(trigger);
        });

        image.addEventListener('load', function () {
            resetZoom();
        });

        image.addEventListener('dragstart', function (event) {
            event.preventDefault();
        });

        image.addEventListener('dblclick', function (event) {
            event.preventDefault();

            if (scale > minScale + 0.001) {
                resetZoom();
                return;
            }

            setScale(Math.min(maxScale, zoomToggleScale));
        });

        image.addEventListener('pointerdown', function (event) {
            activePointers[event.pointerId] = {
                x: event.clientX,
                y: event.clientY,
                type: event.pointerType || ''
            };
            pointerStarts[event.pointerId] = {
                x: event.clientX,
                y: event.clientY,
                moved: false,
                type: event.pointerType || ''
            };

            if (typeof image.setPointerCapture === 'function') {
                try {
                    image.setPointerCapture(event.pointerId);
                } catch (error) {
                    /* Ignore pointer capture issues on unsupported browsers */
                }
            }

            if (getPointerCount() >= 2) {
                isPanning = false;
                activePointerId = null;
                beginPinch();
                applyTransform();
                event.preventDefault();
                return;
            }

            if (scale <= minScale + 0.001) {
                return;
            }

            isPanning = true;
            activePointerId = event.pointerId;
            startPointerX = event.clientX;
            startPointerY = event.clientY;
            startTranslateX = translateX;
            startTranslateY = translateY;
            applyTransform();
            event.preventDefault();
        });

        image.addEventListener('pointermove', function (event) {
            if (activePointers[event.pointerId]) {
                activePointers[event.pointerId].x = event.clientX;
                activePointers[event.pointerId].y = event.clientY;
            }

            if (pointerStarts[event.pointerId]) {
                var pointerDeltaX = event.clientX - pointerStarts[event.pointerId].x;
                var pointerDeltaY = event.clientY - pointerStarts[event.pointerId].y;
                if (Math.sqrt((pointerDeltaX * pointerDeltaX) + (pointerDeltaY * pointerDeltaY)) > panThreshold) {
                    pointerStarts[event.pointerId].moved = true;
                }
            }

            if (getPointerCount() >= 2 && pinchStartDistance > 0) {
                var pointers = getPointerList();
                var currentDistance = Math.max(getDistance(pointers[0], pointers[1]), 1);
                var currentCenter = getMidpoint(pointers[0], pointers[1]);

                scale = clamp(pinchStartScale * (currentDistance / pinchStartDistance), minScale, maxScale);

                if (scale <= minScale + 0.001) {
                    scale = minScale;
                    translateX = 0;
                    translateY = 0;
                } else {
                    translateX = pinchStartTranslateX + (currentCenter.x - pinchStartCenterX);
                    translateY = pinchStartTranslateY + (currentCenter.y - pinchStartCenterY);
                }

                isPanning = false;
                activePointerId = null;
                applyTransform();
                event.preventDefault();
                return;
            }

            if (!isPanning || event.pointerId !== activePointerId) {
                return;
            }

            translateX = startTranslateX + (event.clientX - startPointerX);
            translateY = startTranslateY + (event.clientY - startPointerY);
            applyTransform();
            event.preventDefault();
        });

        function endPan(event) {
            var pointerId = event && typeof event.pointerId !== 'undefined' ? event.pointerId : null;
            var pointerInfo = pointerId !== null && activePointers[pointerId] ? activePointers[pointerId] : {
                x: event && typeof event.clientX === 'number' ? event.clientX : 0,
                y: event && typeof event.clientY === 'number' ? event.clientY : 0
            };
            var pointerStart = pointerId !== null ? pointerStarts[pointerId] : null;

            if (pointerId !== null) {
                delete activePointers[pointerId];
                delete pointerStarts[pointerId];
            }

            if (pointerId !== null && activePointerId === pointerId) {
                isPanning = false;
                activePointerId = null;
            }

            if (getPointerCount() < 2) {
                clearPinch();
            }

            applyTransform();

            if (!pointerStart || pointerStart.type !== 'touch' || pointerStart.moved || getPointerCount() !== 0) {
                return;
            }

            var now = performance.now();
            var distanceFromLastTap = Math.sqrt(
                Math.pow(pointerInfo.x - lastTapX, 2) +
                Math.pow(pointerInfo.y - lastTapY, 2)
            );

            if ((now - lastTapTime) <= doubleTapDelay && distanceFromLastTap <= doubleTapDistance) {
                if (scale > minScale + 0.001) {
                    resetZoom();
                } else {
                    setScale(Math.min(maxScale, zoomToggleScale));
                }
                lastTapTime = 0;
                lastTapX = 0;
                lastTapY = 0;
                if (event) {
                    event.preventDefault();
                }
                return;
            }

            lastTapTime = now;
            lastTapX = pointerInfo.x;
            lastTapY = pointerInfo.y;
        }

        image.addEventListener('pointerup', endPan);
        image.addEventListener('pointercancel', endPan);
        image.addEventListener('lostpointercapture', endPan);

        overlay.addEventListener('wheel', function (event) {
            if (!overlay.classList.contains('open') || event.target !== image) {
                return;
            }

            event.preventDefault();
            zoomBy(event.deltaY < 0 ? zoomStep : -zoomStep);
        }, { passive: false });

        closeButton.addEventListener('click', closeLightbox);
        prevButton.addEventListener('click', function (event) {
            event.stopPropagation();
            goToPrev();
        });
        nextButton.addEventListener('click', function (event) {
            event.stopPropagation();
            goToNext();
        });
        thumbs.addEventListener('click', function (event) {
            var thumbButton = event.target.closest('.lightbox-thumb');
            if (!thumbButton || !thumbs.contains(thumbButton)) {
                return;
            }

            var nextIndex = Number(thumbButton.dataset.lightboxIndex);
            if (!Number.isNaN(nextIndex)) {
                showItem(nextIndex);
            }
        });
        overlay.addEventListener('click', function (event) {
            if (event.target === image || event.target.closest('button')) {
                return;
            }

            closeLightbox();
        });

        document.addEventListener('keydown', function (event) {
            if (!overlay.classList.contains('open')) {
                return;
            }

            if (event.key === 'Escape') {
                closeLightbox();
                return;
            }

            if (event.key === 'ArrowLeft') {
                goToPrev();
                return;
            }

            if (event.key === 'ArrowRight') {
                goToNext();
                return;
            }

            if (event.key === '+' || event.key === '=') {
                zoomBy(zoomStep);
                return;
            }

            if (event.key === '-' || event.key === '_') {
                zoomBy(-zoomStep);
                return;
            }

            if (event.key === '0') {
                resetZoom();
            }
        });

        return {
            openLightbox: openLightbox,
            closeLightbox: closeLightbox,
            goToNext: goToNext,
            goToPrev: goToPrev,
            zoomBy: zoomBy,
            resetZoom: resetZoom,
            overlay: overlay,
            image: image,
            closeButton: closeButton
        };
    };
})();
