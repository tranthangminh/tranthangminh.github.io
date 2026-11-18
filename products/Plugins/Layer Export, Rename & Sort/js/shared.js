function getElement(id) {
  return document.getElementById(id);
}

function extractSharedHtmlBody(markup) {
  const text = String(markup || "");
  const bodyMatch = text.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
  if (bodyMatch && typeof bodyMatch[1] === "string") {
    return bodyMatch[1].replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, "");
  }
  return text.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, "");
}

async function readSharedPluginTextFileFromIframe(relativePath) {
  if (typeof document === "undefined" || !document.createElement || !document.body) {
    throw new Error("Iframe loading is unavailable.");
  }

  return await new Promise(function (resolve, reject) {
    const frame = document.createElement("iframe");
    frame.style.display = "none";
    frame.setAttribute("aria-hidden", "true");

    const cleanup = function () {
      if (frame.parentNode) {
        frame.parentNode.removeChild(frame);
      }
    };

    frame.onload = function () {
      try {
        const frameDocument = frame.contentDocument || (frame.contentWindow && frame.contentWindow.document);
        const body = frameDocument && frameDocument.body;
        const markup = body ? body.innerHTML : "";
        cleanup();
        if (markup) {
          resolve(markup);
          return;
        }
        reject(new Error("Empty iframe fragment."));
      } catch (error) {
        cleanup();
        reject(error);
      }
    };

    frame.onerror = function () {
      cleanup();
      reject(new Error("Could not load iframe fragment."));
    };

    frame.src = relativePath;
    document.body.appendChild(frame);
  });
}

async function readSharedPluginTextFileFromXhr(relativePath) {
  if (typeof XMLHttpRequest !== "function") {
    throw new Error("XHR loading is unavailable.");
  }

  return await new Promise(function (resolve, reject) {
    const request = new XMLHttpRequest();
    request.open("GET", relativePath, true);

    request.onload = function () {
      const isSuccessful = (request.status >= 200 && request.status < 300) || request.status === 0;
      if (isSuccessful && request.responseText) {
        resolve(request.responseText);
        return;
      }
      reject(new Error("Could not load XHR fragment."));
    };

    request.onerror = function () {
      reject(new Error("Could not load XHR fragment."));
    };

    request.send();
  });
}

async function readSharedPluginTextFile(relativePath) {
  if (!relativePath) {
    throw new Error("Missing file path.");
  }

  if (typeof fetch === "function") {
    try {
      const response = await fetch(relativePath);
      if (response && response.ok) {
        return await response.text();
      }
    } catch (error) {}
  }

  try {
    return await readSharedPluginTextFileFromXhr(relativePath);
  } catch (error) {}

  try {
    return await readSharedPluginTextFileFromIframe(relativePath);
  } catch (error) {}

  if (typeof require === "function") {
    const uxpModule = require("uxp");
    const fs = uxpModule && uxpModule.storage ? uxpModule.storage.localFileSystem : null;
    if (fs && typeof fs.getPluginFolder === "function") {
      const pluginFolder = await fs.getPluginFolder();
      const parts = String(relativePath).replace(/\\/g, "/").split("/").filter(Boolean);
      let currentEntry = pluginFolder;

      for (let index = 0; index < parts.length; index += 1) {
        const part = parts[index];
        if (!currentEntry) {
          throw new Error("Could not resolve fragment path.");
        }

        if (typeof currentEntry.getEntry === "function") {
          currentEntry = await currentEntry.getEntry(part);
          continue;
        }

        if (typeof currentEntry.getEntries === "function") {
          const entries = await currentEntry.getEntries();
          let matchedEntry = null;
          for (let entryIndex = 0; entryIndex < entries.length; entryIndex += 1) {
            if (entries[entryIndex] && entries[entryIndex].name === part) {
              matchedEntry = entries[entryIndex];
              break;
            }
          }
          currentEntry = matchedEntry;
          continue;
        }

        currentEntry = null;
      }

      if (currentEntry && typeof currentEntry.read === "function") {
        return await currentEntry.read();
      }
    }
  }

  throw new Error("Could not load fragment: " + relativePath);
}

