import { cn } from '@/lib/utils';

interface StatusBadgeProps {
  status: string;
  className?: string;
}

const statusStyles: Record<string, string> = {
  pending: 'bg-amber-100 text-amber-700 border-amber-200',
  in_progress: 'bg-[#8A2BE2]/10 text-[#8A2BE2] border-[#8A2BE2]/20',
  review: 'bg-blue-100 text-blue-700 border-blue-200',
  completed: 'bg-green-100 text-green-700 border-green-200',
  cancelled: 'bg-gray-100 text-gray-600 border-gray-200',
  available: 'bg-green-100 text-green-700 border-green-200',
  busy: 'bg-amber-100 text-amber-700 border-amber-200',
  unavailable: 'bg-gray-100 text-gray-600 border-gray-200',
  open: 'bg-green-100 text-green-700 border-green-200',
};

const statusLabels: Record<string, string> = {
  pending: 'Pending',
  in_progress: 'In Progress',
  review: 'Under Review',
  completed: 'Completed',
  cancelled: 'Cancelled',
  available: 'Available',
  busy: 'Busy',
  unavailable: 'Unavailable',
  open: 'Open',
};

export function StatusBadge({ status, className }: StatusBadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border',
        statusStyles[status] || 'bg-gray-100 text-gray-600 border-gray-200',
        className
      )}
    >
      {statusLabels[status] || status}
    </span>
  );
}
