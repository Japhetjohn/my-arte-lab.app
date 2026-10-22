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

  const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-4.5 h-4.5',
    lg: 'w-6 h-6 sm:w-6.5 sm:h-6.5',
  };

  const img = (
    <img 
      src="/images/verified-badge.png" 
      alt="Verified" 
      className={cn('inline-block cursor-pointer shrink-0 align-middle', sizeClasses[size], className)}
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
