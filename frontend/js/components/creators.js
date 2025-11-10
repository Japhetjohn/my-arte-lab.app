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
                    price: apiCreator.hourlyRate ? `From $${apiCreator.hourlyRate}/hr` : 'Contact for pricing',
                    bio: apiCreator.bio || 'No bio yet',
                    cover: apiCreator.coverImage,
                    portfolio: apiCreator.portfolio || [],
                    services: apiCreator.services || [],
                    responseTime: apiCreator.responseTime || 'Within a day',
                    completedJobs: apiCreator.completedJobs || 0
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
                        <h1>${creator.name}</h1>
                        ${creator.verified ? '<span class="verified-badge">✓ Verified</span>' : ''}
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
                    <button class="btn-ghost">Save</button>
                </div>

                <div class="mt-lg">
                    <h3 class="mb-sm">About</h3>
                    <p>${creator.bio || 'No bio available'}</p>
                    <div class="mt-md" style="display: flex; gap: 24px; flex-wrap: wrap;">
                        <div>
                            <div class="small-text">Response time</div>
                            <div style="font-weight: 600;">${creator.responseTime || 'N/A'}</div>
                        </div>
                        <div>
                            <div class="small-text">Completed jobs</div>
                            <div style="font-weight: 600;">${creator.completedJobs || 0}</div>
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
                <h2 class="mb-md">Services & Pricing</h2>
                ${creator.services && creator.services.length > 0 ? `
                    <div class="services-list">
                        ${creator.services.map((service, index) => `
                            <div class="service-card">
                                <div class="service-header">
                                    <div>
                                        <div class="service-title">${service.title}</div>
                                        <div class="service-duration">${service.duration || 'Contact for details'}</div>
                                    </div>
                                    <div class="service-price">${service.price || 'Contact for pricing'}</div>
                                </div>
                                <ul class="service-deliverables">
                                    ${service.deliverables ? service.deliverables.map(item => `<li>${item}</li>`).join('') : ''}
                                </ul>
                                <button class="btn-primary service-book-btn" data-creator-id="${creator.id}" data-service-index="${index}">Book this service</button>
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
                        <p class="text-secondary">This creator hasn't set up their services and pricing yet.</p>
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
