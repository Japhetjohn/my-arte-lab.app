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
        <div class="modal" onclick="closeModalOnBackdrop(event)">
            <div class="modal-content glass-effect" style="border: 1px solid rgba(255,255,255,0.6); box-shadow: 0 12px 48px rgba(0,0,0,0.15);">
                <div class="modal-header" style="border-bottom: 1px solid rgba(255,255,255,0.2);">
                    <h2>Post a Project</h2>
                    <button class="icon-btn" onclick="closeModal()" style="background: rgba(255,255,255,0.2);">
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                            <path d="M18 6L6 18M6 6l12 12" stroke="currentColor" stroke-width="2"/>
                        </svg>
                    </button>
                </div>

                <div style="background: rgba(254, 243, 199, 0.6); backdrop-filter: blur(8px); padding: 16px; border-radius: 8px; margin-bottom: 20px; border-left: 4px solid #F59E0B; border-right: 1px solid rgba(255,255,255,0.5); border-top: 1px solid rgba(255,255,255,0.5); border-bottom: 1px solid rgba(255,255,255,0.5);">
                    <div style="color: #92400E; font-size: 14px; font-weight: 600; margin-bottom: 8px;">
                        How it works:
                    </div>
                    <ol style="color: #92400E; font-size: 13px; margin: 0; padding-left: 20px; line-height: 1.6;">
                        <li>Post your project with detailed requirements and budget</li>
                        <li>Creators browse and apply with their proposals</li>
                        <li>Review applications and select the best creator</li>
                        <li>Work begins once you accept their application</li>
                    </ol>
                </div>

                <form id="postProjectForm" style="padding: 0 24px 24px;">
                    <div class="form-group">
                        <label class="form-label">Project Title *</label>
                        <input type="text" name="title" class="form-input" placeholder="e.g., Need product photography for e-commerce store" required maxlength="200" style="background: rgba(255,255,255,0.5);">
                    </div>

                    <div class="form-group">
                        <label class="form-label">Category *</label>
                        <select name="category" class="form-input" required style="background: rgba(255,255,255,0.5);">
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
                        <select name="projectType" class="form-input" required style="background: rgba(255,255,255,0.5);">
                            <option value="one-time">One-Time Project</option>
                            <option value="ongoing">Ongoing Work</option>
                            <option value="bounty">Bounty (Best submission wins)</option>
                        </select>
                        <div class="caption mt-sm">One-time: Fixed scope. Ongoing: Retainer-based. Bounty: Competition style.</div>
                    </div>

                    <div class="form-group">
                        <label class="form-label">Description *</label>
                        <textarea name="description" class="form-textarea" rows="6" placeholder="Describe your project in detail. What are you looking for? What's the scope of work?" required maxlength="5000" style="background: rgba(255,255,255,0.5);"></textarea>
                        <div class="caption mt-sm"><span id="descCharCount">0</span>/5000 characters</div>
                    </div>

                    <div class="form-group">
                        <label class="form-label">Budget Range (USDC) *</label>
                        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px;">
                            <input type="number" name="budgetMin" class="form-input" placeholder="Min $" required min="0" step="1" style="background: rgba(255,255,255,0.5);">
                            <input type="number" name="budgetMax" class="form-input" placeholder="Max $" required min="0" step="1" style="background: rgba(255,255,255,0.5);">
                        </div>
                        <label style="display: flex; align-items: center; gap: 8px; margin-top: 8px; font-size: 14px;">
                            <input type="checkbox" name="negotiable" checked>
                            <span>Budget is negotiable</span>
                        </label>
                    </div>

                    <div class="form-group">
                        <label class="form-label">Start Date *</label>
                        <input type="date" name="startDate" class="form-input" required min="${new Date().toISOString().split('T')[0]}" onchange="updateProjectEndDateMin()" style="background: rgba(255,255,255,0.5);">
                        <div class="caption mt-sm">When do you want the project to start?</div>
                    </div>

                    <div class="form-group">
                        <label class="form-label">Expected Completion Date *</label>
                        <input type="date" name="deadline" class="form-input" required min="${new Date().toISOString().split('T')[0]}" style="background: rgba(255,255,255,0.5);">
                        <div class="caption mt-sm">When do you need this completed?</div>
                    </div>

                    <script>
                        function updateProjectEndDateMin() {
                            const startDate = document.querySelector('[name="startDate"]').value;
                            const endDateInput = document.querySelector('[name="deadline"]');
                            if (startDate) {
                                endDateInput.min = startDate;
                            }
                        }
                    </script>

                    <div class="form-group">
                        <label class="form-label">Skills Required</label>
                        <input type="text" id="skillsInput" class="form-input" placeholder="Type skill and press Enter" style="background: rgba(255,255,255,0.5);">
                        <div id="skillsList" style="display: flex; flex-wrap: wrap; gap: 8px; margin-top: 8px;"></div>
                        <div class="caption mt-sm">Press Enter to add each skill</div>
                    </div>

                    <div class="form-group">
                        <label class="form-label">Deliverables Expected</label>
                        <input type="text" id="deliverablesInput" class="form-input" placeholder="Type deliverable and press Enter" style="background: rgba(255,255,255,0.5);">
                        <div id="deliverablesList" style="display: flex; flex-wrap: wrap; gap: 8px; margin-top: 8px;"></div>
                        <div class="caption mt-sm">e.g., "50 edited photos", "2-minute video", etc.</div>
                    </div>

                    <div class="form-group">
                        <label class="form-label">Project Image (Optional)</label>
                        <input type="file" id="projectImage" class="form-input" accept="image/*" style="background: rgba(255,255,255,0.5);">
                        <div class="caption mt-sm">Upload a reference image or visual for your project (Max 10MB)</div>
                    </div>

                    <div class="form-actions" style="margin-top: 32px;">
                        <button type="button" class="btn-ghost" onclick="closeModal()">Cancel</button>
                        <button type="submit" class="btn-primary" id="submitProjectBtn">Post Project</button>
                    </div>
                </form>
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
            <div class="modal" onclick="closeModalOnBackdrop(event)">
                <div class="modal-content glass-effect" style="max-width: 900px; border: 1px solid rgba(255,255,255,0.6); box-shadow: 0 12px 48px rgba(0,0,0,0.15);">
                    <div class="modal-header" style="border-bottom: 1px solid rgba(255,255,255,0.2);">
                        <div>
                            <span class="badge" style="background: ${getProjectTypeBadgeColor(project.projectType)}dd; backdrop-filter: blur(4px); color: white; margin-bottom: 8px;">
                                ${project.projectType.replace('-', ' ')}
                            </span>
                            <h2 style="margin: 0;">${project.title}</h2>
                        </div>
                        <button class="icon-btn" onclick="closeModal()" style="background: rgba(255,255,255,0.2);">
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                                <path d="M18 6L6 18M6 6l12 12" stroke="currentColor" stroke-width="2"/>
                            </svg>
                        </button>
                    </div>

                    <div style="padding: 24px; overflow-y: auto;">
                        ${project.coverImage ? `
                            <img src="${project.coverImage}"
                                 alt="${project.title}"
                                 style="width: 100%; max-height: 400px; object-fit: cover; border-radius: var(--radius); margin-bottom: 24px; cursor: pointer; border: 1px solid rgba(255,255,255,0.3);"
                                 onclick="window.openImageModal('${project.coverImage}')">
                        ` : ''}

                        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 16px; margin-bottom: 24px; padding: 20px; background: rgba(255,255,255,0.4); border: 1px solid rgba(255,255,255,0.5); border-radius: var(--radius);">
                            <div>
                                <div class="caption">Budget</div>
                                <div style="font-size: 20px; font-weight: 700; color: #10b981;">
                                    $${project.budget.min} - $${project.budget.max}
                                </div>
                                ${project.budget.negotiable ? '<div class="caption" style="font-weight: 500;">Negotiable</div>' : ''}
                            </div>
                            <div>
                                <div class="caption">Timeline</div>
                                <div style="font-size: 16px; font-weight: 600; color: var(--text-primary);">${formatTimeline(project.timeline)}</div>
                                ${project.deadline ? `<div class="caption" style="font-weight: 500;">Deadline: ${new Date(project.deadline).toLocaleDateString()}</div>` : ''}
                            </div>
                            <div>
                                <div class="caption">Applications</div>
                                <div style="font-size: 16px; font-weight: 600; color: var(--text-primary);">${project.applicationsCount}</div>
                            </div>
                            <div>
                                <div class="caption">Posted</div>
                                <div style="font-size: 14px; font-weight: 500;">${formatTimeAgo(project.createdAt)}</div>
                            </div>
                        </div>

                        <div class="form-group">
                            <h3 style="color: var(--text-primary);">Description</h3>
                            <p style="white-space: pre-wrap; line-height: 1.6; color: var(--text-secondary);">${project.description}</p>
                        </div>

                        ${project.skillsRequired && project.skillsRequired.length > 0 ? `
                            <div class="form-group">
                                <h3 style="color: var(--text-primary);">Skills Required</h3>
                                <div style="display: flex; gap: 8px; flex-wrap: wrap;">
                                    ${project.skillsRequired.map(skill => `
                                        <span style="background: rgba(151, 71, 255, 0.8); backdrop-filter: blur(4px); color: white; padding: 6px 14px; border-radius: 6px; font-size: 14px; border: 1px solid rgba(255,255,255,0.3);">
                                            ${skill}
                                        </span>
                                    `).join('')}
                                </div>
                            </div>
                        ` : ''}

                        ${project.deliverables && project.deliverables.length > 0 ? `
                            <div class="form-group">
                                <h3 style="color: var(--text-primary);">Deliverables Expected</h3>
                                <ul style="list-style: none; padding: 0; margin: 0;">
                                    ${project.deliverables.map(item => `
                                        <li style="padding: 8px 0; display: flex; align-items: center; gap: 8px; color: var(--text-secondary); font-weight: 500;">
                                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" style="flex-shrink: 0; color: #10b981;">
                                                <path d="M20 6L9 17l-5-5" stroke="currentColor" stroke-width="2"/>
                                            </svg>
                                            <span>${item}</span>
                                        </li>
                                    `).join('')}
                                </ul>
                            </div>
                        ` : ''}

                        <div style="border-top: 1px solid rgba(255,255,255,0.3); padding-top: 24px; margin-top: 24px;">
                            <h3 style="margin-bottom: 16px; color: var(--text-primary);">Posted by</h3>
                            <div style="background: rgba(255,255,255,0.4); border: 1px solid rgba(255,255,255,0.5); padding: 20px; border-radius: var(--radius);">
                                <div style="display: flex; align-items: center; gap: 16px;">
                                    <img src="${project.clientId.avatar || 'https://ui-avatars.com/api/?name=' + encodeURIComponent(project.clientId.name)}"
                                         alt="${project.clientId.name}"
                                         style="width: 64px; height: 64px; border-radius: 50%; object-fit: cover; border: 2px solid rgba(255,255,255,0.6);">
                                    <div style="flex: 1;">
                                        <div style="font-weight: 700; font-size: 18px; margin-bottom: 4px; display: flex; align-items: center; gap: 8px; color: var(--text-primary);">
                                            ${project.clientId.name}
                                            ${project.clientId.isEmailVerified ? '<span style="color: #10b981;">✓</span>' : ''}
                                        </div>
                                        <div class="caption" style="font-weight: 500;">${project.clientId.email}</div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div class="form-actions" style="margin-top: 32px;">
                            ${renderProjectActions(project, hasApplied)}
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
            <button class="btn-ghost" onclick="closeModal()" style="background: rgba(255,255,255,0.3);">Close</button>
            <button class="btn-primary" onclick="window.viewProjectApplications('${project._id}')">
                View Applications (${project.applicationsCount})
            </button>
        `;
    }

    // If user is a creator
    if (appState.user) {
        if (hasApplied) {
            return `
                <button class="btn-ghost" onclick="closeModal()" style="background: rgba(255,255,255,0.3);">Close</button>
                <button class="btn-secondary" disabled style="background: rgba(255,255,255,0.5);">Already Applied</button>
            `;
        }

        return `
            <button class="btn-ghost" onclick="closeModal()" style="background: rgba(255,255,255,0.3);">Close</button>
            <button class="btn-primary" onclick="window.showApplicationForm('${project._id}')">
                Apply to Project
            </button>
        `;
    }

    // Not logged in
    return `
        <button class="btn-ghost" onclick="closeModal()" style="background: rgba(255,255,255,0.3);">Close</button>
        <button class="btn-primary" onclick="window.showAuthModal('signin')">
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
        <div class="modal" onclick="closeModalOnBackdrop(event)">
            <div class="modal-content glass-effect" style="border: 1px solid rgba(255,255,255,0.6); box-shadow: 0 12px 48px rgba(0,0,0,0.15);">
                <div class="modal-header" style="border-bottom: 1px solid rgba(255,255,255,0.2);">
                    <h2>Apply to Project</h2>
                    <button class="icon-btn" onclick="closeModal()" style="background: rgba(255,255,255,0.2);">
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                            <path d="M18 6L6 18M6 6l12 12" stroke="currentColor" stroke-width="2"/>
                        </svg>
                    </button>
                </div>

                <div style="background: rgba(254, 243, 199, 0.6); backdrop-filter: blur(8px); padding: 16px; border-radius: 8px; margin-bottom: 20px; border-left: 4px solid #F59E0B; border-right: 1px solid rgba(255,255,255,0.5); border-top: 1px solid rgba(255,255,255,0.5); border-bottom: 1px solid rgba(255,255,255,0.5);">
                    <div style="color: #92400E; font-size: 14px; font-weight: 600; margin-bottom: 8px;">
                        Application Tips:
                    </div>
                    <ul style="color: #92400E; font-size: 13px; margin: 0; padding-left: 20px; line-height: 1.6;">
                        <li>Highlight relevant experience and showcase your best work</li>
                        <li>Be specific about your approach and timeline</li>
                        <li>Propose a competitive but fair budget</li>
                    </ul>
                </div>

                <form id="applicationForm" style="padding: 0 24px 24px;">
                    <div class="form-group">
                        <label class="form-label">Cover Letter *</label>
                        <textarea name="coverLetter" class="form-textarea" rows="8" placeholder="Explain why you're the best fit for this project. Highlight your relevant experience and how you'll approach the work." required maxlength="2000" style="background: rgba(255,255,255,0.5);"></textarea>
                        <div class="caption mt-sm"><span id="coverLetterCount">0</span>/2000 characters</div>
                    </div>

                    <div class="form-group">
                        <label class="form-label">Your Proposed Budget (USDC) *</label>
                        <input type="number" name="proposedBudget" class="form-input" placeholder="Enter your price" required min="0" step="1" style="background: rgba(255,255,255,0.5);">
                        <div class="caption mt-sm">Based on project scope and your expertise</div>
                    </div>

                    <div class="form-group">
                        <label class="form-label">Timeline/Delivery Estimate *</label>
                        <input type="text" name="proposedTimeline" class="form-input" placeholder="e.g., 2 weeks, 5 business days" required maxlength="200" style="background: rgba(255,255,255,0.5);">
                        <div class="caption mt-sm">When can you deliver?</div>
                    </div>

                    <div class="form-group">
                        <label class="form-label">Portfolio Links (Optional)</label>
                        <input type="text" id="portfolioLinkInput" class="form-input" placeholder="Paste link and press Enter" style="background: rgba(255,255,255,0.5);">
                        <div id="portfolioLinksList" style="margin-top: 12px;"></div>
                        <div class="caption mt-sm">Add relevant work samples or portfolio pieces</div>
                    </div>

                    <div class="alert alert-success" style="background: rgba(16, 185, 129, 0.15); backdrop-filter: blur(4px); border: 1px solid rgba(16, 185, 129, 0.3);">
                        <strong>Note:</strong> You can edit or withdraw your application before the client reviews it.
                    </div>

                    <div class="form-actions" style="margin-top: 32px;">
                        <button type="button" class="btn-ghost" onclick="closeModal()" style="background: rgba(255,255,255,0.3);">Cancel</button>
                        <button type="submit" class="btn-primary" id="submitApplicationBtn">Submit Application</button>
                    </div>
                </form>
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
            <div style="display: flex; align-items: center; gap: 12px; padding: 12px; background: rgba(255,255,255,0.5); border: 1px solid rgba(255,255,255,0.6); border-radius: 8px; margin-bottom: 8px;">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" style="flex-shrink: 0; color: var(--primary);">
                    <path d="M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71" stroke="currentColor" stroke-width="2"/>
                    <path d="M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71" stroke="currentColor" stroke-width="2"/>
                </svg>
                <a href="${link.url}" target="_blank" style="flex: 1; color: var(--primary); text-decoration: none; font-size: 14px; font-weight: 500;">${link.url}</a>
                <button type="button" onclick="removePortfolioLink(${index})" class="btn-ghost" style="padding: 4px 8px; min-width: auto; background: rgba(255,255,255,0.5);">
                    ×
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
            <div class="modal" onclick="closeModalOnBackdrop(event)">
                <div class="modal-content glass-effect" style="max-width: 1000px; border: 1px solid rgba(255,255,255,0.6); box-shadow: 0 12px 48px rgba(0,0,0,0.15);">
                    <div class="modal-header" style="border-bottom: 1px solid rgba(255,255,255,0.2);">
                        <h2>Applications (${applications.length})</h2>
                        <button class="icon-btn" onclick="closeModal()" style="background: rgba(255,255,255,0.2);">
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                                <path d="M18 6L6 18M6 6l12 12" stroke="currentColor" stroke-width="2"/>
                            </svg>
                        </button>
                    </div>

                    <div style="padding: 24px; max-height: 80vh; overflow-y: auto;">
                        ${applications.length > 0 ? renderApplicationsList(applications) : `
                            <div class="empty-state glass-effect" style="padding: 60px 20px; border-radius: 24px; border: 1px solid rgba(255,255,255,0.4);">
                                <svg width="64" height="64" viewBox="0 0 24 24" fill="none" style="opacity: 0.3; margin-bottom: 16px;">
                                    <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" stroke="currentColor" stroke-width="2"/>
                                    <circle cx="8.5" cy="7" r="4" stroke="currentColor" stroke-width="2"/>
                                    <path d="M20 8v6M23 11h-6" stroke="currentColor" stroke-width="2"/>
                                </svg>
                                <h3>No applications yet</h3>
                                <p class="caption">Check back soon for creator applications</p>
                            </div>
                        `}

                        <div class="form-actions" style="margin-top: 24px;">
                            <button class="btn-ghost" onclick="closeModal()" style="background: rgba(255,255,255,0.3);">Close</button>
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
        <div class="card glass-effect" style="padding: 24px; margin-bottom: 16px; border: 1px solid rgba(255,255,255,0.5); background: rgba(255,255,255,0.6);">
            <div style="display: flex; align-items: flex-start; justify-content: space-between; margin-bottom: 16px; border-bottom: 1px solid rgba(255,255,255,0.3); padding-bottom: 16px;">
                <div style="display: flex; align-items: center; gap: 16px;">
                    <img src="${app.creatorId.avatar || 'https://ui-avatars.com/api/?name=' + encodeURIComponent(app.creatorId.name)}"
                         alt="${app.creatorId.name}"
                         style="width: 56px; height: 56px; border-radius: 50%; object-fit: cover; border: 2px solid rgba(255,255,255,0.6);">
                    <div>
                        <div style="font-weight: 700; font-size: 18px; margin-bottom: 4px; color: var(--text-primary);">${app.creatorId.name}</div>
                        <div class="caption" style="font-weight: 500;">${app.creatorId.category || 'Creator'}</div>
                    </div>
                </div>
                <div style="text-align: right;">
                    <div style="font-size: 24px; font-weight: 700; color: #10b981;">$${app.proposedBudget.amount}</div>
                    <div class="caption" style="font-weight: 500;">${app.proposedTimeline}</div>
                </div>
            </div>

            <div style="margin-bottom: 16px; background: rgba(255,255,255,0.4); padding: 16px; border-radius: 12px; border: 1px solid rgba(255,255,255,0.5);">
                <h4 class="caption" style="color: var(--text-primary); font-weight: 600;">Cover Letter</h4>
                <p style="white-space: pre-wrap; line-height: 1.6; margin-top: 8px; color: var(--text-secondary);">${app.coverLetter}</p>
            </div>

            ${app.portfolioLinks && app.portfolioLinks.length > 0 ? `
                <div style="margin-bottom: 16px;">
                    <h4 class="caption" style="color: var(--text-primary); font-weight: 600;">Portfolio</h4>
                    <div style="display: flex; flex-wrap: wrap; gap: 8px; margin-top: 8px;">
                        ${app.portfolioLinks.map(link => `
                            <a href="${link.url}" target="_blank" class="btn-ghost" style="font-size: 13px; padding: 6px 12px; background: rgba(151, 71, 255, 0.1); color: var(--primary); border: 1px solid rgba(151, 71, 255, 0.2);">
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

            <div style="display: flex; align-items: center; justify-content: space-between; padding-top: 16px; border-top: 1px solid rgba(255,255,255,0.3);">
                <div>
                    <span style="padding: 6px 12px; border-radius: 6px; font-size: 13px; font-weight: 600; background: ${getStatusColor(app.status)}20; color: ${getStatusColor(app.status)}; border: 1px solid ${getStatusColor(app.status)}40; backdrop-filter: blur(4px);">
                        ${app.status.toUpperCase()}
                    </span>
                    <span class="caption" style="margin-left: 12px; font-weight: 500;">
                        Applied ${formatTimeAgo(app.createdAt)}
                    </span>
                </div>

                ${app.status === 'pending' ? `
                    <div style="display: flex; gap: 8px;">
                        <button class="btn-ghost" onclick="window.handleApplicationAction('${app._id}', 'rejected')" style="color: #ef4444; background: rgba(239, 68, 68, 0.1);">
                            Reject
                        </button>
                        <button class="btn-primary" onclick="window.handleApplicationAction('${app._id}', 'accepted')" style="box-shadow: 0 4px 12px rgba(151,71,255,0.3);">
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