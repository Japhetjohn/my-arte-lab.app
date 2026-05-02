import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';

interface AuthLayoutProps {
  children: React.ReactNode;
  title: string;
  subtitle?: string;
  illustration?: string;
  showBackButton?: boolean;
}

export function AuthLayout({
  children,
  title,
  subtitle,
  illustration = '/images/auth-hero.jpg',
  showBackButton = true,
}: AuthLayoutProps) {
  return (
    <div className="min-h-[100dvh] flex flex-col lg:flex-row">
      {/* Mobile Hero - Image on top */}
      <div className="lg:hidden relative flex flex-col justify-center bg-gradient-to-br from-[#8A2BE2] to-[#6B21A8] py-6 px-4 shrink-0">
        <div className="text-center text-white">
          <img
            src={illustration}
            alt="Auth Illustration"
            className="w-20 h-20 mx-auto mb-2 object-contain"
          />
          <h2 className="text-lg font-bold mb-1">Connect with Top African Creatives</h2>
          <p className="text-white/80 text-xs">Join clients and creators on MyArteLab</p>
        </div>
      </div>

      {/* Left Side - Form */}
      <div className="flex-1 flex flex-col justify-center px-4 sm:px-6 lg:px-8 xl:px-12 py-6 sm:py-12 bg-white w-full min-w-0">
        <div className="max-w-md w-full mx-auto">
          {/* Logo */}
          <div className="flex items-center justify-between mb-6 sm:mb-8">
            <Link to="/" className="flex items-center gap-2">
              <img
                src="/images/logo.png"
                alt="MyArteLab"
                className="w-8 h-8"
              />
              <span className="font-bold text-xl">MyArteLab</span>
            </Link>
            {showBackButton && (
              <Link
                to="/"
                className="text-sm text-gray-500 hover:text-gray-700 flex items-center gap-1"
              >
                <ArrowLeft className="w-4 h-4" />
                Back
              </Link>
            )}
          </div>

          {/* Header */}
          <div className="mb-6 sm:mb-8">
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">
              {title}
            </h1>
            {subtitle && <p className="text-gray-500">{subtitle}</p>}
          </div>

          {/* Form */}
          {children}
          
          {/* Footer */}
          <div className="mt-8 pt-6 border-t border-gray-200 text-center">
            <p className="text-xs text-gray-500">
              By continuing, you agree to our{' '}
              <a href="/legal" className="text-[#8A2BE2] hover:underline">Terms of Service</a>
              {' '}and{' '}
              <a href="/legal" className="text-[#8A2BE2] hover:underline">Privacy Policy</a>
            </p>
          </div>
        </div>
      </div>

      {/* Right Side - Illustration (Desktop only) */}
      <div className="hidden lg:flex lg:w-1/2 xl:w-5/12 relative bg-gradient-to-br from-[#8A2BE2] to-[#6B21A8]">
        <div className="absolute inset-0 flex items-center justify-center p-12">
          <div className="text-center text-white">
            <img
              src={illustration}
              alt="Auth Illustration"
              className="w-full max-w-md mx-auto mb-8"
            />
            <h2 className="text-2xl font-bold mb-2">
              Connect with Top African Creatives
            </h2>
            <p className="text-white/80">
              Join clients and creators on MyArteLab
            </p>
          </div>
        </div>

        {/* Decorative elements */}
        <div className="absolute top-10 left-10 w-20 h-20 bg-white/10 rounded-full blur-xl" />
        <div className="absolute bottom-20 right-10 w-32 h-32 bg-white/10 rounded-full blur-xl" />
        <div className="absolute top-1/2 left-1/4 w-16 h-16 bg-white/5 rounded-full blur-lg" />
      </div>
    </div>
  );
}
