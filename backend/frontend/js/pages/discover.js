import { appState } from '../state.js';
import { renderCreatorCards, setupCreatorCardListeners } from '../components/creators.js';
import api from '../services/api.js';
import { formatLocation } from '../utils/formatters.js';
import { showSkeletonLoaders } from '../utils.js';

let creators = [];
let currentFilters = {
    search: '',
    category: '',
    location: '',
    verified: false,
    sort: 'relevance'
};

export async function renderDiscoverPage() {
    const mainContent = document.getElementById('mainContent');

    const filterFromHome = localStorage.getItem('discoverFilter');
    if (filterFromHome) {
        currentFilters.category = filterFromHome;
        localStorage.removeItem('discoverFilter'); // Clear it after using
    }

    mainContent.innerHTML = `
        <div class="discover-header">
            <div class="container">
                <div class="search-bar">
                    <input type="text" class="search-input" placeholder="Search by service, city, style, e.g. wedding photographer Lagos" id="discoverSearch">
                    <button class="btn-primary" id="searchBtn">Search</button>
                </div>
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

        <div class="section">
            <div class="container">
                ${showSkeletonLoaders(6)}
            </div>
        </div>
    `;

    await loadCreators();
}

async function loadCreators() {
    try {
        const filters = {};

        if (currentFilters.category) {
            filters.category = currentFilters.category;
        }
        if (currentFilters.search) {
            filters.search = currentFilters.search;
        }
        if (currentFilters.verified) {
            filters.verified = true;
        }

        const response = await api.getCreators(filters);

        if (response.success) {
            creators = (response.data || []).map(creator => ({
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
            }));

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
    const mainContent = document.getElementById('mainContent');

    mainContent.innerHTML = `
        <div class="discover-header">
            <div class="container">
                <div class="search-bar">
                    <input type="text" class="search-input" placeholder="Search by service, city, style, e.g. wedding photographer Lagos" id="discoverSearch" value="${currentFilters.search}">
                    <button class="btn-primary" id="searchBtn">Search</button>
                </div>
                <div class="filters-row">
                    <button class="filter-chip ${!currentFilters.category ? 'active' : ''}" data-filter="all">All</button>
                    <button class="filter-chip ${currentFilters.category === 'photographer' ? 'active' : ''}" data-filter="photographer">Photographers</button>
                    <button class="filter-chip ${currentFilters.category === 'designer' ? 'active' : ''}" data-filter="designer">Designers</button>
                    <button class="filter-chip ${currentFilters.category === 'videographer' ? 'active' : ''}" data-filter="videographer">Videographers</button>
                    <button class="filter-chip ${currentFilters.category === 'illustrator' ? 'active' : ''}" data-filter="illustrator">Illustrators</button>
                    <button class="filter-chip ${currentFilters.verified ? 'active' : ''}" data-filter="verified">Verified only</button>
                </div>
            </div>
        </div>

        <div class="section">
            <div class="container">
                ${creators.length > 0 ? `
                    <div class="section-header">
                        <h3>${creators.length} creator${creators.length !== 1 ? 's' : ''} found</h3>
                        <select class="form-select" style="width: auto;" id="sortSelect">
                            <option value="relevance" ${currentFilters.sort === 'relevance' ? 'selected' : ''}>Sort by relevance</option>
                            <option value="rating" ${currentFilters.sort === 'rating' ? 'selected' : ''}>Highest rated</option>
                            <option value="newest" ${currentFilters.sort === 'newest' ? 'selected' : ''}>Newest</option>
                        </select>
                    </div>
                    <div class="creators-grid" id="discoverGrid">
                        ${renderCreatorCards(creators)}
                    </div>
                ` : `
                    <div class="empty-state" style="padding: 60px 20px;">
                        <svg width="64" height="64" viewBox="0 0 24 24" fill="none" style="opacity: 0.4; margin-bottom: 16px; color: var(--text-secondary);">
                            <circle cx="11" cy="11" r="8" stroke="currentColor" stroke-width="2"/>
                            <path d="M21 21l-4.35-4.35" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
                        </svg>
                        <h3>No creators found</h3>
                        <p class="text-secondary">Try adjusting your filters or search terms</p>
                        <button class="btn-primary" onclick="window.location.reload()" style="margin-top: 16px;">Clear filters</button>
                    </div>
                `}
            </div>
        </div>
    `;

    setupCreatorCardListeners();
    setupFilterListeners();
    setupSearchListener();
    setupSortListener();
}

function setupFilterListeners() {
    document.querySelectorAll('.filter-chip').forEach(chip => {
        chip.addEventListener('click', async (e) => {
            const filter = e.currentTarget.dataset.filter;

            if (filter === 'all') {
                currentFilters.category = '';
                await loadCreators();
            } else if (filter === 'verified') {
                currentFilters.verified = !currentFilters.verified;
                await loadCreators();
            } else {
                currentFilters.category = filter;
                await loadCreators();
            }
        });
    });
}

function setupSearchListener() {
    const searchInput = document.getElementById('discoverSearch');
    const searchBtn = document.getElementById('searchBtn');

    const performSearch = async () => {
        currentFilters.search = searchInput?.value || '';
        await loadCreators();
    };

    searchBtn?.addEventListener('click', performSearch);
    searchInput?.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
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
        case 'rating':
            creators.sort((a, b) => parseFloat(b.rating || 0) - parseFloat(a.rating || 0));
            break;
        case 'newest':
            creators.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
            break;
        default:
            break;
    }
}
