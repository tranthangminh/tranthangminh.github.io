/**
 * Universal Shared Single Sign-On (SSO) & Cloud Sync Engine for Web Apps
 * tranthangminh.github.io/products/web-apps/
 *
 * Isolated from other legacy apps by using dedicated named Firebase App: 'sharedWebApps'
 */

(function () {
    const STORAGE_KEY_CONFIG = 'max_webapps_firebase_config';
    const GOOGLE_ICON_SVG = `
        <svg class="google-icon-svg" viewBox="0 0 24 24">
            <path fill="#4285F4" d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.66-5.17 3.66-9.17z"/>
            <path fill="#34A853" d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.33 24 12 24z"/>
            <path fill="#FBBC05" d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.14-1.55.38-2.27V6.58H1.25C.45 8.16 0 9.97 0 12s.45 3.84 1.25 5.42l4.03-3.15z"/>
            <path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.33 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98z"/>
        </svg>
    `;

    class SharedAuthEngine {
        constructor() {
            this.appId = 'webapp';
            this.mountSelector = null;
            this.currentUser = null;
            this.firebaseApp = null;
            this.auth = null;
            this.database = null;

            this.onUserChangeCallback = null;
            this.onDataLoadedCallback = null;

            this.saveDebounceTimer = null;
            this.broadcastChannel = null;

            if ('BroadcastChannel' in window) {
                this.broadcastChannel = new BroadcastChannel('max_webapps_auth_channel');
                this.broadcastChannel.onmessage = (event) => this.handleBroadcastMessage(event);
            }
        }

        /**
         * Initialize the shared authentication for a specific web app
         * @param {Object} options
         * @param {string} options.appId - Unique identifier of the app (e.g. 'lucky_wheel')
         * @param {string} options.mountTo - CSS selector for UI mounting slot
         * @param {Function} [options.onUserChange] - Callback when user logs in/out
         * @param {Function} [options.onDataLoaded] - Callback when cloud settings are loaded
         */
        init(options = {}) {
            this.appId = options.appId || 'webapp';
            this.mountSelector = options.mountTo || null;
            this.onUserChangeCallback = options.onUserChange || null;
            this.onDataLoadedCallback = options.onDataLoaded || null;

            this.initFirebase();
            this.renderUI();
            this.injectModal();

            window.addEventListener('app-lang-changed', () => {
                this.renderUI();
            });
        }

        /**
         * Retrieve config from localStorage or window.SHARED_AUTH_CONFIG
         */
        getConfig() {
            try {
                const stored = localStorage.getItem(STORAGE_KEY_CONFIG);
                if (stored) {
                    const parsed = JSON.parse(stored);
                    if (parsed.apiKey && parsed.projectId) return parsed;
                }
            } catch (e) {
                console.warn('Invalid stored Firebase config', e);
            }

            if (window.SHARED_AUTH_CONFIG && window.SHARED_AUTH_CONFIG.apiKey && window.SHARED_AUTH_CONFIG.projectId) {
                return window.SHARED_AUTH_CONFIG;
            }

            return null;
        }

        /**
         * Initialize isolated Firebase instance ('sharedWebApps')
         */
        initFirebase() {
            const config = this.getConfig();
            if (!config) {
                console.log('[SharedAuth] No Firebase configuration found. Ready for setup.');
                return;
            }

            if (typeof firebase === 'undefined') {
                console.warn('[SharedAuth] Firebase SDK scripts not loaded on page.');
                return;
            }

            try {
                // Use isolated named app 'sharedWebApps' to prevent collision with legacy apps
                const appName = 'sharedWebApps';
                const existing = firebase.apps.find(a => a.name === appName);
                this.firebaseApp = existing || firebase.initializeApp(config, appName);
                this.auth = this.firebaseApp.auth();
                this.database = this.firebaseApp.database();

                // Set persistence to LOCAL (shared across same-origin tabs and sessions)
                this.auth.setPersistence(firebase.auth.Auth.Persistence.LOCAL).catch(() => {});

                // Listen for Auth changes
                this.auth.onAuthStateChanged((user) => {
                    this.currentUser = user;
                    this.renderUI();

                    if (user) {
                        this.updateUserProfileInDb(user);
                        this.loadData();
                    }

                    if (this.onUserChangeCallback) {
                        this.onUserChangeCallback(user);
                    }
                });
            } catch (e) {
                console.error('[SharedAuth] Firebase init error:', e);
            }
        }

        /**
         * Sign in with Google Popup
         */
        async signIn() {
            if (!this.auth) {
                this.openConfigModal();
                return;
            }

            try {
                const provider = new firebase.auth.GoogleAuthProvider();
                provider.setCustomParameters({ prompt: 'select_account' });
                const result = await this.auth.signInWithPopup(provider);
                this.currentUser = result.user;

                // Notify other tabs
                if (this.broadcastChannel) {
                    this.broadcastChannel.postMessage({ type: 'USER_LOGIN', uid: result.user.uid });
                }
            } catch (error) {
                console.error('[SharedAuth] Sign-in error:', error);
                if (error.code === 'auth/popup-blocked') {
                    alert('Sign-in popup was blocked by your browser. Please allow popups for this site.');
                } else if (error.code === 'auth/unauthorized-domain') {
                    alert('This domain is not authorized in Firebase Console (Authentication -> Settings -> Authorized domains).');
                } else if (error.code !== 'auth/popup-closed-by-user') {
                    alert('Sign in failed: ' + error.message);
                }
            }
        }

        /**
         * Sign out from the shared session across all Web Apps
         */
        async signOut() {
            if (!this.auth) return;
            try {
                await this.auth.signOut();
                this.currentUser = null;
                this.renderUI();

                if (this.broadcastChannel) {
                    this.broadcastChannel.postMessage({ type: 'USER_LOGOUT' });
                }

                if (this.onUserChangeCallback) {
                    this.onUserChangeCallback(null);
                }
            } catch (e) {
                console.error('[SharedAuth] Sign-out error:', e);
            }
        }

        /**
         * Save user profile info to DB
         */
        updateUserProfileInDb(user) {
            if (!this.database || !user) return;
            const profileRef = this.database.ref(`users/${user.uid}/profile`);
            profileRef.update({
                displayName: user.displayName || '',
                email: user.email || '',
                photoURL: user.photoURL || '',
                lastLogin: Date.now()
            }).catch(() => {});
        }

        /**
         * Save application data to Cloud (/users/{uid}/apps/{appId})
         * Automatically debounced by 600ms
         * @param {Object} data - Application state data
         */
        saveData(data) {
            if (!this.currentUser || !this.database) return;

            clearTimeout(this.saveDebounceTimer);
            this.setSyncIndicator('syncing');

            this.saveDebounceTimer = setTimeout(() => {
                const appRef = this.database.ref(`users/${this.currentUser.uid}/apps/${this.appId}`);
                const payload = {
                    ...data,
                    updatedAt: Date.now()
                };

                appRef.set(payload)
                    .then(() => {
                        this.setSyncIndicator('synced');
                    })
                    .catch((err) => {
                        console.error('[SharedAuth] Cloud save error:', err);
                        this.setSyncIndicator('error');
                    });
            }, 600);
        }

        /**
         * Load application data from Cloud
         */
        loadData() {
            if (!this.currentUser || !this.database) return;

            this.setSyncIndicator('syncing');
            const appRef = this.database.ref(`users/${this.currentUser.uid}/apps/${this.appId}`);

            appRef.once('value')
                .then((snapshot) => {
                    const val = snapshot.val();
                    this.setSyncIndicator('synced');
                    if (val && this.onDataLoadedCallback) {
                        this.onDataLoadedCallback(val);
                    }
                })
                .catch((err) => {
                    console.error('[SharedAuth] Cloud load error:', err);
                    this.setSyncIndicator('error');
                });
        }

        /**
         * Handle messages from other browser tabs
         */
        handleBroadcastMessage(event) {
            const data = event.data;
            if (!data) return;

            if (data.type === 'USER_LOGIN' || data.type === 'USER_LOGOUT') {
                if (this.auth) {
                    this.currentUser = this.auth.currentUser;
                    this.renderUI();
                    if (this.onUserChangeCallback) {
                        this.onUserChangeCallback(this.currentUser);
                    }
                    if (this.currentUser) {
                        this.loadData();
                    }
                }
            }
        }

        /**
         * Set the status icon on the profile badge
         */
        setSyncIndicator(status) {
            const el = document.getElementById('sharedAuthSyncStatus');
            if (!el) return;

            if (status === 'syncing') {
                el.innerHTML = '🔄';
                el.className = 'sync-status-indicator is-syncing';
                el.title = 'Syncing with cloud...';
            } else if (status === 'error') {
                el.innerHTML = '⚠️';
                el.className = 'sync-status-indicator';
                el.title = 'Sync failed. Local data preserved.';
            } else {
                el.innerHTML = '☁️';
                el.className = 'sync-status-indicator';
                el.title = 'All changes saved to cloud';
            }
        }

        /**
         * Render the authentication UI into mountSelector
         */
        renderUI() {
            if (!this.mountSelector) return;
            const container = document.querySelector(this.mountSelector);
            if (!container) return;

            const config = this.getConfig();

            // Case 1: Config is missing
            if (!config) {
                container.innerHTML = `
                    <div class="shared-auth-container">
                        <button type="button" class="btn-setup-cloud" id="btnSharedAuthSetup">
                            <span>☁️</span> <span data-i18n="auth.setup">Setup Cloud</span>
                        </button>
                    </div>
                `;
                document.getElementById('btnSharedAuthSetup').addEventListener('click', () => this.openConfigModal());
                if (window.LuckyWheelI18n && typeof window.LuckyWheelI18n.applyTranslations === 'function') {
                    window.LuckyWheelI18n.applyTranslations();
                }
                return;
            }

            // Case 2: Not logged in
            if (!this.currentUser) {
                container.innerHTML = `
                    <div class="shared-auth-container">
                        <button type="button" class="btn-google-auth" id="btnSharedGoogleLogin">
                            ${GOOGLE_ICON_SVG}
                            <span data-i18n="auth.signIn">Sign in</span>
                        </button>
                    </div>
                `;
                document.getElementById('btnSharedGoogleLogin').addEventListener('click', () => this.signIn());
                if (window.LuckyWheelI18n && typeof window.LuckyWheelI18n.applyTranslations === 'function') {
                    window.LuckyWheelI18n.applyTranslations();
                }
                return;
            }

            // Case 3: Logged in
            const user = this.currentUser;
            const name = user.displayName || user.email || 'User';
            const firstLetter = name.charAt(0).toUpperCase();
            const avatarHtml = user.photoURL 
                ? `<img class="user-avatar" src="${user.photoURL}" alt="${escapeHtml(name)}" referrerpolicy="no-referrer">`
                : `<div class="user-avatar">${firstLetter}</div>`;

            container.innerHTML = `
                <div class="shared-auth-container">
                    <div class="user-profile-pill" id="sharedUserProfilePill">
                        ${avatarHtml}
                        <span class="user-name-text">${escapeHtml(name)}</span>
                        <span class="sync-status-indicator" id="sharedAuthSyncStatus">☁️</span>
                    </div>

                    <div class="user-dropdown-menu" id="sharedUserDropdownMenu">
                        <div class="dropdown-user-header">
                            <div class="dropdown-user-name">${escapeHtml(name)}</div>
                            <div class="dropdown-user-email">${escapeHtml(user.email || '')}</div>
                        </div>
                        <button type="button" class="dropdown-action-btn" id="btnDropdownSyncNow">
                            <span>🔄</span> <span data-i18n="auth.syncNow">Sync Now</span>
                        </button>
                        <button type="button" class="dropdown-action-btn" id="btnDropdownCloudConfig">
                            <span>⚙️</span> <span data-i18n="auth.cloudSetup">Cloud Setup</span>
                        </button>
                        <button type="button" class="dropdown-action-btn btn-signout" id="btnDropdownSignOut">
                            <span>🚪</span> <span data-i18n="auth.signOut">Sign Out</span>
                        </button>
                    </div>
                </div>
            `;
            if (window.LuckyWheelI18n && typeof window.LuckyWheelI18n.applyTranslations === 'function') {
                window.LuckyWheelI18n.applyTranslations();
            }

            // Bind dropdown toggle
            const pill = document.getElementById('sharedUserProfilePill');
            const menu = document.getElementById('sharedUserDropdownMenu');

            pill.addEventListener('click', (e) => {
                e.stopPropagation();
                menu.classList.toggle('is-open');
            });

            document.addEventListener('click', (e) => {
                if (!menu.contains(e.target) && !pill.contains(e.target)) {
                    menu.classList.remove('is-open');
                }
            });

            document.getElementById('btnDropdownSyncNow').addEventListener('click', () => {
                menu.classList.remove('is-open');
                this.loadData();
            });

            document.getElementById('btnDropdownCloudConfig').addEventListener('click', () => {
                menu.classList.remove('is-open');
                this.openConfigModal();
            });

            document.getElementById('btnDropdownSignOut').addEventListener('click', () => {
                menu.classList.remove('is-open');
                this.signOut();
            });
        }

        /**
         * Inject the Cloud Setup Modal into the document body
         */
        injectModal() {
            if (document.getElementById('sharedAuthModalBackdrop')) return;

            const modalHtml = `
                <div class="shared-auth-modal-backdrop" id="sharedAuthModalBackdrop" role="dialog" aria-modal="true">
                    <div class="shared-auth-modal-card">
                        <h3 class="shared-auth-modal-title">
                            <span>☁️</span> Web Apps Cloud Setup
                        </h3>
                        <p class="shared-auth-modal-desc">
                            Paste your Firebase configuration below to enable Google Sign-In and cross-device cloud sync for all Web Apps.
                        </p>
                        <textarea class="shared-auth-textarea" id="sharedAuthModalTextarea" placeholder='{\n  "apiKey": "AIzaSy...",\n  "authDomain": "my-apps.firebaseapp.com",\n  "projectId": "my-apps",\n  "databaseURL": "https://my-apps-default-rtdb.asia-southeast1.firebasedatabase.app"\n}' spellcheck="false"></textarea>
                        <div class="shared-auth-modal-footer">
                            <button type="button" class="btn btn-ghost" id="btnSharedAuthModalCancel">Cancel</button>
                            <button type="button" class="btn btn-primary" id="btnSharedAuthModalSave">Save &amp; Connect</button>
                        </div>
                    </div>
                </div>
            `;

            document.body.insertAdjacentHTML('beforeend', modalHtml);

            const backdrop = document.getElementById('sharedAuthModalBackdrop');
            const cancelBtn = document.getElementById('btnSharedAuthModalCancel');
            const saveBtn = document.getElementById('btnSharedAuthModalSave');
            const textarea = document.getElementById('sharedAuthModalTextarea');

            cancelBtn.addEventListener('click', () => this.closeConfigModal());
            backdrop.addEventListener('click', (e) => {
                if (e.target === backdrop) this.closeConfigModal();
            });

            saveBtn.addEventListener('click', () => {
                const raw = textarea.value.trim();
                if (!raw) {
                    alert('Please enter your Firebase configuration.');
                    return;
                }

                try {
                    let configObj = null;
                    // Support standard JSON or JS object assignment
                    if (raw.includes('firebaseConfig =')) {
                        const jsonStr = raw.split('firebaseConfig =')[1].split(';')[0].trim();
                        configObj = JSON.parse(jsonStr.replace(/(['"])?([a-zA-Z0-9_]+)(['"])?:/g, '"$2":'));
                    } else if (raw.startsWith('{')) {
                        configObj = JSON.parse(raw.replace(/(['"])?([a-zA-Z0-9_]+)(['"])?:/g, '"$2":').replace(/'/g, '"'));
                    } else {
                        throw new Error('Unsupported format');
                    }

                    if (!configObj.apiKey || !configObj.projectId) {
                        alert('Configuration is missing apiKey or projectId.');
                        return;
                    }

                    localStorage.setItem(STORAGE_KEY_CONFIG, JSON.stringify(configObj));
                    this.closeConfigModal();
                    this.initFirebase();
                    this.renderUI();
                    alert('Firebase configuration saved successfully! You can now sign in.');
                } catch (e) {
                    alert('Failed to parse Firebase configuration. Please paste a valid JSON or JS object format.');
                }
            });
        }

        openConfigModal() {
            const backdrop = document.getElementById('sharedAuthModalBackdrop');
            const textarea = document.getElementById('sharedAuthModalTextarea');
            if (!backdrop) return;

            const current = this.getConfig();
            if (current) {
                textarea.value = JSON.stringify(current, null, 2);
            }
            backdrop.classList.add('is-open');
        }

        closeConfigModal() {
            const backdrop = document.getElementById('sharedAuthModalBackdrop');
            if (backdrop) backdrop.classList.remove('is-open');
        }
    }

    function escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    // Export global singleton
    window.SharedAuth = new SharedAuthEngine();
})();
