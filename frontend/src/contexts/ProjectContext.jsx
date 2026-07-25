import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { projectsAPI } from '../services/api';

const STORAGE_KEY = 'buildplan_active_project';

const ProjectContext = createContext(null);

export function ProjectProvider({ children }) {
  const [activeProjectId, setActiveProjectIdState] = useState(() => localStorage.getItem(STORAGE_KEY) || '');

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['projects'],
    queryFn: () => projectsAPI.getAll({ limit: 100 }),
    retry: 2,
  });

  const projects = data?.projects || [];

  const setActiveProjectId = useCallback((id) => {
    setActiveProjectIdState(id || '');
    if (id) localStorage.setItem(STORAGE_KEY, id);
    else localStorage.removeItem(STORAGE_KEY);
  }, []);

  useEffect(() => {
    if (!activeProjectId && projects.length > 0) {
      setActiveProjectId(projects[0].id);
    }
  }, [projects, activeProjectId, setActiveProjectId]);

  const activeProject = projects.find((p) => p.id === activeProjectId) || null;

  const { data: projectDetail } = useQuery({
    queryKey: ['project', activeProjectId],
    queryFn: () => projectsAPI.getById(activeProjectId),
    enabled: !!activeProjectId,
  });

  const value = {
    projects,
    activeProjectId,
    activeProject: projectDetail?.project || activeProject,
    projectDetail,
    setActiveProjectId,
    isLoading,
    isError,
    projectsError: error,
    refetchProjects: refetch,
  };

  return <ProjectContext.Provider value={value}>{children}</ProjectContext.Provider>;
}

export function useProject() {
  const ctx = useContext(ProjectContext);
  if (!ctx) throw new Error('useProject must be used within ProjectProvider');
  return ctx;
}

export function useProjectOptional() {
  return useContext(ProjectContext);
}
