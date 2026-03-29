(function () {
    'use strict';

    var escapeHtml = window.sharedUtils.escapeHtml;

    function translate(key, fallback) {
        if (window.sharedI18n && typeof window.sharedI18n.t === 'function') {
            return window.sharedI18n.t(key, fallback);
        }

        return fallback != null ? fallback : key;
    }

    function resolveText(options, keyName, textName) {
        if (options && options[keyName]) {
            return translate(options[keyName], options[textName]);
        }

        if (options && options[textName] != null) {
            return options[textName];
        }

        return '';
    }

    window.renderSharedWelcome = function (rootId, options) {
        var opts = options || {};
        var root = document.getElementById(rootId);
        if (!root) {
            return;
        }

        var popupId = escapeHtml(opts.id || 'welcomePopup');
        var variantClass = opts.variant ? ' welcome-popup--' + escapeHtml(opts.variant) : '';
        var title = escapeHtml(resolveText(opts, 'titleKey', 'titleText'));
        var kicker = resolveText(opts, 'kickerKey', 'kickerText');
        var message = resolveText(opts, 'messageKey', 'messageText');
        var sign = resolveText(opts, 'signKey', 'signText');
        var kickerHtml = kicker ? '<p class="welcome-note-kicker">' + escapeHtml(kicker) + '</p>' : '';
        var titleHtml = title ? '<h1 class="welcome-note-title">' + title + '</h1>' : '';
        var messageHtml = message ? '<p class="welcome-note-message">' + escapeHtml(message) + '</p>' : '';
        var signHtml = sign ? '<p class="welcome-note-sign">' + escapeHtml(sign) + '</p>' : '';

        root.innerHTML = '' +
            '<div class="welcome-popup' + variantClass + '" id="' + popupId + '" aria-live="polite">' +
            '    <article class="welcome-note">' +
                     kickerHtml +
                     titleHtml +
                     messageHtml +
                     signHtml +
            '    </article>' +
            '</div>';
    };

    window.initSharedWelcome = function (options) {
        var opts = options || {};
        var popup = document.getElementById(opts.id || 'welcomePopup');
        if (!popup) {
            return null;
        }

        var rafCount = typeof opts.showFrames === 'number' ? opts.showFrames : 2;
        var hideAfter = typeof opts.hideAfter === 'number' ? opts.hideAfter : 1200;
        var startHidden = opts.startHidden === true;
        var frameIndex = 0;
        var rafId = null;
        var hideTimer = null;

        function showPopup() {
            popup.classList.add('show');
        }

        function hidePopup() {
            popup.classList.remove('show');
            popup.classList.add('hidden');
        }

        if (startHidden) {
            popup.classList.add('hidden');
            return {
                popup: popup,
                show: showPopup,
                hide: hidePopup
            };
        }

        function step() {
            frameIndex += 1;
            if (frameIndex >= rafCount) {
                showPopup();
                return;
            }

            rafId = requestAnimationFrame(step);
        }

        rafId = requestAnimationFrame(step);

        if (hideAfter > 0) {
            hideTimer = window.setTimeout(hidePopup, hideAfter);
        }

        return {
            popup: popup,
            show: showPopup,
            hide: hidePopup,
            destroy: function () {
                if (rafId) {
                    cancelAnimationFrame(rafId);
                }
                if (hideTimer) {
                    clearTimeout(hideTimer);
                }
            }
        };
    };
})();
