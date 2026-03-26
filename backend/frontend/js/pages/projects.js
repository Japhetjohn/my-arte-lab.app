import api from '../services/api.js';
import { appState } from '../state.js';

const PROJECTS_STYLES = `
<style>
    .pj-container { max-width: 680px; margin: 0 auto; padding: 32px 20px 60px; display: flex; flex-direction: column; gap: 32px; }
    @media (max-width: 768px) { .pj-container { padding: 24px 16px; } }
    
    .pj-title { font-size: 26px; font-weight: 700; color: var(--text-primary); margin: 0 0 4px; }
    .pj-subtitle { color: var(--text-secondary); font-size: 15px; margin: 0; }
    
    .pj-section { background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.08); border-radius: 24px; padding: 24px; }
    .pj-section-title { font-size: 16px; font-weight: 700; color: var(--text-primary); margin-bottom: 20px; display: flex; align-items: center; gap: 10px; }
    
    /* Stats Grid */
    .pj-stats-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; }
    @media (max-width: 480px) { .pj-stats-grid { grid-template-columns: repeat(2, 1fr); } }
    .pj-stat-card { background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.08); border-radius: 20px; padding: 20px; text-align: center; }
    .pj-stat-label { font-size: 11px; font-weight: 700; color: var(--text-secondary); text-transform: uppercase; letter-spacing: 0.1em; margin-bottom: 8px; }
    .pj-stat-value { font-size: 24px; font-weight: 800; color: var(--text-primary); }
    .pj-stat-value.open { color: #10B981; }
    .pj-stat-value.sectors { color: var(--primary); }
    
    /* Filter Tabs */
    .pj-filter-tabs { display: flex; gap: 8px; flex-wrap: wrap; }
    .pj-filter-tab { padding: 10px 18px; border-radius: 20px; font-size: 13px; font-weight: 600; cursor: pointer; transition: all 0.2s; background: transparent; border: 1px solid rgba(255,255,255,0.08); color: var(--text-secondary); }
    .pj-filter-tab:hover { background: rgba(255,255,255,0.05); }
    .pj-filter-tab.active { background: var(--primary); color: white; border-color: var(--primary); }
    
    /* Project Cards */
    .pj-list { display: flex; flex-direction: column; gap: 16px; }
    .pj-card { background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.08); border-radius: 20px; padding: 24px; cursor: pointer; transition: all 0.2s; }
    .pj-card:hover { background: rgba(255,255,255,0.05); border-color: rgba(151, 71, 255, 0.2); transform: translateY(-2px); }
    .pj-card-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 16px; }
    .pj-card-author { display: flex; align-items: center; gap: 12px; }
    .pj-card-avatar { width: 40px; height: 40px; border-radius: 12px; object-fit: cover; border: 1px solid rgba(255,255,255,0.1); }
    .pj-card-author-info { display: flex; flex-direction: column; }
    .pj-card-author-name { font-size: 14px; font-weight: 700; color: var(--text-primary); }
    .pj-card-author-time { font-size: 11px; color: var(--text-secondary); }
    .pj-card-type { padding: 6px 12px; border-radius: 10px; font-size: 10px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.05em; }
    .pj-card-type.one-time { background: rgba(151, 71, 255, 0.1); color: #9747FF; border: 1px solid rgba(151, 71, 255, 0.2); }
    .pj-card-type.ongoing { background: rgba(16, 185, 129, 0.1); color: #10B981; border: 1px solid rgba(16, 185, 129, 0.2); }
    .pj-card-type.bounty { background: rgba(245, 158, 11, 0.1); color: #F59E0B; border: 1px solid rgba(245, 158, 11, 0.2); }
    
    .pj-card-title { font-size: 17px; font-weight: 700; color: var(--text-primary); margin-bottom: 8px; line-height: 1.4; }
    .pj-card-desc { font-size: 14px; color: var(--text-secondary); line-height: 1.6; margin-bottom: 16px; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
    .pj-card-skills { display: flex; flex-wrap: wrap; gap: 8px; margin-bottom: 20px; }
    .pj-card-skill { background: rgba(151, 71, 255, 0.08); color: var(--primary); padding: 5px 12px; border-radius: 8px; font-size: 11px; font-weight: 700; border: 1px solid rgba(151, 71, 255, 0.15); }
    .pj-card-footer { display: flex; justify-content: space-between; align-items: center; padding-top: 16px; border-top: 1px solid rgba(255,255,255,0.06); }
    .pj-card-budget-label { font-size: 10px; color: var(--text-secondary); text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 4px; }
    .pj-card-budget { font-size: 16px; font-weight: 800; color: #10B981; }
    .pj-card-timeline { display: flex; align-items: center; gap: 6px; font-size: 13px; color: var(--text-secondary); }
    
    /* Empty State */
    .pj-empty { text-align: center; padding: 60px 20px; background: rgba(255,255,255,0.02); border: 1px solid rgba(255,255,255,0.08); border-radius: 20px; }
    .pj-empty-icon { width: 64px; height: 64px; background: rgba(151, 71, 255, 0.05); border: 1px solid rgba(151, 71, 255, 0.1); border-radius: 20px; display: flex; align-items: center; justify-content: center; margin: 0 auto 20px; color: var(--primary); }
    .pj-empty-title { font-size: 16px; font-weight: 700; color: var(--text-primary); margin-bottom: 8px; }
    .pj-empty-text { font-size: 14px; color: var(--text-secondary); margin-bottom: 24px; }
    
    /* Modal Styles - Matching Bookings */
    .pj-modal-overlay { position: fixed; inset: 0; background: rgba(15, 23, 36, 0.6); backdrop-filter: blur(8px); z-index: 1000; display: flex; align-items: center; justify-content: center; padding: 20px; }
    .pj-modal { background: var(--surface); border: 1px solid rgba(255,255,255,0.08); border-radius: 24px; max-width: 600px; width: 100%; max-height: 90vh; overflow: hidden; display: flex; flex-direction: column; }
    [data-theme="dark"] .pj-modal { background: #1E293B; }
    .pj-modal-header { display: flex; align-items: center; justify-content: space-between; padding: 20px 24px; border-bottom: 1px solid rgba(255,255,255,0.06); }
    .pj-modal-title { font-size: 18px; font-weight: 700; color: var(--text-primary); }
    .pj-modal-close { width: 36px; height: 36px; border-radius: 10px; border: none; background: rgba(255,255,255,0.05); color: var(--text-secondary); cursor: pointer; display: flex; align-items: center; justify-content: center; transition: all 0.2s; }
    .pj-modal-close:hover { background: rgba(255,255,255,0.1); color: var(--text-primary); }
    .pj-modal-body { padding: 24px; overflow-y: auto; flex: 1; }
    
    /* Info Cards */
    .pj-info-card { background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.06); border-radius: 16px; padding: 20px; margin-bottom: 16px; }
    .pj-info-label { font-size: 11px; font-weight: 700; color: var(--text-secondary); text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 12px; }
    .pj-info-row { display: flex; align-items: center; gap: 12px; }
    .pj-info-avatar { width: 48px; height: 48px; border-radius: 14px; object-fit: cover; border: 1px solid rgba(255,255,255,0.1); }
    .pj-info-name { font-weight: 700; color: var(--text-primary); font-size: 15px; }
    .pj-info-sub { font-size: 12px; color: var(--text-secondary); }
    .pj-info-amount { font-size: 24px; font-weight: 800; color: var(--primary); }
    .pj-info-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 12px; }
    
    /* Form Elements */
    .pj-input { width: 100%; background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.08); border-radius: 12px; padding: 12px 16px; color: var(--text-primary); font-size: 14px; outline: none; transition: all 0.2s; }
    .pj-input:focus { border-color: var(--primary); background: rgba(255,255,255,0.05); }
    .pj-textarea { min-height: 100px; resize: vertical; }
    .pj-select { appearance: none; background-image: url('data:image/svg+xml,%3Csvg width=%2212%22 height=%2212%22 viewBox=%220 0 24 24%22 fill=%22none%22 stroke=%22%2394A3B8%22 stroke-width=%222%22%3E%3Cpath d=%22M6 9l6 6 6-6%22/%3E%3C/svg%3E'); background-repeat: no-repeat; background-position: right 16px center; padding-right: 40px; }
    .pj-label { font-size: 11px; font-weight: 700; color: var(--text-secondary); text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 8px; display: block; }
    
    /* Tags */
    .pj-tag { display: inline-flex; align-items: center; gap: 6px; background: rgba(151, 71, 255, 0.08); color: var(--primary); padding: 6px 12px; border-radius: 8px; font-size: 12px; font-weight: 600; border: 1px solid rgba(151, 71, 255, 0.15); }
    .pj-tag-remove { background: none; border: none; color: var(--primary); cursor: pointer; padding: 0; font-size: 14px; line-height: 1; }
    .pj-tags-container { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 8px; }
    
    /* Buttons */
    .pj-btn { padding: 12px 24px; border-radius: 12px; font-size: 14px; font-weight: 700; cursor: pointer; transition: all 0.2s; border: none; display: inline-flex; align-items: center; justify-content: center; gap: 8px; }
    .pj-btn-primary { background: var(--primary); color: white; }
    .pj-btn-primary:hover { background: #7c3aed; transform: translateY(-1px); }
    .pj-btn-secondary { background: rgba(255,255,255,0.05); color: var(--text-primary); border: 1px solid rgba(255,255,255,0.1); }
    .pj-btn-secondary:hover { background: rgba(255,255,255,0.08); }
    .pj-btn-success { background: #10B981; color: white; }
    .pj-btn-success:hover { background: #059669; }
    .pj-btn-danger { background: #EF4444; color: white; }
    .pj-btn-ghost { background: transparent; color: var(--text-secondary); border: 1px solid rgba(255,255,255,0.1); }
    .pj-btn-full { width: 100%; }
    
    /* Application Cards */
    .pj-app-card { background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.06); border-radius: 20px; padding: 20px; margin-bottom: 16px; }
    .pj-app-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 16px; }
    .pj-app-creator { display: flex; align-items: center; gap: 12px; }
    .pj-app-avatar { width: 44px; height: 44px; border-radius: 12px; object-fit: cover; border: 1.5px solid var(--primary); }
    .pj-app-bid { text-align: right; }
    .pj-app-bid-amount { font-size: 20px; font-weight: 800; color: #10B981; }
    .pj-app-bid-time { font-size: 12px; color: var(--text-secondary); }
    .pj-app-letter { background: rgba(151, 71, 255, 0.03); border: 1px solid rgba(151, 71, 255, 0.1); border-radius: 12px; padding: 16px; margin-bottom: 16px; font-size: 14px; color: var(--text-secondary); line-height: 1.6; }
    .pj-app-actions { display: flex; gap: 12px; justify-content: flex-end; }
    
    /* Footer */
    .pj-footer { margin-top: 40px; padding-top: 40px; border-top: 1px solid rgba(255,255,255,0.06); }
    .pj-footer-content { display: grid; grid-template-columns: 1.5fr 1fr 1fr 1fr; gap: 40px; }
    @media (max-width: 768px) { .pj-footer-content { grid-template-columns: 1fr 1fr; gap: 24px; } }
    @media (max-width: 480px) { .pj-footer-content { grid-template-columns: 1fr; } }
    .pj-footer-brand { display: flex; flex-direction: column; gap: 16px; }
    .pj-footer-logo { font-size: 22px; font-weight: 800; background: linear-gradient(135deg, var(--primary), var(--secondary)); -webkit-background-clip: text; -webkit-text-fill-color: transparent; }
    .pj-footer-tagline { font-size: 13px; color: var(--text-secondary); line-height: 1.6; }
    .pj-footer-social { display: flex; gap: 12px; }
    .pj-footer-social a { width: 36px; height: 36px; border-radius: 10px; background: rgba(255,255,255,0.05); display: flex; align-items: center; justify-content: center; color: var(--text-secondary); transition: all 0.2s; }
    .pj-footer-social a:hover { background: var(--primary); color: white; }
    .pj-footer-column h4 { font-size: 13px; font-weight: 700; color: var(--text-primary); margin-bottom: 16px; text-transform: uppercase; letter-spacing: 0.05em; }
    .pj-footer-column a { display: block; font-size: 13px; color: var(--text-secondary); text-decoration: none; margin-bottom: 10px; transition: all 0.2s; }
    .pj-footer-column a:hover { color: var(--primary); }
    .pj-footer-bottom { display: flex; align-items: center; justify-content: space-between; margin-top: 32px; padding-top: 20px; border-top: 1px solid rgba(255,255,255,0.06); font-size: 12px; color: var(--text-secondary); }
    .pj-footer-bottom a { color: var(--text-secondary); text-decoration: none; }
    .pj-footer-bottom a:hover { color: var(--primary); }
    .pj-footer-dot { margin: 0 8px; opacity: 0.4; }
</style>
`;

