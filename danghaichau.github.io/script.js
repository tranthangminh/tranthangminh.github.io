/**
 * PORTFOLIO SCRIPTS - ĐẶNG HẢI CHÂU
 * Interactive features: Theme toggle, project filtering, modal viewer, 
 * copy to clipboard with toast, smooth navigation spy.
 */

// Project & Experience Detailed Data for Đặng Hải Châu
const projectsData = {
  "editor": {
    number: "01",
    title: "Video Editor tại Harry Perfume",
    category: "Sản Xuất Video & Visual",
    timeline: "01/2025 - Hiện tại",
    metrics: [
      { label: "Công cụ", value: "CapCut Pro" },
      { label: "Định vị", value: "Nước Hoa Cao Cấp" },
      { label: "Mục tiêu", value: "Tối Ưu Thị Giác" }
    ],
    image: "images/project-glowcode.jpg",
    description: "Để không ngừng học hỏi và có thể tùy biến linh hoạt ở bất kỳ mảng nào, em chủ động học và trực tiếp đảm nhận các khâu quay, dựng, edit nội dung sao cho bắt mắt, thu hút nhất với mong muốn mỗi sản phẩm đến tay khách hàng đều thật đẹp và để lại nhiều ấn tượng sâu sắc.",
    highlights: [
      "Tự lên ý tưởng góc máy, ánh sáng và bối cảnh làm nổi bật sự sang trọng của chai nước hoa.",
      "Cắt dựng nhịp điệu mượt mà, kết hợp âm nhạc thời thượng và hiệu ứng màu sắc trong trẻo.",
      "Tối ưu định dạng short-form (Reels/TikTok) giúp gia tăng tỷ lệ giữ chân người xem và kích thích nhu cầu mua sắm."
    ]
  },
  "streamer": {
    number: "02",
    title: "Livestreamer tại Harry Perfume",
    category: "Livestream & Chốt Đơn Trực Tiếp",
    timeline: "09/2024 - 02/2025",
    metrics: [
      { label: "Kỹ năng", value: "Hoạt Ngôn & Tương Tác" },
      { label: "Phản xạ", value: "Xử Lý Tốc Độ Cao" },
      { label: "Kết quả", value: "Chốt Đơn Tức Thì" }
    ],
    image: "images/project-phone.jpg",
    description: "Không chỉ dừng lại ở bán hàng trực tiếp, em trải nghiệm thêm lĩnh vực livestream bán hàng sôi động. Trong quá trình này, bản thân rèn luyện sự hoạt ngôn, khả năng tư duy và phản ứng cực nhanh trước các câu hỏi của người xem, đồng thời nắm bắt tâm lý khách hàng để thúc đẩy chốt đơn ngay lập tức trên sóng.",
    highlights: [
      "Khả năng hoạt ngôn tự nhiên, làm chủ phòng live, duy trì năng lượng và nhịp dẫn dắt lôi cuốn.",
      "Giải đáp thắc mắc về mùi hương và ứng biến linh hoạt trước mọi phản hồi từ khán giả.",
      "Kỹ năng tạo cảm giác khan hiếm (urgency) và đưa ra ưu đãi thôi thúc khách hàng ra quyết định mua ngay."
    ]
  },
  "luxury-sale": {
    number: "03",
    title: "Nhân Viên Sale tại Harry Perfume",
    category: "Tư Vấn Bán Hàng Phân Khúc Luxury",
    timeline: "06/2024 - Hiện tại",
    metrics: [
      { label: "Phân khúc", value: "Khách Hàng Cao Cấp" },
      { label: "Giá trị đơn", value: "Hàng Chục Triệu Đồng" },
      { label: "Vai trò", value: "Bạn Đồng Hành Tâm Lý" }
    ],
    image: "images/project-calendar.jpg",
    description: "Bước vào môi trường mới, em có cơ hội tiếp xúc với tệp khách hàng chất lượng cao – những người đặc biệt quan tâm đến hình thức và chất lượng sản phẩm, sẵn sàng chi cho một món hàng đến hàng chục triệu đồng. Việc hiểu rõ và chiều ý khách là một bước tiến lớn: không chỉ am hiểu sâu sắc sản phẩm, mà còn phải như một người bạn tâm lý để đưa ra những quyết định thay cho khách lúc cần thiết.",
    highlights: [
      "Thấu hiểu gu thẩm mỹ và phong cách sống của phân khúc khách hàng thượng lưu.",
      "Tư vấn tinh tế, xây dựng niềm tin bền vững, biến khách hàng mới thành khách hàng thân thiết.",
      "Nắm vững nghệ thuật lắng nghe và định hướng quyết định mua sắm tinh tế, không gượng ép."
    ]
  },
  "steller-sale": {
    number: "04",
    title: "Nhân Viên Sale tại Cửa Hàng Giày Steller",
    category: "Bán Hàng & Thấu Hiểu Tâm Lý",
    timeline: "2023 - 2024",
    metrics: [
      { label: "Nền tảng", value: "Vừa Học Vừa Làm" },
      { label: "Kỹ năng", value: "Thấu Hiểu Tâm Lý" },
      { label: "Phẩm chất", value: "Kỷ Luật & Quyết Đoán" }
    ],
    image: "images/project-review.jpg",
    description: "Giai đoạn vừa học vừa làm, phụ trách tư vấn và bán hàng cho cửa hàng giày Steller. Tại đây, em học được nhiều điều về tâm lý khách hàng, rèn luyện và thấu hiểu rõ khách hàng muốn gì để có thể đưa ra lựa chọn tốt nhất. Đồng thời, được làm việc cùng người quản lý tốt đã giúp em nâng cao kỷ luật bản thân, học được khả năng kết nối và sự cứng rắn khi ra quyết định.",
    highlights: [
      "Rèn luyện kỹ năng quan sát và thấu hiểu mong muốn tiềm ẩn của khách hàng.",
      "Tác phong làm việc chuyên nghiệp, tuân thủ kỷ luật và kiểm soát quy trình bán hàng chuẩn mực.",
      "Xây dựng sự tự tin, kỹ năng kết nối với mọi đối tượng khách hàng và đưa ra giải pháp quyết đoán."
    ]
  },
  "glowcode": {
    number: "05",
    title: "Chiến Lược Truyền Thông GLOWCODE",
    category: "Visual Content & Skincare Marketing",
    timeline: "Dự Án Nghiên Cứu & Thực Hành",
    metrics: [
      { label: "Tone màu", value: "Sky Blue Pastel" },
      { label: "Thông điệp", value: "Dễ bôi dễ thẩm thấu" },
      { label: "Ấn phẩm", value: "9 Bố Cục Sáng Tạo" }
    ],
    image: "images/glowcode-full.jpg",
    description: "Nghiên cứu và ứng dụng phong cách thiết kế Visual Content hiện đại dành cho thương hiệu mỹ phẩm GLOWCODE. Kết hợp màu sắc tươi mát (Sky Blue / Cyan), các yếu tố minh họa khoa học (AHA, Niacinamide) và hình ảnh review chân thực để nâng cao niềm tin người tiêu dùng.",
    highlights: [
      "Bộ ấn phẩm truyền thông toàn diện gồm bài đăng social, hướng dẫn sử dụng và feedback.",
      "Tối ưu thông điệp 'Dễ bôi, dễ thẩm thấu' qua hình ảnh trực quan, thu hút sự chú ý.",
      "Phối hợp màu sắc chuẩn phong cách pastel hiện đại, tạo cảm giác thanh khiết, đáng tin cậy."
    ]
  }
};

