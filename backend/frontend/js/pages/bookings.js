import { appState } from '../state.js';
import { formatDate, formatStatus, getStatusColor } from '../utils.js';
import api from '../services/api.js';

let bookings = [];
let currentFilter = 'all'; // all, active, completed

const BOOKINGS_STYLES = `
<style>
    .bk-container { max-width: 1000px; margin: 0 auto; padding: 24px; }
    .bk-header { margin-bottom: 32px; }
    .bk-title { font-size: 32px; font-weight: 800; color: white; margin-bottom: 8px; letter-spacing: -0.02em; }
    .bk-subtitle { color: rgba(255,255,255,0.45); font-size: 15px; }
    
    .bk-stats { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 16px; margin-bottom: 32px; }
    .bk-stat-card { background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.08); border-radius: 20px; padding: 20px; display: flex; align-items: center; gap: 16px; transition: transform 0.2s; }
    .bk-stat-card:hover { transform: translateY(-2px); border-color: rgba(255,255,255,0.12); }
    .bk-stat-icon { width: 48px; height: 48px; border-radius: 14px; display: flex; align-items: center; justify-content: center; font-size: 20px; }
    .bk-stat-label { font-size: 13px; color: rgba(255,255,255,0.4); font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em; }
    .bk-stat-value { font-size: 20px; font-weight: 800; color: white; margin-top: 2px; }
    
    .bk-filters { display: flex; gap: 8px; margin-bottom: 24px; overflow-x: auto; padding-bottom: 8px; scrollbar-width: none; }
    .bk-filters::-webkit-scrollbar { display: none; }
    .bk-filter-btn { padding: 10px 20px; border-radius: 12px; border: 1px solid rgba(255,255,255,0.08); background: rgba(255,255,255,0.03); color: rgba(255,255,255,0.6); font-weight: 600; font-size: 14px; cursor: pointer; transition: all 0.2s; white-space: nowrap; }
    .bk-filter-btn:hover { background: rgba(255,255,255,0.06); color: white; }
    .bk-filter-btn.active { background: white; color: #0f0f13; border-color: white; }
    
    .bk-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(320px, 1fr)); gap: 20px; }
    .bk-card { background: rgba(255,255,255,0.02); border: 1px solid rgba(255,255,255,0.08); border-radius: 24px; padding: 20px; cursor: pointer; transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1); position: relative; overflow: hidden; }
    .bk-card:hover { background: rgba(255,255,255,0.04); border-color: rgba(255,255,255,0.15); transform: translateY(-4px); box-shadow: 0 12px 30px -10px rgba(0,0,0,0.5); }
    
    .bk-card-header { display: flex; align-items: flex-start; justify-content: space-between; margin-bottom: 16px; }
    .bk-user { display: flex; align-items: center; gap: 12px; }
    .bk-avatar { width: 44px; height: 44px; border-radius: 50%; border: 2px solid rgba(255,255,255,0.06); object-fit: crop; }
    .bk-username { font-weight: 700; color: white; font-size: 15px; }
    .bk-userrole { font-size: 12px; color: rgba(255,255,255,0.35); font-weight: 600; }
    
    .bk-status-tag { padding: 6px 12px; border-radius: 20px; font-size: 11px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.05em; }
    .status-active { background: rgba(59, 130, 246, 0.1); color: #60a5fa; border: 1px solid rgba(59, 130, 246, 0.2); }
    .status-completed { background: rgba(16, 185, 129, 0.1); color: #34d399; border: 1px solid rgba(16, 185, 129, 0.2); }
    .status-pending { background: rgba(245, 158, 11, 0.1); color: #fbbf24; border: 1px solid rgba(245, 158, 11, 0.2); }
    
    .bk-card-body { margin-bottom: 20px; }
    .bk-job-title { font-size: 18px; font-weight: 800; color: white; margin-bottom: 8px; line-height: 1.3; }
    .bk-meta { display: flex; align-items: center; gap: 16px; color: rgba(255,255,255,0.3); font-size: 13px; font-weight: 500; }
    .bk-meta-item { display: flex; align-items: center; gap: 6px; }
    
    .bk-card-footer { display: flex; align-items: center; justify-content: space-between; padding-top: 16px; border-top: 1px solid rgba(255,255,255,0.06); }
    .bk-price-label { font-size: 11px; color: rgba(255,255,255,0.35); font-weight: 700; text-transform: uppercase; margin-bottom: 2px; }
    .bk-price-value { font-size: 18px; font-weight: 800; color: #a78bfa; }
    
    .bk-btn-details { background: rgba(255,255,255,0.06); border: none; border-radius: 12px; color: white; padding: 10px 16px; font-weight: 700; font-size: 13px; cursor: pointer; transition: all 0.2s; display: flex; align-items: center; gap: 8px; }
    .bk-card:hover .bk-btn-details { background: #7c3aed; box-shadow: 0 4px 15px rgba(124,58,237,0.3); }
    
    .bk-empty { text-align: center; padding: 80px 20px; background: rgba(255,255,255,0.02); border: 1px dashed rgba(255,255,255,0.1); border-radius: 32px; margin-top: 20px; }
    .bk-empty-icon { font-size: 48px; margin-bottom: 20px; opacity: 0.2; color: white; }

    /* Modal Styles */
    .bkm-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.6); backdrop-filter: blur(8px); z-index: 1000; display: flex; align-items: flex-end; justify-content: center; }
    @media (min-width: 600px) { .bkm-overlay { align-items: center; padding: 20px; } }
    .bkm-sheet { background: #0f0f13; border: 1px solid rgba(255,255,255,0.08); border-radius: 24px 24px 0 0; width: 100%; max-width: 600px; max-height: 92vh; overflow-y: auto; animation: bkmSlideUp 0.3s cubic-bezier(0.16,1,0.3,1); padding-bottom: env(safe-area-inset-bottom, 24px); position: relative; }
    @media (min-width: 600px) { .bkm-sheet { border-radius: 24px; animation: bkmScaleIn 0.25s cubic-bezier(0.16,1,0.3,1); } }
    @keyframes bkmSlideUp { from { transform: translateY(100%); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
    @keyframes bkmScaleIn { from { transform: scale(0.95); opacity: 0; } to { transform: scale(1); opacity: 1; } }
    
    .bkm-header { display: flex; align-items: center; justify-content: space-between; padding: 20px 24px; border-bottom: 1px solid rgba(255,255,255,0.06); sticky; top: 0; background: #0f0f13; z-index: 10; }
    .bkm-title { font-size: 18px; font-weight: 800; color: white; }
    .bkm-close { width: 32px; height: 32px; background: rgba(255,255,255,0.08); border: none; border-radius: 50%; cursor: pointer; display: flex; align-items: center; justify-content: center; color: rgba(255,255,255,0.6); }
    
    .bkm-body { padding: 24px; }
    .bkm-section { background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.06); border-radius: 20px; padding: 20px; margin-bottom: 20px; }
    .bkm-label { font-size: 11px; font-weight: 700; color: rgba(255,255,255,0.35); text-transform: uppercase; letter-spacing: 0.1em; margin-bottom: 8px; }
    
    .journey-track { display: flex; justify-content: space-between; position: relative; padding: 10px 0; }
    .journey-line { position: absolute; top: 22px; left: 10%; right: 10%; height: 2px; background: rgba(255,255,255,0.06); z-index: 1; }
    .journey-step { position: relative; z-index: 2; display: flex; flex-direction: column; align-items: center; gap: 8px; flex: 1; }
    .journey-dot { width: 24px; height: 24px; border-radius: 50%; background: #1a1a1f; border: 2px solid rgba(255,255,255,0.1); display: flex; align-items: center; justify-content: center; font-size: 10px; font-weight: 800; color: rgba(255,255,255,0.3); transition: all 0.3s; }
    .journey-step.active .journey-dot { border-color: #7c3aed; color: #7c3aed; box-shadow: 0 0 15px rgba(124,58,237,0.3); }
    .journey-step.completed .journey-dot { background: #7c3aed; border-color: #7c3aed; color: white; }
    .journey-label { font-size: 10px; font-weight: 700; color: rgba(255,255,255,0.3); text-transform: uppercase; }
    .journey-step.active .journey-label { color: white; }

    .action-banner { background: rgba(124,58,237,0.1); border: 1px solid rgba(124,58,237,0.2); border-radius: 16px; padding: 16px; margin-bottom: 20px; }
    .action-banner.warning { background: rgba(245, 158, 11, 0.1); border-color: rgba(245, 158, 11, 0.2); }
    .action-banner-title { font-weight: 800; font-size: 14px; margin-bottom: 4px; display: flex; align-items: center; gap: 8px; }
    
    .msg-bubble { max-width: 85%; padding: 10px 14px; border-radius: 16px; margin-bottom: 8px; font-size: 14px; line-height: 1.5; }
    .msg-bubble.sent { background: #7c3aed; color: white; align-self: flex-end; border-bottom-right-radius: 4px; }
    .msg-bubble.received { background: rgba(255,255,255,0.05); color: white; align-self: flex-start; border-bottom-left-radius: 4px; border: 1px solid rgba(255,255,255,0.08); }
</style>
`;

