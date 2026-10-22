import { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import {
  Sparkles,
  Compass,
  Users,
  Calendar,
  Wallet,
  Loader2,
  RefreshCw,
  Plus,
  ArrowUp,
  Image as ImageIcon,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { PostComposer } from '@/components/social/PostComposer';
import { SocialFeedCard, type FeedPost } from '@/components/social/SocialFeedCard';
import { VerifiedBadge } from '@/components/shared/VerifiedBadge';
import {
  Drawer,
  DrawerContent,
  DrawerTitle,
  DrawerDescription,
} from '@/components/ui/drawer';
import { socialService, creatorService } from '@/lib/api';
import { getAvatarUrl } from '@/lib/imageUrl';
import { cn } from '@/lib/utils';
import type { Creator } from '@/types';

export function Home() {
  const { user } = useAuth();
  const activeTab = 'for-you';
  const [posts, setPosts] = useState<FeedPost[]>([]);
  const [suggestedCreators, setSuggestedCreators] = useState<Creator[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  
  // Mobile Floating Post Creation Drawer State
  const [isMobileComposerOpen, setIsMobileComposerOpen] = useState(false);
  const [composerAutoOpenImage, setComposerAutoOpenImage] = useState(false);

  const handleOpenMobileComposer = (openImagePicker = false) => {
    setComposerAutoOpenImage(openImagePicker);
    setIsMobileComposerOpen(true);
  };

  // New Posts Detection (Part 6)
  const [newPostsCount, setNewPostsCount] = useState(0);
  const [pendingNewPosts, setPendingNewPosts] = useState<FeedPost[]>([]);
  const latestPostDateRef = useRef<string | null>(null);

  // Fetch feed posts with deduplication
  const loadFeed = useCallback(
    async (resetPage = false) => {
      try {
        if (resetPage) {
          setIsLoading(true);
        }

        const currentPage = resetPage ? 1 : page;
        const res = await socialService.getFeed({
          tab: activeTab,
          page: currentPage,
          limit: 15,
        });

        const fetchedPosts: FeedPost[] = res.data?.data?.posts || [];
        const pagination = res.data?.data?.pagination;

        if (resetPage) {
          setPosts(fetchedPosts);
          setPage(2);
          setNewPostsCount(0);
          setPendingNewPosts([]);
          if (fetchedPosts.length > 0) {
            latestPostDateRef.current = new Date(fetchedPosts[0].createdAt).toISOString();
          }
        } else {
          // Deduplicate by stable ID
          setPosts((prev) => {
            const existingIds = new Set(prev.map((p) => p._id));
            const freshAdditions = fetchedPosts.filter((p) => !existingIds.has(p._id));
            return [...prev, ...freshAdditions];
          });
          setPage((prev) => prev + 1);
        }

        if (pagination) {
          setHasMore(currentPage < pagination.pages);
        } else {
          setHasMore(fetchedPosts.length === 15);
        }
      } catch (err) {
        console.error('Error fetching social feed:', err);
      } finally {
        setIsLoading(false);
        setIsRefreshing(false);
        setIsLoadingMore(false);
      }
    },
    [activeTab, page]
  );

  // Background check for newly published posts (Part 6.3)
  useEffect(() => {
    if (!latestPostDateRef.current) return;

    const interval = setInterval(async () => {
      try {
        if (!latestPostDateRef.current) return;
        const res = await socialService.checkNewPosts(latestPostDateRef.current);
        const count = res.data?.data?.newPostsCount || 0;
        const incoming = res.data?.data?.newPosts || [];
        if (count > 0) {
          setNewPostsCount(count);
          setPendingNewPosts(incoming);
        }
      } catch (err) {
        // Silent background check
      }
    }, 45000); // Check every 45s

    return () => clearInterval(interval);
  }, []);

  // Insert new posts smoothly when user clicks the banner
  const handleLoadNewPosts = () => {
    if (pendingNewPosts.length > 0) {
      setPosts((prev) => {
        const existingIds = new Set(prev.map((p) => p._id));
        const additions = pendingNewPosts.filter((p) => !existingIds.has(p._id));
        return [...additions, ...prev];
      });
      if (pendingNewPosts[0]?.createdAt) {
        latestPostDateRef.current = new Date(pendingNewPosts[0].createdAt).toISOString();
      }
    } else {
      loadFeed(true);
    }
    setNewPostsCount(0);
    setPendingNewPosts([]);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Fetch suggested creators for right sidebar
  useEffect(() => {
    const fetchSuggested = async () => {
      try {
        const res = await creatorService.getCreators({ limit: 5 });
        const list = res.data?.data?.results || res.data?.data || [];
        setSuggestedCreators(list.slice(0, 5));
      } catch (err) {
        console.error('Error fetching suggested creators:', err);
      }
    };
    fetchSuggested();
  }, []);

  // Initial load
  useEffect(() => {
    loadFeed(true);
  }, []);

  const handleRefresh = useCallback(() => {
    if (isRefreshing) return;
    setIsRefreshing(true);
    loadFeed(true);
  }, [isRefreshing, loadFeed]);

  // Pull-to-refresh & Natural Overscroll Refresh Logic
  const [pullDistance, setPullDistance] = useState(0);
  const touchStartYRef = useRef(0);
  const isPullingRef = useRef(false);
  const wheelDeltaAccumulatorRef = useRef(0);
  const wheelResetTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    // Mobile Touch Pull-to-Refresh
    const handleTouchStart = (e: TouchEvent) => {
      if (window.scrollY <= 2 && e.touches.length === 1) {
        touchStartYRef.current = e.touches[0].clientY;
        isPullingRef.current = true;
      } else {
        isPullingRef.current = false;
      }
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (!isPullingRef.current || isRefreshing || e.touches.length !== 1) return;

      const currentY = e.touches[0].clientY;
      const diffY = currentY - touchStartYRef.current;

      if (diffY > 0 && window.scrollY <= 2) {
        const distance = Math.min(80, diffY * 0.45);
        setPullDistance(distance);
      } else {
        setPullDistance(0);
      }
    };

    const handleTouchEnd = () => {
      if (!isPullingRef.current) return;
      isPullingRef.current = false;

      setPullDistance((prev) => {
        if (prev >= 50 && !isRefreshing) {
          handleRefresh();
        }
        return 0;
      });
    };

    // Desktop Natural Overscroll Refresh on upward wheel at top of page
    const handleWheel = (e: WheelEvent) => {
      if (window.scrollY > 2 || isRefreshing) {
        wheelDeltaAccumulatorRef.current = 0;
        return;
      }

      if (e.deltaY < -15) {
        wheelDeltaAccumulatorRef.current += Math.abs(e.deltaY);

        if (wheelResetTimeoutRef.current) {
          clearTimeout(wheelResetTimeoutRef.current);
        }

        wheelResetTimeoutRef.current = setTimeout(() => {
          wheelDeltaAccumulatorRef.current = 0;
        }, 400);

        if (wheelDeltaAccumulatorRef.current > 75) {
          wheelDeltaAccumulatorRef.current = 0;
          handleRefresh();
        }
      }
    };

    window.addEventListener('touchstart', handleTouchStart, { passive: true });
    window.addEventListener('touchmove', handleTouchMove, { passive: true });
    window.addEventListener('touchend', handleTouchEnd, { passive: true });
    window.addEventListener('wheel', handleWheel, { passive: true });

    return () => {
      window.removeEventListener('touchstart', handleTouchStart);
      window.removeEventListener('touchmove', handleTouchMove);
      window.removeEventListener('touchend', handleTouchEnd);
      window.removeEventListener('wheel', handleWheel);
      if (wheelResetTimeoutRef.current) {
        clearTimeout(wheelResetTimeoutRef.current);
      }
    };
  }, [handleRefresh, isRefreshing]);

  const handleLoadMore = () => {
    if (!isLoadingMore && hasMore) {
      setIsLoadingMore(true);
      loadFeed(false);
    }
  };

  const handlePostCreated = (newPost: FeedPost) => {
    setPosts((prev) => [newPost, ...prev]);
    setIsMobileComposerOpen(false);
    latestPostDateRef.current = new Date().toISOString();
  };

  return (
    <div className="w-full relative">
      {/* 3-Column Social Media Feed Layout (Continuous Borderless Social Design) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* =========================================================================
            LEFT COLUMN (lg:col-span-3, hidden on mobile/tablet)
            Creator profile summary, quick navigation, and platform shortcuts
           ========================================================================= */}
        <aside className="hidden lg:flex flex-col gap-6 lg:col-span-3 sticky top-20">
          {/* User Profile Section */}
          <div className="pb-5 border-b border-[#DADDE1] dark:border-[#2f3032]">
            {user ? (
              <div className="flex flex-col items-center text-center">
                <div className="w-16 h-16 rounded-full overflow-hidden bg-purple-100 dark:bg-purple-950/40 flex items-center justify-center border-2 border-[#9747FF]/20 mb-3">
                  {user.avatar ? (
                    <img src={getAvatarUrl(user.avatar)} alt={user.name} className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-[#9747FF] font-bold text-xl">
                      {(user.name || user.firstName || 'C')[0].toUpperCase()}
                    </span>
                  )}
                </div>
                <h3 className="font-bold text-gray-900 dark:text-gray-100 text-base leading-tight">
                  {user.name || `${user.firstName || ''} ${user.lastName || ''}`.trim() || 'Creator'}
                </h3>
                <p className="text-xs text-gray-600 dark:text-gray-400 mt-0.5">
                  @{user.email.split('@')[0]}
                </p>
                <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-purple-50 dark:bg-purple-950/50 text-[#9747FF] text-xs font-semibold mt-2.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#9747FF]"></span>
                  {user.role === 'creator' ? 'Verified Creator' : 'Creative Member'}
                </div>
              </div>
            ) : (
              <div className="text-center py-2">
                <div className="w-12 h-12 rounded-full bg-purple-100 dark:bg-purple-950/40 text-[#9747FF] flex items-center justify-center mx-auto mb-3">
                  <Sparkles className="w-6 h-6" />
                </div>
                <h3 className="font-bold text-gray-900 dark:text-gray-100 text-base">Join the Creative Space</h3>
                <p className="text-xs text-gray-600 dark:text-gray-400 mt-1 mb-4 leading-relaxed">
                  Publish artwork, connect with top African creators, and book services.
                </p>
                <Button
                  type="button"
                  onClick={() => (window.location.href = '/login')}
                  className="w-full bg-[#9747FF] hover:bg-[#8534f0] text-white font-semibold rounded-xl text-xs py-2 shadow-xs"
                >
                  Log In / Sign Up
                </Button>
              </div>
            )}
          </div>

          {/* Quick Navigation Menu */}
          <div className="pb-2">
            <nav className="space-y-1">
              <a
                href="/home"
                className="flex items-center gap-3 px-3 py-2.5 rounded-xl font-semibold text-sm bg-purple-50 dark:bg-purple-950/50 text-[#9747FF] transition-colors"
              >
                <Sparkles className="w-4 h-4 text-[#9747FF]" />
                <span>Creative Feed</span>
              </a>

              <a
                href="/discover"
                className="flex items-center gap-3 px-3 py-2.5 rounded-xl font-medium text-sm text-gray-700 dark:text-gray-300 hover:text-[#9747FF] dark:hover:text-[#9747FF] hover:bg-gray-100/70 dark:hover:bg-white/[0.04] transition-colors"
              >
                <Compass className="w-4 h-4 text-gray-500 dark:text-gray-400" />
                <span>Discover Creators</span>
              </a>

              <a
                href="/creators"
                className="flex items-center gap-3 px-3 py-2.5 rounded-xl font-medium text-sm text-gray-700 dark:text-gray-300 hover:text-[#9747FF] dark:hover:text-[#9747FF] hover:bg-gray-100/70 dark:hover:bg-white/[0.04] transition-colors"
              >
                <Users className="w-4 h-4 text-gray-500 dark:text-gray-400" />
                <span>Browse All</span>
              </a>

              {user && (
                <>
                  <a
                    href="/bookings"
                    className="flex items-center gap-3 px-3 py-2.5 rounded-xl font-medium text-sm text-gray-700 dark:text-gray-300 hover:text-[#9747FF] dark:hover:text-[#9747FF] hover:bg-gray-100/70 dark:hover:bg-white/[0.04] transition-colors"
                  >
                    <Calendar className="w-4 h-4 text-gray-500 dark:text-gray-400" />
                    <span>My Bookings</span>
                  </a>

                  <a
                    href="/wallet"
                    className="flex items-center gap-3 px-3 py-2.5 rounded-xl font-medium text-sm text-gray-700 dark:text-gray-300 hover:text-[#9747FF] dark:hover:text-[#9747FF] hover:bg-gray-100/70 dark:hover:bg-white/[0.04] transition-colors"
                  >
                    <Wallet className="w-4 h-4 text-gray-500 dark:text-gray-400" />
                    <span>Wallet &amp; Earnings</span>
                  </a>
                </>
              )}
            </nav>
          </div>
        </aside>

        {/* =========================================================================
            CENTER COLUMN (lg:col-span-6, full width on mobile)
            Post Composer and Continuous Social Feed Stream (Border-to-border continuous)
           ========================================================================= */}
        <section className="col-span-1 lg:col-span-6 flex flex-col gap-0">
          {/* Subtle Pull-to-Refresh & Natural Refresh Indicator */}
          {pullDistance > 0 && !isRefreshing && (
            <div
              className="flex items-center justify-center overflow-hidden transition-all duration-75"
              style={{ height: `${pullDistance}px`, opacity: Math.min(1, pullDistance / 40) }}
            >
              <div className="flex items-center gap-2 py-1 px-3.5 bg-white/95 dark:bg-[#1a1b1c]/95 backdrop-blur rounded-full shadow-2xs border border-gray-200/80 dark:border-gray-700 text-xs text-gray-600 dark:text-gray-300 font-medium">
                <RefreshCw
                  className={cn(
                    'w-3.5 h-3.5 text-[#9747FF] transition-transform duration-100',
                    pullDistance >= 50 && 'rotate-180'
                  )}
                  style={{ transform: `rotate(${pullDistance * 3.6}deg)` }}
                />
                <span>{pullDistance >= 50 ? 'Release to refresh' : 'Pull down to refresh'}</span>
              </div>
            </div>
          )}

          {isRefreshing && (
            <div className="flex items-center justify-center py-1 animate-in fade-in slide-in-from-top-1 duration-200">
              <div className="flex items-center gap-2 py-1 px-4 bg-purple-50 dark:bg-purple-950/50 text-[#9747FF] rounded-full border border-purple-200/60 dark:border-purple-800/40 shadow-2xs text-xs font-semibold">
                <Loader2 className="w-3.5 h-3.5 animate-spin text-[#9747FF]" />
                <span>Refreshing creative feed...</span>
              </div>
            </div>
          )}

          {/* New Posts Notification Banner (Non-disruptive) */}
          {newPostsCount > 0 && (
            <div className="flex justify-center sticky top-20 lg:top-4 z-20 animate-in fade-in slide-in-from-top-2 py-2">
              <button
                type="button"
                onClick={handleLoadNewPosts}
                className="px-4 py-2 bg-[#9747FF] text-white text-xs font-semibold rounded-full shadow-lg shadow-purple-500/25 flex items-center gap-2 hover:bg-[#8534f0] transition-transform active:scale-95 cursor-pointer"
              >
                <ArrowUp className="w-3.5 h-3.5" />
                <span>{newPostsCount} new {newPostsCount === 1 ? 'post' : 'posts'} available</span>
              </button>
            </div>
          )}

          {/* MOBILE FACEBOOK-INSPIRED POST COMPOSER (sm:hidden) */}
          <div className="sm:hidden -mx-3 sm:mx-0 bg-white dark:bg-[#18191a] border-t border-b border-[#DADDE1] dark:border-[#2f3032] px-4 py-3 flex items-center gap-3">
            {/* Left: Creator Avatar */}
            <div className="w-10 h-10 rounded-full overflow-hidden bg-purple-50 dark:bg-purple-950/40 border border-gray-200 dark:border-gray-700 flex items-center justify-center shrink-0">
              {user?.avatar ? (
                <img
                  src={getAvatarUrl(user.avatar)}
                  alt={user.name || 'Creator'}
                  className="w-full h-full object-cover"
                />
              ) : (
                <span className="text-sm font-bold text-[#9747FF]">
                  {(user?.name || user?.firstName || 'C')[0].toUpperCase()}
                </span>
              )}
            </div>

            {/* Center: Rounded Pill Input Trigger */}
            <button
              type="button"
              onClick={() => handleOpenMobileComposer(false)}
              className="flex-1 min-w-0 bg-gray-100/90 dark:bg-gray-800 hover:bg-gray-200/70 dark:hover:bg-gray-700 active:bg-gray-200 text-left px-4 py-2.5 rounded-full text-xs sm:text-sm text-gray-500 dark:text-gray-400 transition-colors cursor-pointer select-none truncate focus:outline-none focus:ring-1 focus:ring-[#9747FF]"
              aria-label="Share your latest work"
            >
              Share your latest work...
            </button>

            {/* Right: Artwork Attachment Shortcut */}
            <button
              type="button"
              onClick={() => handleOpenMobileComposer(true)}
              className="flex flex-col items-center justify-center gap-0.5 px-1.5 py-0.5 text-gray-700 dark:text-gray-300 hover:text-[#9747FF] transition-colors cursor-pointer shrink-0 outline-none focus:outline-none group"
              aria-label="Attach artwork"
              title="Artwork"
            >
              <ImageIcon className="w-5 h-5 text-emerald-500 group-hover:scale-105 transition-transform" />
              <span className="text-[11px] font-medium text-gray-600 dark:text-gray-400 group-hover:text-[#9747FF] leading-none">
                Artwork
              </span>
            </button>
          </div>

          {/* Desktop Post Composer (Border-bottom divider connects directly to feed) */}
          <div className="hidden sm:block">
            <PostComposer onPostCreated={handlePostCreated} />
          </div>

          {/* Social Feed Post Stream — Clean Continuous Stream (No Rectangular Cards) */}
          {isLoading ? (
            <div className="bg-white dark:bg-[#18191a] border-b border-[#DADDE1] dark:border-[#2f3032] p-12 flex flex-col items-center justify-center gap-3">
              <Loader2 className="w-6 h-6 animate-spin text-[#9747FF]" />
              <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Loading creative artwork feed...</p>
            </div>
          ) : posts.length === 0 ? (
            <div className="bg-white dark:bg-[#18191a] border-b border-[#DADDE1] dark:border-[#2f3032] p-12 text-center flex flex-col items-center">
              <div className="w-14 h-14 rounded-full bg-purple-50 dark:bg-purple-950/40 text-[#9747FF] flex items-center justify-center mb-3">
                <Sparkles className="w-7 h-7" />
              </div>
              <h3 className="font-bold text-gray-900 dark:text-gray-100 text-base mb-1">No artwork yet</h3>
              <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 max-w-sm mb-4">
                Be the first creator to share your work with the MyArteLab community!
              </p>
              <Button
                type="button"
                onClick={() => (window.location.href = '/discover')}
                className="bg-[#9747FF] hover:bg-[#8534f0] text-white rounded-xl text-xs font-semibold px-4 py-2"
              >
                Discover Creators
              </Button>
            </div>
          ) : (
            <div className="flex flex-col gap-0 -mx-3 sm:mx-0 bg-white dark:bg-[#18191a]">
              {posts.map((post) => (
                <SocialFeedCard key={post._id} post={post} />
              ))}

              {/* Load More Pagination */}
              {hasMore && (
                <div className="pt-4 pb-8 flex justify-center bg-white dark:bg-[#18191a] border-b border-[#DADDE1] dark:border-[#2f3032]">
                  <Button
                    type="button"
                    onClick={handleLoadMore}
                    disabled={isLoadingMore}
                    variant="outline"
                    className="border-gray-200 dark:border-gray-700 hover:border-[#9747FF] text-gray-700 dark:text-gray-300 hover:text-[#9747FF] rounded-xl px-6 py-2 text-xs font-semibold shadow-xs"
                  >
                    {isLoadingMore ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin mr-2 text-[#9747FF]" />
                        <span>Loading more...</span>
                      </>
                    ) : (
                      <span>Load More Artwork</span>
                    )}
                  </Button>
                </div>
              )}
            </div>
          )}
        </section>

        {/* =========================================================================
            RIGHT COLUMN (lg:col-span-3, hidden on mobile/tablet)
            Top Creators
           ========================================================================= */}
        <aside className="hidden lg:flex flex-col gap-6 lg:col-span-3 sticky top-20">
          {/* Top Creators */}
          <div className="pb-4">
            <div className="flex items-center justify-between pb-2.5 border-b border-[#DADDE1] dark:border-[#2f3032] mb-3.5">
              <h4 className="font-bold text-sm text-gray-900 dark:text-gray-100 tracking-tight">Top Creators</h4>
              <a href="/discover" className="text-xs font-semibold text-[#9747FF] hover:underline">
                View all
              </a>
            </div>

            <div className="space-y-3.5">
              {suggestedCreators.map((creator) => (
                <div key={creator.id} className="flex items-center justify-between gap-2.5">
                  <a
                    href={`/creators/${creator.id}`}
                    className="flex items-center gap-2.5 min-w-0 group cursor-pointer"
                  >
                    <div className="w-9 h-9 rounded-full overflow-hidden bg-purple-100 dark:bg-purple-950/40 flex items-center justify-center shrink-0 border border-purple-200 dark:border-purple-800/40">
                      {creator.avatar ? (
                        <img src={getAvatarUrl(creator.avatar)} alt={creator.name || 'Creator'} className="w-full h-full object-cover" />
                      ) : (
                        <span className="text-[#9747FF] font-bold text-xs">
                          {(creator.name || 'C')[0]?.toUpperCase() || 'C'}
                        </span>
                      )}
                    </div>
                    <div className="min-w-0 flex flex-col">
                      <div className="flex items-center gap-1">
                        <span className="font-bold text-xs text-gray-900 dark:text-gray-100 group-hover:text-[#9747FF] truncate">
                          {creator.name || 'Creator'}
                        </span>
                        {creator.isVerified && (
                          <VerifiedBadge className="w-3.5 h-3.5 shrink-0 inline-block align-middle" showTooltip={false} />
                        )}
                      </div>
                      <span className="text-[11px] text-gray-600 dark:text-gray-400 truncate">
                        {Array.isArray(creator.category) ? creator.category[0] : creator.category || 'Creator'}
                      </span>
                    </div>
                  </a>

                  <a
                    href={`/creators/${creator.id}`}
                    className="shrink-0 text-xs font-semibold px-2.5 py-1 rounded-full bg-purple-50 dark:bg-purple-950/50 text-[#9747FF] hover:bg-[#9747FF] hover:text-white transition-all"
                  >
                    Book
                  </a>
                </div>
              ))}
            </div>
          </div>
        </aside>
      </div>

      {/* =========================================================================
          MOBILE FLOATING PLUS BUTTON (Part 4)
          Positioned near the bottom above the bottom navigation bar.
          Taps open the mobile post composer bottom drawer.
         ========================================================================= */}
      <div className="sm:hidden fixed bottom-20 right-5 z-40">
        <button
          type="button"
          onClick={() => handleOpenMobileComposer(false)}
          className="w-13 h-13 rounded-full bg-[#9747FF] hover:bg-[#8534f0] text-white flex items-center justify-center shadow-lg shadow-purple-600/35 transition-transform active:scale-90 cursor-pointer focus:outline-none"
          aria-label="Create new creative post"
        >
          <Plus className="w-6 h-6 stroke-[2.5]" />
        </button>
      </div>

      {/* Mobile Post Creation Drawer (Wallet drawer animation pattern) */}
      <Drawer
        open={isMobileComposerOpen}
        onOpenChange={(open) => {
          setIsMobileComposerOpen(open);
          if (!open) {
            setComposerAutoOpenImage(false);
          }
        }}
      >
        <DrawerContent className="bg-white dark:bg-[#1a1b1c] rounded-t-3xl max-h-[92dvh] flex flex-col p-4 pb-8 border-none shadow-2xl focus:outline-none z-[150]">
          <DrawerTitle className="sr-only">Create New Post</DrawerTitle>
          <DrawerDescription className="sr-only">
            Publish artwork and updates to the creative feed
          </DrawerDescription>
          <div className="flex-1 overflow-y-auto pt-2">
            <PostComposer 
              onPostCreated={handlePostCreated} 
              autoOpenImageUploader={composerAutoOpenImage}
            />
          </div>
        </DrawerContent>
      </Drawer>
    </div>
  );
}
