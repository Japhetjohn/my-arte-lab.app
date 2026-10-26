import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthLayout } from '@/layouts/AuthLayout';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { CREATOR_CATEGORIES } from '@/lib/validations/authSchemas';
import { Sparkles, Briefcase, MapPin, User as UserIcon } from 'lucide-react';
import { Spinner } from '@/components/ui/spinner';
import { cn } from '@/lib/utils';
import { toast } from '@/components/ui/sonner';

export function Onboarding() {
  const navigate = useNavigate();
  const { user, completeOnboarding } = useAuth();

  const [role, setRole] = useState<'client' | 'creator'>(user?.role === 'creator' ? 'creator' : 'client');
  const [category, setCategory] = useState<string>(
    Array.isArray(user?.category) ? user?.category[0] || '' : (typeof user?.category === 'string' ? user?.category : '')
  );
  const [country, setCountry] = useState(user?.location?.country || 'Nigeria');
  const [state, setState] = useState(user?.location?.state || '');
  const [localArea, setLocalArea] = useState(user?.location?.localArea || '');
  const [bio, setBio] = useState(user?.bio || '');
  const [phoneNumber, setPhoneNumber] = useState(user?.phoneNumber || '');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (role === 'creator' && !category) {
      toast.error('Choose your primary creative field');
      return;
    }

    setIsLoading(true);
    try {
      await completeOnboarding({
        role,
        category: role === 'creator' ? [category] : undefined,
        location: {
          country: country.trim() || 'Nigeria',
          state: state.trim(),
          localArea: localArea.trim(),
        },
        bio: bio.trim(),
        phoneNumber: phoneNumber.trim(),
      });

      navigate('/home');
    } catch (err: any) {
      // Error toast is handled in AuthContext
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AuthLayout
      title="Complete your profile"
      subtitle="Tell us a bit about your work so we can personalize your space."
      illustration="/images/auth-illustration.svg"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* 1. Account Role Selection (Mandatory) */}
        <div className="space-y-1.5">
          <Label className="text-xs font-semibold text-gray-700 dark:text-gray-300">
            Choose your account type <span className="text-red-500">*</span>
          </Label>
          <div className="grid grid-cols-2 gap-2.5">
            <button
              type="button"
              onClick={() => {
                setRole('client');
                setCategory('');
              }}
              className={cn(
                'p-3.5 rounded-xl border text-left transition-all cursor-pointer flex flex-col gap-1',
                role === 'client'
                  ? 'border-[#9747FF] bg-purple-50/40 dark:bg-purple-950/30 ring-2 ring-[#9747FF]/20 text-gray-900 dark:text-gray-100'
                  : 'border-gray-200 dark:border-[#2f3032] hover:border-gray-300 text-gray-600 dark:text-gray-400 bg-white dark:bg-[#18191a]'
              )}
            >
              <div className="flex items-center gap-1.5 text-xs font-bold text-gray-900 dark:text-gray-100">
                <UserIcon className="w-3.5 h-3.5 text-[#9747FF]" />
                <span>Client</span>
              </div>
              <span className="text-[11px] text-gray-500 dark:text-gray-400 leading-snug">
                Find African creators and commission creative projects.
              </span>
            </button>

            <button
              type="button"
              onClick={() => setRole('creator')}
              className={cn(
                'p-3.5 rounded-xl border text-left transition-all cursor-pointer flex flex-col gap-1',
                role === 'creator'
                  ? 'border-[#9747FF] bg-purple-50/40 dark:bg-purple-950/30 ring-2 ring-[#9747FF]/20 text-gray-900 dark:text-gray-100'
                  : 'border-gray-200 dark:border-[#2f3032] hover:border-gray-300 text-gray-600 dark:text-gray-400 bg-white dark:bg-[#18191a]'
              )}
            >
              <div className="flex items-center gap-1.5 text-xs font-bold text-gray-900 dark:text-gray-100">
                <Sparkles className="w-3.5 h-3.5 text-[#9747FF]" />
                <span>Creator</span>
              </div>
              <span className="text-[11px] text-gray-500 dark:text-gray-400 leading-snug">
                Showcase your portfolio, offer services, and get booked directly.
              </span>
            </button>
          </div>
        </div>

        {/* 2. Primary Creative Category (Mandatory for Creator) */}
        {role === 'creator' && (
          <div className="space-y-1.5 animate-in fade-in slide-in-from-top-1 duration-150">
            <Label htmlFor="category" className="text-xs font-semibold text-gray-700 dark:text-gray-300">
              Creative field <span className="text-red-500">*</span>
            </Label>
            <div className="relative">
              <Briefcase className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
              <select
                id="category"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full pl-9 h-11 sm:h-12 bg-white dark:bg-[#18191a] border border-gray-200 dark:border-[#2f3032] focus:border-[#9747FF] focus:ring-2 focus:ring-[#9747FF]/20 rounded-xl text-sm px-3 text-gray-800 dark:text-gray-200 outline-none transition-all cursor-pointer"
                required
              >
                <option value="">Choose your creative field...</option>
                {CREATOR_CATEGORIES.map((cat) => (
                  <option key={cat.id} value={cat.name}>
                    {cat.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
        )}

        {/* 3. Location Details */}
        <div className="grid grid-cols-2 gap-2.5 sm:gap-3">
          <div className="space-y-1.5">
            <Label htmlFor="country" className="text-xs font-semibold text-gray-700 dark:text-gray-300">
              Country
            </Label>
            <div className="relative">
              <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
              <Input
                id="country"
                type="text"
                placeholder="Nigeria"
                value={country}
                onChange={(e) => setCountry(e.target.value)}
                className="pl-9 h-11 sm:h-12 bg-white dark:bg-[#18191a] border-gray-200 dark:border-[#2f3032] focus-visible:border-[#9747FF] focus-visible:ring-[#9747FF]/20 rounded-xl text-sm"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="state" className="text-xs font-semibold text-gray-700 dark:text-gray-300">
              State or city
            </Label>
            <Input
              id="state"
              type="text"
              placeholder="e.g. Lagos"
              value={state}
              onChange={(e) => setState(e.target.value)}
              className="h-11 sm:h-12 bg-white dark:bg-[#18191a] border-gray-200 dark:border-[#2f3032] focus-visible:border-[#9747FF] focus-visible:ring-[#9747FF]/20 rounded-xl text-sm"
            />
          </div>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="localArea" className="text-xs font-semibold text-gray-700 dark:text-gray-300">
            Neighborhood or area
          </Label>
          <Input
            id="localArea"
            type="text"
            placeholder="e.g. Lekki Phase 1"
            value={localArea}
            onChange={(e) => setLocalArea(e.target.value)}
            className="h-11 sm:h-12 bg-white dark:bg-[#18191a] border-gray-200 dark:border-[#2f3032] focus-visible:border-[#9747FF] focus-visible:ring-[#9747FF]/20 rounded-xl text-sm"
          />
        </div>

        {/* 4. Phone Number (Optional) */}
        <div className="space-y-1.5">
          <Label htmlFor="phoneNumber" className="text-xs font-semibold text-gray-700 dark:text-gray-300">
            Phone number (optional)
          </Label>
          <Input
            id="phoneNumber"
            type="tel"
            placeholder="e.g. +234 801 234 5678"
            value={phoneNumber}
            onChange={(e) => setPhoneNumber(e.target.value)}
            className="h-11 sm:h-12 bg-white dark:bg-[#18191a] border-gray-200 dark:border-[#2f3032] focus-visible:border-[#9747FF] focus-visible:ring-[#9747FF]/20 rounded-xl text-sm"
          />
        </div>

        {/* 4. Bio / Tagline */}
        <div className="space-y-1.5">
          <Label htmlFor="bio" className="text-xs font-semibold text-gray-700 dark:text-gray-300">
            Bio (optional)
          </Label>
          <Textarea
            id="bio"
            rows={3}
            placeholder={
              role === 'creator'
                ? 'Share what you make, your style, or the kind of work you love taking on...'
                : "Describe the projects or talent you're looking to collaborate with..."
            }
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            className="bg-white dark:bg-[#18191a] border-gray-200 dark:border-[#2f3032] focus-visible:border-[#9747FF] focus-visible:ring-[#9747FF]/20 rounded-xl text-sm resize-none"
          />
        </div>

        {/* 5. Submit Button */}
        <Button
          type="submit"
          disabled={isLoading}
          className="w-full h-11 sm:h-12 bg-[#9747FF] hover:bg-[#8534f0] active:bg-[#7427dc] text-white font-semibold text-sm sm:text-base rounded-xl transition-all shadow-2xs hover:shadow-xs disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 cursor-pointer mt-2"
        >
          {isLoading ? (
            <>
              <Spinner size="sm" variant="white" />
              <span>Setting up your profile...</span>
            </>
          ) : (
            <span>Save and continue</span>
          )}
        </Button>
      </form>
    </AuthLayout>
  );
}
