#target photoshop

// === Helper ===
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
	var selectedLayers = [];
	var ref = new ActionReference();
	ref.putProperty(stringIDToTypeID("property"), stringIDToTypeID("targetLayers"));
	ref.putEnumerated(stringIDToTypeID("document"), stringIDToTypeID("ordinal"), stringIDToTypeID("targetEnum"));

	try {
		var result = executeActionGet(ref);
		if (result.hasKey(stringIDToTypeID("targetLayers"))) {
			var list = result.getList(stringIDToTypeID("targetLayers"));
			var doc = app.activeDocument;
			for (var i = 0; i < list.count; i++) {
				var idx = list.getReference(i).getIndex();
				try {
					activeDocument.backgroundLayer;
					idx--;
				} catch (e) {}
				selectedLayers.push(getLayerByItemIndex(idx));
			}
		}
	} catch (e) {
		// Nếu chỉ có một layer được chọn
		selectedLayers.push(app.activeDocument.activeLayer);
	}

	return selectedLayers;
}

// Dựa vào index, không cần tên nữa
function getLayerByItemIndex(idx) {
	var ref = new ActionReference();
	ref.putIndex(charIDToTypeID("Lyr "), idx);
	var desc = executeActionGet(ref);
	var layerID = desc.getInteger(stringIDToTypeID("layerID"));
	return getLayerById(layerID);
}

function getLayerById(id) {
	var doc = app.activeDocument;
	var found = null;

	function search(layers) {
		for (var i = 0; i < layers.length; i++) {
			var layer = layers[i];
			if (layer.id === id) {
				found = layer;
				return;
			} else if (layer.typename === "LayerSet") {
				search(layer.layers);
				if (found) return;
			}
		}
	}

	search(doc.layers);
	return found;
}



function getAllLayers(doc) {
	var allLayers = [];

	function collect(layerContainer) {
		for (var i = 0; i < layerContainer.layers.length; i++) {
			var layer = layerContainer.layers[i];
			if (layer.typename === "ArtLayer") {
				allLayers.push(layer);
			} else if (layer.typename === "LayerSet") {
				collect(layer); // đệ quy vào group
			}
		}
	}
	collect(doc);
	return allLayers;
}

