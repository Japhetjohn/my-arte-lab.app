import { ArrowLeft, FileText, Shield, Cookie } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { useState } from 'react';

export function Legal() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'privacy' | 'terms' | 'cookies'>('privacy');

  const PrivacyPolicy = () => (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-bold text-gray-900 mb-4">Privacy Policy</h2>
        <p className="text-gray-600">Last updated: April 8, 2026</p>
      </div>

      <section>
        <h3 className="text-lg font-semibold text-gray-900 mb-3">1. Introduction</h3>
        <p className="text-gray-600 mb-3">
          MyArteLab (&quot;we&quot;, &quot;our&quot;, or &quot;us&quot;) is committed to protecting your privacy. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our platform.
        </p>
        <p className="text-gray-600">
          By using MyArteLab, you agree to the collection and use of information in accordance with this policy.
        </p>
      </section>

      <section>
        <h3 className="text-lg font-semibold text-gray-900 mb-3">2. Information We Collect</h3>
        <ul className="list-disc list-inside space-y-2 text-gray-600">
          <li><strong>Personal Information:</strong> Name, email address, phone number, profile picture, and location</li>
          <li><strong>Account Information:</strong> Username, password, account preferences</li>
          <li><strong>Payment Information:</strong> Bank account details, wallet addresses, transaction history</li>
          <li><strong>Usage Data:</strong> How you interact with our platform, pages visited, features used</li>
          <li><strong>Communications:</strong> Messages between users, support inquiries</li>
        </ul>
      </section>

      <section>
        <h3 className="text-lg font-semibold text-gray-900 mb-3">3. How We Use Your Information</h3>
        <ul className="list-disc list-inside space-y-2 text-gray-600">
          <li>To provide and maintain our services</li>
          <li>To process payments and transactions</li>
          <li>To facilitate communication between clients and creators</li>
          <li>To improve our platform and user experience</li>
          <li>To send important notifications and updates</li>
          <li>To prevent fraud and ensure platform security</li>
        </ul>
      </section>

      <section>
        <h3 className="text-lg font-semibold text-gray-900 mb-3">4. Data Security</h3>
        <p className="text-gray-600 mb-3">
          We implement appropriate technical and organizational security measures to protect your personal data against unauthorized access, alteration, disclosure, or destruction.
        </p>
        <p className="text-gray-600">
          All payment information is encrypted and processed through secure third-party payment processors. We never store your full banking credentials.
        </p>
      </section>

      <section>
        <h3 className="text-lg font-semibold text-gray-900 mb-3">5. Your Rights</h3>
        <p className="text-gray-600 mb-3">You have the right to:</p>
        <ul className="list-disc list-inside space-y-2 text-gray-600">
          <li>Access your personal data</li>
          <li>Correct inaccurate information</li>
          <li>Request deletion of your data</li>
          <li>Object to certain processing activities</li>
          <li>Export your data</li>
        </ul>
      </section>

      <section>
        <h3 className="text-lg font-semibold text-gray-900 mb-3">6. Contact Us</h3>
        <p className="text-gray-600">
          If you have any questions about this Privacy Policy, please contact us at support@myartelab.com
        </p>
      </section>
    </div>
  );

  const TermsOfService = () => (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-bold text-gray-900 mb-4">Terms of Service</h2>
        <p className="text-gray-600">Last updated: April 8, 2026</p>
      </div>

      <section>
        <h3 className="text-lg font-semibold text-gray-900 mb-3">1. Acceptance of Terms</h3>
        <p className="text-gray-600">
          By accessing or using MyArteLab, you agree to be bound by these Terms of Service. If you disagree with any part of the terms, you may not access the service.
        </p>
      </section>

      <section>
        <h3 className="text-lg font-semibold text-gray-900 mb-3">2. Description of Service</h3>
        <p className="text-gray-600">
          MyArteLab is a platform that connects creative professionals (creators) with clients seeking creative services. We provide tools for communication, project management, and payment processing.
        </p>
      </section>

      <section>
        <h3 className="text-lg font-semibold text-gray-900 mb-3">3. User Accounts</h3>
        <ul className="list-disc list-inside space-y-2 text-gray-600">
          <li>You must be at least 18 years old to use this service</li>
          <li>You are responsible for maintaining the confidentiality of your account</li>
          <li>You agree to provide accurate and complete information</li>
          <li>One person may only maintain one active account</li>
        </ul>
      </section>

      <section>
        <h3 className="text-lg font-semibold text-gray-900 mb-3">4. Payments and Fees</h3>
        <ul className="list-disc list-inside space-y-2 text-gray-600">
          <li>All payments are processed through our secure payment system</li>
          <li>Creators receive payment upon successful completion of projects</li>
          <li>Platform fees are deducted from creator earnings</li>
          <li>Refunds are handled on a case-by-case basis</li>
        </ul>
      </section>

      <section>
        <h3 className="text-lg font-semibold text-gray-900 mb-3">5. Prohibited Activities</h3>
        <p className="text-gray-600 mb-3">Users may not:</p>
        <ul className="list-disc list-inside space-y-2 text-gray-600">
          <li>Use the platform for illegal purposes</li>
          <li>Harass, abuse, or harm other users</li>
          <li>Circumvent platform fees through off-platform payments</li>
          <li>Post false or misleading information</li>
          <li>Infringe on intellectual property rights</li>
        </ul>
      </section>

      <section>
        <h3 className="text-lg font-semibold text-gray-900 mb-3">6. Termination</h3>
        <p className="text-gray-600">
          We may terminate or suspend your account immediately, without prior notice or liability, for any reason, including breach of these Terms.
        </p>
      </section>

      <section>
        <h3 className="text-lg font-semibold text-gray-900 mb-3">7. Limitation of Liability</h3>
        <p className="text-gray-600">
          MyArteLab shall not be liable for any indirect, incidental, special, consequential, or punitive damages resulting from your use of the service.
        </p>
      </section>
    </div>
  );

  const CookiePolicy = () => (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-bold text-gray-900 mb-4">Cookie Policy</h2>
        <p className="text-gray-600">Last updated: April 8, 2026</p>
      </div>

      <section>
        <h3 className="text-lg font-semibold text-gray-900 mb-3">What Are Cookies</h3>
        <p className="text-gray-600">
          Cookies are small text files stored on your device when you visit a website. They help us provide and improve our services.
        </p>
      </section>

      <section>
        <h3 className="text-lg font-semibold text-gray-900 mb-3">How We Use Cookies</h3>
        <ul className="list-disc list-inside space-y-2 text-gray-600">
          <li><strong>Essential Cookies:</strong> Required for the platform to function properly</li>
          <li><strong>Authentication:</strong> To keep you logged in</li>
          <li><strong>Preferences:</strong> To remember your settings and choices</li>
          <li><strong>Analytics:</strong> To understand how users interact with our platform</li>
          <li><strong>Security:</strong> To protect against fraud and unauthorized access</li>
        </ul>
      </section>

      <section>
        <h3 className="text-lg font-semibold text-gray-900 mb-3">Managing Cookies</h3>
        <p className="text-gray-600">
          You can control cookies through your browser settings. However, disabling certain cookies may affect the functionality of our platform.
        </p>
      </section>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-white border-b border-gray-200">
        <div className="flex items-center justify-between h-14 px-4 max-w-7xl mx-auto">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate(-1)}
              className="h-9 w-9"
            >
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <h1 className="font-bold text-lg">Legal Documents</h1>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-4xl mx-auto p-4 py-8">
        {/* Tabs */}
        <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
          <button
            onClick={() => setActiveTab('privacy')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium whitespace-nowrap transition-colors ${
              activeTab === 'privacy'
                ? 'bg-[#8A2BE2] text-white'
                : 'bg-white text-gray-700 hover:bg-gray-100'
            }`}
          >
            <Shield className="w-4 h-4" />
            Privacy Policy
          </button>
          <button
            onClick={() => setActiveTab('terms')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium whitespace-nowrap transition-colors ${
              activeTab === 'terms'
                ? 'bg-[#8A2BE2] text-white'
                : 'bg-white text-gray-700 hover:bg-gray-100'
            }`}
          >
            <FileText className="w-4 h-4" />
            Terms of Service
          </button>
          <button
            onClick={() => setActiveTab('cookies')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium whitespace-nowrap transition-colors ${
              activeTab === 'cookies'
                ? 'bg-[#8A2BE2] text-white'
                : 'bg-white text-gray-700 hover:bg-gray-100'
            }`}
          >
            <Cookie className="w-4 h-4" />
            Cookie Policy
          </button>
        </div>

        {/* Content Card */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 md:p-8">
          {activeTab === 'privacy' && <PrivacyPolicy />}
          {activeTab === 'terms' && <TermsOfService />}
          {activeTab === 'cookies' && <CookiePolicy />}
        </div>

        {/* Contact */}
        <div className="mt-8 text-center">
          <p className="text-gray-500 text-sm">
            Questions about our policies?{' '}
            <a href="mailto:support@myartelab.com" className="text-[#8A2BE2] hover:underline">
              Contact us
            </a>
          </p>
        </div>
      </main>
    </div>
  );
}
