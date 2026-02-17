import api from '../services/api.js';
import { appState } from '../state.js';

export async function renderProjectsPage() {
    const mainContent = document.getElementById('mainContent');

    // Show loading state
    mainContent.innerHTML = `
        <div class="section">
            <div class="container">
                <div class="text-center glass-effect" style="padding: 60px 20px; border-radius: 24px; max-width: 400px; margin: 0 auto;">
                    <svg width="64" height="64" viewBox="0 0 24 24" fill="none" style="opacity: 0.8; margin-bottom: 16px; animation: spin 1s linear infinite; color: var(--primary);">
                        <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="2"/>
                        <path d="M12 6v6l4 2" stroke="currentColor" stroke-width="2"/>
                    </svg>
                    <p class="text-secondary" style="font-weight: 500;">Loading projects...</p>
                </div>
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
            <div class="section">
                <div class="container">
                    <div class="projects-header-modern glass-effect" style="border: 1px solid rgba(255,255,255,0.5); box-shadow: 0 8px 32px rgba(0,0,0,0.05);">
                        <div class="projects-header-content">
                            <div class="projects-icon-modern" style="background: linear-gradient(135deg, rgba(151, 71, 255, 0.8), rgba(107, 70, 255, 0.8)); backdrop-filter: blur(4px);">
                                <svg width="32" height="32" viewBox="0 0 24 24" fill="none">
                                    <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" stroke="currentColor" stroke-width="2"/>
                                </svg>
                            </div>
                            <div class="projects-header-text">
                                <h1 class="projects-title-modern">Browse Projects</h1>
                                <p class="projects-subtitle-modern">Find opportunities and apply to projects from clients worldwide</p>
                            </div>
                            ${appState.user ? `
                                <button class="btn-primary-modern post-project-btn" onclick="window.showPostProjectModal()">
                                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                                        <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="2"/>
                                        <path d="M12 8v8M8 12h8" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
                                    </svg>
                                    Post Project
                                </button>
                            ` : ''}
                        </div>
                    </div>

                    <div class="projects-stats-grid">
                        <div class="stat-card-project glass-effect" style="background: rgba(255,255,255,0.4); border: 1px solid rgba(255,255,255,0.5);">
                            <div class="stat-icon-project total" style="opacity: 0.9;">
                                <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                                    <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" stroke="currentColor" stroke-width="2"/>
                                </svg>
                            </div>
                            <div class="stat-details-project">
                                <div class="stat-label-project">Total Projects</div>
                                <div class="stat-value-project">${projects.length}</div>
                            </div>
                        </div>
                        <div class="stat-card-project glass-effect" style="background: rgba(255,255,255,0.4); border: 1px solid rgba(255,255,255,0.5);">
                            <div class="stat-icon-project active" style="opacity: 0.9;">
                                <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                                    <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="2"/>
                                    <path d="M12 6v6l4 2" stroke="currentColor" stroke-width="2"/>
                                </svg>
                            </div>
                            <div class="stat-details-project">
                                <div class="stat-label-project">Active Projects</div>
                                <div class="stat-value-project">${projects.filter(p => p.status === 'open').length}</div>
                            </div>
                        </div>
                        <div class="stat-card-project glass-effect" style="background: rgba(255,255,255,0.4); border: 1px solid rgba(255,255,255,0.5);">
                            <div class="stat-icon-project categories" style="opacity: 0.9;">
                                <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                                    <rect x="3" y="3" width="7" height="7" stroke="currentColor" stroke-width="2"/>
                                    <rect x="14" y="3" width="7" height="7" stroke="currentColor" stroke-width="2"/>
                                    <rect x="14" y="14" width="7" height="7" stroke="currentColor" stroke-width="2"/>
                                    <rect x="3" y="14" width="7" height="7" stroke="currentColor" stroke-width="2"/>
                                </svg>
                            </div>
                            <div class="stat-details-project">
                                <div class="stat-label-project">Categories</div>
                                <div class="stat-value-project">${new Set(projects.map(p => p.category)).size}</div>
                            </div>
                        </div>
                    </div>

                    <div class="projects-filters-section">
                        <div class="filter-group">
                            <label class="filter-label">
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                                    <rect x="3" y="3" width="7" height="7" stroke="currentColor" stroke-width="2"/>
                                    <rect x="14" y="3" width="7" height="7" stroke="currentColor" stroke-width="2"/>
                                    <rect x="14" y="14" width="7" height="7" stroke="currentColor" stroke-width="2"/>
                                    <rect x="3" y="14" width="7" height="7" stroke="currentColor" stroke-width="2"/>
                                </svg>
                                Categories
                            </label>
                            <div class="filters-row">
                                <button class="filter-chip active" data-filter="all" data-type="category">All</button>
                                <button class="filter-chip" data-filter="photography" data-type="category">Photography</button>
                                <button class="filter-chip" data-filter="videography" data-type="category">Videography</button>
                                <button class="filter-chip" data-filter="design" data-type="category">Design</button>
                                <button class="filter-chip" data-filter="illustration" data-type="category">Illustration</button>
                            </div>
                        </div>

                        <div class="filter-group">
                            <label class="filter-label">
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                                    <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" stroke="currentColor" stroke-width="2"/>
                                </svg>
                                Type & Timeline
                            </label>
                            <div class="filters-row">
                                <button class="filter-chip" data-filter="one-time" data-type="projectType">One-Time</button>
                                <button class="filter-chip" data-filter="ongoing" data-type="projectType">Ongoing</button>
                                <button class="filter-chip" data-filter="bounty" data-type="projectType">Bounty</button>
                                <button class="filter-chip" data-filter="urgent" data-type="timeline">Urgent</button>
                                <button class="filter-chip" data-filter="1-week" data-type="timeline">1 Week</button>
                                <button class="filter-chip" data-filter="1-month" data-type="timeline">1 Month</button>
                            </div>
                        </div>
                    </div>

                    <div id="projectsGrid">
                        ${projects.length > 0 ? renderProjectCards(projects) : renderEmptyState()}
                    </div>
                </div>
            </div>
        `;

        setupFilterListeners();
        setupProjectCardListeners();

    } catch (error) {
        console.error('Error loading projects:', error);
        mainContent.innerHTML = `
            <div class="section">
                <div class="container">
                    <div class="empty-state glass-effect" style="margin: 40px auto; max-width: 500px; border-radius: 24px; padding: 40px 20px; border-color: rgba(239, 68, 68, 0.3);">
                        <svg width="64" height="64" viewBox="0 0 24 24" fill="none" style="opacity: 0.4; margin-bottom: 16px; color: var(--error);">
                            <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="2"/>
                            <path d="M12 8v4M12 16h.01" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
                        </svg>
                        <h3>Failed to load projects</h3>
                        <p>${error.message}</p>
                        <button class="btn-primary" onclick="window.navigateToPage('projects')">Try Again</button>
                    </div>
                </div>
            </div>
        `;
    }
}

