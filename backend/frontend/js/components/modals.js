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


window.showLoadingSpinner = function () {
    const existingSpinner = document.getElementById('globalLoadingSpinner');
    if (existingSpinner) existingSpinner.remove();

    const spinner = document.createElement('div');
    spinner.id = 'globalLoadingSpinner';
    spinner.style.cssText = `
        position: fixed;
        inset: 0;
        z-index: 99999;
        display: flex;
        align-items: center;
        justify-content: center;
        background: #ffffff;
    `;

    spinner.innerHTML = `
        <div style="position: relative; width: 120px; height: 120px; display: flex; align-items: center; justify-content: center;">
            <img src="logo.PNG" alt="Loading..." style="
                width: 100%;
                height: 100%;
                object-fit: contain;
                filter: drop-shadow(0 0 20px rgba(151,71,255,0.25));
                animation: logo-premium-motion 2.8s cubic-bezier(0.4, 0, 0.2, 1) infinite;
            ">
        </div>
        <style>
            @keyframes logo-premium-motion {
                0% { transform: scale(0.98) rotate(-10deg); }
                50% { transform: scale(1.1) rotate(10deg); }
                100% { transform: scale(0.98) rotate(-10deg); }
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
    const userAvatar = creator.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(creator.name || 'User')}&background=9747FF&color=fff&bold=true&size=200`;

    const modalContent = `
        <div class="glass-modal-overlay" onclick="if(event.target === this) closeModal()">
            <div class="glass-modal-content" style="max-width: 580px;">
                <div class="glass-modal-header">
                    <span class="glass-modal-title">Request a Booking</span>
                    <button class="glass-modal-close" onclick="closeModal()">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><path d="M18 6L6 18M6 6l12 12"/></svg>
                    </button>
                </div>

                <div class="glass-modal-body">
                    <div style="background: rgba(151, 71, 255, 0.05); border: 1px solid rgba(151, 71, 255, 0.1); border-radius: 20px; padding: 20px; margin-bottom: 24px; display: flex; align-items: center; gap: 16px;">
                        <img src="${userAvatar}" style="width: 60px; height: 60px; border-radius: 50%; object-fit: cover; border: 2px solid var(--primary);">
                        <div>
                            <div style="color: var(--text-primary); font-weight: 800; font-size: 18px; margin-bottom: 4px;">${creator.name}</div>
                            <div style="color: var(--primary); font-weight: 600; font-size: 14px;">${service.title}</div>
                        </div>
                    </div>

                    <div style="background: rgba(151, 71, 255, 0.03); border: 1px solid rgba(151, 71, 255, 0.1); border-radius: 16px; padding: 16px; margin-bottom: 32px;">
                        <p style="color: var(--primary); font-weight: 700; font-size: 13px; margin-bottom: 8px; display: flex; align-items: center; gap: 8px;">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
                            Booking Process
                        </p>
                        <p style="color: var(--text-secondary); font-size: 13px; line-height: 1.6; opacity: 0.8;">
                            Submit your request with a budget. The creator will review and accept or counter. Payment is only held in escrow once both parties agree.
                        </p>
                    </div>

                    <form id="bookingForm" data-creator-id="${creatorId}" data-service-index="${serviceIndex}" style="display: flex; flex-direction: column; gap: 24px;">
                        <div>
                            <label class="glass-form-label">Your Budget (USDC)</label>
                            <input type="number" id="proposedPrice" name="proposedPrice" class="glass-input" required min="1" step="0.01" placeholder="Enter amount">
                        </div>

                        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px;">
                            <div>
                                <label class="glass-form-label">Start Date</label>
                                <input type="date" id="bookingDate" name="bookingDate" class="glass-input" required min="${new Date().toISOString().split('T')[0]}" onchange="document.getElementById('endDate').min = this.value">
                            </div>
                            <div>
                                <label class="glass-form-label">End Date</label>
                                <input type="date" id="endDate" name="endDate" class="glass-input" required min="${new Date().toISOString().split('T')[0]}">
                            </div>
                        </div>

                        <div>
                            <label class="glass-form-label">Project Brief</label>
                            <textarea id="projectBrief" name="projectBrief" class="glass-input" style="min-height: 100px; resize: vertical;" placeholder="Briefly describe what you need..."></textarea>
                        </div>

                        <div style="margin-top: 8px;">
                            <button type="submit" class="glass-btn-primary">Send Booking Request</button>
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
        <div class="glass-modal-overlay" onclick="if(event.target === this) closeModal()">
            <div class="glass-modal-content" style="max-width: 480px;">
                <div class="glass-modal-header">
                    <span class="glass-modal-title">Change Password</span>
                    <button class="glass-modal-close" onclick="closeModal()">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><path d="M18 6L6 18M6 6l12 12"/></svg>
                    </button>
                </div>

                <div class="glass-modal-body">
                    <form onsubmit="handlePasswordChange(event)" style="display: flex; flex-direction: column; gap: 20px;">
                        <div>
                            <label class="glass-form-label">Current Password</label>
                            <div style="position: relative;">
                                <input type="password" id="currentPassword" class="glass-input" required placeholder="••••••••" style="padding-right: 48px;">
                                <button type="button" onclick="togglePasswordVisibility('currentPassword', this)" style="position: absolute; right: 8px; top: 50%; transform: translateY(-50%); background: none; border: none; cursor: pointer; padding: 10px; color: var(--primary);">
                                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" class="eye-icon"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><circle cx="12" cy="12" r="3" stroke="currentColor" stroke-width="2"/></svg>
                                </button>
                            </div>
                        </div>

                        <div>
                            <label class="glass-form-label">New Password</label>
                            <div style="position: relative;">
                                <input type="password" id="newPassword" class="glass-input" required minlength="8" placeholder="••••••••" style="padding-right: 48px;">
                                <button type="button" onclick="togglePasswordVisibility('newPassword', this)" style="position: absolute; right: 8px; top: 50%; transform: translateY(-50%); background: none; border: none; cursor: pointer; padding: 10px; color: var(--primary);">
                                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" class="eye-icon"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><circle cx="12" cy="12" r="3" stroke="currentColor" stroke-width="2"/></svg>
                                </button>
                            </div>
                            <div style="font-size: 11px; color: var(--text-secondary); margin-top: 6px; opacity: 0.7;">Minimum 8 characters</div>
                        </div>

                        <div>
                            <label class="glass-form-label">Confirm New Password</label>
                            <div style="position: relative;">
                                <input type="password" id="confirmPassword" class="glass-input" required minlength="8" placeholder="••••••••" style="padding-right: 48px;">
                                <button type="button" onclick="togglePasswordVisibility('confirmPassword', this)" style="position: absolute; right: 8px; top: 50%; transform: translateY(-50%); background: none; border: none; cursor: pointer; padding: 10px; color: var(--primary);">
                                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" class="eye-icon"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><circle cx="12" cy="12" r="3" stroke="currentColor" stroke-width="2"/></svg>
                                </button>
                            </div>
                        </div>

                        <button type="submit" class="glass-btn-primary" style="margin-top: 12px;">Change Password</button>
                    </form>
                </div>
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
        <div class="glass-modal-overlay" onclick="if(event.target === this) closeModal()">
            <div class="glass-modal-content" style="max-width: 500px;">
                <div class="glass-modal-header">
                    <span class="glass-modal-title">Two-Factor Authentication</span>
                    <button class="glass-modal-close" onclick="closeModal()">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><path d="M18 6L6 18M6 6l12 12"/></svg>
                    </button>
                </div>

                <div class="glass-modal-body">
                    <div id="twoFactorContent">
                        <div style="text-align: center; padding: 60px 0;">
                            <div style="margin-bottom: 24px; position: relative; width: 64px; height: 64px; margin-left: auto; margin-right: auto;">
                                <div style="position: absolute; inset: -10px; border-radius: 50%; background: radial-gradient(circle, var(--primary) 0%, transparent 70%); opacity: 0.2; animation: pulse 2s ease-in-out infinite;"></div>
                                <img src="logo.PNG" alt="Loading..." style="width: 100%; height: 100%; object-fit: contain; filter: drop-shadow(0 0 10px rgba(151,71,255,0.3)); animation: logo-float 3s ease-in-out infinite;">
                            </div>
                            <p style="color: var(--text-secondary); font-weight: 800; font-size: 15px;">Setting up 2FA...</p>
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
            <div style="background: rgba(151, 71, 255, 0.05); border: 1px solid rgba(151, 71, 255, 0.15); border-radius: 20px; padding: 20px; margin-bottom: 24px;">
                <div style="display: flex; align-items: start; gap: 16px;">
                    <div style="background: linear-gradient(135deg, #9747FF, #6B46FF); width: 48px; height: 48px; border-radius: 14px; display: flex; align-items: center; justify-content: center; flex-shrink: 0; box-shadow: 0 4px 12px rgba(151, 71, 255, 0.3);">
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><rect x="5" y="11" width="14" height="10" rx="2"/><path d="M12 16v1M8 11V7a4 4 0 0 1 8 0v4"/></svg>
                    </div>
                    <div style="flex: 1;">
                        <h4 style="margin: 0 0 6px 0; font-weight: 800; color: var(--text-primary);">Secure Your Account</h4>
                        <p style="color: var(--text-secondary); font-size: 14px; line-height: 1.6; margin: 0; opacity: 0.8;">
                            Enable two-factor authentication for maximum security. Scan the QR code with your authenticator app.
                        </p>
                    </div>
                </div>
            </div>

            <div style="margin-bottom: 24px;">
                <h4 style="margin: 0 0 16px 0; font-size: 15px; font-weight: 800; color: var(--text-primary);">Setup Steps:</h4>
                <div style="display: flex; flex-direction: column; gap: 12px; color: var(--text-secondary); font-size: 14px;">
                    <div style="display: flex; gap: 12px; align-items: flex-start;">
                        <span style="width: 20px; height: 20px; border-radius: 50%; background: var(--primary); color: white; display: flex; align-items: center; justify-content: center; font-size: 11px; font-weight: 800; flex-shrink: 0; margin-top: 2px;">1</span>
                        <span>Download Google Authenticator or Authy</span>
                    </div>
                    <div style="display: flex; gap: 12px; align-items: flex-start;">
                        <span style="width: 20px; height: 20px; border-radius: 50%; background: var(--primary); color: white; display: flex; align-items: center; justify-content: center; font-size: 11px; font-weight: 800; flex-shrink: 0; margin-top: 2px;">2</span>
                        <span>Scan the QR code below</span>
                    </div>
                    <div style="display: flex; gap: 12px; align-items: flex-start;">
                        <span style="width: 20px; height: 20px; border-radius: 50%; background: var(--primary); color: white; display: flex; align-items: center; justify-content: center; font-size: 11px; font-weight: 800; flex-shrink: 0; margin-top: 2px;">3</span>
                        <span>Enter the 6-digit verification code</span>
                    </div>
                </div>
            </div>

            <div style="text-align: center; padding: 24px; background: white; border-radius: 20px; margin-bottom: 24px;">
                <img src="${qrCode}" alt="2FA QR Code" style="width: 180px; height: 180px; margin: 0 auto; display: block;">
                <div style="margin-top: 20px;">
                    <p style="color: #666; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 8px;">Manual Setup Key</p>
                    <code style="display: block; font-size: 13px; color: var(--primary); background: #f5f5f5; padding: 10px 12px; border-radius: 10px; word-break: break-all; font-weight: 700;">${manualEntryKey}</code>
                </div>
            </div>

            <div style="margin-bottom: 24px;">
                <label class="glass-form-label">Verification Code</label>
                <input type="text" id="twoFactorCode" class="glass-input" placeholder="000 000" maxlength="6" pattern="[0-9]{6}" style="text-align: center; font-size: 28px; letter-spacing: 8px; font-weight: 800; border-color: var(--primary);">
            </div>

            <div style="display: flex; gap: 12px;">
                <button class="glass-btn-ghost" onclick="closeModal()" style="flex: 1;">Cancel</button>
                <button class="glass-btn-primary" id="enable2FABtn" style="flex: 1;" disabled>Enable 2FA</button>
            </div>

            <div style="background: rgba(255, 152, 0, 0.08); border: 1px solid rgba(255, 152, 0, 0.2); border-radius: 16px; padding: 16px; margin-top: 24px;">
                <div style="display: flex; gap: 12px; align-items: start;">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#FF9800" stroke-width="2.5" style="flex-shrink: 0; margin-top: 2px;"><circle cx="12" cy="12" r="10"/><path d="M12 8v4M12 16h.01" stroke-linecap="round"/></svg>
                    <p style="margin: 0; font-size: 13px; color: var(--text-secondary); line-height: 1.6; opacity: 0.9;">
                        <strong>Important:</strong> Save your recovery codes in a safe place. You'll need them if you lose access to your device.
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
                enableBtn.innerHTML = `
                    <div style="display: flex; align-items: center; justify-content: center; gap: 8px;">
                        <img src="logo.PNG" style="width: 18px; height: 18px; object-fit: contain; animation: pulse 1s infinite;">
                        <span>Verifying...</span>
                    </div>
                `;

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
        <div class="glass-modal-overlay" onclick="if(event.target === this) closeModal()">
            <div class="glass-modal-content" style="max-width: 480px;">
                <div class="glass-modal-header">
                    <span class="glass-modal-title">Backup Codes</span>
                    <button class="glass-modal-close" onclick="closeModal()">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><path d="M18 6L6 18M6 6l12 12"/></svg>
                    </button>
                </div>

                <div class="glass-modal-body">
                    <div style="background: rgba(16, 185, 129, 0.08); border: 1px solid rgba(16, 185, 129, 0.2); border-radius: 16px; padding: 16px; margin-bottom: 24px;">
                        <p style="margin: 0; color: var(--text-secondary); font-size: 14px; line-height: 1.6; opacity: 0.9;">
                            Save these backup codes in a secure location. Each code can only be used once if you lose your authenticator device.
                        </p>
                    </div>

                    <div style="background: rgba(255,255,255,0.03); padding: 24px; border-radius: 20px; margin-bottom: 24px; border: 1px solid rgba(255,255,255,0.08);">
                        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px; font-family: 'JetBrains Mono', monospace; font-size: 15px; font-weight: 700;">
                            ${backupCodes.map(code => `<div style="padding: 12px; background: rgba(255,255,255,0.05); border-radius: 10px; text-align: center; border: 1px solid rgba(255,255,255,0.1); color: var(--primary);">${code}</div>`).join('')}
                        </div>
                    </div>

                    <div style="display: flex; gap: 12px;">
                        <button class="glass-btn-ghost" onclick="window.downloadBackupCodes(${JSON.stringify(backupCodes).replace(/"/g, '&quot;')})" style="flex: 1; display: flex; align-items: center; justify-content: center; gap: 8px;">
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3"/></svg>
                            Download
                        </button>
                        <button class="glass-btn-primary" onclick="closeModal()" style="flex: 1;">Done</button>
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

    const modalContent = `
        <div class="glass-modal-overlay" onclick="if(event.target === this) closeModal()">
            <div class="glass-modal-content" style="max-width: 480px; border: 1px solid rgba(239, 68, 68, 0.3);">
                <div class="glass-modal-header">
                    <span class="glass-modal-title" style="color: #EF4444;">Delete Account</span>
                    <button class="glass-modal-close" onclick="closeModal()">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><path d="M18 6L6 18M6 6l12 12"/></svg>
                    </button>
                </div>

                <div class="glass-modal-body">
                    <div style="background: rgba(239, 68, 68, 0.08); border: 1px solid rgba(239, 68, 68, 0.2); border-radius: 16px; padding: 20px; margin-bottom: 24px;">
                        <div style="display: flex; gap: 12px; align-items: start;">
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#EF4444" stroke-width="2.5" style="flex-shrink: 0;"><circle cx="12" cy="12" r="10"/><path d="M12 8v4M12 16h.01" stroke-linecap="round"/></svg>
                            <div>
                                <p style="margin: 0 0 8px; font-weight: 800; color: var(--text-primary);">Warning: This is permanent</p>
                                <p style="margin: 0; font-size: 13px; color: var(--text-secondary); line-height: 1.6; opacity: 0.9;">
                                    Deleting your account will permanently remove all your data, including your portfolio, balance, and message history.
                                </p>
                            </div>
                        </div>
                    </div>

                    <form onsubmit="handleAccountDeletion(event)" style="display: flex; flex-direction: column; gap: 20px;">
                        ${!isOAuthUser ? `
                            <div>
                                <label class="glass-form-label">Enter password to confirm</label>
                                <input type="password" id="deleteAccountPassword" class="glass-input" required placeholder="Your password">
                            </div>
                        ` : `
                            <div style="background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.08); border-radius: 12px; padding: 14px; color: var(--text-secondary); font-size: 13px;">
                                You signed in with Google, no password is required.
                            </div>
                        `}

                        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-top: 8px;">
                            <button type="button" class="glass-btn-ghost" onclick="closeModal()">Cancel</button>
                            <button type="submit" class="glass-btn-primary" style="background: #EF4444; border-color: #EF4444; box-shadow: 0 4px 12px rgba(239, 68, 68, 0.3);">Delete Permanently</button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    `;
    openModal(modalContent);
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

function openWalletModal(html) {
    const container = document.getElementById('modalsContainer');
    container.innerHTML = html;
    document.body.style.overflow = 'hidden';
    openModal();
}

export async function showAddFundsModal() {
    const countryData = getUserCountryData();
    const modalContent = `
        <div class="glass-modal-overlay" onclick="if(event.target === this) closeModal()">
            <div class="glass-modal-content" style="max-width: 480px;">
                <div class="glass-modal-header">
                    <span class="glass-modal-title">Add Funds</span>
                    <button class="glass-modal-close" onclick="closeModal()">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><path d="M18 6L6 18M6 6l12 12"/></svg>
                    </button>
                </div>

                <div class="glass-modal-body">
                    <div style="display: flex; gap: 4px; background: rgba(255,255,255,0.05); padding: 4px; border-radius: 14px; margin-bottom: 24px;">
                        <button class="glass-tab-btn active" id="fiatTab" onclick="switchFundTab('fiat')" style="flex: 1; padding: 10px; font-size: 13px;">Bank Transfer</button>
                        <button class="glass-tab-btn" id="cryptoTab" onclick="switchFundTab('crypto')" style="flex: 1; padding: 10px; font-size: 13px;">Crypto (USDC)</button>
                    </div>

                    <div id="fiatFundView">
                        <label class="glass-form-label">Select Country / Currency</label>
                        <select id="fundCurrency" class="glass-input" style="margin-bottom: 24px; appearance: none; background-image: url('data:image/svg+xml,%3Csvg width=%2214%22 height=%2214%22 viewBox=%220 0 24 24%22 fill=%22none%22 stroke=%22rgba(151,71,255,0.6)%22 stroke-width=%222.5%22 stroke-linecap=%22round%22 stroke-linejoin=%22round%22%3E%3Cpath d=%22M6 9l6 6 6-6%22/%3E%3C/svg%3E'); background-repeat: no-repeat; background-position: right 16px center;">
                            ${Object.keys(COUNTRY_MAP).filter(k => k.length > 2).map(k => `
                                <option value="${COUNTRY_MAP[k].currency}" ${COUNTRY_MAP[k].currency === countryData.currency ? 'selected' : ''}>
                                    ${k.charAt(0).toUpperCase() + k.slice(1)} — ${COUNTRY_MAP[k].currency}
                                </option>
                            `).join('')}
                        </select>
                        <button class="glass-btn-primary" onclick="generateFiatChannel()">Generate Deposit Account</button>
                    </div>

                    <div id="cryptoFundView" style="display:none;">
                        <div style="background: rgba(151, 71, 255, 0.08); border: 1px solid rgba(151, 71, 255, 0.2); border-radius: 16px; padding: 16px; margin-bottom: 24px; display: flex; gap: 12px; align-items: start;">
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--primary)" stroke-width="2.5" style="margin-top: 2px;"><circle cx="12" cy="12" r="10"/><path d="M12 16h.01M12 8v4" stroke-linecap="round"/></svg>
                            <div>
                                <div style="font-size: 14px; font-weight: 800; color: var(--text-primary); margin-bottom: 4px;">Gasless — No SOL needed</div>
                                <div style="font-size: 12px; color: var(--text-secondary); line-height: 1.6; opacity: 0.8;">We sponsor all Solana gas fees. Just send USDC directly to your address.</div>
                            </div>
                        </div>
                        ${window.walletData?.address && !window.walletData?.address.startsWith('pending_') ? `
                            <div style="background: rgba(151, 71, 255, 0.05); border: 1px solid rgba(151, 71, 255, 0.2); border-radius: 20px; padding: 24px; text-align: center;">
                                <div style="font-size: 11px; font-weight: 800; color: var(--primary); text-transform: uppercase; letter-spacing: 0.1em; margin-bottom: 20px;">Your Solana USDC Address</div>
                                <div style="font-size: 13px; font-family: 'JetBrains Mono', monospace; word-break: break-all; color: var(--text-primary); background: rgba(0,0,0,0.2); border-radius: 12px; padding: 16px; line-height: 1.6; margin-bottom: 20px; border: 1px solid rgba(255,255,255,0.05);">
                                    ${window.walletData.address}
                                </div>
                                <button class="glass-btn-ghost" onclick="navigator.clipboard.writeText('${window.walletData.address}'); showToast('Address copied!', 'success')" style="width: 100%; display: flex; align-items: center; justify-content: center; gap: 8px; padding: 12px; border-radius: 12px;">
                                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/></svg>
                                    Copy Address
                                </button>
                            </div>
                        ` : `
                            <button class="glass-btn-primary" onclick="generateCryptoAddress()">Get Solana USDC Address</button>
                        `}
                    </div>

                    <div id="depositResult" style="display:none; margin-top: 24px; animation: glassFadeInPulse 0.4s ease;"></div>
                </div>
            </div>
        </div>
    `;
    openWalletModal(modalContent);
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
    const btn = document.querySelector('#fiatFundView .glass-btn-primary');
    btn.disabled = true; btn.textContent = 'Generating...';
    try {
        const response = await api.createHostfiFiatChannel({ currency });
        if (response.success) {
            const ch = response.data.channel;
            const resultDiv = document.getElementById('depositResult');
            resultDiv.innerHTML = `
                <div style="background: rgba(16, 185, 129, 0.05); border: 1px solid rgba(16, 185, 129, 0.2); border-radius: 20px; padding: 24px; position: relative; overflow: hidden;">
                    <div style="font-size: 11px; font-weight: 800; color: #10B981; text-transform: uppercase; letter-spacing: 0.1em; margin-bottom: 20px;">Bank Transfer Details</div>
                    
                    <div style="margin-bottom: 20px;">
                        <div style="font-size: 12px; color: var(--text-secondary); margin-bottom: 4px; opacity: 0.7;">Account Number</div>
                        <div style="font-size: 28px; font-weight: 800; color: var(--text-primary); font-family: 'JetBrains Mono', monospace; letter-spacing: -0.02em;">${ch.accountNumber}</div>
                    </div>

                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 24px;">
                        <div>
                            <div style="font-size: 11px; color: var(--text-secondary); margin-bottom: 4px; opacity: 0.7;">Bank Name</div>
                            <div style="font-size: 15px; font-weight: 700; color: var(--text-primary);">${ch.bankName}</div>
                        </div>
                        <div>
                            <div style="font-size: 11px; color: var(--text-secondary); margin-bottom: 4px; opacity: 0.7;">Account Name</div>
                            <div style="font-size: 14px; font-weight: 600; color: var(--text-primary);">${ch.accountName}</div>
                        </div>
                    </div>

                    <button class="glass-btn-ghost" onclick="navigator.clipboard.writeText('${ch.accountNumber}'); showToast('Account number copied!', 'success')" style="width: 100%; display: flex; align-items: center; justify-content: center; gap: 8px; padding: 12px; border-radius: 12px;">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/></svg>
                        Copy Account Number
                    </button>
                    
                    <div style="margin-top: 20px; font-size: 12px; color: var(--text-secondary); text-align: center; opacity: 0.6; line-height: 1.5;">Funds reflect within 1–15 mins after bank confirmation</div>
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
    const btn = document.querySelector('#cryptoFundView .glass-btn-primary');
    btn.disabled = true; btn.textContent = 'Generating...';
    try {
        const response = await api.createHostfiCryptoAddress({ currency: 'USDC', network: 'SOL' });
        if (response.success) {
            const addr = response.data.address;
            const resultDiv = document.getElementById('depositResult');
            resultDiv.innerHTML = `
                <div style="background: rgba(151, 71, 255, 0.05); border: 1px solid rgba(151, 71, 255, 0.2); border-radius: 20px; padding: 24px; text-align: center;">
                    <div style="font-size: 11px; font-weight: 800; color: var(--primary); text-transform: uppercase; letter-spacing: 0.1em; margin-bottom: 20px;">Solana USDC Address</div>
                    
                    <div style="font-size: 13px; font-family: 'JetBrains Mono', monospace; word-break: break-all; color: var(--text-primary); background: rgba(0,0,0,0.2); border-radius: 12px; padding: 16px; line-height: 1.6; margin-bottom: 20px; border: 1px solid rgba(255,255,255,0.05);">
                        ${addr.address}
                    </div>

                    <button class="glass-btn-ghost" onclick="navigator.clipboard.writeText('${addr.address}'); showToast('Address copied!', 'success')" style="width: 100%; display: flex; align-items: center; justify-content: center; gap: 8px; padding: 12px; border-radius: 12px; margin-bottom: 20px;">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/></svg>
                        Copy Address
                    </button>
                    
                    ${addr.qrCode ? `<div style="background: white; padding: 12px; border-radius: 16px; display: inline-block;"><img src="${addr.qrCode}" style="width: 160px; height: 160px; display: block;"></div>` : ''}
                    
                    <div style="margin-top: 24px; background: rgba(239, 68, 68, 0.1); border: 1px solid rgba(239, 68, 68, 0.2); border-radius: 12px; padding: 12px; font-size: 12px; color: #EF4444; font-weight: 700;">
                        ⚠ Send only USDC via Solana (SPL) network
                    </div>
                </div>
            `;
            resultDiv.style.display = 'block';
        }
    } catch (error) {
        showToast(error.message, 'error');
    } finally {
        btn.disabled = false; btn.textContent = 'Get Solana USDC Address';
    }
};

