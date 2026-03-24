import { appState } from '../state.js';
import api from '../services/api.js';
import { formatLocation } from '../utils/formatters.js';
import { calculateCreatorScore, getCreatorTier, sortCreatorsByRelevance } from '../utils.js';

// Skeleton Loading Functions
function showSkeletonLoading() {
    // Featured grid skeletons
    const featuredGrid = document.getElementById('featuredGrid');
    if (featuredGrid) {
        featuredGrid.innerHTML = renderSkeletonCards(4, 'featured');
    }
    
    // Home grid skeletons
    const homeGrid = document.getElementById('homeGrid');
    if (homeGrid) {
        homeGrid.innerHTML = `<div class="creators-grid-all">${renderSkeletonCards(8)}</div>`;
    }
}

function hideSkeletonLoading() {
    // Skeletons are replaced by real content in renderCreatorsList
    // No action needed as the content overwrites the skeletons
}

function renderSkeletonCards(count, type = 'default') {
    const cards = [];
    for (let i = 0; i < count; i++) {
        cards.push(`
            <div class="creator-token-card skeleton-card" style="
                background: rgba(255, 255, 255, 0.7);
                border-radius: 16px;
                overflow: hidden;
                border: 1px solid rgba(255, 255, 255, 0.5);
            ">
                <div class="skeleton skeleton-image" style="aspect-ratio: 1;"></div>
                <div class="skeleton-content" style="padding: 20px; display: flex; flex-direction: column; gap: 12px;">
                    <div class="skeleton skeleton-title" style="height: 20px; width: 70%;"></div>
                    <div class="skeleton skeleton-line" style="height: 14px; width: 100%;"></div>
                    <div class="skeleton skeleton-line short" style="height: 14px; width: 60%;"></div>
                    <div class="skeleton skeleton-button" style="height: 36px; width: 100%; margin-top: 8px;"></div>
                </div>
            </div>
        `);
    }
    return cards.join('');
}

let creators = [];
let currentFilters = {
    search: '',
    category: '',
    location: '',
    verified: false,
    sort: 'relevance'
};

function renderModernCreatorCards(creators) {
    return creators.map((creator, index) => {
        // Check if avatar is a real image or placeholder
        const hasRealAvatar = creator.avatar && !creator.avatar.includes('ui-avatars.com');
        
        return `
        <div class="creator-token-card" data-creator-id="${creator.id}" style="
            background: #FFFFFF;
            border-radius: 16px;
            overflow: hidden;
            box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);
            transition: all 0.3s ease;
            cursor: pointer;
            height: 100%;
            display: flex;
            flex-direction: column;
        ">
            <!-- Avatar/Image Section -->
            <div style="
                position: relative;
                width: 100%;
                aspect-ratio: 1;
                background: ${hasRealAvatar ? 'linear-gradient(135deg, rgba(151, 71, 255, 0.1) 0%, rgba(107, 70, 255, 0.1) 100%)' : '#F3E8FF'};
                overflow: hidden;
            ">
                ${hasRealAvatar ? `
                    <img src="${creator.avatar}" 
                         alt="${creator.name}" 
                         style="
                            width: 100%;
                            height: 100%;
                            object-fit: cover;
                            transition: transform 0.3s ease;
                         "
                         class="creator-card-img"
                    >
                ` : ''}
                ${creator.verified ? `
                    <div style="
                        position: absolute;
                        top: 12px;
                        right: 12px;
                        background: var(--primary);
                        color: white;
                        padding: 6px 12px;
                        border-radius: 20px;
                        font-size: 11px;
                        font-weight: 600;
                        display: flex;
                        align-items: center;
                        gap: 4px;
                        box-shadow: 0 2px 8px rgba(151, 71, 255, 0.3);
                    ">
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3">
                            <polyline points="20 6 9 17 4 12"></polyline>
                        </svg>
                        Verified
                    </div>
                ` : ''}
            </div>
            
            <!-- Content Section -->
            <div style="padding: 20px; flex: 1; display: flex; flex-direction: column;">
                <!-- Name -->
                <h3 style="
                    margin: 0 0 6px 0;
                    font-size: 18px;
                    font-weight: 700;
                    color: var(--text-primary);
                    line-height: 1.3;
                ">${creator.name}</h3>
                
                <!-- Location -->
                ${creator.location ? `
                    <div style="
                        display: flex;
                        align-items: center;
                        gap: 4px;
                        margin-bottom: 8px;
                        font-size: 13px;
                        color: var(--text-secondary);
                    ">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/>
                            <circle cx="12" cy="10" r="3"/>
                        </svg>
                        <span style="white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${creator.location}</span>
                    </div>
                ` : ''}
                
                <!-- Bio -->
                <p style="
                    margin: 0 0 16px 0;
                    font-size: 14px;
                    color: var(--text-secondary);
                    line-height: 1.5;
                    display: -webkit-box;
                    -webkit-line-clamp: 3;
                    -webkit-box-orient: vertical;
                    overflow: hidden;
                    flex: 1;
                ">${creator.bio}</p>
                
                <!-- See Creator Button -->
                <button style="
                    background: transparent;
                    border: none;
                    color: var(--primary);
                    font-size: 14px;
                    font-weight: 600;
                    display: flex;
                    align-items: center;
                    gap: 6px;
                    padding: 0;
                    cursor: pointer;
                    transition: all 0.2s ease;
                    margin-top: auto;
                " class="see-creator-btn">
                    See creator
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="transition: transform 0.2s ease;">
                        <line x1="5" y1="12" x2="19" y2="12"></line>
                        <polyline points="12 5 19 12 12 19"></polyline>
                    </svg>
                </button>
            </div>
        </div>
    `}).join('');
}

