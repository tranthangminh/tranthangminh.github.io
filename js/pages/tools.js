'use strict';

var toolTabButtons = Array.prototype.slice.call(document.querySelectorAll('.tools-switch-btn'));
var toolPanels = Array.prototype.slice.call(document.querySelectorAll('[data-tool-panel]'));
var validToolTabs = ['photoshop', 'maya', 'cheat-engine'];

if (typeof initSharedPage === 'function') {
    initSharedPage({
        titleKey: 'meta.tools.title',
        header: {
            rootId: 'sharedHeaderRoot',
            options: {
                homeHref: '../index.html',
                toolBaseHref: '../',
                professionItems: [
                    { labelKey: 'header.profession.actor', label: 'Diễn Viên', href: '../actor/' },
                    { labelKey: 'header.profession.artist', label: 'Họa Sĩ', href: '../artist/' },
                    { labelKey: 'header.profession.photographer', label: 'Nhiếp Ảnh', href: '../photographer/' }
                ]
            }
        },
        contact: {
            rootId: 'sharedContactRoot',
            options: {
                pageClass: 'contact-page',
                id: 'contactSection',
                includeReveal: false,
                assetBase: '../'
            }
        },
        bookNow: {
            rootId: 'sharedBookNowRoot',
            options: { id: 'bookNowButton' }
        },
        headerMenus: {},
        bookNowBehavior: {
            buttonId: 'bookNowButton',
            hideWhenVisible: 'contactSection',
            visibilityThreshold: 0.45
        }
    });
}

function getRequestedToolTab() {
    try {
        var params = new URLSearchParams(window.location.search);
        var requestedTab = (params.get('tab') || '').toLowerCase();
        if (validToolTabs.indexOf(requestedTab) !== -1) {
            return requestedTab;
        }
    } catch (error) {
        return 'photoshop';
    }

    return 'photoshop';
}

function syncToolUrl(tab) {
    try {
        var nextUrl = new URL(window.location.href);
        nextUrl.searchParams.set('tab', tab);
        window.history.replaceState({}, '', nextUrl.toString());
    } catch (error) {
        // Ignore URL sync failures in older environments.
    }
}

function setActiveToolTab(tab) {
    if (validToolTabs.indexOf(tab) === -1) {
        return;
    }

    toolTabButtons.forEach(function (button) {
        var isActive = button.getAttribute('data-tool-tab') === tab;
        button.classList.toggle('is-active', isActive);
        button.setAttribute('aria-pressed', isActive ? 'true' : 'false');
    });

    toolPanels.forEach(function (panel) {
        var isActive = panel.getAttribute('data-tool-panel') === tab;
        panel.classList.toggle('is-active', isActive);
        panel.hidden = !isActive;
    });

    syncToolUrl(tab);
}

toolTabButtons.forEach(function (button) {
    button.addEventListener('click', function () {
        setActiveToolTab(button.getAttribute('data-tool-tab') || 'photoshop');
    });
});

setActiveToolTab(getRequestedToolTab());