export async function showWithdrawModal() {
    const balance = window.walletData?.balance || 0;
    const modalContent = `
        <div class="glass-modal-overlay" onclick="if(event.target === this) closeModal()">
            <div class="glass-modal-content" style="max-width: 480px;">
                <div class="glass-modal-header">
                    <span class="glass-modal-title">Withdraw / Send Funds</span>
                    <button class="glass-modal-close" onclick="closeModal()">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><path d="M18 6L6 18M6 6l12 12"/></svg>
                    </button>
                </div>

                <div class="glass-modal-body">
                    <div style="background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.08); border-radius: 20px; padding: 20px; margin-bottom: 24px; display: flex; justify-content: space-between; align-items: center;">
                        <span style="font-size: 14px; color: var(--text-secondary); font-weight: 600;">Available Balance</span>
                        <div style="text-align: right;">
                            <span style="font-size: 24px; font-weight: 800; color: var(--text-primary);">$${balance.toFixed(2)}</span>
                            <span style="font-size: 12px; color: var(--primary); font-weight: 800; display: block; margin-top: 2px;">USDC</span>
                        </div>
                    </div>

                    <div style="display: flex; gap: 4px; background: rgba(255,255,255,0.05); padding: 4px; border-radius: 14px; margin-bottom: 24px;">
                        <button class="glass-tab-btn active" id="bankWithdrawTab" onclick="switchWithdrawTab('bank')" style="flex: 1; padding: 10px; font-size: 13px;">Bank Account</button>
                        <button class="glass-tab-btn" id="cryptoWithdrawTab" onclick="switchWithdrawTab('crypto')" style="flex: 1; padding: 10px; font-size: 13px;">Solana Wallet</button>
                    </div>

                    <div id="commonWithdrawFields">
                        <div style="margin-bottom:24px;">
                            <label class="glass-form-label">Amount to Withdraw</label>
                            <div style="position: relative;">
                                <input type="number" id="withdrawAmount" class="glass-input" placeholder="0.00" min="0.01" max="${balance}" step="0.01" oninput="updateWithdrawFee(this.value)" style="padding-right: 80px; font-size: 18px; font-weight: 700;">
                                <button onclick="document.getElementById('withdrawAmount').value='${balance}'; updateWithdrawFee('${balance}')" style="position: absolute; right: 10px; top: 50%; transform: translateY(-50%); background: var(--primary); border: none; border-radius: 10px; padding: 6px 14px; font-size: 12px; font-weight: 800; color: white; cursor: pointer;">MAX</button>
                            </div>
                        </div>

                        <div id="cryptoWithdrawFields" style="display:none; margin-bottom:24px;">
                            <label class="glass-form-label">Recipient Solana Address</label>
                            <input type="text" id="recipientAddress" class="glass-input" placeholder="Paste Solana wallet address...">
                            <div style="margin-top: 12px; display: flex; gap: 8px; align-items: start; background: rgba(151, 71, 255, 0.05); border: 1px solid rgba(151, 71, 255, 0.1); border-radius: 12px; padding: 10px;">
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--primary)" stroke-width="2.5" style="margin-top: 2px;"><circle cx="12" cy="12" r="10"/><path d="M12 16h.01M12 8v4" stroke-linecap="round"/></svg>
                                <span style="font-size: 11px; color: var(--text-secondary); line-height: 1.4;">Gasless Transfer: No SOL required. Fees are paid in USDC.</span>
                            </div>
                        </div>

                        <div style="background: rgba(255,255,255,0.02); border-radius: 20px; padding: 20px; margin-bottom: 24px; border: 1px solid rgba(255,255,255,0.05);">
                            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
                                <span style="font-size: 14px; color: var(--text-secondary);">Network Fee (USDC)</span>
                                <span style="font-size: 15px; font-weight: 700; color: var(--text-primary);" id="withdrawFee">$0.00</span>
                            </div>
                            <div style="height: 1px; background: rgba(255,255,255,0.08); margin-bottom: 12px;"></div>
                            <div style="display: flex; justify-content: space-between; align-items: center;">
                                <span style="font-size: 14px; color: var(--text-secondary); font-weight: 600;">Recipient Receives</span>
                                <span style="font-size: 20px; font-weight: 800; color: #10B981;" id="withdrawNet">$0.00</span>
                            </div>
                        </div>
                    </div>

                    <div id="bankWithdrawActions">
                        <button class="glass-btn-primary" onclick="handleWithdrawSubmit('BANK_TRANSFER')" style="margin-bottom: 12px;">Confirm Bank Withdrawal</button>
                        <button class="glass-btn-ghost" onclick="window.location.href='/#/settings'">Update Payout Details</button>
                    </div>

                    <div id="cryptoWithdrawActions" style="display:none;">
                        <button class="glass-btn-primary" onclick="handleWithdrawSubmit('CRYPTO')">Send Gasless USDC</button>
                    </div>
                </div>
            </div>
        </div>
    `;
    openWalletModal(modalContent);
}

