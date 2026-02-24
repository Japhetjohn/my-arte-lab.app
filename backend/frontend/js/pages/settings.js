import { appState, setUser } from '../state.js';
import api from '../services/api.js';
import { showToast } from '../utils.js';

const SETTINGS_STYLES = `
<style>
    .st-container { max-width: 1000px; margin: 0 auto; padding: 24px; display: grid; grid-template-columns: 240px 1fr; gap: 40px; }
    @media (max-width: 768px) { .st-container { grid-template-columns: 1fr; gap: 24px; } }
    
    .st-sidebar { position: sticky; top: 100px; height: fit-content; }
    .st-nav { display: flex; flex-direction: column; gap: 4px; }
    .st-nav-item { padding: 12px 16px; border-radius: 12px; color: rgba(255,255,255,0.5); font-weight: 600; cursor: pointer; transition: all 0.2s; display: flex; align-items: center; gap: 12px; font-size: 14px; border: none; background: transparent; width: 100%; text-align: left; }
    .st-nav-item:hover { background: rgba(255,255,255,0.05); color: white; }
    .st-nav-item.active { background: rgba(124,58,237,0.1); color: #a78bfa; }
    
    .st-content { display: flex; flex-direction: column; gap: 32px; }
    .st-title { font-size: 28px; font-weight: 800; color: white; margin-bottom: 8px; letter-spacing: -0.02em; }
    .st-section { background: rgba(255,255,255,0.02); border: 1px solid rgba(255,255,255,0.06); border-radius: 24px; padding: 32px; }
    .st-section-title { font-size: 18px; font-weight: 700; color: white; margin-bottom: 24px; display: flex; align-items: center; gap: 10px; }
    
    .st-label { font-size: 12px; font-weight: 700; color: rgba(255,255,255,0.35); text-transform: uppercase; letter-spacing: 0.1em; margin-bottom: 8px; display: block; }
    .st-input { width: 100%; background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.08); border-radius: 12px; padding: 12px 16px; color: white; font-size: 14px; transition: all 0.2s; }
    .st-input:focus { border-color: #7c3aed; background: rgba(255,255,255,0.05); outline: none; box-shadow: 0 0 0 4px rgba(124,58,237,0.15); }
    
    .st-item { display: flex; align-items: center; justify-content: space-between; padding: 20px 0; border-bottom: 1px solid rgba(255,255,255,0.06); }
    .st-item:last-child { border-bottom: none; }
    .st-item-info { display: flex; flex-direction: column; gap: 4px; }
    .st-item-title { font-size: 15px; font-weight: 600; color: white; }
    .st-item-desc { font-size: 13px; color: rgba(255,255,255,0.4); }
    
    .st-avatar-group { display: flex; align-items: center; gap: 24px; margin-bottom: 32px; }
    .st-avatar-preview { width: 80px; height: 80px; border-radius: 50%; object-fit: crop; border: 2px solid rgba(255,255,255,0.1); }
    .st-avatar-btn { padding: 8px 16px; background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1); border-radius: 10px; color: white; font-size: 13px; cursor: pointer; }
    
    .st-toggle { position: relative; width: 44px; height: 24px; background: rgba(255,255,255,0.1); border-radius: 20px; cursor: pointer; transition: all 0.3s; }
    .st-toggle::after { content: ''; position: absolute; top: 2px; left: 2px; width: 20px; height: 20px; background: white; border-radius: 50%; transition: all 0.3s; }
    input:checked + .st-toggle { background: #7c3aed; }
    input:checked + .st-toggle::after { left: 22px; }
    
    .st-danger-banner { background: rgba(239,68,68,0.05); border: 1px solid rgba(239,68,68,0.15); border-radius: 16px; padding: 20px; margin-top: 40px; }
</style>
`;

