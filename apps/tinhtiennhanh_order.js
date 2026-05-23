const products = [
    // --- MAIN PRODUCTS - PAGE 1 ---
    { name: "Giò lớn", price: 55000, span: 2 },
    { name: "Giò nhỏ", price: 40000, span: 2 },
    { name: "Đặc biệt", price: 90000, span: 2, bgIcon: "✨" },
    { type: "label", name: "+Thịt", optionCount: 3 },
    { name: "+Thịt 20k", key: "+Thịt 20k", price: 20000, span: 1, compact: true, bgIcon: "🥩" },
    { name: "+Thịt 30k", key: "+Thịt 30k", price: 30000, span: 1, compact: true, bgIcon: "🥩" },
    { name: "+Thịt 35k", key: "+Thịt 35k", price: 35000, span: 1, compact: true, bgIcon: "🥩" },

    // --- MAIN PRODUCTS - PAGE 2 ---
    { name: "Mộc lớn", price: 40000, span: 3 },
    { name: "Mộc nhỏ", price: 30000, span: 3 },
    { type: "label", name: "+Mộc", optionCount: 2 },
    { name: "+Mộc 10k", key: "+Mộc 10k", price: 10000, span: 1, compact: true, bgIcon: "🍢" },
    { name: "+Mộc 20k", key: "+Mộc 20k", price: 20000, span: 1, compact: true, bgIcon: "🍢" },

    // --- SIDE PRODUCTS ---
    { name: "Trà đá", price: 2000, span: 2, bgIcon: "🌿" },
    { name: "Nước suối", price: 6000, span: 2, bgIcon: "💧" },
    { name: "Nước ngọt", price: 15000, span: 2, bgIcon: "🥤" },
    { name: "Bún nước lớn", price: 20000, span: 3 },
    { name: "Bún nước nhỏ", price: 15000, span: 3 },
    { type: "label", name: "Khác", optionCount: 4 },
    { name: "2k", key: "Khác 2k", price: 2000, span: 1, compact: true, bgIcon: "➕" },
    { name: "3k", key: "Khác 3k", price: 3000, span: 1, compact: true, bgIcon: "➕" },
    { name: "5k", key: "Khác 5k", price: 5000, span: 1, compact: true, bgIcon: "➕" },
    { name: "10k", key: "Khác 10k", price: 10000, span: 1, compact: true, bgIcon: "➕" }
];

const cashDenominations = [
    100000,
    10000,
    1000,
    200000,
    20000,
    2000,
    500000,
    50000,
    5000
];

const autoMilestoneMap = [
    [1, 2, 5],
    [2, 5],
    [3, 4, 5],
    [4, 5],
    [5, 6],
    [1, 6, 7],
    [2, 7],
    [3, 8, 9],
    [1, 4, 9],
    [1, 2]
];

const state = {
    activeTable: null,
    orderTotal: 0,
    productCounts: new Map(),
    customerPaid: 0,
    cashHistory: [],
    calcMode: "auto"
};

const storageKeyPrefix = "fastFoodCalculatorOrder";
const paidStorageKeyPrefix = "fastFoodCalculatorPaid";
const calcModeStorageKey = "fastFoodCalculatorMode";

const orderTotalEl = document.getElementById("orderTotal");
const productGridMainPage1El = document.getElementById("productGridMainPage1");
const productGridMainPage2El = document.getElementById("productGridMainPage2");
const productGridSubEl = document.getElementById("productGridSub");
const productViewportMainEl = document.getElementById("productViewportMain");
const productTrackMainEl = document.getElementById("productTrackMain");
const autoGridEl = document.getElementById("autoGrid");
const orderSummaryEl = document.getElementById("orderSummary");
const calcViewportEl = document.getElementById("calcViewport");
const calcTrackEl = document.getElementById("calcTrack");
const cashGridEl = document.getElementById("cashGrid");
const customerPaidEl = document.getElementById("customerPaid");
const manualChangeEl = document.getElementById("manualChange");

