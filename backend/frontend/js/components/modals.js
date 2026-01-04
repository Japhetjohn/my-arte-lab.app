import { appState, setUser } from '../state.js';
import { showToast, closeModal, openModal } from '../utils.js';
import { updateUserMenu } from '../auth.js';
import { navigateToPage } from '../navigation.js';
import api from '../services/api.js';


window.showLoadingSpinner = function(message = 'Loading...') {
    const existingSpinner = document.getElementById('globalLoadingSpinner');
    if (existingSpinner) existingSpinner.remove();
    
    const spinner = document.createElement('div');
    spinner.id = 'globalLoadingSpinner';
    spinner.innerHTML = `
        <div class="modal" style="z-index: 10000;">
            <div class="modal-content" style="max-width: 300px; text-align: center; padding: 40px;">
                <div style="margin-bottom: 20px;">
                    <div class="spinner" style="
                        border: 4px solid rgba(0,0,0,0.1);
                        border-left-color: var(--primary);
                        border-radius: 50%;
                        width: 50px;
                        height: 50px;
                        animation: spin 1s linear infinite;
                        margin: 0 auto;
                    "></div>
                </div>
                <p style="color: var(--text-primary); font-weight: 500; margin: 0;">${message}</p>
            </div>
        </div>
        <style>
            @keyframes spin {
                0% { transform: rotate(0deg); }
                100% { transform: rotate(360deg); }
            }
        </style>
    `;
    document.body.appendChild(spinner);
};

window.hideLoadingSpinner = function() {
    const spinner = document.getElementById('globalLoadingSpinner');
    if (spinner) spinner.remove();
};



export async function showBookingModal(creatorId, serviceIndex = 0) {
    let creator = appState.creators?.find(c => c.id === creatorId);

    if (!creator) {
        try {
            const response = await api.getCreatorProfile(creatorId);
            if (response.success) {
                const apiCreator = response.data.creator;
                creator = {
                    id: apiCreator._id || apiCreator.id,
                    name: apiCreator.name || 'Unknown Creator',
                    avatar: apiCreator.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(apiCreator.name || 'User')}&background=9747FF&color=fff&bold=true`,
                    role: apiCreator.category ? apiCreator.category.charAt(0).toUpperCase() + apiCreator.category.slice(1) : 'Creator',
                    location: apiCreator.location ?
                        (typeof apiCreator.location === 'object' ?
                            `${apiCreator.location.city || ''}${apiCreator.location.city && apiCreator.location.country ? ', ' : ''}${apiCreator.location.country || ''}`.trim()
                            : apiCreator.location)
                        : 'Nigeria',
                    rating: apiCreator.rating?.average?.toFixed(1) || '0.0',
                    reviewCount: apiCreator.rating?.count || 0,
                    verified: apiCreator.isVerified || false,
                    services: apiCreator.services || [],
                    portfolio: apiCreator.portfolio || [],
                    _id: apiCreator._id,
                    category: apiCreator.category
                };

                if (!appState.creators) {
                    appState.creators = [];
                }
                appState.creators.push(creator);
            }
        } catch (error) {
            showToast('Failed to load creator details', 'error');
            return;
        }
    }

    if (!creator) {
        showToast('Creator not found', 'error');
        return;
    }

    if (!creator.services || creator.services.length === 0) {
        showToast('This creator has not set up any services yet', 'info');
        return;
    }

    const service = creator.services[serviceIndex];

    const avatarUrl = creator.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(creator.name || 'User')}&background=9747FF&color=fff&bold=true`;

    const modalContent = `
        <div class="modal" onclick="closeModalOnBackdrop(event)">
            <div class="modal-content">
                <div class="modal-header">
                    <h2>Request booking</h2>
                    <button class="icon-btn" onclick="closeModal()">
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                            <path d="M18 6L6 18M6 6l12 12" stroke="currentColor" stroke-width="2"/>
                        </svg>
                    </button>
                </div>

                <div class="booking-stepper mb-lg">
                    <div class="step active">
                        <div class="step-circle">1</div>
                        <div class="step-label">Request</div>
                    </div>
                    <div class="step">
                        <div class="step-circle">2</div>
                        <div class="step-label">Approval</div>
                    </div>
                    <div class="step">
                        <div class="step-circle">3</div>
                        <div class="step-label">Payment</div>
                    </div>
                </div>

                <div style="background: var(--background-alt); padding: 16px; border-radius: var(--radius); margin-bottom: 24px;">
                    <div style="display: flex; gap: 12px; align-items: center;">
                        <img src="${avatarUrl}" style="width: 40px; height: 40px; border-radius: 50%;" alt="${creator.name}">
                        <div>
                            <div style="font-weight: 600;">${creator.name}</div>
                            <div class="caption">${service.title}</div>
                        </div>
                    </div>
                </div>

                <div style="background: #FEF3C7; padding: 16px; border-radius: 8px; margin-bottom: 20px; border-left: 4px solid #F59E0B;">
                    <div style="color: #92400E; font-size: 14px; font-weight: 500; margin-bottom: 8px;">
                        How it works:
                    </div>
                    <ol style="color: #92400E; font-size: 13px; margin: 0; padding-left: 20px; line-height: 1.6;">
                        <li>Submit your booking request with your proposed budget</li>
                        <li>The creator reviews and accepts, declines, or counter-proposes</li>
                        <li>Once accepted, payment is secured</li>
                        <li>Funds are held safely until the job is completed</li>
                    </ol>
                    <div style="margin-top: 12px; padding-top: 12px; border-top: 1px solid rgba(146, 64, 14, 0.2); color: #92400E; font-size: 13px; font-weight: 500;">
                        Note: Make sure you have enough USDC before sending a request.
                    </div>
                </div>

                <form id="bookingForm" data-creator-id="${creatorId}" data-service-index="${serviceIndex}">
                    <div class="form-group">
                        <label class="form-label">Your Budget (USDC)</label>
                        <input type="number" id="proposedPrice" name="proposedPrice" class="form-input" required min="1" step="0.01" placeholder="Enter your proposed budget for this project">
                        <div class="caption mt-sm">Enter the amount you're willing to pay for this service</div>
                    </div>

                    <div class="form-group">
                        <label class="form-label">Start Date</label>
                        <input type="date" id="bookingDate" name="bookingDate" class="form-input" required min="${new Date().toISOString().split('T')[0]}" onchange="updateEndDateMin()">
                    </div>

                    <div class="form-group">
                        <label class="form-label">End Date (Expected Completion)</label>
                        <input type="date" id="endDate" name="endDate" class="form-input" required min="${new Date().toISOString().split('T')[0]}">
                        <div class="caption mt-sm">Can be the same day for single-day jobs</div>
                    </div>

                    <script>
                        function updateEndDateMin() {
                            const startDate = document.getElementById('bookingDate').value;
                            const endDateInput = document.getElementById('endDate');
                            if (startDate) {
                                endDateInput.min = startDate;
                            }
                        }
                    </script>

                    <div class="form-group">
                        <label class="form-label">Project brief (300 characters)</label>
                        <textarea id="projectBrief" name="projectBrief" class="form-textarea" maxlength="300" placeholder="Tell us about your project..." required></textarea>
                    </div>

                    <div class="form-group">
                        <label class="form-label">Attach files (optional)</label>
                        <input type="file" id="bookingAttachments" class="form-input" multiple accept="image/*,.pdf,.doc,.docx">
                        <div class="small-text" style="margin-top: 8px; color: var(--text-secondary);">
                            Upload event graphics, reference images, or any relevant files (Max 5 files, 10MB each)
                        </div>
                    </div>

                    <div class="alert alert-success">
                        <strong>No payment yet.</strong> The creator will review your request first. Payment is only secured after acceptance.
                    </div>

                    <div class="form-actions">
                        <button type="button" class="btn-ghost" onclick="closeModal()">Cancel</button>
                        <button type="submit" class="btn-primary" id="submitBookingBtn">Send Booking Request</button>
                    </div>
                </form>
            </div>
        </div>
    `;

    document.getElementById('modalsContainer').innerHTML = modalContent;
    openModal();

    const bookingForm = document.getElementById('bookingForm');
    if (bookingForm) {
        bookingForm.addEventListener('submit', function(e) {
            e.preventDefault();
            e.stopPropagation();
            const creatorId = this.dataset.creatorId;
            const serviceIndex = parseInt(this.dataset.serviceIndex);
            handleBookingSubmit(e, creatorId, serviceIndex);
            return false;
        });
    }
}

export async function handleBookingSubmit(event, creatorId, serviceIndex) {
    event.preventDefault();
    event.stopPropagation();

    const form = event.target;
    const submitBtn = form.querySelector('button[type="submit"]');
    const originalText = submitBtn.textContent;

    try {
        submitBtn.disabled = true;
        submitBtn.textContent = 'Creating booking...';

        const creator = appState.creators?.find(c => c.id === creatorId);

        if (!creator) {
            throw new Error('Creator not found. Please try again.');
        }

        if (!creator.services || !creator.services[serviceIndex]) {
            throw new Error('Service not found. Please try again.');
        }

        const service = creator.services[serviceIndex];

        // Handle file uploads
        const fileInput = document.getElementById('bookingAttachments');
        const attachmentUrls = [];

        if (fileInput && fileInput.files.length > 0) {
            // Validate file count
            if (fileInput.files.length > 5) {
                throw new Error('Maximum 5 files allowed');
            }

            submitBtn.textContent = 'Uploading files...';

            // Upload each file
            for (let i = 0; i < fileInput.files.length; i++) {
                const file = fileInput.files[i];

                // Validate file size (10MB)
                if (file.size > 10 * 1024 * 1024) {
                    throw new Error(`File "${file.name}" exceeds 10MB limit`);
                }

                try {
                    const formData = new FormData();
                    formData.append('file', file);

                    const uploadResponse = await fetch('/api/upload/booking-attachment', {
                        method: 'POST',
                        headers: {
                            'Authorization': `Bearer ${localStorage.getItem('token')}`
                        },
                        body: formData
                    });

                    const uploadResult = await uploadResponse.json();

                    if (!uploadResponse.ok || !uploadResult.success) {
                        throw new Error(uploadResult.message || 'File upload failed');
                    }

                    attachmentUrls.push(uploadResult.data.url);
                } catch (uploadError) {
                    throw new Error(`Failed to upload "${file.name}": ${uploadError.message}`);
                }
            }
        }

        submitBtn.textContent = 'Creating booking...';

        const bookingData = {
            creatorId: creator._id || creator.id,
            serviceTitle: service.title,
            serviceDescription: document.getElementById('projectBrief')?.value || service.description || 'Booking request',
            category: creator.category || 'other',
            amount: parseFloat(document.getElementById('proposedPrice').value),
            currency: 'USDC',
            startDate: document.getElementById('bookingDate').value,
            endDate: document.getElementById('endDate').value,
            attachments: attachmentUrls
        };

        const response = await api.createBooking(bookingData);

        if (response.success) {
            closeModal();
            showToast('Booking request sent to creator! You will be notified when they respond.', 'success');
            setTimeout(() => navigateToPage('bookings'), 2000);
        } else {
            throw new Error(response.message || 'Failed to send booking request');
        }
    } catch (error) {
        showToast(error.message || 'Failed to create booking request', 'error');
    } finally {
        if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.textContent = originalText;
        }
    }
}

export function handleBookNow(creatorId) {
    if (!appState.user) {
        window.showAuthModal('signin');
    } else {
        showBookingModal(creatorId);
    }
}

export function openLightbox(creatorId, imageIndex) {
    const creator = appState.creators.find(c => c.id === creatorId);
    if (!creator) return;

    const modalContent = `
        <div class="modal" onclick="closeModalOnBackdrop(event)">
            <div class="modal-content" style="max-width: 900px; padding: 0; background: transparent; box-shadow: none;">
                <button class="icon-btn" onclick="closeModal()" style="position: absolute; top: 20px; right: 20px; background: white; z-index: 10;">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                        <path d="M18 6L6 18M6 6l12 12" stroke="currentColor" stroke-width="2"/>
                    </svg>
                </button>
                <img src="${creator.portfolio[imageIndex]}" style="width: 100%; border-radius: var(--radius);" alt="Portfolio image">
            </div>
        </div>
    `;

    document.getElementById('modalsContainer').innerHTML = modalContent;
    openModal();
}

window.handleBookNow = handleBookNow;
window.handleBookingSubmit = handleBookingSubmit;
window.openLightbox = openLightbox;
window.showBookingModal = showBookingModal;

export async function handleProfileUpdate(event) {
    event.preventDefault();

    const form = event.target;
    const submitBtn = form.querySelector('button[type="submit"]');
    const originalText = submitBtn.textContent;

    try {
        submitBtn.disabled = true;
        submitBtn.textContent = 'Saving...';

        // Get form values with null checks
        const firstName = document.getElementById('profileFirstName')?.value;
        const lastName = document.getElementById('profileLastName')?.value;
        const email = document.getElementById('profileEmail')?.value;
        const bio = document.getElementById('profileBio')?.value;
        const localArea = document.getElementById('profileLocalArea')?.value;
        const state = document.getElementById('profileState')?.value;
        const country = document.getElementById('profileCountry')?.value;
        const phoneNumber = document.getElementById('profilePhone')?.value;

        if (!firstName || !lastName || !email) {
            showToast('First name, last name, and email are required', 'error');
            submitBtn.disabled = false;
            submitBtn.textContent = originalText;
            return;
        }

        const profileData = {
            firstName: firstName.trim(),
            lastName: lastName.trim(),
            email: email.trim(),
            bio: bio?.trim() || '',
            phoneNumber: phoneNumber?.trim() || '',
            location: {
                localArea: localArea?.trim() || '',
                state: state?.trim() || '',
                country: country?.trim() || ''
            }
        };

        if (appState.user.role === 'creator') {
            const skills = document.getElementById('profileSkills')?.value;
            if (skills) {
                profileData.skills = skills.split(',').map(s => s.trim());
            }
            if (document.getElementById('profileCategory')) {
                profileData.category = document.getElementById('profileCategory').value;
            }
        }

        const response = await api.updateProfile(profileData);

        if (response.success) {
            setUser(response.data.user);
            updateUserMenu();
            showToast('Profile updated successfully!', 'success');
        }
    } catch (error) {
        showToast(error.message || 'Failed to update profile', 'error');
    } finally {
        submitBtn.disabled = false;
        submitBtn.textContent = originalText;
    }
}

export function handleAvatarUpload() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';

    input.onchange = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        if (file.size > 5 * 1024 * 1024) {
            showToast('Image must be less than 5MB', 'error');
            return;
        }

        try {
            showToast('Uploading avatar...', 'info');

            const response = await api.uploadAvatar(file);

            if (response.success) {
                const freshUserData = await api.getMe();
                if (freshUserData.success) {
                    setUser(freshUserData.data.user);
                    updateUserMenu();
                }

                showToast('Avatar updated successfully!', 'success');

                setTimeout(() => window.location.reload(), 1000);
            }
        } catch (error) {
            showToast(error.message || 'Failed to upload avatar', 'error');
        }
    };

    input.click();
}

