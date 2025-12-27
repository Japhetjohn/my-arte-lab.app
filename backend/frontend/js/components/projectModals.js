import api from '../services/api.js';
import { appState } from '../state.js';

/**
 * Show Post Project Modal
 */
export function showPostProjectModal() {
    if (!appState.user) {
        window.showAuthModal('signin');
        return;
    }

    const modal = document.createElement('div');
    modal.className = 'modal-overlay';
    modal.innerHTML = `
        <div class="modal" style="max-width: 700px;">
            <div class="modal-header">
                <h2>Post a Project</h2>
                <button class="modal-close" onclick="this.closest('.modal-overlay').remove()">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                        <path d="M18 6L6 18M6 6l12 12" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
                    </svg>
                </button>
            </div>
            <form id="postProjectForm" class="modal-body" style="max-height: calc(90vh - 180px); overflow-y: auto;">
                <div class="form-group">
                    <label class="form-label">Project Title *</label>
                    <input type="text" name="title" class="form-input" placeholder="e.g., Need product photography for e-commerce store" required maxlength="200">
                </div>

                <div class="form-group">
                    <label class="form-label">Category *</label>
                    <select name="category" class="form-input" required>
                        <option value="">Select category</option>
                        <option value="photography">Photography</option>
                        <option value="videography">Videography</option>
                        <option value="design">Design</option>
                        <option value="illustration">Illustration</option>
                        <option value="content">Content Creation</option>
                        <option value="other">Other</option>
                    </select>
                </div>

                <div class="form-group">
                    <label class="form-label">Project Type *</label>
                    <select name="projectType" class="form-input" required>
                        <option value="one-time">One-Time Project</option>
                        <option value="ongoing">Ongoing Work</option>
                        <option value="bounty">Bounty (Best submission wins)</option>
                    </select>
                    <small style="color: var(--text-secondary); font-size: 12px; margin-top: 4px; display: block;">
                        One-time: Fixed scope. Ongoing: Retainer-based. Bounty: Competition style.
                    </small>
                </div>

                <div class="form-group">
                    <label class="form-label">Description *</label>
                    <textarea name="description" class="form-input" rows="6" placeholder="Describe your project in detail. What are you looking for? What's the scope of work?" required maxlength="5000"></textarea>
                    <small style="color: var(--text-secondary); font-size: 12px; margin-top: 4px; display: block;">
                        <span id="descCharCount">0</span>/5000 characters
                    </small>
                </div>

                <div class="form-group">
                    <label class="form-label">Budget Range (USDC) *</label>
                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px;">
                        <div>
                            <input type="number" name="budgetMin" class="form-input" placeholder="Min $" required min="0" step="1">
                        </div>
                        <div>
                            <input type="number" name="budgetMax" class="form-input" placeholder="Max $" required min="0" step="1">
                        </div>
                    </div>
                    <label style="display: flex; align-items: center; gap: 8px; margin-top: 8px; font-size: 14px;">
                        <input type="checkbox" name="negotiable" checked>
                        <span>Budget is negotiable</span>
                    </label>
                </div>

                <div class="form-group">
                    <label class="form-label">Timeline *</label>
                    <select name="timeline" class="form-input" required>
                        <option value="urgent">Urgent (ASAP)</option>
                        <option value="1-week">1 Week</option>
                        <option value="2-weeks">2 Weeks</option>
                        <option value="1-month" selected>1 Month</option>
                        <option value="2-months">2 Months</option>
                        <option value="3-months">3 Months</option>
                        <option value="flexible">Flexible</option>
                    </select>
                </div>

                <div class="form-group">
                    <label class="form-label">Deadline (Optional)</label>
                    <input type="date" name="deadline" class="form-input" min="${new Date().toISOString().split('T')[0]}">
                </div>

                <div class="form-group">
                    <label class="form-label">Skills Required</label>
                    <input type="text" id="skillsInput" class="form-input" placeholder="Type skill and press Enter">
                    <div id="skillsList" style="display: flex; flex-wrap: wrap; gap: 8px; margin-top: 8px;"></div>
                    <small style="color: var(--text-secondary); font-size: 12px; margin-top: 4px; display: block;">
                        Press Enter to add each skill
                    </small>
                </div>

                <div class="form-group">
                    <label class="form-label">Deliverables Expected</label>
                    <input type="text" id="deliverablesInput" class="form-input" placeholder="Type deliverable and press Enter">
                    <div id="deliverablesList" style="display: flex; flex-wrap: wrap; gap: 8px; margin-top: 8px;"></div>
                    <small style="color: var(--text-secondary); font-size: 12px; margin-top: 4px; display: block;">
                        e.g., "50 edited photos", "2-minute video", etc.
                    </small>
                </div>
            </form>
            <div class="form-actions" style="border-top: 1px solid var(--border); padding: 20px; background: var(--surface);">
                <button type="button" class="btn-ghost" onclick="this.closest('.modal-overlay').remove()">Cancel</button>
                <button type="submit" form="postProjectForm" class="btn-primary" id="submitProjectBtn">Post Project</button>
            </div>
        </div>
    `;

    document.body.appendChild(modal);

    // Setup form handlers
    const skills = [];
    const deliverables = [];

    // Character counter
    const descTextarea = modal.querySelector('[name="description"]');
    const charCount = modal.querySelector('#descCharCount');
    descTextarea.addEventListener('input', () => {
        charCount.textContent = descTextarea.value.length;
    });

    // Skills input
    const skillsInput = modal.querySelector('#skillsInput');
    const skillsList = modal.querySelector('#skillsList');

    skillsInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            const skill = skillsInput.value.trim();
            if (skill && !skills.includes(skill)) {
                skills.push(skill);
                renderSkills();
                skillsInput.value = '';
            }
        }
    });

    function renderSkills() {
        skillsList.innerHTML = skills.map((skill, index) => `
            <span style="background: var(--primary); color: white; padding: 6px 12px; border-radius: 6px; font-size: 13px; display: inline-flex; align-items: center; gap: 6px;">
                ${skill}
                <button type="button" onclick="this.parentElement.remove()" style="background: none; border: none; color: white; cursor: pointer; padding: 0; line-height: 1;">
                    ×
                </button>
            </span>
        `).join('');
    }

    // Deliverables input
    const deliverablesInput = modal.querySelector('#deliverablesInput');
    const deliverablesList = modal.querySelector('#deliverablesList');

    deliverablesInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            const deliverable = deliverablesInput.value.trim();
            if (deliverable && !deliverables.includes(deliverable)) {
                deliverables.push(deliverable);
                renderDeliverables();
                deliverablesInput.value = '';
            }
        }
    });

    function renderDeliverables() {
        deliverablesList.innerHTML = deliverables.map((item, index) => `
            <span style="background: #10b981; color: white; padding: 6px 12px; border-radius: 6px; font-size: 13px; display: inline-flex; align-items: center; gap: 6px;">
                ${item}
                <button type="button" onclick="this.parentElement.remove()" style="background: none; border: none; color: white; cursor: pointer; padding: 0; line-height: 1;">
                    ×
                </button>
            </span>
        `).join('');
    }

    // Form submission
    const form = modal.querySelector('#postProjectForm');
    const submitBtn = modal.querySelector('#submitProjectBtn');

    form.addEventListener('submit', async (e) => {
        e.preventDefault();

        const formData = new FormData(form);
        const budgetMin = Number(formData.get('budgetMin'));
        const budgetMax = Number(formData.get('budgetMax'));

        if (budgetMin > budgetMax) {
            window.showToast('Minimum budget cannot be greater than maximum budget', 'error');
            return;
        }

        const projectData = {
            title: formData.get('title'),
            description: formData.get('description'),
            category: formData.get('category'),
            projectType: formData.get('projectType'),
            budget: {
                min: budgetMin,
                max: budgetMax,
                negotiable: formData.get('negotiable') === 'on'
            },
            timeline: formData.get('timeline'),
            deadline: formData.get('deadline') || null,
            skillsRequired: skills,
            deliverables: deliverables
        };

        submitBtn.disabled = true;
        submitBtn.textContent = 'Posting...';

        try {
            const response = await api.createProject(projectData);

            if (response.success) {
                window.showToast('Project posted successfully!', 'success');
                modal.remove();
                // Refresh projects page
                window.navigateToPage('projects');
            } else {
                throw new Error(response.message || 'Failed to post project');
            }
        } catch (error) {
            console.error('Error posting project:', error);
            window.showToast(error.message || 'Failed to post project', 'error');
        } finally {
            submitBtn.disabled = false;
            submitBtn.textContent = 'Post Project';
        }
    });
}

