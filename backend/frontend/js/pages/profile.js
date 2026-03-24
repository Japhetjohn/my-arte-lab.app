import { appState } from '../state.js';
import { getAvatarUrl } from '../utils/avatar.js';
import api from '../services/api.js';

// ==================== PROFILE PAGE - GLOBAL STANDARDS ====================
// Clean, modern design inspired by Airbnb, Uber, Instagram

let currentTab = 'overview';
let userServices = [];
let isLoading = false;

function renderSkeleton() {
    return `
        <div class="profile-page">
            <!-- Skeleton Header -->
            <div class="profile-header-skeleton">
                <div class="skeleton" style="width: 100%; height: 100%;"></div>
            </div>
            
            <!-- Skeleton Content -->
            <div class="profile-body" style="padding: 0 20px;">
                <div style="display: flex; align-items: flex-end; gap: 16px; margin-bottom: 24px;">
                    <div class="skeleton" style="width: 100px; height: 100px; border-radius: 50%; margin-top: -50px; border: 4px solid white;"></div>
                    <div style="flex: 1; padding-bottom: 8px;">
                        <div class="skeleton" style="width: 150px; height: 24px; margin-bottom: 8px;"></div>
                        <div class="skeleton" style="width: 100px; height: 16px;"></div>
                    </div>
                </div>
                
                <div class="skeleton" style="height: 80px; border-radius: 16px; margin-bottom: 16px;"></div>
                
                <div style="display: flex; flex-direction: column; gap: 12px;">
                    <div class="skeleton" style="height: 56px; border-radius: 12px;"></div>
                    <div class="skeleton" style="height: 56px; border-radius: 12px;"></div>
                    <div class="skeleton" style="height: 56px; border-radius: 12px;"></div>
                    <div class="skeleton" style="height: 56px; border-radius: 12px;"></div>
                </div>
            </div>
        </div>
    `;
}

export async function renderProfilePage() {
    const mainContent = document.getElementById('mainContent');
    
    // Show skeleton immediately
    mainContent.innerHTML = renderSkeleton();
    
    // Check auth
    if (!appState.user) {
        renderAuthPrompt(mainContent);
        return;
    }
    
    const user = appState.user;
    const isCreator = user.role?.toLowerCase().includes('creator');
    
    // Load creator services if applicable
    if (isCreator && userServices.length === 0) {
        try {
            const response = await api.getMyServices();
            if (response.success) {
                userServices = response.data.services || [];
            }
        } catch (e) {
            console.error('Failed to load services:', e);
        }
    }
    
    // Render the profile
    mainContent.innerHTML = buildProfileHTML(user, isCreator);
    attachEventListeners(user, isCreator);
}

function renderAuthPrompt(container) {
    container.innerHTML = `
        <div class="profile-auth-prompt">
            <div class="auth-icon">
                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
                    <circle cx="12" cy="7" r="4"/>
                </svg>
            </div>
            <h2>Your Profile</h2>
            <p>Sign in to view your profile, manage bookings, and track your earnings.</p>
            <button class="btn-primary btn-large" onclick="showAuthModal('signin')">
                Sign In to Continue
            </button>
        </div>
    `;
}

function buildProfileHTML(user, isCreator) {
    const avatarUrl = getAvatarUrl(user);
    const displayLocation = formatLocation(user.location);
    const memberSince = new Date(user.createdAt).toLocaleDateString('en-US', { 
        month: 'short', 
        year: 'numeric' 
    });
    
    return `
        <div class="profile-page">
            <!-- Header Section -->
            <div class="profile-header">
                <div class="profile-cover"></div>
                <div class="profile-header-content">
                    <div class="profile-avatar-section">
                        <div class="profile-avatar-wrapper">
                            <img src="${avatarUrl}" alt="${user.name}" class="profile-avatar-img">
                            ${user.verified ? `
                                <div class="verified-badge" title="Verified Creator">
                                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3">
                                        <polyline points="20 6 9 17 4 12"/>
                                    </svg>
                                </div>
                            ` : ''}
                            <button class="avatar-edit-btn" onclick="window.editAvatar()" title="Change photo">
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                    <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/>
                                    <circle cx="12" cy="13" r="4"/>
                                </svg>
                            </button>
                        </div>
                        
                        <div class="profile-info">
                            <h1 class="profile-name">${user.name}</h1>
                            <p class="profile-role">${isCreator ? (user.category || 'Creator') : 'Client'}</p>
                            <div class="profile-meta">
                                ${displayLocation ? `
                                    <span class="meta-item">
                                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                            <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/>
                                            <circle cx="12" cy="10" r="3"/>
                                        </svg>
                                        ${displayLocation}
                                    </span>
                                ` : ''}
                                <span class="meta-item">
                                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                        <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
                                        <line x1="16" y1="2" x2="16" y2="6"/>
                                        <line x1="8" y1="2" x2="8" y2="6"/>
                                        <line x1="3" y1="10" x2="21" y2="10"/>
                                    </svg>
                                    Joined ${memberSince}
                                </span>
                            </div>
                        </div>
                    </div>
                    
                    <button class="btn-edit-profile" onclick="navigateToPage('settings')">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                        </svg>
                        Edit
                    </button>
                </div>
            </div>

            <!-- Main Content -->
            <div class="profile-body">
                ${isCreator ? renderCreatorStats(user) : ''}
                
                <!-- Tab Navigation -->
                <div class="profile-tabs">
                    <button class="tab-btn ${currentTab === 'overview' ? 'active' : ''}" data-tab="overview">
                        Overview
                    </button>
                    <button class="tab-btn ${currentTab === 'activity' ? 'active' : ''}" data-tab="activity">
                        Activity
                    </button>
                    ${isCreator ? `
                        <button class="tab-btn ${currentTab === 'services' ? 'active' : ''}" data-tab="services">
                            Services
                        </button>
                    ` : ''}
                    <button class="tab-btn ${currentTab === 'settings' ? 'active' : ''}" data-tab="settings">
                        Settings
                    </button>
                </div>

                <!-- Tab Content -->
                <div class="tab-content">
                    ${renderTabContent(currentTab, user, isCreator)}
                </div>
            </div>
        </div>
    `;
}