async function loadSharedHtmlFragmentInto(containerId, relativePath) {
  const container = getElement(containerId);
  if (!container) {
    throw new Error("Missing fragment container: " + containerId);
  }

  const markup = await readSharedPluginTextFile(relativePath);
  container.innerHTML = extractSharedHtmlBody(markup);
  return container;
}

// Shared Icons: the only place that names UI icons. HTML uses <span class="shared-icon" data-icon="name">.
// UXP ignores CSS mask-image and <img src=".svg">, so each SVG file is inlined as-is; its colors come
// from the file itself (drawn in --text-primary).
const SHARED_ICONS = {
  "info": "icons/info.svg",
  "minus": "icons/minus.svg",
  "play": "icons/play.svg",
  "plus": "icons/plus.svg"
};
const sharedIconMarkupCache = {};

async function getSharedIconMarkup(name) {
  if (!Object.prototype.hasOwnProperty.call(sharedIconMarkupCache, name)) {
    const path = SHARED_ICONS[name];
    if (!path) {
      throw new Error("Unknown icon: " + name);
    }

    const markup = await readSharedPluginTextFile(path);
    sharedIconMarkupCache[name] = String(markup)
      .replace(/<\?xml[\s\S]*?\?>/g, "")
      .replace(/<!--[\s\S]*?-->/g, "")
      .trim();
  }

  return sharedIconMarkupCache[name];
}

async function renderSharedIcon(holder) {
  try {
    holder.innerHTML = await getSharedIconMarkup(holder.getAttribute("data-icon"));
    const svg = holder.querySelector("svg");
    if (svg) {
      svg.setAttribute("width", "100%");
      svg.setAttribute("height", "100%");
    }
  } catch (error) {}
}

function setSharedIcon(holder, name) {
  if (!holder || holder.getAttribute("data-icon") === name) {
    return;
  }

  holder.setAttribute("data-icon", name);
  renderSharedIcon(holder);
}

async function loadSharedIcons() {
  if (typeof document.querySelectorAll !== "function") {
    return;
  }

  const holders = Array.prototype.slice.call(document.querySelectorAll(".shared-icon[data-icon]") || []);
  for (let index = 0; index < holders.length; index += 1) {
    await renderSharedIcon(holders[index]);
  }
}
// Shared Tabs Helpers
function getSharedTabButtons(groupName) {
  if (!groupName || typeof document.querySelectorAll !== "function") {
    return [];
  }

  const buttons = document.querySelectorAll('[data-shared-tab-group="' + groupName + '"]');
  return Array.prototype.slice.call(buttons || []);
}

function getActiveSharedTabValue(groupName) {
  const buttons = getSharedTabButtons(groupName);
  for (let index = 0; index < buttons.length; index += 1) {
    if (buttons[index].classList.contains("is-active")) {
      return buttons[index].getAttribute("data-shared-tab-value");
    }
  }

  return buttons.length ? buttons[0].getAttribute("data-shared-tab-value") : "";
}

function syncSharedTabGroup(groupName, activeValue) {
  const buttons = getSharedTabButtons(groupName);
  if (!buttons.length) {
    return "";
  }

  let resolvedValue = activeValue;
  let hasMatch = false;
  for (let index = 0; index < buttons.length; index += 1) {
    if (buttons[index].getAttribute("data-shared-tab-value") === activeValue) {
      hasMatch = true;
      break;
    }
  }

  if (!hasMatch) {
    resolvedValue = buttons[0].getAttribute("data-shared-tab-value");
  }

  for (let index = 0; index < buttons.length; index += 1) {
    const button = buttons[index];
    const panelId = button.getAttribute("data-shared-tab-panel");
    const panel = panelId ? getElement(panelId) : null;
    const isActive = button.getAttribute("data-shared-tab-value") === resolvedValue;

    button.classList.toggle("is-active", isActive);
    button.setAttribute("aria-selected", isActive ? "true" : "false");
    button.setAttribute("tabindex", isActive ? "0" : "-1");

    if (panel) {
      panel.classList.toggle("is-hidden", !isActive);
    }
  }

  return resolvedValue;
}

