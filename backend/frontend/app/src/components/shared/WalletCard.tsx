import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Wallet, ArrowUpRight, ArrowDownLeft, Lock, TrendingUp, Copy } from 'lucide-react';
import { toast } from 'sonner';

interface WalletCardProps {
  balance: number;
  currency: string;
  availableBalance?: number;
  pendingWithdrawal?: number;
  escrowBalance?: number; // For clients: money they've paid that's held
  incomingEarnings?: number; // For creators: money they'll receive
  userRole?: 'client' | 'creator';
  solanaAddress?: string | null;
  onAddFunds?: () => void;
  onWithdraw?: () => void;
}

export function WalletCard({
  balance,
  currency = 'USDC',
  availableBalance,
  pendingWithdrawal = 0,
  escrowBalance = 0,
  incomingEarnings = 0,
  userRole = 'client',
  solanaAddress,
  onAddFunds,
  onWithdraw
}: WalletCardProps) {
  const showEscrow = userRole === 'client' && escrowBalance > 0;
  const showIncoming = userRole === 'creator' && incomingEarnings > 0;
  const effectiveAvailable = availableBalance !== undefined ? availableBalance : Math.max(0, balance - pendingWithdrawal);
  const hasPendingWithdrawal = pendingWithdrawal > 0;
  
  return (
    <Card className="bg-gradient-to-br from-[#8A2BE2] to-[#6B21A8] text-white overflow-hidden border-0 shadow-lg">
      <CardContent className="p-4 sm:p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
              <Wallet className="w-5 h-5 text-white" />
            </div>
            <span className="font-medium text-white">My Wallet</span>
          </div>
          <span className="text-sm bg-white/20 px-3 py-1 rounded-full text-white font-medium">{currency}</span>
        </div>
        
        <div className="mb-4">
          <div className="flex items-baseline justify-between gap-2">
            <div>
              <p className="text-white/70 text-sm mb-1">Available Balance</p>
              <h2 className="text-3xl sm:text-4xl font-bold text-white truncate">
                ${effectiveAvailable.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} <span className="text-lg font-normal text-white/80">USDC</span>
              </h2>
            </div>
            {hasPendingWithdrawal && (
              <div className="text-right">
                <p className="text-white/60 text-xs">Total Balance</p>
                <p className="text-sm font-semibold text-white/90">
                  ${balance.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USDC
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Pending Withdrawal Reservation Banner */}
        {hasPendingWithdrawal && (
          <div className="mb-4 p-3 bg-amber-500/20 rounded-lg border border-amber-300/40 text-xs text-amber-100 flex items-start gap-2">
            <span className="inline-block w-2 h-2 rounded-full bg-amber-300 mt-1 shrink-0 animate-pulse" />
            <div>
              <span className="font-semibold text-white">
                ${pendingWithdrawal.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USDC
              </span>{' '}
              is currently reserved for a pending withdrawal and held safely until completion.
            </div>
          </div>
        )}

        {/* Show Switch Solana wallet deposit address if present */}
        {solanaAddress && (
          <div className="mb-4 p-3 bg-white/10 rounded-lg flex items-center justify-between gap-3 border border-white/15">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5 text-xs text-emerald-300 font-medium mb-0.5">
                <span className="w-2 h-2 rounded-full bg-emerald-400 inline-block animate-pulse"></span>
                <span>USDC on Solana</span>
              </div>
              <p className="text-xs font-mono text-white/90 truncate">
                {solanaAddress}
              </p>
            </div>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              onClick={() => {
                navigator.clipboard.writeText(solanaAddress);
                toast.success('Solana address copied to clipboard');
              }}
              className="h-7 px-2 text-xs bg-white/15 hover:bg-white/25 text-white rounded flex items-center gap-1 shrink-0"
            >
              <Copy className="w-3.5 h-3.5" />
              <span>Copy</span>
            </Button>
          </div>
        )}
        
        {/* Show escrow info for clients (money they've paid that's held) */}
        {showEscrow && (
          <div className="mb-4 p-3 bg-white/10 rounded-lg">
            <div className="flex items-center gap-2 text-white/80 text-sm mb-1">
              <Lock className="w-4 h-4" />
              <span>Held in Escrow</span>
            </div>
            <p className="text-lg font-semibold text-white">${escrowBalance.toLocaleString('en-US', { minimumFractionDigits: 2 })} USDC</p>
            <p className="text-xs text-white/60 mt-1">Released to creator when work is completed</p>
          </div>
        )}
        
        {/* Show incoming earnings for creators (money they'll receive) */}
        {showIncoming && (
          <div className="mb-4 p-3 bg-green-500/20 rounded-lg border border-green-400/30">
            <div className="flex items-center gap-2 text-green-300 text-sm mb-1">
              <TrendingUp className="w-4 h-4" />
              <span>Incoming Earnings</span>
            </div>
            <p className="text-lg font-semibold text-white">${incomingEarnings.toLocaleString('en-US', { minimumFractionDigits: 2 })} USDC</p>
            <p className="text-xs text-white/60 mt-1">You'll receive this when client approves your work</p>
          </div>
        )}
        
        <div className="flex gap-2 sm:gap-3">
          <Button
            onClick={onAddFunds}
            className="flex-1 bg-white text-[#8A2BE2] hover:bg-gray-100 font-semibold text-xs sm:text-sm px-2 sm:px-4 shadow-sm"
          >
            <ArrowDownLeft className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2 flex-shrink-0" />
            Add Funds
          </Button>
          <Button
            onClick={onWithdraw}
            variant="outline"
            className="flex-1 bg-transparent border-2 border-white text-white hover:bg-white hover:text-[#8A2BE2] font-semibold text-xs sm:text-sm px-2 sm:px-4 transition-colors"
          >
            <ArrowUpRight className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2 flex-shrink-0" />
            Withdraw
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
