import api from '../services/api.js';
import { appState } from '../state.js';

export async function renderProjectsPage() {
    const mainContent = document.getElementById('mainContent');

    // Show loading state
    mainContent.innerHTML = `
        <div style="max-width: 680px; margin: 0 auto; padding: 40px 20px;">
            <div style="text-align: center; padding: 60px 20px;">
                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" style="opacity: 0.3; margin-bottom: 16px; animation: spin 1s linear infinite; color: var(--primary);">
                    <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="2"/>
                    <path d="M12 6v6l4 2" stroke="currentColor" stroke-width="2"/>
                </svg>
                <p style="color: var(--text-secondary); font-weight: 500; font-size: 14px;">Curating projects...</p>
            </div>
        </div>
    `;

    try {
        const response = await api.getProjects();

        if (!response.success) {
            throw new Error(response.message || 'Failed to load projects');
        }

        const projects = response.data.projects || [];

        mainContent.innerHTML = `
            <div style="max-width: 680px; margin: 0 auto; padding: 32px 20px 60px; display: flex; flex-direction: column; gap: 32px;">
                <!-- Header -->
                <div style="display: flex; justify-content: space-between; align-items: flex-end;">
                    <div>
                        <h1 style="font-size: 32px; font-weight: 800; color: var(--text-primary); margin: 0 0 8px; letter-spacing: -0.02em;">Projects</h1>
                        <p style="font-size: 15px; color: var(--text-secondary); opacity: 0.7; margin: 0;">Discover premium opportunities worldwide.</p>
                    </div>
                    ${appState.user ? `
                        <button class="btn-primary" onclick="window.showPostProjectModal()" style="display: flex; align-items: center; gap: 8px; padding: 10px 20px; font-weight: 700; border-radius: 12px; font-size: 14px;">
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M12 5v14M5 12h14" stroke-linecap="round"/></svg>
                            Post Project
                        </button>
                    ` : ''}
                </div>

                <!-- Stats Grid - Simplified -->
                <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px;">
                    <div style="background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.08); border-radius: 20px; padding: 16px; text-align: center;">
                        <div style="font-size: 10px; font-weight: 800; color: var(--text-secondary); text-transform: uppercase; letter-spacing: 0.1em; opacity: 0.6; margin-bottom: 4px;">Total</div>
                        <div style="font-size: 20px; font-weight: 800; color: var(--text-primary);">${projects.length}</div>
                    </div>
                    <div style="background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.08); border-radius: 20px; padding: 16px; text-align: center;">
                        <div style="font-size: 10px; font-weight: 800; color: var(--text-secondary); text-transform: uppercase; letter-spacing: 0.1em; opacity: 0.6; margin-bottom: 4px;">Open</div>
                        <div style="font-size: 20px; font-weight: 800; color: var(--success);">${projects.filter(p => p.status === 'open').length}</div>
                    </div>
                    <div style="background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.08); border-radius: 20px; padding: 16px; text-align: center;">
                        <div style="font-size: 10px; font-weight: 800; color: var(--text-secondary); text-transform: uppercase; letter-spacing: 0.1em; opacity: 0.6; margin-bottom: 4px;">Sectors</div>
                        <div style="font-size: 20px; font-weight: 800; color: var(--primary);">${new Set(projects.map(p => p.category)).size}</div>
                    </div>
                </div>

                <!-- Filters -->
                <div style="display: flex; flex-direction: column; gap: 16px;">
                    <style>
                        .pj-filter-chip { 
                            padding: 8px 16px; border-radius: 10px; background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.08); 
                            color: var(--text-secondary); font-size: 13px; font-weight: 700; cursor: pointer; transition: all 0.2s;
                        }
                        .pj-filter-chip:hover { background: rgba(151, 71, 255, 0.08); color: var(--text-primary); }
                        .pj-filter-chip.active { background: var(--primary); border-color: var(--primary); color: white; }
                    </style>
                    <div style="display: flex; flex-wrap: wrap; gap: 8px;">
                        <button class="pj-filter-chip active" data-filter="all" data-type="category">All</button>
                        <button class="pj-filter-chip" data-filter="photography" data-type="category">Photography</button>
                        <button class="pj-filter-chip" data-filter="videography" data-type="category">Videography</button>
                        <button class="pj-filter-chip" data-filter="design" data-type="category">UI/UX</button>
                        <button class="pj-filter-chip" data-filter="illustration" data-type="category">Illustration</button>
                    </div>
                </div>

                <!-- Projects Grid -->
                <div id="projectsGrid" style="display: flex; flex-direction: column; gap: 20px;">
                    ${projects.length > 0 ? renderProjectCards(projects) : renderEmptyState()}
                </div>
            </div>
        `;

        setupFilterListeners();
        setupProjectCardListeners();

    } catch (error) {
        console.error('Error loading projects:', error);
        mainContent.innerHTML = `
            <div style="max-width: 680px; margin: 0 auto; padding: 100px 20px; text-align: center;">
                <div style="font-size: 40px; margin-bottom: 20px;">😕</div>
                <h3 style="color: var(--text-primary); font-weight: 800; margin-bottom: 12px;">Failed to load projects</h3>
                <p style="color: var(--text-secondary); font-size: 14px; margin-bottom: 24px;">${error.message}</p>
                <button class="btn-primary" onclick="window.navigateToPage('projects')">Try Again</button>
            </div>
        `;
    }
}

