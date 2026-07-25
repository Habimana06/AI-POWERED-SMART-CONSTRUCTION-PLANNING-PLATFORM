import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { CheckCircle2, Upload, Lock, Calendar, AlertTriangle } from 'lucide-react';
import toast from 'react-hot-toast';
import { contractorAPI } from '../../services/api';
import { formatDate } from '../../utils/helpers';
import PageHeader, { StatusBadge } from '../../components/PageHeader';
import TaskWeekCalendar, { getSunSatWeek, taskActiveOnDate } from '../../components/TaskWeekCalendar';
import DashboardPage from '../../components/DashboardPage';

export default function ContractorTasks() {
  const queryClient = useQueryClient();
  const [activeId, setActiveId] = useState(null);
  const [selectedDate, setSelectedDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [form, setForm] = useState({
    workCompleted: '',
    hoursWorked: '',
    workersCount: '',
    weatherConditions: '',
    documentName: '',
    materialQty: '',
    materialName: '',
  });

  const weekDays = useMemo(() => getSunSatWeek(new Date(selectedDate)), [selectedDate]);

  const { data, isLoading } = useQuery({
    queryKey: ['contractor-tasks'],
    queryFn: contractorAPI.getTasks,
  });

  const tasks = data?.tasks || [];
  const overdue = data?.overdue || tasks.filter((t) => t.isOverdue);
  const selected = tasks.find((t) => t.id === activeId);

  const tasksForDay = useMemo(
    () => tasks.filter((t) => taskActiveOnDate(t, selectedDate)),
    [tasks, selectedDate],
  );

  const dailyMutation = useMutation({
    mutationFn: (payload) => contractorAPI.submitDailyTask(payload.taskId, payload.body),
    onSuccess: () => {
      toast.success('Daily update saved — PM sees this in monitoring');
      setForm({ workCompleted: '', hoursWorked: '', workersCount: '', weatherConditions: '', documentName: '', materialQty: '', materialName: '' });
      queryClient.invalidateQueries({ queryKey: ['contractor-tasks'] });
      queryClient.invalidateQueries({ queryKey: ['contractor-dashboard'] });
    },
    onError: (err) => toast.error(err.response?.data?.message || 'Could not save daily update'),
  });

  const completeMutation = useMutation({
    mutationFn: (payload) => contractorAPI.completeTask(payload.taskId, payload.body),
    onSuccess: () => {
      toast.success('Task completed');
      setActiveId(null);
      setForm({ workCompleted: '', hoursWorked: '', workersCount: '', weatherConditions: '', documentName: '', materialQty: '', materialName: '' });
      queryClient.invalidateQueries({ queryKey: ['contractor-tasks'] });
      queryClient.invalidateQueries({ queryKey: ['contractor-dashboard'] });
    },
    onError: (err) => toast.error(err.response?.data?.message || 'Could not complete task'),
  });

  const buildBody = () => {
    const materialsUsed = form.materialName && form.materialQty
      ? [{ name: form.materialName, quantity: Number(form.materialQty) || 0 }]
      : [];
    return {
      workCompleted: form.workCompleted,
      hoursWorked: form.hoursWorked ? Number(form.hoursWorked) : undefined,
      workersCount: form.workersCount ? Number(form.workersCount) : undefined,
      weatherConditions: form.weatherConditions || undefined,
      documentName: form.documentName || undefined,
      materialsUsed,
      logDate: selectedDate,
    };
  };

  const submitDaily = () => {
    if (!selected) return;
    dailyMutation.mutate({ taskId: selected.id, body: buildBody() });
  };

  const submitComplete = () => {
    if (!selected) return;
    completeMutation.mutate({ taskId: selected.id, body: buildBody() });
  };

  const dateSubmitted = selected?.dailyLogDates?.includes(selectedDate);

  return (
    <DashboardPage className="space-y-6">
      <PageHeader
        title="My Tasks"
        subtitle="Sun–Sat calendar — submit daily completion for each working day; mark full complete when finished."
      />

      <TaskWeekCalendar
        weekDays={weekDays}
        selectedDate={selectedDate}
        onSelectDate={setSelectedDate}
        taskDailyDates={selected?.dailyLogDates || []}
      />

      {isLoading ? (
        <div className="card h-32 animate-pulse bg-steel-50" />
      ) : !tasks.length ? (
        <div className="card text-center py-16 text-concrete">No open tasks — your PM will add schedule tasks when planning starts.</div>
      ) : (
        <>
          {overdue.length > 0 && (
            <div className="card border-danger/30 bg-red-50/50">
              <h3 className="font-semibold text-danger flex items-center gap-2 mb-3">
                <AlertTriangle className="h-4 w-4" /> Overdue — flagged for PM
              </h3>
              <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                {overdue.map((task) => (
                  <button
                    key={task.id}
                    type="button"
                    onClick={() => setActiveId(task.id)}
                    className="text-left rounded-lg border border-danger/20 bg-white p-3 hover:border-danger/40"
                  >
                    <p className="text-sm font-semibold text-steel">{task.title}</p>
                    <p className="text-xs text-concrete">{task.projectName} · due {formatDate(task.endDate)}</p>
                  </button>
                ))}
              </div>
            </div>
          )}

          <p className="text-sm text-concrete">
            Tasks for <strong className="text-steel">{formatDate(selectedDate)}</strong>
            {' '}({tasksForDay.length} active)
          </p>

          <div className="grid gap-6 lg:grid-cols-2 min-w-0">
            <div className="grid gap-3 sm:grid-cols-2 content-start min-w-0">
              {(tasksForDay.length ? tasksForDay : tasks).map((task) => (
                <button
                  key={task.id}
                  type="button"
                  onClick={() => setActiveId(task.id)}
                  className={`card w-full text-left transition-all ${activeId === task.id ? 'border-primary ring-1 ring-primary/20' : 'hover:border-primary/30'}`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-semibold text-steel">{task.title}</p>
                      <p className="text-xs text-concrete mt-1">{task.projectName}</p>
                      <p className="text-xs text-concrete flex items-center gap-1 mt-2">
                        <Calendar className="h-3 w-3" />
                        {task.startDate ? formatDate(task.startDate) : 'TBD'} → {task.endDate ? formatDate(task.endDate) : 'TBD'}
                      </p>
                    </div>
                    <StatusBadge status={task.priority || 'medium'} />
                  </div>
                  {task.dailyLogDates?.length > 0 && (
                    <p className="text-[10px] text-success mt-2">{task.dailyLogDates.length} day(s) logged this week</p>
                  )}
                </button>
              ))}
            </div>

            <div className="card lg:sticky lg:top-4 h-fit">
              {!selected ? (
                <p className="text-sm text-concrete py-12 text-center">Select a task to log daily work or complete</p>
              ) : dateSubmitted ? (
                <div className="py-8 text-center space-y-2">
                  <CheckCircle2 className="h-10 w-10 text-success mx-auto" />
                  <p className="font-semibold text-steel">Daily update submitted</p>
                  <p className="text-sm text-concrete">You already logged {formatDate(selectedDate)} for this task.</p>
                </div>
              ) : !taskActiveOnDate(selected, selectedDate) ? (
                <p className="text-sm text-amber-800 bg-amber-50 rounded-xl p-4">
                  This task is not scheduled for {formatDate(selectedDate)}. Pick another day on the calendar.
                </p>
              ) : selectedDate > new Date().toISOString().slice(0, 10) ? (
                <p className="text-sm text-concrete py-8 text-center">Cannot log future dates.</p>
              ) : (
                <div className="space-y-4">
                  <h3 className="font-semibold text-steel">{selected.title}</h3>
                  <p className="text-xs text-concrete">Daily log for {formatDate(selectedDate)}</p>
                  <div>
                    <label className="label">Work completed *</label>
                    <textarea
                      className="input resize-none min-h-[100px]"
                      value={form.workCompleted}
                      onChange={(e) => setForm({ ...form, workCompleted: e.target.value })}
                      placeholder="Describe what was done on site today..."
                    />
                  </div>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div>
                      <label className="label">Hours</label>
                      <input type="number" min={0} step={0.5} className="input" value={form.hoursWorked} onChange={(e) => setForm({ ...form, hoursWorked: e.target.value })} />
                    </div>
                    <div>
                      <label className="label">Workers</label>
                      <input type="number" min={0} className="input" value={form.workersCount} onChange={(e) => setForm({ ...form, workersCount: e.target.value })} />
                    </div>
                  </div>
                  <div>
                    <label className="label">Weather</label>
                    <input className="input" value={form.weatherConditions} onChange={(e) => setForm({ ...form, weatherConditions: e.target.value })} placeholder="Clear, 24°C" />
                  </div>
                  <button
                    type="button"
                    disabled={dailyMutation.isPending}
                    onClick={submitDaily}
                    className="btn-primary w-full"
                  >
                    {dailyMutation.isPending ? 'Saving…' : 'Submit daily completion'}
                  </button>
                  {selected.canComplete && selectedDate === new Date().toISOString().slice(0, 10) && (
                    <button
                      type="button"
                      disabled={completeMutation.isPending}
                      onClick={submitComplete}
                      className="btn-outline w-full"
                    >
                      Mark entire task complete
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </DashboardPage>
  );
}