let platformStats = {
    totalCreators: 0,
    totalBookings: 0,
    totalEarnings: 0
};

export async function renderHomePage() {
    const mainContent = document.getElementById('mainContent');

    const filterFromPrevious = localStorage.getItem('homeFilter');
    if (filterFromPrevious) {
        currentFilters.category = filterFromPrevious;
        localStorage.removeItem('homeFilter');
    }

    // Check for pending search from global search overlay
    const pendingSearch = localStorage.getItem('pendingSearch');
    if (pendingSearch) {
        currentFilters.search = pendingSearch;
        localStorage.removeItem('pendingSearch');
    }

    mainContent.innerHTML = `
        <div class="home-app">
            <!-- Hero Section -->
            <section class="home-hero">
                <div class="container">
                    <h1 class="home-hero-title">Hire African Creators.<br>Delivered Globally.</h1>
                    <p class="home-hero-subtitle">Connect with verified photographers, designers, videographers & more.</p>
                    
                    <div class="home-hero-search">
                        <svg class="search-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <circle cx="11" cy="11" r="8"/>
                            <path d="m21 21-4.35-4.35"/>
                        </svg>
                        <input type="text" id="homeHeroSearch" placeholder="What service do you need?" value="${currentFilters.search}">
                        <button class="home-hero-search-btn" id="homeHeroSearchBtn">
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <circle cx="11" cy="11" r="8"/>
                                <path d="m21 21-4.35-4.35"/>
                            </svg>
                        </button>
                    </div>
                    
                    <div class="home-hero-trust">
                        <div class="trust-item">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
                            </svg>
                            <span>4.9/5 avg rating</span>
                        </div>
                        <div class="trust-item">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
                                <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                            </svg>
                            <span>Secure payments</span>
                        </div>
                        <div class="trust-item">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <circle cx="12" cy="12" r="10"/>
                                <path d="M2 12h20"/>
                                <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>
                            </svg>
                            <span>Global delivery</span>
                        </div>
                    </div>
                </div>
            </section>

            <!-- Categories Section -->
            <section class="home-categories">
                <div class="container">
                    <div class="home-categories-scroll">
                        <div class="home-category-card" data-category="all">
                            <span class="home-category-name">All</span>
                        </div>
                        <div class="home-category-card" data-category="photographer">
                            <span class="home-category-name">Photography</span>
                        </div>
                        <div class="home-category-card" data-category="designer">
                            <span class="home-category-name">Design</span>
                        </div>
                        <div class="home-category-card" data-category="videographer">
                            <span class="home-category-name">Video</span>
                        </div>
                        <div class="home-category-card" data-category="illustrator">
                            <span class="home-category-name">Illustration</span>
                        </div>
                        <div class="home-category-card" data-category="writer">
                            <span class="home-category-name">Writing</span>
                        </div>
                        <div class="home-category-card" data-category="musician">
                            <span class="home-category-name">Music</span>
                        </div>
                        <div class="home-category-card" data-category="developer">
                            <span class="home-category-name">Development</span>
                        </div>
                        <div class="home-category-card" data-category="marketing">
                            <span class="home-category-name">Marketing</span>
                        </div>
                    </div>
                </div>
            </section>

            <!-- Main Content Area -->
            <section class="home-main">
                <div class="container">
                    <div class="home-layout">
                        <!-- Left Column - Main Content -->
                        <div class="home-content">
                            <!-- Featured Creators -->
                            <div class="home-section">
                                <div class="home-section-header">
                                    <h2>Featured Creators</h2>
                                    <a href="#" class="view-all" onclick="document.getElementById('allCreators').scrollIntoView({behavior: 'smooth'}); return false;">View all</a>
                                </div>
                                <div class="home-featured-grid" id="featuredGrid">
                                    <!-- Featured creators loaded here -->
                                </div>
                            </div>
                            
                            <!-- Recent Activity -->
                            <div class="home-section">
                                <div class="home-section-header">
                                    <h2>Recent Activity</h2>
                                </div>
                                <div class="home-activity-list" id="activityList">
                                    ${renderActivityFeed()}
                                </div>
                            </div>
                            
                            <!-- All Creators -->
                            <div class="home-section" id="allCreators">
                                <div class="home-section-header">
                                    <h2>All Creators</h2>
                                    <div class="home-filters">
                                        <button class="home-filter-btn active" data-filter="all">All</button>
                                        <button class="home-filter-btn" data-filter="verified">Verified</button>
                                    </div>
                                </div>
                                <div id="homeGrid">
                                    <!-- All creators loaded here -->
                                </div>
                            </div>
                        </div>
                        
                        <!-- Right Column - Sidebar -->
                        <div class="home-sidebar">
                            <!-- Stats Widget -->
                            <div class="sidebar-widget stats-widget">
                                <div class="stat-item">
                                    <div class="stat-icon">
                                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
                                            <circle cx="12" cy="7" r="4"/>
                                        </svg>
                                    </div>
                                    <div class="stat-info">
                                        <span class="stat-value" id="statCreators">0</span>
                                        <span class="stat-label">Creators</span>
                                    </div>
                                </div>
                                <div class="stat-item">
                                    <div class="stat-icon">
                                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                            <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
                                            <line x1="16" y1="2" x2="16" y2="6"/>
                                            <line x1="8" y1="2" x2="8" y2="6"/>
                                            <line x1="3" y1="10" x2="21" y2="10"/>
                                        </svg>
                                    </div>
                                    <div class="stat-info">
                                        <span class="stat-value" id="statBookings">0</span>
                                        <span class="stat-label">Bookings</span>
                                    </div>
                                </div>
                                <div class="stat-item">
                                    <div class="stat-icon">
                                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                            <line x1="12" y1="1" x2="12" y2="23"/>
                                            <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>
                                        </svg>
                                    </div>
                                    <div class="stat-info">
                                        <span class="stat-value" id="statEarnings">$0</span>
                                        <span class="stat-label">Paid to creators</span>
                                    </div>
                                </div>
                            </div>
                            
                            <!-- How It Works -->
                            <div class="sidebar-widget how-it-works">
                                <h3>How it works</h3>
                                <div class="steps">
                                    <div class="step">
                                        <div class="step-number">1</div>
                                        <div class="step-content">
                                            <h4>Search</h4>
                                            <p>Browse creators by category or skill</p>
                                        </div>
                                    </div>
                                    <div class="step">
                                        <div class="step-number">2</div>
                                        <div class="step-content">
                                            <h4>Book</h4>
                                            <p>Send a request and agree on terms</p>
                                        </div>
                                    </div>
                                    <div class="step">
                                        <div class="step-number">3</div>
                                        <div class="step-content">
                                            <h4>Get Results</h4>
                                            <p>Receive your work and release payment</p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            
                            <!-- Top Earners -->
                            <div class="sidebar-widget top-earners">
                                <div class="widget-header">
                                    <h3>Top Earners</h3>
                                    <a href="#" class="view-all-link">Leaderboard</a>
                                </div>
                                <div class="earners-list" id="topEarnersList">
                                    <!-- Top earners loaded here -->
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>
        </div>
    `;

    setupHomeEventListeners();
    loadPlatformStats();
    
    // Show skeleton loading state
    showSkeletonLoading();
    await loadCreators();
    hideSkeletonLoading();
}

