(function () {
    'use strict';

    /**
     * Shared Segmented Tabs Component (shared-tabs.js)
     * Module quản lý trượt indicator, responsive 2 hàng trên mobile,
     * tự động căn chỉnh khi resize và hook vào shared-i18n.
     */

    /**
     * Khởi tạo một cụm Segmented Tabs
     * @param {Object} options
     * @param {string|HTMLElement} options.container - Container của tabs (vd: '.products-switch' hoặc '.segmented-tabs')
     * @param {string} [options.btnSelector] - Selector của các nút tab
     * @param {string} [options.indicatorSelector] - Selector của indicator
     * @param {string} [options.activeLabelSelector] - Selector dải text hàng 2 mobile
     * @param {string} [options.activeTextSelector] - Selector thẻ span text bên trong label
     * @param {string} [options.textSelector] - Selector thẻ text bên trong button
     * @param {string} [options.targetSections] - Selector các section nội dung cần ẩn/hiện
     * @param {string} [options.tabDataAttr] - Thuộc tính lấy tab id từ button
     * @param {string} [options.sectionDataAttr] - Thuộc tính lấy category id từ section
     * @param {string} [options.urlParam] - Tên tham số URL để đồng bộ tab (mặc định: 'tab')
     * @param {string} [options.defaultTab] - Tab mặc định (mặc định: 'all')
     * @param {Function} [options.onTabChange] - Callback khi đổi tab: onTabChange(tabId, activeBtn)
     */
    function init(options) {
        var opts = options || {};
        var switchContainer = typeof opts.container === 'string'
            ? document.querySelector(opts.container)
            : (opts.container || document.querySelector('.segmented-tabs, .products-switch'));

        if (!switchContainer) {
            return null;
        }

        var btnSelector = opts.btnSelector || '.segmented-tabs-btn, .products-switch-btn';
        var indicatorSelector = opts.indicatorSelector || '.segmented-tabs-indicator, .products-switch-indicator';
        var activeLabelSelector = opts.activeLabelSelector || '.segmented-tabs-active-label, .products-switch-active-label';
        var activeTextSelector = opts.activeTextSelector || '.segmented-tabs-active-text, .products-switch-active-text';
        var textSelector = opts.textSelector || '.segmented-tabs-text, .products-switch-text';

        var switchButtons = Array.prototype.slice.call(switchContainer.querySelectorAll(btnSelector));
        if (!switchButtons.length) {
            return null;
        }

        var indicator = switchContainer.querySelector(indicatorSelector);
        var activeLabel = opts.activeLabel
            ? (typeof opts.activeLabel === 'string' ? document.querySelector(opts.activeLabel) : opts.activeLabel)
            : (switchContainer.querySelector(activeLabelSelector) || document.querySelector(activeLabelSelector));

        var targetSections = opts.targetSections
            ? Array.prototype.slice.call(document.querySelectorAll(opts.targetSections))
            : [];

        var tabDataAttr = opts.tabDataAttr || null;
        var sectionDataAttr = opts.sectionDataAttr || null;
        var urlParam = opts.urlParam !== undefined ? opts.urlParam : 'tab';
        var defaultTab = opts.defaultTab || 'all';
        var onTabChange = typeof opts.onTabChange === 'function' ? opts.onTabChange : null;

        var currentActiveIndex = 0;

        function getTabId(btn) {
            if (tabDataAttr && btn.hasAttribute(tabDataAttr)) {
                return btn.getAttribute(tabDataAttr);
            }
            return btn.getAttribute('data-tab') || btn.getAttribute('data-product-tab') || '';
        }

        function getSectionId(section) {
            if (sectionDataAttr && section.hasAttribute(sectionDataAttr)) {
                return section.getAttribute(sectionDataAttr);
            }
            return section.getAttribute('data-section') || section.getAttribute('data-product-section') || '';
        }

        function updateIndicator(btn, animate) {
            if (!indicator || !btn) {
                return;
            }
            if (animate === false) {
                indicator.style.transition = 'none';
            } else {
                indicator.style.transition = '';
            }
            var left = btn.offsetLeft;
            var width = btn.offsetWidth;
            indicator.style.transform = 'translate3d(' + left + 'px, 0, 0)';
            indicator.style.width = width + 'px';
            if (animate === false) {
                void indicator.offsetWidth;
                indicator.style.transition = '';
            }
        }

        function setActiveTab(targetTab, updateUrl, animateIndicator) {
            var validTab = targetTab || defaultTab;
            var activeIndex = 0;

            switchButtons.forEach(function (btn, index) {
                var btnTab = getTabId(btn);
                var isActive = btnTab === validTab;
                btn.classList.toggle('is-active', isActive);
                btn.setAttribute('aria-pressed', isActive ? 'true' : 'false');
                if (isActive) {
                    activeIndex = index;
                }
            });

            currentActiveIndex = activeIndex;

            var pos = 'middle';
            if (activeIndex === 0) {
                pos = 'first';
            } else if (activeIndex === switchButtons.length - 1) {
                pos = 'last';
            }
            switchContainer.setAttribute('data-active-pos', pos);
            switchContainer.setAttribute('data-active-tab', validTab);

            if (targetSections.length) {
                targetSections.forEach(function (section) {
                    var secId = getSectionId(section);
                    var shouldShow = validTab === defaultTab || secId === validTab;
                    var wasHidden = section.classList.contains('is-hidden');
                    section.classList.toggle('is-hidden', !shouldShow);
                    if (shouldShow && (wasHidden || animateIndicator !== false)) {
                        section.classList.remove('segmented-tab-pane-entering');
                        void section.offsetWidth;
                        section.classList.add('segmented-tab-pane-entering');
                    }
                });
            }

            var activeBtn = switchButtons[activeIndex];
            if (activeBtn) {
                updateIndicator(activeBtn, animateIndicator !== false);

                if (activeLabel) {
                    var textEl = activeBtn.querySelector(textSelector);
                    if (textEl) {
                        var i18nKey = textEl.getAttribute('data-i18n');
                        var activeText = activeLabel.querySelector(activeTextSelector);
                        if (activeText) {
                            if (i18nKey) {
                                activeText.setAttribute('data-i18n', i18nKey);
                            }
                            activeText.textContent = textEl.textContent;
                            if (animateIndicator !== false) {
                                activeText.classList.remove('is-animating');
                                void activeText.offsetWidth;
                                activeText.classList.add('is-animating');
                            }
                        } else {
                            if (i18nKey) {
                                activeLabel.setAttribute('data-i18n', i18nKey);
                            }
                            activeLabel.textContent = textEl.textContent;
                        }
                    }
                }
            }

            if (updateUrl && urlParam) {
                try {
                    var url = new URL(window.location.href);
                    if (validTab === defaultTab) {
                        url.searchParams.delete(urlParam);
                    } else {
                        url.searchParams.set(urlParam, validTab);
                    }
                    window.history.replaceState({}, '', url.toString());
                } catch (error) {}
            }

            if (onTabChange) {
                onTabChange(validTab, activeBtn);
            }
        }

        switchButtons.forEach(function (btn) {
            btn.addEventListener('click', function () {
                var tab = getTabId(btn);
                setActiveTab(tab, true, true);
            });
        });

        // Khởi tạo tab từ URL query param hoặc hash
        var initialTab = defaultTab;
        if (urlParam) {
            try {
                var urlParams = new URLSearchParams(window.location.search);
                var tabParam = urlParams.get(urlParam);
                if (tabParam) {
                    initialTab = tabParam.toLowerCase();
                } else if (window.location.hash) {
                    initialTab = window.location.hash.replace('#', '').toLowerCase();
                }
            } catch (error) {}
        }

        var hasMatchingTab = switchButtons.some(function (btn) {
            return getTabId(btn) === initialTab;
        });

        setActiveTab(hasMatchingTab ? initialTab : defaultTab, false, false);

        requestAnimationFrame(function () {
            switchContainer.classList.add('is-ready');
            var activeBtn = switchButtons[currentActiveIndex];
            if (activeBtn) {
                updateIndicator(activeBtn, false);
            }
        });

        var resizeTimer = null;
        window.addEventListener('resize', function () {
            if (resizeTimer) {
                cancelAnimationFrame(resizeTimer);
            }
            resizeTimer = requestAnimationFrame(function () {
                var activeBtn = switchButtons[currentActiveIndex];
                if (activeBtn) {
                    updateIndicator(activeBtn, false);
                }
            });
        });

        if (window.sharedI18n && typeof window.sharedI18n.onChange === 'function') {
            window.sharedI18n.onChange(function () {
                setTimeout(function () {
                    var activeBtn = switchButtons[currentActiveIndex];
                    if (activeBtn) {
                        updateIndicator(activeBtn, false);
                    }
                }, 60);
            });
        }

        return {
            setActiveTab: setActiveTab,
            getTabId: function () {
                var activeBtn = switchButtons[currentActiveIndex];
                return activeBtn ? getTabId(activeBtn) : defaultTab;
            },
            updateIndicator: function (animate) {
                var activeBtn = switchButtons[currentActiveIndex];
                if (activeBtn) {
                    updateIndicator(activeBtn, animate !== false);
                }
            }
        };
    }

    // Tự động khởi tạo các phần tử có thuộc tính [data-segmented-tabs]
    function autoInit() {
        var autoContainers = Array.prototype.slice.call(document.querySelectorAll('[data-segmented-tabs]'));
        autoContainers.forEach(function (el) {
            if (el._segmentedTabsInstance) {
                return;
            }
            var target = el.getAttribute('data-tabs-target');
            el._segmentedTabsInstance = init({
                container: el,
                targetSections: target || null
            });
        });
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', autoInit);
    } else {
        autoInit();
    }

    window.sharedTabs = {
        init: init
    };
})();
