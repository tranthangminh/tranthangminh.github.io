// Content Script running inside all iframes (sub_frames) to track URL navigation dynamically
(function() {
  // Run strictly inside sub-frames (iframes)
  if (window.self !== window.top) {
    let lastUrl = window.location.href;

    function notifyUrlChange() {
      const currentUrl = window.location.href;
      
      // Only send message if URL has actually changed
      if (currentUrl !== lastUrl) {
        lastUrl = currentUrl;
        chrome.runtime.sendMessage({
          type: "SUBFRAME_URL_CHANGED",
          url: currentUrl
        }).catch(() => {
          // Silent catch to handle context invalidation on extension reloads
        });
      }
    }

    // ----------------------------------------------------
    // Audio Detection Observer inside embedded subframes
    // ----------------------------------------------------
    function checkMediaPlaying() {
      const mediaEls = document.querySelectorAll("audio, video");
      let isPlaying = false;
      mediaEls.forEach(el => {
        if (!el.paused && !el.ended && el.volume > 0 && !el.muted) {
          isPlaying = true;
        }
      });
      return isPlaying;
    }

    function notifyAudioStatus(playing) {
      try {
        window.parent.postMessage({
          type: "MAX_AUDIO_STATE",
          isAudible: playing,
          tabId: window.name || "",
          url: window.location.href
        }, "*");
      } catch (e) {}
    }

    document.addEventListener("play", () => notifyAudioStatus(true), true);
    document.addEventListener("playing", () => notifyAudioStatus(true), true);
    document.addEventListener("timeupdate", () => {
      if (checkMediaPlaying()) notifyAudioStatus(true);
    }, true);
    document.addEventListener("pause", () => {
      setTimeout(() => notifyAudioStatus(checkMediaPlaying()), 300);
    }, true);
    document.addEventListener("ended", () => {
      setTimeout(() => notifyAudioStatus(checkMediaPlaying()), 300);
    }, true);

    setInterval(() => {
      const playing = checkMediaPlaying();
      notifyAudioStatus(playing);
    }, 1000);

    // Send the initial URL as soon as the content script injects
    chrome.runtime.sendMessage({
      type: "SUBFRAME_URL_CHANGED",
      url: window.location.href
    }).catch(() => {});

    // Listen to hash (anchor) changes
    window.addEventListener("hashchange", notifyUrlChange);
    
    // Listen to popstate (back/forward browser action in SPA)
    window.addEventListener("popstate", notifyUrlChange);

    // Periodic check (every 600ms) to detect pushState/replaceState changes in SPAs (Reddit, Facebook, etc.)
    setInterval(notifyUrlChange, 600);

    let lastHandledPromptId = null;
    let lastHandledPromptTime = 0;

    // Listen for AI Prompt synchronization messages via Extension API
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
      if (message && message.type === "AI_SYNC_PROMPT") {
        handleAISyncPrompt(message.prompt, message.promptId);
      }
    });

    // Also listen for direct window postMessage from parent Dashboard tab
    window.addEventListener("message", (event) => {
      if (event && event.data && event.data.type === "AI_SYNC_PROMPT") {
        handleAISyncPrompt(event.data.prompt, event.data.promptId);
      }
    });

    // Helper: Bypass React value setter tracking on HTMLTextAreaElement/HTMLInputElement
    function setNativeInputValue(element, value) {
      if (!element) return;
      element.focus();
      const valueSetter = Object.getOwnPropertyDescriptor(element, 'value')?.set;
      const prototype = Object.getPrototypeOf(element);
      const prototypeValueSetter = Object.getOwnPropertyDescriptor(prototype, 'value')?.set;

      if (prototypeValueSetter && valueSetter !== prototypeValueSetter) {
        prototypeValueSetter.call(element, value);
      } else if (valueSetter) {
        valueSetter.call(element, value);
      } else {
        element.value = value;
      }
      element.dispatchEvent(new Event('input', { bubbles: true }));
      element.dispatchEvent(new Event('change', { bubbles: true }));
    }

    // Helper: Native execCommand text injection for contenteditable editors (Draft.js, ProseMirror, Quill)
    function setNativeContentEditableValue(element, value) {
      if (!element) return;
      element.focus();
      try {
        const doc = element.ownerDocument || window.document;
        doc.execCommand('selectAll', false, null);
        doc.execCommand('insertText', false, value);
      } catch (e) {
        element.innerText = value;
      }
      element.dispatchEvent(new Event('input', { bubbles: true }));
      element.dispatchEvent(new Event('change', { bubbles: true }));
    }

    function isStopButton(btn) {
      if (!btn) return false;
      const label = (btn.getAttribute('aria-label') || '' ) + (btn.getAttribute('title') || '') + (btn.innerText || '');
      const lower = label.toLowerCase();
      return lower.includes('stop') || lower.includes('dừng') || lower.includes('cancel');
    }

    const AI_SITE_SELECTORS = [
      {
        match: "chatgpt.com",
        input: '#prompt-textarea, textarea[placeholder*="Ask"], div[contenteditable="true"]',
        btn: 'button[data-testid="send-button"], button[data-testid*="send"], button[aria-label*="Send"]'
      },
      {
        match: "gemini.google.com",
        input: '.ql-editor[contenteditable="true"], rich-textarea .ql-editor, rich-textarea textarea',
        btn: '.send-button-container button, button[aria-label="Send message"], button[aria-label*="Send"], button[aria-label*="Gửi"]'
      },
      {
        match: "claude.ai",
        input: 'div[contenteditable="true"], .ProseMirror[contenteditable="true"], [data-testid="textarea"]',
        btn: 'button[aria-label="Send Message"], button[aria-label*="Send" i]'
      },
      {
        match: "deepseek.com",
        input: '#chat-input, textarea',
        btn: 'div[class*="send-btn"], button[class*="send"], div[class*="send"]'
      },
      {
        match: "perplexity.ai",
        input: 'textarea[placeholder*="Ask"], textarea',
        btn: 'button[aria-label*="Submit"], button[aria-label*="Send"], button[class*="bg-super"]'
      }
    ];

    function handleAISyncPrompt(prompt, promptId) {
      if (!prompt) return;

      const now = Date.now();
      if ((promptId && promptId === lastHandledPromptId) || (now - lastHandledPromptTime < 600)) {
        return; // Deduplicate execution within 600ms
      }
      if (promptId) lastHandledPromptId = promptId;
      lastHandledPromptTime = now;

      const host = window.location.hostname.toLowerCase();
      const siteConfig = AI_SITE_SELECTORS.find(c => host.includes(c.match));

      const inputSelector = siteConfig ? siteConfig.input : 'textarea, div[contenteditable="true"]';
      const btnSelector = siteConfig ? siteConfig.btn : 'button[type="submit"], button[aria-label*="send" i]';

      const inputEl = document.querySelector(inputSelector);
      if (!inputEl) return;

      if (inputEl.tagName === 'TEXTAREA' || inputEl.tagName === 'INPUT') {
        setNativeInputValue(inputEl, prompt);
      } else {
        setNativeContentEditableValue(inputEl, prompt);
      }

      setTimeout(() => {
        const submitBtn = document.querySelector(btnSelector);
        if (submitBtn && !submitBtn.disabled && !isStopButton(submitBtn)) {
          submitBtn.click();
        } else if (!submitBtn) {
          simulateEnterKey(inputEl);
        }
      }, 200);
    }

    function simulateEnterKey(element) {
      if (!element) return;
      const eventOptions = { key: 'Enter', code: 'Enter', keyCode: 13, which: 13, bubbles: true, cancelable: true };
      element.dispatchEvent(new KeyboardEvent('keydown', eventOptions));
      element.dispatchEvent(new KeyboardEvent('keypress', eventOptions));
      element.dispatchEvent(new KeyboardEvent('keyup', eventOptions));
    }
  }
})();
