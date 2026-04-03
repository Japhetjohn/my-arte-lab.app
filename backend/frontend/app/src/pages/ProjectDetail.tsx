import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { api, useAuth } from '@/contexts/AuthContext';
import { 
  Loader2, 
  ArrowLeft, 
  Calendar, 
  DollarSign, 
  User,
  CheckCircle,
  XCircle,
  MessageSquare,
  Send,
  Wallet
} from 'lucide-react';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

interface Application {
  _id: string;
  creatorId: {
    _id: string;
    firstName: string;
    lastName: string;
    name?: string;
    avatar?: string;
    category?: string;
    bio?: string;
  };
  coverLetter: string;
  proposedBudget: {
    amount: number;
    currency: string;
  };
  proposedTimeline: string;
  portfolioLinks?: string[];
  status: 'pending' | 'accepted' | 'rejected';
  createdAt: string;
}

interface Project {
  _id: string;
  title: string;
  description: string;
  category: string;
  budget: {
    min: number;
    max: number;
  };
  timeline: string;
  status: 'open' | 'in_progress' | 'completed' | 'cancelled';
  createdAt: string;
  skillsRequired: string[];
  deliverables: string[];
  clientId: {
    _id: string;
    firstName: string;
    lastName: string;
    name?: string;
    avatar?: string;
    email?: string;
  };
  selectedCreatorId?: {
    _id: string;
    firstName: string;
    lastName: string;
    name?: string;
    avatar?: string;
    category?: string;
  };
}

