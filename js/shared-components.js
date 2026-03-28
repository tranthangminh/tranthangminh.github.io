(function () {
    function escapeHtml(text) {
        return String(text)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
    }

    window.initSharedHeaderMenus = function (options) {
        var opts = options || {};
        var menuWraps = Array.prototype.slice.call(document.querySelectorAll('.menu-wrap'));
        var headerHomeLink = document.getElementById('headerHomeLink');

        function closeMenus() {
            menuWraps.forEach(function (menuWrap) {
                var menuList = menuWrap.querySelector('.menu-list');
                if (menuList) {
                    menuList.classList.add('hidden');
                }
            });
        }

        if (menuWraps.length) {
            menuWraps.forEach(function (menuWrap) {
                var menuButton = menuWrap.querySelector('.menu-btn');
                var menuList = menuWrap.querySelector('.menu-list');

                if (!menuButton || !menuList) {
                    return;
                }

                menuButton.addEventListener('click', function (event) {
                    event.stopPropagation();
                    var isHidden = menuList.classList.contains('hidden');
                    closeMenus();
                    menuList.classList.toggle('hidden', !isHidden);
                });
            });

            document.addEventListener('click', function (event) {
                if (!event.target.closest('.menu-wrap')) {
                    closeMenus();
                }
            });
        }

        if (headerHomeLink && typeof opts.onHomeClick === 'function') {
            headerHomeLink.addEventListener('click', function (event) {
                closeMenus();
                opts.onHomeClick(event, {
                    closeMenus: closeMenus,
                    headerHomeLink: headerHomeLink,
                    menuWraps: menuWraps
                });
            });
        }

        return {
            closeMenus: closeMenus,
            headerHomeLink: headerHomeLink,
            menuWraps: menuWraps
        };
    };

    window.renderSharedHeader = function (rootId, options) {
        var opts = options || {};
        var root = document.getElementById(rootId);
        if (!root) {
            return;
        }

        var shellClass = 'header-shell' + (opts.scrolled ? ' scrolled' : '');
        var homeHref = escapeHtml(opts.homeHref || 'index.html');
        var professionItems = Array.isArray(opts.professionItems) && opts.professionItems.length ? opts.professionItems : [
            { label: 'Di\u1ec5n Vi\u00ean', href: 'actor/' },
            { label: 'H\u1ecda S\u0129' },
            { label: 'Nhi\u1ebfp \u1ea2nh' }
        ];
        var toolItems = Array.isArray(opts.toolItems) && opts.toolItems.length ? opts.toolItems : [
            { label: 'Tool Photoshop' },
            { label: 'Tool Maya' },
            { label: 'Tool Cheat Engine' }
        ];

        function renderMenuHtml(items) {
            return items.map(function (item) {
                var label = escapeHtml(item.label || '');
                if (item.href) {
                    return '<li><a href="' + escapeHtml(item.href) + '">' + label + '</a></li>';
                }
                return '<li>' + label + '</li>';
            }).join('');
        }

        var professionMenuHtml = renderMenuHtml(professionItems);
        var toolMenuHtml = renderMenuHtml(toolItems);

        root.innerHTML = '' +
            '<div class="' + shellClass + '">' +
            '    <div class="header content-wrap">' +
            '        <div class="header-left">' +
            '            <div class="menu-wrap">' +
            '                <button class="menu-btn" type="button">Ngh\u1ec1 Nghi\u1ec7p</button>' +
            '                <ul class="menu-list hidden">' + professionMenuHtml + '</ul>' +
            '            </div>' +
            '        </div>' +
            '        <a class="header-home" id="headerHomeLink" href="' + homeHref + '" aria-label="Quay v\u1ec1 trang ch\u1ee7">' +
            '            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3 3 10.5V21h6v-6h6v6h6V10.5L12 3Z"/></svg>' +
            '        </a>' +
            '        <div class="header-right">' +
            '            <div class="menu-wrap">' +
            '                <button class="menu-btn" type="button">C\u00f4ng C\u1ee5</button>' +
            '                <ul class="menu-list hidden">' + toolMenuHtml + '</ul>' +
            '            </div>' +
            '        </div>' +
            '    </div>' +
            '</div>';
    };

    window.renderSharedBookNow = function (rootId, options) {
        var opts = options || {};
        var root = document.getElementById(rootId);
        if (!root) {
            return;
        }

        var buttonId = escapeHtml(opts.id || 'bookNowButton');
        var buttonLabel = escapeHtml(opts.label || 'Li\u00ean H\u1ec7 Ngay!');
        var ariaLabel = escapeHtml(opts.ariaLabel || '\u0110i \u0111\u1ebfn ph\u1ea7n li\u00ean h\u1ec7');

        root.innerHTML = '' +
            '<button class="book-now-btn" id="' + buttonId + '" type="button" aria-label="' + ariaLabel + '">' + buttonLabel + '</button>';
    };

    window.initSharedMomentumScroller = function (options) {
        var opts = options || {};
        var selector = typeof opts.selector === 'string' ? opts.selector : null;
        var inputElements = opts.elements || opts.element || null;
        var dragThreshold = typeof opts.dragThreshold === 'number' ? opts.dragThreshold : 4;
        var friction = typeof opts.friction === 'number' ? opts.friction : 0.94;
        var minVelocity = typeof opts.minVelocity === 'number' ? opts.minVelocity : 0.02;
        var frameDistance = typeof opts.frameDistance === 'number' ? opts.frameDistance : 16;
        var momentum = opts.momentum !== false;
        var draggingClass = opts.draggingClass || 'dragging';
        var useNativeTouch = opts.nativeTouch !== false;

        function toArray(value) {
            if (!value) {
                return [];
            }

            if (typeof value.length === 'number' && typeof value !== 'string' && !value.nodeType) {
                return Array.prototype.slice.call(value);
            }

            return [value];
        }

        function initElement(element) {
            if (!element) {
                return null;
            }

            if (typeof element.__sharedMomentumScrollerCleanup === 'function') {
                element.__sharedMomentumScrollerCleanup();
            }

            var isDragging = false;
            var startX = 0;
            var startScrollLeft = 0;
            var lastX = 0;
            var lastTime = 0;
            var velocityX = 0;
            var momentumFrame = null;
            var didDrag = false;
            var originalTouchAction = element.style.touchAction;
            var originalWebkitOverflowScrolling = element.style.webkitOverflowScrolling;
            var originalOverscrollBehaviorX = element.style.overscrollBehaviorX;

            if (useNativeTouch) {
                element.style.touchAction = 'auto';
                element.style.webkitOverflowScrolling = 'touch';
                element.style.overscrollBehaviorX = 'contain';
            }

            function stopMomentum() {
                if (momentumFrame) {
                    cancelAnimationFrame(momentumFrame);
                    momentumFrame = null;
                }
            }

            function runMomentum() {
                if (!momentum) {
                    return;
                }

                stopMomentum();

                function step() {
                    if (Math.abs(velocityX) < minVelocity) {
                        stopMomentum();
                        return;
                    }

                    element.scrollLeft -= velocityX * frameDistance;
                    velocityX *= friction;
                    momentumFrame = requestAnimationFrame(step);
                }

                momentumFrame = requestAnimationFrame(step);
            }

            function beginDrag(clientX) {
                stopMomentum();
                isDragging = true;
                didDrag = false;
                startX = clientX;
                startScrollLeft = element.scrollLeft;
                lastX = clientX;
                lastTime = performance.now();
                velocityX = 0;
                element.classList.add(draggingClass);
            }

            function moveDrag(clientX) {
                if (!isDragging) {
                    return;
                }

                var deltaX = clientX - startX;
                element.scrollLeft = startScrollLeft - deltaX;

                if (Math.abs(deltaX) > dragThreshold) {
                    didDrag = true;
                }

                var now = performance.now();
                var dt = now - lastTime;
                if (dt > 0) {
                    velocityX = (clientX - lastX) / dt;
                }

                lastX = clientX;
                lastTime = now;
            }

            function endDrag() {
                if (!isDragging) {
                    return;
                }

                isDragging = false;
                element.classList.remove(draggingClass);

                if (didDrag) {
                    runMomentum();
                }
            }

            function onMouseDown(event) {
                beginDrag(event.pageX);
            }

            function onMouseMove(event) {
                if (!isDragging) {
                    return;
                }

                event.preventDefault();
                moveDrag(event.pageX);
            }

            function onTouchStart(event) {
                var touch = event.touches[0];
                if (!touch) {
                    return;
                }

                beginDrag(touch.clientX);
            }

            function onTouchMove(event) {
                if (!isDragging) {
                    return;
                }

                var touch = event.touches[0];
                if (!touch) {
                    return;
                }

                moveDrag(touch.clientX);
            }

            function onDragStart(event) {
                event.preventDefault();
            }

            function onClick(event) {
                if (!didDrag) {
                    return;
                }

                event.preventDefault();
                event.stopPropagation();
                didDrag = false;
            }

            element.addEventListener('mouseleave', endDrag);
            element.addEventListener('mouseup', endDrag);
            element.addEventListener('mousedown', onMouseDown);
            element.addEventListener('mousemove', onMouseMove);
            if (!useNativeTouch) {
                element.addEventListener('touchstart', onTouchStart, { passive: true });
                element.addEventListener('touchmove', onTouchMove, { passive: true });
                element.addEventListener('touchend', endDrag);
                element.addEventListener('touchcancel', endDrag);
            }
            element.addEventListener('dragstart', onDragStart);
            element.addEventListener('click', onClick, true);

            function destroy() {
                stopMomentum();
                isDragging = false;
                element.classList.remove(draggingClass);
                element.removeEventListener('mouseleave', endDrag);
                element.removeEventListener('mouseup', endDrag);
                element.removeEventListener('mousedown', onMouseDown);
                element.removeEventListener('mousemove', onMouseMove);
                if (!useNativeTouch) {
                    element.removeEventListener('touchstart', onTouchStart, { passive: true });
                    element.removeEventListener('touchmove', onTouchMove, { passive: true });
                    element.removeEventListener('touchend', endDrag);
                    element.removeEventListener('touchcancel', endDrag);
                }
                element.removeEventListener('dragstart', onDragStart);
                element.removeEventListener('click', onClick, true);
                element.style.touchAction = originalTouchAction;
                element.style.webkitOverflowScrolling = originalWebkitOverflowScrolling;
                element.style.overscrollBehaviorX = originalOverscrollBehaviorX;
                delete element.__sharedMomentumScrollerCleanup;
            }

            element.__sharedMomentumScrollerCleanup = destroy;

            return {
                element: element,
                destroy: destroy,
                stopMomentum: stopMomentum
            };
        }

        var elements = selector ? Array.prototype.slice.call(document.querySelectorAll(selector)) : toArray(inputElements);
        var instances = elements.map(initElement).filter(Boolean);

        return {
            elements: elements,
            instances: instances,
            destroy: function () {
                instances.forEach(function (instance) {
                    instance.destroy();
                });
            }
        };
    };

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
        var closeLabel = escapeHtml(opts.closeLabel || '\u0110\u00f3ng \u1ea3nh');
        var prevLabel = escapeHtml(opts.prevLabel || '\u1ea2nh tr\u01b0\u1edbc');
        var nextLabel = escapeHtml(opts.nextLabel || '\u1ea2nh ti\u1ebfp theo');
        var thumbsLabel = escapeHtml(opts.thumbsLabel || 'Danh s\u00e1ch \u1ea3nh');
        var initialAlt = escapeHtml(opts.initialAlt || '\u1ea2nh ph\u00f3ng to');
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
        var fallbackAlt = opts.fallbackAlt || '\u1ea2nh ph\u00f3ng to';
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

    window.renderSharedContact = function (rootId, options) {
        var opts = options || {};
        var root = document.getElementById(rootId);
        if (!root) {
            return;
        }

        var sectionClass = escapeHtml(opts.pageClass || 'page contact-page');
        var sectionId = opts.id ? ' id="' + escapeHtml(opts.id) + '"' : '';
        var rv = opts.includeReveal === false ? '' : ' reveal-up';
        var assetBase = opts.assetBase ? String(opts.assetBase) : '';
        var signatureSrc = escapeHtml(assetBase + 'assets/images/Signature.png');

        root.innerHTML = '' +
            '<section class="' + sectionClass + '"' + sectionId + '>' +
            '    <div class="contact-wrap">' +
            '        <div class="contact-top' + rv + '">' +
            '            <h2 class="contact-title">LI\u00caN H\u1ec6</h2>' +
            '            <p class="contact-intro">S\u1eb5n s\u00e0ng h\u1ee3p t\u00e1c cho c\u00e1c d\u1ef1 \u00e1n di\u1ec5n xu\u1ea5t, thi\u1ebft k\u1ebf 2D/3D, nhi\u1ebfp \u1ea3nh v\u00e0 ph\u00e1t tri\u1ec3n c\u00f4ng c\u1ee5 h\u1ed7 tr\u1ee3 quy tr\u00ecnh l\u00e0m vi\u1ec7c.</p>' +
            '        </div>' +
            '        <div class="contact-grid">' +
            '            <aside class="contact-side' + rv + '">' +
            '                <div class="contact-card">' +
            '                    <h3 class="contact-card-title">Li\u00ean H\u1ec7 Tr\u1ef1c Ti\u1ebfp</h3>' +
            '                    <div class="contact-actions">' +
            '                        <a class="call-btn" href="tel:+84363219989">G\u1ecdi: +84 36 321 9989</a>' +
            '                        <a class="mail-btn" href="mailto:maxiechen96@gmail.com">Email: maxiechen96@gmail.com</a>' +
            '                    </div>' +
            '                </div>' +
            '                <div class="contact-card">' +
            '                    <h3 class="contact-card-title">M\u1ea1ng X\u00e3 H\u1ed9i</h3>' +
            '                    <div class="contact-social">' +
            '                        <a class="social-link" href="https://www.instagram.com/maxiechen/" target="_blank" rel="noopener noreferrer" aria-label="Instagram"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7.75 2h8.5A5.75 5.75 0 0 1 22 7.75v8.5A5.75 5.75 0 0 1 16.25 22h-8.5A5.75 5.75 0 0 1 2 16.25v-8.5A5.75 5.75 0 0 1 7.75 2Zm8.5 1.5h-8.5A4.25 4.25 0 0 0 3.5 7.75v8.5A4.25 4.25 0 0 0 7.75 20.5h8.5a4.25 4.25 0 0 0 4.25-4.25v-8.5A4.25 4.25 0 0 0 16.25 3.5ZM12 7a5 5 0 1 1 0 10 5 5 0 0 1 0-10Zm0 1.5a3.5 3.5 0 1 0 0 7 3.5 3.5 0 0 0 0-7Zm5.2-2.65a1.05 1.05 0 1 1 0 2.1 1.05 1.05 0 0 1 0-2.1Z"/></svg></a>' +
            '                        <a class="social-link" href="https://www.facebook.com/maxiechen/" target="_blank" rel="noopener noreferrer" aria-label="Facebook"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M13.5 22v-8h2.7l.4-3h-3.1V9.1c0-.9.3-1.6 1.8-1.6H17V4.8c-.3 0-1.3-.1-2.5-.1-2.5 0-4.2 1.5-4.2 4.2V11H7.5v3h2.8v8h3.2Z"/></svg></a>' +
            '                        <a class="social-link" href="https://www.tiktok.com/@max9.tran" target="_blank" rel="noopener noreferrer" aria-label="TikTok"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M14.6 3h2.6a4.8 4.8 0 0 0 3.6 3.8v2.7a7.5 7.5 0 0 1-3.6-1v6.2a6.3 6.3 0 1 1-6.3-6.3c.4 0 .8 0 1.2.1v2.8a3.5 3.5 0 1 0 2.5 3.4V3Z"/></svg></a>' +
            '                        <a class="social-link" href="https://www.youtube.com/@MaxTran96" target="_blank" rel="noopener noreferrer" aria-label="YouTube"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M22 12c0-2.2-.2-3.8-.6-4.7a2.9 2.9 0 0 0-2-2C18.3 5 12 5 12 5s-6.3 0-7.4.3a2.9 2.9 0 0 0-2 2C2.2 8.2 2 9.8 2 12s.2 3.8.6 4.7a2.9 2.9 0 0 0 2 2c1.1.3 7.4.3 7.4.3s6.3 0 7.4-.3a2.9 2.9 0 0 0 2-2c.4-.9.6-2.5.6-4.7Zm-12.5 3.4V8.6L15.8 12l-6.3 3.4Z"/></svg></a>' +
            '                        <details class="social-more">' +
            '                            <summary class="social-more-toggle" aria-label="Xem th\u00eam m\u1ea1ng x\u00e3 h\u1ed9i"></summary>' +
            '                            <div class="social-more-list">' +
            '                                <a class="social-link" href="https://discord.com/users/@maxiechen" target="_blank" rel="noopener noreferrer" aria-label="Discord"><svg viewBox="0 0 16 16" aria-hidden="true"><path d="M13.545 2.907a13.227 13.227 0 0 0-3.257-.404c-.176.3-.372.708-.508 1.02a12.04 12.04 0 0 0-3.658 0 10.887 10.887 0 0 0-.518-1.02 13.184 13.184 0 0 0-3.257.404C.533 6.033-.32 9.085.099 12.137a13.597 13.597 0 0 0 3.995 2.037c.32-.44.607-.908.85-1.398a8.898 8.898 0 0 1-1.334-.636c.112-.082.221-.167.326-.255 2.57 1.205 5.36 1.205 7.901 0 .105.088.214.173.326.255-.42.25-.867.46-1.334.636.243.49.53.958.85 1.398a13.552 13.552 0 0 0 3.995-2.037c.491-3.526-.838-6.545-3.452-9.23ZM5.546 10.36c-.778 0-1.414-.724-1.414-1.611 0-.888.624-1.611 1.414-1.611.799 0 1.435.723 1.414 1.611 0 .887-.636 1.611-1.414 1.611Zm4.908 0c-.778 0-1.414-.724-1.414-1.611 0-.888.624-1.611 1.414-1.611.799 0 1.435.723 1.414 1.611 0 .887-.626 1.611-1.414 1.611Z"/></svg></a>' +
            '                                <a class="social-link" href="https://www.reddit.com/user/maxiechen96/" target="_blank" rel="noopener noreferrer" aria-label="Reddit"><svg viewBox="0 0 16 16" aria-hidden="true"><path d="M6.167 8a.83.83 0 0 0-.83.83c0 .459.372.84.83.831a.831.831 0 0 0 0-1.661m1.843 3.647c.315 0 1.403-.038 1.976-.611a.23.23 0 0 0 0-.306.213.213 0 0 0-.306 0c-.353.363-1.126.487-1.67.487-.545 0-1.308-.124-1.671-.487a.213.213 0 0 0-.306 0 .213.213 0 0 0 0 .306c.564.563 1.652.61 1.977.61zm.992-2.807c0 .458.373.83.831.83s.83-.381.83-.83a.831.831 0 0 0-1.66 0z"/><path d="M16 8A8 8 0 1 1 0 8a8 8 0 0 1 16 0m-3.828-1.165c-.315 0-.602.124-.812.325-.801-.573-1.9-.945-3.121-.993l.534-2.501 1.738.372a.83.83 0 1 0 .83-.869.83.83 0 0 0-.744.468l-1.938-.41a.2.2 0 0 0-.153.028.2.2 0 0 0-.086.134l-.592 2.788c-1.24.038-2.358.41-3.17.992-.21-.2-.496-.324-.81-.324a1.163 1.163 0 0 0-.478 2.224q-.03.17-.029.353c0 1.795 2.091 3.256 4.669 3.256s4.668-1.451 4.668-3.256c0-.114-.01-.238-.029-.353.401-.181.688-.592.688-1.069 0-.65-.525-1.165-1.165-1.165"/></svg></a>' +
            '                                <a class="social-link" href="https://github.com/tranthangminh" target="_blank" rel="noopener noreferrer" aria-label="GitHub"><svg viewBox="0 0 16 16" aria-hidden="true"><path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.5-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82a7.65 7.65 0 0 1 2-.27c.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0 0 16 8c0-4.42-3.58-8-8-8z"/></svg></a>' +
            '                            </div>' +
            '                        </details>' +
            '                    </div>' +
            '                </div>' +
            '                <div class="contact-signature"><img class="signature-img" src="' + signatureSrc + '" alt="Signature"></div>' +
            '                <div class="contact-meta">' +
            '                    <div>B\u1ea3n quy\u1ec1n 2026 Tr\u1ea7n Th\u1eafng Minh. B\u1ea3o l\u01b0u m\u1ecdi quy\u1ec1n.</div>' +
            '                </div>' +
            '            </aside>' +
            '        </div>' +
            '    </div>' +
            '</section>';
    };
})();