function renderProjectCards(projects) {
    if (!projects || projects.length === 0) {
        return renderEmptyState();
    }

    return projects.map(project => `
        <div class="project-card-modern" data-project-id="${project._id}" style="background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.08); border-radius: 20px; padding: 24px; transition: all 0.3s; cursor: pointer; position: relative;">
            <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 20px;">
                <div style="display: flex; align-items: center; gap: 12px;">
                    <img src="${project.clientId?.avatar || 'https://ui-avatars.com/api/?name=' + encodeURIComponent(project.clientId?.name || 'Client')}" 
                         style="width: 40px; height: 40px; border-radius: 12px; object-fit: cover; border: 1px solid rgba(255,255,255,0.1);">
                    <div>
                        <div style="font-size: 14px; font-weight: 700; color: var(--text-primary);">${project.clientId?.name || 'Client'}</div>
                        <div style="font-size: 11px; color: var(--text-secondary); opacity: 0.6;">${formatTimeAgo(project.createdAt)}</div>
                    </div>
                </div>
                <div style="background: ${getProjectTypeBadgeColor(project.projectType)}15; color: ${getProjectTypeBadgeColor(project.projectType)}; padding: 6px 12px; border-radius: 10px; font-size: 10px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.05em; border: 1px solid ${getProjectTypeBadgeColor(project.projectType)}30;">
                    ${project.projectType.replace('-', ' ')}
                </div>
            </div>

            <h3 style="font-size: 18px; font-weight: 800; color: var(--text-primary); margin-bottom: 12px; line-height: 1.4; letter-spacing: -0.01em;">${project.title}</h3>
            
            <p style="font-size: 14px; color: var(--text-secondary); line-height: 1.6; margin-bottom: 20px; opacity: 0.8; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden;">${project.description}</p>

            <div style="display: flex; flex-wrap: wrap; gap: 8px; margin-bottom: 24px;">
                ${(project.skillsRequired || []).slice(0, 3).map(skill => `
                    <span style="background: rgba(151, 71, 255, 0.08); color: var(--primary); padding: 5px 12px; border-radius: 8px; font-size: 11px; font-weight: 700; border: 1px solid rgba(151, 71, 255, 0.15);">${skill}</span>
                `).join('')}
            </div>

            <div style="display: flex; justify-content: space-between; align-items: flex-end; padding-top: 16px; border-top: 1px solid rgba(255,255,255,0.06);">
                <div>
                    <div style="font-size: 10px; font-weight: 800; color: var(--text-secondary); text-transform: uppercase; letter-spacing: 0.1em; opacity: 0.5; margin-bottom: 4px;">Budget Range</div>
                    <div style="font-size: 17px; font-weight: 800; color: var(--success);">$${project.budget.min.toLocaleString()} - $${project.budget.max.toLocaleString()}</div>
                </div>
                <div style="text-align: right;">
                    <div style="font-size: 10px; font-weight: 800; color: var(--text-secondary); text-transform: uppercase; letter-spacing: 0.1em; opacity: 0.5; margin-bottom: 4px;">Timeline</div>
                    <div style="font-size: 13px; font-weight: 700; color: var(--text-primary); display: flex; align-items: center; justify-content: flex-end; gap: 6px;">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" style="opacity: 0.6;"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg>
                        ${formatTimeline(project.timeline)}
                    </div>
                </div>
            </div>
        </div>
    `).join('');
}

function renderEmptyState() {
    return `
        <div style="padding: 60px 20px; text-align: center; background: rgba(255,255,255,0.02); border: 1px solid rgba(255,255,255,0.08); border-radius: 20px;">
            <div style="font-size: 40px; margin-bottom: 20px;">🔍</div>
            <h3 style="font-size: 18px; font-weight: 800; color: var(--text-primary); margin-bottom: 8px;">No projects found</h3>
            <p style="color: var(--text-secondary); font-size: 14px; margin-bottom: 24px; opacity: 0.7;">Try adjusting your filters to find more opportunities.</p>
            ${appState.user ? `
                <button class="btn-primary" onclick="window.showPostProjectModal()">Post a Project</button>
            ` : ''}
        </div>
    `;
}

let currentFilters = {
    category: '',
    projectType: '',
    timeline: ''
};

function setupFilterListeners() {
    document.querySelectorAll('.pj-filter-chip').forEach(chip => {
        chip.addEventListener('click', async (e) => {
            const filter = e.currentTarget.dataset.filter;
            const filterType = e.currentTarget.dataset.type;

            document.querySelectorAll(`.pj-filter-chip[data-type="${filterType}"]`).forEach(c => c.classList.remove('active'));
            e.currentTarget.classList.add('active');

            currentFilters[filterType] = filter === 'all' ? '' : filter;
            await applyFilters();
        });
    });
}

async function applyFilters() {
    try {
        const response = await api.getProjects(currentFilters);
        const projects = response.data.projects || [];
        document.getElementById('projectsGrid').innerHTML = renderProjectCards(projects);
        setupProjectCardListeners();
    } catch (error) {
        console.error('Error filtering projects:', error);
    }
}

function setupProjectCardListeners() {
    document.querySelectorAll('.project-card-modern').forEach(card => {
        card.addEventListener('click', () => {
            const projectId = card.dataset.projectId;
            window.showProjectDetail(projectId);
        });
    });
}

function getProjectTypeBadgeColor(type) {
    const colors = {
        'one-time': '#9747FF',
        'ongoing': '#10B981',
        'bounty': '#F59E0B'
    };
    return colors[type] || '#var(--text-secondary)';
}

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

window.renderProjectsPage = renderProjectsPage;