function bindSharedTabGroup(groupName, afterChange) {
  const buttons = getSharedTabButtons(groupName);
  if (!buttons.length) {
    return;
  }

  const focusButtonAtIndex = function (nextIndex) {
    if (buttons[nextIndex] && typeof buttons[nextIndex].focus === "function") {
      buttons[nextIndex].focus();
    }
  };

  const activateButton = function (button) {
    const nextValue = button.getAttribute("data-shared-tab-value");
    const resolvedValue = syncSharedTabGroup(groupName, nextValue);
    if (typeof afterChange === "function") {
      afterChange(resolvedValue);
    }
  };

  for (let index = 0; index < buttons.length; index += 1) {
    const button = buttons[index];
    if (button.getAttribute("data-shared-tab-bound") === "true") {
      continue;
    }

    button.setAttribute("data-shared-tab-bound", "true");
    button.addEventListener("click", function () {
      activateButton(button);
    });

    button.addEventListener("keydown", function (event) {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        activateButton(button);
        return;
      }

      if (event.key === "ArrowRight") {
        event.preventDefault();
        focusButtonAtIndex((index + 1) % buttons.length);
        return;
      }

      if (event.key === "ArrowLeft") {
        event.preventDefault();
        focusButtonAtIndex((index - 1 + buttons.length) % buttons.length);
        return;
      }

      if (event.key === "Home") {
        event.preventDefault();
        focusButtonAtIndex(0);
        return;
      }

      if (event.key === "End") {
        event.preventDefault();
        focusButtonAtIndex(buttons.length - 1);
      }
    });
  }
}

// Shared Slider Helpers
function clampSharedSliderNumber(value, min, max) {
  const numericValue = Number(value);
  const numericMin = Number(min);
  const numericMax = Number(max);

  if (!Number.isFinite(numericValue)) {
    return Number.isFinite(numericMin) ? numericMin : 0;
  }

  if (numericValue < numericMin) {
    return numericMin;
  }
  if (numericValue > numericMax) {
    return numericMax;
  }

  return numericValue;
}

function roundSharedSliderValue(value, min, max, step) {
  const numericMin = Number(min || 0);
  const numericMax = Number(max || 100);
  const numericStep = Number(step || 1);
  let nextValue = Number(value || 0);

  if (numericStep > 0) {
    nextValue = Math.round(nextValue / numericStep) * numericStep;
  }

  return clampSharedSliderNumber(nextValue, numericMin, numericMax);
}

function getSharedSliderInput(sliderElement) {
  if (!sliderElement || typeof sliderElement.getAttribute !== "function") {
    return null;
  }

  const inputId = sliderElement.getAttribute("data-input-id");
  return inputId ? getElement(inputId) : null;
}

function getSharedSliderElementByInputId(inputId) {
  if (!inputId || typeof document.querySelector !== "function") {
    return null;
  }

  return document.querySelector('.shared-slider[data-input-id="' + inputId + '"]');
}

function dispatchSharedEvent(target, type) {
  if (!target) {
    return;
  }

  try {
    target.dispatchEvent(new Event(type, { bubbles: true }));
    return;
  } catch (error) {}

  if (typeof document.createEvent === "function") {
    const legacyEvent = document.createEvent("Event");
    legacyEvent.initEvent(type, true, true);
    target.dispatchEvent(legacyEvent);
  }
}

function syncSharedSlider(sliderElement) {
  const input = getSharedSliderInput(sliderElement);
  const track = sliderElement && sliderElement.querySelector ? sliderElement.querySelector(".shared-slider-track") : null;
  const fill = sliderElement && sliderElement.querySelector ? sliderElement.querySelector(".shared-slider-fill") : null;
  const thumb = sliderElement && sliderElement.querySelector ? sliderElement.querySelector(".shared-slider-thumb") : null;

  if (!sliderElement || !input || !track || !fill || !thumb) {
    return;
  }

  const min = Number(input.min || 0);
  const max = Number(input.max || 100);
  const step = Number(input.step || 1);
  const value = roundSharedSliderValue(input.value, min, max, step);
  const ratio = max > min ? (value - min) / (max - min) : 0;
  const percent = Math.max(0, Math.min(100, ratio * 100));

  input.value = value;
  fill.style.width = percent + "%";
  thumb.style.left = percent + "%";
  sliderElement.classList.toggle("is-disabled", !!input.disabled);
  sliderElement.setAttribute("aria-disabled", input.disabled ? "true" : "false");
  sliderElement.setAttribute("aria-valuemin", String(min));
  sliderElement.setAttribute("aria-valuemax", String(max));
  sliderElement.setAttribute("aria-valuenow", String(value));
}

