// Settings Page Module
import { appState } from '../state.js';
import api from '../services/api.js';

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
                            <p class="caption mt-sm">${appState.user.type === 'creator' ? 'Creator Account' : 'Client Account'}</p>
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

                        ${appState.user.type === 'creator' ? `
                            <div class="form-group">
                                <label class="form-label">Professional title</label>
                                <input type="text" class="form-input" value="${appState.user.role || ''}" id="profileRole" placeholder="e.g. Wedding Photographer">
                            </div>

                            <div class="form-group">
                                <label class="form-label">Skills</label>
                                <input type="text" class="form-input" value="${appState.user.skills || ''}" id="profileSkills" placeholder="Photography, Photoshop, Lightroom">
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
                        <select class="form-select" style="width: auto;">
                            <option>Public</option>
                            <option>Private</option>
                            <option>Clients only</option>
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
