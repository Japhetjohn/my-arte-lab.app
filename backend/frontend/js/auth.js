import { appState, setUser, clearUser } from './state.js';
import { navigateToPage } from './navigation.js';
import { showToast, closeModal, openModal } from './utils.js';
import api from './services/api.js';
import { getAvatarUrl } from './utils/avatar.js';
import { COUNTRIES_ALPHABETICAL } from './data/countries.js';


const AUTH_MODAL_STYLES = `
<style>
    .am-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.6); backdrop-filter: blur(8px); z-index: 1000; display: flex; align-items: flex-end; justify-content: center; padding: 0; }
    @media (min-width: 600px) { .am-overlay { align-items: center; padding: 20px; } }
    .am-sheet { background: #0f0f13; border: 1px solid rgba(255,255,255,0.08); border-radius: 24px 24px 0 0; width: 100%; max-width: 440px; max-height: 92vh; overflow-y: auto; animation: authSlideUp 0.3s cubic-bezier(0.16,1,0.3,1); padding-bottom: env(safe-area-inset-bottom, 24px); position: relative; }
    @media (min-width: 600px) { .am-sheet { border-radius: 24px; animation: authScaleIn 0.25s cubic-bezier(0.16,1,0.3,1); } }
    @keyframes authSlideUp { from { transform: translateY(100%); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
    @keyframes authScaleIn { from { transform: scale(0.95); opacity: 0; } to { transform: scale(1); opacity: 1; } }
    .am-handle { width: 40px; height: 4px; background: rgba(255,255,255,0.12); border-radius: 2px; margin: 12px auto 0; }
    .am-header { display: flex; align-items: center; justify-content: space-between; padding: 20px 24px 0; }
    .am-title { font-size: 20px; font-weight: 800; color: white; }
    .am-close { width: 32px; height: 32px; background: rgba(255,255,255,0.08); border: none; border-radius: 50%; cursor: pointer; display: flex; align-items: center; justify-content: center; color: rgba(255,255,255,0.6); transition: all 0.15s; }
    .am-close:hover { background: rgba(255,255,255,0.14); color: white; }
    .am-body { padding: 20px 24px 24px; }
    .am-label { font-size: 12px; font-weight: 700; color: rgba(255,255,255,0.45); text-transform: uppercase; letter-spacing: 0.08em; margin-bottom: 8px; display: block; }
    .am-input { width: 100%; background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1); border-radius: 12px; padding: 12px 16px; font-size: 15px; color: white; outline: none; transition: all 0.2s; box-sizing: border-box; }
    .am-input:focus { border-color: #7c3aed; background: rgba(255,255,255,0.08); box-shadow: 0 0 0 4px rgba(124,58,237,0.15); }
    .am-select { width: 100%; background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1); border-radius: 12px; padding: 12px 16px; font-size: 15px; color: white; outline: none; appearance: none; -webkit-appearance: none; background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='20' height='20' viewBox='0 0 24 24' fill='none' stroke='rgba(255,255,255,0.4)' stroke-width='2.5' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='M6 9l6 6 6-6'/%3E%3C/svg%3E"); background-repeat: no-repeat; background-position: right 14px center; background-size: 14px; }
    .am-select:focus { border-color: #7c3aed; }
    .am-select option { background: #1a1a2e; color: white; }
    .am-btn { width: 100%; padding: 14px; background: linear-gradient(135deg, #7c3aed, #4f46e5); border: none; border-radius: 12px; color: white; font-size: 15px; font-weight: 700; cursor: pointer; transition: all 0.2s; margin-top: 8px; }
    .am-btn:hover { opacity: 0.9; transform: translateY(-1px); box-shadow: 0 4px 15px rgba(124,58,237,0.4); }
    .am-btn:active { transform: translateY(0); }
    .am-btn-ghost { width: 100%; padding: 12px; background: transparent; border: 1px solid rgba(255,255,255,0.1); border-radius: 12px; color: rgba(255,255,255,0.6); font-size: 14px; font-weight: 600; cursor: pointer; transition: all 0.2s; }
    .am-btn-ghost:hover { background: rgba(255,255,255,0.05); color: white; border-color: rgba(255,255,255,0.2); }
    .am-divider { height: 1px; background: rgba(255,255,255,0.08); margin: 24px 0; position: relative; text-align: center; }
    .am-footer-link { color: #a78bfa; text-decoration: none; font-weight: 700; transition: color 0.15s; }
    .am-footer-link:hover { color: #c084fc; text-decoration: underline; }
    .am-check-label { display: flex; align-items: center; gap: 10px; cursor: pointer; font-size: 14px; color: rgba(255,255,255,0.6); margin: 16px 0; }
    .am-check-input { width: 18px; height: 18px; border-radius: 4px; border: 2px solid rgba(255,255,255,0.2); background: rgba(255,255,255,0.05); appearance: none; -webkit-appearance: none; cursor: pointer; position: relative; transition: all 0.2s; }
    .am-check-input:checked { background: #7c3aed; border-color: #7c3aed; }
    .am-check-input:checked::after { content: '✓'; position: absolute; color: white; font-size: 12px; left: 50%; top: 50%; transform: translate(-50%, -50%); }
    .am-pw-req { display: flex; align-items: center; gap: 6px; font-size: 11px; margin-bottom: 4px; transition: color 0.2s; }
    .password-requirement.valid { color: #10B981 !important; }
    .password-requirement.valid svg { color: #10B981 !important; }
</style>
`;

