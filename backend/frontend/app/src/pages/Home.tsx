import { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import {
  Sparkles,
  TrendingUp,
  Compass,
  Users,
  Calendar,
  Wallet,
  CheckCircle2,
  Loader2,
  RefreshCw,
  ArrowRight,
  Plus,
  ArrowUp,
  Clock,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { PostComposer } from '@/components/social/PostComposer';
import { SocialFeedCard, type FeedPost } from '@/components/social/SocialFeedCard';
import {
  Drawer,
  DrawerContent,
  DrawerTitle,
  DrawerDescription,
} from '@/components/ui/drawer';
import { socialService, creatorService } from '@/lib/api';
import { cn } from '@/lib/utils';
import type { Creator } from '@/types';

const CATEGORIES = [
  'All',
  'Digital Art',
  'Photography',
  'Graphic Design',
  'Music & Audio',
  'Writing',
  'Fashion & Styling',
  'Video & Animation',
];

export function Home() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'for-you' | 'trending' | 'latest'>('for-you');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [posts, setPosts] = useState<FeedPost[]>([]);
  const [suggestedCreators, setSuggestedCreators] = useState<Creator[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  
  // Mobile Floating Post Creation Drawer State
  const [isMobileComposerOpen, setIsMobileComposerOpen] = useState(false);

  // New Posts Detection (Part 6)
  const [newPostsCount, setNewPostsCount] = useState(0);
  const [pendingNewPosts, setPendingNewPosts] = useState<FeedPost[]>([]);
  const latestPostDateRef = useRef<string | null>(null);

  // Fetch feed posts with deduplication
  const loadFeed = useCallback(
    async (resetPage = false, currentCategory = selectedCategory, currentTab = activeTab) => {
      try {
        if (resetPage) {
          setIsLoading(true);
        }

        const currentPage = resetPage ? 1 : page;
        const res = await socialService.getFeed({
          tab: currentTab,
          category: currentCategory !== 'All' ? currentCategory : undefined,
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
    [activeTab, selectedCategory, page]
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
  }, [activeTab, selectedCategory]);

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
      loadFeed(true, selectedCategory, activeTab);
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

  // Reload on tab or category change
  useEffect(() => {
    loadFeed(true, selectedCategory, activeTab);
  }, [activeTab, selectedCategory]);

  const handleRefresh = () => {
    if (isRefreshing) return;
    setIsRefreshing(true);
    loadFeed(true, selectedCategory, activeTab);
  };

  const handleLoadMore = () => {
    if (!isLoadingMore && hasMore) {
      setIsLoadingMore(true);
      loadFeed(false, selectedCategory, activeTab);
    }
  };

  const handlePostCreated = (newPost: FeedPost) => {
    setPosts((prev) => [newPost, ...prev]);
    setIsMobileComposerOpen(false);
    latestPostDateRef.current = new Date().toISOString();
  };

  return (
    <div className="w-full relative">
      {/* 3-Column Social Media Feed Layout (Desktop Momspace style / Responsive Mobile) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* =========================================================================
            LEFT COLUMN (lg:col-span-3, hidden on mobile/tablet)
            Creator profile summary, quick navigation, and platform shortcuts
           ========================================================================= */}
        <aside className="hidden lg:flex flex-col gap-5 lg:col-span-3 sticky top-20">
          {/* User Profile Card */}
          <div className="bg-white rounded-2xl border border-gray-200/80 p-5 shadow-xs">
            {user ? (
              <div className="flex flex-col items-center text-center">
                <div className="w-16 h-16 rounded-full overflow-hidden bg-purple-100 flex items-center justify-center border-2 border-[#9747FF]/20 shadow-xs mb-3">
                  {user.avatar ? (
                    <img src={user.avatar} alt={user.name} className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-[#9747FF] font-bold text-xl">
                      {(user.name || user.firstName || 'C')[0].toUpperCase()}
                    </span>
                  )}
                </div>
                <h3 className="font-bold text-gray-900 text-base leading-tight">
                  {user.name || `${user.firstName || ''} ${user.lastName || ''}`.trim() || 'Creator'}
                </h3>
                <p className="text-xs text-gray-600 mt-0.5">
                  @{user.email.split('@')[0]}
                </p>
                <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-purple-50 text-[#9747FF] text-xs font-semibold mt-2.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#9747FF]"></span>
                  {user.role === 'creator' ? 'Verified Creator' : 'Creative Member'}
                </div>
              </div>
            ) : (
              <div className="text-center py-2">
                <div className="w-12 h-12 rounded-full bg-purple-100 text-[#9747FF] flex items-center justify-center mx-auto mb-3">
                  <Sparkles className="w-6 h-6" />
                </div>
                <h3 className="font-bold text-gray-900 text-base">Join the Creative Space</h3>
                <p className="text-xs text-gray-600 mt-1 mb-4 leading-relaxed">
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
          <div className="bg-white rounded-2xl border border-gray-200/80 p-3 shadow-xs">
            <nav className="space-y-1">
              <a
                href="/home"
                className="flex items-center gap-3 px-3.5 py-2.5 rounded-xl font-semibold text-sm bg-purple-50 text-[#9747FF] transition-colors"
              >
                <Sparkles className="w-4 h-4 text-[#9747FF]" />
                <span>Creative Feed</span>
              </a>

              <a
                href="/discover"
                className="flex items-center gap-3 px-3.5 py-2.5 rounded-xl font-medium text-sm text-gray-700 hover:text-[#9747FF] hover:bg-gray-50 transition-colors"
              >
                <Compass className="w-4 h-4 text-gray-500" />
                <span>Discover Creators</span>
              </a>

              <a
                href="/creators"
                className="flex items-center gap-3 px-3.5 py-2.5 rounded-xl font-medium text-sm text-gray-700 hover:text-[#9747FF] hover:bg-gray-50 transition-colors"
              >
                <Users className="w-4 h-4 text-gray-500" />
                <span>Browse All</span>
              </a>

              {user && (
                <>
                  <a
                    href="/bookings"
                    className="flex items-center gap-3 px-3.5 py-2.5 rounded-xl font-medium text-sm text-gray-700 hover:text-[#9747FF] hover:bg-gray-50 transition-colors"
                  >
                    <Calendar className="w-4 h-4 text-gray-500" />
                    <span>My Bookings</span>
                  </a>

                  <a
                    href="/wallet"
                    className="flex items-center gap-3 px-3.5 py-2.5 rounded-xl font-medium text-sm text-gray-700 hover:text-[#9747FF] hover:bg-gray-50 transition-colors"
                  >
                    <Wallet className="w-4 h-4 text-gray-500" />
                    <span>Wallet &amp; Earnings</span>
                  </a>
                </>
              )}
            </nav>
          </div>
        </aside>

        {/* =========================================================================
            CENTER COLUMN (lg:col-span-6, full width on mobile)
            Feed Tabs, Post Composer (X-inspired), and Post Cards
           ========================================================================= */}
        <section className="col-span-1 lg:col-span-6 flex flex-col gap-4">
          {/* Feed Header Tabs: For You | Trending | Latest */}
          <div className="bg-white rounded-2xl border border-gray-200/80 p-2 shadow-xs flex items-center justify-between sticky top-16 lg:static z-10">
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => setActiveTab('for-you')}
                className={cn(
                  'px-3.5 sm:px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all cursor-pointer',
                  activeTab === 'for-you'
                    ? 'bg-[#9747FF] text-white shadow-xs'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                )}
              >
                For You
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('trending')}
                className={cn(
                  'px-3.5 sm:px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all cursor-pointer inline-flex items-center gap-1.5',
                  activeTab === 'trending'
                    ? 'bg-[#9747FF] text-white shadow-xs'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                )}
              >
                <TrendingUp className="w-3.5 h-3.5" />
                <span>Trending</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('latest')}
                className={cn(
                  'px-3.5 sm:px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all cursor-pointer inline-flex items-center gap-1.5',
                  activeTab === 'latest'
                    ? 'bg-[#9747FF] text-white shadow-xs'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                )}
              >
                <Clock className="w-3.5 h-3.5" />
                <span>Latest</span>
              </button>
            </div>

            {/* Header Refresh Control with Restrained Rotation Animation (Part 6) */}
            <button
              type="button"
              onClick={handleRefresh}
              disabled={isRefreshing}
              className="p-2 text-gray-500 hover:text-[#9747FF] hover:bg-purple-50 rounded-xl transition-colors cursor-pointer mr-1"
              aria-label="Refresh creative feed"
              title="Refresh Feed"
            >
              <RefreshCw className={cn('w-4 h-4', isRefreshing && 'animate-spin text-[#9747FF]')} />
            </button>
          </div>

          {/* New Posts Notification Banner (Part 6.3 - Non-disruptive) */}
          {newPostsCount > 0 && (
            <div className="flex justify-center sticky top-28 z-20 animate-in fade-in slide-in-from-top-2">
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

          {/* Category Filter Pills */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar">
            {CATEGORIES.map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => setSelectedCategory(cat)}
                className={cn(
                  'px-3.5 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all cursor-pointer shrink-0 shadow-2xs',
                  selectedCategory === cat
                    ? 'bg-gray-900 text-white'
                    : 'bg-white text-gray-600 hover:text-gray-900 border border-gray-200/80 hover:border-gray-300'
                )}
              >
                {cat}
              </button>
            ))}
          </div>

          {/* X-Inspired Post Composer (with Character limit ring & Reference 1 Image Uploader) */}
          <div className="hidden sm:block">
            <PostComposer onPostCreated={handlePostCreated} />
          </div>

          {/* Social Feed Post Stream */}
          {isLoading ? (
            <div className="bg-white rounded-2xl border border-gray-200/80 p-12 flex flex-col items-center justify-center gap-3">
              <Loader2 className="w-6 h-6 animate-spin text-[#9747FF]" />
              <p className="text-sm font-medium text-gray-500">Loading creative artwork feed...</p>
            </div>
          ) : posts.length === 0 ? (
            <div className="bg-white rounded-2xl border border-gray-200/80 p-12 text-center flex flex-col items-center">
              <div className="w-14 h-14 rounded-full bg-purple-50 text-[#9747FF] flex items-center justify-center mb-3">
                <Sparkles className="w-7 h-7" />
              </div>
              <h3 className="font-bold text-gray-900 text-base mb-1">No artwork found in this tab</h3>
              <p className="text-xs sm:text-sm text-gray-500 max-w-sm mb-4">
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
            <div className="flex flex-col gap-4">
              {posts.map((post) => (
                <SocialFeedCard key={post._id} post={post} />
              ))}

              {/* Load More Pagination */}
              {hasMore && (
                <div className="pt-2 pb-6 flex justify-center">
                  <Button
                    type="button"
                    onClick={handleLoadMore}
                    disabled={isLoadingMore}
                    variant="outline"
                    className="border-gray-200 hover:border-[#9747FF] text-gray-700 hover:text-[#9747FF] rounded-xl px-6 py-2 text-xs font-semibold shadow-xs"
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
            Top Creators, Categories, and Community
           ========================================================================= */}
        <aside className="hidden lg:flex flex-col gap-5 lg:col-span-3 sticky top-20">
          {/* Top Creators Card */}
          <div className="bg-white rounded-2xl border border-gray-200/80 p-5 shadow-xs">
            <div className="flex items-center justify-between pb-3 border-b border-gray-100 mb-4">
              <h4 className="font-bold text-sm text-gray-900 tracking-tight">Top Creators</h4>
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
                    <div className="w-9 h-9 rounded-full overflow-hidden bg-purple-100 flex items-center justify-center shrink-0 border border-purple-200">
                      {creator.avatar ? (
                        <img src={creator.avatar} alt={creator.name || 'Creator'} className="w-full h-full object-cover" />
                      ) : (
                        <span className="text-[#9747FF] font-bold text-xs">
                          {(creator.name || 'C')[0]?.toUpperCase() || 'C'}
                        </span>
                      )}
                    </div>
                    <div className="min-w-0 flex flex-col">
                      <div className="flex items-center gap-1">
                        <span className="font-bold text-xs text-gray-900 group-hover:text-[#9747FF] truncate">
                          {creator.name || 'Creator'}
                        </span>
                        {creator.isVerified && (
                          <CheckCircle2 className="w-3 h-3 text-[#9747FF] shrink-0" />
                        )}
                      </div>
                      <span className="text-[11px] text-gray-600 truncate">
                        {Array.isArray(creator.category) ? creator.category[0] : creator.category || 'Creator'}
                      </span>
                    </div>
                  </a>

                  <a
                    href={`/creators/${creator.id}`}
                    className="shrink-0 text-xs font-semibold px-2.5 py-1 rounded-full bg-purple-50 text-[#9747FF] hover:bg-[#9747FF] hover:text-white transition-all"
                  >
                    Book
                  </a>
                </div>
              ))}
            </div>
          </div>

          {/* Quick Platform Info */}
          <div className="bg-gradient-to-br from-purple-50 to-white rounded-2xl border border-purple-100 p-5 text-center">
            <h5 className="font-bold text-sm text-gray-900 mb-1">Empowering African Creators</h5>
            <p className="text-xs text-gray-600 leading-relaxed mb-3">
              Discover unique talent, collaborate, and bring creative visions to life with escrow-protected bookings.
            </p>
            <a
              href="/creators"
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#9747FF] hover:underline"
            >
              <span>Explore the marketplace</span>
              <ArrowRight className="w-3 h-3" />
            </a>
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
          onClick={() => setIsMobileComposerOpen(true)}
          className="w-13 h-13 rounded-full bg-[#9747FF] hover:bg-[#8534f0] text-white flex items-center justify-center shadow-lg shadow-purple-600/35 transition-transform active:scale-90 cursor-pointer focus:outline-none"
          aria-label="Create new creative post"
        >
          <Plus className="w-6 h-6 stroke-[2.5]" />
        </button>
      </div>

      {/* Mobile Post Creation Drawer (Wallet drawer animation pattern) */}
      <Drawer
        open={isMobileComposerOpen}
        onOpenChange={(open) => setIsMobileComposerOpen(open)}
      >
        <DrawerContent className="bg-white rounded-t-3xl max-h-[92dvh] flex flex-col p-4 pb-8 border-none shadow-2xl focus:outline-none z-[150]">
          <DrawerTitle className="sr-only">Create New Post</DrawerTitle>
          <DrawerDescription className="sr-only">
            Publish artwork and updates to the creative feed
          </DrawerDescription>
          <div className="flex-1 overflow-y-auto pt-2">
            <PostComposer onPostCreated={handlePostCreated} />
          </div>
        </DrawerContent>
      </Drawer>
    </div>
  );
}
