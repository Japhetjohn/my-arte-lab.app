import { useState, useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { useAuth, api } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';
import { socialService } from '@/lib/api';
import { SocialFeedCard, type FeedPost } from '@/components/social/SocialFeedCard';
import { getAvatarUrl } from '@/lib/imageUrl';
import { toast } from '@/components/ui/sonner';
import { VerifiedBadge } from '@/components/shared/VerifiedBadge';
import { useIsMobile } from '@/hooks/use-mobile';
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import {
  Drawer,
  DrawerContent,
  DrawerTitle,
  DrawerDescription,
} from '@/components/ui/drawer';
import {
  User,
  Bell,
  Shield,
  Moon,
  Camera,
  Loader2,
  Lock,
  Wallet,
  ChevronRight,
  Sparkles,
  Compass,
  Users,
  Calendar,
  LogOut,
  HelpCircle,
  ExternalLink,
  CheckCircle2,
  X,
} from 'lucide-react';
import { cn } from '@/lib/utils';

// Reusable responsive settings popup component
// Adapts between a mobile bottom drawer and a desktop centered modal
interface SettingsSheetModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  maxWidth?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
}

function SettingsSheetModal({
  isOpen,
  onClose,
  title,
  description,
  maxWidth = 'sm:max-w-md',
  children,
  footer,
}: SettingsSheetModalProps) {
  const isMobile = useIsMobile();

  const bodyContent = (
    <div className="flex flex-col h-full max-h-[85vh]">
      {/* Modal / Drawer Header with Title, Description, and Close Icon */}
      <div className="shrink-0 flex items-start justify-between pb-3.5 border-b border-[#DADDE1] dark:border-[#2f3032]">
        <div className="pr-4">
          <h3 className="text-base sm:text-lg font-bold text-gray-900 dark:text-gray-100 tracking-tight leading-tight">
            {title}
          </h3>
          {description && (
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 leading-normal">
              {description}
            </p>
          )}
        </div>
        <button
          type="button"
          onClick={onClose}
          className="w-8 h-8 rounded-full bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-500 dark:text-gray-300 hover:text-gray-700 dark:hover:text-gray-100 flex items-center justify-center transition-colors cursor-pointer shrink-0 -mt-1 -mr-1"
          aria-label="Close"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Scrollable Form Body */}
      <div className="flex-1 overflow-y-auto overscroll-contain py-4 focus:outline-none">
        {children}
      </div>

      {/* Fixed Action Footer */}
      {footer && (
        <div className="shrink-0 bg-white dark:bg-[#1a1b1c] border-t border-[#DADDE1] dark:border-[#2f3032] pt-3 pb-[max(env(safe-area-inset-bottom,0px),16px)] sm:pb-3">
          {footer}
        </div>
      )}
    </div>
  );

  if (isMobile) {
    return (
      <Drawer open={isOpen} onOpenChange={(open) => !open && onClose()} repositionInputs={false}>
        <DrawerContent className="bg-white dark:bg-[#1a1b1c] rounded-t-2xl max-h-[90dvh] flex flex-col p-5 pb-0 border-t border-[#DADDE1] dark:border-[#2f3032] shadow-2xl focus:outline-none z-[150]">
          <DrawerTitle className="sr-only">{title}</DrawerTitle>
          <DrawerDescription className="sr-only">{description || title}</DrawerDescription>
          {bodyContent}
        </DrawerContent>
      </Drawer>
    );
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent
        showCloseButton={false}
        className={cn(
          'bg-white dark:bg-[#1a1b1c] rounded-2xl max-h-[85vh] flex flex-col p-6 pb-0 border border-[#DADDE1] dark:border-[#2f3032] shadow-xl focus:outline-none z-[150]',
          maxWidth
        )}
      >
        <DialogTitle className="sr-only">{title}</DialogTitle>
        <DialogDescription className="sr-only">{description || title}</DialogDescription>
        {bodyContent}
      </DialogContent>
    </Dialog>
  );
}

