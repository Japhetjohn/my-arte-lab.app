// Home Page Module
import { appState } from '../state.js';
import { renderCreatorCards, setupCreatorCardListeners, renderCategories } from '../components/creators.js';

export function renderHomePage() {
    const mainContent = document.getElementById('mainContent');
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

        <div class="stats-ribbon">
            <div class="stat-item">
                <div class="stat-number">2,500+</div>
                <div class="stat-label">Creators onboarded</div>
            </div>
            <div class="stat-item">
                <div class="stat-number">1,200+</div>
                <div class="stat-label">Verified creators</div>
            </div>
            <div class="stat-item">
                <div class="stat-number">5,000+</div>
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
                    ${renderCreatorCards(appState.creators)}
                </div>
            </div>
        </div>

        <div class="section">
            <div class="container">
                <h2 class="mb-lg">Browse by category</h2>
                <div class="category-grid">
                    ${renderCategories()}
                </div>
            </div>
        </div>
    `;

    setupCreatorCardListeners();
}