function renderCreatorStats(user) {
    const rating = user.rating?.average?.toFixed(1) || '0.0';
    const reviewCount = user.rating?.count || 0;
    const completedJobs = user.completedBookings || 0;
    const responseRate = user.metrics?.responseRate || 95;
    
    return `
        <div class="stats-grid">
            <div class="stat-card">
                <div class="stat-icon rating">
                    <svg viewBox="0 0 24 24" fill="currentColor">
                        <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
                    </svg>
                </div>
                <div class="stat-value">${rating}</div>
                <div class="stat-label">${reviewCount} reviews</div>
            </div>
            
            <div class="stat-card">
                <div class="stat-icon jobs">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <rect x="2" y="7" width="20" height="14" rx="2" ry="2"/>
                        <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/>
                    </svg>
                </div>
                <div class="stat-value">${completedJobs}</div>
                <div class="stat-label">Jobs done</div>
            </div>
            
            <div class="stat-card">
                <div class="stat-icon response">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
                        <polyline points="22 4 12 14.01 9 11.01"/>
                    </svg>
                </div>
                <div class="stat-value">${responseRate}%</div>
                <div class="stat-label">Response</div>
            </div>
        </div>
    `;
}

function renderTabContent(tab, user, isCreator) {
    switch(tab) {
        case 'overview':
            return renderOverviewTab(user, isCreator);
        case 'activity':
            return renderActivityTab(user, isCreator);
        case 'services':
            return isCreator ? renderServicesTab() : '';
        case 'settings':
            return renderSettingsTab();
        default:
            return renderOverviewTab(user, isCreator);
    }
}

function renderOverviewTab(user, isCreator) {
    const quickActions = [
        { icon: 'wallet', label: 'Wallet', path: 'wallet', color: 'purple' },
        { icon: 'calendar', label: 'Bookings', path: 'bookings', color: 'blue' },
        ...(isCreator ? [{ icon: 'briefcase', label: 'Projects', path: 'projects', color: 'green' }] : []),
        { icon: 'heart', label: 'Saved', path: 'saved', color: 'pink' },
    ];
    
    return `
        <div class="tab-panel overview-tab">
            <!-- About Section -->
            ${user.bio ? `
                <div class="profile-section">
                    <h3 class="section-title">About</h3>
                    <p class="profile-bio">${user.bio}</p>
                </div>
            ` : ''}
            
            <!-- Quick Actions -->
            <div class="profile-section">
                <h3 class="section-title">Quick Actions</h3>
                <div class="quick-actions-grid">
                    ${quickActions.map(action => `
                        <button class="quick-action-btn ${action.color}" onclick="navigateToPage('${action.path}')">
                            <div class="action-icon">
                                ${getIconSvg(action.icon)}
                            </div>
                            <span>${action.label}</span>
                        </button>
                    `).join('')}
                </div>
            </div>
            
            <!-- Contact Info -->
            <div class="profile-section">
                <h3 class="section-title">Contact</h3>
                <div class="contact-list">
                    <div class="contact-item">
                        <div class="contact-icon">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
                                <polyline points="22,6 12,13 2,6"/>
                            </svg>
                        </div>
                        <div class="contact-info">
                            <span class="contact-label">Email</span>
                            <span class="contact-value">${user.email}</span>
                        </div>
                    </div>
                    
                    ${user.phone ? `
                        <div class="contact-item">
                            <div class="contact-icon">
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                    <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z"/>
                                </svg>
                            </div>
                            <div class="contact-info">
                                <span class="contact-label">Phone</span>
                                <span class="contact-value">${user.phone}</span>
                            </div>
                        </div>
                    ` : ''}
                </div>
            </div>
            
            <!-- Logout -->
            <button class="logout-btn" onclick="handleLogout()">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
                    <polyline points="16 17 21 12 16 7"/>
                    <line x1="21" y1="12" x2="9" y2="12"/>
                </svg>
                Sign Out
            </button>
        </div>
    `;
}

