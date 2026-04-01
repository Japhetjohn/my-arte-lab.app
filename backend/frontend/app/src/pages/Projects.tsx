import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { EmptyState } from '@/components/shared/EmptyState';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { projects as mockProjects } from '@/lib/data/mockData';
import { Plus, Calendar, DollarSign, Users, MoreVertical } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import type { Project } from '@/types';

export function Projects() {
  const [projects] = useState<Project[]>(mockProjects);

  const filterProjects = (status: string) => {
    if (status === 'all') return projects;
    return projects.filter(p => p.status === status);
  };

  const renderProjectCard = (project: Project) => (
    <Card key={project.id} className="mb-4 hover:shadow-md transition-shadow">
      <CardContent className="p-5">
        <div className="flex items-start justify-between mb-3">
          <div>
            <h3 className="font-semibold text-gray-900">{project.title}</h3>
            <p className="text-sm text-gray-500 mt-1 line-clamp-2">{project.description}</p>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon">
                <MoreVertical className="w-4 h-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem>View Details</DropdownMenuItem>
              <DropdownMenuItem>Edit Project</DropdownMenuItem>
              <DropdownMenuItem className="text-red-600">Delete</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <div className="flex flex-wrap gap-2 mb-4">
          <Badge variant="secondary" className="capitalize">
            {project.category}
          </Badge>
          <StatusBadge status={project.status} />
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
              {project.proposals.length} proposals
            </div>
          </div>
          <Button 
            size="sm" 
            className="bg-[#8A2BE2] hover:bg-[#7B1FD1] text-white"
            asChild
          >
            <a href={`/projects/${project.id}`}>
              View Details
            </a>
          </Button>
        </div>
      </CardContent>
    </Card>
  );

  return (
    <div className="space-y-6 pb-20 lg:pb-8">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">My Projects</h1>
        <Button 
          className="bg-[#8A2BE2] hover:bg-[#7B1FD1] text-white"
          onClick={() => window.location.href = '/projects/new'}
        >
          <Plus className="w-4 h-4 mr-2" />
          New Project
        </Button>
      </div>

      <Tabs defaultValue="all" className="w-full">
        <TabsList className="grid w-full grid-cols-3 lg:w-auto lg:inline-flex">
          <TabsTrigger value="all">All</TabsTrigger>
          <TabsTrigger value="open">Open</TabsTrigger>
          <TabsTrigger value="completed">Completed</TabsTrigger>
        </TabsList>

        <TabsContent value="all" className="mt-6">
          {filterProjects('all').length > 0 ? (
            filterProjects('all').map(renderProjectCard)
          ) : (
            <EmptyState
              image="/images/empty-projects.png"
              title="No projects yet"
              description="Create your first project to find talented creators"
              actionLabel="Create Project"
              onAction={() => window.location.href = '/projects/new'}
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
              description="Your open projects will appear here"
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
    </div>
  );
}
