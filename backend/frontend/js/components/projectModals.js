import api from '../services/api.js';
import { appState } from '../state.js';

const STYLES = `
<style>
    /* Overlay & Modal Base */
    .pm-overlay { position: fixed; inset: 0; background: rgba(15, 23, 36, 0.7); backdrop-filter: blur(8px); z-index: 1000; display: flex; align-items: flex-end; justify-content: center; }
    @media (min-width: 640px) { .pm-overlay { align-items: center; padding: 20px; } }
    
    .pm-modal { background: var(--surface, #1E293B); border: 1px solid rgba(255,255,255,0.08); width: 100%; max-width: 520px; max-height: 90vh; overflow: hidden; display: flex; flex-direction: column; border-radius: 24px 24px 0 0; }
    @media (min-width: 640px) { .pm-modal { border-radius: 20px; max-height: 85vh; } }
    
    .pm-header { display: flex; align-items: center; justify-content: space-between; padding: 16px 20px; border-bottom: 1px solid rgba(255,255,255,0.06); flex-shrink: 0; }
    .pm-header-title { font-size: 17px; font-weight: 700; color: var(--text-primary); }
    .pm-close { width: 32px; height: 32px; border-radius: 8px; border: none; background: rgba(255,255,255,0.05); color: var(--text-secondary); cursor: pointer; display: flex; align-items: center; justify-content: center; }
    .pm-close:hover { background: rgba(255,255,255,0.1); color: var(--text-primary); }
    
    .pm-body { padding: 20px; overflow-y: auto; flex: 1; }
    
    /* Cover Image */
    .pm-cover { width: 100%; height: 180px; object-fit: cover; border-radius: 12px; margin-bottom: 20px; }
    
    /* Meta Info */
    .pm-meta { display: flex; align-items: center; gap: 12px; margin-bottom: 16px; }
    .pm-meta-avatar { width: 44px; height: 44px; border-radius: 12px; object-fit: cover; }
    .pm-meta-info { flex: 1; }
    .pm-meta-name { font-size: 15px; font-weight: 700; color: var(--text-primary); }
    .pm-meta-time { font-size: 12px; color: var(--text-secondary); }
    .pm-meta-badge { padding: 5px 10px; border-radius: 8px; font-size: 10px; font-weight: 800; text-transform: uppercase; }
    .pm-meta-badge.one-time { background: rgba(151, 71, 255, 0.1); color: #9747FF; }
    .pm-meta-badge.ongoing { background: rgba(16, 185, 129, 0.1); color: #10B981; }
    .pm-meta-badge.bounty { background: rgba(245, 158, 11, 0.1); color: #F59E0B; }
    
    /* Content */
    .pm-title { font-size: 20px; font-weight: 800; color: var(--text-primary); margin-bottom: 12px; line-height: 1.3; }
    .pm-desc { font-size: 14px; color: var(--text-secondary); line-height: 1.7; margin-bottom: 20px; white-space: pre-wrap; }
    
    /* Stats Row */
    .pm-stats { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; margin-bottom: 20px; }
    .pm-stat { background: rgba(255,255,255,0.03); border-radius: 12px; padding: 14px; text-align: center; }
    .pm-stat-label { font-size: 10px; color: var(--text-secondary); text-transform: uppercase; margin-bottom: 4px; }
    .pm-stat-value { font-size: 15px; font-weight: 800; color: var(--text-primary); }
    .pm-stat-value.green { color: #10B981; }
    .pm-stat-value.purple { color: var(--primary); }
    
    /* Section */
    .pm-section { margin-bottom: 20px; }
    .pm-section-title { font-size: 13px; font-weight: 700; color: var(--text-secondary); text-transform: uppercase; margin-bottom: 10px; }
    .pm-tags { display: flex; flex-wrap: wrap; gap: 8px; }
    .pm-tag { background: rgba(151, 71, 255, 0.1); color: var(--primary); padding: 6px 12px; border-radius: 8px; font-size: 12px; font-weight: 600; }
    
    /* Deliverables */
    .pm-item { display: flex; align-items: center; gap: 12px; padding: 12px; background: rgba(255,255,255,0.02); border-radius: 10px; margin-bottom: 8px; }
    .pm-item-icon { width: 24px; height: 24px; background: rgba(16, 185, 129, 0.1); border-radius: 6px; display: flex; align-items: center; justify-content: center; color: #10B981; flex-shrink: 0; }
    .pm-item-text { font-size: 14px; color: var(--text-secondary); }
    
    /* Actions */
    .pm-actions { display: flex; gap: 12px; padding-top: 16px; border-top: 1px solid rgba(255,255,255,0.06); }
    .pm-btn { flex: 1; padding: 14px 20px; border-radius: 12px; font-size: 15px; font-weight: 700; cursor: pointer; transition: all 0.2s; border: none; display: flex; align-items: center; justify-content: center; gap: 8px; }
    .pm-btn-primary { background: var(--primary); color: white; }
    .pm-btn-primary:hover { background: #7c3aed; }
    .pm-btn-secondary { background: rgba(255,255,255,0.05); color: var(--text-primary); border: 1px solid rgba(255,255,255,0.1); }
    .pm-btn-success { background: #10B981; color: white; }
    .pm-btn-danger { background: #EF4444; color: white; }
    .pm-btn:disabled { opacity: 0.5; cursor: not-allowed; }
    .pm-btn.full { width: 100%; }
    
    /* Form Elements */
    .pm-form { display: flex; flex-direction: column; gap: 16px; }
    .pm-field label { display: block; font-size: 13px; font-weight: 600; color: var(--text-secondary); margin-bottom: 6px; }
    .pm-input { width: 100%; background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.08); border-radius: 10px; padding: 12px 14px; color: var(--text-primary); font-size: 15px; outline: none; }
    .pm-input:focus { border-color: var(--primary); }
    .pm-textarea { min-height: 100px; resize: vertical; }
    .pm-select { appearance: none; background-image: url('data:image/svg+xml,%3Csvg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="%2394A3B8" stroke-width="2"%3E%3Cpath d="M6 9l6 6 6-6"/%3E%3C/svg%3E'); background-repeat: no-repeat; background-position: right 12px center; padding-right: 36px; }
    .pm-row { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
    .pm-hint { font-size: 12px; color: var(--text-secondary); text-align: right; margin-top: 4px; }
    .pm-checkbox { display: flex; align-items: center; gap: 10px; font-size: 14px; color: var(--text-secondary); cursor: pointer; }
    .pm-checkbox input { width: 18px; height: 18px; accent-color: var(--primary); }
    
    /* Upload */
    .pm-upload { position: relative; border: 2px dashed rgba(151, 71, 255, 0.2); border-radius: 12px; padding: 28px; text-align: center; background: rgba(151, 71, 255, 0.02); cursor: pointer; }
    .pm-upload:hover { border-color: rgba(151, 71, 255, 0.4); }
    .pm-upload input { position: absolute; inset: 0; opacity: 0; cursor: pointer; }
    .pm-upload-icon { color: var(--primary); margin-bottom: 8px; }
    .pm-upload-text { font-size: 14px; color: var(--text-secondary); font-weight: 600; }
    
    /* Tags Input */
    .pm-tag-input { display: flex; flex-wrap: wrap; gap: 8px; padding: 8px; background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.08); border-radius: 10px; }
    .pm-tag-pill { display: flex; align-items: center; gap: 6px; background: var(--primary); color: white; padding: 5px 10px; border-radius: 6px; font-size: 12px; }
    .pm-tag-pill button { background: none; border: none; color: white; cursor: pointer; font-size: 14px; padding: 0; }
    .pm-tag-input input { flex: 1; min-width: 100px; background: none; border: none; color: var(--text-primary); padding: 6px; outline: none; }
    
    /* Tips */
    .pm-tips { background: rgba(151, 71, 255, 0.05); border: 1px solid rgba(151, 71, 255, 0.1); border-radius: 12px; padding: 16px; margin-bottom: 20px; }
    .pm-tips-title { font-size: 13px; font-weight: 700; color: var(--primary); margin-bottom: 8px; display: flex; align-items: center; gap: 8px; }
    .pm-tips-list { margin: 0; padding-left: 18px; font-size: 13px; color: var(--text-secondary); line-height: 1.8; }
    
    /* Application Cards */
    .pm-app { background: rgba(255,255,255,0.02); border: 1px solid rgba(255,255,255,0.06); border-radius: 16px; padding: 16px; margin-bottom: 12px; }
    .pm-app-header { display: flex; align-items: center; gap: 12px; margin-bottom: 12px; }
    .pm-app-avatar { width: 48px; height: 48px; border-radius: 12px; object-fit: cover; border: 2px solid var(--primary); }
    .pm-app-info { flex: 1; }
    .pm-app-name { font-size: 15px; font-weight: 700; color: var(--text-primary); }
    .pm-app-role { font-size: 12px; color: var(--primary); }
    .pm-app-bid { text-align: right; }
    .pm-app-price { font-size: 18px; font-weight: 800; color: #10B981; }
    .pm-app-time { font-size: 12px; color: var(--text-secondary); }
    .pm-app-letter { font-size: 14px; color: var(--text-secondary); line-height: 1.7; padding: 12px; background: rgba(255,255,255,0.02); border-radius: 10px; margin-bottom: 12px; }
    .pm-app-links { display: flex; flex-wrap: wrap; gap: 8px; margin-bottom: 12px; }
    .pm-app-link { font-size: 12px; color: var(--primary); text-decoration: none; padding: 6px 12px; background: rgba(151, 71, 255, 0.08); border-radius: 8px; }
    .pm-app-actions { display: flex; gap: 10px; }
    .pm-app-actions .pm-btn { padding: 10px 16px; font-size: 14px; }
    
    .pm-status { display: inline-block; padding: 4px 10px; border-radius: 6px; font-size: 11px; font-weight: 700; text-transform: uppercase; }
    .pm-status-pending { background: rgba(245, 158, 11, 0.1); color: #F59E0B; }
    .pm-status-accepted { background: rgba(16, 185, 129, 0.1); color: #10B981; }
    .pm-status-rejected { background: rgba(239, 68, 68, 0.1); color: #EF4444; }
    
    .pm-empty { text-align: center; padding: 40px 20px; }
    .pm-empty-icon { width: 64px; height: 64px; background: rgba(151, 71, 255, 0.05); border-radius: 20px; display: flex; align-items: center; justify-content: center; margin: 0 auto 16px; color: var(--primary); }
</style>
`;

