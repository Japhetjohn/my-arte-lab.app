
export function formatDate(dateString) {
    const date = new Date(dateString);
    const options = { month: 'short', day: 'numeric', year: 'numeric' };
    return date.toLocaleDateString('en-US', options);
}

export function formatStatus(status) {
    const statusMap = {
        'pending': 'Pending',
        'in_progress': 'In progress',
        'completed': 'Completed',
        'cancelled': 'Cancelled'
    };
    return statusMap[status] || status;
}

export function getStatusColor(status) {
    const colorMap = {
        'pending': '#FFA500',
        'in_progress': '#6B46FF',
        'completed': '#10B981',
        'cancelled': '#EF4444'
    };
    return colorMap[status] || '#64748B';
}

let toastQueue = [];
let currentToast = null;

export function showToast(message, type = 'success') {
    toastQueue.push({ message, type });
    if (!currentToast) {
        displayNextToast();
    }
}

function displayNextToast() {
    if (toastQueue.length === 0) {
        currentToast = null;
        return;
    }

    const { message, type } = toastQueue.shift();

    const iconMap = {
        'success': '<svg width="20" height="20" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="2"/><path d="M9 12l2 2 4-4" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>',
        'error': '<svg width="20" height="20" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="2"/><path d="M12 8v4M12 16h.01" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>',
        'info': '<svg width="20" height="20" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="2"/><path d="M12 16v-4M12 8h.01" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>'
    };

    const colorMap = {
        'success': '#10B981',
        'error': '#EF4444',
        'info': '#3B82F6'
    };

    const toast = document.createElement('div');
    toast.className = `toast-notification toast-${type}`;
    toast.innerHTML = `
        <div style="display: flex; align-items: center; gap: 12px;">
            <div style="color: ${colorMap[type]}; flex-shrink: 0;">
                ${iconMap[type] || iconMap['info']}
            </div>
            <div style="flex: 1; font-weight: 500;">${message}</div>
            <button onclick="this.parentElement.parentElement.remove()" style="
                background: none;
                border: none;
                color: var(--text-secondary);
                cursor: pointer;
                padding: 4px;
                display: flex;
                align-items: center;
                flex-shrink: 0;
            ">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                    <path d="M18 6L6 18M6 6l12 12" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
                </svg>
            </button>
        </div>
    `;

    toast.style.cssText = `
        position: fixed;
        top: 80px;
        right: 20px;
        z-index: 10001;
        min-width: 320px;
        max-width: 400px;
        background: var(--surface);
        padding: 16px;
        border-radius: 12px;
        box-shadow: 0 10px 40px rgba(0,0,0,0.15), 0 0 0 1px rgba(0,0,0,0.05);
        animation: slideInRight 0.3s cubic-bezier(0.68, -0.55, 0.265, 1.55);
        backdrop-filter: blur(10px);
    `;

    currentToast = toast;
    document.body.appendChild(toast);

    setTimeout(() => {
        toast.style.animation = 'slideOutRight 0.3s ease';
        setTimeout(() => {
            toast.remove();
            displayNextToast();
        }, 300);
    }, 4000);
}

export function closeModal() {
    document.getElementById('modalsContainer').innerHTML = '';
    document.body.style.overflow = 'auto';
}

export function openModal() {
    document.body.style.overflow = 'hidden';
}

export function closeModalOnBackdrop(event) {
    if (event.target.classList.contains('modal')) {
        closeModal();
    }
}

export function toggleSwitch(element) {
    element.classList.toggle('active');
    showToast('Setting updated!', 'success');
}

// Scroll Animation Observer
export function initScrollAnimations() {
    const observerOptions = {
        threshold: 0.1,
        rootMargin: '0px 0px -50px 0px'
    };

    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('visible');
            }
        });
    }, observerOptions);

    document.querySelectorAll('.fade-in-scroll').forEach(el => {
        observer.observe(el);
    });
}

// Skeleton Loader HTML Generator
export function createSkeletonCard() {
    return `
        <div class="skeleton-card">
            <div style="display: flex; gap: 16px; margin-bottom: 16px;">
                <div class="skeleton skeleton-avatar"></div>
                <div style="flex: 1;">
                    <div class="skeleton skeleton-line" style="width: 60%; margin-bottom: 8px;"></div>
                    <div class="skeleton skeleton-line short"></div>
                </div>
            </div>
            <div class="skeleton" style="height: 180px; margin-bottom: 12px;"></div>
            <div class="skeleton skeleton-text"></div>
            <div class="skeleton skeleton-text medium"></div>
        </div>
    `;
}

export function showSkeletonLoaders(count = 6) {
    let skeletons = '';
    for (let i = 0; i < count; i++) {
        skeletons += createSkeletonCard();
    }
    return `<div class="creators-grid">${skeletons}</div>`;
}

// Add button ripple effect programmatically
export function addButtonRipple(button, e) {
    const ripple = document.createElement('span');
    const rect = button.getBoundingClientRect();
    const size = Math.max(rect.width, rect.height);
    const x = e.clientX - rect.left - size / 2;
    const y = e.clientY - rect.top - size / 2;

    ripple.style.cssText = `
        position: absolute;
        width: ${size}px;
        height: ${size}px;
        border-radius: 50%;
        background: rgba(255, 255, 255, 0.5);
        left: ${x}px;
        top: ${y}px;
        transform: scale(0);
        animation: ripple 0.6s ease-out;
        pointer-events: none;
    `;

    button.appendChild(ripple);
    setTimeout(() => ripple.remove(), 600);
}

// Progressive Image Loading
export function loadImageProgressively(img) {
    const src = img.dataset.src || img.src;
    img.classList.add('progressive-image');
    
    const tempImg = new Image();
    tempImg.onload = () => {
        img.src = src;
        img.classList.add('loaded');
    };
    tempImg.src = src;
}

// Add page transition class
export function addPageTransition() {
    const mainContent = document.getElementById('mainContent');
    if (mainContent) {
        mainContent.classList.add('page-transition-enter');
        setTimeout(() => {
            mainContent.classList.remove('page-transition-enter');
        }, 400);
    }
}