export async function renderBookingsPage() {
    const mainContent = document.getElementById('mainContent');
    mainContent.innerHTML = BOOKINGS_STYLES;

    if (!appState.user) {
        mainContent.innerHTML += `
            <div class="bk-container">
                <div class="bk-empty">
                    <div class="bk-empty-icon">
                        <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M16 2v4M8 2v4M3 10h18M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"/></svg>
                    </div>
                    <h2>Please sign in</h2>
                    <p style="color: rgba(255,255,255,0.4); margin-bottom: 24px;">Sign in to view and manage your bookings</p>
                    <button class="btn-primary" onclick="showAuthModal('signin')">Sign in</button>
                </div>
            </div>
        `;
        return;
    }

    mainContent.innerHTML += `
        <div class="bk-container">
            <div class="bk-header">
                <h1 class="bk-title">Bookings</h1>
                <p class="bk-subtitle">Manage your active jobs and track progress</p>
            </div>
            <div id="bookingsListContainer">
                <div style="text-align: center; padding: 60px;">
                    <div class="loading-spinner" style="margin: 0 auto 16px;"></div>
                    <p style="color: rgba(255,255,255,0.4);">Loading your bookings...</p>
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
            <div class="bk-empty" style="border-color: rgba(239, 68, 68, 0.2);">
                <div class="bk-empty-icon" style="color: #ef4444; opacity: 0.5;">!</div>
                <h3>Failed to load bookings</h3>
                <p style="color: rgba(255,255,255,0.4); margin-bottom: 24px;">${error.message}</p>
                <button class="btn-primary" onclick="window.location.reload()">Retry</button>
            </div>
        `;
    }
}

