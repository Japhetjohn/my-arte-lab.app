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
    <Card className="bg-gradient-to-br from-[#8A2BE2] to-[#6B21A8] text-white overflow-hidden border-0">
      <CardContent className="p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
              <Wallet className="w-5 h-5 text-white" />
            </div>
            <span className="font-medium text-white">My Wallet</span>
          </div>
          <span className="text-sm bg-white/20 px-3 py-1 rounded-full text-white">{currency}</span>
        </div>
        
        <div className="mb-6">
          <p className="text-white/70 text-sm mb-1">Available Balance</p>
          <h2 className="text-4xl font-bold text-white">${balance.toLocaleString('en-US', { minimumFractionDigits: 2 })}</h2>
        </div>
        
        <div className="flex gap-3">
          <Button
            onClick={onAddFunds}
            className="flex-1 bg-white text-[#8A2BE2] hover:bg-gray-100 font-semibold"
          >
            <ArrowDownLeft className="w-4 h-4 mr-2" />
            Add Funds
          </Button>
          <Button
            onClick={onWithdraw}
            variant="outline"
            className="flex-1 bg-transparent border-2 border-white text-white hover:bg-white hover:text-[#8A2BE2] font-semibold"
          >
            <ArrowUpRight className="w-4 h-4 mr-2" />
            Withdraw
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
