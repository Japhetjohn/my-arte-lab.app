import api from '../services/api.js';
import { appState } from '../state.js';

const MODAL_STYLES = `
<style>
    .pm-overlay { position: fixed; inset: 0; background: rgba(15, 23, 36, 0.6); backdrop-filter: blur(8px); z-index: 1000; display: flex; align-items: center; justify-content: center; padding: 20px; }
    .pm-modal { background: var(--surface); border: 1px solid rgba(255,255,255,0.08); border-radius: 24px; max-width: 640px; width: 100%; max-height: 90vh; overflow: hidden; display: flex; flex-direction: column; }
    [data-theme="dark"] .pm-modal { background: #1E293B; }
    .pm-modal-lg { max-width: 800px; }
    .pm-header { display: flex; align-items: center; justify-content: space-between; padding: 20px 24px; border-bottom: 1px solid rgba(255,255,255,0.06); }
    .pm-header-title { display: flex; align-items: center; gap: 12px; }
    .pm-header-icon { width: 40px; height: 40px; background: linear-gradient(135deg, var(--primary), var(--secondary)); border-radius: 12px; display: flex; align-items: center; justify-content: center; color: white; }
    .pm-title { font-size: 18px; font-weight: 700; color: var(--text-primary); }
    .pm-subtitle { font-size: 13px; color: var(--text-secondary); }
    .pm-close { width: 36px; height: 36px; border-radius: 10px; border: none; background: rgba(255,255,255,0.05); color: var(--text-secondary); cursor: pointer; display: flex; align-items: center; justify-content: center; transition: all 0.2s; }
    .pm-close:hover { background: rgba(255,255,255,0.1); color: var(--text-primary); }
    .pm-body { padding: 24px; overflow-y: auto; flex: 1; }
    
    /* Info Cards */
    .pm-info { background: rgba(151, 71, 255, 0.05); border: 1px solid rgba(151, 71, 255, 0.15); border-radius: 16px; padding: 16px; margin-bottom: 24px; display: flex; gap: 12px; }
    .pm-info-icon { width: 32px; height: 32px; background: rgba(151, 71, 255, 0.1); border-radius: 10px; display: flex; align-items: center; justify-content: center; color: var(--primary); flex-shrink: 0; }
    .pm-info-text { font-size: 13px; color: var(--text-secondary); line-height: 1.6; }
    .pm-info-text ol { margin: 0; padding-left: 16px; }
    .pm-info-text li { margin-bottom: 4px; }
    
    /* Form Elements */
    .pm-form { display: flex; flex-direction: column; gap: 20px; }
    .pm-field { display: flex; flex-direction: column; gap: 8px; }
    .pm-label { font-size: 11px; font-weight: 700; color: var(--text-secondary); text-transform: uppercase; letter-spacing: 0.05em; }
    .pm-input { width: 100%; background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.08); border-radius: 12px; padding: 12px 16px; color: var(--text-primary); font-size: 14px; outline: none; transition: all 0.2s; }
    .pm-input:focus { border-color: var(--primary); background: rgba(255,255,255,0.05); }
    .pm-textarea { min-height: 120px; resize: vertical; }
    .pm-select { appearance: none; background-image: url('data:image/svg+xml,%3Csvg width=%2212%22 height=%2212%22 viewBox=%220 0 24 24%22 fill=%22none%22 stroke=%22%2394A3B8%22 stroke-width=%222%22%3E%3Cpath d=%22M6 9l6 6 6-6%22/%3E%3C/svg%3E'); background-repeat: no-repeat; background-position: right 16px center; padding-right: 40px; }
    .pm-input-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
    .pm-char-count { text-align: right; font-size: 11px; color: var(--text-secondary); margin-top: 6px; }
    
    /* Tags */
    .pm-tag { display: inline-flex; align-items: center; gap: 6px; background: rgba(151, 71, 255, 0.15); color: var(--primary); padding: 6px 12px; border-radius: 8px; font-size: 13px; font-weight: 600; }
    .pm-tag-remove { background: none; border: none; color: var(--primary); cursor: pointer; padding: 0; font-size: 16px; line-height: 1; }
    .pm-tags-container { display: flex; flex-wrap: wrap; gap: 8px; }
    .pm-tag-deliverable { background: rgba(16, 185, 129, 0.15); color: #10B981; }
    .pm-tag-deliverable .pm-tag-remove { color: #10B981; }
    
    /* File Upload */
    .pm-upload { position: relative; }
    .pm-upload-input { position: absolute; inset: 0; opacity: 0; cursor: pointer; z-index: 2; }
    .pm-upload-zone { border: 2px dashed rgba(151, 71, 255, 0.2); border-radius: 16px; padding: 32px; text-align: center; background: rgba(151, 71, 255, 0.03); transition: all 0.2s; }
    .pm-upload-zone:hover { border-color: rgba(151, 71, 255, 0.4); background: rgba(151, 71, 255, 0.05); }
    .pm-upload-icon { color: var(--primary); opacity: 0.5; margin-bottom: 12px; }
    .pm-upload-text { font-size: 14px; color: var(--text-secondary); font-weight: 600; }
    .pm-upload-hint { font-size: 12px; color: var(--text-secondary); opacity: 0.6; margin-top: 4px; }
    
    /* Buttons */
    .pm-btn { padding: 12px 24px; border-radius: 12px; font-size: 14px; font-weight: 700; cursor: pointer; transition: all 0.2s; border: none; display: inline-flex; align-items: center; justify-content: center; gap: 8px; }
    .pm-btn-primary { background: var(--primary); color: white; }
    .pm-btn-primary:hover { background: #7c3aed; }
    .pm-btn-secondary { background: rgba(255,255,255,0.05); color: var(--text-primary); border: 1px solid rgba(255,255,255,0.1); }
    .pm-btn-secondary:hover { background: rgba(255,255,255,0.08); }
    .pm-btn-success { background: #10B981; color: white; }
    .pm-btn-success:hover { background: #059669; }
    .pm-btn-danger { background: #EF4444; color: white; }
    .pm-btn-danger:hover { background: #DC2626; }
    .pm-btn-full { width: 100%; }
    .pm-btn:disabled { opacity: 0.6; cursor: not-allowed; }
    .pm-actions { display: flex; gap: 12px; margin-top: 8px; }
    .pm-actions .pm-btn { flex: 1; }
    
    /* Checkbox */
    .pm-checkbox { display: flex; align-items: center; gap: 10px; cursor: pointer; }
    .pm-checkbox input { width: 18px; height: 18px; accent-color: var(--primary); }
    .pm-checkbox span { font-size: 14px; color: var(--text-secondary); font-weight: 600; }
    
    /* Project Detail Specific */
    .pm-detail-cover { border-radius: 20px; overflow: hidden; margin-bottom: 24px; border: 1px solid rgba(255,255,255,0.08); }
    .pm-detail-cover img { width: 100%; max-height: 300px; object-fit: cover; display: block; }
    .pm-stats-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 12px; margin-bottom: 24px; }
    .pm-stat { background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.06); border-radius: 16px; padding: 16px; }
    .pm-stat-label { font-size: 11px; font-weight: 700; color: var(--text-secondary); text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 8px; }
    .pm-stat-value { font-size: 18px; font-weight: 800; color: var(--text-primary); }
    .pm-stat-value.success { color: #10B981; }
    .pm-stat-value.primary { color: var(--primary); }
    .pm-section-title { font-size: 16px; font-weight: 700; color: var(--text-primary); margin-bottom: 16px; }
    .pm-desc { font-size: 14px; color: var(--text-secondary); line-height: 1.7; white-space: pre-wrap; margin-bottom: 24px; }
    .pm-client-card { background: rgba(151, 71, 255, 0.03); border: 1px solid rgba(151, 71, 255, 0.1); border-radius: 20px; padding: 20px; }
    .pm-client-header { display: flex; align-items: center; gap: 16px; margin-bottom: 20px; }
    .pm-client-avatar { width: 56px; height: 56px; border-radius: 50%; object-fit: cover; border: 2px solid var(--primary); }
    .pm-client-name { font-size: 16px; font-weight: 700; color: var(--text-primary); display: flex; align-items: center; gap: 6px; }
    .pm-client-role { font-size: 13px; color: var(--text-secondary); }
    .pm-deliverable { display: flex; align-items: start; gap: 12px; background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.06); border-radius: 12px; padding: 14px; margin-bottom: 10px; }
    .pm-deliverable-icon { width: 24px; height: 24px; border-radius: 8px; background: rgba(16, 185, 129, 0.1); display: flex; align-items: center; justify-content: center; color: #10B981; flex-shrink: 0; }
    .pm-deliverable-text { font-size: 14px; color: var(--text-secondary); line-height: 1.5; }
    
    /* Application Cards */
    .pm-app-card { background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.06); border-radius: 20px; padding: 20px; margin-bottom: 16px; }
    .pm-app-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 16px; }
    .pm-app-creator { display: flex; align-items: center; gap: 12px; }
    .pm-app-avatar { width: 48px; height: 48px; border-radius: 14px; object-fit: cover; border: 2px solid var(--primary); }
    .pm-app-name { font-weight: 700; color: var(--text-primary); font-size: 15px; }
    .pm-app-role { font-size: 12px; color: var(--primary); font-weight: 600; }
    .pm-app-bid { text-align: right; }
    .pm-app-price { font-size: 22px; font-weight: 800; color: #10B981; }
    .pm-app-time { font-size: 12px; color: var(--text-secondary); }
    .pm-app-letter { background: rgba(151, 71, 255, 0.03); border: 1px solid rgba(151, 71, 255, 0.1); border-radius: 14px; padding: 16px; margin-bottom: 16px; font-size: 14px; color: var(--text-secondary); line-height: 1.7; white-space: pre-wrap; }
    .pm-app-portfolio { display: flex; flex-wrap: wrap; gap: 8px; margin-bottom: 16px; }
    .pm-app-link { display: inline-flex; align-items: center; gap: 6px; background: rgba(151, 71, 255, 0.08); color: var(--primary); padding: 8px 14px; border-radius: 10px; font-size: 12px; font-weight: 600; text-decoration: none; border: 1px solid rgba(151, 71, 255, 0.15); }
    .pm-app-footer { display: flex; align-items: center; justify-content: space-between; padding-top: 16px; border-top: 1px solid rgba(255,255,255,0.06); }
    .pm-status { padding: 6px 12px; border-radius: 8px; font-size: 11px; font-weight: 800; text-transform: uppercase; }
    .pm-status-pending { background: rgba(245, 158, 11, 0.1); color: #F59E0B; border: 1px solid rgba(245, 158, 11, 0.2); }
    .pm-status-accepted { background: rgba(16, 185, 129, 0.1); color: #10B981; border: 1px solid rgba(16, 185, 129, 0.2); }
    .pm-status-rejected { background: rgba(239, 68, 68, 0.1); color: #EF4444; border: 1px solid rgba(239, 68, 68, 0.2); }
    .pm-app-actions { display: flex; gap: 10px; }
    .pm-empty { text-align: center; padding: 60px 20px; }
    .pm-empty-icon { width: 72px; height: 72px; background: rgba(151, 71, 255, 0.05); border-radius: 24px; display: flex; align-items: center; justify-content: center; margin: 0 auto 20px; color: var(--primary); }
    .pm-empty-title { font-size: 18px; font-weight: 700; color: var(--text-primary); margin-bottom: 8px; }
    .pm-empty-text { font-size: 14px; color: var(--text-secondary); }
    
    /* Tips Box */
    .pm-tips { background: linear-gradient(135deg, rgba(151, 71, 255, 0.08), rgba(107, 70, 255, 0.04)); border: 1px solid rgba(151, 71, 255, 0.15); border-radius: 16px; padding: 20px; margin-bottom: 24px; display: flex; gap: 16px; }
    .pm-tips-icon { width: 36px; height: 36px; background: rgba(151, 71, 255, 0.1); border-radius: 10px; display: flex; align-items: center; justify-content: center; color: var(--primary); flex-shrink: 0; }
    .pm-tips-title { font-size: 14px; font-weight: 700; color: var(--text-primary); margin-bottom: 10px; }
    .pm-tips-list { margin: 0; padding-left: 18px; font-size: 13px; color: var(--text-secondary); line-height: 1.9; }
    .pm-tips-list li span { color: var(--primary); font-weight: 700; }
    
    /* Section Divider */
    .pm-section-divider { display: flex; align-items: center; gap: 12px; margin-bottom: 16px; }
    .pm-section-num { font-size: 11px; font-weight: 700; color: var(--primary); text-transform: uppercase; letter-spacing: 0.1em; }
    .pm-section-line { height: 1px; flex: 1; background: linear-gradient(to right, rgba(151,71,255,0.2), transparent); }
    .pm-section-label { font-size: 15px; font-weight: 700; color: var(--text-primary); margin-bottom: 12px; }
    
    /* Notice */
    .pm-notice { background: rgba(16, 185, 129, 0.05); border: 1px solid rgba(16, 185, 129, 0.15); border-radius: 12px; padding: 14px; font-size: 13px; color: #10B981; font-weight: 600; display: flex; align-items: center; gap: 12px; }
    .pm-notice-icon { width: 24px; height: 24px; border-radius: 50%; background: rgba(16, 185, 129, 0.1); display: flex; align-items: center; justify-content: center; }
</style>
`;

