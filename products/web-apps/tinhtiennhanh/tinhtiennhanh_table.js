const tableViewEl = document.getElementById("tableView");
const orderViewEl = document.getElementById("orderView");
const tableBackEl = document.getElementById("tableBack");

function renderTableButton(button) {
    const tableId = button.dataset.table;
    const snapshot = window.TinhTienOrder.getTableSnapshot(tableId);
    const summaryText = snapshot.items
        .map((item) => `${item.count} ${item.name}`)
        .join("<br>");

    button.classList.toggle("is-active-order", snapshot.hasOrder && !snapshot.isPaid);
    button.classList.toggle("is-paid-order", snapshot.isPaid);
    button.innerHTML = `
        <div class="table-left-info">
            <span class="table-name">${tableId}</span>
            <span class="table-total">${snapshot.hasOrder ? window.TinhTienOrder.shortMoney(snapshot.total) : ""}</span>
        </div>
        <div class="table-summary-col">
            <span class="table-summary">${summaryText}</span>
        </div>
        <div class="table-actions">
            <button class="table-action table-pay" type="button" data-pay="${tableId}" ${snapshot.hasOrder && !snapshot.isPaid ? "" : "disabled"}>
                <span class="action-icon">💳</span>
                <span>Trả</span>
            </button>
            <button class="table-action table-finish" type="button" data-finish="${tableId}" ${snapshot.hasOrder ? "" : "disabled"}>
                <span class="action-icon">✅</span>
                <span>Xong</span>
            </button>
        </div>
    `;
}
function adjustAllTableFonts() {
    if (!tableViewEl) return;
    tableViewEl.querySelectorAll("[data-table]").forEach((button) => {
        const leftInfo = button.querySelector(".table-left-info");
        if (!leftInfo) return;
        
        const paddingLeft = parseFloat(window.getComputedStyle(leftInfo).paddingLeft) || 0;
        const paddingRight = parseFloat(window.getComputedStyle(leftInfo).paddingRight) || 0;
        const parentWidth = leftInfo.clientWidth - paddingLeft - paddingRight;
        if (parentWidth <= 0) return;
        
        const nameEl = leftInfo.querySelector(".table-name");
        const totalEl = leftInfo.querySelector(".table-total");
        
        const adjustToFit = (el) => {
            if (!el) return;
            el.style.fontSize = "";
            let fontSize = parseFloat(window.getComputedStyle(el).fontSize);
            if (!fontSize) return;
            
            let iterations = 0;
            while (el.scrollWidth > parentWidth && fontSize > 8 && iterations < 30) {
                fontSize -= 0.5;
                el.style.fontSize = `${fontSize}px`;
                iterations++;
            }
        };
        
        adjustToFit(nameEl);
        adjustToFit(totalEl);
    });
}

function renderTables() {
    tableViewEl.querySelectorAll("[data-table]").forEach(renderTableButton);
    adjustAllTableFonts();
}

function showView(viewId) {
    if (!window.TinhTienAuth || !window.TinhTienAuth.isUnlocked()) {
        if (window.TinhTienAuth) {
            window.TinhTienAuth.lock();
            if (window.TinhTienAuth.promptPassword) {
                window.TinhTienAuth.promptPassword(
                    () => {
                        showView(viewId);
                        if (viewId === "historyView" && window.TinhTienHistory) {
                            window.TinhTienHistory.renderHistory();
                        }
                    }
                );
            }
        }
        return;
    }


    const views = ["tableView", "orderView", "historyView", "settingsView"];
    views.forEach(id => {
        const el = document.getElementById(id);
        if (el) {
            el.classList.toggle("is-hidden", id !== viewId);
        }
    });

    const menuBtns = {
        tableView: "tablesBtn",
        historyView: "historyBtn",
        settingsView: "settingsBtn"
    };
    Object.entries(menuBtns).forEach(([vId, btnId]) => {
        const btn = document.getElementById(btnId);
        if (btn) {
            btn.classList.toggle("is-active", vId === viewId);
        }
    });
}

function showTableView() {
    renderTables();
    showView("tableView");
    adjustAllTableFonts();
}

function showOrderView(tableId) {
    window.TinhTienOrder.setActiveTable(tableId);
    tableBackEl.textContent = `⤶ ${tableId}`;
    showView("orderView");
}

tableViewEl.addEventListener("click", (event) => {
    const payButton = event.target.closest("button[data-pay]");
    if (payButton) {
        window.TinhTienOrder.markTablePaid(payButton.dataset.pay);
        renderTables();
        return;
    }

    const finishButton = event.target.closest("button[data-finish]");
    if (finishButton) {
        window.TinhTienOrder.clearTableOrder(finishButton.dataset.finish);
        renderTables();
        return;
    }

    const tableButton = event.target.closest("[data-table]");
    if (!tableButton) return;
    showOrderView(tableButton.dataset.table);
});

tableViewEl.addEventListener("keydown", (event) => {
    if (event.key !== "Enter" && event.key !== " ") return;
    if (event.target.closest("button[data-pay], button[data-finish]")) return;

    const tableButton = event.target.closest("[data-table]");
    if (!tableButton) return;

    event.preventDefault();
    showOrderView(tableButton.dataset.table);
});

tableBackEl.addEventListener("click", () => {
    window.TinhTienOrder.saveCurrentOrder();
    showTableView();
});



const tablesBtn = document.getElementById("tablesBtn");
if (tablesBtn) {
    tablesBtn.addEventListener("click", showTableView);
}

const orderPayBtn = document.getElementById("orderPayBtn");
const orderFinishBtn = document.getElementById("orderFinishBtn");

if (orderPayBtn) {
    orderPayBtn.addEventListener("click", () => {
        const activeTable = window.TinhTienOrder.getActiveTable ? window.TinhTienOrder.getActiveTable() : null;
        if (activeTable) {
            window.TinhTienOrder.markTablePaid(activeTable);
            showTableView();
        }
    });
}

if (orderFinishBtn) {
    orderFinishBtn.addEventListener("click", () => {
        const activeTable = window.TinhTienOrder.getActiveTable ? window.TinhTienOrder.getActiveTable() : null;
        if (activeTable) {
            window.TinhTienOrder.clearTableOrder(activeTable);
            showTableView();
        }
    });
}

window.TinhTienOrder.initOrder();
window.renderTables = renderTables;
window.showView = showView;
showTableView();

window.addEventListener("resize", () => {
    if (tableViewEl && !tableViewEl.classList.contains("is-hidden")) {
        adjustAllTableFonts();
    }
});
window.addEventListener("orientationchange", () => {
    setTimeout(adjustAllTableFonts, 100);
});
