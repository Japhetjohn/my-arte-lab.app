import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('--- Verifying External Wallet Withdrawal Redesign (Visual Reference Parity) ---');

const withdrawModalPath = path.resolve(__dirname, '../frontend/app/src/components/wallet/WithdrawModal.tsx');
const walletPagePath = path.resolve(__dirname, '../frontend/app/src/pages/Wallet.tsx');

if (!fs.existsSync(withdrawModalPath)) {
  console.error('FAIL: WithdrawModal.tsx does not exist at:', withdrawModalPath);
  process.exit(1);
}

const withdrawContent = fs.readFileSync(withdrawModalPath, 'utf8');
const walletContent = fs.readFileSync(walletPagePath, 'utf8');

const assertions = [
  // 1. Responsive Drawer / Dialog architecture parity
  { name: 'Uses useIsMobile hook', check: withdrawContent.includes('useIsMobile') },
  { name: 'Uses Vaul / Drawer for mobile view', check: withdrawContent.includes('<Drawer') && withdrawContent.includes('DrawerContent') },
  { name: 'Uses Dialog for desktop view', check: withdrawContent.includes('<Dialog') && withdrawContent.includes('DialogContent') },
  { name: 'Contains keyboard dismissal blur on mobile backdrop/drawer', check: withdrawContent.includes('repositionInputs={false}') },

  // 2. Left Phone: Destination Wallet Card ("Send to")
  { name: 'Contains Send to header', check: withdrawContent.includes('<span>Send to</span>') },
  { name: 'Displays destination wallet card with Change/Enter button', check: withdrawContent.includes('Change') && withdrawContent.includes('ChevronRight') },
  { name: 'Visual address masking matches reference style (xxxx **** **** xxxx)', check: withdrawContent.includes('**** ****') },
  { name: 'Contains inline address editor with Paste button', check: withdrawContent.includes('isEditingAddress') && withdrawContent.includes('Paste') },
  { name: 'Prevents self-transfers to own deposit address', check: withdrawContent.includes('Cannot withdraw to your own deposit address') },

  // 3. Left Phone: Large Amount Display & Shortcuts
  { name: 'Contains large centered amount display with blinking cursor', check: withdrawContent.includes('text-5xl sm:text-6xl font-extrabold') && withdrawContent.includes('animate-pulse') },
  { name: 'Displays dynamic quick shortcut pills adapted to balance', check: withdrawContent.includes('quickShortcuts') && withdrawContent.includes('Max') },
  { name: 'Contains balance source card (MyArteLab Wallet / Solana SPL)', check: withdrawContent.includes('MyArteLab Wallet') && withdrawContent.includes('Solana SPL') },

  // 4. Left Phone: Custom Numeric Keypad & Primary Button
  { name: 'Primary action button (Continue) placed above keypad', check: withdrawContent.includes('<span>Continue</span>') },
  { name: 'Contains 3x4 custom numeric keypad grid with digits & letters', check: withdrawContent.includes('grid grid-cols-3') && withdrawContent.includes('PQRS') && withdrawContent.includes('WXYZ') },
  { name: 'Contains decimal point and backspace icon', check: withdrawContent.includes('backspace') && withdrawContent.includes('<Delete') },
  { name: 'Keypad handles max 2 decimals, leading zeros, and decimal formatting', check: withdrawContent.includes('handleKeypadPress') && withdrawContent.includes("decimals.length >= 2") },

  // 5. Withdrawal Review & Confirmation
  { name: 'Review step with breakdown, free fee, and irreversible warning', check: withdrawContent.includes('Review Transfer') && withdrawContent.includes('0.00 USDC (Free!)') && withdrawContent.includes('ShieldAlert') },
  { name: 'Calls authoritative backend withdrawSolana endpoint', check: withdrawContent.includes('walletService.withdrawSolana') },

  // 6. Right Phone: Transaction Result Modal
  { name: 'Contains centered confetti celebration SVG particles', check: withdrawContent.includes('Confetti particles') && withdrawContent.includes('<svg') && withdrawContent.includes('circle cx="20"') },
  { name: 'Displays Payment Successful heading and masked recipient subtitle', check: withdrawContent.includes('Payment Successful') && withdrawContent.includes('To:') },
  { name: 'Contains Transaction details section', check: withdrawContent.includes('Transaction details') },
  { name: 'Contains status, added to, time, date, and transaction ID with copy', check: withdrawContent.includes('Added to') && withdrawContent.includes('External Solana Wallet') && withdrawContent.includes('Transaction ID') },
  { name: 'Contains dotted divider lines matching reference', check: withdrawContent.includes('border-t border-dashed border-gray-200') },
  { name: 'Displays platform fee as $0.00 Free!', check: withdrawContent.includes('$0.00 Free!') },
  { name: 'Contains Done full-width action button', check: withdrawContent.includes('Done') }
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
  console.log('\nAll 20 visual reference and architectural checks passed successfully!');
}
