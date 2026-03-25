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
    if (!creatorIdOrObject) {
        return;
    }

    // Extract creator ID from string or object
    const creatorId = typeof creatorIdOrObject === 'string' ? creatorIdOrObject : creatorIdOrObject.id;

    // Use History API to update URL
    if (creatorId && appState.currentPage !== 'creator-profile') {
        addToHistory(appState.currentPage);
        history.pushState({ page: 'creator', creatorId }, '', `/creator/${creatorId}`);
    }

    setCurrentPage('creator-profile');
    const mainContent = document.getElementById('mainContent');

    let creator = typeof creatorIdOrObject === 'object' ? creatorIdOrObject : null;

    if (creatorId) {
        try {
            window.showLoadingSpinner();

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
                window.hideLoadingSpinner();
            } else {
                throw new Error('Failed to load creator profile');
            }
        } catch (error) {
            window.hideLoadingSpinner();
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
    
    // Filter portfolio items with valid images
    const portfolioItems = (creator.portfolio || []).filter(item => {
        const src = (typeof item === 'string') ? item : item?.image;
        return src && src.trim();
    });

    mainContent.innerHTML = `
        <style>
            .creator-profile-container {
                max-width: 900px;
                margin: 0 auto;
                padding: 24px 16px 48px;
                animation: profileFadeIn 0.4s ease-out;
            }
            
            @keyframes profileFadeIn {
                from { opacity: 0; transform: translateY(20px); }
                to { opacity: 1; transform: translateY(0); }
            }
            
            /* Header Section */
            .profile-header-card {
                background: linear-gradient(135deg, #7C3AED 0%, #6D28D9 50%, #5B21B6 100%);
                border-radius: 24px;
                padding: 32px;
                position: relative;
                overflow: hidden;
                margin-bottom: 24px;
                box-shadow: 0 20px 40px rgba(124, 58, 237, 0.3);
            }
            
            .profile-header-card::before {
                content: '';
                position: absolute;
                top: -50%;
                right: -20%;
                width: 400px;
                height: 400px;
                background: radial-gradient(circle, rgba(255,255,255,0.1) 0%, transparent 70%);
                pointer-events: none;
            }
            
            .profile-header-content {
                display: flex;
                gap: 24px;
                align-items: center;
                position: relative;
                z-index: 1;
            }
            
            .profile-avatar-container {
                position: relative;
                flex-shrink: 0;
                align-self: center;
                margin: 16px 0;
            }
            
            .profile-avatar-img {
                width: 120px;
                height: 120px;
                border-radius: 50%;
                object-fit: cover;
                border: 4px solid rgba(255,255,255,0.3);
                box-shadow: 0 8px 24px rgba(0,0,0,0.2);
            }
            
            .profile-verified-icon {
                position: absolute;
                bottom: 4px;
                right: 4px;
                width: 32px;
                height: 32px;
                background: #10B981;
                border-radius: 50%;
                display: flex;
                align-items: center;
                justify-content: center;
                border: 3px solid #7C3AED;
                color: white;
            }
            
            .profile-header-info {
                flex: 1;
                color: white;
            }
            
            .profile-name {
                font-size: 28px;
                font-weight: 800;
                margin: 0 0 8px 0;
                text-shadow: 0 2px 4px rgba(0,0,0,0.1);
            }
            
            .profile-role-location {
                font-size: 15px;
                opacity: 0.9;
                display: flex;
                align-items: center;
                gap: 8px;
                flex-wrap: wrap;
            }
            
            .profile-dot-separator {
                width: 4px;
                height: 4px;
                background: rgba(255,255,255,0.6);
                border-radius: 50%;
            }
            
            .profile-price-badge {
                background: rgba(255,255,255,0.2);
                padding: 6px 14px;
                border-radius: 20px;
                font-size: 13px;
                font-weight: 600;
                backdrop-filter: blur(10px);
            }
            
            /* Stats Bar */
            .profile-stats-bar {
                display: flex;
                background: white;
                border-radius: 16px;
                padding: 20px 24px;
                margin-bottom: 24px;
                box-shadow: 0 4px 20px rgba(0,0,0,0.08);
                gap: 32px;
            }
            
            .profile-stat {
                display: flex;
                flex-direction: column;
                gap: 4px;
            }
            
            .profile-stat-value {
                font-size: 24px;
                font-weight: 800;
                color: #1E293B;
            }
            
            .profile-stat-label {
                font-size: 12px;
                font-weight: 600;
                color: #64748B;
                text-transform: uppercase;
                letter-spacing: 0.5px;
            }
            
            .profile-stat-rating {
                display: flex;
                align-items: center;
                gap: 6px;
            }
            
            .profile-stars {
                color: #FBBF24;
                font-size: 16px;
            }
            
            /* Trust Badges */
            .profile-trust-badges {
                display: flex;
                gap: 10px;
                flex-wrap: wrap;
                margin-bottom: 24px;
            }
            
            .trust-badge {
                display: flex;
                align-items: center;
                gap: 6px;
                background: #F0FDF4;
                color: #15803D;
                padding: 8px 14px;
                border-radius: 10px;
                font-size: 12px;
                font-weight: 600;
                border: 1px solid #BBF7D0;
            }
            
            /* Content Cards */
            .profile-section {
                background: white;
                border-radius: 20px;
                padding: 28px;
                margin-bottom: 20px;
                box-shadow: 0 2px 12px rgba(0,0,0,0.06);
                border: 1px solid #F1F5F9;
            }
            
            .profile-section-header {
                display: flex;
                align-items: center;
                justify-content: space-between;
                margin-bottom: 20px;
            }
            
            .profile-section-title {
                font-size: 13px;
                font-weight: 800;
                color: #94A3B8;
                text-transform: uppercase;
                letter-spacing: 1px;
            }
            
            .profile-section-count {
                font-size: 12px;
                font-weight: 600;
                color: #CBD5E1;
            }
            
            .profile-about-text {
                font-size: 15px;
                line-height: 1.7;
                color: #475569;
                margin: 0;
            }
            
            /* Services */
            .profile-services-list {
                display: flex;
                flex-direction: column;
                gap: 16px;
            }
            
            .profile-service-item {
                display: flex;
                align-items: flex-start;
                gap: 16px;
                padding: 20px;
                background: #F8FAFC;
                border-radius: 16px;
                border: 1px solid #E2E8F0;
                transition: all 0.2s ease;
            }
            
            .profile-service-item:hover {
                border-color: #7C3AED;
                box-shadow: 0 4px 12px rgba(124, 58, 237, 0.1);
            }
            
            .profile-service-icon {
                width: 48px;
                height: 48px;
                background: linear-gradient(135deg, #7C3AED 0%, #6D28D9 100%);
                border-radius: 12px;
                display: flex;
                align-items: center;
                justify-content: center;
                color: white;
                flex-shrink: 0;
            }
            
            .profile-service-content {
                flex: 1;
            }
            
            .profile-service-header {
                display: flex;
                justify-content: space-between;
                align-items: flex-start;
                margin-bottom: 6px;
            }
            
            .profile-service-title {
                font-size: 16px;
                font-weight: 700;
                color: #1E293B;
                margin: 0;
            }
            
            .profile-service-price {
                font-size: 15px;
                font-weight: 800;
                color: #7C3AED;
                white-space: nowrap;
            }
            
            .profile-service-desc {
                font-size: 14px;
                color: #64748B;
                line-height: 1.5;
                margin: 0 0 12px 0;
            }
            
            .profile-service-images {
                display: grid;
                grid-template-columns: repeat(auto-fill, minmax(80px, 1fr));
                gap: 8px;
            }
            
            .profile-service-img {
                aspect-ratio: 1;
                border-radius: 10px;
                overflow: hidden;
                cursor: pointer;
                background: #E2E8F0;
            }
            
            .profile-service-img img {
                width: 100%;
                height: 100%;
                object-fit: cover;
                transition: transform 0.3s;
            }
            
            .profile-service-img:hover img {
                transform: scale(1.05);
            }
            
            .profile-service-select-btn {
                background: #7C3AED;
                color: white;
                border: none;
                padding: 10px 20px;
                border-radius: 10px;
                font-size: 13px;
                font-weight: 700;
                cursor: pointer;
                transition: all 0.2s;
                white-space: nowrap;
            }
            
            .profile-service-select-btn:hover {
                background: #6D28D9;
                transform: translateY(-1px);
            }
            
            /* Portfolio Grid */
            .profile-portfolio-grid {
                display: grid;
                grid-template-columns: repeat(3, 1fr);
                gap: 12px;
            }
            
            .profile-portfolio-item {
                aspect-ratio: 1;
                border-radius: 16px;
                overflow: hidden;
                cursor: pointer;
                background: #F1F5F9;
                position: relative;
            }
            
            .profile-portfolio-item img {
                width: 100%;
                height: 100%;
                object-fit: cover;
                transition: transform 0.4s ease;
            }
            
            .profile-portfolio-item:hover img {
                transform: scale(1.08);
            }
            
            .profile-portfolio-overlay {
                position: absolute;
                inset: 0;
                background: linear-gradient(to top, rgba(0,0,0,0.6) 0%, transparent 60%);
                opacity: 0;
                transition: opacity 0.3s;
                display: flex;
                align-items: flex-end;
                padding: 16px;
            }
            
            .profile-portfolio-item:hover .profile-portfolio-overlay {
                opacity: 1;
            }
            
            .profile-portfolio-title {
                color: white;
                font-size: 13px;
                font-weight: 600;
                margin: 0;
            }
            
            /* Action Buttons */
            .profile-actions {
                display: flex;
                gap: 12px;
                margin-top: 24px;
            }
            
            .profile-btn-primary {
                flex: 1;
                background: linear-gradient(135deg, #7C3AED 0%, #6D28D9 100%);
                color: white;
                border: none;
                padding: 16px 28px;
                border-radius: 14px;
                font-size: 15px;
                font-weight: 700;
                cursor: pointer;
                transition: all 0.2s;
                box-shadow: 0 4px 16px rgba(124, 58, 237, 0.35);
            }
            
            .profile-btn-primary:hover {
                transform: translateY(-2px);
                box-shadow: 0 8px 24px rgba(124, 58, 237, 0.45);
            }
            
            .profile-btn-secondary {
                display: flex;
                align-items: center;
                justify-content: center;
                gap: 8px;
                background: white;
                color: #475569;
                border: 1px solid #E2E8F0;
                padding: 16px 24px;
                border-radius: 14px;
                font-size: 14px;
                font-weight: 600;
                cursor: pointer;
                transition: all 0.2s;
            }
            
            .profile-btn-secondary:hover {
                background: #F8FAFC;
                border-color: #CBD5E1;
            }
            
            /* Mobile Responsive */
            @media (max-width: 640px) {
                .creator-profile-container {
                    padding: 16px 12px 32px;
                }
                
                .profile-header-card {
                    padding: 24px 20px;
                    border-radius: 20px;
                }
                
                .profile-header-content {
                    flex-direction: column;
                    align-items: center;
                    text-align: center;
                }
                
                .profile-avatar-container {
                    margin: 12px 0;
                }
                
                .profile-avatar-img {
                    width: 100px;
                    height: 100px;
                }
                
                .profile-name {
                    font-size: 24px;
                }
                
                .profile-role-location {
                    justify-content: center;
                }
                
                .profile-stats-bar {
                    justify-content: space-around;
                    gap: 16px;
                    padding: 16px;
                }
                
                .profile-stat-value {
                    font-size: 20px;
                }
                
                .profile-section {
                    padding: 20px;
                    border-radius: 16px;
                }
                
                .profile-service-item {
                    flex-direction: column;
                }
                
                .profile-service-select-btn {
                    width: 100%;
                }
                
                .profile-portfolio-grid {
                    grid-template-columns: repeat(2, 1fr);
                    gap: 8px;
                }
                
                .profile-actions {
                    flex-direction: column;
                }
            }
        </style>
        
        <div class="creator-profile-container">
            <!-- Header Card -->
            <div class="profile-header-card">
                <div class="profile-header-content">
                    <div class="profile-avatar-container">
                        <img src="${avatarUrl}" alt="${creator.name}" class="profile-avatar-img">
                        ${creator.verified ? `
                            <div class="profile-verified-icon">
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3">
                                    <polyline points="20 6 9 17 4 12"></polyline>
                                </svg>
                            </div>
                        ` : ''}
                    </div>
                    <div class="profile-header-info">
                        <h1 class="profile-name">${creator.name}</h1>
                        <div class="profile-role-location">
                            <span>${creator.role}</span>
                            <span class="profile-dot-separator"></span>
                            <span>${creator.location}</span>
                            <span class="profile-price-badge">${creator.price}</span>
                        </div>
                    </div>
                </div>
            </div>
            
            <!-- Stats Bar -->
            <div class="profile-stats-bar">
                <div class="profile-stat">
                    <div class="profile-stat-rating">
                        <span class="profile-stat-value">${creator.rating}</span>
                        <span class="profile-stars">${renderStars(creator.rating)}</span>
                    </div>
                    <span class="profile-stat-label">Rating</span>
                </div>
                <div class="profile-stat">
                    <span class="profile-stat-value">${creator.reviewCount}</span>
                    <span class="profile-stat-label">Reviews</span>
                </div>
                <div class="profile-stat">
                    <span class="profile-stat-value">${creator.completedJobs}</span>
                    <span class="profile-stat-label">Jobs Done</span>
                </div>

            </div>
            
            <!-- Trust Badges -->
            ${(creator.isEmailVerified || creator.isPhoneVerified || creator.isIdVerified) ? `
                <div class="profile-trust-badges">
                    ${creator.isEmailVerified ? `
                        <div class="trust-badge">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                                <polyline points="20 6 9 17 4 12"></polyline>
                            </svg>
                            Email Verified
                        </div>
                    ` : ''}
                    ${creator.isPhoneVerified ? `
                        <div class="trust-badge">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                                <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z"/>
                            </svg>
                            Phone Verified
                        </div>
                    ` : ''}
                    ${creator.isIdVerified ? `
                        <div class="trust-badge">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                                <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
                                <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                            </svg>
                            ID Verified
                        </div>
                    ` : ''}
                </div>
            ` : ''}
            
            <!-- About Section -->
            <div class="profile-section">
                <div class="profile-section-header">
                    <h2 class="profile-section-title">About</h2>
                </div>
                <p class="profile-about-text">${creator.bio || 'No bio available.'}</p>
            </div>
            
            <!-- Services Section -->
            ${creator.services && creator.services.length > 0 ? `
                <div class="profile-section">
                    <div class="profile-section-header">
                        <h2 class="profile-section-title">Services</h2>
                        <span class="profile-section-count">${creator.services.length} service${creator.services.length !== 1 ? 's' : ''}</span>
                    </div>
                    <div class="profile-services-list">
                        ${creator.services.map((service, index) => `
                            <div class="profile-service-item">
                                <div class="profile-service-icon">
                                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                        <path d="M12 2L2 7l10 5 10-5-10-5z"/>
                                        <path d="M2 17l10 5 10-5"/>
                                        <path d="M2 12l10 5 10-5"/>
                                    </svg>
                                </div>
                                <div class="profile-service-content">
                                    <div class="profile-service-header">
                                        <h3 class="profile-service-title">${service.title}</h3>
                                        ${service.suggestedPrice ? `<span class="profile-service-price">$${service.suggestedPrice}</span>` : ''}
                                    </div>
                                    <p class="profile-service-desc">${service.description || ''}</p>
                                    ${service.images && service.images.length > 0 ? `
                                        <div class="profile-service-images">
                                            ${service.images.slice(0, 4).map(img => `
                                                <div class="profile-service-img" onclick="window.openImageModal('${img}')">
                                                    <img src="${img}" alt="${service.title}">
                                                </div>
                                            `).join('')}
                                        </div>
                                    ` : ''}
                                </div>
                                <button class="profile-service-select-btn" data-creator-id="${creator.id}" data-service-index="${index}">
                                    Select
                                </button>
                            </div>
                        `).join('')}
                    </div>
                </div>
            ` : ''}
            
            <!-- Portfolio Section -->
            ${portfolioItems.length > 0 ? `
                <div class="profile-section">
                    <div class="profile-section-header">
                        <h2 class="profile-section-title">Portfolio</h2>
                        <span class="profile-section-count">${portfolioItems.length} item${portfolioItems.length !== 1 ? 's' : ''}</span>
                    </div>
                    <div class="profile-portfolio-grid">
                        ${portfolioItems.slice(0, 6).map((item, i) => {
                            const src = (typeof item === 'string') ? item : item.image;
                            const title = (typeof item === 'object' && item.title) ? item.title : '';
                            return `
                                <div class="profile-portfolio-item" data-creator-id="${creator.id}" data-image-index="${i}">
                                    <img src="${src}" alt="${title || 'Portfolio item'}" loading="lazy">
                                    ${title ? `
                                        <div class="profile-portfolio-overlay">
                                            <p class="profile-portfolio-title">${title}</p>
                                        </div>
                                    ` : ''}
                                </div>
                            `;
                        }).join('')}
                    </div>
                </div>
            ` : ''}
            
            <!-- Action Buttons -->
            <div class="profile-actions">
                <button class="profile-btn-primary" data-creator-id="${creator.id}">
                    Book Now
                </button>
                <button class="profile-btn-secondary profile-share-btn" data-creator-id="${creator.id}" data-creator-name="${creator.name}">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <circle cx="18" cy="5" r="3"/>
                        <circle cx="6" cy="12" r="3"/>
                        <circle cx="18" cy="19" r="3"/>
                        <line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/>
                        <line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/>
                    </svg>
                    Share Profile
                </button>
            </div>
        </div>
    `;

    updateBackButton();
    setupProfileButtonListeners(creator);
}

