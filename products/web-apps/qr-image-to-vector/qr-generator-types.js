/**
 * qr-generator-types.js - QR Generator Data Types & Payload Serialization
 * Formats data according to international QR standards (tec-it compatibility)
 * Complies with _RULE-web-apps.md (< 500 lines)
 * 100% Vanilla JS, Zero External Dependencies
 */

(function () {
    'use strict';

    const TYPES = [
        { id: 'url', icon: '🌐', labelKey: 'generator.types.url' },
        { id: 'raw', icon: '📝', labelKey: 'generator.types.raw' },
        { id: 'phone', icon: '📞', labelKey: 'generator.types.phone' },
        { id: 'sms', icon: '💬', labelKey: 'generator.types.sms' },
        { id: 'wifi', icon: '📶', labelKey: 'generator.types.wifi' },
        { id: 'email', icon: '✉️', labelKey: 'generator.types.email' },
        { id: 'event', icon: '📅', labelKey: 'generator.types.event' },
        { id: 'vcard', icon: '📇', labelKey: 'generator.types.vcard' },
        { id: 'mecard', icon: '🏷️', labelKey: 'generator.types.mecard' }
    ];

    function escapeVCard(str) {
        if (!str) return '';
        return str.replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\n/g, '\\n');
    }

    function escapeMeCard(str) {
        if (!str) return '';
        return str.replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/:/g, '\\:').replace(/,/g, '\\,');
    }

    function formatDateToIcs(dateStr, timeStr) {
        if (!dateStr) return '';
        const d = dateStr.replace(/-/g, '');
        const t = (timeStr || '09:00').replace(/:/g, '') + '00';
        return `${d}T${t}Z`;
    }

    const QrGeneratorTypes = {
        getTypes() {
            return TYPES;
        },

        renderForm(typeId, values = {}, i18n) {
            const t = (key) => (i18n ? i18n.t(key) : key);
            const escapeHtml = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
            const v = (k, def = '') => {
                const val = values[k] !== undefined ? values[k] : def;
                return typeof val === 'string' ? escapeHtml(val) : val;
            };

            switch (typeId) {
                case 'url':
                    return `
                        <div class="gen-field">
                            <label class="gen-label">${t('generator.fields.url')}</label>
                            <input type="url" class="gen-input" name="url" value="${v('url', 'https://tranthangminh.github.io/')}" placeholder="https://tranthangminh.github.io/" required autocomplete="off">
                        </div>`;

                case 'raw':
                    return `
                        <div class="gen-field">
                            <label class="gen-label">${t('generator.fields.rawText')}</label>
                            <textarea class="gen-textarea" name="rawText" rows="4" placeholder="${t('generator.placeholders.rawText')}" required>${v('rawText', 'My name is Trần Thắng Minh')}</textarea>
                        </div>`;

                case 'phone':
                    return `
                        <div class="gen-field">
                            <label class="gen-label">${t('generator.fields.phoneNumber')}</label>
                            <input type="tel" class="gen-input" name="phone" value="${v('phone', '')}" placeholder="+84 901 234 567" required autocomplete="tel">
                        </div>`;

                case 'sms':
                    return `
                        <div class="gen-field">
                            <label class="gen-label">${t('generator.fields.phoneNumber')}</label>
                            <input type="tel" class="gen-input" name="phone" value="${v('phone', '')}" placeholder="+84 901 234 567" required autocomplete="tel">
                        </div>
                        <div class="gen-field">
                            <label class="gen-label">${t('generator.fields.smsBody')}</label>
                            <textarea class="gen-textarea" name="smsBody" rows="3" placeholder="${t('generator.placeholders.smsBody')}">${v('smsBody', '')}</textarea>
                        </div>`;

                case 'wifi':
                    return `
                        <div class="gen-field">
                            <label class="gen-label">${t('generator.fields.wifiSsid')}</label>
                            <input type="text" class="gen-input" name="ssid" value="${v('ssid', '')}" placeholder="My_WiFi_Network" required autocomplete="off">
                        </div>
                        <div class="gen-field">
                            <label class="gen-label">${t('generator.fields.wifiPassword')}</label>
                            <input type="text" class="gen-input" name="password" value="${v('password', '')}" placeholder="WPA/WPA2 Key" autocomplete="off">
                        </div>
                        <div class="gen-field">
                            <label class="gen-label">${t('generator.fields.wifiAuth')}</label>
                            <select class="gen-select" name="auth">
                                <option value="WPA" ${v('auth', 'WPA') === 'WPA' ? 'selected' : ''}>WPA/WPA2/WPA3</option>
                                <option value="WEP" ${v('auth') === 'WEP' ? 'selected' : ''}>WEP</option>
                                <option value="nopass" ${v('auth') === 'nopass' ? 'selected' : ''}>${t('generator.fields.wifiNoPass')}</option>
                            </select>
                        </div>
                        <div class="gen-field-inline">
                            <label class="toggle-row">
                                <span>${t('generator.fields.wifiHidden')}</span>
                                <input type="checkbox" name="hidden" class="toggle-input" ${v('hidden') ? 'checked' : ''}>
                            </label>
                        </div>`;

                case 'email':
                    return `
                        <div class="gen-field">
                            <label class="gen-label">${t('generator.fields.emailTo')}</label>
                            <input type="email" class="gen-input" name="email" value="${v('email', '')}" placeholder="recipient@example.com" required autocomplete="email">
                        </div>
                        <div class="gen-field">
                            <label class="gen-label">${t('generator.fields.emailSubject')}</label>
                            <input type="text" class="gen-input" name="subject" value="${v('subject', '')}" placeholder="${t('generator.placeholders.emailSubject')}" autocomplete="off">
                        </div>
                        <div class="gen-field">
                            <label class="gen-label">${t('generator.fields.emailBody')}</label>
                            <textarea class="gen-textarea" name="body" rows="3" placeholder="${t('generator.placeholders.emailBody')}">${v('body', '')}</textarea>
                        </div>`;

                case 'event':
                    return `
                        <div class="gen-field">
                            <label class="gen-label">${t('generator.fields.eventTitle')}</label>
                            <input type="text" class="gen-input" name="summary" value="${v('summary', '')}" placeholder="${t('generator.placeholders.eventTitle')}" required autocomplete="off">
                        </div>
                        <div class="gen-field-row">
                            <div class="gen-field">
                                <label class="gen-label">${t('generator.fields.startDate')}</label>
                                <input type="date" class="gen-input" name="startDate" value="${v('startDate', '')}" required>
                            </div>
                            <div class="gen-field">
                                <label class="gen-label">${t('generator.fields.startTime')}</label>
                                <input type="time" class="gen-input" name="startTime" value="${v('startTime', '09:00')}">
                            </div>
                        </div>
                        <div class="gen-field-row">
                            <div class="gen-field">
                                <label class="gen-label">${t('generator.fields.endDate')}</label>
                                <input type="date" class="gen-input" name="endDate" value="${v('endDate', '')}">
                            </div>
                            <div class="gen-field">
                                <label class="gen-label">${t('generator.fields.endTime')}</label>
                                <input type="time" class="gen-input" name="endTime" value="${v('endTime', '10:00')}">
                            </div>
                        </div>
                        <div class="gen-field">
                            <label class="gen-label">${t('generator.fields.location')}</label>
                            <input type="text" class="gen-input" name="location" value="${v('location', '')}" placeholder="${t('generator.placeholders.location')}" autocomplete="off">
                        </div>
                        <div class="gen-field">
                            <label class="gen-label">${t('generator.fields.eventDesc')}</label>
                            <textarea class="gen-textarea" name="description" rows="2">${v('description', '')}</textarea>
                        </div>`;

                case 'vcard':
                    return `
                        <div class="gen-field-row">
                            <div class="gen-field">
                                <label class="gen-label">${t('generator.fields.firstName')}</label>
                                <input type="text" class="gen-input" name="firstName" value="${v('firstName', '')}" placeholder="Minh" required autocomplete="given-name">
                            </div>
                            <div class="gen-field">
                                <label class="gen-label">${t('generator.fields.lastName')}</label>
                                <input type="text" class="gen-input" name="lastName" value="${v('lastName', '')}" placeholder="${t('generator.placeholders.lastName')}" autocomplete="family-name">
                            </div>
                        </div>
                        <div class="gen-field-row">
                            <div class="gen-field">
                                <label class="gen-label">${t('generator.fields.organization')}</label>
                                <input type="text" class="gen-input" name="org" value="${v('org', '')}" placeholder="Company Name" autocomplete="organization">
                            </div>
                            <div class="gen-field">
                                <label class="gen-label">${t('generator.fields.jobTitle')}</label>
                                <input type="text" class="gen-input" name="title" value="${v('title', '')}" placeholder="Software Engineer" autocomplete="organization-title">
                            </div>
                        </div>
                        <div class="gen-field-row">
                            <div class="gen-field">
                                <label class="gen-label">${t('generator.fields.phoneNumber')}</label>
                                <input type="tel" class="gen-input" name="tel" value="${v('tel', '')}" placeholder="+84 901 234 567" autocomplete="tel">
                            </div>
                            <div class="gen-field">
                                <label class="gen-label">${t('generator.fields.email')}</label>
                                <input type="email" class="gen-input" name="email" value="${v('email', '')}" placeholder="contact@domain.com" autocomplete="email">
                            </div>
                        </div>
                        <div class="gen-field">
                            <label class="gen-label">${t('generator.fields.website')}</label>
                            <input type="url" class="gen-input" name="url" value="${v('url', '')}" placeholder="https://yoursite.com" autocomplete="url">
                        </div>
                        <div class="gen-field">
                            <label class="gen-label">${t('generator.fields.address')}</label>
                            <input type="text" class="gen-input" name="address" value="${v('address', '')}" placeholder="${t('generator.placeholders.address')}" autocomplete="street-address">
                        </div>`;

                case 'mecard':
                    return `
                        <div class="gen-field">
                            <label class="gen-label">${t('generator.fields.fullName')}</label>
                            <input type="text" class="gen-input" name="name" value="${v('name', '')}" placeholder="Trần Thắng Minh" required autocomplete="name">
                        </div>
                        <div class="gen-field-row">
                            <div class="gen-field">
                                <label class="gen-label">${t('generator.fields.phoneNumber')}</label>
                                <input type="tel" class="gen-input" name="tel" value="${v('tel', '')}" placeholder="+84 901 234 567" autocomplete="tel">
                            </div>
                            <div class="gen-field">
                                <label class="gen-label">${t('generator.fields.email')}</label>
                                <input type="email" class="gen-input" name="email" value="${v('email', '')}" placeholder="contact@domain.com" autocomplete="email">
                            </div>
                        </div>
                        <div class="gen-field">
                            <label class="gen-label">${t('generator.fields.website')}</label>
                            <input type="url" class="gen-input" name="url" value="${v('url', '')}" placeholder="https://yoursite.com" autocomplete="url">
                        </div>
                        <div class="gen-field">
                            <label class="gen-label">${t('generator.fields.note')}</label>
                            <input type="text" class="gen-input" name="note" value="${v('note', '')}" placeholder="${t('generator.placeholders.note')}" autocomplete="off">
                        </div>`;

                default:
                    return '';
            }
        },

        formatPayload(typeId, values = {}) {
            switch (typeId) {
                case 'url': {
                    let u = (values.url || '').trim();
                    if (!u) return '';
                    if (!/^https?:\/\//i.test(u)) u = 'https://' + u;
                    return u;
                }
                case 'raw':
                    return (values.rawText || '').trim();

                case 'phone': {
                    const p = (values.phone || '').trim().replace(/\s+/g, '');
                    return p ? `tel:${p}` : '';
                }

                case 'sms': {
                    const p = (values.phone || '').trim().replace(/\s+/g, '');
                    const b = (values.smsBody || '').trim();
                    if (!p) return '';
                    return b ? `smsto:${p}:${b}` : `smsto:${p}`;
                }

                case 'wifi': {
                    const s = (values.ssid || '').trim();
                    if (!s) return '';
                    const t = values.auth || 'WPA';
                    const p = values.password || '';
                    const h = values.hidden ? 'true' : 'false';
                    const esc = (str) => str.replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/:/g, '\\:').replace(/,/g, '\\,');
                    return `WIFI:T:${t};S:${esc(s)};P:${esc(p)};H:${h};;`;
                }

                case 'email': {
                    const em = (values.email || '').trim();
                    if (!em) return '';
                    const params = [];
                    if (values.subject) params.push(`subject=${encodeURIComponent(values.subject)}`);
                    if (values.body) params.push(`body=${encodeURIComponent(values.body)}`);
                    return `mailto:${em}${params.length ? '?' + params.join('&') : ''}`;
                }

                case 'event': {
                    const summary = (values.summary || '').trim();
                    if (!summary) return '';
                    const dtStart = formatDateToIcs(values.startDate, values.startTime);
                    const dtEnd = formatDateToIcs(values.endDate || values.startDate, values.endTime || values.startTime);
                    let ics = `BEGIN:VEVENT\nSUMMARY:${escapeVCard(summary)}`;
                    if (dtStart) ics += `\nDTSTART:${dtStart}`;
                    if (dtEnd) ics += `\nDTEND:${dtEnd}`;
                    if (values.location) ics += `\nLOCATION:${escapeVCard(values.location.trim())}`;
                    if (values.description) ics += `\nDESCRIPTION:${escapeVCard(values.description.trim())}`;
                    ics += `\nEND:VEVENT`;
                    return ics;
                }

                case 'vcard': {
                    const fn = [values.lastName, values.firstName].filter(Boolean).join(' ').trim() || 'Contact';
                    let vc = `BEGIN:VCARD\nVERSION:3.0\nFN:${escapeVCard(fn)}`;
                    vc += `\nN:${escapeVCard(values.lastName || '')};${escapeVCard(values.firstName || '')};;;`;
                    if (values.org) vc += `\nORG:${escapeVCard(values.org.trim())}`;
                    if (values.title) vc += `\nTITLE:${escapeVCard(values.title.trim())}`;
                    if (values.tel) vc += `\nTEL;TYPE=CELL:${values.tel.trim().replace(/\s+/g, '')}`;
                    if (values.email) vc += `\nEMAIL:${values.email.trim()}`;
                    if (values.url) vc += `\nURL:${values.url.trim()}`;
                    if (values.address) vc += `\nADR:;;${escapeVCard(values.address.trim())};;;;`;
                    vc += `\nEND:VCARD`;
                    return vc;
                }

                case 'mecard': {
                    const n = (values.name || '').trim();
                    if (!n) return '';
                    let mc = `MECARD:N:${escapeMeCard(n)};`;
                    if (values.tel) mc += `TEL:${values.tel.trim().replace(/\s+/g, '')};`;
                    if (values.email) mc += `EMAIL:${values.email.trim()};`;
                    if (values.url) mc += `URL:${values.url.trim()};`;
                    if (values.note) mc += `NOTE:${escapeMeCard(values.note.trim())};`;
                    mc += ';';
                    return mc;
                }

                default:
                    return '';
            }
        }
    };

    if (typeof window !== 'undefined') {
        window.QrGeneratorTypes = QrGeneratorTypes;
    }
    if (typeof module !== 'undefined' && module.exports) {
        module.exports = { QrGeneratorTypes };
    }
})();
