import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Star } from 'lucide-react';
import type { Creator } from '@/types';
import { StatusBadge } from './StatusBadge';
import { VerifiedBadge } from './VerifiedBadge';
import { NewBookingModal } from '@/components/booking/NewBookingModal';

interface CreatorCardProps {
  creator: Creator & { rating?: number | { average?: number; count?: number }; _id?: string; priceRange?: { min: number; max: number } };
  onViewProfile?: (creator: Creator & { _id?: string }) => void;
  onBook?: (creator: Creator & { _id?: string }) => void;
}

export function CreatorCard({ creator, onViewProfile, onBook }: CreatorCardProps) {
  const [isBookingModalOpen, setIsBookingModalOpen] = useState(false);
  const getCreatorId = () => creator.id || (creator as any)._id;

  const handleView = (e: React.MouseEvent) => {
    e.stopPropagation();
    const id = getCreatorId();
    if (onViewProfile) {
      onViewProfile(creator);
    } else {
      window.location.href = `/creator/${id}`;
    }
  };

  const handleBook = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onBook) {
      onBook(creator);
    } else {
      setIsBookingModalOpen(true);
    }
  };

  const handleCardClick = () => {
    const id = getCreatorId();
    window.location.href = `/creator/${id}`;
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
    <>
      <Card 
        className="group hover:shadow-lg transition-all duration-300 border border-gray-200 overflow-hidden cursor-pointer w-full max-w-full"
        onClick={handleCardClick}
      >
        <CardContent className="p-3 sm:p-5">
          <div className="flex flex-col sm:flex-row items-start gap-2.5 sm:gap-4">
            <div className="relative flex-shrink-0">
              <img
                src={creator.avatar || '/images/avatar-1.png'}
                alt={creator.name || 'Creator'}
                className="w-10 h-10 sm:w-16 sm:h-16 rounded-full object-cover border-[1.5px] border-gray-100"
              />
              <div className="absolute -bottom-1 -right-1 scale-75 sm:scale-100 origin-bottom-right">
                <StatusBadge status={creator.availability || 'available'} />
              </div>
            </div>
            <div className="flex-1 min-w-0 w-full mt-1 sm:mt-0">
              <div className="flex items-center gap-1">
                <h3 className="font-semibold text-gray-900 truncate text-xs sm:text-base">{creator.name}</h3>
                {creator.isVerified && <VerifiedBadge className="w-3 h-3 sm:w-4 sm:h-4 shrink-0" />}
              </div>
              <p className="text-[10px] sm:text-sm text-gray-500 capitalize truncate">{creator.category || 'Creator'}</p>
              <div className="flex items-center gap-1 mt-0.5">
                <Star className="w-3 h-3 sm:w-4 sm:h-4 fill-amber-400 text-amber-400" />
                <span className="text-[10px] sm:text-sm font-medium">{ratingDisplay.value}</span>
                <span className="text-[10px] text-gray-400">({ratingDisplay.count})</span>
              </div>
            </div>
          </div>
          
          <p className="mt-2 sm:mt-3 text-[10px] sm:text-sm text-gray-600 line-clamp-2">{creator.bio || 'No bio available'}</p>
          
          <div className="flex flex-wrap gap-1 mt-2 sm:mt-3 h-4 sm:h-auto overflow-hidden">
            {(creator.skills || []).slice(0, 2).map((skill) => (
              <span
                key={skill}
                className="px-1.5 sm:px-2 py-0.5 bg-gray-100 text-gray-600 text-[9px] sm:text-xs rounded-full truncate max-w-[60px] sm:max-w-[none]"
              >
                {skill}
              </span>
            ))}
            {(creator.skills || []).length > 2 && (
              <span className="px-1.5 sm:px-2 py-0.5 bg-gray-100 text-gray-600 text-[9px] sm:text-xs rounded-full">
                +{(creator.skills || []).length - 2}
              </span>
            )}
          </div>
          
          <div className="flex items-center justify-end mt-2.5 sm:mt-4 pt-2.5 sm:pt-4 border-t border-gray-100 gap-1.5 sm:gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleView}
              className="flex-1 sm:flex-none border-gray-200 text-[10px] sm:text-sm h-7 sm:h-9 px-1 sm:px-3"
            >
              View
            </Button>
            <Button
              size="sm"
              onClick={handleBook}
              className="flex-1 sm:flex-none bg-[#8A2BE2] hover:bg-[#7B1FD1] text-white text-[10px] sm:text-sm h-7 sm:h-9 px-1 sm:px-3"
            >
              Book
            </Button>
          </div>
        </CardContent>
      </Card>

      <NewBookingModal
        isOpen={isBookingModalOpen}
        onClose={() => setIsBookingModalOpen(false)}
        creator={{
          id: getCreatorId() || '',
          name: creator.name || '',
          avatar: creator.avatar,
          category: creator.category
        }}
      />
    </>
  );
}