function syncSharedSliderByInputId(inputId) {
  const sliderElement = getSharedSliderElementByInputId(inputId);
  if (sliderElement) {
    syncSharedSlider(sliderElement);
  }
}

function getSharedSliderValueFromClientX(sliderElement, clientX) {
  const input = getSharedSliderInput(sliderElement);
  const track = sliderElement && sliderElement.querySelector ? sliderElement.querySelector(".shared-slider-track") : null;

  if (!input || !track || typeof track.getBoundingClientRect !== "function") {
    return 0;
  }

  const rect = track.getBoundingClientRect();
  const min = Number(input.min || 0);
  const max = Number(input.max || 100);
  const step = Number(input.step || 1);

  if (!rect || !rect.width) {
    return roundSharedSliderValue(input.value, min, max, step);
  }

  const ratio = clampSharedSliderNumber((clientX - rect.left) / rect.width, 0, 1);
  const rawValue = min + ((max - min) * ratio);
  return roundSharedSliderValue(rawValue, min, max, step);
}

function setSharedSliderInputValue(sliderElement, nextValue, eventType) {
  const input = getSharedSliderInput(sliderElement);
  if (!input) {
    return;
  }

  const min = Number(input.min || 0);
  const max = Number(input.max || 100);
  const step = Number(input.step || 1);
  const previousValue = String(input.value);
  const roundedValue = roundSharedSliderValue(nextValue, min, max, step);

  input.value = roundedValue;
  syncSharedSlider(sliderElement);

  if (eventType && (String(roundedValue) !== previousValue || eventType === "change")) {
    dispatchSharedEvent(input, eventType);
  }
}

function bindSharedSlider(sliderId) {
  const sliderElement = getElement(sliderId);
  const input = getSharedSliderInput(sliderElement);
  if (!sliderElement || !input || sliderElement.getAttribute("data-bound") === "true") {
    return;
  }

  sliderElement.setAttribute("data-bound", "true");

  sliderElement.addEventListener("mousedown", function (event) {
    if (input.disabled) {
      return;
    }

    event.preventDefault();
    sliderElement.classList.add("is-dragging");
    setSharedSliderInputValue(sliderElement, getSharedSliderValueFromClientX(sliderElement, event.clientX), "input");

    const handleMouseMove = function (moveEvent) {
      setSharedSliderInputValue(sliderElement, getSharedSliderValueFromClientX(sliderElement, moveEvent.clientX), "input");
    };

    const handleMouseUp = function (upEvent) {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
      sliderElement.classList.remove("is-dragging");
      setSharedSliderInputValue(sliderElement, getSharedSliderValueFromClientX(sliderElement, upEvent.clientX), "change");
    };

    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);
  });

  sliderElement.addEventListener("keydown", function (event) {
    if (input.disabled) {
      return;
    }

    const min = Number(input.min || 0);
    const max = Number(input.max || 100);
    const step = Number(input.step || 1);
    const currentValue = roundSharedSliderValue(input.value, min, max, step);
    let nextValue = currentValue;

    if (event.key === "ArrowLeft" || event.key === "ArrowDown") {
      nextValue = currentValue - step;
    } else if (event.key === "ArrowRight" || event.key === "ArrowUp") {
      nextValue = currentValue + step;
    } else if (event.key === "PageDown") {
      nextValue = currentValue - (step * 5);
    } else if (event.key === "PageUp") {
      nextValue = currentValue + (step * 5);
    } else if (event.key === "Home") {
      nextValue = min;
    } else if (event.key === "End") {
      nextValue = max;
    } else {
      return;
    }

    event.preventDefault();
    setSharedSliderInputValue(sliderElement, nextValue, "input");
  });

  input.addEventListener("input", function () {
    syncSharedSlider(sliderElement);
  });

  input.addEventListener("change", function () {
    syncSharedSlider(sliderElement);
  });

  syncSharedSlider(sliderElement);
}

