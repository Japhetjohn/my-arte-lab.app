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

                ${appState.user.role === 'creator' ? `
                <!-- Services Management Section -->
                <div class="settings-section mt-lg" id="servicesSection">
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px;">
                        <h3 class="settings-section-title">My Services</h3>
                        <button class="btn-primary" onclick="window.showAddServiceModal()">
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" style="margin-right: 6px; vertical-align: middle;">
                                <path d="M12 5v14M5 12h14" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
                            </svg>
                            Add Service
                        </button>
                    </div>
                    <div id="servicesListContainer">
                        <div style="text-align: center; padding: 40px; color: var(--text-secondary);">Loading services...</div>
                    </div>
                </div>
                ` : ''}

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

    // Load services for creators
    if (appState.user.role === 'creator') {
        loadServices();
    }
}

// Services Management Functions
async function loadServices() {
    try {
        const response = await api.getMyServices();
        if (response.success) {
            renderServicesList(response.data.services || []);
        }
    } catch (error) {
        console.error('Failed to load services:', error);
        document.getElementById('servicesListContainer').innerHTML = `
            <div style="text-align: center; padding: 40px;">
                <p style="color: var(--error);">Failed to load services</p>
                <button class="btn-secondary" onclick="loadServices()">Retry</button>
            </div>
        `;
    }
}

function renderServicesList(services) {
    const container = document.getElementById('servicesListContainer');
    if (!container) return;

    if (services.length === 0) {
        container.innerHTML = `
            <div style="text-align: center; padding: 40px; background: var(--surface); border-radius: 12px; border: 2px dashed var(--border);">
                <svg width="64" height="64" viewBox="0 0 24 24" fill="none" style="opacity: 0.3; margin: 0 auto 16px;">
                    <rect x="3" y="6" width="18" height="12" rx="2" stroke="currentColor" stroke-width="2"/>
                    <path d="M7 10h10M7 14h6" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
                </svg>
                <h3 style="margin-bottom: 8px;">No Services Yet</h3>
                <p style="color: var(--text-secondary); margin-bottom: 16px;">Add your first service to start receiving bookings</p>
                <button class="btn-primary" onclick="window.showAddServiceModal()">Add Service</button>
            </div>
        `;
        return;
    }

    container.innerHTML = services.map(service => `
        <div class="card" style="margin-bottom: 16px; padding: 20px;">
            ${service.images && service.images.length > 0 ? `
                <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(100px, 1fr)); gap: 8px; margin-bottom: 16px;">
                    ${service.images.map((img, idx) => `
                        <div style="position: relative;">
                            <img src="${img}" alt="${service.title}" style="width: 100%; height: 80px; object-fit: cover; border-radius: 8px;">
                            <button onclick="window.deleteServiceImage('${service._id}', ${idx})" style="position: absolute; top: 4px; right: 4px; background: rgba(0,0,0,0.7); color: white; border: none; border-radius: 50%; width: 24px; height: 24px; cursor: pointer; display: flex; align-items: center; justify-content: center;">
                                ×
                            </button>
                        </div>
                    `).join('')}
                    ${service.images.length < 5 ? `
                        <button onclick="window.uploadServiceImage('${service._id}')" style="width: 100%; height: 80px; border: 2px dashed var(--border); border-radius: 8px; background: var(--surface); cursor: pointer; display: flex; align-items: center; justify-content: center; color: var(--primary);">
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                                <path d="M12 5v14M5 12h14" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
                            </svg>
                        </button>
                    ` : ''}
                </div>
            ` : `
                <button onclick="window.uploadServiceImage('${service._id}')" style="width: 100%; padding: 40px; border: 2px dashed var(--border); border-radius: 8px; background: var(--surface); cursor: pointer; display: flex; flex-direction: column; align-items: center; justify-content: center; color: var(--primary); margin-bottom: 16px;">
                    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" style="margin-bottom: 8px;">
                        <rect x="3" y="3" width="18" height="18" rx="2" stroke="currentColor" stroke-width="2"/>
                        <circle cx="8.5" cy="8.5" r="1.5" fill="currentColor"/>
                        <path d="M21 15l-5-5L5 21" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                    </svg>
                    <span>Add Images (max 5)</span>
                </button>
            `}
            <h3 style="font-size: 18px; margin-bottom: 8px;">${service.title}</h3>
            <p style="color: var(--text-secondary); margin-bottom: 12px; line-height: 1.6;">${service.description}</p>
            ${service.directLink ? `
                <div style="margin-bottom: 12px;">
                    <a href="${service.directLink}" target="_blank" rel="noopener noreferrer" style="color: var(--primary); text-decoration: none; font-size: 14px; display: inline-flex; align-items: center; gap: 4px;">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                            <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6M15 3h6v6M10 14L21 3" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                        </svg>
                        ${service.directLink}
                    </a>
                </div>
            ` : ''}
            <div style="display: flex; gap: 8px; margin-top: 16px;">
                <button class="btn-secondary" onclick="window.editService('${service._id}')" style="flex: 1;">Edit</button>
                <button class="btn-ghost" onclick="window.deleteService('${service._id}')" style="flex: 1; color: var(--error); border-color: var(--error);">Delete</button>
            </div>
        </div>
    `).join('');
}

