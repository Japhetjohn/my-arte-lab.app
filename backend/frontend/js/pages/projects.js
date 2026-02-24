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
            <div class="section" style="padding-top: 20px;">
                <div class="container">
                    <div class="projects-header-modern glass-modal" style="margin-bottom: 40px; padding: 48px; border-radius: 32px; position: relative; overflow: hidden; background: rgba(255, 255, 255, 0.03); border: 1px solid rgba(255, 255, 255, 0.08);">
                        <div style="position: absolute; top: -100px; right: -100px; width: 300px; height: 300px; background: radial-gradient(circle, rgba(151, 71, 255, 0.1) 0%, transparent 70%); pointer-events: none;"></div>
                        <div class="projects-header-content" style="position: relative; z-index: 1;">
                            <div class="projects-header-text">
                                <h1 class="projects-title-modern" style="font-size: 42px; font-weight: 900; letter-spacing: -1.5px; margin-bottom: 12px; background: linear-gradient(to right, #fff, rgba(255,255,255,0.7)); -webkit-background-clip: text; -webkit-text-fill-color: transparent;">Browse Projects</h1>
                                <p class="projects-subtitle-modern" style="font-size: 17px; color: var(--text-secondary); opacity: 0.8; max-width: 500px; line-height: 1.6;">Find premium opportunities and apply to exclusive projects from elite clients worldwide.</p>
                            </div>
                            <div style="display: flex; gap: 16px; align-items: center;">
                                ${appState.user ? `
                                    <button class="glass-btn-primary" onclick="window.showPostProjectModal()" style="padding: 14px 28px; font-weight: 700; min-width: 180px;">
                                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" style="margin-right: 8px;">
                                            <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="2.5"/>
                                            <path d="M12 8v8M8 12h8" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"/>
                                        </svg>
                                        Post Project
                                    </button>
                                ` : `
                                    <button class="glass-btn-primary" onclick="window.showAuthModal('signin')" style="padding: 14px 28px; font-weight: 700; min-width: 180px;">Get Started</button>
                                `}
                            </div>
                        </div>
                    </div>

                    <div class="projects-stats-grid" style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 24px; margin-bottom: 48px;">
                        <div class="stat-card-project glass-modal" style="padding: 24px; border-radius: 24px; display: flex; align-items: center; gap: 20px; transition: transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);">
                            <div style="width: 56px; height: 56px; background: rgba(151, 71, 255, 0.1); border-radius: 18px; display: flex; align-items: center; justify-content: center; color: var(--primary); border: 1px solid rgba(151, 71, 255, 0.2);">
                                <svg width="28" height="28" viewBox="0 0 24 24" fill="none"><path d="M22 19a2 2 0 01-2 2H4a2 2 0 01-2-2V5a2 2 0 012-2h5l2 3h9a2 2 0 012 2z" stroke="currentColor" stroke-width="2.5"/></svg>
                            </div>
                            <div>
                                <div style="font-size: 11px; font-weight: 800; color: var(--text-secondary); text-transform: uppercase; letter-spacing: 0.1em; opacity: 0.6; margin-bottom: 4px;">Total Projects</div>
                                <div style="font-size: 28px; font-weight: 900; color: var(--text-primary); line-height: 1;">${projects.length}</div>
                            </div>
                        </div>
                        <div class="stat-card-project glass-modal" style="padding: 24px; border-radius: 24px; display: flex; align-items: center; gap: 20px; transition: transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);">
                            <div style="width: 56px; height: 56px; background: rgba(16, 185, 129, 0.1); border-radius: 18px; display: flex; align-items: center; justify-content: center; color: #10B981; border: 1px solid rgba(16, 185, 129, 0.2);">
                                <svg width="28" height="28" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="2.5"/><path d="M12 6v6l4 2" stroke="currentColor" stroke-width="2.5"/></svg>
                            </div>
                            <div>
                                <div style="font-size: 11px; font-weight: 800; color: var(--text-secondary); text-transform: uppercase; letter-spacing: 0.1em; opacity: 0.6; margin-bottom: 4px;">Active Open</div>
                                <div style="font-size: 28px; font-weight: 900; color: var(--text-primary); line-height: 1;">${projects.filter(p => p.status === 'open').length}</div>
                            </div>
                        </div>
                        <div class="stat-card-project glass-modal" style="padding: 24px; border-radius: 24px; display: flex; align-items: center; gap: 20px; transition: transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);">
                            <div style="width: 56px; height: 56px; background: rgba(245, 158, 11, 0.1); border-radius: 18px; display: flex; align-items: center; justify-content: center; color: #F59E0B; border: 1px solid rgba(245, 158, 11, 0.2);">
                                <svg width="28" height="28" viewBox="0 0 24 24" fill="none"><rect x="3" y="3" width="7" height="7" stroke="currentColor" stroke-width="2.5"/><rect x="14" y="3" width="7" height="7" stroke="currentColor" stroke-width="2.5"/><rect x="14" y="14" width="7" height="7" stroke="currentColor" stroke-width="2.5"/><rect x="3" y="14" width="7" height="7" stroke="currentColor" stroke-width="2.5"/></svg>
                            </div>
                            <div>
                                <div style="font-size: 11px; font-weight: 800; color: var(--text-secondary); text-transform: uppercase; letter-spacing: 0.1em; opacity: 0.6; margin-bottom: 4px;">Available Sectors</div>
                                <div style="font-size: 28px; font-weight: 900; color: var(--text-primary); line-height: 1;">${new Set(projects.map(p => p.category)).size}</div>
                            </div>
                        </div>
                    </div>

                    <div class="projects-filters-section glass-modal" style="padding: 32px; border-radius: 28px; margin-bottom: 48px; background: rgba(255,255,255,0.02); border: 1px solid rgba(255,255,255,0.06);">
                        <style>
                            .filter-chip { 
                                padding: 10px 20px; border-radius: 14px; background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.08); 
                                color: var(--text-secondary); font-size: 13px; font-weight: 700; cursor: pointer; transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
                                display: flex; align-items: center; gap: 8px;
                            }
                            .filter-chip:hover { background: rgba(151, 71, 255, 0.08); border-color: rgba(151, 71, 255, 0.2); color: var(--text-primary); transform: translateY(-2px); }
                            .filter-chip.active { background: var(--primary); border-color: var(--primary); color: white; box-shadow: 0 8px 20px rgba(151, 71, 255, 0.25); }
                            .filter-label-text { font-size: 11px; font-weight: 800; color: var(--text-secondary); text-transform: uppercase; letter-spacing: 0.15em; margin-bottom: 16px; display: flex; align-items: center; gap: 10px; opacity: 0.7; }
                            .filter-label-text::after { content: ''; flex: 1; height: 1px; background: rgba(255,255,255,0.08); }
                        </style>
                        <div class="filter-group" style="margin-bottom: 32px;">
                            <div class="filter-label-text">Industry Vertical</div>
                            <div class="filters-row" style="display: flex; flex-wrap: wrap; gap: 12px;">
                                <button class="filter-chip active" data-filter="all" data-type="category">All Specialties</button>
                                <button class="filter-chip" data-filter="photography" data-type="category">Photography</button>
                                <button class="filter-chip" data-filter="videography" data-type="category">Videography</button>
                                <button class="filter-chip" data-filter="design" data-type="category">UI/UX Design</button>
                                <button class="filter-chip" data-filter="illustration" data-type="category">Illustration</button>
                            </div>
                        </div>

                        <div class="filter-group">
                            <div class="filter-label-text">Project Architecture & Delivery</div>
                            <div class="filters-row" style="display: flex; flex-wrap: wrap; gap: 12px;">
                                <button class="filter-chip" data-filter="one-time" data-type="projectType">One-Time Contract</button>
                                <button class="filter-chip" data-filter="ongoing" data-type="projectType">Ongoing Partnership</button>
                                <button class="filter-chip" data-filter="bounty" data-type="projectType">Bounty Reward</button>
                                <div style="width: 1px; height: 32px; background: rgba(255,255,255,0.1); margin: 0 4px;"></div>
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
        <div class="projects-grid-modern" style="display: grid; grid-template-columns: repeat(auto-fill, minmax(400px, 1fr)); gap: 32px;">
            ${projects.map(project => `
                <div class="project-card-modern glass-modal" data-project-id="${project._id}" style="background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.08); border-radius: 28px; overflow: hidden; transition: all 0.4s cubic-bezier(0.165, 0.84, 0.44, 1); cursor: pointer; display: flex; flex-direction: column; position: relative; backdrop-filter: blur(16px);">
                    ${project.coverImage ? `
                        <div class="project-cover-modern" style="height: 220px; overflow: hidden; position: relative; border-bottom: 1px solid rgba(255,255,255,0.05);">
                            <img src="${project.coverImage}" alt="${project.title}" style="width: 100%; height: 100%; object-fit: cover; transition: transform 0.6s cubic-bezier(0.165, 0.84, 0.44, 1);" onerror="this.parentElement.remove();">
                            <div style="position: absolute; inset: 0; background: linear-gradient(to bottom, transparent 60%, rgba(0,0,0,0.4)); opacity: 0.6;"></div>
                            <div class="project-type-badge-modern" style="position: absolute; top: 16px; right: 16px; background: ${getProjectTypeBadgeColor(project.projectType)}20; color: ${getProjectTypeBadgeColor(project.projectType)}; border: 1px solid ${getProjectTypeBadgeColor(project.projectType)}40; backdrop-filter: blur(12px); padding: 6px 14px; border-radius: 12px; font-size: 11px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.05em;">
                                ${project.projectType.replace('-', ' ')}
                            </div>
                        </div>
                    ` : ''}

                    <div class="project-card-content" style="padding: 28px; flex: 1; display: flex; flex-direction: column;">
                        <div class="project-card-header" style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 24px;">
                            <div class="project-client-info" style="display: flex; align-items: center; gap: 14px;">
                                <div style="position: relative;">
                                    <img src="${project.clientId?.avatar || 'https://ui-avatars.com/api/?name=' + encodeURIComponent(project.clientId?.name || 'Client')}"
                                         alt="${project.clientId?.name || 'Client'}"
                                         style="width: 44px; height: 44px; border-radius: 16px; object-fit: cover; border: 1.5px solid rgba(255,255,255,0.15); box-shadow: 0 4px 12px rgba(0,0,0,0.1);">
                                    <div style="position: absolute; bottom: -2px; right: -2px; width: 12px; height: 12px; background: #10B981; border: 2px solid #0f0f0f; border-radius: 50%;"></div>
                                </div>
                                <div>
                                    <div style="font-size: 14px; font-weight: 700; color: var(--text-primary);">${project.clientId?.name || 'Client'}</div>
                                    <div style="font-size: 11px; font-weight: 600; color: var(--text-secondary); opacity: 0.6;">${formatTimeAgo(project.createdAt)}</div>
                                </div>
                            </div>
                            ${!project.coverImage ? `
                                <div class="project-type-badge-inline" style="background: ${getProjectTypeBadgeColor(project.projectType)}20; color: ${getProjectTypeBadgeColor(project.projectType)}; border: 1px solid ${getProjectTypeBadgeColor(project.projectType)}40; backdrop-filter: blur(12px); padding: 5px 12px; border-radius: 10px; font-size: 10px; font-weight: 800; text-transform: uppercase;">
                                    ${project.projectType.replace('-', ' ')}
                                </div>
                            ` : ''}
                        </div>

                        <h3 class="project-card-title" style="font-size: 20px; font-weight: 800; color: #fff; margin-bottom: 12px; line-height: 1.4; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; letter-spacing: -0.01em;">${project.title}</h3>

                        <p class="project-card-description" style="font-size: 14px; color: var(--text-secondary); line-height: 1.6; margin-bottom: 24px; opacity: 0.8; display: -webkit-box; -webkit-line-clamp: 3; -webkit-box-orient: vertical; overflow: hidden;">${project.description}</p>

                        ${project.skillsRequired && project.skillsRequired.length > 0 ? `
                            <div class="project-skills" style="display: flex; flex-wrap: wrap; gap: 8px; margin-bottom: 28px;">
                                ${project.skillsRequired.slice(0, 3).map(skill => `
                                    <span class="skill-tag" style="background: rgba(151, 71, 255, 0.08); color: var(--primary); padding: 6px 14px; border-radius: 10px; font-size: 11px; font-weight: 700; border: 1px solid rgba(151, 71, 255, 0.15);">${skill}</span>
                                `).join('')}
                                ${project.skillsRequired.length > 3 ? `
                                    <span class="skill-tag more" style="background: rgba(255,255,255,0.03); color: var(--text-secondary); padding: 6px 12px; border-radius: 10px; font-size: 11px; font-weight: 700; border: 1px solid rgba(255,255,255,0.06);">+${project.skillsRequired.length - 3}</span>
                                ` : ''}
                            </div>
                        ` : ''}

                        <div style="margin-top: auto; padding-top: 24px; border-top: 1px solid rgba(255,255,255,0.06); display: flex; align-items: center; justify-content: space-between;">
                            <div style="display: flex; flex-direction: column; gap: 2px;">
                                <span style="font-size: 10px; font-weight: 800; color: var(--text-secondary); text-transform: uppercase; letter-spacing: 0.1em; opacity: 0.5;">Budget Allocation</span>
                                <div style="font-size: 20px; font-weight: 900; color: #10B981; letter-spacing: -0.5px;">$${project.budget.min.toLocaleString()} - $${project.budget.max.toLocaleString()}</div>
                            </div>
                            <div style="display: flex; align-items: center; gap: 16px;">
                                <div style="display: flex; flex-direction: column; align-items: flex-end; gap: 2px;">
                                    <span style="font-size: 10px; font-weight: 800; color: var(--text-secondary); text-transform: uppercase; letter-spacing: 0.1em; opacity: 0.5;">Timeline</span>
                                    <div style="font-size: 13px; font-weight: 700; color: var(--text-primary); display: flex; align-items: center; gap: 5px;">
                                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" style="opacity: 0.7;"><circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="2.5"/><path d="M12 6v6l4 2" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"/></svg>
                                        ${formatTimeline(project.timeline)}
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
        <div class="empty-state glass-modal" style="margin: 40px auto; max-width: 540px; border-radius: 32px; padding: 80px 40px; text-align: center; background: rgba(255,255,255,0.02); border: 1px solid rgba(255,255,255,0.08); backdrop-filter: blur(20px);">
            <div style="width: 100px; height: 100px; background: rgba(151,71,255,0.1); border-radius: 30px; display: flex; align-items: center; justify-content: center; margin: 0 auto 32px; border: 1px solid rgba(151,71,255,0.15);">
                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" style="color: var(--primary); opacity: 0.8;">
                    <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" stroke="currentColor" stroke-width="2.5"/>
                </svg>
            </div>
            <h3 style="font-size: 24px; font-weight: 800; color: #fff; margin-bottom: 12px; letter-spacing: -0.5px;">No matching projects</h3>
            <p style="color: var(--text-secondary); font-size: 16px; margin-bottom: 32px; line-height: 1.6; opacity: 0.7;">
                ${appState.user ? 'Be the first to launch a high-impact project in this category!' : 'Sign in to access exclusive opportunities and launch your first project.'}
            </p>
            ${appState.user ? `
                <button class="glass-btn-primary" onclick="window.showPostProjectModal()" style="padding: 14px 32px; font-weight: 700;">Post Your First Project</button>
            ` : `
                <button class="glass-btn-primary" onclick="window.showAuthModal('signin')" style="padding: 14px 32px; font-weight: 700;">Sign In to Post</button>
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