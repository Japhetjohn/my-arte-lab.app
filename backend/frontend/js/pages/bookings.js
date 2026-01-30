import { appState } from '../state.js';
import { formatDate, formatStatus, getStatusColor } from '../utils.js';
import api from '../services/api.js';

let bookings = [];
let currentFilter = 'all'; // all, active, completed

export async function renderBookingsPage() {
    const mainContent = document.getElementById('mainContent');

    if (!appState.user) {
        mainContent.innerHTML = `
            <div class="empty-state">
                <svg width="64" height="64" viewBox="0 0 24 24" fill="none" style="opacity: 0.4; margin-bottom: 16px;">
                    <rect x="3" y="4" width="18" height="18" rx="2" stroke="currentColor" stroke-width="2"/>
                    <path d="M16 2v4M8 2v4M3 10h18" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
                </svg>
                <h3>Sign in to view your bookings</h3>
                <p>Keep track of all your active and completed jobs</p>
                <button class="btn-primary" onclick="showAuthModal('signin')">Sign in</button>
            </div>
        `;
        return;
    }

    mainContent.innerHTML = `
        <div class="section">
            <div class="container">
                <h1 class="mb-lg">Bookings</h1>
                <div class="text-center" style="padding: 60px 20px;">
                    <svg width="64" height="64" viewBox="0 0 24 24" fill="none" style="opacity: 0.4; margin-bottom: 16px; animation: spin 2s linear infinite;">
                        <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="2" stroke-dasharray="60" stroke-dashoffset="20"/>
                    </svg>
                    <p class="text-secondary">Loading bookings...</p>
                </div>
            </div>
        </div>
    `;

    try {
        // Fetch both bookings and projects
        const [bookingsResp, projectsResp] = await Promise.all([
            api.getBookings(),
            api.getMyProjects()
        ]);

        // Combine bookings and accepted projects
        const regularBookings = bookingsResp.success ? (bookingsResp.data.bookings || []) : [];
        const myProjects = projectsResp.success ? (projectsResp.data.projects || []) : [];

        // Filter projects to only show in_progress and completed ones (accepted projects)
        const activeProjects = myProjects.filter(p => ['in_progress', 'completed'].includes(p.status));

        // Mark projects with a type so we can render them differently
        const projectsAsJobs = activeProjects.map(p => ({
            ...p,
            _type: 'project',
            serviceTitle: p.title,
            status: p.status === 'in_progress' ? 'confirmed' : p.status,
            amount: p.budget?.min || 0,  // Use min budget as amount for display
            client: p.clientId,
            creator: p.selectedCreatorId
        }));

        bookings = [...regularBookings, ...projectsAsJobs];
        renderBookingsList();
    } catch (error) {
        console.error('Failed to load bookings:', error);
        mainContent.innerHTML = `
            <div class="section">
                <div class="container">
                    <div class="empty-state">
                        <svg width="64" height="64" viewBox="0 0 24 24" fill="none" style="opacity: 0.4; margin-bottom: 16px;">
                            <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="2"/>
                            <path d="M12 8v4M12 16h.01" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
                        </svg>
                        <h3>Failed to load bookings</h3>
                        <p>${error.message}</p>
                        <button class="btn-primary" onclick="window.location.reload()">Try again</button>
                    </div>
                </div>
            </div>
        `;
    }
}