function renderBookingsList() {
    const listContainer = document.getElementById('bookingsListContainer');
    if (!listContainer) return;

    const activeBookings = bookings.filter(b => !['completed', 'cancelled'].includes(b.status));
    const completedBookings = bookings.filter(b => ['completed', 'completed_with_escrow', 'cancelled'].includes(b.status));

    const totalEarnings = bookings
        .filter(b => b.status === 'completed' || b.status === 'completed_with_escrow')
        .reduce((sum, b) => sum + (b.amount || 0), 0);

    let displayBookings = bookings;
    if (currentFilter === 'active') {
        displayBookings = activeBookings;
    } else if (currentFilter === 'completed') {
        displayBookings = completedBookings;
    }

    listContainer.innerHTML = `
        <div class="bk-stats">
            <div class="bk-stat-card">
                <div class="bk-stat-icon" style="background: rgba(124, 58, 237, 0.1); color: #a78bfa;">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/></svg>
                </div>
                <div>
                    <div class="bk-stat-label">Total</div>
                    <div class="bk-stat-value">${bookings.length}</div>
                </div>
            </div>
            <div class="bk-stat-card">
                <div class="bk-stat-icon" style="background: rgba(59, 130, 246, 0.1); color: #60a5fa;">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg>
                </div>
                <div>
                    <div class="bk-stat-label">Active</div>
                    <div class="bk-stat-value">${activeBookings.length}</div>
                </div>
            </div>
            <div class="bk-stat-card">
                <div class="bk-stat-icon" style="background: rgba(16, 185, 129, 0.1); color: #34d399;">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M20 6L9 17l-5-5"/></svg>
                </div>
                <div>
                    <div class="bk-stat-label">Completed</div>
                    <div class="bk-stat-value">${completedBookings.length}</div>
                </div>
            </div>
            <div class="bk-stat-card">
                <div class="bk-stat-icon" style="background: rgba(107, 114, 128, 0.1); color: #9ca3af;">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6"/></svg>
                </div>
                <div>
                    <div class="bk-stat-label">Earnings</div>
                    <div class="bk-stat-value">$${totalEarnings.toLocaleString(undefined, { minimumFractionDigits: 2 })}</div>
                </div>
            </div>
        </div>

        <div class="bk-filters">
            <button class="bk-filter-btn ${currentFilter === 'all' ? 'active' : ''}" onclick="window.filterBookings('all')">All Jobs</button>
            <button class="bk-filter-btn ${currentFilter === 'active' ? 'active' : ''}" onclick="window.filterBookings('active')">In Progress</button>
            <button class="bk-filter-btn ${currentFilter === 'completed' ? 'active' : ''}" onclick="window.filterBookings('completed')">Finished</button>
        </div>

        ${displayBookings.length > 0 ? `
            <div class="bk-grid">
                ${displayBookings.map(booking => renderModernBookingCard(booking)).join('')}
            </div>
        ` : `
            <div class="bk-empty">
                <div class="bk-empty-icon">
                    <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M16 2v4M8 2v4M3 10h18M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"/></svg>
                </div>
                <h3>No ${currentFilter === 'all' ? '' : currentFilter} bookings found</h3>
                <p style="color: rgba(255,255,255,0.4);">Your job list is currently empty.</p>
            </div>
        `}
    `;
}

