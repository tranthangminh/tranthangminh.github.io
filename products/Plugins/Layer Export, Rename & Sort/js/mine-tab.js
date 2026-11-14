// Mine Tab Helpers
function getMineIndexedItems(collection) {
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

function formatMineError(error) {
  if (!error) {
    return "Unknown error.";
  }

  if (typeof error === "string") {
    return error;
  }

  if (error.message) {
    return String(error.message);
  }

  return String(error);
}

function getMinePartEnabled(id) {
  const checkbox = getElement(id);
  return !!(checkbox && checkbox.checked);
}

async function showMineMessage(message) {
  if (typeof getRuntime === "function" && typeof showPopupMessage === "function") {
    const runtime = getRuntime();
    await showPopupMessage(runtime, message);
    return;
  }

  if (typeof window !== "undefined" && typeof window.alert === "function") {
    window.alert(message);
  }
}

function getMineRuntime() {
  if (typeof getRuntime === "function") {
    return getRuntime();
  }

  return null;
}

function buildMinePartOneBaseCommands() {
  return [
    {
      _obj: "show",
      null: [
        {
          _enum: "ordinal",
          _ref: "layer",
          _value: "targetEnum"
        }
      ]
    },
    {
      _obj: "transform",
      _target: [
        {
          _enum: "ordinal",
          _ref: "layer",
          _value: "targetEnum"
        }
      ],
      freeTransformCenterState: {
        _enum: "quadCenterState",
        _value: "QCSAverage"
      },
      interfaceIconFrameDimmed: {
        _enum: "interpolationType",
        _value: "bicubic"
      },
      offset: {
        _obj: "offset",
        horizontal: {
          _unit: "pixelsUnit",
          _value: 0
        },
        vertical: {
          _unit: "pixelsUnit",
          _value: 0
        }
      },
      placedLayerResetTransforms: true
    },
    {
      _obj: "newPlacedLayer"
    }
  ];
}

function buildMineEditContentsCommand(documentId, layerId) {
  return {
    _obj: "placedLayerEditContents",
    documentID: documentId,
    layerID: [layerId]
  };
}

function buildMinePartTwoCommands() {
  return [
    {
      _obj: "autoCutout",
      sampleAllLayers: false
    },
    {
      _obj: "rasterizeLayer",
      _target: [
        {
          _enum: "ordinal",
          _ref: "layer",
          _value: "targetEnum"
        }
      ]
    },
    {
      _obj: "make",
      at: {
        _enum: "channel",
        _ref: "channel",
        _value: "mask"
      },
      new: {
        _class: "channel"
      },
      using: {
        _enum: "userMaskEnabled",
        _value: "revealSelection"
      }
    }
  ];
}

function buildMinePartThreeCommands() {
  return [
    {
      _obj: "copyToLayer"
    },
    {
      _obj: "delete",
      _target: [
        {
          _enum: "channel",
          _ref: "channel",
          _value: "mask"
        }
      ]
    },
    {
      _obj: "invert"
    },
    {
      _obj: "move",
      _target: [
        {
          _enum: "ordinal",
          _ref: "layer",
          _value: "targetEnum"
        }
      ],
      to: {
        _enum: "ordinal",
        _ref: "layer",
        _value: "previous"
      }
    }
  ];
}

function buildMineDeleteLayerCommand(layerId) {
  return {
    _obj: "delete",
    _target: [
      {
        _ref: "layer",
        _id: layerId
      }
    ],
    layerID: [layerId]
  };
}

async function checkLayerHasMask(runtime, layerId) {
  try {
    const result = await runtime.action.batchPlay([
      {
        _obj: "get",
        _target: [
          {
            _ref: "property",
            _property: "hasUserMask"
          },
          {
            _ref: "layer",
            _id: layerId
          }
        ]
      }
    ], {});
    return !!(result && result[0] && result[0].hasUserMask);
  } catch (error) {
    return false;
  }
}

async function selectLayerById(runtime, layerId) {
  try {
    await runtime.action.batchPlay([
      {
        _obj: "select",
        _target: [
          {
            _ref: "layer",
            _id: layerId
          }
        ],
        makeVisible: false
      }
    ], {});
  } catch (error) {}
}



function getTransformMode() {
  const bothRadio = getElement("mineTransformModeBoth");
  const fitRadio = getElement("mineTransformModeFit");
  const fillRadio = getElement("mineTransformModeFill");
  if (fitRadio && fitRadio.checked) return "fit";
  if (fillRadio && fillRadio.checked) return "fill";
  if (bothRadio && bothRadio.checked) return "both";
  return "fit";
}

function setTransformModeValue(nextValue) {
  const bothRadio = getElement("mineTransformModeBoth");
  const fitRadio = getElement("mineTransformModeFit");
  const fillRadio = getElement("mineTransformModeFill");
  
  if (fitRadio) fitRadio.checked = (nextValue === "fit");
  if (fillRadio) fillRadio.checked = (nextValue === "fill");
  if (bothRadio) bothRadio.checked = (nextValue === "both");
  
  // Ensure both inputs are always enabled since all remaining modes need them
  const widthInput = getElement("mineTransformWidth");
  const heightInput = getElement("mineTransformHeight");
  if (widthInput && heightInput) {
    widthInput.disabled = false;
    heightInput.disabled = false;
  }
}



function collectMineTabPersistedSettings() {
  const mineResetMenuSection = getElement("mineResetMenuSection");
  const mineTransformSection = getElement("mineTransformSection");
  const settings = {};

  if (mineResetMenuSection) {
    settings.mineResetMenuCollapsed = mineResetMenuSection.classList.contains("is-collapsed");
    settings.minePart1Enabled = getMinePartEnabled("minePart1Enabled");
    settings.minePart2Enabled = getMinePartEnabled("minePart2Enabled");
    settings.minePart3Enabled = getMinePartEnabled("minePart3Enabled");
    settings.minePart4Enabled = getMinePartEnabled("minePart4Enabled");
  }

  if (mineTransformSection) {
    settings.mineTransformCollapsed = mineTransformSection.classList.contains("is-collapsed");
    settings.mineTransformMode = getTransformMode();
    const widthInput = getElement("mineTransformWidth");
    const heightInput = getElement("mineTransformHeight");
    if (widthInput) settings.mineTransformWidth = widthInput.value;
    if (heightInput) settings.mineTransformHeight = heightInput.value;
    settings.mineTransformCenterEnabled = !!(getElement("mineTransformCenterEnabled") && getElement("mineTransformCenterEnabled").checked);
  }

  return settings;
}

function applyMineTabSavedSettings(savedSettings) {
  if (!savedSettings) {
    return;
  }

  if (typeof savedSettings.mineResetMenuCollapsed === "boolean" && getElement("mineResetMenuSection")) {
    syncCollapsibleSectionState("mineResetMenuSection", "mineResetMenuToggleBtn", "mineResetMenuToggleIcon", savedSettings.mineResetMenuCollapsed);
  }

  if (typeof savedSettings.minePart1Enabled === "boolean" && getElement("minePart1Enabled")) {
    getElement("minePart1Enabled").checked = savedSettings.minePart1Enabled;
  }

  if (typeof savedSettings.minePart2Enabled === "boolean" && getElement("minePart2Enabled")) {
    getElement("minePart2Enabled").checked = savedSettings.minePart2Enabled;
  }

  if (typeof savedSettings.minePart3Enabled === "boolean" && getElement("minePart3Enabled")) {
    getElement("minePart3Enabled").checked = savedSettings.minePart3Enabled;
  }

  if (typeof savedSettings.minePart4Enabled === "boolean" && getElement("minePart4Enabled")) {
    getElement("minePart4Enabled").checked = savedSettings.minePart4Enabled;
  }

  if (typeof savedSettings.mineTransformCollapsed === "boolean" && getElement("mineTransformSection")) {
    syncCollapsibleSectionState("mineTransformSection", "mineTransformToggleBtn", "mineTransformToggleIcon", savedSettings.mineTransformCollapsed);
  }

  if (typeof savedSettings.mineTransformMode === "string" && getElement("mineTransformModeBoth")) {
    setTransformModeValue(savedSettings.mineTransformMode);
  }

  if (typeof savedSettings.mineTransformWidth === "string" && getElement("mineTransformWidth")) {
    getElement("mineTransformWidth").value = savedSettings.mineTransformWidth;
  }

  if (typeof savedSettings.mineTransformHeight === "string" && getElement("mineTransformHeight")) {
    getElement("mineTransformHeight").value = savedSettings.mineTransformHeight;
  }

  if (typeof savedSettings.mineTransformCenterEnabled === "boolean" && getElement("mineTransformCenterEnabled")) {
    getElement("mineTransformCenterEnabled").checked = savedSettings.mineTransformCenterEnabled;
  }
}

async function handleMineResetRunClick() {
  await mine_ResetAnImageAndMaskIt(getMineRuntime());
}

async function handleMineTransformRunClick() {
  await mine_TransformLayerSize(getMineRuntime());
}

function bindMineTabHandlers(saveHandler) {
  const runButton = getElement("mineResetRunBtn");
  if (runButton && runButton.getAttribute("data-bound") !== "true") {
    runButton.setAttribute("data-bound", "true");
    runButton.addEventListener("click", handleMineResetRunClick);
  }

  const transformRunButton = getElement("mineTransformRunBtn");
  if (transformRunButton && transformRunButton.getAttribute("data-bound") !== "true") {
    transformRunButton.setAttribute("data-bound", "true");
    transformRunButton.addEventListener("click", handleMineTransformRunClick);
  }

  const bindRadio = function (id, value) {
    const radio = getElement(id);
    if (!radio || radio.getAttribute("data-mine-bound") === "true") {
      return;
    }
    radio.setAttribute("data-mine-bound", "true");
    radio.addEventListener("change", function () {
      if (radio.checked) {
        setTransformModeValue(value);
        if (typeof saveHandler === "function") {
          saveHandler();
        }
      }
    });
  };

  bindRadio("mineTransformModeFit", "fit");
  bindRadio("mineTransformModeFill", "fill");
  bindRadio("mineTransformModeBoth", "both");

  const bindPartCheckbox = function (id) {
    const checkbox = getElement(id);
    if (!checkbox || checkbox.getAttribute("data-mine-bound") === "true") {
      return;
    }

    checkbox.setAttribute("data-mine-bound", "true");
    checkbox.addEventListener("change", function () {
      if (typeof saveHandler === "function") {
        saveHandler();
      }
    });
  };

  bindPartCheckbox("minePart1Enabled");
  bindPartCheckbox("minePart2Enabled");
  bindPartCheckbox("minePart3Enabled");
  bindPartCheckbox("minePart4Enabled");
  bindPartCheckbox("mineTransformCenterEnabled");

  const bindPartToggle = function (toggleId, stepsId, iconId) {
    const toggle = getElement(toggleId);
    const steps = getElement(stepsId);
    const icon = getElement(iconId);
    if (!toggle || !steps || !icon || toggle.getAttribute("data-mine-bound") === "true") {
      return;
    }

    toggle.setAttribute("data-mine-bound", "true");
    toggle.addEventListener("click", function () {
      const isCollapsed = steps.classList.contains("is-collapsed");
      if (isCollapsed) {
        steps.classList.remove("is-collapsed");
        icon.textContent = "[-]";
      } else {
        steps.classList.add("is-collapsed");
        icon.textContent = "[+]";
      }
    });
  };

  bindPartToggle("minePart1Toggle", "minePart1Steps", "minePart1Icon");
  bindPartToggle("minePart2Toggle", "minePart2Steps", "minePart2Icon");
  bindPartToggle("minePart3Toggle", "minePart3Steps", "minePart3Icon");
  bindPartToggle("minePart4Toggle", "minePart4Steps", "minePart4Icon");

  const bindInput = function (id) {
    const input = getElement(id);
    if (!input || input.getAttribute("data-mine-bound") === "true") {
      return;
    }

    input.setAttribute("data-mine-bound", "true");
    input.addEventListener("input", function () {
      if (typeof saveHandler === "function") {
        saveHandler();
      }
    });
  };

  bindInput("mineTransformWidth");
  bindInput("mineTransformHeight");

  if (getElement("mineResetMenuToggleBtn") && getElement("mineResetMenuToggleBtn").getAttribute("data-mine-bound") !== "true") {
    getElement("mineResetMenuToggleBtn").setAttribute("data-mine-bound", "true");
    bindCollapsibleToggle("mineResetMenuToggleBtn", "mineResetMenuSection", "mineResetMenuToggleIcon", saveHandler);
  }

  if (getElement("mineTransformToggleBtn") && getElement("mineTransformToggleBtn").getAttribute("data-mine-bound") !== "true") {
    getElement("mineTransformToggleBtn").setAttribute("data-mine-bound", "true");
    bindCollapsibleToggle("mineTransformToggleBtn", "mineTransformSection", "mineTransformToggleIcon", saveHandler);
  }

  // Ensure input disabled states match the active radio button on binding
  setTransformModeValue(getTransformMode());
}

function syncMineTabRuntimeState() {
  const mineResetMenuSection = getElement("mineResetMenuSection");
  if (mineResetMenuSection) {
    syncCollapsibleSectionState(
      "mineResetMenuSection",
      "mineResetMenuToggleBtn",
      "mineResetMenuToggleIcon",
      mineResetMenuSection.classList.contains("is-collapsed")
    );
  }

  const mineTransformSection = getElement("mineTransformSection");
  if (mineTransformSection) {
    syncCollapsibleSectionState(
      "mineTransformSection",
      "mineTransformToggleBtn",
      "mineTransformToggleIcon",
      mineTransformSection.classList.contains("is-collapsed")
    );
  }
}

function bootstrapStandaloneMineTab() {
  if (typeof document === "undefined" || !document.body || !document.body.classList.contains("mine-tab-body")) {
    return;
  }

  bindMineTabHandlers(function () {});
  syncMineTabRuntimeState();
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", bootstrapStandaloneMineTab);
} else {
  bootstrapStandaloneMineTab();
}
