import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface VerifiedBadgeProps {
  className?: string;
  expiresAt?: string;
  showTooltip?: boolean;
}

export function VerifiedBadge({ className, expiresAt, showTooltip = true }: VerifiedBadgeProps) {
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

  if (!showTooltip) {
    return (
      <img 
        src="/images/verified-badge.png" 
        alt="Verified" 
        className={`w-5 h-5 inline-block ${className}`}
      />
    );
  }

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <img 
            src="/images/verified-badge.png" 
            alt="Verified" 
            className={`w-5 h-5 inline-block ${className}`}
          />
        </TooltipTrigger>
        <TooltipContent>
          <p>{tooltipText}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
