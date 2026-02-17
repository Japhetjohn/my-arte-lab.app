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
        <div class="modal" onclick="closeModalOnBackdrop(event)">
            <div class="modal-content">
                <div class="modal-header">
                    <h2>Add New Service</h2>
                    <button class="icon-btn" onclick="closeModal()">
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                            <path d="M18 6L6 18M6 6l12 12" stroke="currentColor" stroke-width="2"/>
                        </svg>
                    </button>
                </div>
                <form onsubmit="window.handleAddService(event)" style="padding: 20px;">
                    <div class="form-group">
                        <label class="form-label">Service Title</label>
                        <input type="text" id="serviceTitle" class="form-input" required maxlength="100" placeholder="e.g., Wedding Photography Package">
                    </div>
                    <div class="form-group">
                        <label class="form-label">Description</label>
                        <textarea id="serviceDescription" class="form-textarea" required rows="5" placeholder="Describe your service in detail..."></textarea>
                    </div>
                    <div class="form-group">
                        <label class="form-label">Direct Link (Optional)</label>
                        <input type="url" id="serviceLink" class="form-input" placeholder="https://example.com/portfolio">
                        <div class="caption mt-sm">Link to portfolio, external page, or additional details</div>
                    </div>
                    <div class="form-actions">
                        <button type="button" class="btn-ghost" onclick="closeModal()">Cancel</button>
                        <button type="submit" class="btn-primary">Add Service</button>
                    </div>
                </form>
            </div>
        </div>
    `;
    document.getElementById('modalsContainer').innerHTML = modal;
    document.body.style.overflow = 'hidden';
};

window.handleAddService = async function(event) {
    event.preventDefault();
    const submitBtn = event.target.querySelector('button[type="submit"]');
    submitBtn.disabled = true;
    submitBtn.textContent = 'Adding...';

    try {
        const response = await api.addService({
            title: document.getElementById('serviceTitle').value,
            description: document.getElementById('serviceDescription').value,
            directLink: document.getElementById('serviceLink').value || undefined
        });

        if (response.success) {
            window.closeModal();
            window.showToast('Service added successfully!', 'success');
            if (window.location.hash === '#profile' || window.navigateToPage) {
                window.navigateToPage('profile');
            }
        }
    } catch (error) {
        console.error('Failed to add service:', error);
        window.showToast(error.message || 'Failed to add service', 'error');
        submitBtn.disabled = false;
        submitBtn.textContent = 'Add Service';
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