export function handleCoverUpload() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';

    input.onchange = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        if (file.size > 5 * 1024 * 1024) {
            showToast('Image must be less than 5MB', 'error');
            return;
        }

        try {
            showToast('Uploading cover image...', 'info');

            const response = await api.uploadCover(file);

            if (response.success) {
                const freshUserData = await api.getMe();
                if (freshUserData.success) {
                    setUser(freshUserData.data.user);
                    updateUserMenu();
                }

                showToast('Cover image updated successfully!', 'success');

                setTimeout(() => window.location.reload(), 1000);
            }
        } catch (error) {
            showToast(error.message || 'Failed to upload cover image', 'error');
        }
    };

    input.click();
}

export function showChangePasswordModal() {
    const modalContent = `
        <div class="modal" onclick="closeModalOnBackdrop(event)">
            <div class="modal-content" style="max-width: 500px;">
                <div class="modal-header">
                    <h2>Change Password</h2>
                    <button class="icon-btn" onclick="closeModal()">
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                            <path d="M18 6L6 18M6 6l12 12" stroke="currentColor" stroke-width="2"/>
                        </svg>
                    </button>
                </div>

                <form onsubmit="handlePasswordChange(event)" style="padding: 20px;">
                    <div class="form-group">
                        <label class="form-label">Current Password</label>
                        <div style="position: relative;">
                            <input type="password" id="currentPassword" class="form-input" required style="padding-right: 40px;">
                            <button type="button" onclick="togglePasswordVisibility('currentPassword', this)" style="position: absolute; right: 8px; top: 50%; transform: translateY(-50%); background: none; border: none; cursor: pointer; padding: 4px; display: flex; align-items: center; color: var(--text-secondary);">
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" class="eye-icon">
                                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                                    <circle cx="12" cy="12" r="3" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                                </svg>
                            </button>
                        </div>
                    </div>

                    <div class="form-group">
                        <label class="form-label">New Password</label>
                        <div style="position: relative;">
                            <input type="password" id="newPassword" class="form-input" required minlength="8" style="padding-right: 40px;">
                            <button type="button" onclick="togglePasswordVisibility('newPassword', this)" style="position: absolute; right: 8px; top: 50%; transform: translateY(-50%); background: none; border: none; cursor: pointer; padding: 4px; display: flex; align-items: center; color: var(--text-secondary);">
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" class="eye-icon">
                                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                                    <circle cx="12" cy="12" r="3" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                                </svg>
                            </button>
                        </div>
                    </div>

                    <div class="form-group">
                        <label class="form-label">Confirm New Password</label>
                        <div style="position: relative;">
                            <input type="password" id="confirmPassword" class="form-input" required minlength="8" style="padding-right: 40px;">
                            <button type="button" onclick="togglePasswordVisibility('confirmPassword', this)" style="position: absolute; right: 8px; top: 50%; transform: translateY(-50%); background: none; border: none; cursor: pointer; padding: 4px; display: flex; align-items: center; color: var(--text-secondary);">
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" class="eye-icon">
                                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                                    <circle cx="12" cy="12" r="3" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                                </svg>
                            </button>
                        </div>
                    </div>

                    <button type="submit" class="btn-primary" style="width: 100%; margin-top: 16px;">
                        Change Password
                    </button>
                </form>
            </div>
        </div>
    `;

    document.getElementById('modalsContainer').innerHTML = modalContent;
    openModal();
}

window.handlePasswordChange = async function(event) {
    event.preventDefault();

    const currentPassword = document.getElementById('currentPassword').value;
    const newPassword = document.getElementById('newPassword').value;
    const confirmPassword = document.getElementById('confirmPassword').value;

    if (newPassword !== confirmPassword) {
        showToast('Passwords do not match', 'error');
        return;
    }

    const submitBtn = event.target.querySelector('button[type="submit"]');
    const originalText = submitBtn.textContent;

    try {
        submitBtn.disabled = true;
        submitBtn.textContent = 'Changing...';

        const response = await api.updatePassword({
            currentPassword,
            newPassword
        });

        if (response.success) {
            closeModal();
            showToast('Password changed successfully!', 'success');
        }
    } catch (error) {
        showToast(error.message || 'Failed to change password', 'error');
    } finally {
        submitBtn.disabled = false;
        submitBtn.textContent = originalText;
    }
};

export async function showTwoFactorModal() {
    const modalContent = `
        <div class="modal" onclick="closeModalOnBackdrop(event)">
            <div class="modal-content" style="max-width: 500px;">
                <div class="modal-header">
                    <h2>Two-Factor Authentication</h2>
                    <button class="icon-btn" onclick="closeModal()">
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                            <path d="M18 6L6 18M6 6l12 12" stroke="currentColor" stroke-width="2"/>
                        </svg>
                    </button>
                </div>

                <div style="padding: 24px;">
                    <div id="twoFactorContent">
                        <div style="text-align: center; padding: 40px;">
                            <div class="spinner" style="margin: 0 auto 16px;"></div>
                            <p style="color: var(--text-secondary);">Setting up 2FA...</p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `;

    document.getElementById('modalsContainer').innerHTML = modalContent;
    openModal();

    try {
        // Setup 2FA and get QR code
        const response = await api.request('/auth/2fa/setup', { method: 'POST' });

        if (!response.success) {
            throw new Error(response.message || '2FA setup failed');
        }

        const { qrCode, manualEntryKey } = response.data;

        // Display setup UI with real QR code
        const setupContent = `
            <!-- Initial view -->
            <div class="card" style="background: var(--background-alt); padding: 20px; margin-bottom: 20px;">
                <div style="display: flex; align-items: start; gap: 16px;">
                    <div style="background: linear-gradient(135deg, var(--primary), var(--secondary)); width: 48px; height: 48px; border-radius: 12px; display: flex; align-items: center; justify-content: center; flex-shrink: 0;">
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2">
                            <rect x="5" y="11" width="14" height="10" rx="2"/>
                            <path d="M12 16v1M8 11V7a4 4 0 0 1 8 0v4"/>
                        </svg>
                    </div>
                    <div style="flex: 1;">
                        <h4 style="margin: 0 0 8px 0;">Secure Your Account</h4>
                        <p style="color: var(--text-secondary); font-size: 14px; line-height: 1.6; margin: 0;">
                            Add an extra layer of security by enabling two-factor authentication. You'll need to enter a code from your authenticator app each time you log in.
                        </p>
                    </div>
                </div>
            </div>

            <!-- Setup steps -->
            <div style="margin-bottom: 24px;">
                <h4 style="margin: 0 0 16px 0;">Setup Steps:</h4>
                <ol style="padding-left: 24px; color: var(--text-secondary); line-height: 2;">
                    <li>Download an authenticator app (Google Authenticator, Authy, or Microsoft Authenticator)</li>
                    <li>Scan the QR code below with your app</li>
                    <li>Enter the 6-digit code to verify</li>
                </ol>
            </div>

            <!-- Real QR Code -->
            <div style="text-align: center; padding: 24px; background: white; border-radius: 12px; margin-bottom: 20px;">
                <img src="${qrCode}" alt="2FA QR Code" style="width: 200px; height: 200px; margin: 0 auto; border-radius: 8px;">
                <p style="margin-top: 12px; color: var(--text-secondary); font-size: 13px;">Scan this QR code with your authenticator app</p>
                <p style="margin-top: 8px; font-family: monospace; font-size: 11px; color: var(--text-secondary); word-break: break-all; padding: 0 20px;">Manual key: ${manualEntryKey}</p>
            </div>

            <!-- Verification code input -->
            <div style="margin-bottom: 20px;">
                <label class="form-label">Enter 6-digit code from your app</label>
                <input type="text" id="twoFactorCode" class="form-input" placeholder="000000" maxlength="6" pattern="[0-9]{6}" style="text-align: center; font-size: 24px; letter-spacing: 8px; font-weight: 600;">
            </div>

            <!-- Action buttons -->
            <div style="display: flex; gap: 12px;">
                <button class="btn-secondary" onclick="closeModal()" style="flex: 1;">Cancel</button>
                <button class="btn-primary" id="enable2FABtn" style="flex: 1;" disabled>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="display: inline; margin-right: 6px; vertical-align: middle;">
                        <path d="M9 12l2 2 4-4"/>
                        <circle cx="12" cy="12" r="10"/>
                    </svg>
                    Enable 2FA
                </button>
            </div>

            <!-- Note -->
            <div class="card" style="background: rgba(255, 193, 7, 0.1); border: 1px solid rgba(255, 193, 7, 0.3); padding: 16px; margin-top: 20px;">
                <div style="display: flex; gap: 12px; align-items: start;">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" style="flex-shrink: 0; margin-top: 2px;">
                        <circle cx="12" cy="12" r="10" stroke="#FFC107" stroke-width="2"/>
                        <path d="M12 8v4M12 16h.01" stroke="#FFC107" stroke-width="2" stroke-linecap="round"/>
                    </svg>
                    <p style="margin: 0; font-size: 13px; color: var(--text-secondary); line-height: 1.6;">
                        <strong>Important:</strong> Save your backup codes in a safe place. You'll need them to access your account if you lose your device.
                    </p>
                </div>
            </div>
        `;

        document.getElementById('twoFactorContent').innerHTML = setupContent;

        // Handle code input
        const codeInput = document.getElementById('twoFactorCode');
        const enableBtn = document.getElementById('enable2FABtn');

        codeInput?.addEventListener('input', (e) => {
            e.target.value = e.target.value.replace(/\D/g, '');
            enableBtn.disabled = e.target.value.length !== 6;
        });

        enableBtn?.addEventListener('click', async () => {
            const code = codeInput?.value;
            if (code && code.length === 6) {
                enableBtn.disabled = true;
                enableBtn.innerHTML = '<span class="spinner"></span> Verifying...';

                try {
                    const enableResponse = await api.request('/auth/2fa/enable', {
                        method: 'POST',
                        body: JSON.stringify({ code })
                    });

                    if (!enableResponse.success) {
                        throw new Error(enableResponse.message || 'Invalid code');
                    }

                    showToast('Two-factor authentication enabled successfully!', 'success');
                    closeModal();

                    // Show backup codes from backend
                    setTimeout(() => {
                        showBackupCodesModal(enableResponse.data.backupCodes);
                    }, 300);
                } catch (error) {
                    showToast(error.message || 'Invalid verification code. Please try again.', 'error');
                    enableBtn.disabled = false;
                    enableBtn.innerHTML = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="display: inline; margin-right: 6px; vertical-align: middle;"><path d="M9 12l2 2 4-4"/><circle cx="12" cy="12" r="10"/></svg>Enable 2FA';
                }
            }
        });

    } catch (error) {
        document.getElementById('twoFactorContent').innerHTML = `
            <div style="text-align: center; padding: 40px;">
                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" style="margin: 0 auto 16px; opacity: 0.4;">
                    <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="2"/>
                    <path d="M12 8v4M12 16h.01" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
                </svg>
                <p style="color: var(--text-secondary); margin-bottom: 16px;">${error.message || 'Failed to setup 2FA'}</p>
                <button class="btn-primary" onclick="window.showTwoFactorModal()">Try Again</button>
            </div>
        `;
    }
}

