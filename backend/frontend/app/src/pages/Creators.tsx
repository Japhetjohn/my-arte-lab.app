import { useState, useEffect, useCallback } from 'react';
import { useAuth, api } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { VerifiedBadge } from '@/components/shared/VerifiedBadge';
import { EmptyState } from '@/components/shared/EmptyState';
import { NewBookingModal } from '@/components/booking/NewBookingModal';
import { getAvatarUrl } from '@/lib/imageUrl';
import { getCreatorProfileUrl } from '@/lib/utils';
import { toast } from '@/components/ui/sonner';
import type { Creator } from '@/types';
import {
  Users,
  Home,
  Sparkles,
  Calendar,
  Wallet,
  Settings as SettingsIcon,
  ShieldCheck,
  Star,
  MapPin,
  Loader2,
  ArrowRight,
  CheckCircle2,
} from 'lucide-react';

export function Creators() {
  const { user } = useAuth();
  const [creators, setCreators] = useState<Creator[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Booking Modal State (reusing NewBookingModal)
  const [selectedCreatorForBooking, setSelectedCreatorForBooking] = useState<any | null>(null);
  const [isBookingModalOpen, setIsBookingModalOpen] = useState(false);

  // Fetch all creators directly from backend
  const fetchCreators = useCallback(async () => {
    try {
      setIsLoading(true);
      const response = await api.get('/creators?limit=1000');
      const results =
        response.data.data?.creators ||
        response.data.data?.results ||
        response.data.data ||
        [];
      setCreators(results);
    } catch (error: any) {
      console.error('Error fetching creators:', error);
      toast.error("We couldn't load creators right now.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCreators();
  }, [fetchCreators]);

  // Deep-link check for ?creator=id
  useEffect(() => {
    if (typeof window === 'undefined' || creators.length === 0) return;
    const params = new URLSearchParams(window.location.search);
    const targetId = params.get('creator');
    if (targetId) {
      const match = creators.find(
        (c) => c.id === targetId || (c as any)._id === targetId
      );
      if (match) {
        handleBook(match);
      }
    }
  }, [creators]);

  const handleBook = (creator: any) => {
    if (!user) {
      window.location.href = `/login?redirect=${encodeURIComponent(
        `/creators?creator=${creator.id || creator._id}`
      )}`;
      return;
    }

    const creatorId = creator.id || (creator as any)._id;
    setSelectedCreatorForBooking({
      id: creatorId,
      name:
        creator.name && creator.name !== 'Creator'
          ? creator.name
          : `${creator.firstName || ''} ${creator.lastName || ''}`.trim() ||
            'Creator',
      avatar: creator.avatar,
      category: creator.category,
      isVerified: creator.isVerified,
    });
    setIsBookingModalOpen(true);
  };

  const getDisplayName = (creator: any) => {
    if (creator.name && creator.name !== 'Creator') return creator.name;
    const fullName = `${creator.firstName || ''} ${creator.lastName || ''}`.trim();
    if (fullName) return fullName;
    if (creator.username) return creator.username;
    return creator.name || 'Creator';
  };

  const getUsername = (creator: any) => {
    if (creator.username) return creator.username;
    if (creator.seoSlug) return creator.seoSlug;
    if (creator.email) return creator.email.split('@')[0];
    return null;
  };

  const getCategoryText = (creator: any) => {
    if (Array.isArray(creator.category)) {
      return creator.category.join(' • ');
    }
    return creator.category || '';
  };

  const getLocationText = (creator: any) => {
    if (!creator.location) return null;
    const parts = [
      creator.location.localArea,
      creator.location.state,
      creator.location.country,
    ].filter(Boolean);
    return parts.slice(-2).join(', ');
  };

  const getRatingDisplay = (creator: any) => {
    const rating = creator.rating;
    if (typeof rating === 'object' && rating !== null && 'average' in rating) {
      if (rating.average > 0) {
        return {
          value: Number(rating.average).toFixed(1),
          count: Number(rating.count) || 0,
        };
      }
    } else if (typeof rating === 'number' && rating > 0) {
      return {
        value: rating.toFixed(1),
        count: creator.reviewCount || 0,
      };
    }
    return null;
  };

  const userDisplayName =
    user?.name || `${user?.firstName || ''} ${user?.lastName || ''}`.trim() || 'Client';

  return (
    <div className="w-full relative">
      {/* 3-Column Standardized Desktop Layout matching Home & Bookings */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">

        {/* =========================================================================
            LEFT COLUMN (lg:col-span-3, hidden on mobile/tablet)
            Profile summary & platform navigation
           ========================================================================= */}
        <aside className="hidden lg:flex flex-col gap-6 lg:col-span-3 sticky top-20">
          {/* User Profile Mini Summary */}
          <div className="pb-5 border-b border-[#DADDE1] dark:border-[#2f3032]">
            {user ? (
              <div className="flex flex-col items-center text-center">
                <div className="w-16 h-16 rounded-full overflow-hidden bg-purple-50 dark:bg-purple-950/40 flex items-center justify-center border-2 border-[#9747FF]/20 mb-3">
                  {user.avatar ? (
                    <img
                      src={getAvatarUrl(user.avatar)}
                      alt={userDisplayName}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <span className="text-[#9747FF] font-bold text-xl">
                      {(userDisplayName || 'C')[0].toUpperCase()}
                    </span>
                  )}
                </div>
                <h3 className="font-bold text-gray-900 dark:text-gray-100 text-base leading-tight">
                  {userDisplayName}
                </h3>
                <p className="text-xs text-gray-600 dark:text-gray-400 mt-0.5">
                  @{user.email ? user.email.split('@')[0] : 'creator'}
                </p>
                <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-purple-50 dark:bg-purple-950/50 text-[#9747FF] text-xs font-semibold mt-2.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#9747FF]" />
                  {user.role === 'creator' ? 'Creator' : 'Client'}
                </div>
              </div>
            ) : (
              <div className="text-center py-2">
                <div className="w-12 h-12 rounded-full bg-purple-100 dark:bg-purple-950/40 text-[#9747FF] flex items-center justify-center mx-auto mb-3">
                  <Sparkles className="w-6 h-6" />
                </div>
                <h3 className="font-bold text-gray-900 dark:text-gray-100 text-base">
                  Your creative headquarters
                </h3>
                <p className="text-xs text-gray-600 dark:text-gray-400 mt-1 mb-4 leading-relaxed">
                  Showcase your work, connect with other creators, and collaborate.
                </p>
                <Button
                  type="button"
                  onClick={() => (window.location.href = '/login')}
                  className="w-full bg-[#9747FF] hover:bg-[#8534f0] text-white font-semibold rounded-xl text-xs py-2 shadow-xs cursor-pointer"
                >
                  Sign in or join
                </Button>
              </div>
            )}
          </div>

          {/* Quick Navigation Menu */}
          <div className="pb-2">
            <nav className="space-y-1">
              <a
                href="/home"
                className="flex items-center gap-3 px-3 py-2.5 rounded-xl font-medium text-sm text-gray-700 dark:text-gray-300 hover:text-[#9747FF] dark:hover:text-[#9747FF] hover:bg-gray-100/70 dark:hover:bg-[#1e1f20] transition-colors"
              >
                <Home className="w-5 h-5 text-gray-500 dark:text-gray-400" />
                <span>Home</span>
              </a>

              {/* Creators Active Link */}
              <a
                href="/creators"
                className="flex items-center gap-3 px-3 py-2.5 rounded-xl font-semibold text-sm bg-purple-50 dark:bg-purple-950/50 text-[#9747FF] transition-colors"
              >
                <Users className="w-4 h-4 text-[#9747FF]" />
                <span>Creators</span>
              </a>

              {user && (
                <>
                  <a
                    href="/bookings"
                    className="flex items-center gap-3 px-3 py-2.5 rounded-xl font-medium text-sm text-gray-700 dark:text-gray-300 hover:text-[#9747FF] dark:hover:text-[#9747FF] hover:bg-gray-100/70 dark:hover:bg-[#1e1f20] transition-colors"
                  >
                    <Calendar className="w-4 h-4 text-gray-500 dark:text-gray-400" />
                    <span>Bookings</span>
                  </a>

                  <a
                    href="/wallet"
                    className="flex items-center gap-3 px-3 py-2.5 rounded-xl font-medium text-sm text-gray-700 dark:text-gray-300 hover:text-[#9747FF] dark:hover:text-[#9747FF] hover:bg-gray-100/70 dark:hover:bg-[#1e1f20] transition-colors"
                  >
                    <Wallet className="w-4 h-4 text-gray-500 dark:text-gray-400" />
                    <span>Wallet</span>
                  </a>

                  <a
                    href="/settings"
                    className="flex items-center gap-3 px-3 py-2.5 rounded-xl font-medium text-sm text-gray-700 dark:text-gray-300 hover:text-[#9747FF] dark:hover:text-[#9747FF] hover:bg-gray-100/70 dark:hover:bg-[#1e1f20] transition-colors"
                  >
                    <SettingsIcon className="w-4 h-4 text-gray-500 dark:text-gray-400" />
                    <span>Profile &amp; settings</span>
                  </a>
                </>
              )}
            </nav>
          </div>
        </aside>

        {/* =========================================================================
            CENTER COLUMN (lg:col-span-6, full width on mobile)
            Clean Creator List Stream (Borderless, thin ash-grey separators)
           ========================================================================= */}
        <main className="col-span-1 lg:col-span-6 w-full max-w-xl mx-auto flex flex-col pb-16">
          {/* Header */}
          <div className="px-4 pt-2 pb-3.5 flex items-center justify-between bg-white dark:bg-[#18191a] border-b border-[#DADDE1] dark:border-[#2f3032]">
            <div className="flex items-center gap-2.5">
              <h1 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-gray-100">
                Creators
              </h1>
              {creators.length > 0 && (
                <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-purple-50 dark:bg-purple-950/40 text-[#9747FF]">
                  {creators.length}
                </span>
              )}
            </div>
          </div>

          {/* List Content */}
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-24 gap-3 bg-white dark:bg-[#18191a]">
              <Loader2 className="w-6 h-6 animate-spin text-[#9747FF]" />
              <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
                Loading creators...
              </p>
            </div>
          ) : creators.length === 0 ? (
            <div className="py-16 px-4 bg-white dark:bg-[#18191a]">
              <EmptyState
                image="/images/empty-search.png"
                title="No creators found"
                description="We couldn't find any creators matching your view right now."
                actionLabel="Back to feed"
                onAction={() => (window.location.href = '/home')}
              />
            </div>
          ) : (
            <div className="flex flex-col divide-y divide-[#DADDE1] dark:divide-[#2f3032] bg-white dark:bg-[#18191a] border-b border-[#DADDE1] dark:border-[#2f3032]">
              {creators.map((creator) => {
                const creatorId = creator.id || (creator as any)._id;
                const profileUrl = getCreatorProfileUrl(creator as any);
                const displayName = getDisplayName(creator);
                const username = getUsername(creator);
                const categoryText = getCategoryText(creator);
                const locationText = getLocationText(creator);
                const ratingDisplay = getRatingDisplay(creator);

                return (
                  <div
                    key={creatorId}
                    className="px-4 py-3.5 sm:py-4 flex items-start gap-3.5 sm:gap-4 transition-colors hover:bg-gray-50/60 dark:hover:bg-white/[0.02]"
                  >
                    {/* Avatar (Clickable to profile) */}
                    <a
                      href={profileUrl}
                      className="relative shrink-0 block mt-0.5 group focus:outline-none"
                    >
                      <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-full overflow-hidden bg-purple-50 dark:bg-purple-950/40 border border-[#DADDE1] dark:border-[#2f3032] flex items-center justify-center group-hover:border-[#9747FF]/50 transition-colors">
                        {creator.avatar ? (
                          <img
                            src={getAvatarUrl(creator.avatar)}
                            alt={displayName}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <span className="text-[#9747FF] font-bold text-base sm:text-lg">
                            {(displayName || 'C')[0]?.toUpperCase() || 'C'}
                          </span>
                        )}
                      </div>
                    </a>

                    {/* Info Block */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        {/* Name, Badge, Handle */}
                        <div className="min-w-0 flex-1">
                          {/* First line: Display name + Verification badge */}
                          <div className="flex items-center gap-1.5 min-w-0">
                            <a
                              href={profileUrl}
                              className="font-bold text-sm sm:text-base text-gray-900 dark:text-gray-100 hover:text-[#9747FF] dark:hover:text-[#9747FF] transition-colors truncate inline-flex items-center gap-1.5 leading-tight"
                            >
                              <span className="truncate">{displayName}</span>
                              {creator.isVerified && (
                                <VerifiedBadge
                                  className="w-4 h-4 shrink-0 inline-block align-middle"
                                  showTooltip={false}
                                />
                              )}
                            </a>
                          </div>

                          {/* Second line: Username/handle directly underneath */}
                          {username && (
                            <p className="text-xs text-gray-500 dark:text-gray-400 font-normal truncate mt-0.5 leading-tight">
                              @{username}
                            </p>
                          )}

                          {/* Category */}
                          {categoryText && (
                            <p className="text-xs font-semibold text-[#9747FF] dark:text-[#a855f7] mt-1 truncate">
                              {categoryText}
                            </p>
                          )}

                          {/* Bio */}
                          {creator.bio && (
                            <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 mt-1 line-clamp-2 leading-relaxed">
                              {creator.bio}
                            </p>
                          )}

                          {/* Meta row: Rating, Location, Starting price */}
                          <div className="flex items-center gap-3 mt-1.5 text-xs text-gray-500 dark:text-gray-400 flex-wrap">
                            {ratingDisplay && (
                              <div className="flex items-center gap-1 font-medium text-gray-700 dark:text-gray-300">
                                <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                                <span>{ratingDisplay.value}</span>
                                {ratingDisplay.count > 0 && (
                                  <span className="text-gray-400">({ratingDisplay.count})</span>
                                )}
                              </div>
                            )}

                            {locationText && (
                              <div className="flex items-center gap-1">
                                <MapPin className="w-3 h-3 text-gray-400 shrink-0" />
                                <span className="truncate max-w-[180px]">{locationText}</span>
                              </div>
                            )}

                            {creator.startingPrice ? (
                              <span className="text-gray-500 dark:text-gray-400">
                                From{' '}
                                <span className="font-semibold text-gray-900 dark:text-gray-100">
                                  {creator.startingPrice} USDC
                                </span>
                              </span>
                            ) : null}
                          </div>
                        </div>

                        {/* Action Buttons */}
                        <div className="flex items-center gap-2 shrink-0 pt-0.5">
                          <a
                            href={profileUrl}
                            className="hidden sm:inline-flex items-center text-xs font-semibold px-3 py-1.5 rounded-full border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:text-[#9747FF] hover:border-[#9747FF] transition-all"
                          >
                            Profile
                          </a>
                          <Button
                            type="button"
                            onClick={() => handleBook(creator)}
                            size="sm"
                            className="h-8 px-3.5 text-xs font-semibold rounded-full bg-[#9747FF] hover:bg-[#8534f0] text-white shadow-xs cursor-pointer transition-all"
                          >
                            Book
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </main>

        {/* =========================================================================
            RIGHT COLUMN (lg:col-span-3, hidden on mobile/tablet)
            Escrow Protection Guarantee & Community Shortcuts
           ========================================================================= */}
        <aside className="hidden lg:flex flex-col gap-6 lg:col-span-3 sticky top-20">
          {/* Escrow Guarantee Card */}
          <div className="pb-5 border-b border-[#DADDE1] dark:border-[#2f3032]">
            <div className="flex items-center gap-2 text-gray-900 dark:text-gray-100 mb-2">
              <ShieldCheck className="w-4 h-4 text-[#9747FF]" />
              <h4 className="text-xs font-semibold uppercase tracking-wider">
                Escrow protection
              </h4>
            </div>
            <p className="text-xs text-gray-600 dark:text-gray-400 leading-relaxed mb-3">
              Project funds stay safely in escrow until you review and approve the finished work.
            </p>
            <div className="space-y-1.5 text-xs text-gray-700 dark:text-gray-300">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                <span>Milestone-based deliverable inspections</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                <span>Clear project pricing and milestones</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                <span>Dispute mediation if needed</span>
              </div>
            </div>
          </div>

          {/* Quick links */}
          <div className="pb-5 border-b border-[#DADDE1] dark:border-[#2f3032]">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-gray-600 dark:text-gray-400 mb-2">
              Explore
            </h4>
            <div className="space-y-2">
              <a
                href="/home"
                className="flex items-center justify-between p-2.5 rounded-xl hover:bg-gray-100 dark:hover:bg-[#1e1f20] transition-colors group"
              >
                <div className="flex items-center gap-2.5">
                  <Sparkles className="w-4 h-4 text-[#9747FF]" />
                  <span className="text-sm font-medium text-gray-800 dark:text-gray-200">
                    Feed
                  </span>
                </div>
                <ArrowRight className="w-4 h-4 text-gray-400 group-hover:text-[#9747FF] transition-colors" />
              </a>
            </div>
          </div>

          {/* Footer copyright */}
          <div className="px-1 text-xs text-gray-400">
            <p>© {new Date().getFullYear()} MyArteLab Inc.</p>
            <p className="mt-1">Built for African creators</p>
          </div>
        </aside>

      </div>

      {/* Reusable New Booking Modal (Responsive: Dialog on desktop, Drawer on mobile) */}
      {selectedCreatorForBooking && (
        <NewBookingModal
          isOpen={isBookingModalOpen}
          onClose={() => {
            setIsBookingModalOpen(false);
            setSelectedCreatorForBooking(null);
          }}
          creator={selectedCreatorForBooking}
          onSuccess={() => {
            setIsBookingModalOpen(false);
            setSelectedCreatorForBooking(null);
            toast.success('Booking request sent.');
          }}
        />
      )}
    </div>
  );
}
