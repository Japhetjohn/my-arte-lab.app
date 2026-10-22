import { useState, useRef, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import {
  Heart,
  MessageCircle,
  Share2,
  ExternalLink,
  CheckCircle2,
  MoreHorizontal,
  Calendar,
} from 'lucide-react';
import { toast } from '@/components/ui/sonner';
import { socialService } from '@/lib/api';
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

export function SocialFeedCard({ post, className }: SocialFeedCardProps) {
  const { user } = useAuth();
  const serviceId = post.serviceId || post._id;

  const [isLiked, setIsLiked] = useState(post.isLiked);
  const [likesCount, setLikesCount] = useState(post.likesCount || 0);
  const [isLiking, setIsLiking] = useState(false);
  const [showComments, setShowComments] = useState(false);
  const [commentsCount, setCommentsCount] = useState(post.commentsCount || 0);

  // Authoritative Viewport Impression Tracking (Part 7.4)
  // Requires post to be visible in viewport for at least 1s, deduplicated per card instance
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
    if (navigator.clipboard) {
      await navigator.clipboard.writeText(postUrl);
      toast.success('Creator link copied to clipboard');
    }
  };

  const formatTimestamp = (dateInput?: string | Date) => {
    if (!dateInput) return 'Recently';
    const date = new Date(dateInput);
    const now = new Date();
    const diffSec = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (diffSec < 60) return 'Just now';
    if (diffSec < 3600) return `${Math.floor(diffSec / 60)}m ago`;
    if (diffSec < 86400) return `${Math.floor(diffSec / 3600)}h ago`;
    if (diffSec < 604800) return `${Math.floor(diffSec / 86400)}d ago`;
    return date.toLocaleDateString();
  };

  const images = post.images || [];

  return (
    <article
      ref={cardRef}
      className={cn(
        'bg-white rounded-2xl border border-gray-200/80 overflow-hidden shadow-xs hover:shadow-sm transition-shadow',
        className
      )}
    >
      {/* Post Author Header */}
      <div className="p-4 sm:p-5 flex items-center justify-between">
        <a
          href={`/creators/${post.creator._id}`}
          className="flex items-center gap-3 group cursor-pointer"
        >
          <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-full overflow-hidden bg-purple-100 flex items-center justify-center shrink-0 border border-purple-200 group-hover:ring-2 group-hover:ring-[#9747FF]/40 transition-all">
            {post.creator.avatar ? (
              <img
                src={post.creator.avatar}
                alt={post.creator.name}
                className="w-full h-full object-cover"
              />
            ) : (
              <span className="text-[#9747FF] font-bold text-sm">
                {(post.creator.name || 'C')[0].toUpperCase()}
              </span>
            )}
          </div>

          <div className="flex flex-col">
            <div className="flex items-center gap-1.5">
              <span className="font-bold text-sm sm:text-base text-gray-900 group-hover:text-[#9747FF] transition-colors leading-tight">
                {post.creator.name}
              </span>
              {post.creator.isVerified && (
                <CheckCircle2 className="w-4 h-4 text-[#9747FF] fill-purple-100 shrink-0" />
              )}
            </div>
            <div className="flex items-center gap-2 text-xs text-gray-600">
              {post.creator.username && <span>@{post.creator.username}</span>}
              <span>•</span>
              <span>{formatTimestamp(post.createdAt)}</span>
            </div>
          </div>
        </a>

        {/* Action: Book Service / More */}
        <div className="flex items-center gap-2">
          <a
            href={`/creators/${post.creator._id}`}
            className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-purple-50 text-[#9747FF] hover:bg-[#9747FF] hover:text-white transition-all shadow-xs"
          >
            <Calendar className="w-3.5 h-3.5" />
            <span>Book</span>
          </a>

          <button
            type="button"
            className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
            title="Options"
          >
            <MoreHorizontal className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Post Text Description */}
      <div className="px-4 sm:px-5 pb-3">
        {post.title && post.title !== post.description && (
          <h3 className="font-bold text-sm sm:text-base text-gray-900 mb-1.5">
            {post.title}
          </h3>
        )}
        <p className="text-sm sm:text-[15px] text-gray-800 leading-relaxed whitespace-pre-line">
          {post.description}
        </p>

        {/* Direct link if present */}
        {post.directLink && (
          <a
            href={post.directLink}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-2.5 inline-flex items-center gap-1.5 text-xs font-medium text-[#9747FF] hover:underline"
          >
            <ExternalLink className="w-3.5 h-3.5" />
            <span className="truncate max-w-xs">{post.directLink}</span>
          </a>
        )}
      </div>

      {/* Post Artwork / Image Gallery */}
      {images.length > 0 && (
        <div className="mt-1 bg-gray-950/5">
          {images.length === 1 ? (
            <div className="max-h-[540px] overflow-hidden flex items-center justify-center bg-gray-900/5">
              <img
                src={images[0]}
                alt={post.title || 'Artwork'}
                className="w-full object-cover max-h-[540px]"
                loading="lazy"
              />
            </div>
          ) : images.length === 2 ? (
            <div className="grid grid-cols-2 gap-1 max-h-[440px] overflow-hidden">
              {images.map((imgUrl, i) => (
                <div key={i} className="aspect-square overflow-hidden bg-gray-100">
                  <img
                    src={imgUrl}
                    alt={`Artwork ${i + 1}`}
                    className="w-full h-full object-cover hover:scale-105 transition-transform duration-300"
                    loading="lazy"
                  />
                </div>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-1 max-h-[460px] overflow-hidden">
              {images.slice(0, 5).map((imgUrl, i) => (
                <div
                  key={i}
                  className={cn(
                    'overflow-hidden bg-gray-100 relative aspect-square',
                    i === 0 && images.length === 3 ? 'col-span-2 row-span-2 aspect-auto max-h-[300px]' : ''
                  )}
                >
                  <img
                    src={imgUrl}
                    alt={`Artwork ${i + 1}`}
                    className="w-full h-full object-cover hover:scale-105 transition-transform duration-300"
                    loading="lazy"
                  />
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Engagement Actions Row */}
      <div className="px-4 sm:px-5 py-3 flex items-center justify-between border-t border-gray-100 mt-2">
        <div className="flex items-center gap-6">
          {/* Like Button */}
          <button
            type="button"
            onClick={handleToggleLike}
            disabled={isLiking}
            className={cn(
              'inline-flex items-center gap-2 text-xs sm:text-sm font-semibold transition-all cursor-pointer group',
              isLiked ? 'text-[#9747FF]' : 'text-gray-500 hover:text-[#9747FF]'
            )}
            title={isLiked ? 'Unlike' : 'Like'}
          >
            <div
              className={cn(
                'p-1.5 rounded-full transition-transform duration-200',
                isLiked
                  ? 'bg-purple-100 scale-110 text-[#9747FF]'
                  : 'group-hover:bg-purple-50 group-hover:scale-105'
              )}
            >
              <Heart
                className={cn(
                  'w-4 h-4 sm:w-5 sm:h-5 transition-colors',
                  isLiked ? 'fill-[#9747FF] text-[#9747FF]' : 'text-current'
                )}
              />
            </div>
            <span>{likesCount}</span>
          </button>

          {/* Comment Button */}
          <button
            type="button"
            onClick={() => setShowComments((prev) => !prev)}
            className={cn(
              'inline-flex items-center gap-2 text-xs sm:text-sm font-semibold transition-colors cursor-pointer group',
              showComments ? 'text-[#9747FF]' : 'text-gray-500 hover:text-gray-900'
            )}
            title="Comments"
          >
            <div className="p-1.5 rounded-full group-hover:bg-gray-100 transition-colors">
              <MessageCircle className="w-4 h-4 sm:w-5 sm:h-5 text-current" />
            </div>
            <span>{commentsCount}</span>
          </button>

          {/* Share Button */}
          <button
            type="button"
            onClick={handleShare}
            className="inline-flex items-center gap-1.5 text-xs sm:text-sm font-medium text-gray-500 hover:text-gray-900 transition-colors cursor-pointer"
            title="Share"
          >
            <div className="p-1.5 rounded-full hover:bg-gray-100 transition-colors">
              <Share2 className="w-4 h-4 sm:w-5 sm:h-5 text-current" />
            </div>
          </button>
        </div>

        {/* Mobile quick book shortcut */}
        <div className="sm:hidden">
          <a
            href={`/creators/${post.creator._id}`}
            className="text-xs font-semibold text-[#9747FF] hover:underline"
          >
            Book creator
          </a>
        </div>
      </div>

      {/* Accordion / Expandable Comments Section - Matches Reference Image 2 */}
      {showComments && (
        <div className="px-4 sm:px-5 pb-5">
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
