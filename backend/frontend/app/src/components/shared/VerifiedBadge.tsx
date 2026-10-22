import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

interface VerifiedBadgeProps {
  className?: string;
  expiresAt?: string;
  showTooltip?: boolean;
  onClick?: () => void;
  size?: 'sm' | 'md' | 'lg';
}

export function VerifiedBadge({ className, expiresAt, showTooltip = true, onClick, size = 'md' }: VerifiedBadgeProps) {
  const formatExpiry = (dateStr?: string) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const tooltipText = expiresAt
    ? `Verified until ${formatExpiry(expiresAt)}`
    : 'Verified Creator';

  const sizePixels = size === 'sm' ? 14 : size === 'lg' ? 18 : 16;

  const sizeClasses = {
    sm: 'w-3.5 h-3.5 max-w-[14px] max-h-[14px]',
    md: 'w-4 h-4 max-w-[16px] max-h-[16px]',
    lg: 'w-[18px] h-[18px] max-w-[18px] max-h-[18px]',
  };

  const img = (
    <img 
      src="/images/verified-badge.png" 
      alt="Verified" 
      style={{ width: `${sizePixels}px`, height: `${sizePixels}px`, minWidth: `${sizePixels}px`, minHeight: `${sizePixels}px` }}
      className={cn('inline-block cursor-pointer shrink-0 align-middle object-contain', sizeClasses[size], className)}
      onClick={onClick}
    />
  );

  if (!showTooltip) {
    return img;
  }

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          {img}
        </TooltipTrigger>
        <TooltipContent>
          <p>{tooltipText}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
