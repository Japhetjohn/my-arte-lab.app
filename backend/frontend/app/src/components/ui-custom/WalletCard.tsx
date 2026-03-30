import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Wallet, ArrowUpRight, ArrowDownLeft } from 'lucide-react';

interface WalletCardProps {
  balance: number;
  currency: string;
  onAddFunds?: () => void;
  onWithdraw?: () => void;
}

export function WalletCard({ balance, currency, onAddFunds, onWithdraw }: WalletCardProps) {
  return (
    <Card className="bg-gradient-to-br from-[#8A2BE2] to-[#6B21A8] text-white overflow-hidden">
      <CardContent className="p-4 sm:p-6">
        <div className="flex items-center justify-between mb-4 sm:mb-6">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 sm:w-10 sm:h-10 bg-white/20 rounded-full flex items-center justify-center flex-shrink-0">
              <Wallet className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
            <span className="font-medium text-sm sm:text-base">My Wallet</span>
          </div>
          <span className="text-xs sm:text-sm bg-white/20 px-2 sm:px-3 py-1 rounded-full flex-shrink-0">{currency}</span>
        </div>
        
        <div className="mb-4 sm:mb-6 min-w-0">
          <p className="text-white/70 text-xs sm:text-sm mb-1">Available Balance</p>
          <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold truncate">${balance.toLocaleString('en-US', { minimumFractionDigits: 2 })}</h2>
        </div>
        
        <div className="flex gap-2 sm:gap-3">
          <Button
            variant="secondary"
            className="flex-1 bg-white text-[#8A2BE2] hover:bg-white/90 text-xs sm:text-sm py-2 h-auto sm:h-10"
            onClick={onAddFunds}
          >
            <ArrowDownLeft className="w-3.5 h-3.5 sm:w-4 sm:h-4 mr-1.5 sm:mr-2 flex-shrink-0" />
            <span className="whitespace-nowrap">Add Funds</span>
          </Button>
          <Button
            variant="outline"
            className="flex-1 border-white/30 text-white hover:bg-white/10 text-xs sm:text-sm py-2 h-auto sm:h-10"
            onClick={onWithdraw}
          >
            <ArrowUpRight className="w-3.5 h-3.5 sm:w-4 sm:h-4 mr-1.5 sm:mr-2 flex-shrink-0" />
            <span className="whitespace-nowrap">Withdraw</span>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
