import { appState } from '../state.js';
import { formatDate, formatStatus, getStatusColor } from '../utils.js';
import api from '../services/api.js';

let bookings = [];
let currentFilter = 'all'; // all, active, completed

const BOOKINGS_STYLES = ''; // Styles moved to styles.css
;

export async function renderBookingsPage() {
    const mainContent = document.getElementById('mainContent');
    mainContent.innerHTML = ''; // Clear container

    if (!appState.user) {
        mainContent.innerHTML = `
            <div class="bookings-container-modern">
                <div class="empty-state-modern" style="padding: 80px 40px; text-align: center; background: rgba(255,255,255,0.02); border: 2px dashed rgba(255,255,255,0.08); border-radius: 40px;">
                    <div class="empty-state-icon" style="width: 100px; height: 100px; background: rgba(151, 71, 255, 0.05); border-radius: 30px; display: flex; align-items: center; justify-content: center; margin: 0 auto 32px; color: var(--primary);">
                        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M16 2v4M8 2v4M3 10h18M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"/></svg>
                    </div>
                    <h2 style="font-size: 28px; font-weight: 850; color: var(--text-primary); margin-bottom: 12px;">Sign in to view bookings</h2>
                    <p style="color: var(--text-secondary); opacity: 0.6; margin-bottom: 32px; font-size: 16px;">Manage your active jobs and track progress across all your projects.</p>
                    <button class="glass-btn-primary" onclick="showAuthModal('signin')" style="padding: 14px 32px;">Connect Account</button>
                </div>
            </div>
        `;
        return;
    }

    mainContent.innerHTML = `
        <div class="bookings-container-modern">
            <header class="bookings-header-modern">
                <div class="bookings-icon-modern">
                    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M16 2v4M8 2v4M3 10h18M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"/></svg>
                </div>
                <div>
                    <h1 class="bookings-title-modern">Job Management</h1>
                    <p class="bookings-subtitle-modern">Track your active collaborations and manage payments securely in escrow</p>
                </div>
            </header>

            <div id="bookingsStatsContainer"></div>
            
            <div class="filters-container-modern" style="margin-bottom: 32px;">
                <div class="filter-group">
                    <button class="filter-chip ${currentFilter === 'all' ? 'active' : ''}" onclick="window.filterBookings('all')">All History</button>
                    <button class="filter-chip ${currentFilter === 'active' ? 'active' : ''}" onclick="window.filterBookings('active')">In Progress</button>
                    <button class="filter-chip ${currentFilter === 'completed' ? 'active' : ''}" onclick="window.filterBookings('completed')">Completed</button>
                </div>
            </div>

            <div id="bookingsListContainer">
                <div style="display: flex; flex-direction: column; align-items: center; justify-content: center; min-height: 400px; gap: 20px;">
                    <div class="glass-loading-spinner"></div>
                    <p style="color: var(--text-secondary); font-weight: 600; opacity: 0.5;">Syncing your job records...</p>
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
        document.getElementById('bookingsListContainer').innerHTML = `
            <div class="empty-state-modern" style="border-color: rgba(239, 68, 68, 0.15);">
                <div class="empty-state-icon" style="background: rgba(239, 68, 68, 0.1); color: #EF4444;">
                    <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="12" cy="12" r="10"/><path d="M12 8v4M12 16h.01"/></svg>
                </div>
                <h3 style="color: #EF4444;">Failed to sync bookings</h3>
                <p style="color: var(--text-secondary); margin-bottom: 24px;">${error.message}</p>
                <button class="glass-btn-primary" onclick="renderBookingsPage()">Try Reconnecting</button>
            </div>
        `;
    }
}

function renderBookingsList() {
    const listContainer = document.getElementById('bookingsListContainer');
    const statsContainer = document.getElementById('bookingsStatsContainer');
    if (!listContainer || !statsContainer) return;

    const activeBookings = bookings.filter(b => !['completed', 'cancelled', 'completed_with_escrow'].includes(b.status));
    const completedBookings = bookings.filter(b => ['completed', 'completed_with_escrow'].includes(b.status));

    const totalEarnings = bookings
        .filter(b => b.status === 'completed' || b.status === 'completed_with_escrow')
        .reduce((sum, b) => sum + (b.amount || 0), 0);

    // Render Stats
    statsContainer.innerHTML = `
        <div class="stats-grid-modern" style="margin-bottom: 40px;">
            <div class="stat-card-project">
                <div class="stat-card-icon" style="background: rgba(151, 71, 255, 0.1); color: var(--primary);">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M16 2v4M8 2v4M3 10h18M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"/></svg>
                </div>
                <div class="stat-card-content">
                    <span class="stat-card-label">Total Jobs</span>
                    <span class="stat-card-value">${bookings.length}</span>
                </div>
            </div>
            <div class="stat-card-project">
                <div class="stat-card-icon" style="background: rgba(59, 130, 246, 0.1); color: #3B82F6;">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg>
                </div>
                <div class="stat-card-content">
                    <span class="stat-card-label">In Progress</span>
                    <span class="stat-card-value">${activeBookings.length}</span>
                </div>
            </div>
            <div class="stat-card-project">
                <div class="stat-card-icon" style="background: rgba(16, 185, 129, 0.1); color: #10B981;">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M20 6L9 17l-5-5"/></svg>
                </div>
                <div class="stat-card-content">
                    <span class="stat-card-label">Completed</span>
                    <span class="stat-card-value">${completedBookings.length}</span>
                </div>
            </div>
            <div class="stat-card-project">
                <div class="stat-card-icon" style="background: rgba(245, 158, 11, 0.1); color: #F59E0B;">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6"/></svg>
                </div>
                <div class="stat-card-content">
                    <span class="stat-card-label">Earnings</span>
                    <span class="stat-card-value">$${totalEarnings.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                </div>
            </div>
        </div>
    `;

    let displayBookings = bookings;
    if (currentFilter === 'active') {
        displayBookings = activeBookings;
    } else if (currentFilter === 'completed') {
        displayBookings = completedBookings;
    }

    if (displayBookings.length === 0) {
        listContainer.innerHTML = `
            <div class="empty-state-modern" style="padding: 100px 40px;">
                <div class="empty-state-icon" style="opacity: 0.3;">
                    <svg width="56" height="56" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M16 2v4M8 2v4M3 10h18M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"/></svg>
                </div>
                <h3 style="font-size: 22px; margin-bottom: 8px;">No records found</h3>
                <p style="color: var(--text-secondary); opacity: 0.6;">Your ${currentFilter === 'all' ? 'history' : currentFilter + ' job list'} is currently empty.</p>
            </div>
        `;
        return;
    }

    listContainer.innerHTML = `
        <div class="projects-grid-modern">
            ${displayBookings.map(booking => renderModernBookingCard(booking)).join('')}
        </div>
    `;
}

function renderModernBookingCard(booking) {
    const isCreator = appState.user.role === 'creator';
    const otherParty = isCreator ? booking.client : booking.creator;
    const otherPartyName = otherParty?.name || (isCreator ? 'Client' : 'Creator');
    const otherPartyAvatar = otherParty?.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(otherPartyName)}&background=9747FF&color=fff`;

    return `
        <div class="booking-card-modern" onclick="window.viewBookingDetails('${booking._id}')">
            <div class="booking-user-info">
                <img src="${otherPartyAvatar}" alt="${otherPartyName}" class="booking-avatar-modern">
                <div style="flex: 1;">
                    <div class="booking-username-modern">${otherPartyName}</div>
                    <div class="booking-role-modern">${isCreator ? 'Client' : 'Creator'} • ${formatDate(booking.startDate || booking.createdAt)}</div>
                </div>
                <span class="glass-tag" style="background: ${getStatusColor(booking.status)}15; color: ${getStatusColor(booking.status)}; border-color: ${getStatusColor(booking.status)}30;">
                    ${formatStatus(booking.status)}
                </span>
            </div>

            <h3 class="booking-job-title-modern">${booking.serviceTitle}</h3>
            
            <div class="booking-meta-modern">
                <div style="display: flex; align-items: center; gap: 6px; background: rgba(255,255,255,0.03); padding: 6px 12px; border-radius: 10px; border: 1px solid rgba(255,255,255,0.05);">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
                    <span>${booking._type === 'project' ? 'Project' : 'Service'}</span>
                </div>
                <div style="display: flex; align-items: center; gap: 6px; background: rgba(255,255,255,0.03); padding: 6px 12px; border-radius: 10px; border: 1px solid rgba(255,255,255,0.05);">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg>
                    <span>ID: ${booking._id.slice(-6).toUpperCase()}</span>
                </div>
            </div>

            <div class="booking-footer-modern">
                <div>
                    <div style="font-size: 11px; font-weight: 800; color: var(--text-secondary); text-transform: uppercase; letter-spacing: 0.1em; opacity: 0.5; margin-bottom: 2px;">Escrow Balance</div>
                    <div class="booking-amount-modern">USDC ${booking.amount ? booking.amount.toFixed(2) : '0.00'}</div>
                </div>
                <button class="booking-btn-modern">View Journey</button>
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
            booking._type = type;

            const isCreator = appState.user.role === 'creator';
            const unreadCount = booking.messages?.filter(m => !m.read && m.sender.toString() !== appState.user._id).length || 0;

            const modalContent = `
    <div class="glass-modal-overlay" onclick = "if(event.target === this) closeModal()" >
        <div class="glass-modal-content" style="max-width: 720px;">
            <div class="glass-modal-header">
                <span class="glass-modal-title">Booking Details</span>
                <button class="glass-modal-close" onclick="closeModal()">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M18 6L6 18M6 6l12 12" /></svg>
                </button>
            </div>

            <div class="glass-modal-body">
                <!-- Status Journey -->
                <div style="background: rgba(151, 71, 255, 0.03); border: 1px solid rgba(151, 71, 255, 0.1); border-radius: 24px; padding: 24px; margin-bottom: 32px;">
                    <div class="glass-form-label" style="text-align: center; margin-bottom: 24px; font-size: 12px;">Job Progress Roadmap</div>
                    <div class="journey-track-modern">
                        <div class="journey-line-modern"></div>
                        ${['pending', 'awaiting_payment', 'confirmed', 'delivered', 'completed'].map((s, i) => {
                const statuses = ['pending', 'awaiting_payment', 'confirmed', 'delivered', 'completed', 'completed_with_escrow'];
                const currentIdx = statuses.indexOf(booking.status);
                const isDone = statuses.indexOf(s) < currentIdx || booking.status === 'completed' || booking.status === 'completed_with_escrow';
                const isActive = s === booking.status;
                const labels = { pending: 'Request', awaiting_payment: 'Accept', confirmed: 'Pay', delivered: 'Deliver', completed: 'Finish' };
                return `
                                            <div class="journey-step-modern ${isDone ? 'completed' : isActive ? 'active' : ''}">
                                                <div class="journey-dot-modern">${isDone ? '✓' : i + 1}</div>
                                                <div style="font-size: 11px; font-weight: 800; color: ${isDone || isActive ? 'var(--text-primary)' : 'var(--text-secondary)'}; text-transform: uppercase;">${labels[s]}</div>
                                            </div>
                                        `;
            }).join('')}
                    </div>
                </div>

                <!-- Action Banner -->
                <div id="bookingActionContainer">
                    ${renderBookingActionBanner(booking, isCreator)}
                </div>

                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 24px; margin-bottom: 32px;">
                    <div class="glass-info-card">
                        <div class="glass-form-label">${isCreator ? 'Contract Client' : 'Contract Creator'}</div>
                        <div style="display: flex; align-items: center; gap: 12px; margin-top: 8px;">
                            <img src="${(isCreator ? booking.client?.avatar : booking.creator?.avatar) || 'https://ui-avatars.com/api/?name=User'}" style="width: 40px; height: 40px; border-radius: 12px; border: 1px solid rgba(255,255,255,0.1);">
                                <div>
                                    <div style="font-weight: 700; color: var(--text-primary);">${isCreator ? (booking.client?.name || 'Client') : (booking.creator?.name || 'Creator')}</div>
                                    <div style="font-size: 12px; color: var(--text-secondary); opacity: 0.6;">Verified Partner</div>
                                </div>
                        </div>
                    </div>
                    <div class="glass-info-card">
                        <div class="glass-form-label">Escrowed Balance</div>
                        <div style="display: flex; align-items: baseline; gap: 8px; margin-top: 8px;">
                            <div style="font-size: 24px; font-weight: 850; color: var(--primary);">USDC ${booking.amount ? booking.amount.toFixed(2) : '0.00'}</div>
                            <div style="font-size: 12px; color: var(--text-secondary); opacity: 0.6;">(Secured)</div>
                        </div>
                    </div>
                </div>

                <div class="glass-info-card" style="margin-bottom: 32px;">
                    <div class="glass-form-label">Service Title</div>
                    <h3 style="font-size: 18px; font-weight: 700; color: var(--text-primary); margin: 8px 0;">${booking.serviceTitle}</h3>
                    <p style="font-size: 14px; color: var(--text-secondary); line-height: 1.6; opacity: 0.8;">${booking.serviceDescription || 'No description provided for this job.'}</p>
                </div>

                <!-- Messages Area -->
                <div class="glass-form-label" style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 16px;">
                    <span>Project Messages</span>
                    ${unreadCount > 0 ? `<span class="glass-tag" style="background: var(--primary); color: white; border: none; font-size: 10px; padding: 2px 8px;">${unreadCount} NEW</span>` : ''}
                </div>

                <div class="glass-info-card" style="padding: 12px; border-radius: 20px;">
                    <div id="messagesContainer" style="max-height: 300px; overflow-y: auto; display: flex; flex-direction: column; gap: 12px; padding: 12px; margin-bottom: 16px; scroll-behavior: smooth;">
                        ${booking.messages && booking.messages.length > 0 ?
                    booking.messages.map(msg => {
                        const isMine = msg.sender.toString() === appState.user._id;
                        return `
                                                <div style="display: flex; flex-direction: column; align-items: ${isMine ? 'flex-end' : 'flex-start'};">
                                                    <div style="background: ${isMine ? 'rgba(151, 71, 255, 0.15)' : 'rgba(255, 255, 255, 0.05)'}; 
                                                                color: ${isMine ? 'var(--text-primary)' : 'var(--text-secondary)'}; 
                                                                padding: 10px 16px; 
                                                                border-radius: ${isMine ? '18px 18px 2px 18px' : '18px 18px 18px 2px'}; 
                                                                max-width: 80%; 
                                                                font-size: 14px; 
                                                                border: 1px solid ${isMine ? 'rgba(151, 71, 255, 0.2)' : 'rgba(255,255,255,0.08)'};">
                                                        ${msg.message}
                                                    </div>
                                                    <div style="font-size: 10px; opacity: 0.4; margin-top: 4px; font-weight: 600;">${formatDate(msg.createdAt)}</div>
                                                </div>
                                            `;
                    }).join('') :
                    '<div style="text-align: center; padding: 40px; color: var(--text-secondary); font-size: 14px; opacity: 0.5;">No conversation history yet.</div>'
                }
                    </div>
                    <form onsubmit="window.sendBookingMessage(event, '${booking._id}', '${booking._type}')" style="display: flex; gap: 12px; background: rgba(255,255,255,0.03); padding: 8px; border-radius: 16px; border: 1px solid rgba(255,255,255,0.05);">
                        <input type="text" id="messageInput" class="glass-input" placeholder="Type a message to project partner..." required style="flex: 1; border: none; background: transparent; height: 44px; padding: 0 12px;">
                            <button type="submit" class="glass-btn-primary" style="padding: 0 24px; border-radius: 12px; height: 44px;">
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z" /></svg>
                            </button>
                    </form>
                </div>
            </div>
        </div>
    `;

            document.getElementById('modalsContainer').innerHTML = modalContent;
            document.body.style.overflow = 'hidden';

            // Scroll to bottom
            const msgBox = document.getElementById('messagesContainer');
            if (msgBox) msgBox.scrollTop = msgBox.scrollHeight;
        }
    } catch (e) {
        console.error('Error viewing details:', e);
        showToast('Failed to load details', 'error');
    }
};

function renderBookingActionBanner(booking, isCreator) {
    if (booking.status === 'pending' && isCreator) {
        return `
    <div class="glass-info-card" style = "background: rgba(151, 71, 255, 0.05); border: 1px solid rgba(151, 71, 255, 0.2); margin-bottom: 32px;" >
                <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 12px;">
                    <div style="width: 32px; height: 32px; background: rgba(151, 71, 255, 0.1); border-radius: 10px; display: flex; align-items: center; justify-content: center; color: var(--primary);">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
                    </div>
                    <div style="font-weight: 800; color: var(--text-primary);">Awaiting Your Acceptance</div>
                </div>
                <p style="font-size: 14px; color: var(--text-secondary); opacity: 0.8; margin-bottom: 20px;">Review the job details. Once accepted, the client will be prompted to deposit funds into escrow.</p>
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px;" id="actionButtons">
                    <button class="glass-btn-primary" onclick="window.acceptBookingRequest('${booking._id}')">Accept Job</button>
                    <button class="glass-btn-secondary" onclick="window.showCounterProposalForm('${booking._id}')">Counter Offer</button>
                </div>
            </div>
    `;
    }

    if (booking.status === 'awaiting_payment' && !isCreator) {
        return `
    <div class="glass-info-card" style = "background: rgba(59, 130, 246, 0.05); border: 1px solid rgba(59, 130, 246, 0.2); margin-bottom: 32px;" >
                <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 12px;">
                    <div style="width: 32px; height: 32px; background: rgba(59, 130, 246, 0.1); border-radius: 10px; display: flex; align-items: center; justify-content: center; color: #3B82F6;">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6"/></svg>
                    </div>
                    <div style="font-weight: 800; color: var(--text-primary);">Creator Accepted!</div>
                </div>
                <p style="font-size: 14px; color: var(--text-secondary); opacity: 0.8; margin-bottom: 20px;">The creator is ready to start. Deposit the agreed amount to secure them in escrow.</p>
                <button class="glass-btn-primary" style="width: 100%; height: 52px; font-size: 16px;" onclick="window.processBookingPayment('${booking._id}', '${booking._type}')">
                    Pay USDC ${booking.amount.toFixed(2)}
                </button>
            </div>
    `;
    }

    if (booking.status === 'in_progress' && isCreator) {
        return `
    <div class="glass-info-card" style = "background: rgba(16, 185, 129, 0.05); border: 1px solid rgba(16, 185, 129, 0.2); margin-bottom: 32px;" >
                <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 12px;">
                    <div style="width: 32px; height: 32px; background: rgba(16, 185, 129, 0.1); border-radius: 10px; display: flex; align-items: center; justify-content: center; color: #10B981;">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M22 11.08V12a10 10 0 11-5.93-9.14"/><path d="M22 4L12 14.01l-3-3"/></svg>
                    </div>
                    <div style="font-weight: 800; color: var(--text-primary);">Job In Progress</div>
                </div>
                <p style="font-size: 14px; color: var(--text-secondary); opacity: 0.8; margin-bottom: 20px;">Funds are secured in escrow. Submit your work link once you're finished.</p>
                <div style="display: flex; flex-direction: column; gap: 12px;">
                    <input type="url" id="deliverableUrl" class="glass-input" placeholder="Work URL (Paste Google Drive/Dropbox link)">
                    <textarea id="deliverableNotes" class="glass-input" placeholder="Additional notes for the client..." style="height: 80px; padding: 12px;"></textarea>
                    <button class="glass-btn-primary" style="width: 100%; height: 52px;" onclick="window.submitDeliverable('${booking._id}', '${booking._type}')">
                        Submit Work & Request Payment
                    </button>
                </div>
            </div>
    `;
    }

    if (booking.status === 'delivered' && !isCreator) {
        return `
    <div class="glass-info-card" style = "background: rgba(16, 185, 129, 0.05); border: 1px solid rgba(16, 185, 129, 0.2); margin-bottom: 32px;" >
                <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 12px;">
                    <div style="width: 32px; height: 32px; background: rgba(16, 185, 129, 0.1); border-radius: 10px; display: flex; align-items: center; justify-content: center; color: #10B981;">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M9 11l3 3L22 4M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11"/></svg>
                    </div>
                    <div style="font-weight: 800; color: var(--text-primary);">Work Submitted!</div>
                </div>
                <p style="font-size: 14px; color: var(--text-secondary); opacity: 0.8; margin-bottom: 20px;">The creator has finished the job. Review the deliverables and approve to release escrowed funds.</p>
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px;">
                    <a href="${booking.attachments?.[0]?.url || '#'}" target="_blank" class="glass-btn-secondary" style="text-decoration: none; display: flex; align-items: center; justify-content: center;">Review Deliverables</a>
                    <button class="glass-btn-primary" onclick="window.releasePayment('${booking._id}', '${booking._type}')">Release Payment</button>
                </div>
            </div>
    `;
    }

    return '';
}

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
    // Remove any existing forms
    document.getElementById('rejectForm')?.remove();
    document.getElementById('counterProposalForm')?.remove();

    document.getElementById('actionButtons').style.display = 'none';
    const rejectHtml = `
    <div id = "rejectForm" class="glass-info-card" style = "margin-top: 16px; border-color: rgba(239, 68, 68, 0.2); background: rgba(239, 68, 68, 0.03);" >
            <div style="font-weight: 800; color: #EF4444; margin-bottom: 8px;">Reject Booking Request</div>
            <p style="font-size: 13px; color: var(--text-secondary); opacity: 0.8; margin-bottom: 16px;">Please provide a brief reason for declining this collaboration.</p>
            <textarea id="rejectReason" class="glass-input" placeholder="Optional reason for rejection..." style="height: 80px; margin-bottom: 20px;"></textarea>
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px;">
                <button class="glass-btn-primary" style="background: #EF4444;" onclick="window.submitRejection('${bookingId}', document.getElementById('rejectReason').value)">Confirm Decline</button>
                <button class="glass-btn-secondary" onclick="document.getElementById('rejectForm').remove(); document.getElementById('actionButtons').style.display='grid';">Cancel</button>
            </div>
        </div>
    `;
    document.getElementById('actionButtons').insertAdjacentHTML('afterend', rejectHtml);
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
    // Remove any existing forms
    document.getElementById('rejectForm')?.remove();
    document.getElementById('counterProposalForm')?.remove();

    document.getElementById('actionButtons').style.display = 'none';
    const counterProposalHtml = `
    <div id = "counterProposalForm" class="glass-info-card" style = "margin-top: 16px; border-color: var(--primary); background: rgba(151, 71, 255, 0.03);" >
            <div style="font-weight: 800; color: var(--primary); margin-bottom: 8px;">Counter Proposal</div>
            <p style="font-size: 13px; color: var(--text-secondary); opacity: 0.8; margin-bottom: 16px;">Propose a new budget for this specific job.</p>
            <div style="position: relative; margin-bottom: 20px;">
                <span style="position: absolute; left: 16px; top: 50%; transform: translateY(-50%); color: var(--text-secondary); font-weight: 600; font-size: 14px;">USDC</span>
                <input type="number" id="counterAmount" class="glass-input" placeholder="0.00" style="padding-left: 64px; height: 52px; font-size: 18px; font-weight: 700;">
            </div>
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px;">
                <button class="glass-btn-primary" onclick="window.submitCounterProposal('${bookingId}', document.getElementById('counterAmount').value)">Send Offer</button>
                <button class="glass-btn-secondary" onclick="document.getElementById('counterProposalForm').remove(); document.getElementById('actionButtons').style.display='grid';">Cancel</button>
            </div>
        </div>
    `;
    document.getElementById('actionButtons').insertAdjacentHTML('afterend', counterProposalHtml);
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