function renderFooter() {
    return `
        <footer class="pj-footer">
            <div class="pj-footer-content">
                <div class="pj-footer-brand">
                    <div class="pj-footer-logo">MyArteLab</div>
                    <p class="pj-footer-tagline">Empowering African creators to showcase their talent and connect with clients worldwide.</p>
                    <div class="pj-footer-social">
                        <a href="https://x.com/myartelab" target="_blank" rel="noopener" aria-label="X (Twitter)">
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>
                        </a>
                        <a href="https://www.instagram.com/myartelab_" target="_blank" rel="noopener" aria-label="Instagram">
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="2" width="20" height="20" rx="5"/><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/><line x1="17.5" y1="6.5" x2="17.51" y2="6.5"/></svg>
                        </a>
                        <a href="https://linkedin.com/company/myartelab" target="_blank" rel="noopener" aria-label="LinkedIn">
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/></svg>
                        </a>
                    </div>
                </div>
                <div class="pj-footer-column">
                    <h4>Platform</h4>
                    <a href="/#/creators">Find Creators</a>
                    <a href="/#/auth?type=creator">Become a Creator</a>
                    <a href="/#/how-it-works">How it Works</a>
                    <a href="/#/pricing">Pricing</a>
                </div>
                <div class="pj-footer-column">
                    <h4>Company</h4>
                    <a href="/#/about">About Us</a>
                    <a href="/#/careers">Careers</a>
                    <a href="/#/blog">Blog</a>
                    <a href="/#/press">Press</a>
                </div>
                <div class="pj-footer-column">
                    <h4>Support</h4>
                    <a href="/#/help">Help Center</a>
                    <a href="/#/contact">Contact Us</a>
                    <a href="/#/safety">Safety</a>
                </div>
            </div>
            <div class="pj-footer-bottom">
                <span>&copy; 2026 MyArteLab. All rights reserved.</span>
                <div>
                    <a href="/#/privacy">Privacy Policy</a>
                    <span class="pj-footer-dot">•</span>
                    <a href="/#/terms">Terms of Service</a>
                </div>
            </div>
        </footer>
    `;
}

