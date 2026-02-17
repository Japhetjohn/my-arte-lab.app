import { appState, setUser, clearUser } from './state.js';
import { navigateToPage } from './navigation.js';
import { showToast, closeModal, openModal } from './utils.js';
import api from './services/api.js';
import { getAvatarUrl } from './utils/avatar.js';
import { COUNTRIES_ALPHABETICAL } from './data/countries.js';

export function showAuthModal(type = 'signin', userType = 'client') {
    const isSignUp = type === 'signup';
    const modalContent = `
        <div class="modal" onclick="closeModalOnBackdrop(event)">
            <div class="modal-content">
                <div class="modal-header">
                    <h2>${isSignUp ? 'Create account' : 'Welcome back'}</h2>
                    <button class="icon-btn" onclick="closeModal()">
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                            <path d="M18 6L6 18M6 6l12 12" stroke="currentColor" stroke-width="2"/>
                        </svg>
                    </button>
                </div>

                <form onsubmit="handleAuth(event, '${type}')" id="authForm">
                    ${isSignUp ? `
                        <div class="form-group">
                            <label class="form-label">First name</label>
                            <input type="text" name="firstName" class="form-input" required maxlength="50">
                        </div>

                        <div class="form-group">
                            <label class="form-label">Last name</label>
                            <input type="text" name="lastName" class="form-input" required maxlength="50">
                        </div>

                        <div class="form-group">
                            <label class="form-label">I am a</label>
                            <select name="role" class="form-select" id="userTypeSelect" onchange="toggleCategoryField()">
                                <option value="client" ${userType === 'client' ? 'selected' : ''}>Client</option>
                                <option value="creator" ${userType === 'creator' ? 'selected' : ''}>Creator</option>
                            </select>
                        </div>

                        <div class="form-group" id="categoryFieldGroup" style="display: ${userType === 'creator' ? 'block' : 'none'};">
                            <label class="form-label">Category</label>
                            <select name="category" class="form-select" id="categorySelect">
                                <option value="photographer">Photographer</option>
                                <option value="designer">Designer</option>
                                <option value="videographer">Videographer</option>
                                <option value="illustrator">Illustrator</option>
                                <option value="other">Other</option>
                            </select>
                        </div>
                    ` : ''}

                    <div class="form-group">
                        <label class="form-label">Email</label>
                        <input type="email" name="email" class="form-input" required>
                    </div>

                    <div class="form-group">
                        <label class="form-label">Password</label>
                        <div style="position: relative;">
                            <input type="password" name="password" class="form-input" id="passwordInput" required minlength="8" oninput="${isSignUp ? 'validatePassword()' : ''}" style="padding-right: 40px;">
                            <button type="button" onclick="togglePasswordVisibility('passwordInput', this)" style="position: absolute; right: 8px; top: 50%; transform: translateY(-50%); background: none; border: none; cursor: pointer; padding: 4px; display: flex; align-items: center; color: var(--text-secondary);">
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" class="eye-icon">
                                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                                    <circle cx="12" cy="12" r="3" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                                </svg>
                            </button>
                        </div>
                        ${isSignUp ? `
                        <div id="passwordRequirements" style="margin-top: 8px; font-size: 12px;">
                            <div id="req-length" class="password-requirement" style="color: #EF4444; display: flex; align-items: center; gap: 6px; margin-bottom: 4px;">
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                                    <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="2"/>
                                    <path d="M15 9l-6 6M9 9l6 6" stroke="currentColor" stroke-width="2"/>
                                </svg>
                                <span>At least 8 characters</span>
                            </div>
                            <div id="req-uppercase" class="password-requirement" style="color: #EF4444; display: flex; align-items: center; gap: 6px; margin-bottom: 4px;">
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                                    <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="2"/>
                                    <path d="M15 9l-6 6M9 9l6 6" stroke="currentColor" stroke-width="2"/>
                                </svg>
                                <span>One uppercase letter</span>
                            </div>
                            <div id="req-lowercase" class="password-requirement" style="color: #EF4444; display: flex; align-items: center; gap: 6px; margin-bottom: 4px;">
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                                    <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="2"/>
                                    <path d="M15 9l-6 6M9 9l6 6" stroke="currentColor" stroke-width="2"/>
                                </svg>
                                <span>One lowercase letter</span>
                            </div>
                            <div id="req-number" class="password-requirement" style="color: #EF4444; display: flex; align-items: center; gap: 6px; margin-bottom: 4px;">
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                                    <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="2"/>
                                    <path d="M15 9l-6 6M9 9l6 6" stroke="currentColor" stroke-width="2"/>
                                </svg>
                                <span>One number</span>
                            </div>
                            <div id="req-special" class="password-requirement" style="color: #EF4444; display: flex; align-items: center; gap: 6px; margin-bottom: 4px;">
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                                    <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="2"/>
                                    <path d="M15 9l-6 6M9 9l6 6" stroke="currentColor" stroke-width="2"/>
                                </svg>
                                <span>One special character (@$!%*?&_-#)</span>
                            </div>
                        </div>
                        ` : ''}
                    </div>

                    ${isSignUp ? `
                    <div class="form-group">
                        <label class="form-label">Confirm Password</label>
                        <div style="position: relative;">
                            <input type="password" name="confirmPassword" class="form-input" id="confirmPasswordInput" required minlength="8" oninput="validatePasswordMatch()" style="padding-right: 40px;">
                            <button type="button" onclick="togglePasswordVisibility('confirmPasswordInput', this)" style="position: absolute; right: 8px; top: 50%; transform: translateY(-50%); background: none; border: none; cursor: pointer; padding: 4px; display: flex; align-items: center; color: var(--text-secondary);">
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" class="eye-icon">
                                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                                    <circle cx="12" cy="12" r="3" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                                </svg>
                            </button>
                        </div>
                        <div id="passwordMatchError" style="color: #EF4444; font-size: 12px; margin-top: 4px; display: none;">
                            Passwords do not match
                        </div>
                    </div>
                    ` : ''}

                    ${isSignUp ? `
                        <div class="form-group">
                            <label class="form-label">Local Area (e.g., Farin Gada, Lekki, Kilimani)</label>
                            <input type="text" name="localArea" class="form-input" placeholder="Enter your local area" required>
                        </div>

                        <div class="form-group">
                            <label class="form-label">State/Province/Region</label>
                            <input type="text" name="state" class="form-input" placeholder="e.g., Plateau, Lagos, Nairobi" required>
                        </div>

                        <div class="form-group">
                            <label class="form-label">Country</label>
                            <select name="country" id="countrySelect" class="form-select" required>
                                <option value="">Select your country</option>
                                <!-- Countries will be populated by JavaScript -->
                            </select>
                        </div>

                        <div class="form-group">
                            <label style="display: flex; align-items: center; gap: 8px; cursor: pointer;">
                                <input type="checkbox" required>
                                <span>I accept the terms and conditions</span>
                            </label>
                        </div>
                    ` : `
                        <div class="form-group">
                            <label style="display: flex; align-items: center; gap: 8px; cursor: pointer;">
                                <input type="checkbox" name="rememberMe" id="rememberMeCheckbox">
                                <span>Remember me</span>
                            </label>
                        </div>
                    `}

                    <div class="form-actions">
                        <button type="submit" class="btn-primary" id="authSubmitBtn">${isSignUp ? 'Create account' : 'Sign in'}</button>
                    </div>
                </form>

                <div style="margin-top: 16px; text-align: center;">
                    <p class="text-secondary">
                        ${isSignUp ? 'Already have an account?' : "Don't have an account?"}
                        <a href="#" onclick="showAuthModal('${isSignUp ? 'signin' : 'signup'}'); return false;" style="color: var(--primary); text-decoration: none; font-weight: 500;">
                            ${isSignUp ? 'Sign in' : 'Create account'}
                        </a>
                    </p>
                </div>

                ${!isSignUp ? `
                    <div style="margin-top: 8px; text-align: center;">
                        <button class="btn-ghost" onclick="navigateToPage('home'); closeModal();">Browse as guest</button>
                    </div>
                ` : ''}
            </div>
        </div>
    `;

    document.getElementById('modalsContainer').innerHTML = modalContent;
    openModal();

    // Populate countries dropdown for signup
    if (isSignUp) {
        const countrySelect = document.getElementById('countrySelect');
        if (countrySelect) {
            COUNTRIES_ALPHABETICAL.forEach(country => {
                const option = document.createElement('option');
                option.value = country.name;
                option.textContent = `${country.flag} ${country.name}`;
                countrySelect.appendChild(option);
            });
        }
    }
}

export async function handleAuth(event, type) {
    event.preventDefault();

    const form = event.target;
    const submitBtn = form.querySelector('button[type="submit"]');
    const originalBtnText = submitBtn.textContent;

    submitBtn.disabled = true;
    submitBtn.textContent = type === 'signup' ? 'Creating account...' : 'Signing in...';

    try {
        const formData = new FormData(form);

        if (type === 'signup') {
            const password = formData.get('password');
            const confirmPassword = formData.get('confirmPassword');

            if (password !== confirmPassword) {
                showToast('Passwords do not match', 'error');
                submitBtn.disabled = false;
                submitBtn.textContent = originalBtnText;
                return;
            }

            if (password.length < 8) {
                showToast('Password must be at least 8 characters', 'error');
                submitBtn.disabled = false;
                submitBtn.textContent = originalBtnText;
                return;
            }
            if (!/[A-Z]/.test(password)) {
                showToast('Password must contain at least one uppercase letter', 'error');
                submitBtn.disabled = false;
                submitBtn.textContent = originalBtnText;
                return;
            }
            if (!/[a-z]/.test(password)) {
                showToast('Password must contain at least one lowercase letter', 'error');
                submitBtn.disabled = false;
                submitBtn.textContent = originalBtnText;
                return;
            }
            if (!/\d/.test(password)) {
                showToast('Password must contain at least one number', 'error');
                submitBtn.disabled = false;
                submitBtn.textContent = originalBtnText;
                return;
            }
            if (!/[@$!%*?&_\-#]/.test(password)) {
                showToast('Password must contain at least one special character (@$!%*?&_-#)', 'error');
                submitBtn.disabled = false;
                submitBtn.textContent = originalBtnText;
                return;
            }

            const userData = {
                firstName: formData.get('firstName'),
                lastName: formData.get('lastName'),
                role: formData.get('role') || 'client',
                email: formData.get('email'),
                password: password,
                localArea: formData.get('localArea'),
                state: formData.get('state'),
                country: formData.get('country')
            };

            if (userData.role === 'creator') {
                userData.category = formData.get('category') || 'other';
            }

            const response = await api.register(userData);

            if (response.success) {
                setUser(response.data.user);

                updateUserMenu();
                closeModal();

                showEmailVerificationModal(userData.email, userData.role);
                showToast('Account created successfully! Please check your email for the verification code.', 'success');
            } else {
                showToast(response.message || 'Registration failed. Please try again.', 'error');
            }
        } else {
            const credentials = {
                email: formData.get('email'),
                password: formData.get('password')
            };

            const response = await api.login(credentials);

            if (response.success) {
                setUser(response.data.user);
                updateUserMenu();
                closeModal();
                showToast('Welcome back!', 'success');
                navigateToPage('home');
            }
        }
    } catch (error) {
        showToast(error.message || 'Authentication failed. Please try again.', 'error');
    } finally {
        submitBtn.disabled = false;
        submitBtn.textContent = originalBtnText;
    }
}

export async function handleLogout() {
    try {
        await api.logout();
    } catch (error) {
        // Log error but continue with client-side logout
        // Server session cleanup failed, but user still gets logged out locally
        console.error('Logout API call failed:', error);
    } finally {
        if (window.notificationInterval) {
            clearInterval(window.notificationInterval);
            window.notificationInterval = null;
        }

        api.setUserData(null);
        clearUser();
        updateUserMenu();
        navigateToPage('home');
        showToast('You have been logged out successfully', 'success');
    }
}

/**
 * Initialize authentication - check if user is logged in
 */
export async function initAuth() {
    const token = api.getToken();
    const cachedUser = api.getUserData();

    if (token && cachedUser) {
        setUser(cachedUser);
        updateUserMenu();

        try {
            const response = await api.getMe();

            if (response.success && response.data.user) {
                setUser(response.data.user);
                api.setUserData(response.data.user);
                updateUserMenu();
                return response.data.user;
            }
        } catch (error) {
            console.warn('Failed to refresh user data, using cached data:', error.message);
        }

        return cachedUser;
    } else if (token) {
        try {
            const response = await api.getMe();

            if (response.success && response.data.user) {
                setUser(response.data.user);
                api.setUserData(response.data.user);
                updateUserMenu();
                return response.data.user;
            }
        } catch (error) {
            api.setToken(null);
            api.setUserData(null);
            clearUser();
        }
    }

    updateUserMenu();
    return null;
}

export function updateUserMenu() {
    const userMenuContainer = document.getElementById('userMenuContainer');
    if (!userMenuContainer) {
        return;
    }

    if (appState.user) {
        const userName = appState.user.name || `${appState.user.firstName || ''} ${appState.user.lastName || ''}`.trim() || 'User';
        const userFirstName = appState.user.firstName || appState.user.name?.split(' ')[0] || 'User';

        const avatarUrl = getAvatarUrl(appState.user);
        userMenuContainer.innerHTML = `
            <button class="user-avatar-btn" id="userAvatarBtn">
                <img src="${avatarUrl}" alt="${userName}" class="avatar avatar-medium">
                <span>${userFirstName}</span>
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                    <path d="M4 6l4 4 4-4" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
                </svg>
            </button>
            <div class="user-dropdown" id="userDropdown">
                <div class="user-dropdown-header">
                    <div class="user-dropdown-name">${userName}</div>
                    <div class="user-dropdown-email">${appState.user.email}</div>
                </div>
                <button class="user-dropdown-item" onclick="navigateToPage('profile')">
                    <svg viewBox="0 0 24 24" fill="none">
                        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" stroke="currentColor" stroke-width="2"/>
                        <circle cx="12" cy="7" r="4" stroke="currentColor" stroke-width="2"/>
                    </svg>
                    My profile
                </button>
                <button class="user-dropdown-item" onclick="navigateToPage('home')">
                    <svg viewBox="0 0 24 24" fill="none">
                        <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V9z" stroke="currentColor" stroke-width="2"/>
                        <path d="M9 22V12h6v10" stroke="currentColor" stroke-width="2"/>
                    </svg>
                    Home
                </button>
                <button class="user-dropdown-item" onclick="navigateToPage('bookings')">
                    <svg viewBox="0 0 24 24" fill="none">
                        <rect x="3" y="4" width="18" height="18" rx="2" stroke="currentColor" stroke-width="2"/>
                        <path d="M16 2v4M8 2v4M3 10h18" stroke="currentColor" stroke-width="2"/>
                    </svg>
                    My bookings
                </button>
                <button class="user-dropdown-item" onclick="navigateToPage('projects')">
                    <svg viewBox="0 0 24 24" fill="none">
                        <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" stroke="currentColor" stroke-width="2"/>
                    </svg>
                    Projects
                </button>
                <button class="user-dropdown-item" onclick="navigateToPage('wallet')">
                    <svg viewBox="0 0 24 24" fill="none">
                        <path d="M21 12V7a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-5z" stroke="currentColor" stroke-width="2"/>
                        <path d="M18 12h.01" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
                    </svg>
                    Wallet
                </button>
                <button class="user-dropdown-item" onclick="navigateToPage('settings')">
                    <svg viewBox="0 0 24 24" fill="none">
                        <circle cx="12" cy="12" r="3" stroke="currentColor" stroke-width="2"/>
                        <path d="M12 1v6m0 6v6M23 12h-6m-6 0H5" stroke="currentColor" stroke-width="2"/>
                        <path d="M18.364 5.636l-4.243 4.243m-4.242 4.242L5.636 18.364M18.364 18.364l-4.243-4.243m-4.242-4.242L5.636 5.636" stroke="currentColor" stroke-width="2"/>
                    </svg>
                    Settings
                </button>
                <div class="user-dropdown-divider"></div>
                <button class="user-dropdown-item" onclick="showHelpSupportModal()">
                    <svg viewBox="0 0 24 24" fill="none">
                        <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="2"/>
                        <path d="M12 16v-4M12 8h.01" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
                    </svg>
                    Help & Support
                </button>
                <button class="user-dropdown-item danger" onclick="handleLogout()">
                    <svg viewBox="0 0 24 24" fill="none">
                        <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
                    </svg>
                    Logout
                </button>
            </div>
        `;

        document.getElementById('userAvatarBtn')?.addEventListener('click', (e) => {
            e.stopPropagation();
            document.getElementById('userDropdown')?.classList.toggle('active');
        });

        document.addEventListener('click', (e) => {
            const dropdown = document.getElementById('userDropdown');
            const btn = document.getElementById('userAvatarBtn');
            if (dropdown && !dropdown.contains(e.target) && !btn?.contains(e.target)) {
                dropdown.classList.remove('active');
            }
        });

        const notificationsBtn = document.getElementById('notificationsBtn');
        if (notificationsBtn) {
            notificationsBtn.style.display = 'flex';
            notificationsBtn.addEventListener('click', () => navigateToPage('notifications'));
        }

        updateNotificationBadge();

        if (!window.notificationInterval) {
            window.notificationInterval = setInterval(updateNotificationBadge, 30000);
        }

        document.querySelectorAll('.nav-item').forEach(item => {
            const page = item.dataset.page;
            if (page === 'bookings' || page === 'notifications' || page === 'wallet' || page === 'profile') {
                item.style.display = 'flex';
            }
        });

        const searchBtn = document.getElementById('searchBtn');
        if (searchBtn) {
            searchBtn.style.display = 'flex';
        }
    } else {
        const notificationsBtn = document.getElementById('notificationsBtn');
        if (notificationsBtn) {
            notificationsBtn.style.display = 'none';
        }

        if (window.notificationInterval) {
            clearInterval(window.notificationInterval);
            window.notificationInterval = null;
        }

        userMenuContainer.innerHTML = `<button class="btn-secondary" id="authBtn">Sign in</button>`;
        document.getElementById('authBtn')?.addEventListener('click', () => showAuthModal('signin'));

        document.querySelectorAll('.nav-item').forEach(item => {
            const page = item.dataset.page;
            if (page === 'bookings' || page === 'notifications' || page === 'wallet' || page === 'profile') {
                item.style.display = 'none';
            }
        });

        const searchBtn = document.getElementById('searchBtn');
        if (searchBtn) {
            searchBtn.style.display = 'none';
        }

        if (appState.currentPage === 'bookings' || appState.currentPage === 'notifications' ||
            appState.currentPage === 'wallet' || appState.currentPage === 'profile') {
            navigateToPage('home');
        }
    }
}

async function updateNotificationBadge() {
    if (!appState.user) return;

    try {
        const response = await api.getUnreadNotificationCount();
        if (response.success) {
            const unreadCount = response.data.unreadCount || 0;
            const badge = document.querySelector('.notification-badge');
            if (badge) {
                console.log('[Notification Badge] Updating count:', unreadCount);
                if (unreadCount > 0) {
                    badge.textContent = unreadCount > 99 ? '99+' : unreadCount;
                    badge.style.display = 'flex';
                } else {
                    badge.style.display = 'none';
                }
            } else {
                console.warn('[Notification Badge] Badge element not found');
            }
        } else {
            console.warn('[Notification Badge] API response not successful:', response);
        }
    } catch (error) {
        // Silently fail notification badge updates to avoid spamming console
        // This is a non-critical UI update that runs every 30 seconds
        // Only log if there's a network error (not a 401)
        if (error.message && !error.message.includes('401')) {
            console.warn('Failed to update notification badge:', error.message);
        }
    }
}

// Make function globally available
window.updateNotificationBadge = updateNotificationBadge;

/**
 * Validate password requirements and update UI
 */
function validatePassword() {
    const password = document.getElementById('passwordInput')?.value || '';

    const lengthReq = document.getElementById('req-length');
    if (password.length >= 8) {
        updateRequirementUI(lengthReq, true);
    } else {
        updateRequirementUI(lengthReq, false);
    }

    const uppercaseReq = document.getElementById('req-uppercase');
    if (/[A-Z]/.test(password)) {
        updateRequirementUI(uppercaseReq, true);
    } else {
        updateRequirementUI(uppercaseReq, false);
    }

    const lowercaseReq = document.getElementById('req-lowercase');
    if (/[a-z]/.test(password)) {
        updateRequirementUI(lowercaseReq, true);
    } else {
        updateRequirementUI(lowercaseReq, false);
    }

    const numberReq = document.getElementById('req-number');
    if (/\d/.test(password)) {
        updateRequirementUI(numberReq, true);
    } else {
        updateRequirementUI(numberReq, false);
    }

    const specialReq = document.getElementById('req-special');
    if (/[@$!%*?&_\-#]/.test(password)) {
        updateRequirementUI(specialReq, true);
    } else {
        updateRequirementUI(specialReq, false);
    }
}

/**
 * Update requirement UI (red with X or green with checkmark)
 */
function updateRequirementUI(element, isValid) {
    if (!element) return;

    if (isValid) {
        element.style.color = '#10B981';
        element.innerHTML = `
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="2"/>
                <path d="M9 12l2 2 4-4" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
            </svg>
            <span>${element.querySelector('span').textContent}</span>
        `;
    } else {
        element.style.color = '#EF4444';
        element.innerHTML = `
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="2"/>
                <path d="M15 9l-6 6M9 9l6 6" stroke="currentColor" stroke-width="2"/>
            </svg>
            <span>${element.querySelector('span').textContent}</span>
        `;
    }
}

/**
 * Validate password match and show error if needed
 */
function validatePasswordMatch() {
    const password = document.getElementById('passwordInput')?.value || '';
    const confirmPassword = document.getElementById('confirmPasswordInput')?.value || '';
    const errorDiv = document.getElementById('passwordMatchError');

    if (confirmPassword.length > 0 && password !== confirmPassword) {
        errorDiv.style.display = 'block';
    } else {
        errorDiv.style.display = 'none';
    }
}

/**
 * Show email verification modal with 6-digit code input
 */
export function showEmailVerificationModal(email, userRole = 'client') {
    const modalContent = `
        <div class="modal" onclick="closeModalOnBackdrop(event)">
            <div class="modal-content">
                <div class="modal-header">
                    <h2>Verify your email</h2>
                    <button class="icon-btn" onclick="skipVerification('${userRole}')">
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                            <path d="M18 6L6 18M6 6l12 12" stroke="currentColor" stroke-width="2"/>
                        </svg>
                    </button>
                </div>

                <p style="color: var(--text-secondary); margin-bottom: 24px;">
                    We sent a 6-digit verification code to<br>
                    <strong style="color: var(--text-primary);">${email}</strong>
                </p>

                <form onsubmit="handleEmailVerification(event, '${userRole}')">
                    <div class="form-group">
                        <label class="form-label">Verification Code</label>
                        <input
                            type="text"
                            name="code"
                            class="form-input"
                            placeholder="Enter 6-digit code"
                            required
                            maxlength="6"
                            pattern="[0-9]{6}"
                            style="text-align: center; font-size: 24px; letter-spacing: 8px; font-weight: 600;"
                            inputmode="numeric"
                        >
                        <small style="color: var(--text-secondary); font-size: 12px; margin-top: 4px; display: block;">
                            Code expires in 30 minutes
                        </small>
                    </div>

                    <div class="form-actions">
                        <button type="submit" class="btn-primary">Verify Email</button>
                    </div>
                </form>

                <div style="margin-top: 16px; text-align: center;">
                    <p class="text-secondary" style="font-size: 14px;">
                        Didn't receive the code?
                        <button
                            type="button"
                            onclick="handleResendVerification()"
                            class="btn-ghost"
                            style="color: var(--primary); font-weight: 500; padding: 4px 8px;"
                        >
                            Resend Code
                        </button>
                    </p>
                </div>

                <div style="margin-top: 8px; text-align: center;">
                    <button class="btn-ghost" onclick="skipVerification('${userRole}')">Skip for now</button>
                </div>
            </div>
        </div>
    `;

    document.getElementById('modalsContainer').innerHTML = modalContent;
    openModal();
}

/**
 * Handle email verification code submission
 */
async function handleEmailVerification(event, userRole) {
    event.preventDefault();

    const form = event.target;
    const submitBtn = form.querySelector('button[type="submit"]');
    const originalBtnText = submitBtn.textContent;
    const code = form.code.value.trim();

    if (code.length !== 6 || !/^\d{6}$/.test(code)) {
        showToast('Please enter a valid 6-digit code', 'error');
        return;
    }

    submitBtn.disabled = true;
    submitBtn.textContent = 'Verifying...';

    try {
        const response = await api.verifyEmail(code);

        if (response.success) {
            if (appState.user) {
                appState.user.isEmailVerified = true;
                setUser(appState.user);
            }

            closeModal();
            showToast('Email verified successfully!', 'success');

            if (userRole === 'creator') {
                navigateToPage('settings');
                showToast('Complete your profile to start receiving bookings', 'info');
            } else {
                navigateToPage('home');
            }
        } else {
            showToast(response.message || 'Invalid or expired verification code', 'error');
        }
    } catch (error) {
        console.error('Verification error:', error);
        showToast(error.message || 'Verification failed. Please try again.', 'error');
    } finally {
        submitBtn.disabled = false;
        submitBtn.textContent = originalBtnText;
    }
}

/**
 * Resend verification code
 */
async function handleResendVerification() {
    try {
        showToast('Sending new verification code...', 'info');
        const response = await api.resendVerification();

        if (response.success) {
            showToast('New verification code sent to your email', 'success');
        } else {
            showToast(response.message || 'Failed to resend verification code', 'error');
        }
    } catch (error) {
        showToast(error.message || 'Failed to resend code. Please try again.', 'error');
    }
}

/**
 * Skip verification for now
 */
function skipVerification(userRole) {
    closeModal();

    if (userRole === 'creator') {
        navigateToPage('settings');
        showToast('Complete your profile to start receiving bookings', 'info');
    } else {
        navigateToPage('home');
    }

    showToast('Remember to verify your email later from settings', 'info');
}

/**
 * Toggle category field visibility based on role selection
 */
function toggleCategoryField() {
    const roleSelect = document.getElementById('userTypeSelect');
    const categoryFieldGroup = document.getElementById('categoryFieldGroup');
    const categorySelect = document.getElementById('categorySelect');

    if (roleSelect && categoryFieldGroup) {
        if (roleSelect.value === 'creator') {
            categoryFieldGroup.style.display = 'block';
            if (categorySelect) {
                categorySelect.required = true;
            }
        } else {
            categoryFieldGroup.style.display = 'none';
            if (categorySelect) {
                categorySelect.required = false;
            }
        }
    }
}

/**
 * Show Help & Support modal with contact information
 */
export function showHelpSupportModal() {
    closeUserDropdown();

    const modalContent = `
        <div class="modal" onclick="closeModalOnBackdrop(event)">
            <div class="modal-content">
                <div class="modal-header">
                    <h2>Help & Support</h2>
                    <button class="icon-btn" onclick="closeModal()">
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                            <path d="M18 6L6 18M6 6l12 12" stroke="currentColor" stroke-width="2"/>
                        </svg>
                    </button>
                </div>

                <div style="text-align: center; margin-bottom: 32px;">
                    <svg width="64" height="64" viewBox="0 0 24 24" fill="none" style="margin: 0 auto 16px; color: var(--primary);">
                        <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="2"/>
                        <path d="M12 16v-4M12 8h.01" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
                    </svg>
                    <h3 style="margin-bottom: 8px; font-size: 24px; font-weight: 700;">We're here to help</h3>
                    <p style="color: var(--text-secondary); font-size: 15px;">Get in touch with our support team</p>
                </div>

                <div style="background: #FEF3C7; padding: 20px; border-radius: 12px; margin-bottom: 20px; border-left: 4px solid #F59E0B;">
                    <div style="display: flex; align-items: flex-start; gap: 16px;">
                        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" style="flex-shrink: 0; color: #F59E0B; margin-top: 2px;">
                            <path d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" stroke="currentColor" stroke-width="2"/>
                        </svg>
                        <div style="flex: 1;">
                            <div style="font-weight: 700; margin-bottom: 8px; color: #92400E; font-size: 16px;">Email Support</div>
                            <a href="mailto:contact@myartelab.com" style="color: var(--primary); text-decoration: none; word-break: break-all; font-size: 16px; font-weight: 600;">
                                contact@myartelab.com
                            </a>
                            <p style="color: #92400E; font-size: 14px; margin-top: 10px; margin-bottom: 0;">
                                We typically respond within 24 hours
                            </p>
                        </div>
                    </div>
                </div>

                <div style="background: var(--surface); border: 1px solid var(--border); border-radius: 12px; padding: 24px;">
                    <h4 style="margin-bottom: 16px; font-size: 16px; font-weight: 700;">Common Questions</h4>
                    <div class="faq-accordion" style="display: flex; flex-direction: column; gap: 8px;">
                        <details style="border-bottom: 1px solid var(--border); padding-bottom: 8px;">
                            <summary style="cursor: pointer; font-size: 14px; font-weight: 600; padding: 8px 0; list-style: none; display: flex; justify-content: space-between; align-items: center;">
                                How do I get started as a creator?
                                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" class="chevron" style="transition: transform 0.2s;">
                                    <path d="M6 9l6 6 6-6" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
                                </svg>
                            </summary>
                            <p style="font-size: 13px; color: var(--text-secondary); padding: 8px 0; margin: 0;">Sign up as a creator, verify your email, and go to settings to complete your profile with your portfolio and services.</p>
                        </details>
                        
                        <details style="border-bottom: 1px solid var(--border); padding-bottom: 8px;">
                            <summary style="cursor: pointer; font-size: 14px; font-weight: 600; padding: 8px 0; list-style: none; display: flex; justify-content: space-between; align-items: center;">
                                How do payments work?
                                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" class="chevron">
                                    <path d="M6 9l6 6 6-6" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
                                </svg>
                            </summary>
                            <p style="font-size: 13px; color: var(--text-secondary); padding: 8px 0; margin: 0;">Clients pay via their wallet. The funds are held in escrow until the creator submits the work and the client approves it.</p>
                        </details>

                        <details style="border-bottom: 1px solid var(--border); padding-bottom: 8px;">
                            <summary style="cursor: pointer; font-size: 14px; font-weight: 600; padding: 8px 0; list-style: none; display: flex; justify-content: space-between; align-items: center;">
                                How do I withdraw my earnings?
                                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" class="chevron">
                                    <path d="M6 9l6 6 6-6" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
                                </svg>
                            </summary>
                            <p style="font-size: 13px; color: var(--text-secondary); padding: 8px 0; margin: 0;">You can withdraw your completed earnings to your bank account or crypto wallet via the Wallet page.</p>
                        </details>

                        <details style="padding-bottom: 8px;">
                            <summary style="cursor: pointer; font-size: 14px; font-weight: 600; padding: 8px 0; list-style: none; display: flex; justify-content: space-between; align-items: center;">
                                How can I verify my account?
                                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" class="chevron">
                                    <path d="M6 9l6 6 6-6" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
                                </svg>
                            </summary>
                            <p style="font-size: 13px; color: var(--text-secondary); padding: 8px 0; margin: 0;">Go to Settings and upload your ID or portfolio proof. Our team will review and verify your account within 48 hours.</p>
                        </details>
                    </div>
                    <p style="color: var(--text-secondary); font-size: 13px; margin-top: 16px; margin-bottom: 0;">
                        Send us your questions at the email above and we'll be happy to help!
                    </p>
                </div>

                <div class="form-actions">
                    <button class="btn-primary" onclick="closeModal()">Close</button>
                </div>
            </div>
        </div>
    `;

    document.getElementById('modalsContainer').innerHTML = modalContent;
    openModal();
}

window.handleEmailVerification = handleEmailVerification;
window.handleResendVerification = handleResendVerification;
window.skipVerification = skipVerification;
window.toggleCategoryField = toggleCategoryField;
window.validatePassword = validatePassword;
window.validatePasswordMatch = validatePasswordMatch;
window.showHelpSupportModal = showHelpSupportModal;

// Toggle password visibility
window.togglePasswordVisibility = function (inputId, button) {
    const input = document.getElementById(inputId);
    const icon = button.querySelector('.eye-icon');

    if (input.type === 'password') {
        input.type = 'text';
        // Change to eye-off icon
        icon.innerHTML = `
            <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
            <line x1="1" y1="1" x2="23" y2="23" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
        `;
    } else {
        input.type = 'password';
        // Change back to eye icon
        icon.innerHTML = `
            <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
            <circle cx="12" cy="12" r="3" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
        `;
    }
};
