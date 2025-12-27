import api from '../services/api.js';
import { appState } from '../state.js';

export async function renderProjectsPage() {
    const mainContent = document.getElementById('mainContent');

    // Show loading state
    mainContent.innerHTML = `
        <div class="section">
            <div class="container">
                <div class="text-center" style="padding: 60px 20px;">
                    <svg width="64" height="64" viewBox="0 0 24 24" fill="none" style="opacity: 0.4; margin-bottom: 16px; animation: spin 1s linear infinite;">
                        <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="2"/>
                        <path d="M12 6v6l4 2" stroke="currentColor" stroke-width="2"/>
                    </svg>
                    <p class="text-secondary">Loading projects...</p>
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
            <div class="section" style="padding-top: 80px;">
                <div class="container">
                    <!-- Header with Post Project Button -->
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 32px; flex-wrap: wrap; gap: 16px;">
                        <div>
                            <h1 style="margin-bottom: 8px;">Browse Projects</h1>
                            <p style="color: var(--text-secondary); font-size: 15px;">
                                Find opportunities and apply to projects from clients worldwide
                            </p>
                        </div>
                        ${appState.user ? `
                            <button class="btn-primary" onclick="window.showPostProjectModal()" style="white-space: nowrap;">
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" style="margin-right: 8px;">
                                    <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="2"/>
                                    <path d="M12 8v8M8 12h8" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
                                </svg>
                                Post Project
                            </button>
                        ` : ''}
                    </div>

                    <!-- Filters -->
                    <div style="margin-bottom: 24px;">
                        <div class="filters-row" style="margin-bottom: 12px;">
                            <button class="filter-chip active" data-filter="all" data-type="category">All Categories</button>
                            <button class="filter-chip" data-filter="photography" data-type="category">Photography</button>
                            <button class="filter-chip" data-filter="videography" data-type="category">Videography</button>
                            <button class="filter-chip" data-filter="design" data-type="category">Design</button>
                            <button class="filter-chip" data-filter="illustration" data-type="category">Illustration</button>
                        </div>

                        <div class="filters-row">
                            <button class="filter-chip" data-filter="one-time" data-type="projectType">One-Time</button>
                            <button class="filter-chip" data-filter="ongoing" data-type="projectType">Ongoing</button>
                            <button class="filter-chip" data-filter="bounty" data-type="projectType">Bounty</button>
                            <button class="filter-chip" data-filter="urgent" data-type="timeline">Urgent</button>
                            <button class="filter-chip" data-filter="1-week" data-type="timeline">1 Week</button>
                            <button class="filter-chip" data-filter="1-month" data-type="timeline">1 Month</button>
                        </div>
                    </div>

                    <!-- Projects Grid -->
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
                    <div class="empty-state">
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
        <div class="projects-grid" style="display: grid; grid-template-columns: repeat(auto-fill, minmax(320px, 1fr)); gap: 24px;">
            ${projects.map(project => `
                <div class="card card-lift project-card" data-project-id="${project._id}" style="cursor: pointer; padding: 0; overflow: hidden;">
                    <!-- Project Header -->
                    <div style="padding: 20px;">
                        <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 12px;">
                            <span class="badge" style="background: ${getProjectTypeBadgeColor(project.projectType)}; color: white; text-transform: capitalize;">
                                ${project.projectType.replace('-', ' ')}
                            </span>
                            <span style="font-size: 13px; color: var(--text-secondary);">
                                ${formatTimeAgo(project.createdAt)}
                            </span>
                        </div>

                        <h3 style="margin-bottom: 12px; font-size: 18px; font-weight: 700; line-height: 1.4;">
                            ${project.title}
                        </h3>

                        <p style="color: var(--text-secondary); font-size: 14px; line-height: 1.6; margin-bottom: 16px; display: -webkit-box; -webkit-line-clamp: 3; -webkit-box-orient: vertical; overflow: hidden;">
                            ${project.description}
                        </p>

                        <!-- Budget & Timeline -->
                        <div style="display: flex; gap: 16px; margin-bottom: 16px; flex-wrap: wrap;">
                            <div style="display: flex; align-items: center; gap: 6px;">
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" style="color: var(--primary);">
                                    <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="2"/>
                                    <path d="M12 6v6l4 2" stroke="currentColor" stroke-width="2"/>
                                </svg>
                                <span style="font-size: 13px; font-weight: 600;">${formatTimeline(project.timeline)}</span>
                            </div>
                            <div style="display: flex; align-items: center; gap: 6px;">
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" style="color: #10b981;">
                                    <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" stroke="currentColor" stroke-width="2"/>
                                </svg>
                                <span style="font-size: 13px; font-weight: 600; color: #10b981;">
                                    $${project.budget.min} - $${project.budget.max}
                                </span>
                            </div>
                        </div>

                        <!-- Skills -->
                        ${project.skillsRequired && project.skillsRequired.length > 0 ? `
                            <div style="display: flex; gap: 6px; flex-wrap: wrap; margin-bottom: 16px;">
                                ${project.skillsRequired.slice(0, 3).map(skill => `
                                    <span style="background: var(--surface); padding: 4px 10px; border-radius: 6px; font-size: 12px; font-weight: 500;">
                                        ${skill}
                                    </span>
                                `).join('')}
                                ${project.skillsRequired.length > 3 ? `
                                    <span style="background: var(--surface); padding: 4px 10px; border-radius: 6px; font-size: 12px; font-weight: 500; color: var(--text-secondary);">
                                        +${project.skillsRequired.length - 3}
                                    </span>
                                ` : ''}
                            </div>
                        ` : ''}
                    </div>

                    <!-- Client Info Footer -->
                    <div style="border-top: 1px solid var(--border); padding: 16px 20px; background: var(--surface);">
                        <div style="display: flex; align-items: center; justify-content: space-between;">
                            <div style="display: flex; align-items: center; gap: 10px;">
                                <img src="${project.clientId?.avatar || 'https://ui-avatars.com/api/?name=' + encodeURIComponent(project.clientId?.name || 'Client')}"
                                     alt="${project.clientId?.name}"
                                     style="width: 32px; height: 32px; border-radius: 50%; object-fit: cover;">
                                <div>
                                    <div style="font-weight: 600; font-size: 14px; display: flex; align-items: center; gap: 4px;">
                                        ${project.clientId?.name}
                                        ${project.clientId?.isEmailVerified ? '<span style="color: #10b981;">✓</span>' : ''}
                                    </div>
                                    <div style="font-size: 12px; color: var(--text-secondary);">
                                        ${project.applicationsCount} ${project.applicationsCount === 1 ? 'application' : 'applications'}
                                    </div>
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
        <div class="empty-state" style="padding: 80px 20px;">
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
    document.querySelectorAll('.project-card').forEach(card => {
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
