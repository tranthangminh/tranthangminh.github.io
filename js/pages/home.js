'use strict';

const container = document.querySelector('.container');

if (typeof initSharedPage === 'function') {
    initSharedPage({
        titleKey: 'meta.home.title',
        header: {
            rootId: 'sharedHeaderRoot',
            options: { homeHref: 'index.html' }
        },
        welcome: {
            rootId: 'sharedWelcomeRoot',
            options: {
                variant: 'home',
                titleKey: 'welcome.home.title'
            }
        },
        contact: {
            rootId: 'sharedContactRoot',
            options: {
                pageClass: 'page contact-page',
                id: 'contactSection',
                includeReveal: true,
                showExploreLinks: false
            }
        },
        bookNow: {
            rootId: 'sharedBookNowRoot',
            options: { id: 'bookNowButton' }
        },
        lightbox: {
            rootId: 'sharedLightboxRoot'
        },
        headerMenus: {
            onHomeClick: function (event) {
                event.preventDefault();
                animateToPage(0, 560);
            }
        },
        welcomeBehavior: {
            showFrames: 1,
            hideAfter: 1000
        },
        lightboxInit: {
            triggerSelector: '.actor-item img',
            fallbackAltKey: 'lightbox.fallbackAlt',
            fallbackAlt: 'Ảnh phóng to'
        },
        momentum: {
            selector: '.actor-grid'
        },
        bookNowBehavior: {
            buttonId: 'bookNowButton',
            scrollContainer: '.container',
            hideWhenVisible: 'contactSection',
            visibilityThreshold: 0.45
        }
    });
}

const pages = Array.from(document.querySelectorAll('.page'));
const dots = Array.from(document.querySelectorAll('.snap-dot'));
const aboutActorVideoLink = document.getElementById('aboutActorVideoLink');
const aboutActorVideoThumb = document.getElementById('aboutActorVideoThumb');
const aboutActorVideoPrev = document.getElementById('aboutActorVideoPrev');
const aboutActorVideoNext = document.getElementById('aboutActorVideoNext');
const aboutActorVideoTitle = document.getElementById('aboutActorVideoTitle');
let aboutActorVideoRenderToken = 0;
let isPageAnimating = false;
let pageAnimationFrame = null;
let activeTargetIndex = null;
const wheelNotchDelta = 100;
const wheelNotchesPerPage = 3;
const wheelGestureIdleMs = 220;
let wheelGestureDirection = 0;
let wheelGestureNotches = 0;
let wheelGestureBaseIndex = 0;
let wheelGestureLastTime = 0;
const bookNowButton = document.getElementById('bookNowButton');

const aboutActorVideos = [
    { id: 'S-YVjeYC4T8', title: 'Trộm Vía' },
    { id: '9WZ0-d3x1QU', title: 'Sư phụ - NPC game logic' },
    { id: 'r7RW-Ppiqv8', title: 'Clip nổi bật' }
];
let aboutActorVideoIndex = 0;

function fetchAboutActorVideoTitle(video) {
    const watchUrl = 'https://www.youtube.com/watch?v=' + video.id;
    const oembedUrl = 'https://www.youtube.com/oembed?url=' + encodeURIComponent(watchUrl) + '&format=json';

    return fetch(oembedUrl)
    .then(function (response) {
        if (!response.ok) {
            throw new Error('oEmbed request failed');
        }
        return response.json();
    })
    .then(function (data) {
        if (data && data.title) {
            video.title = data.title;
        }
    })
    .catch(function () {
        /* Keep fallback title if oEmbed is blocked */
    });
}