function closeModal() {
    const overlay = document.querySelector('.pm-overlay');
    if (overlay) {
        overlay.remove();
        document.body.style.overflow = '';
    }
}

// ===== POST PROJECT MODAL =====
export function showPostProjectModal() {
    if (!appState.user) {
        window.showAuthModal('signin');
        return;
    }

    const skills = [];
    const deliverables = [];

    const html = STYLES + `
        <div class="pm-overlay" onclick="if(event.target===this)window.closeProjectModal()">
            <div class="pm-modal">
                <div class="pm-header">
                    <span class="pm-header-title">Post a Project</span>
                    <button class="pm-close" onclick="window.closeProjectModal()">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M18 6L6 18M6 6l12 12"/></svg>
                    </button>
                </div>
                <div class="pm-body">
                    <form class="pm-form" id="postForm">
                        <div class="pm-field">
                            <label>Project Title *</label>
                            <input type="text" name="title" class="pm-input" placeholder="e.g., Product photography" required>
                        </div>
                        
                        <div class="pm-row">
                            <div class="pm-field">
                                <label>Category *</label>
                                <select name="category" class="pm-input pm-select" required>
                                    <option value="">Select</option>
                                    <option value="photography">Photography</option>
                                    <option value="videography">Videography</option>
                                    <option value="design">Design</option>
                                    <option value="illustration">Illustration</option>
                                    <option value="other">Other</option>
                                </select>
                            </div>
                            <div class="pm-field">
                                <label>Type *</label>
                                <select name="projectType" class="pm-input pm-select" required>
                                    <option value="one-time">One-Time</option>
                                    <option value="ongoing">Ongoing</option>
                                    <option value="bounty">Bounty</option>
                                </select>
                            </div>
                        </div>
                        
                        <div class="pm-field">
                            <label>Description *</label>
                            <textarea name="description" class="pm-input pm-textarea" placeholder="Describe what you need..." required maxlength="2000"></textarea>
                            <div class="pm-hint"><span id="charCount">0</span>/2000</div>
                        </div>
                        
                        <div class="pm-row">
                            <div class="pm-field">
                                <label>Budget Min *</label>
                                <input type="number" name="budgetMin" class="pm-input" placeholder="$" required min="0">
                            </div>
                            <div class="pm-field">
                                <label>Budget Max *</label>
                                <input type="number" name="budgetMax" class="pm-input" placeholder="$" required min="0">
                            </div>
                        </div>
                        <label class="pm-checkbox">
                            <input type="checkbox" name="negotiable" checked>
                            <span>Budget is negotiable</span>
                        </label>
                        
                        <div class="pm-row">
                            <div class="pm-field">
                                <label>Start Date *</label>
                                <input type="date" name="startDate" class="pm-input" required min="${new Date().toISOString().split('T')[0]}">
                            </div>
                            <div class="pm-field">
                                <label>Deadline *</label>
                                <input type="date" name="deadline" class="pm-input" required min="${new Date().toISOString().split('T')[0]}">
                            </div>
                        </div>
                        
                        <div class="pm-field">
                            <label>Skills Needed</label>
                            <div class="pm-tag-input" id="skillsBox">
                                <input type="text" id="skillInput" placeholder="Type and press Enter">
                            </div>
                        </div>
                        
                        <div class="pm-field">
                            <label>Deliverables</label>
                            <div class="pm-tag-input" id="deliverablesBox">
                                <input type="text" id="deliverableInput" placeholder="Type and press Enter">
                            </div>
                        </div>
                        
                        <div class="pm-field">
                            <label>Image (Optional)</label>
                            <div class="pm-upload">
                                <input type="file" id="projectImage" accept="image/*">
                                <div class="pm-upload-icon">
                                    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M17 8l-5-5-5 5M12 3v12"/></svg>
                                </div>
                                <div class="pm-upload-text">Tap to upload image</div>
                            </div>
                        </div>
                        
                        <div class="pm-actions">
                            <button type="button" class="pm-btn pm-btn-secondary" onclick="window.closeProjectModal()">Cancel</button>
                            <button type="submit" class="pm-btn pm-btn-primary" id="postBtn">Post Project</button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    `;

    document.body.insertAdjacentHTML('beforeend', html);
    document.body.style.overflow = 'hidden';

    // Character count
    document.querySelector('[name="description"]')?.addEventListener('input', e => {
        document.getElementById('charCount').textContent = e.target.value.length;
    });

    // Tags input handlers
    setupTagInput('skillInput', 'skillsBox', skills, 'skill');
    setupTagInput('deliverableInput', 'deliverablesBox', deliverables, 'deliverable');

    // Form submit
    document.getElementById('postForm')?.addEventListener('submit', async e => {
        e.preventDefault();
        const form = new FormData(e.target);
        const btn = document.getElementById('postBtn');
        
        const min = Number(form.get('budgetMin'));
        const max = Number(form.get('budgetMax'));
        if (min > max) {
            window.showToast('Min cannot exceed max', 'error');
            return;
        }

        btn.disabled = true;
        btn.textContent = 'Posting...';

        try {
            let imageUrl = null;
            const file = document.getElementById('projectImage').files[0];
            if (file) {
                btn.textContent = 'Uploading...';
                const fd = new FormData();
                fd.append('file', file);
                const res = await fetch('/api/upload/booking-attachment', {
                    method: 'POST',
                    headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` },
                    body: fd
                });
                const data = await res.json();
                if (data.success) imageUrl = data.data.url;
            }

            // Calculate timeline
            const start = new Date(form.get('startDate'));
            const end = new Date(form.get('deadline'));
            const days = Math.ceil((end - start) / (1000 * 60 * 60 * 24));
            let timeline = 'flexible';
            if (days <= 2) timeline = 'urgent';
            else if (days <= 7) timeline = '1-week';
            else if (days <= 14) timeline = '2-weeks';
            else if (days <= 30) timeline = '1-month';
            else if (days <= 60) timeline = '2-months';
            else if (days <= 90) timeline = '3-months';

            const res = await api.createProject({
                title: form.get('title'),
                description: form.get('description'),
                category: form.get('category'),
                projectType: form.get('projectType'),
                budget: { min, max, negotiable: form.get('negotiable') === 'on' },
                timeline, deadline: form.get('deadline'),
                skillsRequired: skills, deliverables,
                coverImage: imageUrl
            });

            if (res.success) {
                window.showToast('Project posted!', 'success');
                closeModal();
                window.renderProjectsPage();
            }
        } catch (err) {
            window.showToast(err.message || 'Failed to post', 'error');
            btn.disabled = false;
            btn.textContent = 'Post Project';
        }
    });
}

function setupTagInput(inputId, boxId, list, type) {
    const input = document.getElementById(inputId);
    const box = document.getElementById(boxId);
    
    input?.addEventListener('keypress', e => {
        if (e.key === 'Enter') {
            e.preventDefault();
            const val = input.value.trim();
            if (val && !list.includes(val)) {
                list.push(val);
                renderTags(box, input, list, type);
                input.value = '';
            }
        }
    });
}

function renderTags(box, input, list, type) {
    const pills = list.map((tag, i) => `
        <span class="pm-tag-pill">${tag}<button onclick="removeTag('${type}', ${i})">&times;</button></span>
    `).join('');
    box.innerHTML = pills + input.outerHTML;
    setupTagInput(input.id, box.id, list, type);
}

window.removeTag = function(type, idx) {
    // This will be overridden by each modal's context
};

// ===== PROJECT DETAIL MODAL =====
export async function showProjectDetail(projectId) {
    window.showLoadingSpinner?.('Loading...');
    
    try {
        const res = await api.getProject(projectId);
        if (!res.success) throw new Error(res.message);
        
        const p = res.data.project;
        const hasApplied = res.data.hasApplied;
        const isCreator = appState.user?.role === 'creator';
        const isOwner = appState.user?._id === p.clientId?._id;
        
        window.hideLoadingSpinner?.();
        
        const html = STYLES + `
            <div class="pm-overlay" onclick="if(event.target===this)window.closeProjectModal()">
                <div class="pm-modal">
                    <div class="pm-header">
                        <span class="pm-header-title">Project Details</span>
                        <button class="pm-close" onclick="window.closeProjectModal()">
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M18 6L6 18M6 6l12 12"/></svg>
                        </button>
                    </div>
                    <div class="pm-body">
                        ${p.coverImage ? `<img src="${p.coverImage}" class="pm-cover" onclick="window.openImageModal('${p.coverImage}')">` : ''}
                        
                        <div class="pm-meta">
                            <img src="${p.clientId?.avatar || 'https://ui-avatars.com/api/?name=' + encodeURIComponent(p.clientId?.name || 'C')}" class="pm-meta-avatar">
                            <div class="pm-meta-info">
                                <div class="pm-meta-name">${p.clientId?.name || 'Client'}</div>
                                <div class="pm-meta-time">Posted ${formatTimeAgo(p.createdAt)}</div>
                            </div>
                            <span class="pm-meta-badge ${p.projectType}">${p.projectType.replace('-', ' ')}</span>
                        </div>
                        
                        <h2 class="pm-title">${p.title}</h2>
                        <p class="pm-desc">${p.description}</p>
                        
                        <div class="pm-stats">
                            <div class="pm-stat">
                                <div class="pm-stat-label">Budget</div>
                                <div class="pm-stat-value green">$${p.budget.min.toLocaleString()}</div>
                            </div>
                            <div class="pm-stat">
                                <div class="pm-stat-label">Timeline</div>
                                <div class="pm-stat-value">${formatTimeline(p.timeline)}</div>
                            </div>
                            <div class="pm-stat">
                                <div class="pm-stat-label">Category</div>
                                <div class="pm-stat-value purple" style="text-transform: capitalize;">${p.category}</div>
                            </div>
                        </div>
                        
                        ${p.skillsRequired?.length ? `
                            <div class="pm-section">
                                <div class="pm-section-title">Skills Required</div>
                                <div class="pm-tags">
                                    ${p.skillsRequired.map(s => `<span class="pm-tag">${s}</span>`).join('')}
                                </div>
                            </div>
                        ` : ''}
                        
                        ${p.deliverables?.length ? `
                            <div class="pm-section">
                                <div class="pm-section-title">Deliverables</div>
                                ${p.deliverables.map(d => `
                                    <div class="pm-item">
                                        <div class="pm-item-icon">
                                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><path d="M20 6L9 17l-5-5"/></svg>
                                        </div>
                                        <span class="pm-item-text">${d}</span>
                                    </div>
                                `).join('')}
                            </div>
                        ` : ''}
                        
                        <div class="pm-actions">
                            ${renderDetailActions(p, hasApplied, isCreator, isOwner)}
                        </div>
                    </div>
                </div>
            </div>
        `;
        
        document.body.insertAdjacentHTML('beforeend', html);
        document.body.style.overflow = 'hidden';
        
    } catch (err) {
        window.hideLoadingSpinner?.();
        window.showToast(err.message || 'Failed to load', 'error');
    }
}

function renderDetailActions(project, hasApplied, isCreator, isOwner) {
    if (isOwner) {
        return `<button class="pm-btn pm-btn-primary full" onclick="window.viewProjectApplications('${project._id}')">View Applications (${project.applicationsCount})</button>`;
    }
    if (!appState.user) {
        return `<button class="pm-btn pm-btn-primary full" onclick="window.showAuthModal('signin'); window.closeProjectModal();">Sign In to Apply</button>`;
    }
    if (!isCreator) {
        return `<button class="pm-btn pm-btn-secondary full" disabled>Only creators can apply</button>`;
    }
    if (hasApplied) {
        return `<button class="pm-btn pm-btn-success full" disabled>✓ Already Applied</button>`;
    }
    return `<button class="pm-btn pm-btn-primary full" onclick="window.showApplicationForm('${project._id}')">Apply Now</button>`;
}

// ===== APPLICATION FORM =====
export function showApplicationForm(projectId) {
    closeModal();
    const links = [];
    
    const html = STYLES + `
        <div class="pm-overlay" onclick="if(event.target===this)window.closeProjectModal()">
            <div class="pm-modal">
                <div class="pm-header">
                    <span class="pm-header-title">Apply to Project</span>
                    <button class="pm-close" onclick="window.closeProjectModal()">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M18 6L6 18M6 6l12 12"/></svg>
                    </button>
                </div>
                <div class="pm-body">
                    <div class="pm-tips">
                        <div class="pm-tips-title">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
                            Tips to win
                        </div>
                        <ul class="pm-tips-list">
                            <li>Explain your unique approach</li>
                            <li>Share relevant portfolio links</li>
                            <li>Be realistic with timeline</li>
                        </ul>
                    </div>
                    
                    <form class="pm-form" id="appForm">
                        <div class="pm-field">
                            <label>Your Pitch *</label>
                            <textarea name="coverLetter" class="pm-input pm-textarea" placeholder="Why are you perfect for this project?" required maxlength="1500"></textarea>
                            <div class="pm-hint"><span id="appCharCount">0</span>/1500</div>
                        </div>
                        
                        <div class="pm-row">
                            <div class="pm-field">
                                <label>Your Bid (USD) *</label>
                                <input type="number" name="proposedBudget" class="pm-input" placeholder="0.00" required min="1" step="0.01">
                            </div>
                            <div class="pm-field">
                                <label>Timeline *</label>
                                <input type="text" name="proposedTimeline" class="pm-input" placeholder="e.g., 5-7 days" required>
                            </div>
                        </div>
                        
                        <div class="pm-field">
                            <label>Portfolio Links</label>
                            <div class="pm-tag-input" id="linksBox">
                                <input type="text" id="linkInput" placeholder="Paste URL and press Enter">
                            </div>
                        </div>
                        
                        <div class="pm-actions">
                            <button type="button" class="pm-btn pm-btn-secondary" onclick="window.closeProjectModal()">Cancel</button>
                            <button type="submit" class="pm-btn pm-btn-primary" id="appBtn">Submit</button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    `;
    
    document.body.insertAdjacentHTML('beforeend', html);
    document.body.style.overflow = 'hidden';
    
    // Char count
    document.querySelector('[name="coverLetter"]')?.addEventListener('input', e => {
        document.getElementById('appCharCount').textContent = e.target.value.length;
    });
    
    // Links
    setupTagInput('linkInput', 'linksBox', links, 'link');
    window.removeTag = (type, idx) => {
        links.splice(idx, 1);
        renderLinks();
    };
    function renderLinks() {
        const box = document.getElementById('linksBox');
        const input = document.getElementById('linkInput');
        const pills = links.map((url, i) => `
            <span class="pm-tag-pill">${new URL(url).hostname}<button onclick="window.removeTag('link', ${i})">&times;</button></span>
        `).join('');
        box.innerHTML = pills;
        box.appendChild(input);
    }
    
    // Submit
    document.getElementById('appForm')?.addEventListener('submit', async e => {
        e.preventDefault();
        const form = new FormData(e.target);
        const btn = document.getElementById('appBtn');
        
        btn.disabled = true;
        btn.textContent = 'Sending...';
        
        try {
            const res = await api.applyToProject(projectId, {
                coverLetter: form.get('coverLetter'),
                proposedBudget: { amount: Number(form.get('proposedBudget')) },
                proposedTimeline: form.get('proposedTimeline'),
                portfolioLinks: links.map(url => ({ url, title: new URL(url).hostname }))
            });
            
            if (res.success) {
                window.showToast('Application sent!', 'success');
                closeModal();
                window.showProjectDetail(projectId);
            }
        } catch (err) {
            window.showToast(err.message || 'Failed to send', 'error');
            btn.disabled = false;
            btn.textContent = 'Submit';
        }
    });
}

// ===== VIEW APPLICATIONS =====
export async function viewProjectApplications(projectId) {
    closeModal();
    window.showLoadingSpinner?.('Loading...');
    
    try {
        const res = await api.getProjectApplications(projectId);
        if (!res.success) throw new Error(res.message);
        
        const apps = res.data.applications || [];
        window.hideLoadingSpinner?.();
        
        const html = STYLES + `
            <div class="pm-overlay" onclick="if(event.target===this)window.closeProjectModal()">
                <div class="pm-modal" style="max-width: 600px;">
                    <div class="pm-header">
                        <span class="pm-header-title">Applications (${apps.length})</span>
                        <button class="pm-close" onclick="window.closeProjectModal()">
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M18 6L6 18M6 6l12 12"/></svg>
                        </button>
                    </div>
                    <div class="pm-body">
                        ${apps.length ? apps.map(app => `
                            <div class="pm-app">
                                <div class="pm-app-header">
                                    <img src="${app.creatorId?.avatar || 'https://ui-avatars.com/api/?name=' + encodeURIComponent(app.creatorId?.name || 'C')}" class="pm-app-avatar">
                                    <div class="pm-app-info">
                                        <div class="pm-app-name">${app.creatorId?.name || 'Creator'}</div>
                                        <div class="pm-app-role">${app.creatorId?.category || 'Creator'}</div>
                                    </div>
                                    <div class="pm-app-bid">
                                        <div class="pm-app-price">$${app.proposedBudget?.amount || 0}</div>
                                        <div class="pm-app-time">${app.proposedTimeline}</div>
                                    </div>
                                </div>
                                
                                <div class="pm-app-letter">${app.coverLetter}</div>
                                
                                ${app.portfolioLinks?.length ? `
                                    <div class="pm-app-links">
                                        ${app.portfolioLinks.map(l => `
                                            <a href="${l.url}" target="_blank" class="pm-app-link">View Work</a>
                                        `).join('')}
                                    </div>
                                ` : ''}
                                
                                <div style="display: flex; align-items: center; justify-content: space-between;">
                                    <span class="pm-status pm-status-${app.status}">${app.status}</span>
                                    ${app.status === 'pending' ? `
                                        <div class="pm-app-actions">
                                            <button class="pm-btn pm-btn-danger" onclick="window.handleApplicationAction('${app._id}', 'rejected')">Decline</button>
                                            <button class="pm-btn pm-btn-success" onclick="window.handleApplicationAction('${app._id}', 'accepted')">Accept</button>
                                        </div>
                                    ` : ''}
                                </div>
                            </div>
                        `).join('') : `
                            <div class="pm-empty">
                                <div class="pm-empty-icon">
                                    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/></svg>
                                </div>
                                <div class="pm-empty-title">No applications yet</div>
                                <div style="font-size: 14px; color: var(--text-secondary);">Check back later</div>
                            </div>
                        `}
                    </div>
                </div>
            </div>
        `;
        
        document.body.insertAdjacentHTML('beforeend', html);
        document.body.style.overflow = 'hidden';
        
    } catch (err) {
        window.hideLoadingSpinner?.();
        window.showToast(err.message || 'Failed to load', 'error');
    }
}

// ===== HANDLE APPLICATION ACTION =====
export async function handleApplicationAction(appId, status) {
    const action = status === 'accepted' ? 'Accept' : 'Decline';
    if (!confirm(`${action} this application?`)) return;
    
    try {
        const res = await api.updateApplicationStatus(appId, status);
        if (res.success) {
            window.showToast(status === 'accepted' ? 'Application accepted!' : 'Application declined', 'success');
            closeModal();
            if (status === 'accepted') window.navigateToPage('bookings');
        }
    } catch (err) {
        window.showToast(err.message || 'Action failed', 'error');
    }
}

// ===== UTILS =====
function formatTimeline(t) {
    const map = { 'urgent': 'Urgent', '1-week': '1 Week', '2-weeks': '2 Weeks', '1-month': '1 Month', '2-months': '2 Months', '3-months': '3 Months', 'flexible': 'Flexible' };
    return map[t] || t;
}

function formatTimeAgo(date) {
    const sec = Math.floor((new Date() - new Date(date)) / 1000);
    const intervals = { year: 31536000, month: 2592000, week: 604800, day: 86400, hour: 3600, minute: 60 };
    for (const [k, v] of Object.entries(intervals)) {
        const i = Math.floor(sec / v);
        if (i >= 1) return `${i} ${k}${i > 1 ? 's' : ''} ago`;
    }
    return 'Just now';
}

// Exports
window.showPostProjectModal = showPostProjectModal;
window.showProjectDetail = showProjectDetail;
window.showApplicationForm = showApplicationForm;
window.viewProjectApplications = viewProjectApplications;
window.handleApplicationAction = handleApplicationAction;
window.closeProjectModal = closeModal;