function renderBookingsList() {
    const mainContent = document.getElementById('mainContent');

    const activeBookings = bookings.filter(b => !['completed', 'cancelled'].includes(b.status));
    const completedBookings = bookings.filter(b => ['completed', 'cancelled'].includes(b.status));

    // Calculate stats
    const totalEarnings = bookings
        .filter(b => b.status === 'completed')
        .reduce((sum, b) => sum + (b.amount || 0), 0);

    // Filter bookings based on current filter
    let displayBookings = bookings;
    if (currentFilter === 'active') {
        displayBookings = activeBookings;
    } else if (currentFilter === 'completed') {
        displayBookings = completedBookings;
    }

    mainContent.innerHTML = `
        <div class="section">
            <div class="container">
                <!-- Header -->
                <div class="bookings-header-modern">
                    <div>
                        <h1 class="page-title-modern">Bookings</h1>
                        <p class="page-subtitle-modern">Manage all your bookings and track project progress</p>
                    </div>
                </div>

                <!-- Stats Cards -->
                <div class="bookings-stats-grid">
                    <div class="stat-card-booking">
                        <div class="stat-icon-booking" style="background: rgba(151, 71, 255, 0.1); color: var(--primary);">
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                                <rect x="3" y="4" width="18" height="18" rx="2" stroke="currentColor" stroke-width="2"/>
                                <path d="M16 2v4M8 2v4M3 10h18" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
                            </svg>
                        </div>
                        <div class="stat-details-booking">
                            <div class="stat-label-booking">Total Bookings</div>
                            <div class="stat-value-booking">${bookings.length}</div>
                        </div>
                    </div>

                    <div class="stat-card-booking">
                        <div class="stat-icon-booking" style="background: rgba(59, 130, 246, 0.1); color: #3B82F6;">
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                                <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="2"/>
                                <path d="M12 6v6l4 2" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
                            </svg>
                        </div>
                        <div class="stat-details-booking">
                            <div class="stat-label-booking">Active</div>
                            <div class="stat-value-booking">${activeBookings.length}</div>
                        </div>
                    </div>

                    <div class="stat-card-booking">
                        <div class="stat-icon-booking" style="background: rgba(16, 185, 129, 0.1); color: #10B981;">
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                                <path d="M20 6L9 17l-5-5" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                            </svg>
                        </div>
                        <div class="stat-details-booking">
                            <div class="stat-label-booking">Completed</div>
                            <div class="stat-value-booking">${completedBookings.length}</div>
                        </div>
                    </div>

                    <div class="stat-card-booking">
                        <div class="stat-icon-booking" style="background: rgba(16, 185, 129, 0.1); color: #10B981;">
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                                <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
                            </svg>
                        </div>
                        <div class="stat-details-booking">
                            <div class="stat-label-booking">Total Earnings</div>
                            <div class="stat-value-booking">$${totalEarnings.toFixed(2)}</div>
                        </div>
                    </div>
                </div>

                <!-- Filters -->
                <div class="bookings-filters-modern">
                    <button class="filter-btn-booking ${currentFilter === 'all' ? 'active' : ''}" onclick="window.filterBookings('all')">
                        All (${bookings.length})
                    </button>
                    <button class="filter-btn-booking ${currentFilter === 'active' ? 'active' : ''}" onclick="window.filterBookings('active')">
                        Active (${activeBookings.length})
                    </button>
                    <button class="filter-btn-booking ${currentFilter === 'completed' ? 'active' : ''}" onclick="window.filterBookings('completed')">
                        Completed (${completedBookings.length})
                    </button>
                </div>

                <!-- Bookings List -->
                ${displayBookings.length > 0 ? `
                    <div class="bookings-grid-modern">
                        ${displayBookings.map(booking => renderModernBookingCard(booking)).join('')}
                    </div>
                ` : `
                    <div class="empty-state-modern">
                        <svg width="80" height="80" viewBox="0 0 24 24" fill="none">
                            <rect x="3" y="4" width="18" height="18" rx="2" stroke="currentColor" stroke-width="2"/>
                            <path d="M16 2v4M8 2v4M3 10h18" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
                        </svg>
                        <h3>No ${currentFilter === 'all' ? '' : currentFilter} bookings</h3>
                        <p>${currentFilter === 'active' ? 'Your active jobs will appear here' : currentFilter === 'completed' ? 'Your completed jobs will appear here' : 'Your bookings will appear here'}</p>
                        ${appState.user.role === 'client' && currentFilter !== 'completed' ? '<button class="btn-primary" onclick="navigateToPage(\'discover\')">Find Creators</button>' : ''}
                    </div>
                `}
            </div>
        </div>
    `;
}