window.showBankWithdrawal = function () {
    showWithdrawModal();
};

window.updateWithdrawFee = function (amount) {
    const val = parseFloat(amount) || 0;
    const fee = val > 0 ? 0.05 : 0; // Standard network fee estimate
    const net = Math.max(0, val - fee);

    const feeEl = document.getElementById('withdrawFee');
    const netEl = document.getElementById('withdrawNet');

    if (feeEl) feeEl.textContent = `$${fee.toFixed(2)}`;
    if (netEl) netEl.textContent = `$${net.toFixed(2)}`;
};

window.switchWithdrawTab = function (tab) {
    document.getElementById('bankWithdrawTab').classList.toggle('active', tab === 'bank');
    document.getElementById('cryptoWithdrawTab').classList.toggle('active', tab === 'crypto');
    document.getElementById('cryptoWithdrawFields').style.display = tab === 'crypto' ? 'block' : 'none';
    document.getElementById('bankWithdrawActions').style.display = tab === 'bank' ? 'block' : 'none';
    document.getElementById('cryptoWithdrawActions').style.display = tab === 'crypto' ? 'block' : 'none';
};

window.handleWithdrawSubmit = async function (methodId) {
    const amount = parseFloat(document.getElementById('withdrawAmount').value);
    const balance = window.walletData?.balance || 0;

    if (!amount || amount <= 0) { showToast('Enter a valid amount', 'error'); return; }
    if (amount > balance) { showToast('Insufficient balance', 'error'); return; }

    if (methodId === 'BANK_TRANSFER') {
        const userCountry = appState.user?.location?.country || appState.user?.country;
        if (!userCountry) {
            showToast('Please set your country in Settings first', 'info');
            setTimeout(() => window.location.href = '/#/settings', 1500);
            return;
        }
        // Check if user has bank account... this is usually checked on backend but good to prompt
        closeModal();
        showToast('Processing bank withdrawal...', 'info');
        window.location.href = '/#/settings';
    } else if (methodId === 'CRYPTO') {
        const recipient = document.getElementById('recipientAddress').value.trim();
        if (!recipient) { showToast('Enter a recipient Solana address', 'error'); return; }
        if (recipient.length < 32) { showToast('Invalid Solana address', 'error'); return; }

        try {
            window.showLoadingSpinner();
            const response = await api.initiateHostfiWithdrawal({
                amount,
                currency: 'USDC',
                methodId: 'CRYPTO',
                recipient: {
                    walletAddress: recipient,
                    type: 'CRYPTO'
                }
            });

            window.hideLoadingSpinner();
            if (response.success) {
                closeModal();
                showToast('USDC sent successfully!', 'success');
                setTimeout(() => window.location.reload(), 2000);
            } else {
                showToast(response.message || 'Transfer failed', 'error');
            }
        } catch (error) {
            window.hideLoadingSpinner();
            showToast(error.message || 'Transfer error', 'error');
        }
    }
};

