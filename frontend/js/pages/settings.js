// Settings Page Module
import { appState, setUser } from '../state.js';
import api from '../services/api.js';
import { showToast } from '../components/toast.js';
import { navigateToPage } from '../router.js';

export function renderSettingsPage() {
    const mainContent = document.getElementById('mainContent');

    if (!appState.user) {
        mainContent.innerHTML = `
            <div class="empty-state">
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

    // Use uploaded avatar if available, otherwise use default with initials
    const userAvatar = appState.user.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(appState.user.name || 'User')}&background=9747FF&color=fff&bold=true&size=200`;
    const userCover = appState.user.coverImage || 'https://images.unsplash.com/photo-1557683316-973673baf926?w=1200&h=400&fit=crop';

    // Format location for display
    const userLocation = appState.user.location ?
        (typeof appState.user.location === 'object' ?
            `${appState.user.location.city || ''}${appState.user.location.city && appState.user.location.country ? ', ' : ''}${appState.user.location.country || ''}`.trim()
            : appState.user.location)
        : '';

    mainContent.innerHTML = `
        <div class="section">
            <div class="container">
                <h1 class="mb-lg">Profile & Settings</h1>

                <!-- Profile Edit Section -->
                <div class="profile-edit-section">
                    <h2 class="mb-lg">Edit profile</h2>

                    <!-- Cover Image Upload -->
                    <div class="cover-image-upload" onclick="handleCoverUpload()">
                        <img src="${userCover}" alt="Cover image" id="coverPreview">
                        <div class="cover-image-overlay">
                            <span>Click to change cover image</span>
                        </div>
                    </div>

                    <!-- Profile Picture Upload -->
                    <div class="profile-picture-upload">
                        <div class="profile-picture-preview">
                            <img src="${userAvatar}" alt="${appState.user.name}" id="avatarPreview">
                            <button class="profile-picture-change" onclick="handleAvatarUpload()">
                                <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                                    <path d="M13.333 2.5a2.5 2.5 0 0 1 3.536 3.536L5.833 17.083l-4.166.834.833-4.167L13.333 2.5z" stroke="currentColor" stroke-width="2"/>
                                </svg>
                            </button>
                        </div>
                        <div>
                            <h3>${appState.user.name}</h3>
                            <p class="caption">${appState.user.email}</p>
                            <p class="caption mt-sm">${appState.user.role === 'creator' ? 'Creator Account' : 'Client Account'}</p>
                        </div>
                    </div>

                    <!-- Profile Form -->
                    <form onsubmit="handleProfileUpdate(event)">
                        <div class="form-group">
                            <label class="form-label">Full name</label>
                            <input type="text" class="form-input" value="${appState.user.name}" id="profileName" required>
                        </div>

                        <div class="form-group">
                            <label class="form-label">Email</label>
                            <input type="email" class="form-input" value="${appState.user.email}" id="profileEmail" required>
                        </div>

                        <div class="form-group">
                            <label class="form-label">Bio</label>
                            <textarea class="form-textarea" id="profileBio" placeholder="Tell us about yourself..." maxlength="500">${appState.user.bio || ''}</textarea>
                            <div class="caption mt-sm">Maximum 500 characters</div>
                        </div>

                        <div class="form-group">
                            <label class="form-label">Location</label>
                            <input type="text" class="form-input" value="${userLocation}" id="profileLocation" placeholder="City, Country">
                        </div>

                        ${appState.user.role === 'creator' ? `
                            <div class="form-group">
                                <label class="form-label">Professional title</label>
                                <input type="text" class="form-input" value="${appState.user.category || ''}" id="profileRole" placeholder="e.g. Wedding Photographer">
                            </div>

                            <div class="form-group">
                                <label class="form-label">Skills</label>
                                <input type="text" class="form-input" value="${(appState.user.skills || []).join(', ')}" id="profileSkills" placeholder="Photography, Photoshop, Lightroom">
                                <div class="caption mt-sm">Separate with commas</div>
                            </div>
                        ` : ''}

                        <div class="form-group">
                            <label class="form-label">Phone number</label>
                            <input type="tel" class="form-input" value="${appState.user.phone || ''}" id="profilePhone" placeholder="+234 800 000 0000">
                        </div>

                        <div class="form-actions">
                            <button type="button" class="btn-ghost" onclick="navigateToPage('home')">Cancel</button>
                            <button type="submit" class="btn-primary">Save changes</button>
                        </div>
                    </form>
                </div>

                <!-- Account Settings -->
                <div class="settings-section mt-lg">
                    <h3 class="settings-section-title">Account settings</h3>

                    <div class="settings-item">
                        <div class="settings-item-info">
                            <div class="settings-item-label">Email notifications</div>
                            <div class="settings-item-description">Receive updates about your bookings and messages</div>
                        </div>
                        <div class="toggle-switch active" onclick="toggleSwitch(this)">
                            <div class="toggle-switch-slider"></div>
                        </div>
                    </div>

                    <div class="settings-item">
                        <div class="settings-item-info">
                            <div class="settings-item-label">Marketing emails</div>
                            <div class="settings-item-description">Receive tips, updates, and special offers</div>
                        </div>
                        <div class="toggle-switch active" onclick="toggleSwitch(this)">
                            <div class="toggle-switch-slider"></div>
                        </div>
                    </div>
                </div>

                <!-- Privacy & Security -->
                <div class="settings-section">
                    <h3 class="settings-section-title">Privacy & Security</h3>

                    <div class="settings-item">
                        <div class="settings-item-info">
                            <div class="settings-item-label">Change password</div>
                            <div class="settings-item-description">Update your account password</div>
                        </div>
                        <button class="btn-secondary" onclick="showChangePasswordModal()">Change</button>
                    </div>

                    <div class="settings-item">
                        <div class="settings-item-info">
                            <div class="settings-item-label">Two-factor authentication</div>
                            <div class="settings-item-description">Add an extra layer of security to your account</div>
                        </div>
                        <button class="btn-secondary" onclick="showTwoFactorModal()">Enable</button>
                    </div>

                    <div class="settings-item">
                        <div class="settings-item-info">
                            <div class="settings-item-label">Profile visibility</div>
                            <div class="settings-item-description">Control who can see your profile</div>
                        </div>
                        <select class="form-select" style="width: auto;" onchange="handleProfileVisibilityChange(this.value)">
                            <option value="public" selected>Public</option>
                            <option value="private">Private</option>
                            <option value="clients">Clients only</option>
                        </select>
                    </div>
                </div>

                <!-- Danger Zone -->
                <div class="settings-section">
                    <h3 class="settings-section-title" style="color: var(--error);">Danger zone</h3>

                    <div class="settings-item">
                        <div class="settings-item-info">
                            <div class="settings-item-label" style="color: var(--error);">Delete account</div>
                            <div class="settings-item-description">Permanently delete your account and all data</div>
                        </div>
                        <button class="btn-secondary" style="border-color: var(--error); color: var(--error);" onclick="showDeleteAccountModal()">Delete</button>
                    </div>
                </div>
            </div>
        </div>
    `;
}

// ==================== Handler Functions ====================

// Handle profile update
window.handleProfileUpdate = async function(event) {
    event.preventDefault();

    try {
        const name = document.getElementById('profileName').value;
        const email = document.getElementById('profileEmail').value;
        const bio = document.getElementById('profileBio').value;
        const location = document.getElementById('profileLocation').value;
        const phone = document.getElementById('profilePhone').value;

        const profileData = {
            name,
            email,
            bio,
            location,
            phone
        };

        // Add creator-specific fields
        if (appState.user.role === 'creator') {
            const role = document.getElementById('profileRole')?.value;
            const skills = document.getElementById('profileSkills')?.value;

            if (role) profileData.category = role;
            if (skills) profileData.skills = skills.split(',').map(s => s.trim()).filter(s => s);
        }

        showToast('Updating profile...', 'info');

        const response = await api.updateProfile(profileData);

        if (response.success) {
            // Update app state with new user data
            setUser(response.data.user);
            showToast('Profile updated successfully', 'success');

            // Re-render the page to show updated data
            setTimeout(() => {
                renderSettingsPage();
            }, 1000);
        } else {
            showToast(response.message || 'Failed to update profile', 'error');
        }
    } catch (error) {
        console.error('Profile update error:', error);
        showToast(error.message || 'Failed to update profile', 'error');
    }
};

// Handle avatar upload
window.handleAvatarUpload = function() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';

    input.onchange = async function(e) {
        const file = e.target.files[0];
        if (!file) return;

        // Validate file size (max 5MB)
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
            console.error('Avatar upload error:', error);
            showToast(error.message || 'Failed to upload avatar', 'error');
        }
    };

    input.click();
};

