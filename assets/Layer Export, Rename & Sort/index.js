const AUTO_REFRESH_MS = 500;
const SLIDER_INPUT_RENDER_DEBOUNCE_MS = 120;
const MESSAGE_SELECT_FILE_TYPE = "Please select at least one file type.";
const PANEL_SETTINGS_STORAGE_KEY = "saveAsLayerName.panelSettings.v3";
const DEFAULT_RENAME_START = "1";
const DEFAULT_RENAME_STEP = "1";
const DEFAULT_RENAME_DIGITS = "1";

// Runtime State
let previewTimer = null;
let sliderInputTimer = null;
let lastSignature = "";
let lastRenameLayersPreviewSignature = "";
let lastPrefixSuffixPreviewSignature = "";
let lastRemoveReplacePreviewSignature = "";
let isExporting = false;
let runtimeCache = null;
let locationInputDirty = false;
const MODE_BUTTON_OPTIONS = {
  webpMode: [
    { value: "lossless", label: "Lossless" },
    { value: "lossy", label: "Lossy" }
  ],
  psdMode: [
    { value: "flattened", label: "Flattened" },
    { value: "layers", label: "Layers" }
  ],
  tiffCompression: [
    { value: "lzw", label: "LZW" },
    { value: "none", label: "Uncompressed" }
  ],
  bmpDepth: [
    { value: "24", label: "24-bit" },
    { value: "32", label: "32-bit" }
  ]
};

// Slider + Format Helpers
function roundToStep(value, min, max, step) {
  let result = Number(value || 0);
  const floorMin = Number(min || 0);
  const ceilMax = Number(max || 100);
  const unit = Number(step || 1);

  if (unit > 0) {
    result = Math.round(result / unit) * unit;
  }
  if (result < floorMin) {
    result = floorMin;
  }
  if (result > ceilMax) {
    result = ceilMax;
  }

  return result;
}

function setMetricLabel(valueId, labelPrefix, value) {
  const element = getElement(valueId);
  if (element) {
    element.textContent = labelPrefix + ": " + value;
  }
}

function normalizeSlider(id, valueId, labelPrefix) {
  const slider = getElement(id);
  const nextValue = roundToStep(slider.value, slider.min, slider.max, slider.step || 1);
  slider.value = nextValue;
  setMetricLabel(valueId, labelPrefix, nextValue);
  if (typeof syncSharedSliderByInputId === "function") {
    syncSharedSliderByInputId(id);
  }
  return nextValue;
}

function getRoundedSliderValue(id) {
  const slider = getElement(id);
  if (!slider) {
    return 0;
  }

  return roundToStep(slider.value, slider.min, slider.max, slider.step || 1);
}

