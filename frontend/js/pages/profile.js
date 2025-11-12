// Profile Page Module
import { appState } from '../state.js';
import { getAvatarUrl } from '../utils/avatar.js';
import { renderProfileCompletionWidget } from '../utils/profileCompletion.js';
import api from '../services/api.js';

export async function renderProfilePage() {
    const mainContent = document.getElementById('mainContent');

    if (!appState.user) {
        mainContent.innerHTML = `
            <div class="empty-state">
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

    // More flexible creator check - check role, category, or services array
    const isCreator = user.role && (
        user.role.toLowerCase().includes('creator') ||
        user.role.toLowerCase() === 'creator'
    );

    console.log('Profile Page - Full User Object:', user);
    console.log('User Role (raw):', user.role);
    console.log('User Role (type):', typeof user.role);
    console.log('Is Creator?', isCreator);
    console.log('User Category:', user.category);
    console.log('Has Services Field?', 'services' in user);

    // Load services if creator
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

    // Get user data with defaults
    const coverImage = user.coverImage || 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=1200';
    const userLocation = user.location ?
        (typeof user.location === 'object' ?
            `${user.location.city || ''}${user.location.city && user.location.country ? ', ' : ''}${user.location.country || ''}`.trim()
            : user.location)
        : 'Nigeria';
    const userRating = user.rating?.average?.toFixed(1) || '0.0';
    const reviewCount = user.rating?.count || 0;

    mainContent.innerHTML = `
        <div class="profile-cover" style="background-image: url('${coverImage}'); background-size: cover; background-position: center;"></div>

        <div class="profile-header">
            <img src="${avatarUrl}" alt="${user.name}" class="profile-avatar">

            <div class="profile-info">
                <div class="profile-name-row">
                    <div>
                        <div style="display: flex; align-items: center; gap: 12px; flex-wrap: wrap;">
                            <h1>${user.name}</h1>
                            ${user.verified ? '<span class="verified-badge">✓ Verified</span>' : ''}
                        </div>

                        <!-- Trust Verification Badges -->
                        ${(user.isEmailVerified || user.isPhoneVerified || user.isIdVerified) ? `
                            <div style="display: flex; gap: 8px; margin-top: 8px; flex-wrap: wrap;">
                                ${user.isEmailVerified ? `
                                    <span style="display: inline-flex; align-items: center; gap: 4px; background: #DCFCE7; color: #166534; padding: 4px 10px; border-radius: 6px; font-size: 13px; font-weight: 500;">
                                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                                            <path d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" stroke="currentColor" stroke-width="2"/>
                                        </svg>
                                        Email Verified
                                    </span>
                                ` : ''}
                                ${user.isPhoneVerified ? `
                                    <span style="display: inline-flex; align-items: center; gap: 4px; background: #DCFCE7; color: #166534; padding: 4px 10px; border-radius: 6px; font-size: 13px; font-weight: 500;">
                                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                                            <rect x="5" y="2" width="14" height="20" rx="2" stroke="currentColor" stroke-width="2"/>
                                            <path d="M12 18h.01" stroke="currentColor" stroke-width="2"/>
                                        </svg>
                                        Phone Verified
                                    </span>
                                ` : ''}
                                ${user.isIdVerified ? `
                                    <span style="display: inline-flex; align-items: center; gap: 4px; background: #DCFCE7; color: #166534; padding: 4px 10px; border-radius: 6px; font-size: 13px; font-weight: 500;">
                                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                                            <path d="M21 10H3M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2" stroke="currentColor" stroke-width="2"/>
                                            <rect x="3" y="6" width="18" height="14" rx="2" stroke="currentColor" stroke-width="2"/>
                                        </svg>
                                        ID Verified
                                    </span>
                                ` : ''}
                            </div>
                        ` : ''}

                        <!-- Achievement Badges -->
                        ${user.badges && user.badges.length > 0 ? `
                            <div style="display: flex; gap: 8px; margin-top: 8px; flex-wrap: wrap;">
                                ${user.badges.map(badge => {
                                    const badgeInfo = {
                                        'top_rated': { icon: '⭐', label: 'Top Rated', color: '#FEF3C7', textColor: '#92400E' },
                                        'power_seller': { icon: '💪', label: 'Power Seller', color: '#DBEAFE', textColor: '#1E40AF' },
                                        'rising_talent': { icon: '🚀', label: 'Rising Talent', color: '#E0E7FF', textColor: '#3730A3' },
                                        'fast_responder': { icon: '⚡', label: 'Fast Responder', color: '#FEF3C7', textColor: '#92400E' },
                                        'reliable': { icon: '✓', label: 'Reliable', color: '#DCFCE7', textColor: '#166534' },
                                        'new_seller': { icon: '✨', label: 'New Seller', color: '#FCE7F3', textColor: '#831843' }
                                    };
                                    const info = badgeInfo[badge.type] || { icon: '🏆', label: badge.type, color: '#F3F4F6', textColor: '#374151' };
                                    return `
                                        <span style="display: inline-flex; align-items: center; gap: 4px; background: ${info.color}; color: ${info.textColor}; padding: 4px 10px; border-radius: 6px; font-size: 13px; font-weight: 500;">
                                            ${info.icon} ${info.label}
                                        </span>
                                    `;
                                }).join('')}
                            </div>
                        ` : ''}

                        <div class="creator-role mt-sm">${isCreator ? (user.category ? user.category.charAt(0).toUpperCase() + user.category.slice(1) : 'Creator') : 'Client'}</div>
                        <div class="creator-location mt-sm">
                            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                                <path d="M8 8.5a2 2 0 1 0 0-4 2 2 0 0 0 0 4z" stroke="currentColor" stroke-width="1.5"/>
                                <path d="M8 14s5-4 5-7.5a5 5 0 0 0-10 0C3 10 8 14 8 14z" stroke="currentColor" stroke-width="1.5"/>
                            </svg>
                            ${userLocation}
                        </div>
                        ${isCreator ? `
                        <div class="creator-rating mt-sm">
                            <span class="stars">★★★★★</span>
                            <span class="rating-count">${userRating} (${reviewCount} reviews)</span>
                        </div>
                        ` : ''}
                    </div>
                </div>

                <div class="profile-actions">
                    <button class="btn-primary" onclick="navigateToPage('settings')">Edit Profile</button>
                    ${isCreator ? '<button class="btn-secondary" onclick="navigateToPage(\'bookings\')">View Bookings</button>' : ''}
                    ${user.wallet ? '<button class="btn-ghost" onclick="navigateToPage(\'wallet\')">Manage Wallet</button>' : ''}
                </div>

                <div class="mt-lg">
                    <h3 class="mb-sm">About</h3>
                    <p>${user.bio || 'No bio added yet. Click Edit Profile to add your bio.'}</p>

                    ${isCreator ? `
                    <!-- Performance Metrics -->
                    <div class="mt-md" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 20px;">
                        <div style="text-align: center; padding: 16px; background: var(--surface); border: 1px solid var(--border); border-radius: 8px;">
                            <div class="small-text">Response Rate</div>
                            <div style="font-weight: 600; font-size: 24px; color: var(--primary); margin-top: 4px;">${user.metrics?.responseRate || 100}%</div>
                        </div>
                        <div style="text-align: center; padding: 16px; background: var(--surface); border: 1px solid var(--border); border-radius: 8px;">
                            <div class="small-text">On-Time Delivery</div>
                            <div style="font-weight: 600; font-size: 24px; color: var(--primary); margin-top: 4px;">${user.metrics?.onTimeDeliveryRate || 100}%</div>
                        </div>
                        <div style="text-align: center; padding: 16px; background: var(--surface); border: 1px solid var(--border); border-radius: 8px;">
                            <div class="small-text">Completed Jobs</div>
                            <div style="font-weight: 600; font-size: 24px; color: var(--primary); margin-top: 4px;">${user.completedBookings || 0}</div>
                        </div>
                        <div style="text-align: center; padding: 16px; background: var(--surface); border: 1px solid var(--border); border-radius: 8px;">
                            <div class="small-text">Repeat Clients</div>
                            <div style="font-weight: 600; font-size: 24px; color: var(--primary); margin-top: 4px;">${user.metrics?.repeatClientRate || 0}%</div>
                        </div>
                    </div>
                    ` : ''}
                </div>
            </div>
        </div>

        <div class="section">
            <div class="container">
                ${renderProfileCompletionWidget(user)}
            </div>
        </div>

        ${isCreator && user.portfolio && user.portfolio.length > 0 ? `
        <div class="section">
            <div class="container">
                <h2 class="mb-md">Portfolio</h2>
                <div class="portfolio-grid">
                    ${user.portfolio.map((image, index) => `
                        <div class="portfolio-item" onclick="window.open('${image}', '_blank')" style="cursor: pointer;">
                            <img src="${image}" alt="Portfolio ${index + 1}">
                            <div class="portfolio-overlay">
                                <div>Project ${index + 1}</div>
                            </div>
                        </div>
                    `).join('')}
                </div>
            </div>
        </div>
        ` : ''}

        ${isCreator ? `
        <div class="section">
            <div class="container">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px;">
                    <h2>My Services</h2>
                    <button class="btn-primary" onclick="window.showAddServiceModal()" style="display: flex; align-items: center; gap: 8px;">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                            <path d="M12 5v14M5 12h14" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
                        </svg>
                        Add Service
                    </button>
                </div>
                ${services.length > 0 ? `
                    <div style="display: grid; gap: 24px;">
                        ${services.map((service, index) => `
                            <div class="card" style="padding: 24px; border: 1px solid var(--border);">
                                ${service.images && service.images.length > 0 ? `
                                    <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(150px, 1fr)); gap: 8px; margin-bottom: 16px;">
                                        ${service.images.slice(0, 5).map((img, idx) => `
                                            <div style="position: relative;">
                                                <img src="${img}" alt="${service.title}" style="width: 100%; height: 120px; object-fit: cover; border-radius: 8px; cursor: pointer;" onclick="window.open('${img}', '_blank')">
                                                <button onclick="event.stopPropagation(); window.deleteServiceImage('${service._id}', ${idx})" style="position: absolute; top: 4px; right: 4px; background: rgba(0,0,0,0.7); color: white; border: none; border-radius: 50%; width: 28px; height: 28px; cursor: pointer; display: flex; align-items: center; justify-content: center; font-size: 18px;">×</button>
                                            </div>
                                        `).join('')}
                                        ${service.images.length < 5 ? `
                                            <button onclick="window.uploadServiceImage('${service._id}')" style="width: 100%; height: 120px; border: 2px dashed var(--border); border-radius: 8px; background: var(--surface); cursor: pointer; display: flex; align-items: center; justify-content: center; color: var(--primary);">
                                                <svg width="32" height="32" viewBox="0 0 24 24" fill="none">
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
                                <div style="margin-bottom: 16px;">
                                    <h3 style="font-size: 20px; font-weight: 600; margin-bottom: 8px;">${service.title}</h3>
                                    <p style="color: var(--text-secondary); line-height: 1.6;">${service.description}</p>
                                </div>
                                ${service.directLink ? `
                                    <div style="margin-bottom: 16px;">
                                        <a href="${service.directLink}" target="_blank" rel="noopener noreferrer" style="color: var(--primary); text-decoration: none; font-size: 14px; display: inline-flex; align-items: center; gap: 4px;">
                                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                                                <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6M15 3h6v6M10 14L21 3" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                                            </svg>
                                            View More Details
                                        </a>
                                    </div>
                                ` : ''}
                                <!-- Service Packages -->
                                ${service.packages && service.packages.length > 0 ? `
                                    <div style="margin-bottom: 16px;">
                                        <h4 style="font-size: 16px; font-weight: 600; margin-bottom: 12px;">Service Packages</h4>
                                        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); gap: 16px;">
                                            ${service.packages.map(pkg => `
                                                <div style="border: ${pkg.popular ? '2px solid var(--primary)' : '1px solid var(--border)'}; border-radius: 8px; padding: 16px; position: relative; background: var(--surface);">
                                                    ${pkg.popular ? `<span style="position: absolute; top: -10px; left: 50%; transform: translateX(-50%); background: var(--primary); color: white; padding: 4px 12px; border-radius: 12px; font-size: 12px; font-weight: 600;">POPULAR</span>` : ''}
                                                    <div style="font-weight: 600; font-size: 18px; margin-bottom: 8px;">${pkg.name}</div>
                                                    <div style="color: var(--primary); font-size: 24px; font-weight: 700; margin-bottom: 12px;">$${pkg.suggestedPrice || 0}</div>
                                                    <div style="color: var(--text-secondary); font-size: 14px; margin-bottom: 12px;">${pkg.description || ''}</div>
                                                    <div style="display: flex; gap: 16px; margin-bottom: 12px; font-size: 13px;">
                                                        <div>
                                                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" style="display: inline; margin-right: 4px; vertical-align: middle;">
                                                                <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="2"/>
                                                                <path d="M12 6v6l4 2" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
                                                            </svg>
                                                            ${pkg.deliveryDays} days
                                                        </div>
                                                        <div>
                                                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" style="display: inline; margin-right: 4px; vertical-align: middle;">
                                                                <path d="M21.5 2v6h-6M2.5 22v-6h6M2 11.5a10 10 0 0118-6l1.5 2M22 12.5a10 10 0 01-18 6l-1.5-2" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                                                            </svg>
                                                            ${pkg.revisions} revisions
                                                        </div>
                                                    </div>
                                                    ${pkg.features && pkg.features.length > 0 ? `
                                                        <ul style="list-style: none; padding: 0; margin: 0; font-size: 13px;">
                                                            ${pkg.features.slice(0, 5).map(feature => `
                                                                <li style="padding: 4px 0; color: var(--text-secondary);">
                                                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" style="display: inline; margin-right: 6px; vertical-align: middle; color: var(--primary);">
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
                                <div style="display: flex; gap: 8px; margin-top: 16px;">
                                    <button class="btn-secondary" onclick="window.editService('${service._id}')" style="flex: 1;">Edit</button>
                                    <button class="btn-ghost" onclick="window.deleteService('${service._id}')" style="flex: 1; color: var(--error); border-color: var(--error);">Delete</button>
                                </div>
                            </div>
                        `).join('')}
                    </div>
                ` : `
                    <div class="card" style="text-align: center; padding: 40px;">
                        <svg width="64" height="64" viewBox="0 0 24 24" fill="none" style="opacity: 0.3; margin: 0 auto 16px;">
                            <rect x="3" y="6" width="18" height="12" rx="2" stroke="currentColor" stroke-width="2"/>
                            <path d="M7 10h10M7 14h6" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
                        </svg>
                        <h3 style="margin-bottom: 8px;">No Services Yet</h3>
                        <p class="text-secondary">Add your first service to start receiving bookings</p>
                        <button class="btn-primary mt-md" onclick="window.showAddServiceModal()">Add Your First Service</button>
                    </div>
                `}
            </div>
        </div>

        <div class="section">
            <div class="container">
                <h2 class="mb-md">Reviews</h2>
                <div class="card">
                    <div class="creator-rating mb-md">
                        <span class="stars" style="font-size: 24px;">★★★★★</span>
                        <span style="font-size: 24px; font-weight: 600; margin-left: 8px;">${userRating}</span>
                        <span class="rating-count">(${reviewCount} reviews)</span>
                    </div>
                    <p class="text-secondary">Reviews will be displayed here after clients complete their bookings and leave feedback.</p>
                </div>
            </div>
        </div>
        ` : ''}

        <div class="section">
            <div class="container">
                <h2 class="mb-md">Account Information</h2>
                <div class="card">
                    <table style="width: 100%; border-collapse: collapse;">
                        <tr style="border-bottom: 1px solid var(--border);">
                            <td style="padding: 16px 0; font-weight: 600;">Email</td>
                            <td style="padding: 16px 0; text-align: right;">${user.email}</td>
                        </tr>
                        <tr style="border-bottom: 1px solid var(--border);">
                            <td style="padding: 16px 0; font-weight: 600;">Account Type</td>
                            <td style="padding: 16px 0; text-align: right;">${isCreator ? 'Creator Account' : 'Client Account'}</td>
                        </tr>
                        <tr style="border-bottom: 1px solid var(--border);">
                            <td style="padding: 16px 0; font-weight: 600;">Email Verified</td>
                            <td style="padding: 16px 0; text-align: right;">${user.isEmailVerified ? '<span style="color: var(--success);">✓ Verified</span>' : '<span style="color: var(--warning);">Not verified</span>'}</td>
                        </tr>
                        ${user.wallet ? `
                        <tr style="border-bottom: 1px solid var(--border);">
                            <td style="padding: 16px 0; font-weight: 600;">Wallet Balance</td>
                            <td style="padding: 16px 0; text-align: right; font-weight: 600; color: var(--primary);">${user.wallet.currency || 'USDC'} ${(user.wallet.balance || 0).toFixed(2)}</td>
                        </tr>
                        ` : ''}
                        <tr>
                            <td style="padding: 16px 0; font-weight: 600;">Member Since</td>
                            <td style="padding: 16px 0; text-align: right;">${user.createdAt ? new Date(user.createdAt).toLocaleDateString('en-US', { year: 'numeric', month: 'long' }) : 'N/A'}</td>
                        </tr>
                    </table>
                </div>
            </div>
        </div>
    `;
}
