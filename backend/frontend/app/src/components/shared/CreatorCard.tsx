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
        className="group hover:shadow-lg transition-all duration-300 border border-gray-200 hover:border-[#8A2BE2]/30 overflow-hidden cursor-pointer h-full min-h-[220px]"
        onClick={handleCardClick}
      >
        <CardContent className="p-3 sm:p-4 flex flex-col items-center text-center h-full gap-3">
          {/* Top Section: Avatar & Status */}
          <div className="relative flex-shrink-0 mt-1">
            <img
              src={creator.avatar || '/images/avatar-1.png'}
              alt={creator.name || 'Creator'}
              className="w-14 h-14 sm:w-16 sm:h-16 rounded-full object-cover border-2 border-gray-100"
            />
            <div className="absolute -bottom-0.5 -right-0.5">
              <StatusBadge 
                status={creator.availability || 'available'} 
                className="px-1.5 py-0 text-[10px] scale-90 origin-bottom-right"
              />
            </div>
          </div>

          {/* Middle Section: Info */}
          <div className="flex-1 w-full min-w-0 space-y-1">
            <div className="flex items-center justify-center gap-1">
              <h3 className="font-bold text-gray-900 truncate text-sm sm:text-base leading-tight">
                {creator.name}
              </h3>
              {creator.isVerified && <VerifiedBadge className="w-3.5 h-3.5 shrink-0" />}
            </div>
            
            <p className="text-[11px] sm:text-xs text-gray-500 font-medium capitalize truncate">
              {creator.category || 'Creator'}
            </p>

            <div className="flex items-center justify-center gap-1 mt-1">
              <Star className="w-3 h-3 sm:w-3.5 sm:h-3.5 fill-amber-400 text-amber-400" />
              <span className="text-[11px] sm:text-xs font-bold">{ratingDisplay.value}</span>
              <span className="text-[10px] sm:text-[11px] text-gray-400">({ratingDisplay.count})</span>
            </div>
          </div>
          
          {/* Bottom Section: Buttons */}
          <div className="flex items-center gap-1 w-full mt-auto pt-2 border-t border-gray-100">
            <Button
              variant="outline"
              size="sm"
              onClick={handleView}
              className="flex-1 border-gray-200 text-[10px] sm:text-xs h-7 sm:h-8"
            >
              View
            </Button>
            <Button
              size="sm"
              onClick={handleBook}
              className="flex-1 bg-[#8A2BE2] hover:bg-[#7B1FD1] text-white text-[10px] sm:text-xs h-7 sm:h-8"
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