function shortMoney(value) {
    return value >= 1000 ? `${value / 1000}k` : `${value}đ`;
}

function getProductKey(product) {
    return product.key || product.name;
}

function getOrderStorageKey(tableId = state.activeTable) {
    return tableId ? `${storageKeyPrefix}:${tableId}` : null;
}

function getPaidStorageKey(tableId = state.activeTable) {
    return tableId ? `${paidStorageKeyPrefix}:${tableId}` : null;
}

function calculateOrderTotal() {
    return products.reduce((total, product) => {
        if (product.type === "label") return total;

        const productKey = getProductKey(product);
        const count = state.productCounts.get(productKey) || 0;
        return total + product.price * count;
    }, 0);
}

function calculateCountsTotal(counts) {
    return products.reduce((total, product) => {
        if (product.type === "label") return total;

        const productKey = getProductKey(product);
        const count = Number(counts[productKey]) || 0;
        return total + product.price * count;
    }, 0);
}

function getTableSnapshot(tableId) {
    const storageKey = getOrderStorageKey(tableId);
    const emptySnapshot = { items: [], total: 0, hasOrder: false, isPaid: false };
    if (!storageKey) return emptySnapshot;

    const savedOrder = localStorage.getItem(storageKey);
    if (!savedOrder) return emptySnapshot;

    try {
        const parsedOrder = JSON.parse(savedOrder);
        const counts = parsedOrder?.counts || {};
        const createdAt = parsedOrder?.createdAt || null;
        const items = products
            .filter((product) => product.type !== "label")
            .map((product) => {
                const productKey = getProductKey(product);
                const count = Number(counts[productKey]) || 0;
                return { count, name: productKey };
            })
            .filter((item) => item.count > 0);
        const total = calculateCountsTotal(counts);

        return {
            items,
            total,
            createdAt,
            hasOrder: items.length > 0,
            isPaid: items.length > 0 && localStorage.getItem(getPaidStorageKey(tableId)) === "1"
        };
    } catch {
        localStorage.removeItem(storageKey);
        return emptySnapshot;
    }
}

function getHistory() {
    try {
        return JSON.parse(localStorage.getItem("fastFoodCalculatorHistory")) || [];
    } catch {
        return [];
    }
}

function clearHistory() {
    localStorage.removeItem("fastFoodCalculatorHistory");
    if (window.TinhTienGitHub) window.TinhTienGitHub.syncToCloud();
}

function deleteHistoryItem(id) {
    const history = getHistory();
    const updated = history.filter((item) => item.id !== id);
    localStorage.setItem("fastFoodCalculatorHistory", JSON.stringify(updated));
    if (window.TinhTienGitHub) window.TinhTienGitHub.syncToCloud();
}

function saveToHistory(tableId, total, summary = "", createdAt = null) {
    if (total <= 0) return;
    const now = new Date();
    const timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
    const dateStr = `${String(now.getDate()).padStart(2, '0')}/${String(now.getMonth() + 1).padStart(2, '0')}/${now.getFullYear()}`;
    
    let createdTimeStr = "";
    if (createdAt) {
        const cDate = new Date(createdAt);
        createdTimeStr = `${String(cDate.getHours()).padStart(2, '0')}:${String(cDate.getMinutes()).padStart(2, '0')}`;
    }
    
    const history = getHistory();
    history.unshift({
        id: Date.now(),
        tableId: isNaN(tableId) ? tableId : Number(tableId),
        total,
        summary,
        time: timeStr,
        createdTime: createdTimeStr,
        date: dateStr
    });
    
    localStorage.setItem("fastFoodCalculatorHistory", JSON.stringify(history));
}

