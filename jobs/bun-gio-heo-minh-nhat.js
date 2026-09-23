'use strict';

if (typeof initSharedPage === 'function') {
    initSharedPage({
        header: {
            rootId: 'sharedHeaderRoot',
            options: {
                homeHref: '../index.html',
                toolBaseHref: '../',
                assetBase: '../',
                professionItems: [
                    { labelKey: 'header.profession.actor', label: 'Diễn Viên', href: 'actor.html' },
                    { labelKey: 'header.profession.artist', label: 'Họa Sĩ', href: 'artist.html' },
                    { labelKey: 'header.profession.photographer', label: 'Nhiếp Ảnh', href: 'photographer.html' },
                    { labelKey: 'header.profession.bunGioHeo', label: 'Bún Giò Heo Minh Nhật', href: 'bun-gio-heo-minh-nhat.html' },
                    { labelKey: 'header.profession.harryPerfume', label: 'Harry Perfume', href: 'https://harryperfume.vn/gioi-thieu', target: '_blank' }
                ]
            }
        },
        contact: {
            rootId: 'sharedContactRoot',
            options: {
                pageClass: 'contact-page',
                id: 'contactSection',
                includeReveal: true,
                assetBase: '../'
            }
        },
        bookNow: {
            rootId: 'sharedBookNowRoot',
            options: { id: 'bookNowButton' }
        },
        headerMenus: {}
    });
}
