(function () {
    'use strict';

    var escapeHtml = window.sharedUtils.escapeHtml;
    function translate(key, fallback) {
        if (window.sharedI18n && typeof window.sharedI18n.t === 'function') {
            return window.sharedI18n.t(key, fallback);
        }

        return fallback != null ? fallback : key;
    }

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
        var linkBase = opts.linkBase != null ? String(opts.linkBase) : assetBase;
        var showExploreLinks = opts.showExploreLinks !== false;
        var signatureSrc = escapeHtml(assetBase + 'assets/images/Signature.png');
        var title = escapeHtml(translate('contact.title', 'LI\u00caN H\u1ec6'));
        var intro = escapeHtml(translate('contact.intro', 'S\u1eb5n s\u00e0ng h\u1ee3p t\u00e1c cho c\u00e1c d\u1ef1 \u00e1n di\u1ec5n xu\u1ea5t, thi\u1ebft k\u1ebf 2D/3D, nhi\u1ebfp \u1ea3nh v\u00e0 ph\u00e1t tri\u1ec3n c\u00f4ng c\u1ee5 h\u1ed7 tr\u1ee3 quy tr\u00ecnh l\u00e0m vi\u1ec7c.'));
        var directTitle = escapeHtml(translate('contact.directTitle', 'Li\u00ean H\u1ec7 Tr\u1ef1c Ti\u1ebfp'));
        var socialTitle = escapeHtml(translate('contact.socialTitle', 'M\u1ea1ng X\u00e3 H\u1ed9i'));
        var exploreTitle = escapeHtml(translate('contact.exploreTitle', 'L\u0129nh V\u1ef1c Ho\u1ea1t \u0110\u1ed9ng'));
        var callRevealLabel = escapeHtml(translate('contact.callReveal', 'G\u1ecdi ngay'));
        var callLabel = escapeHtml(translate('contact.call', 'G\u1ecdi: 036 321 9989'));
        var emailLabel = escapeHtml(translate('contact.email', 'Email: maxiechen96@gmail.com'));
        var moreSocialLabel = escapeHtml(translate('contact.moreSocial', 'Xem th\u00eam m\u1ea1ng x\u00e3 h\u1ed9i'));
        var signatureAlt = escapeHtml(translate('contact.signatureAlt', 'Ch\u1eef k\u00fd'));
        var copyright = escapeHtml(translate('contact.copyright', 'B\u1ea3n quy\u1ec1n 2026 Tr\u1ea7n Th\u1eafng Minh. B\u1ea3o l\u01b0u m\u1ecdi quy\u1ec1n.'));
        var exploreItems = [
            {
                label: escapeHtml(translate('header.profession.actor', 'Di\u1ec5n Vi\u00ean')),
                href: escapeHtml(linkBase + 'actor/')
            },
            {
                label: escapeHtml(translate('header.profession.photographer', 'Nhi\u1ebfp \u1ea2nh')),
                href: escapeHtml(linkBase + 'photographer/')
            },
            {
                label: escapeHtml(translate('header.profession.artist', 'H\u1ecda S\u0129')),
                href: escapeHtml(linkBase + 'index.html#designPage')
            },
            {
                label: escapeHtml(translate('header.tool.photoshop', 'Tool Photoshop')),
                href: escapeHtml(linkBase + 'index.html#artistPage')
            },
            {
                label: escapeHtml(translate('header.tool.maya', 'Tool Maya')),
                href: escapeHtml(linkBase + 'index.html#artistPage')
            },
            {
                label: escapeHtml(translate('header.tool.cheatEngine', 'Tool Cheat Engine')),
                href: escapeHtml(linkBase + 'index.html#artistPage')
            }
        ];
        var exploreLinksHtml = exploreItems.map(function (item) {
            return '<a class="contact-explore-link" href="' + item.href + '">' + item.label + '</a>';
        }).join('');
        var exploreSectionHtml = showExploreLinks
            ? '' +
                '<div class="contact-explore-shell content-wrap' + rv + '">' +
                '    <div class="contact-explore">' +
                '        <h3 class="contact-explore-title">' + exploreTitle + '</h3>' +
                '        <div class="contact-explore-links">' + exploreLinksHtml + '</div>' +
                '    </div>' +
                '</div>'
            : '';

        root.innerHTML = '' +
            '<section class="' + sectionClass + '"' + sectionId + '>' +
            exploreSectionHtml +
            '    <div class="contact-wrap">' +
            '        <div class="contact-top' + rv + '">' +
            '            <h2 class="contact-title">' + title + '</h2>' +
            '            <p class="contact-intro">' + intro + '</p>' +
            '        </div>' +
            '        <div class="contact-grid">' +
            '            <aside class="contact-side' + rv + '">' +
            '                <div class="contact-card">' +
            '                    <h3 class="contact-card-title">' + directTitle + '</h3>' +
            '                    <div class="contact-actions">' +
            '                        <button class="call-btn call-btn-toggle" id="contactCallToggle" type="button" data-phone="+84363219989" data-phone-display="' + callLabel + '">' + callRevealLabel + '</button>' +
            '                        <a class="mail-btn" href="mailto:maxiechen96@gmail.com">' + emailLabel + '</a>' +
            '                    </div>' +
            '                </div>' +
            '                <div class="contact-card">' +
            '                    <h3 class="contact-card-title">' + socialTitle + '</h3>' +
            '                    <div class="contact-social">' +
            '                        <a class="social-link" href="https://www.instagram.com/maxiechen/" target="_blank" rel="noopener noreferrer" aria-label="Instagram"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7.75 2h8.5A5.75 5.75 0 0 1 22 7.75v8.5A5.75 5.75 0 0 1 16.25 22h-8.5A5.75 5.75 0 0 1 2 16.25v-8.5A5.75 5.75 0 0 1 7.75 2Zm8.5 1.5h-8.5A4.25 4.25 0 0 0 3.5 7.75v8.5A4.25 4.25 0 0 0 7.75 20.5h8.5a4.25 4.25 0 0 0 4.25-4.25v-8.5A4.25 4.25 0 0 0 16.25 3.5ZM12 7a5 5 0 1 1 0 10 5 5 0 0 1 0-10Zm0 1.5a3.5 3.5 0 1 0 0 7 3.5 3.5 0 0 0 0-7Zm5.2-2.65a1.05 1.05 0 1 1 0 2.1 1.05 1.05 0 0 1 0-2.1Z"/></svg></a>' +
            '                        <a class="social-link" href="https://www.facebook.com/maxiechen/" target="_blank" rel="noopener noreferrer" aria-label="Facebook"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M13.5 22v-8h2.7l.4-3h-3.1V9.1c0-.9.3-1.6 1.8-1.6H17V4.8c-.3 0-1.3-.1-2.5-.1-2.5 0-4.2 1.5-4.2 4.2V11H7.5v3h2.8v8h3.2Z"/></svg></a>' +
            '                        <a class="social-link" href="https://www.tiktok.com/@max9.tran" target="_blank" rel="noopener noreferrer" aria-label="TikTok"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M14.6 3h2.6a4.8 4.8 0 0 0 3.6 3.8v2.7a7.5 7.5 0 0 1-3.6-1v6.2a6.3 6.3 0 1 1-6.3-6.3c.4 0 .8 0 1.2.1v2.8a3.5 3.5 0 1 0 2.5 3.4V3Z"/></svg></a>' +
            '                        <a class="social-link" href="https://www.youtube.com/@MaxTran96" target="_blank" rel="noopener noreferrer" aria-label="YouTube"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M22 12c0-2.2-.2-3.8-.6-4.7a2.9 2.9 0 0 0-2-2C18.3 5 12 5 12 5s-6.3 0-7.4.3a2.9 2.9 0 0 0-2 2C2.2 8.2 2 9.8 2 12s.2 3.8.6 4.7a2.9 2.9 0 0 0 2 2c1.1.3 7.4.3 7.4.3s6.3 0 7.4-.3a2.9 2.9 0 0 0 2-2c.4-.9.6-2.5.6-4.7Zm-12.5 3.4V8.6L15.8 12l-6.3 3.4Z"/></svg></a>' +
            '                        <details class="social-more">' +
            '                            <summary class="social-more-toggle" aria-label="' + moreSocialLabel + '"></summary>' +
            '                            <div class="social-more-list">' +
            '                                <a class="social-link" href="https://discord.com/users/@maxiechen" target="_blank" rel="noopener noreferrer" aria-label="Discord"><svg viewBox="0 0 16 16" aria-hidden="true"><path d="M13.545 2.907a13.227 13.227 0 0 0-3.257-.404c-.176.3-.372.708-.508 1.02a12.04 12.04 0 0 0-3.658 0 10.887 10.887 0 0 0-.518-1.02 13.184 13.184 0 0 0-3.257.404C.533 6.033-.32 9.085.099 12.137a13.597 13.597 0 0 0 3.995 2.037c.32-.44.607-.908.85-1.398a8.898 8.898 0 0 1-1.334-.636c.112-.082.221-.167.326-.255 2.57 1.205 5.36 1.205 7.901 0 .105.088.214.173.326.255-.42.25-.867.46-1.334.636.243.49.53.958.85 1.398a13.552 13.552 0 0 0 3.995-2.037c.491-3.526-.838-6.545-3.452-9.23ZM5.546 10.36c-.778 0-1.414-.724-1.414-1.611 0-.888.624-1.611 1.414-1.611.799 0 1.435.723 1.414 1.611 0 .887-.636 1.611-1.414 1.611Zm4.908 0c-.778 0-1.414-.724-1.414-1.611 0-.888.624-1.611 1.414-1.611.799 0 1.435.723 1.414 1.611 0 .887-.626 1.611-1.414 1.611Z"/></svg></a>' +
            '                                <a class="social-link" href="https://www.reddit.com/user/maxiechen96/" target="_blank" rel="noopener noreferrer" aria-label="Reddit"><svg viewBox="0 0 16 16" aria-hidden="true"><path d="M6.167 8a.83.83 0 0 0-.83.83c0 .459.372.84.83.831a.831.831 0 0 0 0-1.661m1.843 3.647c.315 0 1.403-.038 1.976-.611a.23.23 0 0 0 0-.306.213.213 0 0 0-.306 0c-.353.363-1.126.487-1.67.487-.545 0-1.308-.124-1.671-.487a.213.213 0 0 0-.306 0 .213.213 0 0 0 0 .306c.564.563 1.652.61 1.977.61zm.992-2.807c0 .458.373.83.831.83s.83-.381.83-.83a.831.831 0 0 0-1.66 0z"/><path d="M16 8A8 8 0 1 1 0 8a8 8 0 0 1 16 0m-3.828-1.165c-.315 0-.602.124-.812.325-.801-.573-1.9-.945-3.121-.993l.534-2.501 1.738.372a.83.83 0 1 0 .83-.869.83.83 0 0 0-.744.468l-1.938-.41a.2.2 0 0 0-.153.028.2.2 0 0 0-.086.134l-.592 2.788c-1.24.038-2.358.41-3.17.992-.21-.2-.496-.324-.81-.324a1.163 1.163 0 0 0-.478 2.224q-.03.17-.029.353c0 1.795 2.091 3.256 4.669 3.256s4.668-1.451 4.668-3.256c0-.114-.01-.238-.029-.353.401-.181.688-.592.688-1.069 0-.65-.525-1.165-1.165-1.165"/></svg></a>' +
            '                                <a class="social-link" href="https://github.com/tranthangminh" target="_blank" rel="noopener noreferrer" aria-label="GitHub"><svg viewBox="0 0 16 16" aria-hidden="true"><path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.5-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82a7.65 7.65 0 0 1 2-.27c.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0 0 16 8c0-4.42-3.58-8-8-8z"/></svg></a>' +
            '                            </div>' +
            '                        </details>' +
            '                    </div>' +
            '                </div>' +
            '                <div class="contact-signature"><img class="signature-img" src="' + signatureSrc + '" alt="' + signatureAlt + '"></div>' +
            '                <div class="contact-meta">' +
            '                    <div>' + copyright + '</div>' +
            '                </div>' +
            '            </aside>' +
            '        </div>' +
            '    </div>' +
            '</section>';

        var callToggle = root.querySelector('#contactCallToggle');
        if (callToggle) {
            callToggle.addEventListener('click', function () {
                var phone = callToggle.getAttribute('data-phone') || '';
                var phoneDisplay = callToggle.getAttribute('data-phone-display') || '';

                if (!phone) {
                    return;
                }

                callToggle.classList.add('is-revealed');
                callToggle.textContent = phoneDisplay;
                window.setTimeout(function () {
                    window.location.href = 'tel:' + phone;
                }, 0);
            });
        }
    };
})();