export async function showSwapModal() {
    const modalContent = `
        <div class="glass-modal-overlay" onclick="if(event.target === this) closeModal()">
            <div class="glass-modal-content" style="max-width: 440px;">
                <div class="glass-modal-header">
                    <span class="glass-modal-title">Swap Assets</span>
                    <button class="glass-modal-close" onclick="closeModal()">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><path d="M18 6L6 18M6 6l12 12"/></svg>
                    </button>
                </div>

                <div class="glass-modal-body">
                    <div style="text-align: center; padding: 40px 0 20px;">
                        <div style="width: 80px; height: 80px; background: rgba(151, 71, 255, 0.1); border-radius: 24px; display: flex; align-items: center; justify-content: center; margin: 0 auto 24px; border: 1px solid rgba(151, 71, 255, 0.2); box-shadow: 0 8px 24px rgba(151, 71, 255, 0.15);">
                            <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="var(--primary)" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M7 16V4M7 4L3 8M7 4l4 4M17 8v12M17 20l4-4M17 20l-4-4"/></svg>
                        </div>
                        <h3 style="font-size: 22px; font-weight: 800; color: var(--text-primary); margin-bottom: 12px;">Coming Soon</h3>
                        <p style="color: var(--text-secondary); font-size: 15px; line-height: 1.6; max-width: 300px; margin: 0 auto; opacity: 0.8;">Instantly convert between fiat and crypto at competitive market rates.</p>
                    </div>

                    <button class="glass-btn-primary" onclick="closeModal()" style="margin-top: 24px;">Got It</button>
                </div>
            </div>
        </div>
    `;
    openWalletModal(modalContent);
}

