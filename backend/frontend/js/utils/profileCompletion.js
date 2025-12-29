/**
 * Profile Completion Calculator
 * Calculates profile completion percentage based on filled fields
 */

export function calculateProfileCompletion(user) {
    if (!user) return 0;

    const fields = [
        { key: 'name', weight: 10 },
        { key: 'email', weight: 10 },
        { key: 'avatar', weight: 15 },
        { key: 'bio', weight: 15 },
        { key: 'phoneNumber', weight: 10 },
        { key: 'location.localArea', weight: 5 },
        { key: 'location.state', weight: 5 },
        { key: 'location.country', weight: 5 },
        { key: 'isEmailVerified', weight: 10 },
        { key: 'wallet.address', weight: 10 }
    ];

    if (user.role === 'creator') {
        fields.push(
            { key: 'category', weight: 10 },
            { key: 'skills', weight: 10, isArray: true, minLength: 1 },
            { key: 'services', weight: 15, isArray: true, minLength: 1 },
            { key: 'portfolio', weight: 10, isArray: true, minLength: 1 },
            { key: 'coverImage', weight: 10 }
        );
    }

    let totalWeight = fields.reduce((sum, field) => sum + field.weight, 0);
    let achievedWeight = 0;

    fields.forEach(field => {
        const value = getNestedValue(user, field.key);

        if (field.isArray) {
            if (Array.isArray(value) && value.length >= (field.minLength || 1)) {
                achievedWeight += field.weight;
            }
        } else {
            if (value !== null && value !== undefined && value !== '') {
                achievedWeight += field.weight;
            }
        }
    });

    const percentage = Math.min(100, Math.round((achievedWeight / totalWeight) * 100));
    return percentage;
}

function getNestedValue(obj, path) {
    return path.split('.').reduce((current, key) => current?.[key], obj);
}

export function getIncompleteFields(user) {
    if (!user) return [];

    const incomplete = [];

    if (!user.avatar) incomplete.push({ field: 'Profile Picture', action: 'Upload a profile photo' });
    if (!user.bio) incomplete.push({ field: 'Bio', action: 'Add a bio to your profile' });
    if (!user.phoneNumber) incomplete.push({ field: 'Phone Number', action: 'Add your phone number' });
    if (!user.location?.localArea || !user.location?.state || !user.location?.country) incomplete.push({ field: 'Location', action: 'Add your location' });
    if (!user.isEmailVerified) incomplete.push({ field: 'Email Verification', action: 'Verify your email address' });

    if (user.role === 'creator') {
        if (!user.category) incomplete.push({ field: 'Category', action: 'Select your primary category' });
        if (!user.skills || user.skills.length === 0) incomplete.push({ field: 'Skills', action: 'Add your skills' });
        if (!user.services || user.services.length === 0) incomplete.push({ field: 'Services', action: 'Create your first service' });
        if (!user.portfolio || user.portfolio.length === 0) incomplete.push({ field: 'Portfolio', action: 'Add portfolio items' });
        if (!user.coverImage) incomplete.push({ field: 'Cover Image', action: 'Upload a cover image' });
    }

    return incomplete;
}

export function renderProfileCompletionWidget(user) {
    const percentage = calculateProfileCompletion(user);
    const incompleteFields = getIncompleteFields(user);

    if (percentage >= 100) {
        return `
            <div class="card" style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 20px; text-align: center;">
                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" style="margin-bottom: 12px;">
                    <path d="M22 11.08V12a10 10 0 11-5.93-9.14" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                    <path d="M22 4L12 14.01l-3-3" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                </svg>
                <h3 style="margin-bottom: 8px;">Profile Complete!</h3>
                <p style="opacity: 0.9;">Your profile is fully set up and ready to attract clients.</p>
            </div>
        `;
    }

    return `
        <div class="card">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px;">
                <h3>Profile Completion</h3>
                <span style="font-size: 24px; font-weight: 700; color: var(--primary);">${percentage}%</span>
            </div>

            <!-- Progress Bar -->
            <div style="background: var(--border); height: 8px; border-radius: 4px; overflow: hidden; margin-bottom: 16px;">
                <div style="background: var(--primary); height: 100%; width: ${percentage}%; transition: width 0.3s ease;"></div>
            </div>

            <p class="text-secondary mb-md" style="font-size: 14px;">
                Complete your profile to increase visibility and attract more clients!
            </p>

            ${incompleteFields.length > 0 ? `
                <div style="background: var(--surface); padding: 16px; border-radius: 8px;">
                    <div style="font-weight: 600; margin-bottom: 12px; font-size: 14px;">What's Missing:</div>
                    <ul style="list-style: none; padding: 0; margin: 0;">
                        ${incompleteFields.map(item => `
                            <li style="padding: 8px 0; border-bottom: 1px solid var(--border); display: flex; align-items: center; gap: 8px;">
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" style="flex-shrink: 0; color: var(--primary);">
                                    <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="2"/>
                                    <path d="M12 8v4M12 16h.01" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
                                </svg>
                                <div style="flex: 1;">
                                    <div style="font-weight: 500; font-size: 13px;">${item.field}</div>
                                    <div style="color: var(--text-secondary); font-size: 12px;">${item.action}</div>
                                </div>
                            </li>
                        `).join('')}
                    </ul>
                </div>
            ` : ''}
        </div>
    `;
}
