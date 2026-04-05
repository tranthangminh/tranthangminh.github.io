#target photoshop

// --- Hàm hỗ trợ viết gọn ---
function cTID(s) {
  return app.charIDToTypeID(s);
}

function sTID(s) {
  return app.stringIDToTypeID(s);
}

// === TẠO GROUP TẠM để lấy danh sách layer đang được chọn ===
function newGroupFromLayers() {
  var desc = new ActionDescriptor();
  var ref = new ActionReference();
  ref.putClass(sTID('layerSection'));
  desc.putReference(cTID('null'), ref);

  var lref = new ActionReference();
  lref.putEnumerated(cTID('Lyr '), cTID('Ordn'), cTID('Trgt'));
  desc.putReference(cTID('From'), lref);

  executeAction(cTID('Mk  '), desc, DialogModes.NO);
}

// === LẤY DANH SÁCH LAYER ĐANG ĐƯỢC CHỌN ===
function getSelectedLayers() {
  var selLayers = [];
  newGroupFromLayers(); // Tạo group tạm từ các layer được chọn

  var group = app.activeDocument.activeLayer;
  var layers = group.layers;

  // Thêm từng layer trong group vào danh sách
  for (var i = 0; i < layers.length; i++) {
    selLayers.push(layers[i]);
  }

  // Ẩn tất cả layer trong danh sách trước khi xuất
  for (var j = 0; j < selLayers.length; j++) {
    selLayers[j].visible = false;
  }

  // Undo lại hành động tạo group (khôi phục trạng thái ban đầu)
  executeAction(cTID("undo", undefined, DialogModes.NO));

  return selLayers;
}

// === GIAO DIỆN HỘP THOẠI ===
var dlg = new Window("dialog", "Export as Layer Name");
dlg.orientation = "column";
dlg.alignChildren = "left";
dlg.spacing = 10;
dlg.margins = 15;




// --- Nhóm JPG --- 🖼️🖼️🖼️🖼️🖼️🖼️🖼️🖼️🖼️🖼️🖼️
var jpgGroup = dlg.add("group");
jpgGroup.orientation = "row";

// Checkbox JPG bọc trong group để đổi màu nền
var jpgCheckboxWrapper = jpgGroup.add("group");
jpgCheckboxWrapper.orientation = "stack";
jpgCheckboxWrapper.alignChildren = "center";
jpgCheckboxWrapper.preferredSize = [100, 80];
jpgCheckboxWrapper.graphics.backgroundColor = jpgCheckboxWrapper.graphics.newBrush(jpgCheckboxWrapper.graphics.BrushType.SOLID_COLOR, [0.2, 0.2, 0.2]); // trắng

var jpgCheckbox = jpgCheckboxWrapper.add("checkbox", undefined, "JPG");
jpgCheckbox.graphics.font = ScriptUI.newFont("Arial", "BOLD", 25);
jpgCheckbox.preferredSize = [100, 80];

// Sự kiện thay đổi màu nền khi tick
jpgCheckbox.onClick = function() {
  if (jpgCheckbox.value) {
    jpgCheckboxWrapper.graphics.backgroundColor = jpgCheckboxWrapper.graphics.newBrush(jpgCheckboxWrapper.graphics.BrushType.SOLID_COLOR, [0.15, 0.5, 0.15]); // xanh lá nhạt
  } else {
    jpgCheckboxWrapper.graphics.backgroundColor = jpgCheckboxWrapper.graphics.newBrush(jpgCheckboxWrapper.graphics.BrushType.SOLID_COLOR, [0.2, 0.2, 0.2]); // trắng
  }
};

// Group con chứa Quality + slider + text
var jpgSettingGroup = jpgGroup.add("group");
jpgSettingGroup.orientation = "column";
jpgSettingGroup.alignChildren = "left";

// Nhóm chứa chữ "Quality:"
var qualityLabel = jpgSettingGroup.add("statictext", undefined, "Quality:");
qualityLabel.graphics.font = ScriptUI.newFont("Arial", "BOLD", 16);

