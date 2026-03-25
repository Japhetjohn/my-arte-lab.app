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

function renderProfileSkeleton() {
    return `
        <style>
            .pf-skeleton-container { max-width: 680px; margin: 0 auto; padding: 32px 20px 60px; }
            .pf-skeleton-section { background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.08); border-radius: 24px; padding: 24px; margin-bottom: 20px; }
            .pf-skeleton-header { display: flex; align-items: center; gap: 20px; margin-bottom: 20px; }
            .pf-skeleton-avatar { width: 72px; height: 72px; border-radius: 20px; }
            .pf-skeleton-lines { flex: 1; }
            .pf-skeleton-line { height: 16px; margin-bottom: 12px; border-radius: 8px; }
            .pf-skeleton-line.title { width: 60%; height: 22px; }
            .pf-skeleton-line.subtitle { width: 40%; }
            .pf-skeleton-stats { display: flex; gap: 32px; padding-top: 20px; border-top: 1px solid rgba(255,255,255,0.06); }
            .pf-skeleton-stat { width: 60px; height: 40px; border-radius: 8px; }
            .pf-skeleton-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; }
            .pf-skeleton-grid-item { aspect-ratio: 1; border-radius: 16px; }
            @media (max-width: 640px) {
                .pf-skeleton-container { padding: 16px; }
                .pf-skeleton-section { padding: 20px; }
                .pf-skeleton-grid { grid-template-columns: repeat(2, 1fr); }
            }
        </style>
        <div class="pf-skeleton-container">
            <div class="pf-skeleton-section">
                <div class="pf-skeleton-header">
                    <div class="skeleton pf-skeleton-avatar"></div>
                    <div class="pf-skeleton-lines">
                        <div class="skeleton pf-skeleton-line title"></div>
                        <div class="skeleton pf-skeleton-line subtitle"></div>
                    </div>
                </div>
                <div class="pf-skeleton-stats">
                    <div class="skeleton pf-skeleton-stat"></div>
                    <div class="skeleton pf-skeleton-stat"></div>
                    <div class="skeleton pf-skeleton-stat"></div>
                </div>
            </div>
            <div class="pf-skeleton-section">
                <div class="skeleton pf-skeleton-line title" style="width: 80px; margin-bottom: 16px;"></div>
                <div class="skeleton pf-skeleton-line" style="width: 100%;"></div>
                <div class="skeleton pf-skeleton-line" style="width: 90%;"></div>
                <div class="skeleton pf-skeleton-line" style="width: 70%;"></div>
            </div>
            <div class="pf-skeleton-section">
                <div class="skeleton pf-skeleton-line title" style="width: 120px; margin-bottom: 16px;"></div>
                <div style="display: flex; flex-direction: column; gap: 12px;">
                    <div class="skeleton" style="height: 80px; border-radius: 16px;"></div>
                    <div class="skeleton" style="height: 80px; border-radius: 16px;"></div>
                </div>
            </div>
            <div class="pf-skeleton-section">
                <div class="skeleton pf-skeleton-line title" style="width: 100px; margin-bottom: 16px;"></div>
                <div class="pf-skeleton-grid">
                    <div class="skeleton pf-skeleton-grid-item"></div>
                    <div class="skeleton pf-skeleton-grid-item"></div>
                    <div class="skeleton pf-skeleton-grid-item"></div>
                </div>
            </div>
        </div>
    `;
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
        // Show skeleton while loading
        mainContent.innerHTML = renderProfileSkeleton();
        
        try {
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
    
    // Filter portfolio items with valid images
    const portfolioItems = (creator.portfolio || []).filter(item => {
        const src = (typeof item === 'string') ? item : item?.image;
        return src && src.trim();
    });

    mainContent.innerHTML = `
        <style>
            .pf-container { 
                max-width: 680px; 
                margin: 0 auto; 
                padding: 32px 20px 60px; 
                display: flex; 
                flex-direction: column; 
                gap: 24px; 
                animation: pfFadeIn 0.4s ease-out;
            }
            
            @keyframes pfFadeIn {
                from { opacity: 0; transform: translateY(20px); }
                to { opacity: 1; transform: translateY(0); }
            }
            
            @media (max-width: 768px) { 
                .pf-container { padding: 24px 16px; } 
            }
            
            .pf-section { 
                background: rgba(255,255,255,0.03); 
                border: 1px solid rgba(255,255,255,0.08); 
                border-radius: 24px; 
                padding: 24px; 
            }
            
            .pf-section-title { 
                font-size: 16px; 
                font-weight: 700; 
                color: var(--text-primary); 
                margin-bottom: 24px; 
                display: flex; 
                align-items: center; 
                gap: 10px; 
            }
            
            /* Profile Header - Settings Style */
            .pf-header {
                display: flex;
                align-items: center;
                gap: 20px;
            }
            
            .pf-avatar {
                width: 72px;
                height: 72px;
                border-radius: 20px;
                object-fit: cover;
                border: 2px solid rgba(255,255,255,0.1);
                background: var(--background-alt);
                flex-shrink: 0;
            }
            
            .pf-header-info {
                flex: 1;
                min-width: 0;
            }
            
            .pf-name {
                font-size: 22px;
                font-weight: 800;
                color: var(--text-primary);
                margin: 0 0 6px 0;
                display: flex;
                align-items: center;
                gap: 8px;
                flex-wrap: wrap;
            }
            
            .pf-verified-badge {
                display: inline-flex;
                align-items: center;
                gap: 4px;
                background: rgba(16, 185, 129, 0.1);
                color: #10B981;
                padding: 4px 10px;
                border-radius: 20px;
                font-size: 11px;
                font-weight: 700;
                border: 1px solid rgba(16, 185, 129, 0.2);
            }
            
            .pf-role-location {
                font-size: 14px;
                color: var(--text-secondary);
                opacity: 0.8;
                margin: 0 0 10px 0;
            }
            
            .pf-price {
                display: inline-block;
                background: rgba(151,71,255,0.1);
                color: var(--primary);
                padding: 6px 14px;
                border-radius: 10px;
                font-size: 13px;
                font-weight: 700;
            }
            
            /* Stats Row */
            .pf-stats {
                display: flex;
                gap: 32px;
                padding-top: 20px;
                border-top: 1px solid rgba(255,255,255,0.06);
                margin-top: 20px;
            }
            
            .pf-stat {
                display: flex;
                flex-direction: column;
                gap: 4px;
            }
            
            .pf-stat-value {
                font-size: 20px;
                font-weight: 800;
                color: var(--text-primary);
                display: flex;
                align-items: center;
                gap: 6px;
            }
            
            .pf-stat-stars {
                color: #FBBF24;
                font-size: 14px;
            }
            
            .pf-stat-label {
                font-size: 11px;
                font-weight: 700;
                color: var(--text-secondary);
                text-transform: uppercase;
                letter-spacing: 0.5px;
                opacity: 0.6;
            }
            
            /* Trust Badges */
            .pf-trust-badges {
                display: flex;
                gap: 10px;
                flex-wrap: wrap;
            }
            
            .pf-trust-badge {
                display: flex;
                align-items: center;
                gap: 6px;
                background: rgba(16, 185, 129, 0.08);
                color: #15803D;
                padding: 8px 14px;
                border-radius: 10px;
                font-size: 12px;
                font-weight: 600;
                border: 1px solid rgba(16, 185, 129, 0.15);
            }
            
            /* About Text */
            .pf-about {
                font-size: 15px;
                line-height: 1.7;
                color: var(--text-secondary);
                margin: 0;
            }
            
            /* Services */
            .pf-services-list {
                display: flex;
                flex-direction: column;
                gap: 16px;
            }
            
            .pf-service-item {
                display: flex;
                align-items: flex-start;
                gap: 16px;
                padding: 20px;
                background: rgba(255,255,255,0.02);
                border: 1px solid rgba(255,255,255,0.06);
                border-radius: 16px;
                transition: all 0.2s ease;
            }
            
            .pf-service-item:hover {
                border-color: rgba(151,71,255,0.3);
            }
            
            .pf-service-icon {
                width: 44px;
                height: 44px;
                background: rgba(151,71,255,0.1);
                border-radius: 12px;
                display: flex;
                align-items: center;
                justify-content: center;
                color: var(--primary);
                flex-shrink: 0;
            }
            
            .pf-service-content {
                flex: 1;
                min-width: 0;
            }
            
            .pf-service-header {
                display: flex;
                justify-content: space-between;
                align-items: flex-start;
                gap: 12px;
                margin-bottom: 6px;
            }
            
            .pf-service-title {
                font-size: 15px;
                font-weight: 700;
                color: var(--text-primary);
                margin: 0;
            }
            
            .pf-service-price {
                font-size: 14px;
                font-weight: 800;
                color: var(--primary);
                white-space: nowrap;
            }
            
            .pf-service-desc {
                font-size: 13px;
                color: var(--text-secondary);
                line-height: 1.5;
                margin: 0 0 12px 0;
                opacity: 0.8;
            }
            
            .pf-service-images {
                display: grid;
                grid-template-columns: repeat(auto-fill, minmax(70px, 1fr));
                gap: 8px;
            }
            
            .pf-service-img {
                aspect-ratio: 1;
                border-radius: 10px;
                overflow: hidden;
                cursor: pointer;
                background: rgba(255,255,255,0.05);
            }
            
            .pf-service-img img {
                width: 100%;
                height: 100%;
                object-fit: cover;
                transition: transform 0.3s;
            }
            
            .pf-service-img:hover img {
                transform: scale(1.05);
            }
            
            .pf-service-btn {
                background: var(--primary);
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
            
            .pf-service-btn:hover {
                opacity: 0.9;
                transform: translateY(-1px);
            }
            
            /* Portfolio Grid */
            .pf-portfolio-grid {
                display: grid;
                grid-template-columns: repeat(3, 1fr);
                gap: 12px;
            }
            
            .pf-portfolio-item {
                aspect-ratio: 1;
                border-radius: 16px;
                overflow: hidden;
                cursor: pointer;
                background: rgba(255,255,255,0.05);
                position: relative;
            }
            
            .pf-portfolio-item img {
                width: 100%;
                height: 100%;
                object-fit: cover;
                transition: transform 0.4s ease;
            }
            
            .pf-portfolio-item:hover img {
                transform: scale(1.08);
            }
            
            .pf-portfolio-overlay {
                position: absolute;
                inset: 0;
                background: linear-gradient(to top, rgba(0,0,0,0.6) 0%, transparent 60%);
                opacity: 0;
                transition: opacity 0.3s;
                display: flex;
                align-items: flex-end;
                padding: 12px;
            }
            
            .pf-portfolio-item:hover .pf-portfolio-overlay {
                opacity: 1;
            }
            
            .pf-portfolio-title {
                color: white;
                font-size: 12px;
                font-weight: 600;
                margin: 0;
            }
            
            /* Action Buttons */
            .pf-actions {
                display: flex;
                gap: 12px;
            }
            
            .pf-btn-primary {
                flex: 1;
                background: var(--primary);
                color: white;
                border: none;
                padding: 16px 28px;
                border-radius: 12px;
                font-size: 15px;
                font-weight: 700;
                cursor: pointer;
                transition: all 0.2s;
            }
            
            .pf-btn-primary:hover {
                opacity: 0.9;
                transform: translateY(-1px);
            }
            
            .pf-btn-secondary {
                display: flex;
                align-items: center;
                justify-content: center;
                gap: 8px;
                background: rgba(255,255,255,0.05);
                color: var(--text-primary);
                border: 1px solid rgba(255,255,255,0.1);
                padding: 16px 24px;
                border-radius: 12px;
                font-size: 14px;
                font-weight: 600;
                cursor: pointer;
                transition: all 0.2s;
            }
            
            .pf-btn-secondary:hover {
                background: rgba(255,255,255,0.08);
            }
            
            /* Service Modal Styles */
            .pf-service-modal-overlay {
                position: fixed;
                inset: 0;
                background: rgba(0,0,0,0.8);
                backdrop-filter: blur(8px);
                z-index: 1000;
                display: flex;
                align-items: center;
                justify-content: center;
                padding: 20px;
                animation: pfModalFadeIn 0.3s ease;
            }
            
            @keyframes pfModalFadeIn {
                from { opacity: 0; }
                to { opacity: 1; }
            }
            
            .pf-service-modal {
                background: var(--background);
                border: 1px solid rgba(255,255,255,0.1);
                border-radius: 24px;
                max-width: 600px;
                width: 100%;
                max-height: 90vh;
                overflow: hidden;
                display: flex;
                flex-direction: column;
                animation: pfModalSlideUp 0.3s ease;
            }
            
            @keyframes pfModalSlideUp {
                from { opacity: 0; transform: translateY(40px); }
                to { opacity: 1; transform: translateY(0); }
            }
            
            .pf-service-modal-header {
                display: flex;
                align-items: center;
                justify-content: space-between;
                padding: 20px 24px;
                border-bottom: 1px solid rgba(255,255,255,0.06);
            }
            
            .pf-service-modal-title {
                font-size: 18px;
                font-weight: 700;
                color: var(--text-primary);
            }
            
            .pf-service-modal-close {
                width: 36px;
                height: 36px;
                border-radius: 10px;
                border: none;
                background: rgba(255,255,255,0.05);
                color: var(--text-secondary);
                cursor: pointer;
                display: flex;
                align-items: center;
                justify-content: center;
                transition: all 0.2s;
            }
            
            .pf-service-modal-close:hover {
                background: rgba(255,255,255,0.1);
                color: var(--text-primary);
            }
            
            .pf-service-modal-body {
                overflow-y: auto;
                padding: 24px;
            }
            
            /* Image Gallery */
            .pf-service-gallery {
                position: relative;
                margin-bottom: 24px;
            }
            
            .pf-service-gallery-main {
                aspect-ratio: 16/10;
                border-radius: 16px;
                overflow: hidden;
                background: rgba(255,255,255,0.05);
                cursor: pointer;
            }
            
            .pf-service-gallery-main img {
                width: 100%;
                height: 100%;
                object-fit: cover;
            }
            
            .pf-service-gallery-thumbs {
                display: flex;
                gap: 10px;
                margin-top: 12px;
                overflow-x: auto;
                padding-bottom: 4px;
            }
            
            .pf-service-gallery-thumb {
                width: 70px;
                height: 70px;
                border-radius: 12px;
                overflow: hidden;
                cursor: pointer;
                border: 2px solid transparent;
                transition: all 0.2s;
                flex-shrink: 0;
            }
            
            .pf-service-gallery-thumb.active {
                border-color: var(--primary);
            }
            
            .pf-service-gallery-thumb:hover {
                border-color: rgba(151,71,255,0.5);
            }
            
            .pf-service-gallery-thumb img {
                width: 100%;
                height: 100%;
                object-fit: cover;
            }
            
            .pf-service-gallery-nav {
                position: absolute;
                top: 50%;
                transform: translateY(-50%);
                width: 40px;
                height: 40px;
                border-radius: 50%;
                background: rgba(0,0,0,0.6);
                border: none;
                color: white;
                cursor: pointer;
                display: flex;
                align-items: center;
                justify-content: center;
                transition: all 0.2s;
                z-index: 10;
            }
            
            .pf-service-gallery-nav:hover {
                background: rgba(0,0,0,0.8);
            }
            
            .pf-service-gallery-nav.prev { left: 12px; }
            .pf-service-gallery-nav.next { right: 12px; }
            
            /* Modal Content */
            .pf-service-modal-price {
                font-size: 24px;
                font-weight: 800;
                color: var(--primary);
                margin-bottom: 16px;
            }
            
            .pf-service-modal-desc {
                font-size: 15px;
                line-height: 1.8;
                color: var(--text-secondary);
                margin-bottom: 24px;
                white-space: pre-wrap;
            }
            
            .pf-service-modal-links {
                display: flex;
                flex-direction: column;
                gap: 10px;
                margin-bottom: 24px;
            }
            
            .pf-service-modal-link {
                display: flex;
                align-items: center;
                gap: 12px;
                padding: 14px 16px;
                background: rgba(255,255,255,0.03);
                border: 1px solid rgba(255,255,255,0.08);
                border-radius: 12px;
                color: var(--text-primary);
                text-decoration: none;
                font-size: 14px;
                font-weight: 500;
                transition: all 0.2s;
            }
            
            .pf-service-modal-link:hover {
                background: rgba(151,71,255,0.08);
                border-color: rgba(151,71,255,0.2);
            }
            
            .pf-service-modal-link svg {
                color: var(--primary);
                flex-shrink: 0;
            }
            
            .pf-service-modal-footer {
                display: flex;
                gap: 12px;
                padding: 20px 24px;
                border-top: 1px solid rgba(255,255,255,0.06);
                background: rgba(255,255,255,0.02);
            }
            
            .pf-service-modal-btn {
                flex: 1;
                padding: 14px 24px;
                border-radius: 12px;
                font-size: 15px;
                font-weight: 700;
                cursor: pointer;
                transition: all 0.2s;
                border: none;
            }
            
            .pf-service-modal-btn.primary {
                background: var(--primary);
                color: white;
            }
            
            .pf-service-modal-btn.primary:hover {
                opacity: 0.9;
            }
            
            .pf-service-modal-btn.secondary {
                background: rgba(255,255,255,0.05);
                color: var(--text-primary);
                border: 1px solid rgba(255,255,255,0.1);
            }
            
            .pf-service-modal-btn.secondary:hover {
                background: rgba(255,255,255,0.08);
            }
            
            /* Image Counter */
            .pf-service-gallery-counter {
                position: absolute;
                bottom: 20px;
                right: 12px;
                background: rgba(0,0,0,0.7);
                color: white;
                padding: 6px 12px;
                border-radius: 20px;
                font-size: 12px;
                font-weight: 600;
            }
            
            /* Make service items clickable */
            .pf-service-item {
                cursor: pointer;
            }
            
            .pf-service-item:hover {
                border-color: rgba(151,71,255,0.3);
            }
            
            .pf-service-btn {
                z-index: 5;
            }
            
            /* Mobile Responsive */
            @media (max-width: 640px) {
                .pf-container {
                    padding: 16px;
                    gap: 16px;
                }
                
                .pf-section {
                    padding: 20px;
                    border-radius: 20px;
                }
                
                .pf-header {
                    flex-direction: column;
                    text-align: center;
                }
                
                .pf-name {
                    justify-content: center;
                    font-size: 20px;
                }
                
                .pf-stats {
                    justify-content: center;
                    gap: 24px;
                }
                
                .pf-stat-value {
                    font-size: 18px;
                }
                
                .pf-service-item {
                    flex-direction: column;
                }
                
                .pf-service-btn {
                    width: 100%;
                }
                
                .pf-portfolio-grid {
                    grid-template-columns: repeat(2, 1fr);
                    gap: 8px;
                }
                
                .pf-actions {
                    flex-direction: column;
                }
                
                .pf-service-modal {
                    max-height: 95vh;
                    border-radius: 20px 20px 0 0;
                }
                
                /* Footer Mobile Styles */
                .home-footer {
                    padding: 32px 16px !important;
                }
                
                .home-footer-content {
                    flex-direction: column;
                    gap: 32px;
                }
                
                .home-footer-brand {
                    max-width: 100%;
                    text-align: center;
                }
                
                .home-footer-tagline {
                    max-width: 100%;
                }
                
                .home-footer-social {
                    justify-content: center;
                }
                
                .home-footer-links {
                    flex-direction: column;
                    gap: 24px;
                }
                
                .home-footer-column {
                    text-align: center;
                }
                
                .home-footer-bottom {
                    flex-direction: column;
                    gap: 12px;
                    text-align: center;
                }
                
                .pf-service-modal-overlay {
                    align-items: flex-end;
                    padding: 0;
                }
                
                .pf-service-gallery-nav {
                    width: 36px;
                    height: 36px;
                }
            }
        </style>
        
        <div class="pf-container">
            <!-- Profile Header Section -->
            <div class="pf-section">
                <div class="pf-header">
                    <img src="${avatarUrl}" alt="${creator.name}" class="pf-avatar">
                    <div class="pf-header-info">
                        <h1 class="pf-name">
                            ${creator.name}
                            ${creator.verified ? `
                                <span class="pf-verified-badge">
                                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3">
                                        <polyline points="20 6 9 17 4 12"></polyline>
                                    </svg>
                                    Verified
                                </span>
                            ` : ''}
                        </h1>
                        <p class="pf-role-location">${creator.role} • ${creator.location}</p>
                        <span class="pf-price">${creator.price}</span>
                    </div>
                </div>
                
                <!-- Stats -->
                <div class="pf-stats">
                    <div class="pf-stat">
                        <div class="pf-stat-value" style="font-size: 18px; letter-spacing: 2px;">
                            ${renderStars(creator.rating)}
                        </div>
                        <span class="pf-stat-label">Rating</span>
                    </div>
                    <div class="pf-stat">
                        <span class="pf-stat-value">${creator.reviewCount}</span>
                        <span class="pf-stat-label">Reviews</span>
                    </div>
                    <div class="pf-stat">
                        <span class="pf-stat-value">${creator.completedJobs}</span>
                        <span class="pf-stat-label">Jobs Done</span>
                    </div>
                </div>
            </div>
            
            <!-- Trust Badges -->
            ${(creator.isEmailVerified || creator.isPhoneVerified || creator.isIdVerified) ? `
                <div class="pf-trust-badges">
                    ${creator.isEmailVerified ? `
                        <div class="pf-trust-badge">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                                <polyline points="20 6 9 17 4 12"></polyline>
                            </svg>
                            Email Verified
                        </div>
                    ` : ''}
                    ${creator.isPhoneVerified ? `
                        <div class="pf-trust-badge">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                                <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z"/>
                            </svg>
                            Phone Verified
                        </div>
                    ` : ''}
                    ${creator.isIdVerified ? `
                        <div class="pf-trust-badge">
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
            <div class="pf-section">
                <h2 class="pf-section-title">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--primary)" stroke-width="2.5">
                        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
                        <circle cx="12" cy="7" r="4"/>
                    </svg>
                    About
                </h2>
                <p class="pf-about">${creator.bio || 'No bio available.'}</p>
            </div>
            
            <!-- Services Section -->
            ${creator.services && creator.services.length > 0 ? `
                <div class="pf-section">
                    <h2 class="pf-section-title">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--primary)" stroke-width="2.5">
                            <path d="M12 2L2 7l10 5 10-5-10-5z"/>
                            <path d="M2 17l10 5 10-5"/>
                            <path d="M2 12l10 5 10-5"/>
                        </svg>
                        Services (${creator.services.length})
                    </h2>
                    <div class="pf-services-list">
                        ${creator.services.map((service, index) => `
                            <div class="pf-service-item" onclick="window.openServiceModal(${index})">
                                <div class="pf-service-icon">
                                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                        <path d="M12 2L2 7l10 5 10-5-10-5z"/>
                                        <path d="M2 17l10 5 10-5"/>
                                        <path d="M2 12l10 5 10-5"/>
                                    </svg>
                                </div>
                                <div class="pf-service-content">
                                    <div class="pf-service-header">
                                        <h3 class="pf-service-title">${service.title}</h3>
                                        ${service.suggestedPrice ? `<span class="pf-service-price">$${service.suggestedPrice}</span>` : ''}
                                    </div>
                                    <p class="pf-service-desc">${service.description ? (service.description.length > 100 ? service.description.substring(0, 100) + '...' : service.description) : ''}</p>
                                    ${service.images && service.images.length > 0 ? `
                                        <div class="pf-service-images">
                                            ${service.images.slice(0, 4).map(img => `
                                                <div class="pf-service-img" onclick="event.stopPropagation(); window.openImageModal('${img}')">
                                                    <img src="${img}" alt="${service.title}">
                                                </div>
                                            `).join('')}
                                            ${service.images.length > 4 ? `<div class="pf-service-img" style="display: flex; align-items: center; justify-content: center; background: rgba(151,71,255,0.1); color: var(--primary); font-size: 12px; font-weight: 700;">+${service.images.length - 4}</div>` : ''}
                                        </div>
                                    ` : ''}
                                </div>
                                <button class="pf-service-btn" data-creator-id="${creator.id}" data-service-index="${index}" onclick="event.stopPropagation();">
                                    View
                                </button>
                            </div>
                        `).join('')}
                    </div>
                </div>
            ` : ''}
            
            <!-- Portfolio Section -->
            ${portfolioItems.length > 0 ? `
                <div class="pf-section">
                    <h2 class="pf-section-title">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--primary)" stroke-width="2.5">
                            <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
                            <circle cx="8.5" cy="8.5" r="1.5"/>
                            <path d="M21 15l-5-5L5 21"/>
                        </svg>
                        Portfolio (${portfolioItems.length} items)
                    </h2>
                    <div class="pf-portfolio-grid">
                        ${portfolioItems.slice(0, 6).map((item, i) => {
                            const src = (typeof item === 'string') ? item : item.image;
                            const title = (typeof item === 'object' && item.title) ? item.title : '';
                            return `
                                <div class="pf-portfolio-item" data-creator-id="${creator.id}" data-image-index="${i}">
                                    <img src="${src}" alt="${title || 'Portfolio item'}" loading="lazy">
                                    ${title ? `
                                        <div class="pf-portfolio-overlay">
                                            <p class="pf-portfolio-title">${title}</p>
                                        </div>
                                    ` : ''}
                                </div>
                            `;
                        }).join('')}
                    </div>
                </div>
            ` : ''}
            
            <!-- Action Buttons -->
            <div class="pf-actions">
                <button class="pf-btn-primary" data-creator-id="${creator.id}">
                    Book Now
                </button>
                <button class="pf-btn-secondary profile-share-btn" data-creator-id="${creator.id}" data-creator-name="${creator.name}">
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
            
            <!-- Footer -->
            <footer class="home-footer" style="margin-top: 40px; padding: 40px 0;">
                <div style="max-width: 900px; margin: 0 auto; padding: 0 20px; box-sizing: border-box;">
                    <div class="home-footer-content">
                        <div class="home-footer-brand">
                            <div class="home-footer-logo">
                                <span style="font-size: 24px; font-weight: 800; background: linear-gradient(135deg, var(--primary), var(--secondary)); -webkit-background-clip: text; -webkit-text-fill-color: transparent;">MyArteLab</span>
                            </div>
                            <p class="home-footer-tagline">Empowering African creators to showcase their talent and connect with clients worldwide.</p>
                            <div class="home-footer-social">
                                <a href="https://x.com/myartelab" target="_blank" rel="noopener" class="home-footer-social-link" aria-label="X (Twitter)">
                                    <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                                        <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
                                    </svg>
                                </a>
                                <a href="https://www.instagram.com/myartelab_" target="_blank" rel="noopener" class="home-footer-social-link" aria-label="Instagram">
                                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                        <rect x="2" y="2" width="20" height="20" rx="5" ry="5"/>
                                        <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/>
                                        <line x1="17.5" y1="6.5" x2="17.51" y2="6.5"/>
                                    </svg>
                                </a>
                                <a href="https://linkedin.com/company/myartelab" target="_blank" rel="noopener" class="home-footer-social-link" aria-label="LinkedIn">
                                    <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                                        <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
                                    </svg>
                                </a>
                                <a href="https://web.facebook.com/MyartelabApp" target="_blank" rel="noopener" class="home-footer-social-link" aria-label="Facebook">
                                    <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                                        <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                                    </svg>
                                </a>
                                <a href="https://www.tiktok.com/@myartelab" target="_blank" rel="noopener" class="home-footer-social-link" aria-label="TikTok">
                                    <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                                        <path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.15 1.07-.14 1.61.24 1.64 1.82 3.02 3.5 2.87 1.12-.01 2.19-.66 2.77-1.61.19-.33.4-.67.41-1.06.1-1.79.06-3.57.07-5.36.01-4.03-.01-8.05.02-12.07z"/>
                                    </svg>
                                </a>
                            </div>
                        </div>
                        <div class="home-footer-links">
                            <div class="home-footer-column">
                                <h4 class="home-footer-title">Platform</h4>
                                <a href="/#/creators" class="home-footer-link">Find Creators</a>
                                <a href="/#/auth?type=creator" class="home-footer-link">Become a Creator</a>
                                <a href="/#/how-it-works" class="home-footer-link">How it Works</a>
                                <a href="/#/pricing" class="home-footer-link">Pricing</a>
                            </div>
                            <div class="home-footer-column">
                                <h4 class="home-footer-title">Company</h4>
                                <a href="/#/about" class="home-footer-link">About Us</a>
                                <a href="/#/careers" class="home-footer-link">Careers</a>
                                <a href="/#/blog" class="home-footer-link">Blog</a>
                                <a href="/#/press" class="home-footer-link">Press</a>
                            </div>
                            <div class="home-footer-column">
                                <h4 class="home-footer-title">Support</h4>
                                <a href="/#/help" class="home-footer-link">Help Center</a>
                                <a href="/#/contact" class="home-footer-link">Contact Us</a>
                                <a href="/#/safety" class="home-footer-link">Safety</a>
                                <a href="mailto:support@myartelab.com" class="home-footer-link">support@myartelab.com</a>
                            </div>
                        </div>
                    </div>
                    <div class="home-footer-bottom">
                        <p class="home-footer-copyright">© 2026 MyArteLab. All rights reserved.</p>
                        <div class="home-footer-legal">
                            <a href="/#/privacy">Privacy Policy</a>
                            <span class="home-footer-dot">•</span>
                            <a href="/#/terms">Terms of Service</a>
                        </div>
                    </div>
                </div>
            </footer>
        </div>
    `;

    updateBackButton();
    setupProfileButtonListeners(creator);
}

