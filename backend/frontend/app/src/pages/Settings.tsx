import { useState, useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { useAuth, api } from '@/contexts/AuthContext';
import { walletService } from '@/lib/api';
import { getAvatarUrl } from '@/lib/imageUrl';
import { toast } from '@/components/ui/sonner';
import { VerifiedBadge } from '@/components/shared/VerifiedBadge';
import { RescueTokenModal } from '@/components/wallet/RescueTokenModal';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import {
  User,
  Bell,
  Shield,
  Moon,
  Globe,
  Camera,
  Loader2,
  Lock,
  Wallet,
  Copy,
  Check,
  ChevronRight,
  Sparkles,
  Compass,
  Users,
  Calendar,
  LogOut,
  HelpCircle,
  ExternalLink,
  ChevronDown,
  CheckCircle2,
} from 'lucide-react';
import { cn } from '@/lib/utils';

export function Settings() {
  const { user: currentUser, updateUser, logout } = useAuth();
  const [searchParams] = useSearchParams();
  const tabParam = searchParams.get('tab');

  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Dialog states for interactive settings
  const [isEditProfileOpen, setIsEditProfileOpen] = useState(false);
  const [isPasswordDialogOpen, setIsPasswordDialogOpen] = useState(false);
  const [isNotificationsModalOpen, setIsNotificationsModalOpen] = useState(false);
  const [isPrivacyModalOpen, setIsPrivacyModalOpen] = useState(false);
  const [isLanguageModalOpen, setIsLanguageModalOpen] = useState(false);
  const [isBecomeCreatorOpen, setIsBecomeCreatorOpen] = useState(false);
  const [isLogoutDialogOpen, setIsLogoutDialogOpen] = useState(false);

  // Deposit addresses expandable toggle
  const [showDepositAddresses, setShowDepositAddresses] = useState(false);

  // Wallet and Token Recovery state
  const [isRescueModalOpen, setIsRescueModalOpen] = useState(false);
  const [walletDetails, setWalletDetails] = useState<{
    solanaAddress: string | null;
    evmAddress: string | null;
    switchWalletId: string | null;
    isLoading: boolean;
  }>({
    solanaAddress: null,
    evmAddress: null,
    switchWalletId: null,
    isLoading: false,
  });
  const [copiedAddress, setCopiedAddress] = useState<string | null>(null);

  // Theme & Language state
  const [selectedLanguage, setSelectedLanguage] = useState('English');
  const [isDarkMode, setIsDarkMode] = useState(false);

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
      setShowDepositAddresses(true);
      const el = document.getElementById('section-payment');
      if (el) el.scrollIntoView({ behavior: 'smooth' });
    } else if (tabParam === 'profile') {
      setIsEditProfileOpen(true);
    } else if (tabParam === 'notifications') {
      setIsNotificationsModalOpen(true);
    } else if (tabParam === 'privacy') {
      setIsPrivacyModalOpen(true);
    }
  }, [tabParam]);

  // Load wallet data
  useEffect(() => {
    let isMounted = true;
    const loadWallet = async () => {
      try {
        setWalletDetails((prev) => ({ ...prev, isLoading: true }));
        const res = await walletService.getWallet();
        const w = res.data?.data?.wallet;
        if (isMounted && w) {
          setWalletDetails({
            solanaAddress: w.solanaAddress || null,
            evmAddress: w.evmAddress || null,
            switchWalletId: w.switchWalletId || null,
            isLoading: false,
          });
        }
      } catch {
        if (isMounted) {
          setWalletDetails((prev) => ({ ...prev, isLoading: false }));
        }
      }
    };
    loadWallet();
    return () => {
      isMounted = false;
    };
  }, []);

  const copyToClipboard = (text: string, label: string) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopiedAddress(label);
    toast.success(`${label} copied to clipboard`);
    setTimeout(() => setCopiedAddress(null), 2000);
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
              <h3 className="font-bold text-gray-900 text-base leading-tight flex items-center gap-1 justify-center">
                <span>{displayName}</span>
                {isVerifiedUser && (
                  <VerifiedBadge className="w-4 h-4 inline-block align-middle" showTooltip={false} />
                )}
              </h3>
              <p className="text-xs text-gray-500 mt-0.5">{userEmail}</p>
              <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-purple-50 text-[#9747FF] text-xs font-semibold mt-2.5">
                <span className="w-1.5 h-1.5 rounded-full bg-[#9747FF]"></span>
                {isCreator ? 'Creator Account' : 'Client Account'}
              </div>
            </div>
          </div>

          {/* Quick Platform Navigation Links */}
          <div className="pb-2">
            <div className="text-xs font-semibold uppercase tracking-wider text-gray-400 px-3 mb-2">
              Menu
            </div>
            <nav className="space-y-1">
              <a
                href="/home"
                className="flex items-center gap-3 px-3 py-2.5 rounded-xl font-medium text-sm text-gray-700 hover:text-[#9747FF] hover:bg-gray-100/70 transition-colors"
              >
                <Sparkles className="w-4 h-4 text-gray-500" />
                <span>Creative Feed</span>
              </a>

              <a
                href="/discover"
                className="flex items-center gap-3 px-3 py-2.5 rounded-xl font-medium text-sm text-gray-700 hover:text-[#9747FF] hover:bg-gray-100/70 transition-colors"
              >
                <Compass className="w-4 h-4 text-gray-500" />
                <span>Discover Creators</span>
              </a>

              <a
                href="/creators"
                className="flex items-center gap-3 px-3 py-2.5 rounded-xl font-medium text-sm text-gray-700 hover:text-[#9747FF] hover:bg-gray-100/70 transition-colors"
              >
                <Users className="w-4 h-4 text-gray-500" />
                <span>Browse All</span>
              </a>

              <a
                href="/bookings"
                className="flex items-center gap-3 px-3 py-2.5 rounded-xl font-medium text-sm text-gray-700 hover:text-[#9747FF] hover:bg-gray-100/70 transition-colors"
              >
                <Calendar className="w-4 h-4 text-gray-500" />
                <span>My Bookings</span>
              </a>

              <a
                href="/wallet"
                className="flex items-center gap-3 px-3 py-2.5 rounded-xl font-medium text-sm text-gray-700 hover:text-[#9747FF] hover:bg-gray-100/70 transition-colors"
              >
                <Wallet className="w-4 h-4 text-gray-500" />
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
          <div className="flex flex-col items-center text-center pt-2 pb-6 border-b border-[#DADDE1]">
            {/* Avatar with Camera Upload Trigger */}
            <div className="relative group mb-3">
              <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-full overflow-hidden bg-purple-50 border-2 border-gray-200/80 shadow-2xs flex items-center justify-center">
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
                className="absolute bottom-0 right-0 w-8 h-8 rounded-full bg-[#9747FF] text-white flex items-center justify-center border-2 border-white shadow-xs hover:bg-[#8534f0] transition-colors cursor-pointer disabled:opacity-50"
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
            <h1 className="text-xl sm:text-2xl font-bold text-gray-950 flex items-center justify-center gap-1.5 leading-tight">
              <span>{displayName}</span>
              {isVerifiedUser && (
                <VerifiedBadge
                  className="w-5 h-5 inline-block align-middle"
                  expiresAt={currentUser?.verificationSubscription?.expiresAt}
                />
              )}
            </h1>

            {/* Email / Username */}
            <p className="text-xs sm:text-sm text-gray-500 mt-1">{userEmail}</p>

            {/* Pill Edit Profile Action (Matches Reference) */}
            <button
              type="button"
              onClick={() => setIsEditProfileOpen(true)}
              className="mt-4 px-6 py-1.5 sm:py-2 rounded-full border border-[#9747FF] text-[#9747FF] hover:bg-[#9747FF]/10 font-semibold text-xs sm:text-sm transition-all duration-150 active:scale-98 cursor-pointer inline-flex items-center gap-1.5"
            >
              <span>Edit profile</span>
            </button>
          </div>

          {/* SECTION B: Payment Info */}
          <section id="section-payment" className="py-5 border-b border-[#DADDE1]">
            <h2 className="text-sm font-bold text-gray-900 tracking-tight mb-2 px-1">
              Payment info
            </h2>

            <div className="divide-y divide-gray-100">
              {/* Wallet & Balance Row */}
              <a
                href="/wallet"
                className="flex items-center justify-between py-3.5 px-2 hover:bg-gray-100/60 rounded-xl transition-colors cursor-pointer group"
              >
                <div className="flex items-center gap-3.5 min-w-0">
                  <div className="w-9 h-9 rounded-full bg-purple-50 text-[#9747FF] flex items-center justify-center shrink-0">
                    <Wallet className="w-4 h-4" />
                  </div>
                  <div className="min-w-0">
                    <div className="text-sm font-medium text-gray-900 group-hover:text-[#9747FF] transition-colors truncate">
                      Wallet &amp; Earnings
                    </div>
                    <div className="text-xs text-gray-500 truncate">
                      USDC &amp; USDT unified balance &amp; payout management
                    </div>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-gray-400 group-hover:text-gray-700 transition-colors shrink-0 ml-2" />
              </a>

              {/* Deposit Addresses & Tokens Accordion Row */}
              <div className="py-2 px-2">
                <button
                  type="button"
                  onClick={() => setShowDepositAddresses(!showDepositAddresses)}
                  className="w-full flex items-center justify-between py-2 text-left hover:text-[#9747FF] transition-colors cursor-pointer group"
                >
                  <div className="flex items-center gap-3.5 min-w-0">
                    <div className="w-9 h-9 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                      <Copy className="w-4 h-4" />
                    </div>
                    <div className="min-w-0">
                      <div className="text-sm font-medium text-gray-900 group-hover:text-[#9747FF] transition-colors">
                        Deposit Addresses
                      </div>
                      <div className="text-xs text-gray-500">
                        Non-custodial Solana &amp; EVM addresses
                      </div>
                    </div>
                  </div>
                  <ChevronDown
                    className={cn(
                      'w-4 h-4 text-gray-400 group-hover:text-gray-700 transition-transform duration-200 shrink-0 ml-2',
                      showDepositAddresses && 'rotate-180'
                    )}
                  />
                </button>

                {/* Expanded Deposit Addresses */}
                {showDepositAddresses && (
                  <div className="mt-3 space-y-2.5 pl-12 pr-1 animate-in fade-in duration-150">
                    {/* Solana Address */}
                    <div className="p-3 bg-gray-50 border border-gray-200 rounded-lg space-y-1">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-semibold text-gray-700">Solana Address</span>
                        {walletDetails.solanaAddress && (
                          <button
                            type="button"
                            onClick={() =>
                              copyToClipboard(walletDetails.solanaAddress!, 'Solana Address')
                            }
                            className="inline-flex items-center gap-1 text-[#9747FF] hover:text-[#8534f0] font-medium transition-colors cursor-pointer"
                          >
                            {copiedAddress === 'Solana Address' ? (
                              <>
                                <Check className="w-3 h-3 text-emerald-600" />
                                <span className="text-emerald-600">Copied</span>
                              </>
                            ) : (
                              <>
                                <Copy className="w-3 h-3" />
                                <span>Copy</span>
                              </>
                            )}
                          </button>
                        )}
                      </div>
                      <p className="font-mono text-xs text-gray-600 break-all select-all">
                        {walletDetails.solanaAddress ||
                          (walletDetails.isLoading ? 'Loading address...' : 'Generating address...')}
                      </p>
                    </div>

                    {/* EVM Address */}
                    {walletDetails.evmAddress && (
                      <div className="p-3 bg-gray-50 border border-gray-200 rounded-lg space-y-1">
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-semibold text-gray-700">EVM Address (Base / Polygon)</span>
                          <button
                            type="button"
                            onClick={() =>
                              copyToClipboard(walletDetails.evmAddress!, 'EVM Address')
                            }
                            className="inline-flex items-center gap-1 text-[#9747FF] hover:text-[#8534f0] font-medium transition-colors cursor-pointer"
                          >
                            {copiedAddress === 'EVM Address' ? (
                              <>
                                <Check className="w-3 h-3 text-emerald-600" />
                                <span className="text-emerald-600">Copied</span>
                              </>
                            ) : (
                              <>
                                <Copy className="w-3 h-3" />
                                <span>Copy</span>
                              </>
                            )}
                          </button>
                        </div>
                        <p className="font-mono text-xs text-gray-600 break-all select-all">
                          {walletDetails.evmAddress}
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Unsupported Token Recovery Row */}
              <button
                type="button"
                onClick={() => setIsRescueModalOpen(true)}
                className="w-full flex items-center justify-between py-3.5 px-2 hover:bg-gray-100/60 rounded-xl transition-colors cursor-pointer text-left group"
              >
                <div className="flex items-center gap-3.5 min-w-0">
                  <div className="w-9 h-9 rounded-full bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
                    <Shield className="w-4 h-4" />
                  </div>
                  <div className="min-w-0">
                    <div className="text-sm font-medium text-gray-900 group-hover:text-[#9747FF] transition-colors truncate">
                      Unsupported Token Recovery
                    </div>
                    <div className="text-xs text-gray-500 truncate">
                      Rescue non-USDC assets sent to deposit addresses
                    </div>
                  </div>
                </div>
                <span className="text-xs font-semibold text-[#9747FF] group-hover:underline shrink-0 ml-2">
                  Recover
                </span>
              </button>
            </div>
          </section>

          {/* SECTION C: Settings (Matches Reference) */}
          <section className="py-5 border-b border-[#DADDE1]">
            <h2 className="text-sm font-bold text-gray-900 tracking-tight mb-2 px-1">
              Settings
            </h2>

            <div className="divide-y divide-gray-100">
              {/* Language Row */}
              <button
                type="button"
                onClick={() => setIsLanguageModalOpen(true)}
                className="w-full flex items-center justify-between py-3.5 px-2 hover:bg-gray-100/60 rounded-xl transition-colors cursor-pointer text-left group"
              >
                <div className="flex items-center gap-3.5 min-w-0">
                  <div className="w-9 h-9 rounded-full bg-gray-100 text-gray-700 flex items-center justify-center shrink-0">
                    <Globe className="w-4 h-4" />
                  </div>
                  <span className="text-sm font-medium text-gray-900 group-hover:text-[#9747FF] transition-colors truncate">
                    Language
                  </span>
                </div>
                <div className="flex items-center gap-1.5 shrink-0 ml-2">
                  <span className="text-xs text-gray-500 font-medium">{selectedLanguage}</span>
                  <ChevronRight className="w-4 h-4 text-gray-400 group-hover:text-gray-700 transition-colors" />
                </div>
              </button>

              {/* Theme Row */}
              <div className="flex items-center justify-between py-3.5 px-2">
                <div className="flex items-center gap-3.5 min-w-0">
                  <div className="w-9 h-9 rounded-full bg-purple-50 text-[#9747FF] flex items-center justify-center shrink-0">
                    <Moon className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-sm font-medium text-gray-900">Theme</div>
                    <div className="text-xs text-gray-500">
                      {isDarkMode ? 'Dark theme' : 'Light theme'}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-gray-500 font-medium">
                    {isDarkMode ? 'Dark' : 'Light'}
                  </span>
                  <Switch
                    checked={isDarkMode}
                    onCheckedChange={(checked) => {
                      setIsDarkMode(checked);
                      toast.info(checked ? 'Dark theme activated' : 'Light theme activated');
                    }}
                  />
                </div>
              </div>

              {/* Notifications Row */}
              <button
                type="button"
                onClick={() => setIsNotificationsModalOpen(true)}
                className="w-full flex items-center justify-between py-3.5 px-2 hover:bg-gray-100/60 rounded-xl transition-colors cursor-pointer text-left group"
              >
                <div className="flex items-center gap-3.5 min-w-0">
                  <div className="w-9 h-9 rounded-full bg-purple-50 text-[#9747FF] flex items-center justify-center shrink-0">
                    <Bell className="w-4 h-4" />
                  </div>
                  <span className="text-sm font-medium text-gray-900 group-hover:text-[#9747FF] transition-colors truncate">
                    Notifications
                  </span>
                </div>
                <div className="flex items-center gap-1.5 shrink-0 ml-2">
                  <span className="text-xs text-gray-500 font-medium">
                    {notifications.email || notifications.push ? 'Enabled' : 'Disabled'}
                  </span>
                  <ChevronRight className="w-4 h-4 text-gray-400 group-hover:text-gray-700 transition-colors" />
                </div>
              </button>

              {/* Security & Password Row */}
              <button
                type="button"
                onClick={() => setIsPasswordDialogOpen(true)}
                className="w-full flex items-center justify-between py-3.5 px-2 hover:bg-gray-100/60 rounded-xl transition-colors cursor-pointer text-left group"
              >
                <div className="flex items-center gap-3.5 min-w-0">
                  <div className="w-9 h-9 rounded-full bg-gray-100 text-gray-700 flex items-center justify-center shrink-0">
                    <Lock className="w-4 h-4" />
                  </div>
                  <span className="text-sm font-medium text-gray-900 group-hover:text-[#9747FF] transition-colors truncate">
                    Security &amp; Password
                  </span>
                </div>
                <ChevronRight className="w-4 h-4 text-gray-400 group-hover:text-gray-700 transition-colors shrink-0 ml-2" />
              </button>

              {/* Privacy Row */}
              <button
                type="button"
                onClick={() => setIsPrivacyModalOpen(true)}
                className="w-full flex items-center justify-between py-3.5 px-2 hover:bg-gray-100/60 rounded-xl transition-colors cursor-pointer text-left group"
              >
                <div className="flex items-center gap-3.5 min-w-0">
                  <div className="w-9 h-9 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
                    <Shield className="w-4 h-4" />
                  </div>
                  <span className="text-sm font-medium text-gray-900 group-hover:text-[#9747FF] transition-colors truncate">
                    Privacy Preferences
                  </span>
                </div>
                <ChevronRight className="w-4 h-4 text-gray-400 group-hover:text-gray-700 transition-colors shrink-0 ml-2" />
              </button>

              {/* Contact Support Row */}
              <a
                href="mailto:support@myartelab.com"
                className="flex items-center justify-between py-3.5 px-2 hover:bg-gray-100/60 rounded-xl transition-colors cursor-pointer group"
              >
                <div className="flex items-center gap-3.5 min-w-0">
                  <div className="w-9 h-9 rounded-full bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
                    <HelpCircle className="w-4 h-4" />
                  </div>
                  <div className="min-w-0">
                    <span className="text-sm font-medium text-gray-900 group-hover:text-[#9747FF] transition-colors truncate">
                      Contact support
                    </span>
                    <div className="text-xs text-gray-500">support@myartelab.com</div>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-gray-400 group-hover:text-gray-700 transition-colors shrink-0 ml-2" />
              </a>
            </div>
          </section>

          {/* SECTION D: Creator Studio / Client Section */}
          <section className="py-5 border-b border-[#DADDE1]">
            <h2 className="text-sm font-bold text-gray-900 tracking-tight mb-2 px-1">
              {isCreator ? 'Creator Studio' : 'Client Account'}
            </h2>

            <div className="divide-y divide-gray-100">
              {isCreator ? (
                <>
                  {/* View Public Creator Profile */}
                  <a
                    href={`/creator/${currentUser?.id}`}
                    className="flex items-center justify-between py-3.5 px-2 hover:bg-gray-100/60 rounded-xl transition-colors cursor-pointer group"
                  >
                    <div className="flex items-center gap-3.5 min-w-0">
                      <div className="w-9 h-9 rounded-full bg-purple-50 text-[#9747FF] flex items-center justify-center shrink-0">
                        <User className="w-4 h-4" />
                      </div>
                      <div className="min-w-0">
                        <div className="text-sm font-medium text-gray-900 group-hover:text-[#9747FF] transition-colors truncate">
                          View Public Profile
                        </div>
                        <div className="text-xs text-gray-500 truncate">
                          See your portfolio and services as clients see them
                        </div>
                      </div>
                    </div>
                    <ExternalLink className="w-4 h-4 text-gray-400 group-hover:text-[#9747FF] transition-colors shrink-0 ml-2" />
                  </a>

                  {/* My Bookings & Client Requests */}
                  <a
                    href="/bookings"
                    className="flex items-center justify-between py-3.5 px-2 hover:bg-gray-100/60 rounded-xl transition-colors cursor-pointer group"
                  >
                    <div className="flex items-center gap-3.5 min-w-0">
                      <div className="w-9 h-9 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                        <Calendar className="w-4 h-4" />
                      </div>
                      <div className="min-w-0">
                        <div className="text-sm font-medium text-gray-900 group-hover:text-[#9747FF] transition-colors truncate">
                          My Bookings &amp; Orders
                        </div>
                        <div className="text-xs text-gray-500 truncate">
                          Manage milestones, deliverables and active contracts
                        </div>
                      </div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-gray-400 group-hover:text-gray-700 transition-colors shrink-0 ml-2" />
                  </a>

                  {/* Verification Status */}
                  <div className="flex items-center justify-between py-3.5 px-2">
                    <div className="flex items-center gap-3.5 min-w-0">
                      <div className="w-9 h-9 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
                        <CheckCircle2 className="w-4 h-4" />
                      </div>
                      <div className="min-w-0">
                        <div className="text-sm font-medium text-gray-900 truncate">
                          Creator Verification
                        </div>
                        <div className="text-xs text-gray-500 truncate">
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
                      <span className="text-xs font-semibold text-gray-500 px-2 py-0.5 rounded-full bg-gray-100 shrink-0 ml-2">
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
                    className="flex items-center justify-between py-3.5 px-2 hover:bg-gray-100/60 rounded-xl transition-colors cursor-pointer group"
                  >
                    <div className="flex items-center gap-3.5 min-w-0">
                      <div className="w-9 h-9 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                        <Calendar className="w-4 h-4" />
                      </div>
                      <div className="min-w-0">
                        <div className="text-sm font-medium text-gray-900 group-hover:text-[#9747FF] transition-colors truncate">
                          My Bookings &amp; Orders
                        </div>
                        <div className="text-xs text-gray-500 truncate">
                          Track your hired creators and active contracts
                        </div>
                      </div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-gray-400 group-hover:text-gray-700 transition-colors shrink-0 ml-2" />
                  </a>

                  {/* Browse Creators */}
                  <a
                    href="/creators"
                    className="flex items-center justify-between py-3.5 px-2 hover:bg-gray-100/60 rounded-xl transition-colors cursor-pointer group"
                  >
                    <div className="flex items-center gap-3.5 min-w-0">
                      <div className="w-9 h-9 rounded-full bg-purple-50 text-[#9747FF] flex items-center justify-center shrink-0">
                        <Users className="w-4 h-4" />
                      </div>
                      <div className="min-w-0">
                        <div className="text-sm font-medium text-gray-900 group-hover:text-[#9747FF] transition-colors truncate">
                          Explore Creators
                        </div>
                        <div className="text-xs text-gray-500 truncate">
                          Discover top African creatives and book services
                        </div>
                      </div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-gray-400 group-hover:text-gray-700 transition-colors shrink-0 ml-2" />
                  </a>

                  {/* Become a Creator */}
                  <button
                    type="button"
                    onClick={() => setIsBecomeCreatorOpen(true)}
                    className="w-full flex items-center justify-between py-3.5 px-2 hover:bg-gray-100/60 rounded-xl transition-colors cursor-pointer text-left group"
                  >
                    <div className="flex items-center gap-3.5 min-w-0">
                      <div className="w-9 h-9 rounded-full bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
                        <Sparkles className="w-4 h-4" />
                      </div>
                      <div className="min-w-0">
                        <div className="text-sm font-medium text-gray-900 group-hover:text-[#9747FF] transition-colors truncate">
                          Become a Creator
                        </div>
                        <div className="text-xs text-gray-500 truncate">
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

          {/* SECTION E: Account Session / Logout */}
          <section className="py-4">
            <button
              type="button"
              onClick={() => setIsLogoutDialogOpen(true)}
              className="w-full flex items-center justify-between py-3.5 px-2 hover:bg-red-50/70 rounded-xl transition-colors cursor-pointer text-left group"
            >
              <div className="flex items-center gap-3.5 min-w-0">
                <div className="w-9 h-9 rounded-full bg-red-50 text-red-600 flex items-center justify-center shrink-0">
                  <LogOut className="w-4 h-4" />
                </div>
                <span className="text-sm font-medium text-red-600 transition-colors">
                  Log Out
                </span>
              </div>
              <ChevronRight className="w-4 h-4 text-red-300 group-hover:text-red-500 transition-colors shrink-0 ml-2" />
            </button>
          </section>
        </main>

        {/* =========================================================================
            RIGHT COLUMN (lg:col-span-3, hidden on mobile)
            Account Status & Support Information (Quiet, borderless, ash-gray dividers)
           ========================================================================= */}
        <aside className="hidden lg:flex flex-col gap-6 lg:col-span-3 sticky top-20">
          <div className="pb-4">
            <div className="pb-2.5 border-b border-[#DADDE1] mb-3.5">
              <h4 className="font-bold text-sm text-gray-900 tracking-tight">
                Account Summary
              </h4>
            </div>

            <div className="space-y-3.5 text-xs text-gray-600">
              <div className="flex items-center justify-between py-1">
                <span className="text-gray-500">Account Type</span>
                <span className="font-semibold text-gray-900 capitalize">
                  {currentUser?.role || 'Member'}
                </span>
              </div>

              <div className="flex items-center justify-between py-1">
                <span className="text-gray-500">Security</span>
                <span className="font-semibold text-emerald-600 flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  Protected
                </span>
              </div>

              <div className="flex items-center justify-between py-1">
                <span className="text-gray-500">Verification</span>
                <span className="font-semibold text-gray-900">
                  {isVerifiedUser ? 'Verified' : 'Standard'}
                </span>
              </div>

              {currentUser?.createdAt && (
                <div className="flex items-center justify-between py-1">
                  <span className="text-gray-500">Member Since</span>
                  <span className="font-semibold text-gray-900">
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
          <div className="pt-2 pb-4 border-t border-[#DADDE1]">
            <div className="flex items-center gap-2 mb-2 text-gray-900 font-semibold text-xs">
              <HelpCircle className="w-4 h-4 text-[#9747FF]" />
              <span>Need Assistance?</span>
            </div>
            <p className="text-xs text-gray-500 leading-relaxed mb-3">
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
          INTERACTIVE DIALOGS & MODALS
         ========================================================================= */}

      {/* 1. Edit Profile Modal */}
      <Dialog open={isEditProfileOpen} onOpenChange={setIsEditProfileOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-gray-900">Edit Profile</DialogTitle>
            <DialogDescription className="text-xs text-gray-500">
              Update your public display name, personal bio, skills, and contact details.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 pt-2">
            {/* Avatar Row */}
            <div className="flex items-center gap-4 pb-3 border-b border-gray-100">
              <div className="relative">
                <div className="w-16 h-16 rounded-full overflow-hidden bg-purple-50 border border-gray-200">
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
                  className="absolute bottom-0 right-0 w-6 h-6 rounded-full bg-[#9747FF] text-white flex items-center justify-center border border-white hover:bg-[#8534f0] transition-colors cursor-pointer"
                >
                  {isLoading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Camera className="w-3 h-3" />}
                </button>
              </div>
              <div>
                <p className="text-sm font-semibold text-gray-900">Profile Picture</p>
                <p className="text-xs text-gray-500">JPG, PNG or GIF. Max 2MB.</p>
              </div>
            </div>

            {/* Names */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="edit-firstName" className="text-xs font-medium text-gray-700">
                  First Name
                </Label>
                <Input
                  id="edit-firstName"
                  value={profileForm.firstName}
                  onChange={(e) => setProfileForm((prev) => ({ ...prev, firstName: e.target.value }))}
                  placeholder="First name"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="edit-lastName" className="text-xs font-medium text-gray-700">
                  Last Name
                </Label>
                <Input
                  id="edit-lastName"
                  value={profileForm.lastName}
                  onChange={(e) => setProfileForm((prev) => ({ ...prev, lastName: e.target.value }))}
                  placeholder="Last name"
                />
              </div>
            </div>

            {/* Email (Read only) & Phone */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="edit-email" className="text-xs font-medium text-gray-700">
                  Email
                </Label>
                <Input
                  id="edit-email"
                  value={profileForm.email}
                  disabled
                  className="bg-gray-50 text-gray-500 cursor-not-allowed"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="edit-phone" className="text-xs font-medium text-gray-700">
                  Phone Number
                </Label>
                <Input
                  id="edit-phone"
                  value={profileForm.phoneNumber}
                  onChange={(e) => setProfileForm((prev) => ({ ...prev, phoneNumber: e.target.value }))}
                  placeholder="+1 (555) 000-0000"
                />
              </div>
            </div>

            {/* Location */}
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-gray-700">Location</Label>
              <div className="grid grid-cols-3 gap-2">
                <Input
                  placeholder="City / Area"
                  value={profileForm.localArea}
                  onChange={(e) => setProfileForm((prev) => ({ ...prev, localArea: e.target.value }))}
                />
                <Input
                  placeholder="State"
                  value={profileForm.state}
                  onChange={(e) => setProfileForm((prev) => ({ ...prev, state: e.target.value }))}
                />
                <Input
                  placeholder="Country"
                  value={profileForm.country}
                  onChange={(e) => setProfileForm((prev) => ({ ...prev, country: e.target.value }))}
                />
              </div>
            </div>

            {/* Bio */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label htmlFor="edit-bio" className="text-xs font-medium text-gray-700">
                  Bio
                </Label>
                <span className="text-[11px] text-gray-400">{profileForm.bio.length}/500</span>
              </div>
              <textarea
                id="edit-bio"
                value={profileForm.bio}
                onChange={(e) => setProfileForm((prev) => ({ ...prev, bio: e.target.value }))}
                className="w-full min-h-[90px] px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#9747FF] focus:border-transparent"
                placeholder="Share a short bio about your creative expertise and background..."
                maxLength={500}
              />
            </div>

            {/* Skills */}
            <div className="space-y-1.5">
              <Label htmlFor="edit-skills" className="text-xs font-medium text-gray-700">
                Skills (comma separated)
              </Label>
              <Input
                id="edit-skills"
                value={profileForm.skills.join(', ')}
                onChange={(e) => handleSkillsChange(e.target.value)}
                placeholder="e.g. Digital Art, Branding, 3D Design, Photography"
              />
            </div>

            {/* Action buttons */}
            <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-gray-100">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsEditProfileOpen(false)}
                className="text-xs h-9 px-4 rounded-xl"
              >
                Cancel
              </Button>
              <Button
                type="button"
                onClick={handleSaveProfile}
                disabled={isSaving}
                className="bg-[#9747FF] hover:bg-[#8534f0] text-white font-semibold text-xs h-9 px-5 rounded-xl shadow-xs"
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
          </div>
        </DialogContent>
      </Dialog>

      {/* 2. Change Password Dialog */}
      <Dialog open={isPasswordDialogOpen} onOpenChange={setIsPasswordDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-gray-900">Change Password</DialogTitle>
            <DialogDescription className="text-xs text-gray-500">
              Ensure your account is using a strong password with letters, numbers, and symbols.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3.5 pt-2">
            <div className="space-y-1">
              <Label className="text-xs font-medium text-gray-700">Current Password</Label>
              <Input
                type="password"
                value={passwordForm.currentPassword}
                onChange={(e) =>
                  setPasswordForm((prev) => ({ ...prev, currentPassword: e.target.value }))
                }
                placeholder="Enter current password"
              />
            </div>

            <div className="space-y-1">
              <Label className="text-xs font-medium text-gray-700">New Password</Label>
              <Input
                type="password"
                value={passwordForm.newPassword}
                onChange={(e) =>
                  setPasswordForm((prev) => ({ ...prev, newPassword: e.target.value }))
                }
                placeholder="Enter new password"
              />
              <p className="text-[11px] text-gray-500">
                Minimum 8 characters with at least one uppercase and one lowercase letter.
              </p>
            </div>

            <div className="space-y-1">
              <Label className="text-xs font-medium text-gray-700">Confirm New Password</Label>
              <Input
                type="password"
                value={passwordForm.confirmPassword}
                onChange={(e) =>
                  setPasswordForm((prev) => ({ ...prev, confirmPassword: e.target.value }))
                }
                placeholder="Confirm new password"
              />
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-gray-100">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsPasswordDialogOpen(false)}
                className="text-xs h-9 px-4 rounded-xl"
              >
                Cancel
              </Button>
              <Button
                type="button"
                onClick={handleChangePassword}
                disabled={isLoading}
                className="bg-[#9747FF] hover:bg-[#8534f0] text-white font-semibold text-xs h-9 px-5 rounded-xl shadow-xs"
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
          </div>
        </DialogContent>
      </Dialog>

      {/* 3. Notification Preferences Dialog */}
      <Dialog open={isNotificationsModalOpen} onOpenChange={setIsNotificationsModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-gray-900">
              Notification Preferences
            </DialogTitle>
            <DialogDescription className="text-xs text-gray-500">
              Select how and when you want to receive updates from MyArteLab.
            </DialogDescription>
          </DialogHeader>

          <div className="divide-y divide-gray-100 pt-2">
            <div className="flex items-center justify-between py-3">
              <div>
                <p className="text-sm font-medium text-gray-900">Email Notifications</p>
                <p className="text-xs text-gray-500">Get booking updates &amp; messages via email</p>
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
                <p className="text-sm font-medium text-gray-900">Push Notifications</p>
                <p className="text-xs text-gray-500">Real-time alerts on your device</p>
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
                <p className="text-sm font-medium text-gray-900">SMS Alerts</p>
                <p className="text-xs text-gray-500">Important security &amp; payment alerts</p>
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
                <p className="text-sm font-medium text-gray-900">Marketing &amp; Discoveries</p>
                <p className="text-xs text-gray-500">Promotional creator spotlights &amp; newsletters</p>
              </div>
              <Switch
                checked={notifications.marketing}
                onCheckedChange={(checked) =>
                  setNotifications((prev) => ({ ...prev, marketing: checked }))
                }
              />
            </div>
          </div>

          <div className="flex justify-end pt-3 border-t border-gray-100">
            <Button
              type="button"
              onClick={() => {
                toast.success('Notification preferences updated');
                setIsNotificationsModalOpen(false);
              }}
              className="bg-[#9747FF] hover:bg-[#8534f0] text-white font-semibold text-xs h-9 px-5 rounded-xl shadow-xs"
            >
              Done
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* 4. Privacy Preferences Dialog */}
      <Dialog open={isPrivacyModalOpen} onOpenChange={setIsPrivacyModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-gray-900">Privacy Preferences</DialogTitle>
            <DialogDescription className="text-xs text-gray-500">
              Manage your visibility and messaging access across the creative marketplace.
            </DialogDescription>
          </DialogHeader>

          <div className="divide-y divide-gray-100 pt-2">
            <div className="flex items-center justify-between py-3">
              <div>
                <p className="text-sm font-medium text-gray-900">Public Profile</p>
                <p className="text-xs text-gray-500">Make your profile visible in search &amp; discovery</p>
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
                <p className="text-sm font-medium text-gray-900">Activity Status</p>
                <p className="text-xs text-gray-500">Show when you are actively on MyArteLab</p>
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
                <p className="text-sm font-medium text-gray-900">Direct Messages</p>
                <p className="text-xs text-gray-500">Allow other verified users to message you</p>
              </div>
              <Switch
                checked={privacy.allowMessages}
                onCheckedChange={(checked) =>
                  setPrivacy((prev) => ({ ...prev, allowMessages: checked }))
                }
              />
            </div>
          </div>

          <div className="flex justify-end gap-2.5 pt-3 border-t border-gray-100">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsPrivacyModalOpen(false)}
              className="text-xs h-9 px-4 rounded-xl"
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={handleSavePrivacy}
              disabled={isSaving}
              className="bg-[#9747FF] hover:bg-[#8534f0] text-white font-semibold text-xs h-9 px-5 rounded-xl shadow-xs"
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
        </DialogContent>
      </Dialog>

      {/* 5. Language Selector Dialog */}
      <Dialog open={isLanguageModalOpen} onOpenChange={setIsLanguageModalOpen}>
        <DialogContent className="max-w-xs">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-gray-900">Select Language</DialogTitle>
          </DialogHeader>

          <div className="divide-y divide-gray-100 pt-2">
            {[
              { code: 'en', name: 'English (US)' },
              { code: 'fr', name: 'Français' },
              { code: 'es', name: 'Español' },
              { code: 'sw', name: 'Kiswahili' },
            ].map((lang) => (
              <button
                key={lang.code}
                type="button"
                onClick={() => {
                  setSelectedLanguage(lang.name.split(' ')[0]);
                  toast.success(`Language set to ${lang.name}`);
                  setIsLanguageModalOpen(false);
                }}
                className="w-full flex items-center justify-between py-2.5 px-2 hover:bg-gray-50 rounded-lg text-left transition-colors cursor-pointer"
              >
                <span className="text-sm font-medium text-gray-800">{lang.name}</span>
                {selectedLanguage.startsWith(lang.name.split(' ')[0]) && (
                  <Check className="w-4 h-4 text-[#9747FF]" />
                )}
              </button>
            ))}
          </div>
        </DialogContent>
      </Dialog>

      {/* 6. Become a Creator Dialog (For Clients) */}
      <Dialog open={isBecomeCreatorOpen} onOpenChange={setIsBecomeCreatorOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-gray-900 flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-[#9747FF]" />
              Become a Verified Creator
            </DialogTitle>
            <DialogDescription className="text-xs text-gray-500">
              Join Africa's leading creative marketplace to showcase your portfolio, reach clients, and get paid securely.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-3 text-xs text-gray-600">
            <div className="flex items-start gap-2.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              <span>Publish artwork and stories directly to the community feed.</span>
            </div>
            <div className="flex items-start gap-2.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              <span>Offer custom creative packages and receive client booking requests.</span>
            </div>
            <div className="flex items-start gap-2.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              <span>Non-custodial instant payouts in USDC / USDT directly to your wallet.</span>
            </div>
          </div>

          <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-gray-100">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsBecomeCreatorOpen(false)}
              className="text-xs h-9 px-4 rounded-xl"
            >
              Later
            </Button>
            <Button
              type="button"
              onClick={() => {
                setIsBecomeCreatorOpen(false);
                window.location.href = '/register?role=creator';
              }}
              className="bg-[#9747FF] hover:bg-[#8534f0] text-white font-semibold text-xs h-9 px-5 rounded-xl shadow-xs"
            >
              Apply as Creator
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* 7. Confirm Logout Dialog */}
      <Dialog open={isLogoutDialogOpen} onOpenChange={setIsLogoutDialogOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-gray-900">Sign Out</DialogTitle>
            <DialogDescription className="text-xs text-gray-500">
              Are you sure you want to log out of your MyArteLab account?
            </DialogDescription>
          </DialogHeader>

          <div className="flex items-center justify-end gap-2.5 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsLogoutDialogOpen(false)}
              className="text-xs h-9 px-4 rounded-xl"
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={handleLogout}
              className="bg-red-600 hover:bg-red-700 text-white font-semibold text-xs h-9 px-5 rounded-xl shadow-xs"
            >
              Log Out
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* 8. Unsupported Token Recovery Modal */}
      <RescueTokenModal
        isOpen={isRescueModalOpen}
        onClose={() => setIsRescueModalOpen(false)}
        userSolanaAddress={walletDetails.solanaAddress}
      />
    </div>
  );
}

// Also export as Profile for alias compatibility
export const Profile = Settings;
export default Settings;