// Nhóm chứa slider và giá trị số
var sliderRow = jpgSettingGroup.add("group");
sliderRow.orientation = "row";

// Slider
var jpgSlider = sliderRow.add("slider", undefined, 10, 1, 12);
jpgSlider.preferredSize.width = 150;

// Text hiển thị giá trị
var jpgQualityText = sliderRow.add("statictext", undefined, "10");
jpgQualityText.graphics.font = ScriptUI.newFont("Arial", "BOLD", 16);

// Cập nhật số khi kéo
jpgSlider.onChanging = function() {
  jpgQualityText.text = Math.round(jpgSlider.value).toString();
};


// ===== Separator between JPG and PNG =====
addColoredSeparator(dlg);




// --- Nhóm PNG --- 🖼️🖼️🖼️🖼️🖼️🖼️🖼️🖼️🖼️🖼️🖼️
var pngGroup = dlg.add("group");
pngGroup.orientation = "row";

// Checkbox PNG
var pngCheckboxWrapper = pngGroup.add("group");
pngCheckboxWrapper.orientation = "stack";
pngCheckboxWrapper.alignChildren = "center";
pngCheckboxWrapper.preferredSize = [100, 80];
pngCheckboxWrapper.graphics.backgroundColor = pngCheckboxWrapper.graphics.newBrush(pngCheckboxWrapper.graphics.BrushType.SOLID_COLOR, [0.2, 0.2, 0.2]);

var pngCheckbox = pngCheckboxWrapper.add("checkbox", undefined, "PNG");
pngCheckbox.graphics.font = ScriptUI.newFont("Arial", "BOLD", 25);
pngCheckbox.preferredSize = [100, 80];

pngCheckbox.onClick = function() {
  if (pngCheckbox.value) {
    pngCheckboxWrapper.graphics.backgroundColor = pngCheckboxWrapper.graphics.newBrush(pngCheckboxWrapper.graphics.BrushType.SOLID_COLOR, [0.15, 0.5, 0.15]);
  } else {
    pngCheckboxWrapper.graphics.backgroundColor = pngCheckboxWrapper.graphics.newBrush(pngCheckboxWrapper.graphics.BrushType.SOLID_COLOR, [0.2, 0.2, 0.2]);
  }
};

// Group con chứa Compression + slider
var pngSettingGroup = pngGroup.add("group");
pngSettingGroup.orientation = "column";
pngSettingGroup.alignChildren = "left";

// Text "Compression:"
var compressionLabel = pngSettingGroup.add("statictext", undefined, "Compression:");
compressionLabel.graphics.font = ScriptUI.newFont("Arial", "BOLD", 16);

// Nhóm chứa slider + giá trị
var compressionSliderRow = pngSettingGroup.add("group");
compressionSliderRow.orientation = "row";

// Slider
var pngSlider = compressionSliderRow.add("slider", undefined, 9, 0, 9);
pngSlider.preferredSize.width = 150;

// Giá trị compression
var pngCompressionText = compressionSliderRow.add("statictext", undefined, "9");
pngCompressionText.graphics.font = ScriptUI.newFont("Arial", "BOLD", 16);

pngSlider.onChanging = function() {
  pngCompressionText.text = Math.round(pngSlider.value).toString();
};

// ===== Separator between PNG and WebP =====
addColoredSeparator(dlg);



// --- Nhóm WebP --- 🖼️🖼️🖼️🖼️🖼️🖼️🖼️🖼️🖼️🖼️🖼️
var webpGroup = dlg.add("group");
webpGroup.orientation = "row";

// Checkbox WebP
var webpCheckboxWrapper = webpGroup.add("group");
webpCheckboxWrapper.orientation = "stack";
webpCheckboxWrapper.alignChildren = "center";
webpCheckboxWrapper.preferredSize = [100, 80];
webpCheckboxWrapper.graphics.backgroundColor = webpCheckboxWrapper.graphics.newBrush(webpCheckboxWrapper.graphics.BrushType.SOLID_COLOR, [0.2, 0.2, 0.2]);

