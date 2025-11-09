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
                            <select name="role" class="form-select" id="userTypeSelect">
                                <option value="client" ${userType === 'client' ? 'selected' : ''}>Client</option>
                                <option value="creator" ${userType === 'creator' ? 'selected' : ''}>Creator</option>
                            </select>
                        </div>
                    ` : ''}

                    <div class="form-group">
                        <label class="form-label">Email</label>
                        <input type="email" name="email" class="form-input" required>
                    </div>

                    <div class="form-group">
                        <label class="form-label">Password</label>
                        <input type="password" name="password" class="form-input" required minlength="8">
                        ${isSignUp ? `<small style="color: var(--text-secondary); font-size: 12px; margin-top: 4px; display: block;">Must be at least 8 characters with uppercase, lowercase, and a number</small>` : ''}
                    </div>

                    ${isSignUp ? `
                        <div class="form-group">
                            <label class="form-label">Country</label>
                            <select name="country" class="form-select">
                                <option>Nigeria</option>
                                <option>Ghana</option>
                                <option>Kenya</option>
                                <option>South Africa</option>
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

            // Add location if country is provided
            const country = formData.get('country');
            if (country) {
                userData.location = {
                    country: country
                };
            }

            console.log('📝 REGISTRATION ATTEMPT - Form Data:', {
                name: userData.name,
                email: userData.email,
                role: userData.role,
                hasPassword: !!userData.password,
                passwordLength: userData.password?.length
            });

            const response = await api.register(userData);

            console.log('📨 REGISTRATION RESPONSE:', response);
            console.log('✅ Response Success:', response.success);
            console.log('👤 User Data in Response:', response.data?.user);

            if (response.success) {
                console.log('🎉 REGISTRATION SUCCESSFUL! Setting user in appState...');
                console.log('User object being set:', response.data.user);

                setUser(response.data.user);

                console.log('📱 Current appState.user after setUser:', appState.user);
                console.log('📱 User name:', appState.user?.name);
                console.log('📱 User email:', appState.user?.email);

                updateUserMenu();
                closeModal();
                showToast('Account created successfully! Please check your email to verify your account.', 'success');

                // Navigate based on role
                if (userData.role === 'creator') {
                    navigateToPage('settings');
                    showToast('Complete your profile to start receiving bookings', 'info');
                } else {
                    navigateToPage('discover');
                }
            } else {
                console.error('❌ REGISTRATION FAILED:', response);
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
        console.error('Authentication error:', error);
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
        console.error('Logout error:', error);
    } finally {
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
            console.error('Failed to restore session:', error);
            api.setToken(null);
            clearUser();
        }
    }

    updateUserMenu();
    return null;
}

export function updateUserMenu() {
    console.log('🔄 updateUserMenu() called');
    console.log('📱 Current appState.user:', appState.user);

    const userMenuContainer = document.getElementById('userMenuContainer');
    if (!userMenuContainer) {
        console.warn('⚠️ userMenuContainer not found in DOM!');
        return;
    }

    if (appState.user) {
        console.log('✅ User is logged in, rendering user menu');
        console.log('👤 User name to display:', appState.user.name);
        console.log('📧 User email to display:', appState.user.email);
        console.log('🖼️ User avatar:', appState.user.avatar);

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
                <button class="user-dropdown-item" onclick="navigateToPage('settings')">
                    <svg viewBox="0 0 24 24" fill="none">
                        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" stroke="currentColor" stroke-width="2"/>
                        <circle cx="12" cy="7" r="4" stroke="currentColor" stroke-width="2"/>
                    </svg>
                    My profile
                </button>
                <button class="user-dropdown-item" onclick="navigateToPage('wallet')">
                    <svg viewBox="0 0 24 24" fill="none">
                        <path d="M21 12V7a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-5z" stroke="currentColor" stroke-width="2"/>
                        <path d="M18 12h.01" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
                    </svg>
                    Wallet
                </button>
                <button class="user-dropdown-item" onclick="navigateToPage('bookings')">
                    <svg viewBox="0 0 24 24" fill="none">
                        <rect x="3" y="4" width="18" height="18" rx="2" stroke="currentColor" stroke-width="2"/>
                        <path d="M16 2v4M8 2v4M3 10h18" stroke="currentColor" stroke-width="2"/>
                    </svg>
                    My bookings
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
    } else {
        // Show sign in button
        userMenuContainer.innerHTML = `<button class="btn-secondary" id="authBtn">Sign in</button>`;
        document.getElementById('authBtn')?.addEventListener('click', () => showAuthModal('signin'));
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
                        <div style="font-size: 24px;">👤</div>
                        <div>
                            <div style="font-weight: 600; font-size: 16px;">Continue as Client</div>
                            <div style="font-size: 13px; opacity: 0.8; margin-top: 2px;">Book and hire creative professionals</div>
                        </div>
                    </button>

                    <button class="btn-secondary" onclick="proceedWithGoogleOAuth('creator')" style="padding: 16px; text-align: left; display: flex; align-items: center; gap: 12px;">
                        <div style="font-size: 24px;">🎨</div>
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
    const API_URL = 'http://localhost:5000';
    window.location.href = `${API_URL}/api/auth/google?role=${role}`;
}

/**
 * Handle Google Sign-In (existing users)
 * Redirects to backend Google OAuth endpoint
 */
export function handleGoogleSignIn() {
    const API_URL = 'http://localhost:5000';
    window.location.href = `${API_URL}/api/auth/google`;
}

// Make functions globally available for onclick handlers
window.handleGoogleSignIn = handleGoogleSignIn;
window.handleGoogleSignUp = handleGoogleSignUp;
window.proceedWithGoogleOAuth = proceedWithGoogleOAuth;
