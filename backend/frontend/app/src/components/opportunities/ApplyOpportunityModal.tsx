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
import { toast } from '@/components/ui/sonner';
import {
  Briefcase,
  Plus,
  Trash2,
  X,
  Send,
} from 'lucide-react';
import { Spinner } from '@/components/ui/spinner';
import type { Project } from '@/types';

interface ApplyOpportunityModalProps {
  isOpen: boolean;
  onClose: () => void;
  project: Project;
  onSuccess?: () => void;
}

export function ApplyOpportunityModal({ isOpen, onClose, project, onSuccess }: ApplyOpportunityModalProps) {
  const isMobile = useIsMobile();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [proposedAmount, setProposedAmount] = useState(
    project.budget?.max ? String(project.budget.max) : '150'
  );
  const [proposedTimeline, setProposedTimeline] = useState(project.timeline || '1 to 2 weeks');
  const [coverLetter, setCoverLetter] = useState('');
  const [portfolioLink, setPortfolioLink] = useState('');
  const [portfolioLinks, setPortfolioLinks] = useState<Array<{ url: string; title: string }>>([]);

  const handleAddLink = () => {
    const trimmed = portfolioLink.trim();
    if (!trimmed) return;
    if (!trimmed.startsWith('http://') && !trimmed.startsWith('https://')) {
      toast.error('Please enter a valid URL (starting with https://)');
      return;
    }
    setPortfolioLinks([...portfolioLinks, { url: trimmed, title: 'Portfolio Work' }]);
    setPortfolioLink('');
  };

  const handleRemoveLink = (idx: number) => {
    setPortfolioLinks(portfolioLinks.filter((_, i) => i !== idx));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const amt = parseFloat(proposedAmount);
    if (isNaN(amt) || amt <= 0) {
      toast.error('Please enter a valid proposed amount in USDC');
      return;
    }

    if (!proposedTimeline.trim()) {
      toast.error('Please specify your proposed turnaround timeline');
      return;
    }

    if (!coverLetter.trim() || coverLetter.trim().length < 20) {
      toast.error('Please include a brief proposal message (at least 20 characters)');
      return;
    }

    setIsSubmitting(true);
    try {
      await projectService.applyToProject(project._id, {
        coverLetter: coverLetter.trim(),
        proposedBudget: {
          amount: amt,
          currency: project.budget?.currency || 'USDC',
        },
        proposedTimeline: proposedTimeline.trim(),
        portfolioLinks,
      });

      toast.success('Your proposal has been submitted to the client!');
      onClose();
      if (onSuccess) {
        onSuccess();
      }
    } catch (error: any) {
      console.error('Failed to submit application:', error);
      toast.error(error.response?.data?.message || 'Failed to submit application.');
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
            <Briefcase className="w-3.5 h-3.5" />
            <span>Submit Proposal</span>
          </div>
          <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100 tracking-tight line-clamp-1">
            {project.title}
          </h2>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
            Budget guide: {project.budget?.min} - {project.budget?.max} {project.budget?.currency || 'USDC'}
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

      {/* Form Content */}
      <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4">
        {/* Proposed Budget & Timeline */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold text-gray-700 dark:text-gray-300">
              Proposed Price (USDC) <span className="text-red-500">*</span>
            </Label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-gray-400">
                USDC
              </span>
              <Input
                type="number"
                min="10"
                step="5"
                value={proposedAmount}
                onChange={(e) => setProposedAmount(e.target.value)}
                className="pl-14 rounded-xl border-gray-200 dark:border-[#2f3032] text-xs font-semibold"
                required
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-semibold text-gray-700 dark:text-gray-300">
              Turnaround Timeline <span className="text-red-500">*</span>
            </Label>
            <Input
              type="text"
              placeholder="e.g. 5 days, 2 weeks"
              value={proposedTimeline}
              onChange={(e) => setProposedTimeline(e.target.value)}
              className="rounded-xl border-gray-200 dark:border-[#2f3032] text-xs"
              required
            />
          </div>
        </div>

        {/* Cover Letter / Pitch */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <Label className="text-xs font-semibold text-gray-700 dark:text-gray-300">
              Your Proposal &amp; Approach <span className="text-red-500">*</span>
            </Label>
            <span className="text-[11px] text-gray-400">{coverLetter.length}/2000</span>
          </div>
          <Textarea
            rows={4}
            maxLength={2000}
            placeholder="Introduce yourself, explain how you'll approach their goals, and cite relevant visual experience..."
            value={coverLetter}
            onChange={(e) => setCoverLetter(e.target.value)}
            className="rounded-xl border-gray-200 dark:border-[#2f3032] text-xs resize-none"
            required
          />
        </div>

        {/* Portfolio Samples / Links */}
        <div className="space-y-2">
          <Label className="text-xs font-semibold text-gray-700 dark:text-gray-300">
            Relevant Portfolio Link(s)
          </Label>
          <div className="flex gap-2">
            <Input
              type="url"
              placeholder="https://myartelab.com/post/... or your site"
              value={portfolioLink}
              onChange={(e) => setPortfolioLink(e.target.value)}
              className="rounded-xl border-gray-200 dark:border-[#2f3032] text-xs"
            />
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleAddLink}
              className="rounded-xl border-[#9747FF]/30 text-[#9747FF] hover:bg-[#9747FF]/10 shrink-0 text-xs font-semibold cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5 mr-1" />
              Add
            </Button>
          </div>

          {portfolioLinks.length > 0 && (
            <div className="space-y-1.5 mt-2">
              {portfolioLinks.map((item, idx) => (
                <div
                  key={idx}
                  className="flex items-center justify-between py-1.5 px-3 rounded-lg bg-gray-50 dark:bg-gray-800/50 border border-gray-200/60 dark:border-gray-700/60 text-xs text-gray-800 dark:text-gray-200"
                >
                  <span className="truncate pr-2 font-mono text-[11px]">{item.url}</span>
                  <button
                    type="button"
                    onClick={() => handleRemoveLink(idx)}
                    className="text-gray-400 hover:text-red-500 transition-colors p-1 cursor-pointer shrink-0"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}
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
              <span>Submitting...</span>
            </>
          ) : (
            <>
              <Send className="w-3.5 h-3.5" />
              <span>Submit Proposal</span>
            </>
          )}
        </Button>
      </div>
    </form>
  );

  if (isMobile) {
    return (
      <Drawer open={isOpen} onOpenChange={(open) => !open && onClose()}>
        <DrawerContent className="p-0 bg-white dark:bg-[#18191a] max-h-[90vh]">
          <DrawerTitle className="sr-only">Submit Proposal</DrawerTitle>
          <DrawerDescription className="sr-only">
            Submit a proposal for this project
          </DrawerDescription>
          {modalBody}
        </DrawerContent>
      </Drawer>
    );
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-lg p-0 bg-white dark:bg-[#18191a] border border-[#DADDE1] dark:border-[#2f3032] overflow-hidden">
        <DialogTitle className="sr-only">Submit Proposal</DialogTitle>
        <DialogDescription className="sr-only">
          Submit a proposal for this project
        </DialogDescription>
        {modalBody}
      </DialogContent>
    </Dialog>
  );
}
