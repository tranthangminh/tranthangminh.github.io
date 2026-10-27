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
            const t = (key, fallback) => (i18n ? i18n.t(key) : fallback);
            const v = (k, def = '') => (values[k] !== undefined ? values[k] : def);

            switch (typeId) {
                case 'url':
                    return `
                        <div class="gen-field">
                            <label class="gen-label">${t('generator.fields.url', 'Địa chỉ Web (URL)')}</label>
                            <input type="url" class="gen-input" name="url" value="${v('url', 'https://tranthangminh.github.io/')}" placeholder="https://tranthangminh.github.io/" required autocomplete="off">
                        </div>`;

                case 'raw':
                    return `
                        <div class="gen-field">
                            <label class="gen-label">${t('generator.fields.rawText', 'Văn bản thuần')}</label>
                            <textarea class="gen-textarea" name="rawText" rows="4" placeholder="${t('generator.placeholders.rawText', 'Nhập bất kỳ văn bản, mã số, ghi chú...')}" required>${v('rawText', 'My name is Trần Thắng Minh')}</textarea>
                        </div>`;

                case 'phone':
                    return `
                        <div class="gen-field">
                            <label class="gen-label">${t('generator.fields.phoneNumber', 'Số điện thoại')}</label>
                            <input type="tel" class="gen-input" name="phone" value="${v('phone', '')}" placeholder="+84 901 234 567" required autocomplete="tel">
                        </div>`;

                case 'sms':
                    return `
                        <div class="gen-field">
                            <label class="gen-label">${t('generator.fields.phoneNumber', 'Số điện thoại')}</label>
                            <input type="tel" class="gen-input" name="phone" value="${v('phone', '')}" placeholder="+84 901 234 567" required autocomplete="tel">
                        </div>
                        <div class="gen-field">
                            <label class="gen-label">${t('generator.fields.smsBody', 'Nội dung tin nhắn')}</label>
                            <textarea class="gen-textarea" name="smsBody" rows="3" placeholder="${t('generator.placeholders.smsBody', 'Nội dung SMS...')}">${v('smsBody', '')}</textarea>
                        </div>`;

                case 'wifi':
                    return `
                        <div class="gen-field">
                            <label class="gen-label">${t('generator.fields.wifiSsid', 'Tên mạng (SSID)')}</label>
                            <input type="text" class="gen-input" name="ssid" value="${v('ssid', '')}" placeholder="My_WiFi_Network" required autocomplete="off">
                        </div>
                        <div class="gen-field">
                            <label class="gen-label">${t('generator.fields.wifiPassword', 'Mật khẩu Wi-Fi')}</label>
                            <input type="text" class="gen-input" name="password" value="${v('password', '')}" placeholder="WPA/WPA2 Key" autocomplete="off">
                        </div>
                        <div class="gen-field">
                            <label class="gen-label">${t('generator.fields.wifiAuth', 'Bảo mật')}</label>
                            <select class="gen-select" name="auth">
                                <option value="WPA" ${v('auth', 'WPA') === 'WPA' ? 'selected' : ''}>WPA/WPA2/WPA3</option>
                                <option value="WEP" ${v('auth') === 'WEP' ? 'selected' : ''}>WEP</option>
                                <option value="nopass" ${v('auth') === 'nopass' ? 'selected' : ''}>${t('generator.fields.wifiNoPass', 'Không mật khẩu')}</option>
                            </select>
                        </div>
                        <div class="gen-field-inline">
                            <label class="toggle-row">
                                <span>${t('generator.fields.wifiHidden', 'Mạng ẩn (Hidden SSID)')}</span>
                                <input type="checkbox" name="hidden" class="toggle-input" ${v('hidden') ? 'checked' : ''}>
                            </label>
                        </div>`;

                case 'email':
                    return `
                        <div class="gen-field">
                            <label class="gen-label">${t('generator.fields.emailTo', 'Địa chỉ Email nhận')}</label>
                            <input type="email" class="gen-input" name="email" value="${v('email', '')}" placeholder="recipient@example.com" required autocomplete="email">
                        </div>
                        <div class="gen-field">
                            <label class="gen-label">${t('generator.fields.emailSubject', 'Tiêu đề Email')}</label>
                            <input type="text" class="gen-input" name="subject" value="${v('subject', '')}" placeholder="${t('generator.placeholders.emailSubject', 'Tiêu đề thư...')}" autocomplete="off">
                        </div>
                        <div class="gen-field">
                            <label class="gen-label">${t('generator.fields.emailBody', 'Nội dung Email')}</label>
                            <textarea class="gen-textarea" name="body" rows="3" placeholder="${t('generator.placeholders.emailBody', 'Nội dung thư...')}">${v('body', '')}</textarea>
                        </div>`;

                case 'event':
                    return `
                        <div class="gen-field">
                            <label class="gen-label">${t('generator.fields.eventTitle', 'Tên sự kiện')}</label>
                            <input type="text" class="gen-input" name="summary" value="${v('summary', '')}" placeholder="${t('generator.placeholders.eventTitle', 'Họp mặt, Sinh nhật, Hội thảo...')}" required autocomplete="off">
                        </div>
                        <div class="gen-field-row">
                            <div class="gen-field">
                                <label class="gen-label">${t('generator.fields.startDate', 'Ngày bắt đầu')}</label>
                                <input type="date" class="gen-input" name="startDate" value="${v('startDate', '')}" required>
                            </div>
                            <div class="gen-field">
                                <label class="gen-label">${t('generator.fields.startTime', 'Giờ')}</label>
                                <input type="time" class="gen-input" name="startTime" value="${v('startTime', '09:00')}">
                            </div>
                        </div>
                        <div class="gen-field-row">
                            <div class="gen-field">
                                <label class="gen-label">${t('generator.fields.endDate', 'Ngày kết thúc')}</label>
                                <input type="date" class="gen-input" name="endDate" value="${v('endDate', '')}">
                            </div>
                            <div class="gen-field">
                                <label class="gen-label">${t('generator.fields.endTime', 'Giờ')}</label>
                                <input type="time" class="gen-input" name="endTime" value="${v('endTime', '10:00')}">
                            </div>
                        </div>
                        <div class="gen-field">
                            <label class="gen-label">${t('generator.fields.location', 'Địa điểm')}</label>
                            <input type="text" class="gen-input" name="location" value="${v('location', '')}" placeholder="Hà Nội, TP.HCM hoặc online link..." autocomplete="off">
                        </div>
                        <div class="gen-field">
                            <label class="gen-label">${t('generator.fields.eventDesc', 'Ghi chú mô tả')}</label>
                            <textarea class="gen-textarea" name="description" rows="2">${v('description', '')}</textarea>
                        </div>`;

                case 'vcard':
                    return `
                        <div class="gen-field-row">
                            <div class="gen-field">
                                <label class="gen-label">${t('generator.fields.firstName', 'Tên')}</label>
                                <input type="text" class="gen-input" name="firstName" value="${v('firstName', '')}" placeholder="Minh" required autocomplete="given-name">
                            </div>
                            <div class="gen-field">
                                <label class="gen-label">${t('generator.fields.lastName', 'Họ & Tên đệm')}</label>
                                <input type="text" class="gen-input" name="lastName" value="${v('lastName', '')}" placeholder="Trần Thắng" autocomplete="family-name">
                            </div>
                        </div>
                        <div class="gen-field-row">
                            <div class="gen-field">
                                <label class="gen-label">${t('generator.fields.organization', 'Công ty / Tổ chức')}</label>
                                <input type="text" class="gen-input" name="org" value="${v('org', '')}" placeholder="Company Name" autocomplete="organization">
                            </div>
                            <div class="gen-field">
                                <label class="gen-label">${t('generator.fields.jobTitle', 'Chức danh')}</label>
                                <input type="text" class="gen-input" name="title" value="${v('title', '')}" placeholder="Software Engineer" autocomplete="organization-title">
                            </div>
                        </div>
                        <div class="gen-field-row">
                            <div class="gen-field">
                                <label class="gen-label">${t('generator.fields.phoneNumber', 'Số điện thoại')}</label>
                                <input type="tel" class="gen-input" name="tel" value="${v('tel', '')}" placeholder="+84 901 234 567" autocomplete="tel">
                            </div>
                            <div class="gen-field">
                                <label class="gen-label">${t('generator.fields.email', 'Email')}</label>
                                <input type="email" class="gen-input" name="email" value="${v('email', '')}" placeholder="contact@domain.com" autocomplete="email">
                            </div>
                        </div>
                        <div class="gen-field">
                            <label class="gen-label">${t('generator.fields.website', 'Website')}</label>
                            <input type="url" class="gen-input" name="url" value="${v('url', '')}" placeholder="https://yoursite.com" autocomplete="url">
                        </div>
                        <div class="gen-field">
                            <label class="gen-label">${t('generator.fields.address', 'Địa chỉ')}</label>
                            <input type="text" class="gen-input" name="address" value="${v('address', '')}" placeholder="123 Nguyễn Huệ, Q.1, TP.HCM" autocomplete="street-address">
                        </div>`;

                case 'mecard':
                    return `
                        <div class="gen-field">
                            <label class="gen-label">${t('generator.fields.fullName', 'Họ và tên')}</label>
                            <input type="text" class="gen-input" name="name" value="${v('name', '')}" placeholder="Trần Thắng Minh" required autocomplete="name">
                        </div>
                        <div class="gen-field-row">
                            <div class="gen-field">
                                <label class="gen-label">${t('generator.fields.phoneNumber', 'Số điện thoại')}</label>
                                <input type="tel" class="gen-input" name="tel" value="${v('tel', '')}" placeholder="+84 901 234 567" autocomplete="tel">
                            </div>
                            <div class="gen-field">
                                <label class="gen-label">${t('generator.fields.email', 'Email')}</label>
                                <input type="email" class="gen-input" name="email" value="${v('email', '')}" placeholder="contact@domain.com" autocomplete="email">
                            </div>
                        </div>
                        <div class="gen-field">
                            <label class="gen-label">${t('generator.fields.website', 'Website')}</label>
                            <input type="url" class="gen-input" name="url" value="${v('url', '')}" placeholder="https://yoursite.com" autocomplete="url">
                        </div>
                        <div class="gen-field">
                            <label class="gen-label">${t('generator.fields.note', 'Ghi chú')}</label>
                            <input type="text" class="gen-input" name="note" value="${v('note', '')}" placeholder="Mô tả hoặc ghi nhớ..." autocomplete="off">
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
