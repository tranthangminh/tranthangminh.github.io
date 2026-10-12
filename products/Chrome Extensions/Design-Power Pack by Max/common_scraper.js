// Webpage Resource Scraper (Injected into active tab context)
(function() {
  const imgExtensions = ['.jpg', '.jpeg', '.png', '.webp', '.gif', '.avif', '.bmp'];
  const videoExtensions = ['.mp4', '.webm', '.ogg', '.mov', '.m3u8', '.mkv', '.avi', '.flv'];
  const audioExtensions = ['.mp3', '.wav', '.ogg', '.m4a', '.aac', '.flac'];

  // Global resource manager to handle de-duplication, routing, and filename cleaning
  const resourceManager = {
    imagesList: [],
    vectorsList: [],
    videosList: [],
    soundsList: [],
    urlsSet: new Set(),
    rawSvgs: new Set(),

    addResource: function(src, width, height, extra = {}) {
      if (!src) return;
      try {
        src = new URL(src, document.baseURI).href;
      } catch (e) {
        return;
      }

      if (this.urlsSet.has(src)) return;
      this.urlsSet.add(src);

      const cleanUrl = src.split(/[?#]/)[0].toLowerCase();

      // Helper to generate filename
      const getCleanFilename = (url, defaultExt) => {
        let filename = '';
        try {
          const urlObj = new URL(url, document.baseURI);
          
          // 1. Try to search query parameters for standard filename keys
          const params = urlObj.searchParams;
          const nameKeys = ['filename', 'file', 'name', 'title', 'download'];
          for (const key of nameKeys) {
            const val = params.get(key);
            if (val) {
              filename = val;
              break;
            }
          }
          
          // 2. Fallback to pathname if not found in query params
          if (!filename) {
            const pathname = urlObj.pathname;
            const lastSegment = pathname.substring(pathname.lastIndexOf('/') + 1);
            if (lastSegment) {
              filename = lastSegment;
            }
          }
        } catch (e) {}

        if (!filename) {
          filename = 'extracted-file-' + Date.now();
        }

        // Clean up the name
        filename = filename.split(/[?#]/)[0].replace(/[^a-zA-Z0-9._-]/g, '_');
        
        // Ensure proper extension
        if (!filename.includes('.')) {
          filename += defaultExt;
        }
        return filename;
      };

      // 1. Check if it's an SVG Vector
      if (cleanUrl.endsWith('.svg') || src.startsWith('data:image/svg+xml')) {
        this.vectorsList.push({
          type: 'url',
          url: src,
          width: Math.round(width) || 0,
          height: Math.round(height) || 0,
          filename: getCleanFilename(src, '.svg')
        });
        return;
      }

      // 2. Check if it's a Video
      const isVideo = extra.isVideo || videoExtensions.some(ext => cleanUrl.endsWith(ext));
      if (isVideo) {
        this.videosList.push({
          url: src,
          width: Math.round(width) || 0,
          height: Math.round(height) || 0,
          duration: extra.duration || 0,
          poster: extra.poster ? new URL(extra.poster, document.baseURI).href : '',
          filename: getCleanFilename(src, '.mp4')
        });
        return;
      }

      // 3. Check if it's a Sound/Audio
      const isAudio = extra.isAudio || audioExtensions.some(ext => cleanUrl.endsWith(ext));
      if (isAudio) {
        this.soundsList.push({
          url: src,
          duration: extra.duration || 0,
          filename: getCleanFilename(src, '.mp3')
        });
        return;
      }

      // 4. Otherwise, it's an Image (ignore very tiny tracking pixels unless they are content)
      if (src.startsWith('data:') && src.length < 500) return;

      this.imagesList.push({
        url: src,
        width: Math.round(width) || 0,
        height: Math.round(height) || 0,
        filename: getCleanFilename(src, '.png')
      });
    }
  };

  // Helper to check if a URL is a valid image or video or vector or audio resource
  function isResourceUrl(url) {
    if (!url) return false;
    url = url.trim();
    if (url.startsWith('data:image/') || url.startsWith('data:audio/')) return true;
    if (url.startsWith('http://') || url.startsWith('https://') || url.startsWith('//')) {
      const cleanUrl = url.split(/[?#]/)[0].toLowerCase();
      return imgExtensions.some(ext => cleanUrl.endsWith(ext)) ||
             videoExtensions.some(ext => cleanUrl.endsWith(ext)) ||
             audioExtensions.some(ext => cleanUrl.endsWith(ext)) ||
             cleanUrl.endsWith('.svg') ||
             url.includes('/image/') || url.includes('/images/') || url.includes('/img/') ||
             url.includes('cdn.shopify.com') || url.includes('cellphones.com.vn/media/');
    }
    return false;
  }

  // --- 1. SCANNING DOM FOR IMAGE/VIDEO/URL-VECTOR RESOURCES ---

  // A. Normal images and elements
  const allElements = document.querySelectorAll('*');
  allElements.forEach(el => {
    try {
      // 1. <img> tags
      if (el.tagName === 'IMG') {
        const src = el.currentSrc || el.src || el.getAttribute('src') || el.getAttribute('data-src');
        if (src) {
          resourceManager.addResource(src, el.naturalWidth || el.clientWidth || 0, el.naturalHeight || el.clientHeight || 0);
        }
        
        // Handle srcset if present
        const srcset = el.getAttribute('srcset');
        if (srcset) {
          const parts = srcset.split(',');
          parts.forEach(part => {
            const cleanPart = part.trim().split(/\s+/)[0];
            if (cleanPart) resourceManager.addResource(cleanPart, 0, 0);
          });
        }
      }

      // 2. <source> tags in <picture> or <video>
      if (el.tagName === 'SOURCE') {
        const src = el.getAttribute('src');
        if (src && isResourceUrl(src)) {
          const parentVideo = el.closest('video');
          if (parentVideo) {
            const poster = parentVideo.getAttribute('poster') || '';
            resourceManager.addResource(src, parentVideo.videoWidth || parentVideo.clientWidth || 0, parentVideo.videoHeight || parentVideo.clientHeight || 0, {
              poster,
              duration: parentVideo.duration || 0,
              isVideo: true
            });
          } else {
            resourceManager.addResource(src, 0, 0);
          }
        }
        const srcset = el.getAttribute('srcset');
        if (srcset) {
          const parts = srcset.split(',');
          parts.forEach(part => {
            const cleanPart = part.trim().split(/\s+/)[0];
            if (cleanPart && isResourceUrl(cleanPart)) resourceManager.addResource(cleanPart, 0, 0);
          });
        }
      }

      // 3. <input type="image"> tags
      if (el.tagName === 'INPUT' && el.getAttribute('type') === 'image') {
        const src = el.src || el.getAttribute('src');
        if (src) resourceManager.addResource(src, el.clientWidth || 0, el.clientHeight || 0);
      }

      // 4. Background images via inline style or ComputedStyle
      try {
        const inlineStyle = el.style ? el.style.backgroundImage : '';
        if (inlineStyle && inlineStyle !== 'none') {
          const match = inlineStyle.match(/url\(['"]?([^'")]+)['"]?\)/);
          if (match && match[1]) resourceManager.addResource(match[1], 0, 0);
        }
        const computedBg = window.getComputedStyle(el).backgroundImage;
        if (computedBg && computedBg !== 'none') {
          const match = computedBg.match(/url\(['"]?([^'")]+)['"]?\)/);
          if (match && match[1]) resourceManager.addResource(match[1], 0, 0);
        }
      } catch (e) {}

      // 5. <video> tags (for direct stream sources and poster image)
      if (el.tagName === 'VIDEO') {
        const poster = el.getAttribute('poster') || '';
        const src = el.getAttribute('src');
        if (src) {
          resourceManager.addResource(src, el.videoWidth || el.clientWidth || 0, el.videoHeight || el.clientHeight || 0, {
            poster,
            duration: el.duration || 0,
            isVideo: true
          });
        }
        
        // If video has a poster image, extract it as an image resource
        if (poster) {
          resourceManager.addResource(poster, 0, 0);
        }
      }

      // 6. <a> tags linking directly to media resources
      if (el.tagName === 'A' && el.href) {
        if (isResourceUrl(el.href)) {
          resourceManager.addResource(el.href, 0, 0);
        }
      }

      // 7. <object> tags (typically vectors or media objects)
      if (el.tagName === 'OBJECT') {
        const data = el.getAttribute('data');
        if (data && isResourceUrl(data)) {
          resourceManager.addResource(data, el.clientWidth || 0, el.clientHeight || 0);
        }
      }

      // 8. <embed> tags
      if (el.tagName === 'EMBED') {
        const src = el.getAttribute('src');
        if (src && isResourceUrl(src)) {
          resourceManager.addResource(src, el.clientWidth || 0, el.clientHeight || 0);
        }
      }

      // 8.5. <audio> tags
      if (el.tagName === 'AUDIO') {
        const src = el.src || el.currentSrc || el.getAttribute('src');
        if (src) {
          resourceManager.addResource(src, 0, 0, { isAudio: true, duration: el.duration || 0 });
        }
        const sources = el.querySelectorAll('source');
        sources.forEach(s => {
          const sSrc = s.src || s.getAttribute('src');
          if (sSrc) {
            resourceManager.addResource(sSrc, 0, 0, { isAudio: true });
          }
        });
      }

      // 9. Scan Shadow DOM if present
      if (el.shadowRoot) {
        try {
          const shadowImages = el.shadowRoot.querySelectorAll('img');
          shadowImages.forEach(img => {
            const src = img.currentSrc || img.src || img.getAttribute('src');
            if (src) resourceManager.addResource(src, img.naturalWidth || img.clientWidth || 0, img.naturalHeight || img.clientHeight || 0);
          });
        } catch (e) {}
      }
    } catch (e) {
      console.warn('Error processing DOM element:', el, e);
    }
  });

  // B. Scan document.images (Fallback for dynamically loaded images)
  if (document.images) {
    for (let i = 0; i < document.images.length; i++) {
      const img = document.images[i];
      if (img.src) {
        resourceManager.addResource(img.src, img.naturalWidth || img.clientWidth || 0, img.naturalHeight || img.clientHeight || 0);
      }
    }
  }

  // --- 2. QUÉT TRONG KHỐI HTML BẰNG REGEX (Để bắt các link ẩn trong script/json) ---
  try {
    const pageHtml = document.documentElement.innerHTML;
    // Regex tìm link ảnh, vector, video, audio
    const regex = /https?:\/\/[^\s'"\\]+\.(?:jpg|jpeg|png|webp|gif|avif|bmp|svg|mp4|webm|ogg|mov|m3u8|mkv|avi|flv|mp3|wav|ogg|m4a|aac|flac)(?:[?#][^\s'"\\]*)?/gi;
    const matches = pageHtml.match(regex);
    if (matches) {
      matches.forEach(url => {
        resourceManager.addResource(url, 0, 0);
      });
    }

    // Regex bổ sung cho SVG Data URL ẩn trong script
    const svgDataRegex = /data:image\/svg\+xml;[^\s'"\\]+/gi;
    const svgMatches = pageHtml.match(svgDataRegex);
    if (svgMatches) {
      svgMatches.forEach(url => {
        const cleanUrl = url.replace(/\\/g, '');
        resourceManager.addResource(cleanUrl, 0, 0);
      });
    }
  } catch (e) {}

  // Helper to pull referenced external symbols into the SVG so it becomes self-contained
  function makeSvgSelfContained(svg) {
    try {
      const useTags = svg.querySelectorAll('use');
      if (useTags.length === 0) return svg;

      let defs = svg.querySelector('defs');
      if (!defs) {
        defs = document.createElementNS('http://www.w3.org/2000/svg', 'defs');
        svg.insertBefore(defs, svg.firstChild);
      }

      useTags.forEach(use => {
        const href = use.getAttribute('href') || use.getAttribute('xlink:href');
        if (href && href.startsWith('#')) {
          const refId = href.substring(1);
          try {
            if (defs.querySelector(`#${CSS.escape(refId)}`)) return;
          } catch (e) {
            return;
          }

          const refElement = document.getElementById(refId);
          if (refElement) {
            const cloned = refElement.cloneNode(true);
            defs.appendChild(cloned);
          }
        }
      });
    } catch (e) {}
    return svg;
  }

  // Helper to determine if an SVG has visible rendering elements (not just empty layouts or bounding boxes)
  function isSvgVisible(svg) {
    try {
      const els = svg.querySelectorAll('path, rect, circle, polygon, ellipse, line, text, use, image');
      if (els.length === 0) return false;

      let hasVisibleElement = false;
      for (let i = 0; i < els.length; i++) {
        const el = els[i];
        
        // 1. Skip elements that are inside defs or symbol definitions (since they are just templates)
        if (el.closest('defs, symbol') !== null) {
          continue;
        }

        // 2. Check computed styles
        const style = window.getComputedStyle(el);
        if (style.display === 'none' || style.visibility === 'hidden' || el.getAttribute('display') === 'none') {
          continue;
        }
        
        // 3. Check opacity
        if (style.opacity === '0' || el.getAttribute('opacity') === '0') {
          continue;
        }

        const tagName = el.tagName.toLowerCase();

        // 4. For use tags, check if the referenced ID exists locally in this SVG
        if (tagName === 'use') {
          const href = el.getAttribute('href') || el.getAttribute('xlink:href');
          if (href && href.startsWith('#')) {
            const refId = href.substring(1);
            try {
              if (!svg.querySelector(`#${CSS.escape(refId)}`)) {
                continue; // Skip unresolved reference
              }
            } catch (e) {
              continue;
            }
          } else {
            continue;
          }
        }

        // 5. Check width/height for rect/image
        if (tagName === 'rect' || tagName === 'image') {
          const w = parseFloat(el.getAttribute('width')) || 0;
          const h = parseFloat(el.getAttribute('height')) || 0;
          if (el.hasAttribute('width') && el.hasAttribute('height') && (w === 0 || h === 0)) {
            continue;
          }
        }

        // 6. Check for transparent layout helper / bounding boxes
        const fill = el.getAttribute('fill');
        const stroke = el.getAttribute('stroke');
        const isFillNone = fill === 'none' || fill === 'transparent' || style.fill === 'none' || style.fill === 'transparent';
        const hasStroke = (stroke && stroke !== 'none' && stroke !== 'transparent') || (style.stroke && style.stroke !== 'none' && style.stroke !== 'transparent');
        
        if (isFillNone && !hasStroke) {
          continue; // Invisible bounding box or guide path
        }

        // Found a rendering element that is likely visible!
        hasVisibleElement = true;
        break;
      }
      return hasVisibleElement;
    } catch (e) {
      return true; // Default to keeping it in case of errors
    }
  }

  // --- 3. QUÉT SVG INLINE (Thẻ <svg> nhúng trực tiếp trong DOM) ---
  const inlineSvgs = document.querySelectorAll('svg');
  inlineSvgs.forEach((svg, index) => {
    try {
      if (svg.closest('.app-container') || svg.closest('.tab-controls') || svg.closest('.tab-bar')) return;

      // Clone the SVG so we don't modify the page's original DOM
      const clonedSvg = svg.cloneNode(true);

      // Remove all <script> tags and inline on* attributes for security and CSP compliance
      const scripts = clonedSvg.querySelectorAll('script');
      scripts.forEach(s => s.remove());
      clonedSvg.querySelectorAll('*').forEach(el => {
        for (let i = el.attributes.length - 1; i >= 0; i--) {
          const attrName = el.attributes[i].name;
          if (attrName.startsWith('on')) {
            el.removeAttribute(attrName);
          }
        }
        if (el.tagName.toLowerCase() === 'feblend' && el.hasAttribute('mode')) {
          const modeVal = el.getAttribute('mode');
          if (modeVal === 'plus-darker') {
            el.setAttribute('mode', 'darken');
          } else if (modeVal === 'plus-lighter') {
            el.setAttribute('mode', 'lighten');
          }
        }
      });

      // Make the cloned SVG self-contained by importing page-defined referenced symbols
      makeSvgSelfContained(clonedSvg);

      const svgString = clonedSvg.outerHTML;
      if (svgString.length < 150) return;
      if (resourceManager.rawSvgs.has(svgString)) return;
      resourceManager.rawSvgs.add(svgString);

      let width = clonedSvg.getAttribute('width') || clonedSvg.clientWidth || 0;
      let height = clonedSvg.getAttribute('height') || clonedSvg.clientHeight || 0;
      
      if ((!width || !height) && clonedSvg.getAttribute('viewBox')) {
        const vb = clonedSvg.getAttribute('viewBox').split(/\s+/);
        if (vb.length === 4) {
          width = parseFloat(vb[2]) || 0;
          height = parseFloat(vb[3]) || 0;
        }
      }

      resourceManager.vectorsList.push({
        type: 'inline',
        content: svgString,
        width: Math.round(width) || 0,
        height: Math.round(height) || 0,
        filename: `vector-inline-${index + 1}-${Date.now()}.svg`
      });
    } catch (e) {
      console.warn('Error scraping inline SVG element:', svg, e);
    }
  });

  return {
    images: resourceManager.imagesList,
    vectors: resourceManager.vectorsList,
    videos: resourceManager.videosList,
    sounds: resourceManager.soundsList
  };
})();
