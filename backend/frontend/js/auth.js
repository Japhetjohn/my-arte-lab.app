// Authentication Module
import { appState, setUser, clearUser } from './state.js';
import { navigateToPage } from './navigation.js';
import { showToast, closeModal, openModal } from './utils.js';
import api from './services/api.js';
import { getAvatarUrl } from './utils/avatar.js';

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

                <form onsubmit="handleAuth(event, '${type}')">
                    ${isSignUp ? `
                        <div class="form-group">
                            <label class="form-label">Full name</label>
                            <input type="text" name="name" class="form-input" required>
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
                        <input type="password" name="password" class="form-input" required minlength="8" pattern="^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d)(?=.*[@$!%*?&_\\-#]).{8,}$">
                        ${isSignUp ? `<small style="color: var(--text-secondary); font-size: 12px; margin-top: 4px; display: block;">Must be at least 8 characters with uppercase, lowercase, number, and special character (@$!%*?&_-#)</small>` : ''}
                    </div>

                    ${isSignUp ? `
                        <div class="form-group">
                            <label class="form-label">Country</label>
                            <select name="country" class="form-select">
                                <option value="">Select your country</option>
                                <optgroup label="Africa">
                                    <option>Algeria</option>
                                    <option>Angola</option>
                                    <option>Benin</option>
                                    <option>Botswana</option>
                                    <option>Burkina Faso</option>
                                    <option>Burundi</option>
                                    <option>Cameroon</option>
                                    <option>Cape Verde</option>
                                    <option>Chad</option>
                                    <option>Comoros</option>
                                    <option>Congo</option>
                                    <option>Côte d'Ivoire</option>
                                    <option>Egypt</option>
                                    <option>Ethiopia</option>
                                    <option>Gabon</option>
                                    <option>Gambia</option>
                                    <option>Ghana</option>
                                    <option>Guinea</option>
                                    <option>Kenya</option>
                                    <option>Lesotho</option>
                                    <option>Liberia</option>
                                    <option>Libya</option>
                                    <option>Madagascar</option>
                                    <option>Malawi</option>
                                    <option>Mali</option>
                                    <option>Mauritania</option>
                                    <option>Mauritius</option>
                                    <option>Morocco</option>
                                    <option>Mozambique</option>
                                    <option>Namibia</option>
                                    <option>Niger</option>
                                    <option>Nigeria</option>
                                    <option>Rwanda</option>
                                    <option>Senegal</option>
                                    <option>Seychelles</option>
                                    <option>Sierra Leone</option>
                                    <option>Somalia</option>
                                    <option>South Africa</option>
                                    <option>South Sudan</option>
                                    <option>Sudan</option>
                                    <option>Tanzania</option>
                                    <option>Togo</option>
                                    <option>Tunisia</option>
                                    <option>Uganda</option>
                                    <option>Zambia</option>
                                    <option>Zimbabwe</option>
                                </optgroup>
                                <optgroup label="Americas">
                                    <option>Argentina</option>
                                    <option>Brazil</option>
                                    <option>Canada</option>
                                    <option>Chile</option>
                                    <option>Colombia</option>
                                    <option>Mexico</option>
                                    <option>Peru</option>
                                    <option>United States</option>
                                    <option>Venezuela</option>
                                </optgroup>
                                <optgroup label="Asia">
                                    <option>China</option>
                                    <option>India</option>
                                    <option>Indonesia</option>
                                    <option>Japan</option>
                                    <option>Malaysia</option>
                                    <option>Pakistan</option>
                                    <option>Philippines</option>
                                    <option>Singapore</option>
                                    <option>South Korea</option>
                                    <option>Thailand</option>
                                    <option>United Arab Emirates</option>
                                    <option>Vietnam</option>
                                </optgroup>
                                <optgroup label="Europe">
                                    <option>France</option>
                                    <option>Germany</option>
                                    <option>Italy</option>
                                    <option>Netherlands</option>
                                    <option>Portugal</option>
                                    <option>Spain</option>
                                    <option>United Kingdom</option>
                                </optgroup>
                                <optgroup label="Oceania">
                                    <option>Australia</option>
                                    <option>New Zealand</option>
                                </optgroup>
                            </select>
                        </div>

                        <div class="form-group">
                            <label style="display: flex; align-items: center; gap: 8px; cursor: pointer;">
                                <input type="checkbox" required>
                                <span>I accept the terms and conditions</span>
                            </label>
                        </div>
                    ` : ''}

                    <div class="form-actions">
                        <button type="submit" class="btn-primary">${isSignUp ? 'Create account' : 'Sign in'}</button>
                    </div>
                </form>

                <div style="margin-top: 16px; text-align: center; padding-top: 16px; border-top: 1px solid var(--border);">
                    <button class="btn-secondary" style="width: 100%;" onclick="${isSignUp ? 'handleGoogleSignUp()' : 'handleGoogleSignIn()'}">
                        <svg width="18" height="18" viewBox="0 0 18 18" style="margin-right: 8px; vertical-align: middle;">
                            <path fill="#4285F4" d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.874 2.684-6.615z"/>
                            <path fill="#34A853" d="M9 18c2.43 0 4.467-.806 5.956-2.184l-2.908-2.258c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332C2.438 15.983 5.482 18 9 18z"/>
                            <path fill="#FBBC05" d="M3.964 10.707c-.18-.54-.282-1.117-.282-1.707s.102-1.167.282-1.707V4.961H.957C.347 6.175 0 7.55 0 9s.348 2.825.957 4.039l3.007-2.332z"/>
                            <path fill="#EA4335" d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0 5.482 0 2.438 2.017.957 4.961L3.964 7.293C4.672 5.163 6.656 3.58 9 3.58z"/>
                        </svg>
                        ${isSignUp ? 'Sign up' : 'Continue'} with Google
                    </button>
                </div>

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
                        <button class="btn-ghost" onclick="navigateToPage('discover'); closeModal();">Browse as guest</button>
                    </div>
                ` : ''}
            </div>
        </div>
    `;

    document.getElementById('modalsContainer').innerHTML = modalContent;
    openModal();
}

export async function handleAuth(event, type) {
    event.preventDefault();

    const form = event.target;
    const submitBtn = form.querySelector('button[type="submit"]');
    const originalBtnText = submitBtn.textContent;

    // Disable button and show loading state
    submitBtn.disabled = true;
    submitBtn.textContent = type === 'signup' ? 'Creating account...' : 'Signing in...';

    try {
        const formData = new FormData(form);

        if (type === 'signup') {
            const userData = {
                name: formData.get('name'),
                role: formData.get('role') || 'client',
                email: formData.get('email'),
                password: formData.get('password')
            };

            // Add category if user is signing up as creator
            if (userData.role === 'creator') {
                userData.category = formData.get('category') || 'other';
            }

            // Add location if country is provided
            const country = formData.get('country');
            if (country) {
                userData.location = {
                    country: country
                };
            }

            const response = await api.register(userData);

            if (response.success) {
                setUser(response.data.user);

                updateUserMenu();
                closeModal();

                // Show email verification modal
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
                navigateToPage('discover');
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
        // Ignore logout errors
    } finally {
        // Clear notification interval to prevent memory leak
        if (window.notificationInterval) {
            clearInterval(window.notificationInterval);
            window.notificationInterval = null;
        }

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

    if (token) {
        try {
            const response = await api.getMe();

            if (response.success && response.data.user) {
                setUser(response.data.user);
                updateUserMenu();
                return response.data.user;
            }
        } catch (error) {
            api.setToken(null);
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

        // Show user avatar dropdown with professional fallback
        const avatarUrl = getAvatarUrl(appState.user);
        userMenuContainer.innerHTML = `
            <button class="user-avatar-btn" id="userAvatarBtn">
                <img src="${avatarUrl}" alt="${appState.user.name}" class="avatar avatar-medium">
                <span>${appState.user.name.split(' ')[0]}</span>
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                    <path d="M4 6l4 4 4-4" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
                </svg>
            </button>
            <div class="user-dropdown" id="userDropdown">
                <div class="user-dropdown-header">
                    <div class="user-dropdown-name">${appState.user.name}</div>
                    <div class="user-dropdown-email">${appState.user.email}</div>
                </div>
                <button class="user-dropdown-item" onclick="navigateToPage('profile')">
                    <svg viewBox="0 0 24 24" fill="none">
                        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" stroke="currentColor" stroke-width="2"/>
                        <circle cx="12" cy="7" r="4" stroke="currentColor" stroke-width="2"/>
                    </svg>
                    My profile
                </button>
                <button class="user-dropdown-item" onclick="navigateToPage('bookings')">
                    <svg viewBox="0 0 24 24" fill="none">
                        <rect x="3" y="4" width="18" height="18" rx="2" stroke="currentColor" stroke-width="2"/>
                        <path d="M16 2v4M8 2v4M3 10h18" stroke="currentColor" stroke-width="2"/>
                    </svg>
                    My bookings
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
                <button class="user-dropdown-item" onclick="closeUserDropdown()">
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

        // Add click listener to toggle dropdown
        document.getElementById('userAvatarBtn')?.addEventListener('click', (e) => {
            e.stopPropagation();
            document.getElementById('userDropdown')?.classList.toggle('active');
        });

        // Close dropdown when clicking outside
        document.addEventListener('click', (e) => {
            const dropdown = document.getElementById('userDropdown');
            const btn = document.getElementById('userAvatarBtn');
            if (dropdown && !dropdown.contains(e.target) && !btn?.contains(e.target)) {
                dropdown.classList.remove('active');
            }
        });

        // Show notifications button and update badge
        const notificationsBtn = document.getElementById('notificationsBtn');
        if (notificationsBtn) {
            notificationsBtn.style.display = 'flex';
            notificationsBtn.addEventListener('click', () => navigateToPage('notifications'));
        }

        // Update notification badge
        updateNotificationBadge();

        // Update notification badge every 30 seconds
        if (!window.notificationInterval) {
            window.notificationInterval = setInterval(updateNotificationBadge, 30000);
        }
    } else {
        // Hide notifications button when logged out
        const notificationsBtn = document.getElementById('notificationsBtn');
        if (notificationsBtn) {
            notificationsBtn.style.display = 'none';
        }

        // Clear notification interval
        if (window.notificationInterval) {
            clearInterval(window.notificationInterval);
            window.notificationInterval = null;
        }

        // Show sign in button
        userMenuContainer.innerHTML = `<button class="btn-secondary" id="authBtn">Sign in</button>`;
        document.getElementById('authBtn')?.addEventListener('click', () => showAuthModal('signin'));
    }
}

async function updateNotificationBadge() {
    try {
        const response = await api.getUnreadNotificationCount();
        if (response.success) {
            const unreadCount = response.data.unreadCount || 0;
            const badge = document.querySelector('.notification-badge');
            if (badge) {
                if (unreadCount > 0) {
                    badge.textContent = unreadCount > 99 ? '99+' : unreadCount;
                    badge.style.display = 'flex';
                } else {
                    badge.style.display = 'none';
                }
            }
        }
    } catch (error) {
        // Ignore notification badge errors
    }
}

/**
 * Handle Google Sign-Up (with role selection)
 */
export function handleGoogleSignUp() {
    const modalContent = `
        <div class="modal" onclick="closeModalOnBackdrop(event)">
            <div class="modal-content">
                <div class="modal-header">
                    <h2>Sign up with Google</h2>
                    <button class="icon-btn" onclick="closeModal()">
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                            <path d="M18 6L6 18M6 6l12 12" stroke="currentColor" stroke-width="2"/>
                        </svg>
                    </button>
                </div>

                <p style="margin-bottom: 24px; color: var(--text-secondary);">
                    Choose how you want to use MyArteLab
                </p>

                <div style="display: flex; flex-direction: column; gap: 12px;">
                    <button class="btn-primary" onclick="proceedWithGoogleOAuth('client')" style="padding: 16px; text-align: left; display: flex; align-items: center; gap: 12px;">
                        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" style="flex-shrink: 0;">
                            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" stroke="white" stroke-width="2" stroke-linecap="round"/>
                            <circle cx="12" cy="7" r="4" stroke="white" stroke-width="2"/>
                        </svg>
                        <div>
                            <div style="font-weight: 600; font-size: 16px;">Continue as Client</div>
                            <div style="font-size: 13px; opacity: 0.8; margin-top: 2px;">Book and hire creative professionals</div>
                        </div>
                    </button>

                    <button class="btn-secondary" onclick="proceedWithGoogleOAuth('creator')" style="padding: 16px; text-align: left; display: flex; align-items: center; gap: 12px;">
                        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" style="flex-shrink: 0;">
                            <path d="M12 2L2 7l10 5 10-5-10-5z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                            <path d="M2 17l10 5 10-5M2 12l10 5 10-5" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                        </svg>
                        <div>
                            <div style="font-weight: 600; font-size: 16px;">Continue as Creator</div>
                            <div style="font-size: 13px; opacity: 0.8; margin-top: 2px;">Offer your services and get booked</div>
                        </div>
                    </button>
                </div>

                <div style="margin-top: 16px; text-align: center;">
                    <p class="text-secondary" style="font-size: 14px;">
                        Already have an account?
                        <a href="#" onclick="showAuthModal('signin'); return false;" style="color: var(--primary); text-decoration: none; font-weight: 500;">
                            Sign in
                        </a>
                    </p>
                </div>
            </div>
        </div>
    `;

    document.getElementById('modalsContainer').innerHTML = modalContent;
    openModal();
}

/**
 * Proceed with Google OAuth after role selection
 */
function proceedWithGoogleOAuth(role) {
    // Auto-detect environment
    const isDevelopment = window.location.hostname === 'localhost' ||
                          window.location.hostname === '127.0.0.1' ||
                          window.location.hostname.startsWith('192.168');

    const API_URL = isDevelopment
        ? 'http://localhost:5000'
        : window.location.origin;

    window.location.href = `${API_URL}/api/auth/google?mode=signup&role=${role}`;
}

/**
 * Handle Google Sign-In (existing users)
 * Redirects to backend Google OAuth endpoint
 */
export function handleGoogleSignIn() {
    // Auto-detect environment
    const isDevelopment = window.location.hostname === 'localhost' ||
                          window.location.hostname === '127.0.0.1' ||
                          window.location.hostname.startsWith('192.168');

    const API_URL = isDevelopment
        ? 'http://localhost:5000'
        : window.location.origin;

    window.location.href = `${API_URL}/api/auth/google?mode=signin`;
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
            // Update user in state to mark as verified
            if (appState.user) {
                appState.user.isEmailVerified = true;
                setUser(appState.user);
            }

            closeModal();
            showToast('Email verified successfully!', 'success');

            // Navigate based on role
            if (userRole === 'creator') {
                navigateToPage('settings');
                showToast('Complete your profile to start receiving bookings', 'info');
            } else {
                navigateToPage('discover');
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
        navigateToPage('discover');
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

// Make functions globally available for onclick handlers
window.handleGoogleSignIn = handleGoogleSignIn;
window.handleGoogleSignUp = handleGoogleSignUp;
window.proceedWithGoogleOAuth = proceedWithGoogleOAuth;
window.handleEmailVerification = handleEmailVerification;
window.handleResendVerification = handleResendVerification;
window.skipVerification = skipVerification;
window.toggleCategoryField = toggleCategoryField;
