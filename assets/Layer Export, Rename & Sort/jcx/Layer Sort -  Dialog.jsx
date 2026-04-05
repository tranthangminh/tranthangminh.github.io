#target photoshop

// Hiển thị hộp thoại chọn kiểu sắp xếp
function showSortDialog() {
  var dlg = new Window('dialog', 'Sort Layers');
  dlg.alignChildren = 'fill';
  dlg.spacing = 15;

  // === Nhóm chọn phạm vi sắp xếp ===
  var scopeGroup = dlg.add('panel', undefined, 'Scope');
  scopeGroup.orientation = 'column';
  scopeGroup.alignChildren = 'left';
  scopeGroup.margins = 15;

  var topOnly = scopeGroup.add('radiobutton', undefined, 'Top-level layers only');
  var allLayers = scopeGroup.add('radiobutton', undefined, 'All layers (recursive)');
  var withinGroup = scopeGroup.add('radiobutton', undefined, 'Sort within 1 selected group only'); // Mới thêm
  topOnly.value = true; // Mặc định là chỉ cấp cao nhất

  topOnly.graphics.font = ScriptUI.newFont("Arial", 15);
  allLayers.graphics.font = ScriptUI.newFont("Arial", 15);
  withinGroup.graphics.font = ScriptUI.newFont("Arial", 15); // Font cho lựa chọn mới

  // === Nhóm chọn thứ tự sắp xếp ===
  var orderGroup = dlg.add('panel', undefined, 'Sorting Order');
  orderGroup.orientation = 'column';
  orderGroup.alignChildren = 'left';
  orderGroup.margins = 15;

  var az = orderGroup.add('radiobutton', undefined, 'A → Z');
  var za = orderGroup.add('radiobutton', undefined, 'Z → A');
  az.value = true; // Mặc định là A-Z

  az.graphics.font = ScriptUI.newFont("Arial", "BOLD", 20);
  za.graphics.font = ScriptUI.newFont("Arial", "BOLD", 20);

  // === Nhóm nút bấm OK / Cancel ===
  var btnGroup = dlg.add('group');
  btnGroup.alignment = 'center';

  var okBtn = btnGroup.add('button', undefined, 'OK', {
    name: 'ok'
  });
  var cancelBtn = btnGroup.add('button', undefined, 'Cancel', {
    name: 'cancel'
  });

  okBtn.graphics.font = ScriptUI.newFont("Arial", 12);
  cancelBtn.graphics.font = ScriptUI.newFont("Arial", 12);

  // Trả kết quả người dùng chọn
  if (dlg.show() === 1) {
    return {
      descending: za.value, // true nếu chọn Z-A
      recursive: allLayers.value, // true nếu chọn sort toàn bộ
      withinGroup: withinGroup.value // true nếu chọn sort trong group đang chọn
    };
  } else {
    return null;
  }
}

// ===== So sánh tên theo thứ tự tự nhiên (natural order) =====
function naturalCompare(a, b) {
  var ax = [],
    bx = [];

  a.replace(/(\d+)|(\D+)/g, function(_, $1, $2) {
    ax.push([$1 || Infinity, $2 || ""]);
  });
  b.replace(/(\d+)|(\D+)/g, function(_, $1, $2) {
    bx.push([$1 || Infinity, $2 || ""]);
  });

  for (var i = 0; i < Math.max(ax.length, bx.length); i++) {
    var an = ax[i] || [Infinity, ""];
    var bn = bx[i] || [Infinity, ""];
    var nDiff = (isNaN(an[0]) ? an[1] : parseInt(an[0])) - (isNaN(bn[0]) ? bn[1] : parseInt(bn[0]));

    if (nDiff) return nDiff;
    if (an[1] !== bn[1]) return an[1] < bn[1] ? -1 : 1;
  }

  return 0;
}

// ===== Sắp xếp đệ quy tất cả layer trong document =====
function sortLayersRecursively(layers, descending) {
  var buffer = [];

  for (var i = 0; i < layers.length; i++) {
    var layer = layers[i];
    if (!layer.isBackgroundLayer) {
      buffer.push(layer);

      // Nếu là nhóm thì đệ quy tiếp
      if (layer.typename === "LayerSet" && layer.layers.length > 0) {
        sortLayersRecursively(layer.layers, descending);
      }
    }
  }

  buffer.sort(function(a, b) {
    var result = naturalCompare(a.name, b.name);
    return descending ? -result : result;
  });

  for (var j = 0; j < buffer.length; j++) {
    buffer[j].move(layers[j], ElementPlacement.PLACEBEFORE);
  }
}

// ===== Sắp xếp chỉ trong group đang chọn =====
function sortWithinSelectedGroup(descending) {
  var doc = app.activeDocument;
  var selectedLayerSet = doc.activeLayer; // Lấy group đang được chọn

  if (selectedLayerSet && selectedLayerSet.typename === "LayerSet") {
    var layers = selectedLayerSet.layers;
    var buffer = [];

    // Lưu tất cả layer trong group vào buffer để sort
    for (var i = 0; i < layers.length; i++) {
      var layer = layers[i];
      if (!layer.isBackgroundLayer) {
        buffer.push(layer);
      }
    }

    buffer.sort(function(a, b) {
      var result = naturalCompare(a.name, b.name);
      return descending ? -result : result;
    });

    for (var j = 0; j < buffer.length; j++) {
      buffer[j].move(layers[j], ElementPlacement.PLACEBEFORE);
    }
  } else {
    alert("Please select a group to sort.");
  }
}

// ===== Sắp xếp chỉ cấp cao nhất =====
function sortTopLevelLayers(descending) {
  var doc = app.activeDocument;
  var layers = [];

  for (var i = 0; i < doc.layers.length; i++) {
    layers.push(doc.layers[i]);
  }

  layers.sort(function(a, b) {
    var result = naturalCompare(a.name, b.name);
    return descending ? -result : result;
  });

  for (var j = 0; j < layers.length; j++) {
    layers[j].move(doc.layers[j], ElementPlacement.PLACEBEFORE);
  }
}

// ===== PHẦN CHẠY CHÍNH =====
if (!app.documents.length) {
  alert("No document open.");
} else {
  var result = showSortDialog();
  if (result !== null) {
    if (result.withinGroup) {
      sortWithinSelectedGroup(result.descending); // Nếu chọn sort trong group
    } else if (result.recursive) {
      sortLayersRecursively(app.activeDocument.layers, result.descending);
    } else {
      sortTopLevelLayers(result.descending);
    }
    alert("Layer sorting completed!");
  }
}