function renderSkeleton() {
    return `
        <div class="pj-container">
            <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 32px;">
                <div>
                    <div class="skeleton" style="width: 150px; height: 32px; border-radius: 8px; margin-bottom: 8px;"></div>
                    <div class="skeleton" style="width: 260px; height: 16px; border-radius: 6px;"></div>
                </div>
            </div>
            <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; margin-bottom: 24px;">
                <div class="skeleton" style="height: 90px; border-radius: 20px;"></div>
                <div class="skeleton" style="height: 90px; border-radius: 20px;"></div>
                <div class="skeleton" style="height: 90px; border-radius: 20px;"></div>
            </div>
            <div style="display: flex; gap: 8px; margin-bottom: 24px;">
                <div class="skeleton" style="width: 60px; height: 36px; border-radius: 20px;"></div>
                <div class="skeleton" style="width: 90px; height: 36px; border-radius: 20px;"></div>
                <div class="skeleton" style="width: 80px; height: 36px; border-radius: 20px;"></div>
            </div>
            <div style="display: flex; flex-direction: column; gap: 16px;">
                ${Array(3).fill(0).map(() => `
                    <div class="skeleton" style="height: 200px; border-radius: 20px;"></div>
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

        if (!response.success) {
            throw new Error(response.message || 'Failed to load projects');
        }

        const projects = response.data.projects || [];
        renderProjectsList(projects);

    } catch (error) {
        console.error('Error loading projects:', error);
        mainContent.innerHTML = PROJECTS_STYLES + `
            <div class="pj-container" style="text-align: center; padding-top: 80px;">
                <div style="width: 64px; height: 64px; background: rgba(239,68,68,0.1); border-radius: 20px; display: flex; align-items: center; justify-content: center; margin: 0 auto 16px;">
                    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" style="color: #EF4444;"><circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="2"/><path d="M12 8v4M12 16h.01" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>
                </div>
                <h3 style="margin-bottom: 8px; color: var(--text-primary);">Failed to load projects</h3>
                <p style="color: var(--text-secondary); margin-bottom: 20px;">${error.message}</p>
                <button class="pj-btn pj-btn-primary" onclick="window.renderProjectsPage()">Try Again</button>
            </div>
        `;
    }
}

