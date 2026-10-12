/**
 * screencapture_debugger.js — Chrome DevTools Protocol (CDP) Device Scale Helper
 * Forces Chrome to re-render webpage DOM at 2x or 3x Device Pixel Ratio for High-Res Capture
 */

const CDPScaleHelper = {
  activeTabs: new Set(),

  /**
   * Resolve CDP-compatible format string and quality from MIME type.
   * CDP Page.captureScreenshot only accepts 'png' or 'jpeg'.
   * WebP must be captured as PNG then converted in canvas.
   * @param {string} mime e.g. 'image/jpeg', 'image/png', 'image/webp'
   * @returns {{ cdpFormat: 'png'|'jpeg', quality: number|undefined, mimePrefix: string }}
   */
  resolveCdpFormat(mime) {
    if (mime === 'image/jpeg') {
      return { cdpFormat: 'jpeg', quality: 92, mimePrefix: 'data:image/jpeg;base64,' };
    }
    // PNG, WebP, GIF — all captured as PNG; WebP/GIF conversion happens in canvas downstream
    return { cdpFormat: 'png', quality: undefined, mimePrefix: 'data:image/png;base64,' };
  },

  /**
   * Capture a high-DPI screenshot of the tab using CDP Page.captureScreenshot
   * @param {number} tabId
   * @param {number} scaleFactor 1, 2, or 3
   * @param {string} [mime] Target MIME type (image/png, image/jpeg, image/webp). Defaults to image/png.
   * @returns {Promise<string|null>} base64 dataUrl
   */
  async captureHighDpiScreenshot(tabId, scaleFactor = 1, mime = 'image/png') {
    if (!tabId || typeof chrome === 'undefined' || !chrome.debugger) return null;

    const { cdpFormat, quality, mimePrefix } = this.resolveCdpFormat(mime);

    try {
      // 1. Attach debugger
      await new Promise((resolve, reject) => {
        chrome.debugger.attach({ tabId }, '1.3', () => {
          if (chrome.runtime.lastError) reject(new Error(chrome.runtime.lastError.message));
          else resolve();
        });
      });

      this.activeTabs.add(tabId);

      // 2. Measure layout DPR
      const layoutResults = await chrome.scripting.executeScript({
        target: { tabId },
        func: () => ({
          baseDpr: window.devicePixelRatio || 1
        })
      });

      const baseDpr = (layoutResults && layoutResults[0]) ? layoutResults[0].result.baseDpr : 1;
      const targetDpr = baseDpr * scaleFactor;

      // 3. Set Device Metrics Override in CDP (width: 0, height: 0 keeps viewport dimensions, overrides DPR)
      await new Promise((resolve, reject) => {
        chrome.debugger.sendCommand(
          { tabId },
          'Emulation.setDeviceMetricsOverride',
          {
            width: 0,
            height: 0,
            deviceScaleFactor: targetDpr,
            mobile: false
          },
          (res) => {
            if (chrome.runtime.lastError) reject(new Error(chrome.runtime.lastError.message));
            else resolve(res);
          }
        );
      });

      // Pause to allow Blink compositor to commit the frame re-render
      await new Promise(r => setTimeout(r, 250));

      // 4. Capture screenshot via CDP Page.captureScreenshot directly from compositor buffer
      const cdpParams = { format: cdpFormat, fromSurface: true };
      if (cdpFormat === 'jpeg' && quality !== undefined) cdpParams.quality = quality;

      const captureResult = await new Promise((resolve, reject) => {
        chrome.debugger.sendCommand(
          { tabId },
          'Page.captureScreenshot',
          cdpParams,
          (res) => {
            if (chrome.runtime.lastError) reject(new Error(chrome.runtime.lastError.message));
            else if (!res || !res.data) reject(new Error('Page.captureScreenshot returned empty data'));
            else resolve(res);
          }
        );
      });

      // 5. Restore device metrics & detach
      await this.clearTabDevicePixelRatio(tabId);

      return mimePrefix + captureResult.data;

    } catch (err) {
      console.warn('CDP High-DPI Capture failed:', err);
      await this.clearTabDevicePixelRatio(tabId);
      return null;
    }
  },

  /**
   * Set High-DPI DPR on a tab for multi-step capture (e.g. Full Page)
   * @param {number} tabId 
   * @param {number} scaleFactor 1, 2, or 3
   * @returns {Promise<boolean>} Success status
   */
  async setTabDevicePixelRatio(tabId, scaleFactor) {
    if (!tabId || scaleFactor <= 1) return false;
    if (typeof chrome === 'undefined' || !chrome.debugger) return false;

    try {
      await new Promise((resolve, reject) => {
        chrome.debugger.attach({ tabId }, '1.3', () => {
          if (chrome.runtime.lastError) reject(new Error(chrome.runtime.lastError.message));
          else resolve();
        });
      });

      this.activeTabs.add(tabId);

      const layoutResults = await chrome.scripting.executeScript({
        target: { tabId },
        func: () => ({ baseDpr: window.devicePixelRatio || 1 })
      });

      const baseDpr = (layoutResults && layoutResults[0]) ? layoutResults[0].result.baseDpr : 1;
      const targetDpr = baseDpr * scaleFactor;

      await new Promise((resolve, reject) => {
        chrome.debugger.sendCommand(
          { tabId },
          'Emulation.setDeviceMetricsOverride',
          {
            width: 0,
            height: 0,
            deviceScaleFactor: targetDpr,
            mobile: false
          },
          (res) => {
            if (chrome.runtime.lastError) reject(new Error(chrome.runtime.lastError.message));
            else resolve(res);
          }
        );
      });

      await new Promise(r => setTimeout(r, 250));
      return true;

    } catch (err) {
      console.warn('CDP setTabDevicePixelRatio failed:', err);
      await this.clearTabDevicePixelRatio(tabId);
      return false;
    }
  },

  /**
   * Capture single frame from attached CDP tab or fallback.
   * Used by full-page multi-step capture — always captures intermediate frames as PNG
   * (final output format conversion happens during stitching via stitchScreenshots).
   * @param {number} tabId
   * @param {number} windowId
   * @returns {Promise<string|null>} PNG dataUrl
   */
  async captureFrame(tabId, windowId) {
    if (this.activeTabs.has(tabId)) {
      try {
        const res = await new Promise((resolve, reject) => {
          chrome.debugger.sendCommand({ tabId }, 'Page.captureScreenshot', { format: 'png', fromSurface: true }, (r) => {
            if (chrome.runtime.lastError || !r || !r.data) reject();
            else resolve('data:image/png;base64,' + r.data);
          });
        });
        if (res) return res;
      } catch (e) {}
    }
    return new Promise((resolve) => {
      chrome.tabs.captureVisibleTab(windowId, { format: 'png' }, (res) => resolve(res));
    });
  },

  /**
   * Restore original Device Pixel Ratio and detach debugger
   * @param {number} tabId 
   */
  async clearTabDevicePixelRatio(tabId) {
    if (!tabId || typeof chrome === 'undefined' || !chrome.debugger) return;

    if (this.activeTabs.has(tabId)) {
      try {
        await new Promise((resolve) => {
          chrome.debugger.sendCommand({ tabId }, 'Emulation.clearDeviceMetricsOverride', {}, () => resolve());
        });
      } catch (e) {}

      try {
        await new Promise((resolve) => {
          chrome.debugger.detach({ tabId }, () => resolve());
        });
      } catch (e) {}

      this.activeTabs.delete(tabId);
    }
  }
};

if (typeof self !== 'undefined') {
  self.CDPScaleHelper = CDPScaleHelper;
}
if (typeof window !== 'undefined') {
  window.CDPScaleHelper = CDPScaleHelper;
}