function renderActivityTab(user, isCreator) {
    return `
        <div class="tab-panel activity-tab">
            <div class="activity-empty">
                <div class="empty-icon">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                        <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
                        <line x1="16" y1="2" x2="16" y2="6"/>
                        <line x1="8" y1="2" x2="8" y2="6"/>
                        <line x1="3" y1="10" x2="21" y2="10"/>
                    </svg>
                </div>
                <h4>No recent activity</h4>
                <p>Your bookings and transactions will appear here</p>
                <button class="btn-primary" onclick="navigateToPage('creators')">
                    Explore Creators
                </button>
            </div>
        </div>
    `;
}

function renderServicesTab() {
    if (userServices.length === 0) {
        return `
            <div class="tab-panel services-tab">
                <div class="services-empty">
                    <div class="empty-icon">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                            <rect x="2" y="3" width="20" height="14" rx="2" ry="2"/>
                            <line x1="8" y1="21" x2="16" y2="21"/>
                            <line x1="12" y1="17" x2="12" y2="21"/>
                        </svg>
                    </div>
                    <h4>No services yet</h4>
                    <p>Add your first service to start receiving bookings</p>
                    <button class="btn-primary" onclick="window.showAddServiceModal()">
                        Add Service
                    </button>
                </div>
            </div>
        `;
    }
    
    return `
        <div class="tab-panel services-tab">
            <div class="services-list">
                ${userServices.map(service => `
                    <div class="service-card">
                        <div class="service-info">
                            <h4>${service.title}</h4>
                            <p>${service.description?.substring(0, 100)}...</p>
                            <div class="service-meta">
                                <span class="service-price">$${service.price}</span>
                                <span class="service-status ${service.active !== false ? 'active' : 'inactive'}">
                                    ${service.active !== false ? 'Active' : 'Inactive'}
                                </span>
                            </div>
                        </div>
                        <button class="service-edit-btn" onclick="window.editService('${service._id}')">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                            </svg>
                        </button>
                    </div>
                `).join('')}
            </div>
            <button class="btn-add-service" onclick="window.showAddServiceModal()">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <line x1="12" y1="5" x2="12" y2="19"/>
                    <line x1="5" y1="12" x2="19" y2="12"/>
                </svg>
                Add New Service
            </button>
        </div>
    `;
}

function renderSettingsTab() {
    const settingsItems = [
        { icon: 'user', label: 'Personal Information', path: 'settings' },
        { icon: 'bell', label: 'Notifications', path: 'notifications' },
        { icon: 'shield', label: 'Privacy & Security', path: 'privacy' },
        { icon: 'help', label: 'Help & Support', action: 'showHelpSupportModal()' },
        { icon: 'file', label: 'Terms of Service', path: 'terms' },
    ];
    
    return `
        <div class="tab-panel settings-tab">
            <div class="settings-list">
                ${settingsItems.map(item => `
                    <button class="settings-item" onclick="${item.action || `navigateToPage('${item.path}')`}">
                        <div class="settings-icon">
                            ${getIconSvg(item.icon)}
                        </div>
                        <span class="settings-label">${item.label}</span>
                        <svg class="settings-arrow" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <polyline points="9 18 15 12 9 6"/>
                        </svg>
                    </button>
                `).join('')}
            </div>
        </div>
    `;
}

// ==================== UTILITY FUNCTIONS ====================

function formatLocation(location) {
    if (!location) return null;
    if (typeof location === 'string') return location;
    if (typeof location === 'object') {
        const parts = [];
        if (location.city) parts.push(location.city);
        if (location.country) parts.push(location.country);
        return parts.join(', ') || null;
    }
    return null;
}

function getIconSvg(name) {
    const icons = {
        wallet: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="5" width="20" height="14" rx="2" ry="2"/><line x1="16" y1="12" x2="16" y2="12"/></svg>',
        calendar: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>',
        briefcase: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="7" width="20" height="14" rx="2" ry="2"/><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/></svg>',
        heart: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>',
        user: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>',
        bell: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>',
        shield: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>',
        help: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>',
        file: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14,2 14,8 20,8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10,9 9,9 8,9"/></svg>',
    };
    return icons[name] || '';
}

function attachEventListeners(user, isCreator) {
    // Tab switching
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            currentTab = e.target.dataset.tab;
            // Re-render just the content area
            const contentDiv = document.querySelector('.tab-content');
            if (contentDiv) {
                contentDiv.innerHTML = renderTabContent(currentTab, user, isCreator);
            }
            // Update active state
            document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
            e.target.classList.add('active');
        });
    });
}

// ==================== WINDOW EXPORTS ====================

window.editAvatar = function() {
    if (window.showAvatarUpload) {
        window.showAvatarUpload();
    } else {
        console.log('Avatar upload not available');
    }
};

window.editService = function(serviceId) {
    console.log('Edit service:', serviceId);
    // Implement service editing
};

window.showAddServiceModal = function() {
    console.log('Add service modal');
    // Implement add service
};

window.showHelpSupportModal = function() {
    // Simple help modal or redirect
    alert('Help & Support: Contact us at support@myartelab.com');
};
