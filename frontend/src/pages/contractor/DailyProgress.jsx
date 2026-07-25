import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { Send, ClipboardCheck } from 'lucide-react';
import toast from 'react-hot-toast';
import { projectsAPI, contractorAPI } from '../../services/api';
import { formatDate } from '../../utils/helpers';
import PageHeader from '../../components/PageHeader';

export default function DailyProgress() {
  const [selectedProject, setSelectedProject] = useState('');
  const queryClient = useQueryClient();

  const { data: projects, isLoading: loadingProjects } = useQuery({
    queryKey: ['contractor-projects'],
    queryFn: () => contractorAPI.getProjects(),
  });

  const projectList = projects?.projects || (Array.isArray(projects) ? projects : []);

  useEffect(() => {
    if (!selectedProject && projectList.length) {
      setSelectedProject(String(projectList[0].id));
    }
  }, [projectList, selectedProject]);

  const { data: logs, isLoading: loadingLogs } = useQuery({
    queryKey: ['daily-logs', selectedProject],
    queryFn: () => projectsAPI.getDailyLogs(selectedProject),
    enabled: !!selectedProject,
  });

  const { register, handleSubmit, reset, setValue } = useForm({
    defaultValues: {
      logDate: new Date().toISOString().split('T')[0],
      weather: '',
      workersOnSite: 0,
      workSummary: '',
      issuesEncountered: '',
      progressPercentage: '',
      attachmentNote: '',
    },
  });

  const mutation = useMutation({
    mutationFn: async (data) => {
      await projectsAPI.submitDailyLog(selectedProject, data);
      if (data.progressPercentage != null && data.progressPercentage !== '') {
        await projectsAPI.submitProgress(selectedProject, {
          projectId: selectedProject,
          progressPercentage: Number(data.progressPercentage),
          description: data.workSummary,
          workersCount: Number(data.workersOnSite) || 0,
          weatherConditions: data.weather,
        });
      }
    },
    onSuccess: () => {
      toast.success('Daily log submitted');
      reset({
        logDate: new Date().toISOString().split('T')[0],
        weather: '',
        workersOnSite: 0,
        workSummary: '',
        issuesEncountered: '',
      });
      queryClient.invalidateQueries({ queryKey: ['daily-logs', selectedProject] });
      queryClient.invalidateQueries({ queryKey: ['contractor-dashboard'] });
    },
    onError: () => toast.error('Failed to submit log'),
  });

  const logList = logs?.dailyLogs || logs?.logs || (Array.isArray(logs) ? logs : []);

  return (
    <div className="space-y-6">
      <PageHeader title="Daily Progress" subtitle="Submit daily work logs for your assigned projects" />

      <div className="card max-w-md">
        <label className="label">Project</label>
        <select
          value={selectedProject}
          onChange={(e) => setSelectedProject(e.target.value)}
          className="input"
          disabled={loadingProjects}
        >
          <option value="">Select project...</option>
          {projectList.map((p) => (
            <option key={p.id} value={p.id}>{p.name}</option>
          ))}
        </select>
      </div>

      {selectedProject && (
        <form
          onSubmit={handleSubmit((d) => mutation.mutate({
            ...d,
            workersOnSite: Number(d.workersOnSite),
            workSummary: d.attachmentNote
              ? `${d.workSummary}\n\n[Attachment: ${d.attachmentNote}]`
              : d.workSummary,
          }))}
          className="card max-w-2xl space-y-4"
        >
          <h3 className="font-semibold text-steel flex items-center gap-2">
            <ClipboardCheck className="h-4 w-4 text-primary" /> Submit Daily Log
          </h3>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="label">Date</label>
              <input {...register('logDate')} type="date" className="input" />
            </div>
            <div>
              <label className="label">Weather</label>
              <input {...register('weather')} className="input" placeholder="Partly Cloudy, 72°F" />
            </div>
            <div>
              <label className="label">Workers on Site</label>
              <input {...register('workersOnSite')} type="number" className="input" min={0} />
            </div>
            <div>
              <label className="label">Overall progress (%)</label>
              <input {...register('progressPercentage')} type="number" min={0} max={100} className="input" placeholder="Updates PM dashboard" />
            </div>
          </div>
          <div>
            <label className="label">Attach document (PDF/image filename)</label>
            <input
              type="file"
              accept=".pdf,image/*"
              className="input text-sm"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) setValue('attachmentNote', f.name);
              }}
            />
          </div>
          <div>
            <label className="label">Work Summary</label>
            <textarea {...register('workSummary', { required: true })} rows={4} className="input resize-none" placeholder="Describe work completed today..." />
          </div>
          <div>
            <label className="label">Issues Encountered</label>
            <textarea {...register('issuesEncountered')} rows={2} className="input resize-none" />
          </div>
          <button type="submit" disabled={mutation.isPending} className="btn-primary">
            <Send className="h-4 w-4" /> {mutation.isPending ? 'Submitting...' : 'Submit Log'}
          </button>
        </form>
      )}

      <div className="card">
        <h3 className="font-semibold text-steel mb-4">Previous Logs</h3>
        {loadingLogs ? (
          <div className="h-24 animate-pulse bg-steel-50 rounded-xl" />
        ) : logList.length ? (
          <div className="space-y-3">
            {logList.map((log) => (
              <div key={log.id} className="rounded-xl border border-steel-100 p-4">
                <div className="flex justify-between">
                  <p className="font-medium text-steel">{formatDate(log.logDate || log.log_date)}</p>
                  <span className="text-xs text-concrete">{log.weather || '—'}</span>
                </div>
                <p className="text-sm text-concrete mt-2">{log.workSummary || log.work_summary}</p>
                {(log.workers_on_site ?? log.workersOnSite) != null && (
                  <p className="text-xs text-concrete mt-1">{log.workers_on_site ?? log.workersOnSite} workers on site</p>
                )}
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-concrete">No logs submitted yet for this project</p>
        )}
      </div>
    </div>
  );
}
