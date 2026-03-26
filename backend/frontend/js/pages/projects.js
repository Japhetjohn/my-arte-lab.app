import api from '../services/api.js';
import { appState } from '../state.js';

const PROJECTS_STYLES = `
<style>
    .pj-container { max-width: 720px; margin: 0 auto; padding: 24px 16px 60px; }
    @media (min-width: 768px) { .pj-container { padding: 32px 24px 60px; } }
    
    /* Header */
    .pj-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px; }
    .pj-header-title { font-size: 24px; font-weight: 800; color: var(--text-primary); }
    .pj-header-btn { display: flex; align-items: center; gap: 8px; padding: 10px 18px; background: var(--primary); color: white; border: none; border-radius: 12px; font-size: 14px; font-weight: 700; cursor: pointer; transition: all 0.2s; }
    .pj-header-btn:hover { background: #7c3aed; transform: translateY(-1px); }
    
    /* Filters */
    .pj-filters { display: flex; gap: 8px; overflow-x: auto; padding-bottom: 8px; margin-bottom: 20px; scrollbar-width: none; }
    .pj-filters::-webkit-scrollbar { display: none; }
    .pj-filter { flex-shrink: 0; padding: 8px 16px; border-radius: 20px; font-size: 13px; font-weight: 600; cursor: pointer; transition: all 0.2s; background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.08); color: var(--text-secondary); }
    .pj-filter:hover { background: rgba(255,255,255,0.06); }
    .pj-filter.active { background: var(--primary); color: white; border-color: var(--primary); }
    
    /* Project Cards - Clean List Style */
    .pj-list { display: flex; flex-direction: column; gap: 12px; }
    .pj-card { background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.06); border-radius: 16px; padding: 20px; cursor: pointer; transition: all 0.2s; }
    .pj-card:hover { background: rgba(255,255,255,0.05); border-color: rgba(151, 71, 255, 0.2); }
    .pj-card-top { display: flex; align-items: flex-start; gap: 12px; margin-bottom: 12px; }
    .pj-card-avatar { width: 44px; height: 44px; border-radius: 12px; object-fit: cover; border: 1px solid rgba(255,255,255,0.1); flex-shrink: 0; }
    .pj-card-meta { flex: 1; min-width: 0; }
    .pj-card-client { font-size: 14px; font-weight: 700; color: var(--text-primary); margin-bottom: 2px; }
    .pj-card-time { font-size: 12px; color: var(--text-secondary); }
    .pj-card-badge { flex-shrink: 0; padding: 5px 10px; border-radius: 8px; font-size: 10px; font-weight: 800; text-transform: uppercase; }
    .pj-card-badge.one-time { background: rgba(151, 71, 255, 0.1); color: #9747FF; }
    .pj-card-badge.ongoing { background: rgba(16, 185, 129, 0.1); color: #10B981; }
    .pj-card-badge.bounty { background: rgba(245, 158, 11, 0.1); color: #F59E0B; }
    .pj-card-title { font-size: 16px; font-weight: 700; color: var(--text-primary); margin-bottom: 8px; line-height: 1.4; }
    .pj-card-desc { font-size: 14px; color: var(--text-secondary); line-height: 1.6; margin-bottom: 12px; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
    .pj-card-bottom { display: flex; align-items: center; justify-content: space-between; padding-top: 12px; border-top: 1px solid rgba(255,255,255,0.04); }
    .pj-card-budget { font-size: 15px; font-weight: 800; color: #10B981; }
    .pj-card-budget span { font-size: 12px; color: var(--text-secondary); font-weight: 500; }
    .pj-card-arrow { color: var(--text-secondary); transition: all 0.2s; }
    .pj-card:hover .pj-card-arrow { color: var(--primary); transform: translateX(4px); }
    
    /* Empty */
    .pj-empty { text-align: center; padding: 60px 20px; }
    .pj-empty-icon { width: 64px; height: 64px; background: rgba(151, 71, 255, 0.05); border-radius: 20px; display: flex; align-items: center; justify-content: center; margin: 0 auto 16px; color: var(--primary); }
    .pj-empty-title { font-size: 16px; font-weight: 700; color: var(--text-primary); margin-bottom: 4px; }
    .pj-empty-text { font-size: 14px; color: var(--text-secondary); }
    
    /* Footer */
    .pj-footer { margin-top: 40px; padding-top: 32px; border-top: 1px solid rgba(255,255,255,0.06); }
    .pj-footer-brand { text-align: center; margin-bottom: 24px; }
    .pj-footer-logo { font-size: 20px; font-weight: 800; background: linear-gradient(135deg, var(--primary), var(--secondary)); -webkit-background-clip: text; -webkit-text-fill-color: transparent; margin-bottom: 8px; }
    .pj-footer-text { font-size: 13px; color: var(--text-secondary); }
    .pj-footer-links { display: flex; justify-content: center; gap: 24px; flex-wrap: wrap; margin-bottom: 24px; }
    .pj-footer-links a { font-size: 13px; color: var(--text-secondary); text-decoration: none; transition: color 0.2s; }
    .pj-footer-links a:hover { color: var(--primary); }
    .pj-footer-copy { text-align: center; font-size: 12px; color: var(--text-secondary); opacity: 0.7; }
</style>
`;

