// frontend/src/pages/BuyerDashboard/Projects.tsx
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useProjects } from '../../context/ProjectContext';
import ProjectCard from '../../components/Projects/ProjectCard';
import CreateProjectModal from '../../components/Projects/CreateProjectModal';

const Projects: React.FC = () => {
  const { projects, deleteProject } = useProjects();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const navigate = useNavigate();

  const handleViewProject = (id: number) => {
    navigate(`/dashboard/buyer/projects/${id}`);
  };

  const handleEditProject = (id: number) => {
    // For MVP, editing might just be inline on the detail page
    // Or open a similar modal to CreateProjectModal pre-filled with data
    console.log('Editing project:', id);
    alert('Edit functionality coming soon!');
  };

  const handleDeleteProject = (id: number) => {
    if (window.confirm('Are you sure you want to delete this project?')) {
      deleteProject(id);
    }
  };

  return (
    <div className="p-8">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold">My Projects</h1>
        <button
          onClick={() => setIsModalOpen(true)}
          className="px-6 py-3 bg-primary text-white font-semibold rounded-lg hover:bg-primary-dark"
        >
          Create New Project
        </button>
      </div>

      {projects.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {projects.map((project) => (
            <ProjectCard
              key={project.id}
              project={project}
              onView={() => handleViewProject(project.id)}
              onEdit={() => handleEditProject(project.id)}
              onDelete={() => handleDeleteProject(project.id)}
            />
          ))}
        </div>
      ) : (
        <div className="text-center py-16 border-2 border-dashed border-gray-300 rounded-lg">
          <h2 className="text-xl font-medium text-gray-700">No projects yet.</h2>
          <p className="text-gray-500 mt-2">Get started by creating a new project.</p>
        </div>
      )}

      {isModalOpen && <CreateProjectModal onClose={() => setIsModalOpen(false)} />}
    </div>
  );
};

export default Projects;
