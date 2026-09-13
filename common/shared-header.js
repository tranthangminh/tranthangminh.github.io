(function () {
    'use strict';

    var escapeHtml = window.sharedUtils.escapeHtml;
    var STORAGE_THEME_KEY = 'theme';

    function getPreferredTheme() {
        var savedTheme = null;
        try {
            savedTheme = localStorage.getItem(STORAGE_THEME_KEY);
        } catch (error) {}

        if (savedTheme === 'light' || savedTheme === 'dark') {
            return savedTheme;
        }

        if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
            return 'dark';
        }

        return 'light';
    }

    function getThemeIconMaskHtml(theme, assetBase) {
        var base = typeof assetBase === 'string' ? assetBase : '';
        var svgFileName = theme === 'dark' ? 'light-mode.svg' : 'dark-mode.svg';
        var maskUrl = escapeHtml(base + 'svg/' + svgFileName);
        return '<span class="theme-icon icon-mask" style="mask-image: url(\'' + maskUrl + '\'); -webkit-mask-image: url(\'' + maskUrl + '\');"></span>';
    }

    function updateThemeToggleUI(theme) {
        var themeToggleBtn = document.getElementById('themeToggleBtn');
        if (!themeToggleBtn) return;
        var isDark = theme === 'dark';
        var titleText = isDark
            ? translate('header.themeToLight', 'Chuyển sang giao diện Sáng')
            : translate('header.themeToDark', 'Chuyển sang giao diện Tối');

        themeToggleBtn.setAttribute('title', titleText);
        themeToggleBtn.setAttribute('aria-label', titleText);
        themeToggleBtn.innerHTML = getThemeIconMaskHtml(theme);
    }

    function applyTheme(theme) {
        var validTheme = theme === 'dark' ? 'dark' : 'light';
        document.documentElement.setAttribute('data-theme', validTheme);
        try {
            localStorage.setItem(STORAGE_THEME_KEY, validTheme);
        } catch (error) {}
        updateThemeToggleUI(validTheme);
        return validTheme;
    }

    // Initialize theme immediately on script load
    applyTheme(getPreferredTheme());

    window.sharedTheme = {
        get: function () {
            return document.documentElement.getAttribute('data-theme') || getPreferredTheme();
        },
        set: function (theme) {
            return applyTheme(theme);
        },
        toggle: function () {
            var current = this.get();
            var next = current === 'dark' ? 'light' : 'dark';
            return applyTheme(next);
        }
    };

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
        var themeToggleBtn = document.getElementById('themeToggleBtn');

        function closeMenus() {
            menuWraps.forEach(function (menuWrap) {
                var menuList = menuWrap.querySelector('.menu-list');
                if (menuList) {
                    menuList.classList.remove('is-open');
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

                if (menuButton.tagName.toLowerCase() === 'button') {
                    menuButton.addEventListener('click', function (event) {
                        event.stopPropagation();
                        var isOpen = menuList.classList.contains('is-open');
                        closeMenus();
                        menuList.classList.toggle('is-open', !isOpen);
                    });
                }
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

        if (themeToggleBtn) {
            updateThemeToggleUI(window.sharedTheme.get());
            themeToggleBtn.addEventListener('click', function () {
                closeMenus();
                if (window.sharedTheme && typeof window.sharedTheme.toggle === 'function') {
                    window.sharedTheme.toggle();
                }
            });
        }

        return {
            closeMenus: closeMenus,
            headerHomeLink: headerHomeLink,
            menuWraps: menuWraps,
            languageButtons: languageButtons,
            themeToggleBtn: themeToggleBtn
        };
    };

    window.renderSharedHeader = function (rootId, options) {
        var opts = options || {};
        var root = document.getElementById(rootId);
        if (!root) {
            return;
        }

        var assetBase = typeof opts.assetBase === 'string' ? opts.assetBase : '';
        var homeHref = escapeHtml(opts.homeHref || (assetBase ? assetBase + 'index.html' : 'index.html'));
        var profBase = typeof opts.professionBaseHref === 'string' ? opts.professionBaseHref : (assetBase ? assetBase + 'jobs/' : 'jobs/');
        var prodBase = typeof opts.productBaseHref === 'string' ? opts.productBaseHref : (assetBase ? assetBase + 'products.html' : 'products.html');
        var productsHref = escapeHtml(opts.productsHref || prodBase);
        var professionItems = Array.isArray(opts.professionItems) && opts.professionItems.length ? opts.professionItems : [
            { labelKey: 'header.profession.actor', label: 'Di\u1ec5n Vi\u00ean', href: profBase + 'actor.html' },
            { labelKey: 'header.profession.artist', label: 'H\u1ecda S\u0129', href: profBase + 'artist.html' },
            { labelKey: 'header.profession.photographer', label: 'Nhi\u1ebfp \u1ea2nh', href: profBase + 'photographer.html' },
            { labelKey: 'header.profession.bunGioHeo', label: 'B\u00fan Gi\u00f2 Heo Minh Nh\u1eadt', href: profBase + 'bun-gio-heo-minh-nhat.html' },
            { labelKey: 'header.profession.harryPerfume', label: 'Harry Perfume', href: 'https://harryperfume.vn/gioi-thieu', target: '_blank' }
        ];
        var toolItems = Array.isArray(opts.toolItems) && opts.toolItems.length ? opts.toolItems : [
            { labelKey: 'header.tool.windowsApps', label: 'Windows Apps', href: prodBase + '?tab=windows-apps' },
            { labelKey: 'header.tool.chromeExtension', label: 'Chrome Extensions', href: prodBase + '?tab=chrome-extension' },
            { labelKey: 'header.tool.books', label: 'Books', href: prodBase + '?tab=books' },
            { labelKey: 'header.tool.plugins', label: 'Plugins', href: prodBase + '?tab=plugins' }
        ];
        var currentLanguage = window.sharedI18n && typeof window.sharedI18n.getLanguage === 'function'
            ? window.sharedI18n.getLanguage()
            : 'vi';

        function renderMenuHtml(items) {
            return items.map(function (item) {
                var label = escapeHtml(translate(item.labelKey, item.label || ''));
                if (item.href) {
                    var targetAttr = item.target ? ' target="' + escapeHtml(item.target) + '"' : '';
                    var relAttr = item.target === '_blank' ? ' rel="noopener noreferrer"' : '';
                    return '<li><a href="' + escapeHtml(item.href) + '"' + targetAttr + relAttr + '>' + label + '</a></li>';
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
        var initialTheme = window.sharedTheme ? window.sharedTheme.get() : getPreferredTheme();
        var initialThemeIconHtml = getThemeIconMaskHtml(initialTheme, opts.assetBase);
        var initialTitle = initialTheme === 'dark'
            ? translate('header.themeToLight', 'Chuyển sang giao diện Sáng')
            : translate('header.themeToDark', 'Chuyển sang giao diện Tối');

        var themeSwitchHtml = '' +
            '<div class="theme-switch">' +
            '    <button class="theme-btn theme-btn--toggle" id="themeToggleBtn" type="button" aria-label="' + escapeHtml(initialTitle) + '" title="' + escapeHtml(initialTitle) + '">' +
            initialThemeIconHtml +
            '    </button>' +
            '</div>';

        var assetBase = typeof opts.assetBase === 'string' ? opts.assetBase : '';
        var logoSvgUrl = escapeHtml(assetBase + 'svg/logo-MAX.svg');

        root.innerHTML = '' +
            '<div class="header-shell">' +
            '    <div class="header content-wrap">' +
            '        <div class="header-left">' +
            themeSwitchHtml +
            '            <div class="menu-wrap">' +
            '                <button class="menu-btn" type="button">' + escapeHtml(translate('header.professions', 'C\u00f4ng Vi\u1ec7c')) + '</button>' +
            '                <ul class="menu-list">' + professionMenuHtml + '</ul>' +
            '            </div>' +
            '        </div>' +
            '        <a class="header-home" id="headerHomeLink" href="' + homeHref + '" aria-label="' + escapeHtml(translate('header.homeAria', 'Quay v\u1ec1 trang ch\u1ee7')) + '">' +
            '            <span class="header-logo icon-mask" style="mask-image: url(\'' + logoSvgUrl + '\'); -webkit-mask-image: url(\'' + logoSvgUrl + '\');"></span>' +
            '        </a>' +
            '        <div class="header-right">' +
            '            <div class="menu-wrap">' +
            '                <a class="menu-btn" href="' + productsHref + '">' + escapeHtml(translate('header.tools', 'S\u1ea3n Ph\u1ea9m')) + '</a>' +
            '                <ul class="menu-list">' + toolMenuHtml + '</ul>' +
            '            </div>' +
            languageSwitchHtml +
            '        </div>' +
            '    </div>' +
            '</div>';
    };
})();