function renderProjectsList(projects) {
    const mainContent = document.getElementById('mainContent');
    
    mainContent.innerHTML = PROJECTS_STYLES + `
        <div class="pj-container">
            <!-- Header -->
            <div style="display: flex; justify-content: space-between; align-items: flex-end;">
                <div>
                    <h1 class="pj-title">Projects</h1>
                    <p class="pj-subtitle">Discover premium opportunities worldwide</p>
                </div>
                ${appState.user ? `
                    <button class="pj-btn pj-btn-primary" onclick="window.showPostProjectModal()" style="height: 44px;">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M12 5v14M5 12h14" stroke-linecap="round"/></svg>
                        Post Project
                    </button>
                ` : ''}
            </div>

            <!-- Stats -->
            <div class="pj-stats-grid">
                <div class="pj-stat-card">
                    <div class="pj-stat-label">Total Projects</div>
                    <div class="pj-stat-value">${projects.length}</div>
                </div>
                <div class="pj-stat-card">
                    <div class="pj-stat-label">Open</div>
                    <div class="pj-stat-value open">${projects.filter(p => p.status === 'open').length}</div>
                </div>
                <div class="pj-stat-card">
                    <div class="pj-stat-label">Categories</div>
                    <div class="pj-stat-value sectors">${new Set(projects.map(p => p.category)).size}</div>
                </div>
            </div>

            <!-- Filters -->
            <div class="pj-filter-tabs">
                <div class="pj-filter-tab ${!currentFilters.category ? 'active' : ''}" onclick="window.filterProjects('')">All</div>
                <div class="pj-filter-tab ${currentFilters.category === 'photography' ? 'active' : ''}" onclick="window.filterProjects('photography')">Photography</div>
                <div class="pj-filter-tab ${currentFilters.category === 'videography' ? 'active' : ''}" onclick="window.filterProjects('videography')">Videography</div>
                <div class="pj-filter-tab ${currentFilters.category === 'design' ? 'active' : ''}" onclick="window.filterProjects('design')">Design</div>
                <div class="pj-filter-tab ${currentFilters.category === 'illustration' ? 'active' : ''}" onclick="window.filterProjects('illustration')">Illustration</div>
            </div>

            <!-- Projects List -->
            <div class="pj-list" id="projectsList">
                ${projects.length > 0 ? renderProjectCards(projects) : renderEmptyState()}
            </div>

            ${renderFooter()}
        </div>
    `;

    setupCardListeners();
}

