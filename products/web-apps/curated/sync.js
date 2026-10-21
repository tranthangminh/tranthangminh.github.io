const fs = require('fs');
const path = require('path');
const https = require('https');
const http = require('http');

const CURATED_DIR = __dirname;
const ROOT_DIR = path.resolve(CURATED_DIR, '../../..');
const PRODUCTS_HTML = path.join(ROOT_DIR, 'products.html');
const INDEX_HTML = path.join(ROOT_DIR, 'index.html');
const SITEMAP_XML = path.join(ROOT_DIR, 'sitemap.xml');

// Hàm cào ảnh OpenGraph từ URL nếu chưa có ảnh
async function fetchOgImage(targetUrl) {
  return new Promise((resolve) => {
    try {
      const parsed = new URL(targetUrl);
      const client = parsed.protocol === 'https:' ? https : http;
      const req = client.get(targetUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
        },
        timeout: 8000
      }, (res) => {
        // Hỗ trợ redirect 301/302
        if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
          const redirectUrl = new URL(res.headers.location, targetUrl).toString();
          return resolve(fetchOgImage(redirectUrl));
        }
        if (res.statusCode !== 200) {
          return resolve(null);
        }
        let html = '';
        res.setEncoding('utf8');
        res.on('data', chunk => {
          html += chunk;
          // Chỉ cần đọc head là đủ tìm thấy og:image
          if (html.length > 500000 || html.includes('</head>')) {
            res.destroy();
          }
        });
        res.on('close', () => {
          const ogMatch = html.match(/<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i) ||
                          html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:image["']/i) ||
                          html.match(/<meta[^>]+name=["']twitter:image["'][^>]+content=["']([^"']+)["']/i);
          if (ogMatch && ogMatch[1]) {
            try {
              const fullImageUrl = new URL(ogMatch[1], targetUrl).toString();
              return resolve(fullImageUrl);
            } catch (e) {
              return resolve(null);
            }
          }
          resolve(null);
        });
      });
      req.on('error', () => resolve(null));
      req.on('timeout', () => {
        req.destroy();
        resolve(null);
      });
    } catch (e) {
      resolve(null);
    }
  });
}

// Hàm tải file ảnh từ URL về lưu thành file
async function downloadFile(url, destPath) {
  return new Promise((resolve) => {
    try {
      const parsed = new URL(url);
      const client = parsed.protocol === 'https:' ? https : http;
      const req = client.get(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
        },
        timeout: 15000
      }, (res) => {
        if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
          const redirectUrl = new URL(res.headers.location, url).toString();
          return resolve(downloadFile(redirectUrl, destPath));
        }
        if (res.statusCode !== 200) {
          return resolve(false);
        }
        const file = fs.createWriteStream(destPath);
        res.pipe(file);
        file.on('finish', () => {
          file.close(() => resolve(true));
        });
      });
      req.on('error', () => resolve(false));
      req.on('timeout', () => {
        req.destroy();
        resolve(false);
      });
    } catch (e) {
      resolve(false);
    }
  });
}