/**
 * Show Project Detail Modal
 */
export async function showProjectDetail(projectId) {
    // Show loading modal first
    const loadingModal = document.createElement('div');
    loadingModal.className = 'modal-overlay';
    loadingModal.innerHTML = `
        <div class="modal" style="max-width: 900px;">
            <div class="text-center" style="padding: 60px 20px;">
                <svg width="64" height="64" viewBox="0 0 24 24" fill="none" style="opacity: 0.4; margin-bottom: 16px; animation: spin 1s linear infinite;">
                    <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="2"/>
                    <path d="M12 6v6l4 2" stroke="currentColor" stroke-width="2"/>
                </svg>
                <p class="text-secondary">Loading project details...</p>
            </div>
        </div>
    `;
    document.body.appendChild(loadingModal);

    try {
        const response = await api.getProject(projectId);

        if (!response.success) {
            throw new Error(response.message || 'Failed to load project');
        }

        const project = response.data.project;
        const hasApplied = response.data.hasApplied;

        loadingModal.remove();

        const modal = document.createElement('div');
        modal.className = 'modal-overlay';
        modal.innerHTML = `
            <div class="modal" style="max-width: 900px;">
                <div class="modal-header">
                    <div>
                        <span class="badge" style="background: ${getProjectTypeBadgeColor(project.projectType)}; color: white; margin-bottom: 8px;">
                            ${project.projectType.replace('-', ' ')}
                        </span>
                        <h2 style="margin: 0;">${project.title}</h2>
                    </div>
                    <button class="modal-close" onclick="this.closest('.modal-overlay').remove()">
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                            <path d="M18 6L6 18M6 6l12 12" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
                        </svg>
                    </button>
                </div>

                <div class="modal-body" style="max-height: calc(90vh - 200px); overflow-y: auto;">
                    <!-- Project Info Grid -->
                    <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 16px; margin-bottom: 24px; padding: 20px; background: var(--surface); border-radius: 12px;">
                        <div>
                            <div style="font-size: 13px; color: var(--text-secondary); margin-bottom: 4px;">Budget</div>
                            <div style="font-size: 20px; font-weight: 700; color: #10b981;">
                                $${project.budget.min} - $${project.budget.max}
                            </div>
                            ${project.budget.negotiable ? '<div style="font-size: 12px; color: var(--text-secondary);">Negotiable</div>' : ''}
                        </div>
                        <div>
                            <div style="font-size: 13px; color: var(--text-secondary); margin-bottom: 4px;">Timeline</div>
                            <div style="font-size: 16px; font-weight: 600;">${formatTimeline(project.timeline)}</div>
                            ${project.deadline ? `<div style="font-size: 12px; color: var(--text-secondary);">Deadline: ${new Date(project.deadline).toLocaleDateString()}</div>` : ''}
                        </div>
                        <div>
                            <div style="font-size: 13px; color: var(--text-secondary); margin-bottom: 4px;">Applications</div>
                            <div style="font-size: 16px; font-weight: 600;">${project.applicationsCount}</div>
                        </div>
                        <div>
                            <div style="font-size: 13px; color: var(--text-secondary); margin-bottom: 4px;">Posted</div>
                            <div style="font-size: 14px;">${formatTimeAgo(project.createdAt)}</div>
                        </div>
                    </div>

                    <!-- Description -->
                    <div style="margin-bottom: 24px;">
                        <h3 style="margin-bottom: 12px;">Description</h3>
                        <p style="white-space: pre-wrap; line-height: 1.6; color: var(--text-secondary);">${project.description}</p>
                    </div>

                    <!-- Skills Required -->
                    ${project.skillsRequired && project.skillsRequired.length > 0 ? `
                        <div style="margin-bottom: 24px;">
                            <h3 style="margin-bottom: 12px;">Skills Required</h3>
                            <div style="display: flex; gap: 8px; flex-wrap: wrap;">
                                ${project.skillsRequired.map(skill => `
                                    <span style="background: var(--primary); color: white; padding: 6px 14px; border-radius: 6px; font-size: 14px;">
                                        ${skill}
                                    </span>
                                `).join('')}
                            </div>
                        </div>
                    ` : ''}

                    <!-- Deliverables -->
                    ${project.deliverables && project.deliverables.length > 0 ? `
                        <div style="margin-bottom: 24px;">
                            <h3 style="margin-bottom: 12px;">Deliverables Expected</h3>
                            <ul style="list-style: none; padding: 0; margin: 0;">
                                ${project.deliverables.map(item => `
                                    <li style="padding: 8px 0; display: flex; align-items: center; gap: 8px;">
                                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" style="flex-shrink: 0; color: #10b981;">
                                            <path d="M20 6L9 17l-5-5" stroke="currentColor" stroke-width="2"/>
                                        </svg>
                                        <span>${item}</span>
                                    </li>
                                `).join('')}
                            </ul>
                        </div>
                    ` : ''}

                    <!-- Client Info -->
                    <div style="border-top: 1px solid var(--border); padding-top: 24px;">
                        <h3 style="margin-bottom: 16px;">Posted by</h3>
                        <div class="card" style="padding: 20px; cursor: pointer;" onclick="window.showClientProfile('${project.clientId._id}')">
                            <div style="display: flex; align-items: center; gap: 16px;">
                                <img src="${project.clientId.avatar || 'https://ui-avatars.com/api/?name=' + encodeURIComponent(project.clientId.name)}"
                                     alt="${project.clientId.name}"
                                     style="width: 64px; height: 64px; border-radius: 50%; object-fit: cover;">
                                <div style="flex: 1;">
                                    <div style="font-weight: 700; font-size: 18px; margin-bottom: 4px; display: flex; align-items: center; gap: 8px;">
                                        ${project.clientId.name}
                                        ${project.clientId.isEmailVerified ? '<span style="color: #10b981;">✓ Verified</span>' : ''}
                                    </div>
                                    <div style="color: var(--text-secondary); font-size: 14px;">${project.clientId.email}</div>
                                    ${project.clientId.bio ? `<div style="margin-top: 8px; font-size: 14px; color: var(--text-secondary);">${project.clientId.bio}</div>` : ''}
                                </div>
                                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" style="color: var(--text-secondary);">
                                    <path d="M9 18l6-6-6-6" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
                                </svg>
                            </div>
                        </div>
                    </div>
                </div>

                <div class="form-actions" style="border-top: 1px solid var(--border); padding: 20px; background: var(--surface);">
                    ${renderProjectActions(project, hasApplied)}
                </div>
            </div>
        `;

        document.body.appendChild(modal);

    } catch (error) {
        console.error('Error loading project:', error);
        loadingModal.remove();
        window.showToast(error.message || 'Failed to load project details', 'error');
    }
}