document.addEventListener("DOMContentLoaded", () => {
  initThemeToggle();
  initNavigation();
  initProjectFiltering();
  initProjectModal();
  initCopyButtons();
  initContactForm();
  initMobileMenu();
});

// 1. Theme Toggle (Light Pastel Sky Blue vs Dark Midnight Ocean)
function initThemeToggle() {
  const toggleBtn = document.getElementById("themeToggleBtn");
  if (!toggleBtn) return;

  const currentTheme = localStorage.getItem("portfolio-theme") || "light";
  document.documentElement.setAttribute("data-theme", currentTheme);
  updateThemeIcon(toggleBtn, currentTheme);

  toggleBtn.addEventListener("click", () => {
    const isDark = document.documentElement.getAttribute("data-theme") === "dark";
    const nextTheme = isDark ? "light" : "dark";
    document.documentElement.setAttribute("data-theme", nextTheme);
    localStorage.setItem("portfolio-theme", nextTheme);
    updateThemeIcon(toggleBtn, nextTheme);
    showToast(isDark ? "Đã chuyển sang giao diện Sáng (Glowcode Pastel)" : "Đã chuyển sang giao diện Tối (Midnight Ocean)");
  });
}

function updateThemeIcon(btn, theme) {
  if (theme === "dark") {
    btn.innerHTML = `
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <circle cx="12" cy="12" r="5"></circle>
        <line x1="12" y1="1" x2="12" y2="3"></line>
        <line x1="12" y1="21" x2="12" y2="23"></line>
        <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line>
        <line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line>
        <line x1="1" y1="12" x2="3" y2="12"></line>
        <line x1="21" y1="12" x2="23" y2="12"></line>
        <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line>
        <line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line>
      </svg>`;
    btn.setAttribute("title", "Chuyển sang giao diện Sáng");
  } else {
    btn.innerHTML = `
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path>
      </svg>`;
    btn.setAttribute("title", "Chuyển sang giao diện Tối");
  }
}

// 2. Navigation Scrollspy
function initNavigation() {
  const sections = document.querySelectorAll("section[id]");
  const navLinks = document.querySelectorAll(".nav-link");

  window.addEventListener("scroll", () => {
    let current = "";
    const scrollPos = window.scrollY + 120;

    sections.forEach(section => {
      const sectionTop = section.offsetTop;
      const sectionHeight = section.offsetHeight;
      if (scrollPos >= sectionTop && scrollPos < sectionTop + sectionHeight) {
        current = section.getAttribute("id");
      }
    });

    navLinks.forEach(link => {
      link.classList.remove("active");
      if (link.getAttribute("href") === `#${current}`) {
        link.classList.add("active");
      }
    });
  });
}

