import { useState, useRef, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import {
  ThumbsUp,
  Heart,
  MessageCircle,
  Forward,
  Globe,
  MoreHorizontal,
  Copy,
  ExternalLink,
  Calendar,
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
    const width = container.clientWidth;
    container.scrollTo({
      left: width * index,
      behavior: 'smooth',
    });
    setActiveGalleryIndex(index);
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
        'w-full bg-white border-b border-[#DADDE1] transition-colors',
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
          <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-full overflow-hidden bg-purple-50 flex items-center justify-center shrink-0 border border-gray-200/80 group-hover:ring-2 group-hover:ring-[#9747FF]/30 transition-all">
            {post.creator.avatar ? (
              <img
                src={getAvatarUrl(post.creator.avatar)}
                alt={post.creator.name}
                className="w-full h-full object-cover"
              />
            ) : (
              <span className="text-[#9747FF] font-bold text-sm sm:text-base">
                {(post.creator.name || 'C')[0].toUpperCase()}
              </span>
            )}
          </div>

          {/* Creator Name, Verification, Timestamp */}
          <div className="flex flex-col min-w-0">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="font-bold text-[15px] sm:text-base text-gray-900 group-hover:text-[#9747FF] transition-colors leading-tight truncate">
                {post.creator.name}
              </span>
              {post.creator.isVerified && (
                <VerifiedBadge className="w-4 h-4 shrink-0 inline-block" />
              )}
            </div>

            {/* Timestamp & Public Visibility Globe */}
            <div className="flex items-center gap-1.5 text-xs text-gray-500 leading-none mt-1">
              <span>{formatTimestamp(post.createdAt)}</span>
              <span>•</span>
              <Globe className="w-3 h-3 text-gray-400 shrink-0" aria-label="Public post" />
            </div>
          </div>
        </a>

        {/* Post Options Menu */}
        <div className="flex items-center gap-1 shrink-0">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                className="p-1.5 text-gray-500 hover:text-gray-900 hover:bg-gray-100 rounded-full transition-colors cursor-pointer outline-none focus:outline-none"
                aria-label="Post options"
              >
                <MoreHorizontal className="w-5 h-5 stroke-[2]" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuItem onClick={handleShare} className="cursor-pointer">
                <Copy className="w-4 h-4 mr-2 text-gray-500" />
                <span>Copy link</span>
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => (window.location.href = `/creators/${post.creator._id}`)}
                className="cursor-pointer"
              >
                <ExternalLink className="w-4 h-4 mr-2 text-gray-500" />
                <span>View creator profile</span>
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => (window.location.href = `/creators/${post.creator._id}`)}
                className="cursor-pointer"
              >
                <Calendar className="w-4 h-4 mr-2 text-gray-500" />
                <span>Book creator</span>
              </DropdownMenuItem>
              {post.directLink && (
                <DropdownMenuItem
                  onClick={() => window.open(post.directLink, '_blank')}
                  className="cursor-pointer"
                >
                  <ExternalLink className="w-4 h-4 mr-2 text-gray-500" />
                  <span>Open external link</span>
                </DropdownMenuItem>
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
              'text-[15px] sm:text-base text-gray-900 leading-relaxed whitespace-pre-line break-words',
              !isCaptionExpanded && (hasImages ? 'line-clamp-3' : 'line-clamp-5')
            )}
          >
            {descriptionText}
          </p>

          {/* "...see more" (with images) or "Read more" (text-only 5-line limit) */}
          {isLongCaption && !isCaptionExpanded && (
            <button
              type="button"
              onClick={() => setIsCaptionExpanded(true)}
              className="text-[14px] sm:text-[15px] font-semibold text-gray-500 hover:text-[#9747FF] cursor-pointer mt-0.5 inline-block"
            >
              {hasImages ? '...see more' : 'Read more'}
            </button>
          )}

          {isLongCaption && isCaptionExpanded && (
            <button
              type="button"
              onClick={() => setIsCaptionExpanded(false)}
              className="text-xs font-medium text-gray-400 hover:text-gray-600 cursor-pointer mt-1 block"
            >
              Show less
            </button>
          )}

          {/* Optional external link */}
          {post.directLink && (
            <a
              href={post.directLink}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-2 inline-flex items-center gap-1.5 text-xs font-semibold text-[#9747FF] hover:underline"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              <span className="truncate max-w-xs">{post.directLink}</span>
            </a>
          )}
        </div>
      )}

      {/* 3. Artwork Presentation — Full Width Edge-to-Edge */}
      {hasImages && (
        <div className="w-full bg-black/5">
          {images.length === 1 ? (
            // Single-Image Post: Full available width, preserved aspect ratio, NO arrows, NO dots
            <div className="w-full flex items-center justify-center max-h-[620px] overflow-hidden bg-black/5">
              <img
                src={getImageUrl(images[0])}
                alt={post.title || 'Artwork'}
                className="w-full h-auto max-h-[620px] object-cover sm:object-contain"
                loading="lazy"
              />
            </div>
          ) : (
            // Multiple-Image Post: Horizontal swipeable gallery with pagination dots (NO arrows)
            <div className="w-full relative overflow-hidden bg-black/5">
              <div
                ref={galleryScrollRef}
                onScroll={handleGalleryScroll}
                className="w-full flex overflow-x-auto snap-x snap-mandatory no-scrollbar touch-pan-x"
                style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
              >
                {images.map((imgUrl, idx) => (
                  <div
                    key={idx}
                    className="w-full flex-shrink-0 snap-center flex items-center justify-center max-h-[620px] overflow-hidden bg-black/5"
                  >
                    <img
                      src={getImageUrl(imgUrl)}
                      alt={post.title || `Artwork ${idx + 1}`}
                      className="w-full h-auto max-h-[620px] object-cover sm:object-contain"
                      loading={idx === 0 ? 'eager' : 'lazy'}
                    />
                  </div>
                ))}
              </div>

              {/* Small Pagination Dots (active: #9747FF, inactive: gray-300) */}
              <div className="flex items-center justify-center gap-1.5 py-2.5">
                {images.map((_, dotIdx) => (
                  <button
                    key={dotIdx}
                    type="button"
                    onClick={() => scrollToIndex(dotIdx)}
                    className={cn(
                      'transition-all duration-200 rounded-full cursor-pointer focus:outline-none',
                      activeGalleryIndex === dotIdx
                        ? 'w-2.5 h-2.5 bg-[#9747FF]'
                        : 'w-1.5 h-1.5 bg-gray-300 hover:bg-gray-400'
                    )}
                    aria-label={`Go to slide ${dotIdx + 1} of ${images.length}`}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* 4. Engagement Summary Row (Reactions & Comments count) */}
      <div className="px-4 py-2 flex items-center justify-between text-xs sm:text-[13px] text-gray-500 border-b border-[#DADDE1]/70">
        {/* Left: Reaction Indicators & Aggregate Count */}
        <div className="flex items-center gap-1.5">
          <div className="flex items-center -space-x-1">
            <span className="w-4.5 h-4.5 rounded-full bg-[#9747FF] text-white flex items-center justify-center shadow-xs">
              <ThumbsUp className="w-2.5 h-2.5 fill-white text-white" />
            </span>
            <span className="w-4.5 h-4.5 rounded-full bg-rose-500 text-white flex items-center justify-center shadow-xs">
              <Heart className="w-2.5 h-2.5 fill-white text-white" />
            </span>
          </div>
          <span className="font-medium text-gray-600">
            {formatCount(likesCount)}
          </span>
        </div>

        {/* Right: Comment Count */}
        <button
          type="button"
          onClick={() => setShowComments((prev) => !prev)}
          className="font-medium text-gray-500 hover:text-gray-800 transition-colors cursor-pointer"
        >
          {commentsCount > 0
            ? `${formatCount(commentsCount)} ${commentsCount === 1 ? 'comment' : 'comments'}`
            : '0 comments'}
        </button>
      </div>

      {/* 5. Like, Comment, and Share Action Row (Clean Facebook-Style, no card pills) */}
      <div className="px-2 sm:px-4 py-1 flex items-center justify-between">
        {/* Like Button */}
        <button
          type="button"
          onClick={handleToggleLike}
          disabled={isLiking}
          className={cn(
            'flex-1 flex items-center justify-center gap-2 py-2 px-2 rounded-lg text-xs sm:text-sm font-medium transition-colors cursor-pointer select-none active:scale-95',
            isLiked
              ? 'text-[#9747FF] hover:bg-purple-50/70 font-semibold'
              : 'text-gray-600 hover:bg-gray-100/70 hover:text-gray-900 active:bg-gray-200/60'
          )}
          aria-label={isLiked ? 'Unlike post' : 'Like post'}
        >
          <ThumbsUp
            className={cn(
              'w-4 h-4 sm:w-4.5 sm:h-4.5 transition-transform duration-200',
              isLiked ? 'fill-[#9747FF] text-[#9747FF] scale-110' : 'text-gray-500'
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
              ? 'text-[#9747FF] bg-purple-50/60 font-semibold'
              : 'text-gray-600 hover:bg-gray-100/70 hover:text-gray-900 active:bg-gray-200/60'
          )}
          aria-label="View comments"
        >
          <MessageCircle className="w-4 h-4 sm:w-4.5 sm:h-4.5 text-gray-500" />
          <span>{commentsCount > 0 ? formatCount(commentsCount) : 'Comment'}</span>
        </button>

        {/* Share Button (Curved arrow matching Facebook reference) */}
        <button
          type="button"
          onClick={handleShare}
          className="flex-1 flex items-center justify-center gap-2 py-2 px-2 rounded-lg text-xs sm:text-sm font-medium text-gray-600 hover:bg-gray-100/70 hover:text-gray-900 active:bg-gray-200/60 transition-colors cursor-pointer select-none active:scale-95"
          aria-label="Share post"
        >
          <Forward className="w-4 h-4 sm:w-4.5 sm:h-4.5 text-gray-500" />
          <span>Share</span>
        </button>
      </div>

      {/* 6. Expandable Comments Section */}
      {showComments && (
        <div className="px-4 pb-4 pt-1 border-t border-[#DADDE1]/70 animate-in fade-in duration-200">
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
