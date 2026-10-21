/**
 * Shared Product Search Engine for Harry Perfume Extension
 * Thuật toán tìm kiếm & xếp hạng nước hoa thông minh (Fuzzy Keyword Overlap & Best-Match Ranking)
 * Dùng chung cho: Tab Nước hoa, Tab Đơn hàng, Tab Nhập hàng
 */

// Tách chuỗi thành mảng các từ khóa sạch (hỗ trợ cả tiếng Việt có dấu và không dấu)
function tokenizeSearchText(text) {
  if (!text) return [];
  const norm = typeof removeAccents === "function" 
    ? removeAccents(text) 
    : String(text).toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/đ/g, "d");
  
  const cleaned = norm
    .replace(/[,\.\-_/\\()+=\[\]:;!?"'~`*]/g, " ")
    .trim();
    
  return cleaned.split(/\s+/).filter(w => w.length > 0);
}

// Lấy hoặc tạo cache tập từ khóa cho từng sản phẩm trong kho allProducts
function getProductSearchTokens(prod) {
  if (!prod) return { tokensList: [], tokensSet: new Set(), rawNorm: "" };
  if (prod._searchTokensSet && prod._searchTokensList) {
    return {
      tokensList: prod._searchTokensList,
      tokensSet: prod._searchTokensSet,
      rawNorm: prod._searchRawNorm || ""
    };
  }

  const name = String(prod.name || "");
  const short = String(prod.tenrutgon || "");
  const disp = (typeof getProductDisplayName === "function") ? getProductDisplayName(prod) : "";
  const combined = `${name} ${short} ${disp}`.trim();

  const tokensList = tokenizeSearchText(combined);
  const tokensSet = new Set(tokensList);
  const rawNorm = typeof removeAccents === "function" ? removeAccents(name).trim() : name.toLowerCase().trim();

  prod._searchTokensList = tokensList;
  prod._searchTokensSet = tokensSet;
  prod._searchRawNorm = rawNorm;

  return { tokensList, tokensSet, rawNorm };
}

// Xếp hạng danh sách sản phẩm theo độ tương đồng với từ khóa tìm kiếm
function searchProducts(query, productList = [], options = {}) {
  const list = Array.isArray(productList) ? productList : [];
  if (!query || !String(query).trim()) {
    const limit = options.limit || 0;
    return limit > 0 ? list.slice(0, limit) : list;
  }

  const cleanQuery = String(query).trim();
  const queryTokens = tokenizeSearchText(cleanQuery);
  const queryNorm = typeof removeAccents === "function" ? removeAccents(cleanQuery).trim() : cleanQuery.toLowerCase().trim();

  if (queryTokens.length === 0 || list.length === 0) {
    return [];
  }

  const queryTokensSet = new Set(queryTokens);
  const scoredItems = [];

  for (let i = 0; i < list.length; i++) {
    const prod = list[i];
    const { tokensList, tokensSet, rawNorm } = getProductSearchTokens(prod);
    const shortNorm = typeof removeAccents === "function" ? removeAccents(prod.tenrutgon || "").trim() : String(prod.tenrutgon || "").toLowerCase().trim();

    // 1. TIER 1: Khớp chính xác tuyệt đối 100% từng chữ cái
    if (queryNorm === rawNorm || (shortNorm && queryNorm === shortNorm)) {
      scoredItems.push({
        product: prod,
        score: 100000 + (1000 - rawNorm.length),
        matchCount: queryTokens.length
      });
      continue;
    }

    // 2. TIER 2: Bắt đầu bằng chuỗi tìm kiếm (StartsWith)
    if (rawNorm.startsWith(queryNorm) || (shortNorm && shortNorm.startsWith(queryNorm))) {
      scoredItems.push({
        product: prod,
        score: 50000 + (1000 - rawNorm.length),
        matchCount: queryTokens.length
      });
      continue;
    }

    // 3. TIER 3: Chứa nguyên chuỗi tìm kiếm liền mạch (Exact Substring / Includes)
    if (rawNorm.includes(queryNorm) || (shortNorm && shortNorm.includes(queryNorm))) {
      scoredItems.push({
        product: prod,
        score: 20000 + (1000 - rawNorm.length),
        matchCount: queryTokens.length
      });
      continue;
    }

    // 4. TIER 4: Tất cả các từ gõ đều xuất hiện trong sản phẩm (AND Multi-token)
    let matchedWordsCount = 0;
    queryTokensSet.forEach(word => {
      if (tokensSet.has(word)) {
        matchedWordsCount++;
      }
    });

    const isAllTokensMatched = (matchedWordsCount === queryTokensSet.size);
    const jaccard = matchedWordsCount / (queryTokensSet.size + tokensSet.size - matchedWordsCount);

    if (isAllTokensMatched) {
      scoredItems.push({
        product: prod,
        score: 10000 + Math.round(jaccard * 1000) + (1000 - rawNorm.length),
        matchCount: matchedWordsCount
      });
      continue;
    }

    // 5. TIER 5: Khớp một phần từ khóa (Fuzzy Keyword Overlap từ thuật toán Temp)
    // Chỉ lấy nếu số từ trùng >= ngưỡng tối thiểu (ít nhất 1 từ, hoặc 2 từ nếu chuỗi gõ dài từ 3 từ trở lên)
    const minRequiredWords = (queryTokens.length >= 3) ? 2 : 1;
    if (matchedWordsCount >= minRequiredWords) {
      const score = (matchedWordsCount * 1000) + Math.round(jaccard * 500) - Math.min(tokensSet.size, 100);
      scoredItems.push({
        product: prod,
        score: score,
        matchCount: matchedWordsCount
      });
    }
  }

  // Sắp xếp giảm dần theo điểm số
  scoredItems.sort((a, b) => b.score - a.score);

  const limit = options.limit || 0;
  const results = (limit > 0) ? scoredItems.slice(0, limit) : scoredItems;

  if (options.returnDetails) {
    return results;
  }
  return results.map(item => item.product);
}

// Tìm ảnh chai nước hoa tương ứng từ allProducts
// QUY TẮC BẮT BUỘC: Tên phải khớp chính xác 100% từng chữ cái, TUYỆT ĐỐI không dùng tìm gần đúng/includes
function getProductImageByName(prodName) {
  if (!prodName) return "";
  const clean = String(prodName).trim().toLowerCase();
  if (!clean || clean === "+ tên sản phẩm" || clean === "chưa có tên") return "";

  const list = (typeof allProducts !== "undefined" && Array.isArray(allProducts) && allProducts.length > 0)
    ? allProducts
    : [];

  if (list.length === 0) return "";

  // 1. Tìm chính xác tuyệt đối từng chữ cái theo tên sản phẩm hoặc tên rút gọn
  let found = list.find(p => {
    const pName = String(p.name || "").trim().toLowerCase();
    const pShort = String(p.tenrutgon || "").trim().toLowerCase();
    return pName === clean || (pShort && pShort === clean);
  });

  // 2. Nếu chưa thấy, tìm khớp chính xác không dấu (Toàn bộ chuỗi phải khớp 100% từng chữ cái)
  if (!found) {
    const cleanNorm = typeof removeAccents === "function" ? removeAccents(clean) : clean;
    if (cleanNorm) {
      found = list.find(p => {
        const pNameNorm = typeof removeAccents === "function" ? removeAccents(p.name || "") : String(p.name || "").toLowerCase();
        const pShortNorm = typeof removeAccents === "function" ? removeAccents(p.tenrutgon || "") : String(p.tenrutgon || "").toLowerCase();
        return pNameNorm === cleanNorm || (pShortNorm && pShortNorm === cleanNorm);
      });
    }
  }

  // TUYỆT ĐỐI KHÔNG tìm gần đúng (includes/substring). Nếu tên sai, thiếu chữ cái hoặc dở dang -> Trả về rỗng (hình phải mất)
  if (found && found.img && found.img !== "-" && String(found.img).startsWith("http")) {
    return String(found.img).trim();
  }
  return "";
}

if (typeof window !== "undefined") {
  window.tokenizeSearchText = tokenizeSearchText;
  window.getProductSearchTokens = getProductSearchTokens;
  window.searchProducts = searchProducts;
  window.getProductImageByName = getProductImageByName;
}