function renderFooter() {
    return `
        <footer class="pj-footer">
            <div class="pj-footer-brand">
                <div class="pj-footer-logo">MyArteLab</div>
                <div class="pj-footer-text">Empowering African creators worldwide</div>
            </div>
            <div class="pj-footer-links">
                <a href="/#/about">About</a>
                <a href="/#/help">Help</a>
                <a href="/#/privacy">Privacy</a>
                <a href="/#/terms">Terms</a>
            </div>
            <div class="pj-footer-copy">&copy; 2026 MyArteLab. All rights reserved.</div>
        </footer>
    `;
}

function renderSkeleton() {
    return `
        <div class="pj-container">
            <div class="pj-header">
                <div class="skeleton" style="width: 120px; height: 32px; border-radius: 8px;"></div>
                <div class="skeleton" style="width: 100px; height: 40px; border-radius: 12px;"></div>
            </div>
            <div class="pj-filters">
                ${Array(5).fill(0).map(() => `<div class="skeleton" style="width: 80px; height: 32px; border-radius: 20px; flex-shrink: 0;"></div>`).join('')}
            </div>
            <div class="pj-list">
                ${Array(4).fill(0).map(() => `
                    <div class="skeleton" style="height: 160px; border-radius: 16px;"></div>
                `).join('')}
            </div>
        </div>
    `;
}

let currentFilters = { category: '' };

export async function renderProjectsPage() {
    const mainContent = document.getElementById('mainContent');
    mainContent.innerHTML = PROJECTS_STYLES + renderSkeleton();

    try {
        const response = await api.getProjects();
        if (!response.success) throw new Error(response.message);
        renderProjectsList(response.data.projects || []);
    } catch (error) {
        mainContent.innerHTML = PROJECTS_STYLES + `
            <div class="pj-container">
                <div class="pj-empty">
                    <div class="pj-empty-icon">⚠️</div>
                    <div class="pj-empty-title">Failed to load</div>
                    <div class="pj-empty-text">${error.message}</div>
                </div>
            </div>
        `;
    }
}

