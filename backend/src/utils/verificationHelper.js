/**
 * Verification Authority Helper
 * Single authoritative source of truth for verification status and founder lifetime access across MyArteLab.
 */

// Stable internal user IDs for the two platform founders:
// 1. Japhet John (japhetjohnk@gmail.com)
// 2. Ebuka Esiobu (ebuka.esiobu@myartelab.com)
const FOUNDER_IDS = new Set([
  '6983ea1691b5040eb0fb0276',
  '6984f82a2398198b0598ba50'
]);

// Verified emails for the two platform founders
const FOUNDER_EMAILS = new Set([
  'japhetjohnk@gmail.com',
  'ebuka.esiobu@myartelab.com'
]);

/**
 * Determine if a user object corresponds to one of the two platform founders.
 * Identification is based strictly on stable internal IDs or verified founder emails.
 * Display names NEVER grant founder status.
 *
 * @param {object} user - User document or lean object
 * @returns {boolean}
 */
function isFounder(user) {
  if (!user) return false;
  const idStr = (user._id || user.id || '').toString();
  if (idStr && FOUNDER_IDS.has(idStr)) return true;
  const emailStr = (user.email || '').trim().toLowerCase();
  if (emailStr && FOUNDER_EMAILS.has(emailStr)) return true;
  return false;
}

/**
 * Advance a date by exactly 1 calendar month with day-of-month clamping.
 * e.g., Jan 15 -> Feb 15
 *       Jan 31 -> Feb 28 (or Feb 29 in leap year)
 *       Oct 24 -> Nov 24
 *
 * @param {Date|string|number} startDate
 * @returns {Date}
 */
function addOneCalendarMonth(startDate) {
  const date = new Date(startDate);
  const originalHours = date.getUTCHours();
  const originalMinutes = date.getUTCMinutes();
  const originalSeconds = date.getUTCSeconds();
  const originalMs = date.getUTCMilliseconds();

  const targetMonth = date.getUTCMonth() + 1;
  date.setUTCMonth(targetMonth);

  // If the day overflowed to the next month (e.g. Jan 31 -> Mar 3), clamp to last day of target month
  if (date.getUTCMonth() !== (targetMonth % 12)) {
    date.setUTCDate(0); // Sets to last day of previous month
  }

  date.setUTCHours(originalHours, originalMinutes, originalSeconds, originalMs);
  return date;
}

/**
 * Authoritative rule for determining whether a user is currently verified.
 * 
 * Rules:
 * 1. Platform founders (Japhet and Ebuka) have permanent lifetime verification.
 * 2. Ordinary users:
 *    - Must have an active verificationSubscription record (`active !== false`).
 *    - Must have a valid `expiresAt` timestamp.
 *    - Current time must be strictly before `expiresAt`.
 *    - An expired subscription or unconfirmed/cancelled payment does NOT grant verification.
 *    - A stale `isVerified: true` database flag alone is NOT sufficient.
 *
 * @param {object} user - User document or lean object
 * @param {Date} [now] - Current timestamp (default: new Date())
 * @returns {boolean}
 */
function isUserVerified(user, now = new Date()) {
  if (!user) return false;

  // 1. Founders have lifetime verification entitlement
  if (isFounder(user)) {
    return true;
  }

  // 2. Ordinary subscriber check:
  const sub = user.verificationSubscription;
  if (!sub) return false;

  // Subscription must not be cancelled/deactivated
  if (sub.active === false) {
    return false;
  }

  // Must have a valid expiration date
  if (!sub.expiresAt) {
    return false;
  }

  const expiresAt = new Date(sub.expiresAt);
  if (isNaN(expiresAt.getTime())) {
    return false;
  }

  // Must not be expired (strictly active before expiration time)
  return expiresAt.getTime() > now.getTime();
}

/**
 * Get comprehensive verification details for API responses
 *
 * @param {object} user - User document or lean object
 * @param {Date} [now] - Current timestamp (default: new Date())
 * @returns {object}
 */
function getVerificationDetails(user, now = new Date()) {
  if (!user) {
    return {
      isVerified: false,
      isFounder: false,
      expiresAt: null,
      active: false,
      status: 'none'
    };
  }

  const founder = isFounder(user);
  if (founder) {
    return {
      isVerified: true,
      isFounder: true,
      expiresAt: null,
      active: true,
      status: 'founder',
      lifetime: true
    };
  }

  const sub = user.verificationSubscription;
  const expiresAt = sub?.expiresAt ? new Date(sub.expiresAt) : null;
  const hasValidExpiry = expiresAt && !isNaN(expiresAt.getTime());
  const isExpired = hasValidExpiry ? expiresAt.getTime() <= now.getTime() : true;
  const isVerified = !isExpired && sub?.active !== false && hasValidExpiry;

  return {
    isVerified,
    isFounder: false,
    expiresAt: hasValidExpiry ? expiresAt.toISOString() : null,
    active: isVerified,
    status: isVerified ? 'active' : (isExpired && sub ? 'expired' : 'none'),
    autoRenew: sub?.autoRenew || false
  };
}

module.exports = {
  FOUNDER_IDS,
  FOUNDER_EMAILS,
  isFounder,
  isUserVerified,
  getVerificationDetails,
  addOneCalendarMonth
};
