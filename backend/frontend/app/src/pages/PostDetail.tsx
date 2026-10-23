import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { ArrowLeft, Loader2, Home as HomeIcon, Users, Calendar, Wallet, Settings } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { SocialFeedCard, type FeedPost } from '@/components/social/SocialFeedCard';
import { VerifiedBadge } from '@/components/shared/VerifiedBadge';
import { EmptyState } from '@/components/shared/EmptyState';
import { socialService } from '@/lib/api';
import { getAvatarUrl } from '@/lib/imageUrl';

interface PostDetailProps {
  postId?: string;
}

export function PostDetail({ postId: propPostId }: PostDetailProps) {
  const { user } = useAuth();
  const urlMatch = typeof window !== 'undefined' ? window.location.pathname.match(/\/posts?\/(.+)/) : null;
  const postId = propPostId || urlMatch?.[1];

  const [post, setPost] = useState<FeedPost | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!postId) return;
    const loadPost = async () => {
      try {
        setIsLoading(true);
        setError(null);
        const res = await socialService.getPost(postId);
        const fetchedPost = res.data?.data?.post;
        if (fetchedPost) {
          setPost(fetchedPost);
        } else {
          setError('Post not found');
        }
      } catch (err: any) {
        console.error('Error loading post:', err);
        setError(err.response?.data?.message || err.message || 'Post could not be loaded');
      } finally {
        setIsLoading(false);
      }
    };

    loadPost();
  }, [postId]);

  const handleBack = () => {
    if (window.history.length > 1) {
      window.history.back();
    } else {
      window.location.href = '/home';
    }
  };

  return (
    <div className="w-full relative">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* =========================================================================
            LEFT COLUMN (lg:col-span-3, hidden on mobile/tablet)
            Platform Navigation and User Context
           ========================================================================= */}
        <aside className="hidden lg:flex flex-col gap-6 lg:col-span-3 sticky top-20">
          <div className="pb-5 border-b border-[#DADDE1] dark:border-[#2f3032]">
            {user && (
              <div className="flex flex-col items-center text-center">
                <div className="w-16 h-16 rounded-full overflow-hidden bg-purple-100 dark:bg-purple-950/40 flex items-center justify-center border-2 border-[#9747FF]/20 mb-3">
                  {user.avatar ? (
                    <img src={getAvatarUrl(user.avatar)} alt={user.name} className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-[#9747FF] font-bold text-xl">
                      {(user.name || user.firstName || 'U')[0].toUpperCase()}
                    </span>
                  )}
                </div>
                <h3 className="font-bold text-gray-900 dark:text-gray-100 text-base leading-tight">
                  {user.name || `${user.firstName || ''} ${user.lastName || ''}`.trim() || 'Creative Member'}
                </h3>
                <p className="text-xs text-gray-600 dark:text-gray-400 mt-0.5">
                  @{user.email.split('@')[0]}
                </p>
                <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-purple-50 dark:bg-purple-950/50 text-[#9747FF] text-xs font-semibold mt-2.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#9747FF]"></span>
                  {user.role === 'creator' ? 'Verified Creator' : 'Client'}
                </div>
              </div>
            )}
          </div>

          <nav className="space-y-1">
            <a
              href="/home"
              className="flex items-center gap-3 px-3 py-2.5 rounded-xl font-medium text-sm text-gray-700 dark:text-gray-300 hover:text-[#9747FF] hover:bg-gray-100/70 dark:hover:bg-white/[0.04] transition-colors"
            >
              <HomeIcon className="w-5 h-5 text-gray-500 dark:text-gray-400" />
              <span>Home</span>
            </a>

            <a
              href="/creators"
              className="flex items-center gap-3 px-3 py-2.5 rounded-xl font-medium text-sm text-gray-700 dark:text-gray-300 hover:text-[#9747FF] hover:bg-gray-100/70 dark:hover:bg-white/[0.04] transition-colors"
            >
              <Users className="w-4 h-4 text-gray-500 dark:text-gray-400" />
              <span>Browse Creators</span>
            </a>

            <a
              href="/bookings"
              className="flex items-center gap-3 px-3 py-2.5 rounded-xl font-medium text-sm text-gray-700 dark:text-gray-300 hover:text-[#9747FF] hover:bg-gray-100/70 dark:hover:bg-white/[0.04] transition-colors"
            >
              <Calendar className="w-4 h-4 text-gray-500 dark:text-gray-400" />
              <span>My Bookings</span>
            </a>

            <a
              href="/wallet"
              className="flex items-center gap-3 px-3 py-2.5 rounded-xl font-medium text-sm text-gray-700 dark:text-gray-300 hover:text-[#9747FF] hover:bg-gray-100/70 dark:hover:bg-white/[0.04] transition-colors"
            >
              <Wallet className="w-4 h-4 text-gray-500 dark:text-gray-400" />
              <span>Wallet &amp; Earnings</span>
            </a>

            <a
              href="/settings"
              className="flex items-center gap-3 px-3 py-2.5 rounded-xl font-medium text-sm text-gray-700 dark:text-gray-300 hover:text-[#9747FF] hover:bg-gray-100/70 dark:hover:bg-white/[0.04] transition-colors"
            >
              <Settings className="w-4 h-4 text-gray-500 dark:text-gray-400" />
              <span>Settings &amp; Profile</span>
            </a>
          </nav>
        </aside>

        {/* =========================================================================
            CENTER COLUMN (lg:col-span-6, full width on mobile)
            Dedicated Post Card & Engagement
           ========================================================================= */}
        <main className="col-span-1 lg:col-span-6 w-full max-w-xl mx-auto flex flex-col gap-4 pb-16">
          {/* Top Bar with Back Button */}
          <div className="flex items-center justify-between pb-3 border-b border-[#DADDE1] dark:border-[#2f3032]">
            <button
              type="button"
              onClick={handleBack}
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-gray-600 dark:text-gray-400 hover:text-[#9747FF] transition-colors cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back to Feed</span>
            </button>
            <span className="text-xs text-gray-400">Artwork Details</span>
          </div>

          {isLoading ? (
            <div className="py-24 flex flex-col items-center justify-center gap-2">
              <Loader2 className="w-8 h-8 animate-spin text-[#9747FF]" />
              <span className="text-xs text-gray-500">Loading artwork post...</span>
            </div>
          ) : error || !post ? (
            <div className="py-12">
              <EmptyState
                image="/images/empty-bookings.png"
                title="Post Unavailable"
                description={error || 'This post may have been removed or is no longer accessible.'}
                actionLabel="Explore Creative Feed"
                onAction={() => (window.location.href = '/home')}
              />
            </div>
          ) : (
            <div className="w-full">
              <SocialFeedCard
                post={post}
                defaultExpandedComments={true}
                onPostDeleted={() => (window.location.href = '/home')}
              />
            </div>
          )}
        </main>

        {/* =========================================================================
            RIGHT COLUMN (lg:col-span-3, hidden on mobile/tablet)
            Creator Profile Summary & Commission Actions
           ========================================================================= */}
        <aside className="hidden lg:flex flex-col gap-6 lg:col-span-3 sticky top-20">
          {post?.creator && (
            <div className="pb-5 border-b border-[#DADDE1] dark:border-[#2f3032] space-y-4">
              <h4 className="font-bold text-xs uppercase tracking-wider text-gray-500 dark:text-gray-400">
                About the Creator
              </h4>

              <div className="flex items-center gap-3">
                <a
                  href={`/creators/${post.creator._id}`}
                  className="w-12 h-12 rounded-full overflow-hidden bg-purple-100 dark:bg-purple-950/40 border border-purple-200 dark:border-purple-800/40 shrink-0"
                >
                  {post.creator.avatar ? (
                    <img src={getAvatarUrl(post.creator.avatar)} alt={post.creator.name} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center font-bold text-[#9747FF] text-sm">
                      {(post.creator.name || 'C')[0]?.toUpperCase()}
                    </div>
                  )}
                </a>
                <div className="min-w-0">
                  <div className="flex items-center gap-1 min-w-0">
                    <a
                      href={`/creators/${post.creator._id}`}
                      className="font-bold text-sm text-gray-900 dark:text-gray-100 hover:text-[#9747FF] truncate block"
                    >
                      {post.creator.name}
                    </a>
                    {post.creator.isVerified && <VerifiedBadge className="w-3.5 h-3.5 shrink-0" showTooltip={false} />}
                  </div>
                  {(post.creator as any)?.username && (
                    <p className="text-xs text-gray-500 dark:text-gray-400 font-normal truncate mt-0.5 leading-tight">
                      @{(post.creator as any).username}
                    </p>
                  )}
                  <p className="text-xs text-gray-500 mt-0.5">
                    {(post.creator as any)?.category || (Array.isArray(post.creator.categories) ? post.creator.categories.join(' • ') : 'Creator')}
                  </p>
                </div>
              </div>

              {post.creator.bio && (
                <p className="text-xs text-gray-600 dark:text-gray-300 leading-relaxed line-clamp-3">
                  {post.creator.bio}
                </p>
              )}

              <div className="flex items-center gap-2 pt-1">
                <Button
                  size="sm"
                  onClick={() => (window.location.href = `/creators/${post.creator._id}`)}
                  className="rounded-full bg-[#9747FF] hover:bg-[#8534f0] text-white text-xs font-semibold px-4 shadow-2xs flex-1"
                >
                  View Profile
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => (window.location.href = `/messages?user=${post.creator._id}`)}
                  className="rounded-full border-[#DADDE1] dark:border-[#2f3032] text-xs font-semibold px-3"
                >
                  Message
                </Button>
              </div>
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}
