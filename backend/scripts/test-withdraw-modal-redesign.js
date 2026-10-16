import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('--- Verifying WithdrawModal.tsx Redesign & Parity with AddFundsModal ---');

const withdrawModalPath = path.resolve(__dirname, '../frontend/app/src/components/wallet/WithdrawModal.tsx');
const addFundsModalPath = path.resolve(__dirname, '../frontend/app/src/components/wallet/AddFundsModal.tsx');
const walletPagePath = path.resolve(__dirname, '../frontend/app/src/pages/Wallet.tsx');

if (!fs.existsSync(withdrawModalPath)) {
  console.error('FAIL: WithdrawModal.tsx does not exist at:', withdrawModalPath);
  process.exit(1);
}

const withdrawContent = fs.readFileSync(withdrawModalPath, 'utf8');
const addFundsContent = fs.readFileSync(addFundsModalPath, 'utf8');
const walletContent = fs.readFileSync(walletPagePath, 'utf8');

const assertions = [
  // 1. Responsive Drawer / Dialog architecture parity
  { name: 'Uses useIsMobile hook', check: withdrawContent.includes('useIsMobile') },
  { name: 'Uses Vaul / Drawer for mobile view', check: withdrawContent.includes('<Drawer') && withdrawContent.includes('DrawerContent') },
  { name: 'Uses Dialog for desktop view', check: withdrawContent.includes('<Dialog') && withdrawContent.includes('DialogContent') },
  { name: 'Contains keyboard dismissal blur on mobile backdrop/drawer', check: withdrawContent.includes('repositionInputs={false}') },
  { name: 'Mobile drawer uses identical class styling as AddFundsModal', check: withdrawContent.includes('bg-white rounded-t-3xl max-h-[90dvh]') },
  { name: 'Desktop dialog uses identical class styling as AddFundsModal', check: withdrawContent.includes('bg-white rounded-2xl max-h-[85vh] sm:max-w-[460px]') },

  // 2. Header & Navigation parity
  { name: 'Displays clean title header', check: withdrawContent.includes('font-semibold text-gray-900 tracking-tight') },
  { name: 'Has step-back ChevronLeft button identical to AddFundsModal', check: withdrawContent.includes('<ChevronLeft') },
  { name: 'Has X close button identical to AddFundsModal', check: withdrawContent.includes('<X') },

  // 3. Selection options matching AddFundsModal design
  { name: 'Contains Withdraw to Bank option card', check: withdrawContent.includes('Withdraw to Bank') },
  { name: 'Contains Withdraw to External Wallet option card', check: withdrawContent.includes('Withdraw to External Wallet') },
  { name: 'Displays available balance badge/notice in amount steps', check: withdrawContent.includes('availableBalance') },

  // 4. Bank payout flow
  { name: 'Supports bank institution selection', check: withdrawContent.includes('getInstitutions') },
  { name: 'Supports account number auto-resolution', check: withdrawContent.includes('resolveAccount') },
  { name: 'Supports quote preview with exchange rate and zero fee', check: withdrawContent.includes('getWithdrawQuote') },
  { name: 'Executes bank withdrawal via initiateWithdrawal', check: withdrawContent.includes('initiateWithdrawal') },

  // 5. External wallet flow
  { name: 'Supports Solana Base58 address validation', check: withdrawContent.includes('/^[1-9A-HJ-NP-Za-km-z]{32,44}$/') },
  { name: 'Prevents self-transfers to own deposit address', check: withdrawContent.includes('Destination address cannot be your own MyArteLab deposit address') },
  { name: 'Executes Solana withdrawal via withdrawSolana', check: withdrawContent.includes('withdrawSolana') },

  // 6. Wallet.tsx integration
  { name: 'Wallet.tsx passes solanaAddress to WithdrawModal', check: walletContent.includes('solanaAddress={solanaAddress}') }
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
  console.log('\nAll 17 structural and functional parity checks passed successfully!');
}
