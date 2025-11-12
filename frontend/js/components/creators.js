// Creators Component Module
import { appState, addToHistory, setCurrentPage } from '../state.js';
import { updateBackButton } from '../navigation.js';
import api from '../services/api.js';

export function renderCreatorCards(creators) {
    return creators.map(creator => `
        <div class="creator-card" data-creator-id="${creator.id}">
            <img src="${creator.avatar}" alt="${creator.name}" class="creator-image">
            <div class="creator-info">
                <div class="creator-header">
                    <div>
                        <div class="creator-name">${creator.name}</div>
                        ${creator.verified ? '<span class="verified-badge">✓ Verified</span>' : ''}
                    </div>
                </div>
                <div class="creator-role">${creator.role}</div>
                <div class="creator-location">
                    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                        <path d="M7 7.5a2 2 0 1 0 0-4 2 2 0 0 0 0 4z" stroke="currentColor" stroke-width="1.5"/>
                        <path d="M7 12s4-3 4-6a4 4 0 0 0-8 0c0 3 4 6 4 6z" stroke="currentColor" stroke-width="1.5"/>
                    </svg>
                    ${creator.location}
                </div>
                <div class="creator-rating">
                    <span class="stars">★★★★★</span>
                    <span class="rating-count">${creator.rating} (${creator.reviewCount})</span>
                </div>
                <div class="creator-price">${creator.price}</div>
                <div class="creator-actions">
                    <button class="btn-secondary view-profile-btn" data-creator-id="${creator.id}">View profile</button>
                    <button class="btn-primary book-now-btn" data-creator-id="${creator.id}">Book now</button>
                </div>
            </div>
        </div>
    `).join('');
}

