import { ArrowLeft, Download, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';

export function Legal() {
  const navigate = useNavigate();

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
            <h1 className="font-bold text-lg">Legal Policies</h1>
          </div>
          <a
            href="/legal-policies.pdf"
            download
            className="inline-flex items-center gap-2 text-sm font-medium text-[#8A2BE2] hover:underline"
          >
            <Download className="w-4 h-4" />
            Download PDF
          </a>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-4xl mx-auto p-4 py-8">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          {/* PDF Viewer */}
          <div className="w-full h-[calc(100vh-12rem)]">
            <iframe
              src="/legal-policies.pdf"
              className="w-full h-full border-0"
              title="Legal Policies"
            />
          </div>
        </div>

        {/* Mobile Download Option */}
        <div className="mt-6 text-center lg:hidden">
          <p className="text-sm text-gray-500 mb-3">
            Having trouble viewing the document?
          </p>
          <a
            href="/legal-policies.pdf"
            download
            className="inline-flex items-center gap-2 px-4 py-2 bg-[#8A2BE2] text-white rounded-lg font-medium hover:bg-[#7B1FD1] transition-colors"
          >
            <Download className="w-4 h-4" />
            Download PDF
          </a>
        </div>

        {/* Footer Links */}
        <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-4">
          <a
            href="/legal-policies.pdf"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-3 p-4 bg-white rounded-lg border border-gray-200 hover:border-[#8A2BE2] transition-colors"
          >
            <div className="w-10 h-10 bg-[#8A2BE2]/10 rounded-lg flex items-center justify-center">
              <FileText className="w-5 h-5 text-[#8A2BE2]" />
            </div>
            <div>
              <p className="font-medium text-gray-900">Privacy Policy</p>
              <p className="text-xs text-gray-500">How we handle your data</p>
            </div>
          </a>

          <a
            href="/legal-policies.pdf"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-3 p-4 bg-white rounded-lg border border-gray-200 hover:border-[#8A2BE2] transition-colors"
          >
            <div className="w-10 h-10 bg-[#8A2BE2]/10 rounded-lg flex items-center justify-center">
              <FileText className="w-5 h-5 text-[#8A2BE2]" />
            </div>
            <div>
              <p className="font-medium text-gray-900">Terms of Service</p>
              <p className="text-xs text-gray-500">Rules for using our platform</p>
            </div>
          </a>

          <a
            href="/legal-policies.pdf"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-3 p-4 bg-white rounded-lg border border-gray-200 hover:border-[#8A2BE2] transition-colors"
          >
            <div className="w-10 h-10 bg-[#8A2BE2]/10 rounded-lg flex items-center justify-center">
              <FileText className="w-5 h-5 text-[#8A2BE2]" />
            </div>
            <div>
              <p className="font-medium text-gray-900">Cookie Policy</p>
              <p className="text-xs text-gray-500">How we use cookies</p>
            </div>
          </a>
        </div>
      </main>
    </div>
  );
}
