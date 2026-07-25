import { useState, useEffect } from 'react';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

import { Calendar, Sparkles, Save, CheckCircle } from 'lucide-react';

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts';

import { projectsAPI, aiAPI } from '../../services/api';

import { useProject } from '../../contexts/ProjectContext';

import { formatDate } from '../../utils/helpers';

import { weeklyProgressFromTasks } from '../../utils/pmScheduleCharts';
import ChartCard from '../../components/ChartCard';
import { StatusBadge } from '../../components/PageHeader';
import ProjectSelector from '../../components/ProjectSelector';

import toast from 'react-hot-toast';



function tasksToGantt(taskList) {

  if (!taskList?.length) return [];

  return taskList.map((t, i) => {

    const startDate = t.start_date || t.startDate;

    const endDate = t.end_date || t.endDate;

    let duration = t.estimated_hours ? Math.ceil(t.estimated_hours / 40) : 3;

    if (startDate && endDate) {

      const days = Math.max(1, Math.ceil((new Date(endDate) - new Date(startDate)) / (86400000 * 7)));

      duration = days;

    }

    return {

      task: t.title || t.name,

      start: i * 2,

      duration,

      status: t.status || 'pending',

      startDate,

      endDate,

      id: t.id,

    };

  });

}



function phasesToGantt(phases) {

  if (!phases?.length) return [];

  let week = 0;

  return phases.flatMap((phase) =>

    (phase.tasks || []).map((task) => {

      const item = {

        task: typeof task === 'string' ? task : task.title || task.name,

        start: phase.startWeek ?? week,

        duration: phase.durationWeeks || 3,

        status: 'pending',

      };

      week += item.duration;

      return item;

    })

  );

}