async function main() {
  console.log('----------------------------------------------------');
  console.log('  DONG BO HOA HE THONG WEB APPS (CURATED)');
  console.log('----------------------------------------------------');

  const items = [];
  const entries = fs.readdirSync(CURATED_DIR, { withFileTypes: true });
  
  // 1. Quét các thư mục phân loại, sắp xếp A-Z
  const categoryDirs = entries
    .filter(e => e.isDirectory())
    .map(e => e.name)
    .sort((a, b) => a.localeCompare(b, 'vi', { sensitivity: 'base' }));

  console.log(`[+] Phat hien ${categoryDirs.length} nhom phan loai:`);
  categoryDirs.forEach(cat => console.log(`    - ${cat}`));

  for (const cat of categoryDirs) {
    const catPath = path.join(CURATED_DIR, cat);
    const catFiles = fs.readdirSync(catPath);

    // Tìm các file .url hoặc .html
    const appNames = new Set();
    catFiles.forEach(f => {
      const ext = path.extname(f).toLowerCase();
      if (ext === '.url' || ext === '.html') {
        appNames.add(path.basename(f, ext));
      }
    });

    const sortedAppNames = Array.from(appNames).sort((a, b) => a.localeCompare(b, 'vi', { sensitivity: 'base' }));

    for (const appName of sortedAppNames) {
      const urlFile = path.join(catPath, `${appName}.url`);
      const htmlFile = path.join(catPath, `${appName}.html`);
      const pngFile = path.join(catPath, `${appName}.png`);

      let targetUrl = '';
      if (fs.existsSync(urlFile)) {
        const content = fs.readFileSync(urlFile, 'utf8');
        const match = content.match(/URL=(https?:\/\/[^\r\n]+)/i);
        if (match) targetUrl = match[1].trim();
      } else if (fs.existsSync(htmlFile)) {
        const content = fs.readFileSync(htmlFile, 'utf8');
        const match = content.match(/url=(https?:\/\/[^"'>]+)/i) || content.match(/href=["'](https?:\/\/[^"']+)["']/i);
        if (match) targetUrl = match[1].trim();
      }

      if (!targetUrl) {
        console.warn(`[!] Bo qua "${appName}" trong [${cat}] vi khong tim thay URL hop le.`);
        continue;
      }

      // Đảm bảo file .html tồn tại với mã nguồn tối giản (không chữ thừa)
      const cleanHtmlContent = `<!DOCTYPE html>
<html lang="vi">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta http-equiv="refresh" content="0; url=${targetUrl}">
    <meta name="robots" content="noindex, follow">
    <link rel="canonical" href="${targetUrl}">
    <script>window.location.replace("${targetUrl}");</script>
    <title>${appName}</title>
</head>
<body>
    <p><a href="${targetUrl}">${appName}</a></p>
</body>
</html>
`;
      fs.writeFileSync(htmlFile, cleanHtmlContent, 'utf8');

      // Kiểm tra file ảnh .png, nếu thiếu thì tự động fetch
      if (!fs.existsSync(pngFile)) {
        console.log(`[i] "${appName}" chua co anh .png. Dang tim anh OpenGraph tu: ${targetUrl}...`);
        const ogImgUrl = await fetchOgImage(targetUrl);
        if (ogImgUrl) {
          console.log(`    -> Tim thay: ${ogImgUrl}`);
          const downloaded = await downloadFile(ogImgUrl, pngFile);
          if (downloaded) {
            console.log(`    [OK] Da tai va luu: ${appName}.png`);
          } else {
            console.log(`    [!] Khong the tai anh ve may.`);
          }
        } else {
          console.log(`    [!] Khong tim thay og:image tu trang web.`);
        }
      }

      // Trích xuất domain gọn gàng
      let domain = '';
      try {
        const parsed = new URL(targetUrl);
        domain = parsed.hostname.replace(/^www\./, '');
        if (parsed.pathname && parsed.pathname.length > 1 && domain === 'jherr.github.io') {
          domain = `${domain}${parsed.pathname.replace(/\/$/, '')}`;
        }
      } catch (e) {
        domain = targetUrl;
      }

      items.push({
        category: cat,
        appName,
        displayTitle: appName,
        targetUrl,
        domain,
        htmlRelativePath: `products/web-apps/curated/${encodeURIComponent(cat)}/${encodeURIComponent(appName)}.html`,
        imgRelativePath: `products/web-apps/curated/${encodeURIComponent(cat)}/${encodeURIComponent(appName)}.png`,
        imgRelativePathUnencoded: `products/web-apps/curated/${cat}/${appName}.png`
      });
    }
  }

  console.log(`\n[+] Tong so web apps hop le: ${items.length}`);

  // Bảng màu cầu vồng tự động phân bổ đều từ Đỏ (~5°) tới Tím (~285°)
  const uniqueCats = Array.from(new Set(items.map(it => it.category)));
  const totalCats = uniqueCats.length;
  const categoryColorMap = {};

  uniqueCats.forEach((cat, idx) => {
    let hue = 5;
    if (totalCats > 1) {
      hue = Math.round(5 + (idx * (285 - 5)) / (totalCats - 1));
    }
    let lightness = 48;
    if (hue >= 40 && hue <= 85) {
      lightness = 38; // Vàng / hổ phách / chanh đậm để chữ trắng tương phản tuyệt đối
    } else if (hue > 85 && hue <= 165) {
      lightness = 38; // Xanh lục đậm
    } else if (hue > 165 && hue <= 200) {
      lightness = 42; // Xanh lam ngọc
    }
    const color = `hsl(${hue}, 82%, ${lightness}%)`;
    const glow = `hsla(${hue}, 82%, ${lightness}%, 0.45)`;
    categoryColorMap[cat] = { color, glow };
  });

  // 2. Cập nhật products.html
  if (fs.existsSync(PRODUCTS_HTML)) {
    console.log('[+] Dang cap nhat products.html...');
    let html = fs.readFileSync(PRODUCTS_HTML, 'utf8');

    // Tìm section web-apps
    const sectionRegex = /(<section[^>]*data-product-section="web-apps"[^>]*>[\s\S]*?<div class="products-grid">)([\s\S]*?)(<\/div>\s*<\/section>)/i;
    const match = html.match(sectionRegex);

    if (match) {
      const beforeGrid = match[1];
      const currentGridContent = match[2];
      const afterGrid = match[3];

      // Giữ lại 3 card in-house đầu tiên (01, 02, 03: Lucky Wheel, 52 Cards Tracker, Dice Roller 3D)
      const cardRegex = /<a class="product-card"[\s\S]*?<\/a>/gi;
      const cards = currentGridContent.match(cardRegex) || [];
      const inHouseCards = cards.slice(0, 3);

      // Tạo các card curated mới (bắt đầu từ số 04)
      let index = 4;
      const curatedCardsHtml = items.map(item => {
        const padIndex = String(index++).padStart(2, '0');
        const catTheme = categoryColorMap[item.category] || { color: 'var(--accent-primary)', glow: 'rgba(229, 9, 20, 0.35)' };
        return `
                    <a class="product-card" href="${item.htmlRelativePath}" target="_blank" rel="noopener noreferrer">
                        <div class="product-card-media">
                            <img src="${item.imgRelativePath}" alt="${item.displayTitle} Preview" loading="lazy">
                        </div>
                        <div class="product-card-body">
                            <div class="product-card-head">
                                <span class="product-card-badge">${padIndex}</span>
                                <div class="product-card-meta">
                                    <h3 class="product-card-title">${item.displayTitle}</h3>
                                    <span class="product-card-link">${item.domain}</span>
                                </div>
                            </div>
                            <div class="product-card-footer">
                                <span class="product-category-pill" style="--pill-color: ${catTheme.color}; --pill-glow: ${catTheme.glow};">${item.category}</span>
                                <span class="product-card-arrow" aria-hidden="true">&rarr;</span>
                            </div>
                        </div>
                    </a>`;
      }).join('\n');

      const newGridContent = '\n' + inHouseCards.map(c => c.trim()).join('\n\n') + '\n' + curatedCardsHtml + '\n                ';
      html = html.replace(sectionRegex, `${beforeGrid}${newGridContent}${afterGrid}`);
      fs.writeFileSync(PRODUCTS_HTML, html, 'utf8');
      console.log('    [OK] Da cap nhat products.html thanh cong voi day du anh va category!');
    } else {
      console.error('    [!] Khong tim thay the section web-apps trong products.html');
    }
  }

  // 3. Cập nhật index.html webapps showcase grid
  if (fs.existsSync(INDEX_HTML)) {
    console.log('[+] Dang cap nhat index.html...');
    let indexHtml = fs.readFileSync(INDEX_HTML, 'utf8');

    const gridRegex = /(<div class="webapps-showcase-grid">)([\s\S]*?)(<\/div>\s*<\/div>\s*<\/section>)/i;
    const gridMatch = indexHtml.match(gridRegex);

    if (gridMatch) {
      const beforeGrid = gridMatch[1];
      const currentGridContent = gridMatch[2];
      const afterGrid = gridMatch[3];

      // 3 button in-house đầu tiên (Lucky Wheel, 52 Cards Tracker, Dice Roller 3D)
      const inHouseBtnsHtml = `
                <a class="product-item-btn" href="products/web-apps/lucky-wheel.html">
                    <img src="products/web-apps/lucky-wheel.png" alt="Biểu tượng ứng dụng Lucky Wheel" width="30" height="30" class="product-item-btn-icon" loading="lazy">
                    <div class="product-item-btn-content">
                        <span class="product-item-btn-text">Lucky Wheel</span>
                        <span class="product-item-btn-tag" style="--tag-color: var(--accent-primary);" data-i18n="productsCatalog.tags.webApp">Web App</span>
                    </div>
                </a>

                <a class="product-item-btn" href="products/web-apps/52-cards-tracker.html">
                    <img src="products/web-apps/52-cards-tracker.png" alt="Biểu tượng ứng dụng 52 Cards Tracker" width="30" height="30" class="product-item-btn-icon" loading="lazy">
                    <div class="product-item-btn-content">
                        <span class="product-item-btn-text">52 Cards Tracker</span>
                        <span class="product-item-btn-tag" style="--tag-color: var(--accent-primary);" data-i18n="productsCatalog.tags.webApp">Web App</span>
                    </div>
                </a>

                <a class="product-item-btn" href="products/web-apps/dice-roller.html">
                    <img src="products/web-apps/dice-roller.svg" alt="Biểu tượng ứng dụng Dice Roller 3D" width="30" height="30" class="product-item-btn-icon" loading="lazy">
                    <div class="product-item-btn-content">
                        <span class="product-item-btn-text">Dice Roller 3D</span>
                        <span class="product-item-btn-tag" style="--tag-color: var(--accent-primary);" data-i18n="productsCatalog.tags.webApp">Web App</span>
                    </div>
                </a>`;

      // Tạo các button web app sưu tầm theo thứ tự đồng bộ kèm tag phân loại cầu vồng
      const curatedBtnsHtml = items.map(item => {
        const catTheme = categoryColorMap[item.category] || { color: 'var(--accent-primary)', glow: 'rgba(229, 9, 20, 0.35)' };
        return `
                <a class="product-item-btn" href="${item.targetUrl}" target="_blank" rel="noopener noreferrer">
                    <img src="${item.imgRelativePath}" alt="Biểu tượng tiện ích ${item.displayTitle}" width="30" height="30" class="product-item-btn-icon" loading="lazy">
                    <div class="product-item-btn-content">
                        <span class="product-item-btn-text">${item.displayTitle}</span>
                        <span class="product-item-btn-tag" style="--tag-color: ${catTheme.color};">${item.category}</span>
                    </div>
                </a>`;
      }).join('\n');

      const newGridContent = '\n' + inHouseBtnsHtml.trim() + '\n' + curatedBtnsHtml + '\n            ';
      indexHtml = indexHtml.replace(gridRegex, `${beforeGrid}${newGridContent}${afterGrid}`);

      fs.writeFileSync(INDEX_HTML, indexHtml, 'utf8');
      console.log('    [OK] Da cap nhat index.html voi toan bo danh sach web apps!');
    } else {
      console.warn('    [!] Khong tim thay .webapps-showcase-grid trong index.html');
    }
  }

  // 4. Cập nhật sitemap.xml
  if (fs.existsSync(SITEMAP_XML)) {
    const today = new Date().toISOString().split('T')[0];
    let sitemap = fs.readFileSync(SITEMAP_XML, 'utf8');
    sitemap = sitemap.replace(
      /(<loc>https:\/\/tranthangminh\.github\.io\/products\.html<\/loc>\s*<lastmod>)[^<]+(<\/lastmod>)/i,
      `$1${today}$2`
    );
    fs.writeFileSync(SITEMAP_XML, sitemap, 'utf8');
    console.log(`    [OK] Da cap nhat sitemap.xml voi ngay moi nhat: ${today}`);
  }

  console.log('\n====================================================');
  console.log('  DONG BO HOAN TAT 100%! GIAO DIEN DA SAN SANG.');
  console.log('====================================================');
}

function escapeRegExp(string) {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

main().catch(err => {
  console.error('[!] Co loi xay ra:', err);
  process.exit(1);
});
