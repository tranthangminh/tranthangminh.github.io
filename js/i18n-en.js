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
            },
            artist: {
                title: 'Artist - Tran Thang Minh'
            },
            tools: {
                title: 'Tools - Tran Thang Minh'
            }
        },
        header: {
            professions: 'Professions',
            tools: 'Tools',
            homeAria: 'Go to homepage',
            languageAria: 'Switch language',
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
            photographerAlt: 'Zoomed photography image',
            artistAlt: 'Zoomed artist image'
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
        toolsPage: {
            photoshop: {
                previewLabel: 'Preview',
                overviewTitle: 'Tool Overview',
                overviewBody: 'Layer Export, Rename & Sort is a Photoshop utility panel built to speed up repetitive layer workflows. It helps you export selected layers into multiple file formats, rename layers in bulk, and sort layers by name without breaking your flow inside Photoshop.',
                downloadLabel: 'Download Layer Export, Rename & Sort .CCX',
                installationTitle: 'Installation Guide',
                installationIntro: 'This plugin requires Adobe Photoshop 23.3 or later.',
                installationPathNote: 'To avoid installation errors, place the .ccx file in a short local path before installing. Recommended example: D:\\com.max.layerxrs_PS.ccx. Avoid installing from very long folder paths, cloud-synced folders, or external locations.',
                installStepsTitle: 'To install',
                installStep1: 'Double-click the .ccx file.',
                installStep2: 'Adobe Creative Cloud Desktop will open and install the plugin.',
                installStep3: 'Restart Photoshop if needed.',
                openStepsTitle: 'To open the tool in Photoshop',
                openStep1: 'Open Photoshop.',
                openStep2: 'Go to Plugins.',
                openStep3: 'Open Layer Export, Rename & Sort.',
                exportTitle: 'Export',
                exportBody: 'Export selected layers as individual files using their layer names, with optional prefix and suffix controls for cleaner naming. The Export section supports JPG, PNG, WebP, PSD, TIFF, and BMP, each with its own format settings such as quality, compression, bit depth, compatibility, or transparency options. You can preview the output names before exporting, keep the current document folder as the default location, or choose a custom export folder when needed.',
                renameTitle: 'Rename',
                renameBody: 'Rename layers in bulk with simple but flexible tools. You can rename selected layers with sequential numbering, add a prefix or suffix, or remove and replace text across multiple layer names at once. It is designed for fast cleanup and consistent naming when working with large layer sets.',
                sortTitle: 'Sort',
                sortBody: 'Sort layers alphabetically to keep your document organized and easier to manage. You can choose different sorting scopes, such as top-level layers, all layers recursively, or layers inside a selected group, and then sort them in either A to Z or Z to A order.'
            }
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
