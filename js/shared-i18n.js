(function () {
    'use strict';

    var storageKey = 'portfolio-lang';
    var dictionaries = {};
    var listeners = [];
    var supportedLanguages = ['vi', 'en'];
    var defaultLanguage = 'vi';
    var currentLanguage = 'vi';
    var isInitialized = false;

    function getNestedValue(source, key) {
        if (!source || !key) {
            return null;
        }

        return String(key).split('.').reduce(function (accumulator, part) {
            if (accumulator && Object.prototype.hasOwnProperty.call(accumulator, part)) {
                return accumulator[part];
            }
            return null;
        }, source);
    }

    function normalizeLanguage(language) {
        if (!language) {
            return defaultLanguage;
        }

        var normalized = String(language).trim().toLowerCase();
        if (supportedLanguages.indexOf(normalized) === -1) {
            return defaultLanguage;
        }

        return normalized;
    }

    function getQueryLanguage() {
        try {
            var params = new URLSearchParams(window.location.search);
            return params.get('lang');
        } catch (error) {
            return null;
        }
    }

    function getStoredLanguage() {
        try {
            return window.localStorage.getItem(storageKey);
        } catch (error) {
            return null;
        }
    }

    function setStoredLanguage(language) {
        try {
            window.localStorage.setItem(storageKey, language);
        } catch (error) {
            /* Ignore storage failures */
        }
    }

    function updateRootLanguage(language) {
        document.documentElement.lang = language;
        document.documentElement.dataset.lang = language;
    }

    function translateText(key, fallback) {
        var language = currentLanguage;
        var value = getNestedValue(dictionaries[language], key);

        if (value == null && language !== defaultLanguage) {
            value = getNestedValue(dictionaries[defaultLanguage], key);
        }

        if (value == null) {
            return fallback != null ? fallback : key;
        }

        return value;
    }

    function applyTextTranslations(root) {
        var scope = root || document;

        Array.prototype.slice.call(scope.querySelectorAll('[data-i18n]')).forEach(function (node) {
            var key = node.getAttribute('data-i18n');
            var fallback = node.getAttribute('data-i18n-fallback');
            node.textContent = translateText(key, fallback != null ? fallback : node.textContent);
        });

        Array.prototype.slice.call(scope.querySelectorAll('[data-i18n-html]')).forEach(function (node) {
            var htmlKey = node.getAttribute('data-i18n-html');
            var htmlFallback = node.getAttribute('data-i18n-html-fallback');
            node.innerHTML = translateText(htmlKey, htmlFallback != null ? htmlFallback : node.innerHTML);
        });

        Array.prototype.slice.call(scope.querySelectorAll('[data-i18n-attr]')).forEach(function (node) {
            var attrConfig = node.getAttribute('data-i18n-attr');
            if (!attrConfig) {
                return;
            }

            attrConfig.split(';').forEach(function (entry) {
                var parts = entry.split(':');
                if (parts.length < 2) {
                    return;
                }

                var attributeName = parts[0].trim();
                var translationKey = parts.slice(1).join(':').trim();

                if (!attributeName || !translationKey) {
                    return;
                }

                var currentValue = node.getAttribute(attributeName) || '';
                node.setAttribute(attributeName, translateText(translationKey, currentValue));
            });
        });
    }

    function notifyLanguageChange() {
        listeners.forEach(function (listener) {
            listener(currentLanguage);
        });
    }

    function initLanguage(options) {
        if (isInitialized) {
            return currentLanguage;
        }

        var opts = options || {};

        if (Array.isArray(opts.supportedLanguages) && opts.supportedLanguages.length) {
            supportedLanguages = opts.supportedLanguages.slice();
        }

        if (opts.defaultLanguage) {
            defaultLanguage = normalizeLanguage(opts.defaultLanguage);
        }

        currentLanguage = normalizeLanguage(getQueryLanguage() || getStoredLanguage() || defaultLanguage);
        updateRootLanguage(currentLanguage);
        setStoredLanguage(currentLanguage);
        isInitialized = true;
        return currentLanguage;
    }

    function setLanguage(language, options) {
        var opts = options || {};
        currentLanguage = normalizeLanguage(language);
        updateRootLanguage(currentLanguage);

        if (opts.persist !== false) {
            setStoredLanguage(currentLanguage);
        }

        if (opts.apply !== false) {
            applyTextTranslations(opts.root || document);
        }

        notifyLanguageChange();
        return currentLanguage;
    }

    function registerTranslations(language, dictionary) {
        var normalizedLanguage = normalizeLanguage(language);
        dictionaries[normalizedLanguage] = Object.assign({}, dictionaries[normalizedLanguage] || {}, dictionary || {});
    }

    function onLanguageChange(listener) {
        if (typeof listener !== 'function') {
            return function () {
                return null;
            };
        }

        listeners.push(listener);

        return function () {
            listeners = listeners.filter(function (item) {
                return item !== listener;
            });
        };
    }

    window.sharedI18n = window.sharedI18n || {};
    window.sharedI18n.initLanguage = initLanguage;
    window.sharedI18n.registerTranslations = registerTranslations;
    window.sharedI18n.setLanguage = setLanguage;
    window.sharedI18n.getLanguage = function () {
        return currentLanguage;
    };
    window.sharedI18n.t = translateText;
    window.sharedI18n.apply = applyTextTranslations;
    window.sharedI18n.onChange = onLanguageChange;
})();