// Show add service modal
window.showAddServiceModal = function() {
    const modal = `
        <div class="modal" onclick="closeModalOnBackdrop(event)">
            <div class="modal-content">
                <div class="modal-header">
                    <h2>Add New Service</h2>
                    <button class="icon-btn" onclick="closeModal()">
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                            <path d="M18 6L6 18M6 6l12 12" stroke="currentColor" stroke-width="2"/>
                        </svg>
                    </button>
                </div>
                <form onsubmit="window.handleAddService(event)" style="padding: 20px;">
                    <div class="form-group">
                        <label class="form-label">Service Title</label>
                        <input type="text" id="serviceTitle" class="form-input" required maxlength="100" placeholder="e.g., Wedding Photography Package">
                    </div>
                    <div class="form-group">
                        <label class="form-label">Description</label>
                        <textarea id="serviceDescription" class="form-textarea" required rows="5" placeholder="Describe your service in detail..."></textarea>
                    </div>
                    <div class="form-group">
                        <label class="form-label">Direct Link (Optional)</label>
                        <input type="url" id="serviceLink" class="form-input" placeholder="https://example.com/portfolio">
                        <div class="caption mt-sm">Link to portfolio, external page, or additional details</div>
                    </div>
                    <div class="form-actions">
                        <button type="button" class="btn-ghost" onclick="closeModal()">Cancel</button>
                        <button type="submit" class="btn-primary">Add Service</button>
                    </div>
                </form>
            </div>
        </div>
    `;
    document.getElementById('modalsContainer').innerHTML = modal;
    document.body.style.overflow = 'hidden';
};

// Handle add service
window.handleAddService = async function(event) {
    event.preventDefault();
    const submitBtn = event.target.querySelector('button[type="submit"]');
    submitBtn.disabled = true;
    submitBtn.textContent = 'Adding...';

    try {
        const response = await api.addService({
            title: document.getElementById('serviceTitle').value,
            description: document.getElementById('serviceDescription').value,
            directLink: document.getElementById('serviceLink').value || undefined
        });

        if (response.success) {
            window.closeModal();
            window.showToast('Service added successfully!', 'success');
            loadServices();
        }
    } catch (error) {
        console.error('Failed to add service:', error);
        window.showToast(error.message || 'Failed to add service', 'error');
        submitBtn.disabled = false;
        submitBtn.textContent = 'Add Service';
    }
};