function renderActivityFeed() {
    // Mock activity data - in production this would come from API
    const activities = [
        { user: 'John D.', action: 'booked', target: 'Wedding Photography', time: '2 min ago' },
        { user: 'Sarah M.', action: 'completed', target: 'Logo Design project', time: '5 min ago' },
        { user: 'Mike K.', action: 'booked', target: 'Video Editing', time: '12 min ago' },
        { user: 'Lisa A.', action: 'joined', target: 'as a creator', time: '25 min ago' },
        { user: 'David R.', action: 'completed', target: 'Brand Identity project', time: '1 hour ago' }
    ];
    
    return activities.map(activity => `
        <div class="activity-item">
            <div class="activity-dot"></div>
            <div class="activity-content">
                <span class="activity-user">${activity.user}</span>
                <span class="activity-action">${activity.action}</span>
                <span class="activity-target">${activity.target}</span>
                <span class="activity-time">${activity.time}</span>
            </div>
        </div>
    `).join('');
}

async function loadPlatformStats() {
    try {
        // In production, these would come from an API
        // For now, animate the numbers
        animateNumber('statCreators', 1240, '');
        animateNumber('statBookings', 5680, '');
        animateNumber('statEarnings', 2400000, '$');
    } catch (error) {
        console.log('Stats load failed:', error);
    }
}

