import api from '../services/api.js';

export async function loadServices() {
    try {
        const response = await api.getMyServices();
        if (response.success) {
            return response.data.services || [];
        }
    } catch (error) {
        console.error('Failed to load services:', error);
        throw error;
    }
    return [];
}

window.showAddServiceModal = function() {
    const modal = `
        <style>
            .svc-modal-overlay { position: fixed; inset: 0; background: rgba(15, 23, 36, 0.4); backdrop-filter: blur(8px); z-index: 1000; display: flex; align-items: center; justify-content: center; padding: 20px; animation: fadeIn 0.2s ease; }
            .svc-modal { background: #FFFFFF; border: 1px solid #E2E8F0; border-radius: 24px; max-width: 560px; width: 100%; max-height: 90vh; overflow: hidden; display: flex; flex-direction: column; animation: slideUp 0.3s ease; box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.15); }
            .svc-modal-header { display: flex; align-items: center; justify-content: space-between; padding: 24px 28px; border-bottom: 1px solid #E2E8F0; background: #FAFAFA; }
            .svc-modal-title { font-size: 20px; font-weight: 700; color: #0F1724; display: flex; align-items: center; gap: 12px; }
            .svc-modal-close { width: 40px; height: 40px; border-radius: 12px; border: none; background: #F1F5F9; color: #64748B; cursor: pointer; display: flex; align-items: center; justify-content: center; transition: all 0.2s; }
            .svc-modal-close:hover { background: #E2E8F0; color: #0F1724; }
            .svc-modal-body { padding: 28px; overflow-y: auto; background: #FFFFFF; }
            .svc-form-group { margin-bottom: 24px; }
            .svc-label { display: block; font-size: 13px; font-weight: 600; color: #64748B; margin-bottom: 10px; text-transform: uppercase; letter-spacing: 0.05em; }
            .svc-input { width: 100%; background: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 14px; padding: 14px 18px; color: #0F1724; font-size: 15px; transition: all 0.2s; }
            .svc-input:focus { border-color: #9747FF; background: #FFFFFF; outline: none; box-shadow: 0 0 0 3px rgba(151, 71, 255, 0.1); }
            .svc-textarea { min-height: 120px; resize: vertical; line-height: 1.6; }
            .svc-image-upload { border: 2px dashed #CBD5E1; border-radius: 16px; padding: 32px; text-align: center; cursor: pointer; transition: all 0.2s; background: #F8FAFC; }
            .svc-image-upload:hover { border-color: #9747FF; background: #F5F3FF; }
            .svc-image-upload svg { margin-bottom: 12px; color: #9747FF; }
            .svc-image-preview { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; margin-top: 16px; }
            .svc-image-item { aspect-ratio: 1; border-radius: 12px; overflow: hidden; position: relative; background: #F1F5F9; border: 1px solid #E2E8F0; }
            .svc-image-item img { width: 100%; height: 100%; object-fit: cover; }
            .svc-image-remove { position: absolute; top: 8px; right: 8px; width: 28px; height: 28px; background: #EF4444; border: none; border-radius: 8px; color: white; cursor: pointer; display: flex; align-items: center; justify-content: center; box-shadow: 0 2px 8px rgba(0,0,0,0.2); }
            .svc-actions { display: flex; gap: 12px; padding: 24px 28px; border-top: 1px solid #E2E8F0; background: #FAFAFA; }
            .svc-btn { flex: 1; padding: 14px 24px; border-radius: 12px; font-size: 15px; font-weight: 600; cursor: pointer; transition: all 0.2s; border: none; }
            .svc-btn-secondary { background: #F1F5F9; color: #475569; border: 1px solid #E2E8F0; }
            .svc-btn-secondary:hover { background: #E2E8F0; }
            .svc-btn-primary { background: linear-gradient(135deg, #9747FF, #7C3AED); color: white; }
            .svc-btn-primary:hover { transform: translateY(-2px); box-shadow: 0 8px 20px rgba(151, 71, 255, 0.3); }
            .svc-btn-primary:disabled { opacity: 0.6; cursor: not-allowed; transform: none; }
            .svc-price-row { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
            @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
            @keyframes slideUp { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
        </style>
        <div class="svc-modal-overlay" onclick="if(event.target===this)window.closeModal()">
            <div class="svc-modal">
                <div class="svc-modal-header">
                    <div class="svc-modal-title">
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--primary)" stroke-width="2.5">
                            <rect x="3" y="3" width="18" height="18" rx="2"/><line x1="12" y1="8" x2="12" y2="16"/><line x1="8" y1="12" x2="16" y2="12"/>
                        </svg>
                        Add New Service
                    </div>
                    <button class="svc-modal-close" onclick="window.closeModal()">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M18 6L6 18M6 6l12 12"/></svg>
                    </button>
                </div>
                <form onsubmit="window.handleAddService(event)">
                    <div class="svc-modal-body">
                        <div class="svc-form-group">
                            <label class="svc-label">Service Title *</label>
                            <input type="text" id="serviceTitle" class="svc-input" required maxlength="100" placeholder="e.g., Wedding Photography Package">
                        </div>
                        
                        <div class="svc-form-group">
                            <label class="svc-label">Description *</label>
                            <textarea id="serviceDescription" class="svc-input svc-textarea" required rows="4" placeholder="Describe what you offer, what's included, your process..."></textarea>
                        </div>
                        
                        <div class="svc-form-group">
                            <label class="svc-label">Price Range (USD)</label>
                            <div class="svc-price-row">
                                <input type="number" id="servicePriceMin" class="svc-input" placeholder="Min" min="0">
                                <input type="number" id="servicePriceMax" class="svc-input" placeholder="Max" min="0">
                            </div>
                        </div>
                        
                        <div class="svc-form-group">
                            <label class="svc-label">Portfolio Link (Optional)</label>
                            <input type="url" id="serviceLink" class="svc-input" placeholder="https://instagram.com/yourwork or portfolio link">
                        </div>
                        
                        <div class="svc-form-group">
                            <label class="svc-label">Service Images</label>
                            <div class="svc-image-upload" onclick="document.getElementById('serviceImages').click()">
                                <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                    <rect x="3" y="3" width="18" height="18" rx="2"/>
                                    <circle cx="8.5" cy="8.5" r="1.5"/>
                                    <path d="M21 15l-5-5L5 21"/>
                                </svg>
                                <div style="font-weight: 600; color: var(--text-primary); margin-bottom: 4px;">Click to upload images</div>
                                <div style="font-size: 13px; color: var(--text-secondary);">Up to 5 images, max 5MB each</div>
                            </div>
                            <input type="file" id="serviceImages" multiple accept="image/*" style="display:none" onchange="window.previewServiceImages(this)">
                            <div class="svc-image-preview" id="imagePreviewContainer"></div>
                        </div>
                    </div>
                    <div class="svc-actions">
                        <button type="button" class="svc-btn svc-btn-secondary" onclick="window.closeModal()">Cancel</button>
                        <button type="submit" class="svc-btn svc-btn-primary">Add Service</button>
                    </div>
                </form>
            </div>
        </div>
    `;
    document.getElementById('modalsContainer').innerHTML = modal;
    document.body.style.overflow = 'hidden';
    window.serviceImagesToUpload = [];
};

