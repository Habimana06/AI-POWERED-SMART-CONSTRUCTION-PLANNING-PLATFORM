import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './contexts/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import LoadingScreen from './components/LoadingScreen';
import { getDashboardPath } from './utils/helpers';

// Layouts
import LandingLayout from './layouts/LandingLayout';
import AuthLayout from './layouts/AuthLayout';
import DashboardLayout from './layouts/DashboardLayout';

// Landing Pages
import Home from './pages/landing/Home';
import About from './pages/landing/About';
import Contact from './pages/landing/Contact';

// Auth Pages
import Login from './pages/auth/Login';
import ForgotPassword from './pages/auth/ForgotPassword';
import ResetPassword from './pages/auth/ResetPassword';
import VerifyEmail from './pages/auth/VerifyEmail';
import Unauthorized from './pages/auth/Unauthorized';
import NotFound from './pages/auth/NotFound';

// Admin Pages
import AdminDashboard from './pages/admin/Dashboard';
import AdminUsers from './pages/admin/Users';
import AdminProjects from './pages/admin/Projects';
import AdminPlatform from './pages/admin/Platform';
import AdminReports from './pages/admin/Reports';
import AdminSettings from './pages/admin/Settings';
import AdminAuditLogs from './pages/admin/AuditLogs';
import AdminTestimonials from './pages/admin/Testimonials';
import AuditUserActivity from './pages/admin/AuditUserActivity';
import AdminAnalytics from './pages/admin/Analytics';
import AdminSystemStatus from './pages/admin/SystemStatus';
import AdminProjectDetail from './pages/admin/ProjectDetail';

// PM Pages
import PMDashboard from './pages/pm/Dashboard';
import CreateProject from './pages/pm/CreateProject';
import AIBuildingGenerator from './pages/pm/AIBuildingGenerator';
import BuildingEditor from './pages/pm/BuildingEditor';
import BlueprintViewer from './pages/pm/BlueprintViewer';
import Scheduling from './pages/pm/Scheduling';
import CostEstimation from './pages/pm/CostEstimation';
import RiskPrediction from './pages/pm/RiskPrediction';
import ProjectMonitoring from './pages/pm/ProjectMonitoring';
import ContractorAssignment from './pages/pm/ContractorAssignment';
import PMReports from './pages/pm/Reports';

// Contractor Pages
import ContractorDashboard from './pages/contractor/Dashboard';
import AssignedProjects from './pages/contractor/AssignedProjects';
import WorkMaterials from './pages/contractor/WorkMaterials';
import ContractorReports from './pages/contractor/Reports';
import MaterialRequests from './pages/contractor/MaterialRequests';
import IssueReporting from './pages/contractor/IssueReporting';
import ContractorProjectDetail from './pages/contractor/ProjectDetail';
import ContractorTasks from './pages/contractor/Tasks';

// Shared Pages
import Profile from './pages/shared/Profile';
import Notifications from './pages/shared/Notifications';
import Messages from './pages/shared/Messages';

function RoleRedirect() {
  const { isAuthenticated, user, loading } = useAuth();
  if (loading) return <LoadingScreen />;
  if (isAuthenticated && user) return <Navigate to={getDashboardPath(user.role)} replace />;
  return <Navigate to="/" replace />;
}

export default function App() {
  return (
    <Routes>
      {/* Landing Routes */}
      <Route element={<LandingLayout />}>
        <Route path="/" element={<Home />} />
        <Route path="/about" element={<About />} />
        <Route path="/contact" element={<Contact />} />
        <Route path="/features" element={<Navigate to="/" replace />} />
        <Route path="/ai-demo" element={<Navigate to="/" replace />} />
        <Route path="/pricing" element={<Navigate to="/" replace />} />
        <Route path="/faq" element={<Navigate to="/" replace />} />
        <Route path="/testimonials" element={<Navigate to="/" replace />} />
      </Route>

      {/* Auth Routes */}
      <Route element={<AuthLayout />}>
        <Route path="/login" element={<Login />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/reset-password" element={<ResetPassword />} />
        <Route path="/verify-email" element={<VerifyEmail />} />
      </Route>

      {/* Admin Routes */}
      <Route
        path="/admin"
        element={
          <ProtectedRoute roles={['admin']}>
            <DashboardLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<Navigate to="dashboard" replace />} />
        <Route path="dashboard" element={<AdminDashboard />} />
        <Route path="users" element={<AdminUsers />} />
        <Route path="projects" element={<AdminProjects />} />
        <Route path="projects/:id" element={<AdminProjectDetail />} />
        <Route path="platform" element={<AdminPlatform />} />
        <Route path="companies" element={<Navigate to="/admin/platform" replace />} />
        <Route path="reports" element={<AdminReports />} />
        <Route path="settings" element={<AdminSettings />} />
        <Route path="audit-logs" element={<AdminAuditLogs />} />
        <Route path="audit-logs/user/:userId" element={<AuditUserActivity />} />
        <Route path="testimonials" element={<AdminTestimonials />} />
        <Route path="analytics" element={<AdminAnalytics />} />
        <Route path="system-status" element={<AdminSystemStatus />} />
        <Route path="messages" element={<Messages basePath="/admin" />} />
        <Route path="notifications" element={<Notifications />} />
        <Route path="profile" element={<Profile />} />
      </Route>

      {/* PM Routes */}
      <Route
        path="/pm"
        element={
          <ProtectedRoute roles={['project_manager']}>
            <DashboardLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<Navigate to="dashboard" replace />} />
        <Route path="dashboard" element={<PMDashboard />} />
        <Route path="create-project" element={<CreateProject />} />
        <Route path="ai-assistant" element={<Navigate to="/pm/ai-building" replace />} />
        <Route path="ai-building" element={<AIBuildingGenerator />} />
        <Route path="building-editor" element={<BuildingEditor />} />
        <Route path="blueprints" element={<BlueprintViewer />} />
        <Route path="scheduling" element={<Scheduling />} />
        <Route path="cost-estimation" element={<CostEstimation />} />
        <Route path="risk-prediction" element={<RiskPrediction />} />
        <Route path="monitoring" element={<ProjectMonitoring />} />
        <Route path="contractors" element={<ContractorAssignment />} />
        <Route path="reports" element={<PMReports />} />
        <Route path="messages" element={<Messages basePath="/pm" />} />
        <Route path="notifications" element={<Notifications />} />
        <Route path="profile" element={<Profile />} />
      </Route>

      {/* Contractor Routes */}
      <Route
        path="/contractor"
        element={
          <ProtectedRoute roles={['contractor']}>
            <DashboardLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<Navigate to="dashboard" replace />} />
        <Route path="dashboard" element={<ContractorDashboard />} />
        <Route path="projects" element={<AssignedProjects />} />
        <Route path="projects/:id" element={<ContractorProjectDetail />} />
        <Route path="tasks" element={<ContractorTasks />} />
        <Route path="work-materials" element={<WorkMaterials />} />
        <Route path="daily-progress" element={<Navigate to="/contractor/work-materials" replace />} />
        <Route path="materials" element={<MaterialRequests />} />
        <Route path="issues" element={<IssueReporting />} />
        <Route path="reports" element={<ContractorReports />} />
        <Route path="messages" element={<Messages basePath="/contractor" />} />
        <Route path="notifications" element={<Notifications />} />
        <Route path="profile" element={<Profile />} />
      </Route>

      {/* Utility Routes */}
      <Route path="/dashboard" element={<RoleRedirect />} />
      <Route path="/unauthorized" element={<Unauthorized />} />
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}
