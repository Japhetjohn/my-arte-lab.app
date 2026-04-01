import { useState, forwardRef } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Eye, EyeOff, Check, X } from 'lucide-react';
import { cn } from '@/lib/utils';

interface PasswordInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  showStrength?: boolean;
  label?: string;
  error?: string;
}

interface StrengthRequirement {
  label: string;
  test: (password: string) => boolean;
}

const requirements: StrengthRequirement[] = [
  { label: 'At least 8 characters', test: (p) => p.length >= 8 },
  { label: 'One uppercase letter', test: (p) => /[A-Z]/.test(p) },
  { label: 'One lowercase letter', test: (p) => /[a-z]/.test(p) },
  { label: 'One number', test: (p) => /\d/.test(p) },
  { label: 'One special character', test: (p) => /[@$!%*?&]/.test(p) },
];

export const PasswordInput = forwardRef<HTMLInputElement, PasswordInputProps>(
  ({ showStrength = false, label, error, className, ...props }, ref) => {
    const [showPassword, setShowPassword] = useState(false);
    const password = String(props.value || '');

    const getStrength = () => {
      const passed = requirements.filter((req) => req.test(password)).length;
      return (passed / requirements.length) * 100;
    };

    const getStrengthLabel = () => {
      const strength = getStrength();
      if (strength === 0) return '';
      if (strength <= 40) return 'Weak';
      if (strength <= 80) return 'Medium';
      return 'Strong';
    };

    const getStrengthColor = () => {
      const strength = getStrength();
      if (strength <= 40) return 'bg-red-500';
      if (strength <= 80) return 'bg-amber-500';
      return 'bg-green-500';
    };

    return (
      <div className="space-y-2">
        {label && (
          <label className="text-sm font-medium text-gray-700">
            {label}
          </label>
        )}
        <div className="relative">
          <Input
            ref={ref}
            type={showPassword ? 'text' : 'password'}
            className={cn(
              'pr-10',
              error && 'border-red-500 focus-visible:ring-red-500',
              className
            )}
            {...props}
          />
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
            onClick={() => setShowPassword(!showPassword)}
            tabIndex={-1}
          >
            {showPassword ? (
              <EyeOff className="h-4 w-4 text-gray-400" />
            ) : (
              <Eye className="h-4 w-4 text-gray-400" />
            )}
          </Button>
        </div>

        {error && (
          <p className="text-sm text-red-500">{error}</p>
        )}

        {showStrength && password.length > 0 && (
          <div className="space-y-2 pt-2">
            <div className="flex items-center justify-between text-xs">
              <span className="text-gray-500">Password strength:</span>
              <span className={cn(
                'font-medium',
                getStrength() <= 40 ? 'text-red-500' :
                getStrength() <= 80 ? 'text-amber-500' : 'text-green-500'
              )}>
                {getStrengthLabel()}
              </span>
            </div>
            <div className="h-1.5 w-full bg-gray-200 rounded-full overflow-hidden">
              <div
                className={cn('h-full transition-all duration-300', getStrengthColor())}
                style={{ width: `${getStrength()}%` }}
              />
            </div>
            <ul className="space-y-1 pt-1">
              {requirements.map((req, index) => {
                const passed = req.test(password);
                return (
                  <li
                    key={index}
                    className={cn(
                      'flex items-center gap-1.5 text-xs transition-colors',
                      passed ? 'text-green-600' : 'text-gray-400'
                    )}
                  >
                    {passed ? (
                      <Check className="w-3 h-3" />
                    ) : (
                      <X className="w-3 h-3" />
                    )}
                    {req.label}
                  </li>
                );
              })}
            </ul>
          </div>
        )}
      </div>
    );
  }
);

PasswordInput.displayName = 'PasswordInput';