function renderProjectActions(project, hasApplied) {
    // If user owns the project
    if (appState.user && project.clientId._id === appState.user.userId) {
        return `
            <button class="btn-ghost" onclick="this.closest('.modal-overlay').remove()">Close</button>
            <button class="btn-primary" onclick="window.viewProjectApplications('${project._id}')">
                View Applications (${project.applicationsCount})
            </button>
        `;
    }

    // If user is a creator
    if (appState.user) {
        if (hasApplied) {
            return `
                <button class="btn-ghost" onclick="this.closest('.modal-overlay').remove()">Close</button>
                <button class="btn-secondary" disabled>Already Applied</button>
            `;
        }

        if (project.status === 'open') {
            return `
                <button class="btn-ghost" onclick="this.closest('.modal-overlay').remove()">Close</button>
                <button class="btn-primary" onclick="window.showApplicationForm('${project._id}')">Apply Now</button>
            `;
        }

        return `<button class="btn-primary" onclick="this.closest('.modal-overlay').remove()">Close</button>`;
    }

    // Not logged in
    return `
        <button class="btn-ghost" onclick="this.closest('.modal-overlay').remove()">Close</button>
        <button class="btn-primary" onclick="window.showAuthModal('signin')">Sign In to Apply</button>
    `;
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

/**
 * Show Application Form
 */
export async function showApplicationForm(projectId) {
    if (!appState.user) {
        window.showAuthModal('signin');
        return;
    }

    const modal = document.createElement('div');
    modal.className = 'modal-overlay';
    modal.innerHTML = `
        <div class="modal" style="max-width: 700px;">
            <div class="modal-header">
                <h2>Apply to Project</h2>
                <button class="modal-close" onclick="this.closest('.modal-overlay').remove()">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                        <path d="M18 6L6 18M6 6l12 12" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
                    </svg>
                </button>
            </div>
            <form id="applicationForm" class="modal-body" style="max-height: calc(90vh - 180px); overflow-y: auto;">
                <div class="form-group">
                    <label class="form-label">Cover Letter *</label>
                    <textarea name="coverLetter" class="form-input" rows="8" placeholder="Explain why you're the best fit for this project. Highlight your relevant experience and how you'll approach the work." required maxlength="2000"></textarea>
                    <small style="color: var(--text-secondary); font-size: 12px; margin-top: 4px; display: block;">
                        <span id="coverLetterCount">0</span>/2000 characters
                    </small>
                </div>

                <div class="form-group">
                    <label class="form-label">Your Proposed Budget (USDC) *</label>
                    <input type="number" name="proposedBudget" class="form-input" placeholder="Enter your price" required min="0" step="1">
                    <small style="color: var(--text-secondary); font-size: 12px; margin-top: 4px; display: block;">
                        Based on project scope and your expertise
                    </small>
                </div>

                <div class="form-group">
                    <label class="form-label">Timeline/Delivery Estimate *</label>
                    <input type="text" name="proposedTimeline" class="form-input" placeholder="e.g., 2 weeks, 5 business days" required maxlength="200">
                    <small style="color: var(--text-secondary); font-size: 12px; margin-top: 4px; display: block;">
                        When can you deliver?
                    </small>
                </div>

                <div class="form-group">
                    <label class="form-label">Portfolio Links (Optional)</label>
                    <input type="text" id="portfolioLinkInput" class="form-input" placeholder="Paste link and press Enter">
                    <div id="portfolioLinksList" style="margin-top: 12px;"></div>
                    <small style="color: var(--text-secondary); font-size: 12px; margin-top: 4px; display: block;">
                        Add relevant work samples or portfolio pieces
                    </small>
                </div>
            </form>
            <div class="form-actions" style="border-top: 1px solid var(--border); padding: 20px; background: var(--surface);">
                <button type="button" class="btn-ghost" onclick="this.closest('.modal-overlay').remove()">Cancel</button>
                <button type="submit" form="applicationForm" class="btn-primary" id="submitApplicationBtn">Submit Application</button>
            </div>
        </div>
    `;

    document.body.appendChild(modal);

    // Character counter
    const coverLetterTextarea = modal.querySelector('[name="coverLetter"]');
    const charCount = modal.querySelector('#coverLetterCount');
    coverLetterTextarea.addEventListener('input', () => {
        charCount.textContent = coverLetterTextarea.value.length;
    });

    // Portfolio links
    const portfolioLinks = [];
    const portfolioInput = modal.querySelector('#portfolioLinkInput');
    const portfolioList = modal.querySelector('#portfolioLinksList');

    portfolioInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            const url = portfolioInput.value.trim();
            if (url && isValidUrl(url)) {
                portfolioLinks.push({ url, title: new URL(url).hostname });
                renderPortfolioLinks();
                portfolioInput.value = '';
            } else if (url) {
                window.showToast('Please enter a valid URL', 'error');
            }
        }
    });

    function renderPortfolioLinks() {
        portfolioList.innerHTML = portfolioLinks.map((link, index) => `
            <div style="display: flex; align-items: center; gap: 12px; padding: 12px; background: var(--surface); border-radius: 8px; margin-bottom: 8px;">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" style="flex-shrink: 0; color: var(--primary);">
                    <path d="M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71" stroke="currentColor" stroke-width="2"/>
                    <path d="M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71" stroke="currentColor" stroke-width="2"/>
                </svg>
                <a href="${link.url}" target="_blank" style="flex: 1; color: var(--primary); text-decoration: none; font-size: 14px;">${link.url}</a>
                <button type="button" onclick="this.closest('div').remove()" class="btn-ghost" style="padding: 4px 8px; min-width: auto;">
                    ×
                </button>
            </div>
        `).join('');
    }

    function isValidUrl(string) {
        try {
            new URL(string);
            return true;
        } catch (_) {
            return false;
        }
    }

    // Form submission
    const form = modal.querySelector('#applicationForm');
    const submitBtn = modal.querySelector('#submitApplicationBtn');

    form.addEventListener('submit', async (e) => {
        e.preventDefault();

        const formData = new FormData(form);

        const applicationData = {
            coverLetter: formData.get('coverLetter'),
            proposedBudget: {
                amount: Number(formData.get('proposedBudget'))
            },
            proposedTimeline: formData.get('proposedTimeline'),
            portfolioLinks: portfolioLinks
        };

        submitBtn.disabled = true;
        submitBtn.textContent = 'Submitting...';

        try {
            const response = await api.applyToProject(projectId, applicationData);

            if (response.success) {
                window.showToast('Application submitted successfully!', 'success');
                modal.remove();
                // Refresh project detail
                window.showProjectDetail(projectId);
            } else {
                throw new Error(response.message || 'Failed to submit application');
            }
        } catch (error) {
            console.error('Error submitting application:', error);
            window.showToast(error.message || 'Failed to submit application', 'error');
            submitBtn.disabled = false;
            submitBtn.textContent = 'Submit Application';
        }
    });
}