function clearTableOrder(tableId) {
    const snapshot = getTableSnapshot(tableId);
    if (snapshot.hasOrder) {
        const summaryText = snapshot.items.map((item) => `${item.count} ${item.name}`).join(", ");
        saveToHistory(tableId, snapshot.total, summaryText, snapshot.createdAt);
    }

    const storageKey = getOrderStorageKey(tableId);
    if (!storageKey) return;

    localStorage.removeItem(storageKey);
    localStorage.removeItem(getPaidStorageKey(tableId));

    if (state.activeTable === tableId) {
        state.orderTotal = 0;
        state.productCounts.clear();
        state.customerPaid = 0;
        state.cashHistory = [];
        renderProducts();
        renderTotals();
    }
    if (window.TinhTienGitHub) window.TinhTienGitHub.syncToCloud();
}

function markTablePaid(tableId) {
    const snapshot = getTableSnapshot(tableId);
    if (!snapshot.hasOrder) return;

    localStorage.setItem(getPaidStorageKey(tableId), "1");
    if (window.TinhTienGitHub) window.TinhTienGitHub.syncToCloud();
}

function markCurrentOrderUnpaid() {
    const paidStorageKey = getPaidStorageKey();
    if (paidStorageKey) localStorage.removeItem(paidStorageKey);
}

function saveOrder(markUnpaid = false) {
    const storageKey = getOrderStorageKey();
    if (!storageKey) return;

    const counts = Object.fromEntries(state.productCounts);

    if (Object.keys(counts).length === 0) {
        localStorage.removeItem(storageKey);
        localStorage.removeItem(getPaidStorageKey());
        if (window.TinhTienGitHub) window.TinhTienGitHub.syncToCloud();
        return;
    }

    let createdAt = Date.now();
    const existingStr = localStorage.getItem(storageKey);
    if (existingStr) {
        try {
            const existingObj = JSON.parse(existingStr);
            if (existingObj && existingObj.createdAt) {
                createdAt = existingObj.createdAt;
            }
        } catch (e) {}
    }

    localStorage.setItem(storageKey, JSON.stringify({ counts, createdAt }));
    if (markUnpaid) markCurrentOrderUnpaid();
    if (window.TinhTienGitHub) window.TinhTienGitHub.syncToCloud();
}

function loadOrder() {
    state.orderTotal = 0;
    state.productCounts.clear();

    const storageKey = getOrderStorageKey();
    if (!storageKey) return;

    const savedOrder = localStorage.getItem(storageKey);
    if (!savedOrder) return;

    try {
        const parsedOrder = JSON.parse(savedOrder);
        const counts = parsedOrder?.counts || {};

        Object.entries(counts).forEach(([productKey, count]) => {
            const normalizedCount = Number(count);
            if (Number.isInteger(normalizedCount) && normalizedCount > 0) {
                state.productCounts.set(productKey, normalizedCount);
            }
        });

        state.orderTotal = calculateOrderTotal();
    } catch {
        localStorage.removeItem(storageKey);
    }
}

function setActiveTable(tableId) {
    state.activeTable = tableId;
    state.customerPaid = 0;
    state.cashHistory = [];
    loadOrder();
    setMainPage(1);
    renderProducts();
    renderTotals();
}

function loadCalcMode() {
    const savedMode = localStorage.getItem(calcModeStorageKey);
    if (savedMode === "auto" || savedMode === "manual") {
        state.calcMode = savedMode;
    }
}

function renderTotals() {
    orderTotalEl.textContent = shortMoney(state.orderTotal);
    renderOrderSummary();
    renderAutoOptions();
    renderManualTotals();

    const payBtn = document.getElementById("orderPayBtn");
    const finishBtn = document.getElementById("orderFinishBtn");
    if (state.activeTable) {
        const hasOrder = state.productCounts.size > 0;
        const isPaid = localStorage.getItem(getPaidStorageKey(state.activeTable)) === "1";
        if (payBtn) {
            payBtn.disabled = !(hasOrder && !isPaid);
        }
        if (finishBtn) {
            finishBtn.disabled = !hasOrder;
        }
    }
}