function showBackupCodesModal(backupCodes = []) {
    // Use backup codes from backend (passed as parameter)
    if (!backupCodes || backupCodes.length === 0) {
        // Fallback to random codes if not provided
        backupCodes = Array.from({ length: 8 }, () =>
            Math.random().toString(36).substring(2, 10).toUpperCase()
        );
    }

    const modalContent = `
        <div class="modal" onclick="closeModalOnBackdrop(event)">
            <div class="modal-content" style="max-width: 500px;">
                <div class="modal-header">
                    <h2>Backup Codes</h2>
                    <button class="icon-btn" onclick="closeModal()">
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                            <path d="M18 6L6 18M6 6l12 12" stroke="currentColor" stroke-width="2"/>
                        </svg>
                    </button>
                </div>

                <div style="padding: 24px;">
                    <div class="card" style="background: rgba(16, 185, 129, 0.1); border: 1px solid rgba(16, 185, 129, 0.3); padding: 16px; margin-bottom: 20px;">
                        <p style="margin: 0; color: var(--text-secondary); font-size: 14px; line-height: 1.6;">
                            Save these backup codes in a secure location. Each code can only be used once to access your account if you lose your authenticator device.
                        </p>
                    </div>

                    <div style="background: var(--background-alt); padding: 20px; border-radius: 12px; margin-bottom: 20px;">
                        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px; font-family: monospace; font-size: 14px;">
                            ${backupCodes.map(code => `<div style="padding: 8px; background: var(--background); border-radius: 6px; text-align: center;">${code}</div>`).join('')}
                        </div>
                    </div>

                    <div style="display: flex; gap: 12px;">
                        <button class="btn-secondary" onclick="window.downloadBackupCodes(${JSON.stringify(backupCodes).replace(/"/g, '&quot;')})" style="flex: 1;">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="display: inline; margin-right: 6px; vertical-align: middle;">
                                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3"/>
                            </svg>
                            Download
                        </button>
                        <button class="btn-primary" onclick="closeModal()" style="flex: 1;">Done</button>
                    </div>
                </div>
            </div>
        </div>
    `;

    document.getElementById('modalsContainer').innerHTML = modalContent;
}

window.downloadBackupCodes = function(codes) {
    const content = `MyArteLab 2FA Backup Codes\n\nGenerated: ${new Date().toLocaleString()}\n\n${codes.join('\n')}\n\nKeep these codes safe. Each can only be used once.`;
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'myartelab-backup-codes.txt';
    a.click();
    URL.revokeObjectURL(url);
    showToast('Backup codes downloaded successfully', 'success');
};


export function showWithdrawModal() {
    const modalContent = `
        <div class="modal" onclick="closeModalOnBackdrop(event)">
            <div class="modal-content" style="max-width: 550px;">
                <div class="modal-header">
                    <h2>Withdraw Funds</h2>
                    <button class="icon-btn" onclick="closeModal()">
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                            <path d="M18 6L6 18M6 6l12 12" stroke="currentColor" stroke-width="2"/>
                        </svg>
                    </button>
                </div>

                <div style="padding: 20px;">
                    <p style="color: var(--text-secondary); margin-bottom: 20px;">Choose your withdrawal method</p>

                    <div style="display: grid; gap: 12px; margin-bottom: 20px;">
                        <!-- Bank Transfer Option -->
                        <div class="card" onclick="window.showBankWithdrawal()" style="cursor: pointer; padding: 16px; background: var(--background-alt); border: 2px solid transparent; transition: border-color 0.2s;">
                            <div style="display: flex; align-items: center; gap: 12px;">
                                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                    <rect x="2" y="4" width="20" height="16" rx="2"/>
                                    <path d="M6 16h12M6 12h12M6 8h12"/>
                                </svg>
                                <div style="flex: 1;">
                                    <div style="font-weight: 600;">Bank Transfer</div>
                                    <small style="color: var(--text-secondary);">Withdraw to your bank account (NGN)</small>
                                </div>
                                <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                                    <path d="M7.5 5l5 5-5 5" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
                                </svg>
                            </div>
                        </div>

                        <!-- Crypto Option (Existing) -->
                        <div class="card" onclick="window.showCryptoWithdrawal()" style="cursor: pointer; padding: 16px; background: var(--background-alt); border: 2px solid transparent; transition: border-color 0.2s;">
                            <div style="display: flex; align-items: center; gap: 12px;">
                                <div style="font-size: 24px;">₿</div>
                                <div style="flex: 1;">
                                    <div style="font-weight: 600;">Crypto (Direct)</div>
                                    <small style="color: var(--text-secondary);">Send USDC to Solana address</small>
                                </div>
                                <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                                    <path d="M7.5 5l5 5-5 5" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
                                </svg>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `;

    document.getElementById('modalsContainer').innerHTML = modalContent;
    openModal();
}

window.showBankWithdrawal = async function() {
    try {
        window.showLoadingSpinner('Loading withdrawal form...');

        const response = await api.getSwitchCountries();

        if (!response.success || !response.data) {
            showToast('Failed to load countries', 'error');
            return;
        }

        const countries = response.data.countries || [];
        window.hideLoadingSpinner();

        const popularCountries = ['NG', 'US', 'GB', 'KE', 'GH', 'ZA', 'CA'];
        const sortedCountries = countries.sort((a, b) => {
            const aIndex = popularCountries.indexOf(a.country);
            const bIndex = popularCountries.indexOf(b.country);
            if (aIndex !== -1 && bIndex !== -1) return aIndex - bIndex;
            if (aIndex !== -1) return -1;
            if (bIndex !== -1) return 1;
            return (a.country || '').localeCompare(b.country || '');
        });

        const countryNames = {
            'NG': 'Nigeria', 'US': 'United States', 'GB': 'United Kingdom', 'KE': 'Kenya',
            'GH': 'Ghana', 'ZA': 'South Africa', 'CA': 'Canada', 'BR': 'Brazil', 'MX': 'Mexico',
            'AR': 'Argentina', 'PE': 'Peru', 'CL': 'Chile', 'CO': 'Colombia', 'AE': 'UAE',
            'SA': 'Saudi Arabia', 'QA': 'Qatar', 'IL': 'Israel', 'EG': 'Egypt', 'JO': 'Jordan',
            'TZ': 'Tanzania', 'UG': 'Uganda', 'MW': 'Malawi', 'ET': 'Ethiopia', 'CG': 'Congo',
            'FR': 'France', 'DE': 'Germany', 'IT': 'Italy', 'ES': 'Spain', 'NL': 'Netherlands',
            'BE': 'Belgium', 'PT': 'Portugal', 'PL': 'Poland', 'AT': 'Austria', 'SE': 'Sweden',
            'DK': 'Denmark', 'NO': 'Norway', 'FI': 'Finland', 'IE': 'Ireland', 'CH': 'Switzerland'
        };

        const countryOptions = sortedCountries.map(c => {
            const displayName = countryNames[c.country] || c.country;
            return `<option value="${c.country}">${displayName} (${c.country})</option>`;
        }).join('');

        const modalContent = `
            <div class="modal" onclick="closeModalOnBackdrop(event)">
                <div class="modal-content" style="max-width: 550px;">
                    <div class="modal-header">
                        <h2>Withdraw to Bank</h2>
                        <button class="icon-btn" onclick="closeModal()">
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                                <path d="M18 6L6 18M6 6l12 12" stroke="currentColor" stroke-width="2"/>
                            </svg>
                        </button>
                    </div>

                    <div style="padding: 20px;">
                        <div style="background: #EEF2FF; padding: 16px; border-radius: 8px; margin-bottom: 20px;">
                            <p style="color: #4338CA; font-weight: 600; margin-bottom: 8px;">Global Withdrawals Available</p>
                            <p style="color: #4338CA; font-size: 14px;">
                                Withdraw to bank accounts in 65 countries!
                            </p>
                        </div>

                        <form id="offrampForm" onsubmit="window.handleSwitchOfframp(event)">
                            <div class="form-group">
                                <label class="form-label">Select Your Country</label>
                                <select id="offrampCountry" class="form-select" required>
                                    <option value="">Choose a country...</option>
                                    ${countryOptions}
                                </select>
                            </div>

                            <div class="form-group" id="bankSelectGroup" style="display: none;">
                                <label class="form-label">Select Bank/Payment Method</label>
                                <input type="text" id="bankSearch" class="form-input" placeholder="Search banks..." style="margin-bottom: 8px; display: none;">
                                <select id="offrampBank" class="form-select">
                                    <option value="">Loading banks...</option>
                                </select>
                            </div>

                            <div class="form-group">
                                <label class="form-label">Amount (USDC)</label>
                                <input type="number" id="offrampAmount" class="form-input" required min="1" step="0.01" placeholder="Enter amount">
                                <small id="offrampQuoteDisplay" style="color: var(--text-secondary); margin-top: 4px; display: none;">
                                    You'll receive: <span style="font-weight: 600;"><span id="offrampEstimate">0.00</span></span>
                                    <span id="offrampEstimateLoading" style="display: none; margin-left: 8px; color: var(--primary);">
                                        Calculating...
                                    </span>
                                </small>
                            </div>

                            <div id="dynamicFieldsContainer" style="display: none;">
                                <!-- Dynamic form fields based on country requirements will be inserted here -->
                            </div>

                            <div style="background: var(--background-alt); padding: 12px; border-radius: 8px; margin-bottom: 16px;">
                                <small style="color: var(--text-secondary); display: block; line-height: 1.5;">
                                    Minimum withdrawal: $1 USDC<br>
                                    Processing time: Usually within minutes
                                </small>
                            </div>

                            <button type="submit" class="btn-primary" style="width: 100%;" id="offrampSubmitBtn" disabled>
                                Complete Withdrawal
                            </button>
                        </form>
                    </div>
                </div>
            </div>
        `;

        document.getElementById('modalsContainer').innerHTML = modalContent;
        openModal();

        const countrySelect = document.getElementById('offrampCountry');
        const bankSelectGroup = document.getElementById('bankSelectGroup');
        const bankSelect = document.getElementById('offrampBank');
        const amountInput = document.getElementById('offrampAmount');
        const submitBtn = document.getElementById('offrampSubmitBtn');
        const dynamicFieldsContainer = document.getElementById('dynamicFieldsContainer');
        const quoteDisplay = document.getElementById('offrampQuoteDisplay');
        const estimateSpan = document.getElementById('offrampEstimate');
        const estimateLoading = document.getElementById('offrampEstimateLoading');

        let debounceTimer;
        let selectedCountry = null;
        let selectedBank = null;

        countrySelect.addEventListener('change', async () => {
            const country = countrySelect.value;
            selectedCountry = country;

            if (!country) {
                bankSelectGroup.style.display = 'none';
                dynamicFieldsContainer.style.display = 'none';
                submitBtn.disabled = true;
                return;
            }

            window.showLoadingSpinner('Loading banks...');
            bankSelect.innerHTML = '<option value="">Loading banks...</option>';
            bankSelectGroup.style.display = 'block';

            try {
                const banksResponse = await api.getSwitchBanks(country);

                if (banksResponse.success && banksResponse.data && banksResponse.data.banks) {
                    const banks = banksResponse.data.banks;

                    if (banks.length === 0) {
                        bankSelectGroup.style.display = 'none';
                        selectedBank = 'DIRECT'; // Mark as selected so fields can load
                        window.hideLoadingSpinner();

                        dynamicFieldsContainer.innerHTML = '<p style="color: var(--text-secondary);">Loading form fields...</p>';
                        dynamicFieldsContainer.style.display = 'block';

                        try {
                            const reqResponse = await api.getSwitchRequirements(selectedCountry, 'INDIVIDUAL');

                            if (reqResponse.success && reqResponse.data && reqResponse.data.requirements) {
                                const requirements = reqResponse.data.requirements;

                                const fieldLabels = {
                                    'bank_code': 'Bank Code',
                                    'account_number': 'Account Number',
                                    'routing_number': 'Routing Number',
                                    'account_name': 'Account Name',
                                    'holder_name': 'Account Holder Name',
                                    'holder_street': 'Street Address',
                                    'holder_city': 'City',
                                    'holder_state': 'State',
                                    'holder_postal_code': 'Postal Code',
                                    'phone_number': 'Phone Number',
                                    'document_number': 'Document Number',
                                    'cpf': 'CPF',
                                    'rfc': 'RFC',
                                    'clabe': 'CLABE',
                                    'sort_code': 'Sort Code',
                                    'bsb_code': 'BSB Code',
                                    'ifsc_code': 'IFSC Code'
                                };

                                let fieldsHTML = '';
                                requirements.forEach(req => {
                                    const fieldName = req.path;

                                    if (fieldName === 'bank_code' || fieldName === 'holder_type') return;

                                    const fieldId = `dynamic_${fieldName}`;
                                    const label = fieldLabels[fieldName] || fieldName.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
                                    const placeholder = req.example || `Enter ${label}`;

                                    if (req.option && req.option.length > 0) {
                                        fieldsHTML += `
                                            <div class="form-group">
                                                <label class="form-label">${label} *</label>
                                                <select id="${fieldId}" name="${fieldName}" class="form-select dynamic-field" required data-field="${fieldName}">
                                                    <option value="">Select ${label}...</option>
                                                    ${req.option.map(opt => `<option value="${opt}">${opt}</option>`).join('')}
                                                </select>
                                                ${req.example ? `<small style="color: var(--text-secondary); display: block; margin-top: 4px;">Example: ${req.example}</small>` : ''}
                                            </div>
                                        `;
                                    } else {
                                        fieldsHTML += `
                                            <div class="form-group">
                                                <label class="form-label">${label} *</label>
                                                <input type="text" id="${fieldId}" name="${fieldName}"
                                                       class="form-input dynamic-field" required
                                                       placeholder="${placeholder}"
                                                       pattern="${req.regex || ''}"
                                                       data-field="${fieldName}">
                                                ${req.example ? `<small style="color: var(--text-secondary); display: block; margin-top: 4px;">Example: ${req.example}</small>` : ''}
                                            </div>
                                        `;
                                    }
                                });

                                dynamicFieldsContainer.innerHTML = fieldsHTML;

                                document.querySelectorAll('.dynamic-field').forEach(field => {
                                    field.addEventListener('input', checkFormValid);
                                    field.addEventListener('change', checkFormValid);
                                });

                                checkFormValid();
                            }
                        } catch (error) {
                            console.error('Failed to load requirements:', error);
                            dynamicFieldsContainer.innerHTML = '<p style="color: var(--danger);">Failed to load form fields</p>';
                        }

                        return; // Exit early, no need to show bank selector
                    }

                    const bankSearch = document.getElementById('bankSearch');

                    if (banks.length > 10) {
                        bankSearch.style.display = 'block';
                    }

                    window.renderBanks = (filter = '') => {
                        bankSelect.innerHTML = '<option value="">Select bank...</option>';
                        const filtered = filter
                            ? banks.filter(b => b.name.toLowerCase().includes(filter.toLowerCase()))
                            : banks;

                        filtered.forEach(bank => {
                            const option = document.createElement('option');
                            option.value = bank.code || bank.id;
                            option.textContent = bank.name;
                            option.dataset.rail = bank.rail || '';
                            bankSelect.appendChild(option);
                        });

                        if (filtered.length === 0) {
                            bankSelect.innerHTML = '<option value="">No banks found</option>';
                        }
                    };

                    bankSearch.addEventListener('input', (e) => {
                        window.renderBanks(e.target.value);
                    });

                    window.renderBanks();
                    window.hideLoadingSpinner();
                } else {
                    bankSelect.innerHTML = '<option value="">No banks available</option>';
                    window.hideLoadingSpinner();
                }
            } catch (error) {
                console.error('Failed to load banks:', error);
                window.hideLoadingSpinner();
                bankSelect.innerHTML = '<option value="">Failed to load banks</option>';
            }
        });

        bankSelect.addEventListener('change', async () => {
            selectedBank = bankSelect.value;

            if (!selectedBank || !selectedCountry) {
                dynamicFieldsContainer.style.display = 'none';
                checkFormValid();
                return;
            }

            dynamicFieldsContainer.innerHTML = '<p style="color: var(--text-secondary);">Loading form fields...</p>';
            dynamicFieldsContainer.style.display = 'block';

            try {
                const reqResponse = await api.getSwitchRequirements(selectedCountry, 'INDIVIDUAL');

                if (reqResponse.success && reqResponse.data && reqResponse.data.requirements && reqResponse.data.requirements.length > 0) {
                    const requirements = reqResponse.data.requirements;

                    const fieldLabels = {
                        'bank_code': 'Bank Code',
                        'account_number': 'Account Number',
                        'routing_number': 'Routing Number',
                        'account_name': 'Account Name',
                        'phone_number': 'Phone Number',
                        'document_number': 'Document Number',
                        'cpf': 'CPF',
                        'rfc': 'RFC',
                        'clabe': 'CLABE',
                        'sort_code': 'Sort Code',
                        'bsb_code': 'BSB Code',
                        'ifsc_code': 'IFSC Code'
                    };

                    let fieldsHTML = '';
                    requirements.forEach(req => {
                        const fieldName = req.path;
                        
                        if (fieldName === 'bank_code') return;
                        
                        const fieldId = `dynamic_${fieldName}`;
                        const label = fieldLabels[fieldName] || fieldName.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
                        const placeholder = req.example || `Enter ${label}`;

                        fieldsHTML += `
                            <div class="form-group">
                                <label class="form-label">${label} *</label>
                                <input type="text" id="${fieldId}" name="${fieldName}"
                                       class="form-input dynamic-field" required
                                       placeholder="${placeholder}"
                                       pattern="${req.regex || ''}"
                                       data-field="${fieldName}">
                                ${req.example ? `<small style="color: var(--text-secondary); display: block; margin-top: 4px;">Example: ${req.example}</small>` : ''}
                            </div>
                        `;
                    });

                    dynamicFieldsContainer.innerHTML = fieldsHTML;

                    document.querySelectorAll('.dynamic-field').forEach(field => {
                        field.addEventListener('input', checkFormValid);
                    });
                } else {
                    dynamicFieldsContainer.innerHTML = `
                        <div class="form-group">
                            <label class="form-label">Account Number *</label>
                            <input type="text" id="dynamic_account_number" name="account_number"
                                   class="form-input dynamic-field" required
                                   placeholder="Enter account number">
                        </div>
                        <div class="form-group">
                            <label class="form-label">Account Holder Name *</label>
                            <input type="text" id="dynamic_account_name" name="account_name"
                                   class="form-input dynamic-field" required
                                   placeholder="Enter account holder name">
                        </div>
                    `;

                    document.querySelectorAll('.dynamic-field').forEach(field => {
                        field.addEventListener('input', checkFormValid);
                    });
                }

                const accountNumberField = document.getElementById('dynamic_account_number');
                const accountNameField = document.getElementById('dynamic_account_name');

                if (accountNumberField && accountNameField && selectedBank) {
                    let verificationTimeout;

                    accountNumberField.addEventListener('input', () => {
                        clearTimeout(verificationTimeout);
                        const accountNumber = accountNumberField.value.trim();

                        if (accountNumber.length >= 10) {
                            verificationTimeout = setTimeout(async () => {
                                accountNameField.value = 'Verifying...';
                                accountNameField.disabled = true;

                                try {
                                    const result = await api.verifySwitchBankAccount({
                                        country: selectedCountry,
                                        bankCode: selectedBank,
                                        accountNumber
                                    });

                                    if (result.success && result.data?.accountName) {
                                        accountNameField.value = result.data.accountName;
                                        accountNameField.disabled = true; // Keep it readonly
                                        showToast('Account verified successfully', 'success');
                                    } else {
                                        accountNameField.value = '';
                                        accountNameField.disabled = false;
                                        accountNameField.placeholder = 'Enter account holder name';
                                    }
                                } catch (error) {
                                    showToast('Account verification unavailable. Please enter name manually.', 'info');
                                    accountNameField.value = '';
                                    accountNameField.disabled = false;
                                    accountNameField.placeholder = 'Enter account holder name';
                                }
                            }, 800); // Debounce for 800ms
                        }
                    });

                    accountNameField.addEventListener('focus', () => {
                        if (accountNameField.value === 'Verifying...') {
                            accountNameField.value = '';
                        }
                    });
                }

                checkFormValid();

            } catch (error) {
                console.error('Failed to load requirements:', error);
                dynamicFieldsContainer.innerHTML = '<p style="color: var(--danger);">Failed to load form fields</p>';
            }
        });

        amountInput.addEventListener('input', async () => {
            clearTimeout(debounceTimer);
            const amount = parseFloat(amountInput.value);

            if (amount >= 1 && selectedCountry) {
                estimateLoading.style.display = 'inline';
                quoteDisplay.style.display = 'block';

                debounceTimer = setTimeout(async () => {
                    try {
                        const currencyMap = {
                            'NG': 'NGN', 'GH': 'GHS', 'KE': 'KES', 'ZA': 'ZAR', 'UG': 'UGX',
                            'US': 'USD', 'GB': 'GBP', 'AE': 'AED', 'BR': 'BRL', 'PH': 'PHP',
                            'MX': 'MXN', 'PL': 'PLN', 'RO': 'RON', 'CZ': 'CZK', 'HU': 'HUF',
                            'NO': 'NOK', 'SE': 'SEK', 'DK': 'DKK'
                        };
                        const euroCountries = ['AD', 'AT', 'BE', 'HR', 'CY', 'EE', 'FI', 'FR', 'DE',
                                              'GR', 'IT', 'LV', 'LT', 'LU', 'MT', 'NL', 'PT', 'SK', 'SI', 'ES'];
                        const currency = euroCountries.includes(selectedCountry) ? 'EUR' : (currencyMap[selectedCountry] || 'USD');

                        const quoteResponse = await api.getSwitchOfframpQuote({
                            amount,
                            country: selectedCountry,
                            currency,
                            asset: 'solana:usdc'
                        });

                        estimateLoading.style.display = 'none';

                        if (quoteResponse.success && quoteResponse.data) {
                            const quote = quoteResponse.data;
                            estimateSpan.textContent = `${quote.destination?.amount || 0} ${quote.destination?.currency || ''}`;
                        } else {
                            estimateSpan.textContent = 'N/A';
                        }
                    } catch (error) {
                        console.error('Failed to get quote:', error);
                        estimateLoading.style.display = 'none';
                        estimateSpan.textContent = 'N/A';
                    }
                }, 500);
            } else {
                quoteDisplay.style.display = 'none';
            }

            checkFormValid();
        });

        function checkFormValid() {
            const hasCountry = !!selectedCountry;
            const hasBank = !!selectedBank;
            const hasAmount = amountInput.value && parseFloat(amountInput.value) >= 1;

            const dynamicFields = document.querySelectorAll('.dynamic-field');
            const allDynamicFieldsFilled = Array.from(dynamicFields).every(field => {
                if (field.required) {
                    return field.value.trim() !== '';
                }
                return true;
            });

            submitBtn.disabled = !(hasCountry && hasBank && hasAmount && allDynamicFieldsFilled);
        }

    } catch (error) {
        console.error('Failed to load withdrawal modal:', error);
        showToast(error.message || 'Failed to load withdrawal form', 'error');
    }
};


