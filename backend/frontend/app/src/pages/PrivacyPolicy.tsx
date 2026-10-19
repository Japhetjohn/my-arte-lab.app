import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, Shield, Mail, CheckCircle2 } from 'lucide-react';

export function PrivacyPolicy() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gray-50/60 text-gray-800">
      {/* Top Header Bar */}
      <header className="sticky top-0 z-50 bg-white/95 backdrop-blur-md border-b border-gray-150">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => navigate(-1)}
              className="w-9 h-9 rounded-xl border border-gray-200 hover:bg-gray-100 flex items-center justify-center text-gray-600 transition-colors cursor-pointer"
              aria-label="Go back"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
            <Link to="/" className="flex items-center gap-2 group">
              <img src="/images/logo.png" alt="MyArteLab" className="w-7 h-7 rounded-lg object-contain" />
              <span className="font-bold text-gray-900 text-base sm:text-lg tracking-tight group-hover:text-[#9747FF] transition-colors">
                MyArteLab
              </span>
            </Link>
          </div>

          <div className="flex items-center gap-2 sm:gap-4">
            <Link
              to="/legal"
              className="text-xs sm:text-sm font-semibold text-gray-600 hover:text-[#9747FF] transition-colors"
            >
              Terms of Service
            </Link>
            <Link
              to="/login"
              className="hidden sm:inline-flex text-xs sm:text-sm font-semibold text-gray-600 hover:text-gray-900 transition-colors"
            >
              Log in
            </Link>
            <Link
              to="/register"
              className="h-9 px-3.5 sm:px-4 rounded-xl bg-[#9747FF] hover:bg-[#8534f0] text-white text-xs sm:text-sm font-semibold flex items-center justify-center transition-all shadow-2xs"
            >
              Get Started
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Banner */}
      <div className="bg-white border-b border-gray-150 py-10 sm:py-14">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-purple-50 border border-purple-100 text-[#9747FF] text-xs font-semibold mb-4">
            <Shield className="w-3.5 h-3.5" />
            <span>Privacy & Data Protection</span>
          </div>
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-gray-900 tracking-tight">
            Privacy Policy
          </h1>
          <p className="mt-3 text-sm sm:text-base text-gray-500 max-w-2xl mx-auto">
            How MyArteLab collects, protects, uses, and respects your personal and payment data across our creator marketplace.
          </p>
          <div className="mt-4 flex items-center justify-center gap-4 text-xs text-gray-400">
            <span>Last Updated: October 19, 2026</span>
            <span>•</span>
            <span>Effective Immediately</span>
          </div>
        </div>
      </div>

      {/* Main Content Body */}
      <main className="max-w-4xl mx-auto px-4 sm:px-6 py-10 sm:py-14">
        <div className="bg-white rounded-2xl border border-gray-200/80 shadow-xs p-6 sm:p-10 lg:p-12 space-y-10">
          
          {/* Section 1: Introduction */}
          <section className="space-y-3">
            <h2 className="text-xl sm:text-2xl font-bold text-gray-900 tracking-tight flex items-center gap-2.5">
              <span className="w-7 h-7 rounded-lg bg-purple-50 text-[#9747FF] text-xs font-bold flex items-center justify-center shrink-0">1</span>
              Introduction
            </h2>
            <p className="text-sm sm:text-base text-gray-600 leading-relaxed">
              MyArteLab (&quot;we&quot;, &quot;our&quot;, or &quot;us&quot;) operates the creative talent marketplace accessible at{' '}
              <a href="https://app.myartelab.com" className="text-[#9747FF] font-semibold hover:underline">
                app.myartelab.com
              </a>{' '}
              and{' '}
              <a href="https://myartelab.com" className="text-[#9747FF] font-semibold hover:underline">
                myartelab.com
              </a>. We connect talented African creative professionals with clients worldwide, providing project collaboration, escrow services, and instant USDC payments.
            </p>
            <p className="text-sm sm:text-base text-gray-600 leading-relaxed">
              This Privacy Policy explains what personal information we collect, why we collect it, how it is processed and safeguarded, and the rights and choices available to you. By accessing our platform, registering an account, or transacting on MyArteLab, you acknowledge the practices described in this policy.
            </p>
          </section>

          {/* Section 2: Information We Collect */}
          <section className="space-y-4 pt-6 border-t border-gray-150">
            <h2 className="text-xl sm:text-2xl font-bold text-gray-900 tracking-tight flex items-center gap-2.5">
              <span className="w-7 h-7 rounded-lg bg-purple-50 text-[#9747FF] text-xs font-bold flex items-center justify-center shrink-0">2</span>
              Information We Collect
            </h2>
            
            <div className="space-y-4 text-sm sm:text-base text-gray-600">
              <div className="p-4 rounded-xl bg-gray-50/70 border border-gray-150 space-y-2">
                <h3 className="font-semibold text-gray-900">A. Registration & Profile Information</h3>
                <ul className="list-disc list-inside space-y-1.5 text-xs sm:text-sm text-gray-600">
                  <li><strong>Account Credentials:</strong> First name, last name, email address, password hash (salted using bcrypt; plaintext passwords are never stored), and role specification (client or creator).</li>
                  <li><strong>Creator Profiles:</strong> Bio, primary creative specialty (e.g., Photography, Videography, Graphic Design, UI/UX Design, Content Creation), skills, portfolio media, packages, pricing, availability, and avatar image.</li>
                  <li><strong>Location Information:</strong> Country, state, and local area provided for regional relevance and payment routing.</li>
                  <li><strong>Contact Details:</strong> Phone number (optional and hidden from public display by default).</li>
                </ul>
              </div>

              <div className="p-4 rounded-xl bg-gray-50/70 border border-gray-150 space-y-2">
                <h3 className="font-semibold text-gray-900">B. Google Sign-In & Third-Party Authentication</h3>
                <p className="text-xs sm:text-sm text-gray-600">
                  When you sign in or register using Google Sign-In, we request access strictly to your standard Google identity claims (<code className="px-1.5 py-0.5 bg-gray-200/80 rounded text-gray-800 text-xs">openid</code>, <code className="px-1.5 py-0.5 bg-gray-200/80 rounded text-gray-800 text-xs">email</code>, <code className="px-1.5 py-0.5 bg-gray-200/80 rounded text-gray-800 text-xs">profile</code>).
                </p>
                <ul className="list-disc list-inside space-y-1.5 text-xs sm:text-sm text-gray-600">
                  <li>We collect your verified Google email address, unique Google subject ID (<code className="text-xs">sub</code>), full name, and avatar image.</li>
                  <li>We do not request access to your Google Drive, contacts, calendar, or any extraneous Google services.</li>
                  <li>Authentication tokens are cryptographically verified directly on our server against Google&apos;s authorization endpoints to confirm audience and expiration.</li>
                </ul>
              </div>

              <div className="p-4 rounded-xl bg-gray-50/70 border border-gray-150 space-y-2">
                <h3 className="font-semibold text-gray-900">C. Financial, Wallet & Payout Data</h3>
                <ul className="list-disc list-inside space-y-1.5 text-xs sm:text-sm text-gray-600">
                  <li><strong>Solana USDC Wallets:</strong> Non-custodial Solana wallets provisioned via our licensed payment provider, Switch. Public wallet addresses and transaction IDs are stored on our ledger.</li>
                  <li><strong>Bank Withdrawal Beneficiaries:</strong> Bank account numbers, account holder names, bank names, and institution codes for Nigerian bank off-ramps (e.g., OPay, commercial banks). Account numbers are masked in UI views.</li>
                  <li><strong>Transaction Records:</strong> Internal transaction IDs, deposit references, payout references, transaction timestamps, currency amounts (USDC/NGN), on-chain transaction signatures, and fee amounts.</li>
                </ul>
              </div>

              <div className="p-4 rounded-xl bg-gray-50/70 border border-gray-150 space-y-2">
                <h3 className="font-semibold text-gray-900">D. Marketplace & Communication Data</h3>
                <ul className="list-disc list-inside space-y-1.5 text-xs sm:text-sm text-gray-600">
                  <li>Direct messages between clients and creators relating to bookings and deliverables.</li>
                  <li>Project contracts, project status updates, milestones, deliverable submissions, and client reviews.</li>
                </ul>
              </div>
            </div>
          </section>

          {/* Section 3: How We Use Your Information */}
          <section className="space-y-4 pt-6 border-t border-gray-150">
            <h2 className="text-xl sm:text-2xl font-bold text-gray-900 tracking-tight flex items-center gap-2.5">
              <span className="w-7 h-7 rounded-lg bg-purple-50 text-[#9747FF] text-xs font-bold flex items-center justify-center shrink-0">3</span>
              How We Use Your Information
            </h2>
            <ul className="space-y-2.5 text-sm sm:text-base text-gray-600">
              <li className="flex items-start gap-2.5">
                <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                <span><strong>Platform Functionality:</strong> To authenticate your account, maintain active sessions, display public creator portfolios, and facilitate client bookings.</span>
              </li>
              <li className="flex items-start gap-2.5">
                <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                <span><strong>Payment Processing & Escrow:</strong> To hold booking funds securely in escrow until milestones are approved, execute instant USDC transfers, and dispatch bank off-ramp payouts to verified accounts.</span>
              </li>
              <li className="flex items-start gap-2.5">
                <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                <span><strong>Security & Fraud Prevention:</strong> To detect suspicious off-ramps, prevent duplicate accounts, enforce rate limiting, and protect users from unauthorized access.</span>
              </li>
              <li className="flex items-start gap-2.5">
                <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                <span><strong>Service Communications:</strong> To send email verification codes, password reset links, deliverable notifications, booking confirmations, and critical security alerts.</span>
              </li>
            </ul>
          </section>

          {/* Section 4: Data Sharing & Third-Party Service Providers */}
          <section className="space-y-4 pt-6 border-t border-gray-150">
            <h2 className="text-xl sm:text-2xl font-bold text-gray-900 tracking-tight flex items-center gap-2.5">
              <span className="w-7 h-7 rounded-lg bg-purple-50 text-[#9747FF] text-xs font-bold flex items-center justify-center shrink-0">4</span>
              Data Sharing & Third-Party Service Providers
            </h2>
            <p className="text-sm sm:text-base text-gray-600 leading-relaxed">
              We do not sell, rent, or trade your personal data. We share information only with authorized infrastructure and payment service providers strictly necessary to operate MyArteLab:
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 text-xs sm:text-sm">
              <div className="p-3.5 rounded-xl border border-gray-150 bg-gray-50/50 space-y-1">
                <span className="font-semibold text-gray-900">Switch (Onswitch)</span>
                <p className="text-gray-500">Licensed digital asset and banking off-ramp infrastructure provider for Solana USDC wallet provisioning, bank resolution, and off-ramp payouts.</p>
              </div>
              <div className="p-3.5 rounded-xl border border-gray-150 bg-gray-50/50 space-y-1">
                <span className="font-semibold text-gray-900">Google Identity Services</span>
                <p className="text-gray-500">Provides secure OAuth identity token verification and single sign-on authentication.</p>
              </div>
              <div className="p-3.5 rounded-xl border border-gray-150 bg-gray-50/50 space-y-1">
                <span className="font-semibold text-gray-900">Cloudinary</span>
                <p className="text-gray-500">Encrypted media delivery network used to host creator portfolio images, work samples, and avatars.</p>
              </div>
              <div className="p-3.5 rounded-xl border border-gray-150 bg-gray-50/50 space-y-1">
                <span className="font-semibold text-gray-900">Zoho Mail SMTP</span>
                <p className="text-gray-500">Secure transactional email delivery for email verification codes and booking notifications.</p>
              </div>
            </div>
            <p className="text-xs sm:text-sm text-gray-500 italic mt-2">
              Note: Blockchain transactions (such as Solana transfers) broadcast public wallet addresses and transaction signatures to the decentralized Solana network, where they remain publicly verifiable by design on block explorers such as Solscan.
            </p>
          </section>

          {/* Section 5: Security, Encryption & Storage */}
          <section className="space-y-4 pt-6 border-t border-gray-150">
            <h2 className="text-xl sm:text-2xl font-bold text-gray-900 tracking-tight flex items-center gap-2.5">
              <span className="w-7 h-7 rounded-lg bg-purple-50 text-[#9747FF] text-xs font-bold flex items-center justify-center shrink-0">5</span>
              Data Security & Encryption
            </h2>
            <div className="space-y-3 text-sm sm:text-base text-gray-600">
              <p>
                We implement robust administrative, technical, and cryptographic safeguards:
              </p>
              <ul className="list-disc list-inside space-y-1.5 text-xs sm:text-sm">
                <li><strong>Encryption at Rest:</strong> Sensitive credentials and secrets are encrypted using authenticated AES-256-GCM algorithms before database persistence.</li>
                <li><strong>Encryption in Transit:</strong> All HTTP traffic is enforced over TLS/HTTPS with modern cipher suites and Strict-Transport-Security (HSTS).</li>
                <li><strong>Strict Content Security Policy (CSP):</strong> HTTP headers enforced via Helmet restrict script origins and frame embedding.</li>
                <li><strong>Two-Factor Authentication (2FA):</strong> Optional TOTP two-factor authentication with hashed backup codes is available for account security.</li>
              </ul>
            </div>
          </section>

          {/* Section 6: Cookies & Local Storage */}
          <section className="space-y-3 pt-6 border-t border-gray-150">
            <h2 className="text-xl sm:text-2xl font-bold text-gray-900 tracking-tight flex items-center gap-2.5">
              <span className="w-7 h-7 rounded-lg bg-purple-50 text-[#9747FF] text-xs font-bold flex items-center justify-center shrink-0">6</span>
              Cookies & Local Storage
            </h2>
            <p className="text-sm sm:text-base text-gray-600 leading-relaxed">
              MyArteLab uses modern client browser storage (<code className="px-1.5 py-0.5 bg-gray-100 rounded text-gray-800 text-xs">localStorage</code> and <code className="px-1.5 py-0.5 bg-gray-100 rounded text-gray-800 text-xs">sessionStorage</code>) exclusively to store your authenticated session JWT tokens and UI preferences. We do not use third-party tracking cookies or advertising tracking pixels.
            </p>
          </section>

          {/* Section 7: User Rights, Deletion & Account Closure */}
          <section className="space-y-4 pt-6 border-t border-gray-150">
            <h2 className="text-xl sm:text-2xl font-bold text-gray-900 tracking-tight flex items-center gap-2.5">
              <span className="w-7 h-7 rounded-lg bg-purple-50 text-[#9747FF] text-xs font-bold flex items-center justify-center shrink-0">7</span>
              Your Rights & Account Deletion
            </h2>
            <p className="text-sm sm:text-base text-gray-600 leading-relaxed">
              You retain ownership of your personal data. Depending on your jurisdiction, you have the following rights:
            </p>
            <ul className="list-disc list-inside space-y-1.5 text-xs sm:text-sm text-gray-600">
              <li><strong>Access & Correction:</strong> You can review and edit your profile, category, skills, and contact details directly in Settings at any time.</li>
              <li><strong>Account Deletion:</strong> You may request permanent deletion of your account and personal profile data directly via the Settings panel (<code className="text-xs">DELETE /api/auth/delete-account</code>) or by contacting our privacy team.</li>
              <li><strong>Financial Record Retention:</strong> Due to regulatory anti-money laundering and tax accounting obligations, completed ledger transactions and off-ramp logs must be retained for required statutory periods even after account closure.</li>
            </ul>
          </section>

          {/* Section 8: Contact Information */}
          <section className="space-y-3 pt-6 border-t border-gray-150">
            <h2 className="text-xl sm:text-2xl font-bold text-gray-900 tracking-tight flex items-center gap-2.5">
              <span className="w-7 h-7 rounded-lg bg-purple-50 text-[#9747FF] text-xs font-bold flex items-center justify-center shrink-0">8</span>
              Contact Us
            </h2>
            <p className="text-sm sm:text-base text-gray-600 leading-relaxed">
              If you have any questions, inquiries, or data requests regarding this Privacy Policy or our security practices, please contact our privacy compliance team:
            </p>
            <div className="p-4 rounded-xl bg-purple-50/60 border border-purple-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs sm:text-sm">
              <div className="space-y-0.5">
                <span className="font-semibold text-gray-900">MyArteLab Privacy & Support Team</span>
                <p className="text-gray-500">Official contact email for privacy, data protection, and user rights inquiries.</p>
              </div>
              <a
                href="mailto:support@myartelab.com"
                className="inline-flex items-center gap-1.5 font-bold text-[#9747FF] hover:underline"
              >
                <Mail className="w-4 h-4" />
                <span>support@myartelab.com</span>
              </a>
            </div>
          </section>

        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-gray-200 bg-white py-8 text-center text-xs text-gray-400">
        <div className="max-w-6xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p>© {new Date().getFullYear()} MyArteLab. All rights reserved.</p>
          <div className="flex items-center gap-6">
            <Link to="/privacy-policy" className="text-gray-600 hover:text-[#9747FF] transition-colors">
              Privacy Policy
            </Link>
            <Link to="/legal" className="text-gray-600 hover:text-[#9747FF] transition-colors">
              Terms of Service
            </Link>
            <a href="mailto:support@myartelab.com" className="text-gray-600 hover:text-[#9747FF] transition-colors">
              Contact Support
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}
