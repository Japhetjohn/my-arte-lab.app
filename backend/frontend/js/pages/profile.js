import { appState } from '../state.js';
import { getAvatarUrl } from '../utils/avatar.js';
import { renderProfileCompletionWidget } from '../utils/profileCompletion.js';
import api from '../services/api.js';

function renderProfileSkeleton() {
    return `
        <div class="profile-app">
            <!-- Skeleton Header -->
            <div class="skeleton skeleton-profile-header" style="height: 160px; width: 100%; border-radius: 0 0 24px 24px;"></div>
            <div style="padding: 0 24px;">
                <div class="skeleton skeleton-avatar" style="width: 100px; height: 100px; border-radius: 50%; margin: -50px auto 16px; border: 4px solid white;"></div>
                <div class="skeleton skeleton-text large" style="height: 24px; width: 200px; margin: 0 auto 8px;"></div>
                <div class="skeleton skeleton-text" style="height: 16px; width: 150px; margin: 0 auto 24px;"></div>
                
                <!-- Skeleton Menu Items -->
                <div style="display: flex; flex-direction: column; gap: 12px; max-width: 400px; margin: 0 auto;">
                    <div class="skeleton" style="height: 56px; border-radius: 16px;"></div>
                    <div class="skeleton" style="height: 56px; border-radius: 16px;"></div>
                    <div class="skeleton" style="height: 56px; border-radius: 16px;"></div>
                    <div class="skeleton" style="height: 56px; border-radius: 16px;"></div>
                </div>
            </div>
        </div>
    `;
}

