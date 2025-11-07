// Discover Page Module
import { appState } from '../state.js';
import { renderCreatorCards, setupCreatorCardListeners } from '../components/creators.js';

export function renderDiscoverPage() {
    const mainContent = document.getElementById('mainContent');
    mainContent.innerHTML = `
        <div class="discover-header">
            <div class="container">
                <div class="search-bar">
                    <input type="text" class="search-input" placeholder="Search by service, city, style, e.g. wedding photographer Lagos" id="discoverSearch">
                    <button class="btn-primary">Search</button>
                </div>
                <div class="filters-row">
                    <button class="filter-chip active">All</button>
                    <button class="filter-chip">Photographers</button>
                    <button class="filter-chip">Designers</button>
                    <button class="filter-chip">Lagos</button>
                    <button class="filter-chip">Accra</button>
                    <button class="filter-chip">Nairobi</button>
                    <button class="filter-chip">Verified only</button>
                    <button class="filter-chip">Available now</button>
                </div>
            </div>
        </div>

        <div class="section">
            <div class="container">
                <div class="section-header">
                    <h3>${appState.creators.length} creators found</h3>
                    <select class="form-select" style="width: auto;">
                        <option>Sort by relevance</option>
                        <option>Highest rated</option>
                        <option>Newest</option>
                        <option>Cheapest</option>
                    </select>
                </div>
                <div class="creators-grid" id="discoverGrid">
                    ${renderCreatorCards(appState.creators)}
                </div>
            </div>
        </div>
    `;

    setupCreatorCardListeners();
    setupFilterListeners();
}

function setupFilterListeners() {
    document.querySelectorAll('.filter-chip').forEach(chip => {
        chip.addEventListener('click', (e) => {
            e.currentTarget.classList.toggle('active');
        });
    });
}
