import { appState, setUser } from '../state.js';
import api from '../services/api.js';
import { showToast } from '../utils.js';

export function renderSettingsPage() {
    const mainContent = document.getElementById('mainContent');

    if (!appState.user) {
        mainContent.innerHTML = `
            <div class="empty-state glass-effect" style="margin: 40px auto; max-width: 500px; border-radius: 24px; padding: 40px 20px;">
                <svg width="64" height="64" viewBox="0 0 24 24" fill="none" style="opacity: 0.4; margin-bottom: 16px;">
                    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
                    <circle cx="12" cy="7" r="4" stroke="currentColor" stroke-width="2"/>
                </svg>
                <h3>Sign in to view your profile</h3>
                <p>Create your account to manage your profile and settings</p>
                <button class="btn-primary" onclick="showAuthModal('signin')">Sign in</button>
            </div>
        `;
        return;
    }

    const userAvatar = appState.user.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(appState.user.name || 'User')}&background=9747FF&color=fff&bold=true&size=200`;
    const userCover = appState.user.coverImage || 'https://images.unsplash.com/photo-1557683316-973673baf926?w=1200&h=400&fit=crop';

    // Extract location fields
    const userLocalArea = appState.user.location?.localArea || '';
    const userState = appState.user.location?.state || '';
    const userCountry = appState.user.location?.country || '';

    mainContent.innerHTML = `
        <div class="section">
            <div class="container">
                <div class="settings-header-modern glass-effect" style="border-radius: 24px; border: 1px solid rgba(255,255,255,0.5);">
                    <div class="settings-header-content">
                        <div class="settings-icon-modern" style="background: rgba(151, 71, 255, 0.2); color: var(--primary); backdrop-filter: blur(4px);">
                            <svg width="32" height="32" viewBox="0 0 24 24" fill="none">
                                <circle cx="12" cy="12" r="3" stroke="currentColor" stroke-width="2"/>
                                <path d="M12 1v3M12 20v3M4.22 4.22l2.12 2.12M17.66 17.66l2.12 2.12M1 12h3M20 12h3M4.22 19.78l2.12-2.12M17.66 6.34l2.12-2.12" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
                            </svg>
                        </div>
                        <div>
                            <h1 class="settings-title-modern">Settings</h1>
                            <p class="settings-subtitle-modern">Manage your account preferences and profile</p>
                        </div>
                    </div>
                </div>

                <div class="profile-edit-section glass-effect" style="border-radius: 24px; border: 1px solid rgba(255,255,255,0.5);">
                    <div class="section-header-with-icon">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
                            <circle cx="12" cy="7" r="4" stroke="currentColor" stroke-width="2"/>
                        </svg>
                        <h2>Profile Information</h2>
                    </div>

                    <div class="cover-image-upload" onclick="handleCoverUpload()" style="border: 1px solid rgba(255,255,255,0.3);">
                        <img src="${userCover}" alt="Cover image" id="coverPreview" style="mix-blend-mode: overlay;">
                        <div class="cover-image-overlay" style="backdrop-filter: blur(4px);">
                            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" style="margin-bottom: 8px;">
                                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M17 8l-5-5-5 5M12 3v12" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                            </svg>
                            <span>Click to change cover image</span>
                        </div>
                    </div>

                    <div class="profile-picture-upload" style="border-bottom: 1px solid rgba(255,255,255,0.2);">
                        <div class="profile-picture-preview">
                            <img src="${userAvatar}" alt="${appState.user.name}" id="avatarPreview" style="border-color: rgba(255,255,255,0.6);">
                            <button class="profile-picture-change" onclick="handleAvatarUpload()" style="border-color: rgba(255,255,255,0.8);">
                                <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                                    <path d="M13.333 2.5a2.5 2.5 0 0 1 3.536 3.536L5.833 17.083l-4.166.834.833-4.167L13.333 2.5z" stroke="currentColor" stroke-width="2"/>
                                </svg>
                            </button>
                        </div>
                        <div class="profile-user-info-modern">
                            <h3>${appState.user.name}</h3>
                            <p class="user-email-modern">${appState.user.email}</p>
                            <span class="user-role-badge" style="background: rgba(151, 71, 255, 0.2); backdrop-filter: blur(4px);">${appState.user.role === 'creator' ? 'Creator Account' : 'Client Account'}</span>
                        </div>
                    </div>

                    <form onsubmit="handleProfileUpdate(event)">
                        <div class="form-group">
                            <label class="form-label">First name</label>
                            <input type="text" class="form-input" value="${appState.user.firstName || ''}" id="profileFirstName" required style="background: rgba(255,255,255,0.4);">
                        </div>

                        <div class="form-group">
                            <label class="form-label">Last name</label>
                            <input type="text" class="form-input" value="${appState.user.lastName || ''}" id="profileLastName" required style="background: rgba(255,255,255,0.4);">
                        </div>

                        <div class="form-group">
                            <label class="form-label">Email</label>
                            <input type="email" class="form-input" value="${appState.user.email}" id="profileEmail" required style="background: rgba(255,255,255,0.4);">
                        </div>

                        <div class="form-group">
                            <label class="form-label">Bio</label>
                            <textarea class="form-textarea" id="profileBio" placeholder="Tell us about yourself..." maxlength="500" style="background: rgba(255,255,255,0.4);">${appState.user.bio || ''}</textarea>
                            <div class="caption mt-sm">Maximum 500 characters</div>
                        </div>

                        <div class="form-group">
                            <label class="form-label">Local Area</label>
                            <input type="text" class="form-input" value="${userLocalArea}" id="profileLocalArea" placeholder="e.g. Wuye, Maitama" required style="background: rgba(255,255,255,0.4);">
                        </div>

                        <div class="form-group">
                            <label class="form-label">State/Region</label>
                            <input type="text" class="form-input" value="${userState}" id="profileState" placeholder="e.g. Federal Capital Territory" required style="background: rgba(255,255,255,0.4);">
                        </div>

                        <div class="form-group">
                            <label class="form-label">Country</label>
                            <input type="text" class="form-input" value="${userCountry}" id="profileCountry" placeholder="e.g. Nigeria" required style="background: rgba(255,255,255,0.4);">
                        </div>

                        ${appState.user.role === 'creator' ? `
                            <div class="form-group">
                                <label class="form-label">Professional title</label>
                                <input type="text" class="form-input" value="${appState.user.category || ''}" id="profileRole" placeholder="e.g. Wedding Photographer" style="background: rgba(255,255,255,0.4);">
                            </div>

                            <div class="form-group">
                                <label class="form-label">Skills</label>
                                <input type="text" class="form-input" value="${(appState.user.skills || []).join(', ')}" id="profileSkills" placeholder="Photography, Photoshop, Lightroom" style="background: rgba(255,255,255,0.4);">
                                <div class="caption mt-sm">Separate with commas</div>
                            </div>
                        ` : ''}

                        <div class="form-group">
                            <label class="form-label">Phone number</label>
                            <input type="tel" class="form-input" value="${appState.user.phoneNumber || ''}" id="profilePhone" placeholder="+234 800 000 0000" style="background: rgba(255,255,255,0.4);">
                        </div>

                        <div class="form-actions" style="margin-top: 32px;">
                            <button type="button" class="btn-ghost" onclick="navigateToPage('home')">Cancel</button>
                            <button type="submit" class="btn-primary">Save changes</button>
                        </div>
                    </form>
                </div>

                <div class="settings-section glass-effect" style="border-radius: 24px; border: 1px solid rgba(255,255,255,0.5);">
                    <div class="settings-section-header" style="border-bottom: 1px solid rgba(255,255,255,0.2);">
                        <div class="section-header-with-icon">
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                                <circle cx="12" cy="12" r="5" stroke="currentColor" stroke-width="2"/>
                                <path d="M12 1v3M12 20v3M4.22 4.22l2.12 2.12M17.66 17.66l2.12 2.12M1 12h3M20 12h3M4.22 19.78l2.12-2.12M17.66 6.34l2.12-2.12" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
                            </svg>
                            <h3 class="settings-section-title">Appearance</h3>
                        </div>
                    </div>

                    <div class="settings-item" style="border-bottom: 1px solid rgba(255,255,255,0.2);">
                        <div class="settings-item-with-icon">
                            <div class="settings-icon-wrapper" style="background: rgba(151, 71, 255, 0.15);">
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                                    <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                                </svg>
                            </div>
                            <div class="settings-item-label">
                                <div class="settings-item-title">Dark mode</div>
                                <div class="settings-item-description">Switch between light and dark theme</div>
                            </div>
                        </div>
                        <label class="toggle-switch">
                            <input type="checkbox" ${localStorage.getItem('theme') === 'dark' ? 'checked' : ''} onchange="handleThemeToggle(this)">
                            <span class="toggle-slider" style="background: rgba(255,255,255,0.5); border: 1px solid rgba(255,255,255,0.8);"></span>
                        </label>
                    </div>
                </div>

                <div class="settings-section glass-effect" style="border-radius: 24px; border: 1px solid rgba(255,255,255,0.5);">
                    <div class="settings-section-header" style="border-bottom: 1px solid rgba(255,255,255,0.2);">
                        <div class="section-header-with-icon">
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                                <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9M13.73 21a2 2 0 0 1-3.46 0" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                            </svg>
                            <h3 class="settings-section-title">Notifications</h3>
                        </div>
                    </div>

                    <div class="settings-item" style="border-bottom: 1px solid rgba(255,255,255,0.2);">
                        <div class="settings-item-with-icon">
                            <div class="settings-icon-wrapper" style="background: rgba(151, 71, 255, 0.15);">
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                                    <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                                    <path d="m22 6-10 7L2 6" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                                </svg>
                            </div>
                            <div class="settings-item-label">
                                <div class="settings-item-title">Email notifications</div>
                                <div class="settings-item-description">Receive updates about your bookings and messages</div>
                            </div>
                        </div>
                        <label class="toggle-switch">
                            <input type="checkbox" checked onchange="toggleSwitch(this, 'Email notifications')">
                            <span class="toggle-slider" style="background: rgba(255,255,255,0.5); border: 1px solid rgba(255,255,255,0.8);"></span>
                        </label>
                    </div>

                    <div class="settings-item" style="border-bottom: none;">
                        <div class="settings-item-with-icon">
                            <div class="settings-icon-wrapper" style="background: rgba(151, 71, 255, 0.15);">
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                                    <path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                                    <path d="M7 7h.01" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                                </svg>
                            </div>
                            <div class="settings-item-label">
                                <div class="settings-item-title">Marketing emails</div>
                                <div class="settings-item-description">Receive tips, updates, and special offers</div>
                            </div>
                        </div>
                        <label class="toggle-switch">
                            <input type="checkbox" checked onchange="toggleSwitch(this, 'Marketing emails')">
                            <span class="toggle-slider" style="background: rgba(255,255,255,0.5); border: 1px solid rgba(255,255,255,0.8);"></span>
                        </label>
                    </div>
                </div>

                <div class="settings-section glass-effect" style="border-radius: 24px; border: 1px solid rgba(255,255,255,0.5);">
                    <div class="settings-section-header" style="border-bottom: 1px solid rgba(255,255,255,0.2);">
                        <div class="section-header-with-icon">
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                            </svg>
                            <h3 class="settings-section-title">Privacy & Security</h3>
                        </div>
                    </div>

                    <div class="settings-item" style="border-bottom: 1px solid rgba(255,255,255,0.2);">
                        <div class="settings-item-with-icon">
                            <div class="settings-icon-wrapper" style="background: rgba(151, 71, 255, 0.15);">
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                                    <rect x="3" y="11" width="18" height="11" rx="2" ry="2" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                                    <path d="M7 11V7a5 5 0 0 1 10 0v4" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                                </svg>
                            </div>
                            <div class="settings-item-label">
                                <div class="settings-item-title">Change password</div>
                                <div class="settings-item-description">Update your account password</div>
                            </div>
                        </div>
                        <button class="btn-secondary-modern" onclick="showChangePasswordModal()" style="background: rgba(255,255,255,0.5);">Change</button>
                    </div>

                    <div class="settings-item" style="border-bottom: 1px solid rgba(255,255,255,0.2);">
                        <div class="settings-item-with-icon">
                            <div class="settings-icon-wrapper" style="background: rgba(151, 71, 255, 0.15);">
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                                    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                                    <path d="M9 12l2 2 4-4" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                                </svg>
                            </div>
                            <div class="settings-item-label">
                                <div class="settings-item-title">Two-factor authentication</div>
                                <div class="settings-item-description">Add an extra layer of security to your account</div>
                            </div>
                        </div>
                        <button class="btn-secondary-modern" onclick="showTwoFactorModal()" style="background: rgba(255,255,255,0.5);">Enable</button>
                    </div>

                    <div class="settings-item" style="border-bottom: 1px solid rgba(255,255,255,0.2);">
                        <div class="settings-item-with-icon">
                            <div class="settings-icon-wrapper" style="background: rgba(151, 71, 255, 0.15);">
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                                    <circle cx="12" cy="12" r="3" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                                </svg>
                            </div>
                            <div class="settings-item-label">
                                <div class="settings-item-title">Profile visibility</div>
                                <div class="settings-item-description">Control who can see your profile</div>
                            </div>
                        </div>
                        <select class="form-select-modern" onchange="handleProfileVisibilityChange(this.value)" style="background: rgba(255,255,255,0.4);">
                            <option value="public" ${(appState.user.profileVisibility || 'public') === 'public' ? 'selected' : ''}>Public</option>
                            <option value="private" ${(appState.user.profileVisibility || 'public') === 'private' ? 'selected' : ''}>Private</option>
                            <option value="clients" ${(appState.user.profileVisibility || 'public') === 'clients' ? 'selected' : ''}>Clients only</option>
                        </select>
                    </div>

                    <div class="settings-item" style="border-bottom: none;">
                        <div class="settings-item-with-icon">
                            <div class="settings-icon-wrapper" style="background: rgba(151, 71, 255, 0.15);">
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                                    <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                                </svg>
                            </div>
                            <div class="settings-item-label">
                                <div class="settings-item-title">Show phone number on profile</div>
                                <div class="settings-item-description">Display your phone number publicly on your profile</div>
                            </div>
                        </div>
                        <label class="toggle-switch">
                            <input type="checkbox" ${appState.user.phoneNumberVisible ? 'checked' : ''} onchange="handlePhoneVisibilityToggleNew(this)">
                            <span class="toggle-slider" style="background: rgba(255,255,255,0.5); border: 1px solid rgba(255,255,255,0.8);"></span>
                        </label>
                    </div>
                </div>

                <div class="settings-section danger-zone glass-effect" style="border-radius: 24px; border: 1px solid rgba(239, 68, 68, 0.4); background: rgba(239, 68, 68, 0.05);">
                    <div class="settings-section-header" style="border-bottom: 1px solid rgba(239, 68, 68, 0.2);">
                        <div class="section-header-with-icon">
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--error)">
                                <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                                <line x1="12" y1="9" x2="12" y2="13" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                                <line x1="12" y1="17" x2="12.01" y2="17" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                            </svg>
                            <h3 class="settings-section-title" style="color: var(--error);">Danger Zone</h3>
                        </div>
                    </div>

                    <div class="settings-item" style="border-bottom: none;">
                        <div class="settings-item-with-icon">
                            <div class="settings-icon-wrapper danger" style="background: rgba(239, 68, 68, 0.15);">
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                                    <path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                                    <line x1="10" y1="11" x2="10" y2="17" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                                    <line x1="14" y1="11" x2="14" y2="17" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                                </svg>
                            </div>
                            <div class="settings-item-label">
                                <div class="settings-item-title" style="color: var(--error);">Delete account</div>
                                <div class="settings-item-description">Permanently delete your account and all data</div>
                            </div>
                        </div>
                        <button class="btn-danger-modern" onclick="showDeleteAccountModal()" style="background: rgba(239, 68, 68, 0.1);">Delete</button>
                    </div>
                </div>
            </div>
        </div>
    `;
}

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
    modal.className = 'modal-overlay';
    modal.innerHTML = `
        <div class="modal-content glass-effect" style="border: 1px solid rgba(255,255,255,0.6); box-shadow: 0 12px 48px rgba(0,0,0,0.15);">
            <div class="modal-header" style="border-bottom: 1px solid rgba(255,255,255,0.2);">
                <h2>Change password</h2>
                <button class="modal-close" onclick="this.closest('.modal-overlay').remove()" style="background: rgba(255,255,255,0.2);">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                        <path d="M18 6L6 18M6 6l12 12" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
                    </svg>
                </button>
            </div>
            <form onsubmit="handlePasswordChange(event)" style="padding: 24px;">
                <div class="form-group">
                    <label class="form-label">Current password</label>
                    <input type="password" class="form-input" id="currentPassword" required style="background: rgba(255,255,255,0.4);">
                </div>
                <div class="form-group">
                    <label class="form-label">New password</label>
                    <input type="password" class="form-input" id="newPassword" required minlength="8" style="background: rgba(255,255,255,0.4);">
                    <div class="caption mt-sm">Minimum 8 characters</div>
                </div>
                <div class="form-group">
                    <label class="form-label">Confirm new password</label>
                    <input type="password" class="form-input" id="confirmPassword" required style="background: rgba(255,255,255,0.4);">
                </div>
                <div class="form-actions" style="margin-top: 24px;">
                    <button type="button" class="btn-ghost" onclick="this.closest('.modal-overlay').remove()">Cancel</button>
                    <button type="submit" class="btn-primary">Change password</button>
                </div>
            </form>
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
    modal.className = 'modal-overlay';
    modal.innerHTML = `
        <div class="modal-content glass-effect" style="border: 1px solid rgba(255,255,255,0.6); box-shadow: 0 12px 48px rgba(0,0,0,0.15);">
            <div class="modal-header" style="border-bottom: 1px solid rgba(255,255,255,0.2);">
                <h2>Two-factor authentication</h2>
                <button class="modal-close" onclick="this.closest('.modal-overlay').remove()" style="background: rgba(255,255,255,0.2);">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                        <path d="M18 6L6 18M6 6l12 12" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
                    </svg>
                </button>
            </div>
            <div class="modal-body">
                <p>Two-factor authentication adds an extra layer of security to your account by requiring a verification code in addition to your password.</p>
                <p class="mt-md" style="font-weight: 500; color: var(--primary);">This feature will be available soon!</p>
            </div>
            <div class="form-actions" style="padding: 0 24px 24px;">
                <button class="btn-primary" style="width: 100%;" onclick="this.closest('.modal-overlay').remove()">Close</button>
            </div>
        </div>
    `;
    document.body.appendChild(modal);
};

