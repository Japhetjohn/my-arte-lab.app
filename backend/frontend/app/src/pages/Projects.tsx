import { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { EmptyState } from '@/components/shared/EmptyState';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { api, useAuth } from '@/contexts/AuthContext';
import { 
  Plus, 
  Calendar, 
  DollarSign, 
  Users, 
  MoreVertical,
  Loader2,
  Eye,
  Edit,
  Trash2
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

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
  applicationCount?: number;
  clientId?: {
    _id: string;
    firstName: string;
    lastName: string;
    name?: string;
    avatar?: string;
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

export function Projects() {
  const { user } = useAuth();
  const [projects, setProjects] = useState<Project[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('all');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  useEffect(() => {
    fetchProjects();
  }, []);

  const fetchProjects = async () => {
    try {
      setIsLoading(true);
      // Fetch ALL open projects (public browse), not just my projects
      const response = await api.get('/projects');
      setProjects(response.data.data?.projects || []);
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to fetch projects');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteProject = async (projectId: string) => {
    if (!confirm('Are you sure you want to delete this project?')) return;
    
    try {
      await api.delete(`/projects/${projectId}`);
      toast.success('Project deleted successfully');
      fetchProjects();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to delete project');
    }
  };

  const filterProjects = (status: string) => {
    if (status === 'all') return projects;
    return projects.filter(p => p.status === status);
  };

  const getStatusCount = (status: string) => {
    if (status === 'all') return projects.length;
    return projects.filter(p => p.status === status).length;
  };

  const renderProjectCard = (project: Project) => {
    const isOwner = user?.id === project.clientId?._id;
    const hasCreator = !!project.selectedCreatorId;
    
    return (
      <Card key={project._id} className="mb-4 hover:shadow-md transition-shadow">
        <CardContent className="p-5">
          <div className="flex items-start justify-between mb-3">
            <div className="flex-1">
              <h3 className="font-semibold text-gray-900">{project.title}</h3>
              <p className="text-sm text-gray-500 mt-1 line-clamp-2">{project.description}</p>
            </div>
            <div className="flex items-center gap-2">
              <StatusBadge status={project.status} />
              {isOwner ? (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon">
                      <MoreVertical className="w-4 h-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => window.location.href = `/projects/${project._id}`}>
                      <Eye className="w-4 h-4 mr-2" />
                      View Details
                    </DropdownMenuItem>
                    {project.status === 'open' && (
                      <>
                        <DropdownMenuItem onClick={() => window.location.href = `/projects/${project._id}/edit`}>
                          <Edit className="w-4 h-4 mr-2" />
                          Edit Project
                        </DropdownMenuItem>
                        <DropdownMenuItem 
                          className="text-red-600"
                          onClick={() => handleDeleteProject(project._id)}
                        >
                          <Trash2 className="w-4 h-4 mr-2" />
                          Delete
                        </DropdownMenuItem>
                      </>
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>
              ) : (
                <Button 
                  size="sm" 
                  variant="outline"
                  className="border-[#8A2BE2] text-[#8A2BE2] hover:bg-[#8A2BE2] hover:text-white"
                  onClick={() => window.location.href = `/projects/${project._id}`}
                >
                  Apply Now
                </Button>
              )}
            </div>
          </div>

          <div className="flex flex-wrap gap-2 mb-4">
            <Badge variant="secondary" className="capitalize">
              {project.category}
            </Badge>
            <Badge variant="outline" className="capitalize">
              {project.timeline}
            </Badge>
          </div>

          <div className="flex items-center justify-between pt-4 border-t border-gray-100">
            <div className="flex items-center gap-4 text-sm text-gray-500">
              <div className="flex items-center gap-1">
                <DollarSign className="w-4 h-4" />
                ${project.budget.min.toLocaleString()} - ${project.budget.max.toLocaleString()}
              </div>
              <div className="flex items-center gap-1">
                <Calendar className="w-4 h-4" />
                {new Date(project.createdAt).toLocaleDateString()}
              </div>
              <div className="flex items-center gap-1">
                <Users className="w-4 h-4" />
                {project.applicationCount || 0} applications
              </div>
            </div>
            <div className="flex items-center gap-2">
              {/* Show client info for browsing creators */}
              {!isOwner && project.clientId && (
                <div className="flex items-center gap-2 mr-4">
                  <img
                    src={project.clientId?.avatar || '/images/avatar-1.png'}
                    alt="Client"
                    className="w-6 h-6 rounded-full object-cover"
                  />
                  <span className="text-sm text-gray-600">
                    {project.clientId?.name || 
                     `${project.clientId?.firstName || ''} ${project.clientId?.lastName || ''}`.trim()}
                  </span>
                </div>
              )}
              {/* Show selected creator for project owner */}
              {isOwner && hasCreator && (
                <div className="flex items-center gap-2 mr-4">
                  <img
                    src={project.selectedCreatorId?.avatar || '/images/avatar-1.png'}
                    alt="Creator"
                    className="w-6 h-6 rounded-full object-cover"
                  />
                  <span className="text-sm text-gray-600">
                    {project.selectedCreatorId?.name || 
                     `${project.selectedCreatorId?.firstName || ''} ${project.selectedCreatorId?.lastName || ''}`.trim()}
                  </span>
                </div>
              )}
              <Button 
                size="sm" 
                className="bg-[#8A2BE2] hover:bg-[#7B1FD1] text-white"
                onClick={() => window.location.href = `/projects/${project._id}`}
              >
                {isOwner ? 'View Details' : 'View & Apply'}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-[#8A2BE2]" />
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-20 lg:pb-8">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Browse Projects</h1>
        <Button 
          className="bg-[#8A2BE2] hover:bg-[#7B1FD1] text-white"
          onClick={() => setIsCreateModalOpen(true)}
        >
          <Plus className="w-4 h-4 mr-2" />
          New Project
        </Button>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-4 lg:w-auto lg:inline-flex">
          <TabsTrigger value="all">All ({getStatusCount('all')})</TabsTrigger>
          <TabsTrigger value="open">Open ({getStatusCount('open')})</TabsTrigger>
          <TabsTrigger value="in_progress">In Progress ({getStatusCount('in_progress')})</TabsTrigger>
          <TabsTrigger value="completed">Completed ({getStatusCount('completed')})</TabsTrigger>
        </TabsList>

        <TabsContent value="all" className="mt-6">
          {filterProjects('all').length > 0 ? (
            filterProjects('all').map(renderProjectCard)
          ) : (
            <EmptyState
              image="/images/empty-projects.png"
              title="No open projects"
              description="There are no open projects available right now. Check back later!"
            />
          )}
        </TabsContent>

        <TabsContent value="open" className="mt-6">
          {filterProjects('open').length > 0 ? (
            filterProjects('open').map(renderProjectCard)
          ) : (
            <EmptyState
              image="/images/empty-projects.png"
              title="No open projects"
              description="There are no open projects available right now. Check back later!"
            />
          )}
        </TabsContent>

        <TabsContent value="in_progress" className="mt-6">
          {filterProjects('in_progress').length > 0 ? (
            filterProjects('in_progress').map(renderProjectCard)
          ) : (
            <EmptyState
              image="/images/empty-projects.png"
              title="No active projects"
              description="Projects in progress will appear here"
            />
          )}
        </TabsContent>

        <TabsContent value="completed" className="mt-6">
          {filterProjects('completed').length > 0 ? (
            filterProjects('completed').map(renderProjectCard)
          ) : (
            <EmptyState
              image="/images/empty-projects.png"
              title="No completed projects"
              description="Your completed projects will appear here"
            />
          )}
        </TabsContent>
      </Tabs>

      {/* Create Project Modal */}
      <CreateProjectModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onSuccess={() => {
          fetchProjects();
          setIsCreateModalOpen(false);
        }}
      />
    </div>
  );
}

// Create Project Modal Component
interface CreateProjectModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

function CreateProjectModal({ isOpen, onClose, onSuccess }: CreateProjectModalProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    category: '',
    budgetMin: '',
    budgetMax: '',
    timeline: '1-week',
    skillsRequired: '',
    deliverables: ''
  });

  const categories = [
    'Photography', 'Videography', 'Graphic Design', 'Web Development',
    'Writing', 'Marketing', 'Music', 'Art', 'Other'
  ];

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
    
    if (!formData.title || !formData.description || !formData.category) {
      toast.error('Please fill in all required fields');
      return;
    }

    const min = parseFloat(formData.budgetMin);
    const max = parseFloat(formData.budgetMax);
    
    if (isNaN(min) || isNaN(max) || min <= 0 || max <= 0) {
      toast.error('Please enter valid budget amounts');
      return;
    }

    if (min > max) {
      toast.error('Minimum budget cannot be greater than maximum');
      return;
    }

    try {
      setIsSubmitting(true);
      
      await api.post('/projects', {
        title: formData.title,
        description: formData.description,
        category: formData.category,
        budget: {
          min: min,
          max: max
        },
        timeline: formData.timeline,
        skillsRequired: formData.skillsRequired.split(',').map(s => s.trim()).filter(Boolean),
        deliverables: formData.deliverables.split('\n').map(s => s.trim()).filter(Boolean)
      });
      
      toast.success('Project created successfully!');
      onSuccess();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to create project');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create New Project</DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4 mt-4">
          <div>
            <label className="block text-sm font-medium mb-1">Project Title *</label>
            <input
              type="text"
              className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-[#8A2BE2] focus:border-transparent"
              placeholder="e.g., Wedding Photography in Lagos"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Description *</label>
            <textarea
              className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-[#8A2BE2] focus:border-transparent"
              rows={4}
              placeholder="Describe your project in detail..."
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Category *</label>
            <select
              className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-[#8A2BE2] focus:border-transparent"
              value={formData.category}
              onChange={(e) => setFormData({ ...formData, category: e.target.value })}
              required
            >
              <option value="">Select a category</option>
              {categories.map(cat => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Budget Min ($) *</label>
              <input
                type="number"
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-[#8A2BE2] focus:border-transparent"
                placeholder="100"
                value={formData.budgetMin}
                onChange={(e) => setFormData({ ...formData, budgetMin: e.target.value })}
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Budget Max ($) *</label>
              <input
                type="number"
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-[#8A2BE2] focus:border-transparent"
                placeholder="500"
                value={formData.budgetMax}
                onChange={(e) => setFormData({ ...formData, budgetMax: e.target.value })}
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Timeline *</label>
            <select
              className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-[#8A2BE2] focus:border-transparent"
              value={formData.timeline}
              onChange={(e) => setFormData({ ...formData, timeline: e.target.value })}
              required
            >
              {timelines.map(tl => (
                <option key={tl.value} value={tl.value}>{tl.label}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Skills Required (comma separated)</label>
            <input
              type="text"
              className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-[#8A2BE2] focus:border-transparent"
              placeholder="e.g., Photography, Editing, Lightroom"
              value={formData.skillsRequired}
              onChange={(e) => setFormData({ ...formData, skillsRequired: e.target.value })}
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Expected Deliverables (one per line)</label>
            <textarea
              className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-[#8A2BE2] focus:border-transparent"
              rows={3}
              placeholder="e.g.,&#10;50 edited photos&#10;Online gallery&#10;Raw files"
              value={formData.deliverables}
              onChange={(e) => setFormData({ ...formData, deliverables: e.target.value })}
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
                  Creating...
                </>
              ) : (
                'Create Project'
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