function setupProfileButtonListeners(creator) {
    // Store services for modal access
    window._currentProfileServices = creator.services || [];
    window._currentCreatorId = creator.id;

    // Book Now button
    const bookBtn = document.querySelector('.pf-btn-primary');
    if (bookBtn) {
        bookBtn.addEventListener('click', () => {
            if (!appState.user) {
                window.showAuthModal('signin');
            } else {
                window.showBookingModal(creator.id);
            }
        });
    }

    // Service select buttons (now opens modal)
    document.querySelectorAll('.pf-service-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const serviceIndex = parseInt(btn.dataset.serviceIndex);
            window.openServiceModal(serviceIndex);
        });
    });

    // Portfolio items
    document.querySelectorAll('.pf-portfolio-item').forEach(item => {
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

// Service Detail Modal
window.openServiceModal = function(serviceIndex) {
    const services = window._currentProfileServices || [];
    const creatorId = window._currentCreatorId;
    const service = services[serviceIndex];
    
    if (!service) return;
    
    const images = service.images || [];
    let currentImageIndex = 0;
    
    const modal = document.createElement('div');
    modal.className = 'pf-service-modal-overlay';
    modal.innerHTML = `
        <div class="pf-service-modal">
            <div class="pf-service-modal-header">
                <h3 class="pf-service-modal-title">${service.title}</h3>
                <button class="pf-service-modal-close" onclick="this.closest('.pf-service-modal-overlay').remove()">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                        <path d="M18 6L6 18M6 6l12 12"/>
                    </svg>
                </button>
            </div>
            
            <div class="pf-service-modal-body">
                ${images.length > 0 ? `
                    <div class="pf-service-gallery">
                        <div class="pf-service-gallery-main" onclick="window.openImageModal('${images[currentImageIndex]}')">
                            <img src="${images[currentImageIndex]}" id="serviceGalleryMain" alt="${service.title}">
                        </div>
                        ${images.length > 1 ? `
                            <button class="pf-service-gallery-nav prev" onclick="window.changeServiceImage(-1)">
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                                    <path d="M15 18l-6-6 6-6"/>
                                </svg>
                            </button>
                            <button class="pf-service-gallery-nav next" onclick="window.changeServiceImage(1)">
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                                    <path d="M9 18l6-6-6-6"/>
                                </svg>
                            </button>
                            <div class="pf-service-gallery-counter">
                                <span id="serviceGalleryCounter">1</span> / ${images.length}
                            </div>
                        ` : ''}
                        ${images.length > 1 ? `
                            <div class="pf-service-gallery-thumbs">
                                ${images.map((img, i) => `
                                    <div class="pf-service-gallery-thumb ${i === 0 ? 'active' : ''}" data-index="${i}" onclick="window.selectServiceImage(${i})">
                                        <img src="${img}" alt="${service.title} ${i + 1}">
                                    </div>
                                `).join('')}
                            </div>
                        ` : ''}
                    </div>
                ` : ''}
                
                ${service.suggestedPrice ? `<div class="pf-service-modal-price">$${service.suggestedPrice}</div>` : ''}
                
                <p class="pf-service-modal-desc">${service.description || 'No description available.'}</p>
                
                ${service.links && service.links.length > 0 ? `
                    <div class="pf-service-modal-links">
                        ${service.links.map(link => `
                            <a href="${link.url}" target="_blank" rel="noopener" class="pf-service-modal-link">
                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                    <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/>
                                    <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>
                                </svg>
                                ${link.title || 'View Link'}
                            </a>
                        `).join('')}
                    </div>
                ` : ''}
            </div>
            
            <div class="pf-service-modal-footer">
                <button class="pf-service-modal-btn secondary" onclick="this.closest('.pf-service-modal-overlay').remove()">Close</button>
                <button class="pf-service-modal-btn primary" onclick="window.bookServiceFromModal(${serviceIndex})">Book This Service</button>
            </div>
        </div>
    `;
    
    // Store images array for navigation
    window._serviceModalImages = images;
    window._currentServiceImageIndex = 0;
    window._currentServiceIndex = serviceIndex;
    
    modal.addEventListener('click', (e) => {
        if (e.target === modal) modal.remove();
    });
    
    document.body.appendChild(modal);
};

window.changeServiceImage = function(direction) {
    const images = window._serviceModalImages || [];
    if (images.length === 0) return;
    
    let newIndex = window._currentServiceImageIndex + direction;
    if (newIndex < 0) newIndex = images.length - 1;
    if (newIndex >= images.length) newIndex = 0;
    
    window.selectServiceImage(newIndex);
};

window.selectServiceImage = function(index) {
    const images = window._serviceModalImages || [];
    if (images.length === 0 || index < 0 || index >= images.length) return;
    
    window._currentServiceImageIndex = index;
    
    const mainImg = document.getElementById('serviceGalleryMain');
    if (mainImg) mainImg.src = images[index];
    
    const counter = document.getElementById('serviceGalleryCounter');
    if (counter) counter.textContent = index + 1;
    
    // Update active thumbnail
    document.querySelectorAll('.pf-service-gallery-thumb').forEach((thumb, i) => {
        thumb.classList.toggle('active', i === index);
    });
};

window.bookServiceFromModal = function(serviceIndex) {
    const modal = document.querySelector('.pf-service-modal-overlay');
    if (modal) modal.remove();
    
    const creatorId = window._currentCreatorId;
    if (!appState.user) {
        window.showAuthModal('signin');
    } else {
        window.showBookingModal(creatorId, serviceIndex);
    }
};

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
