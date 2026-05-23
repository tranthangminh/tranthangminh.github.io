(function () {
    const historyViewEl = document.getElementById("historyView");
    const historyListEl = document.getElementById("historyList");
    const historyBtn = document.getElementById("historyBtn");
    const historyClearBtn = document.getElementById("historyClear");
    
    // Filter controls
    const filterCalendarBtn = document.getElementById("filterCalendarBtn");
    const filterDayBtn = document.getElementById("filterDayBtn");
    const filterWeekBtn = document.getElementById("filterWeekBtn");
    const filterMonthBtn = document.getElementById("filterMonthBtn");

    const customCalendarPopover = document.getElementById("customCalendarPopover");
    const calMonthYear = document.getElementById("calMonthYear");
    const calendarDaysGrid = document.getElementById("calendarDaysGrid");
    const calPrevMonth = document.getElementById("calPrevMonth");
    const calNextMonth = document.getElementById("calNextMonth");
    const calTodayBtn = document.getElementById("calTodayBtn");
    
    const collapsedDates = new Set();

    let currentCalMonth = new Date().getMonth();
    let currentCalYear = new Date().getFullYear();
    let selectedFilterDate = ""; // Format: "DD/MM/YYYY" or ""
    let activeFilterMode = "day"; // Modes: "day", "week", "month", "custom"

    function parseDateString(str) {
        if (!str) return new Date();
        const parts = str.split("/");
        if (parts.length === 3) {
            return new Date(parts[2], parts[1] - 1, parts[0]);
        }
        return new Date();
    }

    function isDateInCurrentWeek(dateStr) {
        const parts = dateStr.split("/");
        if (parts.length !== 3) return false;
        const itemDate = new Date(parts[2], parts[1] - 1, parts[0]);
        
        const now = new Date();
        now.setHours(0, 0, 0, 0);
        itemDate.setHours(0, 0, 0, 0);
        
        const currentDay = now.getDay();
        
        // Calculate Monday of this week
        const monday = new Date(now);
        const daysToMonday = currentDay === 0 ? -6 : 1 - currentDay;
        monday.setDate(now.getDate() + daysToMonday);
        
        // Calculate Sunday of this week
        const sunday = new Date(monday);
        sunday.setDate(monday.getDate() + 6);
        
        return itemDate >= monday && itemDate <= sunday;
    }

    function isDateInCurrentMonth(dateStr) {
        const parts = dateStr.split("/");
        if (parts.length !== 3) return false;
        const now = new Date();
        const itemMonth = parseInt(parts[1], 10) - 1;
        const itemYear = parseInt(parts[2], 10);
        return itemMonth === now.getMonth() && itemYear === now.getFullYear();
    }

    function updateFilterButtonsUI() {
        if (!filterCalendarBtn || !filterDayBtn || !filterWeekBtn || !filterMonthBtn) return;

        filterCalendarBtn.classList.remove("is-active");
        filterDayBtn.classList.remove("is-active");
        filterWeekBtn.classList.remove("is-active");
        filterMonthBtn.classList.remove("is-active");

        const btnTextSpan = filterCalendarBtn.querySelector(".filter-btn-text");

        if (activeFilterMode === "day") {
            filterDayBtn.classList.add("is-active");
            if (btnTextSpan) btnTextSpan.textContent = "📅 Lịch";
        } else if (activeFilterMode === "week") {
            filterWeekBtn.classList.add("is-active");
            if (btnTextSpan) btnTextSpan.textContent = "📅 Lịch";
        } else if (activeFilterMode === "month") {
            filterMonthBtn.classList.add("is-active");
            if (btnTextSpan) btnTextSpan.textContent = "📅 Lịch";
        } else if (activeFilterMode === "custom") {
            filterCalendarBtn.classList.add("is-active");
            if (selectedFilterDate) {
                const parts = selectedFilterDate.split("/");
                const displayDate = parts.length >= 2 ? `${parts[0]}/${parts[1]}` : selectedFilterDate;
                if (btnTextSpan) btnTextSpan.textContent = `📅 ${displayDate}`;
            } else {
                if (btnTextSpan) btnTextSpan.textContent = "📅 Lịch";
            }
        }
    }

    function renderHistoryStats(filteredHistory) {
        const statsRevenueVal = document.getElementById("statsRevenueVal");
        const statsOrdersVal = document.getElementById("statsOrdersVal");
        const statsProductsTags = document.getElementById("statsProductsTags");
        if (!statsRevenueVal || !statsProductsTags) return;

        const totalRevenue = filteredHistory.reduce((sum, item) => sum + item.total, 0);
        statsRevenueVal.textContent = window.TinhTienOrder.shortMoney(totalRevenue);
        if (statsOrdersVal) {
            statsOrdersVal.textContent = filteredHistory.length;
        }

        const productCounts = {};
        filteredHistory.forEach((item) => {
            if (item.summary) {
                const pieces = item.summary.split(",");
                pieces.forEach((piece) => {
                    const match = piece.trim().match(/^(\d+)\s+(.+)$/);
                    if (match) {
                        const count = parseInt(match[1], 10);
                        const name = match[2].trim();
                        productCounts[name] = (productCounts[name] || 0) + count;
                    }
                });
            }
        });

        const sortedProducts = Object.entries(productCounts)
            .sort((a, b) => b[1] - a[1]);

        statsProductsTags.innerHTML = "";
        if (sortedProducts.length === 0) {
            const emptySpan = document.createElement("span");
            emptySpan.className = "stats-no-products";
            emptySpan.textContent = "Chưa bán được món nào";
            statsProductsTags.appendChild(emptySpan);
        } else {
            sortedProducts.forEach(([name, count]) => {
                const price = typeof window.TinhTienOrder.getProductPrice === "function"
                    ? window.TinhTienOrder.getProductPrice(name)
                    : 0;
                const revenue = count * price;
                const tagEl = document.createElement("div");
                tagEl.className = "stats-product-tag";
                const shortRev = window.TinhTienOrder.shortMoney(revenue);
                tagEl.innerHTML = `<span class="tag-count">${count}x</span> <span class="tag-name">${name}</span> <span class="tag-divider">-</span> <strong class="tag-total">${shortRev}</strong>`;
                statsProductsTags.appendChild(tagEl);
            });
        }
    }

    function renderHistory() {
        if (!historyListEl) return;
        historyListEl.innerHTML = "";
        const fullHistory = window.TinhTienOrder.getHistory();
        
        if (fullHistory.length === 0) {
            const emptyEl = document.createElement("div");
            emptyEl.className = "history-empty";
            emptyEl.textContent = "Chưa có giao dịch nào";
            historyListEl.appendChild(emptyEl);
            if (historyClearBtn) {
                historyClearBtn.classList.remove("is-expanded");
                historyClearBtn.style.display = "none";
            }
            if (historyViewEl) {
                historyViewEl.classList.remove("delete-mode-active");
            }
            updateFilterButtonsUI();
            renderHistoryStats([]);
            return;
        } else {
            if (historyClearBtn) {
                historyClearBtn.style.display = "";
            }
        }

        // Apply filters based on mode
        let history = fullHistory;
        
        if (activeFilterMode === "day") {
            const now = new Date();
            const todayStr = `${String(now.getDate()).padStart(2, '0')}/${String(now.getMonth() + 1).padStart(2, '0')}/${now.getFullYear()}`;
            history = fullHistory.filter(item => item.date === todayStr);
        } else if (activeFilterMode === "week") {
            history = fullHistory.filter(item => isDateInCurrentWeek(item.date));
        } else if (activeFilterMode === "month") {
            history = fullHistory.filter(item => isDateInCurrentMonth(item.date));
        } else if (activeFilterMode === "custom") {
            if (selectedFilterDate) {
                history = fullHistory.filter(item => item.date === selectedFilterDate);
            }
        }

        updateFilterButtonsUI();
        renderHistoryStats(history);

        if (history.length === 0) {
            const emptyEl = document.createElement("div");
            emptyEl.className = "history-empty";
            let emptyMsg = "Chưa có giao dịch nào";
            if (activeFilterMode === "day") {
                emptyMsg = "Không có giao dịch nào trong hôm nay";
            } else if (activeFilterMode === "week") {
                emptyMsg = "Không có giao dịch nào trong tuần này";
            } else if (activeFilterMode === "month") {
                emptyMsg = "Không có giao dịch nào trong tháng này";
            } else if (activeFilterMode === "custom" && selectedFilterDate) {
                emptyMsg = `Không có giao dịch nào trong ngày ${selectedFilterDate}`;
            }
            emptyEl.textContent = emptyMsg;
            historyListEl.appendChild(emptyEl);
            return;
        }

        const now = new Date();
        const todayStr = `${String(now.getDate()).padStart(2, '0')}/${String(now.getMonth() + 1).padStart(2, '0')}/${now.getFullYear()}`;

        const yesterday = new Date();
        yesterday.setDate(now.getDate() - 1);
        const yesterdayStr = `${String(yesterday.getDate()).padStart(2, '0')}/${String(yesterday.getMonth() + 1).padStart(2, '0')}/${yesterday.getFullYear()}`;

        function getFriendlyDateHeader(dateStr) {
            if (!dateStr) return "Không rõ ngày";
            if (dateStr === todayStr) {
                return `Hôm nay (${dateStr})`;
            } else if (dateStr === yesterdayStr) {
                return `Hôm qua (${dateStr})`;
            } else {
                return `Ngày ${dateStr}`;
            }
        }

        const uniqueDates = [];
        const groups = {};
        history.forEach((item) => {
            const d = item.date || "Không rõ ngày";
            if (!groups[d]) {
                groups[d] = [];
                uniqueDates.push(d);
            }
            groups[d].push(item);
        });

        uniqueDates.forEach((dateVal) => {
            const isCollapsed = collapsedDates.has(dateVal);
            const items = groups[dateVal];
            const totalCount = items.length;

            // Render Date Header
            const dayRevenue = items.reduce((sum, item) => sum + item.total, 0);
            const header = document.createElement("div");
            header.className = `history-date-header ${isCollapsed ? "is-collapsed" : ""}`;
            header.dataset.date = dateVal;
            header.innerHTML = `
                <div class="history-date-header-left">
                    <span class="history-date-arrow">▼</span>
                    <span>📅 ${getFriendlyDateHeader(dateVal)} <span class="history-header-dot"></span></span>
                </div>
                <span class="history-date-revenue">${window.TinhTienOrder.shortMoney(dayRevenue)}</span>
            `;
            historyListEl.appendChild(header);

            // Render Cards in group
            items.forEach((item, index) => {
                const seq = totalCount - index;
                const card = document.createElement("div");
                card.className = "history-card";
                if (isCollapsed) {
                    card.classList.add("is-collapsed-item");
                }
                card.innerHTML = `
                    <div class="history-card-left">
                        <div class="history-table-badge-wrapper">
                            <div class="history-table-badge">${item.tableId}</div>
                            <span class="history-order-seq">#${seq}</span>
                        </div>
                        <div class="history-info-col">
                            <div class="history-total">${window.TinhTienOrder.shortMoney(item.total)}</div>
                            <div class="history-datetime">
                                <span class="history-time">${item.createdTime ? `${item.createdTime} → ${item.time}` : item.time}</span>
                                <span class="history-date">${item.date}</span>
                            </div>
                        </div>
                    </div>
                    <div class="history-card-middle">
                        <div class="history-summary" title="${item.summary || ""}">${item.summary || ""}</div>
                    </div>
                    <div class="history-card-right">
                        <button class="history-card-delete" data-id="${item.id}" aria-label="Xóa giao dịch">🗑️</button>
                    </div>
                `;
                historyListEl.appendChild(card);
            });
        });
    }

    function showHistoryView() {
        if (typeof window.showView === "function") {
            window.showView("historyView");
            renderHistory();
        }
    }

    if (historyBtn) {
        historyBtn.addEventListener("click", showHistoryView);
    }

    if (historyClearBtn) {
        historyClearBtn.addEventListener("click", (event) => {
            event.stopPropagation();
            
            if (!historyClearBtn.classList.contains("is-expanded")) {
                historyClearBtn.classList.add("is-expanded");
                historyViewEl.classList.add("delete-mode-active");
            } else {
                const confirmed = confirm("Bạn có chắc muốn xóa toàn bộ lịch sử giao dịch?");
                if (confirmed) {
                    window.TinhTienOrder.clearHistory();
                    historyClearBtn.classList.remove("is-expanded");
                    historyViewEl.classList.remove("delete-mode-active");
                    renderHistory();
                }
            }
        });
    }

    document.addEventListener("click", (event) => {
        if (historyClearBtn && !historyClearBtn.contains(event.target)) {
            if (event.target.closest(".history-card-delete")) {
                return;
            }
            historyClearBtn.classList.remove("is-expanded");
            historyViewEl.classList.remove("delete-mode-active");
        }
    });

    if (historyListEl) {
        historyListEl.addEventListener("click", (event) => {
            const deleteBtn = event.target.closest(".history-card-delete");
            if (deleteBtn) {
                const id = Number(deleteBtn.dataset.id);
                window.TinhTienOrder.deleteHistoryItem(id);
                renderHistory();
                return;
            }

            const dateHeader = event.target.closest(".history-date-header");
            if (dateHeader) {
                const dateVal = dateHeader.dataset.date;
                if (collapsedDates.has(dateVal)) {
                    collapsedDates.delete(dateVal);
                } else {
                    collapsedDates.add(dateVal);
                }
                renderHistory();
            }
        });
    }

    function renderCalendar() {
        if (!calendarDaysGrid || !calMonthYear) return;
        calendarDaysGrid.innerHTML = "";

        const monthNames = ["01", "02", "03", "04", "05", "06", "07", "08", "09", "10", "11", "12"];
        calMonthYear.textContent = `Tháng ${monthNames[currentCalMonth]}/${currentCalYear}`;

        let firstDay = new Date(currentCalYear, currentCalMonth, 1).getDay();
        const startOffset = firstDay === 0 ? 6 : firstDay - 1;

        const totalDays = new Date(currentCalYear, currentCalMonth + 1, 0).getDate();

        const fullHistory = window.TinhTienOrder.getHistory();
        const activeDates = new Set(fullHistory.map(item => item.date));

        for (let i = 0; i < startOffset; i++) {
            const cell = document.createElement("div");
            cell.className = "cal-day-cell empty-cell";
            calendarDaysGrid.appendChild(cell);
        }

        for (let day = 1; day <= totalDays; day++) {
            const cell = document.createElement("div");
            cell.className = "cal-day-cell";
            
            const cellDateStr = `${String(day).padStart(2, '0')}/${String(currentCalMonth + 1).padStart(2, '0')}/${currentCalYear}`;
            cell.dataset.date = cellDateStr;
            
            const dayNumSpan = document.createElement("span");
            dayNumSpan.textContent = day;
            cell.appendChild(dayNumSpan);

            if (cellDateStr === selectedFilterDate && activeFilterMode === "custom") {
                cell.classList.add("selected-day");
            }

            if (activeDates.has(cellDateStr)) {
                const dot = document.createElement("span");
                dot.className = "cal-day-dot";
                cell.appendChild(dot);
            }

            cell.addEventListener("click", (e) => {
                e.stopPropagation();
                selectedFilterDate = cellDateStr;
                activeFilterMode = "custom";
                collapsedDates.clear();
                if (customCalendarPopover) {
                    customCalendarPopover.classList.add("is-hidden");
                }
                renderCalendar();
                renderHistory();
            });

            calendarDaysGrid.appendChild(cell);
        }
    }

    if (filterCalendarBtn) {
        filterCalendarBtn.addEventListener("click", (e) => {
            e.stopPropagation();
            if (customCalendarPopover) {
                const isHidden = customCalendarPopover.classList.contains("is-hidden");
                if (isHidden) {
                    const baseDate = selectedFilterDate ? parseDateString(selectedFilterDate) : new Date();
                    currentCalMonth = baseDate.getMonth();
                    currentCalYear = baseDate.getFullYear();
                    renderCalendar();
                    customCalendarPopover.classList.remove("is-hidden");
                } else {
                    customCalendarPopover.classList.add("is-hidden");
                }
            }
        });
    }

    if (filterDayBtn) {
        filterDayBtn.addEventListener("click", () => {
            activeFilterMode = "day";
            collapsedDates.clear();
            renderCalendar();
            renderHistory();
        });
    }

    if (filterWeekBtn) {
        filterWeekBtn.addEventListener("click", () => {
            activeFilterMode = "week";
            collapsedDates.clear();
            const fullHistory = window.TinhTienOrder.getHistory();
            fullHistory.filter(item => isDateInCurrentWeek(item.date)).forEach(item => {
                if (item.date) collapsedDates.add(item.date);
            });
            renderCalendar();
            renderHistory();
        });
    }

    if (filterMonthBtn) {
        filterMonthBtn.addEventListener("click", () => {
            activeFilterMode = "month";
            collapsedDates.clear();
            const fullHistory = window.TinhTienOrder.getHistory();
            fullHistory.filter(item => isDateInCurrentMonth(item.date)).forEach(item => {
                if (item.date) collapsedDates.add(item.date);
            });
            renderCalendar();
            renderHistory();
        });
    }

    if (calPrevMonth) {
        calPrevMonth.addEventListener("click", (e) => {
            e.stopPropagation();
            currentCalMonth--;
            if (currentCalMonth < 0) {
                currentCalMonth = 11;
                currentCalYear--;
            }
            renderCalendar();
        });
    }

    if (calNextMonth) {
        calNextMonth.addEventListener("click", (e) => {
            e.stopPropagation();
            currentCalMonth++;
            if (currentCalMonth > 11) {
                currentCalMonth = 0;
                currentCalYear++;
            }
            renderCalendar();
        });
    }

    if (calTodayBtn) {
        calTodayBtn.addEventListener("click", (e) => {
            e.stopPropagation();
            const now = new Date();
            currentCalMonth = now.getMonth();
            currentCalYear = now.getFullYear();
            const todayStr = `${String(now.getDate()).padStart(2, '0')}/${String(now.getMonth() + 1).padStart(2, '0')}/${now.getFullYear()}`;
            selectedFilterDate = todayStr;
            activeFilterMode = "custom";
            collapsedDates.clear();
            if (customCalendarPopover) {
                customCalendarPopover.classList.add("is-hidden");
            }
            renderCalendar();
            renderHistory();
        });
    }

    // Click outside popover to close it
    document.addEventListener("click", (e) => {
        if (customCalendarPopover && !customCalendarPopover.classList.contains("is-hidden")) {
            const insideToggle = filterCalendarBtn && filterCalendarBtn.contains(e.target);
            const insidePopover = customCalendarPopover.contains(e.target);
            if (!insideToggle && !insidePopover) {
                customCalendarPopover.classList.add("is-hidden");
            }
        }
    });

    window.TinhTienHistory = {
        renderHistory
    };
})();
