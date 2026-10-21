import { useState } from 'react';
import { Star, MapPin, Sparkles } from 'lucide-react';
import type { Creator } from '@/types';
import { VerifiedBadge } from './VerifiedBadge';
import { NewBookingModal } from '@/components/booking/NewBookingModal';
import { getImageUrl } from '@/lib/imageUrl';
import { getCreatorProfileUrl } from '@/lib/utils';

interface CreatorCardProps {
  creator: Creator & { 
    rating?: number | { average?: number; count?: number }; 
    _id?: string; 
    priceRange?: { min: number; max: number };
  };
  onViewProfile?: (creator: Creator & { _id?: string }) => void;
  onBook?: (creator: Creator & { _id?: string }) => void;
}

export function CreatorCard({ creator, onViewProfile, onBook }: CreatorCardProps) {
  const [isBookingModalOpen, setIsBookingModalOpen] = useState(false);
  const [imgSrc, setImgSrc] = useState<string>(() => getImageUrl(creator.avatar) || '/images/avatar-1.png');

  const profileUrl = getCreatorProfileUrl(creator as any);

  const displayName = creator.name || 
    [creator.firstName, creator.lastName].filter(Boolean).join(' ') || 
    'Creator';

  const isUnavailable = creator.availability === 'unavailable';

  const handleCardClick = () => {
    if (onViewProfile) {
      onViewProfile(creator);
    } else {
      window.location.href = profileUrl;
    }
  };

  const handleBook = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isUnavailable) return;
    if (onBook) {
      onBook(creator);
    } else {
      setIsBookingModalOpen(true);
    }
  };

  // Safe rating calculation adhering strictly to zero fake data rule
  const getRatingDisplay = () => {
    const rating = creator.rating as any;
    if (typeof rating === 'object' && rating !== null && 'average' in rating) {
      const avg = Number(rating.average) || 0;
      const count = Number(rating.count) || Number(creator.reviewCount) || 0;
      return {
        value: avg > 0 ? avg.toFixed(1) : null,
        count: count,
        hasReviews: count > 0 && avg > 0
      };
    }
    const val = typeof rating === 'number' ? rating : 0;
    const count = Number(creator.reviewCount) || 0;
    return {
      value: val > 0 ? val.toFixed(1) : null,
      count: count,
      hasReviews: count > 0 && val > 0
    };
  };

  const ratingDisplay = getRatingDisplay();

  // Location display: prefer city / localArea / state / country
  const getLocationDisplay = () => {
    if (!creator.location) return '';
    if (typeof creator.location === 'string') return creator.location;
    const loc = creator.location as any;
    const parts = [loc.localArea, loc.city, loc.state, loc.country].filter(Boolean);
    return parts.length > 0 ? parts[0] : '';
  };
  const locationDisplay = getLocationDisplay();

  // Primary specialty or skill
  const specialty = Array.isArray(creator.skills) && creator.skills.length > 0
    ? creator.skills[0]
    : Array.isArray(creator.category) && creator.category.length > 0
    ? creator.category[0]
    : typeof creator.category === 'string' && creator.category.trim()
    ? creator.category.trim()
    : '';

  // Concise bio / professional summary
  const descriptionText = (() => {
    if (creator.bio && creator.bio.trim().length > 0) {
      return creator.bio.trim();
    }
    const categoryStr = Array.isArray(creator.category)
      ? creator.category.join(' • ')
      : (creator.category || '');
    if (categoryStr) {
      return `Specializing in ${categoryStr}`;
    }
    if (Array.isArray(creator.skills) && creator.skills.length > 0) {
      return `Specializing in ${creator.skills.slice(0, 3).join(', ')}`;
    }
    return 'Creative professional on MyArteLab available for projects.';
  })();

  const startingPrice = typeof creator.startingPrice === 'number' && creator.startingPrice > 0
    ? creator.startingPrice
    : null;

  return (
    <>
      <div 
        role="button"
        tabIndex={0}
        onClick={handleCardClick}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            handleCardClick();
          }
        }}
        className="group relative bg-white rounded-3xl p-3.5 sm:p-4 border border-gray-200/80 hover:border-[#9747FF]/40 shadow-xs hover:shadow-xl hover:-translate-y-1 transition-all duration-300 flex flex-col h-full cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-[#9747FF]"
      >
        {/* Top Portrait: prominent, rounded, square aspect matching reference */}
        <div className="relative w-full aspect-square rounded-2xl overflow-hidden bg-gray-100 shrink-0 select-none">
          <img
            src={imgSrc}
            alt={displayName}
            onError={() => setImgSrc('/images/avatar-1.png')}
            className="w-full h-full object-cover object-top transition-transform duration-500 group-hover:scale-105"
            loading="lazy"
          />
        </div>

        {/* Content area: Name, verification, bio */}
        <div className="mt-3.5 sm:mt-4 flex flex-col flex-1 min-w-0">
          {/* Creator Name & Verification badge */}
          <div className="flex items-center gap-1.5 min-w-0">
            <h3 className="font-bold text-gray-900 text-base sm:text-lg tracking-tight truncate leading-tight group-hover:text-[#9747FF] transition-colors">
              {displayName}
            </h3>
            {creator.isVerified && (
              <VerifiedBadge className="w-4 h-4 sm:w-4.5 sm:h-4.5 shrink-0" />
            )}
          </div>

          {/* Short Bio / Description (consistent 2 lines height) */}
          <p className="mt-1.5 text-xs sm:text-sm text-gray-500 leading-relaxed line-clamp-2 min-h-[2.5rem] sm:min-h-[2.75rem]">
            {descriptionText}
          </p>

          {/* Bottom Row: Metrics & Book action */}
          <div className="mt-auto pt-3.5 sm:pt-4 flex items-center justify-between gap-2 min-w-0">
            {/* Left side: Authentic supported metrics */}
            <div className="min-w-0 flex-1 pr-1">
              {ratingDisplay.hasReviews ? (
                <div className="flex items-center gap-1.5 min-w-0">
                  <Star className="w-3.5 h-3.5 sm:w-4 sm:h-4 fill-amber-400 text-amber-400 shrink-0" />
                  <span className="text-xs sm:text-sm font-bold text-gray-900">{ratingDisplay.value}</span>
                  <span className="text-[11px] sm:text-xs text-gray-400 truncate">({ratingDisplay.count})</span>
                </div>
              ) : locationDisplay ? (
                <div className="flex items-center gap-1 min-w-0 text-xs sm:text-sm text-gray-500 font-medium truncate" title={locationDisplay}>
                  <MapPin className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                  <span className="truncate">{locationDisplay}</span>
                </div>
              ) : specialty ? (
                <div className="flex items-center gap-1 min-w-0 text-xs sm:text-sm text-gray-500 font-medium truncate" title={specialty}>
                  <Sparkles className="w-3.5 h-3.5 text-[#9747FF]/70 shrink-0" />
                  <span className="truncate">{specialty}</span>
                </div>
              ) : startingPrice ? (
                <div className="text-xs sm:text-sm text-gray-600 font-medium truncate">
                  From <span className="font-semibold text-gray-900">${startingPrice}</span>
                </div>
              ) : (
                <div className="flex items-center gap-1.5 text-xs text-emerald-600 font-medium">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
                  <span>Available</span>
                </div>
              )}
            </div>

            {/* Right side: Book Button */}
            <button
              type="button"
              onClick={handleBook}
              disabled={isUnavailable}
              className={isUnavailable 
                ? "bg-gray-100 text-gray-400 font-medium text-xs sm:text-sm px-3.5 sm:px-4 py-1.5 sm:py-2 rounded-full cursor-not-allowed shrink-0"
                : "bg-[#9747FF] hover:bg-[#8534f0] active:scale-[0.98] text-white font-semibold text-xs sm:text-sm px-4 sm:px-5 py-1.5 sm:py-2 rounded-full shadow-xs hover:shadow-md transition-all shrink-0 cursor-pointer"
              }
            >
              {isUnavailable ? 'Unavailable' : 'Book'}
            </button>
          </div>
        </div>
      </div>

      <NewBookingModal
        isOpen={isBookingModalOpen}
        onClose={() => setIsBookingModalOpen(false)}
        creator={creator as any}
      />
    </>
  );
}