// Edit service
window.editService = async function(serviceId) {
    try {
        const response = await api.getMyServices();
        const service = response.data.services.find(s => s._id === serviceId);
        if (!service) return;

        const modal = `
            <div class="modal" onclick="closeModalOnBackdrop(event)">
                <div class="modal-content">
                    <div class="modal-header">
                        <h2>Edit Service</h2>
                        <button class="icon-btn" onclick="closeModal()">
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                                <path d="M18 6L6 18M6 6l12 12" stroke="currentColor" stroke-width="2"/>
                            </svg>
                        </button>
                    </div>
                    <form onsubmit="window.handleEditService(event, '${serviceId}')" style="padding: 20px;">
                        <div class="form-group">
                            <label class="form-label">Service Title</label>
                            <input type="text" id="serviceTitle" class="form-input" required maxlength="100" value="${service.title}">
                        </div>
                        <div class="form-group">
                            <label class="form-label">Description</label>
                            <textarea id="serviceDescription" class="form-textarea" required rows="5">${service.description}</textarea>
                        </div>
                        <div class="form-group">
                            <label class="form-label">Direct Link (Optional)</label>
                            <input type="url" id="serviceLink" class="form-input" value="${service.directLink || ''}" placeholder="https://example.com/portfolio">
                        </div>
                        <div class="form-actions">
                            <button type="button" class="btn-ghost" onclick="closeModal()">Cancel</button>
                            <button type="submit" class="btn-primary">Save Changes</button>
                        </div>
                    </form>
                </div>
            </div>
        `;
        document.getElementById('modalsContainer').innerHTML = modal;
        document.body.style.overflow = 'hidden';
    } catch (error) {
        console.error('Failed to load service:', error);
        window.showToast('Failed to load service', 'error');
    }
};

// Handle edit service
window.handleEditService = async function(event, serviceId) {
    event.preventDefault();
    const submitBtn = event.target.querySelector('button[type="submit"]');
    submitBtn.disabled = true;
    submitBtn.textContent = 'Saving...';

    try {
        const response = await api.updateService(serviceId, {
            title: document.getElementById('serviceTitle').value,
            description: document.getElementById('serviceDescription').value,
            directLink: document.getElementById('serviceLink').value || undefined
        });

        if (response.success) {
            window.closeModal();
            window.showToast('Service updated successfully!', 'success');
            loadServices();
        }
    } catch (error) {
        console.error('Failed to update service:', error);
        window.showToast(error.message || 'Failed to update service', 'error');
        submitBtn.disabled = false;
        submitBtn.textContent = 'Save Changes';
    }
};

// Delete service
window.deleteService = async function(serviceId) {
    if (!confirm('Are you sure you want to delete this service?')) return;

    try {
        const response = await api.deleteService(serviceId);
        if (response.success) {
            window.showToast('Service deleted successfully!', 'success');
            loadServices();
        }
    } catch (error) {
        console.error('Failed to delete service:', error);
        window.showToast(error.message || 'Failed to delete service', 'error');
    }
};

// Upload service image
window.uploadServiceImage = function(serviceId) {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.onchange = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        if (file.size > 5 * 1024 * 1024) {
            window.showToast('Image must be less than 5MB', 'error');
            return;
        }

        try {
            window.showToast('Uploading image...', 'info');
            const response = await api.uploadServiceImage(serviceId, file);
            if (response.success) {
                window.showToast('Image uploaded successfully!', 'success');
                loadServices();
            }
        } catch (error) {
            console.error('Failed to upload image:', error);
            window.showToast(error.message || 'Failed to upload image', 'error');
        }
    };
    input.click();
};

// Delete service image
window.deleteServiceImage = async function(serviceId, imageIndex) {
    if (!confirm('Delete this image?')) return;

    try {
        const response = await api.deleteServiceImage(serviceId, imageIndex);
        if (response.success) {
            window.showToast('Image deleted successfully!', 'success');
            loadServices();
        }
    } catch (error) {
        console.error('Failed to delete image:', error);
        window.showToast(error.message || 'Failed to delete image', 'error');
    }
};

// Make loadServices available globally
window.loadServices = loadServices;
