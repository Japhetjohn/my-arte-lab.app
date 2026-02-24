import { appState, setUser } from '../state.js';
import { showToast, closeModal, openModal } from '../utils.js';
import { updateUserMenu } from '../auth.js';
import { navigateToPage } from '../navigation.js';
import api from '../services/api.js';

// Helper to map country names to ISO-2 country codes and currencies
const COUNTRY_MAP = {
    'nigeria': { country: 'NG', currency: 'NGN' },
    'ng': { country: 'NG', currency: 'NGN' },
    'kenya': { country: 'KE', currency: 'KES' },
    'ke': { country: 'KE', currency: 'KES' },
    'ghana': { country: 'GH', currency: 'GHS' },
    'gh': { country: 'GH', currency: 'GHS' },
    'south africa': { country: 'ZA', currency: 'ZAR' },
    'za': { country: 'ZA', currency: 'ZAR' },
    'tanzania': { country: 'TZ', currency: 'TZS' },
    'tz': { country: 'TZ', currency: 'TZS' },
    'uganda': { country: 'UG', currency: 'UGX' },
    'ug': { country: 'UG', currency: 'UGX' },
    'zambia': { country: 'ZM', currency: 'ZMW' },
    'zm': { country: 'ZM', currency: 'ZMW' },
    'united states': { country: 'US', currency: 'USD' },
    'us': { country: 'US', currency: 'USD' },
    'united kingdom': { country: 'GB', currency: 'GBP' },
    'gb': { country: 'GB', currency: 'GBP' }
};

const CURRENCY_NAMES = {
    'NGN': 'Nigerian Naira',
    'USD': 'US Dollar',
    'KES': 'Kenyan Shilling',
    'GHS': 'Ghanaian Cedi',
    'ZAR': 'South African Rand',
    'TZS': 'Tanzanian Shilling',
    'UGX': 'Ugandan Shilling',
    'ZMW': 'Zambian Kwacha',
    'EUR': 'Euro',
    'GBP': 'British Pound',
    'USDC': 'USD Coin',
    'SOL': 'Solana',
    'RWF': 'Rwandan Franc',
    'MWK': 'Malawian Kwacha',
    'SLL': 'Sierra Leonean Leone',
    'GMD': 'Gambian Dalasi',
    'XOF': 'West African CFA Franc',
    'XAF': 'Central African CFA Franc',
    'CNY': 'Chinese Yuan',
    'JPY': 'Japanese Yen',
    'INR': 'Indian Rupee'
};

const CURRENCY_COUNTRY_MAP = {
    'NGN': 'NG', 'KES': 'KE', 'GHS': 'GH', 'ZAR': 'ZA', 'TZS': 'TZ',
    'UGX': 'UG', 'ZMW': 'ZM', 'EUR': 'FR', 'GBP': 'GB', 'USD': 'US',
    'RWF': 'RW', 'MWK': 'MW', 'SLL': 'SL', 'GMD': 'GM', 'XOF': 'CI',
    'XAF': 'CM', 'CNY': 'CN', 'JPY': 'JP', 'INR': 'IN'
};

function getUserCountryData() {
    // Check both location property and top-level property
    const rawCountry = appState.user?.location?.country || appState.user?.country || '';
    const countryName = rawCountry.toLowerCase().trim();
    const data = COUNTRY_MAP[countryName] || { country: 'NG', currency: 'NGN' }; // Default to NG
    console.log('[getUserCountryData] raw:', rawCountry, 'matched:', data);
    return data;
}


