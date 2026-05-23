(function () {
    const configKeys = {
        firebaseConfig: "fastFoodFirebaseConfig",
        nodePath: "fastFoodFirebaseNodePath"
    };

    function getTodayStr() {
        const now = new Date();
        return now.getFullYear() + '-' + String(now.getMonth() + 1).padStart(2, '0') + '-' + String(now.getDate()).padStart(2, '0');
    }

    window.TinhTienAuth = {
        isUnlocked: function() {
            return localStorage.getItem("fastFoodUnlockDate") === getTodayStr();
        },
        unlock: function() {
            localStorage.setItem("fastFoodUnlockDate", getTodayStr());
            document.documentElement.classList.remove("app-locked");
            document.documentElement.classList.add("app-unlocked");
        },
        lock: function() {
            localStorage.removeItem("fastFoodUnlockDate");
            document.documentElement.classList.remove("app-unlocked");
            document.documentElement.classList.add("app-locked");
        },
        promptPassword: null // Will be assigned in initUI
    };


    // Pre-filled fallback default using the config you shared
    const defaultFirebaseConfig = {
        apiKey: "AIzaSyAqhQosLuAYZ5UHyvtyhWD-Z-gqz9hmRBE",
        authDomain: "appstinhtiennhanh.firebaseapp.com",
        projectId: "appstinhtiennhanh",
        storageBucket: "appstinhtiennhanh.firebasestorage.app",
        messagingSenderId: "254951485113",
        appId: "1:254951485113:web:1ea6511548ff3938c13568",
        measurementId: "G-066SNSCHC3",
        databaseURL: "https://appstinhtiennhanh-default-rtdb.asia-southeast1.firebasedatabase.app"
    };

    let firebaseApp = null;
    let dbRef = null;
    let debounceTimeout = null;
    let isWriting = false;
    let writePending = false;
    let idleCheckInterval = null;
    let lastInteractionTime = 0;
    let localDataPendingUpdate = null;

    // Elements
    let settingsBtn, configInput, pathInput, statusDot, statusText, saveBtn, menuStatusDot;

    function getFirebaseConfigStr() {
        return localStorage.getItem(configKeys.firebaseConfig) || "";
    }

    function saveFirebaseConfig(configStr, nodePath) {
        localStorage.setItem(configKeys.firebaseConfig, configStr.trim());
        localStorage.setItem(configKeys.nodePath, nodePath.trim() || "shopData");
    }

    function parseFirebaseConfig(inputStr) {
        if (!inputStr) return null;
        try {
            return JSON.parse(inputStr);
        } catch (e) {
            const config = {};
            const keys = ["apiKey", "authDomain", "databaseURL", "projectId", "storageBucket", "messagingSenderId", "appId", "measurementId"];
            
            let matchedAny = false;
            keys.forEach(key => {
                const regex = new RegExp(`[\\s"']${key}[\\s"']?:\\s*["']([^"']+)["']`);
                const match = inputStr.match(regex);
                if (match && match[1]) {
                    config[key] = match[1];
                    matchedAny = true;
                }
            });
            
            if (matchedAny && config.apiKey && config.projectId) {
                return config;
            }
            return null;
        }
    }

    function updateStatusUI(type, text) {
        if (statusDot) {
            statusDot.className = "status-dot " + type;
        }
        if (menuStatusDot) {
            menuStatusDot.className = "status-dot menu-status-dot " + type;
        }
        if (statusText) {
            statusText.textContent = text;
        }
    }

    function getLocalDataState() {
        const state = {
            orders: {},
            paid: {},
            history: [],
            calcMode: "auto"
        };
        const tableIds = ["11", "10", "9", "8", "7", "4", "3", "2", "1", "0"];
        tableIds.forEach(id => {
            const orderKey = `fastFoodCalculatorOrder:${id}`;
            const paidKey = `fastFoodCalculatorPaid:${id}`;
            const orderVal = localStorage.getItem(orderKey);
            const paidVal = localStorage.getItem(paidKey);
            if (orderVal) {
                try {
                    const parsed = JSON.parse(orderVal);
                    if (parsed !== null) {
                        state.orders[id] = parsed;
                    }
                } catch(e) {}
            }
            if (paidVal) {
                state.paid[id] = paidVal;
            }
        });

        const historyVal = localStorage.getItem("fastFoodCalculatorHistory");
        if (historyVal) {
            try {
                state.history = JSON.parse(historyVal);
            } catch(e) {}
        }

        const modeVal = localStorage.getItem("fastFoodCalculatorMode");
        if (modeVal) {
            state.calcMode = modeVal;
        }
        return state;
    }

    function setLocalDataState(state) {
        if (!state) return;
        const tableIds = ["11", "10", "9", "8", "7", "4", "3", "2", "1", "0"];
        tableIds.forEach(id => {
            localStorage.removeItem(`fastFoodCalculatorOrder:${id}`);
            localStorage.removeItem(`fastFoodCalculatorPaid:${id}`);
        });

        if (state.orders) {
            Object.entries(state.orders).forEach(([id, val]) => {
                if (val !== null && val !== undefined) {
                    localStorage.setItem(`fastFoodCalculatorOrder:${id}`, JSON.stringify(val));
                }
            });
        }
        if (state.paid) {
            Object.entries(state.paid).forEach(([id, val]) => {
                localStorage.setItem(`fastFoodCalculatorPaid:${id}`, val);
            });
        }
        if (state.history) {
            localStorage.setItem("fastFoodCalculatorHistory", JSON.stringify(state.history));
        } else {
            localStorage.removeItem("fastFoodCalculatorHistory");
        }
        if (state.calcMode) {
            localStorage.setItem("fastFoodCalculatorMode", state.calcMode);
        }
    }

    function refreshAllViews() {
        if (typeof window.renderTables === "function") {
            window.renderTables();
        }
        if (window.TinhTienHistory) {
            if (typeof window.TinhTienHistory.renderHistory === "function") {
                window.TinhTienHistory.renderHistory();
            }
        }
        if (window.TinhTienStats) {
            if (typeof window.TinhTienStats.renderStats === "function") {
                window.TinhTienStats.renderStats();
            }
        }
        // Force update of order view totals if it is currently displayed
        if (typeof window.TinhTienOrder === "object" && typeof window.TinhTienOrder.initOrder === "function") {
            // Re-read storage for active table if open
            const activeTable = window.TinhTienOrder.getActiveTable ? window.TinhTienOrder.getActiveTable() : null;
            if (activeTable) {
                window.TinhTienOrder.setActiveTable(activeTable);
            }
        }
    }

    function mergeStates(local, server) {
        if (!server) return local;
        if (!local) return server;

        const nodePath = localStorage.getItem(configKeys.nodePath) || "shopData";
        const lastSyncKey = `fastFoodCalculatorLastSync:${nodePath}`;
        
        let base = null;
        try {
            const baseStr = localStorage.getItem(lastSyncKey);
            if (baseStr) {
                base = JSON.parse(baseStr);
            }
        } catch (e) {
            console.error("Failed to parse base state", e);
        }
        if (!base) {
            base = { orders: {}, paid: {}, history: [], calcMode: "auto" };
        }

        const activeTable = (typeof window.TinhTienOrder === "object" && typeof window.TinhTienOrder.getActiveTable === "function")
            ? window.TinhTienOrder.getActiveTable()
            : null;

        // 1. Merge orders
        const mergedOrders = {};
        const allOrderIds = new Set([
            ...Object.keys(local.orders || {}),
            ...Object.keys(server.orders || {}),
            ...Object.keys(base.orders || {})
        ]);

        allOrderIds.forEach(id => {
            if (id === activeTable) {
                if (local.orders && local.orders[id]) {
                    mergedOrders[id] = local.orders[id];
                }
                return;
            }

            const localVal = local.orders ? local.orders[id] : undefined;
            // Firebase converts numeric-keyed objects to arrays, returning null for missing slots.
            // Normalize null → undefined so null slots don't count as "server has data".
            const rawServerVal = server.orders ? server.orders[id] : undefined;
            const serverVal = rawServerVal === null ? undefined : rawServerVal;
            const rawBaseVal = base.orders ? base.orders[id] : undefined;
            const baseVal = rawBaseVal === null ? undefined : rawBaseVal;

            if (localVal !== undefined && serverVal !== undefined) {
                if (JSON.stringify(localVal) !== JSON.stringify(baseVal)) {
                    mergedOrders[id] = localVal;
                } else {
                    mergedOrders[id] = serverVal;
                }
            } else if (localVal !== undefined) {
                if (baseVal !== undefined) {
                    // Server deleted it
                } else {
                    // Client added it
                    mergedOrders[id] = localVal;
                }
            } else if (serverVal !== undefined) {
                if (baseVal !== undefined) {
                    // Client deleted it
                } else {
                    // Server added it
                    mergedOrders[id] = serverVal;
                }
            }
        });

        // 2. Merge paid
        const mergedPaid = {};
        const allPaidIds = new Set([
            ...Object.keys(local.paid || {}),
            ...Object.keys(server.paid || {}),
            ...Object.keys(base.paid || {})
        ]);

        allPaidIds.forEach(id => {
            if (id === activeTable) {
                if (local.paid && local.paid[id]) {
                    mergedPaid[id] = local.paid[id];
                }
                return;
            }

            const localVal = local.paid ? local.paid[id] : undefined;
            const serverVal = server.paid ? server.paid[id] : undefined;
            const baseVal = base.paid ? base.paid[id] : undefined;

            if (localVal !== undefined && serverVal !== undefined) {
                if (localVal !== baseVal) {
                    mergedPaid[id] = localVal;
                } else {
                    mergedPaid[id] = serverVal;
                }
            } else if (localVal !== undefined) {
                if (baseVal !== undefined) {
                    // Server deleted it
                } else {
                    // Client added it
                    mergedPaid[id] = localVal;
                }
            } else if (serverVal !== undefined) {
                if (baseVal !== undefined) {
                    // Client deleted it
                } else {
                    // Server added it
                    mergedPaid[id] = serverVal;
                }
            }
        });

        // 3. Merge history
        const mergedHistory = [];
        const localHistoryMap = new Map((local.history || []).map(item => [item.id, item]));
        const serverHistoryMap = new Map((server.history || []).map(item => [item.id, item]));
        const baseHistoryMap = new Map((base.history || []).map(item => [item.id, item]));

        const allHistoryIds = new Set([
            ...localHistoryMap.keys(),
            ...serverHistoryMap.keys(),
            ...baseHistoryMap.keys()
        ]);

        allHistoryIds.forEach(id => {
            const localVal = localHistoryMap.get(id);
            const serverVal = serverHistoryMap.get(id);
            const baseVal = baseHistoryMap.get(id);

            if (localVal !== undefined && serverVal !== undefined) {
                mergedHistory.push(localVal);
            } else if (localVal !== undefined) {
                if (baseVal !== undefined) {
                    // Server deleted it
                } else {
                    // Client added it
                    mergedHistory.push(localVal);
                }
            } else if (serverVal !== undefined) {
                if (baseVal !== undefined) {
                    // Client deleted it
                } else {
                    // Server added it
                    mergedHistory.push(serverVal);
                }
            }
        });
        mergedHistory.sort((a, b) => b.id - a.id);

        // 4. Merge calcMode
        let mergedCalcMode = local.calcMode || "auto";
        const localCalcMode = local.calcMode;
        const serverCalcMode = server.calcMode;
        const baseCalcMode = base.calcMode;
        if (localCalcMode !== baseCalcMode && localCalcMode !== undefined) {
            mergedCalcMode = localCalcMode;
        } else if (serverCalcMode !== baseCalcMode && serverCalcMode !== undefined) {
            mergedCalcMode = serverCalcMode;
        } else {
            mergedCalcMode = localCalcMode || serverCalcMode || "auto";
        }

        return {
            orders: mergedOrders,
            paid: mergedPaid,
            history: mergedHistory,
            calcMode: mergedCalcMode
        };
    }

    function mergePendingServerData() {
        if (!localDataPendingUpdate) return;
        const localData = getLocalDataState();
        const mergedData = mergeStates(localData, localDataPendingUpdate);
        setLocalDataState(mergedData);
        localDataPendingUpdate = null;
    }

    function applyFirebaseData(data) {
        localDataPendingUpdate = null;
        const localData = getLocalDataState();
        const mergedData = mergeStates(localData, data);
        
        const localChanged = JSON.stringify(localData) !== JSON.stringify(mergedData);
        const serverChanged = JSON.stringify(data) !== JSON.stringify(mergedData);

        if (localChanged) {
            setLocalDataState(mergedData);
            refreshAllViews();
        }

        const nodePath = localStorage.getItem(configKeys.nodePath) || "shopData";
        localStorage.setItem(`fastFoodCalculatorLastSync:${nodePath}`, JSON.stringify(mergedData));

        if (serverChanged) {
            pushToFirebase();
        } else {
            updateStatusUI("synced", "Đồng bộ thành công!");
        }
    }

    function handleFirebaseUpdate(snapshot) {
        const data = snapshot.val();
        if (!data) {
            // Database is empty, push local state to initialize it
            updateStatusUI("synced", "Đã kết nối (Firebase trống)");
            const localData = getLocalDataState();
            if (localData && (Object.keys(localData.orders || {}).length > 0 || (localData.history && localData.history.length > 0))) {
                pushToFirebase();
            }
            return;
        }

        if (debounceTimeout || isWriting) {
            return;
        }

        // Delay updating if user is ordering or actively interacting
        if (isOrderViewActive() || (Date.now() - lastInteractionTime < 8000)) {
            localDataPendingUpdate = data;
            updateStatusUI("synced", "Đồng bộ sẵn sàng (Chờ rảnh)");
            return;
        }

        applyFirebaseData(data);
    }

    async function initFirebase(bypassActiveCheck = false) {
        if (dbRef) {
            dbRef.off();
            dbRef = null;
        }

        let configStr = getFirebaseConfigStr();
        const nodePath = localStorage.getItem(configKeys.nodePath) || "shopData";

        let config = null;
        if (configStr) {
            config = parseFirebaseConfig(configStr);
        } else {
            // Use defaults if first load
            config = defaultFirebaseConfig;
            configStr = JSON.stringify(defaultFirebaseConfig, null, 2);
            localStorage.setItem(configKeys.firebaseConfig, configStr);
        }

        if (configInput && !configInput.value) {
            configInput.value = configStr;
        }

        if (!config || !config.apiKey || !config.projectId) {
            updateStatusUI("", "Chưa cấu hình đồng bộ Firebase");
            return;
        }

        // Default to Singapore database region if databaseURL is missing
        if (!config.databaseURL) {
            config.databaseURL = `https://${config.projectId}-default-rtdb.asia-southeast1.firebasedatabase.app`;
        }

        return new Promise((resolve) => {
            const timeoutId = setTimeout(() => {
                console.warn("Firebase first load timed out");
                resolve();
            }, 4500);

            try {
                if (typeof firebase === "undefined") {
                    throw new Error("Không thể tải thư viện Firebase. Kiểm tra kết nối mạng.");
                }
                
                if (firebase.apps.length === 0) {
                    firebaseApp = firebase.initializeApp(config);
                } else {
                    firebaseApp = firebase.app();
                }

                updateStatusUI("syncing", "Đang kết nối Firebase...");
                dbRef = firebase.database().ref(nodePath);

                let isFirstLoad = true;
                dbRef.on("value", (snapshot) => {
                    if (isFirstLoad) {
                        isFirstLoad = false;
                        clearTimeout(timeoutId);
                        const data = snapshot.val();
                        
                        // Check if user has active order or has interacted to avoid disrupting them on load
                        const isUserActive = isOrderViewActive() || lastInteractionTime > 0;
                        
                        if (data) {
                            if (isUserActive && !bypassActiveCheck) {
                                // If user is active and we shouldn't bypass, queue it
                                localDataPendingUpdate = data;
                                updateStatusUI("synced", "Đồng bộ sẵn sàng (Chờ rảnh)");
                            } else {
                                // Otherwise apply immediately
                                applyFirebaseData(data);
                            }
                        } else {
                            updateStatusUI("synced", "Đã kết nối (Firebase trống)");
                            const localData = getLocalDataState();
                            if (localData && (Object.keys(localData.orders || {}).length > 0 || (localData.history && localData.history.length > 0))) {
                                pushToFirebase();
                            }
                        }
                        resolve();
                    } else {
                        handleFirebaseUpdate(snapshot);
                    }
                }, (error) => {
                    console.error("Firebase connection error:", error);
                    updateStatusUI("error", `Lỗi kết nối: ${error.message}`);
                    clearTimeout(timeoutId);
                    resolve();
                });
            } catch (e) {
                console.error("Firebase initialization failed:", e);
                updateStatusUI("error", `Lỗi khởi tạo: ${e.message}`);
                clearTimeout(timeoutId);
                resolve();
            }
        });
    }

    async function pullFromFirebase() {
        if (!dbRef) return getLocalDataState();
        try {
            const snapshot = await dbRef.once("value");
            const data = snapshot.val();
            if (data) {
                applyFirebaseData(data);
                return data;
            }
        } catch (e) {
            console.error("Firebase manual pull failed:", e);
        }
        return getLocalDataState();
    }

    async function pushToFirebase() {
        if (!dbRef) return;
        if (isWriting) {
            writePending = true;
            return;
        }
        isWriting = true;
        writePending = false;

        updateStatusUI("syncing", "Đang tự động lưu...");
        
        // Merge any pending server data before reading the local state to push
        mergePendingServerData();

        const localData = getLocalDataState();
        try {
            await dbRef.set(localData);
            updateStatusUI("synced", "Đã lưu lên đám mây!");
            const nodePath = localStorage.getItem(configKeys.nodePath) || "shopData";
            localStorage.setItem(`fastFoodCalculatorLastSync:${nodePath}`, JSON.stringify(localData));
        } catch (e) {
            console.error("Firebase push failed:", e);
            updateStatusUI("error", `Lỗi lưu dữ liệu: ${e.message}`);
        } finally {
            isWriting = false;
            if (writePending) {
                pushToFirebase();
            }
        }
    }

    async function flushPendingPush() {
        if (debounceTimeout) {
            clearTimeout(debounceTimeout);
            debounceTimeout = null;
            await pushToFirebase();
        }
    }

    function isOrderViewActive() {
        const orderView = document.getElementById("orderView");
        return orderView && !orderView.classList.contains("is-hidden");
    }

    function recordInteraction() {
        lastInteractionTime = Date.now();
    }

    function startIdleCheck() {
        stopIdleCheck();
        idleCheckInterval = setInterval(() => {
            // Check if day changed and we need to lock the app
            if (!window.TinhTienAuth.isUnlocked()) {
                window.TinhTienAuth.lock();
                const passwordModal = document.getElementById("passwordModal");
                const isModalHidden = !passwordModal || passwordModal.classList.contains("is-hidden");
                if (window.TinhTienAuth.promptPassword && isModalHidden) {
                    window.TinhTienAuth.promptPassword(() => {
                        refreshAllViews();
                    });
                }
            }
            // Apply pending update if user is idle and not on order screen
            if (localDataPendingUpdate && !isOrderViewActive() && (Date.now() - lastInteractionTime >= 8000)) {
                applyFirebaseData(localDataPendingUpdate);
            }
        }, 2000);
    }

    function stopIdleCheck() {
        if (idleCheckInterval) {
            clearInterval(idleCheckInterval);
            idleCheckInterval = null;
        }
    }

    function syncToCloud() {
        updateStatusUI("syncing", "Có thay đổi mới, chuẩn bị lưu...");
        if (debounceTimeout) clearTimeout(debounceTimeout);
        debounceTimeout = setTimeout(() => {
            debounceTimeout = null;
            pushToFirebase();
        }, 1500);
    }

    // Stamps the current order for tableId into lastSync (base state) BEFORE it is
    // deleted locally. This ensures the 3-way merge later sees:
    //   local=undefined, server=oldOrder, base=oldOrder  →  "Client deleted it"  (correct)
    // instead of:
    //   local=undefined, server=oldOrder, base=undefined  →  "Server added it"  (restores order = bug)
    function markOrderDeleted(tableId) {
        const nodePath = localStorage.getItem(configKeys.nodePath) || "shopData";
        const lastSyncKey = `fastFoodCalculatorLastSync:${nodePath}`;
        try {
            let base = { orders: {}, paid: {}, history: [], calcMode: "auto" };
            const baseStr = localStorage.getItem(lastSyncKey);
            if (baseStr) { base = JSON.parse(baseStr) || base; }
            if (!base.orders) base.orders = {};

            const orderStr = localStorage.getItem(`fastFoodCalculatorOrder:${tableId}`);
            if (orderStr) {
                const parsed = JSON.parse(orderStr);
                if (parsed !== null) {
                    base.orders[tableId] = parsed;
                    localStorage.setItem(lastSyncKey, JSON.stringify(base));
                }
            }
        } catch (e) {
            console.error("markOrderDeleted failed:", e);
        }
    }

    function initUI() {
        settingsBtn = document.getElementById("settingsBtn");
        configInput = document.getElementById("fbConfig");
        pathInput = document.getElementById("fbPath");
        statusDot = document.querySelector(".settings-status .status-dot");
        statusText = document.querySelector(".status-text");
        menuStatusDot = document.querySelector(".menu-status-dot");
        saveBtn = document.getElementById("settingsSaveBtn");

        // Load config into inputs
        const configStr = getFirebaseConfigStr();
        if (configInput) {
            configInput.value = configStr || JSON.stringify(defaultFirebaseConfig, null, 2);
        }
        if (pathInput) {
            pathInput.value = localStorage.getItem(configKeys.nodePath) || "shopData";
        }

        const passwordModal = document.getElementById("passwordModal");
        const adminPasswordInput = document.getElementById("adminPasswordInput");
        const pwErrorMsg = document.getElementById("pwErrorMsg");
        const cancelPasswordBtn = document.getElementById("cancelPasswordBtn");
        const submitPasswordBtn = document.getElementById("submitPasswordBtn");

        let currentAuthSuccess = null;
        let currentAuthCancel = null;

        window.TinhTienAuth.promptPassword = function(onSuccess, onCancel) {
            currentAuthSuccess = onSuccess;
            currentAuthCancel = onCancel;
            if (adminPasswordInput) adminPasswordInput.value = "";
            if (pwErrorMsg) pwErrorMsg.classList.add("is-hidden");
            if (passwordModal) passwordModal.classList.remove("is-hidden");
            setTimeout(() => {
                if (adminPasswordInput) adminPasswordInput.focus();
            }, 100);
        };

        if (settingsBtn) {
            settingsBtn.addEventListener("click", () => {
                if (typeof window.showView === "function") {
                    window.showView("settingsView");
                }
            });
        }

        if (cancelPasswordBtn && passwordModal) {
            cancelPasswordBtn.addEventListener("click", () => {
                passwordModal.classList.add("is-hidden");
                if (typeof currentAuthCancel === "function") {
                    currentAuthCancel();
                }
            });
        }

        function verifyAdminPassword() {
            if (!adminPasswordInput || !passwordModal) return;
            if (adminPasswordInput.value === "699002") {
                window.TinhTienAuth.unlock(); // Cập nhật thời gian mở khóa thành công
                passwordModal.classList.add("is-hidden");
                if (typeof currentAuthSuccess === "function") {
                    currentAuthSuccess();
                }
            } else {
                if (pwErrorMsg) pwErrorMsg.classList.remove("is-hidden");
                adminPasswordInput.value = "";
                adminPasswordInput.focus();
            }
        }

        if (submitPasswordBtn) {
            submitPasswordBtn.addEventListener("click", verifyAdminPassword);
        }

        if (adminPasswordInput) {
            adminPasswordInput.addEventListener("input", () => {
                // Ẩn thông báo lỗi ngay khi bắt đầu gõ lại
                if (pwErrorMsg) pwErrorMsg.classList.add("is-hidden");

                // Chỉ cho phép nhập số
                adminPasswordInput.value = adminPasswordInput.value.replace(/[^0-9]/g, "");
                
                // Tự động kiểm tra khi đủ 6 ký tự
                if (adminPasswordInput.value.length === 6) {
                    verifyAdminPassword();
                }
            });

            adminPasswordInput.addEventListener("keydown", (e) => {
                if (e.key === "Enter") {
                    verifyAdminPassword();
                }
            });
        }

        if (saveBtn) {
            saveBtn.addEventListener("click", async () => {
                const configVal = configInput.value;
                const pathVal = pathInput.value;
                
                const parsed = parseFirebaseConfig(configVal);
                if (!parsed) {
                    alert("Cấu hình Firebase không hợp lệ! Vui lòng kiểm tra lại định dạng.");
                    return;
                }

                saveFirebaseConfig(configVal, pathVal);
                updateStatusUI("syncing", "Đang kết nối lại Firebase...");
                await initFirebase(true);
                alert("Đã lưu cấu hình Firebase thành công!");
            });
        }

        const lockBtn = document.getElementById("settingsLockBtn");
        if (lockBtn) {
            lockBtn.addEventListener("click", () => {
                window.TinhTienAuth.lock();
                if (window.TinhTienAuth.promptPassword) {
                    window.TinhTienAuth.promptPassword(
                        () => {
                            if (typeof window.showView === "function") {
                                window.showView("settingsView");
                            }
                        }
                    );
                }
            });
        }
    }

    // Export interface under TinhTienGitHub to maintain backwards compatibility with existing order/table scripts
    window.TinhTienGitHub = {
        syncToCloud,
        pullFromGitHub: pullFromFirebase,
        startPolling: startIdleCheck,
        stopPolling: stopIdleCheck,
        markOrderDeleted
    };

    function init() {
        initUI();
        initFirebase().then(() => {
            if (document.visibilityState === "visible") {
                startIdleCheck();
            }
        });

        document.addEventListener("pointerdown", recordInteraction, { passive: true });
        document.addEventListener("keydown", recordInteraction, { passive: true });
        document.addEventListener("scroll", recordInteraction, { capture: true, passive: true });

        // Prompt password on load if locked
        if (!window.TinhTienAuth.isUnlocked()) {
            window.TinhTienAuth.lock();
            if (window.TinhTienAuth.promptPassword) {
                window.TinhTienAuth.promptPassword(() => {
                    if (typeof window.showView === "function") {
                        window.showView("tableView");
                    }
                });
            }
        }
    }

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", init);
    } else {
        init();
    }

    document.addEventListener("visibilitychange", () => {
        if (document.visibilityState === "hidden") {
            stopIdleCheck();
            flushPendingPush();
        } else if (document.visibilityState === "visible") {
            if (!debounceTimeout && !isWriting && !isOrderViewActive()) {
                pullFromFirebase().then(() => {
                    startIdleCheck();
                });
            } else {
                startIdleCheck();
            }
        }
    });

    window.addEventListener("pagehide", () => {
        stopIdleCheck();
        flushPendingPush();
    });

    window.addEventListener("beforeunload", (event) => {
        if (debounceTimeout !== null || isWriting) {
            event.preventDefault();
            event.returnValue = "Dữ liệu đang được đồng bộ lên đám mây. Bạn có chắc chắn muốn rời đi?";
            return event.returnValue;
        }
    });
})();