window.previewServiceImages = function(input) {
    const container = document.getElementById('imagePreviewContainer');
    if (!container) return;
    
    window.serviceImagesToUpload = window.serviceImagesToUpload || [];
    
    Array.from(input.files).forEach(file => {
        if (file.size > 5 * 1024 * 1024) {
            window.showToast(`${file.name} is too large (max 5MB)`, 'error');
            return;
        }
        if (window.serviceImagesToUpload.length >= 5) {
            window.showToast('Maximum 5 images allowed', 'warning');
            return;
        }
        
        const reader = new FileReader();
        reader.onload = (e) => {
            window.serviceImagesToUpload.push(file);
            const div = document.createElement('div');
            div.className = 'svc-image-item';
            div.innerHTML = `
                <img src="${e.target.result}" alt="Preview">
                <button type="button" class="svc-image-remove" onclick="window.removeServiceImagePreview(this, ${window.serviceImagesToUpload.length - 1})">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><path d="M18 6L6 18M6 6l12 12"/></svg>
                </button>
            `;
            container.appendChild(div);
        };
        reader.readAsDataURL(file);
    });
};

window.removeServiceImagePreview = function(btn, index) {
    btn.parentElement.remove();
    window.serviceImagesToUpload.splice(index, 1);
};

window.handleAddService = async function(event) {
    event.preventDefault();
    const submitBtn = event.target.querySelector('button[type="submit"]');
    const originalText = submitBtn.textContent;
    submitBtn.disabled = true;
    submitBtn.textContent = 'Adding Service...';

    try {
        // First create the service
        const response = await api.addService({
            title: document.getElementById('serviceTitle').value,
            description: document.getElementById('serviceDescription').value,
            directLink: document.getElementById('serviceLink').value || undefined,
            priceMin: document.getElementById('servicePriceMin').value || undefined,
            priceMax: document.getElementById('servicePriceMax').value || undefined
        });

        if (response.success) {
            const serviceId = response.data.service._id;
            
            // Upload images if any
            if (window.serviceImagesToUpload && window.serviceImagesToUpload.length > 0) {
                submitBtn.textContent = `Uploading ${window.serviceImagesToUpload.length} image(s)...`;
                for (const file of window.serviceImagesToUpload) {
                    try {
                        await api.uploadServiceImage(serviceId, file);
                    } catch (imgError) {
                        console.error('Failed to upload image:', imgError);
                    }
                }
            }
            
            window.closeModal();
            window.showToast('Service added successfully!', 'success');
            
            // Refresh profile if on profile page
            if (window.navigateToPage) {
                window.navigateToPage('profile');
            }
        }
    } catch (error) {
        console.error('Failed to add service:', error);
        window.showToast(error.message || 'Failed to add service', 'error');
        submitBtn.disabled = false;
        submitBtn.textContent = originalText;
    }
};