export async function showPayoutSettings() {
    navigateToPage('settings');
    setTimeout(() => { showToast('Add your bank account details here', 'info'); }, 500);
}

export async function showTransactionHistory() {
    try {
        window.showLoadingSpinner();
        const response = await api.getHostfiTransactions(1, 50);
        window.hideLoadingSpinner();

        if (!response.success) throw new Error(response.message || 'Failed to fetch transactions');

        const txs = response.data.transactions || [];
        const currencySymbols = { 'USD': '$', 'USDC': '$', 'NGN': '₦', 'GHS': '₵', 'KES': 'KSh', 'SOL': '◎' };

        // Helper to format date within scope
        const formatTxDate = (dateString) => {
            const date = new Date(dateString);
            return date.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
        };

        const modalContent = `
            <div class="glass-modal-overlay" onclick="if(event.target === this) closeModal()">
                <div class="glass-modal-content" style="max-width: 580px; height: 85vh; display: flex; flex-direction: column;">
                    <div class="glass-modal-header">
                        <span class="glass-modal-title">Transaction History</span>
                        <button class="glass-modal-close" onclick="closeModal()">
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><path d="M18 6L6 18M6 6l12 12"/></svg>
                        </button>
                    </div>

                    <div class="glass-modal-body" style="flex: 1; overflow-y: auto; padding-top: 0;">
                        ${txs.length > 0 ? `
                            <div style="display: flex; flex-direction: column; gap: 8px; padding-top: 20px;">
                                ${txs.map(tx => {
            const isCredit = ['deposit', 'earning', 'bonus', 'refund'].includes(tx.type);
            const statusColor = tx.status === 'completed' ? '#10B981' : tx.status === 'failed' ? '#EF4444' : '#F59E0B';
            const amountColor = isCredit ? '#10B981' : '#EF4444';
            const iconBg = isCredit ? 'rgba(16,185,129,0.08)' : 'rgba(239,68,68,0.08)';
            const { formatDate } = window; // Assumes formatDate is globally available or imported in utils

            return `
                                    <div onclick="window.showTransactionDetail('${tx._id || tx.id}')" style="display: flex; align-items: center; gap: 14px; padding: 14px; border-radius: 16px; background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.06); cursor: pointer; transition: all 0.2s;">
                                        <div style="width: 40px; height: 40px; background: ${iconBg}; border-radius: 12px; display: flex; align-items: center; justify-content: center; color: ${amountColor}; flex-shrink: 0;">
                                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                                                ${isCredit ? '<path d="M12 5v14M5 12l7 7 7-7"/>' : '<path d="M12 19V5M5 12l7-7 7 7"/>'}
                                            </svg>
                                        </div>
                                        <div style="flex: 1; min-width: 0;">
                                            <div style="font-size: 14px; font-weight: 700; color: var(--text-primary); white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${tx.description || (tx.type.charAt(0).toUpperCase() + tx.type.slice(1))}</div>
                                            <div style="font-size: 12px; color: var(--text-secondary); opacity: 0.7; margin-top: 2px;">${new Date(tx.createdAt).toLocaleDateString()} • ${new Date(tx.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
                                        </div>
                                        <div style="text-align: right; flex-shrink: 0;">
                                            <div style="font-size: 15px; font-weight: 800; color: ${amountColor};">${isCredit ? '+' : '-'}${currencySymbols[tx.currency] || ''}${Math.abs(tx.amount).toFixed(2)}</div>
                                            <div style="font-size: 10px; font-weight: 800; color: ${statusColor}; text-transform: uppercase; letter-spacing: 0.05em; margin-top: 2px;">${tx.status}</div>
                                        </div>
                                    </div>
                                `;
        }).join('')}
                            </div>
                        ` : `
                            <div style="text-align: center; padding: 60px 20px; opacity: 0.5;">
                                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" style="margin-bottom: 16px;"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18M9 3v18"/></svg>
                                <p>No transactions found</p>
                            </div>
                        `}
                    </div>
                </div>
            </div>
        `;

        document.getElementById('modalsContainer').innerHTML = modalContent;
        openModal();
    } catch (error) {
        showToast(error.message, 'error');
    }
}

