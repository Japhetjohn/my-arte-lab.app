import { appState, addToHistory, setCurrentPage } from '../state.js';
import { updateBackButton } from '../navigation.js';
import api from '../services/api.js';
import { formatLocation } from '../utils/formatters.js';

// Generate star rating HTML based on numeric rating
function renderStars(rating) {
    const numRating = parseFloat(rating) || 0;
    const fullStars = Math.floor(numRating);
    const hasHalfStar = numRating % 1 >= 0.5;
    const emptyStars = 5 - fullStars - (hasHalfStar ? 1 : 0);

    let starsHTML = '';

    // Add full stars
    for (let i = 0; i < fullStars; i++) {
        starsHTML += '<span class="star filled">★</span>';
    }

    // Add half star if needed
    if (hasHalfStar) {
        starsHTML += '<span class="star half">★</span>';
    }

    // Add empty stars
    for (let i = 0; i < emptyStars; i++) {
        starsHTML += '<span class="star empty">★</span>';
    }

    return starsHTML;
}

export function renderCreatorCards(creators) {
    return creators.map((creator, index) => `
        <div class="creator-card card-entrance card-lift dynamic-light grid-item-${(index % 6) + 1}" data-creator-id="${creator.id}">
            <img src="${creator.avatar}" alt="${creator.name}" class="creator-image" loading="lazy">
            <div class="creator-info">
                <div class="creator-header">
                    <div>
                        <div class="creator-name">${creator.name}</div>
                        <div style="display: flex; gap: 6px; margin-top: 4px; flex-wrap: wrap;">
                            ${creator.verified ? '<span class="verified-badge">✓ Verified</span>' : ''}
                            ${creator.badge ? `<span class="tier-badge" style="background: ${creator.badgeColor}15; color: ${creator.badgeColor}; border: 1px solid ${creator.badgeColor}40;">${creator.badge}</span>` : ''}
                        </div>
                    </div>
                </div>
                <div class="creator-role">${creator.role}</div>
                <div class="creator-location">
                    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                        <path d="M7 7.5a2 2 0 1 0 0-4 2 2 0 0 0 0 4z" stroke="currentColor" stroke-width="1.5"/>
                        <path d="M7 12s4-3 4-6a4 4 0 0 0-8 0c0 3 4 6 4 6z" stroke="currentColor" stroke-width="1.5"/>
                    </svg>
                    ${typeof creator.location === 'object' ? formatLocation(creator.location) : creator.location}
                </div>
                <div class="creator-rating">
                    <span class="stars">${renderStars(creator.rating)}</span>
                    <span class="rating-count">${creator.rating} ${creator.reviewCount > 0 ? `(${creator.reviewCount})` : '(No reviews yet)'}</span>
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
    setCurrentPage('creator-profile');

    if (!creatorIdOrObject) {
        return;
    }

    const mainContent = document.getElementById('mainContent');
    let creator;

    // Extract creator ID from string or object
    const creatorId = typeof creatorIdOrObject === 'string' ? creatorIdOrObject : creatorIdOrObject.id;

    if (creatorId) {
        try {
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

            const response = await api.getCreatorProfile(creatorId);

            if (response.success) {
                const apiCreator = response.data.creator;
                creator = {
                    id: apiCreator._id || apiCreator.id,
                    name: apiCreator.name || 'Unknown Creator',
                    avatar: apiCreator.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(apiCreator.name || 'User')}&background=9747FF&color=fff&bold=true`,
                    role: apiCreator.category ? apiCreator.category.charAt(0).toUpperCase() + apiCreator.category.slice(1) : 'Creator',
                    location: formatLocation(apiCreator.location),
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
            } else {
                throw new Error('Failed to load creator profile');
            }
        } catch (error) {
            mainContent.innerHTML = `
                <div class="section">
                    <div class="container">
                        <div class="empty-state">
                            <svg width="64" height="64" viewBox="0 0 24 24" fill="none" style="opacity: 0.4; margin-bottom: 16px; color: var(--error);">
                                <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="2"/>
                                <path d="M12 8v4M12 16h.01" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
                            </svg>
                            <h3>Failed to load profile</h3>
                            <p>${error.message}</p>
                            <button class="btn-primary" onclick="window.history.back()">Go back</button>
                        </div>
                    </div>
                </div>
            `;
            return;
        }
    }

    const avatarUrl = creator.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(creator.name || 'User')}&background=9747FF&color=fff&bold=true`;
    const coverImage = creator.cover || 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=1200';

    mainContent.innerHTML = `
        <div style="max-width: 680px; margin: 0 auto; padding: 32px 20px 60px; animation: fadeIn 0.4s ease;">
            <!-- Header navigation/back would go here if needed, but app.js handles it -->
            
            <!-- Hero Section -->
            <div style="position: relative; margin-bottom: 32px;">
                <div style="height: 180px; width: 100%; border-radius: 24px; overflow: hidden; background: rgba(0,0,0,0.05);">
                    <img src="${coverImage}" style="width: 100%; height: 100%; object-fit: cover;">
                </div>
                <div style="padding: 0 24px; margin-top: -50px; display: flex; align-items: flex-end; gap: 20px;">
                    <div style="position: relative;">
                        <img src="${avatarUrl}" style="width: 100px; height: 100px; border-radius: 28px; border: 4px solid var(--background); background: var(--background); box-shadow: 0 10px 25px rgba(0,0,0,0.1); object-fit: cover;">
                        ${creator.verified ? `
                            <div style="position: absolute; bottom: -4px; right: -4px; width: 28px; height: 28px; background: #10B981; border: 3px solid var(--background); border-radius: 10px; display: flex; align-items: center; justify-content: center; color: white;">
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="4"><path d="M20 6L9 17l-5-5" stroke-linecap="round" stroke-linejoin="round"/></svg>
                            </div>
                        ` : ''}
                    </div>
                    <div style="flex: 1; padding-bottom: 8px;">
                        <h1 style="font-size: 26px; font-weight: 800; color: var(--text-primary); margin: 0 0 4px; letter-spacing: -0.02em;">${creator.name}</h1>
                        <div style="display: flex; align-items: center; gap: 8px; flex-wrap: wrap;">
                            <span style="background: var(--primary); color: white; padding: 4px 12px; border-radius: 8px; font-size: 11px; font-weight: 700;">${creator.role}</span>
                            <div style="display: flex; align-items: center; gap: 4px; color: var(--text-secondary); font-size: 12px; font-weight: 600; opacity: 0.8;">
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
                                ${creator.location}
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <div style="display: flex; flex-direction: column; gap: 24px;">
                <!-- Booking Card -->
                <div style="background: linear-gradient(135deg, rgba(151,71,255,0.08), rgba(107,70,255,0.08)); border: 1.5px solid rgba(151,71,255,0.25); border-radius: 20px; padding: 24px; display: flex; align-items: center; justify-content: space-between; gap: 20px;">
                    <div>
                        <div style="font-size: 10px; font-weight: 800; color: var(--primary); text-transform: uppercase; letter-spacing: 0.1em; margin-bottom: 4px;">Service Rate</div>
                        <div style="font-size: 22px; font-weight: 800; color: var(--text-primary);">${creator.price}</div>
                    </div>
                    <button class="btn-primary profile-book-now-btn" data-creator-id="${creator.id}" style="padding: 12px 28px; border-radius: 12px; font-weight: 700;">Book Now</button>
                </div>

                <!-- About -->
                <div style="background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.08); border-radius: 20px; padding: 24px;">
                    <span style="font-size: 11px; font-weight: 800; color: var(--text-secondary); text-transform: uppercase; letter-spacing: 0.1em; opacity: 0.6; display: block; margin-bottom: 12px;">Identity & Bio</span>
                    <p style="font-size: 15px; color: var(--text-secondary); line-height: 1.7; margin: 0; opacity: 0.9;">
                        ${creator.bio || 'Professional identity details are currently being finalized.'}
                    </p>
                </div>

                <!-- Stats Grid -->
                <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px;">
                    <div style="background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.08); border-radius: 16px; padding: 16px; text-align: center;">
                        <div style="font-size: 20px; font-weight: 800; color: var(--text-primary);">${creator.metrics?.responseRate || 100}%</div>
                        <div style="font-size: 10px; font-weight: 700; color: var(--text-secondary); text-transform: uppercase; margin-top: 4px; opacity: 0.6;">Response</div>
                    </div>
                    <div style="background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.08); border-radius: 16px; padding: 16px; text-align: center;">
                        <div style="font-size: 20px; font-weight: 800; color: var(--text-primary);">${creator.metrics?.onTimeDeliveryRate || 100}%</div>
                        <div style="font-size: 10px; font-weight: 700; color: var(--text-secondary); text-transform: uppercase; margin-top: 4px; opacity: 0.6;">On Time</div>
                    </div>
                    <div style="background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.08); border-radius: 16px; padding: 16px; text-align: center;">
                        <div style="font-size: 20px; font-weight: 800; color: var(--primary);">${creator.rating}</div>
                        <div style="font-size: 10px; font-weight: 700; color: var(--text-secondary); text-transform: uppercase; margin-top: 4px; opacity: 0.6;">Rating</div>
                    </div>
                </div>

                <!-- Trust Badges -->
                ${(creator.isEmailVerified || creator.isPhoneVerified || creator.isIdVerified) ? `
                    <div style="display: flex; flex-wrap: wrap; gap: 8px;">
                        ${creator.isEmailVerified ? `<span style="background: rgba(16, 185, 129, 0.08); color: #10B981; padding: 6px 12px; border-radius: 10px; font-size: 11px; font-weight: 700; border: 1px solid rgba(16, 185, 129, 0.15);">Email Verified</span>` : ''}
                        ${creator.isPhoneVerified ? `<span style="background: rgba(16, 185, 129, 0.08); color: #10B981; padding: 6px 12px; border-radius: 10px; font-size: 11px; font-weight: 700; border: 1px solid rgba(16, 185, 129, 0.15);">Phone Verified</span>` : ''}
                        ${creator.isIdVerified ? `<span style="background: rgba(16, 185, 129, 0.08); color: #10B981; padding: 6px 12px; border-radius: 10px; font-size: 11px; font-weight: 700; border: 1px solid rgba(16, 185, 129, 0.15);">ID Verified</span>` : ''}
                    </div>
                ` : ''}

                <!-- Portfolio -->
                ${creator.portfolio && creator.portfolio.length > 0 ? `
                    <div style="background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.08); border-radius: 20px; padding: 24px;">
                        <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 20px;">
                            <span style="font-size: 11px; font-weight: 800; color: var(--text-secondary); text-transform: uppercase; letter-spacing: 0.1em; opacity: 0.6;">Portfolio Showcase</span>
                            <span style="font-size: 11px; font-weight: 700; color: var(--text-secondary); opacity: 0.4;">${creator.portfolio.length} ITEMS</span>
                        </div>
                        <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px;">
                            ${creator.portfolio.slice(0, 6).map((img, i) => `
                                <div class="portfolio-item" data-creator-id="${creator.id}" data-image-index="${i}" style="aspect-ratio: 1; border-radius: 12px; overflow: hidden; cursor: pointer;">
                                    <img src="${img}" style="width: 100%; height: 100%; object-fit: cover; transition: transform 0.3s;" onmouseover="this.style.transform='scale(1.05)'" onmouseout="this.style.transform='scale(1)'">
                                </div>
                            `).join('')}
                        </div>
                    </div>
                ` : ''}

                <!-- Services -->
                ${creator.services && creator.services.length > 0 ? `
                    <div style="background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.08); border-radius: 20px; padding: 24px;">
                        <span style="font-size: 11px; font-weight: 800; color: var(--text-secondary); text-transform: uppercase; letter-spacing: 0.1em; opacity: 0.6; display: block; margin-bottom: 20px;">Professional Services</span>
                        <div style="display: flex; flex-direction: column; gap: 16px;">
                            ${creator.services.map((service, index) => `
                                <div style="display: flex; gap: 16px; padding: 16px; background: rgba(255,255,255,0.02); border: 1px solid rgba(255,255,255,0.06); border-radius: 16px;">
                                    <div style="width: 70px; height: 70px; min-width: 70px; border-radius: 12px; overflow: hidden;">
                                        <img src="${service.images?.[0] || 'https://via.placeholder.com/70'}" style="width: 100%; height: 100%; object-fit: cover;">
                                    </div>
                                    <div style="flex: 1;">
                                        <div style="font-size: 15px; font-weight: 700; color: var(--text-primary); margin-bottom: 4px;">${service.title}</div>
                                        <p style="font-size: 12px; color: var(--text-secondary); line-height: 1.5; margin: 0; opacity: 0.7; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden;">${service.description}</p>
                                    </div>
                                    <div style="display: flex; align-items: center;">
                                        <button class="service-book-btn" data-creator-id="${creator.id}" data-service-index="${index}" style="background: var(--primary); color: white; border: none; padding: 6px 14px; border-radius: 8px; font-size: 12px; font-weight: 700; cursor: pointer;">Select</button>
                                    </div>
                                </div>
                            `).join('')}
                        </div>
                    </div>
                ` : ''}

                <!-- Share Action -->
                <button class="profile-share-btn" data-creator-id="${creator.id}" data-creator-name="${creator.name}" style="display: flex; align-items: center; justify-content: center; gap: 10px; width: 100%; height: 52px; border-radius: 16px; background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.1); color: var(--text-primary); cursor: pointer; transition: all 0.2s;">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" style="opacity: 0.6;"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/></svg>
                    <span style="font-weight: 700; font-size: 14px;">Share Profile</span>
                </button>
            </div>
        </div>
        <style>
            @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
        </style>
    `;

    updateBackButton();

    setupProfileButtonListeners(creator);
}

function setupProfileButtonListeners(creator) {
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

    document.querySelectorAll('.portfolio-item').forEach(item => {
        item.addEventListener('click', () => {
            const creatorId = item.dataset.creatorId;
            const imageIndex = parseInt(item.dataset.imageIndex);
            window.openLightbox(creatorId, imageIndex);
        });
    });

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

    // Profile share button
    const shareBtn = document.querySelector('.profile-share-btn');
    if (shareBtn) {
        shareBtn.addEventListener('click', async () => {
            const creatorId = shareBtn.dataset.creatorId;
            const creatorName = shareBtn.dataset.creatorName;
            const profileUrl = `${window.location.origin}${window.location.pathname}#/creator/${creatorId}`;

            try {
                // Try native share API first (mobile)
                if (navigator.share) {
                    await navigator.share({
                        title: `${creatorName} - MyArteLab`,
                        text: `Check out ${creatorName}'s profile on MyArteLab`,
                        url: profileUrl
                    });
                    window.showToast('Profile shared successfully!', 'success');
                } else {
                    // Fallback to clipboard
                    await navigator.clipboard.writeText(profileUrl);
                    window.showToast('Profile link copied to clipboard!', 'success');

                    // Visual feedback
                    shareBtn.classList.add('copied');
                    setTimeout(() => shareBtn.classList.remove('copied'), 2000);
                }
            } catch (error) {
                if (error.name === 'NotAllowedError' || error.name === 'TypeError') {
                    const userCopied = prompt('Copy this profile link:', profileUrl);
                    if (userCopied !== null) {
                        window.showToast('Link ready to share!', 'info');
                    }
                } else {
                    console.error('Error sharing profile:', error);
                    window.showToast('Unable to share profile', 'error');
                }
            }
        });
    }
}

