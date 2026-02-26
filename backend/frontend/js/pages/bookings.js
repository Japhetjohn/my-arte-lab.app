import { appState } from '../state.js';
import { formatDate, formatStatus, getStatusColor } from '../utils.js';
import api from '../services/api.js';

let bookings = [];
let currentFilter = 'all'; // all, active, completed

const BOOKINGS_STYLES = ''; // Styles moved to styles.css
;

export async function renderBookingsPage() {
    const mainContent = document.getElementById('mainContent');

    if (!appState.user) {
        mainContent.innerHTML = `
            <div style="min-height: 60vh; display: flex; align-items: center; justify-content: center; padding: 40px 20px;">
                <div style="text-align: center; max-width: 400px;">
                    <div style="width: 80px; height: 80px; background: linear-gradient(135deg, rgba(151,71,255,0.15), rgba(107,70,255,0.15)); border-radius: 24px; display: flex; align-items: center; justify-content: center; margin: 0 auto 24px; border: 1px solid rgba(151,71,255,0.2);">
                        <svg width="36" height="36" viewBox="0 0 24 24" fill="none" style="color: var(--primary);">
                            <path d="M16 2v4M8 2v4M3 10h18M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" stroke="currentColor" stroke-width="2"/>
                        </svg>
                    </div>
                    <h2 style="margin-bottom: 8px; font-size: 22px;">Bookings</h2>
                    <p style="color: var(--text-secondary); margin-bottom: 24px; line-height: 1.6;">Sign in to view and manage your active collaborations</p>
                    <button class="btn-primary" onclick="showAuthModal('signin')">Sign in to continue</button>
                </div>
            </div>
        `;
        return;
    }

    mainContent.innerHTML = `
        <div style="max-width: 680px; margin: 0 auto; padding: 32px 20px 60px;">
            <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 28px;">
                <div>
                    <h1 style="font-size: 26px; font-weight: 700; margin: 0 0 4px;">Bookings</h1>
                    <p style="color: var(--text-secondary); font-size: 14px; margin: 0;">Track your collaborations</p>
                </div>
                <button onclick="window.location.reload()" style="display: flex; align-items: center; gap: 6px; background: rgba(151,71,255,0.08); border: 1px solid rgba(151,71,255,0.2); color: var(--primary); padding: 8px 14px; border-radius: 10px; cursor: pointer; font-size: 13px; font-weight: 600; transition: all 0.2s;">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M4 12a8 8 0 1 1 16 0" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"/><path d="M4 12l-2-2m2 2l2-2" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"/></svg>
                    Refresh
                </button>
            </div>
            
            <div id="bookingsContent" style="display:none;"></div>
        </div>
        <style>
            @keyframes fadeIn { from { opacity:0; transform:translateY(8px); } to { opacity:1; transform:translateY(0); } }
            .bookings-section { animation: fadeIn 0.3s ease; }
            .tx-item { 
                display: flex; align-items: center; gap: 14px; padding: 14px 16px; 
                border-radius: 14px; background: rgba(255,255,255,0.04); 
                border: 1px solid rgba(255,255,255,0.07); margin-bottom: 8px; 
                transition: all 0.2s; cursor: pointer; 
            }
            .tx-item:hover { background: rgba(255,255,255,0.08); transform: translateY(-1px); border-color: rgba(151,71,255,0.2); }
            .section-header { font-size: 13px; font-weight: 700; color: var(--text-secondary); text-transform: uppercase; letter-spacing: 0.08em; margin: 28px 0 12px; }
            .filter-tabs { display: flex; gap: 8px; margin-bottom: 24px; }
            .filter-tab { 
                padding: 8px 16px; border-radius: 20px; font-size: 13px; font-weight: 600; 
                cursor: pointer; transition: all 0.2s; border: 1px solid rgba(255,255,255,0.08); 
                background: rgba(255,255,255,0.03); color: var(--text-secondary);
            }
            .filter-tab.active { background: rgba(151,71,255,0.15); color: var(--primary); border-color: rgba(151,71,255,0.3); }
        </style>
    `;

    window.showLoadingSpinner('Loading your bookings...');

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

        window.hideLoadingSpinner();
        const content = document.getElementById('bookingsContent');
        content.style.display = 'block';
        renderBookingsList();
    } catch (error) {
        console.error('Failed to load bookings:', error);
        window.hideLoadingSpinner();
        const content = document.getElementById('bookingsContent');
        content.style.display = 'block';
        content.innerHTML = `
            <div style="text-align: center; padding: 48px 20px;">
                <div style="width: 56px; height: 56px; background: rgba(239,68,68,0.1); border-radius: 16px; display: flex; align-items: center; justify-content: center; margin: 0 auto 16px;">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" style="color: #EF4444;"><circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="2"/><path d="M12 8v4M12 16h.01" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>
                </div>
                <h3 style="margin-bottom: 8px;">Failed to load bookings</h3>
                <p style="color: var(--text-secondary); margin-bottom: 20px; font-size: 14px;">${error.message}</p>
                <button class="btn-primary" onclick="window.location.reload()">Try again</button>
            </div>
        `;
    }
}


