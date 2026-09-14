(function () {
    'use strict';

    /**
     * Shared Spotlight & Thumbnail Gallery Component (shared-spotlight.js)
     * Module quản lý tương tác đồng bộ giữa Ảnh lớn tiêu điểm và Dải thẻ ảnh nhỏ
     * Hỗ trợ click, hover (mouseover), caption, active-thumb và momentum dragging
     */

    function init(options) {
        var opts = options || {};
        var container = typeof opts.container === 'string'
            ? document.querySelector(opts.container)
            : (opts.container || document.querySelector('.spotlight-hub, .actor-gallery-hub, .app-spotlight-hub'));

        if (!container) return null;

        var spotlightImg = opts.spotlightImg
            ? (typeof opts.spotlightImg === 'string' ? container.querySelector(opts.spotlightImg) : opts.spotlightImg)
            : (container.querySelector('#appFeaturedImg, #actorFeaturedImg, .spotlight-frame img, .actor-spotlight-frame img'));

        var captionEl = opts.caption
            ? (typeof opts.caption === 'string' ? container.querySelector(opts.caption) : opts.caption)
            : (container.querySelector('.spotlight-caption, #appFeaturedLabel'));

        var stripEl = opts.strip
            ? (typeof opts.strip === 'string' ? container.querySelector(opts.strip) : opts.strip)
            : (container.querySelector('.spotlight-strip, .actor-hero-gallery'));

        if (!stripEl || !spotlightImg) return null;

        var itemSelector = opts.itemSelector || '.spotlight-item, .actor-item';
        var activeClass = opts.activeClass || 'active-thumb';
        var trigger = opts.trigger || 'both'; // 'both', 'click', 'hover'
        var onPhotoChange = typeof opts.onPhotoChange === 'function' ? opts.onPhotoChange : null;

        var frameEl = opts.frame
            ? (typeof opts.frame === 'string' ? container.querySelector(opts.frame) : opts.frame)
            : (container.querySelector('.spotlight-frame, .actor-spotlight-frame') || spotlightImg.parentElement);

        function getItems() {
            return Array.prototype.slice.call(stripEl.querySelectorAll(itemSelector));
        }

        function getCurrentIndex() {
            var items = getItems();
            var active = stripEl.querySelector('.' + activeClass);
            var idx = items.indexOf(active);
            return idx >= 0 ? idx : 0;
        }

        function setActiveItem(item) {
            if (!item) return;

            var currentActive = stripEl.querySelector('.' + activeClass);
            if (currentActive) {
                currentActive.classList.remove(activeClass);
            }
            item.classList.add(activeClass);

            var imgInside = item.querySelector('img');
            var newSrc = item.getAttribute('data-src') || (imgInside ? imgInside.src : '');
            var newCaption = item.getAttribute('data-caption') || (imgInside ? imgInside.alt : '');

            if (newSrc && spotlightImg.src !== newSrc) {
                spotlightImg.src = newSrc;
                if (newCaption) {
                    spotlightImg.alt = newCaption;
                }
            }

            if (captionEl && newCaption) {
                captionEl.textContent = newCaption;
            }

            if (onPhotoChange) {
                onPhotoChange(newSrc, newCaption, item);
            }
        }

        if (trigger === 'both' || trigger === 'click') {
            stripEl.addEventListener('click', function (e) {
                var item = e.target.closest(itemSelector);
                if (item) setActiveItem(item);
            });
        }

        if (trigger === 'both' || trigger === 'hover') {
            stripEl.addEventListener('mouseover', function (e) {
                var item = e.target.closest(itemSelector);
                if (item) setActiveItem(item);
            });
        }

        // Tích hợp Preview Modal khi click vào ảnh lớn (.spotlight-frame)
        if (frameEl && opts.previewModal !== false) {
            frameEl.style.cursor = 'zoom-in';
            frameEl.addEventListener('click', function (e) {
                // Tránh trigger khi click vào nút hoặc control bên trong nếu có
                if (e.target.closest('button, a, input, select')) return;
                openSpotlightModal({
                    getItems: getItems,
                    getCurrentIndex: getCurrentIndex,
                    setActiveItem: setActiveItem,
                    spotlightImg: spotlightImg,
                    captionEl: captionEl
                });
            });
        }

        // Tích hợp kéo cuộn Momentum nếu có dải ảnh cuộn ngang
        if (window.sharedMomentum && typeof window.sharedMomentum.init === 'function') {
            if (!stripEl.classList.contains('spotlight-strip--grid-2') && !stripEl.classList.contains('spotlight-strip--grid-3')) {
                window.sharedMomentum.init({
                    element: stripEl,
                    direction: 'horizontal'
                });
            }
        }

        return {
            container: container,
            setActiveItem: setActiveItem,
            getItems: getItems,
            getCurrentIndex: getCurrentIndex
        };
    }

    // =========================================================================
    // Spotlight Preview Modal Management (Singleton Modal)
    // =========================================================================
    var activeModalContext = null;
    var modalEl = null;
    var modalImg = null;
    var modalCaption = null;
    var modalPrevBtn = null;
    var modalNextBtn = null;
    var modalCloseBtn = null;

    function ensureModalDom() {
        if (modalEl) return;

        modalEl = document.getElementById('spotlightModal');
        if (!modalEl) {
            modalEl = document.createElement('div');
            modalEl.id = 'spotlightModal';
            modalEl.className = 'spotlight-modal';
            modalEl.setAttribute('aria-hidden', 'true');
            modalEl.setAttribute('role', 'dialog');
            modalEl.setAttribute('aria-label', 'Xem ảnh phóng to');

            modalEl.innerHTML = 
                '<div class="spotlight-modal-dialog">' +
                    '<button class="spotlight-modal-close" type="button" aria-label="Đóng ảnh">&times;</button>' +
                    '<div class="spotlight-modal-stage">' +
                        '<button class="spotlight-modal-nav spotlight-modal-prev" type="button" aria-label="Ảnh trước">&#8249;</button>' +
                        '<img class="spotlight-modal-img" src="" alt="Ảnh phóng to" draggable="false">' +
                        '<button class="spotlight-modal-nav spotlight-modal-next" type="button" aria-label="Ảnh kế tiếp">&#8250;</button>' +
                    '</div>' +
                    '<div class="spotlight-modal-caption"></div>' +
                '</div>';

            document.body.appendChild(modalEl);
        }

        modalImg = modalEl.querySelector('.spotlight-modal-img');
        modalCaption = modalEl.querySelector('.spotlight-modal-caption');
        modalPrevBtn = modalEl.querySelector('.spotlight-modal-prev');
        modalNextBtn = modalEl.querySelector('.spotlight-modal-next');
        modalCloseBtn = modalEl.querySelector('.spotlight-modal-close');

        modalCloseBtn.addEventListener('click', closeSpotlightModal);

        modalEl.addEventListener('click', function (e) {
            if (e.target === modalEl) {
                closeSpotlightModal();
            }
        });

        modalPrevBtn.addEventListener('click', function (e) {
            e.stopPropagation();
            navigateModal(-1);
        });

        modalNextBtn.addEventListener('click', function (e) {
            e.stopPropagation();
            navigateModal(1);
        });

        document.addEventListener('keydown', function (e) {
            if (!modalEl || !modalEl.classList.contains('open')) return;
            if (e.key === 'Escape') {
                closeSpotlightModal();
            } else if (e.key === 'ArrowLeft') {
                navigateModal(-1);
            } else if (e.key === 'ArrowRight') {
                navigateModal(1);
            }
        });
    }

    function openSpotlightModal(ctx) {
        ensureModalDom();
        activeModalContext = ctx;

        syncModalContent();

        modalEl.classList.add('open');
        modalEl.setAttribute('aria-hidden', 'false');
        document.body.style.overflow = 'hidden';
    }

    function closeSpotlightModal() {
        if (!modalEl) return;
        modalEl.classList.remove('open');
        modalEl.setAttribute('aria-hidden', 'true');
        document.body.style.overflow = '';
        activeModalContext = null;
    }

    function syncModalContent() {
        if (!activeModalContext || !modalImg) return;
        var items = activeModalContext.getItems();
        var curIdx = activeModalContext.getCurrentIndex();

        if (items.length > 0 && items[curIdx]) {
            var item = items[curIdx];
            var imgInside = item.querySelector('img');
            var src = item.getAttribute('data-src') || (imgInside ? imgInside.src : activeModalContext.spotlightImg.src);
            var caption = item.getAttribute('data-caption') || (imgInside ? imgInside.alt : (activeModalContext.captionEl ? activeModalContext.captionEl.textContent : ''));

            modalImg.src = src;
            modalImg.alt = caption || 'Xem ảnh phóng to';
            if (modalCaption) {
                modalCaption.textContent = caption || '';
                modalCaption.style.display = caption ? 'block' : 'none';
            }
        } else if (activeModalContext.spotlightImg) {
            modalImg.src = activeModalContext.spotlightImg.src;
            modalImg.alt = activeModalContext.spotlightImg.alt || 'Xem ảnh phóng to';
            if (modalCaption) {
                var cText = activeModalContext.captionEl ? activeModalContext.captionEl.textContent : activeModalContext.spotlightImg.alt;
                modalCaption.textContent = cText || '';
                modalCaption.style.display = cText ? 'block' : 'none';
            }
        }

        // Hiện/ẩn nút next/prev nếu chỉ có 1 ảnh
        var hasMultiple = items.length > 1;
        if (modalPrevBtn) modalPrevBtn.style.display = hasMultiple ? 'flex' : 'none';
        if (modalNextBtn) modalNextBtn.style.display = hasMultiple ? 'flex' : 'none';
    }

    function navigateModal(step) {
        if (!activeModalContext) return;
        var items = activeModalContext.getItems();
        if (items.length <= 1) return;

        var curIdx = activeModalContext.getCurrentIndex();
        var nextIdx = (curIdx + step + items.length) % items.length;

        activeModalContext.setActiveItem(items[nextIdx]);
        syncModalContent();
    }

    // Tự động khởi tạo cho các phần tử có thuộc tính [data-spotlight-gallery]
    function autoInit() {
        var elements = document.querySelectorAll('[data-spotlight-gallery]');
        elements.forEach(function (el) {
            init({ container: el });
        });
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', autoInit);
    } else {
        autoInit();
    }

    window.sharedSpotlight = {
        init: init,
        openModal: openSpotlightModal,
        closeModal: closeSpotlightModal
    };
})();