// === UI Dialog ===
function showRenameDialog(layerCount) {
	var fontSize = 15; // Đặt kích thước font ở đây

	// Tạo font sử dụng biến fontSize
	var font = ScriptUI.newFont("Arial", fontSize);
	var fontBold = ScriptUI.newFont("Arial", "bold", fontSize);

	var dlg = new Window("dialog", "Rename Selected Layers");
	dlg.orientation = "column";
	dlg.alignChildren = "fill";
	dlg.spacing = 10;
	dlg.margins = 16;

	// ==== CHECKBOX ====
	var renameAllCheckbox = dlg.add("checkbox", undefined, "Rename all layers in document");
	renameAllCheckbox.value = false; // mặc định không chọn

	// ==== BLOCK 1: RENAME ====
	var renamePanel = dlg.add("panel", undefined, "Rename Layers");
	renamePanel.orientation = "column";
	renamePanel.alignChildren = "fill";
	renamePanel.margins = 10;
	renamePanel.graphics.font = fontBold;

	// === Preview Name ===
	var previewGroup = renamePanel.add("group");
	previewGroup.orientation = "row";
	previewGroup.alignChildren = "left";

	var previewLabel = previewGroup.add("statictext", undefined, "Preview:");
	previewLabel.graphics.font = ScriptUI.newFont("Arial", "italic", fontSize);

	var previewText = previewGroup.add("statictext", undefined, "");
	previewText.graphics.font = ScriptUI.newFont("Arial", "italic", fontSize);
	previewText.preferredSize.width = 420; // tăng lên tùy ý, ví dụ 400 pixel


	// Base name (Label bên trái Textbox)
	var baseNameGroup = renamePanel.add("group");
	baseNameGroup.orientation = "row";
	var baseNameText = baseNameGroup.add("statictext", undefined, "Base name:"); // Thêm statictext cho Base Name
	baseNameText.graphics.font = font; // Áp dụng font
	var nameInput = baseNameGroup.add("edittext", undefined, "Layer_");
	nameInput.characters = 25;
	nameInput.graphics.font = font;
	nameInput.preferredSize.width = 400;

	// Start and Step
	var numGroup = renamePanel.add("group");
	numGroup.orientation = "row";
	numGroup.add("statictext", undefined, "Start from:").graphics.font = font;
	var startInput = numGroup.add("edittext", undefined, "1");
	startInput.characters = 5;
	startInput.graphics.font = font;

	numGroup.add("statictext", undefined, "Step:").graphics.font = font;
	var stepInput = numGroup.add("edittext", undefined, "1");
	stepInput.characters = 5;
	stepInput.graphics.font = font;

	// === Nút Rename ===
	var renameBtnGroup = renamePanel.add("group");
	renameBtnGroup.alignment = "center";
	var renameBtn = renameBtnGroup.add("button", undefined, "▶️▶️▶️   RENAME   ◀️◀️◀️", {
		name: "button"
	});
	renameBtn.graphics.font = font;
	renameBtn.preferredSize.width = 250; // tăng chiều ngang
	renameBtn.preferredSize.height = 60; // tăng chiều cao

	// ==== BLOCK 2: PREFIX/SUFFIX ====
	var preSufPanel = dlg.add("panel", undefined, "Prefix / Suffix");
	preSufPanel.orientation = "column";
	preSufPanel.alignChildren = "left";
	preSufPanel.margins = 10;
	preSufPanel.graphics.font = fontBold;

	var preSufGroup = preSufPanel.add("group");
	preSufGroup.orientation = "row";

	preSufGroup.add("statictext", undefined, "Prefix:").graphics.font = font;
	var prefixInput = preSufGroup.add("edittext", undefined, "");
	prefixInput.characters = 10;
	prefixInput.graphics.font = font;
	prefixInput.preferredSize.width = 185;

	preSufGroup.add("statictext", undefined, "Suffix:").graphics.font = font;
	var suffixInput = preSufGroup.add("edittext", undefined, "");
	suffixInput.characters = 10;
	suffixInput.graphics.font = font;
	suffixInput.preferredSize.width = 185;

	// === Nút Add Prefix/Suffix ===
	var applyBtnGroup = preSufPanel.add("group");
	applyBtnGroup.alignment = "center";
	var applyBtn = applyBtnGroup.add("button", undefined, "▶️▶️▶️   Add Prefix/Suffix   ◀️◀️◀️", {
		name: "button"
	});
	applyBtn.graphics.font = font;
	applyBtn.preferredSize.width = 250; // tăng chiều ngang
	applyBtn.preferredSize.height = 60; // tăng chiều cao

	// ==== BLOCK 3: REMOVE/REPLACE ====
	var replacePanel = dlg.add("panel", undefined, "Remove / Replace");
	replacePanel.orientation = "column";
	replacePanel.alignChildren = "left";
	replacePanel.margins = 10;
	replacePanel.graphics.font = fontBold;

	var replaceGroup = replacePanel.add("group");
	replaceGroup.orientation = "row";

	replaceGroup.add("statictext", undefined, "Target:").graphics.font = font;
	var targetInput = replaceGroup.add("edittext", undefined, "");
	targetInput.characters = 15;
	targetInput.graphics.font = font;
	targetInput.preferredSize.width = 180;

	replaceGroup.add("statictext", undefined, "Replace with:").graphics.font = font;
	var replaceInput = replaceGroup.add("edittext", undefined, "");
	replaceInput.characters = 15;
	replaceInput.graphics.font = font;
	replaceInput.preferredSize.width = 180;

	// === Hai nút REMOVE và REPLACE ===
	var replaceBtnGroup = replacePanel.add("group");
	replaceBtnGroup.alignment = "center";

	var removeBtn = replaceBtnGroup.add("button", undefined, "Remove", {
		name: "button"
	});
	removeBtn.graphics.font = font;
	removeBtn.preferredSize.width = 120;
	removeBtn.preferredSize.height = 40;

	var replaceBtn = replaceBtnGroup.add("button", undefined, "Replace", {
		name: "button"
	});
	replaceBtn.graphics.font = font;
	replaceBtn.preferredSize.width = 120;
	replaceBtn.preferredSize.height = 40;

	removeBtn.onClick = function() {
		var target = targetInput.text || "";
		if (!target) {
			alert("Please enter the text you want to remove.");
			return;
		}

		var layersToRename = renameAllCheckbox.value ? getAllLayers(app.activeDocument) : selectedLayers;

		for (var i = 0; i < layersToRename.length; i++) {
			var currentName = layersToRename[i].name;
			layersToRename[i].name = currentName.split(target).join("");
		}

		updatePreview();
	};

	replaceBtn.onClick = function() {
		var target = targetInput.text || "";
		var replaceWith = replaceInput.text || "";

		if (!target) {
			alert("Please enter the text to replace.");
			return;
		}

		var layersToRename = renameAllCheckbox.value ? getAllLayers(app.activeDocument) : selectedLayers;

		for (var i = 0; i < layersToRename.length; i++) {
			var currentName = layersToRename[i].name;
			layersToRename[i].name = currentName.split(target).join(replaceWith);
		}

		updatePreview();
	};


	// === Nút Cancel ===
	var cancelGroup = dlg.add("group");
	cancelGroup.alignment = "right";
	var cancelBtn = cancelGroup.add("button", undefined, "Done", {
		name: "cancel"
	});
	cancelBtn.graphics.font = font;

	// === Preview update logic ===
	function updatePreview() {
		var base = nameInput.text;
		var start = parseInt(startInput.text, 10);
		var step = parseInt(stepInput.text, 10);
		var prefix = prefixInput.text || "";
		var suffix = suffixInput.text || "";

		if (isNaN(start)) start = 1;
		if (isNaN(step)) step = 1;

		var preview = "";
		for (var i = 0; i < Math.min(3, layerCount); i++) {
			var num = start + i * step;
			preview += prefix + base + num + suffix + (i < Math.min(3, layerCount) - 1 ? ", " : "");
		}

		if (layerCount > 3) preview += ", ...";
		previewText.text = preview;
	}

	// === Live update ===
	nameInput.onChanging = updatePreview;
	startInput.onChanging = updatePreview;
	stepInput.onChanging = updatePreview;
	prefixInput.onChanging = updatePreview;
	suffixInput.onChanging = updatePreview;

	// === Apply Prefix/Suffix ===
	applyBtn.onClick = function() {
		var prefix = prefixInput.text || "";
		var suffix = suffixInput.text || "";

		var layersToRename = renameAllCheckbox.value ? getAllLayers(app.activeDocument) : selectedLayers;

		for (var i = 0; i < layersToRename.length; i++) {
			var currentName = layersToRename[i].name;
			layersToRename[i].name = prefix + currentName + suffix;
		}

		updatePreview(); // Cập nhật preview sau khi đổi tên thật
	};

	// === Return data when rename is clicked ===
	var result = null;
	renameBtn.onClick = function() {
		var base = nameInput.text;
		var start = parseInt(startInput.text, 10);
		var step = parseInt(stepInput.text, 10);

		if (!base || isNaN(start) || isNaN(step)) {
			alert("Please enter valid values.");
			return;
		}

		var layersToRename = renameAllCheckbox.value ? getAllLayers(app.activeDocument) : selectedLayers;

		for (var i = 0; i < layersToRename.length; i++) {
			var num = start + i * step;
			layersToRename[i].name = base + num;
		}

		updatePreview(); // cập nhật lại preview sau khi rename
	};

	updatePreview(); // Gọi updatePreview lần đầu khi dialog xuất hiện
	dlg.center();
	dlg.show();

	return result;
}

// === MAIN ===
var doc = app.activeDocument;
var selectedLayers = getSelectedLayers();

if (selectedLayers.length === 0) {
	alert("No layers selected!");
} else {
	var options = showRenameDialog(selectedLayers.length);

	if (options != null) {
		var baseName = options.baseName;
		var start = options.start;
		var step = options.step;
		var prefix = options.prefix;
		var suffix = options.suffix;

		for (var i = 0; i < selectedLayers.length; i++) {
			var num = start + i * step;
			selectedLayers[i].name = prefix + baseName + num + suffix;
		}
	}
}