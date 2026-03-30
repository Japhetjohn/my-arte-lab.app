import { Check, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Booking } from '@/types';

interface BookingTrackerProps {
  booking: Booking;
}

const steps = [
  { key: 'pending', label: 'Request' },
  { key: 'in_progress', label: 'In Progress' },
  { key: 'review', label: 'Review' },
  { key: 'completed', label: 'Complete' },
];

export function BookingTracker({ booking }: BookingTrackerProps) {
  const currentStepIndex = steps.findIndex(s => s.key === booking.status);
  
  return (
    <div className="w-full">
      <div className="flex items-center justify-between">
        {steps.map((step, index) => {
          const isCompleted = index < currentStepIndex;
          const isCurrent = index === currentStepIndex;
          const isPending = index > currentStepIndex;
          
          return (
            <div key={step.key} className="flex items-center flex-1 last:flex-none">
              <div className="flex flex-col items-center">
                <div
                  className={cn(
                    'w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-colors',
                    isCompleted && 'bg-green-500 text-white',
                    isCurrent && 'bg-[#8A2BE2] text-white',
                    isPending && 'bg-gray-100 text-gray-400'
                  )}
                >
                  {isCompleted ? (
                    <Check className="w-4 h-4" />
                  ) : isCurrent ? (
                    <Clock className="w-4 h-4" />
                  ) : (
                    index + 1
                  )}
                </div>
                <span
                  className={cn(
                    'text-xs mt-1.5 font-medium',
                    isCompleted && 'text-green-600',
                    isCurrent && 'text-[#8A2BE2]',
                    isPending && 'text-gray-400'
                  )}
                >
                  {step.label}
                </span>
              </div>
              {index < steps.length - 1 && (
                <div
                  className={cn(
                    'flex-1 h-0.5 mx-2 transition-colors',
                    isCompleted ? 'bg-green-500' : 'bg-gray-200'
                  )}
                />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
