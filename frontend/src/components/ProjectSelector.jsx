import { useState, useMemo } from 'react';
import { Search, FolderKanban } from 'lucide-react';
import { useProject } from '../contexts/ProjectContext';

export default function ProjectSelector({ className = '', required = false }) {
  const { projects, activeProjectId, setActiveProjectId, isLoading, isError, projectsError, refetchProjects } = useProject();
  const [search, setSearch] = useState('');

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return projects;
    return projects.filter(
      (p) =>
        p.name?.toLowerCase().includes(q) ||
        p.projectCode?.toLowerCase().includes(q) ||
        p.location?.toLowerCase().includes(q)
    );
  }, [projects, search]);

  const active = projects.find((p) => p.id === activeProjectId);

  return (
    <div className={`card ${className}`}>
      <div className="flex flex-wrap items-end gap-4">
        <div className="flex-1 min-w-[200px]">
          <label className="label flex items-center gap-2">
            <FolderKanban className="h-4 w-4 text-primary" />
            Active Project {required && <span className="text-danger">*</span>}
          </label>
          <select
            className="input"
            value={activeProjectId}
            onChange={(e) => setActiveProjectId(e.target.value)}
            disabled={isLoading}
          >
            <option value="">
              {isLoading ? 'Loading projects...' : isError ? 'Failed to load projects' : projects.length ? 'Choose a project...' : 'No projects — create one first'}
            </option>
            {filtered.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name} ({p.projectCode || p.status})
              </option>
            ))}
          </select>
        </div>
        <div className="flex-1 min-w-[200px]">
          <label className="label">Search projects</label>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-concrete" />
            <input
              type="search"
              className="input pl-10"
              placeholder="Search by name, code, location..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>
      </div>
      {isError && (
        <p className="mt-2 text-xs text-danger">
          Could not load projects. {projectsError?.response?.data?.message || 'Check that you are logged in and the server is running.'}
          {' '}
          <button type="button" className="underline" onClick={() => refetchProjects()}>Retry</button>
        </p>
      )}
    </div>
  );
}
