'use strict';

var cheatTableFileList = document.getElementById('cheatTableFileList');
var cheatTableSearch = document.getElementById('cheatTableSearch');
var cheatTableFileCount = document.getElementById('cheatTableFileCount');
var cheatTableSteamArtworkMap = window.cheatTableArtworkManifest || {};

if (typeof initSharedPage === 'function') {
    initSharedPage({
        header: {
            rootId: 'sharedHeaderRoot',
            options: {
                homeHref: '../index.html',
                assetBase: '../',
                professionBaseHref: '../jobs/'
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

function getCheatTableDisplayName(fileName) {
    return String(fileName || '').replace(/\.[^.]+$/, '');
}

function getCheatTableExtension(fileName) {
    var match = String(fileName || '').match(/(\.[^.]+)$/);
    return match ? match[1].toUpperCase() : '';
}

function getCheatTableArtwork(fileName) {
    if (!fileName || !Object.prototype.hasOwnProperty.call(cheatTableSteamArtworkMap, fileName)) {
        return null;
    }

    return cheatTableSteamArtworkMap[fileName];
}

function getCheatTableGroupKey(fileName) {
    var displayName = getCheatTableDisplayName(fileName).trim();
    var firstCharacter = displayName.charAt(0).toUpperCase();

    if (/^[A-Z]$/.test(firstCharacter)) {
        return firstCharacter;
    }

    return '#';
}

function updateCheatTableCount(count) {
    if (!cheatTableFileCount) {
        return;
    }

    var labelTemplate = window.sharedI18n && typeof window.sharedI18n.t === 'function'
        ? window.sharedI18n.t('cheatEnginePlugin.count', '{{count}} file')
        : '{{count}} file';

    cheatTableFileCount.textContent = String(labelTemplate).replace('{{count}}', String(count));
}

function getRawCheatTableList() {
    if (Array.isArray(window.cheatTableFiles)) {
        return window.cheatTableFiles;
    }
    if (Array.isArray(window.cheatTableManifest)) {
        return window.cheatTableManifest;
    }
    return [];
}

function filterCheatTableFiles(query) {
    var rawList = getRawCheatTableList();
    var normalizedQuery = String(query || '').trim().toLowerCase();
    if (!normalizedQuery) {
        return rawList.slice();
    }

    return rawList.filter(function (fileName) {
        var baseName = getCheatTableDisplayName(fileName).toLowerCase();
        var rawName = String(fileName || '').toLowerCase();
        var artwork = getCheatTableArtwork(fileName);
        var steamTitle = artwork && artwork.title ? artwork.title.toLowerCase() : '';
        return baseName.indexOf(normalizedQuery) !== -1
            || rawName.indexOf(normalizedQuery) !== -1
            || steamTitle.indexOf(normalizedQuery) !== -1;
    });
}

function renderCheatTableList(files) {
    if (!cheatTableFileList) {
        return;
    }

    cheatTableFileList.innerHTML = '';

    if (!files.length) {
        var emptyMessage = document.createElement('div');
        emptyMessage.className = 'tools-file-empty surface-card';
        emptyMessage.textContent = window.sharedI18n && typeof window.sharedI18n.t === 'function'
            ? window.sharedI18n.t('cheatEnginePlugin.empty', 'Không tìm thấy file phù hợp.')
            : 'Không tìm thấy file phù hợp.';
        cheatTableFileList.appendChild(emptyMessage);
        return;
    }

    var groupedFiles = files.reduce(function (accumulator, fileName) {
        var key = getCheatTableGroupKey(fileName);
        if (!accumulator[key]) {
            accumulator[key] = [];
        }
        accumulator[key].push(fileName);
        return accumulator;
    }, {});

    var sortedGroupKeys = Object.keys(groupedFiles).sort(function (firstKey, secondKey) {
        if (firstKey === '#') return 1;
        if (secondKey === '#') return -1;
        return firstKey.localeCompare(secondKey);
    });

    sortedGroupKeys.forEach(function (groupKey) {
        var groupSection = document.createElement('section');
        var groupTitle = document.createElement('h4');
        var groupGrid = document.createElement('div');

        groupSection.className = 'tools-file-group surface-card';
        groupTitle.className = 'tools-file-group-title';
        groupTitle.textContent = groupKey;
        groupGrid.className = 'tools-file-grid';

        groupedFiles[groupKey].forEach(function (fileName) {
            var fileLink = document.createElement('a');
            var fileUrl = 'Plugins/My%20Cheat%20Tables/' + encodeURIComponent(fileName);
            var fileArtwork = getCheatTableArtwork(fileName);
            var fileLinkHead = document.createElement('div');
            var fileNameLabel = document.createElement('span');
            var fileExtensionLabel = document.createElement('span');
            fileLink.className = 'tools-file-link';
            fileLink.href = fileUrl;
            fileLink.download = fileName;
            fileLinkHead.className = 'tools-file-link-head';
            fileNameLabel.className = 'tools-file-link-name';
            fileNameLabel.textContent = fileArtwork && fileArtwork.title
                ? fileArtwork.title
                : getCheatTableDisplayName(fileName);
            fileExtensionLabel.className = 'tools-file-link-ext';
            fileExtensionLabel.textContent = getCheatTableExtension(fileName);
            fileLinkHead.appendChild(fileNameLabel);
            fileLinkHead.appendChild(fileExtensionLabel);
            fileLink.appendChild(fileLinkHead);

            if (fileArtwork && fileArtwork.imageSrc) {
                var fileMedia = document.createElement('div');
                var fileImage = document.createElement('img');

                fileMedia.className = 'tools-file-link-media';
                fileImage.className = 'tools-file-link-image';
                fileImage.src = fileArtwork.imageSrc;
                fileImage.alt = fileNameLabel.textContent;
                fileImage.loading = 'lazy';
                fileImage.referrerPolicy = 'no-referrer';
                fileMedia.appendChild(fileImage);
                fileLink.appendChild(fileMedia);
            }

            groupGrid.appendChild(fileLink);
        });

        groupSection.appendChild(groupTitle);
        groupSection.appendChild(groupGrid);
        cheatTableFileList.appendChild(groupSection);
    });

    updateCheatTableCount(files.length);
}

function renderCheatTableFiles() {
    var query = cheatTableSearch ? cheatTableSearch.value : '';
    var files = filterCheatTableFiles(query);
    renderCheatTableList(files);
}

if (cheatTableSearch) {
    cheatTableSearch.addEventListener('input', renderCheatTableFiles);
}

if (window.sharedI18n && typeof window.sharedI18n.onChange === 'function') {
    window.sharedI18n.onChange(function () {
        renderCheatTableFiles();
    });
}

renderCheatTableFiles();
