import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface VerifiedBadgeProps {
  className?: string;
}

export function VerifiedBadge({ className }: VerifiedBadgeProps) {
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
          <p>Verified Creator</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
