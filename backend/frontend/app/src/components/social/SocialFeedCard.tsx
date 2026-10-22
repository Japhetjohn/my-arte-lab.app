import { useState, useRef, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import {
  ThumbsUp,
  MessageCircle,
  Forward,
  Globe,
  MoreHorizontal,
  Copy,
  Calendar,
  ChevronLeft,
  ChevronRight,
  Users,
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { toast } from '@/components/ui/sonner';
import { socialService } from '@/lib/api';
import { getAvatarUrl, getImageUrl } from '@/lib/imageUrl';
import { VerifiedBadge } from '@/components/shared/VerifiedBadge';
import { CommentsSection } from './CommentsSection';
import { cn } from '@/lib/utils';

export interface FeedPost {
  _id: string;
  serviceId?: string;
  title?: string;
  description: string;
  images: string[];
  directLink?: string;
  packages?: any[];
  createdAt: string | Date;
  likesCount: number;
  isLiked: boolean;
  commentsCount: number;
  creator: {
    _id: string;
    name: string;
    firstName?: string;
    lastName?: string;
    username?: string;
    avatar?: string;
    bio?: string;
    categories?: string[];
    isVerified?: boolean;
    rating?: { average: number; count: number };
    priceRange?: { min: number; max: number; currency: string };
    startingPrice?: number;
    location?: { localArea?: string; state?: string; country?: string };
  };
}

interface SocialFeedCardProps {
  post: FeedPost;
  onPostUpdated?: (updated: FeedPost) => void;
  className?: string;
}

/**
 * Format numeric counts into human-readable shorthand (e.g. 152K, 4.6K, 438)
 */
function formatCount(count: number): string {
  if (!count || count <= 0) return '0';
  if (count < 1000) return count.toString();
  if (count < 1000000) {
    const k = count / 1000;
    return k >= 10 ? `${Math.round(k)}K` : `${k.toFixed(1).replace(/\.0$/, '')}K`;
  }
  const m = count / 1000000;
  return m >= 10 ? `${Math.round(m)}M` : `${m.toFixed(1).replace(/\.0$/, '')}M`;
}

/**
 * Concise human-readable relative timestamp matching Facebook mobile reference (e.g. 5m, 2h, 5d)
 */
function formatTimestamp(dateInput?: string | Date): string {
  if (!dateInput) return 'Recently';
  const date = new Date(dateInput);
  const now = new Date();
  const diffSec = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (diffSec < 60) return 'Just now';
  if (diffSec < 3600) return `${Math.floor(diffSec / 60)}m`;
  if (diffSec < 86400) return `${Math.floor(diffSec / 3600)}h`;
  if (diffSec < 604800) return `${Math.floor(diffSec / 86400)}d`;
  if (diffSec < 31536000) return `${Math.floor(diffSec / 604800)}w`;
  return `${Math.floor(diffSec / 31536000)}y`;
}

/**
 * Clean caption linkifier: converts URLs into clickable brand-purple links without ugly boxes or icons
 */
function renderCaptionWithLinks(text: string) {
  const urlRegex = /(https?:\/\/[^\s]+|www\.[^\s]+)/g;
  const parts = text.split(urlRegex);

  return parts.map((part, i) => {
    if (part.match(urlRegex)) {
      const href = part.startsWith('www.') ? `https://${part}` : part;
      const trailingPunctuation = part.match(/[.,!?;:]+$/);
      const cleanHref = trailingPunctuation ? href.slice(0, -trailingPunctuation[0].length) : href;
      const cleanText = trailingPunctuation ? part.slice(0, -trailingPunctuation[0].length) : part;
      const punctuation = trailingPunctuation ? trailingPunctuation[0] : '';

      return (
        <span key={i}>
          <a
            href={cleanHref}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            className="text-[#9747FF] hover:underline break-all"
          >
            {cleanText}
          </a>
          {punctuation}
        </span>
      );
    }
    return part;
  });
}

export function SocialFeedCard({ post, className }: SocialFeedCardProps) {
  const { user } = useAuth();
  const serviceId = post.serviceId || post._id;

  const [isLiked, setIsLiked] = useState(post.isLiked);
  const [likesCount, setLikesCount] = useState(post.likesCount || 0);
  const [isLiking, setIsLiking] = useState(false);
  const [showComments, setShowComments] = useState(false);
  const [commentsCount, setCommentsCount] = useState(post.commentsCount || 0);

  // Caption expansion state
  const [isCaptionExpanded, setIsCaptionExpanded] = useState(false);

  // Horizontal Swipeable Gallery Index (no arrows)
  const [activeGalleryIndex, setActiveGalleryIndex] = useState(0);
  const galleryScrollRef = useRef<HTMLDivElement>(null);

  // Touch gesture tracking for reliable mobile swiping
  const touchStartXRef = useRef<number | null>(null);
  const touchStartYRef = useRef<number | null>(null);
  const isSwipingHorizontalRef = useRef(false);

  // Authoritative Viewport Impression Tracking (1 second dwell time)
  const cardRef = useRef<HTMLElement>(null);
  const impressionRecorded = useRef(false);

  useEffect(() => {
    if (!cardRef.current || impressionRecorded.current) return;

    let timer: NodeJS.Timeout;
    const observer = new IntersectionObserver(
      (entries) => {
        const [entry] = entries;
        if (entry.isIntersecting && !impressionRecorded.current) {
          timer = setTimeout(() => {
            impressionRecorded.current = true;
            socialService.recordImpression(serviceId).catch(() => {});
          }, 1000);
        } else {
          clearTimeout(timer);
        }
      },
      { threshold: 0.5 }
    );

    observer.observe(cardRef.current);
    return () => {
      clearTimeout(timer);
      observer.disconnect();
    };
  }, [serviceId]);

  // Mouse drag state for desktop gallery navigation
  const isDraggingRef = useRef(false);
  const startXRef = useRef(0);
  const startScrollLeftRef = useRef(0);

  // Gallery scroll listener to update active pagination dot
  const handleGalleryScroll = () => {
    const container = galleryScrollRef.current;
    if (!container) return;
    const scrollLeft = container.scrollLeft;
    const width = container.clientWidth;
    if (width > 0) {
      const imagesCount = (post.images || []).length;
      const nextIndex = Math.min(
        imagesCount - 1,
        Math.max(0, Math.round(scrollLeft / width))
      );
      if (nextIndex !== activeGalleryIndex) {
        setActiveGalleryIndex(nextIndex);
      }
    }
  };

  // Direct dot navigation for multi-image gallery
  const scrollToIndex = (index: number) => {
    const container = galleryScrollRef.current;
    if (!container) return;
    const imagesCount = (post.images || []).length;
    const clamped = Math.max(0, Math.min(imagesCount - 1, index));
    const width = container.clientWidth;
    container.scrollTo({
      left: width * clamped,
      behavior: 'smooth',
    });
    setActiveGalleryIndex(clamped);
  };

  const handlePrevImage = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    if (activeGalleryIndex > 0) {
      scrollToIndex(activeGalleryIndex - 1);
    }
  };

  const handleNextImage = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    const imagesCount = (post.images || []).length;
    if (activeGalleryIndex < imagesCount - 1) {
      scrollToIndex(activeGalleryIndex + 1);
    }
  };

  // Mouse drag handlers for desktop trackpad/drag
  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button !== 0) return;
    const container = galleryScrollRef.current;
    if (!container) return;
    isDraggingRef.current = true;
    startXRef.current = e.pageX - container.offsetLeft;
    startScrollLeftRef.current = container.scrollLeft;
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDraggingRef.current) return;
    const container = galleryScrollRef.current;
    if (!container) return;
    e.preventDefault();
    const x = e.pageX - container.offsetLeft;
    const walk = (x - startXRef.current) * 1.2;
    container.scrollLeft = startScrollLeftRef.current - walk;
  };

  const handleMouseUpOrLeave = () => {
    if (!isDraggingRef.current) return;
    isDraggingRef.current = false;
    const container = galleryScrollRef.current;
    if (!container) return;
    const width = container.clientWidth;
    if (width > 0) {
      const targetIndex = Math.round(container.scrollLeft / width);
      scrollToIndex(targetIndex);
    }
  };

  // Touch handlers for mobile swipe gesture detection
  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 1) {
      touchStartXRef.current = e.touches[0].clientX;
      touchStartYRef.current = e.touches[0].clientY;
      isSwipingHorizontalRef.current = false;
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (touchStartXRef.current === null || touchStartYRef.current === null) return;
    const deltaX = e.touches[0].clientX - touchStartXRef.current;
    const deltaY = e.touches[0].clientY - touchStartYRef.current;

    if (!isSwipingHorizontalRef.current && Math.abs(deltaX) > 8 && Math.abs(deltaX) > Math.abs(deltaY)) {
      isSwipingHorizontalRef.current = true;
    }
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartXRef.current === null || !isSwipingHorizontalRef.current) {
      touchStartXRef.current = null;
      touchStartYRef.current = null;
      isSwipingHorizontalRef.current = false;
      return;
    }

    const deltaX = e.changedTouches[0].clientX - touchStartXRef.current;
    const swipeThreshold = 35;
    const imagesCount = (post.images || []).length;

    if (deltaX < -swipeThreshold && activeGalleryIndex < imagesCount - 1) {
      scrollToIndex(activeGalleryIndex + 1);
    } else if (deltaX > swipeThreshold && activeGalleryIndex > 0) {
      scrollToIndex(activeGalleryIndex - 1);
    } else {
      scrollToIndex(activeGalleryIndex);
    }

    touchStartXRef.current = null;
    touchStartYRef.current = null;
    isSwipingHorizontalRef.current = false;
  };

  const handleToggleLike = async () => {
    if (!user) {
      toast.error('Please log in to like this post');
      return;
    }

    if (isLiking) return;

    // Optimistic toggle
    const newIsLiked = !isLiked;
    const newCount = newIsLiked ? likesCount + 1 : Math.max(0, likesCount - 1);
    setIsLiked(newIsLiked);
    setLikesCount(newCount);

    try {
      setIsLiking(true);
      const res = await socialService.toggleLike(serviceId);
      const data = res.data?.data;
      if (data) {
        setIsLiked(data.isLiked);
        setLikesCount(data.likesCount);
      }
    } catch (err) {
      console.error('Error toggling like:', err);
      // Revert optimistic update
      setIsLiked(isLiked);
      setLikesCount(likesCount);
      toast.error('Could not update like status');
    } finally {
      setIsLiking(false);
    }
  };

  const handleShare = async () => {
    const postUrl = `${window.location.origin}/creators/${post.creator._id}`;
    if (navigator.share) {
      try {
        await navigator.share({
          title: post.title || post.creator.name,
          text: post.description || 'Check out this creative artwork on MyArteLab',
          url: postUrl,
        });
        return;
      } catch {}
    }

    if (navigator.clipboard) {
      await navigator.clipboard.writeText(postUrl);
      toast.success('Post link copied to clipboard');
    }
  };

  const images = post.images || [];
  const hasImages = images.length > 0;
  const descriptionText = post.description || post.title || '';

  // Extract author display name reliably
  const creatorDisplayName =
    post.creator?.name && post.creator.name !== 'Creator'
      ? post.creator.name
      : `${(post.creator as any)?.firstName || ''} ${(post.creator as any)?.lastName || ''}`.trim() ||
        post.creator?.username ||
        post.creator?.name ||
        'Creator';
  const creatorInitial = (creatorDisplayName || 'C')[0].toUpperCase();

  // Calculate if caption requires truncation
  // Text-only: first 5 lines visible + "Read more"
  // With images: first 3 lines visible + "...see more"
  const isLongCaption = hasImages
    ? descriptionText.length > 140 || descriptionText.split('\n').length > 3
    : descriptionText.length > 280 || descriptionText.split('\n').length > 5;

  return (
    <article
      ref={cardRef}
      className={cn(
        'w-full bg-white dark:bg-[#18191a] border-b border-[#DADDE1] dark:border-[#2f3032] transition-colors',
        className
      )}
    >
      {/* 1. Creator Identity and Post Controls Row */}
      <div className="px-4 pt-3.5 pb-2 flex items-center justify-between">
        <a
          href={`/creators/${post.creator._id}`}
          className="flex items-center gap-2.5 sm:gap-3 group cursor-pointer min-w-0"
        >
          {/* Creator Avatar */}
          <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-full overflow-hidden bg-purple-50 dark:bg-purple-950/40 flex items-center justify-center shrink-0 border border-gray-200/80 dark:border-gray-700 group-hover:ring-2 group-hover:ring-[#9747FF]/30 transition-all">
            {post.creator.avatar ? (
              <img
                src={getAvatarUrl(post.creator.avatar)}
                alt={creatorDisplayName}
                className="w-full h-full object-cover"
              />
            ) : (
              <span className="text-[#9747FF] font-bold text-sm sm:text-base">
                {creatorInitial}
              </span>
            )}
          </div>

          {/* Creator Name, Verification, Timestamp */}
          <div className="flex flex-col min-w-0">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="font-bold text-[15px] sm:text-base text-gray-900 dark:text-gray-100 group-hover:text-[#9747FF] transition-colors leading-tight truncate">
                {creatorDisplayName}
              </span>
              {post.creator.isVerified && (
                <VerifiedBadge className="w-4 h-4 shrink-0 inline-block align-middle" showTooltip={false} />
              )}
            </div>

            {/* Timestamp & Public Visibility Globe */}
            <div className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400 leading-none mt-1">
              <span>{formatTimestamp(post.createdAt)}</span>
              <span>•</span>
              <Globe className="w-3 h-3 text-gray-400 shrink-0" aria-label="Public artwork" />
            </div>
          </div>
        </a>

        {/* Post Options Menu */}
        <div className="flex items-center gap-1 shrink-0">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                className="p-1.5 text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors cursor-pointer outline-none focus:outline-none"
                aria-label="Artwork options"
              >
                <MoreHorizontal className="w-5 h-5 stroke-[2]" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48 bg-white dark:bg-[#1e1f20] border border-[#DADDE1] dark:border-[#2f3032] rounded-xl shadow-md p-1 divide-y divide-[#DADDE1]/50 dark:divide-[#2f3032]">
              <div className="py-1">
                <DropdownMenuItem onClick={handleShare} className="cursor-pointer text-xs dark:text-gray-200 dark:focus:bg-gray-800">
                  <Copy className="w-3.5 h-3.5 mr-2 text-gray-500" />
                  <span>Copy artwork link</span>
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => (window.location.href = `/creators/${post.creator._id}`)}
                  className="cursor-pointer text-xs dark:text-gray-200 dark:focus:bg-gray-800"
                >
                  <Users className="w-3.5 h-3.5 mr-2 text-gray-500" />
                  <span>View creator profile</span>
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => (window.location.href = `/creators/${post.creator._id}`)}
                  className="cursor-pointer text-xs dark:text-gray-200 dark:focus:bg-gray-800"
                >
                  <Calendar className="w-3.5 h-3.5 mr-2 text-gray-500" />
                  <span>Book creator</span>
                </DropdownMenuItem>
              </div>
              {post.directLink && (
                <div className="py-1">
                  <DropdownMenuItem
                    onClick={() => window.open(post.directLink, '_blank')}
                    className="cursor-pointer text-xs text-[#9747FF] dark:focus:bg-gray-800"
                  >
                    <span>Visit website link</span>
                  </DropdownMenuItem>
                </div>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* 2. Caption and Description */}
      {descriptionText && (
        <div className={cn('px-4 pt-1', hasImages ? 'pb-2.5' : 'pb-4')}>
          <p
            className={cn(
              'text-[15px] sm:text-base text-gray-900 dark:text-gray-100 leading-relaxed whitespace-pre-line break-words',
              !isCaptionExpanded && (hasImages ? 'line-clamp-3' : 'line-clamp-5')
            )}
          >
            {renderCaptionWithLinks(descriptionText)}
          </p>

          {/* "...see more" (with images) or "Read more" (text-only 5-line limit) */}
          {isLongCaption && !isCaptionExpanded && (
            <button
              type="button"
              onClick={() => setIsCaptionExpanded(true)}
              className="text-[14px] sm:text-[15px] font-semibold text-gray-500 dark:text-gray-400 hover:text-[#9747FF] cursor-pointer mt-0.5 inline-block"
            >
              {hasImages ? '...see more' : 'Read more'}
            </button>
          )}

          {isLongCaption && isCaptionExpanded && (
            <button
              type="button"
              onClick={() => setIsCaptionExpanded(false)}
              className="text-xs font-medium text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 cursor-pointer mt-1 block"
            >
              Show less
            </button>
          )}

          {/* Optional external link — clean purple link without square icon */}
          {post.directLink && (
            <div className="mt-2">
              <a
                href={post.directLink.startsWith('http') ? post.directLink : `https://${post.directLink}`}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => e.stopPropagation()}
                className="text-xs sm:text-sm text-[#9747FF] hover:underline break-all inline-block"
              >
                {post.directLink}
              </a>
            </div>
          )}
        </div>
      )}

      {/* 3. Artwork Presentation — Full Width Edge-to-Edge */}
      {hasImages && (
        <div className="w-full bg-black/5 dark:bg-black/20">
          {images.length === 1 ? (
            // Single-Image Post: Full available width, preserved aspect ratio, NO arrows, NO dots
            <div className="w-full flex items-center justify-center max-h-[620px] overflow-hidden bg-black/5 dark:bg-black/20">
              <img
                src={getImageUrl(images[0])}
                alt={post.title || 'Artwork'}
                className="w-full h-auto max-h-[620px] object-cover sm:object-contain"
                loading="lazy"
              />
            </div>
          ) : (
            // Multiple-Image Post: Horizontal swipeable gallery with mobile-only arrows & desktop dots
            <div className="w-full relative overflow-hidden bg-black/5 dark:bg-black/20">
              {/* Mobile-Only Subtle Left/Right Navigation Arrows (sm:hidden) */}
              <button
                type="button"
                onClick={handlePrevImage}
                disabled={activeGalleryIndex === 0}
                className={cn(
                  'sm:hidden absolute left-2 top-1/2 -translate-y-1/2 z-10 w-7 h-7 rounded-full flex items-center justify-center transition-all select-none',
                  activeGalleryIndex === 0
                    ? 'bg-black/20 text-white/30 cursor-not-allowed'
                    : 'bg-black/45 hover:bg-[#9747FF] text-white active:scale-95 cursor-pointer shadow-xs'
                )}
                aria-label="Previous artwork image"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>

              <button
                type="button"
                onClick={handleNextImage}
                disabled={activeGalleryIndex === images.length - 1}
                className={cn(
                  'sm:hidden absolute right-2 top-1/2 -translate-y-1/2 z-10 w-7 h-7 rounded-full flex items-center justify-center transition-all select-none',
                  activeGalleryIndex === images.length - 1
                    ? 'bg-black/20 text-white/30 cursor-not-allowed'
                    : 'bg-black/45 hover:bg-[#9747FF] text-white active:scale-95 cursor-pointer shadow-xs'
                )}
                aria-label="Next artwork image"
              >
                <ChevronRight className="w-4 h-4" />
              </button>

              <div
                ref={galleryScrollRef}
                onScroll={handleGalleryScroll}
                onMouseDown={handleMouseDown}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUpOrLeave}
                onMouseLeave={handleMouseUpOrLeave}
                onTouchStart={handleTouchStart}
                onTouchMove={handleTouchMove}
                onTouchEnd={handleTouchEnd}
                className="w-full flex overflow-x-auto snap-x snap-mandatory no-scrollbar cursor-grab active:cursor-grabbing select-none"
                style={{
                  scrollbarWidth: 'none',
                  msOverflowStyle: 'none',
                  WebkitOverflowScrolling: 'touch',
                  overscrollBehaviorX: 'contain',
                  touchAction: 'manipulation',
                }}
              >
                {images.map((imgUrl, idx) => (
                  <div
                    key={idx}
                    className="min-w-full w-full flex-shrink-0 snap-center snap-always flex items-center justify-center max-h-[620px] overflow-hidden bg-black/5 dark:bg-black/20"
                  >
                    <img
                      src={getImageUrl(imgUrl)}
                      alt={post.title || `Artwork ${idx + 1}`}
                      className="w-full h-auto max-h-[620px] object-cover sm:object-contain pointer-events-none select-none"
                      draggable={false}
                      loading={idx === 0 ? 'eager' : 'lazy'}
                    />
                  </div>
                ))}
              </div>

              {/* Desktop-Only Pagination Dots (Hidden on mobile, preserved on desktop) */}
              <div className="hidden sm:flex w-full items-center justify-center gap-1.5 py-1 bg-white dark:bg-[#18191a]">
                {images.map((_, dotIdx) => (
                  <button
                    key={dotIdx}
                    type="button"
                    onClick={() => scrollToIndex(dotIdx)}
                    className={cn(
                      'rounded-full transition-all duration-200 cursor-pointer focus:outline-none p-0 shrink-0',
                      activeGalleryIndex === dotIdx
                        ? 'w-[5px] h-[5px] bg-[#9747FF]'
                        : 'w-[4px] h-[4px] bg-[#DADDE1] dark:bg-[#3e4042] hover:bg-gray-400'
                    )}
                    aria-label={`View artwork image ${dotIdx + 1} of ${images.length}`}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* 4. Engagement Summary Row (Likes & Comments count, no decorative reaction circles) */}
      <div className="px-4 py-2 flex items-center justify-between text-xs text-gray-500 dark:text-gray-400 border-b border-[#DADDE1]/70 dark:border-[#2f3032]">
        {/* Left: Clean Like Count without decorative circles */}
        <span className="font-medium text-gray-600 dark:text-gray-300">
          {formatCount(likesCount)} {likesCount === 1 ? 'like' : 'likes'}
        </span>

        {/* Right: Comment Count */}
        <button
          type="button"
          onClick={() => setShowComments((prev) => !prev)}
          className="font-medium text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 transition-colors cursor-pointer"
        >
          {commentsCount > 0
            ? `${formatCount(commentsCount)} ${commentsCount === 1 ? 'comment' : 'comments'}`
            : '0 comments'}
        </button>
      </div>

      {/* 5. Like, Comment, and Share Action Row */}
      <div className="px-2 sm:px-4 py-1 flex items-center justify-between">
        {/* Like Button */}
        <button
          type="button"
          onClick={handleToggleLike}
          disabled={isLiking}
          className={cn(
            'flex-1 flex items-center justify-center gap-2 py-2 px-2 rounded-lg text-xs sm:text-sm font-medium transition-colors cursor-pointer select-none active:scale-95',
            isLiked
              ? 'text-[#9747FF] hover:bg-purple-50/70 dark:hover:bg-purple-950/40 font-semibold'
              : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100/70 dark:hover:bg-white/[0.06] hover:text-gray-900 dark:hover:text-gray-100 active:bg-gray-200/60'
          )}
          aria-label={isLiked ? 'Unlike artwork' : 'Like artwork'}
        >
          <ThumbsUp
            className={cn(
              'w-4 h-4 sm:w-4.5 sm:h-4.5 transition-transform duration-200',
              isLiked ? 'fill-[#9747FF] text-[#9747FF] scale-110' : 'text-gray-500 dark:text-gray-400'
            )}
          />
          <span>{likesCount > 0 ? formatCount(likesCount) : 'Like'}</span>
        </button>

        {/* Comment Button */}
        <button
          type="button"
          onClick={() => setShowComments((prev) => !prev)}
          className={cn(
            'flex-1 flex items-center justify-center gap-2 py-2 px-2 rounded-lg text-xs sm:text-sm font-medium transition-colors cursor-pointer select-none active:scale-95',
            showComments
              ? 'text-[#9747FF] bg-purple-50/60 dark:bg-purple-950/40 font-semibold'
              : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100/70 dark:hover:bg-white/[0.06] hover:text-gray-900 dark:hover:text-gray-100 active:bg-gray-200/60'
          )}
          aria-label="View comments"
        >
          <MessageCircle className="w-4 h-4 sm:w-4.5 sm:h-4.5 text-gray-500 dark:text-gray-400" />
          <span>{commentsCount > 0 ? formatCount(commentsCount) : 'Comment'}</span>
        </button>

        {/* Share Button (Curved arrow matching Facebook reference) */}
        <button
          type="button"
          onClick={handleShare}
          className="flex-1 flex items-center justify-center gap-2 py-2 px-2 rounded-lg text-xs sm:text-sm font-medium text-gray-600 dark:text-gray-300 hover:bg-gray-100/70 dark:hover:bg-white/[0.06] hover:text-gray-900 dark:hover:text-gray-100 active:bg-gray-200/60 transition-colors cursor-pointer select-none active:scale-95"
          aria-label="Share post"
        >
          <Forward className="w-4 h-4 sm:w-4.5 sm:h-4.5 text-gray-500 dark:text-gray-400" />
          <span>Share</span>
        </button>
      </div>

      {/* 6. Expandable Comments Section */}
      {showComments && (
        <div className="px-4 pb-4 pt-1 border-t border-[#DADDE1]/70 dark:border-[#2f3032] animate-in fade-in duration-200">
          <CommentsSection
            serviceId={serviceId}
            initialCommentsCount={commentsCount}
            onCommentsCountChange={setCommentsCount}
          />
        </div>
      )}
    </article>
  );
}