function sanitizeName(value) {
  return String(value || "").replace(/[\\/:*?"<>|]/g, "_");
}

function getIndexedItems(collection) {
  const result = [];
  if (!collection || typeof collection.length !== "number") {
    return result;
  }

  for (let index = 0; index < collection.length; index += 1) {
    if (collection[index]) {
      result.push(collection[index]);
    }
  }

  return result;
}

function getOrderedLayersTopToBottom(doc) {
  // In this Photoshop panel, activeLayers comes back bottom-to-top,
  // so we reverse it once and reuse the same order everywhere else.
  return getIndexedItems(doc && doc.activeLayers).reverse();
}

function collectAllRenameableLayersTopToBottom(container, result) {
  const layers = getIndexedItems(container && container.layers);
  for (let index = 0; index < layers.length; index += 1) {
    const layer = layers[index];
    const childLayers = getIndexedItems(layer && layer.layers);
    if (childLayers.length) {
      collectAllRenameableLayersTopToBottom(layer, result);
    } else {
      result.push(layer);
    }
  }
}

function getAllRenameableLayersTopToBottom(doc) {
  const result = [];
  collectAllRenameableLayersTopToBottom(doc, result);
  return result.length ? result : getOrderedLayersTopToBottom(doc);
}

function shouldRenameAllLayers() {
  const checkbox = getElement("renameAllLayersCheckbox");
  return !!(checkbox && checkbox.checked);
}

function getRenameTargetLayers(doc) {
  return shouldRenameAllLayers()
    ? getAllRenameableLayersTopToBottom(doc)
    : getOrderedLayersTopToBottom(doc);
}

function getRenamePreviewLayers(doc) {
  return getOrderedLayersTopToBottom(doc);
}

function getSortScopeValue() {
  if (getElement("sortScopeRecursive").checked) {
    return "recursive";
  }
  if (getElement("sortScopeWithinGroup").checked) {
    return "within-group";
  }
  return "top-level";
}

function getSortOrderValue() {
  return getElement("sortOrderZa").checked ? "za" : "az";
}

function isSortDescending() {
  return getSortOrderValue() === "za";
}

function isGroupLayer(layer) {
  return !!(layer && layer.layers && typeof layer.layers.length === "number");
}

function getSortableLayers(collection) {
  const layers = getIndexedItems(collection);
  const result = [];

  for (let index = 0; index < layers.length; index += 1) {
    if (!layers[index].isBackgroundLayer) {
      result.push(layers[index]);
    }
  }

  return result;
}

function getSelectedGroupLayer(doc) {
  const selectedLayers = getIndexedItems(doc && doc.activeLayers);
  if (selectedLayers.length !== 1) {
    return null;
  }

  return isGroupLayer(selectedLayers[0]) ? selectedLayers[0] : null;
}

function naturalCompare(a, b) {
  const ax = [];
  const bx = [];

  String(a || "").replace(/(\d+)|(\D+)/g, function (_, numericPart, textPart) {
    ax.push([
      numericPart != null ? parseInt(numericPart, 10) : Infinity,
      (textPart || "").toLowerCase()
    ]);
  });

  String(b || "").replace(/(\d+)|(\D+)/g, function (_, numericPart, textPart) {
    bx.push([
      numericPart != null ? parseInt(numericPart, 10) : Infinity,
      (textPart || "").toLowerCase()
    ]);
  });

  const maxLength = Math.max(ax.length, bx.length);
  for (let index = 0; index < maxLength; index += 1) {
    const left = ax[index] || [Infinity, ""];
    const right = bx[index] || [Infinity, ""];

    if (left[0] !== right[0]) {
      return left[0] - right[0];
    }

    if (left[1] !== right[1]) {
      return left[1] < right[1] ? -1 : 1;
    }
  }

  return 0;
}

function reorderLayersTopToBottom(sortedLayers) {
  if (!sortedLayers || sortedLayers.length < 2) {
    return;
  }

  sortedLayers[sortedLayers.length - 1].sendToBack();
  for (let index = sortedLayers.length - 2; index >= 0; index -= 1) {
    sortedLayers[index].moveAbove(sortedLayers[index + 1]);
  }
}

function sortLayerCollectionByName(collection, descending, recursive) {
  const sortableLayers = getSortableLayers(collection);
  if (!sortableLayers.length) {
    return;
  }

  if (recursive) {
    for (let index = 0; index < sortableLayers.length; index += 1) {
      if (isGroupLayer(sortableLayers[index])) {
        sortLayerCollectionByName(sortableLayers[index].layers, descending, true);
      }
    }
  }

  const sortedLayers = sortableLayers.slice().sort(function (leftLayer, rightLayer) {
    const comparison = naturalCompare(leftLayer.name, rightLayer.name);
    return descending ? -comparison : comparison;
  });

  reorderLayersTopToBottom(sortedLayers);
}

function getTextInputValue(id, fallbackValue) {
  const control = getElement(id);
  const value = control ? String(control.value || "") : "";
  if (value) {
    return value;
  }
  return fallbackValue || "";
}

function parseIntegerInput(id, fallbackValue) {
  const control = getElement(id);
  const parsedValue = parseInt(control ? control.value : "", 10);
  return Number.isFinite(parsedValue) ? parsedValue : fallbackValue;
}

function formatSequenceNumber(value, digits) {
  const numberText = String(value);
  const width = Math.max(1, parseInt(digits, 10) || 1);

  if (value < 0) {
    return "-" + String(Math.abs(value)).padStart(width, "0");
  }

  return numberText.padStart(width, "0");
}

function getSelectValue(id, allowedValues, fallbackValue) {
  const control = getElement(id);
  const currentValue = control ? String(control.getAttribute("data-value") || "") : "";
  return allowedValues.indexOf(currentValue) >= 0 ? currentValue : fallbackValue;
}

function setModeButtonValue(id, nextValue) {
  const control = getElement(id);
  const options = MODE_BUTTON_OPTIONS[id] || [];
  if (!control || !options.length) {
    return;
  }

  let matchedOption = options[0];
  for (let index = 0; index < options.length; index += 1) {
    if (options[index].value === nextValue) {
      matchedOption = options[index];
      break;
    }
  }

  control.setAttribute("data-value", matchedOption.value);
  control.textContent = matchedOption.label;
}

function cycleModeButtonValue(id) {
  const control = getElement(id);
  const options = MODE_BUTTON_OPTIONS[id] || [];
  if (!control || !options.length) {
    return;
  }

  const currentValue = String(control.getAttribute("data-value") || "");
  let currentIndex = 0;
  for (let index = 0; index < options.length; index += 1) {
    if (options[index].value === currentValue) {
      currentIndex = index;
      break;
    }
  }

  const nextOption = options[(currentIndex + 1) % options.length];
  setModeButtonValue(id, nextOption.value);
}

function getWebPMode() {
  return getSelectValue("webpMode", ["lossless", "lossy"], "lossy");
}

function getPsdMode() {
  return getSelectValue("psdMode", ["flattened", "layers"], "flattened");
}

function getTiffCompression() {
  return getSelectValue("tiffCompression", ["lzw", "none"], "lzw");
}

function getBmpDepth() {
  return getSelectValue("bmpDepth", ["24", "32"], "24");
}

function updateWebPMode() {
  const isLossy = getWebPMode() === "lossy";
  const slider = getElement("webpQuality");
  const valueLabel = getElement("webpQualityValue");

  slider.disabled = !isLossy;
  if (typeof syncSharedSliderByInputId === "function") {
    syncSharedSliderByInputId("webpQuality");
  }
  if (isLossy) {
    normalizeSlider("webpQuality", "webpQualityValue", "Quality");
  } else {
    valueLabel.textContent = "Quality: Lossless";
  }
}

function updateBmpDepth() {
  const alphaCheckbox = getElement("bmpAlphaChannels");
  const depth = getBmpDepth();
  const allowAlpha = depth === "32";

  if (!allowAlpha) {
    alphaCheckbox.checked = false;
  }

  alphaCheckbox.disabled = !allowAlpha;
}

function syncFormatRowState(rowId, checkboxId) {
  const row = getElement(rowId);
  const checkbox = getElement(checkboxId);
  if (!row || !checkbox) {
    return;
  }

  row.classList.toggle("is-active", !!checkbox.checked);
}

function syncAllFormatRowStates() {
  syncFormatRowState("jpgRow", "jpgEnabled");
  syncFormatRowState("pngRow", "pngEnabled");
  syncFormatRowState("webpRow", "webpEnabled");
  syncFormatRowState("psdRow", "psdEnabled");
  syncFormatRowState("tiffRow", "tiffEnabled");
  syncFormatRowState("bmpRow", "bmpEnabled");
}

function handleFormatEnabledChange(rowId, checkboxId) {
  syncFormatRowState(rowId, checkboxId);
  if (checkboxId === "webpEnabled") {
    updateWebPMode();
  }
  savePanelSettings();
  renderPreview();
}

function bindFormatNameToggle(rowId, checkboxId) {
  const checkbox = getElement(checkboxId);
  const toggle = checkbox && checkbox.parentElement;
  const label = toggle && toggle.querySelector ? toggle.querySelector(".format-name") : null;
  if (!checkbox || !toggle || !label || label.getAttribute("data-bound") === "true") {
    return;
  }

  label.setAttribute("data-bound", "true");
  label.addEventListener("click", function (event) {
    event.preventDefault();
    checkbox.checked = !checkbox.checked;
    handleFormatEnabledChange(rowId, checkboxId);
  });
}

// Settings Persistence
function getPanelSettingsStorage() {
  try {
    if (typeof window !== "undefined" && window.localStorage) {
      return window.localStorage;
    }
  } catch (error) {}

  return null;
}

function collectPersistedPanelSettings() {
  return {
    jpgEnabled: !!getElement("jpgEnabled").checked,
    jpgQuality: getRoundedSliderValue("jpgQuality"),
    pngEnabled: !!getElement("pngEnabled").checked,
    pngCompression: getRoundedSliderValue("pngCompression"),
    webpEnabled: !!getElement("webpEnabled").checked,
    webpMode: getWebPMode(),
    webpQuality: getRoundedSliderValue("webpQuality"),
    psdEnabled: !!getElement("psdEnabled").checked,
    psdMode: getPsdMode(),
    psdMaxCompatibility: !!getElement("psdMaxCompatibility").checked,
    tiffEnabled: !!getElement("tiffEnabled").checked,
    tiffCompression: getTiffCompression(),
    tiffTransparency: !!getElement("tiffTransparency").checked,
    bmpEnabled: !!getElement("bmpEnabled").checked,
    bmpDepth: getBmpDepth(),
    bmpAlphaChannels: !!getElement("bmpAlphaChannels").checked,
    exportMenuCollapsed: getElement("exportMenuSection").classList.contains("is-collapsed"),
    fileTypeCollapsed: getElement("fileTypeSection").classList.contains("is-collapsed"),
    renameCollapsed: getElement("renameSection").classList.contains("is-collapsed"),
    exportLocationCollapsed: getElement("exportLocationSection").classList.contains("is-collapsed"),
    exportPreviewCollapsed: getElement("exportPreviewSection").classList.contains("is-collapsed"),
    renameLayersMenuCollapsed: getElement("renameLayersMenuSection").classList.contains("is-collapsed"),
    renameLayersActionCollapsed: getElement("renameLayersActionSection").classList.contains("is-collapsed"),
    renamePrefixSuffixCollapsed: getElement("renamePrefixSuffixSection").classList.contains("is-collapsed"),
    removeReplaceCollapsed: getElement("removeReplaceSection").classList.contains("is-collapsed"),
    sortLayersMenuCollapsed: getElement("sortLayersMenuSection").classList.contains("is-collapsed"),
    sortScopeCollapsed: getElement("sortScopeSection").classList.contains("is-collapsed"),
    sortOrderCollapsed: getElement("sortOrderSection").classList.contains("is-collapsed"),
    aboutMeCollapsed: getElement("aboutMeSection").classList.contains("is-collapsed"),
    prefix: getElement("prefixInput").value || "",
    suffix: getElement("suffixInput").value || "",
    sortScope: getSortScopeValue(),
    sortOrder: getSortOrderValue(),
    renameAllLayers: shouldRenameAllLayers(),
    renameBaseName: getElement("renameBaseNameInput").value || "",
    renameStart: getElement("renameStartInput").value || "",
    renameStep: getElement("renameStepInput").value || "",
    renameDigits: getElement("renameDigitsInput").value || "",
    renameLayerPrefix: getElement("renameLayerPrefixInput").value || "",
    renameLayerSuffix: getElement("renameLayerSuffixInput").value || "",
    removeTarget: getElement("removeTargetInput").value || "",
    replaceWith: getElement("replaceWithInput").value || ""
  };
}

function savePanelSettings() {
  const storage = getPanelSettingsStorage();
  if (!storage) {
    return;
  }

  try {
    storage.setItem(PANEL_SETTINGS_STORAGE_KEY, JSON.stringify(collectPersistedPanelSettings()));
  } catch (error) {}
}

function loadPanelSettings() {
  const storage = getPanelSettingsStorage();
  if (!storage) {
    return null;
  }

  try {
    const rawValue = storage.getItem(PANEL_SETTINGS_STORAGE_KEY);
    if (!rawValue) {
      return null;
    }

    const parsed = JSON.parse(rawValue);
    if (!parsed || typeof parsed !== "object") {
      return null;
    }

    return parsed;
  } catch (error) {
    return null;
  }
}

function applySavedPanelSettings() {
  const savedSettings = loadPanelSettings();
  if (!savedSettings) {
    return;
  }

  if (typeof savedSettings.jpgEnabled === "boolean") {
    getElement("jpgEnabled").checked = savedSettings.jpgEnabled;
  }
  if (typeof savedSettings.jpgQuality === "number") {
    getElement("jpgQuality").value = savedSettings.jpgQuality;
  }
  if (typeof savedSettings.pngEnabled === "boolean") {
    getElement("pngEnabled").checked = savedSettings.pngEnabled;
  }
  if (typeof savedSettings.pngCompression === "number") {
    getElement("pngCompression").value = savedSettings.pngCompression;
  }
  if (typeof savedSettings.webpEnabled === "boolean") {
    getElement("webpEnabled").checked = savedSettings.webpEnabled;
  }
  if (savedSettings.webpMode === "lossless" || savedSettings.webpMode === "lossy") {
    setModeButtonValue("webpMode", savedSettings.webpMode);
  }
  if (typeof savedSettings.webpQuality === "number") {
    getElement("webpQuality").value = savedSettings.webpQuality;
  }
  if (typeof savedSettings.psdEnabled === "boolean") {
    getElement("psdEnabled").checked = savedSettings.psdEnabled;
  }
  if (savedSettings.psdMode === "flattened" || savedSettings.psdMode === "layers") {
    setModeButtonValue("psdMode", savedSettings.psdMode);
  }
  if (typeof savedSettings.psdMaxCompatibility === "boolean") {
    getElement("psdMaxCompatibility").checked = savedSettings.psdMaxCompatibility;
  }
  if (typeof savedSettings.tiffEnabled === "boolean") {
    getElement("tiffEnabled").checked = savedSettings.tiffEnabled;
  }
  if (savedSettings.tiffCompression === "lzw" || savedSettings.tiffCompression === "none") {
    setModeButtonValue("tiffCompression", savedSettings.tiffCompression);
  }
  if (typeof savedSettings.tiffTransparency === "boolean") {
    getElement("tiffTransparency").checked = savedSettings.tiffTransparency;
  }
  if (typeof savedSettings.bmpEnabled === "boolean") {
    getElement("bmpEnabled").checked = savedSettings.bmpEnabled;
  }
  if (savedSettings.bmpDepth === "24" || savedSettings.bmpDepth === "32") {
    setModeButtonValue("bmpDepth", savedSettings.bmpDepth);
  }
  if (typeof savedSettings.bmpAlphaChannels === "boolean") {
    getElement("bmpAlphaChannels").checked = savedSettings.bmpAlphaChannels;
  }
  if (typeof savedSettings.exportMenuCollapsed === "boolean") {
    syncCollapsibleSectionState("exportMenuSection", "exportMenuToggleBtn", "exportMenuToggleIcon", savedSettings.exportMenuCollapsed);
  }
  if (typeof savedSettings.fileTypeCollapsed === "boolean") {
    syncCollapsibleSectionState("fileTypeSection", "fileTypeToggleBtn", "fileTypeToggleIcon", savedSettings.fileTypeCollapsed);
  }
  if (typeof savedSettings.renameCollapsed === "boolean") {
    syncCollapsibleSectionState("renameSection", "renameToggleBtn", "renameToggleIcon", savedSettings.renameCollapsed);
  }
  if (typeof savedSettings.exportLocationCollapsed === "boolean") {
    syncCollapsibleSectionState("exportLocationSection", "exportLocationToggleBtn", "exportLocationToggleIcon", savedSettings.exportLocationCollapsed);
  }
  if (typeof savedSettings.exportPreviewCollapsed === "boolean") {
    syncCollapsibleSectionState("exportPreviewSection", "exportPreviewToggleBtn", "exportPreviewToggleIcon", savedSettings.exportPreviewCollapsed);
  }
  if (typeof savedSettings.renameLayersMenuCollapsed === "boolean") {
    syncCollapsibleSectionState("renameLayersMenuSection", "renameLayersMenuToggleBtn", "renameLayersMenuToggleIcon", savedSettings.renameLayersMenuCollapsed);
  }
  if (typeof savedSettings.renameLayersActionCollapsed === "boolean") {
    syncCollapsibleSectionState("renameLayersActionSection", "renameLayersActionToggleBtn", "renameLayersActionToggleIcon", savedSettings.renameLayersActionCollapsed);
  }
  if (typeof savedSettings.renamePrefixSuffixCollapsed === "boolean") {
    syncCollapsibleSectionState("renamePrefixSuffixSection", "renamePrefixSuffixToggleBtn", "renamePrefixSuffixToggleIcon", savedSettings.renamePrefixSuffixCollapsed);
  }
  if (typeof savedSettings.removeReplaceCollapsed === "boolean") {
    syncCollapsibleSectionState("removeReplaceSection", "removeReplaceToggleBtn", "removeReplaceToggleIcon", savedSettings.removeReplaceCollapsed);
  }
  if (typeof savedSettings.sortLayersMenuCollapsed === "boolean") {
    syncCollapsibleSectionState("sortLayersMenuSection", "sortLayersMenuToggleBtn", "sortLayersMenuToggleIcon", savedSettings.sortLayersMenuCollapsed);
  }
  if (typeof savedSettings.sortScopeCollapsed === "boolean") {
    syncCollapsibleSectionState("sortScopeSection", "sortScopeToggleBtn", "sortScopeToggleIcon", savedSettings.sortScopeCollapsed);
  }
  if (typeof savedSettings.sortOrderCollapsed === "boolean") {
    syncCollapsibleSectionState("sortOrderSection", "sortOrderToggleBtn", "sortOrderToggleIcon", savedSettings.sortOrderCollapsed);
  }
  if (typeof savedSettings.aboutMeCollapsed === "boolean") {
    syncCollapsibleSectionState("aboutMeSection", "aboutMeToggleBtn", "aboutMeToggleIcon", savedSettings.aboutMeCollapsed);
  }
  if (typeof savedSettings.prefix === "string") {
    getElement("prefixInput").value = savedSettings.prefix;
  }
  if (typeof savedSettings.suffix === "string") {
    getElement("suffixInput").value = savedSettings.suffix;
  }
  if (savedSettings.sortScope === "recursive") {
    getElement("sortScopeRecursive").checked = true;
  } else if (savedSettings.sortScope === "within-group") {
    getElement("sortScopeWithinGroup").checked = true;
  } else {
    getElement("sortScopeTopLevel").checked = true;
  }
  if (savedSettings.sortOrder === "za") {
    getElement("sortOrderZa").checked = true;
  } else {
    getElement("sortOrderAz").checked = true;
  }
  if (typeof savedSettings.renameAllLayers === "boolean") {
    getElement("renameAllLayersCheckbox").checked = savedSettings.renameAllLayers;
  }
  if (typeof savedSettings.renameBaseName === "string") {
    getElement("renameBaseNameInput").value = savedSettings.renameBaseName;
  }
  if (typeof savedSettings.renameStart === "string") {
    getElement("renameStartInput").value = savedSettings.renameStart || DEFAULT_RENAME_START;
  }
  if (typeof savedSettings.renameStep === "string") {
    getElement("renameStepInput").value = savedSettings.renameStep || DEFAULT_RENAME_STEP;
  }
  if (typeof savedSettings.renameDigits === "string") {
    getElement("renameDigitsInput").value = savedSettings.renameDigits || DEFAULT_RENAME_DIGITS;
  }
  if (typeof savedSettings.renameLayerPrefix === "string") {
    getElement("renameLayerPrefixInput").value = savedSettings.renameLayerPrefix;
  }
  if (typeof savedSettings.renameLayerSuffix === "string") {
    getElement("renameLayerSuffixInput").value = savedSettings.renameLayerSuffix;
  }
  if (typeof savedSettings.removeTarget === "string") {
    getElement("removeTargetInput").value = savedSettings.removeTarget;
  }
  if (typeof savedSettings.replaceWith === "string") {
    getElement("replaceWithInput").value = savedSettings.replaceWith;
  }
}

// Runtime + Preview
function getRuntime() {
  if (runtimeCache) {
    return runtimeCache;
  }

  if (typeof window.require === "function") {
    try {
      const photoshop = window.require("photoshop");
      const uxp = window.require("uxp");
      if (photoshop && photoshop.app && uxp && uxp.storage && uxp.storage.localFileSystem) {
        runtimeCache = {
          mode: "photoshop",
          photoshop: photoshop,
          app: photoshop.app,
          action: photoshop.action,
          core: photoshop.core,
          constants: photoshop.constants || {},
          fs: uxp.storage.localFileSystem,
          shell: uxp.shell || null
        };
        return runtimeCache;
      }
    } catch (error) {}
  }

  runtimeCache = {
    mode: "browser",
    shell: {
      openExternal: async function (url) {
        if (typeof window !== "undefined" && typeof window.open === "function") {
          window.open(url, "_blank");
        }
      }
    },
    fs: {
      getFolder: async function () {
        return { nativePath: "D:\\Preview\\Custom Export", name: "Custom Export", isFolder: true };
      }
    },
    app: {
      documents: [{}],
      activeDocument: {
        title: "BOX.psd",
        path: "D:\\Preview\\BOX.psd",
        activeLayers: [
          { name: "Guerlain - Aqua Allegoria Forte Rosa Rossa EDP_075_Fem", visible: true },
          { name: "Guerlain - Aqua Allegoria Forte Mandarine Basilic EDP_075_Fem", visible: true },
          { name: "Guerlain - Aqua Allegoria Forte Florabloom EDP_075_Fem", visible: true },
          { name: "Guerlain - Aqua Allegoria Nerolia Vetiver EDT_125_Uni", visible: true }
        ]
      }
    }
  };

  return runtimeCache;
}

function isLocalNativePath(pathValue) {
  if (typeof pathValue !== "string" || !pathValue) {
    return false;
  }

  return /^[A-Za-z]:[\\/]/.test(pathValue) || pathValue.indexOf("/") === 0;
}

function nativePathToFileUrl(nativePath) {
  const normalized = String(nativePath || "").replace(/\\/g, "/").replace(/\/+/g, "/");
  if (!normalized) {
    return "";
  }

  if (/^[A-Za-z]:\//.test(normalized)) {
    return "file:/" + encodeURI(normalized);
  }

  if (normalized.indexOf("/") === 0) {
    return "file:" + encodeURI(normalized);
  }

  return "file:/" + encodeURI(normalized);
}

function joinNativePath(folderPath, fileName) {
  const separator = folderPath.indexOf("\\") >= 0 ? "\\" : "/";
  return String(folderPath || "").replace(/[\\/]+$/, "") + separator + fileName;
}

function getDocumentOutputFolderPath(doc) {
  const sourcePath = String((doc && doc.path) || "");
  if (!isLocalNativePath(sourcePath)) {
    return "";
  }

  const trimmedPath = sourcePath.replace(/[\\/]+$/, "");
  const docTitle = String((doc && doc.title) || "").replace(/[\\/]/g, "");
  const lowerPath = trimmedPath.toLowerCase();
  const lowerTitle = docTitle.toLowerCase();

  if (lowerTitle && (lowerPath.endsWith("\\" + lowerTitle) || lowerPath.endsWith("/" + lowerTitle))) {
    return trimmedPath.slice(0, trimmedPath.length - docTitle.length).replace(/[\\/]+$/, "");
  }

  const lastSeparator = Math.max(trimmedPath.lastIndexOf("\\"), trimmedPath.lastIndexOf("/"));
  const tail = lastSeparator >= 0 ? trimmedPath.slice(lastSeparator + 1) : trimmedPath;

  if (/\.[A-Za-z0-9]{2,5}$/.test(tail)) {
    return lastSeparator >= 0 ? trimmedPath.slice(0, lastSeparator) : "";
  }

  return trimmedPath;
}

function getLocationInputValue() {
  const input = getElement("locationInput");
  return input ? String(input.value || "").trim() : "";
}

function setLocationInputValue(value, markDirty) {
  const input = getElement("locationInput");
  if (input) {
    input.value = value || "";
  }
  locationInputDirty = !!markDirty;
}

function getResolvedOutputFolderPath(doc) {
  const manualValue = getLocationInputValue();
  if (manualValue) {
    return manualValue;
  }
  return getDocumentOutputFolderPath(doc);
}

function getEffectiveOutputFolderPath(doc, settings) {
  const manualValue = settings && typeof settings.outputFolderPath === "string"
    ? settings.outputFolderPath.trim()
    : "";

  if (manualValue) {
    return manualValue;
  }

  const inputValue = getLocationInputValue();
  if (inputValue) {
    return inputValue;
  }

  return getDocumentOutputFolderPath(doc);
}

function syncLocationInputFromDocument(forceOverwrite) {
  const input = getElement("locationInput");
  if (!input) {
    return;
  }

  if (forceOverwrite || !locationInputDirty || !getLocationInputValue()) {
    input.value = "";
    locationInputDirty = false;
  }
}

function getFormatDescriptions(settings) {
  const formats = [];

  if (settings.jpgEnabled) {
    formats.push("JPG q=" + settings.jpgQuality);
  }
  if (settings.pngEnabled) {
    formats.push("PNG c=" + settings.pngCompression);
  }
  if (settings.webpEnabled) {
    formats.push(settings.webpMode === "lossy"
      ? "WebP lossy q=" + settings.webpQuality
      : "WebP lossless");
  }
  if (settings.psdEnabled) {
    formats.push("PSD " + (settings.psdMode === "layers" ? "layers" : "flat"));
  }
  if (settings.tiffEnabled) {
    formats.push("TIFF " + (settings.tiffCompression === "lzw" ? "LZW" : "none"));
  }
  if (settings.bmpEnabled) {
    formats.push("BMP " + settings.bmpDepth + "-bit" + (settings.bmpAlphaChannels ? " alpha" : ""));
  }

  return formats;
}

function collectSettings() {
  const bmpDepth = getBmpDepth();
  const bmpAlphaChannels = bmpDepth === "32" && !!getElement("bmpAlphaChannels").checked;

  return {
    jpgEnabled: !!getElement("jpgEnabled").checked,
    jpgQuality: normalizeSlider("jpgQuality", "jpgQualityValue", "Quality"),
    pngEnabled: !!getElement("pngEnabled").checked,
    pngCompression: normalizeSlider("pngCompression", "pngCompressionValue", "Compression"),
    webpEnabled: !!getElement("webpEnabled").checked,
    webpMode: getWebPMode(),
    webpQuality: getWebPMode() === "lossy" ? normalizeSlider("webpQuality", "webpQualityValue", "Quality") : null,
    psdEnabled: !!getElement("psdEnabled").checked,
    psdMode: getPsdMode(),
    psdMaxCompatibility: !!getElement("psdMaxCompatibility").checked,
    tiffEnabled: !!getElement("tiffEnabled").checked,
    tiffCompression: getTiffCompression(),
    tiffTransparency: !!getElement("tiffTransparency").checked,
    bmpEnabled: !!getElement("bmpEnabled").checked,
    bmpDepth: bmpDepth,
    bmpAlphaChannels: bmpAlphaChannels,
    prefix: getElement("prefixInput").value || "",
    suffix: getElement("suffixInput").value || "",
    outputFolderPath: getLocationInputValue()
  };
}

// Rename Helpers
function collectRenameSettings() {
  return {
    renameAllLayers: shouldRenameAllLayers(),
    baseName: getTextInputValue("renameBaseNameInput", ""),
    start: parseIntegerInput("renameStartInput", 1),
    step: parseIntegerInput("renameStepInput", 1),
    digits: Math.max(1, parseIntegerInput("renameDigitsInput", 1)),
    prefix: getTextInputValue("renameLayerPrefixInput", ""),
    suffix: getTextInputValue("renameLayerSuffixInput", ""),
    target: getTextInputValue("removeTargetInput", ""),
    replaceWith: getTextInputValue("replaceWithInput", "")
  };
}

function formatPreviewLinesFromNames(orderedLayers, previewNames) {
  const lines = [];
  for (let index = 0; index < orderedLayers.length; index += 1) {
    lines.push((index + 1) + ". " + previewNames[index]);
  }
  return lines.join("\n");
}

function collectRenameLayersPreviewData() {
  const runtime = getRuntime();
  const app = runtime.app;
  const settings = collectRenameSettings();

  if (!app.documents.length) {
    return {
      signature: JSON.stringify({ mode: runtime.mode, state: "no-document", type: "rename-layers", settings: settings }),
      preview: "No document is open."
    };
  }

  const doc = app.activeDocument;
  const orderedLayers = getRenamePreviewLayers(doc);
  if (!orderedLayers.length) {
    return {
      signature: JSON.stringify({ mode: runtime.mode, state: "no-layers", type: "rename-layers", settings: settings }),
      preview: "No layers selected."
    };
  }

  const previewNames = [];
  for (let index = 0; index < orderedLayers.length; index += 1) {
    const currentName = String((orderedLayers[index] && orderedLayers[index].name) || "");
    const baseName = settings.baseName || currentName;
    const sequenceNumber = settings.start + index * settings.step;
    previewNames.push(baseName + formatSequenceNumber(sequenceNumber, settings.digits));
  }

  return {
    signature: JSON.stringify({
      mode: runtime.mode,
      type: "rename-layers",
      state: "ready",
      targetCount: orderedLayers.length,
      layers: previewNames
    }),
    preview: formatPreviewLinesFromNames(orderedLayers, previewNames)
  };
}

function collectPrefixSuffixPreviewData() {
  const runtime = getRuntime();
  const app = runtime.app;
  const settings = collectRenameSettings();

  if (!app.documents.length) {
    return {
      signature: JSON.stringify({ mode: runtime.mode, state: "no-document", type: "prefix-suffix", settings: settings }),
      preview: "No document is open."
    };
  }

  const orderedLayers = getRenamePreviewLayers(app.activeDocument);
  if (!orderedLayers.length) {
    return {
      signature: JSON.stringify({ mode: runtime.mode, state: "no-layers", type: "prefix-suffix", settings: settings }),
      preview: "No layers selected."
    };
  }

  const previewNames = [];
  for (let index = 0; index < orderedLayers.length; index += 1) {
    const currentName = String((orderedLayers[index] && orderedLayers[index].name) || "");
    previewNames.push(settings.prefix + currentName + settings.suffix);
  }

  return {
    signature: JSON.stringify({
      mode: runtime.mode,
      type: "prefix-suffix",
      state: "ready",
      targetCount: orderedLayers.length,
      layers: previewNames
    }),
    preview: formatPreviewLinesFromNames(orderedLayers, previewNames)
  };
}

function collectRemoveReplacePreviewData() {
  const runtime = getRuntime();
  const app = runtime.app;
  const settings = collectRenameSettings();

  if (!app.documents.length) {
    return {
      signature: JSON.stringify({ mode: runtime.mode, state: "no-document", type: "remove-replace", settings: settings }),
      preview: "No document is open."
    };
  }

  const orderedLayers = getRenamePreviewLayers(app.activeDocument);
  if (!orderedLayers.length) {
    return {
      signature: JSON.stringify({ mode: runtime.mode, state: "no-layers", type: "remove-replace", settings: settings }),
      preview: "No layers selected."
    };
  }

  const previewNames = [];
  for (let index = 0; index < orderedLayers.length; index += 1) {
    const currentName = String((orderedLayers[index] && orderedLayers[index].name) || "");
    previewNames.push(settings.target
      ? currentName.split(settings.target).join(settings.replaceWith || "")
      : currentName);
  }

  return {
    signature: JSON.stringify({
      mode: runtime.mode,
      type: "remove-replace",
      state: "ready",
      targetCount: orderedLayers.length,
      layers: previewNames
    }),
    preview: formatPreviewLinesFromNames(orderedLayers, previewNames)
  };
}

function renderRenamePreviews() {
  const renameLayersData = collectRenameLayersPreviewData();
  lastRenameLayersPreviewSignature = renderSharedPreview("renameLayersPreview", renameLayersData.preview, renameLayersData.signature, lastRenameLayersPreviewSignature);

  const renameSettings = collectRenameSettings();
  const showPrefixSuffixPreview = !!(renameSettings.prefix || renameSettings.suffix);
  const showRemoveReplacePreview = !!renameSettings.target;

  const prefixSuffixData = collectPrefixSuffixPreviewData();
  lastPrefixSuffixPreviewSignature = renderSharedPreview("prefixSuffixPreview", prefixSuffixData.preview, prefixSuffixData.signature, lastPrefixSuffixPreviewSignature);
  setSharedPreviewVisibility("prefixSuffixPreview", showPrefixSuffixPreview);

  const removeReplaceData = collectRemoveReplacePreviewData();
  lastRemoveReplacePreviewSignature = renderSharedPreview("removeReplacePreview", removeReplaceData.preview, removeReplaceData.signature, lastRemoveReplacePreviewSignature);
  setSharedPreviewVisibility("removeReplacePreview", showRemoveReplacePreview);
}

function collectPreviewData() {
  const runtime = getRuntime();
  const app = runtime.app;
  const settings = collectSettings();

  if (!app.documents.length) {
    return {
      signature: JSON.stringify({ mode: runtime.mode, state: "no-document", settings: settings }),
      preview: "No document is open."
    };
  }

  const doc = app.activeDocument;
  const orderedLayers = getOrderedLayersTopToBottom(doc);
  const outputFolderPath = getResolvedOutputFolderPath(doc);

  if (!orderedLayers.length) {
    return {
      signature: JSON.stringify({ mode: runtime.mode, state: "no-layers", title: doc.title || "", outputFolderPath: outputFolderPath, settings: settings }),
      preview: "No layers selected."
    };
  }

  const lines = [];
  const formats = getFormatDescriptions(settings);
  lines.push("Document: " + (doc.title || "(untitled)"));
  lines.push("Selected layers: " + orderedLayers.length);
  lines.push("Formats: " + (formats.length ? formats.join(", ") : "(none)"));
  if (outputFolderPath) {
    lines.push("Output folder: " + outputFolderPath);
  }
  lines.push("");

  const layerNames = [];
  for (let index = 0; index < orderedLayers.length; index += 1) {
    const layer = orderedLayers[index];
    const exportName = sanitizeName(settings.prefix + layer.name + settings.suffix);
    layerNames.push(layer.name);
    lines.push((index + 1) + ". " + exportName);
  }

  return {
    signature: JSON.stringify({
      mode: runtime.mode,
      title: doc.title || "",
      path: doc.path || "",
      outputFolderPath: outputFolderPath,
      settings: settings,
      layers: layerNames
    }),
    preview: lines.join("\n")
  };
}

function renderPreview() {
  if (isExporting) {
    return;
  }

  syncLocationInputFromDocument(false);
  renderRenamePreviews();

  const data = collectPreviewData();
  lastSignature = renderSharedPreview("selectionPreview", data.preview, data.signature, lastSignature);
}

function clearSliderInputTimer() {
  if (sliderInputTimer) {
    clearTimeout(sliderInputTimer);
    sliderInputTimer = null;
  }
}

function scheduleSliderPreviewRefresh() {
  clearSliderInputTimer();
  sliderInputTimer = setTimeout(function () {
    sliderInputTimer = null;
    savePanelSettings();
    renderPreview();
  }, SLIDER_INPUT_RENDER_DEBOUNCE_MS);
}

function startAutoRefresh() {
  if (previewTimer) {
    clearInterval(previewTimer);
  }

  previewTimer = setInterval(function () {
    if (!isExporting) {
      renderPreview();
    }
  }, AUTO_REFRESH_MS);
}

// Shared Popup / Info
function updateButtonState() {
  const button = getElement("exportBtn");
  button.disabled = isExporting;
  button.textContent = isExporting ? "Exporting..." : "Export";
}

function formatError(error) {
  if (!error) {
    return "Unknown error.";
  }

  if (typeof error === "string") {
    return error;
  }

  if (error.message) {
    return error.message;
  }

  return String(error);
}

async function showPopupMessage(runtime, message) {
  if (runtime && runtime.mode === "photoshop" && runtime.core && typeof runtime.core.showAlert === "function") {
    await runtime.core.showAlert({ message: message });
    return;
  }

  if (typeof alert === "function") {
    alert(message);
  }
}

async function handleExportMenuInfoClick() {
  const dialogMessage = getElement("exportInfoDialogMessage");
  if (dialogMessage) {
    dialogMessage.textContent = [
    "How it works:",
    "1. Uses the currently selected layers.",
    "2. Hides all selected layers once.",
    "3. Shows one selected layer at a time.",
    "4. Exports the visible result using the enabled file types.",
    "5. Hides that layer again, then continues to the next one.",
    "6. Restores the top selected layer to visible at the end.",
    "",
    "Notes:",
    "- File names use Prefix + Layer Name + Suffix.",
    "- Export Location uses the current document folder unless you change it.",
    "- The PSD must be saved locally before exporting files next to it.",
    "- Layers that are not selected are not hidden automatically, so visible unselected layers can still appear in the export."
    ].join("\n");
  }

  await showSharedModalDialog("exportInfoDialog", {
    title: "About Export as Layer Name",
    resize: "none",
    size: {
      width: 420,
      height: 360
    }
  });
}

// Export Helpers
function ensureExportableState(runtime, doc, selectedLayers, settings) {
  if (runtime.mode !== "photoshop") {
    throw new Error("Exporting files only works inside the Photoshop panel.");
  }

  if (!selectedLayers.length) {
    throw new Error("Select at least one layer before exporting.");
  }

  if (!settings.jpgEnabled &&
      !settings.pngEnabled &&
      !settings.webpEnabled &&
      !settings.psdEnabled &&
      !settings.tiffEnabled &&
      !settings.bmpEnabled) {
    throw new Error(MESSAGE_SELECT_FILE_TYPE);
  }

  const defaultFolder = getDocumentOutputFolderPath(doc);
  const outputFolderPath = getEffectiveOutputFolderPath(doc, settings);
  if (!defaultFolder || doc.cloudDocument) {
    throw new Error("Save the PSD locally before exporting files next to it.");
  }

  if (!outputFolderPath) {
    throw new Error("Choose an export location first.");
  }

  return outputFolderPath;
}

async function getFolderEntryForNativePath(fs, nativePath) {
  try {
    return await fs.getEntryWithUrl(nativePath);
  } catch (nativePathError) {
    return fs.getEntryWithUrl(nativePathToFileUrl(nativePath));
  }
}

async function createExportFileEntry(folderEntry, outputFolderPath, fileName) {
  if (!folderEntry || !folderEntry.isFolder) {
    throw new Error("Could not open the export folder: " + outputFolderPath);
  }

  return folderEntry.createFile(fileName, { overwrite: true });
}

async function saveJpg(doc, folderEntry, outputFolderPath, fileName, quality) {
  const entry = await createExportFileEntry(folderEntry, outputFolderPath, fileName);
  await doc.saveAs.jpg(entry, { quality: quality }, true);
}

async function savePng(doc, runtime, folderEntry, outputFolderPath, fileName, compression) {
  const entry = await createExportFileEntry(folderEntry, outputFolderPath, fileName);
  const options = {
    compression: compression,
    interlaced: false
  };

  if (runtime.constants && runtime.constants.PNGMethod && runtime.constants.PNGMethod.QUICK) {
    options.method = runtime.constants.PNGMethod.QUICK;
  }

  await doc.saveAs.png(entry, options, true);
}

async function savePsd(doc, folderEntry, outputFolderPath, fileName, mode, maximizeCompatibility) {
  const entry = await createExportFileEntry(folderEntry, outputFolderPath, fileName);
  await doc.saveAs.psd(entry, {
    embedColorProfile: true,
    layers: mode === "layers",
    maximizeCompatibility: !!maximizeCompatibility
  }, true);
}

async function saveWebp(doc, runtime, folderEntry, outputFolderPath, fileName, mode, quality) {
  if (!runtime.action || typeof runtime.action.batchPlay !== "function") {
    throw new Error("WebP export is not available in this Photoshop runtime.");
  }

  if (!runtime.fs || typeof runtime.fs.createSessionToken !== "function") {
    throw new Error("Could not create a session token for WebP export.");
  }

  const entry = await createExportFileEntry(folderEntry, outputFolderPath, fileName);
  const token = runtime.fs.createSessionToken(entry);
  const webpOptions = {
    _obj: "WebPFormat",
    compression: {
      _enum: "WebPCompression",
      _value: mode === "lossless" ? "compressionLossless" : "compressionLossy"
    },
    includeXMPData: false,
    includeEXIFData: false,
    includePsExtras: false
  };

  if (mode !== "lossless") {
    webpOptions.quality = quality;
  }

  await runtime.action.batchPlay([
    {
      _obj: "save",
      as: webpOptions,
      in: {
        _path: token,
        _kind: "local"
      },
      documentID: doc.id,
      copy: true,
      lowerCase: true,
      saveStage: {
        _enum: "saveStageType",
        _value: "saveSucceeded"
      },
      _options: {
        dialogOptions: "dontDisplay"
      }
    }
  ], {});
}

async function saveTiff(doc, runtime, folderEntry, outputFolderPath, fileName, compression, saveTransparency) {
  if (!runtime.action || typeof runtime.action.batchPlay !== "function") {
    throw new Error("TIFF export is not available in this Photoshop runtime.");
  }

  if (!runtime.fs || typeof runtime.fs.createSessionToken !== "function") {
    throw new Error("Could not create a session token for TIFF export.");
  }

  const entry = await createExportFileEntry(folderEntry, outputFolderPath, fileName);
  const token = runtime.fs.createSessionToken(entry);
  const tiffOptions = {
    _obj: "TIFF",
    byteOrder: {
      _enum: "platform",
      _value: "IBMPC"
    },
    saveTransparency: !!saveTransparency,
    layerCompression: {
      _enum: "encoding",
      _value: "RLE"
    }
  };

  if (compression === "lzw") {
    tiffOptions.LZWCompression = true;
  }

  await runtime.action.batchPlay([
    {
      _obj: "save",
      as: tiffOptions,
      in: {
        _path: token,
        _kind: "local"
      },
      documentID: doc.id,
      copy: true,
      lowerCase: true,
      saveStage: {
        _enum: "saveStageType",
        _value: "saveBegin"
      },
      _options: {
        dialogOptions: "dontDisplay"
      }
    }
  ], {});
}

async function saveBmp(doc, runtime, folderEntry, outputFolderPath, fileName, depth, alphaChannels) {
  const constants = runtime.constants || {};
  const bmpDepthType = constants.BMPDepthType || {};
  const operatingSystem = constants.OperatingSystem || {};
  const depthValue = depth === "32" ? bmpDepthType.THIRTYTWO : bmpDepthType.TWENTYFOUR;

  if (!depthValue || !operatingSystem.WINDOWS) {
    throw new Error("BMP export is not available in this Photoshop runtime.");
  }

  const entry = await createExportFileEntry(folderEntry, outputFolderPath, fileName);
  await doc.saveAs.bmp(entry, {
    alphaChannels: !!alphaChannels,
    depth: depthValue,
    flipRowOrder: false,
    osType: operatingSystem.WINDOWS,
    rleCompression: false
  }, true);
}

async function exportSelectedLayers(runtime, doc, outputFolderPath, orderedLayers, settings) {
  const exportedFiles = [];
  const folderEntry = await getFolderEntryForNativePath(runtime.fs, outputFolderPath);

  if (!folderEntry || !folderEntry.isFolder) {
    throw new Error("Could not open the export folder: " + outputFolderPath);
  }

  try {
    for (let index = 0; index < orderedLayers.length; index += 1) {
      orderedLayers[index].visible = false;
    }

    for (let index = 0; index < orderedLayers.length; index += 1) {
      const layer = orderedLayers[index];
      const exportBaseName = sanitizeName(settings.prefix + layer.name + settings.suffix);

      layer.visible = true;
      try {
        if (settings.jpgEnabled) {
          const jpgFileName = exportBaseName + ".jpg";
          const jpgPath = joinNativePath(outputFolderPath, jpgFileName);
          await saveJpg(doc, folderEntry, outputFolderPath, jpgFileName, settings.jpgQuality);
          exportedFiles.push(jpgPath);
        }

        if (settings.pngEnabled) {
          const pngFileName = exportBaseName + ".png";
          const pngPath = joinNativePath(outputFolderPath, pngFileName);
          await savePng(doc, runtime, folderEntry, outputFolderPath, pngFileName, settings.pngCompression);
          exportedFiles.push(pngPath);
        }

        if (settings.webpEnabled) {
          const webpFileName = exportBaseName + ".webp";
          const webpPath = joinNativePath(outputFolderPath, webpFileName);
          await saveWebp(doc, runtime, folderEntry, outputFolderPath, webpFileName, settings.webpMode, settings.webpQuality);
          exportedFiles.push(webpPath);
        }

        if (settings.psdEnabled) {
          const psdFileName = exportBaseName + ".psd";
          const psdPath = joinNativePath(outputFolderPath, psdFileName);
          await savePsd(doc, folderEntry, outputFolderPath, psdFileName, settings.psdMode, settings.psdMaxCompatibility);
          exportedFiles.push(psdPath);
        }

        if (settings.tiffEnabled) {
          const tiffFileName = exportBaseName + ".tif";
          const tiffPath = joinNativePath(outputFolderPath, tiffFileName);
          await saveTiff(doc, runtime, folderEntry, outputFolderPath, tiffFileName, settings.tiffCompression, settings.tiffTransparency);
          exportedFiles.push(tiffPath);
        }

        if (settings.bmpEnabled) {
          const bmpFileName = exportBaseName + ".bmp";
          const bmpPath = joinNativePath(outputFolderPath, bmpFileName);
          await saveBmp(doc, runtime, folderEntry, outputFolderPath, bmpFileName, settings.bmpDepth, settings.bmpAlphaChannels);
          exportedFiles.push(bmpPath);
        }
      } finally {
        layer.visible = false;
      }
    }
  } finally {
    if (orderedLayers.length) {
      orderedLayers[0].visible = true;
    }
  }

  return {
    exportedFiles: exportedFiles
  };
}

function renameLayersSequentially(targetLayers, settings) {
  for (let index = 0; index < targetLayers.length; index += 1) {
    const currentName = String((targetLayers[index] && targetLayers[index].name) || "");
    const baseName = settings.baseName || currentName;
    const sequenceNumber = settings.start + index * settings.step;
    targetLayers[index].name = baseName + formatSequenceNumber(sequenceNumber, settings.digits);
  }
}

function applyPrefixSuffixToLayers(targetLayers, prefix, suffix) {
  for (let index = 0; index < targetLayers.length; index += 1) {
    const currentName = String(targetLayers[index].name || "");
    targetLayers[index].name = prefix + currentName + suffix;
  }
}

function removeTargetTextFromLayers(targetLayers, targetText) {
  for (let index = 0; index < targetLayers.length; index += 1) {
    const currentName = String(targetLayers[index].name || "");
    targetLayers[index].name = currentName.split(targetText).join("");
  }
}

function replaceTargetTextInLayers(targetLayers, targetText, replaceWithText) {
  for (let index = 0; index < targetLayers.length; index += 1) {
    const currentName = String(targetLayers[index].name || "");
    targetLayers[index].name = currentName.split(targetText).join(replaceWithText);
  }
}

function captureLayerVisibilityState(layers) {
  const snapshot = [];
  for (let index = 0; index < layers.length; index += 1) {
    const layer = layers[index];
    snapshot.push({
      layer: layer,
      visible: !!layer.visible
    });
  }
  return snapshot;
}

function restoreLayerVisibilityState(snapshot) {
  for (let index = 0; index < snapshot.length; index += 1) {
    snapshot[index].layer.visible = snapshot[index].visible;
  }
}

async function runRenameAction(commandName, actionFn) {
  const runtime = getRuntime();
  const app = runtime.app;

  if (!app.documents.length) {
    await showPopupMessage(runtime, "No document is open.");
    return;
  }

  const doc = app.activeDocument;
  const targetLayers = getRenameTargetLayers(doc);
  if (!targetLayers.length) {
    await showPopupMessage(runtime, shouldRenameAllLayers()
      ? "No renamable layers found in the current document."
      : "Select at least one layer before renaming.");
    return;
  }

  try {
    if (runtime.mode === "photoshop") {
      await runtime.core.executeAsModal(async function (executionContext) {
        const modalTargetLayers = getRenameTargetLayers(doc);
        if (!modalTargetLayers.length) {
          throw new Error(shouldRenameAllLayers()
            ? "No renamable layers found in the current document."
            : "Select at least one layer before renaming.");
        }

        const hostControl = executionContext && executionContext.hostControl;
        if (!hostControl || typeof hostControl.suspendHistory !== "function" || typeof hostControl.resumeHistory !== "function") {
          await actionFn(modalTargetLayers);
          return;
        }

        const suspensionID = await hostControl.suspendHistory({
          documentID: doc.id,
          name: commandName
        });

        try {
          const visibilitySnapshot = captureLayerVisibilityState(modalTargetLayers);
          try {
            await actionFn(modalTargetLayers);
          } finally {
            restoreLayerVisibilityState(visibilitySnapshot);
          }
          suspensionID.finalName = commandName;
          await hostControl.resumeHistory(suspensionID);
        } catch (error) {
          await hostControl.resumeHistory(suspensionID, false);
          throw error;
        }
      }, {
        commandName: commandName
      });
    } else {
      await actionFn(targetLayers);
    }
  } catch (error) {
    await showPopupMessage(runtime, commandName + " failed: " + formatError(error));
    return;
  }

  renderPreview();
}

async function handleRenameLayersClick() {
  const runtime = getRuntime();
  const settings = collectRenameSettings();
  const startValue = parseInt(getElement("renameStartInput").value, 10);
  const stepValue = parseInt(getElement("renameStepInput").value, 10);
  const digitsValue = parseInt(getElement("renameDigitsInput").value, 10);

  if (!Number.isFinite(startValue) || !Number.isFinite(stepValue) || !Number.isFinite(digitsValue) || digitsValue < 1) {
    await showPopupMessage(runtime, "Please enter valid numeric values.");
    return;
  }

  settings.start = startValue;
  settings.step = stepValue;
  settings.digits = digitsValue;

  await runRenameAction("Rename Layers", async function (targetLayers) {
    renameLayersSequentially(targetLayers, settings);
  });
}

async function handleApplyPrefixSuffixClick() {
  const runtime = getRuntime();
  const settings = collectRenameSettings();

  if (!settings.prefix && !settings.suffix) {
    await showPopupMessage(runtime, "Please enter a prefix or suffix.");
    return;
  }

  await runRenameAction("Add Prefix / Suffix", async function (targetLayers) {
    applyPrefixSuffixToLayers(targetLayers, settings.prefix, settings.suffix);
  });
}

async function handleRemoveTextClick() {
  const runtime = getRuntime();
  const settings = collectRenameSettings();

  if (!settings.target) {
    await showPopupMessage(runtime, "Please enter the text you want to remove.");
    return;
  }

  await runRenameAction("Remove Text from Layers", async function (targetLayers) {
    removeTargetTextFromLayers(targetLayers, settings.target);
  });
}

async function handleReplaceTextClick() {
  const runtime = getRuntime();
  const settings = collectRenameSettings();

  if (!settings.target) {
    await showPopupMessage(runtime, "Please enter the text to replace.");
    return;
  }

  await runRenameAction("Replace Text in Layers", async function (targetLayers) {
    replaceTargetTextInLayers(targetLayers, settings.target, settings.replaceWith);
  });
}

// Sort Helpers
function sortTopLevelLayersInDocument(doc, descending) {
  sortLayerCollectionByName(doc.layers, descending, false);
}

function sortLayersRecursivelyInDocument(doc, descending) {
  sortLayerCollectionByName(doc.layers, descending, true);
}

function sortWithinSelectedGroupInDocument(doc, descending) {
  const selectedGroup = getSelectedGroupLayer(doc);
  if (!selectedGroup) {
    throw new Error("Please select exactly one group to sort.");
  }

  sortLayerCollectionByName(selectedGroup.layers, descending, false);
}

async function handleSortLayersClick() {
  const runtime = getRuntime();
  const app = runtime.app;

  if (!app.documents.length) {
    await showPopupMessage(runtime, "No document is open.");
    return;
  }

  if (runtime.mode !== "photoshop") {
    await showPopupMessage(runtime, "Layer sorting only works inside the Photoshop panel.");
    return;
  }

  const doc = app.activeDocument;
  const scope = getSortScopeValue();
  const descending = isSortDescending();

  try {
    await runtime.core.executeAsModal(async function (executionContext) {
      const hostControl = executionContext && executionContext.hostControl;
      if (!hostControl || typeof hostControl.suspendHistory !== "function" || typeof hostControl.resumeHistory !== "function") {
        if (scope === "recursive") {
          sortLayersRecursivelyInDocument(doc, descending);
        } else if (scope === "within-group") {
          sortWithinSelectedGroupInDocument(doc, descending);
        } else {
          sortTopLevelLayersInDocument(doc, descending);
        }
        return;
      }

      const suspensionID = await hostControl.suspendHistory({
        documentID: doc.id,
        name: "Sort Layers"
      });

      try {
        if (scope === "recursive") {
          sortLayersRecursivelyInDocument(doc, descending);
        } else if (scope === "within-group") {
          sortWithinSelectedGroupInDocument(doc, descending);
        } else {
          sortTopLevelLayersInDocument(doc, descending);
        }

        suspensionID.finalName = "Sort Layers";
        await hostControl.resumeHistory(suspensionID);
      } catch (error) {
        await hostControl.resumeHistory(suspensionID, false);
        throw error;
      }
    }, {
      commandName: "Sort Layers"
    });
  } catch (error) {
    await showPopupMessage(runtime, "Sort Layers failed: " + formatError(error));
    return;
  }

  renderPreview();
}

async function handleExportClick() {
  const runtime = getRuntime();
  const settings = collectSettings();

  if (runtime.mode !== "photoshop") {
    await showPopupMessage(runtime, "Exporting files only works inside the Photoshop panel.");
    return;
  }

  if (!runtime.app.documents.length) {
    await showPopupMessage(runtime, "No document is open.");
    return;
  }

  const doc = runtime.app.activeDocument;
  const orderedLayers = getOrderedLayersTopToBottom(doc);

  let outputFolderPath = "";
  try {
    outputFolderPath = ensureExportableState(runtime, doc, orderedLayers, settings);
  } catch (error) {
    const errorMessage = formatError(error);
    await showPopupMessage(runtime, errorMessage);
    return;
  }

  isExporting = true;
  updateButtonState();

  try {
    await runtime.core.executeAsModal(async function () {
      await exportSelectedLayers(runtime, doc, outputFolderPath, orderedLayers, settings);
    }, {
      commandName: "Save as Layer Name"
    });
  } catch (error) {
    await showPopupMessage(runtime, "Export failed: " + formatError(error));
  } finally {
    isExporting = false;
    updateButtonState();
    renderPreview();
  }
}

async function handleChangeLocationClick() {
  const runtime = getRuntime();
  if (runtime.mode !== "photoshop") {
    const mockPath = "D:\\Preview\\Custom Export";
    setLocationInputValue(mockPath, true);
    renderPreview();
    return;
  }

  try {
    const folder = await runtime.fs.getFolder();
    if (!folder) {
      return;
    }

    setLocationInputValue(folder.nativePath || folder.name || "", true);
    renderPreview();
  } catch (error) {
    await showPopupMessage(runtime, "Location change failed: " + formatError(error));
  }
}

function handleDefaultLocationClick() {
  syncLocationInputFromDocument(true);
  renderPreview();
}

async function handleAboutWebsiteClick() {
  const runtime = getRuntime();
  const websiteUrl = "https://tranthangminh.github.io/";

  try {
    if (runtime.shell && typeof runtime.shell.openExternal === "function") {
      const result = await runtime.shell.openExternal(
        websiteUrl,
        "Open Max Chen's website in your default browser."
      );

      if (typeof result === "string" && result) {
        await showPopupMessage(runtime, "Could not open the website: " + result);
      }
      return;
    }
  } catch (error) {
    await showPopupMessage(runtime, "Could not open the website: " + formatError(error));
    return;
  }

  await showPopupMessage(runtime, "Could not open the website.");
}

// App Bootstrap
function setSortOrderLabelText(inputId, labelText) {
  const input = getElement(inputId);
  if (!input || !input.parentElement) {
    return;
  }

  const label = input.parentElement.querySelector(".radio-option-label");
  if (label) {
    label.textContent = labelText;
  }
}

document.addEventListener("DOMContentLoaded", function () {
  const bindSlider = function (id, valueId, labelPrefix) {
    const slider = getElement(id);
    if (typeof bindSharedSlider === "function") {
      bindSharedSlider(id + "Slider");
    }
    slider.addEventListener("input", function () {
      normalizeSlider(id, valueId, labelPrefix);
      scheduleSliderPreviewRefresh();
    });
    slider.addEventListener("change", function () {
      clearSliderInputTimer();
      normalizeSlider(id, valueId, labelPrefix);
      savePanelSettings();
      renderPreview();
    });
  };

  bindSlider("jpgQuality", "jpgQualityValue", "Quality");
  bindSlider("pngCompression", "pngCompressionValue", "Compression");
  bindSlider("webpQuality", "webpQualityValue", "Quality");
  bindFormatNameToggle("jpgRow", "jpgEnabled");
  bindFormatNameToggle("pngRow", "pngEnabled");
  bindFormatNameToggle("webpRow", "webpEnabled");
  bindFormatNameToggle("psdRow", "psdEnabled");
  bindFormatNameToggle("tiffRow", "tiffEnabled");
  bindFormatNameToggle("bmpRow", "bmpEnabled");

  getElement("jpgEnabled").addEventListener("change", function () {
    handleFormatEnabledChange("jpgRow", "jpgEnabled");
  });
  getElement("pngEnabled").addEventListener("change", function () {
    handleFormatEnabledChange("pngRow", "pngEnabled");
  });
  getElement("webpEnabled").addEventListener("change", function () {
    handleFormatEnabledChange("webpRow", "webpEnabled");
  });
  getElement("psdEnabled").addEventListener("change", function () {
    handleFormatEnabledChange("psdRow", "psdEnabled");
  });
  getElement("tiffEnabled").addEventListener("change", function () {
    handleFormatEnabledChange("tiffRow", "tiffEnabled");
  });
  getElement("bmpEnabled").addEventListener("change", function () {
    handleFormatEnabledChange("bmpRow", "bmpEnabled");
  });
  getElement("webpMode").addEventListener("click", function () {
    cycleModeButtonValue("webpMode");
    updateWebPMode();
    savePanelSettings();
    renderPreview();
  });
  getElement("psdMode").addEventListener("click", function () {
    cycleModeButtonValue("psdMode");
    savePanelSettings();
    renderPreview();
  });
  getElement("psdMaxCompatibility").addEventListener("change", function () {
    savePanelSettings();
    renderPreview();
  });
  getElement("tiffCompression").addEventListener("click", function () {
    cycleModeButtonValue("tiffCompression");
    savePanelSettings();
    renderPreview();
  });
  getElement("tiffTransparency").addEventListener("change", function () {
    savePanelSettings();
    renderPreview();
  });
  getElement("bmpDepth").addEventListener("click", function () {
    cycleModeButtonValue("bmpDepth");
    updateBmpDepth();
    savePanelSettings();
    renderPreview();
  });
  getElement("bmpAlphaChannels").addEventListener("change", function () {
    savePanelSettings();
    renderPreview();
  });
  getElement("prefixInput").addEventListener("input", function () {
    savePanelSettings();
    renderPreview();
  });
  getElement("suffixInput").addEventListener("input", function () {
    savePanelSettings();
    renderPreview();
  });
  getElement("renameAllLayersCheckbox").addEventListener("change", function () {
    savePanelSettings();
    renderPreview();
  });
  getElement("renameBaseNameInput").addEventListener("input", function () {
    savePanelSettings();
    renderPreview();
  });
  getElement("renameStartInput").addEventListener("input", function () {
    savePanelSettings();
    renderPreview();
  });
  getElement("renameStepInput").addEventListener("input", function () {
    savePanelSettings();
    renderPreview();
  });
  getElement("renameDigitsInput").addEventListener("input", function () {
    savePanelSettings();
    renderPreview();
  });
  getElement("renameLayerPrefixInput").addEventListener("input", function () {
    savePanelSettings();
    renderPreview();
  });
  getElement("renameLayerSuffixInput").addEventListener("input", function () {
    savePanelSettings();
    renderPreview();
  });
  getElement("removeTargetInput").addEventListener("input", function () {
    savePanelSettings();
    renderPreview();
  });
  getElement("replaceWithInput").addEventListener("input", function () {
    savePanelSettings();
    renderPreview();
  });
  getElement("sortScopeTopLevel").addEventListener("change", savePanelSettings);
  getElement("sortScopeRecursive").addEventListener("change", savePanelSettings);
  getElement("sortScopeWithinGroup").addEventListener("change", savePanelSettings);
  getElement("sortOrderAz").addEventListener("change", savePanelSettings);
  getElement("sortOrderZa").addEventListener("change", savePanelSettings);
  getElement("locationInput").addEventListener("input", function () {
    locationInputDirty = true;
    renderPreview();
  });
  getElement("renameLayersBtn").addEventListener("click", handleRenameLayersClick);
  getElement("applyPrefixSuffixBtn").addEventListener("click", handleApplyPrefixSuffixClick);
  getElement("removeTextBtn").addEventListener("click", handleRemoveTextClick);
  getElement("replaceTextBtn").addEventListener("click", handleReplaceTextClick);
  getElement("sortLayersBtn").addEventListener("click", handleSortLayersClick);
  getElement("changeLocationBtn").addEventListener("click", handleChangeLocationClick);
  getElement("defaultLocationBtn").addEventListener("click", handleDefaultLocationClick);
  getElement("exportMenuInfoBtn").addEventListener("click", handleExportMenuInfoClick);
  getElement("aboutWebsiteBtn").addEventListener("click", handleAboutWebsiteClick);
  getElement("exportBtn").addEventListener("click", handleExportClick);
  bindCollapsibleToggle("exportMenuToggleBtn", "exportMenuSection", "exportMenuToggleIcon", savePanelSettings);
  bindCollapsibleToggle("fileTypeToggleBtn", "fileTypeSection", "fileTypeToggleIcon", savePanelSettings);
  bindCollapsibleToggle("renameToggleBtn", "renameSection", "renameToggleIcon", savePanelSettings);
  bindCollapsibleToggle("exportLocationToggleBtn", "exportLocationSection", "exportLocationToggleIcon", savePanelSettings);
  bindCollapsibleToggle("exportPreviewToggleBtn", "exportPreviewSection", "exportPreviewToggleIcon", savePanelSettings);
  bindCollapsibleToggle("renameLayersMenuToggleBtn", "renameLayersMenuSection", "renameLayersMenuToggleIcon", savePanelSettings);
  bindCollapsibleToggle("renameLayersActionToggleBtn", "renameLayersActionSection", "renameLayersActionToggleIcon", savePanelSettings);
  bindCollapsibleToggle("renamePrefixSuffixToggleBtn", "renamePrefixSuffixSection", "renamePrefixSuffixToggleIcon", savePanelSettings);
  bindCollapsibleToggle("removeReplaceToggleBtn", "removeReplaceSection", "removeReplaceToggleIcon", savePanelSettings);
  bindCollapsibleToggle("sortLayersMenuToggleBtn", "sortLayersMenuSection", "sortLayersMenuToggleIcon", savePanelSettings);
  bindCollapsibleToggle("sortScopeToggleBtn", "sortScopeSection", "sortScopeToggleIcon", savePanelSettings);
  bindCollapsibleToggle("sortOrderToggleBtn", "sortOrderSection", "sortOrderToggleIcon", savePanelSettings);
  bindCollapsibleToggle("aboutMeToggleBtn", "aboutMeSection", "aboutMeToggleIcon", savePanelSettings);

  applySavedPanelSettings();
  setSortOrderLabelText("sortOrderAz", "A -> Z");
  setSortOrderLabelText("sortOrderZa", "Z -> A");
  setModeButtonValue("webpMode", getWebPMode());
  setModeButtonValue("psdMode", getPsdMode());
  setModeButtonValue("tiffCompression", getTiffCompression());
  setModeButtonValue("bmpDepth", getBmpDepth());
  syncCollapsibleSectionState("exportMenuSection", "exportMenuToggleBtn", "exportMenuToggleIcon", getElement("exportMenuSection").classList.contains("is-collapsed"));
  syncCollapsibleSectionState("fileTypeSection", "fileTypeToggleBtn", "fileTypeToggleIcon", getElement("fileTypeSection").classList.contains("is-collapsed"));
  syncCollapsibleSectionState("renameSection", "renameToggleBtn", "renameToggleIcon", getElement("renameSection").classList.contains("is-collapsed"));
  syncCollapsibleSectionState("exportLocationSection", "exportLocationToggleBtn", "exportLocationToggleIcon", getElement("exportLocationSection").classList.contains("is-collapsed"));
  syncCollapsibleSectionState("exportPreviewSection", "exportPreviewToggleBtn", "exportPreviewToggleIcon", getElement("exportPreviewSection").classList.contains("is-collapsed"));
  syncCollapsibleSectionState("renameLayersMenuSection", "renameLayersMenuToggleBtn", "renameLayersMenuToggleIcon", getElement("renameLayersMenuSection").classList.contains("is-collapsed"));
  syncCollapsibleSectionState("renameLayersActionSection", "renameLayersActionToggleBtn", "renameLayersActionToggleIcon", getElement("renameLayersActionSection").classList.contains("is-collapsed"));
  syncCollapsibleSectionState("renamePrefixSuffixSection", "renamePrefixSuffixToggleBtn", "renamePrefixSuffixToggleIcon", getElement("renamePrefixSuffixSection").classList.contains("is-collapsed"));
  syncCollapsibleSectionState("removeReplaceSection", "removeReplaceToggleBtn", "removeReplaceToggleIcon", getElement("removeReplaceSection").classList.contains("is-collapsed"));
  syncCollapsibleSectionState("sortLayersMenuSection", "sortLayersMenuToggleBtn", "sortLayersMenuToggleIcon", getElement("sortLayersMenuSection").classList.contains("is-collapsed"));
  syncCollapsibleSectionState("sortScopeSection", "sortScopeToggleBtn", "sortScopeToggleIcon", getElement("sortScopeSection").classList.contains("is-collapsed"));
  syncCollapsibleSectionState("sortOrderSection", "sortOrderToggleBtn", "sortOrderToggleIcon", getElement("sortOrderSection").classList.contains("is-collapsed"));
  syncCollapsibleSectionState("aboutMeSection", "aboutMeToggleBtn", "aboutMeToggleIcon", getElement("aboutMeSection").classList.contains("is-collapsed"));
  normalizeSlider("jpgQuality", "jpgQualityValue", "Quality");
  normalizeSlider("pngCompression", "pngCompressionValue", "Compression");
  normalizeSlider("webpQuality", "webpQualityValue", "Quality");
  updateWebPMode();
  updateBmpDepth();
  syncAllFormatRowStates();
  syncLocationInputFromDocument(true);
  updateButtonState();
  renderPreview();
  startAutoRefresh();
});
