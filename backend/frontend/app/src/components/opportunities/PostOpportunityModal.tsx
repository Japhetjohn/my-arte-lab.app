import { useState, useRef, useEffect } from 'react';
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
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/contexts/AuthContext';
import { useIsMobile } from '@/hooks/use-mobile';
import { projectService, uploadService } from '@/lib/api';
import { CREATOR_CATEGORIES } from '@/lib/validations/authSchemas';
import { toast } from '@/components/ui/sonner';
import {
  Briefcase,
  Plus,
  Trash2,
  X,
  ShieldCheck,
  Image as ImageIcon,
} from 'lucide-react';
import { Spinner } from '@/components/ui/spinner';
import { ImageUploader, type ImageUploadItem } from '@/components/social/ImageUploader';
import { ImageUploadDrawer } from '@/components/social/ImageUploadDrawer';
import { getAvatarUrl } from '@/lib/imageUrl';
import type { Project } from '@/types';

interface PostOpportunityModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (project: Project) => void;
}

const TIMELINE_OPTIONS = [
  'Less than 1 week',
  '1 to 2 weeks',
  '2 to 4 weeks',
  '1 to 2 months',
  'More than 2 months',
  'Flexible / Ongoing',
];

export function PostOpportunityModal({ isOpen, onClose, onSuccess }: PostOpportunityModalProps) {
  const { user } = useAuth();
  const isMobile = useIsMobile();
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form State
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState<string>('graphic_design');
  const [description, setDescription] = useState('');
  const [minBudget, setMinBudget] = useState('100');
  const [maxBudget, setMaxBudget] = useState('300');
  const [timeline, setTimeline] = useState('1 to 2 weeks');
  const [skillsInput, setSkillsInput] = useState('');
  const [deliverables, setDeliverables] = useState<string[]>([
    'Primary Design Assets',
  ]);
  const [newDeliverableText, setNewDeliverableText] = useState('');

  // Reusable Media Attachment State (matches creator PostComposer)
  const [images, setImages] = useState<ImageUploadItem[]>([]);
  const [showInlineUploader, setShowInlineUploader] = useState(false);
  const [showMobileDrawer, setShowMobileDrawer] = useState(false);

  // Auto-resize description textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(240, Math.max(80, textareaRef.current.scrollHeight))}px`;
    }
  }, [description]);

  const handleOpenImageUploader = () => {
    if (isMobile) {
      setShowMobileDrawer(true);
    } else {
      setShowInlineUploader((prev) => !prev);
    }
  };

  const handleAddDeliverable = () => {
    const trimmed = newDeliverableText.trim();
    if (!trimmed) return;
    if (deliverables.includes(trimmed)) {
      toast.info('Deliverable already added');
      return;
    }
    setDeliverables([...deliverables, trimmed]);
    setNewDeliverableText('');
  };

  const handleRemoveDeliverable = (index: number) => {
    setDeliverables(deliverables.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!title.trim() || title.trim().length < 5) {
      toast.error('Please enter a descriptive project title (at least 5 characters)');
      return;
    }

    if (!description.trim() || description.trim().length < 20) {
      toast.error('Please provide more project details (at least 20 characters)');
      return;
    }

    const min = parseFloat(minBudget);
    const max = parseFloat(maxBudget);

    if (isNaN(min) || min < 10) {
      toast.error('Minimum budget must be at least 10 USDC');
      return;
    }

    if (isNaN(max) || max < min) {
      toast.error('Maximum budget cannot be less than minimum budget');
      return;
    }

    const skills = skillsInput
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);

    setIsSubmitting(true);
    try {
      // 1. Upload any attached files via uploadService (exact same as creator flow)
      const uploadedImageUrls: string[] = [];
      for (const item of images) {
        if (item.file) {
          const res = await uploadService.uploadImage(item.file);
          if (res.data?.data?.url) {
            uploadedImageUrls.push(res.data.data.url);
          }
        } else if (item.url) {
          uploadedImageUrls.push(item.url);
        }
      }

      // 2. Submit new project opportunity
      const response = await projectService.createProject({
        title: title.trim(),
        description: description.trim(),
        category,
        budget: {
          min,
          max,
          currency: 'USDC',
          negotiable: true,
        },
        timeline,
        skillsRequired: skills,
        deliverables: deliverables.length > 0 ? deliverables : ['Completed creative deliverables'],
        projectType: 'one-time',
        coverImage: uploadedImageUrls[0] || undefined,
        attachments: uploadedImageUrls.map((url, i) => ({ url, name: `Attachment ${i + 1}` })),
      });

      const newProject = response.data?.data?.project;
      toast.success('Creative opportunity published successfully!');
      onClose();
      if (onSuccess && newProject) {
        onSuccess(newProject);
      } else {
        window.location.href = '/projects';
      }
    } catch (error: any) {
      console.error('Failed to create opportunity:', error);
      toast.error(error.response?.data?.message || 'Failed to publish opportunity. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const userInitial = user?.firstName?.[0] || user?.name?.[0] || 'C';

  const modalBody = (
    <form onSubmit={handleSubmit} className="flex flex-col h-full max-h-[88vh]">
      {/* Header with User Identity - Shared with PostComposer */}
      <div className="shrink-0 flex items-center justify-between pb-3.5 border-b border-[#DADDE1] dark:border-[#2f3032] px-5 sm:px-6 pt-5">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full overflow-hidden bg-purple-100 dark:bg-purple-950/40 flex items-center justify-center shrink-0 border border-purple-200/60 dark:border-purple-800/40 shadow-xs">
            {user?.avatar ? (
              <img
                src={getAvatarUrl(user.avatar)}
                alt={user.name || 'User'}
                className="w-full h-full object-cover"
              />
            ) : (
              <span className="text-[#9747FF] font-bold text-sm">
                {userInitial}
              </span>
            )}
          </div>
          <div>
            <h2 className="text-base sm:text-lg font-bold text-gray-900 dark:text-gray-100 tracking-tight leading-tight">
              Post a Creative Opportunity
            </h2>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Commission verified African talent with milestone escrow
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="w-8 h-8 rounded-full bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-500 dark:text-gray-400 flex items-center justify-center transition-colors cursor-pointer shrink-0"
          aria-label="Close"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Scrollable Form Content - Clean ash divider rhythm, no nested card boxes */}
      <div className="flex-1 overflow-y-auto px-5 sm:px-6 py-4 space-y-4">
        {/* Project Title */}
        <div className="space-y-1">
          <Label htmlFor="opp-title" className="text-xs font-semibold text-gray-700 dark:text-gray-300">
            Opportunity Title <span className="text-red-500">*</span>
          </Label>
          <Input
            id="opp-title"
            type="text"
            placeholder="e.g. Brand Identity & Logo Suite for African FinTech"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="rounded-xl border border-[#DADDE1] dark:border-[#2f3032] bg-white dark:bg-[#18191a] text-sm focus:outline-none focus:ring-1 focus:ring-[#9747FF]"
            required
          />
        </div>

        {/* Creative Category */}
        <div className="space-y-1">
          <Label htmlFor="opp-category" className="text-xs font-semibold text-gray-700 dark:text-gray-300">
            Creative Field / Discipline <span className="text-red-500">*</span>
          </Label>
          <select
            id="opp-category"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="w-full h-10 px-3 rounded-xl border border-[#DADDE1] dark:border-[#2f3032] bg-white dark:bg-[#18191a] text-gray-900 dark:text-gray-100 text-sm focus:outline-none focus:ring-1 focus:ring-[#9747FF]"
          >
            {CREATOR_CATEGORIES.map((cat) => (
              <option key={cat.id} value={cat.id}>
                {cat.name}
              </option>
            ))}
          </select>
        </div>

        {/* Project Description (matches PostComposer textarea) */}
        <div className="space-y-1">
          <div className="flex items-center justify-between">
            <Label htmlFor="opp-desc" className="text-xs font-semibold text-gray-700 dark:text-gray-300">
              Project Brief &amp; Scope <span className="text-red-500">*</span>
            </Label>
            <span className="text-[11px] text-gray-400">
              {description.length}/3000
            </span>
          </div>
          <textarea
            ref={textareaRef}
            id="opp-desc"
            placeholder="Explain what you want built, brand style guidelines, visual tone, audience, and any reference inspirations..."
            rows={3}
            maxLength={3000}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="w-full resize-none rounded-xl border border-[#DADDE1] dark:border-[#2f3032] bg-white dark:bg-[#18191a] p-3 text-sm text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 leading-relaxed focus:outline-none focus:ring-1 focus:ring-[#9747FF]"
            required
          />
        </div>

        {/* Desktop Inline Image Uploader - Reused from PostComposer */}
        {!isMobile && showInlineUploader && (
          <div className="pt-2 animate-in fade-in duration-200">
            <ImageUploader
              images={images}
              onImagesChange={setImages}
              maxImages={5}
              maxSizeMB={20}
              title="Reference Inspirations & Moodboard"
            />
          </div>
        )}

        {/* Thumbnail Preview Chips if Uploader Collapsed */}
        {!isMobile && !showInlineUploader && images.length > 0 && (
          <div className="flex items-center gap-2 overflow-x-auto pb-1">
            {images.map((item) => (
              <div
                key={item.id}
                className="relative w-14 h-14 rounded-lg overflow-hidden border border-[#DADDE1] dark:border-[#2f3032] shrink-0"
              >
                <img
                  src={item.url}
                  alt="Attachment"
                  className="w-full h-full object-cover"
                />
              </div>
            ))}
            <button
              type="button"
              onClick={() => setShowInlineUploader(true)}
              className="text-xs text-[#9747FF] hover:underline font-medium px-2 py-1 cursor-pointer"
            >
              Edit files ({images.length})
            </button>
          </div>
        )}

        {/* Deliverables - Clean thin ash-divider list (No rectangular card boxes) */}
        <div className="space-y-1.5">
          <Label className="text-xs font-semibold text-gray-700 dark:text-gray-300">
            Expected Deliverables
          </Label>
          <div className="flex gap-2">
            <Input
              type="text"
              placeholder="e.g. High-res vector logo (.SVG, .AI)"
              value={newDeliverableText}
              onChange={(e) => setNewDeliverableText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleAddDeliverable();
                }
              }}
              className="rounded-xl border border-[#DADDE1] dark:border-[#2f3032] bg-white dark:bg-[#18191a] text-xs"
            />
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleAddDeliverable}
              className="rounded-xl border-[#9747FF]/30 text-[#9747FF] hover:bg-[#9747FF]/10 shrink-0 text-xs font-semibold cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5 mr-1" />
              Add
            </Button>
          </div>

          {deliverables.length > 0 && (
            <div className="divide-y divide-[#DADDE1]/60 dark:divide-[#2f3032] border-t border-b border-[#DADDE1]/60 dark:border-[#2f3032] mt-2">
              {deliverables.map((item, idx) => (
                <div
                  key={idx}
                  className="flex items-center justify-between py-2 px-1 text-xs text-gray-800 dark:text-gray-200"
                >
                  <span className="truncate pr-2">{item}</span>
                  <button
                    type="button"
                    onClick={() => handleRemoveDeliverable(idx)}
                    className="text-gray-400 hover:text-red-500 transition-colors p-1 cursor-pointer shrink-0"
                    title="Remove deliverable"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Budget & Timeline */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1">
            <Label className="text-xs font-semibold text-gray-700 dark:text-gray-300">
              Budget Range (USDC) <span className="text-red-500">*</span>
            </Label>
            <div className="flex items-center gap-2">
              <Input
                type="number"
                min="10"
                step="5"
                placeholder="Min (USDC)"
                value={minBudget}
                onChange={(e) => setMinBudget(e.target.value)}
                className="rounded-xl border border-[#DADDE1] dark:border-[#2f3032] bg-white dark:bg-[#18191a] text-xs font-semibold"
                required
              />
              <span className="text-gray-400 text-xs font-bold">-</span>
              <Input
                type="number"
                min="10"
                step="5"
                placeholder="Max (USDC)"
                value={maxBudget}
                onChange={(e) => setMaxBudget(e.target.value)}
                className="rounded-xl border border-[#DADDE1] dark:border-[#2f3032] bg-white dark:bg-[#18191a] text-xs font-semibold"
                required
              />
            </div>
          </div>

          <div className="space-y-1">
            <Label htmlFor="opp-timeline" className="text-xs font-semibold text-gray-700 dark:text-gray-300">
              Estimated Timeline <span className="text-red-500">*</span>
            </Label>
            <select
              id="opp-timeline"
              value={timeline}
              onChange={(e) => setTimeline(e.target.value)}
              className="w-full h-10 px-3 rounded-xl border border-[#DADDE1] dark:border-[#2f3032] bg-white dark:bg-[#18191a] text-gray-900 dark:text-gray-100 text-xs focus:outline-none focus:ring-1 focus:ring-[#9747FF]"
            >
              {TIMELINE_OPTIONS.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Desired Skills */}
        <div className="space-y-1">
          <Label htmlFor="opp-skills" className="text-xs font-semibold text-gray-700 dark:text-gray-300">
            Desired Skills or Tools <span className="text-gray-400 font-normal">(optional, comma-separated)</span>
          </Label>
          <Input
            id="opp-skills"
            type="text"
            placeholder="e.g. Figma, Adobe Illustrator, 3D Rendering, Cinema 4D"
            value={skillsInput}
            onChange={(e) => setSkillsInput(e.target.value)}
            className="rounded-xl border border-[#DADDE1] dark:border-[#2f3032] bg-white dark:bg-[#18191a] text-xs"
          />
        </div>

        {/* Subtle Escrow Guarantee Note - Thin Straight Divider (No Box) */}
        <div className="pt-3 border-t border-[#DADDE1] dark:border-[#2f3032] flex items-center justify-between text-xs text-gray-500">
          <div className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 font-medium">
            <ShieldCheck className="w-4 h-4 shrink-0" />
            <span>Escrow Protected &bull; Funds released only after milestone approval</span>
          </div>
        </div>
      </div>

      {/* Footer Actions & Media Toolbar - Matching PostComposer */}
      <div className="shrink-0 flex items-center justify-between p-4 border-t border-[#DADDE1] dark:border-[#2f3032] bg-white dark:bg-[#18191a]">
        {/* Media Attach Button (Reuses PostComposer pattern) */}
        <button
          type="button"
          onClick={handleOpenImageUploader}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium text-gray-600 dark:text-gray-300 hover:text-[#9747FF] hover:bg-purple-50/70 dark:hover:bg-purple-950/40 transition-colors cursor-pointer"
          title="Attach reference photos or brief moodboards"
        >
          <ImageIcon className="w-4 h-4 text-[#9747FF]" />
          <span>{images.length > 0 ? `${images.length}/5 files` : 'Add references'}</span>
        </button>

        <div className="flex items-center gap-3">
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            disabled={isSubmitting}
            className="rounded-full px-5 text-xs font-medium cursor-pointer"
          >
            Cancel
          </Button>
          <Button
            type="submit"
            disabled={isSubmitting}
            className="rounded-full bg-[#9747FF] hover:bg-[#8534f0] text-white px-6 text-xs font-semibold shadow-xs cursor-pointer inline-flex items-center gap-2"
          >
            {isSubmitting ? (
              <>
                <Spinner size="xs" variant="white" />
                <span>Publishing...</span>
              </>
            ) : (
              <>
                <Briefcase className="w-3.5 h-3.5" />
                <span>Publish Opportunity</span>
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Mobile Image Upload Drawer (Reused from PostComposer) */}
      <ImageUploadDrawer
        isOpen={showMobileDrawer}
        onClose={() => setShowMobileDrawer(false)}
        images={images}
        onImagesChange={setImages}
        maxImages={5}
      />
    </form>
  );

  if (isMobile) {
    return (
      <Drawer open={isOpen} onOpenChange={(open) => !open && onClose()}>
        <DrawerContent className="p-0 bg-white dark:bg-[#1a1b1c] rounded-t-2xl max-h-[92dvh] flex flex-col border-t border-[#DADDE1] dark:border-[#2f3032] shadow-2xl focus:outline-none z-[150]">
          <DrawerTitle className="sr-only">Publish Creative Opportunity</DrawerTitle>
          <DrawerDescription className="sr-only">
            Create an opportunity for African visual creators
          </DrawerDescription>
          {modalBody}
        </DrawerContent>
      </Drawer>
    );
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-xl p-0 bg-white dark:bg-[#18191a] border border-[#DADDE1] dark:border-[#2f3032] rounded-2xl shadow-xl overflow-hidden">
        <DialogTitle className="sr-only">Publish Creative Opportunity</DialogTitle>
        <DialogDescription className="sr-only">
          Create an opportunity for African visual creators
        </DialogDescription>
        {modalBody}
      </DialogContent>
    </Dialog>
  );
}