function renderProjectCards(projects) {
    if (!projects.length) return renderEmptyState();

    return projects.map(project => `
        <div class="pj-card" data-project-id="${project._id}">
            <div class="pj-card-header">
                <div class="pj-card-author">
                    <img src="${project.clientId?.avatar || 'https://ui-avatars.com/api/?name=' + encodeURIComponent(project.clientId?.name || 'Client')}" 
                         class="pj-card-avatar" alt="${project.clientId?.name || 'Client'}">
                    <div class="pj-card-author-info">
                        <span class="pj-card-author-name">${project.clientId?.name || 'Client'}</span>
                        <span class="pj-card-author-time">${formatTimeAgo(project.createdAt)}</span>
                    </div>
                </div>
                <span class="pj-card-type ${project.projectType}">${project.projectType.replace('-', ' ')}</span>
            </div>
            
            <h3 class="pj-card-title">${project.title}</h3>
            <p class="pj-card-desc">${project.description}</p>
            
            <div class="pj-card-skills">
                ${(project.skillsRequired || []).slice(0, 4).map(skill => `
                    <span class="pj-card-skill">${skill}</span>
                `).join('')}
            </div>
            
            <div class="pj-card-footer">
                <div>
                    <div class="pj-card-budget-label">Budget</div>
                    <div class="pj-card-budget">$${project.budget.min.toLocaleString()} - $${project.budget.max.toLocaleString()}</div>
                </div>
                <div class="pj-card-timeline">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg>
                    ${formatTimeline(project.timeline)}
                </div>
            </div>
        </div>
    `).join('');
}

