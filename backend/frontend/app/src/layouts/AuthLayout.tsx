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
    <div className="min-h-[100dvh] w-full bg-white flex flex-col selection:bg-purple-100 selection:text-[#9747FF] px-4 sm:px-6 lg:px-12 py-4 sm:py-6 lg:py-10">
      {/* Main Content Area: Flex-1 grows to push mobile footer down when viewport has space */}
      <main className="w-full max-w-6xl mx-auto flex-1 flex flex-col justify-center items-center">
        <div className="w-full flex flex-col lg:flex-row items-center justify-center gap-8 lg:gap-14 xl:gap-20 my-auto py-2">
          
          {/* ========================================================= */}
          {/* DESKTOP LEFT COLUMN — Taller Illustration                */}
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
          {/* AUTH FORM COLUMN — Clean, Unboxed, Form Content          */}
          {/* ========================================================= */}
          <div className="w-full lg:w-1/2 max-w-md mx-auto flex flex-col justify-center py-2">
            {/* MyArteLab Brand Header */}
            <div className="mb-5 flex justify-center sm:justify-start">
              <a
                href="/home"
                className="inline-flex items-center gap-2.5 group select-none cursor-pointer focus:outline-none"
                aria-label="MyArteLab Home"
              >
                <img
                  src="/images/myartelab-logo.png"
                  alt="MyArteLab"
                  className="h-10 sm:h-11 md:h-12 w-auto object-contain transition-transform group-hover:scale-105"
                />
                <span className="font-bold text-2xl tracking-[-0.015em] text-gray-900 leading-none">
                  MyArteLab
                </span>
              </a>
            </div>

            {/* Mobile Illustration (Centered above form) */}
            <div className="lg:hidden flex justify-center mb-5 sm:mb-6 select-none">
              <img
                src={illustration}
                alt="Authentication illustration"
                className="w-44 sm:w-52 max-h-36 sm:max-h-40 h-auto object-contain"
                loading="eager"
              />
            </div>

            {/* Form Header: Concise Title and Subtitle */}
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

            {/* Desktop-only Legal Note under the form */}
            <div className="hidden lg:block mt-6 pt-4 text-center">
              <p className="text-[11px] text-gray-400">
                By continuing, you agree to MyArteLab&apos;s{' '}
                <a href="/legal" className="text-gray-600 hover:text-[#9747FF] underline transition-colors">
                  Terms of Service
                </a>{' '}
                and{' '}
                <a href="/privacy-policy" className="text-gray-600 hover:text-[#9747FF] underline transition-colors">
                  Privacy Policy
                </a>.
              </p>
            </div>
          </div>

        </div>
      </main>

      {/* ========================================================= */}
      {/* MOBILE LEGAL FOOTER — Cleanly Anchored at Bottom of Page */}
      {/* ========================================================= */}
      <footer className="lg:hidden w-full max-w-md mx-auto mt-auto pt-8 pb-[max(1.25rem,env(safe-area-inset-bottom,20px))] text-center shrink-0">
        <p className="text-[11px] sm:text-xs text-gray-400 leading-relaxed px-4">
          By continuing, you agree to MyArteLab&apos;s{' '}
          <a href="/legal" className="text-gray-600 hover:text-[#9747FF] underline transition-colors">
            Terms of Service
          </a>{' '}
          and{' '}
          <a href="/privacy-policy" className="text-gray-600 hover:text-[#9747FF] underline transition-colors">
            Privacy Policy
          </a>.
        </p>
      </footer>
    </div>
  );
}