function renderProjectsList(projects) {
    const mainContent = document.getElementById('mainContent');
    
    mainContent.innerHTML = PROJECTS_STYLES + `
        <div class="pj-container">
            <div class="pj-header">
                <h1 class="pj-header-title">Projects</h1>
                ${appState.user ? `
                    <button class="pj-header-btn" onclick="window.showPostProjectModal()">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M12 5v14M5 12h14" stroke-linecap="round"/></svg>
                        Post
                    </button>
                ` : ''}
            </div>

            <div class="pj-filters">
                <div class="pj-filter ${!currentFilters.category ? 'active' : ''}" onclick="window.filterProjects('')">All</div>
                <div class="pj-filter ${currentFilters.category === 'photography' ? 'active' : ''}" onclick="window.filterProjects('photography')">Photo</div>
                <div class="pj-filter ${currentFilters.category === 'videography' ? 'active' : ''}" onclick="window.filterProjects('videography')">Video</div>
                <div class="pj-filter ${currentFilters.category === 'design' ? 'active' : ''}" onclick="window.filterProjects('design')">Design</div>
                <div class="pj-filter ${currentFilters.category === 'illustration' ? 'active' : ''}" onclick="window.filterProjects('illustration')">Illustration</div>
            </div>

            <div class="pj-list" id="projectsList">
                ${projects.length ? projects.map(p => renderProjectCard(p)).join('') : renderEmpty()}
            </div>

            ${renderFooter()}
        </div>
    `;

    setupListeners();
}

function renderProjectCard(project) {
    return `
        <div class="pj-card" data-id="${project._id}">
            <div class="pj-card-top">
                <img src="${project.clientId?.avatar || 'https://ui-avatars.com/api/?name=' + encodeURIComponent(project.clientId?.name || 'C')}" class="pj-card-avatar">
                <div class="pj-card-meta">
                    <div class="pj-card-client">${project.clientId?.name || 'Client'}</div>
                    <div class="pj-card-time">${formatTimeAgo(project.createdAt)}</div>
                </div>
                <span class="pj-card-badge ${project.projectType}">${project.projectType.replace('-', ' ')}</span>
            </div>
            <h3 class="pj-card-title">${project.title}</h3>
            <p class="pj-card-desc">${project.description}</p>
            <div class="pj-card-bottom">
                <div class="pj-card-budget">$${project.budget.min.toLocaleString()} <span>to $${project.budget.max.toLocaleString()}</span></div>
                <svg class="pj-card-arrow" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 18l6-6-6-6"/></svg>
            </div>
        </div>
    `;
}

function renderEmpty() {
    return `
        <div class="pj-empty">
            <div class="pj-empty-icon">
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/></svg>
            </div>
            <div class="pj-empty-title">No projects found</div>
            <div class="pj-empty-text">Check back later for new opportunities</div>
        </div>
    `;
}

function setupListeners() {
    document.querySelectorAll('.pj-card').forEach(card => {
        card.addEventListener('click', () => window.showProjectDetail(card.dataset.id));
    });
}

window.filterProjects = async function (category) {
    currentFilters.category = category;
    
    // Update active filter
    document.querySelectorAll('.pj-filter').forEach(f => {
        f.classList.toggle('active', 
            (!category && f.textContent === 'All') || 
            f.textContent.toLowerCase().includes(category?.slice(0, 4) || '')
        );
    });

    // Show skeleton in list
    const list = document.getElementById('projectsList');
    if (list) {
        list.innerHTML = Array(3).fill(0).map(() => `
            <div class="skeleton" style="height: 160px; border-radius: 16px;"></div>
        `).join('');
    }

    try {
        const res = await api.getProjects(currentFilters);
        const projects = res.data.projects || [];
        if (list) {
            list.innerHTML = projects.length ? projects.map(p => renderProjectCard(p)).join('') : renderEmpty();
            setupListeners();
        }
    } catch (e) {
        console.error('Filter error:', e);
    }
};

function formatTimeAgo(date) {
    const seconds = Math.floor((new Date() - new Date(date)) / 1000);
    const intervals = { year: 31536000, month: 2592000, week: 604800, day: 86400, hour: 3600, minute: 60 };
    for (const [k, v] of Object.entries(intervals)) {
        const i = Math.floor(seconds / v);
        if (i >= 1) return `${i} ${k}${i > 1 ? 's' : ''} ago`;
    }
    return 'Just now';
}

window.renderProjectsPage = renderProjectsPage;
