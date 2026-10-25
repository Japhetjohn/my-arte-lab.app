import React, { useState, useRef } from 'react';
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
import { getAvatarUrl } from '@/lib/imageUrl';
import { VerifiedBadge } from '@/components/shared/VerifiedBadge';
import { useIsMobile } from '@/hooks/use-mobile';
import { bookingWorkflowService } from '@/lib/bookingWorkflow';
import { uploadService } from '@/lib/api';
import { toast } from '@/components/ui/sonner';
import { cn } from '@/lib/utils';
import {
  Loader2,
  Calendar,
  DollarSign,
  Plus,
  Trash2,
  UploadCloud,
  X,
  CheckCircle2,
  Clock,
  ChevronRight,
  ChevronLeft,
  ShieldCheck,
  PackageCheck,
} from 'lucide-react';

interface Creator {
  id: string;
  name: string;
  avatar?: string;
  category?: string | string[];
  isVerified?: boolean;
}

interface DeliverableDraft {
  title: string;
  format: string;
  description: string;
}

interface ReferenceFile {
  name: string;
  size: number;
  previewUrl: string;
  url?: string;
}

interface NewBookingModalProps {
  isOpen: boolean;
  onClose: () => void;
  creator: Creator;
  onSuccess?: () => void;
}

const DELIVERABLE_FORMATS = [
  'Design Source (Figma / Sketch)',
  'Vector Asset (.SVG / .EPS / .AI)',
  'High-Res Image (.PNG / .JPG)',
  'Document / Presentation (.PDF / .DOCX)',
  'Video / Animation (.MP4 / .MOV)',
  'Audio / Voiceover (.MP3 / .WAV)',
  'Code / Repository (.ZIP / GitHub)',
  'Other / Custom',
];