/**
 * View Project Applications (for project owner)
 */
export async function viewProjectApplications(projectId) {
    const loadingModal = document.createElement('div');
    loadingModal.className = 'modal-overlay';
    loadingModal.innerHTML = `
        <div class="modal" style="max-width: 900px;">
            <div class="text-center" style="padding: 60px 20px;">
                <svg width="64" height="64" viewBox="0 0 24 24" fill="none" style="opacity: 0.4; margin-bottom: 16px; animation: spin 1s linear infinite;">
                    <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="2"/>
                    <path d="M12 6v6l4 2" stroke="currentColor" stroke-width="2"/>
                </svg>
                <p class="text-secondary">Loading applications...</p>
            </div>
        </div>
    `;
    document.body.appendChild(loadingModal);

    try {
        const response = await api.getProjectApplications(projectId);

        if (!response.success) {
            throw new Error(response.message || 'Failed to load applications');
        }

        const applications = response.data.applications || [];

        loadingModal.remove();

        const modal = document.createElement('div');
        modal.className = 'modal-overlay';
        modal.innerHTML = `
            <div class="modal" style="max-width: 1000px;">
                <div class="modal-header">
                    <h2>Applications (${applications.length})</h2>
                    <button class="modal-close" onclick="this.closest('.modal-overlay').remove()">
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                            <path d="M18 6L6 18M6 6l12 12" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
                        </svg>
                    </button>
                </div>
                <div class="modal-body" style="max-height: calc(90vh - 150px); overflow-y: auto;">
                    ${applications.length > 0 ? renderApplicationsList(applications) : `
                        <div class="empty-state" style="padding: 60px 20px;">
                            <svg width="64" height="64" viewBox="0 0 24 24" fill="none" style="opacity: 0.3; margin-bottom: 16px;">
                                <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" stroke="currentColor" stroke-width="2"/>
                                <circle cx="8.5" cy="7" r="4" stroke="currentColor" stroke-width="2"/>
                                <path d="M20 8v6M23 11h-6" stroke="currentColor" stroke-width="2"/>
                            </svg>
                            <h3>No applications yet</h3>
                            <p style="color: var(--text-secondary);">Check back soon for creator applications</p>
                        </div>
                    `}
                </div>
            </div>
        `;

        document.body.appendChild(modal);

    } catch (error) {
        console.error('Error loading applications:', error);
        loadingModal.remove();
        window.showToast(error.message || 'Failed to load applications', 'error');
    }
}