window.showCryptoWithdrawal = function() {
    const modalContent = `
        <div class="modal" onclick="closeModalOnBackdrop(event)">
            <div class="modal-content" style="max-width: 550px;">
                <div class="modal-header">
                    <h2>₿ Crypto Withdrawal</h2>
                    <button class="icon-btn" onclick="closeModal()">
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                            <path d="M18 6L6 18M6 6l12 12" stroke="currentColor" stroke-width="2"/>
                        </svg>
                    </button>
                </div>

                <div style="padding: 20px;">
                    <form id="cryptoWithdrawForm" onsubmit="handleWithdrawal(event)">
                        <div class="form-group">
                            <label class="form-label">Amount (USDC)</label>
                            <input type="number" id="withdrawAmount" class="form-input" required min="1" step="0.01" placeholder="Minimum: $1 USDC">
                        </div>

                        <div class="form-group">
                            <label class="form-label">Wallet Address (Solana)</label>
                            <input type="text" id="withdrawAddress" class="form-input" required placeholder="Enter your Solana wallet address">
                        </div>

                        <div class="form-group">
                            <label class="form-label">Currency</label>
                            <select id="withdrawCurrency" class="form-select">
                                <option value="USDC" selected>USDC</option>
                                <option value="DAI">DAI</option>
                            </select>
                        </div>

                        <div style="background: var(--background-alt); padding: 12px; border-radius: 8px; margin-bottom: 16px;">
                            <small style="color: var(--text-secondary); display: block; line-height: 1.5;">
                                Minimum withdrawal: $1 USDC<br>
                                Transaction confirmed on blockchain within minutes
                            </small>
                        </div>

                        <button type="submit" class="btn-primary" style="width: 100%;">
                            Send Crypto
                        </button>
                    </form>
                </div>
            </div>
        </div>
    `;

    document.getElementById('modalsContainer').innerHTML = modalContent;
    openModal();
};

window.handleSwitchOfframp = async function(event) {
    event.preventDefault();

    const country = document.getElementById('offrampCountry').value;
    const bankElement = document.getElementById('offrampBank');
    const bank = bankElement.value || 'DIRECT'; // Use 'DIRECT' for countries without banks
    const amount = parseFloat(document.getElementById('offrampAmount').value);

    if (!country || !amount || amount < 1) {
        showToast('Please fill in all required fields', 'error');
        return;
    }

    const bankSelectGroup = document.getElementById('bankSelectGroup');
    if (bankSelectGroup.style.display !== 'none' && !bankElement.value) {
        showToast('Please select a bank', 'error');
        return;
    }

    const dynamicFields = document.querySelectorAll('.dynamic-field');
    const beneficiaryDetails = {};

    dynamicFields.forEach(field => {
        const fieldName = field.dataset.field || field.name;
        beneficiaryDetails[fieldName] = field.value;
    });

    if (Object.keys(beneficiaryDetails).length === 0) {
        showToast('Please fill in all beneficiary details', 'error');
        return;
    }

    const submitBtn = event.target.querySelector('button[type="submit"]');
    const originalText = submitBtn.textContent;

    try {
        submitBtn.disabled = true;
        submitBtn.textContent = 'Processing withdrawal...';

        const response = await api.requestSwitchOfframp({
            amount,
            country,
            bank,
            asset: 'solana:usdc',
            beneficiaryDetails
        });

        if (response.success) {
            closeModal();
            showToast('Withdrawal request submitted successfully!', 'success');
            setTimeout(() => window.location.reload(), 1500);
        }
    } catch (error) {
        showToast(error.message || 'Failed to process withdrawal', 'error');
    } finally {
        submitBtn.disabled = false;
        submitBtn.textContent = originalText;
    }
};

window.handleWithdrawal = async function(event) {
    event.preventDefault();

    const amount = parseFloat(document.getElementById('withdrawAmount').value);
    const address = document.getElementById('withdrawAddress').value;
    const currency = document.getElementById('withdrawCurrency').value;

    if (amount < 20) {
        showToast('Minimum withdrawal amount is 20 USDC', 'error');
        return;
    }

    const submitBtn = event.target.querySelector('button[type="submit"]');
    const originalText = submitBtn.textContent;

    try {
        submitBtn.disabled = true;
        submitBtn.textContent = 'Processing...';

        const response = await api.requestWithdrawal({
            amount,
            externalAddress: address,
            currency
        });

        if (response.success) {
            closeModal();
            showToast('Withdrawal request submitted successfully!', 'success');

            setTimeout(() => window.location.reload(), 1500);
        }
    } catch (error) {
        showToast(error.message || 'Failed to process withdrawal', 'error');
    } finally {
        submitBtn.disabled = false;
        submitBtn.textContent = originalText;
    }
};

