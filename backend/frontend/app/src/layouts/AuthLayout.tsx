import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';

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
  illustrationHeadline = 'Connect with Top African Creatives',
  illustrationSubtext = 'Discover, collaborate, and book talented creative professionals.',
  showBackButton = true,
}: AuthLayoutProps) {
  return (
    <div className="min-h-[100dvh] w-full bg-[#FAFAFA] flex items-center justify-center p-0 sm:p-4 lg:p-8">
      {/* Container - Full-width on mobile, centered constrained card on desktop */}
      <div className="w-full max-w-5xl bg-white sm:rounded-3xl sm:border sm:border-gray-150 sm:shadow-xs min-h-[100dvh] sm:min-h-0 flex flex-col lg:flex-row overflow-hidden">
        
        {/* ========================================================= */}
        {/* DESKTOP LEFT COLUMN — Illustration & Brand Context        */}
        {/* ========================================================= */}
        <div className="hidden lg:flex lg:w-1/2 bg-gray-50/70 border-r border-gray-100 p-10 xl:p-14 flex-col items-center justify-center text-center select-none">
          <div className="w-full max-w-sm mx-auto flex items-center justify-center">
            <img
              src={illustration}
              alt="MyArteLab Illustration"
              className="w-full max-h-[320px] object-contain drop-shadow-xs"
              loading="eager"
            />
          </div>

          <div className="mt-8 max-w-xs">
            <h2 className="text-xl font-bold text-gray-900 tracking-tight">
              {illustrationHeadline}
            </h2>
            <p className="text-sm text-gray-500 mt-2 leading-relaxed">
              {illustrationSubtext}
            </p>
          </div>
        </div>

        {/* ========================================================= */}
        {/* AUTH FORM COLUMN — Mobile Single Column & Desktop Right   */}
        {/* ========================================================= */}
        <div className="flex-1 flex flex-col justify-between p-6 sm:p-10 lg:p-12 xl:p-14 min-w-0">
          <div className="w-full max-w-md mx-auto">
            {/* Top Bar: Logo & Optional Back Button */}
            <div className="flex items-center justify-between mb-4 sm:mb-6">
              <Link to="/" className="inline-flex items-center gap-2.5 group">
                <img
                  src="/images/logo.png"
                  alt="MyArteLab"
                  className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg object-contain"
                />
                <span className="font-bold text-lg sm:text-xl tracking-tight text-gray-900 group-hover:text-[#9747FF] transition-colors">
                  MyArteLab
                </span>
              </Link>

              {showBackButton && (
                <Link
                  to="/"
                  className="text-xs font-medium text-gray-500 hover:text-gray-900 flex items-center gap-1 transition-colors px-2 py-1 rounded-lg hover:bg-gray-100"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>Back</span>
                </Link>
              )}
            </div>

            {/* Mobile Illustration (Centered above form, scaled down cleanly) */}
            <div className="lg:hidden flex justify-center my-3 sm:my-4 select-none">
              <img
                src={illustration}
                alt="MyArteLab Illustration"
                className="w-44 sm:w-52 max-h-36 sm:max-h-40 h-auto object-contain"
                loading="eager"
              />
            </div>

            {/* Page Header: Heading & Supporting Text */}
            <div className="mb-5 sm:mb-6 text-left">
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
            {children}
          </div>

          {/* Legal Footer Note */}
          <div className="w-full max-w-md mx-auto mt-6 pt-5 border-t border-gray-100 text-center">
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
