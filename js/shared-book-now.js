(function () {
    'use strict';

    var escapeHtml = window.sharedUtils.escapeHtml;
    function translate(key, fallback) {
        if (window.sharedI18n && typeof window.sharedI18n.t === 'function') {
            return window.sharedI18n.t(key, fallback);
        }

        return fallback != null ? fallback : key;
    }

    window.renderSharedBookNow = function (rootId, options) {
        var opts = options || {};
        var root = document.getElementById(rootId);
        if (!root) {
            return;
        }

        var buttonId = escapeHtml(opts.id || 'bookNowButton');
        var buttonLabel = escapeHtml(translate(opts.labelKey || 'bookNow.label', opts.label || 'Li\u00ean H\u1ec7 Ngay!'));
        var ariaLabel = escapeHtml(translate(opts.ariaLabelKey || 'bookNow.aria', opts.ariaLabel || '\u0110i \u0111\u1ebfn ph\u1ea7n li\u00ean h\u1ec7'));

        root.innerHTML = '' +
            '<button class="book-now-btn" id="' + buttonId + '" type="button" aria-label="' + ariaLabel + '">' + buttonLabel + '</button>';
    };

    window.initSharedBookNowBehavior = function (options) {
        var opts = options || {};
        var button = typeof opts.button === 'string'
            ? document.getElementById(opts.button)
            : (opts.button || document.getElementById(opts.buttonId || 'bookNowButton'));

        if (!button) {
            return null;
        }

        var container = typeof opts.scrollContainer === 'string'
            ? document.querySelector(opts.scrollContainer)
            : (opts.scrollContainer || null);
        var scrollTarget = typeof opts.scrollTarget === 'string'
            ? (document.getElementById(opts.scrollTarget) || document.querySelector(opts.scrollTarget))
            : (opts.scrollTarget || null);
        var targetVisibilityElement = typeof opts.hideWhenVisible === 'string'
            ? (document.getElementById(opts.hideWhenVisible) || document.querySelector(opts.hideWhenVisible))
            : (opts.hideWhenVisible || null);
        var visibilityThreshold = typeof opts.visibilityThreshold === 'number' ? opts.visibilityThreshold : 0.45;
        var observer = null;

        function resolveScrollTop() {
            if (scrollTarget && typeof scrollTarget.offsetTop === 'number') {
                return scrollTarget.offsetTop;
            }

            if (container && typeof container.scrollHeight === 'number') {
                return container.scrollHeight;
            }

            return Math.max(
                document.body.scrollHeight,
                document.documentElement.scrollHeight
            );
        }

        function scrollToContact() {
            var top = resolveScrollTop();

            if (container && typeof container.scrollTo === 'function') {
                container.scrollTo({
                    top: top,
                    behavior: 'smooth'
                });
                return;
            }

            window.scrollTo({
                top: top,
                behavior: 'smooth'
            });
        }

        function handleButtonClick() {
            scrollToContact();
        }

        button.addEventListener('click', handleButtonClick);

        if (targetVisibilityElement && typeof window.IntersectionObserver === 'function') {
            observer = new IntersectionObserver(function (entries) {
                entries.forEach(function (entry) {
                    button.classList.toggle('hidden', entry.isIntersecting && entry.intersectionRatio > visibilityThreshold);
                });
            }, { threshold: [visibilityThreshold, 0.75] });

            observer.observe(targetVisibilityElement);
        }

        return {
            button: button,
            destroy: function () {
                button.removeEventListener('click', handleButtonClick);
                if (observer) {
                    observer.disconnect();
                }
            }
        };
    };
})();