export async function showAddFundsModal() {
    try {
        window.showLoadingSpinner('Loading deposit options...');

        const response = await api.getSwitchCountries();

        if (!response.success || !response.data) {
            showToast('Failed to load countries', 'error');
            return;
        }

        const countries = response.data.countries || [];
        window.hideLoadingSpinner();

        const popularCountries = ['NG', 'US', 'GB', 'KE', 'GH', 'ZA', 'CA'];
        const sortedCountries = countries.sort((a, b) => {
            const aIndex = popularCountries.indexOf(a.country);
            const bIndex = popularCountries.indexOf(b.country);
            if (aIndex !== -1 && bIndex !== -1) return aIndex - bIndex;
            if (aIndex !== -1) return -1;
            if (bIndex !== -1) return 1;
            return (a.country || '').localeCompare(b.country || '');
        });

        const countryNames = {
            'NG': 'Nigeria', 'US': 'United States', 'GB': 'United Kingdom', 'KE': 'Kenya',
            'GH': 'Ghana', 'ZA': 'South Africa', 'CA': 'Canada', 'BR': 'Brazil', 'MX': 'Mexico',
            'AR': 'Argentina', 'PE': 'Peru', 'CL': 'Chile', 'CO': 'Colombia', 'AE': 'UAE',
            'SA': 'Saudi Arabia', 'QA': 'Qatar', 'IL': 'Israel', 'EG': 'Egypt', 'JO': 'Jordan',
            'TZ': 'Tanzania', 'UG': 'Uganda', 'MW': 'Malawi', 'ET': 'Ethiopia', 'CG': 'Congo',
            'FR': 'France', 'DE': 'Germany', 'IT': 'Italy', 'ES': 'Spain', 'NL': 'Netherlands',
            'BE': 'Belgium', 'PT': 'Portugal', 'PL': 'Poland', 'AT': 'Austria', 'SE': 'Sweden',
            'DK': 'Denmark', 'NO': 'Norway', 'FI': 'Finland', 'IE': 'Ireland', 'CH': 'Switzerland'
        };

        const countryOptions = sortedCountries.map(c => {
            const displayName = countryNames[c.country] || c.country;
            return `<option value="${c.country}">${displayName} (${c.country})</option>`;
        }).join('');

        const modalContent = `
            <div class="modal" onclick="closeModalOnBackdrop(event)">
                <div class="modal-content" style="max-width: 550px;">
                    <div class="modal-header">
                        <h2>Add Funds</h2>
                        <button class="icon-btn" onclick="closeModal()">
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                                <path d="M18 6L6 18M6 6l12 12" stroke="currentColor" stroke-width="2"/>
                            </svg>
                        </button>
                    </div>

                    <div style="padding: 20px;">
                        <div style="background: #EEF2FF; padding: 16px; border-radius: 8px; margin-bottom: 20px;">
                            <p style="color: #4338CA; font-weight: 600; margin-bottom: 8px;">Global Deposits Available</p>
                            <p style="color: #4338CA; font-size: 14px;">
                                Deposit fiat from 65 countries and receive USDC instantly!
                            </p>
                        </div>

                        <div id="onrampFormContainer">
                            <div class="form-group" style="margin-bottom: 16px;">
                                <label>Select Your Country</label>
                                <select id="onrampCountry" class="form-input" required>
                                    <option value="">Choose a country...</option>
                                    ${countryOptions}
                                </select>
                            </div>

                            <div class="form-group" style="margin-bottom: 16px;">
                                <label>Amount to Deposit</label>
                                <input type="number" id="onrampAmount" class="form-input"
                                       placeholder="Enter amount" min="1" step="0.01" required />
                                <small class="caption" style="color: var(--text-secondary);">
                                    Minimum: $1 USD equivalent
                                </small>
                            </div>

                            <div id="quoteDisplay" style="display: none; background: var(--background-alt); padding: 16px; border-radius: 8px; margin-bottom: 16px; border: 2px solid var(--primary);">
                                <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
                                    <span style="color: var(--text-secondary);">You send:</span>
                                    <span id="quoteFiatAmount" style="font-weight: 600;"></span>
                                </div>
                                <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
                                    <span style="color: var(--text-secondary);">You receive:</span>
                                    <span id="quoteCryptoAmount" style="font-weight: 600; color: var(--primary);"></span>
                                </div>
                                <div style="display: flex; justify-content: space-between;">
                                    <span style="color: var(--text-secondary);">Exchange rate:</span>
                                    <span id="quoteRate" style="font-weight: 600;"></span>
                                </div>
                            </div>

                            <button id="getQuoteBtn" class="btn-primary" style="width: 100%;" disabled>
                                Get Quote
                            </button>

                            <div id="virtualAccountDisplay" style="display: none; margin-top: 20px;">
                                <!-- Virtual account details will be shown here after getting quote -->
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;

        document.getElementById('modalsContainer').innerHTML = modalContent;
        openModal();

        const countrySelect = document.getElementById('onrampCountry');
        const amountInput = document.getElementById('onrampAmount');
        const getQuoteBtn = document.getElementById('getQuoteBtn');
        const quoteDisplay = document.getElementById('quoteDisplay');

        const checkFormValid = () => {
            getQuoteBtn.disabled = !countrySelect.value || !amountInput.value || parseFloat(amountInput.value) < 1;
        };

        countrySelect.addEventListener('change', checkFormValid);
        amountInput.addEventListener('input', checkFormValid);

        getQuoteBtn.addEventListener('click', async () => {
            const country = countrySelect.value;
            const amount = parseFloat(amountInput.value);

            if (!country || amount < 1) {
                showToast('Please select a country and enter a valid amount', 'error');
                return;
            }

            getQuoteBtn.disabled = true;
            getQuoteBtn.textContent = 'Getting quote...';
            window.showLoadingSpinner('Getting deposit quote...');

            try {
                const currencyMap = {
                    'NG': 'NGN', 'GH': 'GHS', 'KE': 'KES', 'ZA': 'ZAR', 'UG': 'UGX',
                    'US': 'USD', 'GB': 'GBP', 'AE': 'AED', 'BR': 'BRL', 'PH': 'PHP',
                    'MX': 'MXN', 'PL': 'PLN', 'RO': 'RON', 'CZ': 'CZK', 'HU': 'HUF',
                    'NO': 'NOK', 'SE': 'SEK', 'DK': 'DKK'
                };
                const euroCountries = ['AD', 'AT', 'BE', 'HR', 'CY', 'EE', 'FI', 'FR', 'DE',
                                      'GR', 'IT', 'LV', 'LT', 'LU', 'MT', 'NL', 'PT', 'SK', 'SI', 'ES'];
                const currency = euroCountries.includes(country) ? 'EUR' : (currencyMap[country] || 'USD');

                const quoteResponse = await api.getSwitchOnrampQuote({
                    amount,
                    country,
                    currency,
                    asset: 'solana:usdc'
                });

                if (!quoteResponse.success) {
                    throw new Error(quoteResponse.message || 'Failed to get quote');
                }

                const quote = quoteResponse.data;

                document.getElementById('quoteFiatAmount').textContent =
                    `${quote.source?.amount || amount} ${quote.source?.currency || 'Local'}`;
                document.getElementById('quoteCryptoAmount').textContent =
                    `${quote.destination?.amount || 0} USDC`;
                document.getElementById('quoteRate').textContent =
                    `1 USDC = ${quote.rate || 'N/A'} ${quote.source?.currency || ''}`;
                quoteDisplay.style.display = 'block';

                window.hideLoadingSpinner();

                getQuoteBtn.textContent = 'Proceed to Deposit';
                getQuoteBtn.onclick = async () => {
                    getQuoteBtn.disabled = true;
                    getQuoteBtn.textContent = 'Creating deposit account...';
                    window.showLoadingSpinner('Creating deposit account...');

                    try {
                        const onrampResponse = await api.requestSwitchOnramp({
                            amount,
                            country,
                            asset: 'solana:usdc'
                        });

                        if (!onrampResponse.success) {
                            throw new Error(onrampResponse.message || 'Failed to create deposit');
                        }

                        const { virtualAccount, quote: finalQuote, instructions } = onrampResponse.data;

                        document.getElementById('virtualAccountDisplay').innerHTML = `
                            <div style="background: var(--background-alt); padding: 20px; border-radius: 8px; border: 2px solid var(--success);">
                                <div style="text-align: center; margin-bottom: 20px;">
                                    <div style="font-size: 12px; color: var(--text-secondary); text-transform: uppercase; letter-spacing: 1px; margin-bottom: 8px;">
                                        Account Number
                                    </div>
                                    <div style="font-size: 32px; font-weight: 700; color: var(--primary); letter-spacing: 2px; margin-bottom: 8px;">
                                        ${virtualAccount.account_number || virtualAccount.accountNumber || 'N/A'}
                                    </div>
                                    <button onclick="navigator.clipboard.writeText('${virtualAccount.account_number || virtualAccount.accountNumber}'); window.showToast('Copied!', 'success');"
                                            style="background: var(--primary); color: white; border: none; padding: 8px 16px; border-radius: 6px; cursor: pointer; font-size: 12px;">
                                        Copy Account Number
                                    </button>
                                </div>

                                <div style="border-top: 1px solid var(--border); padding-top: 16px; margin-top: 16px;">
                                    ${virtualAccount.bank_name || virtualAccount.bankName ? `
                                        <div style="display: flex; justify-content: space-between; margin-bottom: 12px;">
                                            <span style="color: var(--text-secondary);">Bank Name:</span>
                                            <span style="font-weight: 600;">${virtualAccount.bank_name || virtualAccount.bankName}</span>
                                        </div>
                                    ` : ''}
                                    ${virtualAccount.account_name || virtualAccount.accountName ? `
                                        <div style="display: flex; justify-content: space-between; margin-bottom: 12px;">
                                            <span style="color: var(--text-secondary);">Account Name:</span>
                                            <span style="font-weight: 600;">${virtualAccount.account_name || virtualAccount.accountName}</span>
                                        </div>
                                    ` : ''}
                                    <div style="display: flex; justify-content: space-between;">
                                        <span style="color: var(--text-secondary);">Amount to Send:</span>
                                        <span style="font-weight: 600; color: var(--primary);">${finalQuote?.fiatAmount || amount} ${finalQuote?.fiatCurrency || quote.source?.currency || ''}</span>
                                    </div>
                                    <div style="display: flex; justify-content: space-between; margin-top: 8px;">
                                        <span style="color: var(--text-secondary);">You'll Receive:</span>
                                        <span style="font-weight: 600; color: var(--success);">${finalQuote?.cryptoAmount || quote.destination?.amount || 0} USDC</span>
                                    </div>
                                </div>
                            </div>

                            <div style="background: #FEF3C7; padding: 16px; border-radius: 8px; margin-top: 16px; border-left: 4px solid #F59E0B;">
                                <div style="color: #92400E; font-size: 14px; font-weight: 600; margin-bottom: 12px;">
                                    Instructions:
                                </div>
                                <ol style="color: #92400E; font-size: 13px; margin: 0; padding-left: 20px; line-height: 1.8;">
                                    <li>Transfer the exact amount to the account above</li>
                                    <li>Use the exact account number provided</li>
                                    <li>Your wallet will be credited automatically within minutes</li>
                                </ol>
                            </div>

                            <button onclick="closeModal()" class="btn-primary" style="width: 100%; margin-top: 16px;">
                                Done
                            </button>
                        `;
                        document.getElementById('virtualAccountDisplay').style.display = 'block';
                        document.getElementById('onrampFormContainer').style.display = 'none';

                        window.hideLoadingSpinner();
                        showToast('Deposit account created! Transfer funds to the account above.', 'success');

                    } catch (error) {
                        console.error('Onramp execution failed:', error);
                        window.hideLoadingSpinner();
                        showToast(error.message || 'Failed to create deposit', 'error');
                        getQuoteBtn.disabled = false;
                        getQuoteBtn.textContent = 'Proceed to Deposit';
                    }
                };
                getQuoteBtn.disabled = false;

            } catch (error) {
                console.error('Quote failed:', error);
                window.hideLoadingSpinner();
                showToast(error.message || 'Failed to get quote', 'error');
                getQuoteBtn.disabled = false;
                getQuoteBtn.textContent = 'Get Quote';
            }
        });

    } catch (error) {
        console.error('Failed to load add funds modal:', error);
        window.hideLoadingSpinner();
        showToast(error.message || 'Failed to load deposit form', 'error');
    }
}

export function showSwapModal() {
    const modalContent = `
        <div class="modal" onclick="closeModalOnBackdrop(event)">
            <div class="modal-content" style="max-width: 500px;">
                <div class="modal-header">
                    <h2>Swap Assets</h2>
                    <button class="icon-btn" onclick="closeModal()">
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                            <path d="M18 6L6 18M6 6l12 12" stroke="currentColor" stroke-width="2"/>
                        </svg>
                    </button>
                </div>

                <div style="padding: 20px;">
                    <p style="color: var(--text-secondary); margin-bottom: 20px;">Exchange between different stablecoin assets instantly</p>

                    <form id="swapForm" onsubmit="window.handleSwap(event)">
                        <!-- From Asset -->
                        <div class="form-group" style="margin-bottom: 16px;">
                            <label class="form-label">From Asset</label>
                            <select id="swapFromAsset" class="form-select" required>
                                <option value="">Select asset</option>
                                <option value="solana:usdc">Solana USDC</option>
                                <option value="solana:usdt">Solana USDT</option>
                                <option value="ethereum:usdc">Ethereum USDC</option>
                                <option value="ethereum:usdt">Ethereum USDT</option>
                                <option value="base:usdc">Base USDC</option>
                                <option value="polygon:usdc">Polygon USDC</option>
                                <option value="polygon:usdt">Polygon USDT</option>
                                <option value="bsc:usdc">BSC USDC</option>
                                <option value="bsc:usdt">BSC USDT</option>
                            </select>
                        </div>

                        <!-- Swap Direction Icon -->
                        <div style="text-align: center; margin: -8px 0 8px 0;">
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="color: var(--primary);">
                                <path d="M7 10l5 5 5-5M7 14l5 5 5-5"/>
                            </svg>
                        </div>

                        <!-- To Asset -->
                        <div class="form-group" style="margin-bottom: 16px;">
                            <label class="form-label">To Asset</label>
                            <select id="swapToAsset" class="form-select" required>
                                <option value="">Select asset</option>
                                <option value="solana:usdc">Solana USDC</option>
                                <option value="solana:usdt">Solana USDT</option>
                                <option value="ethereum:usdc">Ethereum USDC</option>
                                <option value="ethereum:usdt">Ethereum USDT</option>
                                <option value="base:usdc">Base USDC</option>
                                <option value="polygon:usdc">Polygon USDC</option>
                                <option value="polygon:usdt">Polygon USDT</option>
                                <option value="bsc:usdc">BSC USDC</option>
                                <option value="bsc:usdt">BSC USDT</option>
                            </select>
                        </div>

                        <!-- Amount -->
                        <div class="form-group" style="margin-bottom: 16px;">
                            <label class="form-label">Amount</label>
                            <input type="number" id="swapAmount" class="form-input" required min="1" step="0.01" placeholder="Enter amount">
                        </div>

                        <!-- Quote Display -->
                        <div id="swapQuoteDisplay" style="display: none; background: var(--background-alt); padding: 16px; border-radius: 8px; margin-bottom: 16px;">
                            <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
                                <span style="color: var(--text-secondary);">You'll receive:</span>
                                <span style="font-weight: 600; color: var(--success);"><span id="swapEstimate">0.00</span></span>
                            </div>
                            <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
                                <span style="color: var(--text-secondary);">Exchange rate:</span>
                                <span style="font-weight: 600;" id="swapRate">1:1</span>
                            </div>
                            <div style="display: flex; justify-content: space-between;">
                                <span style="color: var(--text-secondary);">Fee:</span>
                                <span style="font-weight: 600;" id="swapFee">0.00</span>
                            </div>
                        </div>

                        <button type="button" class="btn-secondary" style="width: 100%; margin-bottom: 12px;" id="getSwapQuoteBtn" disabled>
                            Get Quote
                        </button>

                        <button type="submit" class="btn-primary" style="width: 100%;" id="swapSubmitBtn" disabled>
                            Swap Assets
                        </button>
                    </form>
                </div>
            </div>
        </div>
    `;

    document.getElementById('modalsContainer').innerHTML = modalContent;
    openModal();

    const fromAssetSelect = document.getElementById('swapFromAsset');
    const toAssetSelect = document.getElementById('swapToAsset');
    const amountInput = document.getElementById('swapAmount');
    const getQuoteBtn = document.getElementById('getSwapQuoteBtn');
    const submitBtn = document.getElementById('swapSubmitBtn');

    const checkFields = () => {
        const fromAsset = fromAssetSelect.value;
        const toAsset = toAssetSelect.value;
        const amount = parseFloat(amountInput.value);

        if (fromAsset && toAsset && amount > 0 && fromAsset !== toAsset) {
            getQuoteBtn.disabled = false;
        } else {
            getQuoteBtn.disabled = true;
            submitBtn.disabled = true;
        }
    };

    fromAssetSelect.addEventListener('change', checkFields);
    toAssetSelect.addEventListener('change', checkFields);
    amountInput.addEventListener('input', checkFields);

    getQuoteBtn.addEventListener('click', async () => {
        const fromAsset = fromAssetSelect.value;
        const toAsset = toAssetSelect.value;
        const amount = parseFloat(amountInput.value);

        if (fromAsset === toAsset) {
            showToast('Please select different assets', 'error');
            return;
        }

        try {
            getQuoteBtn.disabled = true;
            getQuoteBtn.textContent = 'Loading...';

            const quoteResponse = await api.getSwitchSwapQuote({
                amount,
                fromAsset,
                toAsset
            });

            if (!quoteResponse.success) {
                throw new Error(quoteResponse.message || 'Failed to get quote');
            }

            const quote = quoteResponse.data;
            document.getElementById('swapEstimate').textContent = `${quote.destination?.amount || 0} ${quote.destination?.currency || ''}`;
            document.getElementById('swapRate').textContent = `1 ${quote.source?.currency || ''} = ${(quote.destination?.amount / quote.source?.amount).toFixed(4)} ${quote.destination?.currency || ''}`;
            document.getElementById('swapFee').textContent = `${quote.fee?.amount || 0} ${quote.fee?.currency || ''}`;
            document.getElementById('swapQuoteDisplay').style.display = 'block';

            submitBtn.disabled = false;
            getQuoteBtn.textContent = 'Get New Quote';
            getQuoteBtn.disabled = false;

            showToast('Quote retrieved successfully', 'success');
        } catch (error) {
            console.error('Failed to get swap quote:', error);
            showToast(error.message || 'Failed to get quote', 'error');
            getQuoteBtn.disabled = false;
            getQuoteBtn.textContent = 'Get Quote';
        }
    });
}

window.handleSwap = async function(event) {
    event.preventDefault();

    const fromAsset = document.getElementById('swapFromAsset').value;
    const toAsset = document.getElementById('swapToAsset').value;
    const amount = parseFloat(document.getElementById('swapAmount').value);

    if (!fromAsset || !toAsset || !amount) {
        showToast('Please fill in all fields', 'error');
        return;
    }

    if (fromAsset === toAsset) {
        showToast('Please select different assets', 'error');
        return;
    }

    const submitBtn = event.target.querySelector('button[type="submit"]');
    const originalText = submitBtn.textContent;

    try {
        submitBtn.disabled = true;
        submitBtn.textContent = 'Processing swap...';

        const response = await api.requestSwitchSwap({
            amount,
            fromAsset,
            toAsset
        });

        if (response.success) {
            closeModal();
            showToast('Swap initiated successfully! Check your wallet for deposit details.', 'success');
            setTimeout(() => window.location.reload(), 2000);
        }
    } catch (error) {
        showToast(error.message || 'Failed to process swap', 'error');
    } finally {
        submitBtn.disabled = false;
        submitBtn.textContent = originalText;
    }
};

export async function showPayoutSettings() {
    const modalContent = `
        <div class="modal" onclick="closeModalOnBackdrop(event)">
            <div class="modal-content" style="max-width: 700px;">
                <div class="modal-header">
                    <h2>Payout Settings</h2>
                    <button class="icon-btn" onclick="closeModal()">
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                            <path d="M18 6L6 18M6 6l12 12" stroke="currentColor" stroke-width="2"/>
                        </svg>
                    </button>
                </div>

                <div style="padding: 24px;">
                    <div id="payoutSettingsContent">
                        <div style="text-align: center; padding: 40px;">
                            <div class="spinner" style="margin: 0 auto 16px;"></div>
                            <p style="color: var(--text-secondary);">Loading payout settings...</p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `;

    document.getElementById('modalsContainer').innerHTML = modalContent;
    openModal();

    try {
        // Load beneficiaries
        const response = await api.getBeneficiaries();
        const beneficiaries = response.data || [];

        const content = `
            <!-- Info card -->
            <div class="card" style="background: var(--background-alt); padding: 20px; margin-bottom: 24px;">
                <div style="display: flex; align-items: start; gap: 16px;">
                    <div style="background: linear-gradient(135deg, var(--primary), var(--secondary)); width: 48px; height: 48px; border-radius: 12px; display: flex; align-items: center; justify-content: center; flex-shrink: 0;">
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2">
                            <rect x="2" y="4" width="20" height="16" rx="2"/>
                            <path d="M6 8h12M6 12h8M6 16h4"/>
                        </svg>
                    </div>
                    <div style="flex: 1;">
                        <h4 style="margin: 0 0 8px 0;">Manage Your Payout Methods</h4>
                        <p style="color: var(--text-secondary); font-size: 14px; line-height: 1.6; margin: 0;">
                            Add and manage your bank accounts or mobile money accounts for receiving payouts from completed work.
                        </p>
                    </div>
                </div>
            </div>

            <!-- Beneficiaries list -->
            <div style="margin-bottom: 24px;">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px;">
                    <h4 style="margin: 0;">Saved Payout Methods</h4>
                    <button class="btn-primary" onclick="window.showBankWithdrawal()" style="padding: 8px 16px;">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="display: inline; margin-right: 6px; vertical-align: middle;">
                            <path d="M12 5v14M5 12h14"/>
                        </svg>
                        Add Method
                    </button>
                </div>

                ${beneficiaries.length > 0 ? `
                    <div style="display: grid; gap: 12px;">
                        ${beneficiaries.map(beneficiary => `
                            <div class="card" style="padding: 16px; background: var(--background-alt); border: 2px solid transparent; transition: border-color 0.2s;">
                                <div style="display: flex; align-items: center; gap: 16px;">
                                    <div style="width: 40px; height: 40px; background: linear-gradient(135deg, var(--primary), var(--secondary)); border-radius: 10px; display: flex; align-items: center; justify-content: center; flex-shrink: 0;">
                                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2">
                                            ${beneficiary.type === 'bank' ?
                                                '<rect x="2" y="4" width="20" height="16" rx="2"/><path d="M6 8h12M6 12h8"/>' :
                                                '<rect x="5" y="2" width="14" height="20" rx="2"/><path d="M12 18h.01"/>'}
                                        </svg>
                                    </div>
                                    <div style="flex: 1;">
                                        <div style="font-weight: 600; margin-bottom: 4px;">${beneficiary.accountName || beneficiary.name}</div>
                                        <div style="font-size: 13px; color: var(--text-secondary);">
                                            ${beneficiary.bankName || beneficiary.provider} • ${beneficiary.accountNumber || beneficiary.phoneNumber}
                                        </div>
                                        ${beneficiary.isDefault ? '<span style="display: inline-block; background: rgba(16, 185, 129, 0.1); color: #10B981; padding: 2px 8px; border-radius: 4px; font-size: 11px; font-weight: 600; margin-top: 4px;">DEFAULT</span>' : ''}
                                    </div>
                                    <button class="icon-btn" onclick="window.deleteBeneficiary('${beneficiary._id}')" style="color: var(--error);">
                                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                            <path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
                                        </svg>
                                    </button>
                                </div>
                            </div>
                        `).join('')}
                    </div>
                ` : `
                    <div class="card" style="padding: 40px; text-align: center; background: var(--background-alt);">
                        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" style="margin: 0 auto 16px; opacity: 0.4;">
                            <rect x="2" y="4" width="20" height="16" rx="2" stroke="currentColor" stroke-width="2"/>
                            <path d="M6 8h12M6 12h8M6 16h4" stroke="currentColor" stroke-width="2"/>
                        </svg>
                        <p style="color: var(--text-secondary); margin-bottom: 16px;">No payout methods added yet</p>
                        <button class="btn-primary" onclick="window.showBankWithdrawal()">Add Your First Method</button>
                    </div>
                `}
            </div>

            <!-- Payout preferences -->
            <div style="border-top: 1px solid var(--border); padding-top: 24px;">
                <h4 style="margin: 0 0 16px 0;">Payout Preferences</h4>

                <div style="display: grid; gap: 16px;">
                    <div class="card" style="padding: 16px; background: var(--background-alt);">
                        <div style="display: flex; justify-content: space-between; align-items: center;">
                            <div>
                                <div style="font-weight: 600; margin-bottom: 4px;">Auto-withdraw earnings</div>
                                <div style="font-size: 13px; color: var(--text-secondary);">Automatically withdraw to default method when balance reaches threshold</div>
                            </div>
                            <label class="switch">
                                <input type="checkbox" id="autoWithdrawToggle">
                                <span class="slider"></span>
                            </label>
                        </div>
                    </div>

                    <div class="card" style="padding: 16px; background: var(--background-alt);">
                        <label class="form-label">Minimum withdrawal amount</label>
                        <select class="form-select" id="minWithdrawalAmount">
                            <option value="50">$50 USD</option>
                            <option value="100" selected>$100 USD</option>
                            <option value="250">$250 USD</option>
                            <option value="500">$500 USD</option>
                        </select>
                        <small style="color: var(--text-secondary); font-size: 12px; margin-top: 4px; display: block;">Platform fee: 2.5% per withdrawal</small>
                    </div>

                    <div class="card" style="padding: 16px; background: var(--background-alt);">
                        <label class="form-label">Payout schedule</label>
                        <select class="form-select" id="payoutSchedule">
                            <option value="instant">Instant (when requested)</option>
                            <option value="daily">Daily (automatic)</option>
                            <option value="weekly" selected>Weekly (every Monday)</option>
                            <option value="monthly">Monthly (1st of month)</option>
                        </select>
                    </div>
                </div>
            </div>

            <!-- Save button -->
            <div style="margin-top: 24px; padding-top: 24px; border-top: 1px solid var(--border);">
                <button class="btn-primary" id="savePayoutSettingsBtn" style="width: 100%;">
                    Save Preferences
                </button>
            </div>
        `;

        document.getElementById('payoutSettingsContent').innerHTML = content;

        // Handle save
        document.getElementById('savePayoutSettingsBtn')?.addEventListener('click', () => {
            showToast('Payout preferences saved successfully!', 'success');
        });

    } catch (error) {
        document.getElementById('payoutSettingsContent').innerHTML = `
            <div style="text-align: center; padding: 40px;">
                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" style="margin: 0 auto 16px; opacity: 0.4;">
                    <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="2"/>
                    <path d="M12 8v4M12 16h.01" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
                </svg>
                <p style="color: var(--text-secondary); margin-bottom: 16px;">Failed to load payout settings</p>
                <button class="btn-primary" onclick="window.showPayoutSettings()">Try Again</button>
            </div>
        `;
    }
}

window.deleteBeneficiary = async function(beneficiaryId) {
    if (!confirm('Are you sure you want to remove this payout method?')) return;

    try {
        await api.deleteBeneficiary(beneficiaryId);
        showToast('Payout method removed successfully', 'success');
        showPayoutSettings(); // Reload
    } catch (error) {
        showToast('Failed to remove payout method', 'error');
    }
};

export async function showTransactionHistory() {
    const modalContent = `
        <div class="modal" onclick="closeModalOnBackdrop(event)">
            <div class="modal-content" style="max-width: 900px;">
                <div class="modal-header">
                    <h2>Transaction History</h2>
                    <button class="icon-btn" onclick="closeModal()">
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                            <path d="M18 6L6 18M6 6l12 12" stroke="currentColor" stroke-width="2"/>
                        </svg>
                    </button>
                </div>

                <div style="padding: 24px;">
                    <!-- Filters -->
                    <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 12px; margin-bottom: 20px;">
                        <div>
                            <label class="form-label">Type</label>
                            <select class="form-select" id="transactionTypeFilter">
                                <option value="">All types</option>
                                <option value="deposit">Deposits</option>
                                <option value="withdrawal">Withdrawals</option>
                                <option value="payment">Payments</option>
                                <option value="refund">Refunds</option>
                                <option value="earning">Earnings</option>
                            </select>
                        </div>
                        <div>
                            <label class="form-label">Status</label>
                            <select class="form-select" id="transactionStatusFilter">
                                <option value="">All status</option>
                                <option value="completed">Completed</option>
                                <option value="pending">Pending</option>
                                <option value="failed">Failed</option>
                            </select>
                        </div>
                        <div>
                            <label class="form-label">Period</label>
                            <select class="form-select" id="transactionPeriodFilter">
                                <option value="7">Last 7 days</option>
                                <option value="30" selected>Last 30 days</option>
                                <option value="90">Last 90 days</option>
                                <option value="365">Last year</option>
                                <option value="all">All time</option>
                            </select>
                        </div>
                    </div>

                    <!-- Export button -->
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
                        <div style="color: var(--text-secondary); font-size: 14px;" id="transactionCount">Loading...</div>
                        <button class="btn-secondary" onclick="window.exportTransactions()" style="padding: 8px 16px;">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="display: inline; margin-right: 6px; vertical-align: middle;">
                                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3"/>
                            </svg>
                            Export CSV
                        </button>
                    </div>

                    <!-- Transactions list -->
                    <div id="transactionHistoryContent" style="max-height: 500px; overflow-y: auto;">
                        <div style="text-align: center; padding: 40px;">
                            <div class="spinner" style="margin: 0 auto 16px;"></div>
                            <p style="color: var(--text-secondary);">Loading transactions...</p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `;

    document.getElementById('modalsContainer').innerHTML = modalContent;
    openModal();

    let allTransactions = [];

    const loadTransactions = async () => {
        try {
            const response = await api.getTransactions(1, 100);
            allTransactions = response.data?.transactions || [];
            renderTransactions();
        } catch (error) {
            document.getElementById('transactionHistoryContent').innerHTML = `
                <div style="text-align: center; padding: 40px;">
                    <svg width="48" height="48" viewBox="0 0 24 24" fill="none" style="margin: 0 auto 16px; opacity: 0.4;">
                        <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="2"/>
                        <path d="M12 8v4M12 16h.01" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
                    </svg>
                    <p style="color: var(--text-secondary); margin-bottom: 16px;">Failed to load transactions</p>
                    <button class="btn-primary" onclick="window.showTransactionHistory()">Try Again</button>
                </div>
            `;
        }
    };

    const renderTransactions = () => {
        const typeFilter = document.getElementById('transactionTypeFilter')?.value || '';
        const statusFilter = document.getElementById('transactionStatusFilter')?.value || '';
        const periodFilter = parseInt(document.getElementById('transactionPeriodFilter')?.value || '30');

        let filtered = allTransactions.filter(tx => {
            if (typeFilter && tx.type !== typeFilter) return false;
            if (statusFilter && tx.status !== statusFilter) return false;

            if (periodFilter !== 'all') {
                const txDate = new Date(tx.createdAt);
                const cutoffDate = new Date();
                cutoffDate.setDate(cutoffDate.getDate() - periodFilter);
                if (txDate < cutoffDate) return false;
            }

            return true;
        });

        document.getElementById('transactionCount').textContent = `${filtered.length} transaction${filtered.length !== 1 ? 's' : ''}`;

        if (filtered.length === 0) {
            document.getElementById('transactionHistoryContent').innerHTML = `
                <div style="text-align: center; padding: 40px;">
                    <svg width="48" height="48" viewBox="0 0 24 24" fill="none" style="margin: 0 auto 16px; opacity: 0.4;">
                        <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="2"/>
                        <path d="M8 12h8M8 8h8M8 16h5" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
                    </svg>
                    <p style="color: var(--text-secondary);">No transactions found</p>
                </div>
            `;
            return;
        }

        const content = `
            <div style="display: grid; gap: 8px;">
                ${filtered.map(tx => {
                    const isCredit = tx.type === 'deposit' || tx.type === 'earning' || tx.type === 'refund';
                    const statusColor = tx.status === 'completed' ? '#10B981' : tx.status === 'pending' ? '#FFA500' : '#EF4444';

                    return `
                        <div class="card" style="padding: 16px; background: var(--background-alt); border-left: 3px solid ${isCredit ? '#10B981' : '#6B46FF'};">
                            <div style="display: flex; align-items: center; gap: 16px;">
                                <div style="width: 40px; height: 40px; background: ${isCredit ? 'rgba(16, 185, 129, 0.1)' : 'rgba(107, 70, 255, 0.1)'}; border-radius: 10px; display: flex; align-items: center; justify-content: center; flex-shrink: 0;">
                                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="${isCredit ? '#10B981' : '#6B46FF'}" stroke-width="2">
                                        ${isCredit ?
                                            '<path d="M12 5v14M5 12l7-7 7 7"/>' :
                                            '<path d="M12 19V5M5 12l7 7 7-7"/>'}
                                    </svg>
                                </div>
                                <div style="flex: 1;">
                                    <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 4px;">
                                        <div>
                                            <div style="font-weight: 600; text-transform: capitalize;">${tx.type || 'Transaction'}</div>
                                            <div style="font-size: 12px; color: var(--text-secondary); margin-top: 2px;">
                                                ${new Date(tx.createdAt).toLocaleDateString('en-US', {
                                                    month: 'short',
                                                    day: 'numeric',
                                                    year: 'numeric',
                                                    hour: '2-digit',
                                                    minute: '2-digit'
                                                })}
                                            </div>
                                        </div>
                                        <div style="text-align: right;">
                                            <div style="font-weight: 700; font-size: 16px; color: ${isCredit ? '#10B981' : 'var(--text-primary)'};">
                                                ${isCredit ? '+' : '-'}$${Math.abs(tx.amount || 0).toFixed(2)}
                                            </div>
                                            <div style="font-size: 11px; font-weight: 600; color: ${statusColor}; text-transform: uppercase; margin-top: 2px;">
                                                ${tx.status}
                                            </div>
                                        </div>
                                    </div>
                                    ${tx.description ? `<div style="font-size: 13px; color: var(--text-secondary); margin-top: 4px;">${tx.description}</div>` : ''}
                                    ${tx.reference ? `<div style="font-size: 11px; color: var(--text-secondary); font-family: monospace; margin-top: 4px;">Ref: ${tx.reference}</div>` : ''}
                                </div>
                            </div>
                        </div>
                    `;
                }).join('')}
            </div>
        `;

        document.getElementById('transactionHistoryContent').innerHTML = content;
    };

    // Set up filter listeners
    ['transactionTypeFilter', 'transactionStatusFilter', 'transactionPeriodFilter'].forEach(id => {
        document.getElementById(id)?.addEventListener('change', renderTransactions);
    });

    // Export function
    window.exportTransactions = function() {
        const typeFilter = document.getElementById('transactionTypeFilter')?.value || '';
        const statusFilter = document.getElementById('transactionStatusFilter')?.value || '';
        const periodFilter = parseInt(document.getElementById('transactionPeriodFilter')?.value || '30');

        let filtered = allTransactions.filter(tx => {
            if (typeFilter && tx.type !== typeFilter) return false;
            if (statusFilter && tx.status !== statusFilter) return false;

            if (periodFilter !== 'all') {
                const txDate = new Date(tx.createdAt);
                const cutoffDate = new Date();
                cutoffDate.setDate(cutoffDate.getDate() - periodFilter);
                if (txDate < cutoffDate) return false;
            }

            return true;
        });

        // Create CSV
        const headers = ['Date', 'Type', 'Description', 'Amount', 'Status', 'Reference'];
        const rows = filtered.map(tx => [
            new Date(tx.createdAt).toISOString(),
            tx.type || '',
            tx.description || '',
            tx.amount || 0,
            tx.status || '',
            tx.reference || ''
        ]);

        const csv = [
            headers.join(','),
            ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
        ].join('\n');

        const blob = new Blob([csv], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `myartelab-transactions-${new Date().toISOString().split('T')[0]}.csv`;
        a.click();
        URL.revokeObjectURL(url);

        showToast(`Exported ${filtered.length} transactions to CSV`, 'success');
    };

    await loadTransactions();
}

export async function showEarningsReport() {
    const modalContent = `
        <div class="modal" onclick="closeModalOnBackdrop(event)">
            <div class="modal-content" style="max-width: 900px;">
                <div class="modal-header">
                    <h2>Earnings Report</h2>
                    <button class="icon-btn" onclick="closeModal()">
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                            <path d="M18 6L6 18M6 6l12 12" stroke="currentColor" stroke-width="2"/>
                        </svg>
                    </button>
                </div>

                <div style="padding: 24px;">
                    <div id="earningsReportContent">
                        <div style="text-align: center; padding: 40px;">
                            <div class="spinner" style="margin: 0 auto 16px;"></div>
                            <p style="color: var(--text-secondary);">Generating earnings report...</p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `;

    document.getElementById('modalsContainer').innerHTML = modalContent;
    openModal();

    try {
        // Load wallet and transaction data
        const [walletResponse, transactionsResponse] = await Promise.all([
            api.getWallet(),
            api.getTransactions(1, 100)
        ]);

        const wallet = walletResponse.data || {};
        const transactions = transactionsResponse.data?.transactions || [];

        // Calculate earnings stats
        const earnings = transactions.filter(tx => tx.type === 'earning' && tx.status === 'completed');
        const withdrawals = transactions.filter(tx => tx.type === 'withdrawal' && tx.status === 'completed');

        const totalEarnings = earnings.reduce((sum, tx) => sum + (tx.amount || 0), 0);
        const totalWithdrawals = withdrawals.reduce((sum, tx) => sum + (tx.amount || 0), 0);
        const pendingEarnings = transactions.filter(tx => tx.type === 'earning' && tx.status === 'pending').reduce((sum, tx) => sum + (tx.amount || 0), 0);

        // Calculate this month's earnings
        const now = new Date();
        const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
        const thisMonthEarnings = earnings.filter(tx => new Date(tx.createdAt) >= thisMonthStart).reduce((sum, tx) => sum + (tx.amount || 0), 0);

        // Calculate last month's earnings
        const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0);
        const lastMonthEarnings = earnings.filter(tx => {
            const date = new Date(tx.createdAt);
            return date >= lastMonthStart && date <= lastMonthEnd;
        }).reduce((sum, tx) => sum + (tx.amount || 0), 0);

        const monthOverMonthChange = lastMonthEarnings > 0
            ? ((thisMonthEarnings - lastMonthEarnings) / lastMonthEarnings * 100).toFixed(1)
            : 0;

        // Calculate average earnings per transaction
        const avgEarningsPerJob = earnings.length > 0 ? (totalEarnings / earnings.length).toFixed(2) : 0;

        // Group earnings by month for chart
        const earningsByMonth = {};
        earnings.forEach(tx => {
            const date = new Date(tx.createdAt);
            const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
            earningsByMonth[monthKey] = (earningsByMonth[monthKey] || 0) + tx.amount;
        });

        const sortedMonths = Object.keys(earningsByMonth).sort().slice(-6);
        const maxEarning = Math.max(...sortedMonths.map(m => earningsByMonth[m]), 1);

        const content = `
            <!-- Summary Cards -->
            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 16px; margin-bottom: 24px;">
                <div class="card" style="padding: 20px; background: linear-gradient(135deg, var(--primary), var(--secondary)); color: white;">
                    <div style="font-size: 14px; opacity: 0.9; margin-bottom: 8px;">Total Earnings</div>
                    <div style="font-size: 32px; font-weight: 700; margin-bottom: 4px;">$${totalEarnings.toFixed(2)}</div>
                    <div style="font-size: 12px; opacity: 0.8;">${earnings.length} completed jobs</div>
                </div>

                <div class="card" style="padding: 20px; background: var(--background-alt);">
                    <div style="font-size: 14px; color: var(--text-secondary); margin-bottom: 8px;">This Month</div>
                    <div style="font-size: 32px; font-weight: 700; margin-bottom: 4px;">$${thisMonthEarnings.toFixed(2)}</div>
                    <div style="font-size: 12px; color: ${monthOverMonthChange >= 0 ? '#10B981' : '#EF4444'};">
                        ${monthOverMonthChange >= 0 ? '↑' : '↓'} ${Math.abs(monthOverMonthChange)}% vs last month
                    </div>
                </div>

                <div class="card" style="padding: 20px; background: var(--background-alt);">
                    <div style="font-size: 14px; color: var(--text-secondary); margin-bottom: 8px;">Available Balance</div>
                    <div style="font-size: 32px; font-weight: 700; margin-bottom: 4px;">$${(wallet.balance || 0).toFixed(2)}</div>
                    <div style="font-size: 12px; color: var(--text-secondary);">Ready to withdraw</div>
                </div>

                <div class="card" style="padding: 20px; background: var(--background-alt);">
                    <div style="font-size: 14px; color: var(--text-secondary); margin-bottom: 8px;">Pending</div>
                    <div style="font-size: 32px; font-weight: 700; margin-bottom: 4px;">$${pendingEarnings.toFixed(2)}</div>
                    <div style="font-size: 12px; color: var(--text-secondary);">In escrow</div>
                </div>
            </div>

            <!-- Earnings Chart -->
            <div class="card" style="padding: 24px; background: var(--background-alt); margin-bottom: 24px;">
                <h4 style="margin: 0 0 20px 0;">Last 6 Months</h4>
                <div style="display: flex; align-items: end; gap: 12px; height: 200px;">
                    ${sortedMonths.map(month => {
                        const amount = earningsByMonth[month];
                        const height = (amount / maxEarning) * 100;
                        const [year, monthNum] = month.split('-');
                        const monthName = new Date(year, monthNum - 1).toLocaleDateString('en-US', { month: 'short' });

                        return `
                            <div style="flex: 1; display: flex; flex-direction: column; align-items: center; gap: 8px;">
                                <div style="width: 100%; background: linear-gradient(135deg, var(--primary), var(--secondary)); border-radius: 8px 8px 0 0; height: ${height}%; min-height: 4px; position: relative; transition: all 0.3s;">
                                    <div style="position: absolute; top: -24px; left: 50%; transform: translateX(-50%); font-size: 11px; font-weight: 600; white-space: nowrap;">$${amount.toFixed(0)}</div>
                                </div>
                                <div style="font-size: 12px; color: var(--text-secondary);">${monthName}</div>
                            </div>
                        `;
                    }).join('')}
                </div>
            </div>

            <!-- Stats Grid -->
            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 16px; margin-bottom: 24px;">
                <div class="card" style="padding: 20px; background: var(--background-alt);">
                    <div style="display: flex; align-items: center; gap: 16px;">
                        <div style="width: 48px; height: 48px; background: rgba(16, 185, 129, 0.1); border-radius: 12px; display: flex; align-items: center; justify-content: center;">
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#10B981" stroke-width="2">
                                <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>
                            </svg>
                        </div>
                        <div>
                            <div style="font-size: 24px; font-weight: 700;">$${avgEarningsPerJob}</div>
                            <div style="font-size: 13px; color: var(--text-secondary);">Avg per job</div>
                        </div>
                    </div>
                </div>

                <div class="card" style="padding: 20px; background: var(--background-alt);">
                    <div style="display: flex; align-items: center; gap: 16px;">
                        <div style="width: 48px; height: 48px; background: rgba(107, 70, 255, 0.1); border-radius: 12px; display: flex; align-items: center; justify-content: center;">
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#6B46FF" stroke-width="2">
                                <path d="M12 19V5M5 12l7 7 7-7"/>
                            </svg>
                        </div>
                        <div>
                            <div style="font-size: 24px; font-weight: 700;">$${totalWithdrawals.toFixed(2)}</div>
                            <div style="font-size: 13px; color: var(--text-secondary);">Total withdrawn</div>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Recent Earnings -->
            <div class="card" style="padding: 24px; background: var(--background-alt);">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px;">
                    <h4 style="margin: 0;">Recent Earnings</h4>
                    <button class="btn-secondary" onclick="window.showTransactionHistory()" style="padding: 8px 16px; font-size: 13px;">
                        View All
                    </button>
                </div>

                ${earnings.length > 0 ? `
                    <div style="display: grid; gap: 12px;">
                        ${earnings.slice(0, 5).map(tx => `
                            <div style="display: flex; justify-content: space-between; align-items: center; padding: 12px; background: var(--background); border-radius: 8px;">
                                <div>
                                    <div style="font-weight: 600; margin-bottom: 4px;">${tx.description || 'Earnings'}</div>
                                    <div style="font-size: 12px; color: var(--text-secondary);">
                                        ${new Date(tx.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                                    </div>
                                </div>
                                <div style="font-size: 18px; font-weight: 700; color: #10B981;">+$${tx.amount.toFixed(2)}</div>
                            </div>
                        `).join('')}
                    </div>
                ` : `
                    <div style="text-align: center; padding: 40px; color: var(--text-secondary);">
                        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" style="margin: 0 auto 16px; opacity: 0.4;">
                            <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="2"/>
                            <path d="M12 6v6l4 2" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
                        </svg>
                        <p>No earnings yet. Complete your first job to see your earnings here!</p>
                    </div>
                `}
            </div>

            <!-- Export button -->
            <div style="margin-top: 24px; padding-top: 24px; border-top: 1px solid var(--border); display: flex; gap: 12px;">
                <button class="btn-secondary" onclick="window.exportEarningsReport()" style="flex: 1;">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="display: inline; margin-right: 6px; vertical-align: middle;">
                        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3"/>
                    </svg>
                    Download Report (CSV)
                </button>
                <button class="btn-primary" onclick="window.print()" style="flex: 1;">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="display: inline; margin-right: 6px; vertical-align: middle;">
                        <polyline points="6 9 6 2 18 2 18 9"/>
                        <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/>
                        <rect x="6" y="14" width="12" height="8"/>
                    </svg>
                    Print Report
                </button>
            </div>
        `;

        document.getElementById('earningsReportContent').innerHTML = content;

        // Export function
        window.exportEarningsReport = function() {
            const headers = ['Month', 'Earnings', 'Jobs Completed', 'Average per Job'];
            const rows = sortedMonths.map(month => {
                const amount = earningsByMonth[month];
                const jobsInMonth = earnings.filter(tx => {
                    const date = new Date(tx.createdAt);
                    const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
                    return monthKey === month;
                }).length;
                const avg = jobsInMonth > 0 ? (amount / jobsInMonth).toFixed(2) : 0;

                return [month, amount.toFixed(2), jobsInMonth, avg];
            });

            rows.push(['', '', '', '']);
            rows.push(['Total Earnings', totalEarnings.toFixed(2), earnings.length, avgEarningsPerJob]);
            rows.push(['Total Withdrawals', totalWithdrawals.toFixed(2), withdrawals.length, '']);
            rows.push(['Available Balance', (wallet.balance || 0).toFixed(2), '', '']);
            rows.push(['Pending Earnings', pendingEarnings.toFixed(2), '', '']);

            const csv = [
                'MyArteLab Earnings Report',
                `Generated: ${new Date().toLocaleString()}`,
                '',
                headers.join(','),
                ...rows.map(row => row.join(','))
            ].join('\n');

            const blob = new Blob([csv], { type: 'text/csv' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `myartelab-earnings-report-${new Date().toISOString().split('T')[0]}.csv`;
            a.click();
            URL.revokeObjectURL(url);

            showToast('Earnings report downloaded successfully', 'success');
        };

    } catch (error) {
        document.getElementById('earningsReportContent').innerHTML = `
            <div style="text-align: center; padding: 40px;">
                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" style="margin: 0 auto 16px; opacity: 0.4;">
                    <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="2"/>
                    <path d="M12 8v4M12 16h.01" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
                </svg>
                <p style="color: var(--text-secondary); margin-bottom: 16px;">Failed to generate earnings report</p>
                <button class="btn-primary" onclick="window.showEarningsReport()">Try Again</button>
            </div>
        `;
    }
}

window.currentGalleryImages = [];
window.currentGalleryIndex = 0;

window.openImageModal = function(imageUrl, allImages = null, startIndex = 0) {
    const existingModal = document.getElementById('globalImageModal');
    if (existingModal) existingModal.remove();

    // If allImages provided, use gallery mode; otherwise single image mode
    if (allImages && Array.isArray(allImages)) {
        window.currentGalleryImages = allImages;
        window.currentGalleryIndex = startIndex;
    } else {
        window.currentGalleryImages = [imageUrl];
        window.currentGalleryIndex = 0;
    }

    const modal = document.createElement('div');
    modal.id = 'globalImageModal';

    const hasMultipleImages = window.currentGalleryImages.length > 1;
    const currentImage = window.currentGalleryImages[window.currentGalleryIndex];

    modal.innerHTML = `
        <div style="display: flex; position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.95); z-index: 10000; justify-content: center; align-items: center;">
            <button onclick="window.closeImageModal()" style="position: absolute; top: 20px; right: 20px; background: rgba(255,255,255,0.1); color: white; border: none; border-radius: 50%; width: 48px; height: 48px; cursor: pointer; font-size: 24px; display: flex; align-items: center; justify-content: center; transition: background 0.2s; z-index: 10001;" onmouseover="this.style.background='rgba(255,255,255,0.2)'" onmouseout="this.style.background='rgba(255,255,255,0.1)'">×</button>

            ${hasMultipleImages ? `
                <button onclick="window.navigateGallery(-1)" style="position: absolute; left: 20px; top: 50%; transform: translateY(-50%); background: rgba(255,255,255,0.1); color: white; border: none; border-radius: 50%; width: 48px; height: 48px; cursor: pointer; font-size: 24px; display: flex; align-items: center; justify-content: center; transition: background 0.2s; z-index: 10001;" onmouseover="this.style.background='rgba(255,255,255,0.2)'" onmouseout="this.style.background='rgba(255,255,255,0.1)'">‹</button>

                <button onclick="window.navigateGallery(1)" style="position: absolute; right: 20px; top: 50%; transform: translateY(-50%); background: rgba(255,255,255,0.1); color: white; border: none; border-radius: 50%; width: 48px; height: 48px; cursor: pointer; font-size: 24px; display: flex; align-items: center; justify-content: center; transition: background 0.2s; z-index: 10001;" onmouseover="this.style.background='rgba(255,255,255,0.2)'" onmouseout="this.style.background='rgba(255,255,255,0.1)'">›</button>

                <div style="position: absolute; bottom: 20px; left: 50%; transform: translateX(-50%); background: rgba(255,255,255,0.1); color: white; padding: 8px 16px; border-radius: 20px; font-size: 14px; z-index: 10001;">
                    ${window.currentGalleryIndex + 1} / ${window.currentGalleryImages.length}
                </div>
            ` : ''}

            <img id="galleryImage" src="${currentImage}" alt="Full size" style="max-width: 90%; max-height: 90%; object-fit: contain; transition: opacity 0.2s;">
        </div>
    `;

    const backdrop = modal.querySelector('div');
    backdrop.addEventListener('click', function(e) {
        if (e.target === e.currentTarget) {
            window.closeImageModal();
        }
    });

    // Add keyboard navigation
    const handleKeyPress = function(e) {
        if (e.key === 'Escape') {
            window.closeImageModal();
        } else if (hasMultipleImages && e.key === 'ArrowLeft') {
            window.navigateGallery(-1);
        } else if (hasMultipleImages && e.key === 'ArrowRight') {
            window.navigateGallery(1);
        }
    };

    document.addEventListener('keydown', handleKeyPress);
    modal.dataset.keyHandler = 'true';

    document.body.appendChild(modal);
};

window.navigateGallery = function(direction) {
    const newIndex = window.currentGalleryIndex + direction;

    // Wrap around
    if (newIndex < 0) {
        window.currentGalleryIndex = window.currentGalleryImages.length - 1;
    } else if (newIndex >= window.currentGalleryImages.length) {
        window.currentGalleryIndex = 0;
    } else {
        window.currentGalleryIndex = newIndex;
    }

    // Update image with fade effect
    const img = document.getElementById('galleryImage');
    if (img) {
        img.style.opacity = '0';
        setTimeout(() => {
            img.src = window.currentGalleryImages[window.currentGalleryIndex];
            img.style.opacity = '1';
        }, 100);
    }

    // Update counter
    const modal = document.getElementById('globalImageModal');
    if (modal) {
        const counter = modal.querySelector('div[style*="bottom: 20px"]');
        if (counter) {
            counter.textContent = `${window.currentGalleryIndex + 1} / ${window.currentGalleryImages.length}`;
        }
    }
};

window.closeImageModal = function() {
    const modal = document.getElementById('globalImageModal');
    if (modal) {
        // Remove keyboard listener
        document.removeEventListener('keydown', handleKeyPress);
        modal.remove();
    }
    window.currentGalleryImages = [];
    window.currentGalleryIndex = 0;
};
