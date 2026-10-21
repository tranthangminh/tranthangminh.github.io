// ==========================================================================
// GOOGLE APPS SCRIPT - API XUẤT & ĐỒNG BỘ DỮ LIỆU NHẬP HÀNG (TAB NHẬP)
// Hỗ trợ:
// 1. 12 Cột dữ liệu kiện hàng: Ngày, Người nhập, Nguồn tiền, Dung tích, Sản Phẩm, Giá,
//    SL, Thành tiền, Tình Trạng, Đã Thanh Toán, Người gửi, Ghi chú.
// 2. 7 Cột Danh sách Dropdown: List-Người Nhập, List-Nguồn Tiền,
//    List-Tình Trạng, List-Người gửi, List-Ghi chú, List-Dung tích, List-Sản phẩm.
// ==========================================================================

function doGet(e) {
  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sheetName = (e && e.parameter && e.parameter.sheet) ? e.parameter.sheet : "Nhập";
    var sheet = ss.getSheetByName(sheetName);

    if (!sheet) {
      return ContentService.createTextOutput(JSON.stringify({ error: "Không tìm thấy tab \"" + sheetName + "\"" }))
             .setMimeType(ContentService.MimeType.JSON);
    }

    var lastRow = sheet.getLastRow();
    var lastCol = sheet.getLastColumn();
    if (lastRow < 2 || lastCol < 1) {
      return ContentService.createTextOutput(JSON.stringify({ items: [], lists: {} }))
             .setMimeType(ContentService.MimeType.JSON);
    }

    // 1. Đọc hàng tiêu đề (Dòng 1)
    var headers = sheet.getRange(1, 1, 1, lastCol).getDisplayValues()[0];
    var colMap = {};
    for (var c = 0; c < headers.length; c++) {
      var rawH = headers[c] ? headers[c].toString().trim() : "";
      if (rawH) {
        colMap[rawH.toLowerCase().normalize("NFC")] = c;
      }
    }

    // 2. Bảng ánh xạ 12 cột dữ liệu sản phẩm từ Google Sheet sang Object Key của Extension
    var FIELD_MAP = {
      ngay:          "ngày",
      nguoi_nhap:    "người nhập",
      nguon_tien:    "nguồn tiền",
      dung_tich:     "dung tích",
      ten:           "sản phẩm",
      gia:           "giá",
      sl:            "sl",
      thanh_tien:    "thành tiền",
      tinh_trang:    "tình trạng",
      da_thanh_toan: "đã thanh toán",
      nguoi_gui:     "người gửi",
      ghi_chu:       "ghi chú"
    };

    // 3. Đọc toàn bộ giá trị hiển thị từ dòng 2 đến hết
    var dataValues = sheet.getRange(2, 1, lastRow - 1, lastCol).getDisplayValues();
    var result = [];

    for (var i = 0; i < dataValues.length; i++) {
      var row = dataValues[i];
      var item = {};
      var hasData = false;

      for (var key in FIELD_MAP) {
        var headerName = FIELD_MAP[key];
        var idx = colMap[headerName];
        var val = (idx !== undefined && idx < row.length) ? row[idx].trim() : "";
        item[key] = val;
        if (val) hasData = true;
      }

      // Chỉ thêm dòng nếu có ít nhất tên sản phẩm, ngày hoặc người gửi (bỏ qua dòng template/rác)
      if (item.ten || item.ngay || (item.nguoi_gui && item.nguoi_gui !== "-")) {
        item._row = i + 2; // Ghi nhớ số thứ tự dòng thực tế trên Sheet (dòng 1 là tiêu đề)
        result.push(item);
      }
    }

    // 4. Sắp xếp mặc định: Ngày mới nhất ở trên cùng
    result.sort(function(a, b) {
      return parseDateStr(b.ngay) - parseDateStr(a.ngay);
    });

    // 5. Trích xuất danh sách giá trị từ các Cột Dropdown người dùng cung cấp
    var LIST_COLUMNS = [
      "List-Người Nhập",
      "List-Nguồn Tiền",
      "List-Tình Trạng",
      "List-Người gửi",
      "List-Ghi chú",
      "List-Dung tích",
      "List-Sản phẩm"
    ];

    function extractDropdownList(colName) {
      var colIdx = -1;
      var targetNormalized = colName.toLowerCase().normalize("NFC");
      for (var c = 0; c < headers.length; c++) {
        var h = headers[c] ? headers[c].toString().trim().toLowerCase().normalize("NFC") : "";
        if (h === targetNormalized) {
          colIdx = c;
          break;
        }
      }
      if (colIdx === -1) return [];

      var list = [];
      var seen = {};
      for (var r = 0; r < dataValues.length; r++) {
        var cellVal = (colIdx < dataValues[r].length) ? dataValues[r][colIdx].trim() : "";
        if (cellVal !== "" && !seen[cellVal]) {
          seen[cellVal] = true;
          list.push(cellVal);
        }
      }
      return list;
    }

    var dropdownLists = {};
    for (var l = 0; l < LIST_COLUMNS.length; l++) {
      var colTitle = LIST_COLUMNS[l];
      dropdownLists[colTitle] = extractDropdownList(colTitle);
    }

    // 6. Phản hồi API
    // 6.1. Nếu gọi chỉ để lấy danh sách Dropdown: ?action=get_lists
    if (e && e.parameter && e.parameter.action === "get_lists") {
      return ContentService.createTextOutput(JSON.stringify(dropdownLists))
             .setMimeType(ContentService.MimeType.JSON);
    }

    // 6.2. Nếu gọi định dạng mảng thuần túy: ?format=array
    if (e && e.parameter && e.parameter.format === "array") {
      return ContentService.createTextOutput(JSON.stringify(result))
             .setMimeType(ContentService.MimeType.JSON);
    }

    // 6.3. Mặc định: Trả về đối tượng đầy đủ gồm items và lists
    var responsePayload = {
      items: result,
      lists: dropdownLists
    };

    return ContentService.createTextOutput(JSON.stringify(responsePayload))
           .setMimeType(ContentService.MimeType.JSON);

  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({ error: err.toString() }))
           .setMimeType(ContentService.MimeType.JSON);
  }
}