function setupProfileButtonListeners(creator) {
    // Book Now button
    const bookBtn = document.querySelector('.profile-btn-primary');
    if (bookBtn) {
        bookBtn.addEventListener('click', () => {
            if (!appState.user) {
                window.showAuthModal('signin');
            } else {
                window.showBookingModal(creator.id);
            }
        });
    }

    // Service select buttons
    document.querySelectorAll('.profile-service-select-btn').forEach(btn => {
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

    // Portfolio items
    document.querySelectorAll('.profile-portfolio-item').forEach(item => {
        item.addEventListener('click', () => {
            const creatorId = item.dataset.creatorId;
            const imageIndex = parseInt(item.dataset.imageIndex);
            window.openLightbox(creatorId, imageIndex);
        });
    });

    // Share button
    const shareBtn = document.querySelector('.profile-share-btn');
    if (shareBtn) {
        shareBtn.addEventListener('click', async () => {
            const creatorId = shareBtn.dataset.creatorId;
            const creatorName = shareBtn.dataset.creatorName;
            const profileUrl = `${window.location.origin}/creator/${creatorId}`;

            try {
                if (navigator.share) {
                    await navigator.share({
                        title: `${creatorName} - MyArteLab`,
                        text: `Check out ${creatorName}'s profile on MyArteLab`,
                        url: profileUrl
                    });
                    window.showToast('Profile shared successfully!', 'success');
                } else {
                    await navigator.clipboard.writeText(profileUrl);
                    window.showToast('Profile link copied!', 'success');
                }
            } catch (error) {
                if (error.name !== 'AbortError') {
                    console.error('Error sharing:', error);
                }
            }
        });
    }
}

export function setupCreatorCardListeners() {
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