function renderAboutActorVideo() {
    if (!aboutActorVideoLink || !aboutActorVideoThumb) {
        return;
    }

    aboutActorVideoRenderToken += 1;
    const currentToken = aboutActorVideoRenderToken;
    const currentVideo = aboutActorVideos[aboutActorVideoIndex];
    const href = 'https://www.youtube.com/watch?v=' + currentVideo.id;
    const thumb = 'https://img.youtube.com/vi/' + currentVideo.id + '/hqdefault.jpg';
    const thumbAlt = 'Ảnh xem trước video diễn viên số ' + (aboutActorVideoIndex + 1);

    aboutActorVideoLink.href = href;
    if (aboutActorVideoTitle) {
        aboutActorVideoTitle.classList.add('is-switching');
        aboutActorVideoTitle.textContent = currentVideo.title;
    }

    aboutActorVideoThumb.classList.add('is-switching');

    const preloadImage = new Image();
    preloadImage.onload = function () {
        if (currentToken !== aboutActorVideoRenderToken) {
            return;
        }
        aboutActorVideoThumb.src = thumb;
        aboutActorVideoThumb.alt = thumbAlt;
        requestAnimationFrame(function () {
            aboutActorVideoThumb.classList.remove('is-switching');
            if (aboutActorVideoTitle) {
                aboutActorVideoTitle.classList.remove('is-switching');
            }
        });
    };
    preloadImage.onerror = function () {
        if (currentToken !== aboutActorVideoRenderToken) {
            return;
        }
        aboutActorVideoThumb.src = thumb;
        aboutActorVideoThumb.alt = thumbAlt;
        aboutActorVideoThumb.classList.remove('is-switching');
        if (aboutActorVideoTitle) {
            aboutActorVideoTitle.classList.remove('is-switching');
        }
    };
    preloadImage.src = thumb;
}

if (aboutActorVideoLink && aboutActorVideoThumb) {
    renderAboutActorVideo();

    Promise.all(aboutActorVideos.map(fetchAboutActorVideoTitle))
    .then(function () {
        renderAboutActorVideo();
    })
    .catch(function () {
        /* Ignore and keep fallback titles */
    });

    if (aboutActorVideoPrev) {
        aboutActorVideoPrev.addEventListener('click', function (event) {
            event.preventDefault();
            event.stopPropagation();
            aboutActorVideoIndex = (aboutActorVideoIndex - 1 + aboutActorVideos.length) % aboutActorVideos.length;
            renderAboutActorVideo();
        });
    }

    if (aboutActorVideoNext) {
        aboutActorVideoNext.addEventListener('click', function (event) {
            event.preventDefault();
            event.stopPropagation();
            aboutActorVideoIndex = (aboutActorVideoIndex + 1) % aboutActorVideos.length;
            renderAboutActorVideo();
        });
    }
}

function updateSnapIndicator() {
    const containerTop = container.getBoundingClientRect().top;
    let activeIndex = 0;
    let closestDistance = Number.POSITIVE_INFINITY;

    pages.forEach(function (page, index) {
        const distance = Math.abs(page.getBoundingClientRect().top - containerTop);
        if (distance < closestDistance) {
            closestDistance = distance;
            activeIndex = index;
        }
    });

    dots.forEach(function (dot, index) {
        dot.classList.toggle('active', index === activeIndex);
    });

    if (bookNowButton) {
        bookNowButton.classList.toggle('hidden', activeIndex === pages.length - 1);
    }

    applyPageRevealStates(activeIndex);
}

function getActivePageIndex() {
    const containerTop = container.getBoundingClientRect().top;
    let activeIndex = 0;
    let closestDistance = Number.POSITIVE_INFINITY;

    pages.forEach(function (page, index) {
        const distance = Math.abs(page.getBoundingClientRect().top - containerTop);
        if (distance < closestDistance) {
            closestDistance = distance;
            activeIndex = index;
        }
    });

    return activeIndex;
}

