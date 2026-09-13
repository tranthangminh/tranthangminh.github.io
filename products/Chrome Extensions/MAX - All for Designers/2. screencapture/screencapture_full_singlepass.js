/**
 * screencapture_full_singlepass.js — MAX Design Power-Pack
 * Minimal Single-Pass CDP Re-render & Section Snap Full Page Screenshot Module.
 * - Mode 1 (Normal Pages <= 16,000px): 1-shot Single-Pass CDP Re-render (0% DOM mutations).
 * - Mode 2 (Pages > 16,000px): Tiered CDP Big-Chunking.
 * - Mode 3 (Section Snap / Fullpage.js): Slide-by-slide Section Snap Capture.
 */

async function captureSinglePassFullPage(options) {
  const { tab, pageInfo, fmt, saved, isCdpScaled, scale } = options;
  const tabId = tab.id;
  const MAX_SAFE_CDP_HEIGHT = 16000;

  try {
    const maxHSetting = saved.maxCaptureHeight !== undefined ? (parseInt(saved.maxCaptureHeight, 10) || 0) : 16000;
    const maxWSetting = parseInt(saved.maxCaptureWidth, 10) || 0;

    const uncappedMaxScroll = Math.max(0, (pageInfo.scrollHeight || 0) - (pageInfo.clientHeight || 0));
    const maxWarmupScroll = maxHSetting > 0 ? Math.min(uncappedMaxScroll, maxHSetting) : uncappedMaxScroll;

    // 1. Pre-flight lazy-load warmup pass (capped at maxCaptureHeight if set)
    await chrome.scripting.executeScript({
      target: { tabId: tabId },
      args: [maxWarmupScroll],
      func: async (maxScroll) => {
        let scrollTarget = window;
        let maxPos = maxScroll;

        if (window.__maxScreenCapture && window.__maxScreenCapture.findScrollableTarget) {
          const res = window.__maxScreenCapture.findScrollableTarget();
          if (res && res.elt && res.scrollHeight > res.clientHeight) {
            scrollTarget = res.elt;
            maxPos = Math.min(res.scrollHeight - res.clientHeight, maxScroll);
          }
        }

        if (scrollTarget === window) {
          window.scrollTo({ top: maxPos, left: 0, behavior: 'instant' });
          await new Promise((r) => setTimeout(r, 200));
          window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
        } else {
          scrollTarget.scrollTop = maxPos;
          await new Promise((r) => setTimeout(r, 200));
          scrollTarget.scrollTop = 0;
        }
        await new Promise((r) => setTimeout(r, 100));

        if (window.__maxScreenCapture && window.__maxScreenCapture.warmupLazyLoad) {
          await window.__maxScreenCapture.warmupLazyLoad();
        }
      }
    });

    await updateWebProgressHUDBg(tabId, 30, 'Measuring page layout...');

    // Check if page is a Section Snap / Fullpage.js site (e.g. tranthangminh.github.io)
    const snapCheckResult = await chrome.scripting.executeScript({
      target: { tabId: tabId },
      func: () => {
        if (window.__maxScreenCapture && window.__maxScreenCapture.isSnapPage) {
          return {
            isSnap: window.__maxScreenCapture.isSnapPage(),
            sectionCount: (window.__maxScreenCapture.findSnapSections() || []).length
          };
        }
        return { isSnap: false, sectionCount: 0 };
      }
    });
    const snapInfo = (snapCheckResult && snapCheckResult[0]) ? snapCheckResult[0].result : { isSnap: false, sectionCount: 0 };

    // 2. Pure layout measurement
    const dimsResult = await chrome.scripting.executeScript({
      target: { tabId: tabId },
      func: () => {
        const docH = Math.max(
          document.documentElement.scrollHeight || 0,
          document.body ? document.body.scrollHeight || 0 : 0,
          window.innerHeight || 0
        );
        let containerTotalH = 0;
        if (window.__maxScreenCapture && window.__maxScreenCapture.findScrollableTarget) {
          const target = window.__maxScreenCapture.findScrollableTarget();
          if (target && target.elt && target.scrollHeight > target.clientHeight) {
            const rect = target.elt.getBoundingClientRect();
            const topOffset = Math.max(0, rect.top + (window.scrollY || 0));
            containerTotalH = topOffset + target.scrollHeight;
          }
        }
        return {
          viewportWidth: window.innerWidth || document.documentElement.clientWidth || 1920,
          fullHeight: Math.max(docH, containerTotalH),
          baseDpr: window.devicePixelRatio || 1
        };
      }
    });

    const dims = (dimsResult && dimsResult[0]) ? dimsResult[0].result : {
      viewportWidth: pageInfo.clientWidth || 1920,
      fullHeight: pageInfo.scrollHeight || 1080,
      baseDpr: 1
    };

    // Get official Chrome browser zoom factor (Ctrl + mouse wheel zoom level)
    const zoomFactor = await new Promise(r => chrome.tabs.getZoom(tabId, (z) => r(z || 1)));

    const rawWidth = Math.max(100, pageInfo.clientWidth || dims.viewportWidth || 1920);
    const rawHeight = Math.max(100, dims.fullHeight);

    // Apply user formula for both width and height: raw * zoomFactor (e.g., 1000 * 0.75 = 750px)
    const fullWidth  = (zoomFactor && zoomFactor !== 1) ? Math.round(rawWidth  * zoomFactor) : rawWidth;
    const fullHeight = (zoomFactor && zoomFactor !== 1) ? Math.round(rawHeight * zoomFactor) : rawHeight;

    const effectiveScale = Math.min(Math.max(1, parseInt(scale, 10) || 1), 2);
    const targetDpr = effectiveScale;

    // 3. Attach debugger for CDP
    await new Promise((resolve) => {
      chrome.debugger.attach({ tabId: tabId }, '1.3', () => {
        if (chrome.runtime.lastError) {}
        resolve();
      });
    });

    const helper = typeof CDPScaleHelper !== 'undefined' ? CDPScaleHelper : (typeof self !== 'undefined' ? self.CDPScaleHelper : null);
    const cdpFormatInfo = helper && typeof helper.resolveCdpFormat === 'function'
      ? helper.resolveCdpFormat(fmt.mime)
      : { cdpFormat: 'png', mimePrefix: 'data:image/png;base64,' };

    const cdpParams = { format: cdpFormatInfo.cdpFormat, fromSurface: true };
    if (cdpFormatInfo.cdpFormat === 'jpeg' && cdpFormatInfo.quality !== undefined) {
      cdpParams.quality = cdpFormatInfo.quality;
    }

    const chunkScreenshots = [];
    const scrollSteps = [];
    const chunkHeights = [];

    // Hide progress HUD right before capture
    await chrome.scripting.executeScript({
      target: { tabId: tabId },
      func: () => {
        const hud = document.getElementById('max-capture-progress-hud');
        if (hud) hud.style.setProperty('visibility', 'hidden', 'important');
      }
    });

    if (snapInfo.isSnap && snapInfo.sectionCount >= 2) {
      // 🚀 Mode C: Section Snap Capture (Fullpage.js / Wheel Scroll Sites)
      const totalSlides = snapInfo.sectionCount;
      await updateWebProgressHUDBg(tabId, 40, `Capturing ${totalSlides} Section Snap slides...`);

      for (let sIdx = 0; sIdx < totalSlides; sIdx++) {
        const pct = Math.round(40 + ((sIdx + 1) / totalSlides) * 45);
        await updateWebProgressHUDBg(tabId, pct, `Capturing slide ${sIdx + 1}/${totalSlides}...`);

        // Trigger slide navigation
        await chrome.scripting.executeScript({
          target: { tabId: tabId },
          args: [sIdx],
          func: async (idx) => {
            if (window.__maxScreenCapture && window.__maxScreenCapture.triggerSnapStep) {
              await window.__maxScreenCapture.triggerSnapStep(idx);
            }
          }
        });

        await new Promise(r => setTimeout(r, 350));

        const captureResult = await new Promise((resolve, reject) => {
          chrome.debugger.sendCommand(
            { tabId: tabId },
            'Page.captureScreenshot',
            cdpParams,
            (res) => {
              if (chrome.runtime.lastError) reject(new Error(chrome.runtime.lastError.message));
              else if (!res || !res.data) reject(new Error('Page.captureScreenshot returned empty data'));
              else resolve(res);
            }
          );
        });

        chunkScreenshots.push(cdpFormatInfo.mimePrefix + captureResult.data);
        scrollSteps.push(sIdx * (pageInfo.clientHeight || 1080));
        chunkHeights.push(pageInfo.clientHeight || 1080);
      }

    } else if (fullHeight <= MAX_SAFE_CDP_HEIGHT) {
      // 🚀 Mode A: Standard Single-Pass CDP 1-Shot (Pages <= 16,000px)
      await updateWebProgressHUDBg(tabId, 60, 'Capturing single-pass screenshot...');

      await new Promise((resolve, reject) => {
        chrome.debugger.sendCommand(
          { tabId: tabId },
          'Emulation.setDeviceMetricsOverride',
          {
            width: fullWidth,
            height: fullHeight,
            deviceScaleFactor: targetDpr,
            mobile: false
          },
          (res) => {
            if (chrome.runtime.lastError) reject(new Error(chrome.runtime.lastError.message));
            else resolve(res);
          }
        );
      });

      // Force layout reflow & repaint flush so virtualized apps (YouTube, TikTok) rasterize all 2x images
      await chrome.scripting.executeScript({
        target: { tabId: tabId },
        func: () => {
          window.scrollBy(0, 1);
          window.scrollBy(0, -1);
          if (document.body) {
            const _ = document.body.offsetHeight; // Force reflow
          }
        }
      }).catch(() => {});

      if (targetDpr > 1) {
        await new Promise(r => setTimeout(r, 500));
      } else {
        await new Promise(r => setTimeout(r, 200));
      }

      const captureResult = await new Promise((resolve, reject) => {
        chrome.debugger.sendCommand(
          { tabId: tabId },
          'Page.captureScreenshot',
          cdpParams,
          (res) => {
            if (chrome.runtime.lastError) reject(new Error(chrome.runtime.lastError.message));
            else if (!res || !res.data) reject(new Error('Page.captureScreenshot returned empty data'));
            else resolve(res);
          }
        );
      });

      chunkScreenshots.push(cdpFormatInfo.mimePrefix + captureResult.data);
      scrollSteps.push(0);
      chunkHeights.push(fullHeight);

    } else {
      // 🚀 Mode B: CDP Big-Chunking Tiered Strategy (Pages > 16,000px)
      const numChunks = Math.ceil(fullHeight / MAX_SAFE_CDP_HEIGHT);
      await updateWebProgressHUDBg(tabId, 45, `Capturing ${numChunks} large CDP chunks...`);

      for (let i = 0; i < numChunks; i++) {
        const chunkTop = i * MAX_SAFE_CDP_HEIGHT;
        const currentChunkHeight = Math.min(MAX_SAFE_CDP_HEIGHT, fullHeight - chunkTop);
        const progress = 45 + Math.round(((i + 1) / numChunks) * 40);

        await updateWebProgressHUDBg(tabId, progress, `Capturing chunk ${i + 1}/${numChunks}...`);

        await chrome.scripting.executeScript({
          target: { tabId: tabId },
          args: [chunkTop],
          func: (top) => window.scrollTo({ top: top, left: 0, behavior: 'instant' })
        });

        await new Promise((resolve, reject) => {
          chrome.debugger.sendCommand(
            { tabId: tabId },
            'Emulation.setDeviceMetricsOverride',
            {
              width: fullWidth,
              height: currentChunkHeight,
              deviceScaleFactor: targetDpr,
              mobile: false
            },
            (res) => {
              if (chrome.runtime.lastError) reject(new Error(chrome.runtime.lastError.message));
              else resolve(res);
            }
          );
        });

        // Force layout reflow & repaint flush so virtualized apps (YouTube, TikTok) rasterize all 2x images
        await chrome.scripting.executeScript({
          target: { tabId: tabId },
          func: () => {
            window.scrollBy(0, 1);
            window.scrollBy(0, -1);
            if (document.body) {
              const _ = document.body.offsetHeight; // Force reflow
            }
          }
        }).catch(() => {});

        if (targetDpr > 1) {
          await new Promise(r => setTimeout(r, 500));
        } else {
          await new Promise(r => setTimeout(r, 250));
        }

        const captureResult = await new Promise((resolve, reject) => {
          chrome.debugger.sendCommand(
            { tabId: tabId },
            'Page.captureScreenshot',
            cdpParams,
            (res) => {
              if (chrome.runtime.lastError) reject(new Error(chrome.runtime.lastError.message));
              else if (!res || !res.data) reject(new Error('Page.captureScreenshot returned empty data'));
              else resolve(res);
            }
          );
        });

        chunkScreenshots.push(cdpFormatInfo.mimePrefix + captureResult.data);
        scrollSteps.push(chunkTop);
        chunkHeights.push(currentChunkHeight);
      }
    }

    // 4. Instantly restore original device metrics & detach debugger
    try {
      await new Promise(r => chrome.debugger.sendCommand({ tabId: tabId }, 'Emulation.clearDeviceMetricsOverride', {}, r));
      await new Promise(r => chrome.debugger.detach({ tabId: tabId }, r));
    } catch (e) {}

    // Restore progress HUD & original scroll position
    await chrome.scripting.executeScript({
      target: { tabId: tabId },
      args: [pageInfo.originalScrollTop || 0],
      func: (origScrollTop) => {
        const hud = document.getElementById('max-capture-progress-hud');
        if (hud) hud.style.setProperty('visibility', 'visible', 'important');
        window.scrollTo(0, origScrollTop);
      }
    }).catch(() => {});

    await updateWebProgressHUDBg(tabId, 88, 'Stitching screenshots on Offscreen Canvas...');

    // 5. Stitch & Scale screenshots on Offscreen Canvas
    let finalDataUrl = chunkScreenshots[0];
    const totalStitchHeight = snapInfo.isSnap && snapInfo.sectionCount >= 2
      ? chunkHeights.reduce((a, b) => a + b, 0)
      : fullHeight;

    const baseScaledW = Math.round(fullWidth * targetDpr);
    const baseScaledH = Math.round(totalStitchHeight * targetDpr);

    const { targetWidth: targetW, targetHeight: targetH } = typeof computeMaxDimensionLimits === 'function'
      ? computeMaxDimensionLimits(baseScaledW, baseScaledH, maxWSetting, maxHSetting)
      : { targetWidth: baseScaledW, targetHeight: baseScaledH };

    const needsCanvasPass = chunkScreenshots.length > 1 || 
                            fmt.mime === 'image/webp' || 
                            targetW !== baseScaledW || 
                            targetH !== baseScaledH;

    if (needsCanvasPass) {
      const stitchResult = await stitchScreenshotsOffscreen({
        screenshots: chunkScreenshots,
        scrollSteps: scrollSteps,
        scrollHeight: totalStitchHeight,
        clientHeight: chunkHeights[0] || fullHeight,
        clientWidth: fullWidth,
        devicePixelRatio: targetDpr,
        format: fmt.mime === 'image/jpeg' ? 'jpg' : (fmt.mime === 'image/webp' ? 'webp' : 'png'),
        scaleMultiplier: null,
        targetWidth: targetW,
        targetHeight: targetH
      });
      if (stitchResult && stitchResult.parts && stitchResult.parts[0]) {
        finalDataUrl = stitchResult.parts[0];
      }
    }

    await updateWebProgressHUDBg(tabId, 100, 'Completed!');
    await removeWebProgressHUDBg(tabId, 600);

    // 6. Save file and record in captureHistory
    let folderPrefix = '';
    if (saved.downloadLocation === 'subfolder') {
      const folder = (saved.subfolderName || 'MAX Downloads').replace(/[/\\]+$/, '');
      folderPrefix = folder + '/';
    }

    const title = tab.title ? sanitizeFilenameForScreenCapture(tab.title) : 'fullpage';
    const timestamp = getFormattedTimestampForScreenCapture();
    const filename = (folderPrefix || '') + `${title} - ${timestamp}.${fmt.ext}`;

    downloadSingleResource(finalDataUrl, filename, {
      callback: (downloadId) => {
        const newItem = {
          id: 'cap_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4),
          filename: filename,
          ext: fmt.ext.toUpperCase(),
          width: targetW,
          height: targetH,
          timestamp: Date.now(),
          pageTitle: tab.title || 'Webpage',
          pageUrl: tab.url || '',
          downloadId: downloadId
        };
        if (typeof saveVerifiedCaptureHistoryItem === 'function') {
          saveVerifiedCaptureHistoryItem(newItem);
        } else {
          chrome.storage.local.get({ captureHistory: [] }, (res) => {
            let history = res.captureHistory || [];
            history = [newItem, ...history.filter(h => h.filename !== newItem.filename)].slice(0, 20);
            chrome.storage.local.set({ captureHistory: history });
          });
        }
      }
    });

    chrome.scripting.executeScript({
      target: { tabId: tabId },
      func: (name) => {
        if (typeof showToast === 'function') {
          showToast(`Full Page Screenshot saved: ${name}`);
        }
      },
      args: [filename]
    }).catch(() => {});

    return true;

  } catch (err) {
    console.warn('CDP Full Page capture failed:', err);
    try {
      await new Promise(r => chrome.debugger.sendCommand({ tabId: tabId }, 'Emulation.clearDeviceMetricsOverride', {}, r));
      await new Promise(r => chrome.debugger.detach({ tabId: tabId }, r));
    } catch (e) {}

    await chrome.scripting.executeScript({
      target: { tabId: tabId },
      args: [pageInfo ? pageInfo.originalScrollTop || 0 : 0],
      func: (origScrollTop) => {
        window.scrollTo(0, origScrollTop);
      }
    }).catch(() => {});

    return false;
  }
}

// Export for background service worker
if (typeof self !== 'undefined') {
  self.captureSinglePassFullPage = captureSinglePassFullPage;
}
if (typeof window !== 'undefined') {
  window.captureSinglePassFullPage = captureSinglePassFullPage;
}