// ==========================================================================
// CẬP NHẬT HOẶC THÊM MỚI DỮ LIỆU TỪ EXTENSION LÊN GOOGLE SHEET
// ==========================================================================
function doPost(e) {
  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sheet = ss.getSheetByName("Nhập");

    if (!sheet) {
      return ContentService.createTextOutput(JSON.stringify({ error: "Không tìm thấy tab \"Nhập\"" }))
             .setMimeType(ContentService.MimeType.JSON);
    }

    var contents = (e && e.postData && e.postData.contents) ? e.postData.contents : "";
    if (!contents) {
      return ContentService.createTextOutput(JSON.stringify({ error: "Payload rỗng" }))
             .setMimeType(ContentService.MimeType.JSON);
    }

    var payload = JSON.parse(contents);
    var action = payload.action || "update_import_rows";

    var lastCol = sheet.getLastColumn();
    var maxRow = sheet.getLastRow();
    var headers = sheet.getRange(1, 1, 1, lastCol).getDisplayValues()[0];
    var colMap = {};
    for (var c = 0; c < headers.length; c++) {
      var rawH = headers[c] ? headers[c].toString().trim() : "";
      if (rawH) {
        colMap[rawH.toLowerCase().normalize("NFC")] = c + 1; // 1-based column index
      }
    }

    var FIELD_MAP = {
      ngay:          "ngày",
      nguoi_nhap:    "người nhập",
      nguon_tien:    "nguồn tiền",
      dung_tich:     "dung tích",
      ten:           "sản phẩm",
      gia:           "giá",
      sl:            "sl",
      thanh_tien:    "thành tiền",
      tinh_trang:    "tình trạng",
      da_thanh_toan: "đã thanh toán",
      nguoi_gui:     "người gửi",
      ghi_chu:       "ghi chú"
    };

    // 1. NHÁNH THÊM MỚI CÁC DÒNG NGAY SAU DÒNG CÓ SẢN PHẨM CUỐI CÙNG
    if (action === "add_import_rows") {
      var rowsToAdd = payload.rows || [];
      if (!Array.isArray(rowsToAdd) || rowsToAdd.length === 0) {
        return ContentService.createTextOutput(JSON.stringify({ error: "Không có dòng dữ liệu nào để thêm mới" }))
               .setMimeType(ContentService.MimeType.JSON);
      }

      // Xác định chỉ số cột "Sản Phẩm" (tìm dòng cuối cùng có dữ liệu ở cột Sản Phẩm)
      var nameColIndex = colMap["sản phẩm"];
      var totalSheetRows = sheet.getMaxRows();
      var lastNameRow = 1;

      if (nameColIndex && nameColIndex <= lastCol && totalSheetRows > 1) {
        var nameValues = sheet.getRange(1, nameColIndex, totalSheetRows, 1).getDisplayValues();
        for (var r = totalSheetRows; r >= 2; r--) {
          var nameCell = nameValues[r - 1][0] ? nameValues[r - 1][0].trim() : "";
          if (nameCell !== "") {
            lastNameRow = r;
            break;
          }
        }
      } else {
        lastNameRow = sheet.getLastRow();
      }

      var targetStartRow = lastNameRow + 1;
      var neededRows = (targetStartRow + rowsToAdd.length - 1) - totalSheetRows;
      if (neededRows > 0) {
        sheet.insertRowsAfter(totalSheetRows, neededRows);
      }

      // Lấy sẵn giá trị hiện tại của các dòng target để bảo toàn 100% các cột khác (như List-*)
      var matrixData = sheet.getRange(targetStartRow, 1, rowsToAdd.length, lastCol).getValues();
      var addedItems = [];

      for (var a = 0; a < rowsToAdd.length; a++) {
        var itemToAdd = rowsToAdd[a];
        for (var fieldKey in FIELD_MAP) {
          if (itemToAdd.hasOwnProperty(fieldKey)) {
            var headerName = FIELD_MAP[fieldKey];
            var colIndex = colMap[headerName];
            if (colIndex && colIndex <= lastCol) {
              matrixData[a][colIndex - 1] = itemToAdd[fieldKey] !== undefined ? String(itemToAdd[fieldKey]) : "";
            }
          }
        }
        itemToAdd._row = targetStartRow + a;
        addedItems.push(itemToAdd);
      }

      sheet.getRange(targetStartRow, 1, rowsToAdd.length, lastCol).setValues(matrixData);
      SpreadsheetApp.flush();

      return ContentService.createTextOutput(JSON.stringify({
        success: true,
        addedCount: addedItems.length,
        addedRows: addedItems,
        startRow: targetStartRow
      })).setMimeType(ContentService.MimeType.JSON);
    }

    // 2. NHÁNH CẬP NHẬT CÁC DÒNG CÓ SẴN
    var rowsToUpdate = payload.rows || [];

    if (!Array.isArray(rowsToUpdate) || rowsToUpdate.length === 0) {
      return ContentService.createTextOutput(JSON.stringify({ error: "Không có dòng dữ liệu nào cần cập nhật" }))
             .setMimeType(ContentService.MimeType.JSON);
    }

    var updatedCount = 0;

    for (var k = 0; k < rowsToUpdate.length; k++) {
      var item = rowsToUpdate[k];
      var rowNum = parseInt(item._row, 10);

      if (rowNum >= 2 && rowNum <= maxRow) {
        for (var fieldKey in FIELD_MAP) {
          if (item.hasOwnProperty(fieldKey)) {
            var headerName = FIELD_MAP[fieldKey];
            var colIndex = colMap[headerName];
            if (colIndex) {
              sheet.getRange(rowNum, colIndex).setValue(item[fieldKey] !== undefined ? String(item[fieldKey]) : "");
            }
          }
        }
        updatedCount++;
      }
    }

    SpreadsheetApp.flush();

    return ContentService.createTextOutput(JSON.stringify({
      success: true,
      updatedCount: updatedCount
    })).setMimeType(ContentService.MimeType.JSON);

  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({ error: err.toString() }))
           .setMimeType(ContentService.MimeType.JSON);
  }
}

// Chuyển chuỗi ngày (DD/MM/YYYY, DD/MM, YYYY-MM-DD...) thành timestamp để so sánh
function parseDateStr(str) {
  if (!str) return 0;
  var s = String(str).trim();
  var mFull = s.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})/);
  if (mFull) {
    return new Date(parseInt(mFull[3], 10), parseInt(mFull[2], 10) - 1, parseInt(mFull[1], 10)).getTime();
  }
  var mShort = s.match(/^(\d{1,2})[\/\-](\d{1,2})$/);
  if (mShort) {
    return new Date(new Date().getFullYear(), parseInt(mShort[2], 10) - 1, parseInt(mShort[1], 10)).getTime();
  }
  var t = Date.parse(s);
  return isNaN(t) ? 0 : t;
}
