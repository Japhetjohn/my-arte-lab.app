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
import { toast } from 'sonner';
import { Loader2, Calendar, DollarSign } from 'lucide-react';

interface Creator {
  id: string;
  name: string;
  avatar?: string;
  category?: string;
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
        category: creator.category || 'other',
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
        
        <div className="space-y-6 py-4">
          {/* Creator Info */}
          <div className="flex items-center gap-3 bg-gray-50 p-3 rounded-lg">
            <img 
              src={creator.avatar || '/images/avatar-1.png'} 
              alt={creator.name}
              className="w-12 h-12 rounded-full object-cover"
            />
            <div>
              <p className="font-medium">{creator.name}</p>
              <p className="text-sm text-gray-500">{creator.category || 'Creator'}</p>
            </div>
          </div>

          {/* Service Title */}
          <div className="space-y-2">
            <Label htmlFor="title">What do you need done? *</Label>
            <Input
              id="title"
              placeholder="e.g., Design a professional logo"
              value={form.serviceTitle}
              onChange={(e) => setForm({...form, serviceTitle: e.target.value})}
            />
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description">Describe your project *</Label>
            <Textarea
              id="description"
              placeholder="Provide detailed requirements, preferences, examples..."
              rows={4}
              value={form.serviceDescription}
              onChange={(e) => setForm({...form, serviceDescription: e.target.value})}
            />
          </div>

          {/* Amount */}
          <div className="space-y-2">
            <Label htmlFor="amount">Your Budget (USDC) *</Label>
            <div className="relative">
              <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                id="amount"
                type="number"
                min="10"
                placeholder="100"
                className="pl-10"
                value={form.amount}
                onChange={(e) => setForm({...form, amount: e.target.value})}
              />
            </div>
            <p className="text-xs text-gray-500">
              Minimum $1. Platform fee (10%) will be deducted.
            </p>
          </div>

          {/* Dates */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="startDate">Start Date</Label>
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                  id="startDate"
                  type="date"
                  className="pl-10"
                  value={form.startDate}
                  onChange={(e) => setForm({...form, startDate: e.target.value})}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="endDate">Due Date</Label>
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                  id="endDate"
                  type="date"
                  className="pl-10"
                  value={form.endDate}
                  onChange={(e) => setForm({...form, endDate: e.target.value})}
                />
              </div>
            </div>
          </div>

          {/* How it Works */}
          <div className="bg-blue-50 p-4 rounded-lg space-y-2">
            <h4 className="font-medium text-blue-900">How it works:</h4>
            <ol className="text-sm text-blue-800 space-y-1 list-decimal list-inside">
              <li>You send a booking request</li>
              <li>Creator accepts and you pay (held in escrow)</li>
              <li>Creator delivers the work</li>
              <li>You review and release payment</li>
            </ol>
          </div>

          {/* Buttons */}
          <div className="flex gap-3 pt-4">
            <Button 
              variant="outline" 
              className="flex-1"
              onClick={onClose}
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button 
              className="flex-1 bg-[#8A2BE2] hover:bg-[#7B1FD1]"
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