function renderProjectCards(projects) {
    if (!projects || projects.length === 0) {
        return renderEmptyState();
    }

    return `
        <div class="projects-grid-modern">
            ${projects.map(project => `
                <div class="project-card-modern glass-effect" data-project-id="${project._id}" style="background: rgba(255,255,255,0.6); border: 1px solid rgba(255,255,255,0.5); backdrop-filter: blur(12px);">
                    ${project.coverImage ? `
                        <div class="project-cover-modern">
                            <img src="${project.coverImage}" alt="${project.title}" onerror="this.parentElement.remove();" style="mix-blend-mode: overlay;">
                            <div class="project-type-badge-modern" style="background: ${getProjectTypeBadgeColor(project.projectType)}dd; backdrop-filter: blur(8px); border: 1px solid rgba(255,255,255,0.2);">
                                ${project.projectType.replace('-', ' ')}
                            </div>
                        </div>
                    ` : ''}

                    <div class="project-card-content">
                        <div class="project-card-header">
                            <div class="project-client-info">
                                <img src="${project.clientId?.avatar || 'https://ui-avatars.com/api/?name=' + encodeURIComponent(project.clientId?.name || 'Client')}"
                                     alt="${project.clientId?.name || 'Client'}"
                                     class="project-client-avatar" style="border-color: rgba(255,255,255,0.6);">
                                <div>
                                    <div class="project-client-name">${project.clientId?.name || 'Client'}</div>
                                    <div class="project-posted-time">${formatTimeAgo(project.createdAt)}</div>
                                </div>
                            </div>
                            ${!project.coverImage ? `
                                <div class="project-type-badge-inline" style="background: ${getProjectTypeBadgeColor(project.projectType)}dd; backdrop-filter: blur(4px);">
                                    ${project.projectType.replace('-', ' ')}
                                </div>
                            ` : ''}
                        </div>

                        <h3 class="project-card-title">${project.title}</h3>

                        <p class="project-card-description">${project.description}</p>

                        ${project.skillsRequired && project.skillsRequired.length > 0 ? `
                            <div class="project-skills">
                                ${project.skillsRequired.slice(0, 3).map(skill => `
                                    <span class="skill-tag" style="background: rgba(151, 71, 255, 0.15); backdrop-filter: blur(4px); border: 1px solid rgba(151, 71, 255, 0.1);">${skill}</span>
                                `).join('')}
                                ${project.skillsRequired.length > 3 ? `
                                    <span class="skill-tag more" style="background: rgba(255,255,255,0.4); backdrop-filter: blur(4px); border: 1px solid rgba(255,255,255,0.5);">+${project.skillsRequired.length - 3}</span>
                                ` : ''}
                            </div>
                        ` : ''}

                        <div class="project-card-footer" style="border-top-color: rgba(255,255,255,0.3);">
                            <div class="project-budget">
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                                    <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" stroke="currentColor" stroke-width="2"/>
                                </svg>
                                <span class="budget-amount">$${project.budget.min} - $${project.budget.max}</span>
                            </div>
                            <div class="project-meta-info">
                                <div class="project-timeline">
                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                                        <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="2"/>
                                        <path d="M12 6v6l4 2" stroke="currentColor" stroke-width="2"/>
                                    </svg>
                                    ${formatTimeline(project.timeline)}
                                </div>
                                <div class="project-applications">
                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                                        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" stroke="currentColor" stroke-width="2"/>
                                        <circle cx="9" cy="7" r="4" stroke="currentColor" stroke-width="2"/>
                                        <path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" stroke="currentColor" stroke-width="2"/>
                                    </svg>
                                    ${project.applicationsCount || 0} ${project.applicationsCount === 1 ? 'application' : 'applications'}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            `).join('')}
        </div>
    `;
}