// Change handlers can be slow (they query Photoshop and rebuild previews), so let the panel repaint first
function notifySharedChangeAfterPaint(target) {
  setTimeout(function () {
    dispatchSharedEvent(target, "change");
  }, 0);
}

// Shared Choice Helpers (self-drawn checkbox / radio, state kept in a hidden input)
function getSharedChoiceControls() {
  if (typeof document.querySelectorAll !== "function") {
    return [];
  }

  return Array.prototype.slice.call(document.querySelectorAll(".shared-choice") || []);
}

function getSharedChoiceInput(control) {
  const inputId = control && typeof control.getAttribute === "function" ? control.getAttribute("data-input-id") : "";
  return inputId ? getElement(inputId) : null;
}

function syncSharedChoiceControls() {
  const controls = getSharedChoiceControls();
  for (let index = 0; index < controls.length; index += 1) {
    const control = controls[index];
    const input = getSharedChoiceInput(control);
    if (!input) {
      continue;
    }

    control.classList.toggle("is-checked", !!input.checked);
    control.classList.toggle("is-disabled", !!input.disabled);
    control.setAttribute("aria-checked", input.checked ? "true" : "false");
    control.setAttribute("aria-disabled", input.disabled ? "true" : "false");
  }
}

function activateSharedChoice(control) {
  const input = getSharedChoiceInput(control);
  if (!input || input.disabled) {
    return;
  }

  if (input.getAttribute("type") === "radio") {
    if (input.checked) {
      return;
    }

    const groupName = input.getAttribute("name");
    const groupInputs = groupName
      ? Array.prototype.slice.call(document.querySelectorAll('input[name="' + groupName + '"]') || [])
      : [input];
    for (let index = 0; index < groupInputs.length; index += 1) {
      groupInputs[index].checked = groupInputs[index] === input;
    }
  } else {
    input.checked = !input.checked;
  }

  syncSharedChoiceControls();
  notifySharedChangeAfterPaint(input);
}

// A choice card can contain its own controls (slider, segment, small checkbox); events from those must not toggle the card
function isEventFromNestedControl(event, control) {
  let element = event && event.target;
  while (element && element !== control) {
    if (element.classList && (
      element.classList.contains("shared-choice") ||
      element.classList.contains("shared-slider") ||
      element.classList.contains("shared-segment")
    )) {
      return true;
    }
    element = element.parentElement;
  }

  return false;
}

function bindSharedChoiceControls() {
  const controls = getSharedChoiceControls();
  for (let index = 0; index < controls.length; index += 1) {
    const control = controls[index];
    if (control.getAttribute("data-bound") === "true") {
      continue;
    }

    control.setAttribute("data-bound", "true");
    control.addEventListener("click", function (event) {
      if (!isEventFromNestedControl(event, control)) {
        activateSharedChoice(control);
      }
    });
    control.addEventListener("keydown", function (event) {
      if ((event.key === "Enter" || event.key === " ") && !isEventFromNestedControl(event, control)) {
        event.preventDefault();
        activateSharedChoice(control);
      }
    });
  }

  syncSharedChoiceControls();
}

// Shared Segment Helpers (two-way switch, value kept in data-value, fires "change" on the segment)
function getSharedSegmentOptions(segment) {
  if (!segment || typeof segment.querySelectorAll !== "function") {
    return [];
  }

  return Array.prototype.slice.call(segment.querySelectorAll(".shared-segment-option") || []);
}

function syncSharedSegment(segment) {
  const value = segment ? segment.getAttribute("data-value") : "";
  const options = getSharedSegmentOptions(segment);
  for (let index = 0; index < options.length; index += 1) {
    const isSelected = options[index].getAttribute("data-value") === value;
    options[index].classList.toggle("is-selected", isSelected);
    options[index].setAttribute("aria-checked", isSelected ? "true" : "false");
  }
}