window.editService = async function(serviceId) {
    try {
        const response = await api.getMyServices();
        const service = response.data.services.find(s => s._id === serviceId);
        if (!service) return;

        const modal = `
            <div class="modal" onclick="closeModalOnBackdrop(event)">
                <div class="modal-content">
                    <div class="modal-header">
                        <h2>Edit Service</h2>
                        <button class="icon-btn" onclick="closeModal()">
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                                <path d="M18 6L6 18M6 6l12 12" stroke="currentColor" stroke-width="2"/>
                            </svg>
                        </button>
                    </div>
                    <form onsubmit="window.handleEditService(event, '${serviceId}')" style="padding: 20px;">
                        <div class="form-group">
                            <label class="form-label">Service Title</label>
                            <input type="text" id="serviceTitle" class="form-input" required maxlength="100" value="${service.title}">
                        </div>
                        <div class="form-group">
                            <label class="form-label">Description</label>
                            <textarea id="serviceDescription" class="form-textarea" required rows="5">${service.description}</textarea>
                        </div>
                        <div class="form-group">
                            <label class="form-label">Direct Link (Optional)</label>
                            <input type="url" id="serviceLink" class="form-input" value="${service.directLink || ''}" placeholder="https://example.com/portfolio">
                        </div>
                        <div class="form-actions">
                            <button type="button" class="btn-ghost" onclick="closeModal()">Cancel</button>
                            <button type="submit" class="btn-primary">Save Changes</button>
                        </div>
                    </form>
                </div>
            </div>
        `;
        document.getElementById('modalsContainer').innerHTML = modal;
        document.body.style.overflow = 'hidden';
    } catch (error) {
        console.error('Failed to load service:', error);
        window.showToast('Failed to load service', 'error');
    }
};

window.handleEditService = async function(event, serviceId) {
    event.preventDefault();
    const submitBtn = event.target.querySelector('button[type="submit"]');
    submitBtn.disabled = true;
    submitBtn.textContent = 'Saving...';

    try {
        const response = await api.updateService(serviceId, {
            title: document.getElementById('serviceTitle').value,
            description: document.getElementById('serviceDescription').value,
            directLink: document.getElementById('serviceLink').value || undefined
        });

        if (response.success) {
            window.closeModal();
            window.showToast('Service updated successfully!', 'success');
            if (window.location.hash === '#profile' || window.navigateToPage) {
                window.navigateToPage('profile');
            }
        }
    } catch (error) {
        console.error('Failed to update service:', error);
        window.showToast(error.message || 'Failed to update service', 'error');
        submitBtn.disabled = false;
        submitBtn.textContent = 'Save Changes';
    }
};

window.deleteService = async function(serviceId) {
    if (!confirm('Are you sure you want to delete this service?')) return;

    try {
        const response = await api.deleteService(serviceId);
        if (response.success) {
            window.showToast('Service deleted successfully!', 'success');
            if (window.location.hash === '#profile' || window.navigateToPage) {
                window.navigateToPage('profile');
            }
        }
    } catch (error) {
        console.error('Failed to delete service:', error);
        window.showToast(error.message || 'Failed to delete service', 'error');
    }
};

window.uploadServiceImage = function(serviceId) {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.onchange = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        if (file.size > 5 * 1024 * 1024) {
            window.showToast('Image must be less than 5MB', 'error');
            return;
        }

        try {
            window.showToast('Uploading image...', 'info');
            const response = await api.uploadServiceImage(serviceId, file);
            if (response.success) {
                window.showToast('Image uploaded successfully!', 'success');
                if (window.location.hash === '#profile' || window.navigateToPage) {
                    window.navigateToPage('profile');
                }
            }
        } catch (error) {
            console.error('Failed to upload image:', error);
            window.showToast(error.message || 'Failed to upload image', 'error');
        }
    };
    input.click();
};

window.deleteServiceImage = async function(serviceId, imageIndex) {
    if (!confirm('Delete this image?')) return;

    try {
        const response = await api.deleteServiceImage(serviceId, imageIndex);
        if (response.success) {
            window.showToast('Image deleted successfully!', 'success');
            if (window.location.hash === '#profile' || window.navigateToPage) {
                window.navigateToPage('profile');
            }
        }
    } catch (error) {
        console.error('Failed to delete image:', error);
        window.showToast(error.message || 'Failed to delete image', 'error');
    }
};