function renderApplicationsList(applications) {
    return applications.map(app => `
        <div class="card" style="padding: 24px; margin-bottom: 16px;">
            <!-- Applicant Header -->
            <div style="display: flex; align-items: flex-start; justify-content: space-between; margin-bottom: 16px;">
                <div style="display: flex; align-items: center; gap: 16px;">
                    <img src="${app.creatorId.avatar || 'https://ui-avatars.com/api/?name=' + encodeURIComponent(app.creatorId.name)}"
                         alt="${app.creatorId.name}"
                         style="width: 56px; height: 56px; border-radius: 50%; object-fit: cover;">
                    <div>
                        <div style="font-weight: 700; font-size: 18px; margin-bottom: 4px;">${app.creatorId.name}</div>
                        <div style="color: var(--text-secondary); font-size: 14px;">${app.creatorId.category || 'Creator'}</div>
                        ${app.creatorId.rating ? `<div style="color: var(--primary); font-size: 14px;">⭐ ${app.creatorId.rating.average?.toFixed(1) || '5.0'}</div>` : ''}
                    </div>
                </div>
                <div style="text-align: right;">
                    <div style="font-size: 24px; font-weight: 700; color: #10b981;">$${app.proposedBudget.amount}</div>
                    <div style="font-size: 13px; color: var(--text-secondary);">${app.proposedTimeline}</div>
                </div>
            </div>

            <!-- Cover Letter -->
            <div style="margin-bottom: 16px;">
                <h4 style="margin-bottom: 8px; font-size: 14px; font-weight: 600; color: var(--text-secondary);">Cover Letter</h4>
                <p style="white-space: pre-wrap; line-height: 1.6; color: var(--text-primary);">${app.coverLetter}</p>
            </div>

            <!-- Portfolio Links -->
            ${app.portfolioLinks && app.portfolioLinks.length > 0 ? `
                <div style="margin-bottom: 16px;">
                    <h4 style="margin-bottom: 8px; font-size: 14px; font-weight: 600; color: var(--text-secondary);">Portfolio</h4>
                    <div style="display: flex; flex-wrap: wrap; gap: 8px;">
                        ${app.portfolioLinks.map(link => `
                            <a href="${link.url}" target="_blank" class="btn-ghost" style="font-size: 13px; padding: 6px 12px;">
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" style="margin-right: 4px;">
                                    <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" stroke="currentColor" stroke-width="2"/>
                                    <path d="M15 3h6v6M10 14L21 3" stroke="currentColor" stroke-width="2"/>
                                </svg>
                                View Work
                            </a>
                        `).join('')}
                    </div>
                </div>
            ` : ''}

            <!-- Status Badge -->
            <div style="display: flex; align-items: center; justify-content: space-between; padding-top: 16px; border-top: 1px solid var(--border);">
                <div>
                    <span style="padding: 6px 12px; border-radius: 6px; font-size: 13px; font-weight: 600; background: ${getStatusColor(app.status)}20; color: ${getStatusColor(app.status)};">
                        ${app.status.toUpperCase()}
                    </span>
                    <span style="color: var(--text-secondary); font-size: 13px; margin-left: 12px;">
                        Applied ${formatTimeAgo(app.createdAt)}
                    </span>
                </div>

                ${app.status === 'pending' ? `
                    <div style="display: flex; gap: 8px;">
                        <button class="btn-ghost" onclick="window.handleApplicationAction('${app._id}', 'rejected')" style="color: #ef4444;">
                            Reject
                        </button>
                        <button class="btn-primary" onclick="window.handleApplicationAction('${app._id}', 'accepted')">
                            Accept
                        </button>
                    </div>
                ` : ''}
            </div>
        </div>
    `).join('');
}

