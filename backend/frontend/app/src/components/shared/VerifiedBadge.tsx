import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface VerifiedBadgeProps {
  className?: string;
  expiresAt?: string;
  showTooltip?: boolean;
  onClick?: () => void;
}

export function VerifiedBadge({ className, expiresAt, showTooltip = true, onClick }: VerifiedBadgeProps) {
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

  const img = (
    <img 
      src="/images/verified-badge.png" 
      alt="Verified" 
      className={`w-7 h-7 inline-block cursor-pointer ${className}`}
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