function renderOrderSummary() {
    orderSummaryEl.innerHTML = "";

    products
        .filter((product) => product.type !== "label")
        .forEach((product) => {
            const productKey = getProductKey(product);
            const count = state.productCounts.get(productKey) || 0;
            if (count === 0) return;

            const item = document.createElement("div");
            item.className = "summary-item";
            item.textContent = `${count} ${productKey}`;
            orderSummaryEl.appendChild(item);
        });
}

function renderProducts() {
    productGridMainPage1El.innerHTML = "";
    productGridMainPage2El.innerHTML = "";
    productGridSubEl.innerHTML = "";

    const createProductTile = (product, index) => {
        const productKey = getProductKey(product);
        const count = state.productCounts.get(productKey) || 0;
        const tile = document.createElement("div");
        tile.className = `tile product-tile product-span-${product.span}${product.compact ? " is-compact button-phu" : ""}${product.bgIcon ? " has-bg-icon" : ""}${count > 0 ? " is-added" : ""}`;
        if (product.bgIcon) {
            tile.style.setProperty("--tile-bg-icon", `"${product.bgIcon}"`);
        }
        tile.innerHTML = `
            <button class="product-add" type="button" data-action="add" data-index="${index}" aria-label="Cộng ${productKey}">
                <span class="tile-name">${product.name}${count > 0 ? `<span class="product-count">x${count}</span>` : ""}</span>
                ${product.compact ? "" : `<span class="tile-price">${shortMoney(product.price)}</span>`}
            </button>
            <button class="product-minus" type="button" data-action="minus" data-index="${index}" aria-label="Trừ ${productKey}" ${count === 0 ? "disabled" : ""}>-</button>
        `;
        return tile;

    };

    for (let index = 0; index < products.length; index += 1) {
        const product = products[index];
        let targetGrid;
        if (index < 7) {
            targetGrid = productGridMainPage1El;
        } else if (index < 12) {
            targetGrid = productGridMainPage2El;
        } else {
            targetGrid = productGridSubEl;
        }

        if (product.type === "label") {
            const row = document.createElement("div");
            const optionCount = product.optionCount || 4;
            row.className = `option-row option-count-${optionCount} no-label`;

            products.slice(index + 1, index + optionCount + 1).forEach((optionProduct, offset) => {
                row.appendChild(createProductTile(optionProduct, index + offset + 1));
            });

            targetGrid.appendChild(row);
            index += optionCount;
            continue;
        }

        targetGrid.appendChild(createProductTile(product, index));
    }
}

function getAutoCashValues(total) {
    if (total <= 0) return [];

    const totalK = Math.ceil(total / 1000);
    const baseK = Math.floor(totalK / 500) * 500;
    const remainderK = totalK - baseK;
    const hundredDigit = Math.floor(remainderK / 100);
    const tenDigit = Math.floor((remainderK % 100) / 10);
    const hundredMarks = autoMilestoneMap[hundredDigit] || [];
    const tenMarks = autoMilestoneMap[tenDigit] || [];
    const valuesK = new Set();

    hundredMarks.forEach((hundredMark) => {
        valuesK.add(baseK + hundredMark * 100);
    });

    const tenHundredMarks = [...new Set([hundredDigit, ...hundredMarks])];
    tenHundredMarks.forEach((hundredMark) => {
        tenMarks.forEach((tenMark) => {
            valuesK.add(baseK + hundredMark * 100 + tenMark * 10);
        });
    });

    return [...valuesK]
        .filter((valueK) => valueK * 1000 >= total)
        .sort((a, b) => a - b)
        .slice(0, 16)
        .map((valueK) => valueK * 1000);
}

