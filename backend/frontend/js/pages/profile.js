import { appState } from '../state.js';
import { getAvatarUrl } from '../utils/avatar.js';
import { renderProfileCompletionWidget } from '../utils/profileCompletion.js';
import api from '../services/api.js';

export async function renderProfilePage() {
    const mainContent = document.getElementById('mainContent');

    if (!appState.user) {
        mainContent.innerHTML = `
            <div style="min-height: 60vh; display:flex; align-items:center; justify-content:center; padding:40px 20px;">
                <div class="glass-info-card" style="text-align:center; max-width:400px; padding: 40px;">
                    <div style="width:80px; height:80px; background:rgba(151,71,255,0.1); border-radius:24px; display:flex; align-items:center; justify-content:center; margin:0 auto 24px; border:1px solid rgba(151,71,255,0.2); color:var(--primary);">
                        <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
                    </div>
                    <h2 style="margin-bottom:8px; font-weight: 850;">Your Profile</h2>
                    <p style="color:var(--text-secondary); margin-bottom:24px; line-height:1.6; opacity: 0.7;">Sign in to manage your professional presence and track your collaborations.</p>
                    <button class="glass-btn-primary" onclick="showAuthModal('signin')" style="width: 100%;">Connect Account</button>
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

    const coverImage = user.coverImage || 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=1200';
    const userLocation = user.location
        ? (typeof user.location === 'object'
            ? `${user.location.city || ''}${user.location.city && user.location.country ? ', ' : ''}${user.location.country || ''}`.trim()
            : user.location)
        : 'Nigeria';
    const userRating = user.rating?.average?.toFixed(1) || '0.0';
    const reviewCount = user.rating?.count || 0;
    const categoryLabel = isCreator ? (user.category ? user.category.charAt(0).toUpperCase() + user.category.slice(1) : 'Professional Creator') : 'Verified Client';

    mainContent.innerHTML = `
        <div class="profile-container-modern">
            <!-- Cover -->
            <div class="pf-cover-modern">
                <img src="${coverImage}" class="pf-cover-image" alt="Cover">
                <div style="position:absolute; top:24px; right:24px; z-index:20;">
                    <button onclick="navigateToPage('settings')" class="glass-btn-secondary" style="background:rgba(255,255,255,0.1); border-color:rgba(255,255,255,0.2);">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                        Edit Profile
                    </button>
                </div>
            </div>

            <!-- Header Content -->
            <div class="pf-header-content">
                <div class="pf-avatar-container">
                    <img src="${avatarUrl}" alt="${user.name}" class="pf-avatar-modern">
                    ${user.verified ? `
                        <div class="pf-verified-badge">
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><path d="M20 6L9 17l-5-5" stroke-linecap="round" stroke-linejoin="round"/></svg>
                        </div>
                    ` : ''}
                </div>
                <div class="pf-user-info-main">
                    <h1 class="pf-name-modern">${user.name}</h1>
                    <div class="pf-meta-modern">
                        <div class="pf-meta-item">
                            <span class="glass-tag" style="background:var(--primary); color:white; border:none;">${categoryLabel}</span>
                        </div>
                        <div class="pf-meta-item">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
                            ${userLocation}
                        </div>
                        ${isCreator ? `
                            <div class="pf-meta-item" style="color:#FFA500;">
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>
                                ${userRating} (${reviewCount} reviews)
                            </div>
                        ` : ''}
                    </div>
                </div>
            </div>

            <!-- Grid Content -->
            <div class="pf-grid-layout">
                <div class="pf-main-content">
                    <!-- About -->
                    <div class="glass-info-card">
                        <span class="pf-stat-label">About Professional</span>
                        <p style="font-size:16px; color:var(--text-secondary); line-height:1.8; margin:12px 0 0; opacity: 0.8;">
                            ${user.bio || 'This professional hasn’t provided a biography yet. Experience and skills will be displayed here once updated.'}
                        </p>
                    </div>

                    ${isCreator ? `
                        <!-- Statistics -->
                        <div class="pf-stats-modern">
                            <div class="pf-stat-card">
                                <div class="pf-stat-value">${user.metrics?.responseRate || 100}%</div>
                                <div class="pf-stat-label">Response</div>
                            </div>
                            <div class="pf-stat-card">
                                <div class="pf-stat-value">${user.metrics?.onTimeDeliveryRate || 100}%</div>
                                <div class="pf-stat-label">On Time</div>
                            </div>
                            <div class="pf-stat-card">
                                <div class="pf-stat-value" style="color: #10B981;">${user.completedBookings || 0}</div>
                                <div class="pf-stat-label">Done</div>
                            </div>
                            <div class="pf-stat-card">
                                <div class="pf-stat-value" style="color: var(--primary);">${user.metrics?.repeatClientRate || 0}%</div>
                                <div class="pf-stat-label">Repeat</div>
                            </div>
                        </div>

                        <!-- Portfolio -->
                        ${user.portfolio && user.portfolio.length > 0 ? `
                            <div class="glass-info-card">
                                <div style="display:flex; align-items:center; justify-content:space-between; margin-bottom:20px;">
                                    <span class="pf-stat-label" style="margin:0;">Project Showcase</span>
                                    <span style="font-size:12px; font-weight:700; color:var(--text-secondary); opacity:0.5;">${user.portfolio.length} ITEMS</span>
                                </div>
                                <div class="pf-portfolio-grid" id="portfolioGrid">
                                    ${user.portfolio.map((img, i) => `
                                        <div class="pf-portfolio-item" data-index="${i}">
                                            <img src="${img}" alt="Portfolio Item">
                                            <div style="position:absolute; inset:0; background:rgba(151,71,255,0.2); opacity:0; transition:0.3s; display:flex; align-items:center; justify-content:center; cursor:pointer;" onmouseover="this.style.opacity=1" onmouseout="this.style.opacity=0">
                                                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="3"><path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7"/></svg>
                                            </div>
                                        </div>
                                    `).join('')}
                                </div>
                            </div>
                        ` : ''}

                        <!-- Services -->
                        <div class="glass-info-card">
                            <div style="display:flex; align-items:center; justify-content:space-between; margin-bottom:24px;">
                                <span class="pf-stat-label" style="margin:0;">Active Offerings</span>
                                <button onclick="window.showAddServiceModal()" class="glass-btn-primary" style="padding: 8px 16px; font-size: 13px;">
                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><path d="M12 5v14M5 12h14"/></svg>
                                    New Service
                                </button>
                            </div>
                            <div style="display:grid; grid-template-columns: 1fr; gap:20px;">
                                ${services.length > 0 ? services.map(service => `
                                    <div class="pf-service-card-modern">
                                        <div style="display:flex; gap:20px; padding:20px;">
                                            <div style="width:120px; height:120px; border-radius:16px; overflow:hidden; flex-shrink:0; background:rgba(255,255,255,0.02); border:1px solid rgba(255,255,255,0.05);">
                                                <img src="${service.images?.[0] || 'https://via.placeholder.com/120'}" style="width:100%; height:100%; object-fit:cover;">
                                            </div>
                                            <div style="flex:1;">
                                                <h3 style="font-size:18px; font-weight:800; color:white; margin:0 0 8px;">${service.title}</h3>
                                                <p style="font-size:14px; color:var(--text-secondary); opacity:0.6; line-height:1.6; display:-webkit-box; -webkit-line-clamp:2; -webkit-box-orient:vertical; overflow:hidden; margin:0 0 16px;">${service.description}</p>
                                                <div style="display:flex; gap:12px;">
                                                    <button onclick="window.editService('${service._id}')" class="glass-btn-secondary" style="height:36px; padding:0 16px; font-size:12px;">Edit Details</button>
                                                    <button onclick="window.deleteService('${service._id}')" class="glass-btn-secondary" style="height:36px; padding:0 12px; border-color:rgba(239,68,68,0.2); color:#f87171;">
                                                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                `).join('') : `
                                    <div style="text-align:center; padding:40px; background:rgba(255,255,255,0.02); border-radius:20px; border:2px dashed rgba(255,255,255,0.05);">
                                        <p style="color:var(--text-secondary); opacity:0.4; margin-bottom:16px;">No active services found.</p>
                                        <button onclick="window.showAddServiceModal()" class="glass-btn-primary">Create Your First Service</button>
                                    </div>
                                `}
                            </div>
                        </div>
                    ` : ''}
                </div>

                <div class="pf-sidebar">
                    <!-- Quick Actions -->
                    <div class="glass-info-card">
                        <span class="pf-stat-label">Quick Actions</span>
                        <div style="display:flex; flex-direction:column; gap:12px; margin-top:16px;">
                            ${isCreator ? `
                                <button onclick="navigateToPage('bookings')" class="glass-btn-primary" style="width:100%; justify-content:flex-start; height:52px; background:rgba(151,71,255,0.1); border-color:rgba(151,71,255,0.2); color:white;">
                                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" style="margin-right:12px; color:var(--primary);"><path d="M8 2v4M16 2v4M3 10h18M5 4h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2z"/></svg>
                                    Job Dashboard
                                </button>
                            ` : ''}
                            <button onclick="navigateToPage('wallet')" class="glass-btn-primary" style="width:100%; justify-content:flex-start; height:52px; background:rgba(59,130,246,0.1); border-color:rgba(59,130,246,0.2); color:white;">
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" style="margin-right:12px; color:#3B82F6;"><path d="M21 12V7a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-5z"/></svg>
                                Secure Wallet
                            </button>
                        </div>
                    </div>

                    <!-- Trust Score -->
                    <div class="glass-info-card" style="background: linear-gradient(135deg, rgba(16, 185, 129, 0.05), rgba(5, 150, 105, 0.05)); border-color: rgba(16, 185, 129, 0.2);">
                        <div style="display:flex; align-items:center; gap:12px; margin-bottom:12px;">
                            <div style="width:36px; height:36px; background:rgba(16,185,129,0.1); border-radius:10px; display:flex; align-items:center; justify-content:center; color:#10B981;">
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
                            </div>
                            <span style="font-weight:800; color:white;">Trust Badge</span>
                        </div>
                        <p style="font-size:13px; color:var(--text-secondary); opacity:0.7; line-height:1.6; margin:0;">
                            Your profile is verified. Always use <strong>MyArteLab Escrow</strong> to secure your payments and collaborations.
                        </p>
                    </div>

                    <!-- Account Details -->
                    <div class="glass-info-card">
                        <span class="pf-stat-label">Security Details</span>
                        <div style="display:flex; flex-direction:column; gap:16px; margin-top:20px;">
                            <div style="display:flex; justify-content:space-between; align-items:center;">
                                <span style="font-size:13px; color:var(--text-secondary); opacity:0.6;">Email Status</span>
                                ${user.isEmailVerified ? '<span style="color:#10B981; font-weight:800; font-size:12px;">VERIFIED</span>' : '<button onclick="requestEmailVerification()" class="glass-tag" style="background:rgba(245,158,11,0.1); color:#F59E0B; border-color:rgba(245,158,11,0.2);">UNVERIFIED</button>'}
                            </div>
                            <div style="display:flex; justify-content:space-between; align-items:center;">
                                <span style="font-size:13px; color:var(--text-secondary); opacity:0.6;">Member Since</span>
                                <span style="font-weight:700; color:white; font-size:13px;">${user.createdAt ? new Date(user.createdAt).toLocaleDateString('en-US', { year: 'numeric', month: 'long' }) : 'Join Date N/A'}</span>
                            </div>
                            ${user.wallet ? `
                                <div style="display:flex; justify-content:space-between; align-items:center;">
                                    <span style="font-size:13px; color:var(--text-secondary); opacity:0.6;">Verified Wallet</span>
                                    <span style="color:var(--primary); font-weight:800; font-size:13px;">${user.wallet.balance?.toFixed(2) || '0.00'} USDC</span>
                                </div>
                            ` : ''}
                        </div>
                    </div>
                </div>
            </div>
        </div>
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

    // Service image gallery handlers
    if (isCreator && services.length > 0) {
        document.querySelectorAll('.service-images-grid').forEach(grid => {
            const serviceIndex = parseInt(grid.dataset.serviceIndex);
            const service = services[serviceIndex];
            if (service && service.images) {
                grid.querySelectorAll('.service-image-item').forEach(item => {
                    item.addEventListener('click', () => {
                        const index = parseInt(item.dataset.index);
                        window.openImageModal(service.images[index], service.images, index);
                    });
                });
            }
        });
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