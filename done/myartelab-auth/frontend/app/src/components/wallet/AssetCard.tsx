import { Card, CardContent } from '@/components/ui/card';
import { TrendingUp, TrendingDown } from 'lucide-react';
import { cn } from '@/lib/utils';

interface AssetCardProps {
  currency: string;
  balance: number;
  usdEquivalent: number;
  icon?: string;
  change24h?: number;
  onClick?: () => void;
  className?: string;
}

export function AssetCard({
  currency,
  balance,
  usdEquivalent,
  icon,
  change24h,
  onClick,
  className,
}: AssetCardProps) {
  const formatCurrency = (value: number, currencyCode: string) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currencyCode,
      minimumFractionDigits: 2,
      maximumFractionDigits: 6,
    }).format(value);
  };

  return (
    <Card
      className={cn(
        'hover:shadow-md transition-shadow cursor-pointer',
        onClick && 'hover:border-[#8A2BE2]/30',
        className
      )}
      onClick={onClick}
    >
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-[#8A2BE2]/10 flex items-center justify-center">
              {icon ? (
                <img src={icon} alt={currency} className="w-6 h-6" />
              ) : (
                <span className="text-[#8A2BE2] font-bold text-sm">
                  {currency.slice(0, 2)}
                </span>
              )}
            </div>
            <div>
              <p className="font-semibold text-gray-900">{currency}</p>
              <p className="text-xs text-gray-500">
                ≈ {formatCurrency(usdEquivalent, 'USD')}
              </p>
            </div>
          </div>
          <div className="text-right">
            <p className="font-semibold text-gray-900">
              {formatCurrency(balance, currency)}
            </p>
            {change24h !== undefined && (
              <div
                className={cn(
                  'flex items-center justify-end gap-1 text-xs',
                  change24h >= 0 ? 'text-green-600' : 'text-red-600'
                )}
              >
                {change24h >= 0 ? (
                  <TrendingUp className="w-3 h-3" />
                ) : (
                  <TrendingDown className="w-3 h-3" />
                )}
                {change24h >= 0 ? '+' : ''}
                {change24h.toFixed(2)}%
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
