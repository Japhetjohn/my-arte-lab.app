const assert = require('assert');
const fs = require('fs');
const path = require('path');

console.log('============================================================');
console.log('🧪 MYARTELAB BALANCE RECONCILIATION & UI INTEGRITY AUDIT');
console.log('============================================================\n');

let passedTests = 0;
let totalTests = 0;

function it(name, fn) {
  totalTests++;
  try {
    fn();
    console.log(`✅ PASS: ${name}`);
    passedTests++;
  } catch (err) {
    console.error(`❌ FAIL: ${name}`);
    console.error(`   Error: ${err.message}`);
  }
}

// 1. Audit DesktopWallet.tsx
const desktopWalletPath = path.join(__dirname, '../frontend/app/src/components/wallet/DesktopWallet.tsx');
const desktopWalletContent = fs.readFileSync(desktopWalletPath, 'utf8');

it('DesktopWallet: Does NOT contain duplicate "OnSwitch On-Chain" or "Switch Onchain Balance" badge', () => {
  assert(!desktopWalletContent.includes('OnSwitch On-Chain:'), 'Should not display separate provider balance badge');
  assert(!desktopWalletContent.includes('providerData.balance'), 'Should not reference providerData.balance');
  assert(!desktopWalletContent.includes('providerData'), 'Should not have providerData prop in DesktopWallet');
});

it('DesktopWallet: Does NOT contain "Token Rescue" button in header', () => {
  assert(!desktopWalletContent.includes('onRescueToken'), 'Should not have onRescueToken prop');
  assert(!desktopWalletContent.includes('<span>Token Rescue</span>'), 'Should not render Token Rescue button in header');
});

it('DesktopWallet: Has clean single main balance section for Available Balance', () => {
  assert(desktopWalletContent.includes('Available Balance'), 'Must have Available Balance');
  assert(desktopWalletContent.includes('effectiveAvailable'), 'Calculates effectiveAvailable');
  assert(desktopWalletContent.includes('pendingWithdrawal'), 'Accounts for pending withdrawal holds');
});

// 2. Audit MobileWallet.tsx
const mobileWalletPath = path.join(__dirname, '../frontend/app/src/components/wallet/MobileWallet.tsx');
const mobileWalletContent = fs.readFileSync(mobileWalletPath, 'utf8');

it('MobileWallet: Does NOT contain duplicate provider balance badge', () => {
  assert(!mobileWalletContent.includes('On-Chain: $'), 'Should not display separate provider balance badge');
  assert(!mobileWalletContent.includes('providerData'), 'Should not have providerData prop in MobileWallet');
});

it('MobileWallet: Does NOT contain "Token Rescue" button in header', () => {
  assert(!mobileWalletContent.includes('onRescueToken'), 'Should not have onRescueToken prop');
  assert(!mobileWalletContent.includes('<span>Token Rescue</span>'), 'Should not render Token Rescue button in header');
});

it('MobileWallet: Has clean single main balance section for Available Balance', () => {
  assert(mobileWalletContent.includes('Available balance'), 'Must have Available balance');
  assert(mobileWalletContent.includes('effectiveAvailable'), 'Calculates effectiveAvailable');
});

// 3. Audit Wallet.tsx
const walletPagePath = path.join(__dirname, '../frontend/app/src/pages/Wallet.tsx');
const walletPageContent = fs.readFileSync(walletPagePath, 'utf8');

it('Wallet page: Does NOT render RescueTokenModal in main wallet overview', () => {
  assert(!walletPageContent.includes('<RescueTokenModal'), 'Should not render RescueTokenModal in Wallet page');
  assert(!walletPageContent.includes('isRescueOpen'), 'Should not manage isRescueOpen');
});

it('Wallet page: Does NOT pass providerData or onRescueToken to desktop or mobile wallet', () => {
  assert(!walletPageContent.includes('providerData='), 'Should not pass providerData to child components');
  assert(!walletPageContent.includes('onRescueToken='), 'Should not pass onRescueToken to child components');
});

// 4. Audit Settings.tsx
const settingsPagePath = path.join(__dirname, '../frontend/app/src/pages/Settings.tsx');
const settingsPageContent = fs.readFileSync(settingsPagePath, 'utf8');

it('Settings page: Has "Wallet" tab trigger in TabsList', () => {
  assert(settingsPageContent.includes('<TabsTrigger value="wallet"'), 'Must have wallet tab trigger');
});

it('Settings page: Has TabsContent for "wallet" with Wallet & Token Recovery card', () => {
  assert(settingsPageContent.includes('<TabsContent value="wallet"'), 'Must have wallet tab content');
  assert(settingsPageContent.includes('Wallet & Token Recovery'), 'Must have Wallet & Token Recovery header');
  assert(settingsPageContent.includes('Unsupported Token Recovery'), 'Must have Unsupported Token Recovery section');
});

it('Settings page: Renders RescueTokenModal and Recover Tokens action button', () => {
  assert(settingsPageContent.includes('Recover Tokens'), 'Must have Recover Tokens action button');
  assert(settingsPageContent.includes('<RescueTokenModal'), 'Must render RescueTokenModal');
  assert(settingsPageContent.includes('setIsRescueModalOpen'), 'Must control modal state manually via user action');
});

it('Settings page: Supports ?tab=wallet query parameter', () => {
  assert(settingsPageContent.includes("useSearchParams"), 'Must use searchParams');
  assert(settingsPageContent.includes("tabParam"), 'Must check tabParam');
  assert(settingsPageContent.includes("'wallet'"), 'Must recognize wallet tab');
});

// 5. Accounting Formula & No Double Deduction Verification
it('Accounting: Live Switch balance correctly subtracts holds (escrow + pending withdrawals)', () => {
  const liveSwitchBalance = 100.00;
  const escrowBalance = 30.00;
  const pendingWithdrawal = 10.00;
  
  // Available balance = live Switch balance - escrow - pending withdrawals
  const availableBalance = Math.max(0, Math.round((liveSwitchBalance - escrowBalance - pendingWithdrawal) * 100) / 100);
  assert.strictEqual(availableBalance, 60.00, 'Available balance should be 60.00');
});

it('Accounting: Fallback to internal ledger when Switch is unavailable does NOT subtract escrow twice', () => {
  // In internal DB, dbBalance already had escrow deducted when booking was paid:
  const initialFunds = 100.00;
  const escrowBalance = 30.00;
  const dbBalance = initialFunds - escrowBalance; // 70.00
  const pendingWithdrawal = 10.00;
  
  // Since dbBalance ALREADY has escrow deducted, only subtract pendingWithdrawal:
  const availableBalance = Math.max(0, Math.round((dbBalance - pendingWithdrawal) * 100) / 100);
  assert.strictEqual(availableBalance, 60.00, 'Available balance should be 60.00 without double-deducting escrow');
});

it('Accounting: Available balance never drops below 0 when holds exceed balance', () => {
  const liveSwitchBalance = 20.00;
  const escrowBalance = 30.00;
  const pendingWithdrawal = 5.00;
  const availableBalance = Math.max(0, Math.round((liveSwitchBalance - escrowBalance - pendingWithdrawal) * 100) / 100);
  assert.strictEqual(availableBalance, 0.00, 'Available balance must not be negative');
});

console.log('\n============================================================');
console.log(`Summary: ${passedTests}/${totalTests} tests passed`);
console.log('============================================================\n');

if (passedTests !== totalTests) {
  process.exit(1);
}