function closeModal() {
    const overlay = document.querySelector('.pm-overlay');
    if (overlay) {
        overlay.remove();
        document.body.style.overflow = '';
    }
}

/**
 * Show Post Project Modal
 */
export function showPostProjectModal() {
    if (!appState.user) {
        window.showAuthModal('signin');
        return;
    }

    const modalHTML = MODAL_STYLES + `
        <div class="pm-overlay" onclick="if(event.target === this) window.closeProjectModal()">
            <div class="pm-modal">
                <div class="pm-header">
                    <div class="pm-header-title">
                        <div class="pm-header-icon">
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M12 5v14M5 12h14" stroke-linecap="round"/></svg>
                        </div>
                        <div>
                            <div class="pm-title">Post a Project</div>
                            <div class="pm-subtitle">Create a new opportunity</div>
                        </div>
                    </div>
                    <button class="pm-close" onclick="window.closeProjectModal()">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M18 6L6 18M6 6l12 12"/></svg>
                    </button>
                </div>
                
                <div class="pm-body">
                    <div class="pm-info">
                        <div class="pm-info-icon">
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
                        </div>
                        <div class="pm-info-text">
                            <ol>
                                <li>Post your project with detailed requirements</li>
                                <li>Creators browse and apply with proposals</li>
                                <li>Review applications and select the best</li>
                            </ol>
                        </div>
                    </div>
                    
                    <form class="pm-form" id="postProjectForm">
                        <div class="pm-field">
                            <label class="pm-label">Project Title *</label>
                            <input type="text" name="title" class="pm-input" placeholder="e.g., Product photography for e-commerce" required maxlength="200">
                        </div>
                        
                        <div class="pm-input-grid">
                            <div class="pm-field">
                                <label class="pm-label">Category *</label>
                                <select name="category" class="pm-input pm-select" required>
                                    <option value="">Select category</option>
                                    <option value="photography">Photography</option>
                                    <option value="videography">Videography</option>
                                    <option value="design">Design</option>
                                    <option value="illustration">Illustration</option>
                                    <option value="content">Content Creation</option>
                                    <option value="other">Other</option>
                                </select>
                            </div>
                            <div class="pm-field">
                                <label class="pm-label">Project Type *</label>
                                <select name="projectType" class="pm-input pm-select" required>
                                    <option value="one-time">One-Time</option>
                                    <option value="ongoing">Ongoing</option>
                                    <option value="bounty">Bounty</option>
                                </select>
                            </div>
                        </div>
                        
                        <div class="pm-field">
                            <label class="pm-label">Description *</label>
                            <textarea name="description" class="pm-input pm-textarea" placeholder="Describe your project in detail..." required maxlength="5000"></textarea>
                            <div class="pm-char-count"><span id="descCharCount">0</span>/5000</div>
                        </div>
                        
                        <div class="pm-field">
                            <label class="pm-label">Budget Range (USD) *</label>
                            <div class="pm-input-grid">
                                <input type="number" name="budgetMin" class="pm-input" placeholder="Min $" required min="0">
                                <input type="number" name="budgetMax" class="pm-input" placeholder="Max $" required min="0">
                            </div>
                            <label class="pm-checkbox" style="margin-top: 12px;">
                                <input type="checkbox" name="negotiable" checked>
                                <span>Budget is negotiable</span>
                            </label>
                        </div>
                        
                        <div class="pm-input-grid">
                            <div class="pm-field">
                                <label class="pm-label">Start Date *</label>
                                <input type="date" name="startDate" class="pm-input" required min="${new Date().toISOString().split('T')[0]}">
                            </div>
                            <div class="pm-field">
                                <label class="pm-label">Deadline *</label>
                                <input type="date" name="deadline" class="pm-input" required min="${new Date().toISOString().split('T')[0]}">
                            </div>
                        </div>
                        
                        <div class="pm-field">
                            <label class="pm-label">Skills Required</label>
                            <input type="text" id="skillsInput" class="pm-input" placeholder="Type skill and press Enter">
                            <div class="pm-tags-container" id="skillsList"></div>
                        </div>
                        
                        <div class="pm-field">
                            <label class="pm-label">Deliverables</label>
                            <input type="text" id="deliverablesInput" class="pm-input" placeholder="Type deliverable and press Enter">
                            <div class="pm-tags-container" id="deliverablesList"></div>
                        </div>
                        
                        <div class="pm-field">
                            <label class="pm-label">Project Image (Optional)</label>
                            <div class="pm-upload">
                                <input type="file" id="projectImage" class="pm-upload-input" accept="image/*">
                                <div class="pm-upload-zone" id="imageDropzone">
                                    <div class="pm-upload-icon">
                                        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M17 8l-5-5-5 5M12 3v12"/></svg>
                                    </div>
                                    <div class="pm-upload-text">Click or drag image to upload</div>
                                    <div class="pm-upload-hint">Max 10MB</div>
                                </div>
                            </div>
                        </div>
                        
                        <div class="pm-actions">
                            <button type="button" class="pm-btn pm-btn-secondary" onclick="window.closeProjectModal()">Cancel</button>
                            <button type="submit" class="pm-btn pm-btn-primary" id="submitProjectBtn">Post Project</button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    `;

    document.body.insertAdjacentHTML('beforeend', modalHTML);
    document.body.style.overflow = 'hidden';

    // Setup form
    const skills = [];
    const deliverables = [];

    // Character counter
    document.querySelector('[name="description"]')?.addEventListener('input', (e) => {
        document.getElementById('descCharCount').textContent = e.target.value.length;
    });

    // Skills input
    document.getElementById('skillsInput')?.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            const skill = e.target.value.trim();
            if (skill && !skills.includes(skill)) {
                skills.push(skill);
                renderSkills(skills);
                e.target.value = '';
            }
        }
    });

    function renderSkills(list) {
        document.getElementById('skillsList').innerHTML = list.map(skill => `
            <span class="pm-tag">${skill}<button type="button" class="pm-tag-remove" onclick="removeSkill('${skill}')">&times;</button></span>
        `).join('');
    }

    window.removeSkill = function (skill) {
        const idx = skills.indexOf(skill);
        if (idx > -1) {
            skills.splice(idx, 1);
            renderSkills(skills);
        }
    };

    // Deliverables input
    document.getElementById('deliverablesInput')?.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            const item = e.target.value.trim();
            if (item && !deliverables.includes(item)) {
                deliverables.push(item);
                renderDeliverables(deliverables);
                e.target.value = '';
            }
        }
    });

    function renderDeliverables(list) {
        document.getElementById('deliverablesList').innerHTML = list.map(item => `
            <span class="pm-tag pm-tag-deliverable">${item}<button type="button" class="pm-tag-remove" onclick="removeDeliverable('${item}')">&times;</button></span>
        `).join('');
    }

    window.removeDeliverable = function (item) {
        const idx = deliverables.indexOf(item);
        if (idx > -1) {
            deliverables.splice(idx, 1);
            renderDeliverables(deliverables);
        }
    };

    // Form submission
    document.getElementById('postProjectForm')?.addEventListener('submit', async (e) => {
        e.preventDefault();
        const formData = new FormData(e.target);
        const submitBtn = document.getElementById('submitProjectBtn');
        
        const budgetMin = Number(formData.get('budgetMin'));
        const budgetMax = Number(formData.get('budgetMax'));
        
        if (budgetMin > budgetMax) {
            window.showToast('Min budget cannot exceed max', 'error');
            return;
        }

        submitBtn.disabled = true;
        submitBtn.textContent = 'Posting...';

        try {
            let coverImageUrl = null;
            const imageFile = document.getElementById('projectImage').files[0];
            
            if (imageFile) {
                if (imageFile.size > 10 * 1024 * 1024) {
                    throw new Error('Image exceeds 10MB limit');
                }
                submitBtn.textContent = 'Uploading...';
                
                const uploadForm = new FormData();
                uploadForm.append('file', imageFile);
                
                const uploadRes = await fetch('/api/upload/booking-attachment', {
                    method: 'POST',
                    headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` },
                    body: uploadForm
                });
                
                const uploadData = await uploadRes.json();
                if (!uploadData.success) throw new Error('Upload failed');
                coverImageUrl = uploadData.data.url;
                submitBtn.textContent = 'Creating...';
            }

            const start = new Date(formData.get('startDate'));
            const end = new Date(formData.get('deadline'));
            const daysDiff = Math.ceil((end - start) / (1000 * 60 * 60 * 24));
            
            let timeline = 'flexible';
            if (daysDiff <= 2) timeline = 'urgent';
            else if (daysDiff <= 7) timeline = '1-week';
            else if (daysDiff <= 14) timeline = '2-weeks';
            else if (daysDiff <= 30) timeline = '1-month';
            else if (daysDiff <= 60) timeline = '2-months';
            else if (daysDiff <= 90) timeline = '3-months';

            const projectData = {
                title: formData.get('title'),
                description: formData.get('description'),
                category: formData.get('category'),
                projectType: formData.get('projectType'),
                budget: { min: budgetMin, max: budgetMax, negotiable: formData.get('negotiable') === 'on' },
                timeline, deadline: formData.get('deadline'),
                skillsRequired: skills, deliverables, coverImage: coverImageUrl
            };

            const response = await api.createProject(projectData);

            if (response.success) {
                window.showToast('Project posted!', 'success');
                window.closeProjectModal();
                window.renderProjectsPage();
            }
        } catch (error) {
            window.showToast(error.message || 'Failed to post', 'error');
            submitBtn.disabled = false;
            submitBtn.textContent = 'Post Project';
        }
    });
}

/**
 * Show Project Detail Modal
 */
export async function showProjectDetail(projectId) {
    window.showLoadingSpinner?.('Loading...');

    try {
        const response = await api.getProject(projectId);
        if (!response.success) throw new Error(response.message);

        const project = response.data.project;
        const hasApplied = response.data.hasApplied;
        const isCreator = appState.user?.role === 'creator';
        const isOwner = appState.user?._id === project.clientId?._id;

        window.hideLoadingSpinner?.();

        const modalHTML = MODAL_STYLES + `
            <div class="pm-overlay" onclick="if(event.target === this) window.closeProjectModal()">
                <div class="pm-modal pm-modal-lg">
                    <div class="pm-header">
                        <div>
                            <span class="pm-tag" style="margin-bottom: 8px; display: inline-flex;">${project.projectType.replace('-', ' ')}</span>
                            <div class="pm-title">${project.title}</div>
                        </div>
                        <button class="pm-close" onclick="window.closeProjectModal()">
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M18 6L6 18M6 6l12 12"/></svg>
                        </button>
                    </div>
                    
                    <div class="pm-body">
                        ${project.coverImage ? `
                            <div class="pm-detail-cover">
                                <img src="${project.coverImage}" alt="${project.title}" onclick="window.openImageModal('${project.coverImage}')">
                            </div>
                        ` : ''}
                        
                        <div class="pm-stats-grid">
                            <div class="pm-stat">
                                <div class="pm-stat-label">Budget</div>
                                <div class="pm-stat-value success">$${project.budget.min.toLocaleString()} - $${project.budget.max.toLocaleString()}</div>
                                ${project.budget.negotiable ? '<span style="font-size: 11px; color: #10B981; font-weight: 600;">Negotiable</span>' : ''}
                            </div>
                            <div class="pm-stat">
                                <div class="pm-stat-label">Timeline</div>
                                <div class="pm-stat-value">${formatTimeline(project.timeline)}</div>
                                ${project.deadline ? `<span style="font-size: 11px; color: var(--text-secondary);">Due: ${new Date(project.deadline).toLocaleDateString()}</span>` : ''}
                            </div>
                            <div class="pm-stat">
                                <div class="pm-stat-label">Applications</div>
                                <div class="pm-stat-value primary">${project.applicationsCount}</div>
                            </div>
                            <div class="pm-stat">
                                <div class="pm-stat-label">Category</div>
                                <div class="pm-stat-value" style="text-transform: capitalize;">${project.category}</div>
                            </div>
                        </div>
                        
                        <div style="display: grid; grid-template-columns: 1fr 300px; gap: 24px;">
                            <div>
                                <div class="pm-section-title">Description</div>
                                <div class="pm-desc">${project.description}</div>
                                
                                ${project.skillsRequired?.length ? `
                                    <div class="pm-section-title">Skills Required</div>
                                    <div style="display: flex; flex-wrap: wrap; gap: 8px; margin-bottom: 24px;">
                                        ${project.skillsRequired.map(s => `<span class="pm-tag">${s}</span>`).join('')}
                                    </div>
                                ` : ''}
                                
                                ${project.deliverables?.length ? `
                                    <div class="pm-section-title">Deliverables</div>
                                    <div style="margin-bottom: 24px;">
                                        ${project.deliverables.map(d => `
                                            <div class="pm-deliverable">
                                                <div class="pm-deliverable-icon">
                                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><path d="M20 6L9 17l-5-5"/></svg>
                                                </div>
                                                <span class="pm-deliverable-text">${d}</span>
                                            </div>
                                        `).join('')}
                                    </div>
                                ` : ''}
                            </div>
                            
                            <div>
                                <div class="pm-client-card">
                                    <div class="pm-section-title">Posted By</div>
                                    <div class="pm-client-header">
                                        <img src="${project.clientId?.avatar || 'https://ui-avatars.com/api/?name=' + encodeURIComponent(project.clientId?.name || 'Client')}" class="pm-client-avatar">
                                        <div>
                                            <div class="pm-client-name">
                                                ${project.clientId?.name || 'Client'}
                                                ${project.clientId?.isEmailVerified ? '<svg width="16" height="16" viewBox="0 0 24 24" fill="#10B981"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/></svg>' : ''}
                                            </div>
                                            <div class="pm-client-role">Client</div>
                                        </div>
                                    </div>
                                    ${renderProjectActions(project, hasApplied, isCreator, isOwner)}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;

        document.body.insertAdjacentHTML('beforeend', modalHTML);
        document.body.style.overflow = 'hidden';

    } catch (error) {
        window.hideLoadingSpinner?.();
        window.showToast(error.message || 'Failed to load', 'error');
    }
}

function renderProjectActions(project, hasApplied, isCreator, isOwner) {
    if (isOwner) {
        return `
            <button class="pm-btn pm-btn-primary pm-btn-full" onclick="window.viewProjectApplications('${project._id}')">
                View Applications (${project.applicationsCount})
            </button>
        `;
    }
    
    if (!appState.user) {
        return `<button class="pm-btn pm-btn-primary pm-btn-full" onclick="window.showAuthModal('signin'); window.closeProjectModal();">Sign In to Apply</button>`;
    }
    
    if (!isCreator) {
        return `<button class="pm-btn pm-btn-secondary pm-btn-full" disabled>Only creators can apply</button>`;
    }
    
    if (hasApplied) {
        return `<button class="pm-btn pm-btn-success pm-btn-full" disabled>✓ Applied</button>`;
    }
    
    return `<button class="pm-btn pm-btn-primary pm-btn-full" onclick="window.showApplicationForm('${project._id}')">Apply to Project</button>`;
}

/**
 * Show Application Form
 */
export async function showApplicationForm(projectId) {
    window.closeProjectModal();

    const modalHTML = MODAL_STYLES + `
        <div class="pm-overlay" onclick="if(event.target === this) window.closeProjectModal()">
            <div class="pm-modal">
                <div class="pm-header">
                    <div class="pm-header-title">
                        <div class="pm-header-icon">
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                        </div>
                        <div>
                            <div class="pm-title">Apply to Project</div>
                            <div class="pm-subtitle">Submit your proposal</div>
                        </div>
                    </div>
                    <button class="pm-close" onclick="window.closeProjectModal()">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M18 6L6 18M6 6l12 12"/></svg>
                    </button>
                </div>
                
                <div class="pm-body">
                    <div class="pm-tips">
                        <div class="pm-tips-icon">
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
                        </div>
                        <div>
                            <div class="pm-tips-title">Pro Tips for Success</div>
                            <ul class="pm-tips-list">
                                <li>Be specific about your <span>unique approach</span></li>
                                <li>Include links to your <span>best work</span></li>
                                <li>Propose a <span>realistic timeline</span></li>
                            </ul>
                        </div>
                    </div>
                    
                    <form class="pm-form" id="applicationForm">
                        <div>
                            <div class="pm-section-divider">
                                <span class="pm-section-num">Section 01</span>
                                <div class="pm-section-line"></div>
                            </div>
                            <div class="pm-section-label">The Pitch</div>
                            <textarea name="coverLetter" class="pm-input pm-textarea" placeholder="Why are you perfect for this project?" required maxlength="2000"></textarea>
                            <div class="pm-char-count"><span id="coverLetterCount">0</span>/2000</div>
                        </div>
                        
                        <div>
                            <div class="pm-section-divider">
                                <span class="pm-section-num">Section 02</span>
                                <div class="pm-section-line"></div>
                            </div>
                            <div class="pm-section-label">Your Offer</div>
                            <div class="pm-input-grid">
                                <div>
                                    <label class="pm-label">Budget (USD) *</label>
                                    <input type="number" name="proposedBudget" class="pm-input" placeholder="0.00" required min="1" step="0.01">
                                </div>
                                <div>
                                    <label class="pm-label">Timeline *</label>
                                    <input type="text" name="proposedTimeline" class="pm-input" placeholder="e.g., 5-7 days" required maxlength="200">
                                </div>
                            </div>
                        </div>
                        
                        <div>
                            <div class="pm-section-divider">
                                <span class="pm-section-num">Section 03</span>
                                <div class="pm-section-line"></div>
                            </div>
                            <div class="pm-section-label">Portfolio Links</div>
                            <input type="text" id="portfolioInput" class="pm-input" placeholder="Paste link and press Enter">
                            <div id="portfolioList" class="pm-tags-container"></div>
                        </div>
                        
                        <div class="pm-notice">
                            <div class="pm-notice-icon">
                                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="4"><path d="M20 6L9 17l-5-5"/></svg>
                            </div>
                            <span>You can edit before client review</span>
                        </div>
                        
                        <div class="pm-actions">
                            <button type="button" class="pm-btn pm-btn-secondary" onclick="window.closeProjectModal()">Cancel</button>
                            <button type="submit" class="pm-btn pm-btn-primary" id="submitAppBtn">Submit Application</button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    `;

    document.body.insertAdjacentHTML('beforeend', modalHTML);
    document.body.style.overflow = 'hidden';

    // Character counter
    document.querySelector('[name="coverLetter"]')?.addEventListener('input', (e) => {
        document.getElementById('coverLetterCount').textContent = e.target.value.length;
    });

    // Portfolio links
    const portfolioLinks = [];
    document.getElementById('portfolioInput')?.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            const url = e.target.value.trim();
            if (url && isValidUrl(url)) {
                portfolioLinks.push(url);
                renderPortfolio(portfolioLinks);
                e.target.value = '';
            } else if (url) {
                window.showToast('Please enter a valid URL', 'error');
            }
        }
    });

    function renderPortfolio(list) {
        document.getElementById('portfolioList').innerHTML = list.map((url, i) => `
            <span class="pm-tag">${new URL(url).hostname}<button type="button" class="pm-tag-remove" onclick="removePortfolioLink(${i})">&times;</button></span>
        `).join('');
    }

    window.removePortfolioLink = function (i) {
        portfolioLinks.splice(i, 1);
        renderPortfolio(portfolioLinks);
    };

    function isValidUrl(str) {
        try { new URL(str); return true; } catch { return false; }
    }

    // Form submission
    document.getElementById('applicationForm')?.addEventListener('submit', async (e) => {
        e.preventDefault();
        const formData = new FormData(e.target);
        const submitBtn = document.getElementById('submitAppBtn');

        submitBtn.disabled = true;
        submitBtn.textContent = 'Submitting...';

        try {
            const response = await api.applyToProject(projectId, {
                coverLetter: formData.get('coverLetter'),
                proposedBudget: { amount: Number(formData.get('proposedBudget')) },
                proposedTimeline: formData.get('proposedTimeline'),
                portfolioLinks: portfolioLinks.map(url => ({ url, title: new URL(url).hostname }))
            });

            if (response.success) {
                window.showToast('Application submitted!', 'success');
                window.closeProjectModal();
                window.showProjectDetail(projectId);
            }
        } catch (error) {
            window.showToast(error.message || 'Failed to submit', 'error');
            submitBtn.disabled = false;
            submitBtn.textContent = 'Submit Application';
        }
    });
}

/**
 * View Project Applications
 */
export async function viewProjectApplications(projectId) {
    window.showLoadingSpinner?.('Loading applications...');

    try {
        const response = await api.getProjectApplications(projectId);
        if (!response.success) throw new Error(response.message);

        const applications = response.data.applications || [];
        window.hideLoadingSpinner?.();

        const modalHTML = MODAL_STYLES + `
            <div class="pm-overlay" onclick="if(event.target === this) window.closeProjectModal()">
                <div class="pm-modal pm-modal-lg">
                    <div class="pm-header">
                        <div>
                            <div class="pm-title">Applications (${applications.length})</div>
                        </div>
                        <button class="pm-close" onclick="window.closeProjectModal()">
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M18 6L6 18M6 6l12 12"/></svg>
                        </button>
                    </div>
                    
                    <div class="pm-body">
                        ${applications.length > 0 ? applications.map(app => `
                            <div class="pm-app-card">
                                <div class="pm-app-header">
                                    <div class="pm-app-creator">
                                        <img src="${app.creatorId?.avatar || 'https://ui-avatars.com/api/?name=' + encodeURIComponent(app.creatorId?.name || 'Creator')}" class="pm-app-avatar">
                                        <div>
                                            <div class="pm-app-name">${app.creatorId?.name || 'Creator'}</div>
                                            <div class="pm-app-role">${app.creatorId?.category || 'Creator'}</div>
                                        </div>
                                    </div>
                                    <div class="pm-app-bid">
                                        <div class="pm-app-price">$${app.proposedBudget?.amount || 0}</div>
                                        <div class="pm-app-time">${app.proposedTimeline}</div>
                                    </div>
                                </div>
                                
                                <div class="pm-app-letter">${app.coverLetter}</div>
                                
                                ${app.portfolioLinks?.length ? `
                                    <div class="pm-app-portfolio">
                                        ${app.portfolioLinks.map(link => `
                                            <a href="${link.url}" target="_blank" class="pm-app-link">
                                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6M15 3h6v6M10 14L21 3"/></svg>
                                                View Work
                                            </a>
                                        `).join('')}
                                    </div>
                                ` : ''}
                                
                                <div class="pm-app-footer">
                                    <span class="pm-status pm-status-${app.status}">${app.status}</span>
                                    <span style="font-size: 12px; color: var(--text-secondary);">Applied ${formatTimeAgo(app.createdAt)}</span>
                                    
                                    ${app.status === 'pending' ? `
                                        <div class="pm-app-actions">
                                            <button class="pm-btn pm-btn-danger" style="padding: 8px 16px; font-size: 13px;" onclick="window.handleApplicationAction('${app._id}', 'rejected')">Decline</button>
                                            <button class="pm-btn pm-btn-success" style="padding: 8px 20px; font-size: 13px;" onclick="window.handleApplicationAction('${app._id}', 'accepted')">Accept</button>
                                        </div>
                                    ` : ''}
                                </div>
                            </div>
                        `).join('') : `
                            <div class="pm-empty">
                                <div class="pm-empty-icon">
                                    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75"/></svg>
                                </div>
                                <div class="pm-empty-title">No applications yet</div>
                                <div class="pm-empty-text">Check back soon for creator proposals</div>
                            </div>
                        `}
                    </div>
                </div>
            </div>
        `;

        document.body.insertAdjacentHTML('beforeend', modalHTML);
        document.body.style.overflow = 'hidden';

    } catch (error) {
        window.hideLoadingSpinner?.();
        window.showToast(error.message || 'Failed to load', 'error');
    }
}

/**
 * Handle Application Action
 */
export async function handleApplicationAction(applicationId, status) {
    const action = status === 'accepted' ? 'accept' : 'reject';
    if (!confirm(`${action.charAt(0).toUpperCase() + action.slice(1)} this application?`)) return;

    try {
        const response = await api.updateApplicationStatus(applicationId, status);
        if (response.success) {
            window.showToast(status === 'accepted' ? 'Application accepted!' : 'Application declined', 'success');
            window.closeProjectModal();
            if (status === 'accepted') window.navigateToPage('bookings');
        }
    } catch (error) {
        window.showToast(error.message || 'Action failed', 'error');
    }
}

function formatTimeline(timeline) {
    const labels = {
        'urgent': 'Urgent', '1-week': '1 Week', '2-weeks': '2 Weeks',
        '1-month': '1 Month', '2-months': '2 Months', '3-months': '3 Months', 'flexible': 'Flexible'
    };
    return labels[timeline] || timeline;
}

function formatTimeAgo(date) {
    const seconds = Math.floor((new Date() - new Date(date)) / 1000);
    const intervals = { year: 31536000, month: 2592000, week: 604800, day: 86400, hour: 3600, minute: 60 };
    for (const [key, value] of Object.entries(intervals)) {
        const interval = Math.floor(seconds / value);
        if (interval >= 1) return `${interval} ${key}${interval > 1 ? 's' : ''} ago`;
    }
    return 'Just now';
}

// Global exports
window.showPostProjectModal = showPostProjectModal;
window.showProjectDetail = showProjectDetail;
window.showApplicationForm = showApplicationForm;
window.viewProjectApplications = viewProjectApplications;
window.handleApplicationAction = handleApplicationAction;
window.closeProjectModal = closeModal;