var webpCheckbox = webpCheckboxWrapper.add("checkbox", undefined, "WebP");
webpCheckbox.graphics.font = ScriptUI.newFont("Arial", "BOLD", 25);
webpCheckbox.preferredSize = [100, 80];

webpCheckbox.onClick = function() {
  if (webpCheckbox.value) {
    webpCheckboxWrapper.graphics.backgroundColor = webpCheckboxWrapper.graphics.newBrush(webpCheckboxWrapper.graphics.BrushType.SOLID_COLOR, [0.15, 0.5, 0.15]);
  } else {
    webpCheckboxWrapper.graphics.backgroundColor = webpCheckboxWrapper.graphics.newBrush(webpCheckboxWrapper.graphics.BrushType.SOLID_COLOR, [0.2, 0.2, 0.2]);
  }
};

// Group con chứa dropdown + slider
var webpSettingGroup = webpGroup.add("group");
webpSettingGroup.orientation = "column";
webpSettingGroup.alignChildren = "left";

// Dropdown Lossless/Lossy
var webpOptionDropdown = webpSettingGroup.add("dropdownlist", undefined, ["Lossless", "Lossy"]);
webpOptionDropdown.selection = 1;
webpOptionDropdown.graphics.font = ScriptUI.newFont("Arial", "BOLD", 16);

// Nhóm chứa slider + text
var webpSliderRow = webpSettingGroup.add("group");
webpSliderRow.orientation = "row";

// Slider
var webpSlider = webpSliderRow.add("slider", undefined, 80, 0, 100);
webpSlider.preferredSize.width = 150;

// Text số
var webpQualityText = webpSliderRow.add("statictext", undefined, "80");
webpQualityText.graphics.font = ScriptUI.newFont("Arial", "BOLD", 16);

webpSlider.onChanging = function() {
  var stepped = Math.round(webpSlider.value / 5) * 5;
  webpSlider.value = stepped;
  webpQualityText.text = stepped.toString();
};

// Ẩn slider khi chọn Lossless
webpOptionDropdown.onChange = function() {
  webpSliderRow.visible = (webpOptionDropdown.selection.text === "Lossy");
};

addColoredSeparator(dlg);




// --- Nhóm prefix/suffix ---
var nameGroup = dlg.add("group");
nameGroup.orientation = "row";
nameGroup.alignChildren = "top";

var prefixGroup = nameGroup.add("group");
prefixGroup.orientation = "column";

// Label "Prefix"
var prefixLabel = prefixGroup.add("statictext", undefined, "Prefix:");
prefixLabel.graphics.font = ScriptUI.newFont("Arial", "BOLD", 16); // 👈 tăng size chữ

// Ô nhập Prefix
var prefixInput = prefixGroup.add("edittext", undefined, "");
prefixInput.characters = 15;
prefixInput.graphics.font = ScriptUI.newFont("Arial", "", 16); // 👈 tăng size chữ ô nhập

// 👉 Separator dọc có màu giữa Prefix và Suffix
var vSep = nameGroup.add("group");
vSep.alignment = "fill"; // cho rộng hết chiều cao của hàng
vSep.minimumSize = [2, 30]; // width = 2px, height tối thiểu = 30px
vSep.maximumSize = [2, 1000]; // đảm bảo không co quá nhỏ
vSep.margins = [10, 0, 10, 0]; // cách đều 2 bên prefix/suffix
// Thiết lập brush màu sắc (cùng màu xám nhạt như separator ngang)
vSep.graphics.backgroundColor = vSep.graphics.newBrush(
  vSep.graphics.BrushType.SOLID_COLOR,
  [0.1, 0.1, 0.1] // RGB normalized (0–1)
);

var suffixGroup = nameGroup.add("group");
suffixGroup.orientation = "column";

