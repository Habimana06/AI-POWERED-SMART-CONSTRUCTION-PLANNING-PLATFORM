import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { Download, FileSpreadsheet } from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  AreaChart, Area,
} from 'recharts';
import { contractorAPI } from '../../services/api';
import { formatPercent } from '../../utils/helpers';
import { exportContractorReportCsv, exportContractorReportPdf } from '../../utils/contractorReportExport';
import ChartCard from '../../components/ChartCard';
import PageHeader, { ProgressBar } from '../../components/PageHeader';
import DashboardPage from '../../components/DashboardPage';

export default function ContractorReports() {
  const [selectedId, setSelectedId] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['contractor-reports'],
    queryFn: contractorAPI.getReports,
  });

  const projects = data?.projects || [];
  const active = projects.find((p) => p.projectId === selectedId) || projects[0];
  const scheduleChart = active?.scheduleChart || [];
  const materialChart = active?.materialChart || [];

  useEffect(() => {
    if (!selectedId && projects[0]?.projectId) setSelectedId(projects[0].projectId);
  }, [projects, selectedId]);

  return (
    <DashboardPage className="space-y-6">
      <PageHeader
        title="My Reports"
        subtitle="Schedule vs material use — export your assignment data"
        action={
          projects.length > 0 && (
            <div className="flex flex-wrap gap-2">
              <button type="button" className="btn-outline inline-flex items-center gap-2" onClick={() => exportContractorReportPdf(projects)}>
                <Download className="h-4 w-4" /> PDF
              </button>
              <button type="button" className="btn-primary inline-flex items-center gap-2" onClick={() => exportContractorReportCsv(projects)}>
                <FileSpreadsheet className="h-4 w-4" /> CSV
              </button>
            </div>
          )
        }
      />

      {isLoading ? (
        <div className="card h-40 animate-pulse bg-steel-50" />
      ) : !projects.length ? (
        <div className="card text-center py-16 text-concrete">No assigned projects to report on.</div>
      ) : (
        <>
          <div className="card max-w-md">
            <label className="label">Project</label>
            <select className="input" value={active?.projectId || ''} onChange={(e) => setSelectedId(e.target.value)}>
              {projects.map((p) => (
                <option key={p.projectId} value={p.projectId}>{p.projectName}</option>
              ))}
            </select>
          </div>

          <div className="grid gap-6 lg:grid-cols-2 min-w-0">
            <ChartCard title="Schedule progress" subtitle="Target vs actual per task">
              {scheduleChart.length ? (
                <div className="h-56 min-w-0">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={scheduleChart}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#ECF0F1" />
                      <XAxis dataKey="label" tick={{ fontSize: 10 }} />
                      <YAxis domain={[0, 100]} tick={{ fontSize: 10 }} />
                      <Tooltip />
                      <Area type="monotone" dataKey="planned" stroke="#7F8C8D" fill="#7F8C8D" fillOpacity={0.08} name="Target %" />
                      <Area type="monotone" dataKey="actual" stroke="#E67E22" fill="#E67E22" fillOpacity={0.2} name="Actual %" />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <p className="text-sm text-concrete py-8 text-center">No schedule tasks yet</p>
              )}
            </ChartCard>

            <ChartCard title="Material use on site" subtitle="From completed task logs (read-only)">
              {materialChart.length ? (
                <div className="h-56 min-w-0">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={materialChart}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#ECF0F1" />
                      <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                      <YAxis tick={{ fontSize: 10 }} />
                      <Tooltip />
                      <Bar dataKey="used" fill="#E67E22" name="Qty used" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <p className="text-sm text-concrete py-8 text-center">Complete tasks with materials to populate chart</p>
              )}
            </ChartCard>
          </div>

          <div className="grid gap-4 lg:grid-cols-2 min-w-0">
            {projects.map((p) => (
              <div key={p.projectId} className="card space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <h3 className="font-semibold text-steel">{p.projectName}</h3>
                    <Link to={`/contractor/projects/${p.projectId}`} className="text-xs text-primary hover:underline">Project details</Link>
                  </div>
                  <span className="text-lg font-bold text-primary">{formatPercent(p.progressPercentage)}</span>
                </div>
                <ProgressBar value={p.progressPercentage} />
                <div className="grid grid-cols-3 gap-2 text-xs">
                  <div className="rounded-lg bg-steel-50 p-2">
                    <p className="text-concrete">Tasks</p>
                    {(p.taskStats || []).map((s) => <p key={s.status}>{s.status}: {s.c}</p>)}
                  </div>
                  <div className="rounded-lg bg-steel-50 p-2">
                    <p className="text-concrete">Materials</p>
                    {(p.materialTotals || []).map((m) => <p key={m.status}>{m.status}</p>)}
                  </div>
                  <div className="rounded-lg bg-steel-50 p-2">
                    <p className="text-concrete">Logs</p>
                    <p>{p.workLogCount}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </DashboardPage>
  );
}
