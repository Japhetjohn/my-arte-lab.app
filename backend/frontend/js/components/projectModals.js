import api from '../services/api.js';
import { appState } from '../state.js';
import { openModal } from '../utils.js';

/**
 * Show Post Project Modal
 */
export function showPostProjectModal() {
    if (!appState.user) {
        window.showAuthModal('signin');
        return;
    }

    const modalContent = `
        <div class="glass-modal-overlay" onclick="if(event.target === this) closeModal()">
            <div class="glass-modal-content" style="max-width: 640px;">
                <div class="glass-modal-header">
                    <span class="glass-modal-title">Post a Project</span>
                    <button class="glass-modal-close" onclick="closeModal()">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><path d="M18 6L6 18M6 6l12 12"/></svg>
                    </button>
                </div>

                <div class="glass-modal-body">
                    <div style="background: rgba(151, 71, 255, 0.05); border: 1px solid rgba(151, 71, 255, 0.15); border-radius: 20px; padding: 20px; margin-bottom: 32px;">
                        <div style="color: var(--primary); font-size: 14px; font-weight: 800; margin-bottom: 12px; display: flex; align-items: center; gap: 8px;">
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
                            How it works:
                        </div>
                        <ol style="color: var(--text-secondary); font-size: 13px; margin: 0; padding-left: 20px; line-height: 1.8; opacity: 0.8;">
                            <li>Post your project with detailed requirements and budget</li>
                            <li>Creators browse and apply with their proposals</li>
                            <li>Review applications and select the best creator</li>
                            <li>Work begins once you accept their application</li>
                        </ol>
                    </div>

                    <form id="postProjectForm" style="display: flex; flex-direction: column; gap: 24px;">
                        <div>
                            <label class="glass-form-label">Project Title *</label>
                            <input type="text" name="title" class="glass-input" placeholder="e.g., Need product photography for e-commerce store" required maxlength="200">
                        </div>

                        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px;">
                            <div>
                                <label class="glass-form-label">Category *</label>
                                <select name="category" class="glass-input" required style="appearance: none; background-image: url('data:image/svg+xml,%3Csvg width=%2214%22 height=%2214%22 viewBox=%220 0 24 24%22 fill=%22none%22 stroke=%22rgba(151,71,255,0.6)%22 stroke-width=%222.5%22 stroke-linecap=%22round%22 stroke-linejoin=%22round%22%3E%3Cpath d=%22M6 9l6 6 6-6%22/%3E%3C/svg%3E'); background-repeat: no-repeat; background-position: right 16px center;">
                                    <option value="">Select category</option>
                                    <option value="photography">Photography</option>
                                    <option value="videography">Videography</option>
                                    <option value="design">Design</option>
                                    <option value="illustration">Illustration</option>
                                    <option value="content">Content Creation</option>
                                    <option value="other">Other</option>
                                </select>
                            </div>
                            <div>
                                <label class="glass-form-label">Project Type *</label>
                                <select name="projectType" class="glass-input" required style="appearance: none; background-image: url('data:image/svg+xml,%3Csvg width=%2214%22 height=%2214%22 viewBox=%220 0 24 24%22 fill=%22none%22 stroke=%22rgba(151,71,255,0.6)%22 stroke-width=%222.5%22 stroke-linecap=%22round%22 stroke-linejoin=%22round%22%3E%3Cpath d=%22M6 9l6 6 6-6%22/%3E%3C/svg%3E'); background-repeat: no-repeat; background-position: right 16px center;">
                                    <option value="one-time">One-Time Project</option>
                                    <option value="ongoing">Ongoing Work</option>
                                    <option value="bounty">Bounty (Competition)</option>
                                </select>
                            </div>
                        </div>

                        <div>
                            <label class="glass-form-label">Description *</label>
                            <textarea name="description" class="glass-input" rows="5" placeholder="Describe your project in detail..." required maxlength="5000" style="min-height: 120px;"></textarea>
                            <div style="text-align: right; font-size: 11px; color: var(--text-secondary); margin-top: 6px; opacity: 0.6;"><span id="descCharCount">0</span>/5000</div>
                        </div>

                        <div>
                            <label class="glass-form-label">Budget Range (USDC) *</label>
                            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px;">
                                <input type="number" name="budgetMin" class="glass-input" placeholder="Min $" required min="0">
                                <input type="number" name="budgetMax" class="glass-input" placeholder="Max $" required min="0">
                            </div>
                            <label style="display: flex; align-items: center; gap: 10px; margin-top: 12px; cursor: pointer; user-select: none;">
                                <input type="checkbox" name="negotiable" checked style="width: 18px; height: 18px; accent-color: var(--primary);">
                                <span style="font-size: 14px; color: var(--text-secondary); font-weight: 600;">Budget is negotiable</span>
                            </label>
                        </div>

                        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px;">
                            <div>
                                <label class="glass-form-label">Start Date *</label>
                                <input type="date" name="startDate" class="glass-input" required min="${new Date().toISOString().split('T')[0]}" onchange="updateProjectEndDateMin()">
                            </div>
                            <div>
                                <label class="glass-form-label">Expected Completion *</label>
                                <input type="date" name="deadline" class="glass-input" required min="${new Date().toISOString().split('T')[0]}">
                            </div>
                        </div>

                        <div>
                            <label class="glass-form-label">Skills & Deliverables</label>
                            <div style="display: flex; flex-direction: column; gap: 12px;">
                                <input type="text" id="skillsInput" class="glass-input" placeholder="Type skill and press Enter">
                                <div id="skillsList" style="display: flex; flex-wrap: wrap; gap: 8px;"></div>
                                
                                <input type="text" id="deliverablesInput" class="glass-input" placeholder="Type deliverable and press Enter">
                                <div id="deliverablesList" style="display: flex; flex-wrap: wrap; gap: 8px;"></div>
                            </div>
                        </div>

                        <div>
                            <label class="glass-form-label">Project Image (Optional)</label>
                            <div style="position: relative;">
                                <input type="file" id="projectImage" class="glass-input" accept="image/*" style="opacity: 0; position: absolute; inset: 0; cursor: pointer; z-index: 2;">
                                <div style="border: 2px dashed rgba(151, 71, 255, 0.2); border-radius: 16px; padding: 24px; text-align: center; background: rgba(151, 71, 255, 0.03); transition: all 0.2s;" id="imageDropzone">
                                    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="var(--primary)" stroke-width="2" style="margin-bottom: 12px; opacity: 0.5;"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M17 8l-5-5-5 5M12 3v12"/></svg>
                                    <div style="font-size: 14px; color: var(--text-secondary); font-weight: 600;">Click or drag image to upload</div>
                                    <div style="font-size: 12px; color: var(--text-secondary); opacity: 0.5; margin-top: 4px;">Max 10MB</div>
                                </div>
                            </div>
                        </div>

                        <div style="margin-top: 12px; display: flex; gap: 16px;">
                            <button type="button" class="glass-btn-ghost" onclick="closeModal()" style="flex: 1;">Cancel</button>
                            <button type="submit" class="glass-btn-primary" id="submitProjectBtn" style="flex: 2;">Post Project</button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    `;

    document.getElementById('modalsContainer').innerHTML = modalContent;
    openModal();

    // Setup form handlers
    const skills = [];
    const deliverables = [];

    // Character counter
    const descTextarea = document.querySelector('[name="description"]');
    const charCount = document.getElementById('descCharCount');
    descTextarea.addEventListener('input', () => {
        charCount.textContent = descTextarea.value.length;
    });

    // Skills input
    const skillsInput = document.getElementById('skillsInput');
    const skillsList = document.getElementById('skillsList');

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
        skillsList.innerHTML = skills.map(skill => `
            <span style="background: rgba(151, 71, 255, 0.8); backdrop-filter: blur(4px); color: white; padding: 6px 12px; border-radius: 6px; font-size: 13px; display: inline-flex; align-items: center; gap: 6px; border: 1px solid rgba(255,255,255,0.3);">
                ${skill}
                <button type="button" onclick="removeSkill('${skill}')" style="background: none; border: none; color: white; cursor: pointer; padding: 0; line-height: 1;">
                    ×
                </button>
            </span>
        `).join('');
    }

    window.removeSkill = function (skill) {
        const index = skills.indexOf(skill);
        if (index > -1) {
            skills.splice(index, 1);
            renderSkills();
        }
    };

    // Deliverables input
    const deliverablesInput = document.getElementById('deliverablesInput');
    const deliverablesList = document.getElementById('deliverablesList');

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
        deliverablesList.innerHTML = deliverables.map(item => `
            <span style="background: rgba(16, 185, 129, 0.8); backdrop-filter: blur(4px); color: white; padding: 6px 12px; border-radius: 6px; font-size: 13px; display: inline-flex; align-items: center; gap: 6px; border: 1px solid rgba(255,255,255,0.3);">
                ${item}
                <button type="button" onclick="removeDeliverable('${item}')" style="background: none; border: none; color: white; cursor: pointer; padding: 0; line-height: 1;">
                    ×
                </button>
            </span>
        `).join('');
    }

    window.removeDeliverable = function (item) {
        const index = deliverables.indexOf(item);
        if (index > -1) {
            deliverables.splice(index, 1);
            renderDeliverables();
        }
    };

    // Form submission
    const form = document.getElementById('postProjectForm');
    const submitBtn = document.getElementById('submitProjectBtn');

    form.addEventListener('submit', async (e) => {
        e.preventDefault();

        const formData = new FormData(form);
        const budgetMin = Number(formData.get('budgetMin'));
        const budgetMax = Number(formData.get('budgetMax'));
        const startDate = formData.get('startDate');
        const deadline = formData.get('deadline');

        if (budgetMin > budgetMax) {
            window.showToast('Minimum budget cannot be greater than maximum budget', 'error');
            return;
        }

        // Calculate timeline from dates
        const start = new Date(startDate);
        const end = new Date(deadline);
        const daysDiff = Math.ceil((end - start) / (1000 * 60 * 60 * 24));

        let timeline = 'flexible';
        if (daysDiff <= 2) timeline = 'urgent';
        else if (daysDiff <= 7) timeline = '1-week';
        else if (daysDiff <= 14) timeline = '2-weeks';
        else if (daysDiff <= 30) timeline = '1-month';
        else if (daysDiff <= 60) timeline = '2-months';
        else if (daysDiff <= 90) timeline = '3-months';

        submitBtn.disabled = true;
        submitBtn.textContent = 'Posting...';

        try {
            // Upload project image if provided
            let coverImageUrl = null;
            const projectImageInput = document.getElementById('projectImage');
            if (projectImageInput.files && projectImageInput.files[0]) {
                const file = projectImageInput.files[0];

                // Validate file size (max 10MB)
                if (file.size > 10 * 1024 * 1024) {
                    throw new Error('Image file exceeds 10MB limit');
                }

                submitBtn.textContent = 'Uploading image...';

                const imageFormData = new FormData();
                imageFormData.append('file', file);

                const uploadResponse = await fetch('/api/upload/booking-attachment', {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${localStorage.getItem('token')}`
                    },
                    body: imageFormData
                });

                const uploadData = await uploadResponse.json();

                if (!uploadData.success) {
                    throw new Error('Failed to upload image');
                }

                coverImageUrl = uploadData.data.url;
                submitBtn.textContent = 'Creating project...';
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
                timeline: timeline,
                deadline: deadline,
                skillsRequired: skills,
                deliverables: deliverables,
                coverImage: coverImageUrl
            };

            const response = await api.createProject(projectData);

            if (response.success) {
                window.showToast('Project posted successfully!', 'success');
                window.closeModal();
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
    window.showLoadingSpinner('Loading project details...');

    try {
        const response = await api.getProject(projectId);

        if (!response.success) {
            throw new Error(response.message || 'Failed to load project');
        }

        const project = response.data.project;
        const hasApplied = response.data.hasApplied;

        window.hideLoadingSpinner();

        const modalContent = `
            <div class="glass-modal-overlay" onclick="if(event.target === this) closeModal()">
                <div class="glass-modal-content" style="max-width: 960px;">
                    <div class="glass-modal-header" style="align-items: flex-start;">
                        <div>
                            <span class="glass-tag" style="background: ${getProjectTypeBadgeColor(project.projectType)}20; color: ${getProjectTypeBadgeColor(project.projectType)}; border-color: ${getProjectTypeBadgeColor(project.projectType)}40; margin-bottom: 8px;">
                                ${project.projectType.replace('-', ' ')}
                            </span>
                            <span class="glass-modal-title" style="display: block;">${project.title}</span>
                        </div>
                        <button class="glass-modal-close" onclick="closeModal()">
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><path d="M18 6L6 18M6 6l12 12"/></svg>
                        </button>
                    </div>

                    <div class="glass-modal-body" style="padding-top: 0;">
                        <style>
                            .project-stat-card { background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.08); border-radius: 20px; padding: 20px; display: flex; flex-direction: column; gap: 4px; }
                            .project-stat-label { font-size: 11px; font-weight: 800; color: var(--text-secondary); text-transform: uppercase; letter-spacing: 0.1em; opacity: 0.6; }
                            .project-stat-value { font-size: 20px; font-weight: 800; color: var(--text-primary); }
                        </style>

                        ${project.coverImage ? `
                            <div style="position: relative; border-radius: 24px; overflow: hidden; margin: 0 0 32px; border: 1px solid rgba(255,255,255,0.1); box-shadow: 0 16px 48px rgba(0,0,0,0.2);">
                                <img src="${project.coverImage}"
                                     alt="${project.title}"
                                     style="width: 100%; max-height: 480px; object-fit: cover; cursor: pointer; display: block;"
                                     onclick="window.openImageModal('${project.coverImage}')">
                                <div style="position: absolute; inset: 0; background: linear-gradient(to bottom, transparent 60%, rgba(0,0,0,0.4)); pointer-events: none;"></div>
                            </div>
                        ` : ''}

                        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 16px; margin-bottom: 40px;">
                            <div class="project-stat-card">
                                <span class="project-stat-label">Budget Range</span>
                                <span class="project-stat-value" style="color: #10B981;">$${project.budget.min} - $${project.budget.max}</span>
                                ${project.budget.negotiable ? '<span style="font-size: 11px; color: #10B981; font-weight: 700;">Negotiable</span>' : ''}
                            </div>
                            <div class="project-stat-card">
                                <span class="project-stat-label">Timeline</span>
                                <span class="project-stat-value">${formatTimeline(project.timeline)}</span>
                                ${project.deadline ? `<span style="font-size: 11px; color: var(--text-secondary); opacity: 0.7;">Ends: ${new Date(project.deadline).toLocaleDateString()}</span>` : ''}
                            </div>
                            <div class="project-stat-card">
                                <span class="project-stat-label">Applications</span>
                                <span class="project-stat-value">${project.applicationsCount}</span>
                                <span style="font-size: 11px; color: var(--text-secondary); opacity: 0.7;">Submissions</span>
                            </div>
                            <div class="project-stat-card">
                                <span class="project-stat-label">Category</span>
                                <span class="project-stat-value" style="text-transform: capitalize;">${project.category}</span>
                                <span style="font-size: 11px; color: var(--text-secondary); opacity: 0.7;">${formatTimeAgo(project.createdAt)}</span>
                            </div>
                        </div>

                        <div style="display: grid; grid-template-columns: 1fr 320px; gap: 40px;">
                            <div style="display: flex; flex-direction: column; gap: 40px;">
                                <div>
                                    <h3 style="font-size: 20px; font-weight: 800; color: var(--text-primary); margin-bottom: 16px;">Description</h3>
                                    <p style="white-space: pre-wrap; line-height: 1.8; color: var(--text-secondary); font-size: 16px; opacity: 0.9;">${project.description}</p>
                                </div>

                                ${project.skillsRequired && project.skillsRequired.length > 0 ? `
                                    <div>
                                        <h3 style="font-size: 18px; font-weight: 800; color: var(--text-primary); margin-bottom: 16px;">Skills Required</h3>
                                        <div style="display: flex; gap: 10px; flex-wrap: wrap;">
                                            ${project.skillsRequired.map(skill => `
                                                <span class="glass-tag" style="background: rgba(151, 71, 255, 0.08); color: var(--primary); border-color: rgba(151, 71, 255, 0.15); padding: 8px 16px; font-size: 14px;">
                                                    ${skill}
                                                </span>
                                            `).join('')}
                                        </div>
                                    </div>
                                ` : ''}

                                ${project.deliverables && project.deliverables.length > 0 ? `
                                    <div>
                                        <h3 style="font-size: 18px; font-weight: 800; color: var(--text-primary); margin-bottom: 16px;">Expected Deliverables</h3>
                                        <div style="display: flex; flex-direction: column; gap: 12px;">
                                            ${project.deliverables.map(item => `
                                                <div style="display: flex; align-items: start; gap: 14px; background: rgba(255,255,255,0.02); border: 1px solid rgba(255,255,255,0.06); border-radius: 16px; padding: 16px;">
                                                    <div style="width: 24px; height: 24px; border-radius: 8px; background: rgba(16, 185, 129, 0.1); display: flex; align-items: center; justify-content: center; color: #10B981; flex-shrink: 0; margin-top: 2px;">
                                                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6L9 17l-5-5"/></svg>
                                                    </div>
                                                    <span style="color: var(--text-secondary); line-height: 1.6; font-weight: 500;">${item}</span>
                                                </div>
                                            `).join('')}
                                        </div>
                                    </div>
                                ` : ''}
                            </div>

                            <div style="display: flex; flex-direction: column; gap: 24px;">
                                <div style="background: rgba(151, 71, 255, 0.03); border: 1px solid rgba(151, 71, 255, 0.1); border-radius: 24px; padding: 24px;">
                                    <h4 style="font-size: 13px; font-weight: 800; color: var(--text-secondary); text-transform: uppercase; letter-spacing: 0.1em; margin-bottom: 20px; opacity: 0.6;">Posted By</h4>
                                    <div style="display: flex; align-items: center; gap: 16px; margin-bottom: 24px;">
                                        <img src="${project.clientId.avatar || 'https://ui-avatars.com/api/?name=' + encodeURIComponent(project.clientId.name)}"
                                             alt="${project.clientId.name}"
                                             style="width: 56px; height: 56px; border-radius: 50%; object-fit: cover; border: 2px solid var(--primary);">
                                        <div>
                                            <div style="font-weight: 800; font-size: 17px; color: var(--text-primary); margin-bottom: 2px; display: flex; align-items: center; gap: 6px;">
                                                ${project.clientId.name}
                                                ${project.clientId.isEmailVerified ? '<svg width="16" height="16" viewBox="0 0 24 24" fill="var(--primary)" style="color: white;"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z"/></svg>' : ''}
                                            </div>
                                            <div style="font-size: 13px; color: var(--text-secondary); opacity: 0.7;">Client</div>
                                        </div>
                                    </div>
                                    ${renderProjectActions(project, hasApplied)}
                                </div>

                                <button class="glass-btn-ghost" onclick="closeModal()">Close Details</button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;

        document.getElementById('modalsContainer').innerHTML = modalContent;
        openModal();

    } catch (error) {
        console.error('Error loading project:', error);
        window.hideLoadingSpinner();
        window.showToast(error.message || 'Failed to load project details', 'error');
    }
}

function renderProjectActions(project, hasApplied) {
    // If user owns the project
    if (appState.user && project.clientId._id === appState.user._id) {
        return `
            <button class="glass-btn-primary" onclick="window.viewProjectApplications('${project._id}')">
                View Applications (${project.applicationsCount})
            </button>
        `;
    }

    // If user is a creator
    if (appState.user) {
        if (hasApplied) {
            return `
                <button class="glass-btn-primary" disabled style="background: rgba(16, 185, 129, 0.1); color: #10B981; border-color: rgba(16, 185, 129, 0.2);">
                    Applied Successfully
                </button>
            `;
        }

        return `
            <button class="glass-btn-primary" onclick="window.showApplicationForm('${project._id}')">
                Apply to Project
            </button>
        `;
    }

    // Not logged in
    return `
        <button class="glass-btn-primary" onclick="window.showAuthModal('signin')">
            Sign In to Apply
        </button>
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

    const modalContent = `
        <div class="glass-modal-overlay" onclick="if(event.target === this) closeModal()">
            <div class="glass-modal-content" style="max-width: 650px; background: rgba(13, 13, 18, 0.95);">
                <div class="glass-modal-header" style="border-bottom: 1px solid rgba(255,255,255,0.08); padding-bottom: 24px;">
                    <div style="display: flex; align-items: center; gap: 16px;">
                        <div style="width: 48px; height: 48px; background: linear-gradient(135deg, #9747FF, #6B46FF); border-radius: 14px; display: flex; align-items: center; justify-content: center; box-shadow: 0 8px 20px rgba(151,71,255,0.3);">
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                        </div>
                        <div>
                            <span class="glass-modal-title" style="margin: 0; font-size: 22px;">Apply to Project</span>
                            <div style="color: var(--text-secondary); font-size: 13px; opacity: 0.6; font-weight: 500; margin-top: 2px;">Submit your best proposal to standard out</div>
                        </div>
                    </div>
                    <button class="glass-modal-close" onclick="closeModal()">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><path d="M18 6L6 18M6 6l12 12"/></svg>
                    </button>
                </div>

                <div class="glass-modal-body" style="padding-top: 32px;">
                    <div style="background: linear-gradient(135deg, rgba(151, 71, 255, 0.1), rgba(107, 70, 255, 0.05)); border: 1px solid rgba(151, 71, 255, 0.2); border-radius: 20px; padding: 24px; margin-bottom: 32px; display: flex; gap: 20px; align-items: flex-start;">
                        <div style="color: var(--primary); background: rgba(151, 71, 255, 0.15); width: 32px; height: 32px; border-radius: 10px; display: flex; align-items: center; justify-content: center; flex-shrink: 0;">
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
                        </div>
                        <div style="flex: 1;">
                            <div style="color: var(--text-primary); font-size: 14px; font-weight: 800; margin-bottom: 8px;">Pro-Tips for Success:</div>
                            <ul style="color: var(--text-secondary); font-size: 13px; margin: 0; padding-left: 16px; line-height: 1.8; opacity: 0.9; font-weight: 500;">
                                <li>Be specific about your <span style="color: var(--primary); font-weight: 700;">unique approach</span></li>
                                <li>Include relevant links to your <span style="color: var(--primary); font-weight: 700;">best past work</span></li>
                                <li>Propose a timeline that is <span style="color: var(--primary); font-weight: 700;">realistic and clear</span></li>
                            </ul>
                        </div>
                    </div>

                    <form id="applicationForm" style="display: flex; flex-direction: column; gap: 32px;">
                        <div style="display: flex; flex-direction: column; gap: 12px;">
                            <div style="display: flex; align-items: center; gap: 10px;">
                                <span style="font-size: 11px; font-weight: 800; color: var(--primary); text-transform: uppercase; letter-spacing: 0.1em;">Section 01</span>
                                <div style="height: 1px; flex: 1; background: linear-gradient(to right, rgba(151,71,255,0.2), transparent);"></div>
                            </div>
                            <h4 style="margin: 0; font-size: 16px; font-weight: 800; color: var(--text-primary);">The Pitch (Cover Letter)</h4>
                            <div style="position: relative;">
                                <textarea name="coverLetter" class="glass-input" rows="7" placeholder="Why are you the perfect fit for this? Share your vision..." required maxlength="2000" style="padding: 16px; background: rgba(0,0,0,0.2); border-color: rgba(255,255,255,0.08);"></textarea>
                                <div style="text-align: right; font-size: 11px; color: var(--text-secondary); margin-top: 8px; font-weight: 700; opacity: 0.6; font-family: 'JetBrains Mono', monospace;">
                                    <span id="coverLetterCount">0</span>/2000
                                </div>
                            </div>
                        </div>

                        <div style="display: flex; flex-direction: column; gap: 12px;">
                            <div style="display: flex; align-items: center; gap: 10px;">
                                <span style="font-size: 11px; font-weight: 800; color: var(--primary); text-transform: uppercase; letter-spacing: 0.1em;">Section 02</span>
                                <div style="height: 1px; flex: 1; background: linear-gradient(to right, rgba(151,71,255,0.2), transparent);"></div>
                            </div>
                            <h4 style="margin: 0; font-size: 16px; font-weight: 800; color: var(--text-primary);">The Offer (Price & Timing)</h4>
                            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px;">
                                <div>
                                    <label class="glass-form-label" style="margin-bottom: 8px; font-size: 12px; opacity: 0.8;">Budget (USDC) *</label>
                                    <div style="position: relative;">
                                        <input type="number" name="proposedBudget" class="glass-input" placeholder="0.00" required min="1" step="0.01" style="padding-left: 36px; background: rgba(0,0,0,0.2); border-color: rgba(255,255,255,0.08);">
                                        <div style="position: absolute; left: 14px; top: 50%; transform: translateY(-50%); color: var(--primary); font-weight: 800; font-size: 14px;">$</div>
                                    </div>
                                </div>
                                <div>
                                    <label class="glass-form-label" style="margin-bottom: 8px; font-size: 12px; opacity: 0.8;">Timeline *</label>
                                    <div style="position: relative;">
                                        <input type="text" name="proposedTimeline" class="glass-input" placeholder="e.g., 5-7 business days" required maxlength="200" style="padding-left: 36px; background: rgba(0,0,0,0.2); border-color: rgba(255,255,255,0.08);">
                                        <div style="position: absolute; left: 14px; top: 50%; transform: translateY(-50%); color: var(--primary);">
                                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div style="display: flex; flex-direction: column; gap: 12px;">
                            <div style="display: flex; align-items: center; gap: 10px;">
                                <span style="font-size: 11px; font-weight: 800; color: var(--primary); text-transform: uppercase; letter-spacing: 0.1em;">Section 03</span>
                                <div style="height: 1px; flex: 1; background: linear-gradient(to right, rgba(151,71,255,0.2), transparent);"></div>
                            </div>
                            <h4 style="margin: 0; font-size: 16px; font-weight: 800; color: var(--text-primary);">Supporting Proof (Portfolio)</h4>
                            <div style="position: relative;">
                                <input type="text" id="portfolioLinkInput" class="glass-input" placeholder="Paste link and press Enter" style="padding-right: 100px; background: rgba(0,0,0,0.2); border-color: rgba(255,255,255,0.08);">
                                <div style="position: absolute; right: 12px; top: 50%; transform: translateY(-50%); background: rgba(151,71,255,0.1); color: var(--primary); font-size: 10px; font-weight: 800; padding: 4px 10px; border-radius: 6px; letter-spacing: 0.05em; border: 1px solid rgba(151,71,255,0.2);">PRESS ENTER</div>
                            </div>
                            <div id="portfolioLinksList" style="margin-top: 12px; display: flex; flex-direction: column; gap: 10px;"></div>
                        </div>

                        <div style="background: rgba(16, 185, 129, 0.05); border: 1px solid rgba(16, 185, 129, 0.15); border-radius: 18px; padding: 16px; font-size: 12px; color: #10B981; font-weight: 600; display: flex; align-items: center; gap: 12px;">
                            <div style="width: 24px; height: 24px; border-radius: 50%; background: rgba(16, 185, 129, 0.1); display: flex; align-items: center; justify-content: center; flex-shrink: 0;">
                                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="4"><path d="M20 6L9 17l-5-5"/></svg>
                            </div>
                            <span>Editable before client review.</span>
                        </div>

                        <div style="display: flex; gap: 16px; margin-top: 8px;">
                            <button type="button" class="glass-btn-ghost" onclick="closeModal()" style="flex: 1; font-weight: 700;">Cancel</button>
                            <button type="submit" class="glass-btn-primary" id="submitApplicationBtn" style="flex: 2; font-weight: 800; font-size: 16px; box-shadow: 0 12px 24px rgba(151,71,255,0.25);">Submit Application</button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    `;

    document.getElementById('modalsContainer').innerHTML = modalContent;
    openModal();

    // Character counter
    const coverLetterTextarea = document.querySelector('[name="coverLetter"]');
    const charCount = document.getElementById('coverLetterCount');
    coverLetterTextarea.addEventListener('input', () => {
        charCount.textContent = coverLetterTextarea.value.length;
    });

    // Portfolio links
    const portfolioLinks = [];
    const portfolioInput = document.getElementById('portfolioLinkInput');
    const portfolioList = document.getElementById('portfolioLinksList');

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
            <div style="display: flex; align-items: center; justify-content: space-between; padding: 10px 16px; background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.08); border-radius: 12px;">
                <div style="display: flex; align-items: center; gap: 10px; flex: 1; min-width: 0;">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--primary)" stroke-width="2.5"><path d="M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71"/></svg>
                    <span style="font-size: 13px; color: var(--text-secondary); overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${link.url}</span>
                </div>
                <button type="button" onclick="removePortfolioLink(${index})" style="background: none; border: none; color: #ef4444; cursor: pointer; padding: 4px; opacity: 0.6; transition: opacity 0.2s;">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><path d="M18 6L6 18M6 6l12 12"/></svg>
                </button>
            </div>
        `).join('');
    }

    window.removePortfolioLink = function (index) {
        portfolioLinks.splice(index, 1);
        renderPortfolioLinks();
    };

    function isValidUrl(string) {
        try {
            new URL(string);
            return true;
        } catch (_) {
            return false;
        }
    }

    // Form submission
    const form = document.getElementById('applicationForm');
    const submitBtn = document.getElementById('submitApplicationBtn');

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
                window.closeModal();
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
    window.showLoadingSpinner('Loading applications...');

    try {
        const response = await api.getProjectApplications(projectId);

        if (!response.success) {
            throw new Error(response.message || 'Failed to load applications');
        }

        const applications = response.data.applications || [];

        window.hideLoadingSpinner();

        const modalContent = `
            <div class="glass-modal-overlay" onclick="if(event.target === this) closeModal()">
                <div class="glass-modal-content" style="max-width: 800px;">
                    <div class="glass-modal-header">
                        <span class="glass-modal-title">Applications (${applications.length})</span>
                        <button class="glass-modal-close" onclick="closeModal()">
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><path d="M18 6L6 18M6 6l12 12"/></svg>
                        </button>
                    </div>

                    <div class="glass-modal-body" style="max-height: 70vh; overflow-y: auto; padding-right: 8px;">
                        ${applications.length > 0 ? renderApplicationsList(applications) : `
                            <div style="text-align: center; padding: 60px 20px;">
                                <div style="width: 80px; height: 80px; background: rgba(151, 71, 255, 0.05); border-radius: 28px; display: flex; align-items: center; justify-content: center; margin: 0 auto 24px; color: var(--primary); opacity: 0.5;">
                                    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M16 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2M8.5 7a4 4 0 100-8 4 4 0 000 8zM20 8v6M23 11h-6"/></svg>
                                </div>
                                <h3 style="font-weight: 800; font-size: 20px; color: var(--text-primary); margin-bottom: 8px;">No applications yet</h3>
                                <p style="color: var(--text-secondary); font-size: 15px;">Check back soon for creator applications</p>
                            </div>
                        `}

                        <div style="margin-top: 32px; text-align: center;">
                            <button class="glass-btn-ghost" onclick="closeModal()">Close Window</button>
                        </div>
                    </div>
                </div>
            </div>
        `;

        document.getElementById('modalsContainer').innerHTML = modalContent;
        openModal();

    } catch (error) {
        console.error('Error loading applications:', error);
        window.hideLoadingSpinner();
        window.showToast(error.message || 'Failed to load applications', 'error');
    }
}

function renderApplicationsList(applications) {
    return applications.map(app => `
        <div style="background: rgba(255,255,255,0.02); border: 1px solid rgba(255,255,255,0.06); border-radius: 24px; padding: 24px; margin-bottom: 20px;">
            <div style="display: flex; align-items: start; justify-content: space-between; margin-bottom: 20px;">
                <div style="display: flex; align-items: center; gap: 16px;">
                    <img src="${app.creatorId.avatar || 'https://ui-avatars.com/api/?name=' + encodeURIComponent(app.creatorId.name)}"
                         alt="${app.creatorId.name}"
                         style="width: 50px; height: 50px; border-radius: 50%; object-fit: cover; border: 2px solid var(--primary);">
                    <div>
                        <div style="font-weight: 800; font-size: 16px; color: var(--text-primary); margin-bottom: 2px;">${app.creatorId.name}</div>
                        <div style="font-size: 13px; color: var(--primary); font-weight: 600; opacity: 0.8;">${app.creatorId.category || 'Creator'}</div>
                    </div>
                </div>
                <div style="text-align: right;">
                    <div style="font-size: 22px; font-weight: 800; color: #10B981; margin-bottom: 2px;">$${app.proposedBudget.amount}</div>
                    <div style="font-size: 12px; color: var(--text-secondary); font-weight: 700; opacity: 0.6;">${app.proposedTimeline}</div>
                </div>
            </div>

            <div style="background: rgba(151, 71, 255, 0.03); border: 1px solid rgba(151, 71, 255, 0.08); border-radius: 16px; padding: 16px; margin-bottom: 20px;">
                <div style="font-size: 11px; font-weight: 800; color: var(--text-secondary); text-transform: uppercase; letter-spacing: 0.1em; margin-bottom: 8px; opacity: 0.6;">Cover Letter</div>
                <p style="white-space: pre-wrap; line-height: 1.6; color: var(--text-secondary); font-size: 14px; margin: 0;">${app.coverLetter}</p>
            </div>

            ${app.portfolioLinks && app.portfolioLinks.length > 0 ? `
                <div style="margin-bottom: 20px;">
                    <div style="font-size: 11px; font-weight: 800; color: var(--text-secondary); text-transform: uppercase; letter-spacing: 0.1em; margin-bottom: 12px; opacity: 0.6;">Portfolio</div>
                    <div style="display: flex; flex-wrap: wrap; gap: 8px;">
                        ${app.portfolioLinks.map(link => `
                            <a href="${link.url}" target="_blank" class="glass-btn-ghost" style="font-size: 12px; padding: 8px 16px; min-width: auto; background: rgba(151, 71, 255, 0.05);">
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" style="margin-right: 6px; opacity: 0.6;"><path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6M15 3h6v6M10 14L21 3"/></svg>
                                View Portoflio
                            </a>
                        `).join('')}
                    </div>
                </div>
            ` : ''}

            <div style="display: flex; align-items: center; justify-content: space-between; padding-top: 20px; border-top: 1px solid rgba(255,255,255,0.06);">
                <div style="display: flex; align-items: center; gap: 12px;">
                    <span style="padding: 6px 12px; border-radius: 8px; font-size: 12px; font-weight: 800; text-transform: uppercase; background: ${getStatusColor(app.status)}15; color: ${getStatusColor(app.status)}; border: 1px solid ${getStatusColor(app.status)}30;">
                        ${app.status}
                    </span>
                    <span style="font-size: 12px; color: var(--text-secondary); font-weight: 600; opacity: 0.6;">
                        Applied ${formatTimeAgo(app.createdAt)}
                    </span>
                </div>

                ${app.status === 'pending' ? `
                    <div style="display: flex; gap: 8px;">
                        <button class="glass-btn-ghost" onclick="window.handleApplicationAction('${app._id}', 'rejected')" style="color: #ef4444; border-color: rgba(239, 68, 68, 0.2); background: rgba(239, 68, 68, 0.05); padding: 8px 16px; font-size: 14px; min-width: auto;">Reject</button>
                        <button class="glass-btn-primary" onclick="window.handleApplicationAction('${app._id}', 'accepted')" style="padding: 8px 24px; font-size: 14px; min-width: auto; box-shadow: 0 8px 20px rgba(151, 71, 255, 0.2);">Accept Proposal</button>
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
            const successMsg = status === 'accepted'
                ? 'Application accepted! Please go to "Bookings" to proceed with payment and start the project.'
                : 'Application rejected successfully.';
            window.showToast(successMsg, 'success');
            window.closeModal();
            // Optional: navigate to bookings if accepted
            if (status === 'accepted') {
                window.navigateToPage('bookings');
            }
        } else {
            throw new Error(response.message || `Failed to ${action} application`);
        }
    } catch (error) {
        console.error(`Error ${action}ing application:`, error);
        window.showToast(error.message || `Failed to ${action} application`, 'error');
    }
}

// Export and make globally available
window.showPostProjectModal = showPostProjectModal;
window.showProjectDetail = showProjectDetail;
window.showApplicationForm = showApplicationForm;
window.viewProjectApplications = viewProjectApplications;
window.handleApplicationAction = handleApplicationAction;