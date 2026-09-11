/**
 * Module 07 Helper: Image Layout & Dynamic Pagination Engine
 * Location: script/07_image_layout_engine.js
 * 
 * Rules:
 * 1. Small & Medium Illustrations (height < 500px):
 *    - Preserves exact 1:1 design dimensions (max-width: ${width}px, width: 100%).
 *    - Fits seamlessly within the content flow on the current page alongside text.
 * 2. Large & Full-Page Master Diagrams (height >= 500px, e.g. st03_11.svg, st03_12.svg):
 *    - Automatically breaks to a fresh page (page-break-before: always; break-before: page;).
 *    - Expands to maximum full-page dimensions (max-height: calc(100vh - 20px); max-width: 100%;) for pin-sharp readability.
 * 3. Zero Margin / Padding:
 *    - 0 wasted border space for maximal printable clarity.
 */

const fs = require('fs');
const path = require('path');

function getSvgDimensions(svgContent) {
    const wMatch = svgContent.match(/<svg[^>]*\bwidth=["']([0-9.]+)(?:px|pt|mm)?["']/i);
    const hMatch = svgContent.match(/<svg[^>]*\bheight=["']([0-9.]+)(?:px|pt|mm)?["']/i);
    const vbMatch = svgContent.match(/<svg[^>]*\bviewBox=["']([0-9.\s-]+)["']/i);

    let width = null;
    let height = null;

    if (wMatch && parseFloat(wMatch[1]) > 1) width = parseFloat(wMatch[1]);
    if (hMatch && parseFloat(hMatch[1]) > 1) height = parseFloat(hMatch[1]);

    if (vbMatch) {
        const parts = vbMatch[1].trim().split(/[\s,]+/);
        if (parts.length === 4) {
            if (!width) width = parseFloat(parts[2]);
            if (!height) height = parseFloat(parts[3]);
        }
    }

    return { width, height };
}

/**
 * Embeds all images/SVGs as Base64 with smart classification (Full-Page vs Inline)
 * Respects exact image source paths (images_original vs images_translated) with safe fallback.
 */
function processImagesInHtml(bodyHtml, projectDir, isVietnamese = false) {
    const imgTagRegex = /<p>\s*(<img\b[^>]*>)\s*<\/p>|(<img\b[^>]*>)/gi;

    return bodyHtml.replace(imgTagRegex, (fullMatch, pImg, standaloneImg) => {
        const imgTag = pImg || standaloneImg;
        const srcMatch = imgTag.match(/\bsrc=["']([^"']+)["']/i);
        if (!srcMatch) return fullMatch;

        const rawSrc = srcMatch[1].trim();
        if (rawSrc.startsWith('data:') || rawSrc.startsWith('http://') || rawSrc.startsWith('https://')) {
            return fullMatch;
        }

        const altMatch = imgTag.match(/\balt=["']([^"']*)["']/i);
        const altText = altMatch ? altMatch[1] : '';

        const cleanSrc = rawSrc.split('?')[0].split('#')[0];
        const fileName = path.basename(cleanSrc);
        if (fileName.startsWith('cover.')) return ''; // Skip inline cover, handled by cover engine

        // 1. Direct path check relative to projectDir (e.g. "images_original/st03_11.svg")
        let resolvedPath = null;
        const directPath = path.join(projectDir, cleanSrc);
        if (fs.existsSync(directPath) && fs.statSync(directPath).isFile()) {
            resolvedPath = directPath;
        }

        // 2. If not found, check prioritized directories based on isVietnamese & fallback
        if (!resolvedPath) {
            const preferredDir = isVietnamese ? 'images_translated' : 'images_original';
            const fallbackDir = isVietnamese ? 'images_original' : 'images_translated';

            const candidates = [
                path.join(projectDir, preferredDir, fileName),
                path.join(projectDir, fallbackDir, fileName),
                path.join(projectDir, 'images', fileName),
                path.join(projectDir, fileName)
            ];

            for (const cand of candidates) {
                if (fs.existsSync(cand) && fs.statSync(cand).isFile()) {
                    resolvedPath = cand;
                    break;
                }
            }
        }

        if (!resolvedPath) {
            return fullMatch;
        }

        const fileRaw = fs.readFileSync(resolvedPath);
        const b64 = fileRaw.toString('base64');
        let mime = 'image/jpeg';
        let width = null;
        let height = null;

        const ext = path.extname(resolvedPath).toLowerCase();
        if (ext === '.png') mime = 'image/png';
        else if (ext === '.webp') mime = 'image/webp';
        else if (ext === '.svg') {
            mime = 'image/svg+xml';
            const dims = getSvgDimensions(fileRaw.toString('utf8'));
            width = dims.width;
            height = dims.height;
        }

        const isMarkdownParagraph = Boolean(pImg);

        // If this is custom HTML (not a standalone markdown <p><img/></p>), preserve user's tag structure & styles!
        if (!isMarkdownParagraph) {
            const base64Src = `data:${mime};base64,${b64}`;
            return imgTag.replace(/\bsrc=["'][^"']+["']/i, `src="${base64Src}"`);
        }

        // If image has custom inline style inside paragraph, preserve user's custom style
        if (imgTag.includes('style=')) {
            const base64Src = `data:${mime};base64,${b64}`;
            const updatedImg = imgTag.replace(/\bsrc=["'][^"']+["']/i, `src="${base64Src}"`);
            return `<div style="text-align: center; margin: 0.5em auto; padding: 0;">${updatedImg}</div>`;
        }

        const isFullPage = height && height >= 500;
        let dataAttrs = '';
        if (width) dataAttrs += ` data-design-width="${width}"`;
        if (height) dataAttrs += ` data-design-height="${height}"`;

        if (isFullPage) {
            // Full-page master diagram: Always start at fresh page and expand to max page size
            return `<figure class="book-figure figure-fullpage"${dataAttrs} style="page-break-before: always; break-before: page; margin: 0 auto; padding: 0;"><img src="data:${mime};base64,${b64}" alt="${altText || fileName}" style="max-width: 100%; max-height: calc(100vh - 20px); width: auto; height: auto; display: block; margin: 0 auto; padding: 0; object-fit: contain;" /></figure>`;
        } else {
            // Inline / Small-to-medium illustration: Maintain natural 1:1 size and fit within content flow
            const widthStyle = width ? `max-width: ${width}px; width: 100%;` : 'max-width: 100%;';
            return `<figure class="book-figure figure-inline"${dataAttrs} style="margin: 0.5em auto; padding: 0;"><img src="data:${mime};base64,${b64}" alt="${altText || fileName}" style="${widthStyle} max-height: 45vh; height: auto; display: block; margin: 0 auto; padding: 0; object-fit: contain;" /></figure>`;
        }
    });
}

/**
 * Returns CSS rules for figures and images
 */
function getImageCssRules() {
    return `
    /* ── Book Figure & Image Layout Rules ── */
    figure.book-figure {
      box-sizing: border-box;
      max-height: 100%;
      margin: 0.5em auto;
      padding: 0;
      text-align: center;
      page-break-inside: avoid;
      break-inside: avoid;
    }

    figure.book-figure.figure-fullpage {
      page-break-before: always;
      break-before: page;
      margin: 0 auto;
    }

    figure.book-figure img {
      display: block;
      margin: 0 auto;
      padding: 0;
      image-rendering: -webkit-optimize-contrast;
    }

    figure.book-figure.figure-fullpage img {
      max-width: 100%;
      max-height: calc(100vh - 20px);
      width: auto;
      height: auto;
      object-fit: contain;
    }

    figure.book-figure.figure-inline img {
      max-width: 100%;
      max-height: 45vh;
      height: auto;
      object-fit: contain;
    }
    `;
}

module.exports = {
    getSvgDimensions,
    processImagesInHtml,
    getImageCssRules
};
