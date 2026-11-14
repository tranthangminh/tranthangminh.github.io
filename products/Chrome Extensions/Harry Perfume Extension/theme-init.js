// Nạp trong <head>: áp theme đã lưu trước khi trang vẽ để không bị chớp giao diện.
// localStorage là bản sao đồng bộ của StorageHelper("theme"), do panel.js và cost-checker.js ghi.
try {
  const savedTheme = JSON.parse(localStorage.getItem("theme"));
  if (savedTheme === "light" || savedTheme === "dark") {
    document.documentElement.setAttribute("data-theme", savedTheme);
  }
} catch (e) {}
