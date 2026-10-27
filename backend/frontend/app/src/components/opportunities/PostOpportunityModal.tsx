import { useState } from 'react';
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
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { useIsMobile } from '@/hooks/use-mobile';
import { projectService } from '@/lib/api';
import { CREATOR_CATEGORIES } from '@/lib/validations/authSchemas';
import { toast } from '@/components/ui/sonner';
import {
  Briefcase,
  Plus,
  Trash2,
  X,
  ShieldCheck,
  Sparkles,
} from 'lucide-react';
import { Spinner } from '@/components/ui/spinner';
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
  const isMobile = useIsMobile();
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

  const modalBody = (
    <form onSubmit={handleSubmit} className="flex flex-col h-full max-h-[85vh]">
      {/* Header */}
      <div className="shrink-0 flex items-start justify-between pb-4 border-b border-[#DADDE1] dark:border-[#2f3032] px-6 pt-5">
        <div>
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-purple-50 dark:bg-purple-950/50 text-[#9747FF] text-xs font-semibold mb-1.5">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Commission African Talent</span>
          </div>
          <h2 className="text-lg sm:text-xl font-bold text-gray-900 dark:text-gray-100 tracking-tight">
            Publish a Creative Opportunity
          </h2>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
            Describe the project you need done. Verified creators will review and submit proposals.
          </p>
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

      {/* Scrollable Form Content */}
      <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
        {/* Project Title */}
        <div className="space-y-1.5">
          <Label htmlFor="opp-title" className="text-xs font-semibold text-gray-700 dark:text-gray-300">
            Opportunity Title <span className="text-red-500">*</span>
          </Label>
          <Input
            id="opp-title"
            type="text"
            placeholder="e.g. Brand Identity & Logo Suite for African FinTech"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="rounded-xl border-gray-200 dark:border-[#2f3032] text-sm"
            required
          />
        </div>

        {/* Creative Category */}
        <div className="space-y-1.5">
          <Label htmlFor="opp-category" className="text-xs font-semibold text-gray-700 dark:text-gray-300">
            Creative Field / Category <span className="text-red-500">*</span>
          </Label>
          <select
            id="opp-category"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="w-full h-10 px-3 rounded-xl border border-gray-200 dark:border-[#2f3032] bg-white dark:bg-[#18191a] text-gray-900 dark:text-gray-100 text-sm focus:outline-none focus:ring-1 focus:ring-[#9747FF]"
          >
            {CREATOR_CATEGORIES.map((cat) => (
              <option key={cat.id} value={cat.id}>
                {cat.name}
              </option>
            ))}
          </select>
        </div>

        {/* Project Description */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <Label htmlFor="opp-desc" className="text-xs font-semibold text-gray-700 dark:text-gray-300">
              Project Description & Objectives <span className="text-red-500">*</span>
            </Label>
            <span className="text-[11px] text-gray-400">
              {description.length}/3000
            </span>
          </div>
          <Textarea
            id="opp-desc"
            placeholder="Explain what you want built, brand style guidelines, visual tone, audience, and any reference inspirations..."
            rows={4}
            maxLength={3000}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="rounded-xl border-gray-200 dark:border-[#2f3032] text-sm resize-none"
            required
          />
        </div>

        {/* Expected Deliverables */}
        <div className="space-y-2">
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
              className="rounded-xl border-gray-200 dark:border-[#2f3032] text-xs"
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
            <div className="space-y-1.5 mt-2">
              {deliverables.map((item, idx) => (
                <div
                  key={idx}
                  className="flex items-center justify-between py-1.5 px-3 rounded-lg bg-gray-50 dark:bg-gray-800/50 border border-gray-200/60 dark:border-gray-700/60 text-xs text-gray-800 dark:text-gray-200"
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
          {/* Budget Range (USDC) */}
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold text-gray-700 dark:text-gray-300">
              Budget Range (USDC) <span className="text-red-500">*</span>
            </Label>
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-gray-400">
                  Min
                </span>
                <Input
                  type="number"
                  min="10"
                  step="5"
                  value={minBudget}
                  onChange={(e) => setMinBudget(e.target.value)}
                  className="pl-11 rounded-xl border-gray-200 dark:border-[#2f3032] text-xs font-semibold"
                  required
                />
              </div>
              <span className="text-gray-400 text-xs font-bold">-</span>
              <div className="relative flex-1">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-gray-400">
                  Max
                </span>
                <Input
                  type="number"
                  min="10"
                  step="5"
                  value={maxBudget}
                  onChange={(e) => setMaxBudget(e.target.value)}
                  className="pl-11 rounded-xl border-gray-200 dark:border-[#2f3032] text-xs font-semibold"
                  required
                />
              </div>
            </div>
          </div>

          {/* Timeline */}
          <div className="space-y-1.5">
            <Label htmlFor="opp-timeline" className="text-xs font-semibold text-gray-700 dark:text-gray-300">
              Estimated Timeline <span className="text-red-500">*</span>
            </Label>
            <select
              id="opp-timeline"
              value={timeline}
              onChange={(e) => setTimeline(e.target.value)}
              className="w-full h-10 px-3 rounded-xl border border-gray-200 dark:border-[#2f3032] bg-white dark:bg-[#18191a] text-gray-900 dark:text-gray-100 text-xs focus:outline-none focus:ring-1 focus:ring-[#9747FF]"
            >
              {TIMELINE_OPTIONS.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Required Skills */}
        <div className="space-y-1.5">
          <Label htmlFor="opp-skills" className="text-xs font-semibold text-gray-700 dark:text-gray-300">
            Desired Skills or Tools <span className="text-gray-400 font-normal">(optional, comma-separated)</span>
          </Label>
          <Input
            id="opp-skills"
            type="text"
            placeholder="e.g. Figma, Adobe Illustrator, 3D Rendering, Cinema 4D"
            value={skillsInput}
            onChange={(e) => setSkillsInput(e.target.value)}
            className="rounded-xl border-gray-200 dark:border-[#2f3032] text-xs"
          />
        </div>

        {/* Escrow Assurance Banner */}
        <div className="p-3.5 rounded-xl bg-purple-50/60 dark:bg-purple-950/20 border border-purple-200/60 dark:border-purple-800/40 flex items-start gap-3">
          <ShieldCheck className="w-5 h-5 text-[#9747FF] shrink-0 mt-0.5" />
          <div className="text-xs text-gray-600 dark:text-gray-300 leading-relaxed">
            <span className="font-bold text-gray-900 dark:text-gray-100">Escrow Security:</span> Publishing is completely free. Funds are only locked into escrow once you review creator proposals and accept an agreement.
          </div>
        </div>
      </div>

      {/* Footer Actions */}
      <div className="shrink-0 flex items-center justify-end gap-3 p-4 border-t border-[#DADDE1] dark:border-[#2f3032] bg-gray-50/50 dark:bg-[#18191a]">
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
    </form>
  );

  if (isMobile) {
    return (
      <Drawer open={isOpen} onOpenChange={(open) => !open && onClose()}>
        <DrawerContent className="p-0 bg-white dark:bg-[#18191a] max-h-[92vh]">
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
      <DialogContent className="sm:max-w-xl p-0 bg-white dark:bg-[#18191a] border border-[#DADDE1] dark:border-[#2f3032] overflow-hidden">
        <DialogTitle className="sr-only">Publish Creative Opportunity</DialogTitle>
        <DialogDescription className="sr-only">
          Create an opportunity for African visual creators
        </DialogDescription>
        {modalBody}
      </DialogContent>
    </Dialog>
  );
}
