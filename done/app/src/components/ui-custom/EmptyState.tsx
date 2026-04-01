import { Button } from '@/components/ui/button';

interface EmptyStateProps {
  image: string;
  title: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
}

export function EmptyState({ image, title, description, actionLabel, onAction }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
      <img 
        src={image} 
        alt={title} 
        className="w-48 h-48 mb-6 object-contain"
      />
      <h3 className="text-xl font-semibold text-gray-900 mb-2">{title}</h3>
      {description && (
        <p className="text-gray-500 max-w-sm mb-6">{description}</p>
      )}
      {actionLabel && onAction && (
        <Button 
          onClick={onAction}
          className="bg-[#8A2BE2] hover:bg-[#7B1FD1] text-white"
        >
          {actionLabel}
        </Button>
      )}
    </div>
  );
}