function renderModernBookingCard(booking) {
    const isCreator = appState.user.role === 'creator';
    const otherPartyName = isCreator ? booking.client?.name || 'Client' : booking.creator?.name || 'Creator';
    const otherPartyAvatar = isCreator
        ? booking.client?.avatar || 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=100&h=100&fit=crop'
        : booking.creator?.avatar || 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=100&h=100&fit=crop';

    const statusColor = getStatusColor(booking.status);

    return `
        <div class="booking-card-modern" onclick="window.viewBookingDetails('${booking._id}')">
            <div class="booking-card-header">
                <div class="booking-user-info">
                    <img src="${otherPartyAvatar}" alt="${otherPartyName}" class="booking-avatar">
                    <div>
                        <div class="booking-name">${otherPartyName}</div>
                        <div class="booking-role">${isCreator ? 'Client' : 'Creator'}</div>
                    </div>
                </div>
                <div class="booking-status-badges">
                    <span class="status-badge-modern" style="background: ${statusColor};">
                        ${formatStatus(booking.status)}
                    </span>
                    ${booking.paymentStatus === 'pending' ? `
                        <span class="payment-badge-modern pending">Payment Pending</span>
                    ` : booking.paymentStatus === 'paid' ? `
                        <span class="payment-badge-modern paid">Paid</span>
                    ` : ''}
                </div>
            </div>

            <div class="booking-card-body">
                <h3 class="booking-title">${booking.serviceTitle}</h3>
                ${booking.bookingId ? `<div class="booking-id">ID: ${booking.bookingId}</div>` : ''}
                <div class="booking-date">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                        <rect x="3" y="4" width="18" height="18" rx="2" stroke="currentColor" stroke-width="2"/>
                        <path d="M16 2v4M8 2v4M3 10h18" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
                    </svg>
                    ${formatDate(booking.startDate || booking.createdAt)}
                </div>
            </div>

            <div class="booking-card-footer">
                <div class="booking-amount">
                    <div class="amount-label">Amount</div>
                    <div class="amount-value">USDC ${booking.amount.toFixed(2)}</div>
                </div>
                <button class="view-details-btn" onclick="event.stopPropagation(); window.viewBookingDetails('${booking._id}')">
                    View Details
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                        <path d="M5 12h14M12 5l7 7-7 7" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                    </svg>
                </button>
            </div>
        </div>
    `;
}

window.filterBookings = function(filter) {
    currentFilter = filter;
    renderBookingsList();
};