function renderBookingsList() {
    const listContainer = document.getElementById('bookingsContent');
    if (!listContainer) return;

    const activeBookings = bookings.filter(b => !['completed', 'cancelled', 'completed_with_escrow'].includes(b.status));
    const completedBookings = bookings.filter(b => ['completed', 'completed_with_escrow'].includes(b.status));

    const totalInEscrow = activeBookings.reduce((sum, b) => sum + (b.amount || 0), 0);
    const totalEarnings = completedBookings.reduce((sum, b) => sum + (b.amount || 0), 0);

    let displayBookings = bookings;
    if (currentFilter === 'active') {
        displayBookings = activeBookings;
    } else if (currentFilter === 'completed') {
        displayBookings = completedBookings;
    }

    listContainer.innerHTML = `
        <div class="bookings-section">
            <!-- STATS CARD -->
            <div style="background: linear-gradient(135deg, #7c3aed 0%, #4f46e5 100%); border-radius: 24px; padding: 24px; margin-bottom: 28px; position: relative; overflow: hidden; box-shadow: 0 12px 24px rgba(124, 58, 237, 0.2);">
                <div style="position: absolute; top: -20px; right: -20px; width: 120px; height: 120px; background: rgba(255,255,255,0.07); border-radius: 50%;"></div>
                <div style="position: relative; display: flex; flex-direction: column; gap: 20px;">
                    <div>
                        <div style="font-size: 11px; font-weight: 700; color: rgba(255,255,255,0.65); text-transform: uppercase; letter-spacing: 0.1em; margin-bottom: 4px;">Total Volume</div>
                        <div style="font-size: 32px; font-weight: 800; color: white;">$${(totalEarnings + totalInEscrow).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
                    </div>
                    <div style="display: flex; gap: 12px; padding-top: 16px; border-top: 1px solid rgba(255,255,255,0.12);">
                        <div style="flex: 1;">
                            <div style="font-size: 10px; color: rgba(255,255,255,0.55); margin-bottom: 2px;">In Progress</div>
                            <div style="font-size: 15px; font-weight: 700; color: #FBD38D;">$${totalInEscrow.toFixed(2)}</div>
                        </div>
                        <div style="width: 1px; background: rgba(255,255,255,0.12);"></div>
                        <div style="flex: 1;">
                            <div style="font-size: 10px; color: rgba(255,255,255,0.55); margin-bottom: 2px;">Completed</div>
                            <div style="font-size: 15px; font-weight: 700; color: #9AE6B4;">$${totalEarnings.toFixed(2)}</div>
                        </div>
                        <div style="width: 1px; background: rgba(255,255,255,0.12);"></div>
                        <div style="flex: 1;">
                            <div style="font-size: 10px; color: rgba(255,255,255,0.55); margin-bottom: 2px;">Total Jobs</div>
                            <div style="font-size: 15px; font-weight: 700; color: white;">${bookings.length}</div>
                        </div>
                    </div>
                </div>
            </div>

            <!-- FILTERS -->
            <div class="filter-tabs">
                <div class="filter-tab ${currentFilter === 'all' ? 'active' : ''}" onclick="window.filterBookings('all')">All History</div>
                <div class="filter-tab ${currentFilter === 'active' ? 'active' : ''}" onclick="window.filterBookings('active')">In Progress</div>
                <div class="filter-tab ${currentFilter === 'completed' ? 'active' : ''}" onclick="window.filterBookings('completed')">Completed</div>
            </div>

            <!-- LIST -->
            ${displayBookings.length > 0 ? `
                <div class="section-header">Recent Activity</div>
                ${displayBookings.map(b => buildBookingItemHTML(b)).join('')}
            ` : `
                <div style="text-align: center; padding: 48px 20px; background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.07); border-radius: 20px; margin-top: 20px;">
                    <div style="width: 48px; height: 48px; background: rgba(255,255,255,0.05); border-radius: 14px; display: flex; align-items: center; justify-content: center; margin: 0 auto 16px; color: var(--text-secondary); opacity: 0.5;">
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M16 2v4M8 2v4M3 10h18M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"/></svg>
                    </div>
                    <p style="color: var(--text-secondary); font-size: 14px;">No ${currentFilter === 'all' ? 'bookings' : currentFilter + ' bookings'} found</p>
                </div>
            `}
        </div>
    `;
}

function buildBookingItemHTML(booking) {
    const isCreator = appState.user.role === 'creator';
    const otherParty = isCreator ? booking.client : booking.creator;
    const name = otherParty?.name || (isCreator ? 'Client' : 'Creator');
    const avatar = otherParty?.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=9747FF&color=fff`;

    const statusColors = {
        completed: '#10B981', in_progress: '#3B82F6', confirmed: '#6366F1',
        awaiting_payment: '#F59E0B', pending: '#9CA3AF', cancelled: '#EF4444'
    };
    const sColor = statusColors[booking.status] || '#9CA3AF';
    const statusLabel = formatStatus(booking.status);

    return `
        <div class="tx-item" onclick="window.viewBookingDetails('${booking._id}')">
            <div style="width: 44px; height: 44px; min-width: 44px; border-radius: 12px; overflow: hidden; border: 1.5px solid rgba(151,71,255,0.1);">
                <img src="${avatar}" style="width: 100%; height: 100%; object-fit: cover;">
            </div>
            <div style="flex: 1; min-width: 0;">
                <div style="font-size: 14px; font-weight: 700; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; margin-bottom: 2px;">${booking.serviceTitle || 'Project Collaboration'}</div>
                <div style="font-size: 12px; color: var(--text-secondary); font-weight: 500;">${name} • ${formatDate(booking.createdAt)}</div>
            </div>
            <div style="text-align: right; min-width: 80px;">
                <div style="font-size: 15px; font-weight: 800; color: white; margin-bottom: 2px;">$${(booking.amount || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</div>
                <div style="font-size: 11px; font-weight: 700; color: ${sColor}; text-transform: capitalize;">${statusLabel}</div>
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