// Handle cover image upload
window.handleCoverUpload = function() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';

    input.onchange = async function(e) {
        const file = e.target.files[0];
        if (!file) return;

        // Validate file size (max 5MB)
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
            console.error('Cover upload error:', error);
            showToast(error.message || 'Failed to upload cover image', 'error');
        }
    };

    input.click();
};

// Toggle switch
window.toggleSwitch = function(element) {
    element.classList.toggle('active');
    const isActive = element.classList.contains('active');
    const label = element.previousElementSibling.querySelector('.settings-item-label').textContent;

    showToast(`${label} ${isActive ? 'enabled' : 'disabled'}`, 'success');
};

// Handle profile visibility change
window.handleProfileVisibilityChange = function(value) {
    const visibilityLabels = {
        'public': 'Public',
        'private': 'Private',
        'clients': 'Clients only'
    };

    showToast(`Profile visibility set to ${visibilityLabels[value]}`, 'success');
};

// Show change password modal
window.showChangePasswordModal = function() {
    const modal = document.createElement('div');
    modal.className = 'modal-overlay';
    modal.innerHTML = `
        <div class="modal">
            <div class="modal-header">
                <h2>Change password</h2>
                <button class="modal-close" onclick="this.closest('.modal-overlay').remove()">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                        <path d="M18 6L6 18M6 6l12 12" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
                    </svg>
                </button>
            </div>
            <form onsubmit="handlePasswordChange(event)">
                <div class="form-group">
                    <label class="form-label">Current password</label>
                    <input type="password" class="form-input" id="currentPassword" required>
                </div>
                <div class="form-group">
                    <label class="form-label">New password</label>
                    <input type="password" class="form-input" id="newPassword" required minlength="8">
                    <div class="caption mt-sm">Minimum 8 characters</div>
                </div>
                <div class="form-group">
                    <label class="form-label">Confirm new password</label>
                    <input type="password" class="form-input" id="confirmPassword" required>
                </div>
                <div class="form-actions">
                    <button type="button" class="btn-ghost" onclick="this.closest('.modal-overlay').remove()">Cancel</button>
                    <button type="submit" class="btn-primary">Change password</button>
                </div>
            </form>
        </div>
    `;
    document.body.appendChild(modal);
};