function renderAutoOptions() {
    autoGridEl.innerHTML = "";

    if (state.orderTotal <= 0) return;

    const values = getAutoCashValues(state.orderTotal);
    const groups = [...new Set(values.map((value) => Math.floor(value / 100000)))].sort((a, b) => a - b);
    const groupRows = new Map(groups.map((group, index) => [group, index + 1]));
    const groupOptionCounts = new Map();

    values.forEach((value) => {
        const returnValue = value - state.orderTotal;
        const groupIndex = Math.floor(value / 100000);
        const rowIndex = groupRows.get(groupIndex);
        const isRoundHundred = value % 100000 === 0;
        const columnIndex = isRoundHundred ? 1 : (groupOptionCounts.get(groupIndex) || 0) + 2;

        if (!rowIndex || rowIndex > 4 || columnIndex > 4) return;

        if (!isRoundHundred) {
            groupOptionCounts.set(groupIndex, columnIndex - 1);
        }

        const option = document.createElement("div");
        option.className = "tile auto-option";
        option.style.gridColumn = columnIndex;
        option.style.gridRow = rowIndex;
        option.innerHTML = `
            <span class="auto-pair">
                <strong class="auto-value">${shortMoney(value)}</strong>
            </span>
            <span class="auto-pair">
                <strong class="auto-value auto-return">${shortMoney(Math.abs(returnValue))}</strong>
            </span>
        `;
        autoGridEl.appendChild(option);
    });
}

function renderManualTotals() {
    customerPaidEl.textContent = shortMoney(state.customerPaid);

    if (state.customerPaid < state.orderTotal) {
        manualChangeEl.textContent = "Thiếu";
        return;
    }

    manualChangeEl.textContent = shortMoney(state.customerPaid - state.orderTotal);
}

function renderCashGrid() {
    cashGridEl.innerHTML = "";

    const actions = document.createElement("div");
    actions.className = "cash-actions";

    const denominations = document.createElement("div");
    denominations.className = "cash-denominations";

    const createButton = (buttonData) => {
        const button = document.createElement("button");
        button.className = `cash-button${buttonData.group ? ` cash-group-${buttonData.group}` : ""}${buttonData.type === "clear" ? " is-danger" : ""}${buttonData.type === "undo" ? " is-undo" : ""}`;
        button.type = "button";
        button.dataset.action = buttonData.type;
        button.textContent = buttonData.label;

        if (buttonData.value) {
            button.dataset.value = buttonData.value;
        }

        return button;
    };

    [
        { type: "undo", label: "↩️" },
        { type: "clear", label: "🗑️" }
    ].forEach((buttonData) => {
        actions.appendChild(createButton(buttonData));
    });

    cashDenominations.forEach((value, index) => {
        const group = ["high", "mid", "low"][index % 3];
        denominations.appendChild(createButton({ type: "cash", value, group, label: shortMoney(value) }));
    });

    cashGridEl.append(actions, denominations);
}

function setCalcMode(mode) {
    state.calcMode = mode;
    calcTrackEl.classList.toggle("is-manual", mode === "manual");

    // Update calculation page indicator dots
    const calcDots = document.querySelectorAll("#pageIndicatorsCalc .dot");
    calcDots.forEach((dot, idx) => {
        dot.classList.toggle("active", (mode === "auto" && idx === 0) || (mode === "manual" && idx === 1));
    });

    localStorage.setItem(calcModeStorageKey, mode);
    if (window.TinhTienGitHub) window.TinhTienGitHub.syncToCloud();
}

let calcSwipeHappened = false;

function handleSwipe(startX, endX) {
    const deltaX = endX - startX;
    if (Math.abs(deltaX) < 38) return;

    calcSwipeHappened = true;
    if (deltaX < 0) {
        setCalcMode("manual");
    } else {
        setCalcMode("auto");
    }
}

function handleProductGridClick(event) {
    const button = event.target.closest("button[data-action][data-index]");
    if (!button) return;

    const product = products[Number(button.dataset.index)];
    if (!product || product.type === "label") return;

    const productKey = getProductKey(product);
    const currentCount = state.productCounts.get(productKey) || 0;

    if (button.dataset.action === "minus") {
        if (currentCount === 0) return;
        const nextCount = currentCount - 1;
        if (nextCount === 0) {
            state.productCounts.delete(productKey);
        } else {
            state.productCounts.set(productKey, nextCount);
        }
        state.orderTotal = Math.max(0, state.orderTotal - product.price);
    } else {
        state.productCounts.set(productKey, currentCount + 1);
        state.orderTotal += product.price;
    }

    renderProducts();
    saveOrder(true);
    renderTotals();
}