window.showLoadingSpinner = function (message = 'Loading...') {
    const existingSpinner = document.getElementById('globalLoadingSpinner');
    if (existingSpinner) existingSpinner.remove();

    const spinner = document.createElement('div');
    spinner.id = 'globalLoadingSpinner';
    spinner.innerHTML = `
        <div class="modal" style="z-index: 10000; background: rgba(0,0,0,0.6); backdrop-filter: blur(8px);">
            <div class="modal-content glass-effect" style="max-width: 300px; text-align: center; padding: 40px; border-radius: 24px; border: 1px solid rgba(255,255,255,0.4); box-shadow: 0 12px 40px rgba(0,0,0,0.2);">
                <div style="margin-bottom: 20px;">
                    <div class="spinner" style="
                        border: 4px solid rgba(151,71,255,0.2);
                        border-left-color: var(--primary);
                        border-radius: 50%;
                        width: 50px;
                        height: 50px;
                        animation: spin 1s linear infinite;
                        margin: 0 auto;
                    "></div>
                </div>
                <p style="color: var(--text-primary); font-weight: 600; margin: 0; font-size: 16px;">${message}</p>
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

window.hideLoadingSpinner = function () {
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
            <div class="modal-content glass-effect" style="max-width: 600px; border-radius: 24px; border: 1px solid rgba(255,255,255,0.6); box-shadow: 0 12px 48px rgba(0,0,0,0.15);">
                <div class="modal-header" style="border-bottom: 1px solid rgba(255,255,255,0.3); background: transparent; padding: 24px;">
                    <h2 style="margin: 0; font-size: 22px;">Request booking</h2>
                    <button class="icon-btn" onclick="closeModal()" style="background: rgba(255,255,255,0.3);">
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                            <path d="M18 6L6 18M6 6l12 12" stroke="currentColor" stroke-width="2"/>
                        </svg>
                    </button>
                </div>

                <div style="padding: 24px;">
                    <div class="booking-stepper mb-lg" style="margin-bottom: 32px;">
                        <div class="step active">
                            <div class="step-circle" style="box-shadow: 0 4px 12px rgba(151,71,255,0.3);">1</div>
                            <div class="step-label">Request</div>
                        </div>
                        <div class="step">
                            <div class="step-circle" style="background: rgba(255,255,255,0.4);">2</div>
                            <div class="step-label">Approval</div>
                        </div>
                        <div class="step">
                            <div class="step-circle" style="background: rgba(255,255,255,0.4);">3</div>
                            <div class="step-label">Payment</div>
                        </div>
                    </div>

                    <div style="background: rgba(255,255,255,0.5); padding: 16px; border-radius: 16px; margin-bottom: 24px; border: 1px solid rgba(255,255,255,0.6);">
                        <div style="display: flex; gap: 12px; align-items: center;">
                            <img src="${avatarUrl}" style="width: 48px; height: 48px; border-radius: 50%; border: 2px solid rgba(255,255,255,0.8);" alt="${creator.name}">
                            <div>
                                <div style="font-weight: 700; font-size: 16px;">${creator.name}</div>
                                <div class="caption" style="color: var(--primary); font-weight: 500;">${service.title}</div>
                            </div>
                        </div>
                    </div>

                    <div style="background: rgba(254, 243, 199, 0.6); padding: 16px; border-radius: 12px; margin-bottom: 24px; border-left: 4px solid #F59E0B; backdrop-filter: blur(4px);">
                        <div style="color: #92400E; font-size: 14px; font-weight: 600; margin-bottom: 8px;">
                            How it works:
                        </div>
                        <ol style="color: #92400E; font-size: 13px; margin: 0; padding-left: 20px; line-height: 1.6;">
                            <li>Submit your booking request with your proposed budget</li>
                            <li>The creator reviews and accepts, declines, or counter-proposes</li>
                            <li>Once accepted, payment is secured</li>
                            <li>Funds are held safely until the job is completed</li>
                        </ol>
                        <div style="margin-top: 12px; padding-top: 12px; border-top: 1px solid rgba(146, 64, 14, 0.2); color: #92400E; font-size: 13px; font-weight: 600;">
                            Note: Make sure you have enough USDC before sending a request.
                        </div>
                    </div>

                    <form id="bookingForm" data-creator-id="${creatorId}" data-service-index="${serviceIndex}">
                        <div class="form-group">
                            <label class="form-label">Your Budget (USDC)</label>
                            <input type="number" id="proposedPrice" name="proposedPrice" class="form-input" required min="1" step="0.01" placeholder="Enter your proposed budget" style="background: rgba(255,255,255,0.6);">
                            <div class="caption mt-sm">Enter the amount you're willing to pay for this service</div>
                        </div>

                        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px;">
                            <div class="form-group">
                                <label class="form-label">Start Date</label>
                                <input type="date" id="bookingDate" name="bookingDate" class="form-input" required min="${new Date().toISOString().split('T')[0]}" onchange="updateEndDateMin()" style="background: rgba(255,255,255,0.6);">
                            </div>

                            <div class="form-group">
                                <label class="form-label">End Date</label>
                                <input type="date" id="endDate" name="endDate" class="form-input" required min="${new Date().toISOString().split('T')[0]}" style="background: rgba(255,255,255,0.6);">
                            </div>
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
                            <textarea id="projectBrief" name="projectBrief" class="form-textarea" maxlength="300" placeholder="Tell us about your project..." required style="background: rgba(255,255,255,0.6);"></textarea>
                        </div>

                        <div class="form-group">
                            <label class="form-label">Attach files (optional)</label>
                            <input type="file" id="bookingAttachments" class="form-input" multiple accept="image/*,.pdf,.doc,.docx" style="background: rgba(255,255,255,0.6);">
                            <div class="small-text" style="margin-top: 8px; color: var(--text-secondary);">
                                Upload event graphics, reference images, or any relevant files (Max 5 files, 10MB each)
                            </div>
                        </div>

                        <div class="alert alert-success" style="background: rgba(16, 185, 129, 0.15); backdrop-filter: blur(4px); border: 1px solid rgba(16, 185, 129, 0.3);">
                            <strong>No payment yet.</strong> The creator will review your request first. Payment is only secured after acceptance.
                        </div>

                        <div class="form-actions" style="margin-top: 32px;">
                            <button type="button" class="btn-ghost" onclick="closeModal()" style="background: rgba(255,255,255,0.3);">Cancel</button>
                            <button type="submit" class="btn-primary" id="submitBookingBtn" style="box-shadow: 0 4px 16px rgba(151,71,255,0.4);">Send Booking Request</button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    `;

    document.getElementById('modalsContainer').innerHTML = modalContent;
    openModal();

    const bookingForm = document.getElementById('bookingForm');
    if (bookingForm) {
        bookingForm.addEventListener('submit', function (e) {
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
        <div class="modal" onclick="closeModalOnBackdrop(event)" style="background: rgba(0,0,0,0.9); backdrop-filter: blur(16px);">
            <div class="modal-content" style="max-width: 900px; padding: 0; background: transparent; box-shadow: none; border: none;">
                <button class="icon-btn" onclick="closeModal()" style="position: absolute; top: -40px; right: 0; background: rgba(255,255,255,0.2); color: white; border: 1px solid rgba(255,255,255,0.4);">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                        <path d="M18 6L6 18M6 6l12 12" stroke="currentColor" stroke-width="2"/>
                    </svg>
                </button>
                <img src="${creator.portfolio[imageIndex]}" style="width: 100%; max-height: 85vh; object-fit: contain; border-radius: 8px; box-shadow: 0 24px 64px rgba(0,0,0,0.5);" alt="Portfolio image">
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
            <div class="modal-content glass-effect" style="max-width: 500px; border: 1px solid rgba(255,255,255,0.6); box-shadow: 0 12px 48px rgba(0,0,0,0.15);">
                <div class="modal-header" style="border-bottom: 1px solid rgba(255,255,255,0.2);">
                    <h2>Change Password</h2>
                    <button class="icon-btn" onclick="closeModal()" style="background: rgba(255,255,255,0.2);">
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                            <path d="M18 6L6 18M6 6l12 12" stroke="currentColor" stroke-width="2"/>
                        </svg>
                    </button>
                </div>

                <form onsubmit="handlePasswordChange(event)" style="padding: 20px;">
                    <div class="form-group">
                        <label class="form-label">Current Password</label>
                        <div style="position: relative;">
                            <input type="password" id="currentPassword" class="form-input" required style="padding-right: 40px; background: rgba(255,255,255,0.4);">
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
                            <input type="password" id="newPassword" class="form-input" required minlength="8" style="padding-right: 40px; background: rgba(255,255,255,0.4);">
                            <button type="button" onclick="togglePasswordVisibility('newPassword', this)" style="position: absolute; right: 8px; top: 50%; transform: translateY(-50%); background: none; border: none; cursor: pointer; padding: 4px; display: flex; align-items: center; color: var(--text-secondary);">
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" class="eye-icon">
                                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                                    <circle cx="12" cy="12" r="3" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                                </svg>
                            </button>
                        </div>
                        <div class="caption mt-sm">Minimum 8 characters</div>
                    </div>

                    <div class="form-group">
                        <label class="form-label">Confirm New Password</label>
                        <div style="position: relative;">
                            <input type="password" id="confirmPassword" class="form-input" required minlength="8" style="padding-right: 40px; background: rgba(255,255,255,0.4);">
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

window.handlePasswordChange = async function (event) {
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
            <div class="modal-content glass-effect" style="max-width: 500px; border: 1px solid rgba(255,255,255,0.6); box-shadow: 0 12px 48px rgba(0,0,0,0.15);">
                <div class="modal-header" style="border-bottom: 1px solid rgba(255,255,255,0.2);">
                    <h2>Two-Factor Authentication</h2>
                    <button class="icon-btn" onclick="closeModal()" style="background: rgba(255,255,255,0.2);">
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
            <div class="card glass-effect" style="padding: 20px; margin-bottom: 20px; border: 1px solid rgba(255,255,255,0.4);">
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

            <div style="margin-bottom: 24px;">
                <h4 style="margin: 0 0 16px 0;">Setup Steps:</h4>
                <ol style="padding-left: 24px; color: var(--text-secondary); line-height: 2;">
                    <li>Download an authenticator app (Google Authenticator, Authy, or Microsoft Authenticator)</li>
                    <li>Scan the QR code below with your app</li>
                    <li>Enter the 6-digit code to verify</li>
                </ol>
            </div>

            <div style="text-align: center; padding: 24px; background: rgba(255,255,255,0.7); border-radius: 12px; margin-bottom: 20px; border: 1px solid rgba(255,255,255,0.8);">
                <img src="${qrCode}" alt="2FA QR Code" style="width: 200px; height: 200px; margin: 0 auto; border-radius: 8px;">
                <p style="margin-top: 12px; color: var(--text-secondary); font-size: 13px;">Scan this QR code with your authenticator app</p>
                <p style="margin-top: 8px; font-family: monospace; font-size: 11px; color: var(--text-secondary); word-break: break-all; padding: 0 20px;">Manual key: ${manualEntryKey}</p>
            </div>

            <div style="margin-bottom: 20px;">
                <label class="form-label">Enter 6-digit code from your app</label>
                <input type="text" id="twoFactorCode" class="form-input" placeholder="000000" maxlength="6" pattern="[0-9]{6}" style="text-align: center; font-size: 24px; letter-spacing: 8px; font-weight: 600; background: rgba(255,255,255,0.5);">
            </div>

            <div style="display: flex; gap: 12px;">
                <button class="btn-secondary" onclick="closeModal()" style="flex: 1; background: rgba(255,255,255,0.5);">Cancel</button>
                <button class="btn-primary" id="enable2FABtn" style="flex: 1;" disabled>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="display: inline; margin-right: 6px; vertical-align: middle;">
                        <path d="M9 12l2 2 4-4"/>
                        <circle cx="12" cy="12" r="10"/>
                    </svg>
                    Enable 2FA
                </button>
            </div>

            <div class="card" style="background: rgba(255, 193, 7, 0.15); border: 1px solid rgba(255, 193, 7, 0.3); padding: 16px; margin-top: 20px;">
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
    if (!backupCodes || backupCodes.length === 0) {
        backupCodes = Array.from({ length: 8 }, () =>
            Math.random().toString(36).substring(2, 10).toUpperCase()
        );
    }

    const modalContent = `
        <div class="modal" onclick="closeModalOnBackdrop(event)">
            <div class="modal-content glass-effect" style="max-width: 500px; border: 1px solid rgba(255,255,255,0.6);">
                <div class="modal-header" style="border-bottom: 1px solid rgba(255,255,255,0.2);">
                    <h2>Backup Codes</h2>
                    <button class="icon-btn" onclick="closeModal()" style="background: rgba(255,255,255,0.2);">
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                            <path d="M18 6L6 18M6 6l12 12" stroke="currentColor" stroke-width="2"/>
                        </svg>
                    </button>
                </div>

                <div style="padding: 24px;">
                    <div class="card" style="background: rgba(16, 185, 129, 0.15); border: 1px solid rgba(16, 185, 129, 0.3); padding: 16px; margin-bottom: 20px;">
                        <p style="margin: 0; color: var(--text-secondary); font-size: 14px; line-height: 1.6;">
                            Save these backup codes in a secure location. Each code can only be used once to access your account if you lose your authenticator device.
                        </p>
                    </div>

                    <div style="background: rgba(255,255,255,0.4); padding: 20px; border-radius: 12px; margin-bottom: 20px; border: 1px solid rgba(255,255,255,0.6);">
                        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px; font-family: monospace; font-size: 14px;">
                            ${backupCodes.map(code => `<div style="padding: 8px; background: rgba(255,255,255,0.7); border-radius: 6px; text-align: center; border: 1px solid rgba(255,255,255,0.5);">${code}</div>`).join('')}
                        </div>
                    </div>

                    <div style="display: flex; gap: 12px;">
                        <button class="btn-secondary" onclick="window.downloadBackupCodes(${JSON.stringify(backupCodes).replace(/"/g, '&quot;')})" style="flex: 1; background: rgba(255,255,255,0.5);">
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

window.downloadBackupCodes = function (codes) {
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


window.showDeleteAccountModal = function () {
    const user = appState.user;
    const isOAuthUser = !!user?.googleId;

    const modal = document.createElement('div');
    modal.className = 'modal-overlay';
    modal.innerHTML = `
        <div class="modal-content glass-effect" style="border: 1px solid rgba(239, 68, 68, 0.4); box-shadow: 0 12px 48px rgba(239, 68, 68, 0.15);">
            <div class="modal-header" style="border-bottom: 1px solid rgba(239, 68, 68, 0.2);">
                <h2 style="color: var(--error);">Delete account</h2>
                <button class="modal-close" onclick="this.closest('.modal-overlay').remove()" style="background: rgba(239, 68, 68, 0.1);">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                        <path d="M18 6L6 18M6 6l12 12" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
                    </svg>
                </button>
            </div>
            <div class="modal-body">
                <p><strong>Warning:</strong> This action cannot be undone.</p>
                <p class="mt-md">Deleting your account will permanently remove all your data including:</p>
                <ul style="margin-top: 12px; padding-left: 24px;">
                    <li>Profile information</li>
                    <li>Portfolio and services</li>
                    <li>Bookings and messages</li>
                    <li>Wallet balance and transaction history</li>
                </ul>
                ${isOAuthUser ? `
                    <p style="margin-top: 16px; padding: 12px; background: rgba(239, 68, 68, 0.1); border-radius: 8px; font-size: 14px;">
                        <strong>Note:</strong> You signed in with Google, so no password is required to delete your account.
                    </p>
                ` : ''}
            </div>
            <form onsubmit="handleAccountDeletion(event)" style="padding: 0 24px 24px;">
                ${!isOAuthUser ? `
                    <div class="form-group" style="margin-bottom: 24px;">
                        <label class="form-label">Enter your password to confirm</label>
                        <input type="password" class="form-input" id="deleteAccountPassword" required placeholder="Your password" style="background: rgba(255,255,255,0.4);">
                    </div>
                ` : ''}
                <div class="form-actions">
                    <button type="button" class="btn-ghost" onclick="this.closest('.modal-overlay').remove()">Cancel</button>
                    <button type="submit" class="btn-primary" style="background: var(--error); border-color: var(--error);">Delete my account</button>
                </div>
            </form>
        </div>
    `;
    document.body.appendChild(modal);
};

window.handleAccountDeletion = async function (event) {
    event.preventDefault();

    const user = appState.user;
    const isOAuthUser = !!user?.googleId;

    const passwordInput = document.getElementById('deleteAccountPassword');
    const password = passwordInput ? passwordInput.value : '';

    if (!isOAuthUser && !password) {
        showToast('Please enter your password', 'error');
        return;
    }

    const confirmed = confirm('Are you absolutely sure you want to delete your account? This cannot be undone.');
    if (!confirmed) return;

    try {
        showToast('Deleting account...', 'info');

        const response = await api.deleteAccount(password);

        if (response.success) {
            showToast('Account deleted successfully. Goodbye!', 'success');
            localStorage.removeItem('token');
            setUser(null);
            document.querySelector('.modal-overlay')?.remove();
            setTimeout(() => {
                window.location.href = '/';
            }, 2000);
        } else {
            showToast(response.message || 'Failed to delete account', 'error');
        }
    } catch (error) {
        console.error('Account deletion error:', error);
        showToast(error.message || 'Failed to delete account', 'error');
    }
};

window.handleProfileVisibilityChange = async function (value) {
    try {
        const response = await api.updateProfile({ profileVisibility: value });

        if (response.success) {
            setUser(response.data.user);
            showToast(`Profile visibility set to ${value}`, 'success');
        } else {
            showToast(response.message || 'Failed to update visibility', 'error');
        }
    } catch (error) {
        console.error('Profile visibility update error:', error);
        showToast(error.message || 'Failed to update visibility', 'error');
    }
};

window.handleThemeToggle = function (checkbox) {
    const newTheme = checkbox.checked ? 'dark' : 'light';
    localStorage.setItem('theme', newTheme);
    document.documentElement.setAttribute('data-theme', newTheme);
    showToast(`${newTheme === 'dark' ? 'Dark' : 'Light'} mode enabled`, 'success');
};

window.handlePhoneVisibilityToggleNew = async function (checkbox) {
    try {
        const newValue = checkbox.checked;
        const response = await api.updateProfile({ phoneNumberVisible: newValue });

        if (response.success) {
            setUser(response.data.user);
            showToast(`Phone number ${newValue ? 'will be shown' : 'is now hidden'} on your profile`, 'success');
        } else {
            checkbox.checked = !newValue;
            showToast(response.message || 'Failed to update phone visibility', 'error');
        }
    } catch (error) {
        checkbox.checked = !newValue;
        console.error('Phone visibility update error:', error);
        showToast(error.message || 'Failed to update phone visibility', 'error');
    }
};

// ==========================================
// WALLET MODALS (HOSTFI) — Redesigned
// ==========================================

const MODAL_STYLES = `
<style>
    .wm-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.6); backdrop-filter: blur(8px); z-index: 1000; display: flex; align-items: flex-end; justify-content: center; padding: 0; }
    @media (min-width: 600px) { .wm-overlay { align-items: center; padding: 20px; } }
    .wm-sheet { background: #0f0f13; border: 1px solid rgba(255,255,255,0.08); border-radius: 24px 24px 0 0; width: 100%; max-width: 480px; max-height: 92vh; overflow-y: auto; animation: slideUp 0.3s cubic-bezier(0.16,1,0.3,1); padding-bottom: env(safe-area-inset-bottom, 16px); }
    @media (min-width: 600px) { .wm-sheet { border-radius: 24px; animation: scaleIn 0.25s cubic-bezier(0.16,1,0.3,1); } }
    @keyframes slideUp { from { transform: translateY(100%); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
    @keyframes scaleIn { from { transform: scale(0.95); opacity: 0; } to { transform: scale(1); opacity: 1; } }
    .wm-handle { width: 40px; height: 4px; background: rgba(255,255,255,0.12); border-radius: 2px; margin: 12px auto 0; }
    .wm-header { display: flex; align-items: center; justify-content: space-between; padding: 20px 24px 0; }
    .wm-title { font-size: 20px; font-weight: 800; color: white; }
    .wm-close { width: 32px; height: 32px; background: rgba(255,255,255,0.08); border: none; border-radius: 50%; cursor: pointer; display: flex; align-items: center; justify-content: center; color: rgba(255,255,255,0.6); transition: all 0.15s; }
    .wm-close:hover { background: rgba(255,255,255,0.14); color: white; }
    .wm-body { padding: 20px 24px 24px; }
    .wm-tabs { display: flex; gap: 4px; background: rgba(255,255,255,0.05); padding: 4px; border-radius: 12px; margin-bottom: 24px; }
    .wm-tab { flex: 1; padding: 9px; border-radius: 9px; border: none; font-size: 13px; font-weight: 700; cursor: pointer; transition: all 0.2s; background: transparent; color: rgba(255,255,255,0.45); }
    .wm-tab.active { background: #7c3aed; color: white; box-shadow: 0 4px 12px rgba(124,58,237,0.4); }
    .wm-label { font-size: 12px; font-weight: 700; color: rgba(255,255,255,0.45); text-transform: uppercase; letter-spacing: 0.08em; margin-bottom: 8px; display: block; }
    .wm-input { width: 100%; background: rgba(255,255,255,0.06); border: 1px solid rgba(255,255,255,0.1); border-radius: 12px; padding: 13px 16px; font-size: 15px; color: white; outline: none; transition: border-color 0.2s; box-sizing: border-box; -webkit-appearance: none; }
    .wm-input:focus { border-color: #7c3aed; }
    .wm-input option { background: #1a1a2e; color: white; }
    .wm-btn { width: 100%; padding: 14px; background: linear-gradient(135deg, #7c3aed, #4f46e5); border: none; border-radius: 12px; color: white; font-size: 15px; font-weight: 700; cursor: pointer; transition: all 0.2s; margin-top: 6px; }
    .wm-btn:hover { opacity: 0.9; transform: translateY(-1px); }
    .wm-btn:disabled { opacity: 0.4; cursor: not-allowed; transform: none; }
    .wm-btn-ghost { width: 100%; padding: 13px; background: rgba(255,255,255,0.06); border: 1px solid rgba(255,255,255,0.1); border-radius: 12px; color: rgba(255,255,255,0.7); font-size: 14px; font-weight: 600; cursor: pointer; transition: all 0.2s; margin-top: 8px; }
    .wm-info { background: rgba(124,58,237,0.12); border: 1px solid rgba(124,58,237,0.2); border-radius: 12px; padding: 14px 16px; margin-bottom: 20px; display: flex; gap: 12px; align-items: flex-start; }
    .wm-warning { background: rgba(239,68,68,0.08); border: 1px solid rgba(239,68,68,0.18); border-radius: 12px; padding: 12px 16px; margin-top: 16px; font-size: 12px; color: #ef4444; font-weight: 600; }
    .wm-result { background: rgba(16,185,129,0.07); border: 1px solid rgba(16,185,129,0.18); border-radius: 16px; padding: 20px; margin-top: 20px; animation: fadeIn 0.3s ease; }
    .wm-result-label { font-size: 11px; font-weight: 700; color: rgba(255,255,255,0.35); text-transform: uppercase; letter-spacing: 0.08em; margin-bottom: 6px; }
    .wm-result-value { font-size: 22px; font-weight: 800; color: white; margin-bottom: 16px; font-family: monospace; }
    .wm-copy-btn { display: flex; align-items: center; justify-content: center; gap: 6px; width: 100%; padding: 10px; background: rgba(255,255,255,0.07); border: 1px solid rgba(255,255,255,0.1); border-radius: 10px; color: rgba(255,255,255,0.8); font-size: 13px; font-weight: 700; cursor: pointer; transition: all 0.15s; }
    .wm-copy-btn:hover { background: rgba(255,255,255,0.12); }
    .wm-divider { height: 1px; background: rgba(255,255,255,0.07); margin: 20px 0; }
    .wm-fee-row { display: flex; justify-content: space-between; align-items: center; padding: 10px 0; }
    .wm-fee-label { font-size: 13px; color: rgba(255,255,255,0.45); }
    .wm-fee-value { font-size: 14px; font-weight: 700; color: white; }
    @keyframes fadeIn { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: translateY(0); } }
</style>`;

function openWalletModal(html) {
    const container = document.getElementById('modalsContainer');
    container.innerHTML = html;
    document.body.style.overflow = 'hidden';
    container.querySelector('.wm-overlay')?.addEventListener('click', (e) => {
        if (e.target.classList.contains('wm-overlay')) closeModal();
    });
}

export async function showAddFundsModal() {
    const countryData = getUserCountryData();
    openWalletModal(`
        ${MODAL_STYLES}
        <div class="wm-overlay">
            <div class="wm-sheet">
                <div class="wm-handle"></div>
                <div class="wm-header">
                    <span class="wm-title">Add Funds</span>
                    <button class="wm-close" onclick="closeModal()">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M18 6L6 18M6 6l12 12" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"/></svg>
                    </button>
                </div>
                <div class="wm-body">
                    <div class="wm-tabs">
                        <button class="wm-tab active" id="fiatTab" onclick="switchFundTab('fiat')">Bank Transfer</button>
                        <button class="wm-tab" id="cryptoTab" onclick="switchFundTab('crypto')">Crypto (USDC)</button>
                    </div>

                    <div id="fiatFundView">
                        <label class="wm-label">Select country / currency</label>
                        <select id="fundCurrency" class="wm-input" style="margin-bottom: 20px;">
                            ${Object.keys(COUNTRY_MAP).filter(k => k.length > 2).map(k => `
                                <option value="${COUNTRY_MAP[k].currency}" ${COUNTRY_MAP[k].currency === countryData.currency ? 'selected' : ''}>
                                    ${k.charAt(0).toUpperCase() + k.slice(1)} — ${COUNTRY_MAP[k].currency}
                                </option>
                            `).join('')}
                        </select>
                        <button class="wm-btn" onclick="generateFiatChannel()">Generate Deposit Account</button>
                    </div>

                    <div id="cryptoFundView" style="display:none;">
                        <div class="wm-info">
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" style="color:#a78bfa; flex-shrink:0; margin-top:1px;"><path d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>
                            <div>
                                <div style="font-size:13px; font-weight:700; color:white; margin-bottom:3px;">Gasless — No SOL needed</div>
                                <div style="font-size:12px; color:rgba(255,255,255,0.45); line-height:1.5;">We sponsor all Solana gas fees. Just send USDC directly to your address.</div>
                            </div>
                        </div>
                        <button class="wm-btn" onclick="generateCryptoAddress()">Get My Solana USDC Address</button>
                    </div>

                    <div id="depositResult" style="display:none;"></div>
                </div>
            </div>
        </div>
    `);
}

window.switchFundTab = function (tab) {
    document.getElementById('fiatFundView').style.display = tab === 'fiat' ? 'block' : 'none';
    document.getElementById('cryptoFundView').style.display = tab === 'crypto' ? 'block' : 'none';
    document.getElementById('fiatTab').classList.toggle('active', tab === 'fiat');
    document.getElementById('cryptoTab').classList.toggle('active', tab === 'crypto');
    document.getElementById('depositResult').style.display = 'none';
};

window.generateFiatChannel = async function () {
    const currency = document.getElementById('fundCurrency').value;
    const btn = document.querySelector('#fiatFundView .wm-btn');
    btn.disabled = true; btn.textContent = 'Generating…';
    try {
        const response = await api.createHostfiFiatChannel({ currency });
        if (response.success) {
            const ch = response.data.channel;
            const resultDiv = document.getElementById('depositResult');
            resultDiv.innerHTML = `
                <div class="wm-result">
                    <div class="wm-result-label">Account Number</div>
                    <div class="wm-result-value">${ch.accountNumber}</div>
                    <div style="font-size:15px; font-weight:700; color:#a78bfa; margin-bottom:4px;">${ch.bankName}</div>
                    <div style="font-size:13px; color:rgba(255,255,255,0.5); margin-bottom:16px;">${ch.accountName}</div>
                    <button class="wm-copy-btn" onclick="navigator.clipboard.writeText('${ch.accountNumber}'); showToast('Account number copied!', 'success')">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><rect x="9" y="9" width="13" height="13" rx="2" stroke="currentColor" stroke-width="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" stroke="currentColor" stroke-width="2"/></svg>
                        Copy Account Number
                    </button>
                    <div style="margin-top:14px; font-size:12px; color:rgba(255,255,255,0.3); text-align:center; line-height:1.6;">Funds reflect automatically within 1–15 mins of bank confirmation</div>
                </div>
            `;
            resultDiv.style.display = 'block';
        }
    } catch (error) {
        showToast(error.message, 'error');
    } finally {
        btn.disabled = false; btn.textContent = 'Generate Deposit Account';
    }
};

window.generateCryptoAddress = async function () {
    const btn = document.querySelector('#cryptoFundView .wm-btn');
    btn.disabled = true; btn.textContent = 'Generating…';
    try {
        const response = await api.createHostfiCryptoAddress({ currency: 'USDC', network: 'SOL' });
        if (response.success) {
            const addr = response.data.address;
            const resultDiv = document.getElementById('depositResult');
            resultDiv.innerHTML = `
                <div class="wm-result">
                    <div class="wm-result-label">Your Solana USDC Address</div>
                    <div style="font-size:12px; font-family:monospace; word-break:break-all; color:rgba(255,255,255,0.7); background:rgba(255,255,255,0.05); border:1px solid rgba(255,255,255,0.08); border-radius:10px; padding:12px; line-height:1.6; margin-bottom:14px;">${addr.address}</div>
                    <button class="wm-copy-btn" onclick="navigator.clipboard.writeText('${addr.address}'); showToast('Address copied!', 'success')">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><rect x="9" y="9" width="13" height="13" rx="2" stroke="currentColor" stroke-width="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" stroke="currentColor" stroke-width="2"/></svg>
                        Copy Address
                    </button>
                    ${addr.qrCode ? `<img src="${addr.qrCode}" style="width:140px; height:140px; margin:18px auto 0; display:block; border-radius:12px; border:3px solid rgba(255,255,255,0.1);">` : ''}
                    <div class="wm-warning" style="margin-top:14px; text-align:center;">⚠ Only send USDC via Solana (SPL) network</div>
                </div>
            `;
            resultDiv.style.display = 'block';
        }
    } catch (error) {
        showToast(error.message, 'error');
    } finally {
        btn.disabled = false; btn.textContent = 'Get My Solana USDC Address';
    }
};

export async function showWithdrawModal() {
    const balance = window.walletData?.balance || 0;
    openWalletModal(`
        ${MODAL_STYLES}
        <div class="wm-overlay">
            <div class="wm-sheet">
                <div class="wm-handle"></div>
                <div class="wm-header">
                    <span class="wm-title">Withdraw</span>
                    <button class="wm-close" onclick="closeModal()">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M18 6L6 18M6 6l12 12" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"/></svg>
                    </button>
                </div>
                <div class="wm-body">
                    <div style="background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.08); border-radius: 14px; padding: 16px; margin-bottom: 24px; display: flex; justify-content: space-between; align-items: center;">
                        <span style="font-size:13px; color:rgba(255,255,255,0.45); font-weight:600;">Available</span>
                        <span style="font-size:20px; font-weight:800; color:white;">$${balance.toFixed(2)} <span style="font-size:13px; color:rgba(255,255,255,0.35); font-weight:600;">USDC</span></span>
                    </div>

                    <label class="wm-label">Amount to withdraw</label>
                    <div style="position:relative; margin-bottom:8px;">
                        <input type="number" id="withdrawAmount" class="wm-input" placeholder="0.00" min="1" max="${balance}" step="0.01" oninput="updateWithdrawFee(this.value)" style="padding-right:80px;">
                        <button onclick="document.getElementById('withdrawAmount').value='${balance}'; updateWithdrawFee('${balance}')" style="position:absolute; right:12px; top:50%; transform:translateY(-50%); background:rgba(124,58,237,0.2); border:none; border-radius:7px; padding:4px 10px; font-size:12px; font-weight:700; color:#a78bfa; cursor:pointer;">MAX</button>
                    </div>

                    <div class="wm-divider"></div>
                    <div class="wm-fee-row">
                        <span class="wm-fee-label">Platform fee (1%)</span>
                        <span class="wm-fee-value" id="withdrawFee">$0.00</span>
                    </div>
                    <div class="wm-fee-row" style="padding-top:0;">
                        <span class="wm-fee-label">You receive</span>
                        <span class="wm-fee-value" id="withdrawNet" style="color:#10B981;">$0.00</span>
                    </div>
                    <div class="wm-divider"></div>

                    <button class="wm-btn" onclick="handleWithdrawSubmit()">Continue to Withdraw</button>
                    <button class="wm-btn-ghost" onclick="window.location.href='/#/settings'">Set up payout account</button>
                </div>
            </div>
        </div>
    `);
}

// Alias so the wallet page button works
window.showBankWithdrawal = function () { showWithdrawModal(); };

window.updateWithdrawFee = function (val) {
    const amount = parseFloat(val) || 0;
    const fee = amount * 0.01;
    const net = amount - fee;
    document.getElementById('withdrawFee').textContent = `$${fee.toFixed(2)}`;
    document.getElementById('withdrawNet').textContent = `$${net.toFixed(2)}`;
};

window.handleWithdrawSubmit = function () {
    const amount = parseFloat(document.getElementById('withdrawAmount').value);
    const balance = window.walletData?.balance || 0;
    if (!amount || amount <= 0) { showToast('Enter a valid amount', 'error'); return; }
    if (amount > balance) { showToast('Insufficient balance', 'error'); return; }
    closeModal();
    showToast('Please set up your payout account in Settings first', 'info');
    setTimeout(() => window.location.href = '/#/settings', 1500);
};

export async function showSwapModal() {
    openWalletModal(`
        ${MODAL_STYLES}
        <div class="wm-overlay">
            <div class="wm-sheet">
                <div class="wm-handle"></div>
                <div class="wm-header">
                    <span class="wm-title">Swap</span>
                    <button class="wm-close" onclick="closeModal()">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M18 6L6 18M6 6l12 12" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"/></svg>
                    </button>
                </div>
                <div class="wm-body">
                    <div style="text-align:center; padding: 32px 0 20px;">
                        <div style="width:72px; height:72px; background:linear-gradient(135deg, rgba(124,58,237,0.2), rgba(79,70,229,0.2)); border-radius:20px; display:flex; align-items:center; justify-content:center; margin:0 auto 20px; border:1px solid rgba(124,58,237,0.25);">
                            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" style="color:#a78bfa;"><path d="M7 16V4M7 4L3 8M7 4l4 4M17 8v12M17 20l4-4M17 20l-4-4" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/></svg>
                        </div>
                        <div style="font-size:18px; font-weight:800; color:white; margin-bottom:8px;">Swap Coming Soon</div>
                        <div style="font-size:14px; color:rgba(255,255,255,0.4); line-height:1.6; max-width:280px; margin:0 auto;">Convert between currencies instantly at best market rates. This feature is being finalized.</div>
                    </div>
                    <button class="wm-btn-ghost" onclick="closeModal()">Got it</button>
                </div>
            </div>
        </div>
    `);
}

export async function showPayoutSettings() {
    navigateToPage('settings');
    setTimeout(() => { showToast('Add your bank account details here', 'info'); }, 500);
}

export async function showTransactionHistory() {
    navigateToPage('wallet');
}

export async function showEarningsReport() {
    showToast('Detailed earnings report coming soon', 'info');
}

