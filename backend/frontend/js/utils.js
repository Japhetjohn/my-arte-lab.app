
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

// ===================================
// 2025 ENHANCED ANIMATIONS & EFFECTS
// ===================================

// Enhanced Scroll Animations with Dramatic Effects
export function initEnhancedScrollAnimations() {
    const observerOptions = {
        threshold: 0.15,
        rootMargin: '0px 0px -100px 0px'
    };

    const dramaticObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('visible');

                // Add parallax effect to certain elements
                if (entry.target.classList.contains('bento-item')) {
                    entry.target.style.animation = 'slideUpBounce 0.8s cubic-bezier(0.34, 1.56, 0.64, 1) forwards';
                }
            }
        });
    }, observerOptions);

    // Observe all scroll-fade-in elements
    document.querySelectorAll('.scroll-fade-in, .fade-in-scroll').forEach(el => {
        dramaticObserver.observe(el);
    });

    // Parallax effect for hero sections
    window.addEventListener('scroll', () => {
        const scrolled = window.pageYOffset;
        const heroSection = document.querySelector('.hero-section-modern');

        if (heroSection) {
            const heroContent = heroSection.querySelector('.hero-content-modern');
            if (heroContent && scrolled < 600) {
                heroContent.style.transform = `translateY(${scrolled * 0.5}px)`;
                heroContent.style.opacity = 1 - (scrolled / 600);
            }
        }
    });
}

// Interactive Cursor Tracking for Dynamic Light Effects
export function initCursorTracking() {
    const cards = document.querySelectorAll('.dynamic-light');

    cards.forEach(card => {
        card.addEventListener('mousemove', (e) => {
            const rect = card.getBoundingClientRect();
            const x = ((e.clientX - rect.left) / rect.width) * 100;
            const y = ((e.clientY - rect.top) / rect.height) * 100;

            card.style.setProperty('--mouse-x', `${x}%`);
            card.style.setProperty('--mouse-y', `${y}%`);
        });

        card.addEventListener('mouseleave', () => {
            card.style.setProperty('--mouse-x', '50%');
            card.style.setProperty('--mouse-y', '50%');
        });
    });
}