productGridMainPage1El.addEventListener("click", handleProductGridClick);
productGridMainPage2El.addEventListener("click", handleProductGridClick);
productGridSubEl.addEventListener("click", handleProductGridClick);

let mainSwipeStartX = 0;
let mainCurrentPage = 1;
let mainSwipeHappened = false;

function setMainPage(pageNumber) {
    mainCurrentPage = pageNumber;
    if (productTrackMainEl) {
        productTrackMainEl.classList.toggle("show-page-2", pageNumber === 2);
    }
    const mainDots = document.querySelectorAll("#pageIndicatorsMain .dot");
    mainDots.forEach((dot, idx) => {
        dot.classList.toggle("active", idx === pageNumber - 1);
    });
}

if (productViewportMainEl) {
    productViewportMainEl.addEventListener("touchstart", (event) => {
        mainSwipeStartX = event.changedTouches[0].clientX;
    }, { passive: true });

    productViewportMainEl.addEventListener("touchend", (event) => {
        const deltaX = event.changedTouches[0].clientX - mainSwipeStartX;
        if (Math.abs(deltaX) < 38) return;
        mainSwipeHappened = true;
        if (deltaX < 0) {
            setMainPage(2);
        } else {
            setMainPage(1);
        }
    }, { passive: true });

    productViewportMainEl.addEventListener("pointerdown", (event) => {
        if (event.pointerType === "touch") return;
        mainSwipeStartX = event.clientX;
    });

    productViewportMainEl.addEventListener("pointerup", (event) => {
        if (event.pointerType === "touch") return;
        const deltaX = event.clientX - mainSwipeStartX;
        if (Math.abs(deltaX) < 38) return;
        mainSwipeHappened = true;
        if (deltaX < 0) {
            setMainPage(2);
        } else {
            setMainPage(1);
        }
    });

    // Prevent accidental button clicks when dragging to swipe on desktop/pointers
    productViewportMainEl.addEventListener("click", (event) => {
        if (mainSwipeHappened) {
            event.stopPropagation();
            event.preventDefault();
            mainSwipeHappened = false;
        }
    }, { capture: true });
}

let subSwipeStartX = 0;
let subSwipeStartY = 0;
let subSwipeHappened = false;

if (productGridSubEl) {
    productGridSubEl.addEventListener("touchstart", (event) => {
        subSwipeStartX = event.changedTouches[0].clientX;
        subSwipeStartY = event.changedTouches[0].clientY;
    }, { passive: true });

    productGridSubEl.addEventListener("touchend", (event) => {
        const deltaX = event.changedTouches[0].clientX - subSwipeStartX;
        const deltaY = event.changedTouches[0].clientY - subSwipeStartY;
        
        if (deltaX > 50 && Math.abs(deltaY) < 40) {
            subSwipeHappened = true;
            const tableBack = document.getElementById("tableBack");
            if (tableBack) {
                tableBack.click();
            }
        }
    }, { passive: true });

    productGridSubEl.addEventListener("pointerdown", (event) => {
        if (event.pointerType === "touch") return;
        subSwipeStartX = event.clientX;
        subSwipeStartY = event.clientY;
    });

    productGridSubEl.addEventListener("pointerup", (event) => {
        if (event.pointerType === "touch") return;
        const deltaX = event.clientX - subSwipeStartX;
        const deltaY = event.clientY - subSwipeStartY;
        if (deltaX > 50 && Math.abs(deltaY) < 40) {
            subSwipeHappened = true;
            const tableBack = document.getElementById("tableBack");
            if (tableBack) {
                tableBack.click();
            }
        }
    });

    productGridSubEl.addEventListener("click", (event) => {
        if (subSwipeHappened) {
            event.stopPropagation();
            event.preventDefault();
            subSwipeHappened = false;
        }
    }, { capture: true });
}

