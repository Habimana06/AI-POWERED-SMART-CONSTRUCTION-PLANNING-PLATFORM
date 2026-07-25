import { Link } from 'react-router-dom';

import { useQuery } from '@tanstack/react-query';

import {

  FolderKanban, ClipboardCheck, Package, AlertCircle, ArrowRight, Calendar, BarChart3,

  MessageSquare, FileText, Layers,

} from 'lucide-react';

import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

import { contractorAPI } from '../../services/api';

import { formatDate, formatNumber, formatCurrency } from '../../utils/helpers';

import StatCard from '../../components/StatCard';

import PageHeader, { StatusBadge, ProgressBar } from '../../components/PageHeader';
import DashboardPage from '../../components/DashboardPage';



const FEATURES = [

  { title: 'Complete scheduled tasks', desc: 'Daily completions drive project progress for your PM.', path: '/contractor/tasks', icon: ClipboardCheck },

  { title: 'Work & materials report', desc: 'Track usage, remaining stock, and approved spend.', path: '/contractor/work-materials', icon: Package },

  { title: 'Project documents', desc: 'Floor plans, cost materials, and full-house exports.', path: '/contractor/projects', icon: Layers },

  { title: 'Team messages', desc: 'Message your project manager directly.', path: '/contractor/messages', icon: MessageSquare },

];



export default function ContractorDashboard() {

  const { data, isLoading } = useQuery({

    queryKey: ['contractor-dashboard'],

    queryFn: contractorAPI.getDashboard,

  });



  const stats = data?.stats || {};

  const todayTasks = data?.todayTasks || [];

  const deadlines = data?.deadlines || [];

  const projects = data?.assignedProjects || data?.projects || [];

  const scheduleChart = data?.scheduleChart || [];



  if (isLoading) {

    return <PageHeader title="Contractor Dashboard" subtitle="Loading your assignments..." />;

  }



  return (

    <DashboardPage className="space-y-8">

      <PageHeader title="Contractor Dashboard" subtitle="Assignments, schedule progress, and site workflows" />



      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">

        <StatCard title="Assigned Projects" value={formatNumber(stats.assignedProjects ?? 0)} icon={FolderKanban} />

        <StatCard title="Active Tasks" value={formatNumber(stats.tasksToday ?? todayTasks.length ?? 0)} icon={ClipboardCheck} />

        <StatCard title="Pending Materials" value={formatNumber(stats.pendingMaterials ?? 0)} icon={Package} />

        <StatCard title="Approved materials" value={formatCurrency(stats.approvedMaterialTotal ?? 0)} icon={BarChart3} />

      </div>



      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">

        {FEATURES.map(({ title, desc, path, icon: Icon }) => (

          <Link key={path} to={path} className="card hover:border-primary/35 transition-all min-h-[130px] flex flex-col gap-2">

            <Icon className="h-6 w-6 text-primary" />

            <p className="font-semibold text-steel text-sm">{title}</p>

            <p className="text-xs text-concrete leading-relaxed">{desc}</p>

          </Link>

        ))}

      </div>



      <div className="card">

        <h3 className="font-semibold text-steel mb-4 flex items-center gap-2">

          <BarChart3 className="h-4 w-4 text-primary" /> Schedule progress (assigned tasks)

        </h3>

        {scheduleChart.length ? (

          <div className="h-64 min-w-0">

            <ResponsiveContainer width="100%" height="100%">

              <AreaChart data={scheduleChart}>

                <CartesianGrid strokeDasharray="3 3" stroke="#ECF0F1" />

                <XAxis dataKey="label" tick={{ fontSize: 11 }} />

                <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} />

                <Tooltip />

                <Area type="monotone" dataKey="planned" stroke="#7F8C8D" fill="#7F8C8D" fillOpacity={0.08} name="Target %" />

                <Area type="monotone" dataKey="actual" stroke="#E67E22" fill="#E67E22" fillOpacity={0.2} name="Actual %" />

              </AreaChart>

            </ResponsiveContainer>

          </div>

        ) : (

          <p className="text-sm text-concrete py-8 text-center">Schedule tasks will appear when your PM generates a schedule.</p>

        )}

      </div>



      <div className="grid gap-6 lg:grid-cols-2">

        <div className="card">

          <h3 className="font-semibold text-steel mb-4 flex items-center gap-2">

            <ClipboardCheck className="h-4 w-4 text-primary" /> Upcoming tasks

          </h3>

          {todayTasks.length ? (

            <div className="space-y-3">

              {todayTasks.map((task) => (

                <Link key={task.id} to="/contractor/tasks" className="flex items-center justify-between rounded-xl border border-steel-100 p-3 hover:border-primary/30">

                  <div>

                    <p className="text-sm font-medium text-steel">{task.title}</p>

                    <p className="text-xs text-concrete">{task.project}</p>

                  </div>

                  <StatusBadge status={task.priority || 'medium'} />

                </Link>

              ))}

            </div>

          ) : (

            <p className="text-sm text-concrete">No tasks due — check My Tasks</p>

          )}

        </div>



        <div className="card">

          <h3 className="font-semibold text-steel mb-4 flex items-center gap-2">

            <Calendar className="h-4 w-4 text-primary" /> Deadlines

          </h3>

          {deadlines.length ? (

            <div className="space-y-3">

              {deadlines.map((d) => (

                <div key={d.id} className="flex items-center justify-between rounded-xl border border-steel-100 p-3">

                  <div>

                    <p className="text-sm font-medium text-steel">{d.title}</p>

                    <p className="text-xs text-concrete">{d.project}</p>

                  </div>

                  <span className="text-sm font-medium text-primary">{formatDate(d.date)}</span>

                </div>

              ))}

            </div>

          ) : (

            <p className="text-sm text-concrete">No upcoming deadlines</p>

          )}

        </div>

      </div>



      <div className="card">

        <div className="flex items-center justify-between mb-4">

          <h3 className="font-semibold text-steel">Assigned projects</h3>

          <Link to="/contractor/projects" className="text-sm text-primary hover:underline">View all details</Link>

        </div>

        {projects.length ? (

          <div className="space-y-3">

            {projects.map((p) => (

              <Link

                key={p.id}

                to={`/contractor/projects/${p.id}`}

                className="flex items-center justify-between rounded-xl border border-steel-100 p-4 hover:border-primary/30 transition-colors"

              >

                <div>

                  <p className="font-medium text-steel">{p.name}</p>

                  <StatusBadge status={p.status} />

                </div>

                <div className="flex items-center gap-3">

                  <div className="w-36"><ProgressBar value={p.progressPercentage || 0} /></div>

                  <ArrowRight className="h-4 w-4 text-primary" />

                </div>

              </Link>

            ))}

          </div>

        ) : (

          <p className="text-sm text-concrete">No projects assigned — contact your PM</p>

        )}

      </div>



      <Link to="/contractor/reports" className="card flex items-center gap-3 hover:border-primary/30">

        <FileText className="h-8 w-8 text-primary" />

        <div>

          <p className="font-semibold text-steel">My project reports</p>

          <p className="text-xs text-concrete">Task, material, and issue summaries per assignment</p>

        </div>

      </Link>

    </DashboardPage>

  );

}


