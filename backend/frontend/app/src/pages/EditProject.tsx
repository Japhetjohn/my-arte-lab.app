import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { api } from '@/contexts/AuthContext';
import { 
  Loader2, 
  ArrowLeft, 
  Save
} from 'lucide-react';
import { toast } from 'sonner';

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
  status: string;
  skillsRequired: string[];
  deliverables: string[];
}

export function EditProject() {
  const [project, setProject] = useState<Project | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
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

  // Get project ID from URL
  const urlMatch = window.location.pathname.match(/\/projects\/(.+)\/edit/);
  const projectId = urlMatch?.[1];

  useEffect(() => {
    if (projectId) {
      fetchProject();
    }
  }, [projectId]);

  const fetchProject = async () => {
    try {
      setIsLoading(true);
      const response = await api.get(`/projects/${projectId}`);
      const projectData = response.data.data?.project;
      setProject(projectData);
      
      // Pre-fill form
      setFormData({
        title: projectData.title || '',
        description: projectData.description || '',
        category: projectData.category || '',
        budgetMin: projectData.budget?.min?.toString() || '',
        budgetMax: projectData.budget?.max?.toString() || '',
        timeline: projectData.timeline || '1-week',
        skillsRequired: projectData.skillsRequired?.join(', ') || '',
        deliverables: projectData.deliverables?.join('\n') || ''
      });
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to fetch project');
    } finally {
      setIsLoading(false);
    }
  };

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
      setIsSaving(true);
      
      await api.patch(`/projects/${projectId}`, {
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
      
      toast.success('Project updated successfully!');
      window.location.href = `/projects/${projectId}`;
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to update project');
    } finally {
      setIsSaving(false);
    }
  };

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

  // Only allow editing if project is open
  if (project.status !== 'open') {
    return (
      <div className="text-center py-20">
        <p className="text-gray-500">This project cannot be edited (status: {project.status})</p>
        <Button 
          className="mt-4 bg-[#8A2BE2] hover:bg-[#7B1FD1] text-white"
          onClick={() => window.location.href = `/projects/${projectId}`}
        >
          View Project
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
          onClick={() => window.location.href = `/projects/${projectId}`}
        >
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <h1 className="text-2xl font-bold text-gray-900">Edit Project</h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Project Details</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-sm font-medium mb-1">Project Title *</label>
              <input
                type="text"
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-[#8A2BE2] focus:border-transparent"
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
                value={formData.skillsRequired}
                onChange={(e) => setFormData({ ...formData, skillsRequired: e.target.value })}
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Expected Deliverables (one per line)</label>
              <textarea
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-[#8A2BE2] focus:border-transparent"
                rows={3}
                value={formData.deliverables}
                onChange={(e) => setFormData({ ...formData, deliverables: e.target.value })}
              />
            </div>

            <div className="flex gap-3 pt-4">
              <Button
                type="button"
                variant="outline"
                className="flex-1"
                onClick={() => window.location.href = `/projects/${projectId}`}
                disabled={isSaving}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                className="flex-1 bg-[#8A2BE2] hover:bg-[#7B1FD1] text-white"
                disabled={isSaving}
              >
                {isSaving ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4 mr-2" />
                    Save Changes
                  </>
                )}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