function renderEmptyState() {
    return `
        <div class="empty-state glass-effect" style="margin: 40px auto; max-width: 500px; border-radius: 24px; padding: 60px 20px;">
            <svg width="80" height="80" viewBox="0 0 24 24" fill="none" style="opacity: 0.3; margin-bottom: 24px;">
                <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" stroke="currentColor" stroke-width="2"/>
            </svg>
            <h3 style="margin-bottom: 12px;">No projects yet</h3>
            <p style="color: var(--text-secondary); margin-bottom: 24px;">
                ${appState.user ? 'Be the first to post a project!' : 'Sign in to post your first project'}
            </p>
            ${appState.user ? `
                <button class="btn-primary" onclick="window.showPostProjectModal()">Post Your First Project</button>
            ` : `
                <button class="btn-primary" onclick="window.showAuthModal('signin')">Sign In to Post</button>
            `}
        </div>
    `;
}

let currentFilters = {
    category: '',
    projectType: '',
    timeline: ''
};

function setupFilterListeners() {
    document.querySelectorAll('.filter-chip').forEach(chip => {
        chip.addEventListener('click', async (e) => {
            const filter = e.currentTarget.dataset.filter;
            const filterType = e.currentTarget.dataset.type;

            if (filterType === 'category') {
                // Category filters are mutually exclusive
                document.querySelectorAll('.filter-chip[data-type="category"]').forEach(c => {
                    c.classList.remove('active');
                });
                e.currentTarget.classList.add('active');

                if (filter === 'all') {
                    currentFilters.category = '';
                } else {
                    currentFilters.category = filter;
                }
            } else {
                // Project type and timeline can be toggled
                const isActive = e.currentTarget.classList.contains('active');

                if (isActive) {
                    e.currentTarget.classList.remove('active');
                    currentFilters[filterType] = '';
                } else {
                    // Remove active from same type filters
                    document.querySelectorAll(`.filter-chip[data-type="${filterType}"]`).forEach(c => {
                        c.classList.remove('active');
                    });
                    e.currentTarget.classList.add('active');
                    currentFilters[filterType] = filter;
                }
            }

            await applyFilters();
        });
    });
}

async function applyFilters() {
    const filters = {};

    if (currentFilters.category) filters.category = currentFilters.category;
    if (currentFilters.projectType) filters.projectType = currentFilters.projectType;
    if (currentFilters.timeline) filters.timeline = currentFilters.timeline;

    try {
        const response = await api.getProjects(filters);
        const projects = response.data.projects || [];

        document.getElementById('projectsGrid').innerHTML = renderProjectCards(projects);
        setupProjectCardListeners();
    } catch (error) {
        console.error('Error filtering projects:', error);
        window.showToast('Failed to filter projects', 'error');
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
        'ongoing': '#10b981',
        'bounty': '#f59e0b'
    };
    return colors[type] || '#6b7280';
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
        year: 31536000,
        month: 2592000,
        week: 604800,
        day: 86400,
        hour: 3600,
        minute: 60
    };

    for (const [key, value] of Object.entries(intervals)) {
        const interval = Math.floor(seconds / value);
        if (interval >= 1) {
            return `${interval} ${key}${interval > 1 ? 's' : ''} ago`;
        }
    }

    return 'Just now';
}

// Make functions globally available
window.renderProjectsPage = renderProjectsPage;