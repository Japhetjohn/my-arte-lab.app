import { appState } from '../state.js';
import { getAvatarUrl } from '../utils/avatar.js';
import { renderProfileCompletionWidget } from '../utils/profileCompletion.js';
import api from '../services/api.js';

export async function renderProfilePage() {
    const mainContent = document.getElementById('mainContent');

    if (!appState.user) {
        mainContent.innerHTML = `
            <div style="min-height: 60vh; display:flex; align-items:center; justify-content:center; padding:40px 20px;">
                <div style="text-align:center; max-width:380px;">
                    <div style="width:80px; height:80px; background:linear-gradient(135deg,rgba(124,58,237,0.15),rgba(79,70,229,0.15)); border-radius:24px; display:flex; align-items:center; justify-content:center; margin:0 auto 24px; border:1px solid rgba(124,58,237,0.2);">
                        <svg width="36" height="36" viewBox="0 0 24 24" fill="none" style="color:#a78bfa;"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><circle cx="12" cy="7" r="4" stroke="currentColor" stroke-width="2"/></svg>
                    </div>
                    <h2 style="margin-bottom:8px;">Your Profile</h2>
                    <p style="color:var(--text-secondary); margin-bottom:24px; line-height:1.6;">Sign in to manage your profile and services</p>
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

    const coverImage = user.coverImage || 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=1200';
    const userLocation = user.location
        ? (typeof user.location === 'object'
            ? `${user.location.city || ''}${user.location.city && user.location.country ? ', ' : ''}${user.location.country || ''}`.trim()
            : user.location)
        : 'Nigeria';
    const userRating = user.rating?.average?.toFixed(1) || '0.0';
    const reviewCount = user.rating?.count || 0;
    const categoryLabel = isCreator ? (user.category ? user.category.charAt(0).toUpperCase() + user.category.slice(1) : 'Creator') : 'Client';

    mainContent.innerHTML = `
        <style>
            .pf-cover { position:relative; height:220px; background:url('${coverImage}') center/cover; }
            .pf-cover::after { content:''; position:absolute; inset:0; background:linear-gradient(to bottom, rgba(0,0,0,0.1) 0%, rgba(0,0,0,0.65) 100%); }
            .pf-avatar { width:90px; height:90px; border-radius:50%; border:3px solid rgba(255,255,255,0.15); object-fit:cover; flex-shrink:0; }
            .pf-card { background:rgba(255,255,255,0.04); border:1px solid rgba(255,255,255,0.08); border-radius:18px; padding:20px; margin-bottom:14px; }
            .pf-section-label { font-size:11px; font-weight:700; color:rgba(255,255,255,0.35); text-transform:uppercase; letter-spacing:0.1em; margin-bottom:14px; display:block; }
            .pf-badge { display:inline-flex; align-items:center; gap:5px; padding:4px 10px; border-radius:20px; font-size:11px; font-weight:700; }
            .pf-metric { text-align:center; padding:16px 12px; background:rgba(255,255,255,0.04); border:1px solid rgba(255,255,255,0.07); border-radius:14px; }
            .pf-info-row { display:flex; justify-content:space-between; align-items:center; padding:12px 0; border-bottom:1px solid rgba(255,255,255,0.06); }
            .pf-info-row:last-child { border-bottom:none; }
            .pf-info-label { font-size:13px; color:rgba(255,255,255,0.4); }
            .pf-info-value { font-size:13px; font-weight:600; color:rgba(255,255,255,0.85); }
            .pf-service { background:rgba(255,255,255,0.04); border:1px solid rgba(255,255,255,0.08); border-radius:16px; overflow:hidden; margin-bottom:12px; }
            .pf-pkg { background:rgba(255,255,255,0.04); border:1px solid rgba(255,255,255,0.08); border-radius:12px; padding:14px; }
            .pf-pkg.popular { background:rgba(124,58,237,0.1); border-color:rgba(124,58,237,0.25); }
            .pf-action-btn { display:flex; align-items:center; gap:6px; padding:8px 14px; border-radius:10px; font-size:13px; font-weight:700; cursor:pointer; border:none; transition:all 0.2s; }
            .portfolio-grid { display:grid; grid-template-columns:repeat(3,1fr); gap:8px; }
            .portfolio-item { aspect-ratio:1; border-radius:10px; overflow:hidden; cursor:pointer; position:relative; }
            .portfolio-item img { width:100%; height:100%; object-fit:cover; transition:transform 0.3s; }
            .portfolio-item:hover img { transform:scale(1.05); }
            .portfolio-item-overlay { position:absolute; inset:0; background:rgba(0,0,0,0.4); opacity:0; transition:opacity 0.2s; display:flex; align-items:center; justify-content:center; }
            .portfolio-item:hover .portfolio-item-overlay { opacity:1; }
            @keyframes fadeUp { from { opacity:0; transform:translateY(12px); } to { opacity:1; transform:translateY(0); } }
            .pf-animate { animation:fadeUp 0.35s ease both; }
        </style>

        <!-- Cover -->
        <div class="pf-cover">
            <div style="position:absolute; top:16px; right:16px; z-index:2; display:flex; gap:8px;">
                <button onclick="navigateToPage('settings')" class="pf-action-btn" style="background:rgba(255,255,255,0.12); color:white; backdrop-filter:blur(8px);">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>
                    Edit Profile
                </button>
            </div>
        </div>

        <!-- Main content -->
        <div style="max-width:640px; margin:0 auto; padding:0 20px 60px;">

            <!-- Avatar + Name row -->
            <div class="pf-animate" style="display:flex; align-items:flex-end; gap:16px; margin-top:-44px; margin-bottom:20px; position:relative; z-index:2; padding:0 4px;">
                <div style="position:relative; flex-shrink:0;">
                    <img src="${avatarUrl}" alt="${user.name}" class="pf-avatar">
                    ${user.verified ? '<div style="position:absolute; bottom:2px; right:2px; width:20px; height:20px; background:#10B981; border:2px solid rgba(15,15,19,1); border-radius:50%; display:flex; align-items:center; justify-content:center;"><svg width="9" height="9" viewBox="0 0 24 24" fill="none"><path d="M20 6L9 17l-5-5" stroke="white" stroke-width="3" stroke-linecap="round"/></svg></div>' : ''}
                </div>
                <div style="flex:1; padding-bottom:4px;">
                    <h1 style="font-size:22px; font-weight:800; margin:0 0 2px; color:white; text-shadow:0 2px 8px rgba(0,0,0,0.5);">${user.name}</h1>
                    <div style="font-size:13px; color:rgba(255,255,255,0.6); font-weight:600;">${categoryLabel} ${userLocation ? '· ' + userLocation : ''}</div>
                </div>
                ${isCreator ? `
                <div style="padding-bottom:4px; text-align:right;">
                    <div style="font-size:20px; font-weight:800; color:white; text-shadow:0 2px 8px rgba(0,0,0,0.5);">★ ${userRating}</div>
                    <div style="font-size:11px; color:rgba(255,255,255,0.4); font-weight:600;">${reviewCount} reviews</div>
                </div>` : ''}
            </div>

            <!-- Verification badges -->
            ${(user.isEmailVerified || user.isPhoneVerified || user.isIdVerified) ? `
            <div class="pf-animate" style="display:flex; gap:8px; flex-wrap:wrap; margin-bottom:14px; animation-delay:0.05s;">
                ${user.isEmailVerified ? '<span class="pf-badge" style="background:rgba(16,185,129,0.12); color:#34d399; border:1px solid rgba(16,185,129,0.2);">✓ Email</span>' : ''}
                ${user.isPhoneVerified ? '<span class="pf-badge" style="background:rgba(16,185,129,0.12); color:#34d399; border:1px solid rgba(16,185,129,0.2);">✓ Phone</span>' : ''}
                ${user.isIdVerified ? '<span class="pf-badge" style="background:rgba(16,185,129,0.12); color:#34d399; border:1px solid rgba(16,185,129,0.2);">✓ ID</span>' : ''}
            </div>` : ''}

            <!-- Quick actions -->
            <div class="pf-animate" style="display:flex; gap:8px; margin-bottom:20px; animation-delay:0.08s;">
                ${isCreator ? `<button onclick="navigateToPage('bookings')" class="pf-action-btn" style="background:rgba(124,58,237,0.15); color:#a78bfa; border:1px solid rgba(124,58,237,0.2);">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><rect x="3" y="4" width="18" height="18" rx="2" stroke="currentColor" stroke-width="2"/><path d="M16 2v4M8 2v4M3 10h18" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>
                    Bookings
                </button>` : ''}
                <button onclick="navigateToPage('wallet')" class="pf-action-btn" style="background:rgba(59,130,246,0.12); color:#60a5fa; border:1px solid rgba(59,130,246,0.18);">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M21 12V7a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-5z" stroke="currentColor" stroke-width="2"/></svg>
                    Wallet
                </button>
            </div>

            <!-- Profile completion widget -->
            <div class="pf-animate" style="animation-delay:0.1s;">${renderProfileCompletionWidget(user)}</div>

            <!-- About -->
            <div class="pf-card pf-animate" style="animation-delay:0.12s;">
                <span class="pf-section-label">About</span>
                <p style="font-size:14px; color:rgba(255,255,255,0.65); line-height:1.7; margin:0;">${user.bio || 'No bio yet. Click Edit Profile to tell people about yourself.'}</p>
            </div>

            ${isCreator ? `
            <!-- Performance Metrics -->
            <div class="pf-card pf-animate" style="animation-delay:0.14s;">
                <span class="pf-section-label">Performance</span>
                <div style="display:grid; grid-template-columns:repeat(4,1fr); gap:10px;">
                    <div class="pf-metric">
                        <div style="font-size:20px; font-weight:800; color:white; margin-bottom:4px;">${user.metrics?.responseRate || 100}%</div>
                        <div style="font-size:11px; color:rgba(255,255,255,0.35); font-weight:600;">Response</div>
                    </div>
                    <div class="pf-metric">
                        <div style="font-size:20px; font-weight:800; color:white; margin-bottom:4px;">${user.metrics?.onTimeDeliveryRate || 100}%</div>
                        <div style="font-size:11px; color:rgba(255,255,255,0.35); font-weight:600;">On Time</div>
                    </div>
                    <div class="pf-metric">
                        <div style="font-size:20px; font-weight:800; color:#10B981; margin-bottom:4px;">${user.completedBookings || 0}</div>
                        <div style="font-size:11px; color:rgba(255,255,255,0.35); font-weight:600;">Completed</div>
                    </div>
                    <div class="pf-metric">
                        <div style="font-size:20px; font-weight:800; color:#a78bfa; margin-bottom:4px;">${user.metrics?.repeatClientRate || 0}%</div>
                        <div style="font-size:11px; color:rgba(255,255,255,0.35); font-weight:600;">Repeat</div>
                    </div>
                </div>
            </div>

            <!-- Portfolio -->
            ${user.portfolio && user.portfolio.length > 0 ? `
            <div class="pf-card pf-animate" style="animation-delay:0.16s;">
                <span class="pf-section-label">Portfolio</span>
                <div class="portfolio-grid" id="portfolioGrid">
                    ${user.portfolio.map((img, i) => `
                        <div class="portfolio-item" data-index="${i}">
                            <img src="${img}" alt="Portfolio ${i + 1}">
                            <div class="portfolio-item-overlay">
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" style="color:white;"><path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>
                            </div>
                        </div>
                    `).join('')}
                </div>
            </div>` : ''}

            <!-- Services -->
            <div class="pf-card pf-animate" style="padding:20px; animation-delay:0.18s;">
                <div style="display:flex; align-items:center; justify-content:space-between; margin-bottom:16px;">
                    <span class="pf-section-label" style="margin:0;">My Services</span>
                    <button onclick="window.showAddServiceModal()" class="pf-action-btn" style="background:rgba(124,58,237,0.15); color:#a78bfa; border:1px solid rgba(124,58,237,0.2); padding:6px 12px; font-size:12px;">
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none"><path d="M12 5v14M5 12h14" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"/></svg>
                        Add Service
                    </button>
                </div>
                ${services.length > 0 ? services.map((service, idx) => `
                    <div class="pf-service">
                        ${service.images && service.images.length > 0 ? `
                            <div style="height:140px; position:relative; overflow:hidden;">
                                <img src="${service.images[0]}" alt="${service.title}" style="width:100%; height:100%; object-fit:cover;">
                                ${service.images.length > 1 ? `<div style="position:absolute; bottom:8px; right:8px; background:rgba(0,0,0,0.6); border-radius:20px; padding:3px 10px; font-size:11px; font-weight:700; color:white;">+${service.images.length - 1} more</div>` : ''}
                                <button onclick="window.uploadServiceImage('${service._id}')" style="position:absolute; top:8px; right:8px; background:rgba(0,0,0,0.5); border:none; border-radius:8px; padding:4px 8px; font-size:11px; font-weight:700; color:white; cursor:pointer;">+ Add Image</button>
                            </div>
                        ` : `
                            <button onclick="window.uploadServiceImage('${service._id}')" style="width:100%; height:80px; background:rgba(255,255,255,0.04); border:2px dashed rgba(255,255,255,0.1); border-radius:0; cursor:pointer; font-size:13px; color:rgba(255,255,255,0.3); font-weight:600; display:flex; align-items:center; justify-content:center; gap:8px;">
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M12 5v14M5 12h14" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"/></svg>
                                Add images
                            </button>
                        `}
                        <div style="padding:16px;">
                            <h3 style="font-size:15px; font-weight:700; margin:0 0 6px; color:white;">${service.title}</h3>
                            <p style="font-size:13px; color:rgba(255,255,255,0.45); margin:0 0 14px; line-height:1.6; display:-webkit-box; -webkit-line-clamp:2; -webkit-box-orient:vertical; overflow:hidden;">${service.description}</p>
                            ${service.packages && service.packages.length > 0 ? `
                                <div style="display:flex; gap:8px; overflow-x:auto; padding-bottom:4px; margin-bottom:14px;">
                                    ${service.packages.map(pkg => `
                                        <div class="pf-pkg ${pkg.popular ? 'popular' : ''}" style="min-width:140px; flex-shrink:0;">
                                            ${pkg.popular ? '<div style="font-size:10px; font-weight:800; color:#a78bfa; margin-bottom:4px; text-transform:uppercase; letter-spacing:0.06em;">Popular</div>' : ''}
                                            <div style="font-size:12px; font-weight:700; color:rgba(255,255,255,0.6); margin-bottom:2px;">${pkg.name}</div>
                                            <div style="font-size:18px; font-weight:800; color:white; margin-bottom:6px;">$${pkg.suggestedPrice || 0}</div>
                                            <div style="font-size:11px; color:rgba(255,255,255,0.35);">${pkg.deliveryDays}d · ${pkg.revisions} rev</div>
                                        </div>
                                    `).join('')}
                                </div>
                            ` : ''}
                            <div style="display:flex; gap:8px;">
                                <button onclick="window.editService('${service._id}')" class="pf-action-btn" style="flex:1; justify-content:center; background:rgba(255,255,255,0.06); color:rgba(255,255,255,0.7); border:1px solid rgba(255,255,255,0.1);">Edit</button>
                                <button onclick="window.deleteService('${service._id}')" class="pf-action-btn" style="background:rgba(239,68,68,0.08); color:#f87171; border:1px solid rgba(239,68,68,0.2);">Delete</button>
                            </div>
                        </div>
                    </div>
                `).join('') : `
                    <div style="text-align:center; padding:36px 20px;">
                        <div style="width:52px; height:52px; background:rgba(255,255,255,0.04); border-radius:14px; display:flex; align-items:center; justify-content:center; margin:0 auto 14px; border:1px solid rgba(255,255,255,0.07);">
                            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" style="opacity:0.3;"><rect x="3" y="6" width="18" height="12" rx="2" stroke="currentColor" stroke-width="2"/><path d="M7 10h10M7 14h6" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>
                        </div>
                        <p style="color:rgba(255,255,255,0.3); font-size:14px; margin:0 0 14px;">No services yet</p>
                        <button onclick="window.showAddServiceModal()" class="pf-action-btn" style="background:linear-gradient(135deg,#7c3aed,#4f46e5); color:white; margin:0 auto; padding:10px 20px;">Add Your First Service</button>
                    </div>
                `}
            </div>

            <!-- Reviews -->
            <div class="pf-card pf-animate" style="animation-delay:0.2s;">
                <div style="display:flex; align-items:center; justify-content:space-between; margin-bottom:14px;">
                    <span class="pf-section-label" style="margin:0;">Reviews</span>
                    <div style="display:flex; align-items:center; gap:6px;">
                        <span style="font-size:16px; font-weight:800; color:white;">★ ${userRating}</span>
                        <span style="font-size:12px; color:rgba(255,255,255,0.35);">(${reviewCount})</span>
                    </div>
                </div>
                <p style="font-size:13px; color:rgba(255,255,255,0.3); margin:0; line-height:1.6;">Reviews will appear here after clients complete bookings and leave feedback.</p>
            </div>
            ` : ''}

            <!-- Account Info -->
            <div class="pf-card pf-animate" style="animation-delay:0.22s;">
                <span class="pf-section-label">Account</span>
                <div class="pf-info-row">
                    <span class="pf-info-label">Email</span>
                    <span class="pf-info-value">${user.email}</span>
                </div>
                <div class="pf-info-row">
                    <span class="pf-info-label">Account Type</span>
                    <span class="pf-info-value">${isCreator ? 'Creator' : 'Client'}</span>
                </div>
                <div class="pf-info-row">
                    <span class="pf-info-label">Email</span>
                    ${user.isEmailVerified
            ? '<span class="pf-info-value" style="color:#34d399;">✓ Verified</span>'
            : '<button onclick="requestEmailVerification()" style="font-size:12px; font-weight:700; color:#f59e0b; background:rgba(245,158,11,0.1); border:1px solid rgba(245,158,11,0.2); border-radius:8px; padding:4px 10px; cursor:pointer;">⚠ Verify Email</button>'
        }
                </div>
                ${user.wallet ? `
                <div class="pf-info-row">
                    <span class="pf-info-label">Wallet</span>
                    <span class="pf-info-value" style="color:#a78bfa;">$${(user.wallet.balance || 0).toFixed(2)} USDC</span>
                </div>` : ''}
                <div class="pf-info-row">
                    <span class="pf-info-label">Member Since</span>
                    <span class="pf-info-value">${user.createdAt ? new Date(user.createdAt).toLocaleDateString('en-US', { year: 'numeric', month: 'long' }) : 'N/A'}</span>
                </div>
            </div>
        </div>
    `;

    // Portfolio click handlers
    if (isCreator && user.portfolio && user.portfolio.length > 0) {
        window.currentPortfolio = user.portfolio;
        const portfolioGrid = document.getElementById('portfolioGrid');
        if (portfolioGrid) {
            portfolioGrid.querySelectorAll('.portfolio-item').forEach(item => {
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