// Label "Suffix"
var suffixLabel = suffixGroup.add("statictext", undefined, "Suffix:");
suffixLabel.graphics.font = ScriptUI.newFont("Arial", "BOLD", 16); // 👈 tăng size chữ

// Ô nhập Suffix
var suffixInput = suffixGroup.add("edittext", undefined, "");
suffixInput.characters = 15;
suffixInput.graphics.font = ScriptUI.newFont("Arial", "", 16); // 👈 tăng size chữ ô nhập

addColoredSeparator(dlg);



// --- Nhóm nút OK/Cancel ---
var btnGroup = dlg.add("group");
btnGroup.alignment = "center";
var okBtn = btnGroup.add("button", undefined, "Export");
okBtn.graphics.font = ScriptUI.newFont("Arial", "BOLD", 24);
okBtn.preferredSize = [150, 50]; // Tăng chiều rộng (150) và chiều cao (50)

var cancelBtn = btnGroup.add("button", undefined, "Cancel");
cancelBtn.graphics.font = ScriptUI.newFont("Arial", "BOLD", 24);
cancelBtn.preferredSize = [150, 50]; // Tăng chiều rộng (150) và chiều cao (50)

var doRun = false;
okBtn.onClick = function() {
  if (!jpgCheckbox.value && !pngCheckbox.value && !webpCheckbox.value) {
    alert("Please select at least one format (JPG, PNG, or WebP) to export.");
    return; // không cho đóng dialog
  }
  doRun = true;
  dlg.close();
};
cancelBtn.onClick = function() {
  dlg.close();
};

dlg.center();
dlg.show();




// ===== Separator Function =====
function addColoredSeparator(parent) {
  var sep = parent.add("group");
  sep.alignment = "fill";
  sep.margins = 0;
  sep.minimumSize.height = 2;
  sep.maximumSize.height = 2;
  sep.graphics.backgroundColor = sep.graphics.newBrush(sep.graphics.BrushType.SOLID_COLOR, [0.1, 0.1, 0.1]);
  return sep;
}



// === THỰC HIỆN XUẤT FILE NẾU ĐÃ NHẤN OK ===
if (doRun) {
  var selectedLayers = getSelectedLayers(app.activeDocument);

  for (var i = 0; i < selectedLayers.length; i++) {
    var layer = selectedLayers[i];
    layer.selected = true;
    layer.visible = true;
    app.activeDocument.activeLayer = layer;

    var prefix = prefixInput.text || "";
    var suffix = suffixInput.text || "";
    var layerName = (prefix + layer.name + suffix).replace(/[\\\/:*?"<>|]/g, "_");
    var doc = app.activeDocument;

    // --- Xuất JPG ---
    if (jpgCheckbox.value) {
      var opts = new JPEGSaveOptions();
      opts.quality = Math.round(jpgSlider.value);
      doc.saveAs(new File(doc.path + "/" + layerName + ".jpg"), opts, true, Extension.LOWERCASE);
    }

    // --- Xuất PNG ---
    if (pngCheckbox.value) {
      var pngOpts = new PNGSaveOptions();
      pngOpts.compression = Math.round(pngSlider.value); // lấy từ slider
      pngOpts.transparency = true;
      pngOpts.interlaced = false;
      doc.saveAs(new File(doc.path + "/" + layerName + ".png"), pngOpts, true, Extension.LOWERCASE);
    }

    // --- Xuất WebP ---
    if (webpCheckbox.value) {
      var webpOpts = new ExportOptionsSaveForWeb();
      if (webpOptionDropdown.selection.text === "Lossy") {
        webpOpts.format = SaveDocumentType.JPEG;
        webpOpts.quality = Math.round(webpSlider.value);
      } else {
        webpOpts.format = SaveDocumentType.PNG;
      }
      doc.exportDocument(new File(doc.path + "/" + layerName + ".webp"), ExportType.SAVEFORWEB, webpOpts);
    }

    layer.visible = false;
  }
}