// 3. Project Filter Tabs
function initProjectFiltering() {
  const filterBtns = document.querySelectorAll(".filter-btn");
  const projectCards = document.querySelectorAll(".project-card");

  filterBtns.forEach(btn => {
    btn.addEventListener("click", () => {
      filterBtns.forEach(b => b.classList.remove("active"));
      btn.classList.add("active");

      const filter = btn.getAttribute("data-filter");

      projectCards.forEach(card => {
        const category = card.getAttribute("data-category");
        if (filter === "all" || category === filter) {
          card.style.display = "flex";
          card.style.opacity = "0";
          setTimeout(() => {
            card.style.opacity = "1";
          }, 50);
        } else {
          card.style.display = "none";
        }
      });
    });
  });
}

// 4. Project Modal Viewer
function initProjectModal() {
  const modal = document.getElementById("projectModal");
  if (!modal) return;

  const closeBtn = modal.querySelector(".modal-close-btn");
  const triggerBtns = document.querySelectorAll("[data-modal-target]");

  triggerBtns.forEach(btn => {
    btn.addEventListener("click", (e) => {
      e.preventDefault();
      const projectId = btn.getAttribute("data-modal-target");
      const project = projectsData[projectId];
      if (!project) return;

      populateModal(modal, project);
      modal.showModal();
    });
  });

  if (closeBtn) {
    closeBtn.addEventListener("click", () => modal.close());
  }

  // Close on outside backdrop click
  modal.addEventListener("click", (e) => {
    const dialogDimensions = modal.getBoundingClientRect();
    if (
      e.clientX < dialogDimensions.left ||
      e.clientX > dialogDimensions.right ||
      e.clientY < dialogDimensions.top ||
      e.clientY > dialogDimensions.bottom
    ) {
      modal.close();
    }
  });
}

function populateModal(modal, data) {
  modal.querySelector("#modalNumber").textContent = data.number;
  modal.querySelector("#modalTitle").textContent = data.title;
  modal.querySelector("#modalCategory").textContent = data.category;
  modal.querySelector("#modalTimeline").textContent = data.timeline;
  modal.querySelector("#modalDesc").textContent = data.description;
  
  const imgEl = modal.querySelector("#modalImg");
  imgEl.src = data.image;
  imgEl.alt = data.title;

  const statsContainer = modal.querySelector("#modalStats");
  statsContainer.innerHTML = "";
  data.metrics.forEach(m => {
    const chip = document.createElement("div");
    chip.className = "stat-chip";
    chip.innerHTML = `<strong>${m.value}</strong> <span>${m.label}</span>`;
    statsContainer.appendChild(chip);
  });

  const highlightsList = modal.querySelector("#modalHighlights");
  highlightsList.innerHTML = "";
  data.highlights.forEach(h => {
    const li = document.createElement("li");
    li.style.marginBottom = "8px";
    li.style.fontSize = "13px";
    li.style.color = "var(--text-secondary)";
    li.textContent = h;
    highlightsList.appendChild(li);
  });
}

// 5. Copy to Clipboard with Toast Notification
function initCopyButtons() {
  const copyButtons = document.querySelectorAll("[data-copy-text]");

  copyButtons.forEach(btn => {
    btn.addEventListener("click", async () => {
      const text = btn.getAttribute("data-copy-text");
      const label = btn.getAttribute("data-copy-label") || text;
      try {
        await navigator.clipboard.writeText(text);
        showToast(`Đã sao chép: ${label}`);
      } catch (err) {
        showToast(`Sao chép: ${text}`);
      }
    });
  });
}

function showToast(message) {
  let toast = document.getElementById("toastNotice");
  if (!toast) {
    toast = document.createElement("div");
    toast.id = "toastNotice";
    toast.className = "toast-notice";
    document.body.appendChild(toast);
  }

  toast.innerHTML = `
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
      <polyline points="20 6 9 17 4 12"></polyline>
    </svg>
    <span>${message}</span>
  `;

  toast.classList.add("show");
  clearTimeout(toast._timeout);
  toast._timeout = setTimeout(() => {
    toast.classList.remove("show");
  }, 2800);
}

// 6. Contact Form Mock
function initContactForm() {
  const form = document.getElementById("quickContactForm");
  if (!form) return;

  form.addEventListener("submit", (e) => {
    e.preventDefault();
    const name = form.querySelector("input[name='name']").value;
    showToast(`Cảm ơn ${name || 'bạn'}! Lời nhắn đã được gửi tới Hải Châu thành công.`);
    form.reset();
  });
}

// 7. Mobile Navigation Menu Toggle
function initMobileMenu() {
  const btn = document.querySelector(".mobile-menu-btn");
  const menu = document.querySelector(".nav-menu");
  if (!btn || !menu) return;

  btn.addEventListener("click", () => {
    menu.classList.toggle("open");
  });

  menu.querySelectorAll("a").forEach(link => {
    link.addEventListener("click", () => {
      menu.classList.remove("open");
    });
  });
}
