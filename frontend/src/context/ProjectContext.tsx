/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useState, ReactNode } from 'react';
import { MOCK_PROJECTS, Project } from '../mocks/projectData';

interface ProjectContextType {
  projects: Project[];
  addProject: (project: Omit<Project, 'id' | 'createdAt' | 'productIds'>) => void;
  updateProject: (id: number, updates: Partial<Project>) => void;
  deleteProject: (id: number) => void;
  addProductToProject: (projectId: number, productId: number) => void;
  removeProductFromProject: (projectId: number, productId: number) => void;
}

const ProjectContext = createContext<ProjectContextType | undefined>(undefined);

export function ProjectProvider({ children }: { children: ReactNode }) {
  const [projects, setProjects] = useState(MOCK_PROJECTS);

  const addProject = (project: Omit<Project, 'id' | 'createdAt' | 'productIds'>) => {
    const newProject = {
      ...project,
      id: Math.max(...projects.map(p => p.id)) + 1,
      createdAt: new Date().toISOString().split('T')[0],
      productIds: [],
    };
    setProjects([...projects, newProject]);
  };

  const updateProject = (id: number, updates: Partial<Project>) => {
    setProjects(projects.map(p => (p.id === id ? { ...p, ...updates } : p)));
  };

  const deleteProject = (id: number) => {
    setProjects(projects.filter(p => p.id !== id));
  };

  const addProductToProject = (projectId: number, productId: number) => {
    setProjects(projects.map(p =>
      p.id === projectId
        ? { ...p, productIds: [...p.productIds, productId] }
        : p
    ));
  };

  const removeProductFromProject = (projectId: number, productId: number) => {
    setProjects(
      projects.map((project) => {
        if (project.id === projectId) {
          return {
            ...project,
            productIds: project.productIds.filter((id) => id !== productId),
          };
        }
        return project;
      })
    );
  };

  return (
    <ProjectContext.Provider value={{ projects, addProject, updateProject, deleteProject, addProductToProject, removeProductFromProject }}>
      {children}
    </ProjectContext.Provider>
  );
}

export function useProjects() {
  const context = useContext(ProjectContext);
  if (!context) throw new Error('useProjects must be used within ProjectProvider');
  return context;
}
