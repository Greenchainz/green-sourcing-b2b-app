// frontend/src/components/Projects/ProjectCard.tsx
import React from 'react';
import { Project } from '../../mocks/projectData';

interface ProjectCardProps {
  project: Project;
  onView: () => void;
  onEdit: () => void;
  onDelete: () => void;
}

const ProjectCard: React.FC<ProjectCardProps> = ({ project, onView, onEdit, onDelete }) => {
  const { name, productIds, createdAt } = project;
  const productCount = productIds.length;

  // Dummy status for now, as it's not in the mock data
  const status: 'Active' | 'Completed' | 'Archived' = 'Active';

  const getStatusClasses = () => {
    switch (status) {
      case 'Active':
        return 'bg-green-100 text-green-800';
      case 'Completed':
        return 'bg-gray-200 text-gray-800';
      case 'Archived':
        return 'bg-gray-100 text-gray-500';
    }
  };

  return (
    <div className="bg-white border border-gray-200 rounded-lg shadow-md p-6 flex flex-col justify-between">
      <div>
        <div className="flex justify-between items-start mb-4">
          <h3 className="text-xl font-bold text-gray-900">{name}</h3>
          <span className={`px-2 py-1 text-xs font-semibold rounded-full ${getStatusClasses()}`}>
            {status}
          </span>
        </div>
        <p className="text-sm text-gray-600 mb-2">{productCount} products</p>
        <p className="text-sm text-gray-500">Created: {new Date(createdAt).toLocaleDateString()}</p>
      </div>
      <div className="mt-6 flex justify-end space-x-2">
        <button onClick={onView} className="px-4 py-2 text-sm font-medium text-primary border border-primary rounded-lg hover:bg-primary/5">View</button>
        <button onClick={onEdit} className="px-4 py-2 text-sm font-medium text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50">Edit</button>
        <button onClick={onDelete} className="px-4 py-2 text-sm font-medium text-red-600 border border-red-200 rounded-lg hover:bg-red-50">Delete</button>
      </div>
    </div>
  );
};

export default ProjectCard;