function animateToPage(targetIndex, duration) {
    if (activeTargetIndex === targetIndex && isPageAnimating) {
        return;
    }

    if (pageAnimationFrame) {
        cancelAnimationFrame(pageAnimationFrame);
        pageAnimationFrame = null;
    }

    const startY = container.scrollTop;
    const targetY = Math.max(0, pages[targetIndex].offsetTop);
    const distance = targetY - startY;
    const startTime = performance.now();

    if (Math.abs(distance) < 1) {
        updateSnapIndicator();
        return;
    }

    isPageAnimating = true;
    activeTargetIndex = targetIndex;

    function easeOutCubic(t) {
        return 1 - Math.pow(1 - t, 3);
    }

    function frame(now) {
        const elapsed = now - startTime;
        const progress = Math.min(elapsed / duration, 1);
        const eased = easeOutCubic(progress);

        container.scrollTop = startY + distance * eased;
        updateSnapIndicator();

        if (progress < 1) {
            pageAnimationFrame = requestAnimationFrame(frame);
            return;
        }

        isPageAnimating = false;
        activeTargetIndex = null;
        pageAnimationFrame = null;
    }

    pageAnimationFrame = requestAnimationFrame(frame);
}

function jumpToHashPage(useAnimation) {
    if (!window.location.hash) {
        return;
    }

    const target = document.getElementById(window.location.hash.slice(1));
    if (!target) {
        return;
    }

    const targetPage = target.classList.contains('page') ? target : target.closest('.page');
    const targetIndex = pages.indexOf(targetPage);
    if (targetIndex === -1) {
        return;
    }

    if (useAnimation) {
        animateToPage(targetIndex, 850);
        return;
    }

    container.scrollTop = Math.max(0, targetPage.offsetTop);
    updateSnapIndicator();
}

container.addEventListener('wheel', function (event) {
    if (Math.abs(event.deltaY) < 1) {
        return;
    }

    event.preventDefault();

    const direction = event.deltaY > 0 ? 1 : -1;
    const now = performance.now();
    const isNewGesture = direction !== wheelGestureDirection || (now - wheelGestureLastTime) > wheelGestureIdleMs;

    if (isNewGesture) {
        wheelGestureDirection = direction;
        wheelGestureNotches = 0;
        wheelGestureBaseIndex = activeTargetIndex !== null ? activeTargetIndex : getActivePageIndex();
    }

    wheelGestureLastTime = now;
    wheelGestureNotches += Math.abs(event.deltaY) / wheelNotchDelta;

    const pagesToMove = Math.max(1, Math.ceil(wheelGestureNotches / wheelNotchesPerPage));
    const targetIndex = Math.max(0, Math.min(pages.length - 1, wheelGestureBaseIndex + (direction * pagesToMove)));

    if (targetIndex === activeTargetIndex) {
        return;
    }

    animateToPage(targetIndex, 850);
}, { passive: false });

dots.forEach(function (dot, index) {
    dot.addEventListener('click', function () {
        animateToPage(index, 850);
    });
});

const revealElements = Array.from(document.querySelectorAll('.reveal-up'));
const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

function applyPageRevealStates(activeIndex) {
    pages.forEach(function (page, index) {
        page.classList.remove('page-before', 'page-active', 'page-after');
        if (index < activeIndex) {
            page.classList.add('page-before');
            return;
        }
        if (index > activeIndex) {
            page.classList.add('page-after');
            return;
        }
        page.classList.add('page-active');
    });
}

if (!prefersReducedMotion && revealElements.length) {
    revealElements.forEach(function (element) {
        const page = element.closest('.page');
        const siblings = page ? Array.from(page.querySelectorAll('.reveal-up')) : [];
        const indexInPage = Math.max(0, siblings.indexOf(element));
        const delay = Math.min((indexInPage % 8) * 35, 245);
        element.style.transitionDelay = delay + 'ms';
    });
}

container.addEventListener('scroll', updateSnapIndicator);
updateSnapIndicator();
requestAnimationFrame(function () {
    jumpToHashPage(false);
});
window.addEventListener('hashchange', function () {
    jumpToHashPage(true);
});