// Click to switch page on dots
document.addEventListener("click", (event) => {
    const mainDot = event.target.closest("#pageIndicatorsMain .dot");
    if (mainDot) {
        const dots = Array.from(document.querySelectorAll("#pageIndicatorsMain .dot"));
        const idx = dots.indexOf(mainDot);
        if (idx !== -1) {
            setMainPage(idx + 1);
        }
        return;
    }

    const calcDot = event.target.closest("#pageIndicatorsCalc .dot");
    if (calcDot) {
        const dots = Array.from(document.querySelectorAll("#pageIndicatorsCalc .dot"));
        const idx = dots.indexOf(calcDot);
        if (idx !== -1) {
            setCalcMode(idx === 0 ? "auto" : "manual");
        }
    }
});

cashGridEl.addEventListener("click", (event) => {
    const button = event.target.closest("button[data-action]");
    if (!button) return;

    if (button.dataset.action === "cash") {
        const value = Number(button.dataset.value);
        state.customerPaid += value;
        state.cashHistory.push(value);
    }

    if (button.dataset.action === "undo") {
        const lastValue = state.cashHistory.pop();
        if (lastValue) state.customerPaid = Math.max(0, state.customerPaid - lastValue);
    }

    if (button.dataset.action === "clear") {
        state.customerPaid = 0;
        state.cashHistory = [];
    }

    renderManualTotals();
});

document.getElementById("clearAll").addEventListener("click", () => {
    state.orderTotal = 0;
    state.productCounts.clear();
    state.customerPaid = 0;
    state.cashHistory = [];
    const storageKey = getOrderStorageKey();
    if (storageKey) localStorage.removeItem(storageKey);
    const paidStorageKey = getPaidStorageKey();
    if (paidStorageKey) localStorage.removeItem(paidStorageKey);
    renderProducts();
    renderTotals();
    if (window.TinhTienGitHub) window.TinhTienGitHub.syncToCloud();
});

let swipeStartX = 0;

calcViewportEl.addEventListener("touchstart", (event) => {
    swipeStartX = event.changedTouches[0].clientX;
}, { passive: true });

calcViewportEl.addEventListener("touchend", (event) => {
    handleSwipe(swipeStartX, event.changedTouches[0].clientX);
}, { passive: true });

calcViewportEl.addEventListener("pointerdown", (event) => {
    if (event.pointerType === "touch") return;
    swipeStartX = event.clientX;
});

calcViewportEl.addEventListener("pointerup", (event) => {
    if (event.pointerType === "touch") return;
    handleSwipe(swipeStartX, event.clientX);
});

// Prevent accidental clicks when dragging to swipe on desktop/pointers
calcViewportEl.addEventListener("click", (event) => {
    if (calcSwipeHappened) {
        event.stopPropagation();
        event.preventDefault();
        calcSwipeHappened = false;
    }
}, { capture: true });

function initOrder() {
    loadCalcMode();
    renderCashGrid();
    setCalcMode(state.calcMode);
    setMainPage(1);
}

function getProductPrice(name) {
    const prod = products.find((p) => (p.key || p.name) === name);
    if (prod) return prod.price;

    const oldPrices = {
        "Tô lớn": 55000,
        "Tô nhỏ": 40000,
        "Tô đặc biệt": 90000,
        "Bún nước lớn": 40000,
        "Bún nước nhỏ": 30000,
        "Mộc thêm 20k": 20000,
        "Thịt +20k": 20000,
        "Thịt +30k": 30000,
        "Thịt +35k": 35000
    };
    return oldPrices[name] !== undefined ? oldPrices[name] : 0;
}

window.TinhTienOrder = {
    clearTableOrder,
    getTableSnapshot,
    initOrder,
    markTablePaid,
    saveCurrentOrder: () => saveOrder(false),
    setActiveTable,
    shortMoney,
    getHistory,
    clearHistory,
    deleteHistoryItem,
    getProductPrice,
    getActiveTable: () => state.activeTable
};
