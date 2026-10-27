import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { projectService } from '@/lib/api';
import { PostOpportunityModal } from '@/components/opportunities/PostOpportunityModal';
import { ApplyOpportunityModal } from '@/components/opportunities/ApplyOpportunityModal';
import { VerifiedBadge } from '@/components/shared/VerifiedBadge';
import { getAvatarUrl } from '@/lib/imageUrl';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useSEO } from '@/hooks/useSEO';
import { toast } from '@/components/ui/sonner';
import { cn } from '@/lib/utils';
import { CREATOR_CATEGORIES } from '@/lib/validations/authSchemas';
import type { Project, ProjectApplication } from '@/types';
import {
  Briefcase,
  Plus,
  Search,
  Clock,
  Calendar,
  Users,
  MessageSquare,
  ShieldCheck,
  CheckCircle2,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  Sparkles,
  Home as HomeIcon,
  Wallet,
} from 'lucide-react';
import { Spinner } from '@/components/ui/spinner';

export function Projects() {
  const { user } = useAuth();
  const isClient = user?.role === 'client';
  const isCreator = user?.role === 'creator';

  useSEO({
    title: 'Creative Opportunities & Projects - MyArteLab',
    description: 'Post creative opportunities and hire African visual creators, or browse open projects and submit proposals.',
    canonical: '/projects',
  });

  // State
  const [activeTab, setActiveTab] = useState<'my' | 'explore'>(isClient ? 'my' : 'explore');
  const [exploreProjects, setExploreProjects] = useState<Project[]>([]);
  const [myProjects, setMyProjects] = useState<Project[]>([]);
  const [myApplications, setMyApplications] = useState<ProjectApplication[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  // Modals
  const [isPostModalOpen, setIsPostModalOpen] = useState(false);
  const [selectedProjectForApply, setSelectedProjectForApply] = useState<Project | null>(null);

  // Expanded project applications review state (for clients)
  const [expandedProjectId, setExpandedProjectId] = useState<string | null>(null);
  const [projectApplications, setProjectApplications] = useState<Record<string, ProjectApplication[]>>({});
  const [loadingApplicationsFor, setLoadingApplicationsFor] = useState<string | null>(null);

  // Action states
  const [acceptingApplicationId, setAcceptingApplicationId] = useState<string | null>(null);
  const [payingProjectId, setPayingProjectId] = useState<string | null>(null);
  const [releasingProjectId, setReleasingProjectId] = useState<string | null>(null);

  // Load public opportunities
  const fetchExploreProjects = useCallback(async () => {
    try {
      const params: any = {};
      if (selectedCategory !== 'all') params.category = selectedCategory;
      if (searchQuery.trim()) params.search = searchQuery.trim();

      const res = await projectService.getProjects(params);
      const list = res.data?.data?.projects || [];
      setExploreProjects(list);
    } catch (err) {
      console.error('Failed to load projects:', err);
    }
  }, [selectedCategory, searchQuery]);

  // Load user's posted projects or applications
  const fetchUserData = useCallback(async () => {
    if (!user) return;
    try {
      if (isClient) {
        const res = await projectService.getMyPostedProjects();
        setMyProjects(res.data?.data?.projects || []);
      } else if (isCreator) {
        const [postedRes, appsRes] = await Promise.all([
          projectService.getMyPostedProjects().catch(() => ({ data: { data: { projects: [] } } })),
          projectService.getMyApplications().catch(() => ({ data: { data: { applications: [] } } })),
        ]);
        setMyProjects(postedRes.data?.data?.projects || []);
        setMyApplications(appsRes.data?.data?.applications || []);
      }
    } catch (err) {
      console.error('Failed to load user projects/applications:', err);
    }
  }, [user, isClient, isCreator]);

  useEffect(() => {
    setIsLoading(true);
    Promise.all([fetchExploreProjects(), fetchUserData()]).finally(() => {
      setIsLoading(false);
    });
  }, [fetchExploreProjects, fetchUserData]);

  // Expand / collapse applications for an opportunity
  const toggleViewApplications = async (projectId: string) => {
    if (expandedProjectId === projectId) {
      setExpandedProjectId(null);
      return;
    }

    setExpandedProjectId(projectId);
    if (!projectApplications[projectId]) {
      try {
        setLoadingApplicationsFor(projectId);
        const res = await projectService.getProjectApplications(projectId);
        const apps = res.data?.data?.applications || [];
        setProjectApplications((prev) => ({ ...prev, [projectId]: apps }));
      } catch (err) {
        toast.error("Couldn't load proposals for this project.");
      } finally {
        setLoadingApplicationsFor(null);
      }
    }
  };

  // Accept a creator's proposal
  const handleAcceptProposal = async (applicationId: string, projectId: string) => {
    try {
      setAcceptingApplicationId(applicationId);
      const res = await projectService.updateApplicationStatus(applicationId, {
        status: 'accepted',
        reviewNotes: 'Accepted by client',
      });
      toast.success(res.data?.message || 'Proposal accepted! Next step: fund escrow to begin work.');
      // Refresh applications and projects
      const updatedApps = await projectService.getProjectApplications(projectId);
      setProjectApplications((prev) => ({ ...prev, [projectId]: updatedApps.data?.data?.applications || [] }));
      fetchUserData();
    } catch (error: any) {
      console.error('Error accepting proposal:', error);
      toast.error(error.response?.data?.message || 'Failed to accept proposal.');
    } finally {
      setAcceptingApplicationId(null);
    }
  };

  // Fund escrow for accepted project
  const handlePayEscrow = async (projectId: string) => {
    try {
      setPayingProjectId(projectId);
      const res = await projectService.payProject(projectId);
      toast.success(res.data?.message || 'Payment funded into escrow! Creator can now begin work.');
      fetchUserData();
    } catch (error: any) {
      console.error('Error paying for project:', error);
      toast.error(error.response?.data?.message || 'Failed to fund escrow. Check your wallet balance.');
    } finally {
      setPayingProjectId(null);
    }
  };

  // Release escrow funds to creator upon satisfactory delivery
  const handleReleaseFunds = async (projectId: string) => {
    try {
      setReleasingProjectId(projectId);
      const res = await projectService.releaseProjectFunds(projectId);
      toast.success(res.data?.message || 'Escrow funds successfully released to creator!');
      fetchUserData();
    } catch (error: any) {
      console.error('Error releasing funds:', error);
      toast.error(error.response?.data?.message || 'Failed to release funds.');
    } finally {
      setReleasingProjectId(null);
    }
  };

  const userDisplayName =
    user?.name || `${user?.firstName || ''} ${user?.lastName || ''}`.trim() || (isClient ? 'Client' : 'Creator');

  return (
    <div className="w-full relative">
      {/* 3-Column Standardized Desktop Layout matching Home & Creators */}
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
                  @{user.email ? user.email.split('@')[0] : 'user'}
                </p>
                <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-purple-50 dark:bg-purple-950/50 text-[#9747FF] text-xs font-semibold mt-2.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#9747FF]" />
                  {isClient ? 'Client account' : 'Creator account'}
                </div>
              </div>
            ) : (
              <div className="text-center py-2">
                <div className="w-12 h-12 rounded-full bg-purple-100 dark:bg-purple-950/40 text-[#9747FF] flex items-center justify-center mx-auto mb-3">
                  <Sparkles className="w-6 h-6" />
                </div>
                <h3 className="font-bold text-gray-900 dark:text-gray-100 text-base">
                  Commission Talent
                </h3>
                <p className="text-xs text-gray-600 dark:text-gray-400 mt-1 mb-4 leading-relaxed">
                  Post creative projects or discover open client gigs across Africa.
                </p>
                <Button
                  type="button"
                  onClick={() => (window.location.href = '/login?redirect=/projects')}
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
                <HomeIcon className="w-5 h-5 text-gray-500 dark:text-gray-400" />
                <span>Home</span>
              </a>

              <a
                href="/creators"
                className="flex items-center gap-3 px-3 py-2.5 rounded-xl font-medium text-sm text-gray-700 dark:text-gray-300 hover:text-[#9747FF] dark:hover:text-[#9747FF] hover:bg-gray-100/70 dark:hover:bg-[#1e1f20] transition-colors"
              >
                <Users className="w-4 h-4 text-gray-500 dark:text-gray-400" />
                <span>Creators</span>
              </a>

              <a
                href="/projects"
                className="flex items-center gap-3 px-3 py-2.5 rounded-xl font-semibold text-sm bg-purple-50 dark:bg-purple-950/50 text-[#9747FF] transition-colors"
              >
                <Briefcase className="w-4 h-4 text-[#9747FF]" />
                <span>Opportunities</span>
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
                </>
              )}
            </nav>
          </div>
        </aside>

        {/* =========================================================================
            CENTER COLUMN (lg:col-span-6, full width on mobile)
            Opportunities List, Tabs & Proposal Reviews
           ========================================================================= */}
        <section className="col-span-1 lg:col-span-6 flex flex-col pb-16">
          {/* Header Action Banner */}
          <div className="bg-white dark:bg-[#18191a] border border-[#DADDE1] dark:border-[#2f3032] border-b-0 rounded-t-2xl p-4 sm:p-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h1 className="text-lg sm:text-xl font-bold text-gray-900 dark:text-gray-100 tracking-tight">
                  Creative Opportunities
                </h1>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                  {isClient
                    ? 'Publish creative projects, receive proposals, and hire African visual creators.'
                    : 'Discover paid projects from clients looking for African visual talent.'}
                </p>
              </div>

              {/* Action Button: Post Opportunity */}
              <Button
                type="button"
                onClick={() => {
                  if (!user) {
                    window.location.href = `/login?redirect=${encodeURIComponent('/projects')}`;
                    return;
                  }
                  setIsPostModalOpen(true);
                }}
                className="bg-[#9747FF] hover:bg-[#8534f0] text-white text-xs font-semibold rounded-full px-5 h-9 shadow-xs cursor-pointer inline-flex items-center gap-2 shrink-0"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Post Opportunity</span>
              </Button>
            </div>

            {/* Navigation Tabs */}
            <div className="flex items-center gap-2 mt-4 pt-3 border-t border-[#DADDE1] dark:border-[#2f3032]">
              {user && (
                <button
                  type="button"
                  onClick={() => setActiveTab('my')}
                  className={cn(
                    'px-3.5 py-1.5 rounded-full text-xs font-semibold transition-colors cursor-pointer',
                    activeTab === 'my'
                      ? 'bg-[#9747FF] text-white'
                      : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-800'
                  )}
                >
                  {isClient ? `My Opportunities (${myProjects.length})` : `My Proposals (${myApplications.length})`}
                </button>
              )}
              <button
                type="button"
                onClick={() => setActiveTab('explore')}
                className={cn(
                  'px-3.5 py-1.5 rounded-full text-xs font-semibold transition-colors cursor-pointer',
                  activeTab === 'explore'
                    ? 'bg-[#9747FF] text-white'
                    : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-800'
                )}
              >
                Explore Opportunities
              </button>
            </div>
          </div>

          {/* Search & Filters for Explore Tab */}
          {activeTab === 'explore' && (
            <div className="bg-white dark:bg-[#18191a] border-x border-t border-[#DADDE1] dark:border-[#2f3032] p-3.5 space-y-2.5">
              <div className="relative">
                <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                <Input
                  type="text"
                  placeholder="Search opportunities by title, scope, or skill..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 h-9 rounded-full border-[#DADDE1] dark:border-[#2f3032] text-xs bg-gray-50/50 dark:bg-black/20"
                />
              </div>

              {/* Category Filter Pills */}
              <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5">
                <button
                  type="button"
                  onClick={() => setSelectedCategory('all')}
                  className={cn(
                    'px-3 py-1 rounded-full text-xs font-medium shrink-0 transition-colors cursor-pointer',
                    selectedCategory === 'all'
                      ? 'bg-[#9747FF] text-white'
                      : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
                  )}
                >
                  All Fields
                </button>
                {CREATOR_CATEGORIES.map((cat) => (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => setSelectedCategory(cat.id)}
                    className={cn(
                      'px-3 py-1 rounded-full text-xs font-medium shrink-0 transition-colors cursor-pointer',
                      selectedCategory === cat.id
                        ? 'bg-[#9747FF] text-white'
                        : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
                    )}
                  >
                    {cat.name}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Opportunities Stream Container */}
          <div className="bg-white dark:bg-[#18191a] border border-[#DADDE1] dark:border-[#2f3032] rounded-b-2xl overflow-hidden">
            {isLoading ? (
              <div className="flex items-center justify-center py-20">
                <Spinner size="lg" variant="primary" />
              </div>
            ) : activeTab === 'my' ? (
              /* TAB 1: My Posted Opportunities (Client) or My Proposals (Creator) */
              isClient ? (
                myProjects.length === 0 ? (
                  <div className="py-16 px-4 text-center">
                    <div className="w-12 h-12 rounded-full bg-purple-50 dark:bg-purple-950/40 text-[#9747FF] flex items-center justify-center mx-auto mb-3">
                      <Briefcase className="w-6 h-6" />
                    </div>
                    <h3 className="font-bold text-gray-900 dark:text-gray-100 text-sm">
                      No opportunities posted yet
                    </h3>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 mb-4 max-w-sm mx-auto leading-relaxed">
                      Publish what you need done. Verified African creators will review your requirements and submit bids.
                    </p>
                    <Button
                      type="button"
                      onClick={() => setIsPostModalOpen(true)}
                      className="bg-[#9747FF] hover:bg-[#8534f0] text-white text-xs font-semibold rounded-full px-5 py-2 cursor-pointer shadow-xs"
                    >
                      Post Your First Opportunity
                    </Button>
                  </div>
                ) : (
                  <div className="divide-y divide-[#DADDE1] dark:divide-[#2f3032]">
                    {myProjects.map((project) => {
                      const isExpanded = expandedProjectId === project._id;
                      const apps = projectApplications[project._id] || [];
                      const isLoadingApps = loadingApplicationsFor === project._id;

                      return (
                        <article
                          key={project._id}
                          className="p-4 sm:p-5 transition-colors hover:bg-gray-50/60 dark:hover:bg-white/[0.015]"
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="text-[11px] font-semibold uppercase tracking-wider text-[#9747FF] bg-purple-50 dark:bg-purple-950/50 px-2 py-0.5 rounded-full">
                                  {project.category.replace('_', ' ')}
                                </span>
                                <span
                                  className={cn(
                                    'text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full',
                                    project.status === 'open' && 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/50 dark:text-emerald-400',
                                    project.status === 'awaiting_payment' && 'bg-amber-50 text-amber-600 dark:bg-amber-950/50 dark:text-amber-400',
                                    project.status === 'in_progress' && 'bg-indigo-50 text-indigo-600 dark:bg-indigo-950/50 dark:text-indigo-400',
                                    project.status === 'delivered' && 'bg-purple-50 text-[#9747FF] dark:bg-purple-950/50',
                                    project.status === 'completed' && 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300'
                                  )}
                                >
                                  {project.status.replace('_', ' ')}
                                </span>
                              </div>
                              <h3 className="font-bold text-gray-900 dark:text-gray-100 text-base mt-2 line-clamp-2">
                                {project.title}
                              </h3>
                              <p className="text-xs text-gray-600 dark:text-gray-300 mt-1 line-clamp-2 leading-relaxed">
                                {project.description}
                              </p>
                            </div>
                          </div>

                          {/* Meta info: Budget, Timeline, Applicants */}
                          <div className="mt-4 pt-3 border-t border-[#DADDE1] dark:border-[#2f3032] flex items-center justify-between flex-wrap gap-3 text-xs">
                            <div className="flex items-center gap-4 text-gray-600 dark:text-gray-400">
                              <span className="font-bold text-gray-900 dark:text-gray-100">
                                {project.budget?.min} - {project.budget?.max} {project.budget?.currency || 'USDC'}
                              </span>
                              <span className="flex items-center gap-1">
                                <Clock className="w-3.5 h-3.5 text-gray-400" />
                                <span>{project.timeline}</span>
                              </span>
                            </div>

                            {/* Quick Lifecycle Action Buttons */}
                            <div className="flex items-center gap-2">
                              {/* Awaiting Escrow Payment Action */}
                              {project.status === 'awaiting_payment' && (
                                <Button
                                  type="button"
                                  size="sm"
                                  disabled={payingProjectId === project._id}
                                  onClick={() => handlePayEscrow(project._id)}
                                  className="bg-[#9747FF] hover:bg-[#8534f0] text-white rounded-full text-xs font-semibold px-4 cursor-pointer"
                                >
                                  {payingProjectId === project._id ? (
                                    <Spinner size="xs" variant="white" />
                                  ) : (
                                    <span>Deposit Escrow ({project.acceptedAmount || project.budget?.min} USDC)</span>
                                  )}
                                </Button>
                              )}

                              {/* Delivered - Approve & Release Funds Action */}
                              {project.status === 'delivered' && (
                                <Button
                                  type="button"
                                  size="sm"
                                  disabled={releasingProjectId === project._id}
                                  onClick={() => handleReleaseFunds(project._id)}
                                  className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-full text-xs font-semibold px-4 cursor-pointer"
                                >
                                  {releasingProjectId === project._id ? (
                                    <Spinner size="xs" variant="white" />
                                  ) : (
                                    <span>Approve &amp; Release Funds</span>
                                  )}
                                </Button>
                              )}

                              {/* Toggle Proposals Button */}
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => toggleViewApplications(project._id)}
                                className="rounded-full text-xs font-semibold border-[#DADDE1] dark:border-[#2f3032] text-gray-700 dark:text-gray-300 hover:text-[#9747FF] cursor-pointer inline-flex items-center gap-1.5"
                              >
                                <Users className="w-3.5 h-3.5" />
                                <span>Proposals ({project.applicantCount || 0})</span>
                                {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                              </Button>
                            </div>
                          </div>

                          {/* Collapsible Proposals Section */}
                          {isExpanded && (
                            <div className="mt-4 pt-3.5 border-t border-[#DADDE1] dark:border-[#2f3032]">
                              <h4 className="text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-2">
                                Creator Proposals &amp; Quotes
                              </h4>

                              {isLoadingApps ? (
                                <div className="py-6 flex justify-center">
                                  <Spinner size="sm" variant="primary" />
                                </div>
                              ) : apps.length === 0 ? (
                                <p className="text-xs text-gray-500 py-3 text-center">
                                  No proposals submitted yet. Verified creators are being notified.
                                </p>
                              ) : (
                                <div className="divide-y divide-[#DADDE1]/60 dark:divide-[#2f3032]">
                                  {apps.map((app) => (
                                    <div
                                      key={app._id}
                                      className="py-3.5 space-y-2"
                                    >
                                      {/* Creator Header */}
                                      <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-2.5">
                                          <img
                                            src={getAvatarUrl(app.creatorId?.avatar)}
                                            alt={app.creatorId?.name || 'Creator'}
                                            className="w-8 h-8 rounded-full object-cover border border-[#DADDE1] dark:border-[#2f3032]"
                                          />
                                          <div>
                                            <div className="flex items-center gap-1 text-xs font-bold text-gray-900 dark:text-gray-100">
                                              <span>{app.creatorId?.name || `${app.creatorId?.firstName || ''} ${app.creatorId?.lastName || ''}`}</span>
                                              {app.creatorId?.isVerified && <VerifiedBadge className="w-3.5 h-3.5" />}
                                            </div>
                                            <span className="text-[10px] text-gray-500 dark:text-gray-400">
                                              Proposed Quote: <strong className="text-gray-900 dark:text-gray-100 font-bold">{app.proposedBudget?.amount} {app.proposedBudget?.currency}</strong> in {app.proposedTimeline}
                                            </span>
                                          </div>
                                        </div>

                                        <span
                                          className={cn(
                                            'text-[10px] font-bold uppercase px-2 py-0.5 rounded-full',
                                            app.status === 'accepted' && 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400',
                                            app.status === 'pending' && 'bg-blue-50 text-blue-600 dark:bg-blue-950/40 dark:text-blue-400',
                                            app.status === 'rejected' && 'bg-rose-50 text-rose-600 dark:bg-rose-950/40 dark:text-rose-400'
                                          )}
                                        >
                                          {app.status}
                                        </span>
                                      </div>

                                      {/* Pitch / Cover letter */}
                                      <p className="text-xs text-gray-700 dark:text-gray-300 leading-relaxed">
                                        {app.coverLetter}
                                      </p>

                                      {/* Portfolio Links */}
                                      {app.portfolioLinks && app.portfolioLinks.length > 0 && (
                                        <div className="flex items-center gap-2 flex-wrap">
                                          <span className="text-[11px] text-gray-500">Portfolio:</span>
                                          {app.portfolioLinks.map((link, lIdx) => (
                                            <a
                                              key={lIdx}
                                              href={link.url}
                                              target="_blank"
                                              rel="noreferrer"
                                              className="text-[11px] text-[#9747FF] hover:underline font-medium inline-flex items-center gap-0.5"
                                            >
                                              <span>Sample {lIdx + 1}</span>
                                              <ExternalLink className="w-2.5 h-2.5" />
                                            </a>
                                          ))}
                                        </div>
                                      )}

                                      {/* Actions: Message & Accept */}
                                      <div className="flex items-center justify-end gap-2 pt-1">
                                        <Button
                                          type="button"
                                          variant="ghost"
                                          size="sm"
                                          onClick={() => (window.location.href = `/messages?user=${app.creatorId?._id || app.creatorId?.id}`)}
                                          className="text-xs text-gray-600 dark:text-gray-300 hover:text-[#9747FF] cursor-pointer"
                                        >
                                          <MessageSquare className="w-3.5 h-3.5 mr-1" />
                                          Message
                                        </Button>

                                        {app.status === 'pending' && project.status === 'open' && (
                                          <Button
                                            type="button"
                                            size="sm"
                                            disabled={acceptingApplicationId === app._id}
                                            onClick={() => handleAcceptProposal(app._id, project._id)}
                                            className="bg-[#9747FF] hover:bg-[#8534f0] text-white rounded-full text-xs font-semibold px-4 cursor-pointer"
                                          >
                                            {acceptingApplicationId === app._id ? (
                                              <Spinner size="xs" variant="white" />
                                            ) : (
                                              <span>Accept Proposal</span>
                                            )}
                                          </Button>
                                        )}
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          )}
                        </article>
                      );
                    })}
                  </div>
                )
              ) : (
                /* Creator Applications List */
                myApplications.length === 0 ? (
                  <div className="py-16 px-4 text-center">
                    <div className="w-12 h-12 rounded-full bg-purple-50 dark:bg-purple-950/40 text-[#9747FF] flex items-center justify-center mx-auto mb-3">
                      <Briefcase className="w-6 h-6" />
                    </div>
                    <h3 className="font-bold text-gray-900 dark:text-gray-100 text-sm">
                      No proposals submitted yet
                    </h3>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 mb-4 max-w-sm mx-auto leading-relaxed">
                      Explore active opportunities posted by clients looking for your creative skills and submit quotes.
                    </p>
                    <Button
                      type="button"
                      onClick={() => setActiveTab('explore')}
                      className="bg-[#9747FF] hover:bg-[#8534f0] text-white text-xs font-semibold rounded-full px-5 py-2 cursor-pointer shadow-xs"
                    >
                      Browse Opportunities
                    </Button>
                  </div>
                ) : (
                  <div className="divide-y divide-[#DADDE1] dark:divide-[#2f3032]">
                    {myApplications.map((app) => {
                      const proj = typeof app.projectId === 'object' ? app.projectId : null;
                      return (
                        <article
                          key={app._id}
                          className="p-4 sm:p-5 transition-colors hover:bg-gray-50/60 dark:hover:bg-white/[0.015]"
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <span
                                className={cn(
                                  'text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full',
                                  app.status === 'accepted' && 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400',
                                  app.status === 'pending' && 'bg-blue-50 text-blue-600 dark:bg-blue-950/40 dark:text-blue-400',
                                  app.status === 'rejected' && 'bg-rose-50 text-rose-600 dark:bg-rose-950/40 dark:text-rose-400'
                                )}
                              >
                                {app.status}
                              </span>
                              <h3 className="font-bold text-gray-900 dark:text-gray-100 text-base mt-2">
                                {proj?.title || 'Creative Project Opportunity'}
                              </h3>
                              <p className="text-xs text-gray-500 mt-0.5">
                                Submitted quote: <strong>{app.proposedBudget?.amount} {app.proposedBudget?.currency}</strong> &bull; {app.proposedTimeline}
                              </p>
                            </div>
                          </div>

                          <p className="mt-2.5 text-xs text-gray-700 dark:text-gray-300 leading-relaxed">
                            {app.coverLetter}
                          </p>
                        </article>
                      );
                    })}
                  </div>
                )
              )
            ) : (
              /* TAB 2: Explore Public Opportunities */
              exploreProjects.length === 0 ? (
                <div className="py-16 px-4 text-center">
                  <div className="w-12 h-12 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-500 flex items-center justify-center mx-auto mb-3">
                    <Briefcase className="w-6 h-6" />
                  </div>
                  <h3 className="font-bold text-gray-900 dark:text-gray-100 text-sm">
                    No opportunities match your filter
                  </h3>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 mb-4">
                    Try selecting another creative field or clearing your search.
                  </p>
                  <Button
                    type="button"
                    onClick={() => {
                      setSelectedCategory('all');
                      setSearchQuery('');
                    }}
                    variant="outline"
                    className="rounded-full text-xs font-semibold cursor-pointer border-[#DADDE1] dark:border-[#2f3032]"
                  >
                    Clear Filters
                  </Button>
                </div>
              ) : (
                <div className="divide-y divide-[#DADDE1] dark:divide-[#2f3032]">
                  {exploreProjects.map((project) => (
                    <article
                      key={project._id}
                      className="p-4 sm:p-5 transition-colors hover:bg-gray-50/60 dark:hover:bg-white/[0.015]"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-[11px] font-semibold uppercase tracking-wider text-[#9747FF] bg-purple-50 dark:bg-purple-950/50 px-2.5 py-0.5 rounded-full">
                              {project.category.replace('_', ' ')}
                            </span>
                            <span className="text-[11px] text-gray-400">
                              Posted {new Date(project.createdAt).toLocaleDateString()}
                            </span>
                          </div>
                          <h3 className="font-bold text-gray-900 dark:text-gray-100 text-base sm:text-lg mt-2 leading-snug">
                            {project.title}
                          </h3>
                          <p className="text-xs text-gray-600 dark:text-gray-300 mt-1 leading-relaxed">
                            {project.description}
                          </p>
                        </div>
                      </div>

                      {/* Deliverables tags */}
                      {project.deliverables && project.deliverables.length > 0 && (
                        <div className="mt-3 flex items-center gap-1.5 flex-wrap">
                          <span className="text-[11px] font-semibold text-gray-400">Deliverables:</span>
                          {project.deliverables.map((d, dIdx) => (
                            <span
                              key={dIdx}
                              className="text-[11px] px-2.5 py-0.5 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300"
                            >
                              {d}
                            </span>
                          ))}
                        </div>
                      )}

                      {/* Footer: Client, Budget & Apply Button */}
                      <div className="mt-4 pt-3.5 border-t border-[#DADDE1] dark:border-[#2f3032] flex items-center justify-between flex-wrap gap-3">
                        <div className="flex items-center gap-3">
                          <img
                            src={getAvatarUrl(project.clientId?.avatar)}
                            alt={project.clientId?.name || 'Client'}
                            className="w-7 h-7 rounded-full object-cover border border-[#DADDE1] dark:border-[#2f3032]"
                          />
                          <div className="text-xs">
                            <div className="font-bold text-gray-900 dark:text-gray-100">
                              {project.budget?.min} - {project.budget?.max} {project.budget?.currency || 'USDC'}
                            </div>
                            <span className="text-[11px] text-gray-500">{project.timeline}</span>
                          </div>
                        </div>

                        {/* Action: Apply for Project */}
                        <Button
                          type="button"
                          onClick={() => {
                            if (!user) {
                              window.location.href = `/login?redirect=${encodeURIComponent('/projects')}`;
                              return;
                            }
                            setSelectedProjectForApply(project);
                          }}
                          className="bg-[#9747FF] hover:bg-[#8534f0] text-white text-xs font-semibold rounded-full px-5 h-8.5 shadow-xs cursor-pointer inline-flex items-center gap-1.5"
                        >
                          <Briefcase className="w-3.5 h-3.5" />
                          <span>Submit Proposal</span>
                        </Button>
                      </div>
                    </article>
                  ))}
                </div>
              )
            )}
          </div>
        </section>

        {/* =========================================================================
            RIGHT COLUMN (lg:col-span-3, hidden on mobile/tablet)
            Client Tips & Escrow Guarantee
           ========================================================================= */}
        <aside className="hidden lg:flex flex-col gap-6 lg:col-span-3 sticky top-20">
          <div className="pb-5 border-b border-[#DADDE1] dark:border-[#2f3032]">
            <div className="flex items-center gap-2 text-gray-900 dark:text-gray-100 mb-2">
              <ShieldCheck className="w-4 h-4 text-[#9747FF]" />
              <h4 className="text-xs font-semibold uppercase tracking-wider">
                Safe Hiring on MyArteLab
              </h4>
            </div>
            <p className="text-xs text-gray-600 dark:text-gray-400 leading-relaxed mb-3">
              Every creative project on MyArteLab is protected by smart escrow. Your deposit is safely reserved and only released once you inspect and approve submitted deliverables.
            </p>

            <div className="space-y-2.5 text-xs text-gray-600 dark:text-gray-400">
              <div className="flex items-start gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-[#9747FF] shrink-0 mt-0.5" />
                <span>Publish project details &amp; receive competitive bids from verified creators.</span>
              </div>
              <div className="flex items-start gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-[#9747FF] shrink-0 mt-0.5" />
                <span>Select a proposal and lock payment in escrow. Creator starts immediately.</span>
              </div>
              <div className="flex items-start gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-[#9747FF] shrink-0 mt-0.5" />
                <span>Review deliverables, request revisions, or approve to release payout.</span>
              </div>
            </div>
          </div>

          <div className="px-1 text-xs text-gray-400">
            <p>© {new Date().getFullYear()} MyArteLab Inc.</p>
          </div>
        </aside>
      </div>

      {/* Post Opportunity Modal */}
      <PostOpportunityModal
        isOpen={isPostModalOpen}
        onClose={() => setIsPostModalOpen(false)}
        onSuccess={() => {
          fetchUserData();
          setActiveTab('my');
        }}
      />

      {/* Apply to Opportunity Modal */}
      {selectedProjectForApply && (
        <ApplyOpportunityModal
          isOpen={!!selectedProjectForApply}
          onClose={() => setSelectedProjectForApply(null)}
          project={selectedProjectForApply}
          onSuccess={() => {
            fetchExploreProjects();
            fetchUserData();
          }}
        />
      )}
    </div>
  );
}
