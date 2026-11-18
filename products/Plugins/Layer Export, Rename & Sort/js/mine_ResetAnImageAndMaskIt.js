async function mine_ResetAnImageAndMaskIt(runtime) {
  if (!runtime || runtime.mode !== "photoshop") {
    await showMineMessage("This command only works inside the Photoshop panel.");
    return;
  }

  if (!runtime.core || typeof runtime.core.executeAsModal !== "function") {
    await showMineMessage("This Photoshop runtime does not support modal commands.");
    return;
  }

  if (!runtime.action || typeof runtime.action.batchPlay !== "function") {
    await showMineMessage("This Photoshop runtime does not support batchPlay.");
    return;
  }

  if (!runtime.app || !runtime.app.documents || !runtime.app.documents.length) {
    await showMineMessage("No document is open.");
    return;
  }

  const runPartOne = getMinePartEnabled("minePart1Enabled");
  const runPartTwo = getMinePartEnabled("minePart2Enabled");
  const runPartThree = getMinePartEnabled("minePart3Enabled");
  const runPartFour = getMinePartEnabled("minePart4Enabled");

  if (!runPartOne && !runPartTwo && !runPartThree && !runPartFour) {
    await showMineMessage("Please enable at least one part.");
    return;
  }

  let successCount = 0;
  let totalCount = 0;
  const errors = [];

  try {
    await runtime.core.executeAsModal(async function () {
      const hostDocument = runtime.app.activeDocument;
      const hostLayers = getMineIndexedItems(hostDocument && hostDocument.activeLayers);

      if (!hostLayers.length) {
        throw new Error("Select at least one layer before running this command.");
      }

      const layersToProcess = hostLayers.map(function (layer) {
        return {
          id: layer.id,
          name: layer.name || ("ID: " + layer.id)
        };
      });

      totalCount = layersToProcess.length;

      await hostDocument.suspendHistory(async function () {
        for (let i = 0; i < layersToProcess.length; i += 1) {
          const layerInfo = layersToProcess[i];
          let invertedCopyLayerId = null;
          try {
            // Ensure active document is returned to hostDocument
            if (runtime.app.activeDocument.id !== hostDocument.id) {
              runtime.app.activeDocument = hostDocument;
            }

            // 1. Select the specific layer in the host document
            await selectLayerById(runtime, layerInfo.id);

            // 2. Run Part 1 (if enabled)
            if (runPartOne) {
              await runtime.action.batchPlay(buildMinePartOneBaseCommands(), {});

              const smartObjectDocument = runtime.app.activeDocument;
              const smartObjectLayers = getMineIndexedItems(smartObjectDocument && smartObjectDocument.activeLayers);
              const currentLayer = smartObjectLayers.length ? smartObjectLayers[0] : null;

              if (!smartObjectDocument || typeof smartObjectDocument.id === "undefined" || !currentLayer || typeof currentLayer.id === "undefined") {
                throw new Error("Could not resolve the current smart object layer.");
              }

              await runtime.action.batchPlay([
                buildMineEditContentsCommand(smartObjectDocument.id, currentLayer.id)
              ], {});

              const editContentsDocument = runtime.app.activeDocument;
              if (!editContentsDocument || typeof editContentsDocument.id === "undefined" || editContentsDocument.id === smartObjectDocument.id) {
                throw new Error("Could not open the smart object contents.");
              }
            }

            // 3. Run Part 2 (if enabled)
            if (runPartTwo) {
              await runtime.action.batchPlay(buildMinePartTwoCommands(), {});
            }

            // 4. Run Part 3 (if enabled)
            if (runPartThree) {
              const partThreeCommands = buildMinePartThreeCommands();
              await runtime.action.batchPlay([partThreeCommands[0]], {});
              const copyLayers = getMineIndexedItems(runtime.app.activeDocument && runtime.app.activeDocument.activeLayers);
              invertedCopyLayerId = copyLayers.length ? copyLayers[0].id : null;
              try {
                await runtime.action.batchPlay([partThreeCommands[1]], {});
              } catch (error) {}
              await runtime.action.batchPlay(partThreeCommands.slice(2), {});
            }

            // 5. Run Part 4 (if enabled)
            if (runPartFour) {
              const smartObjectDoc = runtime.app.activeDocument;
              if (!smartObjectDoc) {
                throw new Error("No active document found in UXP environment.");
              }

              // Delete the inverted copy from Part 3 before cropping
              if (invertedCopyLayerId !== null) {
                await runtime.action.batchPlay([buildMineDeleteLayerCommand(invertedCopyLayerId)], {});
              }

              // Try to find the layer with the mask and select it first
              const layers = getMineIndexedItems(smartObjectDoc.layers);
              let foundMaskLayer = null;
              for (let index = 0; index < layers.length; index += 1) {
                const hasMask = await checkLayerHasMask(runtime, layers[index].id);
                if (hasMask) {
                  foundMaskLayer = layers[index];
                  break;
                }
              }

              if (foundMaskLayer) {
                await selectLayerById(runtime, foundMaskLayer.id);
              }

              // Step 1: Load Selection from mask
              try {
                await runtime.action.batchPlay([
                  {
                    _obj: "set",
                    _target: [
                      {
                        _ref: "channel",
                        _property: "selection"
                      }
                    ],
                    to: {
                      _ref: "channel",
                      _enum: "channel",
                      _value: "mask"
                    }
                  }
                ], {});
              } catch (error) {
                throw new Error("Could not load selection from layer mask. Ensure the layer mask is not empty.");
              }

              // Step 2: Crop canvas to selection
              const selectionBounds = smartObjectDoc.selection && smartObjectDoc.selection.bounds;
              if (!selectionBounds) {
                throw new Error("No active selection to crop. Ensure the mask is not empty.");
              }

              const getVal = function (val) {
                if (val && typeof val === "object" && typeof val._value === "number") {
                  return val._value;
                }
                if (val && typeof val === "object" && typeof val.value === "number") {
                  return val.value;
                }
                return Number(val) || 0;
              };

              const left = getVal(selectionBounds.left);
              const right = getVal(selectionBounds.right);
              const top = getVal(selectionBounds.top);
              const bottom = getVal(selectionBounds.bottom);

              if (right - left <= 0 || bottom - top <= 0) {
                throw new Error("Invalid selection bounds for crop.");
              }

              await smartObjectDoc.crop({
                left: left,
                top: top,
                right: right,
                bottom: bottom
              });

              // Step 3 & 4: Save & Close (only close if it is a different document from the host)
              await smartObjectDoc.save();
              if (smartObjectDoc.id !== hostDocument.id) {
                await smartObjectDoc.close();
              }
            }

            successCount += 1;
          } catch (layerError) {
            errors.push({
              name: layerInfo.name,
              message: formatMineError(layerError)
            });

            // Cleanup: if we opened a temporary document but failed later, try to close it without saving
            try {
              const currentDoc = runtime.app.activeDocument;
              if (currentDoc && currentDoc.id !== hostDocument.id) {
                await currentDoc.close();
              }
            } catch (e) {}
          }
        }
      }, "Reset an Image & Mask Subject");

      // If all selected layers failed, throw a general error to enter the catch block
      if (successCount === 0 && totalCount > 0) {
        throw new Error("All selected layers failed to process.");
      }
    }, {
      commandName: "Reset an Image & Mask Subject"
    });

    // Outside the modal, show success / failure details
    if (totalCount > 1 || errors.length > 0) {
      let reportMessage = "Processed " + successCount + " of " + totalCount + " layer(s) successfully.";
      if (errors.length > 0) {
        reportMessage += "\n\nErrors:\n";
        for (let e = 0; e < errors.length; e += 1) {
          reportMessage += "- " + errors[e].name + ": " + errors[e].message + "\n";
        }
      }
      await showMineMessage(reportMessage);
    }
  } catch (error) {
    if (totalCount <= 1 && errors.length === 1) {
      await showMineMessage("Reset an Image & Mask Subject failed for '" + errors[0].name + "': " + errors[0].message);
    } else {
      await showMineMessage("Reset an Image & Mask Subject failed: " + formatMineError(error));
    }
  }
}
