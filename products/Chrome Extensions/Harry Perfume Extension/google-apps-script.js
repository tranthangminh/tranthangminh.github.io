// ==========================================================================
// GOOGLE APPS SCRIPT - HÀM DOGET() ÁNH XẠ THEO TÊN CỘT CHUẨN TỪ HÀNG TIÊU ĐỀ
// BỔ SUNG 13 CỘT GIÁ VỐN: giavonfull1..5, giavontest1..5, giavon5ml, giavon10ml, giavon20ml
// ==========================================================================

function doGet(e) {
  try {
    var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("📜Share");
    if (!sheet) {
      return ContentService.createTextOutput(JSON.stringify({ error: "Không tìm thấy tab 📜Share" }))
             .setMimeType(ContentService.MimeType.JSON);
    }
    
    var lastRow = sheet.getLastRow();
    var lastCol = sheet.getLastColumn();
    if (lastRow < 2 || lastCol < 1) {
      return ContentService.createTextOutput(JSON.stringify([]))
             .setMimeType(ContentService.MimeType.JSON);
    }
    
    // 1. Đọc toàn bộ Hàng Tiêu Đề (Dòng 1) để tạo bản đồ tên cột (case-insensitive)
    var headers = sheet.getRange(1, 1, 1, lastCol).getDisplayValues()[0];
    var colMap = {};
    for (var c = 0; c < headers.length; c++) {
      var hName = headers[c] ? headers[c].toString().trim().toLowerCase() : "";
      if (hName) {
        colMap[hName] = c;
      }
    }
    
    // 2. Bảng khớp nối Key Extension -> Tên Tiêu Đề Cột chuẩn trên Google Sheet
    var FIELD_MAP = {
      // Tin nhanh
      nhom:            "nhom",
      tieu_de:         "tieu_de",
      anh:             "anh",
      noi_dung:        "noi_dung",

      // Sản phẩm Nước hoa
      name:            "name",
      img:             "img",
      sex:             "sex",
      quocgia:         "quocgia",
      namramat:        "namramat",
      tenrutgon:       "tenrutgon",
      doluuhuong:      "doluuhuong",
      dotoahuong:      "dotoahuong",
      muituongtu:      "muituongtu",
      huongchinh:      "huongchinh",
      huongdau:        "huongdau",
      huonggiua:       "huonggiua",
      huongcuoi:       "huongcuoi",

      // Mẫu văn bản tư vấn & Khuyến mãi
      text_mau_tu_van: "text_mau_tu_van",
      text_freeship:   "text_freeship",
      text_tang5ml:    "text_tang5ml",

      // Chương trình Khuyến mãi Đơn hàng
      sales_promotion: "sales_promotion",
      discount_rate:   "discount_rate",
      sale_type:       "sale_type",
      
      // Fullbox 1..5
      dungtich1:       "dungtich1",
      dungtich2:       "dungtich2",
      dungtich3:       "dungtich3",
      dungtich4:       "dungtich4",
      dungtich5:       "dungtich5",
      
      giafull1:        "giafull1",
      giafull2:        "giafull2",
      giafull3:        "giafull3",
      giafull4:        "giafull4",
      giafull5:        "giafull5",
      
      tonkhofull1:     "tonkhofull1",
      tonkhofull2:     "tonkhofull2",
      tonkhofull3:     "tonkhofull3",
      tonkhofull4:     "tonkhofull4",
      tonkhofull5:     "tonkhofull5",

      // Giá vốn Fullbox 1..5
      giavonfull1:     "giavonfull1",
      giavonfull2:     "giavonfull2",
      giavonfull3:     "giavonfull3",
      giavonfull4:     "giavonfull4",
      giavonfull5:     "giavonfull5",

      // Tester 1..5
      giatester1:      "giatester1",
      giatester2:      "giatester2",
      giatester3:      "giatester3",
      giatester4:      "giatester4",
      giatester5:      "giatester5",

      // Giá vốn Tester 1..5
      giavontest1:     "giavontest1",
      giavontest2:     "giavontest2",
      giavontest3:     "giavontest3",
      giavontest4:     "giavontest4",
      giavontest5:     "giavontest5",
      
      // Chiết
      gia5ml:          "gia5ml",
      gia10ml:         "gia10ml",
      gia20ml:         "gia20ml",

      // Giá vốn Chiết
      giavon5ml:       "giavon5ml",
      giavon10ml:      "giavon10ml",
      giavon20ml:      "giavon20ml",
      
      // Gốc 1..5
      dungtichgoc1:    "dungtichgoc1",
      dungtichgoc2:    "dungtichgoc2",
      dungtichgoc3:    "dungtichgoc3",
      dungtichgoc4:    "dungtichgoc4",
      dungtichgoc5:    "dungtichgoc5",

      giagoc1:         "giagoc1",
      giagoc2:         "giagoc2",
      giagoc3:         "giagoc3",
      giagoc4:         "giagoc4",
      giagoc5:         "giagoc5",

      tonkhogoc1:      "tonkhogoc1",
      tonkhogoc2:      "tonkhogoc2",
      tonkhogoc3:      "tonkhogoc3",
      tonkhogoc4:      "tonkhogoc4",
      tonkhogoc5:      "tonkhogoc5",

      // Season & Time Tags
      xuan:            "Xuân",
      ha:              "Hạ",
      thu:             "Thu",
      dong:            "Đông",
      ngay:            "Ngày",
      dem:             "Đêm"
    };
    
    // 3. Đọc dữ liệu từ Dòng 2 đến hết
    var dataValues = sheet.getRange(2, 1, lastRow - 1, lastCol).getDisplayValues();
    var result = [];
    
    for (var j = 0; j < dataValues.length; j++) {
      var row = dataValues[j];
      
      // Lấy giá trị name (cho Nước hoa) hoặc tieu_de / noi_dung (cho Tin nhanh)
      var nameIdx = colMap["name"];
      var titleIdx = colMap["tieu_de"];
      var contentIdx = colMap["noi_dung"];
      
      var nameVal = (nameIdx !== undefined && nameIdx < row.length) ? row[nameIdx].trim() : "";
      var titleVal = (titleIdx !== undefined && titleIdx < row.length) ? row[titleIdx].trim() : "";
      var contentVal = (contentIdx !== undefined && contentIdx < row.length) ? row[contentIdx].trim() : "";
      
      // Bỏ qua dòng nếu rỗng cả Tên nước hoa lẫn Tiêu đề/Nội dung Tin nhanh
      if (!nameVal && !titleVal && !contentVal) continue;
      
      var item = {};
      for (var key in FIELD_MAP) {
        var idx = colMap[FIELD_MAP[key].toLowerCase()];
        item[key] = (idx !== undefined && idx < row.length) ? row[idx] : "";
      }
      result.push(item);
    }
    
    return ContentService.createTextOutput(JSON.stringify(result))
           .setMimeType(ContentService.MimeType.JSON);
           
  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({ error: err.toString() }))
           .setMimeType(ContentService.MimeType.JSON);
  }
}