export function ProjectDetail() {
  const { user } = useAuth();
  const [project, setProject] = useState<Project | null>(null);
  const [applications, setApplications] = useState<Application[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [hasApplied, setHasApplied] = useState(false);
  const [isApplyModalOpen, setIsApplyModalOpen] = useState(false);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [selectedApplication, setSelectedApplication] = useState<Application | null>(null);
  
  // Get project ID from URL
  const urlMatch = window.location.pathname.match(/\/projects\/(.+)/);
  const projectId = urlMatch?.[1];

  useEffect(() => {
    if (projectId) {
      fetchProject();
      fetchApplications();
    }
  }, [projectId]);

  const fetchProject = async () => {
    try {
      const response = await api.get(`/projects/${projectId}`);
      setProject(response.data.data?.project);
      setHasApplied(response.data.data?.hasApplied);
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to fetch project');
    }
  };

  const fetchApplications = async () => {
    try {
      const response = await api.get(`/projects/${projectId}/applications`);
      setApplications(response.data.data?.applications || []);
      setIsLoading(false);
    } catch (error) {
      // Silently fail - user might not have permission to view applications
      setIsLoading(false);
    }
  };

  const handleAcceptApplication = async (applicationId: string) => {
    try {
      const response = await api.patch(`/projects/applications/${applicationId}`, {
        status: 'accepted'
      });
      
      toast.success('Application accepted! Proceeding to payment...');
      setSelectedApplication(response.data.data?.application);
      setIsPaymentModalOpen(true);
      fetchProject();
      fetchApplications();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to accept application');
    }
  };

  const handleRejectApplication = async (applicationId: string) => {
    if (!confirm('Are you sure you want to reject this application?')) return;
    
    try {
      await api.patch(`/projects/applications/${applicationId}`, {
        status: 'rejected'
      });
      
      toast.success('Application rejected');
      fetchApplications();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to reject application');
    }
  };

  const handlePayForProject = async () => {
    try {
      await api.post(`/projects/${projectId}/pay`);
      toast.success('Payment successful! Project is now in progress.');
      setIsPaymentModalOpen(false);
      fetchProject();
      // Redirect to bookings page
      window.location.href = '/bookings';
    } catch (error: any) {
      if (error.response?.data?.message?.includes('Insufficient balance')) {
        toast.error('Insufficient wallet balance. Please fund your wallet first.');
        window.location.href = '/wallet';
      } else {
        toast.error(error.response?.data?.message || 'Payment failed');
      }
    }
  };

  const isOwner = user?.id === project?.clientId?._id;
  const isCreator = user?.role === 'creator';

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-[#8A2BE2]" />
      </div>
    );
  }

  if (!project) {
    return (
      <div className="text-center py-20">
        <p className="text-gray-500">Project not found</p>
        <Button 
          className="mt-4 bg-[#8A2BE2] hover:bg-[#7B1FD1] text-white"
          onClick={() => window.location.href = '/projects'}
        >
          Back to Projects
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-20 lg:pb-8">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button 
          variant="ghost" 
          size="icon"
          onClick={() => window.location.href = '/projects'}
        >
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <h1 className="text-2xl font-bold text-gray-900">Project Details</h1>
      </div>

      {/* Project Info Card */}
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between">
            <div>
              <CardTitle className="text-xl">{project.title}</CardTitle>
              <p className="text-gray-500 mt-1">Posted by {project.clientId?.name || 
                `${project.clientId?.firstName} ${project.clientId?.lastName}`}</p>
            </div>
            <Badge className={`
              ${project.status === 'open' ? 'bg-green-100 text-green-800' : ''}
              ${project.status === 'in_progress' ? 'bg-blue-100 text-blue-800' : ''}
              ${project.status === 'completed' ? 'bg-gray-100 text-gray-800' : ''}
            `}>
              {project.status.replace('_', ' ')}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-gray-700">{project.description}</p>
          
          <div className="flex flex-wrap gap-4 text-sm">
            <div className="flex items-center gap-1 text-gray-600">
              <DollarSign className="w-4 h-4" />
              ${project.budget.min.toLocaleString()} - ${project.budget.max.toLocaleString()}
            </div>
            <div className="flex items-center gap-1 text-gray-600">
              <Calendar className="w-4 h-4" />
              {project.timeline.replace('-', ' ')}
            </div>
            <div className="flex items-center gap-1 text-gray-600">
              <User className="w-4 h-4" />
              {project.category}
            </div>
          </div>

          {project.skillsRequired?.length > 0 && (
            <div>
              <h4 className="font-medium text-sm mb-2">Skills Required:</h4>
              <div className="flex flex-wrap gap-2">
                {project.skillsRequired.map((skill, i) => (
                  <Badge key={i} variant="secondary">{skill}</Badge>
                ))}
              </div>
            </div>
          )}

          {project.deliverables?.length > 0 && (
            <div>
              <h4 className="font-medium text-sm mb-2">Expected Deliverables:</h4>
              <ul className="list-disc list-inside text-sm text-gray-600">
                {project.deliverables.map((item, i) => (
                  <li key={i}>{item}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex gap-3 pt-4">
            {isCreator && project.status === 'open' && !hasApplied && !isOwner && (
              <Button 
                className="bg-[#8A2BE2] hover:bg-[#7B1FD1] text-white"
                onClick={() => setIsApplyModalOpen(true)}
              >
                <Send className="w-4 h-4 mr-2" />
                Apply to Project
              </Button>
            )}
            {hasApplied && (
              <Badge variant="outline" className="text-amber-600 border-amber-600">
                Application Submitted
              </Badge>
            )}
            {isOwner && project.status === 'in_progress' && (
              <Button 
                className="bg-green-600 hover:bg-green-700 text-white"
                onClick={() => window.location.href = '/bookings'}
              >
                <Wallet className="w-4 h-4 mr-2" />
                View in Bookings
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Applications Section (Owner Only) */}
      {isOwner && project.status === 'open' && (
        <Card>
          <CardHeader>
            <CardTitle>Applications ({applications.length})</CardTitle>
          </CardHeader>
          <CardContent>
            {applications.length === 0 ? (
              <p className="text-gray-500 text-center py-8">
                No applications yet. Share your project to attract creators!
              </p>
            ) : (
              <div className="space-y-4">
                {applications.map((app) => (
                  <Card key={app._id} className="border-l-4 border-l-[#8A2BE2]">
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-3">
                          <img
                            src={app.creatorId?.avatar || '/images/avatar-1.png'}
                            alt="Creator"
                            className="w-12 h-12 rounded-full object-cover"
                          />
                          <div>
                            <h4 className="font-semibold">
                              {app.creatorId?.name || 
                               `${app.creatorId?.firstName} ${app.creatorId?.lastName}`}
                            </h4>
                            <p className="text-sm text-gray-500">{app.creatorId?.category}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="font-semibold text-[#8A2BE2]">
                            ${app.proposedBudget?.amount} {app.proposedBudget?.currency}
                          </p>
                          <p className="text-sm text-gray-500">{app.proposedTimeline}</p>
                        </div>
                      </div>
                      
                      <p className="mt-3 text-sm text-gray-700">{app.coverLetter}</p>
                      
                      {app.status === 'pending' && (
                        <div className="flex gap-2 mt-4">
                          <Button
                            size="sm"
                            className="bg-green-600 hover:bg-green-700 text-white"
                            onClick={() => handleAcceptApplication(app._id)}
                          >
                            <CheckCircle className="w-4 h-4 mr-1" />
                            Accept
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-red-600 border-red-600 hover:bg-red-50"
                            onClick={() => handleRejectApplication(app._id)}
                          >
                            <XCircle className="w-4 h-4 mr-1" />
                            Reject
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => window.location.href = `/messages?user=${app.creatorId?._id}`}
                          >
                            <MessageSquare className="w-4 h-4 mr-1" />
                            Message
                          </Button>
                        </div>
                      )}
                      
                      {app.status !== 'pending' && (
                        <Badge className={`
                          mt-4
                          ${app.status === 'accepted' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}
                        `}>
                          {app.status.charAt(0).toUpperCase() + app.status.slice(1)}
                        </Badge>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Apply Modal */}
      {projectId && (
        <ApplyModal
          isOpen={isApplyModalOpen}
          onClose={() => setIsApplyModalOpen(false)}
          projectId={projectId}
          onSuccess={() => {
            setIsApplyModalOpen(false);
            setHasApplied(true);
            fetchApplications();
          }}
        />
      )}

      {/* Payment Modal */}
      <Dialog open={isPaymentModalOpen} onOpenChange={setIsPaymentModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Complete Payment</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            <p className="text-gray-600">
              You have accepted an application. Please complete the payment to start the project.
            </p>
            
            {selectedApplication && (
              <div className="bg-gray-50 p-4 rounded-lg">
                <p className="font-medium">
                  Amount: ${selectedApplication.proposedBudget?.amount} {selectedApplication.proposedBudget?.currency}
                </p>
                <p className="text-sm text-gray-500">
                  Creator: {selectedApplication.creatorId?.name || 
                  `${selectedApplication.creatorId?.firstName} ${selectedApplication.creatorId?.lastName}`}
                </p>
              </div>
            )}

            <div className="flex gap-3">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => setIsPaymentModalOpen(false)}
              >
                Cancel
              </Button>
              <Button
                className="flex-1 bg-[#8A2BE2] hover:bg-[#7B1FD1] text-white"
                onClick={handlePayForProject}
              >
                <Wallet className="w-4 h-4 mr-2" />
                Pay Now
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// Apply Modal Component
interface ApplyModalProps {
  isOpen: boolean;
  onClose: () => void;
  projectId: string;
  onSuccess: () => void;
}

function ApplyModal({ isOpen, onClose, projectId, onSuccess }: ApplyModalProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    coverLetter: '',
    proposedAmount: '',
    proposedTimeline: '1-week',
    portfolioLinks: ''
  });

  const timelines = [
    { value: '1-week', label: 'Less than 1 week' },
    { value: '2-weeks', label: '1-2 weeks' },
    { value: '1-month', label: 'Less than 1 month' },
    { value: '3-months', label: '1-3 months' },
    { value: '6-months', label: '3-6 months' },
    { value: 'ongoing', label: 'Ongoing/Long-term' }
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.coverLetter || !formData.proposedAmount) {
      toast.error('Please fill in all required fields');
      return;
    }

    const amount = parseFloat(formData.proposedAmount);
    if (isNaN(amount) || amount <= 0) {
      toast.error('Please enter a valid amount');
      return;
    }

    try {
      setIsSubmitting(true);
      
      await api.post(`/projects/${projectId}/apply`, {
        coverLetter: formData.coverLetter,
        proposedBudget: {
          amount: amount,
          currency: 'USDC'
        },
        proposedTimeline: formData.proposedTimeline,
        portfolioLinks: formData.portfolioLinks.split('\n').map(s => s.trim()).filter(Boolean)
      });
      
      toast.success('Application submitted successfully!');
      onSuccess();
    } catch (error: any) {
      if (error.response?.data?.message?.includes('already applied')) {
        toast.error('You have already applied to this project');
      } else {
        toast.error(error.response?.data?.message || 'Failed to submit application');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Apply to Project</DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4 mt-4">
          <div>
            <label className="block text-sm font-medium mb-1">Cover Letter *</label>
            <textarea
              className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-[#8A2BE2] focus:border-transparent"
              rows={4}
              placeholder="Introduce yourself and explain why you're a good fit..."
              value={formData.coverLetter}
              onChange={(e) => setFormData({ ...formData, coverLetter: e.target.value })}
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Your Proposed Budget (USDC) *</label>
            <input
              type="number"
              className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-[#8A2BE2] focus:border-transparent"
              placeholder="500"
              value={formData.proposedAmount}
              onChange={(e) => setFormData({ ...formData, proposedAmount: e.target.value })}
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Timeline *</label>
            <select
              className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-[#8A2BE2] focus:border-transparent"
              value={formData.proposedTimeline}
              onChange={(e) => setFormData({ ...formData, proposedTimeline: e.target.value })}
              required
            >
              {timelines.map(tl => (
                <option key={tl.value} value={tl.value}>{tl.label}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Portfolio Links (one per line)</label>
            <textarea
              className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-[#8A2BE2] focus:border-transparent"
              rows={3}
              placeholder="https://example.com/work1&#10;https://example.com/work2"
              value={formData.portfolioLinks}
              onChange={(e) => setFormData({ ...formData, portfolioLinks: e.target.value })}
            />
          </div>

          <div className="flex gap-3 pt-4">
            <Button
              type="button"
              variant="outline"
              className="flex-1"
              onClick={onClose}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              className="flex-1 bg-[#8A2BE2] hover:bg-[#7B1FD1] text-white"
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Submitting...
                </>
              ) : (
                'Submit Application'
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
