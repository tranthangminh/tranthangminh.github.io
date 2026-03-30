(function () {
    'use strict';

    var escapeHtml = window.sharedUtils.escapeHtml;
    function translate(key, fallback) {
        if (window.sharedI18n && typeof window.sharedI18n.t === 'function') {
            return window.sharedI18n.t(key, fallback);
        }

        return fallback != null ? fallback : key;
    }

    window.initSharedHeaderMenus = function (options) {
        var opts = options || {};
        var menuWraps = Array.prototype.slice.call(document.querySelectorAll('.menu-wrap'));
        var headerHomeLink = document.getElementById('headerHomeLink');
        var languageButtons = Array.prototype.slice.call(document.querySelectorAll('.lang-btn[data-lang]'));

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

        if (languageButtons.length) {
            languageButtons.forEach(function (button) {
                button.addEventListener('click', function () {
                    var targetLanguage = button.getAttribute('data-lang');
                    var i18n = window.sharedI18n;

                    if (!targetLanguage || !i18n || typeof i18n.setLanguage !== 'function') {
                        return;
                    }

                    if (typeof i18n.getLanguage === 'function' && i18n.getLanguage() === targetLanguage) {
                        return;
                    }

                    closeMenus();
                    i18n.setLanguage(targetLanguage);

                    try {
                        var nextUrl = new URL(window.location.href);
                        nextUrl.searchParams.set('lang', targetLanguage);
                        window.location.replace(nextUrl.toString());
                    } catch (error) {
                        window.location.reload();
                    }
                });
            });
        }

        return {
            closeMenus: closeMenus,
            headerHomeLink: headerHomeLink,
            menuWraps: menuWraps,
            languageButtons: languageButtons
        };
    };

    window.renderSharedHeader = function (rootId, options) {
        var opts = options || {};
        var root = document.getElementById(rootId);
        if (!root) {
            return;
        }

        var homeHref = escapeHtml(opts.homeHref || 'index.html');
        var professionItems = Array.isArray(opts.professionItems) && opts.professionItems.length ? opts.professionItems : [
            { labelKey: 'header.profession.actor', label: 'Di\u1ec5n Vi\u00ean', href: 'actor/' },
            { labelKey: 'header.profession.artist', label: 'H\u1ecda S\u0129' },
            { labelKey: 'header.profession.photographer', label: 'Nhi\u1ebfp \u1ea2nh', href: 'photographer/' }
        ];
        var toolItems = Array.isArray(opts.toolItems) && opts.toolItems.length ? opts.toolItems : [
            { labelKey: 'header.tool.photoshop', label: 'Tool Photoshop' },
            { labelKey: 'header.tool.maya', label: 'Tool Maya' },
            { labelKey: 'header.tool.cheatEngine', label: 'Tool Cheat Engine' }
        ];
        var currentLanguage = window.sharedI18n && typeof window.sharedI18n.getLanguage === 'function'
            ? window.sharedI18n.getLanguage()
            : 'vi';

        function renderMenuHtml(items) {
            return items.map(function (item) {
                var label = escapeHtml(translate(item.labelKey, item.label || ''));
                if (item.href) {
                    return '<li><a href="' + escapeHtml(item.href) + '">' + label + '</a></li>';
                }
                return '<li>' + label + '</li>';
            }).join('');
        }

        var professionMenuHtml = renderMenuHtml(professionItems);
        var toolMenuHtml = renderMenuHtml(toolItems);
        var nextLanguage = currentLanguage === 'en' ? 'vi' : 'en';
        var nextLanguageCode = nextLanguage === 'en' ? 'EN' : 'VN';
        var nextLanguageFlagClass = nextLanguage === 'en' ? 'lang-flag--en' : 'lang-flag--vi';
        var languageSwitchHtml = '' +
            '<div class="lang-switch">' +
            '    <button class="lang-btn lang-btn--toggle" type="button" data-lang="' + nextLanguage + '" aria-label="' + escapeHtml(translate('header.languageAria', 'Switch language')) + '">' +
            '        <span class="lang-flag ' + nextLanguageFlagClass + '" aria-hidden="true"></span>' +
            '        <span class="lang-code">' + nextLanguageCode + '</span>' +
            '    </button>' +
            '</div>';

        root.innerHTML = '' +
            '<div class="header-shell">' +
            '    <div class="header content-wrap">' +
            '        <div class="header-left">' +
            '            <div class="menu-wrap">' +
            '                <button class="menu-btn" type="button">' + escapeHtml(translate('header.professions', 'Ngh\u1ec1 Nghi\u1ec7p')) + '</button>' +
            '                <ul class="menu-list hidden">' + professionMenuHtml + '</ul>' +
            '            </div>' +
            '        </div>' +
            '        <a class="header-home" id="headerHomeLink" href="' + homeHref + '" aria-label="' + escapeHtml(translate('header.homeAria', 'Quay v\u1ec1 trang ch\u1ee7')) + '">' +
            '            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3 3 10.5V21h6v-6h6v6h6V10.5L12 3Z"/></svg>' +
            '        </a>' +
            '        <div class="header-right">' +
            '            <div class="menu-wrap">' +
            '                <button class="menu-btn" type="button">' + escapeHtml(translate('header.tools', 'C\u00f4ng C\u1ee5')) + '</button>' +
            '                <ul class="menu-list hidden">' + toolMenuHtml + '</ul>' +
            '            </div>' +
            languageSwitchHtml +
            '        </div>' +
            '    </div>' +
            '</div>';
    };
})();