function animateNumber(elementId, target, prefix) {
    const element = document.getElementById(elementId);
    if (!element) return;
    
    const duration = 2000;
    const steps = 60;
    const increment = target / steps;
    let current = 0;
    
    const timer = setInterval(() => {
        current += increment;
        if (current >= target) {
            current = target;
            clearInterval(timer);
        }
        
        if (prefix === '$') {
            element.textContent = prefix + formatCompactNumber(Math.floor(current));
        } else {
            element.textContent = formatCompactNumber(Math.floor(current));
        }
    }, duration / steps);
}

function formatCompactNumber(number) {
    if (number >= 1000000) {
        return (number / 1000000).toFixed(1) + 'M';
    }
    if (number >= 1000) {
        return (number / 1000).toFixed(1) + 'K';
    }
    return number.toString();
}

function setupHomeEventListeners() {
    // Category cards click
    document.querySelectorAll('.home-category-card').forEach(card => {
        card.addEventListener('click', () => {
            const category = card.dataset.category;
            currentFilters.category = category;
            
            // Visual feedback
            document.querySelectorAll('.home-category-card').forEach(c => c.classList.remove('active'));
            card.classList.add('active');
            
            // Scroll to creators section
            document.getElementById('homeResults').scrollIntoView({ behavior: 'smooth' });
            
            loadCreators();
        });
    });
    
    // Filter buttons
    document.querySelectorAll('.home-filter-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const filter = e.target.dataset.filter;
            
            document.querySelectorAll('.home-filter-btn').forEach(b => b.classList.remove('active'));
            e.target.classList.add('active');
            
            if (filter === 'verified') {
                currentFilters.verified = true;
            } else {
                currentFilters.verified = false;
            }
            
            loadCreators();
        });
    });
    
    // Hero search
    const heroSearch = document.getElementById('homeHeroSearch');
    const heroSearchBtn = document.getElementById('homeHeroSearchBtn');
    
    heroSearch?.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            currentFilters.search = heroSearch.value;
            document.getElementById('homeResults').scrollIntoView({ behavior: 'smooth' });
            loadCreators();
        }
    });
    
    heroSearchBtn?.addEventListener('click', () => {
        currentFilters.search = heroSearch.value;
        document.getElementById('homeResults').scrollIntoView({ behavior: 'smooth' });
        loadCreators();
    });
}