window.viewBookingDetails = async function(bookingId) {
    try {
        const response = await api.getBookingDetails(bookingId);

        if (response.success) {
            const booking = response.data.booking;
            const isCreator = appState.user.role === 'creator';
            const unreadCount = booking.messages?.filter(m =>
                !m.read && m.sender.toString() !== appState.user._id
            ).length || 0;

            const modalContent = `
                <div class="modal" onclick="closeModalOnBackdrop(event)">
                    <div class="modal-content" style="max-width: 700px; max-height: 90vh; overflow-y: auto;">
                        <div class="modal-header">
                            <h2>Booking Details ${unreadCount > 0 ? `<span class="tag" style="background: #FF6B35; color: white; font-size: 12px; margin-left: 8px;">${unreadCount} new</span>` : ''}</h2>
                            <button class="icon-btn" onclick="closeModal()">
                                <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                                    <path d="M18 6L6 18M6 6l12 12" stroke="currentColor" stroke-width="2"/>
                                </svg>
                            </button>
                        </div>

                        <div style="padding: 20px;">
                            <!-- Status Banner -->
                            ${booking.status === 'pending' && isCreator ? `
                                <div style="background: #FEF3C7; padding: 16px; border-radius: 12px; margin-bottom: 20px; border-left: 4px solid #F59E0B;">
                                    <div style="color: #92400E; font-weight: 600; margin-bottom: 8px;">Action Required</div>
                                    <div style="color: #78350F; font-size: 14px; margin-bottom: 12px;">
                                        Review this booking request and decide whether to accept, reject, or make a counter proposal.
                                    </div>
                                    <div style="display: flex; gap: 8px; flex-wrap: wrap;" id="actionButtons">
                                        <button class="btn-primary" style="flex: 1; min-width: 120px;" onclick="window.acceptBookingRequest('${booking._id}')">Accept</button>
                                        <button class="btn-secondary" style="flex: 1; min-width: 120px;" onclick="window.showCounterProposalForm('${booking._id}')">Counter Proposal</button>
                                        <button class="btn-ghost" style="color: #EF4444; flex: 1; min-width: 120px;" onclick="window.showRejectForm('${booking._id}')">Reject</button>
                                    </div>
                                    <div id="counterProposalForm" style="display: none; margin-top: 16px; padding: 16px; background: rgba(59, 130, 246, 0.05); border-radius: 8px;">
                                        <div style="font-weight: 600; margin-bottom: 12px; color: #1E40AF;">Enter Counter Proposal Amount</div>
                                        <div style="display: flex; gap: 8px; align-items: flex-end;">
                                            <div style="flex: 1;">
                                                <input type="number" id="counterAmount" class="form-input" placeholder="Enter amount in USDC" step="0.01" min="0" style="margin: 0;">
                                            </div>
                                            <button class="btn-primary" onclick="window.submitCounterProposal('${booking._id}', document.getElementById('counterAmount').value)">Submit</button>
                                            <button class="btn-ghost" onclick="document.getElementById('counterProposalForm').style.display='none'; document.getElementById('actionButtons').style.display='flex';">Cancel</button>
                                        </div>
                                    </div>
                                    <div id="rejectForm" style="display: none; margin-top: 16px; padding: 16px; background: rgba(239, 68, 68, 0.05); border-radius: 8px;">
                                        <div style="font-weight: 600; margin-bottom: 12px; color: #991B1B;">Reason for Rejection (Optional)</div>
                                        <div style="display: flex; flex-direction: column; gap: 8px;">
                                            <textarea id="rejectReason" class="form-input" placeholder="Enter reason..." rows="3" style="margin: 0;"></textarea>
                                            <div style="display: flex; gap: 8px;">
                                                <button class="btn-primary" style="background: #EF4444; flex: 1;" onclick="window.submitRejection('${booking._id}', document.getElementById('rejectReason').value)">Reject Booking</button>
                                                <button class="btn-ghost" onclick="document.getElementById('rejectForm').style.display='none'; document.getElementById('actionButtons').style.display='flex';">Cancel</button>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ` : ''}

                            ${booking.counterProposal ? `
                                <div style="background: #EFF6FF; padding: 16px; border-radius: 12px; margin-bottom: 20px; border-left: 4px solid #3B82F6;">
                                    <div style="color: #1E40AF; font-weight: 600; margin-bottom: 4px;">Counter Proposal</div>
                                    <div style="color: #1E3A8A; font-size: 14px;">
                                        Creator proposed: USDC ${booking.counterProposal.amount.toFixed(2)}
                                        <div class="caption">Proposed ${formatDate(booking.counterProposal.proposedAt)}</div>
                                    </div>
                                </div>
                            ` : ''}

                            <div style="background: var(--surface); padding: 16px; border-radius: 12px; margin-bottom: 20px;">
                                <div class="caption" style="color: var(--text-secondary); margin-bottom: 4px;">Booking ID</div>
                                <div style="font-weight: 600;">${booking.bookingId}</div>
                            </div>

                            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 16px;">
                                <div>
                                    <div class="caption" style="color: var(--text-secondary); margin-bottom: 4px;">${isCreator ? 'Client' : 'Creator'}</div>
                                    <div style="font-weight: 600;">${isCreator ? booking.client?.name : booking.creator?.name}</div>
                                </div>
                                <div>
                                    <div class="caption" style="color: var(--text-secondary); margin-bottom: 4px;">Status</div>
                                    <span class="tag" style="background: ${getStatusColor(booking.status)}; color: white;">
                                        ${formatStatus(booking.status)}
                                    </span>
                                </div>
                            </div>

                            <div class="form-group">
                                <label class="form-label">Service</label>
                                <div style="font-weight: 600;">${booking.serviceTitle}</div>
                                <div class="caption" style="margin-top: 4px;">${booking.serviceDescription}</div>
                            </div>

                            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 16px;">
                                <div>
                                    <div class="caption" style="color: var(--text-secondary); margin-bottom: 4px;">Amount</div>
                                    <div style="font-size: 20px; font-weight: 700; color: var(--primary);">USDC ${booking.amount.toFixed(2)}</div>
                                </div>
                                <div>
                                    <div class="caption" style="color: var(--text-secondary); margin-bottom: 4px;">Payment</div>
                                    <span class="tag" style="background: ${booking.paymentStatus === 'paid' ? '#10B981' : '#FFA500'}; color: white;">
                                        ${booking.paymentStatus}
                                    </span>
                                </div>
                            </div>

                            ${booking.paymentStatus === 'pending' && booking.escrowWallet?.address && !isCreator && booking.status === 'confirmed' ? `
                                <div style="background: var(--primary); color: white; padding: 16px; border-radius: 12px; margin: 20px 0;">
                                    <div style="font-weight: 600; margin-bottom: 8px;">Pay for this booking</div>
                                    <div style="font-size: 14px; opacity: 0.9; margin-bottom: 12px;">Send USDC ${booking.amount.toFixed(2)} to:</div>
                                    <div style="background: rgba(0,0,0,0.2); padding: 12px; border-radius: 8px; word-break: break-all; font-family: monospace; font-size: 13px;">
                                        ${booking.escrowWallet.address}
                                    </div>
                                    <button class="btn-secondary" style="margin-top: 12px; width: 100%; border-color: white; color: white;" onclick="navigator.clipboard.writeText('${booking.escrowWallet.address}').then(() => showToast('Address copied!', 'success'))">
                                        Copy Address
                                    </button>
                                </div>
                            ` : ''}

                            <!-- Messages Section -->
                            <div style="margin: 24px 0;">
                                <h3 style="margin-bottom: 12px; display: flex; align-items: center; gap: 8px;">
                                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                                        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" stroke="currentColor" stroke-width="2"/>
                                    </svg>
                                    Messages
                                </h3>
                                <div id="messagesContainer" style="background: var(--surface); border-radius: 12px; padding: 16px; max-height: 300px; overflow-y: auto; margin-bottom: 12px;">
                                    ${booking.messages && booking.messages.length > 0 ?
                                        booking.messages.map(msg => {
                                            const isMine = msg.sender.toString() === appState.user._id;
                                            return `
                                                <div style="display: flex; justify-content: ${isMine ? 'flex-end' : 'flex-start'}; margin-bottom: 12px;">
                                                    <div style="max-width: 70%; background: ${isMine ? 'var(--primary)' : '#f5f5f5'}; color: ${isMine ? 'white' : 'inherit'}; padding: 10px 14px; border-radius: 12px;">
                                                        <div style="font-size: 14px;">${msg.message}</div>
                                                        <div style="font-size: 11px; opacity: 0.7; margin-top: 4px;">${formatDate(msg.timestamp)}</div>
                                                    </div>
                                                </div>
                                            `;
                                        }).join('')
                                        : '<div class="text-secondary" style="text-align: center; padding: 20px;">No messages yet</div>'
                                    }
                                </div>
                                <form onsubmit="window.sendBookingMessage(event, '${booking._id}')" style="display: flex; gap: 8px;">
                                    <input type="text" id="messageInput" class="form-input" placeholder="Type a message..." required style="flex: 1;">
                                    <button type="submit" class="btn-primary" style="padding: 10px 20px;">Send</button>
                                </form>
                            </div>

                            <!-- Action Buttons -->
                            ${isCreator && booking.status === 'in_progress' ? `
                                <button class="btn-primary" style="width: 100%; margin-top: 16px;" onclick="window.completeBooking('${booking._id}')">
                                    Mark as Completed
                                </button>
                            ` : ''}

                            ${!isCreator && booking.status === 'completed' && !booking.fundsReleased ? `
                                <button class="btn-primary" style="width: 100%; margin-top: 16px;" onclick="window.releasePayment('${booking._id}')">
                                    Release Payment to Creator
                                </button>
                            ` : ''}
                        </div>
                    </div>
                </div>
            `;

            document.getElementById('modalsContainer').innerHTML = modalContent;
            document.body.style.overflow = 'hidden';

            const messagesContainer = document.getElementById('messagesContainer');
            if (messagesContainer) {
                messagesContainer.scrollTop = messagesContainer.scrollHeight;
            }
        }
    } catch (error) {
        console.error('Failed to load booking details:', error);
        alert('Failed to load booking details');
    }
};

