import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Star } from 'lucide-react';
import type { Creator } from '@/types';
import { StatusBadge } from './StatusBadge';
import { VerifiedBadge } from './VerifiedBadge';

interface CreatorCardProps {
  creator: Creator & { rating?: number | { average?: number; count?: number } };
  onViewProfile?: (creator: Creator) => void;
  onBook?: (creator: Creator) => void;
}

export function CreatorCard({ creator, onViewProfile, onBook }: CreatorCardProps) {
  const handleView = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onViewProfile) {
      onViewProfile(creator);
    } else {
      window.location.href = `/creator/${creator.id}`;
    }
  };

  const handleBook = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onBook) {
      onBook(creator);
    } else {
      window.location.href = `/bookings?creator=${creator.id}`;
    }
  };

  const handleCardClick = () => {
    window.location.href = `/creator/${creator.id}`;
  };

  // Handle both rating formats: number or {average, count}
  const getRatingDisplay = () => {
    const rating = creator.rating as any;
    if (typeof rating === 'object' && rating !== null && 'average' in rating) {
      return {
        value: ((rating.average as number) || 0).toFixed(1),
        count: (rating.count as number) || 0
      };
    }
    return {
      value: typeof rating === 'number' ? rating.toFixed(1) : '0.0',
      count: creator.reviewCount || 0
    };
  };

  const ratingDisplay = getRatingDisplay();

  return (
    <Card 
      className="group hover:shadow-lg transition-all duration-300 border border-gray-200 overflow-hidden cursor-pointer"
      onClick={handleCardClick}
    >
      <CardContent className="p-4 sm:p-5">
        <div className="flex items-start gap-3 sm:gap-4">
          <div className="relative flex-shrink-0">
            <img
              src={creator.avatar || '/images/avatar-1.png'}
              alt={creator.name || 'Creator'}
              className="w-12 h-12 sm:w-16 sm:h-16 rounded-full object-cover border-2 border-gray-100"
            />
            <div className="absolute -bottom-1 -right-1">
              <StatusBadge status={creator.availability || 'available'} />
            </div>
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1">
              <h3 className="font-semibold text-gray-900 truncate text-sm sm:text-base">{creator.name}</h3>
              {creator.isVerified && <VerifiedBadge className="w-4 h-4" />}
            </div>
            <p className="text-xs sm:text-sm text-gray-500 capitalize">{creator.category || 'Creator'}</p>
            <div className="flex items-center gap-1 mt-0.5">
              <Star className="w-3 h-3 sm:w-4 sm:h-4 fill-amber-400 text-amber-400" />
              <span className="text-xs sm:text-sm font-medium">{ratingDisplay.value}</span>
              <span className="text-xs text-gray-400">({ratingDisplay.count})</span>
            </div>
          </div>
        </div>
        
        <p className="mt-2 sm:mt-3 text-xs sm:text-sm text-gray-600 line-clamp-2">{creator.bio || 'No bio available'}</p>
        
        <div className="flex flex-wrap gap-1 sm:gap-1.5 mt-2 sm:mt-3">
          {(creator.skills || []).slice(0, 3).map((skill) => (
            <span
              key={skill}
              className="px-1.5 sm:px-2 py-0.5 bg-gray-100 text-gray-600 text-[10px] sm:text-xs rounded-full"
            >
              {skill}
            </span>
          ))}
          {(creator.skills || []).length > 3 && (
            <span className="px-1.5 sm:px-2 py-0.5 bg-gray-100 text-gray-600 text-[10px] sm:text-xs rounded-full">
              +{(creator.skills || []).length - 3}
            </span>
          )}
        </div>
        
        <div className="flex items-center justify-between mt-3 sm:mt-4 pt-3 sm:pt-4 border-t border-gray-100">
          <div>
            <span className="text-[10px] sm:text-xs text-gray-500">From</span>
            <p className="font-semibold text-[#8A2BE2] text-sm sm:text-base">${creator.startingPrice || 0}</p>
          </div>
          <div className="flex gap-1.5 sm:gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleView}
              className="border-gray-200 text-xs sm:text-sm h-8 sm:h-9"
            >
              View
            </Button>
            <Button
              size="sm"
              onClick={handleBook}
              className="bg-[#8A2BE2] hover:bg-[#7B1FD1] text-white text-xs sm:text-sm h-8 sm:h-9"
            >
              Book
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
