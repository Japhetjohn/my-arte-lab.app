import { appState } from '../state.js';
import { formatDate, formatStatus, getStatusColor } from '../utils.js';
import api from '../services/api.js';

let bookings = [];
let currentFilter = 'all'; // all, active, completed

export async function renderBookingsPage() {
    const mainContent = document.getElementById('mainContent');

    if (!appState.user) {
        mainContent.innerHTML = `
            <div class="empty-state glass-effect" style="margin: 40px auto; max-width: 500px; border-radius: 24px; padding: 40px 20px;">
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
                <div class="text-center glass-effect" style="padding: 60px 20px; border-radius: 24px; max-width: 400px; margin: 0 auto;">
                    <svg width="64" height="64" viewBox="0 0 24 24" fill="none" style="opacity: 0.8; margin-bottom: 16px; animation: spin 2s linear infinite; color: var(--primary);">
                        <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="2" stroke-dasharray="60" stroke-dashoffset="20"/>
                    </svg>
                    <p class="text-secondary" style="font-weight: 500;">Loading bookings...</p>
                </div>
            </div>
        </div>
    `;

    try {
        const [bookingsResp, projectsResp] = await Promise.all([
            api.getBookings(),
            api.getMyProjects()
        ]);

        const regularBookings = bookingsResp.success ? (bookingsResp.data.bookings || []) : [];
        const myProjects = projectsResp.success ? (projectsResp.data.projects || []) : [];

        const activeProjects = myProjects.filter(p => ['awaiting_payment', 'in_progress', 'delivered', 'completed'].includes(p.status));

        const projectsAsJobs = activeProjects.map(p => ({
            ...p,
            _type: 'project',
            serviceTitle: p.title,
            status: p.status,
            amount: p.acceptedAmount || p.budget?.min || 0,
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
                    <div class="empty-state glass-effect" style="margin: 40px auto; max-width: 500px; border-radius: 24px; padding: 40px 20px; border-color: rgba(239, 68, 68, 0.3);">
                        <svg width="64" height="64" viewBox="0 0 24 24" fill="none" style="opacity: 0.4; margin-bottom: 16px; color: var(--error);">
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

    const totalEarnings = bookings
        .filter(b => b.status === 'completed')
        .reduce((sum, b) => sum + (b.amount || 0), 0);

    let displayBookings = bookings;
    if (currentFilter === 'active') {
        displayBookings = activeBookings;
    } else if (currentFilter === 'completed') {
        displayBookings = completedBookings;
    }

    mainContent.innerHTML = `
        <div class="section">
            <div class="container">
                <div class="bookings-header-modern glass-effect" style="padding: 24px; border-radius: 20px; border: 1px solid rgba(255,255,255,0.5);">
                    <div>
                        <h1 class="page-title-modern">Bookings</h1>
                        <p class="page-subtitle-modern">Manage all your bookings and track project progress</p>
                    </div>
                </div>

                <div class="bookings-stats-grid">
                    <div class="stat-card-booking glass-effect" style="border-radius: 16px; border: 1px solid rgba(255,255,255,0.5);">
                        <div class="stat-icon-booking" style="background: rgba(151, 71, 255, 0.15); color: var(--primary); backdrop-filter: blur(4px);">
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                                <rect x="3" y="4" width="18" height="18" rx="2" stroke="currentColor" stroke-width="2"/>
                                <path d="M16 2v4M8 2v4M3 10h18" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
                            </svg>
                        </div>
                        <div class="stat-details-booking">
                            <div class="stat-label-booking" style="font-weight: 500;">Total Bookings</div>
                            <div class="stat-value-booking">${bookings.length}</div>
                        </div>
                    </div>

                    <div class="stat-card-booking glass-effect" style="border-radius: 16px; border: 1px solid rgba(255,255,255,0.5);">
                        <div class="stat-icon-booking" style="background: rgba(59, 130, 246, 0.15); color: #3B82F6; backdrop-filter: blur(4px);">
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                                <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="2"/>
                                <path d="M12 6v6l4 2" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
                            </svg>
                        </div>
                        <div class="stat-details-booking">
                            <div class="stat-label-booking" style="font-weight: 500;">Active</div>
                            <div class="stat-value-booking">${activeBookings.length}</div>
                        </div>
                    </div>

                    <div class="stat-card-booking glass-effect" style="border-radius: 16px; border: 1px solid rgba(255,255,255,0.5);">
                        <div class="stat-icon-booking" style="background: rgba(16, 185, 129, 0.15); color: #10B981; backdrop-filter: blur(4px);">
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                                <path d="M20 6L9 17l-5-5" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                            </svg>
                        </div>
                        <div class="stat-details-booking">
                            <div class="stat-label-booking" style="font-weight: 500;">Completed</div>
                            <div class="stat-value-booking">${completedBookings.length}</div>
                        </div>
                    </div>

                    <div class="stat-card-booking glass-effect" style="border-radius: 16px; border: 1px solid rgba(255,255,255,0.5);">
                        <div class="stat-icon-booking" style="background: rgba(34, 197, 94, 0.15); color: #10B981; backdrop-filter: blur(4px);">
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                                <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
                            </svg>
                        </div>
                        <div class="stat-details-booking">
                            <div class="stat-label-booking" style="font-weight: 500;">Total Earnings</div>
                            <div class="stat-value-booking">$${totalEarnings.toFixed(2)}</div>
                        </div>
                    </div>
                </div>

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

                ${displayBookings.length > 0 ? `
                    <div class="bookings-grid-modern">
                        ${displayBookings.map(booking => renderModernBookingCard(booking)).join('')}
                    </div>
                ` : `
                    <div class="empty-state-modern glass-effect" style="padding: 60px 20px; border-radius: 24px; border: 1px solid rgba(255,255,255,0.4);">
                        <svg width="80" height="80" viewBox="0 0 24 24" fill="none" style="opacity: 0.3; margin-bottom: 16px;">
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
        <div class="booking-card-modern glass-effect" style="border-radius: 16px; border: 1px solid rgba(255,255,255,0.5); cursor: pointer;" onclick="window.viewBookingDetails('${booking._id}')">
            <div class="booking-card-header" style="border-bottom: 1px solid rgba(255,255,255,0.3);">
                <div class="booking-user-info">
                    <img src="${otherPartyAvatar}" alt="${otherPartyName}" class="booking-avatar" style="border-color: rgba(255,255,255,0.6);">
                    <div>
                        <div class="booking-name">${otherPartyName}</div>
                        <div class="booking-role">${isCreator ? 'Client' : 'Creator'}</div>
                    </div>
                </div>
                <div class="booking-status-badges">
                    <span class="status-badge-modern" style="background: ${statusColor}dd; backdrop-filter: blur(4px); color: white;">
                        ${formatStatus(booking.status)}
                    </span>
                    ${booking.paymentStatus === 'pending' ? `
                        <span class="payment-badge-modern pending" style="background: rgba(245, 158, 11, 0.2); backdrop-filter: blur(4px);">Payment Pending</span>
                    ` : booking.paymentStatus === 'paid' ? `
                        <span class="payment-badge-modern paid" style="background: rgba(16, 185, 129, 0.2); backdrop-filter: blur(4px);">Paid</span>
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

            <div class="booking-card-footer" style="border-top: 1px solid rgba(255,255,255,0.3);">
                <div class="booking-amount">
                    <div class="amount-label">Amount</div>
                    <div class="amount-value">USDC ${booking.amount ? booking.amount.toFixed(2) : '0.00'}</div>
                </div>
                <button class="view-details-btn" onclick="event.stopPropagation(); window.viewBookingDetails('${booking._id}')" style="background: rgba(151, 71, 255, 0.9); backdrop-filter: blur(4px);">
                    View Details
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                        <path d="M5 12h14M12 5l7 7-7 7" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                    </svg>
                </button>
            </div>
        </div>
    `;
}

window.filterBookings = function (filter) {
    currentFilter = filter;
    renderBookingsList();
};

window.viewBookingDetails = async function (bookingId) {
    try {
        // Find the booking in our local array to determine its type
        const localItem = bookings.find(b => b._id === bookingId);
        const type = localItem ? localItem._type : 'booking';

        let response;
        if (type === 'project') {
            response = await api.getProject(bookingId);
        } else {
            response = await api.getBookingDetails(bookingId);
        }

        if (response.success) {
            const booking = type === 'project' ? response.data.project : response.data.booking;
            booking._type = type; // Ensure type is preserved

            const isCreator = appState.user.role === 'creator';
            const unreadCount = booking.messages?.filter(m =>
                !m.read && m.sender.toString() !== appState.user._id
            ).length || 0;

            const modalContent = `
                <div class="modal" onclick="closeModalOnBackdrop(event)">
                    <div class="modal-content glass-effect" style="max-width: 700px; max-height: 90vh; overflow-y: auto; border: 1px solid rgba(255,255,255,0.6); box-shadow: 0 12px 48px rgba(0,0,0,0.15);">
                        <div class="modal-header" style="border-bottom: 1px solid rgba(255,255,255,0.3); background: transparent;">
                            <h2>Booking Details ${unreadCount > 0 ? `<span class="tag" style="background: #FF6B35; color: white; font-size: 12px; margin-left: 8px;">${unreadCount} new</span>` : ''}</h2>
                            <button class="icon-btn" onclick="closeModal()" style="background: rgba(255,255,255,0.2);">
                                <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                                    <path d="M18 6L6 18M6 6l12 12" stroke="currentColor" stroke-width="2"/>
                                </svg>
                            </button>
                        </div>

                        <div style="padding: 20px;">
                            <div class="booking-journey-container" style="margin-bottom: 24px; padding: 16px; background: rgba(255,255,255,0.4); border-radius: 16px; border: 1px solid rgba(255,255,255,0.5);">
                                <div style="font-size: 13px; font-weight: 700; color: var(--text-secondary); margin-bottom: 16px; text-transform: uppercase; letter-spacing: 0.5px;">Booking Journey</div>
                                <div class="booking-steps-visual" style="display: flex; justify-content: space-between; position: relative;">
                                    <div style="position: absolute; top: 10px; left: 0; right: 0; height: 2px; background: var(--border); z-index: 1;"></div>
                                    
                                    ${['pending', 'awaiting_payment', 'confirmed', 'delivered', 'completed'].map((s, i) => {
                const statuses = ['pending', 'awaiting_payment', 'confirmed', 'delivered', 'completed'];
                const currentIdx = statuses.indexOf(booking.status);
                const isDone = statuses.indexOf(s) < currentIdx || booking.status === 'completed';
                const isActive = s === booking.status;
                const label = s === 'pending' ? 'Request' :
                    s === 'awaiting_payment' ? 'Acceptance' :
                        s === 'confirmed' ? 'Payment' :
                            s === 'delivered' ? 'Work' : 'Done';

                return `
                                            <div style="display: flex; flex-direction: column; align-items: center; gap: 6px; z-index: 2; flex: 1; position: relative;">
                                                <div style="width: 22px; height: 22px; border-radius: 50%; background: ${isDone ? 'var(--primary)' : isActive ? 'white' : 'var(--border)'}; border: 2px solid ${isDone || isActive ? 'var(--primary)' : 'var(--border)'}; display: flex; align-items: center; justify-content: center; color: ${isDone ? 'white' : 'var(--primary)'}; font-size: 10px; box-shadow: ${isActive ? '0 0 10px var(--primary)' : 'none'}; transition: all 0.3s ease;">
                                                    ${isDone ? '✓' : i + 1}
                                                </div>
                                                <div style="font-size: 10px; font-weight: ${isActive ? '700' : '500'}; color: ${isActive ? 'var(--primary)' : 'var(--text-secondary)'}; text-align: center; white-space: nowrap;">${label}</div>
                                            </div>
                                        `;
            }).join('')}
                                </div>
                            </div>

                            ${booking.status === 'pending' && isCreator ? `
                                <div style="background: rgba(254, 243, 199, 0.6); backdrop-filter: blur(8px); padding: 16px; border-radius: 12px; margin-bottom: 20px; border-left: 4px solid #F59E0B; border-right: 1px solid rgba(255,255,255,0.5); border-top: 1px solid rgba(255,255,255,0.5); border-bottom: 1px solid rgba(255,255,255,0.5);">
                                    <div style="color: #92400E; font-weight: 600; margin-bottom: 8px;">Action Required</div>
                                    <div style="color: #78350F; font-size: 14px; margin-bottom: 12px;">
                                        Review this booking request and decide whether to accept, reject, or make a counter proposal.
                                    </div>
                                    <div style="display: flex; gap: 8px; flex-wrap: wrap;" id="actionButtons">
                                        <button class="btn-primary" style="flex: 1; min-width: 120px;" onclick="window.acceptBookingRequest('${booking._id}')">Accept</button>
                                        <button class="btn-secondary" style="flex: 1; min-width: 120px; background: rgba(255,255,255,0.5);" onclick="window.showCounterProposalForm('${booking._id}')">Counter Proposal</button>
                                        <button class="btn-ghost" style="color: #EF4444; flex: 1; min-width: 120px;" onclick="window.showRejectForm('${booking._id}')">Reject</button>
                                    </div>
                                    <div id="counterProposalForm" style="display: none; margin-top: 16px; padding: 16px; background: rgba(59, 130, 246, 0.1); border-radius: 8px;">
                                        <div style="font-weight: 600; margin-bottom: 12px; color: #1E40AF;">Enter Counter Proposal Amount</div>
                                        <div style="display: flex; gap: 8px; align-items: flex-end;">
                                            <div style="flex: 1;">
                                                <input type="number" id="counterAmount" class="form-input" placeholder="Enter amount in USDC" step="0.01" min="0" style="margin: 0; background: rgba(255,255,255,0.5);">
                                            </div>
                                            <button class="btn-primary" onclick="window.submitCounterProposal('${booking._id}', document.getElementById('counterAmount').value)">Submit</button>
                                            <button class="btn-ghost" onclick="document.getElementById('counterProposalForm').style.display='none'; document.getElementById('actionButtons').style.display='flex';">Cancel</button>
                                        </div>
                                    </div>
                                    <div id="rejectForm" style="display: none; margin-top: 16px; padding: 16px; background: rgba(239, 68, 68, 0.1); border-radius: 8px;">
                                        <div style="font-weight: 600; margin-bottom: 12px; color: #991B1B;">Reason for Rejection (Optional)</div>
                                        <div style="display: flex; flex-direction: column; gap: 8px;">
                                            <textarea id="rejectReason" class="form-input" placeholder="Enter reason..." rows="3" style="margin: 0; background: rgba(255,255,255,0.5);"></textarea>
                                            <div style="display: flex; gap: 8px;">
                                                <button class="btn-primary" style="background: #EF4444; flex: 1;" onclick="window.submitRejection('${booking._id}', document.getElementById('rejectReason').value)">Reject Booking</button>
                                                <button class="btn-ghost" onclick="document.getElementById('rejectForm').style.display='none'; document.getElementById('actionButtons').style.display='flex';">Cancel</button>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ` : ''}

                            ${booking.counterProposal ? `
                                <div style="background: rgba(239, 246, 255, 0.6); backdrop-filter: blur(8px); padding: 16px; border-radius: 12px; margin-bottom: 20px; border-left: 4px solid #3B82F6; border-right: 1px solid rgba(255,255,255,0.5); border-top: 1px solid rgba(255,255,255,0.5); border-bottom: 1px solid rgba(255,255,255,0.5);">
                                    <div style="color: #1E40AF; font-weight: 600; margin-bottom: 4px;">Counter Proposal</div>
                                    <div style="color: #1E3A8A; font-size: 14px;">
                                        Creator proposed: USDC ${booking.counterProposal?.amount ? booking.counterProposal.amount.toFixed(2) : '0.00'}
                                        <div class="caption">Proposed ${formatDate(booking.counterProposal.proposedAt)}</div>
                                    </div>
                                </div>
                            ` : ''}

                            <div style="background: rgba(255,255,255,0.4); padding: 16px; border-radius: 12px; margin-bottom: 20px; border: 1px solid rgba(255,255,255,0.5);">
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
                                    <span class="tag" style="background: ${getStatusColor(booking.status)}dd; backdrop-filter: blur(4px); color: white;">
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
                                    <div style="font-size: 20px; font-weight: 700; color: var(--primary);">USDC ${booking.amount ? booking.amount.toFixed(2) : '0.00'}</div>
                                </div>
                                <div>
                                    <div class="caption" style="color: var(--text-secondary); margin-bottom: 4px;">Payment</div>
                                    <span class="tag" style="background: ${booking.paymentStatus === 'paid' ? '#10B981' : '#FFA500'}dd; backdrop-filter: blur(4px); color: white;">
                                        ${booking.paymentStatus}
                                    </span>
                                </div>
                            </div>

                            ${booking.paymentStatus === 'pending' && booking.escrowWallet?.address && !isCreator && booking.status === 'confirmed' ? `
                                <div style="background: rgba(151, 71, 255, 0.85); backdrop-filter: blur(8px); color: white; padding: 16px; border-radius: 12px; margin: 20px 0; border: 1px solid rgba(255,255,255,0.3);">
                                    <div style="font-weight: 600; margin-bottom: 8px;">Pay for this booking</div>
                                    <div style="font-size: 14px; opacity: 0.9; margin-bottom: 12px;">Send USDC ${booking.amount ? booking.amount.toFixed(2) : '0.00'} to:</div>
                                    <div style="background: rgba(0,0,0,0.3); padding: 12px; border-radius: 8px; word-break: break-all; font-family: monospace; font-size: 13px;">
                                        ${booking.escrowWallet.address}
                                    </div>
                                    <button class="btn-secondary" style="margin-top: 12px; width: 100%; border-color: rgba(255,255,255,0.6); color: white; background: rgba(255,255,255,0.1);" onclick="navigator.clipboard.writeText('${booking.escrowWallet.address}').then(() => showToast('Address copied!', 'success'))">
                                        Copy Address
                                    </button>
                                </div>
                            ` : ''}

                            ${booking.status === 'awaiting_payment' && !isCreator ? `
                                <div style="background: rgba(239, 246, 255, 0.6); backdrop-filter: blur(8px); padding: 16px; border-radius: 12px; margin: 20px 0; border: 1px solid rgba(191, 219, 254, 0.8);">
                                    <div style="font-weight: 600; color: #1E40AF; margin-bottom: 8px;">Waiting for Payment</div>
                                    <div style="font-size: 14px; color: #1E3A8A; margin-bottom: 12px;">
                                        The creator has accepted your request. Please pay the amount to hold it in escrow and start the job.
                                    </div>
                                    <button class="btn-primary" style="width: 100%;" onclick="window.processBookingPayment('${booking._id}', '${booking._type}')">
                                        Proceed to Payment (USDC ${booking.amount ? booking.amount.toFixed(2) : '0.00'})
                                    </button>
                                </div>
                            ` : ''}

                            ${booking.status === 'in_progress' && isCreator ? `
                                <div style="background: rgba(240, 253, 244, 0.6); backdrop-filter: blur(8px); padding: 16px; border-radius: 12px; margin: 20px 0; border: 1px solid rgba(187, 247, 208, 0.8);">
                                    <div style="font-weight: 600; color: #166534; margin-bottom: 8px;">Submit Your Work</div>
                                    <div style="font-size: 14px; color: #14532D; margin-bottom: 12px;">
                                        The client has paid. You can now start the work. Once finished, submit the link to your deliverables below.
                                    </div>
                                    <div class="form-group" style="margin-bottom: 12px;">
                                        <input type="url" id="deliverableUrl" class="form-input" placeholder="Link to deliverables (Google Drive, Dropbox, etc.)" style="margin: 0; background: rgba(255,255,255,0.6);">
                                    </div>
                                    <div class="form-group" style="margin-bottom: 12px;">
                                        <textarea id="deliverableNotes" class="form-input" placeholder="Any notes for the client..." rows="2" style="margin: 0; background: rgba(255,255,255,0.6);"></textarea>
                                    </div>
                                    <button class="btn-primary" style="width: 100%;" onclick="window.submitDeliverable('${booking._id}', '${booking._type}')">
                                        Submit Work
                                    </button>
                                </div>
                            ` : ''}

                            ${booking.status === 'delivered' && !isCreator ? `
                                <div style="background: rgba(240, 253, 244, 0.6); backdrop-filter: blur(8px); padding: 16px; border-radius: 12px; margin: 20px 0; border: 1px solid rgba(187, 247, 208, 0.8);">
                                    <div style="font-weight: 600; color: #166534; margin-bottom: 8px;">Review Deliverables</div>
                                    <div style="font-size: 14px; color: #14532D; margin-bottom: 12px;">
                                        The creator has submitted their work. Please review it and approve to release the funds.
                                    </div>
                                    ${booking.attachments && booking.attachments.length > 0 ? `
                                        <div style="margin-bottom: 12px;">
                                            <strong>Deliverables:</strong><br>
                                            <a href="${booking.attachments[booking.attachments.length - 1].url}" target="_blank" class="btn-ghost" style="display: inline-flex; align-items: center; gap: 8px; margin-top: 8px; background: rgba(255,255,255,0.5);">
                                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M12 15V3m0 12l-4-4m4 4l4-4M2 17l.621 2.485A2 2 0 0 0 4.561 21h14.878a2 2 0 0 0 1.94-1.515L22 17" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>
                                                View Deliverable
                                            </a>
                                        </div>
                                    ` : ''}
                                    <button class="btn-primary" style="width: 100%;" onclick="window.releasePayment('${booking._id}', '${booking._type}')">
                                        Approve and Release Funds
                                    </button>
                                </div>
                            ` : ''}

                            <div style="margin: 24px 0;">
                                <h3 style="margin-bottom: 12px; display: flex; align-items: center; gap: 8px;">
                                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                                        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" stroke="currentColor" stroke-width="2"/>
                                    </svg>
                                    Messages
                                </h3>
                                <div id="messagesContainer" style="background: rgba(255,255,255,0.3); border: 1px solid rgba(255,255,255,0.4); border-radius: 12px; padding: 16px; max-height: 300px; overflow-y: auto; margin-bottom: 12px;">
                                    ${booking.messages && booking.messages.length > 0 ?
                    booking.messages.map(msg => {
                        const isMine = msg.sender.toString() === appState.user._id;
                        return `
                                                <div style="display: flex; justify-content: ${isMine ? 'flex-end' : 'flex-start'}; margin-bottom: 12px;">
                                                    <div style="max-width: 70%; background: ${isMine ? 'var(--primary)' : 'rgba(255,255,255,0.7)'}; backdrop-filter: blur(4px); color: ${isMine ? 'white' : 'inherit'}; padding: 10px 14px; border-radius: 12px; box-shadow: 0 2px 8px rgba(0,0,0,0.05);">
                                                        <div style="font-size: 14px;">${msg.message}</div>
                                                        <div style="font-size: 11px; opacity: 0.7; margin-top: 4px;">${formatDate(msg.timestamp)}</div>
                                                    </div>
                                                </div>
                                            `;
                    }).join('')
                    : '<div class="text-secondary" style="text-align: center; padding: 20px;">No messages yet</div>'
                }
                                </div>
                                <form onsubmit="window.sendBookingMessage(event, '${booking._id}', '${booking._type}')" style="display: flex; gap: 8px;">
                                    <input type="text" id="messageInput" class="form-input" placeholder="Type a message..." required style="flex: 1; background: rgba(255,255,255,0.5);">
                                    <button type="submit" class="btn-primary" style="padding: 10px 20px;">Send</button>
                                </form>
                            </div>
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

window.completeBooking = async function (bookingId) {
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

window.releasePayment = async function (bookingId, type = 'booking') {
    if (!confirm('Are you sure you want to approve this work and release payment to the creator?')) return;

    try {
        let response;
        if (type === 'project') {
            response = await api.releaseProjectFunds(bookingId);
        } else {
            response = await api.releasePayment(bookingId);
        }

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

window.processBookingPayment = async function (bookingId, type = 'booking') {
    try {
        showToast('Processing payment...', 'info');

        let response;
        if (type === 'project') {
            response = await api.payProject(bookingId);
        } else {
            response = await api.payBooking(bookingId);
        }

        if (response.success) {
            closeModal();
            await renderBookingsPage();
            showToast('Payment successful! The creator can now start the work.', 'success');
        }
    } catch (error) {
        console.error('Failed to process payment:', error);
        showToast(error.message || 'Failed to process payment. Please ensure you have enough balance.', 'error');
    }
};

window.submitDeliverable = async function (bookingId, type = 'booking') {
    const url = document.getElementById('deliverableUrl').value.trim();
    const message = document.getElementById('deliverableNotes').value.trim();

    if (!url) {
        showToast('Please provide a link to the deliverables', 'error');
        return;
    }

    try {
        let response;
        if (type === 'project') {
            response = await api.submitProjectDeliverable(bookingId, { url, message });
        } else {
            response = await api.submitBookingDeliverable(bookingId, { url, message });
        }

        if (response.success) {
            closeModal();
            await renderBookingsPage();
            showToast('Deliverables submitted successfully!', 'success');
        }
    } catch (error) {
        console.error('Failed to submit deliverable:', error);
        showToast(error.message || 'Failed to submit deliverable', 'error');
    }
};

window.sendBookingMessage = async function (event, bookingId, type = 'booking') {
    event.preventDefault();
    const messageInput = document.getElementById('messageInput');
    const message = messageInput.value.trim();

    if (!message) return;

    try {
        let response;
        if (type === 'project') {
            response = await api.addProjectMessage(bookingId, message);
        } else {
            response = await api.addBookingMessage(bookingId, message);
        }

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

window.acceptBookingRequest = async function (bookingId) {
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

window.showRejectForm = function (bookingId) {
    document.getElementById('actionButtons').style.display = 'none';
    document.getElementById('counterProposalForm').style.display = 'none';
    document.getElementById('rejectForm').style.display = 'block';
};

window.submitRejection = async function (bookingId, reason) {
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

window.showCounterProposalForm = function (bookingId) {
    document.getElementById('actionButtons').style.display = 'none';
    document.getElementById('rejectForm').style.display = 'none';
    document.getElementById('counterProposalForm').style.display = 'block';
    setTimeout(() => document.getElementById('counterAmount').focus(), 100);
};

window.submitCounterProposal = async function (bookingId, amount) {
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