export function NewBookingModal({ isOpen, onClose, creator, onSuccess }: NewBookingModalProps) {
  const isMobile = useIsMobile();
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Stepper state (1: Scope & Deliverables, 2: Timeline & Budget, 3: Review & Confirm)
  const [currentStep, setCurrentStep] = useState<1 | 2 | 3>(1);
  const [isLoading, setIsLoading] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  // Form state
  const [form, setForm] = useState({
    serviceTitle: '',
    serviceDescription: '',
    category: Array.isArray(creator.category) ? creator.category[0] : creator.category || 'Creative Design',
    amount: '',
    startDate: new Date().toISOString().split('T')[0],
    endDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    notes: '',
  });

  // Dynamic deliverables builder
  const [deliverables, setDeliverables] = useState<DeliverableDraft[]>([
    { title: '', format: 'Design Source (Figma / Sketch)', description: '' },
  ]);

  // Reference files/images
  const [referenceFiles, setReferenceFiles] = useState<ReferenceFile[]>([]);

  const resetForm = () => {
    setCurrentStep(1);
    setForm({
      serviceTitle: '',
      serviceDescription: '',
      category: Array.isArray(creator.category) ? creator.category[0] : creator.category || 'Creative Design',
      amount: '',
      startDate: new Date().toISOString().split('T')[0],
      endDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      notes: '',
    });
    setDeliverables([{ title: '', format: 'Design Source (Figma / Sketch)', description: '' }]);
    setReferenceFiles([]);
  };

  const handleClose = () => {
    if (!isLoading) {
      resetForm();
      onClose();
    }
  };

  // Add / remove deliverable requirement
  const handleAddDeliverable = () => {
    setDeliverables([
      ...deliverables,
      { title: '', format: 'High-Res Image (.PNG / .JPG)', description: '' },
    ]);
  };

  const handleRemoveDeliverable = (index: number) => {
    if (deliverables.length === 1) {
      setDeliverables([{ title: '', format: 'Design Source (Figma / Sketch)', description: '' }]);
      return;
    }
    setDeliverables(deliverables.filter((_, i) => i !== index));
  };

  const handleDeliverableChange = (index: number, field: keyof DeliverableDraft, value: string) => {
    const updated = [...deliverables];
    updated[index][field] = value;
    setDeliverables(updated);
  };

  // File upload handler
  const handleFilesSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setIsUploading(true);
    const newRefs: ReferenceFile[] = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const previewUrl = URL.createObjectURL(file);

      try {
        // Try uploading to backend
        const res = await uploadService.uploadImage(file);
        const uploadedUrl = res.data?.data?.url || res.data?.url || previewUrl;
        newRefs.push({
          name: file.name,
          size: file.size,
          previewUrl: uploadedUrl,
          url: uploadedUrl,
        });
      } catch {
        // Fallback to local preview
        newRefs.push({
          name: file.name,
          size: file.size,
          previewUrl,
          url: previewUrl,
        });
      }
    }

    setReferenceFiles((prev) => [...prev, ...newRefs]);
    setIsUploading(false);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleRemoveFile = (index: number) => {
    setReferenceFiles((prev) => prev.filter((_, i) => i !== index));
  };

  // Financial calculations
  const parsedAmount = parseFloat(form.amount) || 0;
  const platformFee = Math.round(parsedAmount * 0.1 * 100) / 100;
  const creatorEarnings = Math.max(0, parsedAmount - platformFee);

  // Validations per step
  const handleNextStep = () => {
    if (currentStep === 1) {
      if (!form.serviceTitle.trim()) {
        toast.error('Please enter a project title');
        return;
      }
      if (!form.serviceDescription.trim()) {
        toast.error('Please provide a project description');
        return;
      }
      const validDeliverables = deliverables.filter((d) => d.title.trim().length > 0);
      if (validDeliverables.length === 0) {
        toast.error('Please add at least one expected deliverable item');
        return;
      }
      setCurrentStep(2);
    } else if (currentStep === 2) {
      if (!form.amount || parsedAmount < 1) {
        toast.error('Please enter a valid budget of at least $1 USDC');
        return;
      }
      if (!form.endDate) {
        toast.error('Please select an expected completion date');
        return;
      }
      if (new Date(form.endDate) < new Date(form.startDate)) {
        toast.error('Completion date cannot be earlier than start date');
        return;
      }
      setCurrentStep(3);
    }
  };

  // Submit booking request
  const handleSubmitBooking = async () => {
    const validDeliverables = deliverables
      .filter((d) => d.title.trim().length > 0)
      .map((d) => ({
        title: d.title.trim(),
        format: d.format,
        description: d.description.trim(),
      }));

    const attachmentUrls = referenceFiles.map((f) => f.url || f.previewUrl);

    try {
      setIsLoading(true);
      await bookingWorkflowService.createBooking({
        creatorId: creator.id,
        serviceTitle: form.serviceTitle.trim(),
        serviceDescription: form.serviceDescription.trim(),
        category: form.category,
        amount: parsedAmount,
        currency: 'USDC',
        startDate: new Date(form.startDate).toISOString(),
        endDate: new Date(form.endDate).toISOString(),
        expectedDeliverables: validDeliverables,
        attachments: attachmentUrls,
        metadata: {
          notes: form.notes.trim(),
        },
      });

      toast.success('Booking request sent successfully!');
      handleClose();
      onSuccess?.();
      window.location.href = '/bookings';
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to submit booking request');
    } finally {
      setIsLoading(false);
    }
  };

  // Stepper Header
  const renderStepper = () => (
    <div className="flex items-center justify-between px-1 py-3 border-b border-[#DADDE1] dark:border-[#2f3032] mb-4">
      {[
        { step: 1, label: 'Scope & Deliverables' },
        { step: 2, label: 'Timeline & Budget' },
        { step: 3, label: 'Review & Submit' },
      ].map((item, idx) => {
        const isDone = currentStep > item.step;
        const isCurrent = currentStep === item.step;
        return (
          <div key={item.step} className="flex items-center gap-2">
            <div
              className={cn(
                'w-6 h-6 rounded-full flex items-center justify-center text-xs font-semibold transition-all',
                isDone && 'bg-[#9747FF] text-white',
                isCurrent && 'bg-[#9747FF] text-white ring-2 ring-[#9747FF]/30',
                !isDone && !isCurrent && 'bg-gray-100 dark:bg-gray-800 text-gray-400'
              )}
            >
              {isDone ? <CheckCircle2 className="w-3.5 h-3.5" /> : item.step}
            </div>
            <span
              className={cn(
                'text-xs hidden sm:inline-block font-medium',
                isCurrent ? 'text-gray-900 dark:text-gray-100 font-semibold' : 'text-gray-500 dark:text-gray-400'
              )}
            >
              {item.label}
            </span>
            {idx < 2 && <div className="w-6 sm:w-12 h-px bg-[#DADDE1] dark:bg-[#2f3032] mx-1" />}
          </div>
        );
      })}
    </div>
  );

  // Content body per step
  const renderStepContent = () => {
    switch (currentStep) {
      case 1:
        return (
          <div className="space-y-4">
            {/* Project Title */}
            <div className="space-y-1.5">
              <Label htmlFor="serviceTitle" className="text-xs font-semibold text-gray-800 dark:text-gray-200">
                Project Title <span className="text-[#9747FF]">*</span>
              </Label>
              <Input
                id="serviceTitle"
                variant="line"
                placeholder="e.g. Brand Identity & UI Design System"
                value={form.serviceTitle}
                onChange={(e) => setForm({ ...form, serviceTitle: e.target.value })}
                className="h-10 text-sm"
              />
            </div>

            {/* Category */}
            <div className="space-y-1.5">
              <Label htmlFor="category" className="text-xs font-semibold text-gray-800 dark:text-gray-200">
                Service Category
              </Label>
              <Input
                id="category"
                variant="line"
                value={form.category}
                onChange={(e) => setForm({ ...form, category: e.target.value })}
                placeholder="e.g. Graphic Design, 3D Art, Video"
                className="h-10 text-sm"
              />
            </div>

            {/* Description */}
            <div className="space-y-1.5">
              <Label htmlFor="serviceDescription" className="text-xs font-semibold text-gray-800 dark:text-gray-200">
                Project Scope &amp; Brief <span className="text-[#9747FF]">*</span>
              </Label>
              <Textarea
                id="serviceDescription"
                variant="line"
                rows={3}
                placeholder="Detail your goals, visual style, key constraints, references, and what you expect from the creator..."
                value={form.serviceDescription}
                onChange={(e) => setForm({ ...form, serviceDescription: e.target.value })}
                className="text-sm resize-none"
              />
            </div>

            {/* Deliverables Builder */}
            <div className="space-y-2 pt-2">
              <div className="flex items-center justify-between pb-1.5 border-b border-[#DADDE1] dark:border-[#2f3032]">
                <div>
                  <h4 className="text-xs font-bold text-gray-900 dark:text-gray-100 uppercase tracking-wider">
                    Expected Deliverables <span className="text-[#9747FF]">*</span>
                  </h4>
                  <p className="text-[11px] text-gray-500 dark:text-gray-400">
                    Define individual items the creator must submit for approval.
                  </p>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleAddDeliverable}
                  className="h-7 text-xs rounded-full border-[#DADDE1] dark:border-[#2f3032] text-[#9747FF] hover:bg-purple-50 dark:hover:bg-purple-950/40"
                >
                  <Plus className="w-3.5 h-3.5 mr-1" />
                  Add Item
                </Button>
              </div>

              <div className="space-y-3 max-h-60 overflow-y-auto pr-1 divide-y divide-[#DADDE1]/60 dark:divide-[#2f3032]/60">
                {deliverables.map((item, index) => (
                  <div
                    key={index}
                    className={cn("space-y-2 relative group", index > 0 && "pt-3")}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[11px] font-semibold text-[#9747FF] uppercase tracking-wider">
                        Item #{index + 1}
                      </span>
                      {deliverables.length > 1 && (
                        <button
                          type="button"
                          onClick={() => handleRemoveDeliverable(index)}
                          className="text-gray-400 hover:text-red-500 transition-colors p-1"
                          title="Remove item"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <Input
                          variant="line"
                          placeholder="Deliverable title (e.g. Logo Vector)"
                          value={item.title}
                          onChange={(e) => handleDeliverableChange(index, 'title', e.target.value)}
                          className="h-8 text-xs"
                        />
                      </div>
                      <div>
                        <select
                          value={item.format}
                          onChange={(e) => handleDeliverableChange(index, 'format', e.target.value)}
                          className="w-full h-8 text-xs bg-transparent border-0 border-b border-[#DADDE1] dark:border-[#2f3032] rounded-none px-0 py-1 text-gray-800 dark:text-gray-200 focus:outline-none focus:ring-0 focus:border-[#9747FF] transition-colors"
                        >
                          {DELIVERABLE_FORMATS.map((fmt) => (
                            <option key={fmt} value={fmt} className="bg-white dark:bg-[#1a1b1c] text-gray-900 dark:text-gray-100">
                              {fmt}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>

                    <Input
                      variant="line"
                      placeholder="Requirements / Acceptance criteria (optional)"
                      value={item.description}
                      onChange={(e) => handleDeliverableChange(index, 'description', e.target.value)}
                      className="h-8 text-xs"
                    />
                  </div>
                ))}
              </div>
            </div>
          </div>
        );

      case 2:
        return (
          <div className="space-y-4">
            {/* Timeline */}
            <div className="space-y-2">
              <Label className="text-xs font-semibold text-gray-800 dark:text-gray-200">
                Project Timeline <span className="text-[#9747FF]">*</span>
              </Label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <span className="text-[11px] text-gray-500 dark:text-gray-400">Target Start Date</span>
                  <div className="relative">
                    <Calendar className="w-4 h-4 text-gray-400 absolute left-0 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <Input
                      type="date"
                      variant="line"
                      value={form.startDate}
                      onChange={(e) => setForm({ ...form, startDate: e.target.value })}
                      className="pl-6 h-9 text-xs"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <span className="text-[11px] text-gray-500 dark:text-gray-400">Expected Delivery Deadline</span>
                  <div className="relative">
                    <Clock className="w-4 h-4 text-gray-400 absolute left-0 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <Input
                      type="date"
                      variant="line"
                      value={form.endDate}
                      onChange={(e) => setForm({ ...form, endDate: e.target.value })}
                      className="pl-6 h-9 text-xs"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Budget / Price */}
            <div className="space-y-2 pt-2 border-t border-[#DADDE1] dark:border-[#2f3032]">
              <Label htmlFor="amount" className="text-xs font-semibold text-gray-800 dark:text-gray-200">
                Proposed Budget (USDC) <span className="text-[#9747FF]">*</span>
              </Label>
              <div className="relative">
                <DollarSign className="w-4 h-4 text-gray-400 absolute left-0 top-1/2 -translate-y-1/2 pointer-events-none" />
                <Input
                  id="amount"
                  type="number"
                  min="1"
                  step="1"
                  variant="line"
                  placeholder="e.g. 250"
                  value={form.amount}
                  onChange={(e) => setForm({ ...form, amount: e.target.value })}
                  className="pl-6 h-10 text-sm font-semibold"
                />
              </div>

              {parsedAmount > 0 && (
                <div className="py-2.5 border-t border-b border-[#DADDE1]/60 dark:border-[#2f3032]/60 text-xs space-y-1.5 mt-2">
                  <div className="flex justify-between text-gray-600 dark:text-gray-300">
                    <span>Proposed Project Budget:</span>
                    <span className="font-semibold text-gray-900 dark:text-gray-100">{parsedAmount} USDC</span>
                  </div>
                  <div className="flex justify-between text-gray-500 dark:text-gray-400 text-[11px]">
                    <span>Platform Commission (10%):</span>
                    <span>{platformFee} USDC</span>
                  </div>
                  <div className="flex justify-between text-[#9747FF] font-semibold pt-1 border-t border-[#DADDE1]/40 dark:border-[#2f3032]/40">
                    <span>Creator Net Earnings:</span>
                    <span>{creatorEarnings} USDC</span>
                  </div>
                </div>
              )}
            </div>

            {/* Reference Images & Moodboard Upload */}
            <div className="space-y-2 pt-2 border-t border-[#DADDE1] dark:border-[#2f3032]">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-xs font-semibold text-gray-800 dark:text-gray-200">
                    Reference Files &amp; Moodboards
                  </h4>
                  <p className="text-[11px] text-gray-500 dark:text-gray-400">
                    Attach design briefs, style inspirations, or mockups (Optional).
                  </p>
                </div>
                <input
                  type="file"
                  ref={fileInputRef}
                  multiple
                  accept="image/*,.pdf,.zip"
                  onChange={handleFilesSelected}
                  className="hidden"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isUploading}
                  className="h-7 text-xs rounded-full border-[#DADDE1] dark:border-[#2f3032] text-[#9747FF]"
                >
                  {isUploading ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin mr-1" />
                  ) : (
                    <UploadCloud className="w-3.5 h-3.5 mr-1" />
                  )}
                  Upload Files
                </Button>
              </div>

              {referenceFiles.length > 0 && (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-2">
                  {referenceFiles.map((file, idx) => (
                    <div
                      key={idx}
                      className="relative rounded-xl border border-[#DADDE1] dark:border-[#2f3032] overflow-hidden group bg-gray-50 dark:bg-white/[0.02] p-1.5"
                    >
                      <img
                        src={file.previewUrl}
                        alt={file.name}
                        className="w-full h-16 object-cover rounded-lg"
                        onError={(e) => {
                          // Fallback for non-images
                          (e.target as HTMLElement).style.display = 'none';
                        }}
                      />
                      <p className="text-[10px] text-gray-600 dark:text-gray-400 truncate mt-1 px-1">
                        {file.name}
                      </p>
                      <button
                        type="button"
                        onClick={() => handleRemoveFile(idx)}
                        className="absolute top-2 right-2 w-5 h-5 rounded-full bg-black/70 text-white flex items-center justify-center opacity-80 hover:opacity-100 transition-opacity"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Additional Notes */}
            <div className="space-y-1.5 pt-2 border-t border-[#DADDE1] dark:border-[#2f3032]">
              <Label htmlFor="notes" className="text-xs font-semibold text-gray-800 dark:text-gray-200">
                Additional Notes &amp; Communication Preferences
              </Label>
              <Textarea
                id="notes"
                variant="line"
                rows={2}
                placeholder="Preferred communication channels, revision preferences, or other important notes..."
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
                className="text-xs resize-none"
              />
            </div>
          </div>
        );

      case 3:
        const validDeliverables = deliverables.filter((d) => d.title.trim().length > 0);
        return (
          <div className="space-y-4">
            <div className="p-3.5 rounded-xl bg-purple-50/50 dark:bg-purple-950/20 border border-purple-200/50 dark:border-purple-900/30 flex items-start gap-3">
              <ShieldCheck className="w-5 h-5 text-[#9747FF] shrink-0 mt-0.5" />
              <div className="text-xs space-y-1">
                <p className="font-semibold text-gray-900 dark:text-gray-100">
                  Ready to send your booking request
                </p>
                <p className="text-gray-600 dark:text-gray-300 leading-relaxed">
                  Review your project scope below. {creator.name} will review and accept your request. Once accepted, you will deposit the agreed budget into MyArteLab escrow to initiate production.
                </p>
              </div>
            </div>

            {/* Summary Details */}
            <div className="space-y-3 divide-y divide-[#DADDE1] dark:divide-[#2f3032] text-xs">
              <div className="pb-3 space-y-1">
                <span className="text-[11px] uppercase tracking-wider text-gray-400 font-semibold">Project</span>
                <h3 className="text-base font-bold text-gray-900 dark:text-gray-100">{form.serviceTitle}</h3>
                <p className="text-gray-600 dark:text-gray-400 whitespace-pre-wrap leading-relaxed mt-1">
                  {form.serviceDescription}
                </p>
              </div>

              <div className="py-3 flex flex-wrap justify-between gap-4">
                <div>
                  <span className="text-[11px] uppercase tracking-wider text-gray-400 font-semibold">Budget</span>
                  <p className="text-sm font-bold text-gray-900 dark:text-gray-100 mt-0.5">
                    {parsedAmount} USDC
                  </p>
                  <p className="text-[10px] text-gray-400">Creator receives: {creatorEarnings} USDC</p>
                </div>

                <div>
                  <span className="text-[11px] uppercase tracking-wider text-gray-400 font-semibold">Deadline</span>
                  <p className="text-sm font-bold text-gray-900 dark:text-gray-100 mt-0.5">
                    {new Date(form.endDate).toLocaleDateString(undefined, {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric',
                    })}
                  </p>
                  <p className="text-[10px] text-gray-400">Starts: {new Date(form.startDate).toLocaleDateString()}</p>
                </div>

                <div>
                  <span className="text-[11px] uppercase tracking-wider text-gray-400 font-semibold">Category</span>
                  <p className="text-sm font-semibold text-gray-800 dark:text-gray-200 mt-0.5">{form.category}</p>
                </div>
              </div>

              <div className="py-3 space-y-2">
                <span className="text-[11px] uppercase tracking-wider text-gray-400 font-semibold">
                  Deliverables Checklist ({validDeliverables.length})
                </span>
                <div className="space-y-1.5 divide-y divide-[#DADDE1]/40 dark:divide-[#2f3032]/40">
                  {validDeliverables.map((del, idx) => (
                    <div
                      key={idx}
                      className={cn("flex items-start gap-2 py-2", idx > 0 && "pt-2")}
                    >
                      <PackageCheck className="w-4 h-4 text-[#9747FF] shrink-0 mt-0.5" />
                      <div className="min-w-0">
                        <p className="font-semibold text-gray-900 dark:text-gray-100">{del.title}</p>
                        <p className="text-[11px] text-gray-500">{del.format}</p>
                        {del.description && <p className="text-[11px] text-gray-400">{del.description}</p>}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {referenceFiles.length > 0 && (
                <div className="py-3 space-y-2">
                  <span className="text-[11px] uppercase tracking-wider text-gray-400 font-semibold">
                    Attached References ({referenceFiles.length})
                  </span>
                  <div className="flex gap-2 overflow-x-auto pb-1">
                    {referenceFiles.map((file, idx) => (
                      <div
                        key={idx}
                        className="w-16 h-16 shrink-0 rounded-lg overflow-hidden border border-[#DADDE1] dark:border-[#2f3032]"
                      >
                        <img src={file.previewUrl} alt={file.name} className="w-full h-full object-cover" />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {form.notes && (
                <div className="pt-3 space-y-1">
                  <span className="text-[11px] uppercase tracking-wider text-gray-400 font-semibold">Notes</span>
                  <p className="text-gray-600 dark:text-gray-300 italic">{form.notes}</p>
                </div>
              )}
            </div>
          </div>
        );
    }
  };

  // Footer Actions
  const renderFooter = () => (
    <div className="flex items-center justify-between gap-3 pt-3 border-t border-[#DADDE1] dark:border-[#2f3032] mt-4">
      {currentStep > 1 ? (
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => setCurrentStep((prev) => (prev - 1) as any)}
          disabled={isLoading}
          className="rounded-full border-[#DADDE1] dark:border-[#2f3032] text-[11px] sm:text-xs font-semibold h-7.5 sm:h-8 px-3 sm:px-4 cursor-pointer"
        >
          <ChevronLeft className="w-3.5 h-3.5 mr-1" />
          Back
        </Button>
      ) : (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={handleClose}
          disabled={isLoading}
          className="rounded-full text-[11px] sm:text-xs text-gray-500 hover:text-gray-800 dark:hover:text-gray-200 h-7.5 sm:h-8 px-3 cursor-pointer"
        >
          Cancel
        </Button>
      )}

      {currentStep < 3 ? (
        <Button
          type="button"
          size="sm"
          onClick={handleNextStep}
          className="bg-[#9747FF] hover:bg-[#8534f0] text-white text-[11px] sm:text-xs font-semibold rounded-full h-7.5 sm:h-8 px-3.5 sm:px-5 cursor-pointer shadow-xs"
        >
          Continue
          <ChevronRight className="w-3.5 h-3.5 ml-1" />
        </Button>
      ) : (
        <Button
          type="button"
          size="sm"
          onClick={handleSubmitBooking}
          disabled={isLoading}
          className="bg-[#9747FF] hover:bg-[#8534f0] text-white text-[11px] sm:text-xs font-semibold rounded-full h-7.5 sm:h-8 px-4 sm:px-6 cursor-pointer shadow-xs"
        >
          {isLoading ? (
            <>
              <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" />
              Submitting...
            </>
          ) : (
            'Submit Project'
          )}
        </Button>
      )}
    </div>
  );

  // Inner dialog / drawer shell
  const content = (
    <div className="flex flex-col h-full max-h-[85vh]">
      {/* Creator Context Header */}
      <div className="flex items-center justify-between pb-3 border-b border-[#DADDE1] dark:border-[#2f3032]">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full overflow-hidden bg-purple-100 dark:bg-purple-950/40 border border-purple-200 dark:border-purple-800/40 shrink-0">
            {creator.avatar ? (
              <img src={getAvatarUrl(creator.avatar)} alt={creator.name} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center font-bold text-[#9747FF] text-sm">
                {(creator.name || 'C')[0]?.toUpperCase()}
              </div>
            )}
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <h3 className="font-bold text-sm text-gray-900 dark:text-gray-100">{creator.name}</h3>
              {creator.isVerified && <VerifiedBadge className="w-3.5 h-3.5" showTooltip={false} />}
            </div>
            <p className="text-[11px] text-gray-500 dark:text-gray-400">
              {Array.isArray(creator.category) ? creator.category.join(' • ') : creator.category || 'Creator'}
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={handleClose}
          className="p-1 rounded-full text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Stepper Progress */}
      {renderStepper()}

      {/* Scrollable Form Body */}
      <div className="flex-1 overflow-y-auto px-1 py-1 scrollbar-hide">{renderStepContent()}</div>

      {/* Actions */}
      {renderFooter()}
    </div>
  );

  if (isMobile) {
    return (
      <Drawer open={isOpen} onOpenChange={(open) => !open && handleClose()} repositionInputs={false}>
        <DrawerContent className="bg-white dark:bg-[#18191a] text-gray-900 dark:text-gray-100 rounded-t-2xl max-h-[92dvh] flex flex-col p-4 pb-[max(env(safe-area-inset-bottom,0px),16px)] border-t border-[#DADDE1] dark:border-[#2f3032] shadow-2xl focus:outline-none z-[150]">
          <DrawerTitle className="sr-only">Book {creator.name}</DrawerTitle>
          <DrawerDescription className="sr-only">
            Send a structured booking request to {creator.name}
          </DrawerDescription>
          {content}
        </DrawerContent>
      </Drawer>
    );
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent
        showCloseButton={false}
        className="bg-white dark:bg-[#18191a] text-gray-900 dark:text-gray-100 rounded-2xl max-h-[90vh] sm:max-w-2xl flex flex-col p-6 border border-[#DADDE1] dark:border-[#2f3032] shadow-2xl focus:outline-none z-[150]"
      >
        <DialogTitle className="sr-only">Book {creator.name}</DialogTitle>
        <DialogDescription className="sr-only">
          Send a structured booking request to {creator.name}
        </DialogDescription>
        {content}
      </DialogContent>
    </Dialog>
  );
}
