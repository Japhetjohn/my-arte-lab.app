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
    return creators.map(creator => `
        <div class="card card-lift scroll-fade-in dynamic-light creator-card-modern" data-creator-id="${creator.id}" style="cursor: pointer; padding: 0; overflow: hidden;">
            <div style="height: 140px; background: linear-gradient(135deg, rgba(151, 71, 255, 0.5) 0%, rgba(107, 70, 255, 0.5) 100%); position: relative; overflow: hidden;">
                ${creator.cover ? `
                    <img src="${creator.cover}" alt="${creator.name}" style="width: 100%; height: 100%; object-fit: cover;">
                ` : ''}
                ${creator.verified ? `
                    <div style="position: absolute; top: 12px; right: 12px; background: rgba(255, 255, 255, 0.4); backdrop-filter: blur(12px); -webkit-backdrop-filter: blur(12px); border: 1px solid rgba(255,255,255,0.5); padding: 4px 10px; border-radius: 20px; display: flex; align-items: center; gap: 4px; font-size: 12px; font-weight: 600; color: #065f46; box-shadow: 0 4px 12px rgba(0,0,0,0.1);">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                            <path d="M9 12l2 2 4-4m6-2a9 9 0 1 1-18 0 9 9 0 0 1 18 0z" stroke="currentColor" stroke-width="2"/>
                        </svg>
                        Verified
                    </div>
                ` : ''}
            </div>

            <div style="padding: 20px;">
                <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 12px;">
                    <img src="${creator.avatar}"
                         alt="${creator.name}"
                         style="width: 48px; height: 48px; border-radius: 50%; object-fit: cover; border: 3px solid rgba(255, 255, 255, 0.6); box-shadow: 0 4px 12px rgba(0,0,0,0.1);">
                    <div style="flex: 1;">
                        <h3 style="margin: 0; font-size: 16px; font-weight: 700;">
                            ${creator.name}
                        </h3>
                        <p style="margin: 0; font-size: 13px; color: var(--text-secondary); text-transform: capitalize;">
                            ${creator.role}
                        </p>
                    </div>
                </div>

                ${creator.location ? `
                    <div style="display: flex; align-items: center; gap: 6px; margin-bottom: 8px; color: var(--text-secondary); font-size: 13px;">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                            <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" stroke="currentColor" stroke-width="2"/>
                            <circle cx="12" cy="10" r="3" stroke="currentColor" stroke-width="2"/>
                        </svg>
                        <span>${creator.location}</span>
                    </div>
                ` : ''}

                ${parseFloat(creator.rating) > 0 ? `
                    <div style="display: flex; align-items: center; gap: 6px;">
                        <div style="display: flex; gap: 2px;">
                            ${Array.from({ length: 5 }, (_, i) => `
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="${i < Math.floor(parseFloat(creator.rating)) ? '#F59E0B' : 'none'}" stroke="#F59E0B" stroke-width="2">
                                    <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
                                </svg>
                            `).join('')}
                        </div>
                        <span style="font-size: 13px; font-weight: 600; color: var(--text-primary);">
                            ${creator.rating}
                        </span>
                        ${creator.reviewCount > 0 ? `
                            <span style="font-size: 12px; color: var(--text-secondary);">
                                (${creator.reviewCount})
                            </span>
                        ` : ''}
                    </div>
                ` : ''}
            </div>
        </div>
    `).join('');
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
        <div class="discover-header glass-effect" style="border-bottom: 1px solid rgba(255,255,255,0.3); margin-bottom: 20px;">
            <div class="container">
                <div class="filters-row">
                    <button class="filter-chip active" data-filter="all">All</button>
                    <button class="filter-chip" data-filter="photographer">Photographers</button>
                    <button class="filter-chip" data-filter="designer">Designers</button>
                    <button class="filter-chip" data-filter="videographer">Videographers</button>
                    <button class="filter-chip" data-filter="illustrator">Illustrators</button>
                    <button class="filter-chip" data-filter="verified">Verified only</button>
                </div>
            </div>
        </div>

        <div class="section" id="homeResults">
            <div class="container" id="creatorsContainer">
                <!-- Content will be loaded here -->
            </div>
        </div>
    `;

    setupFilterListeners();
    window.showLoadingSpinner('Discovering creators...');
    await loadCreators();
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
    document.querySelectorAll('.creator-card-modern').forEach(card => {
        card.addEventListener('click', () => {
            const creatorId = card.dataset.creatorId;
            const creator = creators.find(c => c.id === creatorId);
            if (creator) {
                window.renderCreatorProfile(creator);
            }
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