// Handle password change
window.handlePasswordChange = async function(event) {
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
        console.error('Password change error:', error);
        showToast(error.message || 'Failed to change password', 'error');
    }
};

// Show two-factor authentication modal
window.showTwoFactorModal = function() {
    const modal = document.createElement('div');
    modal.className = 'modal-overlay';
    modal.innerHTML = `
        <div class="modal">
            <div class="modal-header">
                <h2>Two-factor authentication</h2>
                <button class="modal-close" onclick="this.closest('.modal-overlay').remove()">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                        <path d="M18 6L6 18M6 6l12 12" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
                    </svg>
                </button>
            </div>
            <div class="modal-body">
                <p>Two-factor authentication adds an extra layer of security to your account by requiring a verification code in addition to your password.</p>
                <p class="mt-md">This feature will be available soon!</p>
            </div>
            <div class="form-actions">
                <button class="btn-primary" onclick="this.closest('.modal-overlay').remove()">Close</button>
            </div>
        </div>
    `;
    document.body.appendChild(modal);
};

// Show delete account modal
window.showDeleteAccountModal = function() {
    const modal = document.createElement('div');
    modal.className = 'modal-overlay';
    modal.innerHTML = `
        <div class="modal">
            <div class="modal-header">
                <h2 style="color: var(--error);">Delete account</h2>
                <button class="modal-close" onclick="this.closest('.modal-overlay').remove()">
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
            </div>
            <form onsubmit="handleAccountDeletion(event)">
                <div class="form-group">
                    <label class="form-label">Enter your password to confirm</label>
                    <input type="password" class="form-input" id="deleteAccountPassword" required placeholder="Your password">
                </div>
                <div class="form-actions">
                    <button type="button" class="btn-ghost" onclick="this.closest('.modal-overlay').remove()">Cancel</button>
                    <button type="submit" class="btn-primary" style="background: var(--error); border-color: var(--error);">Delete my account</button>
                </div>
            </form>
        </div>
    `;
    document.body.appendChild(modal);
};

// Handle account deletion
window.handleAccountDeletion = async function(event) {
    event.preventDefault();

    const password = document.getElementById('deleteAccountPassword').value;

    if (!password) {
        showToast('Please enter your password', 'error');
        return;
    }

    // Double confirmation
    const confirmed = confirm('Are you absolutely sure you want to delete your account? This cannot be undone.');
    if (!confirmed) return;

    try {
        showToast('Deleting account...', 'info');

        const response = await api.deleteAccount(password);

        if (response.success) {
            showToast('Account deleted successfully. Goodbye!', 'success');

            // Clear auth data
            localStorage.removeItem('token');
            setUser(null);

            // Close modal and redirect to home
            document.querySelector('.modal-overlay').remove();

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