export default function Scheduling() {

  const { activeProjectId, activeProject } = useProject();

  const [ganttData, setGanttData] = useState([]);

  const [lastSaved, setLastSaved] = useState(null);

  const queryClient = useQueryClient();



  const { data: tasksData, isLoading, refetch } = useQuery({

    queryKey: ['tasks', activeProjectId],

    queryFn: () => projectsAPI.getTasks(activeProjectId),

    enabled: !!activeProjectId,

  });



  const taskList = tasksData?.tasks || [];



  useEffect(() => {

    if (taskList.length) {

      setGanttData(tasksToGantt(taskList));

    }

  }, [tasksData]);



  const scheduleMutation = useMutation({

    mutationFn: (data) => aiAPI.schedule(data),

    onSuccess: async (data) => {

      const phases = data.schedule?.phases || data.phases;

      if (phases?.length) setGanttData(phasesToGantt(phases));

      await queryClient.invalidateQueries({ queryKey: ['tasks', activeProjectId] });

      const refreshed = await refetch();

      const saved = refreshed.data?.tasks || [];

      if (saved.length) setGanttData(tasksToGantt(saved));

      setLastSaved(new Date());

      toast.success(data.message || `Schedule saved — ${saved.length || phases?.flatMap((p) => p.tasks)?.length || 0} tasks`);

    },

    onError: (err) => toast.error(err.response?.data?.message || 'Failed to generate schedule'),

  });



  const weeklyChart = weeklyProgressFromTasks(taskList, activeProject?.startDate);

  const chartData = ganttData.map((t) => {
    const plannedWeeks = t.duration || 4;
    const completedPct = t.status === 'completed' ? 100 : t.status === 'in_progress' ? 55 : 0;
    return {
      name: t.task?.length > 22 ? `${t.task.slice(0, 20)}…` : t.task,
      plannedWeeks,
      completedPct,
      status: t.status,
    };
  });



  const totalWeeks = Math.max(ganttData.reduce((s, g) => Math.max(s, (g.start || 0) + (g.duration || 0)), 0), 18);



  return (
    <div className="w-full space-y-4">
      <ProjectSelector className="mb-2" required />



      {!activeProjectId ? (

        <div className="card text-center py-12 text-concrete">Select a project to view scheduling</div>

      ) : (

        <>

          <div className="mb-6 flex flex-wrap gap-4 items-center">

            {activeProject?.startDate && (

              <span className="text-sm text-concrete">

                Project timeline: <strong className="text-steel">{formatDate(activeProject.startDate)}</strong> → <strong className="text-steel">{formatDate(activeProject.endDate)}</strong>

              </span>

            )}

            {lastSaved && (

              <span className="inline-flex items-center gap-1 text-xs text-success">

                <CheckCircle className="h-3.5 w-3.5" /> Saved {lastSaved.toLocaleTimeString()}

              </span>

            )}

            <span className="text-sm text-concrete">{taskList.length} tasks in database</span>

            <button

              type="button"

              onClick={() => scheduleMutation.mutate({

                projectId: activeProjectId,

                startDate: activeProject?.startDate,

                endDate: activeProject?.endDate,

                teamSize: 25,

              })}

              disabled={scheduleMutation.isPending || !activeProject?.startDate}

              className="btn-primary ml-auto"

            >

              <Sparkles className="h-4 w-4" />

              {scheduleMutation.isPending ? 'Generating & Saving...' : 'AI Generate & Save Schedule'}

            </button>

          </div>



          <div className="grid gap-6 lg:grid-cols-2 mb-6">
          <ChartCard title="Weekly progress (Sun–Sat)" subtitle="From saved schedule tasks in database">
            {weeklyChart.length ? (
              <BarChart data={weeklyChart}>
                <CartesianGrid strokeDasharray="3 3" stroke="#ECF0F1" />
                <XAxis dataKey="week" tick={{ fontSize: 9 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip />
                <Bar dataKey="completed" fill="#27AE60" name="Completed tasks" radius={[4, 4, 0, 0]} />
                <Bar dataKey="tasks" fill="#E67E22" name="Total tasks" radius={[4, 4, 0, 0]} />
              </BarChart>
            ) : (
              <p className="text-center py-8 text-concrete">{isLoading ? 'Loading tasks...' : 'No tasks yet — click AI Generate & Save Schedule'}</p>
            )}
          </ChartCard>

          <ChartCard title="Task completion %" subtitle="Per task from database">

            {chartData.length ? (

              <BarChart data={chartData} layout="vertical">

                <CartesianGrid strokeDasharray="3 3" stroke="#ECF0F1" />

                <XAxis type="number" tick={{ fontSize: 12 }} />

                <YAxis dataKey="name" type="category" width={160} tick={{ fontSize: 10 }} />

                <Tooltip />

                <Legend />

                <Bar dataKey="plannedWeeks" fill="#94A3B8" name="Planned (weeks)" radius={[0, 4, 4, 0]} />

                <Bar dataKey="completedPct" fill="#E67E22" name="Completed (%)" radius={[0, 4, 4, 0]} />

              </BarChart>

            ) : (

              <p className="text-center py-8 text-concrete">{isLoading ? 'Loading tasks...' : 'No tasks yet — click AI Generate & Save Schedule'}</p>

            )}

          </ChartCard>
          </div>

          <div className="card">
            <h3 className="font-semibold text-steel mb-4">All tasks ({taskList.length})</h3>
            <div className="grid gap-2 md:grid-cols-2 max-h-96 overflow-y-auto">
              {taskList.map((t) => (
                <div key={t.id} className="rounded-lg border border-steel-100 p-3 text-sm">
                  <p className="font-medium text-steel">{t.title}</p>
                  <p className="text-xs text-concrete">{formatDate(t.start_date || t.startDate)} – {formatDate(t.end_date || t.endDate)}</p>
                  <StatusBadge status={t.status} />
                </div>
              ))}
              {!taskList.length && !isLoading && <p className="text-sm text-concrete col-span-2">Generate a schedule to create tasks</p>}
            </div>
          </div>

        </>

      )}

    </div>

  );

}