// Scroll Progress Indicator
export function initScrollProgress() {
    // Create scroll progress bar if it doesn't exist
    let progressBar = document.getElementById('scroll-progress');

    if (!progressBar) {
        progressBar = document.createElement('div');
        progressBar.id = 'scroll-progress';
        progressBar.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 0%;
            height: 3px;
            background: linear-gradient(90deg, var(--primary), var(--secondary));
            z-index: 10000;
            transition: width 0.1s ease-out;
            box-shadow: 0 0 10px rgba(151, 71, 255, 0.5);
        `;
        document.body.appendChild(progressBar);
    }

    window.addEventListener('scroll', () => {
        const windowHeight = document.documentElement.scrollHeight - document.documentElement.clientHeight;
        const scrolled = (window.pageYOffset / windowHeight) * 100;
        progressBar.style.width = `${scrolled}%`;
    });
}

// Magnetic Button Effect (2025 Trend)
export function initMagneticButtons() {
    const buttons = document.querySelectorAll('.btn-primary, .btn-secondary');

    buttons.forEach(button => {
        button.addEventListener('mousemove', (e) => {
            const rect = button.getBoundingClientRect();
            const x = e.clientX - rect.left - rect.width / 2;
            const y = e.clientY - rect.top - rect.height / 2;

            const distance = Math.sqrt(x * x + y * y);
            const maxDistance = 50;

            if (distance < maxDistance) {
                const strength = (maxDistance - distance) / maxDistance;
                const moveX = x * strength * 0.3;
                const moveY = y * strength * 0.3;

                button.style.transform = `translate(${moveX}px, ${moveY}px) scale(1.05)`;
            }
        });

        button.addEventListener('mouseleave', () => {
            button.style.transform = 'translate(0, 0) scale(1)';
        });
    });
}

// Count Up Animation for Numbers
export function animateCounter(element, target, duration = 2000) {
    const start = 0;
    const increment = target / (duration / 16); // 60fps
    let current = start;

    const timer = setInterval(() => {
        current += increment;
        if (current >= target) {
            element.textContent = target;
            clearInterval(timer);
        } else {
            element.textContent = Math.floor(current);
        }
    }, 16);
}

// Initialize all 2025 effects
export function init2025Effects() {
    // Wait for DOM to be ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            initEnhancedScrollAnimations();
            initCursorTracking();
            initScrollProgress();
            initMagneticButtons();
        });
    } else {
        initEnhancedScrollAnimations();
        initCursorTracking();
        initScrollProgress();
        initMagneticButtons();
    }
}

// ====================================
// CREATOR RANKING ALGORITHM
// Based on Fiverr/Upwork best practices
// ====================================

/**
 * Calculate creator quality score (0-100)
 * Production-ready algorithm based on Fiverr/Upwork best practices
 * Factors: completion rate, ratings, response time, cancellations, repeat customers, activity
 */
export function calculateCreatorScore(creator) {
    let totalScore = 0;

    // Extract all metrics
    const rating = parseFloat(creator.rating) || 0;
    const reviewCount = creator.reviewCount || 0;
    const completedJobs = creator.completedJobs || 0;
    const totalJobs = creator.totalJobs || completedJobs; // Total jobs offered (for acceptance rate)
    const cancelledJobs = creator.cancelledJobs || 0;
    const repeatCustomers = creator.repeatCustomers || 0;
    const totalCustomers = creator.totalCustomers || (completedJobs > 0 ? completedJobs : 1);

    // === 1. COMPLETION/SUCCESS RATE (25 points) ===
    // CRITICAL: Like Upwork's JSS, this is foundational
    const completionRate = totalJobs > 0 ? ((completedJobs - cancelledJobs) / totalJobs) * 100 : 100;

    if (completionRate >= 95) totalScore += 25;        // Excellent (Fiverr/Upwork standard)
    else if (completionRate >= 90) totalScore += 22;   // Very good
    else if (completionRate >= 85) totalScore += 18;   // Good
    else if (completionRate >= 80) totalScore += 12;   // Acceptable
    else if (completionRate >= 70) totalScore += 6;    // Poor
    else totalScore += 0;                               // Failing

    // === 2. RATING SCORE (25 points) ===
    // Weighted by review count (more reviews = more credible)
    let ratingScore = 0;

    if (reviewCount > 0) {
        // Base rating score
        if (rating >= 4.9) ratingScore = 25;
        else if (rating >= 4.8) ratingScore = 23;
        else if (rating >= 4.7) ratingScore = 21;
        else if (rating >= 4.5) ratingScore = 18;
        else if (rating >= 4.0) ratingScore = 12;
        else if (rating >= 3.5) ratingScore = 6;
        else ratingScore = 2;

        // Review count multiplier (more reviews = more reliable rating)
        let credibilityMultiplier = 1.0;
        if (reviewCount >= 50) credibilityMultiplier = 1.2;
        else if (reviewCount >= 25) credibilityMultiplier = 1.15;
        else if (reviewCount >= 10) credibilityMultiplier = 1.1;
        else if (reviewCount >= 5) credibilityMultiplier = 1.05;
        else if (reviewCount < 3) credibilityMultiplier = 0.8; // Penalize very few reviews

        ratingScore = Math.min(ratingScore * credibilityMultiplier, 25);
    } else {
        // New creators with no reviews get baseline
        ratingScore = 12; // Middle ground for new sellers
    }

    totalScore += ratingScore;

    // === 3. CANCELLATION PENALTY (0-15 point deduction) ===
    // Critical on all platforms - cancellations kill rankings
    const cancellationRate = totalJobs > 0 ? (cancelledJobs / totalJobs) * 100 : 0;

    let cancellationPenalty = 0;
    if (cancellationRate >= 10) cancellationPenalty = 15;      // Severe
    else if (cancellationRate >= 5) cancellationPenalty = 10;  // High
    else if (cancellationRate >= 3) cancellationPenalty = 6;   // Moderate
    else if (cancellationRate >= 1) cancellationPenalty = 3;   // Minor

    totalScore = Math.max(totalScore - cancellationPenalty, 0);

    // === 4. RESPONSE TIME SCORE (15 points) ===
    // Parse response time string (e.g., "Within 1 hour", "Within a day")
    const responseTimeStr = (creator.responseTime || '').toLowerCase();

    if (responseTimeStr.includes('minute') || responseTimeStr.includes('< 1 hour')) {
        totalScore += 15; // Excellent
    } else if (responseTimeStr.includes('1 hour') || responseTimeStr.includes('2 hour')) {
        totalScore += 13; // Very good
    } else if (responseTimeStr.includes('4 hour') || responseTimeStr.includes('few hour')) {
        totalScore += 11; // Good
    } else if (responseTimeStr.includes('day') || responseTimeStr.includes('24')) {
        totalScore += 7;  // Acceptable
    } else if (responseTimeStr.includes('2 day') || responseTimeStr.includes('48')) {
        totalScore += 3;  // Slow
    } else {
        totalScore += 5;  // Default middle score
    }

    // === 5. REPEAT CUSTOMER RATE (10 points) ===
    // Shows quality - like Fiverr's repeat business metric
    const repeatRate = totalCustomers > 0 ? (repeatCustomers / totalCustomers) * 100 : 0;

    if (repeatRate >= 40) totalScore += 10;        // Exceptional
    else if (repeatRate >= 30) totalScore += 8;    // Excellent
    else if (repeatRate >= 20) totalScore += 6;    // Very good
    else if (repeatRate >= 10) totalScore += 4;    // Good
    else if (repeatRate >= 5) totalScore += 2;     // Some repeats
    // else 0 points

    // === 6. VERIFICATION & TRUST (10 points) ===
    if (creator.verified) {
        totalScore += 10;
    }

    // === 7. ACTIVITY & RECENCY (10 points with penalties) ===
    if (creator.createdAt) {
        const daysSinceCreation = (Date.now() - new Date(creator.createdAt)) / (1000 * 60 * 60 * 24);
        const lastActiveDate = creator.lastActive ? new Date(creator.lastActive) : new Date(creator.createdAt);
        const daysSinceActive = (Date.now() - lastActiveDate) / (1000 * 60 * 60 * 24);

        // New seller boost (60 days like Upwork, not 30)
        if (daysSinceCreation <= 60 && completedJobs >= 3 && rating >= 4.5 && completionRate >= 90) {
            totalScore += 10; // Rising Talent boost
        }
        // Established sellers with momentum
        else if (completedJobs >= 10 && daysSinceActive <= 14) {
            totalScore += 8; // Active and established
        }
        else if (completedJobs >= 5 && daysSinceActive <= 30) {
            totalScore += 5; // Regularly active
        }

        // INACTIVITY PENALTY (like all major platforms)
        if (daysSinceActive > 90) {
            totalScore = totalScore * 0.7; // 30% penalty for 90+ days inactive
        } else if (daysSinceActive > 60) {
            totalScore = totalScore * 0.85; // 15% penalty for 60+ days inactive
        } else if (daysSinceActive > 30) {
            totalScore = totalScore * 0.95; // 5% penalty for 30+ days inactive
        }
    }

    // === 8. PORTFOLIO & PROFILE COMPLETENESS (5 points) ===
    const portfolioCount = creator.portfolio?.length || 0;
    const servicesCount = creator.services?.length || 0;

    let profileScore = 0;
    if (portfolioCount >= 10 && servicesCount >= 5) profileScore = 5;
    else if (portfolioCount >= 5 && servicesCount >= 3) profileScore = 3;
    else if (portfolioCount >= 1 && servicesCount >= 1) profileScore = 1;

    totalScore += profileScore;

    // === 9. BONUS: TRENDING/MOMENTUM (up to +5 points) ===
    // Recent performance trending up gets boost (like Fiverr's algorithm)
    if (completedJobs >= 3) {
        const recentJobs = Math.min(completedJobs, 5); // Last 5 jobs
        // If all recent jobs have high ratings (4.5+), add momentum bonus
        if (rating >= 4.7 && reviewCount >= recentJobs) {
            totalScore += 5;
        }
    }

    // Final score: Cap at 100, floor at 0
    return Math.max(0, Math.min(totalScore, 100));
}

/**
 * Determine creator tier/badge based on score
 */
export function getCreatorTier(score, creator) {
    const rating = parseFloat(creator.rating) || 0;
    const reviewCount = creator.reviewCount || 0;
    const completedJobs = creator.completedJobs || 0;
    const daysSinceCreation = creator.createdAt
        ? (Date.now() - new Date(creator.createdAt)) / (1000 * 60 * 60 * 24)
        : 999;

    // TOP RATED (95+ score, 4.8+ rating, 50+ jobs)
    if (score >= 95 && rating >= 4.8 && completedJobs >= 50) {
        return {
            tier: 'TOP_RATED',
            badge: '⭐ Top Rated',
            color: '#FFD700',
            description: 'Exceptional quality and reliability'
        };
    }

    // RISING TALENT (< 30 days, 3+ jobs, 4.5+ rating)
    if (daysSinceCreation <= 30 && completedJobs >= 3 && rating >= 4.5) {
        return {
            tier: 'RISING_TALENT',
            badge: '🚀 Rising Talent',
            color: '#10B981',
            description: 'New creator with great potential'
        };
    }

    // QUALITY SELLER (85+ score, 4.5+ rating, 25+ jobs)
    if (score >= 85 && rating >= 4.5 && completedJobs >= 25) {
        return {
            tier: 'QUALITY_SELLER',
            badge: '✓ Quality Seller',
            color: '#6B46FF',
            description: 'Consistently delivers quality work'
        };
    }

    // RELIABLE SELLER (75+ score, 10+ jobs)
    if (score >= 75 && completedJobs >= 10) {
        return {
            tier: 'RELIABLE_SELLER',
            badge: '✓ Reliable',
            color: '#3B82F6',
            description: 'Dependable and experienced'
        };
    }

    // ACTIVE SELLER (60+ score, 5+ jobs)
    if (score >= 60 && completedJobs >= 5) {
        return {
            tier: 'ACTIVE_SELLER',
            badge: '✓ Active',
            color: '#8B5CF6',
            description: 'Active on the platform'
        };
    }

    // NEW SELLER (default)
    return {
        tier: 'NEW_SELLER',
        badge: '',
        color: '',
        description: 'New to the platform'
    };
}

/**
 * Sort creators by quality score (for "Sort by relevance")
 */
export function sortCreatorsByRelevance(creators) {
    return creators.sort((a, b) => {
        const scoreA = calculateCreatorScore(a);
        const scoreB = calculateCreatorScore(b);
        return scoreB - scoreA; // Highest score first
    });
}
