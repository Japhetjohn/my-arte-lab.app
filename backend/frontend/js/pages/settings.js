import { appState, setUser } from '../state.js';
import api from '../services/api.js';
import { showToast } from '../utils.js';

const SETTINGS_STYLES = `
<style>
    .st-container { max-width: 680px; margin: 0 auto; padding: 32px 20px 60px; display: flex; flex-direction: column; gap: 32px; }
    @media (max-width: 768px) { .st-container { padding: 24px 16px; } }
    
    .st-nav { display: none; } /* Simplified to single column for redesign consistency */
    
    .st-content { display: flex; flex-direction: column; gap: 32px; }
    .st-title { font-size: 26px; font-weight: 700; color: var(--text-primary); margin: 0 0 4px; }
    .st-section { background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.08); border-radius: 24px; padding: 24px; }
    .st-section-title { font-size: 16px; font-weight: 700; color: var(--text-primary); margin-bottom: 24px; display: flex; align-items: center; gap: 10px; }
    
    .st-label { font-size: 11px; font-weight: 700; color: var(--text-secondary); text-transform: uppercase; letter-spacing: 0.1em; margin-bottom: 8px; display: block; opacity: 0.7; }
    .st-input { width: 100%; background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.1); border-radius: 12px; padding: 12px 16px; color: var(--text-primary); font-size: 14px; transition: all 0.2s; }
    .st-input:focus { border-color: var(--primary); background: rgba(255,255,255,0.05); outline: none; box-shadow: 0 0 0 4px rgba(151,71,255,0.1); }
    
    .st-item { display: flex; align-items: center; justify-content: space-between; padding: 16px 0; border-bottom: 1px solid rgba(255,255,255,0.06); }
    .st-item:last-child { border-bottom: none; }
    .st-item-info { display: flex; flex-direction: column; gap: 4px; }
    .st-item-title { font-size: 14px; font-weight: 600; color: var(--text-primary); }
    .st-item-desc { font-size: 12px; color: var(--text-secondary); opacity: 0.6; }
    
    .st-avatar-group { display: flex; align-items: center; gap: 20px; margin-bottom: 28px; }
    .st-avatar-preview { width: 72px; height: 72px; border-radius: 20px; object-fit: cover; border: 2px solid rgba(255,255,255,0.1); background: var(--background-alt); }
    .st-avatar-btn { padding: 8px 16px; background: rgba(151,71,255,0.08); border: 1px solid rgba(151,71,255,0.2); border-radius: 10px; color: var(--primary); font-size: 12px; font-weight: 700; cursor: pointer; transition: all 0.2s; }
    .st-avatar-btn:hover { background: rgba(151,71,255,0.12); }
    
    .st-toggle { position: relative; width: 40px; height: 22px; background: rgba(0,0,0,0.1); border-radius: 20px; cursor: pointer; transition: all 0.3s; border: 1px solid rgba(255,255,255,0.05); }
    .st-toggle::after { content: ''; position: absolute; top: 2px; left: 2px; width: 16px; height: 16px; background: white; border-radius: 50%; transition: all 0.3s; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
    input:checked + .st-toggle { background: var(--primary); }
    input:checked + .st-toggle::after { left: 20px; }
    
    .st-danger-banner { background: rgba(239,68,68,0.04); border: 1px solid rgba(239,68,68,0.15); border-radius: 20px; padding: 24px; margin-top: 16px; }
</style>
`;

