import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('--- Verifying Withdraw Modal Redesign (External Wallet & Bank Transfer Parity) ---\n');

const withdrawModalPath = path.resolve(__dirname, '../frontend/app/src/components/wallet/WithdrawModal.tsx');
const walletPagePath = path.resolve(__dirname, '../frontend/app/src/pages/Wallet.tsx');

if (!fs.existsSync(withdrawModalPath)) {
  console.error('FAIL: WithdrawModal.tsx does not exist at:', withdrawModalPath);
  process.exit(1);
}

const withdrawContent = fs.readFileSync(withdrawModalPath, 'utf8');
const walletContent = fs.readFileSync(walletPagePath, 'utf8');

const assertions = [
  // ==========================================
  // PART A: SHARED & EXTERNAL WALLET FLOW
  // ==========================================
  { name: 'Uses useIsMobile hook', check: withdrawContent.includes('useIsMobile') },
  { name: 'Uses Vaul / Drawer for mobile view', check: withdrawContent.includes('<Drawer') && withdrawContent.includes('DrawerContent') },
  { name: 'Uses Dialog for desktop view', check: withdrawContent.includes('<Dialog') && withdrawContent.includes('DialogContent') },
  { name: 'Contains keyboard dismissal blur on mobile backdrop/drawer', check: withdrawContent.includes('repositionInputs={false}') },
  { name: 'Contains Send to header', check: withdrawContent.includes('<span>Send to</span>') },
  { name: 'Displays destination wallet card with Change button', check: withdrawContent.includes('Change') && withdrawContent.includes('ChevronRight') },
  { name: 'Visual address masking matches reference style (xxxx **** **** xxxx)', check: withdrawContent.includes('**** ****') },
  { name: 'Contains inline address editor with Paste button', check: withdrawContent.includes('isEditingAddress') && withdrawContent.includes('Paste') },
  { name: 'Prevents self-transfers to own deposit address', check: withdrawContent.includes('Cannot withdraw to your own deposit address') },
  { name: 'Contains large centered amount display with blinking cursor', check: withdrawContent.includes('text-5xl sm:text-6xl font-extrabold') && withdrawContent.includes('animate-pulse') },
  { name: 'Displays dynamic quick shortcut pills adapted to balance', check: withdrawContent.includes('quickShortcuts') && withdrawContent.includes('Max') },
  { name: 'Contains 3x4 custom numeric keypad grid with digits & letters', check: withdrawContent.includes('grid grid-cols-3') && withdrawContent.includes('PQRS') && withdrawContent.includes('WXYZ') },
  { name: 'Calls authoritative backend withdrawSolana endpoint', check: withdrawContent.includes('walletService.withdrawSolana') },
  { name: 'Contains centered confetti celebration SVG particles in result modal', check: withdrawContent.includes('Confetti particles') && withdrawContent.includes('<svg') && withdrawContent.includes('circle cx="20"') },

  // ==========================================
  // PART B: REDESIGNED WITHDRAW TO BANK SECTION
  // ==========================================
  // 1. Select Bank — Clean Searchable Dropdown
  {
    name: 'Form field labelled "Select bank"',
    check: withdrawContent.includes('Select bank')
  },
  {
    name: 'Anchored overlay dropdown floating over content without pushing fields downward (absolute z-50)',
    check: withdrawContent.includes('absolute top-[calc(100%+6px)]') && withdrawContent.includes('z-50')
  },
  {
    name: 'Bank dropdown has ref and outside click listener to dismiss automatically',
    check: withdrawContent.includes('bankDropdownRef') && withdrawContent.includes('handleClickOutside')
  },
  {
    name: 'Search input inside dropdown with placeholder "Search banks"',
    check: withdrawContent.includes('placeholder="Search banks"')
  },
  {
    name: 'Search input contains clear (X) button',
    check: withdrawContent.includes("onClick={() => setBankSearch('')}") && withdrawContent.includes('aria-label="Clear search"')
  },
  {
    name: 'Presents Top 10 priority commercial & neo-banks for Nigeria first',
    check:
      withdrawContent.includes('NIGERIA_TOP_BANKS') &&
      withdrawContent.includes('000014') && // Access Bank
      withdrawContent.includes('000013') && // GTBank
      withdrawContent.includes('000015') && // Zenith Bank
      withdrawContent.includes('000004') && // UBA
      withdrawContent.includes('000016') && // First Bank
      withdrawContent.includes('090267') && // Kuda
      withdrawContent.includes('100004') && // OPay
      withdrawContent.includes('100033') && // PalmPay
      withdrawContent.includes('090405') && // Moniepoint
      withdrawContent.includes('000007')    // Fidelity
  },
  {
    name: 'Follows Top 10 with "All Supported Banks" sorted alphabetically',
    check: withdrawContent.includes('Popular Banks') && withdrawContent.includes('All Supported Banks')
  },
  {
    name: 'Searching filters across entire list with direct flat matches',
    check: withdrawContent.includes('searchResults') && withdrawContent.includes('searchResults.map')
  },
  {
    name: 'Clean friendly empty state when no bank matches query',
    check: withdrawContent.includes('No banks found matching')
  },

  // 2. Account Number Form Field
  {
    name: 'Clean input field labelled "Account number"',
    check: withdrawContent.includes('Account number')
  },
  {
    name: 'Numeric input mode and digits-only handling',
    check: withdrawContent.includes('inputMode="numeric"') && withdrawContent.includes("replace(/\\D/g, '')")
  },
  {
    name: 'Validates 10-digit NUBAN for Nigeria (maxLength 10) or appropriate length for others',
    check: withdrawContent.includes("selectedCountry === 'NG' ? 10 : 20")
  },
  {
    name: 'Shows inline length feedback counter',
    check: withdrawContent.includes('/10 digits')
  },

  // 3. Automatic Account Verification
  {
    name: 'Read-only "Account name" field below account number with non-editable styling',
    check:
      withdrawContent.includes('Account name') &&
      withdrawContent.includes('readOnly') &&
      withdrawContent.includes('tabIndex={-1}') &&
      withdrawContent.includes('cursor-default')
  },
  {
    name: 'Distinct placeholder: "Account name will appear after verification"',
    check: withdrawContent.includes('placeholder={isVerifyingAccount ? \'Verifying account...\' : \'Account name will appear after verification\'}')
  },
  {
    name: 'Loading spinner and "Verifying account..." while resolution is in progress',
    check: withdrawContent.includes('isVerifyingAccount') && withdrawContent.includes('Verifying account...')
  },
  {
    name: 'Green "Verified" badge with checkmark on success',
    check: withdrawContent.includes('Verified') && withdrawContent.includes('CheckCircle2') && withdrawContent.includes('text-emerald')
  },
  {
    name: 'Actionable friendly error message on verification failure',
    check: withdrawContent.includes("We couldn't verify this account. Please check the bank and account number.")
  },
  {
    name: 'Input changes immediately invalidate previous verification and error',
    check:
      withdrawContent.includes('setVerifiedName(null)') &&
      withdrawContent.includes("setAccountName('')") &&
      withdrawContent.includes('setVerificationError(null)')
  },
  {
    name: 'Protects against out-of-order race conditions with request tracking',
    check: withdrawContent.includes('verificationReqIdRef') && withdrawContent.includes('currentReqId')
  },

  // 4. Continue to Review Page
  {
    name: 'Action button labelled "Continue" (not "Review Withdrawal")',
    check:
      withdrawContent.includes("<span>Continue</span>") &&
      !withdrawContent.includes("<span>Review Withdrawal</span>")
  },
  {
    name: 'Continue button disabled until bank selected, valid account number, and verified',
    check:
      withdrawContent.includes('!selectedBankCode') &&
      withdrawContent.includes('!isAccValid') &&
      withdrawContent.includes('!verifiedName')
  },
  {
    name: 'Review page displays Destination Bank name',
    check: withdrawContent.includes('selectedBank?.name')
  },
  {
    name: 'Review page displays Verified Account name',
    check: withdrawContent.includes('verifiedName || accountName')
  },
  {
    name: 'Review page masks account number for privacy (••••1234)',
    check: withdrawContent.includes('••••${accountNumber.slice(-4)}')
  },
  {
    name: 'Review page displays Platform Fee as Free ($0.00)',
    check: withdrawContent.includes('Free ($0.00)')
  },
  {
    name: 'Review page displays estimated Processing Time (Instant to 15 minutes)',
    check: withdrawContent.includes('Instant to 15 minutes')
  },
  {
    name: 'Review page displays live quote countdown timer',
    check: withdrawContent.includes('Quote guaranteed for') && withdrawContent.includes('quoteSecondsLeft')
  },
  {
    name: 'Review page displays net local payout (You Will Receive)',
    check: withdrawContent.includes('You Will Receive')
  },
  {
    name: 'Confirm Withdrawal button initiates payout',
    check: withdrawContent.includes('Confirm Withdrawal') && withdrawContent.includes('handleConfirmBankWithdrawal')
  }
];

let failed = 0;
for (const a of assertions) {
  if (a.check) {
    console.log(`  ✓ ${a.name}`);
  } else {
    console.error(`  ✗ FAIL: ${a.name}`);
    failed++;
  }
}

if (failed > 0) {
  console.error(`\nValidation failed: ${failed} check(s) did not pass.`);
  process.exit(1);
} else {
  console.log(`\nAll ${assertions.length} architectural, visual reference, and bank redesign checks passed successfully!`);
}
