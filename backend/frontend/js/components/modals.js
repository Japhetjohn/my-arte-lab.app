// Modal Components
import { appState, setUser } from '../state.js';
import { showToast, closeModal, openModal } from '../utils.js';
import { updateUserMenu } from '../auth.js';
import { navigateToPage } from '../navigation.js';
import api from '../services/api.js';

// Booking Modal

// Global loading spinner
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
    // Try to find creator in appState first
    let creator = appState.creators?.find(c => c.id === creatorId);

    // If not found, fetch from API
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

                // Add to appState so handleBookingSubmit can find it
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

    // Check if creator has services
    if (!creator.services || creator.services.length === 0) {
        showToast('This creator has not set up any services yet', 'info');
        return;
    }

    const service = creator.services[serviceIndex];

    // Use uploaded avatar if available, otherwise use default with initials
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
                        <li>The creator reviews and accepts/rejects/counter-proposes</li>
                        <li>Once accepted, payment is auto-deducted from your wallet</li>
                        <li>Funds are held in escrow until job completion</li>
                    </ol>
                    <div style="margin-top: 12px; padding-top: 12px; border-top: 1px solid rgba(146, 64, 14, 0.2); color: #92400E; font-size: 13px; font-weight: 500;">
                        Make sure your wallet has sufficient USDC balance before booking
                    </div>
                </div>

                <form id="bookingForm" data-creator-id="${creatorId}" data-service-index="${serviceIndex}">
                    <div class="form-group">
                        <label class="form-label">Your Budget (USDC)</label>
                        <input type="number" id="proposedPrice" name="proposedPrice" class="form-input" required min="1" step="0.01" placeholder="e.g., 500">
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
                        <input type="file" class="form-input" multiple>
                    </div>

                    <div class="alert alert-success">
                        <strong>No payment required yet!</strong> The creator will review your request first. Payment is only processed after they accept.
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

    // Attach form submit handler after modal is rendered
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

        // Find creator in appState
        const creator = appState.creators?.find(c => c.id === creatorId);

        if (!creator) {
            throw new Error('Creator not found. Please try again.');
        }

        if (!creator.services || !creator.services[serviceIndex]) {
            throw new Error('Service not found. Please try again.');
        }

        const service = creator.services[serviceIndex];

        const bookingData = {
            creatorId: creator._id || creator.id,
            serviceTitle: service.title,
            serviceDescription: document.getElementById('projectBrief')?.value || service.description || 'Booking request',
            category: creator.category || 'other',
            amount: parseFloat(document.getElementById('proposedPrice').value),
            currency: 'USDC',
            startDate: document.getElementById('bookingDate').value,
            endDate: document.getElementById('endDate').value
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

// Make functions available globally for inline onclick handlers
window.handleBookNow = handleBookNow;
window.handleBookingSubmit = handleBookingSubmit;
window.openLightbox = openLightbox;
window.showBookingModal = showBookingModal;

// Settings/Profile Handlers
export async function handleProfileUpdate(event) {
    event.preventDefault();

    const form = event.target;
    const submitBtn = form.querySelector('button[type="submit"]');
    const originalText = submitBtn.textContent;

    try {
        submitBtn.disabled = true;
        submitBtn.textContent = 'Saving...';

        const profileData = {
            name: document.getElementById('profileName').value,
            email: document.getElementById('profileEmail').value,
            bio: document.getElementById('profileBio').value,
            location: {
                city: document.getElementById('profileLocation')?.value
            }
        };

        // Add creator-specific fields
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
    // Create file input
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';

    input.onchange = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        // Validate file size (5MB max)
        if (file.size > 5 * 1024 * 1024) {
            showToast('Image must be less than 5MB', 'error');
            return;
        }

        try {
            showToast('Uploading avatar...', 'info');

            const response = await api.uploadAvatar(file);

            if (response.success) {
                // Fetch fresh user data from the API to ensure we have the latest
                const freshUserData = await api.getMe();
                if (freshUserData.success) {
                    setUser(freshUserData.data.user);
                    updateUserMenu();
                }

                showToast('Avatar updated successfully!', 'success');

                // Refresh the settings page if we're on it
                setTimeout(() => window.location.reload(), 1000);
            }
        } catch (error) {
            showToast(error.message || 'Failed to upload avatar', 'error');
        }
    };

    input.click();
}

export function handleCoverUpload() {
    // Create file input
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';

    input.onchange = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        // Validate file size (5MB max)
        if (file.size > 5 * 1024 * 1024) {
            showToast('Image must be less than 5MB', 'error');
            return;
        }

        try {
            showToast('Uploading cover image...', 'info');

            const response = await api.uploadCover(file);

            if (response.success) {
                // Fetch fresh user data from the API to ensure we have the latest
                const freshUserData = await api.getMe();
                if (freshUserData.success) {
                    setUser(freshUserData.data.user);
                    updateUserMenu();
                }

                showToast('Cover image updated successfully!', 'success');

                // Refresh the page to show new cover
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
                        <input type="password" id="currentPassword" class="form-input" required>
                    </div>

                    <div class="form-group">
                        <label class="form-label">New Password</label>
                        <input type="password" id="newPassword" class="form-input" required minlength="8">
                    </div>

                    <div class="form-group">
                        <label class="form-label">Confirm New Password</label>
                        <input type="password" id="confirmPassword" class="form-input" required minlength="8">
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

export function showTwoFactorModal() {
    showToast('Two-factor authentication setup coming soon!', 'success');
}

// Note: showDeleteAccountModal is implemented in settings.js
// Removed stub to avoid overriding the real implementation

// Wallet Handlers
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

// Show Switch global offramp (bank transfer withdrawal - 65 countries)
window.showBankWithdrawal = async function() {
    try {
        // Show loading spinner while loading countries
        window.showLoadingSpinner('Loading withdrawal form...');

        // Fetch available countries
        const response = await api.getSwitchCountries();

        if (!response.success || !response.data) {
            showToast('Failed to load countries', 'error');
            return;
        }

        const countries = response.data.countries || [];
        window.hideLoadingSpinner();

        // Popular countries at the top
        const popularCountries = ['NG', 'US', 'GB', 'KE', 'GH', 'ZA', 'CA'];
        const sortedCountries = countries.sort((a, b) => {
            const aIndex = popularCountries.indexOf(a.country);
            const bIndex = popularCountries.indexOf(b.country);
            if (aIndex !== -1 && bIndex !== -1) return aIndex - bIndex;
            if (aIndex !== -1) return -1;
            if (bIndex !== -1) return 1;
            return (a.country || '').localeCompare(b.country || '');
        });

        // Country code to name mapping
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

        // Form elements
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

        // Country change handler
        countrySelect.addEventListener('change', async () => {
            const country = countrySelect.value;
            selectedCountry = country;

            if (!country) {
                bankSelectGroup.style.display = 'none';
                dynamicFieldsContainer.style.display = 'none';
                submitBtn.disabled = true;
                return;
            }

            // Load banks for selected country
            window.showLoadingSpinner('Loading banks...');
            bankSelect.innerHTML = '<option value="">Loading banks...</option>';
            bankSelectGroup.style.display = 'block';

            try {
                const banksResponse = await api.getSwitchBanks(country);

                if (banksResponse.success && banksResponse.data && banksResponse.data.banks) {
                    const banks = banksResponse.data.banks;

                    // Check if country has banks
                    if (banks.length === 0) {
                        // Country doesn't use bank selection (e.g., US uses routing numbers)
                        // Hide bank selector and load dynamic fields directly
                        bankSelectGroup.style.display = 'none';
                        selectedBank = 'DIRECT'; // Mark as selected so fields can load
                        window.hideLoadingSpinner();

                        // Trigger loading of dynamic fields
                        dynamicFieldsContainer.innerHTML = '<p style="color: var(--text-secondary);">Loading form fields...</p>';
                        dynamicFieldsContainer.style.display = 'block';

                        try {
                            const reqResponse = await api.getSwitchRequirements(selectedCountry, 'INDIVIDUAL');

                            if (reqResponse.success && reqResponse.data && reqResponse.data.requirements) {
                                const requirements = reqResponse.data.requirements;

                                // Map field names to labels
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

                                    // Skip bank_code and holder_type
                                    if (fieldName === 'bank_code' || fieldName === 'holder_type') return;

                                    const fieldId = `dynamic_${fieldName}`;
                                    const label = fieldLabels[fieldName] || fieldName.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
                                    const placeholder = req.example || `Enter ${label}`;

                                    // Handle dropdown fields (like state)
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

                                // Add event listeners to dynamic fields
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

                    // Country has banks - show bank selector
                    const bankSearch = document.getElementById('bankSearch');

                    // Show search if many banks
                    if (banks.length > 10) {
                        bankSearch.style.display = 'block';
                    }

                    // Render banks function
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

                    // Add search handler
                    bankSearch.addEventListener('input', (e) => {
                        window.renderBanks(e.target.value);
                    });

                    // Initial render
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

        // Bank change handler - load dynamic fields
        bankSelect.addEventListener('change', async () => {
            selectedBank = bankSelect.value;

            if (!selectedBank || !selectedCountry) {
                dynamicFieldsContainer.style.display = 'none';
                checkFormValid();
                return;
            }

            // Fetch dynamic requirements for this country
            dynamicFieldsContainer.innerHTML = '<p style="color: var(--text-secondary);">Loading form fields...</p>';
            dynamicFieldsContainer.style.display = 'block';

            try {
                const reqResponse = await api.getSwitchRequirements(selectedCountry, 'INDIVIDUAL');

                if (reqResponse.success && reqResponse.data && reqResponse.data.requirements && reqResponse.data.requirements.length > 0) {
                    const requirements = reqResponse.data.requirements;

                    // Map field names to labels
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
                        
                        // Skip bank_code - it's already in the bank selector
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

                    // Add event listeners to dynamic fields
                    document.querySelectorAll('.dynamic-field').forEach(field => {
                        field.addEventListener('input', checkFormValid);
                    });
                } else {
                    // No specific requirements - just standard account details
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

                // Add account number verification
                const accountNumberField = document.getElementById('dynamic_account_number');
                const accountNameField = document.getElementById('dynamic_account_name');

                if (accountNumberField && accountNameField && selectedBank) {
                    let verificationTimeout;

                    accountNumberField.addEventListener('input', () => {
                        clearTimeout(verificationTimeout);
                        const accountNumber = accountNumberField.value.trim();

                        // Check if account number looks complete (adjust length as needed)
                        if (accountNumber.length >= 10) {
                            verificationTimeout = setTimeout(async () => {
                                // Show loading state
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
                                    console.log('Account verification not available:', error.message);
                                    // Silently fail - let user enter name manually
                                    accountNameField.value = '';
                                    accountNameField.disabled = false;
                                    accountNameField.placeholder = 'Enter account holder name';
                                }
                            }, 800); // Debounce for 800ms
                        }
                    });

                    // Allow manual edit if verification fails
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

        // Amount input with real-time quote
        amountInput.addEventListener('input', async () => {
            clearTimeout(debounceTimer);
            const amount = parseFloat(amountInput.value);

            if (amount >= 1 && selectedCountry) {
                estimateLoading.style.display = 'inline';
                quoteDisplay.style.display = 'block';

                debounceTimer = setTimeout(async () => {
                    try {
                        // Map country to currency
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

        // Check if form is valid
        function checkFormValid() {
            const hasCountry = !!selectedCountry;
            const hasBank = !!selectedBank;
            const hasAmount = amountInput.value && parseFloat(amountInput.value) >= 1;

            // Check all dynamic fields
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


// Show crypto withdrawal form (existing functionality)
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

// Handle bank withdrawal submission
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

    // Check if bank selector is visible and bank is required
    const bankSelectGroup = document.getElementById('bankSelectGroup');
    if (bankSelectGroup.style.display !== 'none' && !bankElement.value) {
        showToast('Please select a bank', 'error');
        return;
    }

    // Collect dynamic field values
    const dynamicFields = document.querySelectorAll('.dynamic-field');
    const beneficiaryDetails = {};

    dynamicFields.forEach(field => {
        const fieldName = field.dataset.field || field.name;
        beneficiaryDetails[fieldName] = field.value;
    });

    // Validate that beneficiary details are not empty
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

// Handle traditional crypto withdrawal
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

            // Reload wallet page to show updated balance
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
        // Show loading spinner while loading countries
        window.showLoadingSpinner('Loading deposit options...');

        // Fetch available countries
        const response = await api.getSwitchCountries();

        if (!response.success || !response.data) {
            showToast('Failed to load countries', 'error');
            return;
        }

        const countries = response.data.countries || [];
        window.hideLoadingSpinner();

        // Popular countries at the top
        const popularCountries = ['NG', 'US', 'GB', 'KE', 'GH', 'ZA', 'CA'];
        const sortedCountries = countries.sort((a, b) => {
            const aIndex = popularCountries.indexOf(a.country);
            const bIndex = popularCountries.indexOf(b.country);
            if (aIndex !== -1 && bIndex !== -1) return aIndex - bIndex;
            if (aIndex !== -1) return -1;
            if (bIndex !== -1) return 1;
            return (a.country || '').localeCompare(b.country || '');
        });

        // Country code to name mapping
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

        // Add event listeners
        const countrySelect = document.getElementById('onrampCountry');
        const amountInput = document.getElementById('onrampAmount');
        const getQuoteBtn = document.getElementById('getQuoteBtn');
        const quoteDisplay = document.getElementById('quoteDisplay');

        // Enable button when both fields are filled
        const checkFormValid = () => {
            getQuoteBtn.disabled = !countrySelect.value || !amountInput.value || parseFloat(amountInput.value) < 1;
        };

        countrySelect.addEventListener('change', checkFormValid);
        amountInput.addEventListener('input', checkFormValid);

        // Get quote and execute onramp
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
                // Map country to currency (Switch API requires currency for quotes)
                const currencyMap = {
                    'NG': 'NGN', 'GH': 'GHS', 'KE': 'KES', 'ZA': 'ZAR', 'UG': 'UGX',
                    'US': 'USD', 'GB': 'GBP', 'AE': 'AED', 'BR': 'BRL', 'PH': 'PHP',
                    'MX': 'MXN', 'PL': 'PLN', 'RO': 'RON', 'CZ': 'CZK', 'HU': 'HUF',
                    'NO': 'NOK', 'SE': 'SEK', 'DK': 'DKK'
                };
                // Euro countries
                const euroCountries = ['AD', 'AT', 'BE', 'HR', 'CY', 'EE', 'FI', 'FR', 'DE',
                                      'GR', 'IT', 'LV', 'LT', 'LU', 'MT', 'NL', 'PT', 'SK', 'SI', 'ES'];
                const currency = euroCountries.includes(country) ? 'EUR' : (currencyMap[country] || 'USD');

                // Get quote first
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

                // Show quote
                document.getElementById('quoteFiatAmount').textContent =
                    `${quote.source?.amount || amount} ${quote.source?.currency || 'Local'}`;
                document.getElementById('quoteCryptoAmount').textContent =
                    `${quote.destination?.amount || 0} USDC`;
                document.getElementById('quoteRate').textContent =
                    `1 USDC = ${quote.rate || 'N/A'} ${quote.source?.currency || ''}`;
                quoteDisplay.style.display = 'block';

                // Hide loading spinner
                window.hideLoadingSpinner();

                // Change button to execute
                getQuoteBtn.textContent = 'Proceed to Deposit';
                getQuoteBtn.onclick = async () => {
                    getQuoteBtn.disabled = true;
                    getQuoteBtn.textContent = 'Creating deposit account...';
                    window.showLoadingSpinner('Creating deposit account...');

                    try {
                        // Execute onramp - get virtual account
                        const onrampResponse = await api.requestSwitchOnramp({
                            amount,
                            country,
                            asset: 'solana:usdc'
                        });

                        if (!onrampResponse.success) {
                            throw new Error(onrampResponse.message || 'Failed to create deposit');
                        }

                        const { virtualAccount, quote: finalQuote, instructions } = onrampResponse.data;

                        // Show virtual account details
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

// Swap Modal - Exchange between different stablecoin assets
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

    // Setup event listeners
    const fromAssetSelect = document.getElementById('swapFromAsset');
    const toAssetSelect = document.getElementById('swapToAsset');
    const amountInput = document.getElementById('swapAmount');
    const getQuoteBtn = document.getElementById('getSwapQuoteBtn');
    const submitBtn = document.getElementById('swapSubmitBtn');

    // Enable quote button when all fields are filled
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

    // Get quote button handler
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

// Handle swap form submission
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

export function showPayoutSettings() {
    showToast('Payout settings coming soon!', 'success');
}

export function showTransactionHistory() {
    showToast('Full transaction history coming soon!', 'success');
}

export function showEarningsReport() {
    showToast('Earnings reports coming soon!', 'success');
}