export function Settings() {
  const { user: currentUser, updateUser, logout } = useAuth();
  const [searchParams] = useSearchParams();
  const tabParam = searchParams.get('tab');

  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Theme control via centralized theme system
  const { isDark, setTheme } = useTheme();

  // Dialog & Drawer states for interactive settings
  const [isEditProfileOpen, setIsEditProfileOpen] = useState(false);
  const [isPasswordDialogOpen, setIsPasswordDialogOpen] = useState(false);
  const [isNotificationsModalOpen, setIsNotificationsModalOpen] = useState(false);
  const [isPrivacyModalOpen, setIsPrivacyModalOpen] = useState(false);
  const [isBecomeCreatorOpen, setIsBecomeCreatorOpen] = useState(false);
  const [isLogoutDialogOpen, setIsLogoutDialogOpen] = useState(false);

  // User's own posts state
  const [myPosts, setMyPosts] = useState<FeedPost[]>([]);
  const [isLoadingPosts, setIsLoadingPosts] = useState(false);

  // Profile form state
  const [profileForm, setProfileForm] = useState({
    firstName: '',
    lastName: '',
    email: '',
    bio: '',
    phoneNumber: '',
    localArea: '',
    state: '',
    country: '',
    skills: [] as string[],
    avatar: '',
  });

  const [notifications, setNotifications] = useState({
    email: true,
    push: true,
    sms: false,
    marketing: false,
  });

  const [privacy, setPrivacy] = useState({
    publicProfile: true,
    showActivity: true,
    allowMessages: true,
  });

  // Password change state
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });

  // Handle URL tab param triggers (e.g. ?tab=wallet, ?tab=notifications, ?tab=privacy, ?tab=profile)
  useEffect(() => {
    if (!tabParam) return;
    if (tabParam === 'wallet') {
      window.location.href = '/wallet';
    } else if (tabParam === 'profile') {
      setIsEditProfileOpen(true);
    } else if (tabParam === 'notifications') {
      setIsNotificationsModalOpen(true);
    } else if (tabParam === 'privacy') {
      setIsPrivacyModalOpen(true);
    }
  }, [tabParam]);

  // Fetch current user's own posts
  useEffect(() => {
    if (!currentUser?.id && !(currentUser as any)?._id) return;
    const uid = currentUser?.id || (currentUser as any)?._id;
    let isMounted = true;
    const loadMyPosts = async () => {
      try {
        setIsLoadingPosts(true);
        const res = await socialService.getFeed({ creatorId: uid, limit: 30 });
        if (isMounted) {
          setMyPosts(res.data?.data?.posts || []);
        }
      } catch {
        if (isMounted) setMyPosts([]);
      } finally {
        if (isMounted) setIsLoadingPosts(false);
      }
    };
    loadMyPosts();
    return () => {
      isMounted = false;
    };
  }, [currentUser?.id, (currentUser as any)?._id]);

  const handlePostUpdated = (updatedPost: FeedPost) => {
    setMyPosts((prev) => prev.map((p) => (p._id === updatedPost._id ? updatedPost : p)));
  };

  // Load user data into form
  useEffect(() => {
    if (currentUser) {
      setProfileForm({
        firstName: currentUser.firstName || '',
        lastName: currentUser.lastName || '',
        email: currentUser.email || '',
        bio: currentUser.bio || '',
        phoneNumber: (currentUser as any).phoneNumber || '',
        localArea: currentUser.location?.localArea || '',
        state: currentUser.location?.state || '',
        country: currentUser.location?.country || '',
        skills: currentUser.skills || [],
        avatar: currentUser.avatar || '',
      });

      // Load privacy settings
      if (currentUser.privacy) {
        setPrivacy({
          publicProfile: currentUser.privacy.publicProfile ?? true,
          showActivity: currentUser.privacy.showActivity ?? true,
          allowMessages: currentUser.privacy.allowMessages ?? true,
        });
      }
    }
  }, [currentUser]);

  // Handle profile update
  const handleSaveProfile = async () => {
    setIsSaving(true);
    try {
      const updateData = {
        firstName: profileForm.firstName,
        lastName: profileForm.lastName,
        bio: profileForm.bio,
        phoneNumber: profileForm.phoneNumber,
        location: {
          localArea: profileForm.localArea,
          state: profileForm.state,
          country: profileForm.country,
        },
        skills: profileForm.skills,
      };

      const response = await api.put('/auth/update-profile', updateData);

      if (updateUser && response.data?.data?.user) {
        updateUser(response.data.data.user);
      }

      toast.success('Profile updated successfully');
      setIsEditProfileOpen(false);
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to update profile');
    } finally {
      setIsSaving(false);
    }
  };

  // Handle privacy settings save
  const handleSavePrivacy = async () => {
    setIsSaving(true);
    try {
      const response = await api.put('/auth/update-profile', { privacy });

      if (updateUser && response.data?.data?.user) {
        updateUser(response.data.data.user);
      }

      toast.success('Privacy settings saved');
      setIsPrivacyModalOpen(false);
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to save privacy settings');
    } finally {
      setIsSaving(false);
    }
  };

  // Handle avatar upload
  const handleAvatarUpload = async (file: File) => {
    try {
      setIsLoading(true);
      const formData = new FormData();
      formData.append('image', file);

      const response = await api.post('/upload/image', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      const imageUrl = response.data.data.url;

      // Update profile with new avatar
      await api.put('/auth/update-profile', { avatar: imageUrl });

      // Update local state
      setProfileForm((prev) => ({ ...prev, avatar: imageUrl }));

      // Update user context
      if (updateUser && currentUser) {
        updateUser({ ...currentUser, avatar: imageUrl });
      }

      toast.success('Profile photo updated successfully');
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to upload photo');
    } finally {
      setIsLoading(false);
    }
  };

  // Handle password change
  const handleChangePassword = async () => {
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      toast.error('New passwords do not match');
      return;
    }

    if (passwordForm.newPassword.length < 8) {
      toast.error('Password must be at least 8 characters');
      return;
    }

    if (!/^(?=.*[a-z])(?=.*[A-Z])/.test(passwordForm.newPassword)) {
      toast.error('Password must contain at least one uppercase and one lowercase letter');
      return;
    }

    setIsLoading(true);
    try {
      await api.put('/auth/update-password', {
        currentPassword: passwordForm.currentPassword,
        newPassword: passwordForm.newPassword,
      });

      toast.success('Password changed successfully');
      setIsPasswordDialogOpen(false);
      setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to change password');
    } finally {
      setIsLoading(false);
    }
  };

  // Handle skills input
  const handleSkillsChange = (value: string) => {
    const skills = value
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
    setProfileForm((prev) => ({ ...prev, skills }));
  };

  const handleLogout = () => {
    if (logout) {
      logout();
    }
    window.location.href = '/login';
  };

  // Computed display name
  const displayName =
    currentUser?.name ||
    `${currentUser?.firstName || ''} ${currentUser?.lastName || ''}`.trim() ||
    currentUser?.email?.split('@')[0] ||
    'Creator';

  const userEmail = currentUser?.email || '';
  const isVerifiedUser = !!(
    currentUser?.isVerified || currentUser?.verificationSubscription?.active
  );
  const isCreator = currentUser?.role === 'creator';

  return (
    <div className="w-full">
      {/* 3-Column Profile Layout on Desktop, Centered and Borderless */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* =========================================================================
            LEFT COLUMN (lg:col-span-3, hidden on mobile)
            Platform Navigation and Profile Preview
           ========================================================================= */}
        <aside className="hidden lg:flex flex-col gap-6 lg:col-span-3 sticky top-20">
          {/* User Profile Preview Card (Continuous borderless styling) */}
          <div className="pb-5 border-b border-[#DADDE1]">
            <div className="flex flex-col items-center text-center">
              <div className="w-16 h-16 rounded-full overflow-hidden bg-purple-100 flex items-center justify-center border-2 border-[#9747FF]/20 mb-3 relative">
                {currentUser?.avatar ? (
                  <img
                    src={getAvatarUrl(currentUser.avatar)}
                    alt={displayName}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <span className="text-[#9747FF] font-bold text-xl">
                    {displayName[0]?.toUpperCase() || 'U'}
                  </span>
                )}
              </div>
              <h3 className="font-bold text-gray-900 dark:text-gray-100 text-base leading-tight flex items-center gap-1 justify-center">
                <span>{displayName}</span>
                {isVerifiedUser && (
                  <VerifiedBadge className="w-4 h-4 inline-block align-middle" showTooltip={false} />
                )}
              </h3>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{userEmail}</p>
              <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-purple-50 dark:bg-purple-950/50 text-[#9747FF] text-xs font-semibold mt-2.5">
                <span className="w-1.5 h-1.5 rounded-full bg-[#9747FF]"></span>
                {isCreator ? 'Creator Account' : 'Client Account'}
              </div>
            </div>
          </div>

          {/* Quick Platform Navigation Links */}
          <div className="pb-2">
            <div className="text-xs font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500 px-3 mb-2">
              Menu
            </div>
            <nav className="space-y-1">
              <a
                href="/home"
                className="flex items-center gap-3 px-3 py-2.5 rounded-xl font-medium text-sm text-gray-700 dark:text-gray-300 hover:text-[#9747FF] dark:hover:text-[#9747FF] hover:bg-gray-100/70 dark:hover:bg-white/[0.04] transition-colors"
              >
                <Sparkles className="w-4 h-4 text-gray-500 dark:text-gray-400" />
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
            </nav>
          </div>
        </aside>

        {/* =========================================================================
            CENTER COLUMN (lg:col-span-6, full width on mobile)
            Unified Profile & Settings: matches reference layout with MyArteLab branding
            NO RECTANGULAR CARDS: Continuous feed with ash-gray horizontal dividers
           ========================================================================= */}
        <main className="col-span-1 lg:col-span-6 w-full max-w-xl mx-auto flex flex-col pb-16">
          {/* SECTION A: Profile Identity (Centered Header) */}
          <div className="flex flex-col items-center text-center pt-2 pb-6 border-b border-[#DADDE1] dark:border-[#2f3032]">
            {/* Avatar with Camera Upload Trigger */}
            <div className="relative group mb-3">
              <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-full overflow-hidden bg-purple-50 dark:bg-purple-950/40 border-2 border-gray-200/80 dark:border-gray-700 shadow-2xs flex items-center justify-center">
                {currentUser?.avatar ? (
                  <img
                    src={getAvatarUrl(currentUser.avatar)}
                    alt={displayName}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <span className="text-[#9747FF] font-bold text-3xl">
                    {displayName[0]?.toUpperCase() || 'U'}
                  </span>
                )}
              </div>

              {/* Upload trigger overlay/badge */}
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={isLoading}
                title="Change profile picture"
                className="absolute bottom-0 right-0 w-8 h-8 rounded-full bg-[#9747FF] text-white flex items-center justify-center border-2 border-white dark:border-[#121212] shadow-xs hover:bg-[#8534f0] transition-colors cursor-pointer disabled:opacity-50"
                aria-label="Upload photo"
              >
                {isLoading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Camera className="w-4 h-4" />
                )}
              </button>

              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleAvatarUpload(file);
                }}
              />
            </div>

            {/* User Display Name + Verification Badge */}
            <h1 className="text-xl sm:text-2xl font-bold text-gray-950 dark:text-gray-50 flex items-center justify-center gap-1.5 leading-tight">
              <span>{displayName}</span>
              {isVerifiedUser && (
                <VerifiedBadge
                  className="w-5 h-5 inline-block align-middle"
                  expiresAt={currentUser?.verificationSubscription?.expiresAt}
                />
              )}
            </h1>

            {/* Email / Username */}
            <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 mt-1">{userEmail}</p>

            {/* Pill Edit Profile Action (Matches Reference) */}
            <button
              type="button"
              onClick={() => setIsEditProfileOpen(true)}
              className="mt-4 px-6 py-1.5 sm:py-2 rounded-full border border-[#9747FF] text-[#9747FF] hover:bg-[#9747FF]/10 font-semibold text-xs sm:text-sm transition-all duration-150 active:scale-98 cursor-pointer inline-flex items-center gap-1.5"
            >
              <span>Edit profile</span>
            </button>
          </div>

          {/* SECTION B: Settings (Matches Reference) */}
          <section className="py-5 border-b border-[#DADDE1] dark:border-[#2f3032]">
            <h2 className="text-sm font-bold text-gray-900 dark:text-gray-100 tracking-tight mb-2 px-1">
              Settings
            </h2>

            <div className="divide-y divide-[#DADDE1] dark:divide-[#2f3032]">
              {/* Theme Row */}
              <div className="flex items-center justify-between py-3.5 px-2">
                <div className="flex items-center gap-3.5 min-w-0">
                  <div className="w-9 h-9 rounded-full bg-purple-50 dark:bg-purple-950/50 text-[#9747FF] flex items-center justify-center shrink-0">
                    <Moon className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-sm font-medium text-gray-900 dark:text-gray-100">Theme</div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">
                      {isDark ? 'Dark theme' : 'Light theme'}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-gray-500 dark:text-gray-400 font-medium">
                    {isDark ? 'Dark' : 'Light'}
                  </span>
                  <Switch
                    checked={isDark}
                    onCheckedChange={(checked) => {
                      setTheme(checked ? 'dark' : 'light');
                      toast.info(checked ? 'Dark theme activated' : 'Light theme activated');
                    }}
                  />
                </div>
              </div>

              {/* Notifications Row */}
              <button
                type="button"
                onClick={() => setIsNotificationsModalOpen(true)}
                className="w-full flex items-center justify-between py-3.5 px-2 hover:bg-gray-100/60 dark:hover:bg-white/[0.04] rounded-xl transition-colors cursor-pointer text-left group"
              >
                <div className="flex items-center gap-3.5 min-w-0">
                  <div className="w-9 h-9 rounded-full bg-purple-50 dark:bg-purple-950/50 text-[#9747FF] flex items-center justify-center shrink-0">
                    <Bell className="w-4 h-4" />
                  </div>
                  <span className="text-sm font-medium text-gray-900 dark:text-gray-100 group-hover:text-[#9747FF] transition-colors truncate">
                    Notifications
                  </span>
                </div>
                <div className="flex items-center gap-1.5 shrink-0 ml-2">
                  <span className="text-xs text-gray-500 dark:text-gray-400 font-medium">
                    {notifications.email || notifications.push ? 'Enabled' : 'Disabled'}
                  </span>
                  <ChevronRight className="w-4 h-4 text-gray-400 dark:text-gray-500 group-hover:text-gray-700 dark:group-hover:text-gray-200 transition-colors" />
                </div>
              </button>

              {/* Security & Password Row */}
              <button
                type="button"
                onClick={() => setIsPasswordDialogOpen(true)}
                className="w-full flex items-center justify-between py-3.5 px-2 hover:bg-gray-100/60 dark:hover:bg-white/[0.04] rounded-xl transition-colors cursor-pointer text-left group"
              >
                <div className="flex items-center gap-3.5 min-w-0">
                  <div className="w-9 h-9 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 flex items-center justify-center shrink-0">
                    <Lock className="w-4 h-4" />
                  </div>
                  <span className="text-sm font-medium text-gray-900 dark:text-gray-100 group-hover:text-[#9747FF] transition-colors truncate">
                    Security &amp; Password
                  </span>
                </div>
                <ChevronRight className="w-4 h-4 text-gray-400 dark:text-gray-500 group-hover:text-gray-700 dark:group-hover:text-gray-200 transition-colors shrink-0 ml-2" />
              </button>

              {/* Privacy Row */}
              <button
                type="button"
                onClick={() => setIsPrivacyModalOpen(true)}
                className="w-full flex items-center justify-between py-3.5 px-2 hover:bg-gray-100/60 dark:hover:bg-white/[0.04] rounded-xl transition-colors cursor-pointer text-left group"
              >
                <div className="flex items-center gap-3.5 min-w-0">
                  <div className="w-9 h-9 rounded-full bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                    <Shield className="w-4 h-4" />
                  </div>
                  <span className="text-sm font-medium text-gray-900 dark:text-gray-100 group-hover:text-[#9747FF] transition-colors truncate">
                    Privacy Preferences
                  </span>
                </div>
                <ChevronRight className="w-4 h-4 text-gray-400 dark:text-gray-500 group-hover:text-gray-700 dark:group-hover:text-gray-200 transition-colors shrink-0 ml-2" />
              </button>

              {/* Contact Support Row */}
              <a
                href="mailto:support@myartelab.com"
                className="flex items-center justify-between py-3.5 px-2 hover:bg-gray-100/60 dark:hover:bg-white/[0.04] rounded-xl transition-colors cursor-pointer group"
              >
                <div className="flex items-center gap-3.5 min-w-0">
                  <div className="w-9 h-9 rounded-full bg-amber-50 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
                    <HelpCircle className="w-4 h-4" />
                  </div>
                  <div className="min-w-0">
                    <span className="text-sm font-medium text-gray-900 dark:text-gray-100 group-hover:text-[#9747FF] transition-colors truncate">
                      Contact support
                    </span>
                    <div className="text-xs text-gray-500 dark:text-gray-400">support@myartelab.com</div>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-gray-400 dark:text-gray-500 group-hover:text-gray-700 dark:group-hover:text-gray-200 transition-colors shrink-0 ml-2" />
              </a>
            </div>
          </section>

          {/* SECTION C: Creator Studio / Client Section */}
          <section className="py-5 border-b border-[#DADDE1] dark:border-[#2f3032]">
            <h2 className="text-sm font-bold text-gray-900 dark:text-gray-100 tracking-tight mb-2 px-1">
              {isCreator ? 'Creator Studio' : 'Client Account'}
            </h2>

            <div className="divide-y divide-[#DADDE1] dark:divide-[#2f3032]">
              {isCreator ? (
                <>
                  {/* View Public Creator Profile */}
                  <a
                    href={`/creator/${currentUser?.id}`}
                    className="flex items-center justify-between py-3.5 px-2 hover:bg-gray-100/60 dark:hover:bg-white/[0.04] rounded-xl transition-colors cursor-pointer group"
                  >
                    <div className="flex items-center gap-3.5 min-w-0">
                      <div className="w-9 h-9 rounded-full bg-purple-50 dark:bg-purple-950/50 text-[#9747FF] flex items-center justify-center shrink-0">
                        <User className="w-4 h-4" />
                      </div>
                      <div className="min-w-0">
                        <div className="text-sm font-medium text-gray-900 dark:text-gray-100 group-hover:text-[#9747FF] transition-colors truncate">
                          View Public Profile
                        </div>
                        <div className="text-xs text-gray-500 dark:text-gray-400 truncate">
                          See your portfolio and services as clients see them
                        </div>
                      </div>
                    </div>
                    <ExternalLink className="w-4 h-4 text-gray-400 dark:text-gray-500 group-hover:text-[#9747FF] transition-colors shrink-0 ml-2" />
                  </a>

                  {/* My Bookings & Client Requests */}
                  <a
                    href="/bookings"
                    className="flex items-center justify-between py-3.5 px-2 hover:bg-gray-100/60 dark:hover:bg-white/[0.04] rounded-xl transition-colors cursor-pointer group"
                  >
                    <div className="flex items-center gap-3.5 min-w-0">
                      <div className="w-9 h-9 rounded-full bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
                        <Calendar className="w-4 h-4" />
                      </div>
                      <div className="min-w-0">
                        <div className="text-sm font-medium text-gray-900 dark:text-gray-100 group-hover:text-[#9747FF] transition-colors truncate">
                          My Bookings &amp; Orders
                        </div>
                        <div className="text-xs text-gray-500 dark:text-gray-400 truncate">
                          Manage milestones, deliverables and active contracts
                        </div>
                      </div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-gray-400 dark:text-gray-500 group-hover:text-gray-700 dark:group-hover:text-gray-200 transition-colors shrink-0 ml-2" />
                  </a>

                  {/* Verification Status */}
                  <div className="flex items-center justify-between py-3.5 px-2">
                    <div className="flex items-center gap-3.5 min-w-0">
                      <div className="w-9 h-9 rounded-full bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                        <CheckCircle2 className="w-4 h-4" />
                      </div>
                      <div className="min-w-0">
                        <div className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                          Creator Verification
                        </div>
                        <div className="text-xs text-gray-500 dark:text-gray-400 truncate">
                          {isVerifiedUser
                            ? 'Verified creator status active'
                            : 'Standard creator membership'}
                        </div>
                      </div>
                    </div>
                    {isVerifiedUser ? (
                      <VerifiedBadge
                        className="w-5 h-5 shrink-0 ml-2"
                        expiresAt={currentUser?.verificationSubscription?.expiresAt}
                      />
                    ) : (
                      <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 px-2 py-0.5 rounded-full bg-gray-100 dark:bg-gray-800 shrink-0 ml-2">
                        Standard
                      </span>
                    )}
                  </div>
                </>
              ) : (
                <>
                  {/* Client Bookings */}
                  <a
                    href="/bookings"
                    className="flex items-center justify-between py-3.5 px-2 hover:bg-gray-100/60 dark:hover:bg-white/[0.04] rounded-xl transition-colors cursor-pointer group"
                  >
                    <div className="flex items-center gap-3.5 min-w-0">
                      <div className="w-9 h-9 rounded-full bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
                        <Calendar className="w-4 h-4" />
                      </div>
                      <div className="min-w-0">
                        <div className="text-sm font-medium text-gray-900 dark:text-gray-100 group-hover:text-[#9747FF] transition-colors truncate">
                          My Bookings &amp; Orders
                        </div>
                        <div className="text-xs text-gray-500 dark:text-gray-400 truncate">
                          Track your hired creators and active contracts
                        </div>
                      </div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-gray-400 dark:text-gray-500 group-hover:text-gray-700 dark:group-hover:text-gray-200 transition-colors shrink-0 ml-2" />
                  </a>

                  {/* Browse Creators */}
                  <a
                    href="/creators"
                    className="flex items-center justify-between py-3.5 px-2 hover:bg-gray-100/60 dark:hover:bg-white/[0.04] rounded-xl transition-colors cursor-pointer group"
                  >
                    <div className="flex items-center gap-3.5 min-w-0">
                      <div className="w-9 h-9 rounded-full bg-purple-50 dark:bg-purple-950/50 text-[#9747FF] flex items-center justify-center shrink-0">
                        <Users className="w-4 h-4" />
                      </div>
                      <div className="min-w-0">
                        <div className="text-sm font-medium text-gray-900 dark:text-gray-100 group-hover:text-[#9747FF] transition-colors truncate">
                          Explore Creators
                        </div>
                        <div className="text-xs text-gray-500 dark:text-gray-400 truncate">
                          Discover top African creatives and book services
                        </div>
                      </div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-gray-400 dark:text-gray-500 group-hover:text-gray-700 dark:group-hover:text-gray-200 transition-colors shrink-0 ml-2" />
                  </a>

                  {/* Become a Creator */}
                  <button
                    type="button"
                    onClick={() => setIsBecomeCreatorOpen(true)}
                    className="w-full flex items-center justify-between py-3.5 px-2 hover:bg-gray-100/60 dark:hover:bg-white/[0.04] rounded-xl transition-colors cursor-pointer text-left group"
                  >
                    <div className="flex items-center gap-3.5 min-w-0">
                      <div className="w-9 h-9 rounded-full bg-amber-50 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
                        <Sparkles className="w-4 h-4" />
                      </div>
                      <div className="min-w-0">
                        <div className="text-sm font-medium text-gray-900 dark:text-gray-100 group-hover:text-[#9747FF] transition-colors truncate">
                          Become a Creator
                        </div>
                        <div className="text-xs text-gray-500 dark:text-gray-400 truncate">
                          Start selling your creative services on MyArteLab
                        </div>
                      </div>
                    </div>
                    <span className="text-xs font-semibold text-[#9747FF] group-hover:underline shrink-0 ml-2">
                      Join
                    </span>
                  </button>
                </>
              )}
            </div>
          </section>

          {/* SECTION D: Account Session / Logout */}
          <section className="py-4">
            <button
              type="button"
              onClick={() => setIsLogoutDialogOpen(true)}
              className="w-full flex items-center justify-between py-3.5 px-2 hover:bg-red-50/70 dark:hover:bg-red-950/30 rounded-xl transition-colors cursor-pointer text-left group"
            >
              <div className="flex items-center gap-3.5 min-w-0">
                <div className="w-9 h-9 rounded-full bg-red-50 dark:bg-red-950/50 text-red-600 dark:text-red-400 flex items-center justify-center shrink-0">
                  <LogOut className="w-4 h-4" />
                </div>
                <span className="text-sm font-medium text-red-600 dark:text-red-400 transition-colors">
                  Log Out
                </span>
              </div>
              <ChevronRight className="w-4 h-4 text-red-300 dark:text-red-500 group-hover:text-red-500 dark:group-hover:text-red-400 transition-colors shrink-0 ml-2" />
            </button>
          </section>

          {/* SECTION E: User's Own Creative Work / Posts */}
          <section className="py-5 border-t border-[#DADDE1] dark:border-[#2f3032]">
            <div className="flex items-center justify-between pb-3 px-1">
              <h2 className="text-sm font-bold text-gray-900 dark:text-gray-100 tracking-tight">
                {isCreator ? 'My Creative Work' : 'My Posts'}
              </h2>
              <span className="text-xs text-gray-500 dark:text-gray-400 font-medium">
                {myPosts.length} {myPosts.length === 1 ? 'post' : 'posts'}
              </span>
            </div>

            {isLoadingPosts ? (
              <div className="py-12 flex justify-center items-center">
                <Loader2 className="w-5 h-5 animate-spin text-[#9747FF]" />
              </div>
            ) : myPosts.length === 0 ? (
              <div className="py-8 px-4 text-center text-gray-500 dark:text-gray-400 text-xs">
                <p className="font-semibold text-gray-700 dark:text-gray-300">No creative work published yet.</p>
                {isCreator ? (
                  <Button
                    onClick={() => (window.location.href = '/home')}
                    className="mt-3 bg-[#9747FF] hover:bg-[#8534f0] text-white text-xs rounded-full px-5 h-8 font-semibold shadow-2xs cursor-pointer"
                  >
                    Create a Post on Home Feed
                  </Button>
                ) : (
                  <p className="mt-1 text-gray-400 dark:text-gray-500">Your published content will appear here.</p>
                )}
              </div>
            ) : (
              <div className="divide-y divide-[#DADDE1] dark:divide-[#2f3032] -mx-3 sm:mx-0">
                {myPosts.map((post) => (
                  <SocialFeedCard
                    key={post._id}
                    post={post}
                    onPostUpdated={handlePostUpdated}
                  />
                ))}
              </div>
            )}
          </section>
        </main>

        {/* =========================================================================
            RIGHT COLUMN (lg:col-span-3, hidden on mobile)
            Account Status & Support Information (Quiet, borderless, ash-gray dividers)
           ========================================================================= */}
        <aside className="hidden lg:flex flex-col gap-6 lg:col-span-3 sticky top-20">
          <div className="pb-4">
            <div className="pb-2.5 border-b border-[#DADDE1] dark:border-[#2f3032] mb-3.5">
              <h4 className="font-bold text-sm text-gray-900 dark:text-gray-100 tracking-tight">
                Account Summary
              </h4>
            </div>

            <div className="space-y-3.5 text-xs text-gray-600 dark:text-gray-300">
              <div className="flex items-center justify-between py-1">
                <span className="text-gray-500 dark:text-gray-400">Account Type</span>
                <span className="font-semibold text-gray-900 dark:text-gray-100 capitalize">
                  {currentUser?.role || 'Member'}
                </span>
              </div>

              <div className="flex items-center justify-between py-1">
                <span className="text-gray-500 dark:text-gray-400">Security</span>
                <span className="font-semibold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  Protected
                </span>
              </div>

              <div className="flex items-center justify-between py-1">
                <span className="text-gray-500 dark:text-gray-400">Verification</span>
                <span className="font-semibold text-gray-900 dark:text-gray-100">
                  {isVerifiedUser ? 'Verified' : 'Standard'}
                </span>
              </div>

              {currentUser?.createdAt && (
                <div className="flex items-center justify-between py-1">
                  <span className="text-gray-500 dark:text-gray-400">Member Since</span>
                  <span className="font-semibold text-gray-900 dark:text-gray-100">
                    {new Date(currentUser.createdAt).toLocaleDateString('en-US', {
                      month: 'short',
                      year: 'numeric',
                    })}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Need help support section */}
          <div className="pt-2 pb-4 border-t border-[#DADDE1] dark:border-[#2f3032]">
            <div className="flex items-center gap-2 mb-2 text-gray-900 dark:text-gray-100 font-semibold text-xs">
              <HelpCircle className="w-4 h-4 text-[#9747FF]" />
              <span>Need Assistance?</span>
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed mb-3">
              Have questions about your account, creator verification, or payouts?
            </p>
            <a
              href="mailto:support@myartelab.com"
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#9747FF] hover:underline"
            >
              <span>Email Support Team</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </a>
          </div>
        </aside>
      </div>

      {/* =========================================================================
          INTERACTIVE SETTINGS POPUPS
          Responsive: Mobile Bottom Drawer (Drawer) vs Desktop Modal (Dialog)
          No rectangular cards: subtle ash-gray horizontal dividers
         ========================================================================= */}

      {/* 1. Edit Profile Popup */}
      <SettingsSheetModal
        isOpen={isEditProfileOpen}
        onClose={() => setIsEditProfileOpen(false)}
        title="Edit Profile"
        description="Update your public display name, personal bio, skills, and contact details."
        maxWidth="sm:max-w-lg"
        footer={
          <div className="flex items-center justify-end gap-2.5">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsEditProfileOpen(false)}
              className="text-xs h-9 px-4 rounded-xl cursor-pointer dark:border-gray-700 dark:text-gray-200"
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={handleSaveProfile}
              disabled={isSaving}
              className="bg-[#9747FF] hover:bg-[#8534f0] text-white font-semibold text-xs h-9 px-5 rounded-xl shadow-xs cursor-pointer"
            >
              {isSaving ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                'Save Changes'
              )}
            </Button>
          </div>
        }
      >
        <div className="space-y-4">
          {/* Avatar Row */}
          <div className="flex items-center gap-4 pb-4 border-b border-[#DADDE1] dark:border-[#2f3032]">
            <div className="relative">
              <div className="w-16 h-16 rounded-full overflow-hidden bg-purple-50 dark:bg-purple-950/40 border border-gray-200 dark:border-gray-700">
                <img
                  src={getAvatarUrl(profileForm.avatar)}
                  alt="Preview"
                  className="w-full h-full object-cover"
                />
              </div>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={isLoading}
                className="absolute bottom-0 right-0 w-6 h-6 rounded-full bg-[#9747FF] text-white flex items-center justify-center border border-white dark:border-[#1a1b1c] hover:bg-[#8534f0] transition-colors cursor-pointer"
              >
                {isLoading ? (
                  <Loader2 className="w-3 h-3 animate-spin" />
                ) : (
                  <Camera className="w-3 h-3" />
                )}
              </button>
            </div>
            <div>
              <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">Profile Picture</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">JPG, PNG or GIF. Max 2MB.</p>
            </div>
          </div>

          {/* Names */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="edit-firstName" className="text-xs font-medium text-gray-700 dark:text-gray-300">
                First Name
              </Label>
              <Input
                id="edit-firstName"
                value={profileForm.firstName}
                onChange={(e) =>
                  setProfileForm((prev) => ({ ...prev, firstName: e.target.value }))
                }
                placeholder="First name"
                className="focus-visible:ring-[#9747FF] dark:bg-[#121212] dark:border-gray-800 dark:text-gray-100"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="edit-lastName" className="text-xs font-medium text-gray-700 dark:text-gray-300">
                Last Name
              </Label>
              <Input
                id="edit-lastName"
                value={profileForm.lastName}
                onChange={(e) =>
                  setProfileForm((prev) => ({ ...prev, lastName: e.target.value }))
                }
                placeholder="Last name"
                className="focus-visible:ring-[#9747FF] dark:bg-[#121212] dark:border-gray-800 dark:text-gray-100"
              />
            </div>
          </div>

          {/* Email (Read only) & Phone */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="edit-email" className="text-xs font-medium text-gray-700 dark:text-gray-300">
                Email
              </Label>
              <Input
                id="edit-email"
                value={profileForm.email}
                disabled
                className="bg-gray-50 dark:bg-gray-800/50 text-gray-500 dark:text-gray-400 cursor-not-allowed dark:border-gray-800"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="edit-phone" className="text-xs font-medium text-gray-700 dark:text-gray-300">
                Phone Number
              </Label>
              <Input
                id="edit-phone"
                value={profileForm.phoneNumber}
                onChange={(e) =>
                  setProfileForm((prev) => ({ ...prev, phoneNumber: e.target.value }))
                }
                placeholder="+1 (555) 000-0000"
                className="focus-visible:ring-[#9747FF] dark:bg-[#121212] dark:border-gray-800 dark:text-gray-100"
              />
            </div>
          </div>

          {/* Location */}
          <div className="space-y-1.5">
            <Label className="text-xs font-medium text-gray-700 dark:text-gray-300">Location</Label>
            <div className="grid grid-cols-3 gap-2">
              <Input
                placeholder="City / Area"
                value={profileForm.localArea}
                onChange={(e) =>
                  setProfileForm((prev) => ({ ...prev, localArea: e.target.value }))
                }
                className="focus-visible:ring-[#9747FF] dark:bg-[#121212] dark:border-gray-800 dark:text-gray-100"
              />
              <Input
                placeholder="State"
                value={profileForm.state}
                onChange={(e) => setProfileForm((prev) => ({ ...prev, state: e.target.value }))}
                className="focus-visible:ring-[#9747FF] dark:bg-[#121212] dark:border-gray-800 dark:text-gray-100"
              />
              <Input
                placeholder="Country"
                value={profileForm.country}
                onChange={(e) =>
                  setProfileForm((prev) => ({ ...prev, country: e.target.value }))
                }
                className="focus-visible:ring-[#9747FF] dark:bg-[#121212] dark:border-gray-800 dark:text-gray-100"
              />
            </div>
          </div>

          {/* Bio */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label htmlFor="edit-bio" className="text-xs font-medium text-gray-700 dark:text-gray-300">
                Bio
              </Label>
              <span className="text-[11px] text-gray-400 dark:text-gray-500">{profileForm.bio.length}/500</span>
            </div>
            <textarea
              id="edit-bio"
              value={profileForm.bio}
              onChange={(e) => setProfileForm((prev) => ({ ...prev, bio: e.target.value }))}
              className="w-full min-h-[90px] px-3 py-2 border border-gray-200 dark:border-gray-700 bg-white dark:bg-[#121212] text-gray-900 dark:text-gray-100 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#9747FF]/20 focus:border-[#9747FF] transition-all"
              placeholder="Share a short bio about your creative expertise and background..."
              maxLength={500}
            />
          </div>

          {/* Skills */}
          <div className="space-y-1.5">
            <Label htmlFor="edit-skills" className="text-xs font-medium text-gray-700 dark:text-gray-300">
              Skills (comma separated)
            </Label>
            <Input
              id="edit-skills"
              value={profileForm.skills.join(', ')}
              onChange={(e) => handleSkillsChange(e.target.value)}
              placeholder="e.g. Digital Art, Branding, 3D Design, Photography"
              className="focus-visible:ring-[#9747FF] dark:bg-[#121212] dark:border-gray-800 dark:text-gray-100"
            />
          </div>
        </div>
      </SettingsSheetModal>

      {/* 2. Change Password Popup */}
      <SettingsSheetModal
        isOpen={isPasswordDialogOpen}
        onClose={() => setIsPasswordDialogOpen(false)}
        title="Change Password"
        description="Ensure your account is using a strong password with letters, numbers, and symbols."
        maxWidth="sm:max-w-md"
        footer={
          <div className="flex items-center justify-end gap-2.5">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsPasswordDialogOpen(false)}
              className="text-xs h-9 px-4 rounded-xl cursor-pointer dark:border-gray-700 dark:text-gray-200"
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={handleChangePassword}
              disabled={isLoading}
              className="bg-[#9747FF] hover:bg-[#8534f0] text-white font-semibold text-xs h-9 px-5 rounded-xl shadow-xs cursor-pointer"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 mr-2 animate-spin" />
                  Updating...
                </>
              ) : (
                'Change Password'
              )}
            </Button>
          </div>
        }
      >
        <div className="space-y-3.5">
          <div className="space-y-1.5">
            <Label className="text-xs font-medium text-gray-700 dark:text-gray-300">Current Password</Label>
            <Input
              type="password"
              value={passwordForm.currentPassword}
              onChange={(e) =>
                setPasswordForm((prev) => ({ ...prev, currentPassword: e.target.value }))
              }
              placeholder="Enter current password"
              className="focus-visible:ring-[#9747FF] dark:bg-[#121212] dark:border-gray-800 dark:text-gray-100"
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-medium text-gray-700 dark:text-gray-300">New Password</Label>
            <Input
              type="password"
              value={passwordForm.newPassword}
              onChange={(e) =>
                setPasswordForm((prev) => ({ ...prev, newPassword: e.target.value }))
              }
              placeholder="Enter new password"
              className="focus-visible:ring-[#9747FF] dark:bg-[#121212] dark:border-gray-800 dark:text-gray-100"
            />
            <p className="text-[11px] text-gray-500 dark:text-gray-400">
              Minimum 8 characters with at least one uppercase and one lowercase letter.
            </p>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-medium text-gray-700 dark:text-gray-300">Confirm New Password</Label>
            <Input
              type="password"
              value={passwordForm.confirmPassword}
              onChange={(e) =>
                setPasswordForm((prev) => ({ ...prev, confirmPassword: e.target.value }))
              }
              placeholder="Confirm new password"
              className="focus-visible:ring-[#9747FF] dark:bg-[#121212] dark:border-gray-800 dark:text-gray-100"
            />
          </div>
        </div>
      </SettingsSheetModal>

      {/* 3. Notification Preferences Popup */}
      <SettingsSheetModal
        isOpen={isNotificationsModalOpen}
        onClose={() => setIsNotificationsModalOpen(false)}
        title="Notification Preferences"
        description="Select how and when you want to receive updates from MyArteLab."
        maxWidth="sm:max-w-md"
        footer={
          <div className="flex justify-end">
            <Button
              type="button"
              onClick={() => {
                toast.success('Notification preferences updated');
                setIsNotificationsModalOpen(false);
              }}
              className="bg-[#9747FF] hover:bg-[#8534f0] text-white font-semibold text-xs h-9 px-5 rounded-xl shadow-xs cursor-pointer"
            >
              Done
            </Button>
          </div>
        }
      >
        <div className="divide-y divide-[#DADDE1] dark:divide-[#2f3032]">
          <div className="flex items-center justify-between py-3">
            <div>
              <p className="text-sm font-medium text-gray-900 dark:text-gray-100">Email Notifications</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">Get booking updates &amp; messages via email</p>
            </div>
            <Switch
              checked={notifications.email}
              onCheckedChange={(checked) =>
                setNotifications((prev) => ({ ...prev, email: checked }))
              }
            />
          </div>

          <div className="flex items-center justify-between py-3">
            <div>
              <p className="text-sm font-medium text-gray-900 dark:text-gray-100">Push Notifications</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">Real-time alerts on your device</p>
            </div>
            <Switch
              checked={notifications.push}
              onCheckedChange={(checked) =>
                setNotifications((prev) => ({ ...prev, push: checked }))
              }
            />
          </div>

          <div className="flex items-center justify-between py-3">
            <div>
              <p className="text-sm font-medium text-gray-900 dark:text-gray-100">SMS Alerts</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">Important security &amp; payment alerts</p>
            </div>
            <Switch
              checked={notifications.sms}
              onCheckedChange={(checked) =>
                setNotifications((prev) => ({ ...prev, sms: checked }))
              }
            />
          </div>

          <div className="flex items-center justify-between py-3">
            <div>
              <p className="text-sm font-medium text-gray-900 dark:text-gray-100">Marketing &amp; Discoveries</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">Promotional creator spotlights &amp; newsletters</p>
            </div>
            <Switch
              checked={notifications.marketing}
              onCheckedChange={(checked) =>
                setNotifications((prev) => ({ ...prev, marketing: checked }))
              }
            />
          </div>
        </div>
      </SettingsSheetModal>

      {/* 4. Privacy Preferences Popup */}
      <SettingsSheetModal
        isOpen={isPrivacyModalOpen}
        onClose={() => setIsPrivacyModalOpen(false)}
        title="Privacy Preferences"
        description="Manage your visibility and messaging access across the creative marketplace."
        maxWidth="sm:max-w-md"
        footer={
          <div className="flex items-center justify-end gap-2.5">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsPrivacyModalOpen(false)}
              className="text-xs h-9 px-4 rounded-xl cursor-pointer dark:border-gray-700 dark:text-gray-200"
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={handleSavePrivacy}
              disabled={isSaving}
              className="bg-[#9747FF] hover:bg-[#8534f0] text-white font-semibold text-xs h-9 px-5 rounded-xl shadow-xs cursor-pointer"
            >
              {isSaving ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                'Save Privacy Settings'
              )}
            </Button>
          </div>
        }
      >
        <div className="divide-y divide-[#DADDE1] dark:divide-[#2f3032]">
          <div className="flex items-center justify-between py-3">
            <div>
              <p className="text-sm font-medium text-gray-900 dark:text-gray-100">Public Profile</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">Make your profile visible in search &amp; discovery</p>
            </div>
            <Switch
              checked={privacy.publicProfile}
              onCheckedChange={(checked) =>
                setPrivacy((prev) => ({ ...prev, publicProfile: checked }))
              }
            />
          </div>

          <div className="flex items-center justify-between py-3">
            <div>
              <p className="text-sm font-medium text-gray-900 dark:text-gray-100">Activity Status</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">Show when you are actively on MyArteLab</p>
            </div>
            <Switch
              checked={privacy.showActivity}
              onCheckedChange={(checked) =>
                setPrivacy((prev) => ({ ...prev, showActivity: checked }))
              }
            />
          </div>

          <div className="flex items-center justify-between py-3">
            <div>
              <p className="text-sm font-medium text-gray-900 dark:text-gray-100">Direct Messages</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">Allow other verified users to message you</p>
            </div>
            <Switch
              checked={privacy.allowMessages}
              onCheckedChange={(checked) =>
                setPrivacy((prev) => ({ ...prev, allowMessages: checked }))
              }
            />
          </div>
        </div>
      </SettingsSheetModal>

      {/* 5. Become a Creator Popup (For Clients) */}
      <SettingsSheetModal
        isOpen={isBecomeCreatorOpen}
        onClose={() => setIsBecomeCreatorOpen(false)}
        title="Become a Verified Creator"
        description="Join Africa's leading creative marketplace to showcase your portfolio, reach clients, and get paid securely."
        maxWidth="sm:max-w-md"
        footer={
          <div className="flex items-center justify-end gap-2.5">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsBecomeCreatorOpen(false)}
              className="text-xs h-9 px-4 rounded-xl cursor-pointer dark:border-gray-700 dark:text-gray-200"
            >
              Later
            </Button>
            <Button
              type="button"
              onClick={() => {
                setIsBecomeCreatorOpen(false);
                window.location.href = '/register?role=creator';
              }}
              className="bg-[#9747FF] hover:bg-[#8534f0] text-white font-semibold text-xs h-9 px-5 rounded-xl shadow-xs cursor-pointer"
            >
              Apply as Creator
            </Button>
          </div>
        }
      >
        <div className="space-y-3.5 py-1 text-xs text-gray-600 dark:text-gray-300">
          <div className="flex items-start gap-3">
            <CheckCircle2 className="w-4 h-4 text-[#9747FF] shrink-0 mt-0.5" />
            <span className="leading-relaxed">
              Publish artwork, audio, and stories directly to the community feed.
            </span>
          </div>
          <div className="flex items-start gap-3">
            <CheckCircle2 className="w-4 h-4 text-[#9747FF] shrink-0 mt-0.5" />
            <span className="leading-relaxed">
              Offer custom creative packages and receive client booking requests.
            </span>
          </div>
          <div className="flex items-start gap-3">
            <CheckCircle2 className="w-4 h-4 text-[#9747FF] shrink-0 mt-0.5" />
            <span className="leading-relaxed">
              Non-custodial instant payouts in USDC / USDT directly to your wallet.
            </span>
          </div>
        </div>
      </SettingsSheetModal>

      {/* 6. Confirm Logout Popup */}
      <SettingsSheetModal
        isOpen={isLogoutDialogOpen}
        onClose={() => setIsLogoutDialogOpen(false)}
        title="Sign Out"
        description="Are you sure you want to log out of your MyArteLab account?"
        maxWidth="sm:max-w-sm"
        footer={
          <div className="flex items-center justify-end gap-2.5">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsLogoutDialogOpen(false)}
              className="text-xs h-9 px-4 rounded-xl cursor-pointer dark:border-gray-700 dark:text-gray-200"
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={handleLogout}
              className="bg-red-600 hover:bg-red-700 text-white font-semibold text-xs h-9 px-5 rounded-xl shadow-xs cursor-pointer"
            >
              Log Out
            </Button>
          </div>
        }
      >
        <div className="py-2 text-xs text-gray-500 dark:text-gray-400 leading-relaxed">
          You will need to sign in again to access your account, creator dashboard, and messages.
        </div>
      </SettingsSheetModal>
    </div>
  );
}

// Also export as Profile for alias compatibility
export const Profile = Settings;
export default Settings;
