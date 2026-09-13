// ==========================================================================
// GOOGLE APPS SCRIPT FOR MAX - MULTI CHAT (TAB "Data")
// ==========================================================================

function doGet(e) {
  try {
    var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("Data");
    if (!sheet) {
      return ContentService.createTextOutput(JSON.stringify({ status: "error", message: 'Không tìm thấy tab "Data"' }))
             .setMimeType(ContentService.MimeType.JSON);
    }
    
    var lastRow = sheet.getLastRow();
    var lastCol = sheet.getLastColumn();
    if (lastRow < 2 || lastCol < 1) {
      return ContentService.createTextOutput(JSON.stringify({ status: "success", channels: [], ai_models: [] }))
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
    
    // 2. Bảng khớp nối Key Channels -> Tên Tiêu Đề Cột chuẩn trên Google Sheet
    var FIELD_MAP_CHANNELS = {
      main_group:       "main_group",
      main_group_icon:  "main_group_icon",
      sub_group:        "sub_group",
      tags:             "tags",
      tab_name:         "tab_name",
      tab_url_1:        "tab_url_1",
      custom_favicon_1: "custom_favicon_1",
      open_external_1:  "open_external_1",
      is_dual_acc_1:    "is_dual_acc_1",
      tab_url_2:        "tab_url_2",
      custom_favicon_2: "custom_favicon_2",
      open_external_2:  "open_external_2",
      is_dual_acc_2:    "is_dual_acc_2"
    };

    // 3. Bảng khớp nối Key AI Models -> Tên Tiêu Đề Cột chuẩn trên Google Sheet
    var FIELD_MAP_AI = {
      id:          "ai-id",
      name:        "ai-name",
      url:         "ai-url",
      icon:        "ai-icon",
      active:      "ai-active",
      description: "ai-description"
    };
    
    // 4. Đọc dữ liệu từ Dòng 2 đến hết
    var dataValues = sheet.getRange(2, 1, lastRow - 1, lastCol).getDisplayValues();
    var channels = [];
    var ai_models = [];
    
    for (var j = 0; j < dataValues.length; j++) {
      var row = dataValues[j];
      
      // Lấy chỉ số các cột nhận diện
      var tabNameIdx = colMap["tab_name"];
      var tabUrl1Idx = colMap["tab_url_1"];
      var aiIdIdx = colMap["ai-id"];
      var aiUrlIdx = colMap["ai-url"];

      var tabNameVal = (tabNameIdx !== undefined && tabNameIdx < row.length) ? row[tabNameIdx].trim() : "";
      var tabUrl1Val = (tabUrl1Idx !== undefined && tabUrl1Idx < row.length) ? row[tabUrl1Idx].trim() : "";
      var aiIdVal = (aiIdIdx !== undefined && aiIdIdx < row.length) ? row[aiIdIdx].trim() : "";
      var aiUrlVal = (aiUrlIdx !== undefined && aiUrlIdx < row.length) ? row[aiUrlIdx].trim() : "";

      // Phân loại dòng Channel
      if (tabNameVal && tabUrl1Val) {
        var channelItem = {};
        for (var k1 in FIELD_MAP_CHANNELS) {
          var headerTitle1 = FIELD_MAP_CHANNELS[k1].toLowerCase();
          var idx1 = colMap[headerTitle1];
          channelItem[k1] = (idx1 !== undefined && idx1 < row.length) ? row[idx1] : "";
        }
        channels.push(channelItem);
      }

      // Phân loại dòng AI Model
      if (aiIdVal && aiUrlVal) {
        var aiItem = {};
        for (var k2 in FIELD_MAP_AI) {
          var headerTitle2 = FIELD_MAP_AI[k2].toLowerCase();
          var idx2 = colMap[headerTitle2];
          aiItem[k2] = (idx2 !== undefined && idx2 < row.length) ? row[idx2] : "";
        }
        ai_models.push(aiItem);
      }
    }
    
    var payload = {
      status: "success",
      timestamp: new Date().getTime(),
      channelsCount: channels.length,
      aiModelsCount: ai_models.length,
      channels: channels,
      ai_models: ai_models
    };

    return ContentService.createTextOutput(JSON.stringify(payload))
           .setMimeType(ContentService.MimeType.JSON);
           
  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({ status: "error", message: err.toString() }))
           .setMimeType(ContentService.MimeType.JSON);
  }
}
