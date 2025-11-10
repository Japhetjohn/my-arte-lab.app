// Home Page Module
import { appState } from '../state.js';
import { renderCreatorCards, setupCreatorCardListeners, renderCategories } from '../components/creators.js';
import api from '../services/api.js';

let platformStats = null;
let featuredCreators = [];

export async function renderHomePage() {
    const mainContent = document.getElementById('mainContent');

    // Show initial content with loading state
    mainContent.innerHTML = `
        <div class="hero-section">
            <div class="hero-content">
                <h1>Built for creators. Trusted by clients.</h1>
                <p>Connect with talented photographers and designers across Africa</p>
                <div class="hero-cta">
                    <button class="btn-primary" onclick="navigateToPage('discover')">Explore creators</button>
                </div>
            </div>
        </div>

        <div class="stats-ribbon" id="statsRibbon">
            <div class="stat-item">
                <div class="stat-number">...</div>
                <div class="stat-label">Creators onboarded</div>
            </div>
            <div class="stat-item">
                <div class="stat-number">...</div>
                <div class="stat-label">Verified creators</div>
            </div>
            <div class="stat-item">
                <div class="stat-number">...</div>
                <div class="stat-label">Completed bookings</div>
            </div>
        </div>

        <div class="section">
            <div class="container">
                <div class="section-header">
                    <h2>Featured creators</h2>
                    <a href="#" class="see-all" onclick="navigateToPage('discover'); return false;">See all →</a>
                </div>
                <div class="creators-carousel" id="featuredCreators">
                    <div class="text-center" style="padding: 40px 20px;">
                        <p class="text-secondary">Loading featured creators...</p>
                    </div>
                </div>
            </div>
        </div>

        <div class="section">
            <div class="container">
                <h2 class="mb-lg">Browse by category</h2>
                <div class="category-grid" id="categoryGrid">
                    <div class="text-center" style="padding: 40px 20px; grid-column: 1 / -1;">
                        <p class="text-secondary">Loading categories...</p>
                    </div>
                </div>
            </div>
        </div>
    `;

    // Load real data from API
    await loadHomePageData();
}

async function loadHomePageData() {
    try {
        // Load stats and featured creators in parallel
        const [statsResponse, featuredResponse] = await Promise.all([
            api.getPlatformStats(),
            api.getFeaturedCreators(8)
        ]);

        if (statsResponse.success) {
            platformStats = statsResponse.data;
            updateStatsRibbon();
            updateCategoryGrid();
        }

        if (featuredResponse.success) {
            featuredCreators = featuredResponse.data || [];
            updateFeaturedCreators();
        }
    } catch (error) {
        console.error('Failed to load homepage data:', error);
        // Show error states or fallback to minimal display
    }
}

function updateStatsRibbon() {
    const statsRibbon = document.getElementById('statsRibbon');
    if (!statsRibbon || !platformStats) return;

    statsRibbon.innerHTML = `
        <div class="stat-item">
            <div class="stat-number">${platformStats.totalCreators.toLocaleString()}+</div>
            <div class="stat-label">Creators onboarded</div>
        </div>
        <div class="stat-item">
            <div class="stat-number">${platformStats.verifiedCreators.toLocaleString()}+</div>
            <div class="stat-label">Verified creators</div>
        </div>
        <div class="stat-item">
            <div class="stat-number">${platformStats.completedBookings.toLocaleString()}+</div>
            <div class="stat-label">Completed bookings</div>
        </div>
    `;
}

function updateFeaturedCreators() {
    const featuredContainer = document.getElementById('featuredCreators');
    if (!featuredContainer) return;

    if (featuredCreators.length > 0) {
        // Store featured creators in appState for click handlers
        appState.creators = featuredCreators;
        featuredContainer.innerHTML = renderCreatorCards(featuredCreators);
        setupCreatorCardListeners();
    } else {
        featuredContainer.innerHTML = `
            <div class="text-center" style="padding: 40px 20px;">
                <p class="text-secondary">No featured creators yet</p>
            </div>
        `;
    }
}

function updateCategoryGrid() {
    const categoryGrid = document.getElementById('categoryGrid');
    if (!categoryGrid || !platformStats) return;

    categoryGrid.innerHTML = renderCategories(platformStats.categories);
}
