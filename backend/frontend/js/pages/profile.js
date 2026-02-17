import { appState } from '../state.js';
import { getAvatarUrl } from '../utils/avatar.js';
import { renderProfileCompletionWidget } from '../utils/profileCompletion.js';
import api from '../services/api.js';

export async function renderProfilePage() {
    const mainContent = document.getElementById('mainContent');

    if (!appState.user) {
        mainContent.innerHTML = `
            <div class="empty-state glass-effect" style="margin: 40px auto; max-width: 500px; border-radius: 24px; padding: 40px 20px;">
                <svg width="64" height="64" viewBox="0 0 24 24" fill="none" style="opacity: 0.4; margin-bottom: 16px;">
                    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
                    <circle cx="12" cy="7" r="4" stroke="currentColor" stroke-width="2"/>
                </svg>
                <h3>Sign in to view your profile</h3>
                <p>Create your creator profile and start getting bookings</p>
                <button class="btn-primary" onclick="showAuthModal('signin')">Sign in</button>
            </div>
        `;
        return;
    }

    const user = appState.user;
    const avatarUrl = getAvatarUrl(user);

    const isCreator = user.role && (
        user.role.toLowerCase().includes('creator') ||
        user.role.toLowerCase() === 'creator'
    );

    let services = [];
    if (isCreator) {
        try {
            const response = await api.getMyServices();
            if (response.success) {
                services = response.data.services || [];
            }
        } catch (error) {
            console.error('Failed to load services:', error);
        }
    }

    const coverImage = user.coverImage || 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=1200';
    const userLocation = user.location ?
        (typeof user.location === 'object' ?
            `${user.location.city || ''}${user.location.city && user.location.country ? ', ' : ''}${user.location.country || ''}`.trim()
            : user.location)
        : 'Nigeria';
    const userRating = user.rating?.average?.toFixed(1) || '0.0';
    const reviewCount = user.rating?.count || 0;

    mainContent.innerHTML = `
        <div class="profile-hero-modern">
            <div class="profile-cover-modern" style="background-image: url('${coverImage}'); mix-blend-mode: overlay;"></div>

            <div class="container">
                <div class="profile-header-modern">
                    <div class="profile-avatar-wrapper">
                        <img src="${avatarUrl}" alt="${user.name}" class="profile-avatar-modern" style="border-color: rgba(255,255,255,0.5);">
                        ${user.verified ? '<div class="verified-badge-modern" style="background: rgba(255,255,255,0.6); backdrop-filter: blur(4px); color: #059669; border-color: rgba(255,255,255,0.4);">✓</div>' : ''}
                    </div>

                    <div class="profile-info-modern glass-effect" style="padding: 24px; border-radius: 20px; margin-top: -40px; box-shadow: 0 8px 32px rgba(0,0,0,0.05);">
                        <h1 class="profile-name-modern">${user.name}</h1>
                        <div class="profile-role-modern">${isCreator ? (user.category ? user.category.charAt(0).toUpperCase() + user.category.slice(1) : 'Creator') : 'Client'}</div>

                        <div class="profile-meta-modern">
                            <div class="profile-meta-item">
                                <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                                    <path d="M8 8.5a2 2 0 1 0 0-4 2 2 0 0 0 0 4z" stroke="currentColor" stroke-width="1.5"/>
                                    <path d="M8 14s5-4 5-7.5a5 5 0 0 0-10 0C3 10 8 14 8 14z" stroke="currentColor" stroke-width="1.5"/>
                                </svg>
                                ${userLocation}
                            </div>
                            ${isCreator ? `
                                <div class="profile-meta-item">
                                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                                        <path d="M8 1l2 4 4.5.5-3 3 1 4.5L8 11l-4.5 2 1-4.5-3-3L6 5l2-4z" fill="currentColor"/>
                                    </svg>
                                    ${userRating} (${reviewCount} reviews)
                                </div>
                            ` : ''}
                            ${user.phoneNumber && user.phoneNumberVisible ? `
                                <div class="profile-meta-item">
                                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                                        <rect x="4" y="2" width="8" height="12" rx="1.5" stroke="currentColor" stroke-width="1.5"/>
                                        <path d="M8 11h.01" stroke="currentColor" stroke-width="1.5"/>
                                    </svg>
                                    ${user.phoneNumber}
                                </div>
                            ` : ''}
                        </div>

                        ${(user.isEmailVerified || user.isPhoneVerified || user.isIdVerified) ? `
                            <div class="verification-badges-modern">
                                ${user.isEmailVerified ? `
                                    <span class="badge-modern badge-success" style="background: rgba(16, 185, 129, 0.15); backdrop-filter: blur(4px);">
                                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                                            <path d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" stroke="currentColor" stroke-width="2"/>
                                        </svg>
                                        Email Verified
                                    </span>
                                ` : ''}
                                ${user.isPhoneVerified ? `
                                    <span class="badge-modern badge-success" style="background: rgba(16, 185, 129, 0.15); backdrop-filter: blur(4px);">
                                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                                            <rect x="5" y="2" width="14" height="20" rx="2" stroke="currentColor" stroke-width="2"/>
                                            <path d="M12 18h.01" stroke="currentColor" stroke-width="2"/>
                                        </svg>
                                        Phone Verified
                                    </span>
                                ` : ''}
                                ${user.isIdVerified ? `
                                    <span class="badge-modern badge-success" style="background: rgba(16, 185, 129, 0.15); backdrop-filter: blur(4px);">
                                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                                            <path d="M21 10H3M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2" stroke="currentColor" stroke-width="2"/>
                                            <rect x="3" y="6" width="18" height="14" rx="2" stroke="currentColor" stroke-width="2"/>
                                        </svg>
                                        ID Verified
                                    </span>
                                ` : ''}
                            </div>
                        ` : ''}

                        ${user.badges && user.badges.length > 0 ? `
                            <div class="achievement-badges-modern">
                                ${user.badges.map(badge => {
                                    const badgeInfo = {
                                        'top_rated': { icon: '⭐', label: 'Top Rated', color: 'rgba(254, 243, 199, 0.5)', textColor: '#92400E' },
                                        'power_seller': { icon: '💪', label: 'Power Seller', color: 'rgba(219, 234, 254, 0.5)', textColor: '#1E40AF' },
                                        'rising_talent': { icon: '🚀', label: 'Rising Talent', color: 'rgba(224, 231, 255, 0.5)', textColor: '#3730A3' },
                                        'fast_responder': { icon: '⚡', label: 'Fast Responder', color: 'rgba(254, 243, 199, 0.5)', textColor: '#92400E' },
                                        'reliable': { icon: '✓', label: 'Reliable', color: 'rgba(220, 252, 231, 0.5)', textColor: '#166534' },
                                        'new_seller': { icon: '✨', label: 'New Seller', color: 'rgba(252, 231, 243, 0.5)', textColor: '#831843' }
                                    };
                                    const info = badgeInfo[badge.type] || { icon: '🏆', label: badge.type, color: 'rgba(243, 244, 246, 0.5)', textColor: '#374151' };
                                    return `
                                        <span class="badge-modern" style="background: ${info.color}; color: ${info.textColor}; backdrop-filter: blur(4px);">
                                            ${info.icon} ${info.label}
                                        </span>
                                    `;
                                }).join('')}
                            </div>
                        ` : ''}
                    </div>

                    <div class="profile-actions-modern">
                        <button class="btn-primary" onclick="navigateToPage('settings')">
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
                                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                            </svg>
                            Edit Profile
                        </button>
                        ${isCreator ? '<button class="btn-secondary" onclick="navigateToPage(\'bookings\')">View Bookings</button>' : ''}
                        ${user.wallet ? '<button class="btn-ghost" onclick="navigateToPage(\'wallet\')">Wallet</button>' : ''}
                    </div>
                </div>
            </div>
        </div>

        <div class="section">
            <div class="container">
                ${renderProfileCompletionWidget(user)}

                <div class="profile-card-modern glass-effect">
                    <h2 class="card-title-modern">About</h2>
                    <p class="about-text-modern">${user.bio || 'No bio added yet. Click Edit Profile to add your bio.'}</p>
                </div>

                ${isCreator ? `
                <div class="profile-card-modern glass-effect">
                    <h2 class="card-title-modern">Performance Metrics</h2>
                    <div class="metrics-grid-modern">
                        <div class="metric-card-modern" style="background: rgba(255,255,255,0.4); border: 1px solid rgba(255,255,255,0.5);">
                            <div class="metric-icon-modern" style="background: rgba(151, 71, 255, 0.1); color: var(--primary);">
                                <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                                    <path d="M22 12h-4l-3 9L9 3l-3 9H2" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                                </svg>
                            </div>
                            <div class="metric-label-modern">Response Rate</div>
                            <div class="metric-value-modern">${user.metrics?.responseRate || 100}%</div>
                        </div>
                        <div class="metric-card-modern" style="background: rgba(255,255,255,0.4); border: 1px solid rgba(255,255,255,0.5);">
                            <div class="metric-icon-modern" style="background: rgba(16, 185, 129, 0.1); color: #10B981;">
                                <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                                    <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="2"/>
                                    <path d="M12 6v6l4 2" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
                                </svg>
                            </div>
                            <div class="metric-label-modern">On-Time Delivery</div>
                            <div class="metric-value-modern">${user.metrics?.onTimeDeliveryRate || 100}%</div>
                        </div>
                        <div class="metric-card-modern" style="background: rgba(255,255,255,0.4); border: 1px solid rgba(255,255,255,0.5);">
                            <div class="metric-icon-modern" style="background: rgba(59, 130, 246, 0.1); color: #3B82F6;">
                                <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                                    <path d="M20 6L9 17l-5-5" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                                </svg>
                            </div>
                            <div class="metric-label-modern">Completed Jobs</div>
                            <div class="metric-value-modern">${user.completedBookings || 0}</div>
                        </div>
                        <div class="metric-card-modern" style="background: rgba(255,255,255,0.4); border: 1px solid rgba(255,255,255,0.5);">
                            <div class="metric-icon-modern" style="background: rgba(255, 165, 0, 0.1); color: #FFA500;">
                                <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                                    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
                                    <circle cx="9" cy="7" r="4" stroke="currentColor" stroke-width="2"/>
                                    <path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
                                </svg>
                            </div>
                            <div class="metric-label-modern">Repeat Clients</div>
                            <div class="metric-value-modern">${user.metrics?.repeatClientRate || 0}%</div>
                        </div>
                    </div>
                </div>
                ` : ''}

                ${isCreator && user.portfolio && user.portfolio.length > 0 ? `
                <div class="profile-card-modern glass-effect">
                    <h2 class="card-title-modern">Portfolio</h2>
                    <div class="portfolio-grid-modern" id="portfolioGrid">
                        ${user.portfolio.map((image, index) => `
                            <div class="portfolio-item-modern" data-index="${index}">
                                <img src="${image}" alt="Portfolio ${index + 1}">
                                <div class="portfolio-overlay-modern">
                                    <svg width="32" height="32" viewBox="0 0 24 24" fill="none">
                                        <path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                                    </svg>
                                </div>
                            </div>
                        `).join('')}
                    </div>
                </div>
                ` : ''}

                ${isCreator ? `
                <div class="profile-card-modern glass-effect">
                    <div class="card-header-modern">
                        <h2 class="card-title-modern">My Services</h2>
                        <button class="btn-primary" onclick="window.showAddServiceModal()">
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                                <path d="M12 5v14M5 12h14" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
                            </svg>
                            Add Service
                        </button>
                    </div>

                    ${services.length > 0 ? `
                        <div class="services-grid-modern">
                            ${services.map((service, index) => `
                                <div class="service-card-modern" style="background: rgba(255,255,255,0.4);">
                                    ${service.images && service.images.length > 0 ? `
                                        <div class="service-images-grid" data-service-id="${service._id}" data-service-index="${index}" style="background: transparent;">
                                            ${service.images.slice(0, 5).map((img, idx) => `
                                                <div class="service-image-wrapper">
                                                    <img src="${img}" alt="${service.title}" class="service-image-item" data-index="${idx}">
                                                    <button class="delete-image-btn" onclick="event.stopPropagation(); window.deleteServiceImage('${service._id}', ${idx})">×</button>
                                                </div>
                                            `).join('')}
                                            ${service.images.length < 5 ? `
                                                <button class="add-image-btn" onclick="window.uploadServiceImage('${service._id}')" style="background: rgba(255,255,255,0.3);">
                                                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                                                        <path d="M12 5v14M5 12h14" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
                                                    </svg>
                                                </button>
                                            ` : ''}
                                        </div>
                                    ` : `
                                        <button class="upload-service-image-btn" onclick="window.uploadServiceImage('${service._id}')" style="background: rgba(255,255,255,0.3);">
                                            <svg width="32" height="32" viewBox="0 0 24 24" fill="none">
                                                <rect x="3" y="3" width="18" height="18" rx="2" stroke="currentColor" stroke-width="2"/>
                                                <circle cx="8.5" cy="8.5" r="1.5" fill="currentColor"/>
                                                <path d="M21 15l-5-5L5 21" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                                            </svg>
                                            <span>Add Images (max 5)</span>
                                        </button>
                                    `}

                                    <div class="service-content">
                                        <h3 class="service-title-modern">${service.title}</h3>
                                        <p class="service-description-modern">${service.description}</p>

                                        ${service.directLink ? `
                                            <a href="${service.directLink}" target="_blank" rel="noopener noreferrer" class="service-link-modern">
                                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                                                    <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6M15 3h6v6M10 14L21 3" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                                                </svg>
                                                View More Details
                                            </a>
                                        ` : ''}

                                        ${service.packages && service.packages.length > 0 ? `
                                            <div class="service-packages">
                                                <h4 class="packages-title">Service Packages</h4>
                                                <div class="packages-grid">
                                                    ${service.packages.map(pkg => `
                                                        <div class="package-card ${pkg.popular ? 'popular' : ''}" style="background: rgba(255,255,255,0.5);">
                                                            ${pkg.popular ? '<span class="popular-badge">POPULAR</span>' : ''}
                                                            <div class="package-name">${pkg.name}</div>
                                                            <div class="package-price">$${pkg.suggestedPrice || 0}</div>
                                                            <div class="package-description">${pkg.description || ''}</div>
                                                            <div class="package-meta">
                                                                <span>
                                                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                                                                        <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="2"/>
                                                                        <path d="M12 6v6l4 2" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
                                                                    </svg>
                                                                    ${pkg.deliveryDays} days
                                                                </span>
                                                                <span>
                                                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                                                                        <path d="M21.5 2v6h-6M2.5 22v-6h6M2 11.5a10 10 0 0118-6l1.5 2M22 12.5a10 10 0 01-18 6l-1.5-2" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                                                                    </svg>
                                                                    ${pkg.revisions} revisions
                                                                </span>
                                                            </div>
                                                            ${pkg.features && pkg.features.length > 0 ? `
                                                                <ul class="package-features">
                                                                    ${pkg.features.slice(0, 5).map(feature => `
                                                                        <li>
                                                                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                                                                                <path d="M20 6L9 17l-5-5" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                                                                            </svg>
                                                                            ${feature}
                                                                        </li>
                                                                    `).join('')}
                                                                </ul>
                                                            ` : ''}
                                                        </div>
                                                    `).join('')}
                                                </div>
                                            </div>
                                        ` : ''}

                                        <div class="service-actions">
                                            <button class="btn-secondary" onclick="window.editService('${service._id}')">Edit</button>
                                            <button class="btn-ghost" onclick="window.deleteService('${service._id}')" style="color: var(--error); border-color: var(--error);">Delete</button>
                                        </div>
                                    </div>
                                </div>
                            `).join('')}
                        </div>
                    ` : `
                        <div class="empty-state-modern glass-effect" style="border-radius: 16px; margin-top: 20px;">
                            <svg width="64" height="64" viewBox="0 0 24 24" fill="none">
                                <rect x="3" y="6" width="18" height="12" rx="2" stroke="currentColor" stroke-width="2"/>
                                <path d="M7 10h10M7 14h6" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
                            </svg>
                            <h3>No Services Yet</h3>
                            <p>Add your first service to start receiving bookings</p>
                            <button class="btn-primary mt-md" onclick="window.showAddServiceModal()">Add Your First Service</button>
                        </div>
                    `}
                </div>

                <div class="profile-card-modern glass-effect">
                    <h2 class="card-title-modern">Reviews</h2>
                    <div class="reviews-summary-modern">
                        <div class="reviews-rating-modern">
                            <span class="rating-stars-modern">★★★★★</span>
                            <span class="rating-number-modern">${userRating}</span>
                        </div>
                        <div class="reviews-count-modern">${reviewCount} reviews</div>
                    </div>
                    <p class="text-secondary">Reviews will be displayed here after clients complete their bookings and leave feedback.</p>
                </div>
                ` : ''}

                <div class="profile-card-modern glass-effect">
                    <h2 class="card-title-modern">Account Information</h2>
                    <div class="account-info-grid">
                        <div class="account-info-item">
                            <span class="info-label">Email</span>
                            <span class="info-value">${user.email}</span>
                        </div>
                        <div class="account-info-item">
                            <span class="info-label">Account Type</span>
                            <span class="info-value">${isCreator ? 'Creator Account' : 'Client Account'}</span>
                        </div>
                        <div class="account-info-item">
                            <span class="info-label">Email Verified</span>
                            ${user.isEmailVerified ?
                                '<span class="info-value" style="color: var(--success);">✓ Verified</span>' :
                                '<button class="btn-link" style="color: var(--warning); font-weight: 500;" onclick="requestEmailVerification()">⚠ Not verified - Click to verify</button>'
                            }
                        </div>
                        ${user.wallet ? `
                        <div class="account-info-item">
                            <span class="info-label">Wallet Balance</span>
                            <span class="info-value" style="font-weight: 600; color: var(--primary);">USDC ${(user.wallet.balance || 0).toFixed(2)}</span>
                        </div>
                        ` : ''}
                        <div class="account-info-item">
                            <span class="info-label">Member Since</span>
                            <span class="info-value">${user.createdAt ? new Date(user.createdAt).toLocaleDateString('en-US', { year: 'numeric', month: 'long' }) : 'N/A'}</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `;

    // Setup portfolio gallery navigation
    if (isCreator && user.portfolio && user.portfolio.length > 0) {
        window.currentPortfolio = user.portfolio;

        const portfolioGrid = document.getElementById('portfolioGrid');
        if (portfolioGrid) {
            const portfolioItems = portfolioGrid.querySelectorAll('.portfolio-item-modern');
            portfolioItems.forEach((item) => {
                item.addEventListener('click', () => {
                    const index = parseInt(item.dataset.index);
                    window.openImageModal(window.currentPortfolio[index], window.currentPortfolio, index);
                });
            });
        }
    }

    // Setup service image gallery navigation
    if (isCreator && services.length > 0) {
        const serviceGrids = document.querySelectorAll('.service-images-grid');
        serviceGrids.forEach((grid) => {
            const serviceIndex = parseInt(grid.dataset.serviceIndex);
            const service = services[serviceIndex];

            if (service && service.images) {
                const imageItems = grid.querySelectorAll('.service-image-item');
                imageItems.forEach((item) => {
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
        showToast('Sending verification code...', 'info');

        const response = await api.resendVerification();

        if (response.success) {
            showToast('Verification code sent to your email!', 'success');

            const { showEmailVerificationModal } = await import('../auth.js');
            showEmailVerificationModal(appState.user.email, appState.user.role);
        } else {
            showToast(response.message || 'Failed to send verification code', 'error');
        }
    } catch (error) {
        console.error('Error requesting verification:', error);
        showToast(error.message || 'Failed to send verification code. Please try again.', 'error');
    }
}

window.requestEmailVerification = requestEmailVerification;