window.showTransactionDetail = async function (txId) {
    try {
        window.showLoadingSpinner();
        const response = await api.request(`/hostfi/wallet/transactions/${txId}`);
        window.hideLoadingSpinner();

        if (!response.success) throw new Error(response.message || 'Failed to fetch transaction details');

        const tx = response.data.transaction;
        const currencySymbols = { 'USD': '$', 'USDC': '$', 'NGN': '₦', 'GHS': '₵', 'KES': 'KSh', 'SOL': '◎' };
        const isCredit = ['deposit', 'earning', 'bonus', 'refund'].includes(tx.type);
        const amountColor = isCredit ? '#10B981' : '#EF4444';

        const modalContent = `
            <div class="glass-modal-overlay" onclick="if(event.target === this) closeModal()">
                <div class="glass-modal-content" style="max-width: 440px;">
                    <div class="glass-modal-header">
                        <span class="glass-modal-title">Transaction Details</span>
                        <button class="glass-modal-close" onclick="closeModal()">
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><path d="M18 6L6 18M6 6l12 12"/></svg>
                        </button>
                    </div>

                    <div class="glass-modal-body" style="text-align: center; padding-bottom: 32px;">
                        <div style="width: 64px; height: 64px; background: rgba(151, 71, 255, 0.1); border-radius: 20px; display: flex; align-items: center; justify-content: center; margin: 0 auto 20px; color: var(--primary); border: 1px solid rgba(151, 71, 255, 0.2);">
                            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                                <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>
                            </svg>
                        </div>

                        <div style="font-size: 32px; font-weight: 800; color: ${amountColor}; margin-bottom: 4px;">
                            ${isCredit ? '+' : '-'}${currencySymbols[tx.currency] || ''}${Math.abs(tx.amount).toFixed(2)}
                        </div>
                        <div style="font-size: 14px; color: var(--text-secondary); margin-bottom: 24px;">${tx.description || (tx.type.charAt(0).toUpperCase() + tx.type.slice(1))}</div>

                        <div style="background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.08); border-radius: 20px; padding: 20px; display: flex; flex-direction: column; gap: 16px; text-align: left;">
                            <div style="display: flex; justify-content: space-between;">
                                <span style="font-size: 13px; color: var(--text-secondary);">Status</span>
                                <span style="font-size: 13px; font-weight: 700; color: ${tx.status === 'completed' ? '#10B981' : '#F59E0B'}; text-transform: capitalize;">${tx.status}</span>
                            </div>
                            <div style="display: flex; justify-content: space-between;">
                                <span style="font-size: 13px; color: var(--text-secondary);">Date</span>
                                <span style="font-size: 13px; font-weight: 600;">${new Date(tx.createdAt).toLocaleString()}</span>
                            </div>
                            ${tx.platformFee && tx.platformFee > 0 ? `
                            <div style="display: flex; justify-content: space-between;">
                                <span style="font-size: 13px; color: var(--text-secondary);">Platform Fee</span>
                                <span style="font-size: 13px; font-weight: 600; color: #EF4444;">-${currencySymbols[tx.currency] || ''}${Number(tx.platformFee).toFixed(2)}</span>
                            </div>` : ''}
                            <div style="display: flex; justify-content: space-between;">
                                <span style="font-size: 13px; color: var(--text-secondary);">Type</span>
                                <span style="font-size: 13px; font-weight: 600; text-transform: capitalize;">${tx.type}</span>
                            </div>
                            ${tx.transactionHash ? `
                                <div style="height: 1px; background: rgba(255,255,255,0.08); margin: 4px 0;"></div>
                                <div style="text-align: left;">
                                    <div style="font-size: 12px; color: var(--text-secondary); margin-bottom: 8px;">Transaction Hash</div>
                                    <div style="font-family: 'JetBrains Mono', monospace; font-size: 11px; color: var(--primary); background: rgba(151,71,255,0.05); padding: 12px; border-radius: 12px; word-break: break-all; line-height: 1.5; border: 1px solid rgba(151,71,255,0.1);">
                                        ${tx.transactionHash}
                                    </div>
                                    <a href="https://explorer.solana.com/tx/${tx.transactionHash}" target="_blank" style="display: flex; align-items: center; justify-content: center; gap: 8px; margin-top: 12px; color: var(--primary); text-decoration: none; font-size: 13px; font-weight: 700; background: rgba(151,71,255,0.1); padding: 10px; border-radius: 12px;">
                                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6M15 3h6v6M10 14L21 3"/></svg>
                                        View on Solana Explorer
                                    </a>
                                </div>
                            ` : ''}
                        </div>
                    </div>
                </div>
            </div>
        `;

        document.getElementById('modalsContainer').innerHTML = modalContent;
        // Check if modal container is already open, if not, open it
        if (!document.querySelector('.glass-modal-overlay.active')) {
            openModal();
        }
    } catch (error) {
        showToast(error.message, 'error');
    }
}

export async function showEarningsReport() {
    showToast('Detailed earnings report coming soon', 'info');
}

