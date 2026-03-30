(function () {
    'use strict';

    if (!window.sharedI18n || typeof window.sharedI18n.registerTranslations !== 'function') {
        return;
    }

    window.sharedI18n.registerTranslations('en', {
        meta: {
            home: {
                title: 'Tran Thang Minh Profile'
            },
            actor: {
                title: 'Actor - Tran Thang Minh'
            },
            photographer: {
                title: 'Photography - Tran Thang Minh'
            }
        },
        header: {
            professions: 'Professions',
            tools: 'Tools',
            homeAria: 'Go to homepage',
            profession: {
                actor: 'Actor',
                artist: 'Artist',
                photographer: 'Photographer'
            },
            tool: {
                photoshop: 'Photoshop Tool',
                maya: 'Maya Tool',
                cheatEngine: 'Cheat Engine Tool'
            }
        },
        bookNow: {
            label: 'Contact Now!',
            aria: 'Go to contact section'
        },
        lightbox: {
            close: 'Close image',
            prev: 'Previous image',
            next: 'Next image',
            thumbs: 'Image list',
            fallbackAlt: 'Zoomed image',
            actorAlt: 'Zoomed actor image',
            photographerAlt: 'Zoomed photography image'
        },
        contact: {
            title: 'CONTACT',
            intro: 'Open to collaborations in acting, 2D/3D design, photography, and workflow tool development.',
            directTitle: 'Direct Contact',
            socialTitle: 'Social Media',
            exploreTitle: 'Areas of Work',
            callReveal: 'Call now',
            call: 'Call: 036 321 9989',
            email: 'Email: maxiechen96@gmail.com',
            moreSocial: 'See more social links',
            copyright: 'Copyright 2026 Tran Thang Minh. All rights reserved.',
            signatureAlt: 'Signature'
        },
        welcome: {
            home: {
                title: 'Hello!'
            },
            actor: {
                kicker: 'Actor',
                title: 'Tran Thang Minh'
            }
        }
    });
})();
