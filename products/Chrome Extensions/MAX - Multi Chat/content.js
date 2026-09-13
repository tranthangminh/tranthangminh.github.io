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

    function handleAISyncPrompt(prompt, promptId) {
      if (!prompt) return;

      const now = Date.now();
      if ((promptId && promptId === lastHandledPromptId) || (now - lastHandledPromptTime < 600)) {
        return; // Deduplicate execution within 600ms
      }
      if (promptId) lastHandledPromptId = promptId;
      lastHandledPromptTime = now;

      const host = window.location.hostname.toLowerCase();

      let inputEl = null;
      let submitBtn = null;

      if (host.includes("chatgpt.com")) {
        inputEl = document.getElementById("prompt-textarea") || 
                  document.querySelector('textarea[placeholder*="Ask"]') ||
                  document.querySelector('div[contenteditable="true"]');
        if (inputEl) {
          if (inputEl.tagName === 'TEXTAREA' || inputEl.tagName === 'INPUT') {
            setNativeInputValue(inputEl, prompt);
          } else {
            setNativeContentEditableValue(inputEl, prompt);
          }
          setTimeout(() => {
            submitBtn = document.querySelector('button[data-testid="send-button"]') ||
                        document.querySelector('button[data-testid*="send"]') ||
                        document.querySelector('button[aria-label*="Send"]');
            if (submitBtn && !submitBtn.disabled && !isStopButton(submitBtn)) {
              submitBtn.click();
            } else if (!submitBtn) {
              simulateEnterKey(inputEl);
            }
          }, 200);
        }
      } else if (host.includes("gemini.google.com")) {
        inputEl = document.querySelector('.ql-editor[contenteditable="true"]') ||
                  document.querySelector('rich-textarea .ql-editor') ||
                  document.querySelector('rich-textarea textarea');
        if (inputEl) {
          if (inputEl.tagName === 'TEXTAREA') {
            setNativeInputValue(inputEl, prompt);
          } else {
            setNativeContentEditableValue(inputEl, prompt);
          }
          setTimeout(() => {
            submitBtn = document.querySelector('.send-button-container button') ||
                        document.querySelector('button[aria-label="Send message"]') ||
                        document.querySelector('button[aria-label*="Send"]') ||
                        document.querySelector('button[aria-label*="Gửi"]');
            if (submitBtn && !submitBtn.disabled && !isStopButton(submitBtn)) {
              submitBtn.click();
            } else if (!submitBtn) {
              simulateEnterKey(inputEl);
            }
          }, 200);
        }
      } else if (host.includes("claude.ai")) {
        inputEl = document.querySelector('div[contenteditable="true"]') ||
                  document.querySelector('.ProseMirror[contenteditable="true"]') ||
                  document.querySelector('[data-testid="textarea"]');
        if (inputEl) {
          if (inputEl.tagName === 'TEXTAREA') {
            setNativeInputValue(inputEl, prompt);
          } else {
            setNativeContentEditableValue(inputEl, prompt);
          }
          setTimeout(() => {
            submitBtn = document.querySelector('button[aria-label="Send Message"]') ||
                        document.querySelector('button[aria-label*="Send"]') ||
                        document.querySelector('button[aria-label*="send"]');
            if (submitBtn && !submitBtn.disabled && !isStopButton(submitBtn)) {
              submitBtn.click();
            } else if (!submitBtn) {
              simulateEnterKey(inputEl);
            }
          }, 200);
        }
      } else if (host.includes("deepseek.com")) {
        inputEl = document.getElementById("chat-input") || document.querySelector('textarea');
        if (inputEl) {
          setNativeInputValue(inputEl, prompt);
          setTimeout(() => {
            submitBtn = document.querySelector('div[class*="send-btn"]') ||
                        document.querySelector('button[class*="send"]') ||
                        document.querySelector('div[class*="send"]');
            if (submitBtn && !isStopButton(submitBtn)) {
              submitBtn.click();
            } else if (!submitBtn) {
              simulateEnterKey(inputEl);
            }
          }, 200);
        }
      } else if (host.includes("perplexity.ai")) {
        inputEl = document.querySelector('textarea[placeholder*="Ask"]') || document.querySelector('textarea');
        if (inputEl) {
          setNativeInputValue(inputEl, prompt);
          setTimeout(() => {
            submitBtn = document.querySelector('button[aria-label*="Submit"]') ||
                        document.querySelector('button[aria-label*="Send"]') ||
                        document.querySelector('button[class*="bg-super"]');
            if (submitBtn && !isStopButton(submitBtn)) {
              submitBtn.click();
            } else if (!submitBtn) {
              simulateEnterKey(inputEl);
            }
          }, 200);
        }
      } else {
        // Generic fallback for any other AI/chat interface (Poe, Copilot, custom sites)
        inputEl = document.querySelector('textarea') || document.querySelector('div[contenteditable="true"]');
        if (inputEl) {
          if (inputEl.tagName === 'TEXTAREA' || inputEl.tagName === 'INPUT') {
            setNativeInputValue(inputEl, prompt);
          } else {
            setNativeContentEditableValue(inputEl, prompt);
          }
          setTimeout(() => {
            submitBtn = document.querySelector('button[type="submit"]') ||
                        document.querySelector('button[aria-label*="send" i]') ||
                        document.querySelector('button[aria-label*="Send" i]');
            if (submitBtn && !isStopButton(submitBtn)) {
              submitBtn.click();
            } else if (!submitBtn) {
              simulateEnterKey(inputEl);
            }
          }, 200);
        }
      }
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