function setSharedSegmentValue(segment, nextValue, shouldNotify) {
  if (!segment) {
    return;
  }

  const previousValue = segment.getAttribute("data-value");
  segment.setAttribute("data-value", nextValue);
  syncSharedSegment(segment);

  if (shouldNotify && previousValue !== nextValue) {
    notifySharedChangeAfterPaint(segment);
  }
}

function bindSharedSegments() {
  if (typeof document.querySelectorAll !== "function") {
    return;
  }

  const segments = Array.prototype.slice.call(document.querySelectorAll(".shared-segment") || []);
  for (let index = 0; index < segments.length; index += 1) {
    const segment = segments[index];
    if (segment.getAttribute("data-bound") === "true") {
      continue;
    }

    segment.setAttribute("data-bound", "true");
    const options = getSharedSegmentOptions(segment);
    for (let optionIndex = 0; optionIndex < options.length; optionIndex += 1) {
      const option = options[optionIndex];
      const selectOption = function () {
        setSharedSegmentValue(segment, option.getAttribute("data-value"), true);
      };

      option.addEventListener("click", selectOption);
      option.addEventListener("keydown", function (event) {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          selectOption();
        }
      });
    }

    syncSharedSegment(segment);
  }
}

// Shared Button Helpers (self-drawn, div with role="button")
function isSharedButtonDisabled(button) {
  return !!(button && button.classList.contains("is-disabled"));
}

function setSharedButtonDisabled(button, isDisabled) {
  if (!button) {
    return;
  }

  button.classList.toggle("is-disabled", !!isDisabled);
  button.setAttribute("aria-disabled", isDisabled ? "true" : "false");
}

function bindSharedButtons() {
  if (typeof document.querySelectorAll !== "function") {
    return;
  }

  const buttons = Array.prototype.slice.call(document.querySelectorAll(".shared-button") || []);
  for (let index = 0; index < buttons.length; index += 1) {
    const button = buttons[index];
    if (button.getAttribute("data-key-bound") === "true") {
      continue;
    }

    button.setAttribute("data-key-bound", "true");
    button.addEventListener("keydown", function (event) {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        if (!isSharedButtonDisabled(button)) {
          dispatchSharedEvent(button, "click");
        }
      }
    });
  }
}

// Shared Text Field Helpers (self-drawn; the off-screen native input keeps value, keyboard, IME and clipboard)
const SHARED_CARET_BLINK_MS = 530;
let sharedCaretTimer = null;

function getSharedFieldInput(field) {
  const inputId = field ? field.getAttribute("data-input-id") : "";
  return inputId ? getElement(inputId) : null;
}

function appendSharedFieldText(view, text, className) {
  if (!text) {
    return null;
  }

  const span = document.createElement("span");
  if (className) {
    span.className = className;
  }
  span.textContent = text;
  view.appendChild(span);
  return span;
}

function keepSharedFieldMarkVisible(view, mark) {
  if (!mark) {
    view.scrollLeft = 0;
    return;
  }

  const markLeft = mark.offsetLeft - view.offsetLeft;
  const markRight = markLeft + mark.offsetWidth;
  if (markRight > view.scrollLeft + view.clientWidth) {
    view.scrollLeft = markRight - view.clientWidth + 2;
  } else if (markLeft < view.scrollLeft) {
    view.scrollLeft = markLeft;
  }
}

function renderSharedField(field) {
  const input = getSharedFieldInput(field);
  const view = field ? field.querySelector(".shared-field-view") : null;
  if (!input || !view) {
    return;
  }

  const value = String(input.value || "");
  const isFocused = field.classList.contains("is-focused");
  const start = typeof input.selectionStart === "number" ? Math.min(input.selectionStart, value.length) : value.length;
  const end = typeof input.selectionEnd === "number" ? Math.min(Math.max(input.selectionEnd, start), value.length) : start;
  const renderKey = [value, start, end, isFocused].join("|");
  if (field.getAttribute("data-render-key") === renderKey) {
    return;
  }

  field.setAttribute("data-render-key", renderKey);
  field.classList.remove("is-caret-hidden");
  while (view.firstChild) {
    view.removeChild(view.firstChild);
  }

  let mark = null;
  appendSharedFieldText(view, value.slice(0, start), "");
  if (isFocused && start === end) {
    mark = document.createElement("span");
    mark.className = "shared-field-caret";
    view.appendChild(mark);
  } else if (isFocused) {
    mark = appendSharedFieldText(view, value.slice(start, end), "shared-field-selection");
  } else {
    appendSharedFieldText(view, value.slice(start, end), "");
  }
  appendSharedFieldText(view, value.slice(end), "");
  if (!value) {
    appendSharedFieldText(view, input.getAttribute("placeholder") || "", "shared-field-placeholder");
  }

  keepSharedFieldMarkVisible(view, mark);
}

