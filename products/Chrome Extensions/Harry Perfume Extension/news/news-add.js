// Khung Thêm Thẻ Tin Nhanh (News Add & Edit Modal Logic)

// DOM Elements
const addCardModal = document.getElementById("addCardModal");
const btnModalClose = document.getElementById("btnModalClose");
const btnModalCancel = document.getElementById("btnModalCancel");
const btnModalSave = document.getElementById("btnModalSave");
const inputCardTitle = document.getElementById("inputCardTitle");
const inputCardImg = document.getElementById("inputCardImg");
const inputCardFile = document.getElementById("inputCardFile");
const btnBrowseImg = document.getElementById("btnBrowseImg");
const imgUploadPreviewContainer = document.getElementById("imgUploadPreviewContainer");
const imgUploadPreviewsList = document.getElementById("imgUploadPreviewsList");
const btnRemoveUploadedImg = document.getElementById("btnRemoveUploadedImg");
const inputCardContent = document.getElementById("inputCardContent");

// Logic mở modal thêm mới
function openAddCardModal() {
  addCardModal.dataset.mode = "add";
  addCardModal.dataset.editId = "";
  
  const modalHeaderTitle = addCardModal.querySelector(".modal-header h4");
  if (modalHeaderTitle) {
    modalHeaderTitle.innerText = "Thêm thẻ văn mẫu mới";
  }

  inputCardTitle.value = "";
  inputCardImg.value = "";
  if (inputCardImg.dataset.images) {
    inputCardImg.dataset.images = "";
  }
  inputCardFile.value = "";
  imgUploadPreviewsList.innerHTML = "";
  imgUploadPreviewContainer.style.display = "none";
  inputCardContent.value = "";
  addCardModal.style.display = "flex";
  inputCardTitle.focus();
}

// Logic mở modal chỉnh sửa
function openEditCardModal(newsItem) {
  addCardModal.dataset.mode = "edit";
  addCardModal.dataset.editId = newsItem.id;
  
  const modalHeaderTitle = addCardModal.querySelector(".modal-header h4");
  if (modalHeaderTitle) {
    modalHeaderTitle.innerText = "Chỉnh sửa thẻ văn mẫu";
  }

  inputCardTitle.value = newsItem.title;
  inputCardContent.value = newsItem.content;
  
  inputCardImg.value = "";
  if (inputCardImg.dataset.images) {
    inputCardImg.dataset.images = "";
  }
  inputCardFile.value = "";
  imgUploadPreviewsList.innerHTML = "";
  
  // Chuẩn hóa trường hình ảnh thành mảng
  let imgArray = [];
  if (Array.isArray(newsItem.img)) {
    imgArray = newsItem.img;
  } else if (typeof newsItem.img === "string" && newsItem.img.trim()) {
    imgArray = [newsItem.img];
  }
  
  if (imgArray.length > 0) {
    // Nếu là ảnh upload Base64
    if (imgArray.some(img => img.startsWith("data:image/"))) {
      inputCardImg.value = `${imgArray.length} ảnh đã chọn`;
      inputCardImg.dataset.images = JSON.stringify(imgArray);
      
      imgArray.forEach(base64Data => {
        const imgEl = document.createElement("img");
        imgEl.src = base64Data;
        imgEl.style.cssText = "max-width: 48px; max-height: 48px; border-radius: 4px; border: 1px solid var(--border-color); object-fit: contain;";
        imgUploadPreviewsList.appendChild(imgEl);
      });
      imgUploadPreviewContainer.style.display = "flex";
    } else {
      // Nếu là URL/đường dẫn ảnh
      inputCardImg.value = imgArray[0];
      imgUploadPreviewContainer.style.display = "none";
    }
  } else {
    imgUploadPreviewContainer.style.display = "none";
  }
  
  addCardModal.style.display = "flex";
  inputCardTitle.focus();
}

// Cập nhật thẻ tự định nghĩa đã sửa
async function updateCustomNews(id, title, content, img) {
  const localNews = await getLocalNews();
  const index = localNews.findIndex(item => item.id === id);
  if (index !== -1) {
    localNews[index].title = title;
    localNews[index].content = content;
    localNews[index].img = img || "";
    await saveLocalNews(localNews);
    
    await renderNewsTab();
    
    const updatedItem = newsData.find(item => item.id === id);
    if (updatedItem) {
      showNewsDetail(updatedItem, false);
    }
  }
}

// Logic đóng modal
function closeAddCardModal() {
  addCardModal.style.display = "none";
}

