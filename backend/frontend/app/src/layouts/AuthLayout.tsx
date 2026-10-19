import React from 'react';

interface AuthLayoutProps {
  children: React.ReactNode;
  title: string;
  subtitle?: string;
  illustration?: string;
  illustrationHeadline?: string;
  illustrationSubtext?: string;
  showBackButton?: boolean;
}

export function AuthLayout({
  children,
  title,
  subtitle,
  illustration = '/images/auth-illustration.svg',
}: AuthLayoutProps) {
  return (
    <div className="min-h-[100dvh] w-full bg-white flex flex-col justify-center selection:bg-purple-100 selection:text-[#9747FF] px-4 sm:px-6 lg:px-12 py-6 sm:py-8 lg:py-12">
      {/* Main Container: Two-column desktop, single-column mobile. No card box; blends directly into clean white background */}
      <div className="w-full max-w-6xl mx-auto flex flex-col lg:flex-row items-center justify-center gap-10 lg:gap-14 xl:gap-20">
        
        {/* ========================================================= */}
        {/* DESKTOP LEFT COLUMN — Substantially Taller Illustration   */}
        {/* ========================================================= */}
        <div className="hidden lg:flex lg:w-1/2 items-center justify-center select-none py-2">
          <div className="w-full flex items-center justify-center">
            <img
              src={illustration}
              alt="Authentication illustration"
              className="w-full max-h-[560px] xl:max-h-[640px] h-auto object-contain"
              loading="eager"
            />
          </div>
        </div>

        {/* ========================================================= */}
        {/* AUTH FORM COLUMN — Minimal, Unboxed, Vertically Balanced  */}
        {/* ========================================================= */}
        <div className="w-full lg:w-1/2 max-w-md mx-auto flex flex-col justify-center py-2">
          {/* Mobile Illustration (Centered above form, compact to avoid pushing inputs far down) */}
          <div className="lg:hidden flex justify-center mb-5 sm:mb-6 select-none">
            <img
              src={illustration}
              alt="Authentication illustration"
              className="w-44 sm:w-52 max-h-36 sm:max-h-40 h-auto object-contain"
              loading="eager"
            />
          </div>

          {/* Form Header: Concise Title and Subtitle. No logo or brand name. */}
          <div className="mb-5 sm:mb-6 text-center sm:text-left">
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 tracking-tight">
              {title}
            </h1>
            {subtitle && (
              <p className="text-xs sm:text-sm text-gray-500 mt-1.5 leading-relaxed">
                {subtitle}
              </p>
            )}
          </div>

          {/* Form Fields & Actions */}
          <div className="w-full">
            {children}
          </div>

          {/* Subtle Legal Note */}
          <div className="mt-6 pt-4 text-center">
            <p className="text-[11px] text-gray-400">
              By continuing, you agree to MyArteLab&apos;s{' '}
              <a href="/legal" className="text-gray-600 hover:text-[#9747FF] underline transition-colors">
                Terms of Service
              </a>{' '}
              and{' '}
              <a href="/legal" className="text-gray-600 hover:text-[#9747FF] underline transition-colors">
                Privacy Policy
              </a>.
            </p>
          </div>
        </div>

      </div>
    </div>
  );
}