export function renderSettingsPage() {
    const mainContent = document.getElementById('mainContent');

    if (!appState.user) {
        mainContent.innerHTML = `
            <div style="text-align: center; padding: 100px 24px;">
                <div style="font-size: 64px; margin-bottom: 24px; opacity: 0.2;">👤</div>
                <h2 style="color: white; margin-bottom: 12px;">Sign in to view settings</h2>
                <p style="color: rgba(255,255,255,0.4); margin-bottom: 32px;">Please authenticate to manage your profile and account.</p>
                <button class="btn-primary" onclick="showAuthModal('signin')">Sign In</button>
            </div>
        `;
        return;
    }

    const userAvatar = appState.user.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(appState.user.name || 'User')}&background=9747FF&color=fff&bold=true&size=200`;

    mainContent.innerHTML = `
        ${SETTINGS_STYLES}
        <div class="st-container">
            <!-- Sidebar -->
            <aside class="st-sidebar">
                <div class="st-nav">
                    <button class="st-nav-item active" onclick="scrollToSection('profile-section')">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
                        Profile
                    </button>
                    <button class="st-nav-item" onclick="scrollToSection('appearance-section')">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="5"/><path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/></svg>
                        Appearance
                    </button>
                    <button class="st-nav-item" onclick="scrollToSection('security-section')">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
                        Security
                    </button>
                    <button class="st-nav-item" onclick="scrollToSection('danger-section')" style="color: #ef4444;">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
                        Delete Account
                    </button>
                </div>
            </aside>

            <!-- Main Content -->
            <div class="st-content">
                <div>
                    <h1 class="st-title">Settings</h1>
                    <p style="color: rgba(255,255,255,0.4); font-size: 15px;">Manage your account preferences and professional profile.</p>
                </div>

                <!-- Profile Section -->
                <section class="st-section" id="profile-section">
                    <h2 class="st-section-title">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#a78bfa" stroke-width="2.5"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
                        Personal Information
                    </h2>

                    <div class="st-avatar-group">
                        <img src="${userAvatar}" class="st-avatar-preview" id="avatarPreview">
                        <div>
                            <button class="st-avatar-btn" onclick="handleAvatarUpload()">Change Photo</button>
                            <p style="font-size: 12px; color: rgba(255,255,255,0.3); margin-top: 8px;">JPG, PNG or GIF. Max 5MB.</p>
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

                        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px;">
                            <div>
                                <label class="st-label">Email Address</label>
                                <input type="email" class="st-input" value="${appState.user.email}" id="profileEmail" required>
                            </div>
                            <div>
                                <label class="st-label">Phone Number</label>
                                <input type="tel" class="st-input" value="${appState.user.phoneNumber || ''}" id="profilePhone" placeholder="+234...">
                            </div>
                        </div>

                        <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 20px;">
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
                            <textarea class="st-input" id="profileBio" style="min-height: 100px; resize: vertical;">${appState.user.bio || ''}</textarea>
                        </div>
                        
                        <div style="margin-top: 12px; display: flex; justify-content: flex-end; border-top: 1px solid rgba(255,255,255,0.06); padding-top: 24px;">
                            <button type="submit" class="btn-primary" style="height: 48px; padding: 0 40px;">Save Profile Changes</button>
                        </div>
                    </form>
                </section>

                <!-- Appearance Section -->
                <section class="st-section" id="appearance-section">
                    <h2 class="st-section-title">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#a78bfa" stroke-width="2.5"><circle cx="12" cy="12" r="5"/><path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/></svg>
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
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#a78bfa" stroke-width="2.5"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
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
                    <button class="btn-primary" style="background: #ef4444; border: none;" onclick="showDeleteAccountModal()">Delete My Account</button>
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

        showToast('Updating profile...', 'info');

        const response = await api.updateProfile(profileData);

        if (response.success) {
            setUser(response.data.user);
            showToast('Profile updated successfully', 'success');

            setTimeout(() => {
                renderSettingsPage();
            }, 1000);
        } else {
            showToast(response.message || 'Failed to update profile', 'error');
        }
    } catch (error) {
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
            showToast('Uploading avatar...', 'info');

            const formData = new FormData();
            formData.append('avatar', file);

            const response = await api.updateProfile(formData);

            if (response.success) {
                setUser(response.data.user);
                document.getElementById('avatarPreview').src = response.data.user.avatar;
                showToast('Avatar updated successfully', 'success');
            } else {
                showToast(response.message || 'Failed to upload avatar', 'error');
            }
        } catch (error) {
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
            showToast('Uploading cover image...', 'info');

            const formData = new FormData();
            formData.append('coverImage', file);

            const response = await api.updateProfile(formData);

            if (response.success) {
                setUser(response.data.user);
                document.getElementById('coverPreview').src = response.data.user.coverImage;
                showToast('Cover image updated successfully', 'success');
            } else {
                showToast(response.message || 'Failed to upload cover image', 'error');
            }
        } catch (error) {
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
                <p style="color: rgba(255,255,255,0.4); font-size: 13px; margin-bottom: 24px;">Confirm your current password before choosing a new one.</p>
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
        showToast('Changing password...', 'info');

        const response = await api.updatePassword({
            currentPassword,
            newPassword
        });

        if (response.success) {
            showToast('Password changed successfully', 'success');
            document.querySelector('.modal-overlay').remove();
        } else {
            showToast(response.message || 'Failed to change password', 'error');
        }
    } catch (error) {
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
                    <h3 style="color: white; margin-bottom: 12px;">Enhanced Security</h3>
                    <p style="color: rgba(255,255,255,0.4); font-size: 14px; line-height: 1.6; margin-bottom: 24px;">
                        Protect your account with an extra verification layer. When enabled, you'll need both your password and a code from your phone to sign in.
                    </p>
                    <div style="background: rgba(124,58,237,0.1); color: #a78bfa; padding: 12px; border-radius: 12px; font-weight: 700; font-size: 13px; letter-spacing: 0.05em;">
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
                    <p style="color: #ef4444; font-weight: 700; font-size: 14px; margin-bottom: 8px;">Warning: Procced with caution</p>
                    <p style="color: rgba(255,255,255,0.4); font-size: 13px; line-height: 1.5;">
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
                        <p style="color: rgba(255,255,255,0.4); font-size: 13px;">You signed in with Google. No password confirm required.</p>
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
        showToast('Deleting account...', 'info');

        const response = await api.deleteAccount(password);

        if (response.success) {
            showToast('Account deleted successfully. Goodbye!', 'success');

            localStorage.removeItem('token');

            setUser(null);

            document.querySelector('.modal-overlay')?.remove();

            setTimeout(() => {
                window.location.href = '/';
            }, 2000);
        } else {
            showToast(response.message || 'Failed to delete account', 'error');
        }
    } catch (error) {
        console.error('Account deletion error:', error);
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