export async function renderProfilePage() {
    const mainContent = document.getElementById('mainContent');
    
    // Show skeleton while loading
    mainContent.innerHTML = renderProfileSkeleton();

    if (!appState.user) {
        mainContent.innerHTML = `
            <div style="min-height: 60vh; display: flex; align-items: center; justify-content: center; padding: 40px 20px;">
                <div style="text-align: center; max-width: 400px;">
                    <div style="width: 80px; height: 80px; background: linear-gradient(135deg, rgba(151,71,255,0.15), rgba(107,70,255,0.15)); border-radius: 24px; display: flex; align-items: center; justify-content: center; margin: 0 auto 24px; border: 1px solid rgba(151,71,255,0.2);">
                        <svg width="36" height="36" viewBox="0 0 24 24" fill="none" style="color: var(--primary);">
                            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4" stroke="currentColor" stroke-width="2"/>
                        </svg>
                    </div>
                    <h2 style="margin-bottom: 8px; font-size: 22px;">Your Profile</h2>
                    <p style="color: var(--text-secondary); margin-bottom: 24px; line-height: 1.6;">Sign in to manage your professional presence</p>
                    <button class="btn-primary" onclick="showAuthModal('signin')">Sign in to continue</button>
                </div>
            </div>
        `;
        return;
    }

    const user = appState.user;
    const avatarUrl = getAvatarUrl(user);
    const isCreator = user.role && user.role.toLowerCase().includes('creator');

    let services = [];
    if (isCreator) {
        try {
            const response = await api.getMyServices();
            if (response.success) services = response.data.services || [];
        } catch (e) { console.error('Failed to load services:', e); }
    }

    const userLocation = user.location
        ? (typeof user.location === 'object'
            ? `${user.location.city || ''}${user.location.city && user.location.country ? ', ' : ''}${user.location.country || ''}`.trim()
            : user.location)
        : 'Nigeria';
    const userRating = user.rating?.average?.toFixed(1) || '0.0';
    const reviewCount = user.rating?.count || 0;
    const categoryLabel = isCreator ? (user.category ? user.category.charAt(0).toUpperCase() + user.category.slice(1) : 'Creator') : 'Client';

    mainContent.innerHTML = `
        <div class="profile-app">
            <!-- Purple Header with Avatar -->
            <div class="profile-header">
                <div class="profile-header-bg"></div>
                <div class="profile-avatar-wrap">
                    <img src="${avatarUrl}" alt="${user.name}" class="profile-avatar">
                    ${user.verified ? `
                        <div class="profile-verified-badge">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3">
                                <polyline points="20 6 9 17 4 12"></polyline>
                            </svg>
                        </div>
                    ` : ''}
                </div>
                <h1 class="profile-name">${user.name}</h1>
                <p class="profile-email">${user.email}</p>
            </div>

            <!-- Content Section -->
            <div class="profile-content">
                ${isCreator ? `
                    <!-- Creator Stats Card -->
                    <div class="profile-card stats-card">
                        <div class="stat-item">
                            <span class="stat-value">${userRating}</span>
                            <span class="stat-label">Rating</span>
                        </div>
                        <div class="stat-divider"></div>
                        <div class="stat-item">
                            <span class="stat-value">${reviewCount}</span>
                            <span class="stat-label">Reviews</span>
                        </div>
                        <div class="stat-divider"></div>
                        <div class="stat-item">
                            <span class="stat-value">${user.completedJobs || 0}</span>
                            <span class="stat-label">Jobs</span>
                        </div>
                    </div>
                ` : ''}

                <!-- Menu Items -->
                <div class="profile-menu">
                    <div class="menu-section-title">Account</div>
                    
                    <a href="#" class="menu-item" onclick="navigateToPage('settings'); return false;">
                        <div class="menu-icon">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <circle cx="12" cy="12" r="3"/>
                                <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/>
                            </svg>
                        </div>
                        <span class="menu-text">Edit Profile</span>
                        <svg class="menu-arrow" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <polyline points="9 18 15 12 9 6"/>
                        </svg>
                    </a>

                    ${isCreator ? `
                        <a href="#" class="menu-item" onclick="navigateToPage('projects'); return false;">
                            <div class="menu-icon">
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                    <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/>
                                </svg>
                            </div>
                            <span class="menu-text">My Projects</span>
                            <svg class="menu-arrow" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <polyline points="9 18 15 12 9 6"/>
                            </svg>
                        </a>

                        <a href="#" class="menu-item" onclick="navigateToPage('services'); return false;">
                            <div class="menu-icon">
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                    <rect x="2" y="3" width="20" height="14" rx="2" ry="2"/>
                                    <line x1="8" y1="21" x2="16" y2="21"/>
                                    <line x1="12" y1="17" x2="12" y2="21"/>
                                </svg>
                            </div>
                            <span class="menu-text">My Services</span>
                            <svg class="menu-arrow" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <polyline points="9 18 15 12 9 6"/>
                            </svg>
                        </a>
                    ` : ''}

                    <a href="#" class="menu-item" onclick="navigateToPage('bookings'); return false;">
                        <div class="menu-icon">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
                                <line x1="16" y1="2" x2="16" y2="6"/>
                                <line x1="8" y1="2" x2="8" y2="6"/>
                                <line x1="3" y1="10" x2="21" y2="10"/>
                            </svg>
                        </div>
                        <span class="menu-text">My Bookings</span>
                        <svg class="menu-arrow" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <polyline points="9 18 15 12 9 6"/>
                        </svg>
                    </a>

                    <a href="#" class="menu-item" onclick="navigateToPage('wallet'); return false;">
                        <div class="menu-icon">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <rect x="2" y="5" width="20" height="14" rx="2" ry="2"/>
                                <line x1="16" y1="12" x2="16" y2="12"/>
                            </svg>
                        </div>
                        <span class="menu-text">Wallet</span>
                        <svg class="menu-arrow" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <polyline points="9 18 15 12 9 6"/>
                        </svg>
                    </a>
                </div>

                <!-- Preferences Section -->
                <div class="profile-menu">
                    <div class="menu-section-title">Preferences</div>
                    
                    <a href="#" class="menu-item" onclick="navigateToPage('notifications'); return false;">
                        <div class="menu-icon">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
                                <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
                            </svg>
                        </div>
                        <span class="menu-text">Notifications</span>
                        <svg class="menu-arrow" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <polyline points="9 18 15 12 9 6"/>
                        </svg>
                    </a>

                    <a href="#" class="menu-item" onclick="showHelpSupportModal(); return false;">
                        <div class="menu-icon">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <circle cx="12" cy="12" r="10"/>
                                <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/>
                                <line x1="12" y1="17" x2="12.01" y2="17"/>
                            </svg>
                        </div>
                        <span class="menu-text">Help & Support</span>
                        <svg class="menu-arrow" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <polyline points="9 18 15 12 9 6"/>
                        </svg>
                    </a>
                </div>

                <!-- Logout Button -->
                <button class="logout-btn" onclick="handleLogout()">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
                        <polyline points="16 17 21 12 16 7"/>
                        <line x1="21" y1="12" x2="9" y2="12"/>
                    </svg>
                    Sign Out
                </button>
            </div>
        </div>
    `;


    // Attach event listeners and initialize
    attachProfileEventListeners(user);
}

function attachProfileEventListeners(user) {
    // Avatar/banner edit buttons
    const avatarEdit = document.getElementById('avatarEditBtn');
    const bannerEdit = document.getElementById('bannerEditBtn');
    
    if (avatarEdit) {
        avatarEdit.addEventListener('click', () => {
            window.showAvatarUpload?.();
        });
    }
    
    if (bannerEdit) {
        bannerEdit.addEventListener('click', () => {
            window.showBannerUpload?.();
        });
    }

    // Portfolio lightbox
    document.querySelectorAll('.pf-portfolio-item').forEach(item => {
        item.addEventListener('click', () => {
            const img = item.querySelector('img');
            if (img) window.openImageModal?.(img.src);
        });
    });
}
