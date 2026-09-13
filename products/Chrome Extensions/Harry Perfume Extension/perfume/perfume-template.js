// Logic định dạng dung tích và ghép mẫu văn bản tư vấn nước hoa tự động (Perfume Template Logic)

// Hàm chuẩn hóa giá trị dung tích (VD: 100 -> 100ml)
function formatDungTichValue(val) {
  let s = cleanString(val);
  if (!s || s === "-") return "";
  s = s.replace(/ml$/i, "").trim();
  return s ? s + "ml" : "";
}

// Hàm lấy tên dung tích đầy đủ theo loại (Fullbox, Tester, Mẫu thử, Gốc)
function getDungTichText(type, rawDungTich) {
  const dtFormatted = formatDungTichValue(rawDungTich);
  if (type === "Full") {
    return dtFormatted ? `Fullbox ${dtFormatted}` : `Fullbox`;
  }
  if (type === "Tester") {
    return dtFormatted ? `Tester ${dtFormatted}` : `Tester`;
  }
  if (type === "Gốc") {
    return dtFormatted ? `Gốc ${dtFormatted}` : `Gốc`;
  }
  if (type === "5ml") return "Mẫu thử 5ml";
  if (type === "10ml") return "Mẫu thử 10ml";
  if (type === "20ml") return "Mẫu thử 20ml";
  return dtFormatted;
}

// Default consultation template fallback if sheet template is empty
const DEFAULT_CONSULTATION_TEMPLATE = `Dạ chai {name} {dungtich} giá là {gia}
- Ra mắt lần đầu năm {namramat}, Xuất xứ tại {quocgia}
- Nhóm hương chính là {huongchinh}
- Độ lưu hương khoảng {doluuhuong} tiếng, tỏa hương {dotoahuong} (có thể thay đổi tùy cơ địa hoặc môi trường, lưu lâu hơn trên quần áo)

{text_freeship}
{text_tang5ml}`;

// Default promo strings
const DEFAULT_FREESHIP_TEXT = "Mình mua luôn thì đơn này mình được Freeship ạ!";
const DEFAULT_TANG5ML_TEXT = "Shop còn tặng cho mình 1 chiết 5ml khi mua chai này nữa nhe!";

// Các hàm tìm mẫu template chung từ Google Sheet (lấy từ bất kỳ sản phẩm nào có điền mẫu)
function getGlobalSheetTemplate() {
  if (typeof allProducts !== "undefined" && Array.isArray(allProducts)) {
    const item = allProducts.find(p => cleanString(p.text_mau_tu_van) !== "");
    if (item) return cleanString(item.text_mau_tu_van);
  }
  return DEFAULT_CONSULTATION_TEMPLATE;
}

function getGlobalSheetFreeship() {
  if (typeof allProducts !== "undefined" && Array.isArray(allProducts)) {
    const item = allProducts.find(p => cleanString(p.text_freeship) !== "");
    if (item) return cleanString(item.text_freeship);
  }
  return DEFAULT_FREESHIP_TEXT;
}

function getGlobalSheetTang5ml() {
  if (typeof allProducts !== "undefined" && Array.isArray(allProducts)) {
    const item = allProducts.find(p => cleanString(p.text_tang5ml) !== "");
    if (item) return cleanString(item.text_tang5ml);
  }
  return DEFAULT_TANG5ML_TEXT;
}