function stopSharedCaretBlink() {
  if (sharedCaretTimer) {
    clearInterval(sharedCaretTimer);
    sharedCaretTimer = null;
  }
}

function startSharedCaretBlink(field) {
  stopSharedCaretBlink();
  sharedCaretTimer = setInterval(function () {
    field.classList.toggle("is-caret-hidden");
  }, SHARED_CARET_BLINK_MS);
}

function syncSharedFields() {
  if (typeof document.querySelectorAll !== "function") {
    return;
  }

  const fields = Array.prototype.slice.call(document.querySelectorAll(".shared-field") || []);
  for (let index = 0; index < fields.length; index += 1) {
    renderSharedField(fields[index]);
  }
}

function bindSharedFields() {
  if (typeof document.querySelectorAll !== "function") {
    return;
  }

  const fields = Array.prototype.slice.call(document.querySelectorAll(".shared-field") || []);
  for (let index = 0; index < fields.length; index += 1) {
    const field = fields[index];
    const input = getSharedFieldInput(field);
    if (!input || field.getAttribute("data-bound") === "true") {
      continue;
    }

    field.setAttribute("data-bound", "true");
    const render = function () {
      renderSharedField(field);
    };
    const renderAfterKey = function () {
      setTimeout(render, 0);
    };

    field.addEventListener("mousedown", function (event) {
      event.preventDefault();
      if (document.activeElement === input) {
        return;
      }

      input.focus();
      if (typeof input.setSelectionRange === "function") {
        const length = String(input.value || "").length;
        input.setSelectionRange(length, length);
      }
      render();
    });

    input.addEventListener("focus", function () {
      field.classList.add("is-focused");
      startSharedCaretBlink(field);
      render();
    });
    input.addEventListener("blur", function () {
      field.classList.remove("is-focused");
      stopSharedCaretBlink();
      render();
    });
    input.addEventListener("input", render);
    input.addEventListener("select", render);
    input.addEventListener("keydown", renderAfterKey);
    input.addEventListener("keyup", render);
    render();
  }
}

// Shared Preview Helpers
function renderSharedPreview(previewId, nextText, nextSignature, previousSignature) {
  const previewElement = getElement(previewId);
  if (!previewElement) {
    return previousSignature;
  }

  if (nextSignature !== previousSignature) {
    previewElement.textContent = nextText;
    return nextSignature;
  }

  return previousSignature;
}

// Shared Dialog Helper (in-panel overlay, closed by any [data-dialog-close] element)
const sharedDialogResolvers = {};

function closeSharedModalDialog(dialogId) {
  const dialog = getElement(dialogId);
  if (dialog) {
    dialog.classList.add("is-hidden");
  }

  const resolve = sharedDialogResolvers[dialogId];
  delete sharedDialogResolvers[dialogId];
  if (typeof resolve === "function") {
    resolve();
  }
}

function showSharedModalDialog(dialogId) {
  const dialog = getElement(dialogId);
  if (!dialog) {
    return Promise.resolve();
  }

  const closeButtons = Array.prototype.slice.call(dialog.querySelectorAll("[data-dialog-close]") || []);
  for (let index = 0; index < closeButtons.length; index += 1) {
    const closeButton = closeButtons[index];
    if (closeButton.getAttribute("data-bound") === "true") {
      continue;
    }

    closeButton.setAttribute("data-bound", "true");
    closeButton.addEventListener("click", function () {
      closeSharedModalDialog(dialogId);
    });
  }

  dialog.classList.remove("is-hidden");
  return new Promise(function (resolve) {
    sharedDialogResolvers[dialogId] = resolve;
  });
}
