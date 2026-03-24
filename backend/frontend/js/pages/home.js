import { appState } from '../state.js';
import api from '../services/api.js';
import { formatLocation } from '../utils/formatters.js';
import { calculateCreatorScore, getCreatorTier, sortCreatorsByRelevance } from '../utils.js';

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
                    <h1 class="home-hero-title">Discover African Creators</h1>
                    <p class="home-hero-subtitle">Find and book talented photographers, designers, videographers, and more.</p>
                    
                    <div class="home-hero-search">
                        <svg class="search-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <circle cx="11" cy="11" r="8"/>
                            <path d="m21 21-4.35-4.35"/>
                        </svg>
                        <input type="text" id="homeHeroSearch" placeholder="Search for creators, services, or skills..." value="${currentFilters.search}">
                        <button class="home-hero-search-btn" id="homeHeroSearchBtn">Search</button>
                    </div>
                </div>
            </section>

            <!-- Categories Section -->
            <section class="home-categories">
                <div class="container">
                    <div class="home-categories-grid">
                        <div class="home-category-card" data-category="photographer">
                            <div class="home-category-icon">
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                                    <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/>
                                    <circle cx="12" cy="13" r="4"/>
                                </svg>
                            </div>
                            <span class="home-category-name">Photography</span>
                        </div>
                        
                        <div class="home-category-card" data-category="designer">
                            <div class="home-category-icon">
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                                    <path d="M12 19l7-7 3 3-7 7-3-3z"/>
                                    <path d="M18 13l-1.5-7.5L2 2l3.5 14.5L13 18l5-5z"/>
                                    <path d="M2 2l7.586 7.586"/>
                                    <circle cx="11" cy="11" r="2"/>
                                </svg>
                            </div>
                            <span class="home-category-name">Design</span>
                        </div>
                        
                        <div class="home-category-card" data-category="videographer">
                            <div class="home-category-icon">
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                                    <polygon points="23 7 16 12 23 17 23 7"/>
                                    <rect x="1" y="5" width="15" height="14" rx="2" ry="2"/>
                                </svg>
                            </div>
                            <span class="home-category-name">Video</span>
                        </div>
                        
                        <div class="home-category-card" data-category="illustrator">
                            <div class="home-category-icon">
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                                    <path d="M12 19l7-7 3 3-7 7-3-3z"/>
                                    <path d="M18 13l-1.5-7.5L2 2l3.5 14.5L13 18l5-5z"/>
                                    <path d="M2 2l7.586 7.586"/>
                                    <circle cx="11" cy="11" r="2"/>
                                </svg>
                            </div>
                            <span class="home-category-name">Illustration</span>
                        </div>
                        
                        <div class="home-category-card" data-category="writer">
                            <div class="home-category-icon">
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                                    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                                    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                                </svg>
                            </div>
                            <span class="home-category-name">Writing</span>
                        </div>
                        
                        <div class="home-category-card" data-category="musician">
                            <div class="home-category-icon">
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                                    <path d="M9 18V5l12-2v13"/>
                                    <circle cx="6" cy="18" r="3"/>
                                    <circle cx="18" cy="16" r="3"/>
                                </svg>
                            </div>
                            <span class="home-category-name">Music</span>
                        </div>
                        
                        <div class="home-category-card" data-category="developer">
                            <div class="home-category-icon">
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                                    <polyline points="16 18 22 12 16 6"/>
                                    <polyline points="8 6 2 12 8 18"/>
                                </svg>
                            </div>
                            <span class="home-category-name">Development</span>
                        </div>
                        
                        <div class="home-category-card" data-category="marketing">
                            <div class="home-category-icon">
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                                    <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
                                    <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
                                </svg>
                            </div>
                            <span class="home-category-name">Marketing</span>
                        </div>
                    </div>
                </div>
            </section>

            <!-- Creators Section -->
            <section class="home-creators" id="homeResults">
                <div class="container">
                    <div class="home-creators-header">
                        <h2 class="home-section-title">Featured Creators</h2>
                        <div class="home-creators-filters">
                            <button class="home-filter-btn active" data-filter="all">All</button>
                            <button class="home-filter-btn" data-filter="verified">Verified</button>
                        </div>
                    </div>
                    <div id="homeGrid">
                        <!-- Content will be loaded here -->
                    </div>
                </div>
            </section>

            <!-- Footer -->
            <footer class="home-footer">
                <div class="container">
                    <div class="home-footer-content">
                        <div class="home-footer-brand">
                            <div class="home-footer-logo">
                                <span style="font-size: 24px; font-weight: 800; background: linear-gradient(135deg, var(--primary), var(--secondary)); -webkit-background-clip: text; -webkit-text-fill-color: transparent;">MyArteLab</span>
                            </div>
                            <p class="home-footer-tagline">Empowering African creators to showcase their talent and connect with clients worldwide.</p>
                            <div class="home-footer-social">
                                <a href="https://twitter.com/myartelab" target="_blank" rel="noopener" class="home-footer-social-link" aria-label="Twitter">
                                    <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                                        <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
                                    </svg>
                                </a>
                                <a href="https://instagram.com/myartelab" target="_blank" rel="noopener" class="home-footer-social-link" aria-label="Instagram">
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
                                <a href="https://youtube.com/@myartelab" target="_blank" rel="noopener" class="home-footer-social-link" aria-label="YouTube">
                                    <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                                        <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
                                    </svg>
                                </a>
                                <a href="https://tiktok.com/@myartelab" target="_blank" rel="noopener" class="home-footer-social-link" aria-label="TikTok">
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

    setupHomeEventListeners();
    window.showLoadingSpinner();
    await loadCreators();
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
            window.hideLoadingSpinner();
            renderCreatorsList();
        }
    } catch (error) {
        console.error('Failed to load creators:', error);
        window.hideLoadingSpinner();
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
    const resultsContainer = document.getElementById('homeResults');

    // Update filter chips active states - allow multiple filters to be active
    document.querySelectorAll('.filter-chip').forEach(chip => {
        const filter = chip.dataset.filter;

        // Handle verified filter independently
        if (filter === 'verified') {
            if (currentFilters.verified) {
                chip.classList.add('active');
            } else {
                chip.classList.remove('active');
            }
        }
        // Handle category filters
        else if (filter === 'all') {
            if (!currentFilters.category) {
                chip.classList.add('active');
            } else {
                chip.classList.remove('active');
            }
        } else if (filter === currentFilters.category) {
            chip.classList.add('active');
        } else {
            // Only remove active if it's a category chip (not verified)
            if (filter !== 'verified') {
                chip.classList.remove('active');
            }
        }
    });

    // Update only the results section
    resultsContainer.innerHTML = `
        <div class="container">
            ${creators.length > 0 ? `
                <div class="section-header">
                    <select class="form-select" style="width: auto;" id="sortSelect">
                        <option value="relevance" ${currentFilters.sort === 'relevance' ? 'selected' : ''}>Sort by relevance</option>
                        <option value="rating" ${currentFilters.sort === 'rating' ? 'selected' : ''}>Highest rated</option>
                        <option value="newest" ${currentFilters.sort === 'newest' ? 'selected' : ''}>Newest</option>
                    </select>
                </div>
                <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 24px;" id="homeGrid">
                    ${renderModernCreatorCards(creators)}
                </div>
            ` : `
                <div class="empty-state" style="padding: 80px 20px; text-align: center; animation: fadeIn 0.3s ease-in;">
                    <div style="background: linear-gradient(135deg, rgba(151, 71, 255, 0.1) 0%, rgba(107, 70, 255, 0.1) 100%); width: 120px; height: 120px; border-radius: 50%; display: flex; align-items: center; justify-content: center; margin: 0 auto 24px;">
                        <svg width="64" height="64" viewBox="0 0 24 24" fill="none" style="color: var(--primary);">
                            <circle cx="11" cy="11" r="8" stroke="currentColor" stroke-width="2"/>
                            <path d="M21 21l-4.35-4.35" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
                            <path d="M11 8v3M11 14h.01" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
                        </svg>
                    </div>
                    <h3 style="font-size: 24px; margin-bottom: 12px; color: var(--text-primary);">No creators found</h3>
                    <p style="color: var(--text-secondary); font-size: 16px; margin-bottom: 24px; max-width: 400px; margin-left: auto; margin-right: auto;">
                        We couldn't find any creators matching your search. Try adjusting your filters or explore different categories.
                    </p>
                    <div style="display: flex; gap: 12px; justify-content: center; flex-wrap: wrap; margin-bottom: 24px;">
                        <button class="btn-primary" onclick="window.location.reload()" style="min-width: 140px;">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" style="display: inline; margin-right: 6px; vertical-align: middle;">
                                <path d="M21.5 2v6h-6M2.5 22v-6h6M2 11.5a10 10 0 0118-6l1.5 2M22 12.5a10 10 0 01-18 6l-1.5-2" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                            </svg>
                            Clear filters
                        </button>
                    </div>
                    <div class="glass-effect" style="padding: 20px; border-radius: 16px; max-width: 500px; margin: 0 auto; border: 1px solid rgba(255,255,255,0.4); box-shadow: 0 8px 32px rgba(0,0,0,0.1);">
                        <p style="font-weight: 600; margin-bottom: 12px; color: var(--text-primary);">Popular searches:</p>
                        <div style="display: flex; gap: 8px; flex-wrap: wrap; justify-content: center;">
                            <button class="filter-chip" data-filter="photographer" onclick="document.querySelector('[data-filter=photographer]').click()">Photographers</button>
                            <button class="filter-chip" data-filter="designer" onclick="document.querySelector('[data-filter=designer]').click()">Designers</button>
                            <button class="filter-chip" data-filter="videographer" onclick="document.querySelector('[data-filter=videographer]').click()">Videographers</button>
                        </div>
                    </div>
                </div>
            `}
        </div>
    `;

    setupModernCreatorCardListeners();
    setupSortListener();
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
