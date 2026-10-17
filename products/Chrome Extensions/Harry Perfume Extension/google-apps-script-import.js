// ==========================================================================
// GOOGLE APPS SCRIPT - API XUẤT DỮ LIỆU NHẬP HÀNG (CHO TAB NHẬP EXTENSION)
// Tự động nhận diện 13 cột: Ngày, Người nhập, Nguồn tiền, Dung tích, Tên, Giá,
// SL, Thành tiền, Tình Trạng, Đã Thanh Toán, Người gửi, Ghi chú, Nguồn
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
      return ContentService.createTextOutput(JSON.stringify([]))
             .setMimeType(ContentService.MimeType.JSON);
    }

    // 1. Đọc hàng tiêu đề (Dòng 1) và chuẩn hóa tên cột (NFC + lowercase + trim)
    var headers = sheet.getRange(1, 1, 1, lastCol).getDisplayValues()[0];
    var colMap = {};
    for (var c = 0; c < headers.length; c++) {
      var hName = headers[c] ? headers[c].toString().trim().toLowerCase().normalize("NFC") : "";
      if (hName) {
        colMap[hName] = c;
      }
    }

    // 2. Bảng ánh xạ 12 cột dữ liệu từ Google Sheet sang Object Key của Extension
    var FIELD_MAP = {
      ngay:          "ngày",
      nguoi_nhap:    "người nhập",
      nguon_tien:    "nguồn tiền",
      dung_tich:     "dung tích",
      ten:           "tên",
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

      // Chỉ thêm dòng nếu có ít nhất 1 ô có dữ liệu (bỏ qua dòng trống)
      if (hasData) {
        item._row = i + 2; // Ghi nhớ số thứ tự dòng thực tế trên Sheet (dòng 1 là tiêu đề)
        result.push(item);
      }
    }

    // 4. Sắp xếp mặc định: Ngày mới nhất ở trên cùng
    result.sort(function(a, b) {
      return parseDateStr(b.ngay) - parseDateStr(a.ngay);
    });

    return ContentService.createTextOutput(JSON.stringify(result))
           .setMimeType(ContentService.MimeType.JSON);

  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({ error: err.toString() }))
           .setMimeType(ContentService.MimeType.JSON);
  }
}

// ==========================================================================
// CẬP NHẬT DỮ LIỆU ĐƯỢC CHỈNH SỬA TỪ EXTENSION NGƯỢC LÊN GOOGLE SHEET
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
    var rowsToUpdate = payload.rows || [];

    if (!Array.isArray(rowsToUpdate) || rowsToUpdate.length === 0) {
      return ContentService.createTextOutput(JSON.stringify({ error: "Không có dòng dữ liệu nào cần cập nhật" }))
             .setMimeType(ContentService.MimeType.JSON);
    }

    var lastCol = sheet.getLastColumn();
    var maxRow = sheet.getLastRow();
    var headers = sheet.getRange(1, 1, 1, lastCol).getDisplayValues()[0];
    var colMap = {};
    for (var c = 0; c < headers.length; c++) {
      var hName = headers[c] ? headers[c].toString().trim().toLowerCase().normalize("NFC") : "";
      if (hName) {
        colMap[hName] = c + 1; // 1-based column index
      }
    }

    var FIELD_MAP = {
      ngay:          "ngày",
      nguoi_nhap:    "người nhập",
      nguon_tien:    "nguồn tiền",
      dung_tich:     "dung tích",
      ten:           "tên",
      gia:           "giá",
      sl:            "sl",
      thanh_tien:    "thành tiền",
      tinh_trang:    "tình trạng",
      da_thanh_toan: "đã thanh toán",
      nguoi_gui:     "người gửi",
      ghi_chu:       "ghi chú"
    };

    var updatedCount = 0;

    for (var k = 0; k < rowsToUpdate.length; k++) {
      var item = rowsToUpdate[k];
      var rowNum = parseInt(item._row, 10);

      // Nếu có số dòng hợp lệ
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