async function loadCreators() {
    try {
        const filters = {};

        // Only send category and verified to API, handle search client-side
        if (currentFilters.category) {
            filters.category = currentFilters.category;
        }
        if (currentFilters.verified) {
            filters.verified = true;
        }

        const response = await api.getCreators(filters);

        if (response.success) {
            let allCreators = (response.data || []).map(creator => {
                const creatorData = {
                    id: creator._id,
                    name: creator.name || 'Unknown Creator',
                    avatar: creator.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(creator.name || 'User')}&background=9747FF&color=fff&bold=true`,
                    role: creator.category ? creator.category.charAt(0).toUpperCase() + creator.category.slice(1) : 'Creator',
                    location: formatLocation(creator.location),
                    rating: creator.rating?.average?.toFixed(1) || '0.0',
                    reviewCount: creator.rating?.count || 0,
                    verified: creator.isVerified || false,
                    price: creator.hourlyRate ? `From $${creator.hourlyRate}/hr` : 'Contact for pricing',
                    bio: creator.bio || 'No bio yet',
                    cover: creator.coverImage,
                    portfolio: creator.portfolio || [],
                    services: creator.services || [],
                    responseTime: creator.responseTime || 'Within a day',
                    completedJobs: creator.completedJobs || 0,
                    createdAt: creator.createdAt
                };

                // Calculate quality score and tier
                const qualityScore = calculateCreatorScore(creatorData);
                const tier = getCreatorTier(qualityScore, creatorData);

                return {
                    ...creatorData,
                    qualityScore,
                    tier: tier.tier,
                    badge: tier.badge,
                    badgeColor: tier.color,
                    tierDescription: tier.description
                };
            });

            // Apply client-side search filter across all fields
            if (currentFilters.search) {
                creators = searchCreators(allCreators, currentFilters.search);
            } else {
                creators = allCreators;
            }

            appState.creators = creators;
            renderCreatorsList();
        }
    } catch (error) {
        console.error('Failed to load creators:', error);
        const mainContent = document.getElementById('mainContent');
        mainContent.innerHTML = `
            <div class="section">
                <div class="container">
                    <div class="empty-state">
                        <svg width="64" height="64" viewBox="0 0 24 24" fill="none" style="opacity: 0.4; margin-bottom: 16px;">
                            <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="2"/>
                            <path d="M12 8v4M12 16h.01" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
                        </svg>
                        <h3>Failed to load creators</h3>
                        <p>${error.message}</p>
                        <button class="btn-primary" onclick="window.location.reload()">Try again</button>
                    </div>
                </div>
            </div>
        `;
    }
}

function renderCreatorsList() {
    // Get top 4 creators for featured section
    const featuredCreators = creators.slice(0, 4);
    const remainingCreators = creators.slice(4);
    
    // Update Featured Grid
    const featuredGrid = document.getElementById('featuredGrid');
    if (featuredGrid) {
        featuredGrid.innerHTML = featuredCreators.length > 0 
            ? renderFeaturedCreatorCards(featuredCreators)
            : '<p class="text-muted">No featured creators yet</p>';
    }
    
    // Update Top Earners in sidebar
    const topEarnersList = document.getElementById('topEarnersList');
    if (topEarnersList) {
        const topEarners = [...creators]
            .sort((a, b) => (b.totalEarnings || 0) - (a.totalEarnings || 0))
            .slice(0, 5);
        topEarnersList.innerHTML = renderTopEarners(topEarners);
    }
    
    // Update All Creators Grid
    const allCreatorsGrid = document.getElementById('homeGrid');
    if (allCreatorsGrid) {
        const displayCreators = currentFilters.category || currentFilters.search ? creators : remainingCreators;
        
        allCreatorsGrid.innerHTML = displayCreators.length > 0 
            ? `<div class="creators-grid-all">${renderModernCreatorCards(displayCreators)}</div>`
            : `
                <div class="empty-state" style="padding: 60px 20px; text-align: center;">
                    <svg width="48" height="48" viewBox="0 0 24 24" fill="none" style="color: #94A3B8; margin-bottom: 16px;">
                        <circle cx="11" cy="11" r="8" stroke="currentColor" stroke-width="2"/>
                        <path d="M21 21l-4.35-4.35" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
                    </svg>
                    <h3 style="font-size: 18px; color: #0F172A; margin-bottom: 8px;">No creators found</h3>
                    <p style="color: #64748B; font-size: 14px;">Try adjusting your filters</p>
                </div>
            `;
    }
    
    setupSortListener();
    setupModernCreatorCardListeners();
}

function renderFeaturedCreatorCards(creators) {
    return creators.map(creator => {
        const hasRealAvatar = creator.avatar && !creator.avatar.includes('ui-avatars.com');
        
        return `
        <div class="featured-creator-card" data-creator-id="${creator.id}">
            <div class="featured-creator-image" style="background: ${hasRealAvatar ? 'linear-gradient(135deg, #F3E8FF 0%, #E9D5FF 100%)' : '#F3E8FF'};">
                ${hasRealAvatar ? `<img src="${creator.avatar}" alt="${creator.name}">` : ''}
                ${creator.verified ? `
                    <div class="verified-badge">
                        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3">
                            <polyline points="20 6 9 17 4 12"></polyline>
                        </svg>
                    </div>
                ` : ''}
            </div>
            <div class="featured-creator-info">
                <h4>${creator.name}</h4>
                ${creator.location ? `<p class="location">${creator.location}</p>` : ''}
                <div class="rating">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="#F59E0B" stroke="#F59E0B" stroke-width="2">
                        <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
                    </svg>
                    <span>${creator.rating}</span>
                    <span class="reviews">(${creator.reviewCount})</span>
                </div>
            </div>
        </div>
    `}).join('');
}

function renderTopEarners(creators) {
    return creators.map((creator, index) => `
        <div class="earner-item" data-creator-id="${creator.id}">
            <span class="earner-rank">${index + 1}</span>
            <img src="${creator.avatar}" alt="${creator.name}" class="earner-avatar">
            <div class="earner-info">
                <span class="earner-name">${creator.name}</span>
                <span class="earner-amount">$${(creator.totalEarnings || 0).toLocaleString()} earned</span>
            </div>
        </div>
    `).join('');
}

function setupModernCreatorCardListeners() {
    document.querySelectorAll('.creator-token-card').forEach(card => {
        const creatorId = card.dataset.creatorId;
        const creator = creators.find(c => c.id === creatorId);
        
        // Card click opens creator profile
        card.addEventListener('click', (e) => {
            // Don't trigger if clicking the button directly (handled separately)
            if (e.target.closest('.see-creator-btn')) return;
            
            if (creator) {
                window.renderCreatorProfile(creator);
            }
        });
        
        // Button click also opens creator profile
        const btn = card.querySelector('.see-creator-btn');
        if (btn && creator) {
            btn.addEventListener('click', (e) => {
                e.stopPropagation(); // Prevent double trigger
                window.renderCreatorProfile(creator);
            });
        }
        
        // Hover effects
        const img = card.querySelector('.creator-card-img');
        const arrow = btn?.querySelector('svg');
        
        card.addEventListener('mouseenter', () => {
            card.style.boxShadow = '0 8px 30px rgba(151, 71, 255, 0.15)';
            card.style.transform = 'translateY(-4px)';
            if (img) img.style.transform = 'scale(1.05)';
            if (btn) btn.style.color = '#7c3aed';
            if (arrow) arrow.style.transform = 'translateX(4px)';
        });
        
        card.addEventListener('mouseleave', () => {
            card.style.boxShadow = '0 4px 20px rgba(0, 0, 0, 0.08)';
            card.style.transform = 'translateY(0)';
            if (img) img.style.transform = 'scale(1)';
            if (btn) btn.style.color = 'var(--primary)';
            if (arrow) arrow.style.transform = 'translateX(0)';
        });
    });
}

function setupFilterListeners() {
    document.querySelectorAll('.filter-chip').forEach(chip => {
        chip.addEventListener('click', async (e) => {
            const filter = e.currentTarget.dataset.filter;

            if (filter === 'all') {
                // Clear category filter only, keep verified filter
                currentFilters.category = '';
                await loadCreators();
            } else if (filter === 'verified') {
                // Toggle verified filter independently
                currentFilters.verified = !currentFilters.verified;
                await loadCreators();
            } else {
                // Set category filter, keep verified filter
                currentFilters.category = filter;
                await loadCreators();
            }
        });
    });
}

// Smart search function that searches across all creator fields
function searchCreators(allCreators, query) {
    if (!query || query.trim() === '') {
        return allCreators;
    }

    const searchTerms = query.toLowerCase().trim().split(' ').filter(term => term.length > 0);

    return allCreators.filter(creator => {
        // Build searchable text from all creator fields
        const searchableText = [
            creator.name,
            creator.role,
            creator.bio,
            creator.location,
            ...(creator.services || []),
            ...(creator.portfolio || []).map(p => p.title || p.description || '').join(' ')
        ].join(' ').toLowerCase();

        // Check if ALL search terms are found (AND logic)
        // This allows searches like "photographer lagos" to work
        return searchTerms.every(term => searchableText.includes(term));
    });
}

function setupSearchListener() {
    const searchInput = document.getElementById('homeSearch');
    const searchBtn = document.getElementById('searchBtn');

    let searchTimeout;
    const performSearch = async () => {
        currentFilters.search = searchInput?.value || '';
        await loadCreators();
    };

    // Debounce function for live search
    const debouncedSearch = () => {
        clearTimeout(searchTimeout);
        searchTimeout = setTimeout(performSearch, 500); // 500ms delay
    };

    // Live search as user types
    searchInput?.addEventListener('input', debouncedSearch);

    // Keep existing button and Enter key functionality
    searchBtn?.addEventListener('click', performSearch);
    searchInput?.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            clearTimeout(searchTimeout); // Cancel debounced search
            performSearch();
        }
    });
}

function setupSortListener() {
    const sortSelect = document.getElementById('sortSelect');
    sortSelect?.addEventListener('change', (e) => {
        currentFilters.sort = e.target.value;
        sortCreators();
        renderCreatorsList();
    });
}

function sortCreators() {
    switch (currentFilters.sort) {
        case 'relevance':
            // Sort by quality score (completed jobs + ratings + badges)
            creators = sortCreatorsByRelevance(creators);
            break;
        case 'rating':
            creators.sort((a, b) => parseFloat(b.rating || 0) - parseFloat(a.rating || 0));
            break;
        case 'newest':
            creators.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
            break;
        default:
            // Default to relevance
            creators = sortCreatorsByRelevance(creators);
            break;
    }
}