window.showDeleteAccountModal = function () {
    const user = appState.user;
    const isOAuthUser = !!user?.googleId;

    const modal = document.createElement('div');
    modal.className = 'modal-overlay';
    modal.innerHTML = `
        <div class="modal-content glass-effect" style="border: 1px solid rgba(239, 68, 68, 0.4); box-shadow: 0 12px 48px rgba(239, 68, 68, 0.15);">
            <div class="modal-header" style="border-bottom: 1px solid rgba(239, 68, 68, 0.2);">
                <h2 style="color: var(--error);">Delete account</h2>
                <button class="modal-close" onclick="this.closest('.modal-overlay').remove()" style="background: rgba(239, 68, 68, 0.1);">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                        <path d="M18 6L6 18M6 6l12 12" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
                    </svg>
                </button>
            </div>
            <div class="modal-body">
                <p><strong>Warning:</strong> This action cannot be undone.</p>
                <p class="mt-md">Deleting your account will permanently remove all your data including:</p>
                <ul style="margin-top: 12px; padding-left: 24px;">
                    <li>Profile information</li>
                    <li>Portfolio and services</li>
                    <li>Bookings and messages</li>
                    <li>Wallet balance and transaction history</li>
                </ul>
                ${isOAuthUser ? `
                    <p style="margin-top: 16px; padding: 12px; background: rgba(239, 68, 68, 0.1); border-radius: 8px; font-size: 14px;">
                        <strong>Note:</strong> You signed in with Google, so no password is required to delete your account.
                    </p>
                ` : ''}
            </div>
            <form onsubmit="handleAccountDeletion(event)" style="padding: 0 24px 24px;">
                ${!isOAuthUser ? `
                    <div class="form-group" style="margin-bottom: 24px;">
                        <label class="form-label">Enter your password to confirm</label>
                        <input type="password" class="form-input" id="deleteAccountPassword" required placeholder="Your password" style="background: rgba(255,255,255,0.4);">
                    </div>
                ` : ''}
                <div class="form-actions">
                    <button type="button" class="btn-ghost" onclick="this.closest('.modal-overlay').remove()">Cancel</button>
                    <button type="submit" class="btn-primary" style="background: var(--error); border-color: var(--error);">Delete my account</button>
                </div>
            </form>
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