// Hàm tự động tạo mẫu văn bản tư vấn
function generateConsultationText(prod, dungtichStr, priceVal) {
  const name = cleanString(prod.name);
  const dungtich = cleanString(dungtichStr);
  const gia = cleanString(priceVal);
  const namramat = cleanString(prod.namramat);
  const quocgia = cleanString(prod.quocgia);
  const huongchinh = cleanString(prod.huongchinh);
  const huongdau = cleanString(prod.huongdau);
  const huonggiua = cleanString(prod.huonggiua);
  const huongcuoi = cleanString(prod.huongcuoi);
  const doluuhuong = cleanString(prod.doluuhuong);
  const dotoahuong = cleanString(prod.dotoahuong);
  const sex = cleanString(prod.sex);
  const tenrutgon = cleanString(prod.tenrutgon);

  // Phân tích giá và dung tích cho các câu khuyến mãi/freeship
  const numPrice = parsePriceToNumber(priceVal);
  const isOver1Million = numPrice >= 1000000;
  
  const isFullbox = dungtich.startsWith("Fullbox");
  let capacity = 0;
  if (isFullbox) {
    const match = dungtich.match(/(\d+)\s*ml/i);
    if (match) {
      capacity = parseInt(match[1], 10);
    }
  }

  // 1. Tính toán giá trị câu Freeship (Theo đúng logic ban đầu: giá >= 1tr)
  let freeshipVal = "";
  if (isOver1Million) {
    freeshipVal = cleanString(prod.text_freeship) || getGlobalSheetFreeship();
  }

  // 2. Tính toán giá trị câu Tặng chiết 5ml (Theo đúng logic ban đầu: giá >= 1tr & Fullbox >= 60ml)
  let tang5mlVal = "";
  if (isOver1Million && isFullbox && capacity >= 60) {
    tang5mlVal = cleanString(prod.text_tang5ml) || getGlobalSheetTang5ml();
  }

  // 3. Lấy template từ sản phẩm hoặc kế thừa mẫu chung từ Google Sheet
  let templateStr = cleanString(prod.text_mau_tu_van);
  if (!templateStr || templateStr === "-") {
    templateStr = getGlobalSheetTemplate();
  }

  const displayGia = (gia && gia !== "-") ? `${gia}VND` : gia;

  // 4. Bảng thay thế các biến {key}
  const map = {
    "{name}": name,
    "{tenrutgon}": tenrutgon,
    "{sex}": sex,
    "{dungtich}": dungtich,
    "{gia}": displayGia,
    "{namramat}": namramat,
    "{quocgia}": quocgia,
    "{huongchinh}": huongchinh,
    "{huongdau}": huongdau,
    "{huonggiua}": huonggiua,
    "{huongcuoi}": huongcuoi,
    "{doluuhuong}": doluuhuong,
    "{dotoahuong}": dotoahuong,
    "{text_freeship}": freeshipVal,
    "{text_tang5ml}": tang5mlVal,
    "{khuyenmai}": [freeshipVal, tang5mlVal].filter(Boolean).join("\n")
  };

  let res = templateStr;
  for (const [k, v] of Object.entries(map)) {
    res = res.replaceAll(k, v);
  }

  // Làm sạch các dòng trống thừa ở cuối nếu freeship/tặng 5ml rỗng
  res = res.replace(/\n{3,}/g, "\n\n").trim();

  return res;
}

// Hàm phân tích chuỗi giá từ sheet thành dạng số phục vụ so sánh
function parsePriceToNumber(priceStr) {
  let s = cleanString(priceStr).replace(/[đđ₫\s]/gi, "");
  if (!s || s === "-") return 0;
  
  // Nếu có chữ 'k' hoặc 'K' ở cuối (VD: 2.350k)
  if (s.toLowerCase().endsWith("k")) {
    s = s.slice(0, -1).trim();
    const numericPart = parseFloat(s.replace(/\./g, "").replace(/,/g, ""));
    return isNaN(numericPart) ? 0 : numericPart * 1000;
  }
  
  const cleanNum = s.replace(/\./g, "").replace(/,/g, "");
  let num = parseFloat(cleanNum);
  if (isNaN(num)) return 0;
  
  // Nếu là số rút gọn (VD: 2.350 -> 2.350.000)
  if (num < 10000) {
    num = num * 1000;
  }
  return num;
}

// Hàm kiểm tra nếu 1 trong các thông tin rỗng/thiếu thì cảnh báo tô đỏ
function isConsultationMissingData(prod, dungtichStr, priceVal) {
  const name = cleanString(prod.name);
  const dungtich = cleanString(dungtichStr);
  const gia = cleanString(priceVal);
  const namramat = cleanString(prod.namramat);
  const quocgia = cleanString(prod.quocgia);
  const huongchinh = cleanString(prod.huongchinh);
  const doluuhuong = cleanString(prod.doluuhuong);
  const dotoahuong = cleanString(prod.dotoahuong);

  const checkFields = [name, dungtich, gia, namramat, quocgia, huongchinh, doluuhuong, dotoahuong];
  return checkFields.some(val => !val || val === "-");
}

// Hàm rút gọn giá hiển thị trên giao diện nút bấm (VD: 2.350.000 -> 2.350k, 500.000 -> 500k)
function formatPriceShort(priceStr) {
  let s = cleanString(priceStr).replace(/[đđ₫\s]/gi, "");
  if (!s || s === "-") return "-";
  
  // Nếu đã có chữ 'k' hoặc 'K' ở cuối thì giữ nguyên
  if (s.toLowerCase().endsWith("k")) return s;

  // Nếu kết thúc bằng .000 (VD: 2.350.000 -> 2.350k)
  if (s.endsWith(".000")) {
    return s.slice(0, -4) + "k";
  }

  // Nếu kết thúc bằng 000 không có dấu chấm (VD: 500000 -> 500k)
  if (s.endsWith("000")) {
    return s.slice(0, -3) + "k";
  }

  // Nếu là số ngắn đã rút gọn sẵn từ trước (VD: 2.350 -> 2.350k)
  const numericOnly = s.replace(/\./g, "");
  if (!isNaN(numericOnly) && numericOnly !== "") {
    return s + "k";
  }

  return s;
}