function getStatusColor(status) {
    const colors = {
        'pending': '#f59e0b',
        'accepted': '#10b981',
        'rejected': '#ef4444',
        'withdrawn': '#6b7280'
    };
    return colors[status] || '#6b7280';
}

/**
 * Handle Application Accept/Reject
 */
export async function handleApplicationAction(applicationId, status) {
    const action = status === 'accepted' ? 'accept' : 'reject';

    if (!confirm(`Are you sure you want to ${action} this application?`)) {
        return;
    }

    try {
        const response = await api.updateApplicationStatus(applicationId, status);

        if (response.success) {
            window.showToast(`Application ${status} successfully!`, 'success');
            // Refresh the applications modal
            const modalOverlay = document.querySelector('.modal-overlay');
            if (modalOverlay) {
                modalOverlay.remove();
            }
        } else {
            throw new Error(response.message || `Failed to ${action} application`);
        }
    } catch (error) {
        console.error(`Error ${action}ing application:`, error);
        window.showToast(error.message || `Failed to ${action} application`, 'error');
    }
}

/**
 * Show Client Profile (placeholder - can expand later)
 */
export function showClientProfile(clientId) {
    // For now, just show a toast. Can be expanded to show full profile
    window.showToast('Client profiles coming soon!', 'info');
}

// Export and make globally available
window.showPostProjectModal = showPostProjectModal;
window.showProjectDetail = showProjectDetail;
window.showApplicationForm = showApplicationForm;
window.viewProjectApplications = viewProjectApplications;
window.handleApplicationAction = handleApplicationAction;
window.showClientProfile = showClientProfile;