window.completeBooking = async function(bookingId) {
    if (!confirm('Are you sure you want to mark this booking as completed?')) return;

    try {
        const response = await api.completeBooking(bookingId);

        if (response.success) {
            closeModal();
            await renderBookingsPage();
            showToast('Booking marked as completed!', 'success');
        }
    } catch (error) {
        console.error('Failed to complete booking:', error);
        showToast(error.message || 'Failed to complete booking', 'error');
    }
};

window.releasePayment = async function(bookingId) {
    if (!confirm('Are you sure you want to release payment to the creator?')) return;

    try {
        const response = await api.releasePayment(bookingId);

        if (response.success) {
            closeModal();
            await renderBookingsPage();
            showToast('Payment released successfully!', 'success');
        }
    } catch (error) {
        console.error('Failed to release payment:', error);
        showToast(error.message || 'Failed to release payment', 'error');
    }
};

window.sendBookingMessage = async function(event, bookingId) {
    event.preventDefault();
    const messageInput = document.getElementById('messageInput');
    const message = messageInput.value.trim();

    if (!message) return;

    try {
        const response = await api.addBookingMessage(bookingId, message);

        if (response.success) {
            messageInput.value = '';
            await window.viewBookingDetails(bookingId);
            showToast('Message sent!', 'success');
        }
    } catch (error) {
        console.error('Failed to send message:', error);
        showToast(error.message || 'Failed to send message', 'error');
    }
};