export function renderSettingsPage() {
    const mainContent = document.getElementById('mainContent');

    if (!appState.user) {
        mainContent.innerHTML = `
            ${SETTINGS_STYLES}
            <div style="text-align: center; padding: 100px 24px; max-width: 440px; margin: 0 auto;">
                <div style="font-size: 64px; margin-bottom: 24px; opacity: 0.2;">👤</div>
                <h2 style="color: var(--text-primary); margin-bottom: 12px; font-weight: 700;">Sign in to view settings</h2>
                <p style="color: var(--text-secondary); margin-bottom: 32px; opacity: 0.7;">Please authenticate to manage your profile and account.</p>
                <button class="btn-primary" onclick="showAuthModal('signin')" style="height: 48px; padding: 0 40px; border-radius: 12px;">Sign In</button>
            </div>
        `;
        return;
    }

    const userAvatar = appState.user.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(appState.user.name || 'User')}&background=9747FF&color=fff&bold=true&size=200`;

    mainContent.innerHTML = `
        ${SETTINGS_STYLES}
        <div class="st-container">
            <!-- Main Content -->
            <div class="st-content">
                <div style="margin-bottom: 8px;">
                    <h1 class="st-title">Settings</h1>
                    <p style="color: var(--text-secondary); font-size: 15px; margin: 0; opacity: 0.7;">Manage your account preferences and professional profile.</p>
                </div>

                <!-- Profile Section -->
                <section class="st-section" id="profile-section">
                    <h2 class="st-section-title">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--primary)" stroke-width="2.5"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
                        Personal Information
                    </h2>

                    <div class="st-avatar-group">
                        <img src="${userAvatar}" class="st-avatar-preview" id="avatarPreview">
                        <div>
                            <button class="st-avatar-btn" onclick="handleAvatarUpload()">Change Photo</button>
                            <p style="font-size: 11px; color: var(--text-secondary); margin-top: 8px; opacity: 0.5;">JPG, PNG or GIF. Max 5MB.</p>
                        </div>
                    </div>

                    <form onsubmit="handleProfileUpdate(event)" style="display: flex; flex-direction: column; gap: 24px;">
                        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px;">
                            <div>
                                <label class="st-label">First Name</label>
                                <input type="text" class="st-input" value="${appState.user.firstName || ''}" id="profileFirstName" required>
                            </div>
                            <div>
                                <label class="st-label">Last Name</label>
                                <input type="text" class="st-input" value="${appState.user.lastName || ''}" id="profileLastName" required>
                            </div>
                        </div>

                        <div>
                            <label class="st-label">Email Address</label>
                            <input type="email" class="st-input" value="${appState.user.email}" id="profileEmail" required>
                        </div>

                        <div>
                            <label class="st-label">Phone Number</label>
                            <input type="tel" class="st-input" value="${appState.user.phoneNumber || ''}" id="profilePhone" placeholder="+234...">
                        </div>

                        <div style="display: grid; grid-template-columns: 1fr 1fr 1.5fr; gap: 16px;">
                            <div>
                                <label class="st-label">Local Area</label>
                                <input type="text" class="st-input" value="${appState.user.location?.localArea || ''}" id="profileLocalArea" required>
                            </div>
                            <div>
                                <label class="st-label">State</label>
                                <input type="text" class="st-input" value="${appState.user.location?.state || ''}" id="profileState" required>
                            </div>
                            <div>
                                <label class="st-label">Country</label>
                                <input type="text" class="st-input" value="${appState.user.location?.country || ''}" id="profileCountry" required>
                            </div>
                        </div>

                        ${appState.user.role === 'creator' ? `
                            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px;">
                                <div>
                                    <label class="st-label">Professional Title</label>
                                    <input type="text" class="st-input" value="${appState.user.category || ''}" id="profileRole" placeholder="e.g. Visual Artist">
                                </div>
                                <div>
                                    <label class="st-label">Skills (Comma separated)</label>
                                    <input type="text" class="st-input" value="${(appState.user.skills || []).join(', ')}" id="profileSkills" placeholder="Design, UI/UX...">
                                </div>
                            </div>
                        ` : ''}

                        <div>
                            <label class="st-label">Bio (Short summary of your profile)</label>
                            <textarea class="st-input" id="profileBio" style="min-height: 100px; resize: vertical; line-height: 1.6;">${appState.user.bio || ''}</textarea>
                        </div>
                        
                        <div style="margin-top: 12px; display: flex; justify-content: flex-end; border-top: 1px solid rgba(255,255,255,0.06); padding-top: 24px;">
                            <button type="submit" class="btn-primary" style="height: 48px; min-width: 200px; border-radius: 12px; font-weight: 700;">Save Profile Changes</button>
                        </div>
                    </form>
                </section>

                <!-- Appearance Section -->
                <section class="st-section" id="appearance-section">
                    <h2 class="st-section-title">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--primary)" stroke-width="2.5"><circle cx="12" cy="12" r="5"/><path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/></svg>
                        Appearance
                    </h2>

                    <div class="st-item">
                        <div class="st-item-info">
                            <span class="st-item-title">Dark Mode Theme</span>
                            <span class="st-item-desc">High contrast dark aesthetic for better focus.</span>
                        </div>
                        <label style="display: flex;">
                            <input type="checkbox" style="display: none;" ${localStorage.getItem('theme') === 'dark' ? 'checked' : ''} onchange="handleThemeToggle(this)">
                            <div class="st-toggle"></div>
                        </label>
                    </div>

                    <div class="st-item">
                        <div class="st-item-info">
                            <span class="st-item-title">Reduced Motion</span>
                            <span class="st-item-desc">Disable interface animations and transitions.</span>
                        </div>
                        <label style="display: flex;">
                            <input type="checkbox" style="display: none;">
                            <div class="st-toggle"></div>
                        </label>
                    </div>
                </section>

                <!-- Security Section -->
                <section class="st-section" id="security-section">
                    <h2 class="st-section-title">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--primary)" stroke-width="2.5"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
                        Security & Privacy
                    </h2>

                    <div class="st-item">
                        <div class="st-item-info">
                            <span class="st-item-title">Change Password</span>
                            <span class="st-item-desc">Last changed: 3 months ago.</span>
                        </div>
                        <button class="st-avatar-btn" onclick="showChangePasswordModal()">Update Password</button>
                    </div>

                    <div class="st-item">
                        <div class="st-item-info">
                            <span class="st-item-title">Public Profile Visibility</span>
                            <span class="st-item-desc">Allow others to see your professional page.</span>
                        </div>
                        <label style="display: flex;">
                            <input type="checkbox" style="display: none;" ${appState.user.profileVisibility === 'public' ? 'checked' : ''} onchange="handleProfileVisibilityChange(this.checked ? 'public' : 'private')">
                            <div class="st-toggle"></div>
                        </label>
                    </div>
                </section>

                <!-- Danger Zone -->
                <section id="danger-section" class="st-danger-banner">
                    <h3 style="color: #ef4444; font-size: 16px; font-weight: 700; margin-bottom: 8px;">Danger Zone</h3>
                    <p style="color: rgba(239,68,68,0.6); font-size: 13px; margin-bottom: 20px;">Once you delete your account, there is no going back. Please be certain.</p>
                    <button class="btn-primary" style="background: #ef4444; border: none; height: 44px; padding: 0 24px; border-radius: 12px; font-weight: 700;" onclick="showDeleteAccountModal()">Delete My Account</button>
                </section>
            </div>
        </div>
    `;
}

window.scrollToSection = function (id) {
    document.getElementById(id).scrollIntoView({ behavior: 'smooth', block: 'start' });

    // Update active state in sidebar
    document.querySelectorAll('.st-nav-item').forEach(el => {
        el.classList.remove('active');
        if (el.getAttribute('onclick').includes(id)) {
            el.classList.add('active');
        }
    });
};

window.handleProfileUpdate = async function (event) {
    event.preventDefault();

    try {
        const firstName = document.getElementById('profileFirstName')?.value;
        const lastName = document.getElementById('profileLastName')?.value;
        const email = document.getElementById('profileEmail')?.value;
        const bio = document.getElementById('profileBio')?.value;
        const localArea = document.getElementById('profileLocalArea')?.value;
        const state = document.getElementById('profileState')?.value;
        const country = document.getElementById('profileCountry')?.value;
        const phone = document.getElementById('profilePhone')?.value;

        if (!firstName || !lastName || !email) {
            showToast('First name, last name, and email are required', 'error');
            return;
        }

        if (!localArea || !state || !country) {
            showToast('Location fields are required (Local Area, State, Country)', 'error');
            return;
        }

        const profileData = {
            firstName: firstName.trim(),
            lastName: lastName.trim(),
            email: email.trim(),
            bio: bio?.trim() || '',
            location: {
                localArea: localArea.trim(),
                state: state.trim(),
                country: country.trim()
            },
            phoneNumber: phone?.trim() || ''
        };

        if (appState.user.role === 'creator') {
            const role = document.getElementById('profileRole')?.value;
            const skills = document.getElementById('profileSkills')?.value;

            if (role) profileData.category = role;
            if (skills) profileData.skills = skills.split(',').map(s => s.trim()).filter(s => s);
        }

        window.showLoadingSpinner();
        const response = await api.updateProfile(profileData);

        if (response.success) {
            setUser(response.data.user);
            window.hideLoadingSpinner();
            showToast('Profile updated successfully', 'success');

            setTimeout(() => {
                renderSettingsPage();
            }, 1000);
        } else {
            showToast(response.message || 'Failed to update profile', 'error');
        }
    } catch (error) {
        window.hideLoadingSpinner();
        showToast(error.message || 'Failed to update profile', 'error');
    }
};

window.handleAvatarUpload = function () {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';

    input.onchange = async function (e) {
        const file = e.target.files[0];
        if (!file) return;

        if (file.size > 5 * 1024 * 1024) {
            showToast('Image size must be less than 5MB', 'error');
            return;
        }

        try {
            window.showLoadingSpinner();

            const formData = new FormData();
            formData.append('avatar', file);

            const response = await api.updateProfile(formData);

            if (response.success) {
                setUser(response.data.user);
                document.getElementById('avatarPreview').src = response.data.user.avatar;
                window.hideLoadingSpinner();
                showToast('Avatar updated successfully', 'success');
            } else {
                window.hideLoadingSpinner();
                showToast(response.message || 'Failed to upload avatar', 'error');
            }
        } catch (error) {
            window.hideLoadingSpinner();
            showToast(error.message || 'Failed to upload avatar', 'error');
        }
    };

    input.click();
};

window.handleCoverUpload = function () {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';

    input.onchange = async function (e) {
        const file = e.target.files[0];
        if (!file) return;

        if (file.size > 5 * 1024 * 1024) {
            showToast('Image size must be less than 5MB', 'error');
            return;
        }

        try {
            window.showLoadingSpinner();

            const formData = new FormData();
            formData.append('coverImage', file);

            const response = await api.updateProfile(formData);

            if (response.success) {
                setUser(response.data.user);
                document.getElementById('coverPreview').src = response.data.user.coverImage;
                window.hideLoadingSpinner();
                showToast('Cover image updated successfully', 'success');
            } else {
                window.hideLoadingSpinner();
                showToast(response.message || 'Failed to upload cover image', 'error');
            }
        } catch (error) {
            window.hideLoadingSpinner();
            showToast(error.message || 'Failed to upload cover image', 'error');
        }
    };

    input.click();
};

window.toggleSwitch = function (checkbox, label) {
    const isActive = checkbox.checked;
    showToast(`${label} ${isActive ? 'enabled' : 'disabled'}`, 'success');
};

window.handleProfileVisibilityChange = function (value) {
    const visibilityLabels = {
        'public': 'Public',
        'private': 'Private',
        'clients': 'Clients only'
    };

    showToast(`Profile visibility set to ${visibilityLabels[value]}`, 'success');
};

window.showChangePasswordModal = function () {
    const modal = document.createElement('div');
    modal.className = 'bkm-overlay'; // Reusing established overlay class
    modal.onclick = (e) => { if (e.target === modal) modal.remove(); };
    modal.innerHTML = `
        <div class="bkm-sheet" style="max-width: 440px;">
            <div class="bkm-header">
                <span class="bkm-title">Update Password</span>
                <button class="bkm-close" onclick="this.closest('.bkm-overlay').remove()">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M18 6L6 18M6 6l12 12"/></svg>
                </button>
            </div>
            <div class="bkm-body">
                <p style="color: var(--text-secondary); font-size: 13px; margin-bottom: 24px; opacity: 0.7;">Confirm your current password before choosing a new one.</p>
                <form onsubmit="handlePasswordChange(event)" style="display: flex; flex-direction: column; gap: 16px;">
                    <div>
                        <label class="st-label">Current Password</label>
                        <input type="password" class="st-input" id="currentPassword" required placeholder="••••••••">
                    </div>
                    <div>
                        <label class="st-label">New Password</label>
                        <input type="password" class="st-input" id="newPassword" required minlength="8" placeholder="At least 8 characters">
                    </div>
                    <div>
                        <label class="st-label">Confirm New Password</label>
                        <input type="password" class="st-input" id="confirmPassword" required placeholder="Repeat new password">
                    </div>
                    <button type="submit" class="btn-primary" style="margin-top: 12px; height: 48px;">Save Password</button>
                </form>
            </div>
        </div>
    `;
    document.body.appendChild(modal);
};

window.handlePasswordChange = async function (event) {
    event.preventDefault();

    const currentPassword = document.getElementById('currentPassword').value;
    const newPassword = document.getElementById('newPassword').value;
    const confirmPassword = document.getElementById('confirmPassword').value;

    if (newPassword !== confirmPassword) {
        showToast('New passwords do not match', 'error');
        return;
    }

    try {
        window.showLoadingSpinner();

        const response = await api.updatePassword({
            currentPassword,
            newPassword
        });

        if (response.success) {
            window.hideLoadingSpinner();
            showToast('Password changed successfully', 'success');
            document.querySelector('.modal-overlay').remove();
        } else {
            window.hideLoadingSpinner();
            showToast(response.message || 'Failed to change password', 'error');
        }
    } catch (error) {
        window.hideLoadingSpinner();
        showToast(error.message || 'Failed to change password', 'error');
    }
};

window.showTwoFactorModal = function () {
    const modal = document.createElement('div');
    modal.className = 'bkm-overlay';
    modal.onclick = (e) => { if (e.target === modal) modal.remove(); };
    modal.innerHTML = `
        <div class="bkm-sheet" style="max-width: 440px;">
            <div class="bkm-header">
                <span class="bkm-title">Two-Factor Authentication</span>
                <button class="bkm-close" onclick="this.closest('.bkm-overlay').remove()">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M18 6L6 18M6 6l12 12"/></svg>
                </button>
            </div>
            <div class="bkm-body">
                <div style="text-align: center; padding: 20px 0;">
                    <div style="font-size: 48px; margin-bottom: 20px;">🛡️</div>
                    <h3 style="color: var(--text-primary); margin-bottom: 12px;">Enhanced Security</h3>
                    <p style="color: var(--text-secondary); font-size: 14px; line-height: 1.6; margin-bottom: 24px; opacity: 0.7;">
                        Protect your account with an extra verification layer. When enabled, you'll need both your password and a code from your phone to sign in.
                    </p>
                    <div style="background: rgba(151,71,255,0.1); color: var(--primary); padding: 12px; border-radius: 12px; font-weight: 700; font-size: 13px; letter-spacing: 0.05em;">
                        COMING SOON
                    </div>
                </div>
            </div>
        </div>
    `;
    document.body.appendChild(modal);
};

window.showDeleteAccountModal = function () {
    const isOAuthUser = !!appState.user?.googleId;
    const modal = document.createElement('div');
    modal.className = 'bkm-overlay';
    modal.onclick = (e) => { if (e.target === modal) modal.remove(); };
    modal.innerHTML = `
        <div class="bkm-sheet" style="max-width: 440px; border-color: rgba(239, 68, 68, 0.2);">
            <div class="bkm-header">
                <span class="bkm-title" style="color: #ef4444;">Delete Account</span>
                <button class="bkm-close" onclick="this.closest('.bkm-overlay').remove()">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M18 6L6 18M6 6l12 12"/></svg>
                </button>
            </div>
            <div class="bkm-body">
                <div style="background: rgba(239, 68, 68, 0.05); border: 1px solid rgba(239, 68, 68, 0.1); border-radius: 16px; padding: 16px; margin-bottom: 24px;">
                    <p style="color: #ef4444; font-weight: 700; font-size: 14px; margin-bottom: 8px;">Warning: Proceed with caution</p>
                    <p style="color: var(--text-secondary); font-size: 13px; line-height: 1.5; opacity: 0.7;">
                        All your data, including profile info, bookings, and wallet balance, will be permanently removed.
                    </p>
                </div>

                <form onsubmit="handleAccountDeletion(event)" style="display: flex; flex-direction: column; gap: 20px;">
                    ${!isOAuthUser ? `
                        <div>
                            <label class="st-label">Confirm Password</label>
                            <input type="password" class="st-input" id="deleteAccountPassword" required placeholder="Enter password to confirm">
                        </div>
                    ` : `
                        <p style="color: var(--text-secondary); font-size: 13px; opacity: 0.7;">You signed in with Google. No password confirm required.</p>
                    `}
                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-top: 8px;">
                        <button type="button" class="bk-filter-btn" onclick="this.closest('.bkm-overlay').remove()">Cancel</button>
                        <button type="submit" class="btn-primary" style="background: #ef4444; height: 44px;">Delete Account</button>
                    </div>
                </form>
            </div>
        </div>
    `;
    document.body.appendChild(modal);
};

window.handleAccountDeletion = async function (event) {
    event.preventDefault();

    const user = appState.user;
    const isOAuthUser = !!user?.googleId;

    const passwordInput = document.getElementById('deleteAccountPassword');
    const password = passwordInput ? passwordInput.value : '';

    if (!isOAuthUser && !password) {
        showToast('Please enter your password', 'error');
        return;
    }

    const confirmed = confirm('Are you absolutely sure you want to delete your account? This cannot be undone.');
    if (!confirmed) return;

    try {
        window.showLoadingSpinner();

        const response = await api.deleteAccount(password);

        if (response.success) {
            window.hideLoadingSpinner();
            showToast('Account deleted successfully. Goodbye!', 'success');

            localStorage.removeItem('token');

            setUser(null);

            document.querySelector('.modal-overlay')?.remove();

            setTimeout(() => {
                window.location.href = '/';
            }, 2000);
        } else {
            window.hideLoadingSpinner();
            showToast(response.message || 'Failed to delete account', 'error');
        }
    } catch (error) {
        console.error('Account deletion error:', error);
        window.hideLoadingSpinner();
        showToast(error.message || 'Failed to delete account', 'error');
    }
};

window.handleProfileVisibilityChange = async function (value) {
    try {
        const response = await api.updateProfile({ profileVisibility: value });

        if (response.success) {
            setUser(response.data.user);
            showToast(`Profile visibility set to ${value}`, 'success');
        } else {
            showToast(response.message || 'Failed to update visibility', 'error');
        }
    } catch (error) {
        console.error('Profile visibility update error:', error);
        showToast(error.message || 'Failed to update visibility', 'error');
    }
};

window.handleThemeToggle = function (checkbox) {
    const newTheme = checkbox.checked ? 'dark' : 'light';

    // Update localStorage
    localStorage.setItem('theme', newTheme);

    // Update document theme
    document.documentElement.setAttribute('data-theme', newTheme);

    // Show feedback
    showToast(`${newTheme === 'dark' ? 'Dark' : 'Light'} mode enabled`, 'success');
};

window.handlePhoneVisibilityToggleNew = async function (checkbox) {
    try {
        const newValue = checkbox.checked;

        const response = await api.updateProfile({ phoneNumberVisible: newValue });

        if (response.success) {
            setUser(response.data.user);
            showToast(`Phone number ${newValue ? 'will be shown' : 'is now hidden'} on your profile`, 'success');
        } else {
            // Revert checkbox if API call failed
            checkbox.checked = !newValue;
            showToast(response.message || 'Failed to update phone visibility', 'error');
        }
    } catch (error) {
        // Revert checkbox if API call failed
        checkbox.checked = !newValue;
        console.error('Phone visibility update error:', error);
        showToast(error.message || 'Failed to update phone visibility', 'error');
    }
};