// Favorite functionality removed in favor of share feature
// Focusing on core marketplace functionality over social features

export function setupCreatorCardListeners() {
    // Share button only on profile pages, not on cards

    document.querySelectorAll('.view-profile-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const creatorId = btn.dataset.creatorId;
            const creator = appState.creators.find(c => c.id === creatorId);
            if (creator) {
                if (appState.currentPage !== 'creator-profile') {
                    addToHistory(appState.currentPage);
                }
                renderCreatorProfile(creator);
            }
        });
    });

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

    document.querySelectorAll('.creator-card').forEach(card => {
        card.addEventListener('click', (e) => {
            if (!e.target.closest('button')) {
                const creatorId = card.dataset.creatorId;
                const creator = appState.creators.find(c => c.id === creatorId);
                if (creator) {
                    if (appState.currentPage !== 'creator-profile') {
                        addToHistory(appState.currentPage);
                    }
                    renderCreatorProfile(creator);
                }
            }
        });
    });
}

window.renderCreatorProfile = renderCreatorProfile;

export function renderCategories(categoryCounts = {}) {
    const categoryMap = {
        photographer: { name: 'Photographers', icon: '<svg width="32" height="32" viewBox="0 0 24 24" fill="none"><rect x="2" y="4" width="20" height="16" rx="2" stroke="currentColor" stroke-width="2"/><circle cx="12" cy="12" r="3" stroke="currentColor" stroke-width="2"/><path d="M7 4V2" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>' },
        designer: { name: 'Designers', icon: '<svg width="32" height="32" viewBox="0 0 24 24" fill="none"><path d="M12 2l3 7h7l-5.5 4 2 7-6.5-5-6.5 5 2-7L2 9h7l3-7z" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/></svg>' },
        videographer: { name: 'Videographers', icon: '<svg width="32" height="32" viewBox="0 0 24 24" fill="none"><rect x="2" y="6" width="14" height="12" rx="2" stroke="currentColor" stroke-width="2"/><path d="M16 10l6-4v12l-6-4" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/></svg>' },
        illustrator: { name: 'Illustrators', icon: '<svg width="32" height="32" viewBox="0 0 24 24" fill="none"><path d="M12 19l7-7 3 3-7 7-3-3z" stroke="currentColor" stroke-width="2"/><path d="M18 13l-1.5-7.5L2 2l3.5 14.5L13 18l5-5z" stroke="currentColor" stroke-width="2"/><path d="M2 2l7.586 7.586" stroke="currentColor" stroke-width="2"/><circle cx="11" cy="11" r="2" stroke="currentColor" stroke-width="2"/></svg>' },
        other: { name: 'Other', icon: '<svg width="32" height="32" viewBox="0 0 24 24" fill="none"><path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16V8z" stroke="currentColor" stroke-width="2"/></svg>' }
    };

    const categories = [];

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

    if (categories.length === 0) {
        categories.push(
            { name: 'Photographers', icon: categoryMap.photographer.icon, count: 0 },
            { name: 'Designers', icon: categoryMap.designer.icon, count: 0 },
            { name: 'Videographers', icon: categoryMap.videographer.icon, count: 0 }
        );
    }

    return categories.map(category => {
        const categoryKey = Object.keys(categoryMap).find(key => categoryMap[key].name === category.name);
        const isClickable = category.count > 0;

        return `
        <div class="category-card ${isClickable ? 'category-card-clickable' : ''}" ${isClickable ? `onclick="window.filterByCategory('${categoryKey}')" style="cursor: pointer;"` : ''}>
            <div class="category-icon">${category.icon}</div>
            <div class="category-name">${category.name}</div>
            <div class="category-count">${category.count > 0 ? `${category.count.toLocaleString()} creator${category.count !== 1 ? 's' : ''}` : 'No creators yet'}</div>
        </div>
        `;
    }).join('');
}

window.filterByCategory = function (category) {
    localStorage.setItem('discoverFilter', category);
    window.navigateToPage('home');
};
