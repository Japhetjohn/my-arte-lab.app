import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('--- Verifying Withdraw Modal Redesign (Simplified Two-Screen External Wallet & Bank Review Fix) ---\n');

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
  // PART A: BANK WITHDRAWAL REVIEW FIX
  // ==========================================
  {
    name: 'Platform Fee row is completely removed from bank review screen',
    check: !withdrawContent.includes('Platform Fee') && !withdrawContent.includes('Free ($0.00)')
  },

  // ==========================================
  // PART B: STREAMLINED TWO-SCREEN EXTERNAL WALLET FLOW
  // ==========================================
  {
    name: 'Modal supports responsive Drawer for mobile and Dialog for desktop',
    check: withdrawContent.includes('<Drawer') && withdrawContent.includes('<Dialog')
  },
  {
    name: 'Contains keyboard dismissal blur on mobile backdrop/drawer',
    check: withdrawContent.includes('repositionInputs={false}')
  },
  {
    name: 'WithdrawStep definition contains exactly wallet-amount and wallet-review (no wallet-status)',
    check:
      withdrawContent.includes("'wallet-amount'") &&
      withdrawContent.includes("'wallet-review'") &&
      !withdrawContent.includes("'wallet-status'")
  },
  {
    name: 'No custom numeric keypad or letter mapping (uses standard input)',
    check: !withdrawContent.includes('handleKeypadPress') && !withdrawContent.includes('PQRS')
  },
  {
    name: 'No separate address-editing modal or intermediate state (isEditingAddress eliminated)',
    check: !withdrawContent.includes('isEditingAddress') && !withdrawContent.includes('addressInputTemp')
  },
  {
    name: 'Screen 1: Amount entry with Max shortcut button',
    check: withdrawContent.includes('setWalletAmount(String(maxVal > 0 ? maxVal : \'\'))')
  },
  {
    name: 'Screen 1: Destination Solana address input with Paste button',
    check: withdrawContent.includes('Destination Solana Address') && withdrawContent.includes('handlePasteAddress')
  },
  {
    name: 'Screen 1: Address clear (X) button when text is present',
    check: withdrawContent.includes("setDestinationAddress('')") && withdrawContent.includes('title="Clear address"')
  },
  {
    name: 'Screen 1: Validates Base58 32-44 characters',
    check: withdrawContent.includes('/^[1-9A-HJ-NP-Za-km-z]{32,44}$/')
  },
  {
    name: 'Screen 1: Prevents self-transfers to own deposit address',
    check: withdrawContent.includes('Cannot withdraw to your own deposit address')
  },
  {
    name: 'Screen 1: Footer button is Continue and disabled until valid',
    check: withdrawContent.includes('handleProceedToWalletReview') && withdrawContent.includes('!isValidAmount || !isValidAddr')
  },
  {
    name: 'Screen 2: Review card displays Settles on Solana Mainnet',
    check: withdrawContent.includes('Settles on Solana Mainnet')
  },
  {
    name: 'Screen 2: Review card displays masked destination address with copy button',
    check: withdrawContent.includes('copyToClipboard(destinationAddress, \'Address\')')
  },
  {
    name: 'Screen 2: Footer button is Confirm Send with loading spinner',
    check: withdrawContent.includes('Confirm Send') && withdrawContent.includes('isSubmittingSolana')
  },
  {
    name: 'Calls authoritative backend withdrawSolana endpoint',
    check: withdrawContent.includes('walletService.withdrawSolana')
  },
  {
    name: 'On success: shows success toast, closes modal, and refreshes wallet (no status screen)',
    check:
      withdrawContent.includes("toast.success(res.data?.message || 'Withdrawal sent successfully.')") &&
      withdrawContent.includes('handleModalClose()') &&
      withdrawContent.includes('if (onSuccess) onSuccess()')
  },
  {
    name: 'On failure: displays error toast, preserves review screen so user can retry',
    check: withdrawContent.includes('toast.error(errorMsg)') && withdrawContent.includes('setIsSubmittingSolana(false)')
  },

  // ==========================================
  // PART C: BANK WITHDRAWAL FLOW INTEGRITY
  // ==========================================
  {
    name: 'Form field labelled "Select bank"',
    check: withdrawContent.includes('Select bank')
  },
  {
    name: 'Portalled floating Popover dropdown overlays content without expanding form (z-[200], avoidCollisions, collisionPadding)',
    check:
      withdrawContent.includes('<Popover') &&
      withdrawContent.includes('<PopoverTrigger') &&
      withdrawContent.includes('<PopoverContent') &&
      withdrawContent.includes('avoidCollisions={true}') &&
      withdrawContent.includes('z-[200]')
  },
  {
    name: 'Dropdown width aligns with trigger field and results are bounded with independent scrolling',
    check:
      withdrawContent.includes('w-[var(--radix-popover-trigger-width)]') &&
      withdrawContent.includes('data-vaul-no-drag') &&
      withdrawContent.includes('overscroll-contain')
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
  {
    name: 'Action button labelled "Continue"',
    check: withdrawContent.includes("<span>Continue</span>")
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
  console.log(`\nAll ${assertions.length} architectural, two-screen external wallet, and bank redesign checks passed successfully!`);
}