export function showAuthModal(type = 'signin', userType = 'client') {
    const isSignUp = type === 'signup';
    const modalContent = `
        ${AUTH_MODAL_STYLES}
        <div class="am-overlay" onclick="if(event.target === this) closeModal()">
            <div class="am-sheet">
                <div class="am-handle"></div>
                <div class="am-header">
                    <span class="am-title">${isSignUp ? 'Create account' : 'Welcome back'}</span>
                    <button class="am-close" onclick="closeModal()">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M18 6L6 18M6 6l12 12" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"/></svg>
                    </button>
                </div>

                <div class="am-body">
                    <form onsubmit="handleAuth(event, '${type}')" id="authForm">
                        ${isSignUp ? `
                            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 16px;">
                                <div>
                                    <label class="am-label">First name</label>
                                    <input type="text" name="firstName" class="am-input" required maxlength="50" placeholder="John">
                                </div>
                                <div>
                                    <label class="am-label">Last name</label>
                                    <input type="text" name="lastName" class="am-input" required maxlength="50" placeholder="Doe">
                                </div>
                            </div>

                            <div style="margin-bottom: 16px;">
                                <label class="am-label">I am a</label>
                                <select name="role" class="am-select" id="userTypeSelect" onchange="toggleCategoryField()">
                                    <option value="client" ${userType === 'client' ? 'selected' : ''}>Client (Ordering work)</option>
                                    <option value="creator" ${userType === 'creator' ? 'selected' : ''}>Creator (Offering services)</option>
                                </select>
                            </div>

                            <div style="margin-bottom: 16px; display: ${userType === 'creator' ? 'block' : 'none'};" id="categoryFieldGroup">
                                <label class="am-label">Category</label>
                                <select name="category" class="am-select" id="categorySelect">
                                    <option value="photographer">Photographer</option>
                                    <option value="designer">Designer</option>
                                    <option value="videographer">Videographer</option>
                                    <option value="illustrator">Illustrator</option>
                                    <option value="other">Other</option>
                                </select>
                            </div>
                        ` : ''}

                        <div style="margin-bottom: 16px;">
                            <label class="am-label">Email Address</label>
                            <input type="email" name="email" class="am-input" required placeholder="john@example.com">
                        </div>

                        <div style="margin-bottom: 16px;">
                            <label class="am-label">Password</label>
                            <div style="position: relative;">
                                <input type="password" name="password" class="am-input" id="passwordInput" required minlength="8" oninput="${isSignUp ? 'validatePassword()' : ''}" placeholder="••••••••" style="padding-right: 48px;">
                                <button type="button" onclick="togglePasswordVisibility('passwordInput', this)" style="position: absolute; right: 8px; top: 50%; transform: translateY(-50%); background: none; border: none; cursor: pointer; padding: 10px; color: rgba(255,255,255,0.4);">
                                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" class="eye-icon"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><circle cx="12" cy="12" r="3" stroke="currentColor" stroke-width="2"/></svg>
                                </button>
                            </div>
                            ${isSignUp ? `
                            <div id="passwordRequirements" style="margin-top: 10px;">
                                <div id="req-length" class="am-pw-req password-requirement" style="color: rgba(255,255,255,0.3);">
                                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="2.5"/><path d="M15 9l-6 6M9 9l6 6" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"/></svg>
                                    <span>At least 8 characters</span>
                                </div>
                                <div id="req-uppercase" class="am-pw-req password-requirement" style="color: rgba(255,255,255,0.3);">
                                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="2.5"/><path d="M15 9l-6 6M9 9l6 6" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"/></svg>
                                    <span>One uppercase letter</span>
                                </div>
                                <div id="req-number" class="am-pw-req password-requirement" style="color: rgba(255,255,255,0.3);">
                                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="2.5"/><path d="M15 9l-6 6M9 9l6 6" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"/></svg>
                                    <span>One number</span>
                                </div>
                            </div>
                            ` : ''}
                        </div>

                        ${isSignUp ? `
                        <div style="margin-bottom: 20px;">
                            <label class="am-label">Confirm Password</label>
                            <div style="position: relative;">
                                <input type="password" name="confirmPassword" class="am-input" id="confirmPasswordInput" required minlength="8" oninput="validatePasswordMatch()" placeholder="••••••••" style="padding-right: 48px;">
                                <button type="button" onclick="togglePasswordVisibility('confirmPasswordInput', this)" style="position: absolute; right: 8px; top: 50%; transform: translateY(-50%); background: none; border: none; cursor: pointer; padding: 10px; color: rgba(255,255,255,0.4);">
                                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" class="eye-icon"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><circle cx="12" cy="12" r="3" stroke="currentColor" stroke-width="2"/></svg>
                                </button>
                            </div>
                            <div id="passwordMatchError" style="color: #EF4444; font-size: 11px; margin-top: 6px; display: none; font-weight: 600;">Passwords do not match</div>
                        </div>

                        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 16px;">
                            <div>
                                <label class="am-label">Local Area</label>
                                <input type="text" name="localArea" class="am-input" placeholder="e.g. Wuye" required>
                            </div>
                            <div>
                                <label class="am-label">State/Region</label>
                                <input type="text" name="state" class="am-input" placeholder="e.g. FCT" required>
                            </div>
                        </div>

                        <div style="margin-bottom: 16px;">
                            <label class="am-label">Country</label>
                            <select name="country" id="countrySelect" class="am-select" required>
                                <option value="">Select your country</option>
                            </select>
                        </div>

                        <label class="am-check-label">
                            <input type="checkbox" required class="am-check-input">
                            <span>I accept the <a href="#" class="am-footer-link">Terms & Conditions</a></span>
                        </label>
                        ` : `
                        <div style="display: flex; justify-content: space-between; align-items: center; margin: 20px 0;">
                            <label class="am-check-label" style="margin: 0;">
                                <input type="checkbox" name="rememberMe" id="rememberMeCheckbox" class="am-check-input">
                                <span>Remember me</span>
                            </label>
                            <a href="#" class="am-footer-link" style="font-size: 13px;">Forgot password?</a>
                        </div>
                        `}

                        <button type="submit" class="am-btn" id="authSubmitBtn">${isSignUp ? 'Create account' : 'Sign in'}</button>
                    </form>

                    <div class="am-divider"></div>

                    <div style="text-align: center;">
                        <span style="color: rgba(255,255,255,0.4); font-size: 14px;">
                            ${isSignUp ? 'Already have an account?' : "Don't have an account?"}
                        </span>
                        <a href="#" onclick="showAuthModal('${isSignUp ? 'signin' : 'signup'}'); return false;" class="am-footer-link" style="margin-left: 5px;">
                            ${isSignUp ? 'Sign in' : 'Create account'}
                        </a>
                    </div>

                    ${!isSignUp ? `
                        <button class="am-btn-ghost" onclick="navigateToPage('home'); closeModal();" style="margin-top: 16px;">Continue as guest</button>
                    ` : ''}
                </div>
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
    updateRequirementUI(lengthReq, password.length >= 8);

    const uppercaseReq = document.getElementById('req-uppercase');
    updateRequirementUI(uppercaseReq, /[A-Z]/.test(password));

    const numberReq = document.getElementById('req-number');
    updateRequirementUI(numberReq, /\d/.test(password));
}

function updateRequirementUI(element, isValid) {
    if (!element) return;
    if (isValid) {
        element.classList.add('valid');
        element.innerHTML = `
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="2.5"/><path d="M9 12l2 2 4-4" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"/></svg>
            <span>${element.querySelector('span').innerText}</span>
        `;
    } else {
        element.classList.remove('valid');
        element.innerHTML = `
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="2.5"/><path d="M15 9l-6 6M9 9l6 6" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"/></svg>
            <span>${element.querySelector('span').innerText}</span>
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
        ${AUTH_MODAL_STYLES}
        <div class="am-overlay" onclick="if(event.target === this) skipVerification('${userRole}')">
            <div class="am-sheet" style="max-width: 400px;">
                <div class="am-handle"></div>
                <div class="am-header">
                    <span class="am-title">Verify email</span>
                    <button class="am-close" onclick="skipVerification('${userRole}')">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M18 6L6 18M6 6l12 12" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"/></svg>
                    </button>
                </div>

                <div class="am-body">
                    <div style="text-align: center; margin-bottom: 24px;">
                        <div style="width: 64px; height: 64px; background: rgba(124,58,237,0.1); border-radius: 20px; display: flex; align-items: center; justify-content: center; margin: 0 auto 16px;">
                            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" style="color: #a78bfa;"><path d="M21 8l-7.89 5.26a2 2 0 01-2.22 0L3 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>
                        </div>
                        <p style="color: rgba(255,255,255,0.6); font-size: 14px; line-height: 1.6;">
                            Enter the 6-digit code sent to<br>
                            <strong style="color: white;">${email}</strong>
                        </p>
                    </div>

                    <form onsubmit="handleEmailVerification(event, '${userRole}')">
                        <div style="margin-bottom: 24px;">
                            <input
                                type="text"
                                name="code"
                                class="am-input"
                                placeholder="0 0 0 0 0 0"
                                required
                                maxlength="6"
                                pattern="[0-9]{1,6}"
                                style="text-align: center; font-size: 28px; letter-spacing: 12px; font-weight: 800; font-family: monospace; padding: 16px;"
                                inputmode="numeric"
                            >
                            <p style="text-align: center; font-size: 12px; color: rgba(255,255,255,0.3); margin-top: 12px;">Code expires in 30 minutes</p>
                        </div>

                        <button type="submit" class="am-btn">Verify Account</button>
                    </form>

                    <div class="am-divider"></div>

                    <div style="text-align: center; margin-bottom: 12px;">
                        <p style="color: rgba(255,255,255,0.4); font-size: 13px;">
                            Didn't receive the code?
                            <button type="button" onclick="handleResendVerification()" class="am-footer-link" style="background: none; border: none; padding: 0; font-family: inherit; cursor: pointer;">Resend</button>
                        </p>
                    </div>

                    <button class="am-btn-ghost" onclick="skipVerification('${userRole}')">Skip for now</button>
                </div>
            </div>
        </div>
    `;
    openModal(modalContent);
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
        ${AUTH_MODAL_STYLES}
        <style>
            .faq-card { background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.08); border-radius: 16px; margin-bottom: 20px; overflow: hidden; }
            .faq-item { border-bottom: 1px solid rgba(255,255,255,0.06); }
            .faq-item:last-child { border-bottom: none; }
            .faq-item summary { padding: 16px 20px; cursor: pointer; display: flex; align-items: center; justify-content: space-between; font-weight: 700; color: white; list-style: none; user-select: none; }
            .faq-item summary::-webkit-details-marker { display: none; }
            .faq-item summary .chevron { color: rgba(255,255,255,0.3); transition: transform 0.2s; }
            .faq-item[open] summary .chevron { transform: rotate(180deg); color: #a78bfa; }
            .faq-content { padding: 0 20px 16px; font-size: 14px; color: rgba(255,255,255,0.5); line-height: 1.6; }
            .contact-chip { display: flex; align-items: center; gap: 12px; background: rgba(124,58,237,0.1); border: 1px solid rgba(124,58,237,0.2); border-radius: 12px; padding: 16px; margin-bottom: 24px; text-decoration: none; }
        </style>
        <div class="am-overlay" onclick="if(event.target === this) closeModal()">
            <div class="am-sheet">
                <div class="am-handle"></div>
                <div class="am-header">
                    <span class="am-title">Help & Support</span>
                    <button class="am-close" onclick="closeModal()">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M18 6L6 18M6 6l12 12" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"/></svg>
                    </button>
                </div>

                <div class="am-body">
                    <div style="text-align: center; margin-bottom: 24px;">
                        <h3 style="margin-bottom: 8px;">How can we help?</h3>
                        <p style="color: rgba(255,255,255,0.45); font-size: 14px;">Contact us or find answers in our FAQ</p>
                    </div>

                    <a href="mailto:contact@myartelab.com" class="contact-chip">
                        <div style="width: 40px; height: 40px; border-radius: 10px; background: #7c3aed; display: flex; align-items: center; justify-content: center; color: white;">
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none"><path d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>
                        </div>
                        <div style="flex: 1;">
                            <div style="font-weight: 700; font-size: 15px; color: white;">Email Support</div>
                            <div style="font-size: 13px; color: #a78bfa;">contact@myartelab.com</div>
                        </div>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" style="color: rgba(255,255,255,0.2);"><path d="M9 18l6-6-6-6" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>
                    </a>

                    <div class="am-label">Common Questions</div>
                    <div class="faq-card">
                        <details class="faq-item">
                            <summary>
                                <span>How do I get started as a creator?</span>
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" class="chevron"><path d="M6 9l6 6 6-6" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"/></svg>
                            </summary>
                            <div class="faq-content">Sign up as a creator, verify your email, and go to settings to complete your profile with your portfolio and services.</div>
                        </details>
                        <details class="faq-item">
                            <summary>
                                <span>How do payments work?</span>
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" class="chevron"><path d="M6 9l6 6 6-6" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"/></svg>
                            </summary>
                            <div class="faq-content">Clients pay via their wallet. The funds are held in escrow until the creator submits the work and the client approves it.</div>
                        </details>
                        <details class="faq-item">
                            <summary>
                                <span>How do I withdraw my earnings?</span>
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" class="chevron"><path d="M6 9l6 6 6-6" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"/></svg>
                            </summary>
                            <div class="faq-content">You can withdraw your completed earnings to your bank account or crypto wallet via the Wallet page.</div>
                        </details>
                    </div>

                    <button class="am-btn" onclick="closeModal()">Close</button>
                </div>
            </div>
        </div>
    `;
    openModal(modalContent);
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