// Thêm thẻ tự định nghĩa mới
async function addCustomNews(title, content, img) {
  const localNews = await getLocalNews();
  const newItem = {
    id: "custom_" + Date.now(),
    title: title,
    content: content,
    img: img || "",
    class: "tag-custom",
    isCustom: true
  };
  localNews.push(newItem);
  await saveLocalNews(localNews);
  
  await renderNewsTab();
  showNewsDetail(newItem, false);
}

// Xóa thẻ tự định nghĩa
async function deleteCustomNews(id) {
  let localNews = await getLocalNews();
  localNews = localNews.filter(item => item.id !== id);
  await saveLocalNews(localNews);
  
  if (selectedNews && selectedNews.id === id) {
    selectedNews = null;
  }
  await renderNewsTab();
}

// Trigger chọn file ảnh khi bấm nút "Chọn file"
btnBrowseImg.addEventListener("click", () => {
  inputCardFile.click();
});

// Xử lý khi người dùng chọn nhiều file ảnh
inputCardFile.addEventListener("change", (e) => {
  const files = Array.from(e.target.files);
  if (files.length === 0) return;

  let localImages = [];
  let loadedCount = 0;
  
  // Xóa preview cũ
  imgUploadPreviewsList.innerHTML = "";

  files.forEach((file) => {
    // Giới hạn dung lượng từng file (max 20MB)
    if (file.size > 20 * 1024 * 1024) {
      alert(`⚠️ Ảnh "${file.name}" quá lớn (> 20MB)! Vui lòng chọn ảnh nhỏ hơn.`);
      return;
    }

    const reader = new FileReader();
    reader.onload = function(evt) {
      const base64Data = evt.target.result;
      localImages.push(base64Data);
      
      // Tạo preview cho từng ảnh
      const imgEl = document.createElement("img");
      imgEl.src = base64Data;
      imgEl.style.cssText = "max-width: 48px; max-height: 48px; border-radius: 4px; border: 1px solid var(--border-color); object-fit: contain;";
      imgUploadPreviewsList.appendChild(imgEl);
      
      loadedCount++;
      if (loadedCount === files.length) {
        inputCardImg.value = `${localImages.length} ảnh đã chọn`;
        inputCardImg.dataset.images = JSON.stringify(localImages);
        imgUploadPreviewContainer.style.display = "flex";
      }
    };
    reader.readAsDataURL(file);
  });
});

// Xóa dữ liệu Base64 nếu người dùng tự nhập tay URL khác vào ô input
inputCardImg.addEventListener("input", () => {
  if (inputCardImg.dataset.images) {
    inputCardImg.dataset.images = "";
    inputCardFile.value = "";
    imgUploadPreviewsList.innerHTML = "";
    imgUploadPreviewContainer.style.display = "none";
  }
});

// Xóa ảnh đã chọn
btnRemoveUploadedImg.addEventListener("click", () => {
  inputCardImg.value = "";
  inputCardImg.dataset.images = "";
  inputCardFile.value = "";
  imgUploadPreviewsList.innerHTML = "";
  imgUploadPreviewContainer.style.display = "none";
});

// Gắn sự kiện cho các nút Modal
btnModalClose.addEventListener("click", closeAddCardModal);
btnModalCancel.addEventListener("click", closeAddCardModal);
addCardModal.addEventListener("click", (e) => {
  if (e.target === addCardModal) {
    closeAddCardModal();
  }
});

btnModalSave.addEventListener("click", async () => {
  const title = inputCardTitle.value.trim();
  // Lấy mảng ảnh từ dataset (JSON string) hoặc text input (URL đơn)
  let imgVal = "";
  if (inputCardImg.dataset.images) {
    try {
      imgVal = JSON.parse(inputCardImg.dataset.images);
    } catch (e) {
      imgVal = "";
    }
  } else {
    imgVal = inputCardImg.value.trim();
  }
  const content = inputCardContent.value.trim();
  
  if (!title) {
    alert("Vui lòng nhập tiêu đề thẻ!");
    inputCardTitle.focus();
    return;
  }
  if (!content) {
    alert("Vui lòng nhập nội dung copy!");
    inputCardContent.focus();
    return;
  }
  
  const mode = addCardModal.dataset.mode || "add";
  if (mode === "edit") {
    const editId = addCardModal.dataset.editId;
    await updateCustomNews(editId, title, content, imgVal);
  } else {
    await addCustomNews(title, content, imgVal);
  }
  closeAddCardModal();
});
