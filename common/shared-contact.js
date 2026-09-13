(function () {
    'use strict';

    var escapeHtml = (window.sharedUtils && window.sharedUtils.escapeHtml) || function (str) {
        return String(str || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
    };

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
        var sectionId = opts.id ? ' id="' + escapeHtml(opts.id) + '"' : ' id="contactSection"';
        var rv = opts.includeReveal === false ? '' : ' reveal-up';
        var assetBase = opts.assetBase ? String(opts.assetBase) : '';

        var connectTitle = escapeHtml(translate('contact.connectTitle', 'Liên Hệ'));
        var quoteText = escapeHtml(translate('contact.quote', 'Để lại giá trị cho cuộc sống'));
        var callLabel = escapeHtml(translate('contact.callBtn', 'Gọi'));
        var emailLabel = escapeHtml(translate('contact.emailBtn', 'Email'));
        var copyright = escapeHtml(translate('contact.copyright', '© 2026 Trần Thắng Minh. All rights reserved.'));
        var visitsPrefix = escapeHtml(translate('contact.visitsPrefix', 'Số lượt truy cập:'));

        var v = '?v=20260905-1';
        var facebookSvg = assetBase + 'svg/facebook.svg' + v;
        var instagramSvg = assetBase + 'svg/instagram.svg' + v;
        var tiktokSvg = assetBase + 'svg/tiktok.svg' + v;
        var youtubeSvg = assetBase + 'svg/youtube.svg' + v;
        var redditSvg = assetBase + 'svg/reddit.svg' + v;
        var discordSvg = assetBase + 'svg/discord.svg' + v;
        var githubSvg = assetBase + 'svg/github.svg' + v;
        var phoneSvg = assetBase + 'svg/phone.svg' + v;
        var emailSvg = assetBase + 'svg/email.svg' + v;

        var moreSocialLabel = escapeHtml(translate('contact.moreSocial', 'Xem thêm mạng xã hội'));

        var mainSocials = [
            { name: 'Facebook', url: 'https://www.facebook.com/maxiechen/', svg: facebookSvg },
            { name: 'Instagram', url: 'https://www.instagram.com/maxiechen/', svg: instagramSvg },
            { name: 'TikTok', url: 'https://www.tiktok.com/@max9.tran', svg: tiktokSvg },
            { name: 'YouTube', url: 'https://www.youtube.com/@MaxTran96', svg: youtubeSvg }
        ];

        var moreSocials = [
            { name: 'Reddit', url: 'https://www.reddit.com/user/maxiechen96/', svg: redditSvg },
            { name: 'Discord', url: 'https://discord.com/users/@maxiechen', svg: discordSvg },
            { name: 'GitHub', url: 'https://github.com/tranthangminh', svg: githubSvg }
        ];

        var mainSocialsHtml = mainSocials.map(function (s) {
            return '<a class="contact-social-btn" href="' + escapeHtml(s.url) + '" target="_blank" rel="noopener noreferrer" aria-label="' + escapeHtml(s.name) + '">' +
                '<span class="contact-social-icon" style="-webkit-mask-image: url(\'' + s.svg + '\'); mask-image: url(\'' + s.svg + '\');"></span>' +
                '</a>';
        }).join('');

        var moreSocialsHtml = moreSocials.map(function (s) {
            return '<a class="contact-social-btn" href="' + escapeHtml(s.url) + '" target="_blank" rel="noopener noreferrer" aria-label="' + escapeHtml(s.name) + '">' +
                '<span class="contact-social-icon" style="-webkit-mask-image: url(\'' + s.svg + '\'); mask-image: url(\'' + s.svg + '\');"></span>' +
                '</a>';
        }).join('');

        root.innerHTML = '' +
            '<section class="' + sectionClass + '"' + sectionId + '>' +
            '    <div class="content-wrap">' +
            '        <div class="contact-visits-row">' +
            '            <span class="contact-visits-text"><span data-i18n="contact.visitsPrefix">' + visitsPrefix + '</span> <strong class="contact-visits-count">1,000</strong></span>' +
            '        </div>' +
            '        <div class="contact-bar' + rv + '">' +
            '            <!-- Left 30%: Social Media -->' +
            '            <div class="contact-col contact-col-social">' +
            '                <span class="contact-connect-title">' + connectTitle + '</span>' +
            '                <div class="contact-social-row">' +
                                 mainSocialsHtml +
            '                    <details class="social-more">' +
            '                        <summary class="social-more-toggle" aria-label="' + moreSocialLabel + '"></summary>' +
            '                        <div class="social-more-list">' +
                                         moreSocialsHtml +
            '                        </div>' +
            '                    </details>' +
            '                </div>' +
            '            </div>' +
            '            <!-- Center 40%: Quote -->' +
            '            <div class="contact-col contact-col-quote">' +
            '                <div class="contact-quote-wrap">' +
            '                    <span class="contact-quote-mark" aria-hidden="true">&ldquo;</span>' +
            '                    <span class="contact-quote-text">' + quoteText + '</span>' +
            '                    <span class="contact-quote-mark" aria-hidden="true">&rdquo;</span>' +
            '                </div>' +
            '            </div>' +
            '            <!-- Right 30%: Action Buttons (Call & Email) -->' +
            '            <div class="contact-col contact-col-actions">' +
            '                <a class="contact-action-btn contact-btn-call" href="tel:+84363219989" aria-label="Gọi điện thoại">' +
            '                    <span class="contact-btn-icon" style="-webkit-mask-image: url(\'' + phoneSvg + '\'); mask-image: url(\'' + phoneSvg + '\');" aria-hidden="true"></span>' +
            '                    <span>' + callLabel + '</span>' +
            '                </a>' +
            '                <a class="contact-action-btn contact-btn-email" href="mailto:maxiechen96@gmail.com" aria-label="Gửi Email">' +
            '                    <span class="contact-btn-icon" style="-webkit-mask-image: url(\'' + emailSvg + '\'); mask-image: url(\'' + emailSvg + '\');" aria-hidden="true"></span>' +
            '                    <span>' + emailLabel + '</span>' +
            '                </a>' +
            '            </div>' +
            '        </div>' +
            '        <div class="contact-copyright-row">' +
            '            <span>' + copyright + '</span>' +
            '        </div>' +
            '    </div>' +
            '</section>';

        var socialMore = root.querySelector('.social-more');
        if (socialMore) {
            document.addEventListener('click', function (e) {
                if (!socialMore.contains(e.target) && socialMore.hasAttribute('open')) {
                    socialMore.removeAttribute('open');
                }
            });
        }

        initVisitsCounter();
    };

    var VISITS_API_BASE = 'https://countapi.mileshilliard.com/api/v1';
    var VISITS_KEY = 'tranthangminh_site_visits';
    var VISITS_STORAGE_KEY = 'tranthangminh_site_visits_cache';
    var VISITS_LAST_TS_KEY = 'tranthangminh_last_visit_ts';
    var SESSION_TIMEOUT_MS = 15 * 60 * 1000; // 15 phút
    var BASE_VISITS_OFFSET = 999;
    var visitsInitialized = false;

    function formatNumberWithCommas(num) {
        var n = parseInt(num, 10);
        if (isNaN(n) || n < 1000) n = 1000;
        return n.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    }

    function updateVisitsUI(count) {
        var elements = document.querySelectorAll('.contact-visits-count');
        var formatted = formatNumberWithCommas(count);
        for (var i = 0; i < elements.length; i++) {
            elements[i].textContent = formatted;
        }
    }

    function initVisitsCounter() {
        // 1. Read cached visits from localStorage for instantaneous display
        var cached = null;
        try {
            cached = localStorage.getItem(VISITS_STORAGE_KEY);
        } catch (e) {}

        var initialCount = 1000;
        if (cached !== null) {
            var parsed = parseInt(cached, 10);
            if (!isNaN(parsed) && parsed >= 1000) {
                initialCount = parsed;
            }
        }
        updateVisitsUI(initialCount);

        // Prevent duplicate network calls within the same page lifecycle
        if (visitsInitialized) return;
        visitsInitialized = true;

        // 2. Check 15-minute session timeout
        var now = Date.now();
        var lastTs = 0;
        try {
            var storedTs = localStorage.getItem(VISITS_LAST_TS_KEY);
            if (storedTs) lastTs = parseInt(storedTs, 10) || 0;
        } catch (e) {}

        var isExpired = !lastTs || (now - lastTs > SESSION_TIMEOUT_MS);
        var endpoint = isExpired ? '/hit/' : '/get/';

        if (typeof fetch === 'function') {
            fetch(VISITS_API_BASE + endpoint + encodeURIComponent(VISITS_KEY))
                .then(function (res) { return res.ok ? res.json() : null; })
                .then(function (data) {
                    if (data && typeof data.value === 'number') {
                        var total = BASE_VISITS_OFFSET + data.value;
                        updateVisitsUI(total);
                        try {
                            localStorage.setItem(VISITS_STORAGE_KEY, String(total));
                            if (isExpired) {
                                localStorage.setItem(VISITS_LAST_TS_KEY, String(now));
                            }
                        } catch (err) {}
                    }
                })
                .catch(function () {});
        }
    }

    // Cross-tab synchronization via window 'storage' event
    window.addEventListener('storage', function (e) {
        if (!e || !e.key) return;
        if (e.key === VISITS_STORAGE_KEY && e.newValue) {
            updateVisitsUI(e.newValue);
        }
    });
})();
