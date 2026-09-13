// Mapping nhóm từ số 1 -> 7 sang CSS class màu sắc tương ứng (7 Sắc Cầu Vồng)
const groupColorMap = {
  "1": "tag-red",
  "2": "tag-orange",
  "3": "tag-gold",
  "4": "tag-green",
  "5": "tag-blue",
  "6": "tag-cyan",
  "7": "tag-purple"
};

// Dữ liệu Tin Nhanh mặc định nạp từ CSV
let defaultNewsData = [];

// Hàm parse CSV hỗ trợ các trường bọc trong dấu ngoặc kép "" và có ký tự xuống dòng \n
function parseCSVText(csvText) {
  const result = [];
  let row = [];
  let field = "";
  let inQuotes = false;
  
  for (let i = 0; i < csvText.length; i++) {
    const c = csvText[i];
    const nextC = csvText[i + 1];
    
    if (inQuotes) {
      if (c === '"') {
        if (nextC === '"') {
          field += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        field += c;
      }
    } else {
      if (c === '"') {
        inQuotes = true;
      } else if (c === ',') {
        row.push(field);
        field = "";
      } else if (c === '\r') {
        // Bỏ qua \r
      } else if (c === '\n') {
        row.push(field);
        result.push(row);
        row = [];
        field = "";
      } else {
        field += c;
      }
    }
  }
  if (field !== "" || row.length > 0) {
    row.push(field);
    result.push(row);
  }
  return result;
}

// Hàm nạp dữ liệu Tin Nhanh từ dữ liệu Google Sheet (allProducts / cachedProducts)
async function loadDefaultNewsFromSheet() {
  try {
    let rawSheetData = typeof allProducts !== "undefined" ? allProducts : [];
    if (!Array.isArray(rawSheetData) || rawSheetData.length === 0) {
      rawSheetData = (await StorageHelper.get("cachedProducts", [])) || [];
    }
    
    const parsed = [];
    rawSheetData.forEach((item, index) => {
      const title = cleanString(item.tieu_de);
      const content = cleanString(item.noi_dung);
      const rawNhom = cleanString(item.nhom);
      const rawImg = cleanString(item.anh);

      if (!title && !content) return;

      const nhomNum = rawNhom ? String(rawNhom) : "3";
      let imgVal = rawImg;
      if (rawImg.includes(";")) {
        imgVal = rawImg.split(";").map(s => cleanString(s)).filter(Boolean);
      }

      const tagClass = groupColorMap[nhomNum] || "tag-gold";

      parsed.push({
        id: "sheet_news_" + index,
        title: title,
        content: content,
        img: imgVal,
        class: tagClass,
        nhom: parseInt(nhomNum, 10) || 3
      });
    });

    defaultNewsData = parsed;
  } catch (e) {
    defaultNewsData = [];
  }
}

// Hàm đọc dữ liệu thẻ tự tạo từ StorageHelper
async function getLocalNews() {
  try {
    const data = await StorageHelper.get("localNewsData", []);
    return Array.isArray(data) ? data : [];
  } catch (e) {
    return [];
  }
}

// Hàm ghi dữ liệu thẻ tự tạo vào StorageHelper
async function saveLocalNews(localNews) {
  try {
    await StorageHelper.set("localNewsData", localNews);
  } catch (e) {}
}

// Khởi tạo danh sách thẻ kết hợp mặc định và tự tạo
let newsData = [];
let selectedNews = null;

// Khai báo phần tử DOM cho Tin Nhanh
const newsTagsGrid = document.getElementById("newsTagsGrid");

// Vẽ lưới thẻ tiêu đề Tin Nhanh
async function renderNewsTab() {
  await loadDefaultNewsFromSheet();
  const localNews = await getLocalNews();
  newsData = [...defaultNewsData, ...localNews];
  newsTagsGrid.innerHTML = "";
  
  newsData.forEach((item, index) => {
    // Chèn đường kẻ phân cách khi chuyển nhóm màu sắc khác hoặc chuyển sang nhóm thẻ tự tạo
    if (index > 0) {
      const prev = newsData[index - 1];
      const isGroupChanged = !item.isCustom && !prev.isCustom && item.nhom !== prev.nhom;
      const isFirstCustom = item.isCustom && !prev.isCustom;
      if (isGroupChanged || isFirstCustom) {
        const divider = document.createElement("hr");
        divider.className = "news-grid-divider";
        newsTagsGrid.appendChild(divider);
      }
    }
    
    const card = document.createElement("div");
    card.className = "news-tag-card";
    if (item.class) {
      card.classList.add(item.class);
    }
    card.dataset.id = item.id;
    card.innerText = item.title;
    card.addEventListener("click", () => showNewsDetail(item, true));
    newsTagsGrid.appendChild(card);
  });
  
  // Thêm nút "Thêm thẻ" ở cuối lưới
  const addBtnCard = document.createElement("div");
  addBtnCard.className = "news-tag-card btn-add-card";
  addBtnCard.innerText = "➕ Thêm thẻ";
  addBtnCard.addEventListener("click", openAddCardModal);
  newsTagsGrid.appendChild(addBtnCard);
  
  if (newsData.length > 0 && !selectedNews) {
    showNewsDetail(newsData[0], false);
  } else if (selectedNews) {
    const exists = newsData.some(item => item.id === selectedNews.id);
    if (exists) {
      showNewsDetail(selectedNews, false);
    } else if (newsData.length > 0) {
      showNewsDetail(newsData[0], false);
    }
  }
}