function renderModernBookingCard(booking) {
    const isCreator = appState.user.role === 'creator';
    const otherParty = isCreator ? booking.client : booking.creator;
    const otherPartyName = otherParty?.name || (isCreator ? 'Client' : 'Creator');
    const otherPartyAvatar = otherParty?.avatar || 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=100&h=100&fit=crop';

    // Determine status class
    let statusClass = 'status-pending';
    if (['completed', 'completed_with_escrow'].includes(booking.status)) statusClass = 'status-completed';
    else if (['in_progress', 'delivered'].includes(booking.status)) statusClass = 'status-active';

    return `
        <div class="bk-card" onclick="window.viewBookingDetails('${booking._id}')">
            <div class="bk-card-header">
                <div class="bk-user">
                    <img src="${otherPartyAvatar}" alt="${otherPartyName}" class="bk-avatar">
                    <div>
                        <div class="bk-username">${otherPartyName}</div>
                        <div class="bk-userrole">${isCreator ? 'Client' : 'Creator'}</div>
                    </div>
                </div>
                <div class="bk-status-tag ${statusClass}">
                    ${formatStatus(booking.status)}
                </div>
            </div>

            <div class="bk-card-body">
                <h3 class="bk-job-title">${booking.serviceTitle}</h3>
                <div class="bk-meta">
                    <div class="bk-meta-item">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/></svg>
                        ${formatDate(booking.startDate || booking.createdAt)}
                    </div>
                    <div class="bk-meta-item">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
                        ${booking._type === 'project' ? 'Project' : 'Service'}
                    </div>
                </div>
            </div>

            <div class="bk-card-footer">
                <div>
                    <div class="bk-price-label">Job Amount</div>
                    <div class="bk-price-value">USDC ${booking.amount ? booking.amount.toFixed(2) : '0.00'}</div>
                </div>
                <button class="bk-btn-details">
                    Details
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
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
                <div class="bkm-overlay" onclick="if(event.target === this) closeModal()">
                    <div class="bkm-sheet">
                        <div class="bkm-header">
                            <span class="bkm-title">Booking Details</span>
                            <button class="bkm-close" onclick="closeModal()">
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M18 6L6 18M6 6l12 12"/></svg>
                            </button>
                        </div>

                        <div class="bkm-body">
                            <!-- Journey Tracker -->
                            <div class="bkm-section" style="padding: 16px 20px;">
                                <div class="bkm-label">Booking Journey</div>
                                <div class="journey-track">
                                    <div class="journey-line"></div>
                                    ${['pending', 'awaiting_payment', 'confirmed', 'delivered', 'completed'].map((s, i) => {
                const statuses = ['pending', 'awaiting_payment', 'confirmed', 'delivered', 'completed'];
                const currentIdx = statuses.indexOf(booking.status);
                const isDone = statuses.indexOf(s) < currentIdx || booking.status === 'completed';
                const isActive = s === booking.status;
                const labels = { pending: 'Request', awaiting_payment: 'Accept', confirmed: 'Pay', delivered: 'Work', completed: 'Done' };
                return `
                                            <div class="journey-step ${isDone ? 'completed' : isActive ? 'active' : ''}">
                                                <div class="journey-dot">${isDone ? '✓' : i + 1}</div>
                                                <div class="journey-label">${labels[s]}</div>
                                            </div>
                                        `;
            }).join('')}
                                </div>
                            </div>

                            <!-- Action Banners -->
                            ${booking.status === 'pending' && isCreator ? `
                                <div class="action-banner">
                                    <div class="action-banner-title">
                                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#a78bfa" stroke-width="2.5"><circle cx="12" cy="12" r="10"/><path d="M12 8v4M12 16h.01"/></svg>
                                        Pending Request
                                    </div>
                                    <p style="font-size: 13px; color: rgba(255,255,255,0.6); margin-bottom: 16px;">Review this request to start the job.</p>
                                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px;" id="actionButtons">
                                        <button class="bk-filter-btn active" onclick="window.acceptBookingRequest('${booking._id}')">Accept Job</button>
                                        <button class="bk-filter-btn" onclick="window.showCounterProposalForm('${booking._id}')">Counter Offer</button>
                                    </div>
                                    <div id="counterProposalForm" style="display: none; margin-top: 16px; padding-top: 16px; border-top: 1px solid rgba(255,255,255,0.1);">
                                        <div class="bkm-label">Proposed Amount</div>
                                        <div style="display: flex; gap: 10px;">
                                            <input type="number" id="counterAmount" class="am-input" placeholder="USDC Amount" style="flex: 1;">
                                            <button class="bk-filter-btn active" onclick="window.submitCounterProposal('${booking._id}', document.getElementById('counterAmount').value)">Send</button>
                                        </div>
                                    </div>
                                </div>
                            ` : ''}

                            ${booking.status === 'awaiting_payment' && !isCreator ? `
                                <div class="action-banner" style="background: rgba(59, 130, 246, 0.1); border-color: rgba(59, 130, 246, 0.2);">
                                    <div class="action-banner-title" style="color: #60a5fa;">
                                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="12" cy="12" r="10"/><path d="M12 8v4M12 16h.01"/></svg>
                                        Acceptance Received
                                    </div>
                                    <p style="font-size: 13px; color: rgba(255,255,255,0.6); margin-bottom: 16px;">The creator accepted your request. Pay now to lock the funds in escrow.</p>
                                    <button class="btn-primary" style="width: 100%; height: 44px;" onclick="window.processBookingPayment('${booking._id}', '${booking._type}')">Pay USDC ${booking.amount.toFixed(2)}</button>
                                </div>
                            ` : ''}

                            ${booking.status === 'in_progress' && isCreator ? `
                                <div class="action-banner" style="background: rgba(16, 185, 129, 0.1); border-color: rgba(16, 185, 129, 0.2);">
                                    <div class="action-banner-title" style="color: #34d399;">
                                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6"/></svg>
                                        In Progress
                                    </div>
                                    <p style="font-size: 13px; color: rgba(255,255,255,0.6); margin-bottom: 16px;">Funds are secured. Once finished, submit the link to your work.</p>
                                    <div style="display: flex; flex-direction: column; gap: 10px;">
                                        <input type="url" id="deliverableUrl" class="am-input" placeholder="Work URL (Drive/Dropbox)">
                                        <button class="btn-primary" style="width: 100%; height: 44px;" onclick="window.submitDeliverable('${booking._id}', '${booking._type}')">Submit Deliverables</button>
                                    </div>
                                </div>
                            ` : ''}

                            ${booking.status === 'delivered' && !isCreator ? `
                                <div class="action-banner" style="background: rgba(16, 185, 129, 0.1); border-color: rgba(16, 185, 129, 0.2);">
                                    <div class="action-banner-title" style="color: #34d399;">
                                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M9 11l3 3L22 4M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11"/></svg>
                                        Work Submitted
                                    </div>
                                    <p style="font-size: 13px; color: rgba(255,255,255,0.6); margin-bottom: 16px;">Review the creator's work and approve to release funds.</p>
                                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px;">
                                        <a href="${booking.attachments?.[0]?.url || '#'}" target="_blank" class="bk-filter-btn" style="text-align: center; text-decoration: none; display: flex; align-items: center; justify-content: center;">View Work</a>
                                        <button class="btn-primary" style="height: 44px;" onclick="window.releasePayment('${booking._id}', '${booking._type}')">Approve</button>
                                    </div>
                                </div>
                            ` : ''}

                            <!-- Details Grid -->
                            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 24px;">
                                <div class="bkm-section" style="margin-bottom: 0;">
                                    <div class="bkm-label">${isCreator ? 'Client' : 'Creator'}</div>
                                    <div style="font-weight: 700;">${isCreator ? booking.client?.name : booking.creator?.name}</div>
                                </div>
                                <div class="bkm-section" style="margin-bottom: 0;">
                                    <div class="bkm-label">Amount</div>
                                    <div style="font-weight: 800; color: #a78bfa; font-size: 18px;">USDC ${booking.amount.toFixed(2)}</div>
                                </div>
                            </div>

                            <div class="bkm-section">
                                <div class="bkm-label">Service Title</div>
                                <div style="font-weight: 700; margin-bottom: 4px;">${booking.serviceTitle}</div>
                                <p style="font-size: 13px; color: rgba(255,255,255,0.4); line-height: 1.5;">${booking.serviceDescription || 'No description provided.'}</p>
                            </div>

                            <!-- Messages Area -->
                            <div class="bkm-label" style="margin-top: 32px; display: flex; align-items: center; justify-content: space-between;">
                                <span>Project Messages</span>
                                ${unreadCount > 0 ? `<span style="background: #ef4444; color: white; padding: 2px 8px; border-radius: 10px; font-size: 10px;">${unreadCount} NEW</span>` : ''}
                            </div>
                            <div style="background: rgba(255,255,255,0.02); border: 1px solid rgba(255,255,255,0.06); border-radius: 20px; padding: 16px; margin-top: 8px;">
                                <div id="messagesContainer" style="max-height: 240px; overflow-y: auto; display: flex; flex-direction: column; gap: 8px; padding-right: 4px; margin-bottom: 16px;">
                                    ${booking.messages && booking.messages.length > 0 ?
                    booking.messages.map(msg => {
                        const isMine = msg.sender.toString() === appState.user._id;
                        return `<div class="msg-bubble ${isMine ? 'sent' : 'received'}">${msg.message}</div>`;
                    }).join('') :
                    '<div style="text-align: center; padding: 40px; color: rgba(255,255,255,0.2); font-size: 13px;">No messages yet. Start the conversation!</div>'
                }
                                </div>
                                <form onsubmit="window.sendBookingMessage(event, '${booking._id}', '${booking._type}')" style="display: flex; gap: 8px;">
                                    <input type="text" id="messageInput" class="am-input" placeholder="Type a message..." required style="flex: 1; border-radius: 16px;">
                                    <button type="submit" class="bk-filter-btn active" style="padding: 0 20px; height: 44px; border-radius: 16px;">Send</button>
                                </form>
                            </div>
                        </div>
                    </div>
                </div>
            `;

            document.getElementById('modalsContainer').innerHTML = modalContent;
            document.body.style.overflow = 'hidden';

            // Scroll to bottom of messages
            const msgBox = document.getElementById('messagesContainer');
            if (msgBox) msgBox.scrollTop = msgBox.scrollHeight;
        }
    } catch (e) {
        console.error('Error viewing details:', e);
        showToast('Failed to load details', 'error');
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
    // Remove any existing forms
    document.getElementById('rejectForm')?.remove();
    document.getElementById('counterProposalForm')?.remove();

    document.getElementById('actionButtons').style.display = 'none';
    const rejectHtml = `
        <div id="rejectForm" class="action-banner warning" style="margin-top: 16px; animation: bkmScaleIn 0.2s ease;">
            <div class="action-banner-title" style="color: #ef4444;">Reject Booking</div>
            <p style="font-size: 13px; color: rgba(255,255,255,0.6); margin-bottom: 12px;">Please provide a reason for rejecting this job.</p>
            <textarea id="rejectReason" class="am-input" placeholder="Enter reason (optional)" rows="3" style="width: 100%; border-radius: 12px; margin-bottom: 12px;"></textarea>
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px;">
                <button class="bk-filter-btn active" style="background: #ef4444;" onclick="window.submitRejection('${bookingId}', document.getElementById('rejectReason').value)">Confirm Reject</button>
                <button class="bk-filter-btn" onclick="document.getElementById('rejectForm').remove(); document.getElementById('actionButtons').style.display='grid';">Cancel</button>
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
        <div id="counterProposalForm" class="action-banner info" style="margin-top: 16px; animation: bkmScaleIn 0.2s ease;">
            <div class="action-banner-title" style="color: #3b82f6;">Counter Proposal</div>
            <p style="font-size: 13px; color: rgba(255,255,255,0.6); margin-bottom: 12px;">Propose a new amount for this booking.</p>
            <input type="number" id="counterAmount" class="am-input" placeholder="Enter new amount (USDC)" style="width: 100%; border-radius: 12px; margin-bottom: 12px;">
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px;">
                <button class="bk-filter-btn active" style="background: #3b82f6;" onclick="window.submitCounterProposal('${bookingId}', document.getElementById('counterAmount').value)">Send Proposal</button>
                <button class="bk-filter-btn" onclick="document.getElementById('counterProposalForm').remove(); document.getElementById('actionButtons').style.display='grid';">Cancel</button>
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