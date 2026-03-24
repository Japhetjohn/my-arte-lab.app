import { appState } from '../state.js';
import { getAvatarUrl } from '../utils/avatar.js';
import { renderProfileCompletionWidget } from '../utils/profileCompletion.js';
import api from '../services/api.js';

export async function renderProfilePage() {
    const mainContent = document.getElementById('mainContent');

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

                    ${isCreator ? `
                        <!-- STATS GRID -->
                        <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px;">
                            <div style="background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.07); border-radius: 16px; padding: 16px; text-align: center;">
                                <div style="font-size: 20px; font-weight: 800; color: var(--text-primary);">${user.metrics?.responseRate || 100}%</div>
                                <div style="font-size: 10px; font-weight: 700; color: var(--text-secondary); text-transform: uppercase; margin-top: 4px;">Response</div>
                            </div>
                            <div style="background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.07); border-radius: 16px; padding: 16px; text-align: center;">
                                <div style="font-size: 20px; font-weight: 800; color: var(--text-primary);">${user.metrics?.onTimeDeliveryRate || 100}%</div>
                                <div style="font-size: 10px; font-weight: 700; color: var(--text-secondary); text-transform: uppercase; margin-top: 4px;">On Time</div>
                            </div>
                            <div style="background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.07); border-radius: 16px; padding: 16px; text-align: center;">
                                <div style="font-size: 20px; font-weight: 800; color: #10B981;">${user.completedBookings || 0}</div>
                                <div style="font-size: 10px; font-weight: 700; color: var(--text-secondary); text-transform: uppercase; margin-top: 4px;">Jobs</div>
                            </div>
                            <div style="background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.07); border-radius: 16px; padding: 16px; text-align: center;">
                                <div style="font-size: 20px; font-weight: 800; color: var(--primary);">${userRating}</div>
                                <div style="font-size: 10px; font-weight: 700; color: var(--text-secondary); text-transform: uppercase; margin-top: 4px;">Rating</div>
                            </div>
                        </div>

                        <!-- PORTFOLIO -->
                        ${user.portfolio && user.portfolio.length > 0 ? `
                            <div class="glass-info-card" style="margin:0; padding: 24px; border-radius: 20px;">
                                <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 20px;">
                                    <span class="section-header" style="margin: 0; font-size: 11px;">Portfolio Showcase</span>
                                    <span style="font-size: 11px; font-weight: 700; color: var(--text-secondary); opacity: 0.5;">${user.portfolio.length} ITEMS</span>
                                </div>
                                <div class="pf-portfolio-grid" id="portfolioGrid" style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px;">
                                    ${user.portfolio.slice(0, 6).map((img, i) => `
                                        <div class="pf-portfolio-item" data-index="${i}" style="aspect-ratio: 1; border-radius: 12px; overflow: hidden; cursor: pointer; position: relative;">
                                            <img src="${img}" style="width: 100%; height: 100%; object-fit: cover;">
                                        </div>
                                    `).join('')}
                                </div>
                            </div>
                        ` : ''}

                        <!-- SERVICES -->
                        <div class="glass-info-card" style="margin:0; padding: 24px; border-radius: 20px;">
                            <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 24px;">
                                <span class="section-header" style="margin: 0; font-size: 11px;">Active Services</span>
                                <button onclick="window.showAddServiceModal()" style="background: rgba(151,71,255,0.1); border: 1px solid rgba(151,71,255,0.2); color: var(--primary); padding: 6px 14px; border-radius: 10px; font-size: 12px; font-weight: 700; cursor: pointer; display: flex; align-items: center; gap: 6px;">
                                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><path d="M12 5v14M5 12h14"/></svg>
                                    Add New
                                </button>
                            </div>
                            <div style="display: flex; flex-direction: column; gap: 20px;">
                                ${services.length > 0 ? services.map(service => `
                                    <div style="display: flex; flex-direction: column; gap: 12px; padding: 16px; background: rgba(255,255,255,0.02); border: 1px solid rgba(255,255,255,0.06); border-radius: 16px;">
                                        <div style="display: flex; gap: 16px; align-items: flex-start;">
                                            <div style="flex: 1; min-width: 0;">
                                                <div style="font-size: 16px; font-weight: 700; margin-bottom: 4px; color: var(--text-primary);">${service.title}</div>
                                                <p style="font-size: 13px; color: var(--text-secondary); line-height: 1.5; margin: 0; opacity: 0.8;">${service.description}</p>
                                            </div>
                                            <div style="display: flex; gap: 8px;">
                                                <button onclick="window.editService('${service._id}')" style="background: rgba(255,255,255,0.06); border: 1px solid rgba(255,255,255,0.1); color: var(--text-primary); width: 32px; height: 32px; border-radius: 10px; cursor: pointer; display: flex; align-items: center; justify-content: center;">
                                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                                                </button>
                                                <button onclick="window.deleteService('${service._id}')" style="background: rgba(239,68,68,0.1); border: 1px solid rgba(239,68,68,0.2); color: #ef4444; width: 32px; height: 32px; border-radius: 10px; cursor: pointer; display: flex; align-items: center; justify-content: center;">
                                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
                                                </button>
                                            </div>
                                        </div>
                                        
                                        ${service.images && service.images.length > 0 ? `
                                            <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(80px, 1fr)); gap: 8px;">
                                                ${service.images.map(img => `
                                                    <div style="aspect-ratio: 1; border-radius: 10px; overflow: hidden; background: rgba(0,0,0,0.1);">
                                                        <img src="${img}" style="width: 100%; height: 100%; object-fit: cover; cursor: pointer;" onclick="window.openImageModal('${img}')">
                                                    </div>
                                                `).join('')}
                                            </div>
                                        ` : ''}
                                    </div>
                                `).join('') : `
                                    <div style="text-align: center; padding: 24px; background: rgba(255,255,255,0.03); border: 1px dashed rgba(255,255,255,0.1); border-radius: 16px;">
                                        <p style="color: var(--text-secondary); font-size: 13px;">No services listed yet.</p>
                                    </div>
                                `}
                            </div>
                        </div>
                    ` : ''}

                    <!-- QUICK ACTIONS & STATS (Refined sidebar content) -->
                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px;">
                        <div class="glass-info-card" style="margin:0; padding: 20px; border-radius: 20px;">
                            <span class="section-header" style="margin: 0 0 12px; font-size: 10px;">Trust & Security</span>
                            <div style="display: flex; flex-direction: column; gap: 12px;">
                                <div style="display: flex; justify-content: space-between; font-size: 12px;">
                                    <span style="color: var(--text-secondary);">Email</span>
                                    <span style="font-weight: 700; color: ${user.isEmailVerified ? '#10B981' : '#F59E0B'};">${user.isEmailVerified ? 'Verified' : 'Pending'}</span>
                                </div>
                                <div style="display: flex; justify-content: space-between; font-size: 12px;">
                                    <span style="color: var(--text-secondary);">Identity</span>
                                    <span style="font-weight: 700; color: #10B981;">Verified</span>
                                </div>
                            </div>
                        </div>
                        <div class="glass-info-card" style="margin:0; padding: 20px; border-radius: 20px; background: linear-gradient(135deg, rgba(151,71,255,0.05), rgba(107,70,255,0.05)); border-color: rgba(151,71,255,0.15);">
                            <span class="section-header" style="margin: 0 0 12px; font-size: 10px; color: var(--primary);">Member Since</span>
                            <div style="font-size: 15px; font-weight: 800; color: var(--text-primary);">${user.createdAt ? new Date(user.createdAt).toLocaleDateString(undefined, { month: 'short', year: 'numeric' }) : 'N/A'}</div>
                            <div style="font-size: 11px; color: var(--text-secondary); margin-top: 4px;">MyArteLab Escrow Protected</div>
                        </div>
                    </div>

                    <!-- DASHBOARD LINK -->
                    <button onclick="navigateToPage('bookings')" style="display: flex; align-items: center; justify-content: center; gap: 12px; width: 100%; height: 56px; border-radius: 20px; background: rgba(151,71,255,0.1); border: 1.5px solid rgba(151,71,255,0.25); color: var(--text-primary); cursor: pointer; transition: all 0.2s;">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" style="color: var(--primary);"><path d="M21 12V7a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-5z"/></svg>
                        <span style="font-weight: 700;">Open Professional Dashboard</span>
                    </button>
                </div>
            </div>
        </div>
        <style>
            @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
            .section-header { font-size: 12px; font-weight: 700; color: var(--text-secondary); text-transform: uppercase; letter-spacing: 0.1em; display: block; }
        </style>
    `;

    // Portfolio click handlers
    if (isCreator && user.portfolio && user.portfolio.length > 0) {
        window.currentPortfolio = user.portfolio;
        const portfolioGrid = document.getElementById('portfolioGrid');
        if (portfolioGrid) {
            portfolioGrid.querySelectorAll('.pf-portfolio-item').forEach(item => {
                item.addEventListener('click', () => {
                    const index = parseInt(item.dataset.index);
                    window.openImageModal(window.currentPortfolio[index], window.currentPortfolio, index);
                });
            });
        }
    }
}

async function requestEmailVerification() {
    try {
        const { showToast } = await import('../utils.js');
        showToast('Sending verification code...', 'info');
        const response = await api.resendVerification();
        if (response.success) {
            showToast('Verification code sent!', 'success');
            const { showEmailVerificationModal } = await import('../auth.js');
            showEmailVerificationModal(appState.user.email, appState.user.role);
        } else {
            showToast(response.message || 'Failed to send code', 'error');
        }
    } catch (error) {
        console.error('Error:', error);
    }
}

window.requestEmailVerification = requestEmailVerification;