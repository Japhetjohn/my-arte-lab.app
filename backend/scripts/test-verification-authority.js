const assert = require('assert');
const {
  FOUNDER_IDS,
  FOUNDER_EMAILS,
  isFounder,
  isUserVerified,
  getVerificationDetails,
  addOneCalendarMonth
} = require('../src/utils/verificationHelper');

console.log('🧪 Starting Verification Authority Unit Tests...\n');

// 1. Founder Lifetime Verification Tests
console.log('Case 1: Founders Identification');
const japhetUserById = { _id: '6983ea1691b5040eb0fb0276', name: 'japhet john' };
const japhetUserByEmail = { _id: 'any_random_id', email: 'japhetjohnk@gmail.com' };
const ebukaUserById = { _id: '6984f82a2398198b0598ba50', name: 'Ebuka Esiobu' };
const ebukaUserByEmail = { _id: 'any_random_id', email: 'ebuka.esiobu@myartelab.com' };

assert.strictEqual(isFounder(japhetUserById), true, 'Japhet identified by ID');
assert.strictEqual(isFounder(japhetUserByEmail), true, 'Japhet identified by email');
assert.strictEqual(isFounder(ebukaUserById), true, 'Ebuka identified by ID');
assert.strictEqual(isFounder(ebukaUserByEmail), true, 'Ebuka identified by email');

assert.strictEqual(isUserVerified(japhetUserById), true, 'Japhet is verified without subscription');
assert.strictEqual(isUserVerified(ebukaUserById), true, 'Ebuka is verified without subscription');

const founderDetails = getVerificationDetails(japhetUserById);
assert.strictEqual(founderDetails.isVerified, true);
assert.strictEqual(founderDetails.isFounder, true);
assert.strictEqual(founderDetails.status, 'founder');
assert.strictEqual(founderDetails.expiresAt, null);
console.log('✓ Founders retain lifetime verification without expiration.\n');

// 2. Impostor Name Test
console.log('Case 2: Name Matching Does NOT Grant Founder Access');
const impostorJaphet = {
  _id: '507f191e810c19729de860ea',
  name: 'japhet john',
  email: 'otherjaphet@example.com'
};
const impostorEbuka = {
  _id: '507f191e810c19729de860eb',
  name: 'Ebuka Esiobu',
  email: 'otherebuka@example.com'
};
assert.strictEqual(isFounder(impostorJaphet), false, 'Impostor Japhet must NOT be founder');
assert.strictEqual(isFounder(impostorEbuka), false, 'Impostor Ebuka must NOT be founder');
assert.strictEqual(isUserVerified(impostorJaphet), false, 'Impostor Japhet is not verified');
assert.strictEqual(isUserVerified(impostorEbuka), false, 'Impostor Ebuka is not verified');
console.log('✓ Users with matching display names are strictly blocked from founder privileges.\n');

// 3. Paid Subscriber Active Status
console.log('Case 3: Active Paid Monthly Subscriber');
const activeSubUser = {
  _id: '507f191e810c19729de860ec',
  email: 'subscriber@example.com',
  isVerified: true,
  verificationSubscription: {
    active: true,
    subscribedAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
    expiresAt: new Date(Date.now() + 25 * 24 * 60 * 60 * 1000), // 25 days left
    autoRenew: true
  }
};
assert.strictEqual(isUserVerified(activeSubUser), true, 'Active subscriber is verified');
const activeDetails = getVerificationDetails(activeSubUser);
assert.strictEqual(activeDetails.isVerified, true);
assert.strictEqual(activeDetails.status, 'active');
assert.strictEqual(activeDetails.isFounder, false);
console.log('✓ Active paid monthly subscriber is verified.\n');

// 4. Expired Subscriber Removed Everywhere
console.log('Case 4: Expired Monthly Subscriber');
const expiredSubUser = {
  _id: '6aa3f5ee66018c3d0509cb7f', // Emmanuel Ajiboye's actual ID
  email: 'ajiboyeemmanuel4569@gmail.com',
  isVerified: true, // Legacy DB flag
  verificationSubscription: {
    active: true,
    subscribedAt: new Date('2026-09-11T12:48:25.117Z'),
    expiresAt: new Date('2026-10-11T12:48:25.117Z') // Expired on Oct 11, 2026
  }
};
const nowTest = new Date('2026-10-24T12:00:00.000Z');
assert.strictEqual(isUserVerified(expiredSubUser, nowTest), false, 'Expired subscriber must NOT be verified');
const expiredDetails = getVerificationDetails(expiredSubUser, nowTest);
assert.strictEqual(expiredDetails.isVerified, false);
assert.strictEqual(expiredDetails.status, 'expired');
assert.strictEqual(expiredDetails.active, false);
console.log('✓ Expired monthly subscriber loses verification badge everywhere regardless of legacy DB flag.\n');

// 5. Calendar Month Calculations
console.log('Case 5: Calendar Month Calculation & Clamping');
const jan15 = new Date('2026-01-15T10:00:00.000Z');
assert.strictEqual(addOneCalendarMonth(jan15).toISOString(), '2026-02-15T10:00:00.000Z');

// Jan 31 -> clamped to Feb 28 (non-leap year)
const jan31 = new Date('2026-01-31T10:00:00.000Z');
assert.strictEqual(addOneCalendarMonth(jan31).toISOString(), '2026-02-28T10:00:00.000Z');

// Mar 31 -> clamped to Apr 30
const mar31 = new Date('2026-03-31T10:00:00.000Z');
assert.strictEqual(addOneCalendarMonth(mar31).toISOString(), '2026-04-30T10:00:00.000Z');

// May 31 -> clamped to Jun 30
const may31 = new Date('2026-05-31T10:00:00.000Z');
assert.strictEqual(addOneCalendarMonth(may31).toISOString(), '2026-06-30T10:00:00.000Z');

// Oct 24 -> Nov 24
const oct24 = new Date('2026-10-24T12:00:00.000Z');
assert.strictEqual(addOneCalendarMonth(oct24).toISOString(), '2026-11-24T12:00:00.000Z');

// Dec 31 -> Jan 31 next year
const dec31 = new Date('2026-12-31T12:00:00.000Z');
assert.strictEqual(addOneCalendarMonth(dec31).toISOString(), '2027-01-31T12:00:00.000Z');
console.log('✓ Calendar month addition preserves exact day-of-month and clamps accurately on shorter months.\n');

// 6. Cancelled or Unconfirmed Subscriptions
console.log('Case 6: Cancelled / Inactive Subscriptions');
const cancelledUser = {
  _id: '507f191e810c19729de860ed',
  isVerified: true,
  verificationSubscription: {
    active: false,
    expiresAt: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000)
  }
};
assert.strictEqual(isUserVerified(cancelledUser), false, 'Cancelled subscription is NOT verified');

const noSubscriptionUser = {
  _id: '507f191e810c19729de860ee',
  isVerified: false
};
assert.strictEqual(isUserVerified(noSubscriptionUser), false, 'Unsubscribed user is NOT verified');
console.log('✓ Cancelled or inactive subscriptions do NOT grant verification.\n');

console.log('🎉 ALL UNIT TESTS PASSED SUCCESSFULLY!');
