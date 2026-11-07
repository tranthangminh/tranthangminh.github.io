// Helper to resolve favicon for a tab.
// Thứ tự ưu tiên:
//   1. customFavicon — được set từ channels.csv (icon column) hoặc user tự nhập
//   2. Google Favicon API fallback dựa vào domain của URL
function getGoogleFaviconUrl(url) {
  try {
    return `https://www.google.com/s2/favicons?sz=64&domain=${new URL(url).hostname}`;
  } catch {
    return "";
  }
}

function getTabFaviconUrl(tab) {
  return tab.customFavicon || getGoogleFaviconUrl(tab.url);
}

const BASE_FRAME_PERMISSIONS = "encrypted-media; clipboard-write; autoplay";
// One grant to the dashboard reaches every frame listing these, so each link has to opt in
const DEVICE_FRAME_PERMISSIONS = "camera; microphone; geolocation; clipboard-read";

// Returns a usable http(s) URL, adding https:// when the scheme is missing, or "" when it cannot be used
function normalizeHttpUrl(value) {
  const text = String(value ?? "").trim();
  if (!text) return "";
  const candidate = /^[a-z][a-z0-9+.-]*:\/\//i.test(text) ? text : `https://${text}`;
  try {
    return /^https?:$/.test(new URL(candidate).protocol) ? candidate : "";
  } catch {
    return "";
  }
}

// A bundled icon can be missing, so try the site's favicon from Google before showing the globe
function bindFaviconFallback(img, fallbackEl, siteUrl) {
  let triedGoogle = false;
  img.addEventListener("error", () => {
    const googleUrl = getGoogleFaviconUrl(siteUrl);
    if (!triedGoogle && googleUrl) {
      triedGoogle = true;
      img.src = googleUrl;
      return;
    }
    img.style.display = "none";
    fallbackEl.style.display = "inline-block";
  });
}

// Helper to create a unified icon element (can be a standard favicon img, a text avatar, or a split-favicon)
function createTabIconElement(tab) {
  if (tab.isSplit) {
    const wrapper = document.createElement("div");
    wrapper.className = "tab-favicon-split-wrapper tab-favicon";

    // Top-Left Icon (Link 1 - 20x20px)
    const topLeft = document.createElement("div");
    topLeft.className = "favicon-diagonal diagonal-top-left";
    if (tab.iconType === "text") {
      topLeft.classList.add("text-avatar");
      topLeft.style.backgroundColor = tab.iconBgColor || "#6366f1";
      topLeft.style.color = tab.iconTextColor || "#ffffff";
      topLeft.textContent = tab.iconText || tab.name.substring(0, 1).toUpperCase();
    } else {
      const leftImg = document.createElement("img");
      leftImg.src = getTabFaviconUrl(tab);
      const leftFallback = document.createElement("span");
      leftFallback.className = "tab-favicon";
      leftFallback.textContent = "🌐";
      leftFallback.style.display = "none";
      bindFaviconFallback(leftImg, leftFallback, tab.url);
      topLeft.appendChild(leftImg);
      topLeft.appendChild(leftFallback);
    }

    // Bottom-Right Icon (Link 2 - 20x20px)
    const bottomRight = document.createElement("div");
    bottomRight.className = "favicon-diagonal diagonal-bottom-right";
    if (tab.iconTypeRight === "text") {
      bottomRight.classList.add("text-avatar");
      bottomRight.style.backgroundColor = tab.iconBgColorRight || "#6366f1";
      bottomRight.style.color = tab.iconTextColorRight || "#ffffff";
      bottomRight.textContent = tab.iconTextRight || tab.name.substring(tab.name.length - 1).toUpperCase();
    } else {
      const rightImg = document.createElement("img");
      const rightCustomFav = tab.customFaviconRight || (tab.customFavicon && !tab.iconTypeRight ? tab.customFavicon : "");
      const tempRightTab = { url: tab.urlRight, customFavicon: rightCustomFav };
      rightImg.src = getTabFaviconUrl(tempRightTab);
      const rightFallback = document.createElement("span");
      rightFallback.className = "tab-favicon";
      rightFallback.textContent = "🌐";
      rightFallback.style.display = "none";
      bindFaviconFallback(rightImg, rightFallback, tab.urlRight);
      bottomRight.appendChild(rightImg);
      bottomRight.appendChild(rightFallback);
    }

    // Append bottomRight FIRST so it sits under topLeft naturally without z-index
    wrapper.appendChild(bottomRight);
    wrapper.appendChild(topLeft);
    return wrapper;
  }

  // Single tab icon
  if (tab.iconType === "text") {
    const textVal = tab.iconText || tab.name.substring(0, 15).toUpperCase();
    const bgVal   = tab.iconBgColor || "#6366f1";
    const textCol = tab.iconTextColor || "#ffffff";
    const iconEl = document.createElement("div");
    iconEl.className = "tab-favicon text-icon-avatar";
    iconEl.style.backgroundColor = bgVal;
    iconEl.style.color = textCol;
    iconEl.textContent = textVal;

    const len = textVal.length;
    if (len > 10) {
      iconEl.style.fontSize = "6.5px";
      iconEl.style.lineHeight = "1";
    } else if (len > 6) {
      iconEl.style.fontSize = "7.5px";
      iconEl.style.lineHeight = "1.05";
    } else if (len > 3) {
      iconEl.style.fontSize = "8.5px";
      iconEl.style.lineHeight = "1.1";
    } else {
      iconEl.style.fontSize = "10px";
      iconEl.style.lineHeight = "1";
    }
    return iconEl;
  } else {
    const faviconUrl = getTabFaviconUrl(tab);
    const isEmoji = faviconUrl && faviconUrl.length <= 4;
    if (isEmoji) {
      const iconEl = document.createElement("span");
      iconEl.className = "tab-favicon";
      iconEl.textContent = faviconUrl;
      return iconEl;
    }
    
    const wrapper = document.createElement("div");
    wrapper.className = "tab-favicon-wrapper-single tab-favicon";
    wrapper.style.display = "inline-flex";
    wrapper.style.alignItems = "center";
    wrapper.style.justifyContent = "center";
    wrapper.style.border = "none";
    wrapper.style.backgroundColor = "transparent";

    const img = document.createElement("img");
    img.className = "tab-favicon";
    img.src = faviconUrl || "🌐";
    img.style.margin = "0";

    const fallback = document.createElement("span");
    fallback.className = "tab-favicon";
    fallback.textContent = "🌐";
    fallback.style.display = "none";
    fallback.style.margin = "0";

    bindFaviconFallback(img, fallback, tab.url);
    wrapper.appendChild(img);
    wrapper.appendChild(fallback);
    return wrapper;
  }
}

// Helper to create a standardized Grid Card DOM element for both first-setup and sub-group-editor
function createGridCard(tab, baseClass, isSelected, onClickCallback) {
  const el = document.createElement("div");
  el.className = `${baseClass} ${isSelected ? "selected" : ""}`;
  el.setAttribute("data-tab-id", tab.id);

  const iconEl = createTabIconElement(tab);
  const title = document.createElement("span");
  title.className = "tab-title";
  title.textContent = tab.name;
  
  el.appendChild(iconEl);
  el.appendChild(title);

  if (onClickCallback) {
    el.addEventListener("click", () => onClickCallback(el));
  }
  return el;
}
