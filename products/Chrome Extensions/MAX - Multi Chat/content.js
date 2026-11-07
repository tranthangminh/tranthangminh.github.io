// Content Script running inside all iframes (sub_frames) to track URL navigation dynamically
(function() {
  const EXTENSION_ORIGIN = new URL(chrome.runtime.getURL("")).origin;

  // Only a pane directly inside the MAX dashboard runs this: other sites' iframes and frames nested in a pane stay inert
  if (location.ancestorOrigins?.[0] === EXTENSION_ORIGIN) {
    let lastUrl = window.location.href;

    function sendPaneUrl() {
      chrome.runtime.sendMessage({
        type: "SUBFRAME_URL_CHANGED",
        url: window.location.href,
        tabId: window.name
      }).catch(() => {
        // The dashboard may not be listening while it reloads
      });
    }

    function notifyUrlChange() {
      if (window.location.href !== lastUrl) {
        lastUrl = window.location.href;
        sendPaneUrl();
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
      window.parent.postMessage({ type: "MAX_AUDIO_STATE", isAudible: playing }, EXTENSION_ORIGIN);
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
    sendPaneUrl();

    // Covers pushState, replaceState, hash changes and back/forward without polling
    window.navigation.addEventListener("currententrychange", notifyUrlChange);

    // Only the Dashboard page itself may send prompts
    window.addEventListener("message", (event) => {
      if (event.origin === EXTENSION_ORIGIN && event.data?.type === "AI_SYNC_PROMPT") {
        handleAISyncPrompt(event.data.prompt, event.data.promptId);
      }
    });

    function reportPromptResult(promptId, delivered) {
      window.parent.postMessage({ type: "AI_PROMPT_RESULT", promptId, delivered }, EXTENSION_ORIGIN);
    }

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
      const host = window.location.hostname.toLowerCase();
      const siteConfig = AI_SITE_SELECTORS.find(c => host.includes(c.match));

      const inputSelector = siteConfig ? siteConfig.input : 'textarea, div[contenteditable="true"]';
      const btnSelector = siteConfig ? siteConfig.btn : 'button[type="submit"], button[aria-label*="send" i]';

      const inputEl = document.querySelector(inputSelector);
      if (!prompt || !inputEl) {
        reportPromptResult(promptId, false);
        return;
      }

      if (inputEl.tagName === 'TEXTAREA' || inputEl.tagName === 'INPUT') {
        setNativeInputValue(inputEl, prompt);
      } else {
        setNativeContentEditableValue(inputEl, prompt);
      }

      setTimeout(() => {
        const submitBtn = document.querySelector(btnSelector);
        const canClick = submitBtn && !submitBtn.disabled && !isStopButton(submitBtn);
        if (canClick) {
          submitBtn.click();
        } else if (!submitBtn) {
          simulateEnterKey(inputEl);
        }
        reportPromptResult(promptId, canClick || !submitBtn);
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
