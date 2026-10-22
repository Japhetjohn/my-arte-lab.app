import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { api } from '@/contexts/AuthContext';
import { getImageUrl } from '@/lib/imageUrl';
import { toast } from '@/components/ui/sonner';
import { Loader2, Calendar, DollarSign } from 'lucide-react';

interface Creator {
  id: string;
  name: string;
  avatar?: string;
  category?: string | string[];
}

interface NewBookingModalProps {
  isOpen: boolean;
  onClose: () => void;
  creator: Creator;
  onSuccess?: () => void;
}

export function NewBookingModal({ isOpen, onClose, creator, onSuccess }: NewBookingModalProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [form, setForm] = useState({
    serviceTitle: '',
    serviceDescription: '',
    amount: '',
    startDate: '',
    endDate: ''
  });

  const handleSubmit = async () => {
    if (!form.serviceTitle || !form.serviceDescription || !form.amount) {
      toast.error('Please fill in all required fields');
      return;
    }

    const amount = parseFloat(form.amount);
    if (isNaN(amount) || amount <= 0) {
      toast.error('Please enter a valid amount');
      return;
    }

    if (amount < 1) {
      toast.error('Minimum booking amount is $1');
      return;
    }

    try {
      setIsLoading(true);
      await api.post('/bookings', {
        creatorId: creator.id,
        serviceTitle: form.serviceTitle,
        serviceDescription: form.serviceDescription,
        category: Array.isArray(creator.category) ? creator.category[0] : creator.category || 'other',
        amount: amount,
        currency: 'USDC',
        startDate: form.startDate || new Date().toISOString(),
        endDate: form.endDate || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
      });
      
      toast.success('Booking request sent! Creator will review and respond.');
      onClose();
      onSuccess?.();
      // Redirect to bookings page
      window.location.href = '/bookings';
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to create booking');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Book {creator.name}</DialogTitle>
          <DialogDescription>
            Send a booking request. Payment will only be required after the creator accepts.
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-5 py-2">
          {/* Creator Info */}
          <div className="flex items-center gap-3 pb-4 border-b border-[#DADDE1] dark:border-[#2f3032]">
            <img 
              src={getImageUrl(creator.avatar) || '/images/avatar-1.png'} 
              alt={creator.name}
              className="w-12 h-12 rounded-full object-cover border border-[#DADDE1] dark:border-[#2f3032]"
            />
            <div>
              <p className="font-semibold text-gray-900 dark:text-gray-100">{creator.name}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                {Array.isArray(creator.category) 
                  ? creator.category.join(', ') 
                  : creator.category || 'Creator'}
              </p>
            </div>
          </div>

          {/* Service Title */}
          <div className="space-y-1.5">
            <Label htmlFor="title" className="text-xs font-medium text-gray-700 dark:text-gray-300">What do you need done? *</Label>
            <Input
              id="title"
              placeholder="e.g., Design a professional logo"
              value={form.serviceTitle}
              onChange={(e) => setForm({...form, serviceTitle: e.target.value})}
              className="dark:bg-[#121212] dark:border-[#2f3032] dark:text-gray-100 focus-visible:ring-[#9747FF]"
            />
          </div>

          {/* Description */}
          <div className="space-y-1.5">
            <Label htmlFor="description" className="text-xs font-medium text-gray-700 dark:text-gray-300">Describe your project *</Label>
            <Textarea
              id="description"
              placeholder="Provide detailed requirements, preferences, examples..."
              rows={4}
              value={form.serviceDescription}
              onChange={(e) => setForm({...form, serviceDescription: e.target.value})}
              className="dark:bg-[#121212] dark:border-[#2f3032] dark:text-gray-100 focus-visible:ring-[#9747FF]"
            />
          </div>

          {/* Amount */}
          <div className="space-y-1.5">
            <Label htmlFor="amount" className="text-xs font-medium text-gray-700 dark:text-gray-300">Your Budget (USDC) *</Label>
            <div className="relative">
              <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                id="amount"
                type="number"
                min="10"
                placeholder="100"
                className="pl-10 dark:bg-[#121212] dark:border-[#2f3032] dark:text-gray-100 focus-visible:ring-[#9747FF]"
                value={form.amount}
                onChange={(e) => setForm({...form, amount: e.target.value})}
              />
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Minimum $1. Platform fee (10%) will be deducted.
            </p>
          </div>

          {/* Dates */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="startDate" className="text-xs font-medium text-gray-700 dark:text-gray-300">Start Date</Label>
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                  id="startDate"
                  type="date"
                  className="pl-10 dark:bg-[#121212] dark:border-[#2f3032] dark:text-gray-100 focus-visible:ring-[#9747FF]"
                  value={form.startDate}
                  onChange={(e) => setForm({...form, startDate: e.target.value})}
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="endDate" className="text-xs font-medium text-gray-700 dark:text-gray-300">Due Date</Label>
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                  id="endDate"
                  type="date"
                  className="pl-10 dark:bg-[#121212] dark:border-[#2f3032] dark:text-gray-100 focus-visible:ring-[#9747FF]"
                  value={form.endDate}
                  onChange={(e) => setForm({...form, endDate: e.target.value})}
                />
              </div>
            </div>
          </div>

          {/* How it Works */}
          <div className="pt-4 border-t border-[#DADDE1] dark:border-[#2f3032] space-y-2">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">How it works</h4>
            <ol className="text-xs text-gray-600 dark:text-gray-400 space-y-1 list-decimal list-inside">
              <li>You send a booking request</li>
              <li>Creator accepts and you pay (held in escrow)</li>
              <li>Creator delivers the work</li>
              <li>You review and release payment</li>
            </ol>
          </div>

          {/* Buttons */}
          <div className="flex gap-3 pt-4 border-t border-[#DADDE1] dark:border-[#2f3032]">
            <Button 
              variant="outline" 
              className="flex-1 rounded-xl dark:border-[#2f3032] dark:text-gray-300 dark:hover:bg-gray-800"
              onClick={onClose}
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button 
              className="flex-1 bg-[#9747FF] hover:bg-[#8534f0] text-white font-semibold rounded-xl"
              onClick={handleSubmit}
              disabled={isLoading}
            >
              {isLoading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                'Send Request'
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
