// Khung nội dung hiển thị chi tiết Tin Nhanh ở dưới cùng trang (News Detail Logic)

// DOM Elements
const newsDetailTitle = document.getElementById("newsDetailTitle");
const newsDetailBody = document.getElementById("newsDetailBody");
const newsDetailImgContainer = document.getElementById("newsDetailImgContainer");
const btnCopyNews = document.getElementById("btnCopyNews");
const btnDeleteNews = document.getElementById("btnDeleteNews");
const btnEditNews = document.getElementById("btnEditNews");

// Hiển thị chi tiết tin nhanh
function showNewsDetail(newsItem, autoCopy = true) {
  selectedNews = newsItem;
  
  const allTags = newsTagsGrid.querySelectorAll(".news-tag-card");
  allTags.forEach(tag => {
    if (tag.dataset.id === newsItem.id) {
      tag.classList.add("active");
    } else {
      tag.classList.remove("active");
    }
  });
  
  newsDetailTitle.innerText = newsItem.title;
  newsDetailBody.innerText = newsItem.content;
  
  // Dọn dẹp container hình ảnh
  newsDetailImgContainer.innerHTML = "";
  
  // Chuẩn hóa trường img thành mảng các hình ảnh
  let imgArray = [];
  if (Array.isArray(newsItem.img)) {
    imgArray = newsItem.img;
  } else if (typeof newsItem.img === "string" && newsItem.img.trim()) {
    imgArray = [newsItem.img];
  }
  
  if (imgArray.length > 0) {
    imgArray.forEach((imgUrl) => {
      const imgEl = document.createElement("img");
      imgEl.src = imgUrl;
      imgEl.className = "news-detail-img";
      imgEl.alt = newsItem.title;
      imgEl.title = "Click để copy hình ảnh này";
      imgEl.addEventListener("click", () => copyImage(imgUrl));
      newsDetailImgContainer.appendChild(imgEl);
    });
    newsDetailImgContainer.style.display = "flex";
  } else {
    newsDetailImgContainer.style.display = "none";
  }
  
  // Hiển thị nút sửa/xóa nếu là thẻ tự tạo
  if (newsItem.isCustom) {
    btnEditNews.style.display = "inline-block";
    btnDeleteNews.style.display = "inline-block";
  } else {
    btnEditNews.style.display = "none";
    btnDeleteNews.style.display = "none";
  }
  
  if (autoCopy) {
    copyText(newsItem.content, `nội dung "${newsItem.title}"`);
  }
}

// Sự kiện Copy Tin Nhanh
btnCopyNews.addEventListener("click", () => {
  if (selectedNews) {
    copyText(selectedNews.content, `nội dung "${selectedNews.title}"`);
  }
});

// Sự kiện Xóa thẻ tự tạo
btnDeleteNews.addEventListener("click", () => {
  if (selectedNews && selectedNews.isCustom) {
    if (confirm(`Bạn có chắc chắn muốn xóa thẻ "${selectedNews.title}" không?`)) {
      deleteCustomNews(selectedNews.id);
    }
  }
});

// Sự kiện Sửa thẻ tự tạo
btnEditNews.addEventListener("click", () => {
  if (selectedNews && selectedNews.isCustom) {
    openEditCardModal(selectedNews);
  }
});