export async function renderCreatorProfile(creatorIdOrObject) {
    // Track that we're viewing a profile (not a main page)
    setCurrentPage('creator-profile');

    if (!creatorIdOrObject) {
        console.error('No creator data provided to renderCreatorProfile');
        return;
    }

    const mainContent = document.getElementById('mainContent');
    let creator;

    // If passed an object with id, fetch fresh data from API
    if (typeof creatorIdOrObject === 'object' && creatorIdOrObject.id) {
        try {
            // Show loading state
            mainContent.innerHTML = `
                <div class="section">
                    <div class="container">
                        <div class="text-center" style="padding: 60px 20px;">
                            <svg width="64" height="64" viewBox="0 0 24 24" fill="none" style="opacity: 0.4; margin-bottom: 16px;">
                                <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="2"/>
                                <path d="M12 12l3-3M12 12V8" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
                            </svg>
                            <p class="text-secondary">Loading profile...</p>
                        </div>
                    </div>
                </div>
            `;

            console.log('🔄 Fetching fresh creator profile from API:', creatorIdOrObject.id);
            const response = await api.getCreatorProfile(creatorIdOrObject.id);
            console.log('✅ Creator profile API response:', response);

            if (response.success) {
                // Transform API data to match frontend format
                const apiCreator = response.data.creator;
                creator = {
                    id: apiCreator._id || apiCreator.id,
                    name: apiCreator.name || 'Unknown Creator',
                    // Use uploaded avatar if available, otherwise use default with initials
                    avatar: apiCreator.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(apiCreator.name || 'User')}&background=9747FF&color=fff&bold=true`,
                    role: apiCreator.category ? apiCreator.category.charAt(0).toUpperCase() + apiCreator.category.slice(1) : 'Creator',
                    location: apiCreator.location ?
                        (typeof apiCreator.location === 'object' ?
                            `${apiCreator.location.city || ''}${apiCreator.location.city && apiCreator.location.country ? ', ' : ''}${apiCreator.location.country || ''}`.trim()
                            : apiCreator.location)
                        : 'Nigeria',
                    rating: apiCreator.rating?.average?.toFixed(1) || '0.0',
                    reviewCount: apiCreator.rating?.count || 0,
                    verified: apiCreator.isVerified || false,
                    isEmailVerified: apiCreator.isEmailVerified || false,
                    isPhoneVerified: apiCreator.isPhoneVerified || false,
                    isIdVerified: apiCreator.isIdVerified || false,
                    price: apiCreator.hourlyRate ? `From $${apiCreator.hourlyRate}/hr` : 'Contact for pricing',
                    bio: apiCreator.bio || 'No bio yet',
                    cover: apiCreator.coverImage,
                    portfolio: apiCreator.portfolio || [],
                    services: apiCreator.services || [],
                    responseTime: apiCreator.responseTime || 'Within a day',
                    completedJobs: apiCreator.completedBookings || 0,
                    metrics: apiCreator.metrics || {},
                    badges: apiCreator.badges || []
                };
                console.log('✅ Transformed creator:', creator);
            } else {
                throw new Error('Failed to load creator profile');
            }
        } catch (error) {
            console.error('❌ Failed to load creator profile:', error);
            mainContent.innerHTML = `
                <div class="section">
                    <div class="container">
                        <div class="empty-state">
                            <div class="empty-icon">❌</div>
                            <h3>Failed to load profile</h3>
                            <p>${error.message}</p>
                            <button class="btn-primary" onclick="window.history.back()">Go back</button>
                        </div>
                    </div>
                </div>
            `;
            return;
        }
    } else {
        // If passed a full creator object, use it directly (for backward compatibility)
        creator = creatorIdOrObject;
    }
    // Use uploaded avatar if available, otherwise use default with initials
    const avatarUrl = creator.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(creator.name || 'User')}&background=9747FF&color=fff&bold=true`;
    const coverImage = creator.cover || 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=1200';
    mainContent.innerHTML = `
        <div class="profile-cover" style="background-image: url('${coverImage}'); background-size: cover; background-position: center;"></div>

        <div class="profile-header">
            <img src="${avatarUrl}" alt="${creator.name}" class="profile-avatar">

            <div class="profile-info">
                <div class="profile-name-row">
                    <div>
                        <div style="display: flex; align-items: center; gap: 12px; flex-wrap: wrap;">
                            <h1>${creator.name}</h1>
                            ${creator.verified ? '<span class="verified-badge">✓ Verified</span>' : ''}
                        </div>

                        <!-- Trust Verification Badges -->
                        ${(creator.isEmailVerified || creator.isPhoneVerified || creator.isIdVerified) ? `
                            <div style="display: flex; gap: 8px; margin-top: 8px; flex-wrap: wrap;">
                                ${creator.isEmailVerified ? `
                                    <span style="display: inline-flex; align-items: center; gap: 4px; background: #DCFCE7; color: #166534; padding: 4px 10px; border-radius: 6px; font-size: 13px; font-weight: 500;">
                                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                                            <path d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" stroke="currentColor" stroke-width="2"/>
                                        </svg>
                                        Email Verified
                                    </span>
                                ` : ''}
                                ${creator.isPhoneVerified ? `
                                    <span style="display: inline-flex; align-items: center; gap: 4px; background: #DCFCE7; color: #166534; padding: 4px 10px; border-radius: 6px; font-size: 13px; font-weight: 500;">
                                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                                            <rect x="5" y="2" width="14" height="20" rx="2" stroke="currentColor" stroke-width="2"/>
                                            <path d="M12 18h.01" stroke="currentColor" stroke-width="2"/>
                                        </svg>
                                        Phone Verified
                                    </span>
                                ` : ''}
                                ${creator.isIdVerified ? `
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
                        ${creator.badges && creator.badges.length > 0 ? `
                            <div style="display: flex; gap: 8px; margin-top: 8px; flex-wrap: wrap;">
                                ${creator.badges.map(badge => {
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

                        <div class="creator-role mt-sm">${creator.role}</div>
                        <div class="creator-location mt-sm">
                            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                                <path d="M8 8.5a2 2 0 1 0 0-4 2 2 0 0 0 0 4z" stroke="currentColor" stroke-width="1.5"/>
                                <path d="M8 14s5-4 5-7.5a5 5 0 0 0-10 0C3 10 8 14 8 14z" stroke="currentColor" stroke-width="1.5"/>
                            </svg>
                            ${creator.location}
                        </div>
                        <div class="creator-rating mt-sm">
                            <span class="stars">★★★★★</span>
                            <span class="rating-count">${creator.rating} (${creator.reviewCount} reviews)</span>
                        </div>
                    </div>
                </div>

                <div class="profile-actions">
                    <button class="btn-primary profile-book-now-btn" data-creator-id="${creator.id}">Book now</button>
                    <button class="btn-secondary">Message</button>
                    <button class="btn-ghost" id="favoriteBtn" data-creator-id="${creator.id}">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" style="margin-right: 4px;">
                            <path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                        </svg>
                        Save
                    </button>
                </div>

                <div class="mt-lg">
                    <h3 class="mb-sm">About</h3>
                    <p>${creator.bio || 'No bio available'}</p>

                    <!-- Performance Metrics -->
                    <div class="mt-md" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 20px;">
                        <div style="text-align: center; padding: 16px; background: var(--surface); border: 1px solid var(--border); border-radius: 8px;">
                            <div class="small-text">Response Rate</div>
                            <div style="font-weight: 600; font-size: 24px; color: var(--primary); margin-top: 4px;">${creator.metrics?.responseRate || 100}%</div>
                        </div>
                        <div style="text-align: center; padding: 16px; background: var(--surface); border: 1px solid var(--border); border-radius: 8px;">
                            <div class="small-text">On-Time Delivery</div>
                            <div style="font-weight: 600; font-size: 24px; color: var(--primary); margin-top: 4px;">${creator.metrics?.onTimeDeliveryRate || 100}%</div>
                        </div>
                        <div style="text-align: center; padding: 16px; background: var(--surface); border: 1px solid var(--border); border-radius: 8px;">
                            <div class="small-text">Completed Jobs</div>
                            <div style="font-weight: 600; font-size: 24px; color: var(--primary); margin-top: 4px;">${creator.completedJobs || 0}</div>
                        </div>
                        <div style="text-align: center; padding: 16px; background: var(--surface); border: 1px solid var(--border); border-radius: 8px;">
                            <div class="small-text">Repeat Clients</div>
                            <div style="font-weight: 600; font-size: 24px; color: var(--primary); margin-top: 4px;">${creator.metrics?.repeatClientRate || 0}%</div>
                        </div>
                    </div>
                </div>
            </div>
        </div>

        ${creator.portfolio && creator.portfolio.length > 0 ? `
        <div class="section">
            <div class="container">
                <h2 class="mb-md">Portfolio</h2>
                <div class="portfolio-grid">
                    ${creator.portfolio.map((image, index) => `
                        <div class="portfolio-item" data-creator-id="${creator.id}" data-image-index="${index}">
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

        <div class="section">
            <div class="container">
                <h2 class="mb-md">Services</h2>
                ${creator.services && creator.services.length > 0 ? `
                    <div class="services-list" style="display: grid; gap: 24px;">
                        ${creator.services.map((service, index) => `
                            <div class="service-card" style="border: 1px solid var(--border); border-radius: 12px; padding: 24px; background: var(--surface);">
                                ${service.images && service.images.length > 0 ? `
                                    <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(150px, 1fr)); gap: 8px; margin-bottom: 16px;">
                                        ${service.images.slice(0, 5).map(img => `
                                            <img src="${img}" alt="${service.title}" style="width: 100%; height: 120px; object-fit: cover; border-radius: 8px; cursor: pointer;" onclick="window.open('${img}', '_blank')">
                                        `).join('')}
                                    </div>
                                ` : ''}
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
                                                <div style="border: ${pkg.popular ? '2px solid var(--primary)' : '1px solid var(--border)'}; border-radius: 8px; padding: 16px; position: relative; background: var(--background);">
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
                                                        <ul style="list-style: none; padding: 0; margin: 0 0 12px 0; font-size: 13px;">
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
                                                    <button class="btn-primary service-package-btn" data-creator-id="${creator.id}" data-service-index="${index}" data-package-name="${pkg.name}" style="width: 100%; font-size: 14px;">Select ${pkg.name}</button>
                                                </div>
                                            `).join('')}
                                        </div>
                                    </div>
                                ` : `
                                    <div style="background: #EFF6FF; padding: 12px; border-radius: 8px; margin-bottom: 16px;">
                                        <div style="color: #1E40AF; font-size: 14px; font-weight: 500;">
                                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" style="display: inline; margin-right: 4px; vertical-align: middle;">
                                                <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="2"/>
                                                <path d="M12 16v-4M12 8h.01" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
                                            </svg>
                                            Client-Proposed Pricing: You set your budget when booking
                                        </div>
                                    </div>
                                    <button class="btn-primary service-book-btn" data-creator-id="${creator.id}" data-service-index="${index}" style="width: 100%;">Request This Service</button>
                                `}
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
                        <p class="text-secondary">This creator hasn't set up their services yet. Check back later!</p>
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
                        <span style="font-size: 24px; font-weight: 600; margin-left: 8px;">${creator.rating}</span>
                        <span class="rating-count">(${creator.reviewCount} reviews)</span>
                    </div>
                    <p class="text-secondary">Reviews will be displayed here after clients complete their bookings and leave feedback.</p>
                </div>
            </div>
        </div>
    `;

    // Update back button visibility
    updateBackButton();

    // Setup profile page button listeners
    setupProfileButtonListeners(creator);
}

function setupProfileButtonListeners(creator) {
    // Handle Book Now button in profile header
    const profileBookBtn = document.querySelector('.profile-book-now-btn');
    if (profileBookBtn) {
        profileBookBtn.addEventListener('click', () => {
            if (!appState.user) {
                window.showAuthModal('signin');
            } else {
                window.showBookingModal(creator.id);
            }
        });
    }

    // Handle Portfolio lightbox items
    document.querySelectorAll('.portfolio-item').forEach(item => {
        item.addEventListener('click', () => {
            const creatorId = item.dataset.creatorId;
            const imageIndex = parseInt(item.dataset.imageIndex);
            window.openLightbox(creatorId, imageIndex);
        });
    });

    // Handle Service booking buttons
    document.querySelectorAll('.service-book-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const creatorId = btn.dataset.creatorId;
            const serviceIndex = parseInt(btn.dataset.serviceIndex);
            if (!appState.user) {
                window.showAuthModal('signin');
            } else {
                window.showBookingModal(creatorId, serviceIndex);
            }
        });
    });

    // Handle Service package booking buttons
    document.querySelectorAll('.service-package-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const creatorId = btn.dataset.creatorId;
            const serviceIndex = parseInt(btn.dataset.serviceIndex);
            const packageName = btn.dataset.packageName;
            if (!appState.user) {
                window.showAuthModal('signin');
            } else {
                window.showBookingModal(creatorId, serviceIndex, packageName);
            }
        });
    });

    // Handle Favorite button
    const favoriteBtn = document.getElementById('favoriteBtn');
    if (favoriteBtn && appState.user) {
        // Check if creator is already favorited
        checkFavoriteStatus(creator.id, favoriteBtn);

        favoriteBtn.addEventListener('click', async () => {
            try {
                const isFavorited = favoriteBtn.classList.contains('favorited');

                if (isFavorited) {
                    await api.removeFromFavorites(creator.id);
                    favoriteBtn.classList.remove('favorited');
                    favoriteBtn.querySelector('svg path').setAttribute('fill', 'none');
                    window.showToast('Removed from favorites', 'success');
                } else {
                    await api.addToFavorites(creator.id);
                    favoriteBtn.classList.add('favorited');
                    favoriteBtn.querySelector('svg path').setAttribute('fill', 'currentColor');
                    window.showToast('Added to favorites!', 'success');
                }
            } catch (error) {
                console.error('Error toggling favorite:', error);
                window.showToast(error.message || 'Failed to update favorite', 'error');
            }
        });
    }
}

async function checkFavoriteStatus(creatorId, btn) {
    try {
        const response = await api.isFavorited(creatorId);
        if (response.success && response.data.isFavorited) {
            btn.classList.add('favorited');
            btn.querySelector('svg path').setAttribute('fill', 'currentColor');
        }
    } catch (error) {
        console.error('Error checking favorite status:', error);
    }
}

export function setupCreatorCardListeners() {
    // Handle View Profile buttons
    document.querySelectorAll('.view-profile-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const creatorId = btn.dataset.creatorId;
            const creator = appState.creators.find(c => c.id === creatorId);
            if (creator) {
                // Add current page to history before navigating to profile
                if (appState.currentPage !== 'creator-profile') {
                    addToHistory(appState.currentPage);
                }
                renderCreatorProfile(creator);
            }
        });
    });

    // Handle Book Now buttons
    document.querySelectorAll('.book-now-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const creatorId = btn.dataset.creatorId;
            if (!appState.user) {
                window.showAuthModal('signin');
            } else {
                window.showBookingModal(creatorId);
            }
        });
    });

    // Handle card clicks (anywhere except buttons)
    document.querySelectorAll('.creator-card').forEach(card => {
        card.addEventListener('click', (e) => {
            if (!e.target.closest('button')) {
                const creatorId = card.dataset.creatorId;
                const creator = appState.creators.find(c => c.id === creatorId);
                if (creator) {
                    // Add current page to history before navigating to profile
                    if (appState.currentPage !== 'creator-profile') {
                        addToHistory(appState.currentPage);
                    }
                    renderCreatorProfile(creator);
                }
            }
        });
    });
}

// Make function available globally for inline onclick handlers
window.renderCreatorProfile = renderCreatorProfile;

export function renderCategories(categoryCounts = {}) {
    // Map category types to display info
    const categoryMap = {
        photographer: { name: 'Photographers', icon: '<svg width="32" height="32" viewBox="0 0 24 24" fill="none"><rect x="2" y="4" width="20" height="16" rx="2" stroke="currentColor" stroke-width="2"/><circle cx="12" cy="12" r="3" stroke="currentColor" stroke-width="2"/><path d="M7 4V2" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>' },
        designer: { name: 'Designers', icon: '<svg width="32" height="32" viewBox="0 0 24 24" fill="none"><path d="M12 2l3 7h7l-5.5 4 2 7-6.5-5-6.5 5 2-7L2 9h7l3-7z" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/></svg>' },
        videographer: { name: 'Videographers', icon: '<svg width="32" height="32" viewBox="0 0 24 24" fill="none"><rect x="2" y="6" width="14" height="12" rx="2" stroke="currentColor" stroke-width="2"/><path d="M16 10l6-4v12l-6-4" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/></svg>' },
        illustrator: { name: 'Illustrators', icon: '<svg width="32" height="32" viewBox="0 0 24 24" fill="none"><path d="M12 19l7-7 3 3-7 7-3-3z" stroke="currentColor" stroke-width="2"/><path d="M18 13l-1.5-7.5L2 2l3.5 14.5L13 18l5-5z" stroke="currentColor" stroke-width="2"/><path d="M2 2l7.586 7.586" stroke="currentColor" stroke-width="2"/><circle cx="11" cy="11" r="2" stroke="currentColor" stroke-width="2"/></svg>' },
        other: { name: 'Other', icon: '<svg width="32" height="32" viewBox="0 0 24 24" fill="none"><path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16V8z" stroke="currentColor" stroke-width="2"/></svg>' }
    };

    const categories = [];

    // Add categories from API data
    Object.keys(categoryMap).forEach(key => {
        const count = categoryCounts[key] || 0;
        if (count > 0 || key === 'photographer' || key === 'designer') {
            categories.push({
                name: categoryMap[key].name,
                icon: categoryMap[key].icon,
                count: count
            });
        }
    });

    // If no categories have counts, show placeholders
    if (categories.length === 0) {
        categories.push(
            { name: 'Photographers', icon: '📷', count: 0 },
            { name: 'Designers', icon: '🎨', count: 0 },
            { name: 'Videographers', icon: '🎥', count: 0 }
        );
    }

    return categories.map(category => `
        <div class="category-card">
            <div class="category-icon">${category.icon}</div>
            <div class="category-name">${category.name}</div>
            <div class="category-count">${category.count > 0 ? category.count.toLocaleString() : 'Coming soon'} ${category.count > 0 ? 'creators' : ''}</div>
        </div>
    `).join('');
}