window.acceptBookingRequest = async function(bookingId) {
    if (!confirm('Accept this booking request?')) return;

    try {
        const response = await api.acceptBooking(bookingId);

        if (response.success) {
            closeModal();
            await renderBookingsPage();
            showToast('Booking accepted! Client will be notified.', 'success');
        }
    } catch (error) {
        console.error('Failed to accept booking:', error);
        showToast(error.message || 'Failed to accept booking', 'error');
    }
};

window.showRejectForm = function(bookingId) {
    document.getElementById('actionButtons').style.display = 'none';
    document.getElementById('counterProposalForm').style.display = 'none';
    document.getElementById('rejectForm').style.display = 'block';
};

window.submitRejection = async function(bookingId, reason) {
    try {
        const response = await api.rejectBooking(bookingId, reason || '');

        if (response.success) {
            closeModal();
            await renderBookingsPage();
            showToast('Booking rejected. Client has been notified.', 'success');
        }
    } catch (error) {
        console.error('Failed to reject booking:', error);
        showToast(error.message || 'Failed to reject booking', 'error');
    }
};

window.showCounterProposalForm = function(bookingId) {
    document.getElementById('actionButtons').style.display = 'none';
    document.getElementById('rejectForm').style.display = 'none';
    document.getElementById('counterProposalForm').style.display = 'block';
    setTimeout(() => document.getElementById('counterAmount').focus(), 100);
};

window.submitCounterProposal = async function(bookingId, amount) {
    const parsedAmount = parseFloat(amount);

    if (!amount || isNaN(parsedAmount) || parsedAmount <= 0) {
        showToast('Please enter a valid amount', 'error');
        return;
    }

    try {
        const response = await api.counterProposal(bookingId, parsedAmount);

        if (response.success) {
            closeModal();
            await renderBookingsPage();
            showToast('Counter proposal sent! Client will be notified.', 'success');
        }
    } catch (error) {
        console.error('Failed to send counter proposal:', error);
        showToast(error.message || 'Failed to send counter proposal', 'error');
    }
};