function renderEmptyState() {
    return `
        <div class="pj-empty">
            <div class="pj-empty-icon">
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/>
                </svg>
            </div>
            <div class="pj-empty-title">No projects found</div>
            <div class="pj-empty-text">Try adjusting your filters or check back later</div>
            ${appState.user ? `
                <button class="pj-btn pj-btn-primary" onclick="window.showPostProjectModal()">Post a Project</button>
            ` : ''}
        </div>
    `;
}

function setupCardListeners() {
    document.querySelectorAll('.pj-card').forEach(card => {
        card.addEventListener('click', () => {
            const projectId = card.dataset.projectId;
            window.showProjectDetail(projectId);
        });
    });
}

window.filterProjects = async function (category) {
    currentFilters.category = category;
    
    // Update UI
    document.querySelectorAll('.pj-filter-tab').forEach(tab => {
        tab.classList.remove('active');
        if ((!category && tab.textContent === 'All') || 
            (category && tab.textContent.toLowerCase().includes(category))) {
            tab.classList.add('active');
        }
    });

    // Show skeleton
    const listContainer = document.getElementById('projectsList');
    if (listContainer) {
        listContainer.innerHTML = `
            <div style="display: flex; flex-direction: column; gap: 16px;">
                ${Array(3).fill(0).map(() => `
                    <div class="skeleton" style="height: 200px; border-radius: 20px;"></div>
                `).join('')}
            </div>
        `;
    }

    try {
        const response = await api.getProjects(currentFilters);
        const projects = response.data.projects || [];
        
        if (listContainer) {
            listContainer.innerHTML = projects.length > 0 
                ? renderProjectCards(projects) 
                : renderEmptyState();
            setupCardListeners();
        }
    } catch (error) {
        console.error('Error filtering projects:', error);
    }
};

function formatTimeline(timeline) {
    const labels = {
        'urgent': 'Urgent',
        '1-week': '1 Week',
        '2-weeks': '2 Weeks',
        '1-month': '1 Month',
        '2-months': '2 Months',
        '3-months': '3 Months',
        'flexible': 'Flexible'
    };
    return labels[timeline] || timeline;
}

function formatTimeAgo(date) {
    const seconds = Math.floor((new Date() - new Date(date)) / 1000);
    const intervals = {
        year: 31536000, month: 2592000, week: 604800, day: 86400, hour: 3600, minute: 60
    };

    for (const [key, value] of Object.entries(intervals)) {
        const interval = Math.floor(seconds / value);
        if (interval >= 1) return `${interval} ${key}${interval > 1 ? 's' : ''} ago`;
    }
    return 'Just now';
}

// Make available globally
window.renderProjectsPage = renderProjectsPage;
