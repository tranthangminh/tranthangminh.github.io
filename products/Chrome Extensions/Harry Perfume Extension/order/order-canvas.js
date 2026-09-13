// ==========================================================================
// ORDER CONFIRMATION - CANVAS IMAGE EXPORT ENGINE (RETINA 2X HIGH-RES)
// ==========================================================================

const OrderCanvasEngine = {
  // Format tiền tệ VNĐ (VD: 380,000đ)
  formatMoney: function(num) {
    if (isNaN(num) || num === null || num === undefined) return "0đ";
    return Number(num).toLocaleString("vi-VN") + "đ";
  },

  // Format ngày giờ Việt Nam
  formatDateTime: function(d = new Date()) {
    const pad = (n) => String(n).padStart(2, "0");
    const day = pad(d.getDate());
    const month = pad(d.getMonth() + 1);
    const year = d.getFullYear();
    const hours = pad(d.getHours());
    const mins = pad(d.getMinutes());
    return `${day}/${month}/${year} ${hours}:${mins}`;
  },

  // Hàm chia dòng văn bản tự động vừa với chiều rộng Canvas
  wrapText: function(ctx, text, maxWidth) {
    if (!text) return [];
    const words = String(text).split(" ");
    const lines = [];
    let currentLine = "";

    for (let i = 0; i < words.length; i++) {
      const testLine = currentLine ? currentLine + " " + words[i] : words[i];
      const metrics = ctx.measureText(testLine);
      if (metrics.width > maxWidth && currentLine) {
        lines.push(currentLine);
        currentLine = words[i];
      } else {
        currentLine = testLine;
      }
    }
    if (currentLine) lines.push(currentLine);
    return lines;
  },

  // Hàm vẽ hình chữ nhật bo góc
  roundRect: function(ctx, x, y, width, height, radius, fill = false, stroke = false) {
    ctx.beginPath();
    ctx.moveTo(x + radius, y);
    ctx.lineTo(x + width - radius, y);
    ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
    ctx.lineTo(x + width, y + height - radius);
    ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
    ctx.lineTo(x + radius, y + height);
    ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
    ctx.lineTo(x, y + radius);
    ctx.quadraticCurveTo(x, y, x + radius, y);
    ctx.closePath();
    if (fill) ctx.fill();
    if (stroke) ctx.stroke();
  },

  // Tải và cache logo thương hiệu vector siêu nét từ file asset svg/logo-full.svg (chuẩn Rule 5)
  loadLogoImage: async function(color = "#f8f8f8") {
    const cacheKey = `_cachedLogo_${color}`;
    if (this[cacheKey]) return this[cacheKey];

    try {
      const url = (typeof chrome !== "undefined" && chrome.runtime?.getURL)
        ? chrome.runtime.getURL("svg/logo-full.svg")
        : "svg/logo-full.svg";
      const resp = await fetch(url);
      const rawSvg = await resp.text();

      // Đổi toàn bộ fill sang màu đơn sắc theo yêu cầu
      let coloredSvg = rawSvg.replace(/\.st0\s*\{[^}]*\}/g, `.st0 { fill: ${color}; }`);
      coloredSvg = coloredSvg.replace(/\.st1\s*\{[^}]*\}/g, `.st1 { fill: ${color}; }`);
      coloredSvg = coloredSvg.replace(/fill:\s*#[0-9a-fA-F]{3,6}/gi, `fill: ${color}`);

      // Gán kích thước vector gốc cao để canvas render siêu nét (Retina vector sharpness)
      coloredSvg = coloredSvg.replace(/<svg\b([^>]*)>/i, `<svg$1 width="1024" height="157">`);

      return new Promise((resolve) => {
        const img = new Image();
        img.onload = () => {
          this[cacheKey] = img;
          resolve(img);
        };
        img.onerror = () => {
          resolve(null);
        };
        img.src = "data:image/svg+xml;charset=utf-8," + encodeURIComponent(coloredSvg);
      });
    } catch (e) {
      return null;
    }
  },

  // Dựng ảnh hóa đơn và trả về Canvas Blob
  generateInvoiceImage: async function(orderData) {
    const { items = [], customer = {}, totals = {} } = orderData;

    // Chiều rộng hóa đơn cơ sở (480px) - Tỷ lệ dọc chuẩn màn hình điện thoại
    const scale = 2;
    const baseWidth = 480;
    const paddingX = 18;
    const tableW = baseWidth - paddingX * 2; // 444px

    // Lấy màu text primary từ CSS theme
    const textPrimaryColor = (typeof window !== "undefined" && window.getComputedStyle)
      ? getComputedStyle(document.documentElement).getPropertyValue("--text-primary").trim() || "#f8f8f8"
      : "#f8f8f8";

    // Tải trước logo thương hiệu vector siêu nét
    const logoImg = await this.loadLogoImage(textPrimaryColor);

    // Tải trước ảnh của tất cả sản phẩm (chạy đồng thời Promise.all, hỗ trợ CORS)
    const loadedItemImages = await Promise.all(
      items.map((item) => {
        let imgUrl = item.img;
        if (!imgUrl && typeof allProducts !== "undefined" && Array.isArray(allProducts)) {
          const p = allProducts.find((x) => x.name === item.name || (x.tenrutgon && x.tenrutgon === item.name));
          if (p && p.img && p.img !== "-" && p.img.startsWith("http")) {
            imgUrl = p.img;
          }
        }
        if (!imgUrl || !imgUrl.startsWith("http")) return Promise.resolve(null);

        return new Promise((resolve) => {
          const img = new Image();
          img.crossOrigin = "anonymous";
          img.onload = () => resolve(img);
          img.onerror = () => resolve(null);
          setTimeout(() => resolve(null), 2500);
          img.src = imgUrl;
        });
      })
    );

    // 1. Tính toán chiều cao linh hoạt dựa vào số lượng sản phẩm & độ dài tên
    const dummyCanvas = document.createElement("canvas");
    const dummyCtx = dummyCanvas.getContext("2d");
    dummyCtx.font = "bold 13px 'Nunito', sans-serif";

    let calculatedTableHeight = 28; // Header bảng
    const colNameWidth = 205; // Chiều rộng cột Tên SP (gói chữ gọn gàng trong cột)

    items.forEach((item) => {
      // Điểm 6: "Chiết" đổi thành "Mẫu thử"
      const displayName = (item.name || "Sản phẩm").replace(/\bChiết\b/gi, "Mẫu thử");
      const nameLines = this.wrapText(dummyCtx, displayName, colNameWidth);

      // Kiểm tra xem badge dung tích có bị rớt dòng không để cộng thêm chiều cao chính xác
      let unit = (item.unit || "").replace(/\bChiết\b/gi, "Mẫu thử");
      let unitWraps = false;
      if (unit) {
        dummyCtx.font = "600 11px 'Nunito', sans-serif";
        const unitText = `[${unit}]`;
        const unitW = dummyCtx.measureText(unitText).width;
        dummyCtx.font = "bold 13px 'Nunito', sans-serif";
        const lastLineW = nameLines.length > 0 ? dummyCtx.measureText(nameLines[nameLines.length - 1]).width : 0;
        if (lastLineW + 6 + unitW > colNameWidth) {
          unitWraps = true;
        }
      }

      const totalLines = nameLines.length + (unitWraps ? 1 : 0);
      const hasDiscount = item.originalPrice && item.originalPrice > item.finalPrice;
      const minRowHeight = hasDiscount ? 62 : 54;
      const textNeededHeight = 18 + (totalLines - 1) * 17 + 11;
      const rowHeight = Math.max(minRowHeight, textNeededHeight);
      calculatedTableHeight += rowHeight;
    });

    // Điểm 1: Tính độ dài địa chỉ khách hàng (Khoảng đệm an toàn >= 52px để không dính chữ)
    dummyCtx.font = "12px 'Nunito', sans-serif";
    const addrLabelW = Math.max(52, dummyCtx.measureText("Địa chỉ:").width + 8);
    const addressLines = this.wrapText(dummyCtx, customer.address || "Mua tại shop", tableW - 24 - addrLabelW);
    const customerBoxHeight = 66 + (addressLines.length - 1) * 17;

    // Điểm 5: Tính độ dài ghi chú cuối trang (maxWidth 340px để không chạm viền)
    dummyCtx.font = "600 11px 'Nunito', sans-serif";
    const noteText = "‼ Lưu ý: Với đơn ship COD, mình KHÔNG được bóc seal trước khi thanh toán ạ, Harry Perfume xin cám ơn ^^";
    const noteLines = this.wrapText(dummyCtx, noteText, 340);

    // Xây dựng danh sách các dòng chiết khấu phát sinh thực tế theo đúng thứ tự yêu cầu:
    // 1. Chiết khấu sản phẩm (nếu có)
    // 2. Chiết khấu hạng thẻ (nếu có)
    // 3. Từng khuyến mãi đã chọn theo tên (VD: Chúc mừng sinh nhật)
    // 4. Khuyến mãi khác (ở cuối cùng các khuyến mãi)
    const activeDiscountRows = [];
    if (totals.productDiscount && totals.productDiscount > 0) {
      activeDiscountRows.push({
        label: "Chiết khấu sản phẩm:",
        amount: totals.productDiscount
      });
    }
    if (totals.memberDiscount && totals.memberDiscount > 0) {
      activeDiscountRows.push({
        label: "Chiết khấu hạng thẻ:",
        amount: totals.memberDiscount
      });
    }
    if (Array.isArray(totals.appliedPromos)) {
      totals.appliedPromos.forEach((p) => {
        if (p.amount && p.amount > 0) {
          activeDiscountRows.push({
            label: `${p.name || "Khuyến mãi"}:`,
            amount: p.amount
          });
        }
      });
    }
    if (totals.otherDiscount && totals.otherDiscount > 0) {
      activeDiscountRows.push({
        label: "Khuyến mãi khác:",
        amount: totals.otherDiscount
      });
    }

    // Khoảng cách & chiều cao các khối (Tăng space gấp rưỡi theo yêu cầu)
    const gapTableToTotals = 42;
    const totalsHeight = 52 + activeDiscountRows.length * 20;
    const gapTotalsToLine = 40;
    const gapLineToNotice = 32;
    const noticeContentHeight = (noteLines.length * 17) + 38; // Đầy đủ các dòng lưu ý COD + phân cách + tiêu đề + link
    const bottomMargin = 28; // Khoảng đệm thoáng dưới đáy link bảo hành

    const baseHeight = 106 + customerBoxHeight + 14 + calculatedTableHeight + gapTableToTotals + totalsHeight + gapTotalsToLine + gapLineToNotice + noticeContentHeight + bottomMargin;

    // Khởi tạo Canvas chính
    const canvas = document.createElement("canvas");
    canvas.width = baseWidth * scale;
    canvas.height = baseHeight * scale;

    const ctx = canvas.getContext("2d");
    ctx.scale(scale, scale);

    // 2. NỀN HÓA ĐƠN: Chuẩn Dark Luxury (Không viền vàng ngoài cùng)
    ctx.fillStyle = "#121214";
    ctx.fillRect(0, 0, baseWidth, baseHeight);

    // 3. HEADER: Logo & Thương hiệu Harry Perfume (Đơn sắc theo Rule 5, vector siêu nét)
    const logoW = 190;
    const logoH = Math.round(logoW * (78.44 / 512)); // ~29px
    const logoX = (baseWidth - logoW) / 2;
    const logoY = 22;

    if (logoImg) {
      ctx.drawImage(logoImg, logoX, logoY, logoW, logoH);
    } else {
      ctx.textAlign = "center";
      ctx.font = "900 22px 'Nunito', sans-serif";
      ctx.fillStyle = textPrimaryColor;
      ctx.fillText("HARRY PERFUME", baseWidth / 2, logoY + 20);
    }

    let curY = logoY + logoH + 13;
    ctx.textAlign = "center";
    ctx.font = "700 12.5px 'Nunito', sans-serif";
    ctx.fillStyle = textPrimaryColor;
    ctx.letterSpacing = "1px";
    ctx.fillText("✦ XÁC NHẬN ĐƠN HÀNG ✦", baseWidth / 2, curY);

    curY += 17;
    ctx.font = "11.5px 'Nunito', sans-serif";
    ctx.fillStyle = "#999999";
    ctx.fillText(`Thời gian: ${this.formatDateTime()}`, baseWidth / 2, curY);

    // Dải phân cách mạ vàng
    curY += 13;
    const grad = ctx.createLinearGradient(paddingX, curY, baseWidth - paddingX, curY);
    grad.addColorStop(0, "rgba(229, 193, 88, 0.1)");
    grad.addColorStop(0.5, "rgba(229, 193, 88, 0.8)");
    grad.addColorStop(1, "rgba(229, 193, 88, 0.1)");
    ctx.strokeStyle = grad;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(paddingX, curY);
    ctx.lineTo(baseWidth - paddingX, curY);
    ctx.stroke();

    // 4. KHỐI THÔNG TIN KHÁCH HÀNG: Hàng 1 (Tên | SĐT), Hàng 2 (Địa chỉ) - Điểm 1
    curY += 12;
    const custBoxX = paddingX;
    const custBoxW = tableW;

    ctx.fillStyle = "#1b1b1e";
    ctx.strokeStyle = "#333333";
    ctx.lineWidth = 1;
    this.roundRect(ctx, custBoxX, curY, custBoxW, customerBoxHeight, 7, true, true);

    let cY = curY + 16;
    ctx.textAlign = "left";
    ctx.font = "700 12px 'Nunito', sans-serif";
    ctx.fillStyle = "#e5c158";
    ctx.fillText("👤 THÔNG TIN KHÁCH HÀNG", custBoxX + 12, cY);

    // Hàng 1: 2 cột - Cột 1 là Tên, Cột 2 là SĐT (Đo nhãn động chống đè dấu hai chấm)
    cY += 19;
    ctx.font = "12px 'Nunito', sans-serif";
    ctx.fillStyle = "#aaaaaa";
    const nameLabel = "Khách hàng:";
    ctx.fillText(nameLabel, custBoxX + 12, cY);
    const nameLabelW = ctx.measureText(nameLabel).width + 6;

    ctx.font = "700 12.5px 'Nunito', sans-serif";
    ctx.fillStyle = "#f8f8f8";
    ctx.fillText(customer.name ? customer.name : "(Chưa có tên)", custBoxX + 12 + nameLabelW, cY);

    const sdtColX = custBoxX + 270;
    ctx.font = "12px 'Nunito', sans-serif";
    ctx.fillStyle = "#aaaaaa";
    const phoneLabel = "SĐT:";
    ctx.fillText(phoneLabel, sdtColX, cY);
    const phoneLabelW = ctx.measureText(phoneLabel).width + 6;

    ctx.font = "700 12.5px 'Nunito', sans-serif";
    ctx.fillStyle = textPrimaryColor;
    ctx.fillText(customer.phone ? customer.phone : "-", sdtColX + phoneLabelW, cY);

    // Hàng 2: Địa chỉ (Khoảng đệm an toàn >= 52px để không dính chữ vào dấu hai chấm)
    cY += 19;
    ctx.font = "12px 'Nunito', sans-serif";
    ctx.fillStyle = "#aaaaaa";
    const addrLabel = "Địa chỉ:";
    ctx.fillText(addrLabel, custBoxX + 12, cY);
    const renderAddrLabelW = Math.max(52, ctx.measureText(addrLabel).width + 8);

    ctx.font = "12px 'Nunito', sans-serif";
    ctx.fillStyle = "#f8f8f8";
    addressLines.forEach((line, idx) => {
      ctx.fillText(line, custBoxX + 12 + renderAddrLabelW, cY + idx * 17);
    });

    curY += customerBoxHeight + 14;

    // 5. BẢNG DANH SÁCH SẢN PHẨM: Cột 1 STT, Cột 2 Thumbnail + Tên SP, Cột 3 SL/Đơn giá/Thành tiền
    const colSTTX = paddingX + 8; // 26px
    const imgThumbX = paddingX + 25; // 43px
    const imgThumbSize = 34;
    const colNameX = imgThumbX + imgThumbSize + 9; // paddingX + 68 = 86px
    const colRightStartX = paddingX + 284; // 302px: Mép trái cột SL, bắt đầu thanh solid line (bằng bề ngang SL + Đơn giá)!
    const colQtyX = paddingX + 302; // 320px: Tâm cột SL
    const colPriceRightX = paddingX + tableW - 8; // 454px: Căn phải cột Đơn giá & Thành tiền

    // Header Table (Ảnh 1)
    ctx.fillStyle = "#26262a";
    ctx.strokeStyle = "#38383e";
    this.roundRect(ctx, paddingX, curY, tableW, 28, 5, true, true);

    ctx.font = "700 11.5px 'Nunito', sans-serif";
    ctx.fillStyle = "#e5c158";

    // Bỏ tiêu đề STT, chỉ hiển thị Sản phẩm / Dung tích, SL, Đơn giá
    ctx.textAlign = "left";
    ctx.fillText("Sản phẩm / Dung tích", colNameX, curY + 18);

    ctx.textAlign = "center";
    ctx.fillText("SL", colQtyX, curY + 18);

    ctx.textAlign = "right";
    ctx.fillText("Đơn giá", colPriceRightX, curY + 18);

    curY += 28;

    // Rows: Cột 1 là STT, Cột 2 là Ảnh + Sản phẩm, Cột 3 chia 2 hàng: Hàng 1 (SL, Đơn giá), Hàng 2 (Thành tiền)
    items.forEach((item, idx) => {
      ctx.font = "bold 13px 'Nunito', sans-serif";
      // Điểm 6: "Chiết" đổi thành "Mẫu thử"
      const displayName = (item.name || "Sản phẩm").replace(/\bChiết\b/gi, "Mẫu thử");
      const nameLines = this.wrapText(ctx, displayName, colNameWidth);

      // Kiểm tra xem badge dung tích có bị rớt dòng không
      let unit = (item.unit || "").replace(/\bChiết\b/gi, "Mẫu thử");
      let unitWraps = false;
      let unitText = "";
      let unitWidth = 0;
      if (unit) {
        ctx.font = "600 11px 'Nunito', sans-serif";
        unitText = `[${unit}]`;
        unitWidth = ctx.measureText(unitText).width;
        ctx.font = "bold 13px 'Nunito', sans-serif";
        const lastLineW = nameLines.length > 0 ? ctx.measureText(nameLines[nameLines.length - 1]).width : 0;
        if (lastLineW + 6 + unitWidth > colNameWidth) {
          unitWraps = true;
        }
      }

      const totalLines = nameLines.length + (unitWraps ? 1 : 0);
      const hasDiscount = item.originalPrice && item.originalPrice > item.finalPrice;
      const minRowHeight = hasDiscount ? 62 : 54;
      const textNeededHeight = 18 + (totalLines - 1) * 17 + 11;
      const rowHeight = Math.max(minRowHeight, textNeededHeight);

      // Nền xen kẽ
      ctx.fillStyle = idx % 2 === 0 ? "rgba(255, 255, 255, 0.02)" : "rgba(255, 255, 255, 0.05)";
      ctx.fillRect(paddingX, curY, tableW, rowHeight);

      // Đường kẻ đáy mỗi dòng
      ctx.strokeStyle = "rgba(255, 255, 255, 0.07)";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(paddingX, curY + rowHeight);
      ctx.lineTo(paddingX + tableW, curY + rowHeight);
      ctx.stroke();

      // Cột 1: Số thứ tự STT
      ctx.textAlign = "left";
      ctx.font = "12px 'Nunito', sans-serif";
      ctx.fillStyle = "#888888";
      ctx.fillText(String(idx + 1), colSTTX, curY + Math.round(rowHeight / 2) + 4);

      // Ảnh Thumbnail sản phẩm
      const imgY = curY + Math.round((rowHeight - imgThumbSize) / 2);
      const prodImg = loadedItemImages[idx];

      // Khung nền & viền ảnh thumbnail
      ctx.fillStyle = "#1e1e22";
      ctx.strokeStyle = "rgba(255, 255, 255, 0.12)";
      ctx.lineWidth = 1;
      this.roundRect(ctx, imgThumbX, imgY, imgThumbSize, imgThumbSize, 4, true, true);

      if (prodImg) {
        ctx.save();
        this.roundRect(ctx, imgThumbX, imgY, imgThumbSize, imgThumbSize, 4, false, false);
        ctx.clip();

        // Fit contain để trọn vẹn chai nước hoa, có padding 2px nhẹ
        const pad = 2;
        const targetW = imgThumbSize - pad * 2;
        const targetH = imgThumbSize - pad * 2;
        const aspect = (prodImg.naturalWidth || 1) / (prodImg.naturalHeight || 1);
        let drawW = targetW;
        let drawH = targetH;
        let drawX = imgThumbX + pad;
        let drawY = imgY + pad;

        if (aspect > 1) {
          drawH = targetW / aspect;
          drawY = imgY + pad + (targetH - drawH) / 2;
        } else {
          drawW = targetH * aspect;
          drawX = imgThumbX + pad + (targetW - drawW) / 2;
        }
        ctx.drawImage(prodImg, drawX, drawY, drawW, drawH);
        ctx.restore();
      } else {
        // Placeholder nếu không có ảnh: biểu tượng chai nước hoa tối giản
        ctx.fillStyle = "rgba(229, 193, 88, 0.35)";
        ctx.fillRect(imgThumbX + imgThumbSize / 2 - 3, imgY + 8, 6, 3);
        this.roundRect(ctx, imgThumbX + 8, imgY + 12, imgThumbSize - 16, imgThumbSize - 19, 2, true, false);
      }

      // Cột 2: Tên sản phẩm
      ctx.font = "700 12.5px 'Nunito', sans-serif";
      ctx.fillStyle = textPrimaryColor;
      nameLines.forEach((line, lIdx) => {
        ctx.fillText(line, colNameX, curY + 18 + lIdx * 17);
      });

      // Badge Dung tích (Điểm 6: Đổi "Chiết" thành "Mẫu thử", gọn gàng trong Cột Tên)
      if (unitText) {
        const lastLineY = curY + 18 + (nameLines.length - 1) * 17;
        ctx.font = "bold 13px 'Nunito', sans-serif";
        const lastLineWidth = ctx.measureText(nameLines[nameLines.length - 1]).width;
        ctx.font = "600 11px 'Nunito', sans-serif";
        ctx.fillStyle = "#e5c158";
        if (!unitWraps) {
          ctx.fillText(unitText, colNameX + lastLineWidth + 5, lastLineY);
        } else {
          ctx.fillText(unitText, colNameX, lastLineY + 16);
        }
      }

      // Cột 3: Hàng 1 (SL và Đơn giá) | Solid Line | Hàng 2 (Thành tiền)
      if (hasDiscount) {
        const oldPriceStr = `(${this.formatMoney(item.originalPrice)})`;
        const finalPriceStr = this.formatMoney(item.finalPrice);

        // 1. Giá gốc ở trên (nhỏ 9.5px, gạch ngang)
        ctx.font = "9.5px 'Nunito', sans-serif";
        ctx.fillStyle = "#888888";
        ctx.textAlign = "right";
        ctx.fillText(oldPriceStr, colPriceRightX, curY + 14);

        const oldW = ctx.measureText(oldPriceStr).width;
        ctx.strokeStyle = "#888888";
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(colPriceRightX - oldW, curY + 14 - 3.5);
        ctx.lineTo(colPriceRightX, curY + 14 - 3.5);
        ctx.stroke();

        // 2. Giá sau giảm ở dưới (không bold)
        ctx.font = "500 12px 'Nunito', sans-serif";
        ctx.fillStyle = textPrimaryColor;
        ctx.fillText(finalPriceStr, colPriceRightX, curY + 28);

        // SL canh giữa thẳng hàng (không bold)
        ctx.textAlign = "center";
        ctx.font = "500 12.5px 'Nunito', sans-serif";
        ctx.fillStyle = textPrimaryColor;
        ctx.fillText(String(item.qty || 1), colQtyX, curY + 22);

        // Solid line ngang ngăn cách SL & Đơn giá với Thành tiền
        const lineY = curY + 34;
        ctx.strokeStyle = "rgba(255, 255, 255, 0.16)";
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(colRightStartX, lineY);
        ctx.lineTo(colPriceRightX, lineY);
        ctx.stroke();

        // Hàng 2: Thành tiền (dưới solid line, bold và màu text-primary)
        ctx.textAlign = "right";
        ctx.font = "800 13.5px 'Nunito', sans-serif";
        ctx.fillStyle = textPrimaryColor;
        ctx.fillText(this.formatMoney(item.subtotal), colPriceRightX, curY + 50);
      } else {
        // Đơn vị giá không giảm (không bold)
        ctx.textAlign = "right";
        ctx.font = "500 12px 'Nunito', sans-serif";
        ctx.fillStyle = textPrimaryColor;
        ctx.fillText(this.formatMoney(item.finalPrice), colPriceRightX, curY + 20);

        // SL canh giữa (không bold)
        ctx.textAlign = "center";
        ctx.font = "500 12.5px 'Nunito', sans-serif";
        ctx.fillStyle = textPrimaryColor;
        ctx.fillText(String(item.qty || 1), colQtyX, curY + 20);

        // Solid line ngang ngăn cách SL & Đơn giá với Thành tiền
        const lineY = curY + 28;
        ctx.strokeStyle = "rgba(255, 255, 255, 0.16)";
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(colRightStartX, lineY);
        ctx.lineTo(colPriceRightX, lineY);
        ctx.stroke();

        // Hàng 2: Thành tiền (dưới solid line, bold và màu text-primary)
        ctx.textAlign = "right";
        ctx.font = "800 13.5px 'Nunito', sans-serif";
        ctx.fillStyle = textPrimaryColor;
        ctx.fillText(this.formatMoney(item.subtotal), colPriceRightX, curY + 45);
      }

      curY += rowHeight;
    });

    // 6. KHỐI TỔNG KẾT THANH TOÁN (Lùi sang trái để thoáng text - Điểm 4)
    curY += gapTableToTotals;
    const summaryBoxX = paddingX + tableW - 290; // Lùi về 290px cực kỳ thoáng
    const summaryRightX = paddingX + tableW - 4;

    // Dòng 1: Tổng chưa giảm giá
    ctx.textAlign = "left";
    ctx.font = "12.5px 'Nunito', sans-serif";
    ctx.fillStyle = "#cccccc";
    ctx.fillText("Tổng chưa giảm giá:", summaryBoxX, curY);

    ctx.textAlign = "right";
    ctx.font = "700 13px 'Nunito', sans-serif";
    ctx.fillStyle = "#f8f8f8";
    const rawTotal = (totals.rawItemsTotal && totals.rawItemsTotal > 0) ? totals.rawItemsTotal : (totals.itemsTotal || 0);
    ctx.fillText(this.formatMoney(rawTotal), summaryRightX, curY);

    // Dòng 2+: Các mục chiết khấu riêng biệt theo đúng thứ tự (Màu xanh lá của theme: #34d399)
    activeDiscountRows.forEach((row) => {
      curY += 20;
      ctx.textAlign = "left";
      ctx.font = "12.5px 'Nunito', sans-serif";
      ctx.fillStyle = "#cccccc";
      ctx.fillText(row.label, summaryBoxX, curY);

      ctx.textAlign = "right";
      ctx.font = "700 13px 'Nunito', sans-serif";
      ctx.fillStyle = "#34d399"; // Màu xanh lá theme Harry Perfume
      ctx.fillText(`- ${this.formatMoney(row.amount)}`, summaryRightX, curY);
    });

    // Phí giao hàng
    curY += 20;
    ctx.textAlign = "left";
    ctx.font = "12.5px 'Nunito', sans-serif";
    ctx.fillStyle = "#cccccc";
    ctx.fillText("Phí giao hàng:", summaryBoxX, curY);

    ctx.textAlign = "right";
    if (!totals.shippingFee || totals.shippingFee === 0) {
      ctx.font = "800 12.5px 'Nunito', sans-serif";
      ctx.fillStyle = "#34d399"; // Green Freeship
      ctx.fillText("Freeship", summaryRightX, curY);
    } else {
      ctx.font = "700 13px 'Nunito', sans-serif";
      ctx.fillStyle = "#f8f8f8";
      ctx.fillText(`+ ${this.formatMoney(totals.shippingFee)}`, summaryRightX, curY);
    }

    // Đường gạch ngang tổng kết
    curY += 10;
    ctx.strokeStyle = "#444444";
    ctx.beginPath();
    ctx.moveTo(summaryBoxX - 5, curY);
    ctx.lineTo(summaryRightX, curY);
    ctx.stroke();

    // THÀNH TIỀN (TỔNG CỘNG)
    curY += 22;
    ctx.textAlign = "left";
    ctx.font = "800 13.5px 'Nunito', sans-serif";
    ctx.fillStyle = "#e5c158";
    ctx.fillText("THÀNH TIỀN:", summaryBoxX - 5, curY);

    ctx.textAlign = "right";
    ctx.font = "900 19px 'Nunito', sans-serif";
    ctx.fillStyle = "#e5c158";
    ctx.fillText(this.formatMoney(totals.grandTotal || 0), summaryRightX, curY);

    // 7. FOOTER: NÉT ĐỨT PHÂN CÁCH & LƯU Ý GIAO HÀNG (Không dùng khung hộp, ngăn cách bằng dashed line)
    const lineY = curY + gapTotalsToLine;
    ctx.setLineDash([6, 5]);
    ctx.strokeStyle = "rgba(229, 193, 88, 0.4)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(paddingX, lineY);
    ctx.lineTo(baseWidth - paddingX, lineY);
    ctx.stroke();
    ctx.setLineDash([]); // Reset về nét liền

    let footY = lineY + gapLineToNotice;
    ctx.textAlign = "center";

    // Đoạn 1: Lưu ý COD (Màu text-primary, xuống dòng tự nhiên)
    ctx.font = "600 11px 'Nunito', sans-serif";
    ctx.fillStyle = textPrimaryColor;
    noteLines.forEach((line) => {
      ctx.fillText(line, baseWidth / 2, footY);
      footY += 17;
    });

    // Dải phân cách
    footY += 4;
    ctx.font = "11px 'Nunito', sans-serif";
    ctx.fillStyle = "#666666";
    ctx.fillText("➖➖➖➖➖➖➖➖", baseWidth / 2, footY);

    // Đoạn 2: Chính sách bảo hành (Màu text-primary)
    footY += 17;
    ctx.font = "700 11.5px 'Nunito', sans-serif";
    ctx.fillStyle = textPrimaryColor;
    ctx.fillText("🛡 Chính sách bảo hành bên Harry Perfume ạ:", baseWidth / 2, footY);

    footY += 17;
    ctx.font = "600 11.5px 'Nunito', sans-serif";
    ctx.fillStyle = "#60a5fa"; // Blue link
    ctx.fillText("https://harryperfume.vn/chinh-sach", baseWidth / 2, footY);

    // 8. Chuyển đổi sang PNG Blob
    return new Promise((resolve) => {
      canvas.toBlob((blob) => {
        resolve({
          blob: blob,
          dataUrl: canvas.toDataURL("image/png")
        });
      }, "image/png");
    });
  }
};

if (typeof window !== "undefined") {
  window.OrderCanvasEngine = OrderCanvasEngine;
}
