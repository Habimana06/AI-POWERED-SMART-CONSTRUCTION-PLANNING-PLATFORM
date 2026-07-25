export const ROLES = {
  ADMIN: 'admin',
  PROJECT_MANAGER: 'project_manager',
  CONTRACTOR: 'contractor',
};

export const ROLE_LABELS = {
  admin: 'Administrator',
  project_manager: 'Project Manager',
  contractor: 'Contractor',
};

/** Single organization name for all projects (no per-company UI) */
export const ORGANIZATION_NAME = 'BuildPlan AI';

export const PROJECT_STATUS = {
  DRAFT: 'draft',
  IN_PROGRESS: 'in_progress',
  COMPLETED: 'completed',
  ARCHIVED: 'archived',
};

export const STATUS_LABELS = {
  draft: 'Draft',
  in_progress: 'In Progress',
  completed: 'Completed',
  archived: 'Archived',
  pending: 'Pending',
  approved: 'Approved',
  rejected: 'Rejected',
  low: 'Low',
  medium: 'Medium',
  high: 'High',
  critical: 'Critical',
};

export const STATUS_COLORS = {
  draft: 'badge-neutral',
  in_progress: 'badge-info',
  completed: 'badge-success',
  archived: 'badge-neutral',
  pending: 'badge-warning',
  approved: 'badge-success',
  rejected: 'badge-danger',
  low: 'badge-success',
  medium: 'badge-warning',
  high: 'badge-danger',
  critical: 'badge-danger',
};

export const NAV_ITEMS = {
  admin: [
    { label: 'Dashboard', path: '/admin/dashboard', icon: 'LayoutDashboard' },
    { label: 'Analytics', path: '/admin/analytics', icon: 'TrendingUp' },
    { label: 'Users', path: '/admin/users', icon: 'Users' },
    { label: 'Projects', path: '/admin/projects', icon: 'FolderKanban' },
    { label: 'Platform Hub', path: '/admin/platform', icon: 'Building2' },
    { label: 'Reports', path: '/admin/reports', icon: 'BarChart3' },
    { label: 'Messages', path: '/admin/messages', icon: 'MessageSquare' },
    { label: 'Audit Logs', path: '/admin/audit-logs', icon: 'ScrollText' },
    { label: 'Landing Inbox', path: '/admin/testimonials', icon: 'Quote' },
    { label: 'System Status', path: '/admin/system-status', icon: 'Activity' },
    { label: 'Settings', path: '/admin/settings', icon: 'Settings' },
    { label: 'Notifications', path: '/admin/notifications', icon: 'Bell' },
    { label: 'Profile', path: '/admin/profile', icon: 'User' },
  ],
  project_manager: [
    { label: 'Dashboard', path: '/pm/dashboard', icon: 'LayoutDashboard' },
    { label: 'Create Project', path: '/pm/create-project', icon: 'PlusCircle' },
    { label: 'AI Building', path: '/pm/ai-building', icon: 'Box' },
    { label: 'Building Editor', path: '/pm/building-editor', icon: 'PenTool' },
    { label: 'Design Output', path: '/pm/blueprints', icon: 'FileImage' },
    { label: 'Scheduling', path: '/pm/scheduling', icon: 'Calendar' },
    { label: 'Cost Estimation', path: '/pm/cost-estimation', icon: 'DollarSign' },
    { label: 'Risk Prediction', path: '/pm/risk-prediction', icon: 'AlertTriangle' },
    { label: 'Monitoring', path: '/pm/monitoring', icon: 'Activity' },
    { label: 'Contractors', path: '/pm/contractors', icon: 'HardHat' },
    { label: 'Reports', path: '/pm/reports', icon: 'FileText' },
    { label: 'Messages', path: '/pm/messages', icon: 'MessageSquare' },
    { label: 'Notifications', path: '/pm/notifications', icon: 'ScrollText' },
    { label: 'Profile', path: '/pm/profile', icon: 'User' },
  ],
  contractor: [
    { label: 'Dashboard', path: '/contractor/dashboard', icon: 'LayoutDashboard' },
    { label: 'Assigned Projects', path: '/contractor/projects', icon: 'FolderKanban' },
    { label: 'My Tasks', path: '/contractor/tasks', icon: 'ClipboardList' },
    { label: 'Work & Materials', path: '/contractor/work-materials', icon: 'Box' },
    { label: 'Material Requests', path: '/contractor/materials', icon: 'Package' },
    { label: 'Issue Reporting', path: '/contractor/issues', icon: 'AlertCircle' },
    { label: 'My Reports', path: '/contractor/reports', icon: 'FileText' },
    { label: 'Messages', path: '/contractor/messages', icon: 'MessageSquare' },
    { label: 'Notifications', path: '/contractor/notifications', icon: 'ScrollText' },
    { label: 'Profile & Settings', path: '/contractor/profile', icon: 'User' },
  ],
};

export const LANDING_NAV = [
  { label: 'Home', path: '/' },
  { label: 'About', path: '/about' },
  { label: 'Contact', path: '/contact' },
];

/** Three design-focused highlights for the landing home page */
export const HOME_DESIGN_FEATURES = [
  {
    title: 'Interactive 3D Building Editor',
    description: 'Draw floor plans, set dimensions, materials, doors, and windows — your model stays the source of truth for every downstream tool.',
    icon: 'PenTool',
  },
  {
    title: 'Blueprints & Full-House Renders',
    description: 'Export floor plans and photorealistic exterior images generated from your saved design — no duplicate data entry.',
    icon: 'FileImage',
  },
  {
    title: 'Design-Linked AI Planning',
    description: 'Cost estimates, schedules, and risk insights tied to the same geometry you edited — so numbers match what you designed.',
    icon: 'Bot',
  },
];

/** Overlay cards on the landing background feature section */
export const PLATFORM_WORKFLOW_HIGHLIGHTS = [
  {
    title: 'From Sketch to Site',
    description: 'One continuous workflow: design, approve, schedule, and monitor without switching tools.',
    icon: 'Layers',
  },
  {
    title: 'Field-Ready Outputs',
    description: 'Contractors see assignments, logs, and issues aligned with PM blueprints and progress.',
    icon: 'HardHat',
  },
  {
    title: 'Governance Built In',
    description: 'Role-based access, notifications, and audit trails for accountable delivery.',
    icon: 'Shield',
  },
];

export const FEATURES = [
  {
    title: 'AI Building Design',
    description: 'Generate realistic 3D building models with AI-powered architectural suggestions and material recommendations.',
    icon: 'Box',
  },
  {
    title: 'Smart Scheduling',
    description: 'Intelligent Gantt scheduling with dependency tracking, resource allocation, and timeline optimization.',
    icon: 'Calendar',
  },
  {
    title: 'Cost Estimation',
    description: 'AI-driven cost predictions with material breakdowns, labor estimates, and budget variance tracking.',
    icon: 'DollarSign',
  },
  {
    title: 'Risk Prediction',
    description: 'Proactive risk identification with severity scoring, mitigation strategies, and real-time alerts.',
    icon: 'AlertTriangle',
  },
  {
    title: 'Project Monitoring',
    description: 'Real-time progress tracking with daily logs, photo documentation, and contractor coordination.',
    icon: 'Activity',
  },
  {
    title: 'Blueprint Management',
    description: 'Centralized blueprint storage with version control, annotations, and collaborative review tools.',
    icon: 'FileImage',
  },
];

export const PRICING_PLANS = [
  {
    name: 'Starter',
    price: 99,
    period: 'month',
    description: 'For small teams getting started',
    features: ['Up to 3 projects', 'Basic AI assistant', '5 team members', 'Email support', 'Standard reports'],
    highlighted: false,
  },
  {
    name: 'Professional',
    price: 299,
    period: 'month',
    description: 'For growing construction firms',
    features: ['Up to 20 projects', 'Full AI suite', '25 team members', 'Priority support', 'Advanced analytics', '3D building generator'],
    highlighted: true,
  },
  {
    name: 'Enterprise',
    price: 799,
    period: 'month',
    description: 'For large-scale operations',
    features: ['Unlimited projects', 'Custom AI models', 'Unlimited members', 'Dedicated support', 'API access', 'Custom integrations', 'Audit logs'],
    highlighted: false,
  },
];

export const FAQ_ITEMS = [
  {
    question: 'How does the AI building generator work?',
    answer: 'Our AI analyzes your project requirements including building type, floor count, area, and special requirements to generate realistic 3D building models with material suggestions and cost estimates.',
  },
  {
    question: 'Can contractors access the platform?',
    answer: 'Yes, contractors have their own dedicated portal to view assigned projects, submit daily progress, request materials, and report issues directly to project managers.',
  },
  {
    question: 'Is my project data secure?',
    answer: 'We use enterprise-grade encryption, JWT authentication, role-based access control, and comprehensive audit logging to protect your construction data.',
  },
  {
    question: 'What integrations are available?',
    answer: 'BuildPlan AI integrates with popular construction tools including Autodesk Construction Cloud, Procore, and supports API access for custom integrations on Enterprise plans.',
  },
  {
    question: 'How accurate are the AI cost estimates?',
    answer: 'Our AI cost estimation uses regional pricing data, material databases, and historical project data to provide estimates within 10-15% accuracy for most commercial projects.',
  },
];

export const TESTIMONIALS = [
  {
    name: 'Sarah Mitchell',
    role: 'VP of Construction, Apex Builders',
    content: 'BuildPlan AI reduced our project planning time by 40%. The AI building generator and cost estimation tools are game-changers.',
    avatar: 'SM',
    rating: 5,
  },
  {
    name: 'James Rodriguez',
    role: 'Project Manager, Metro Development',
    content: 'The scheduling and risk prediction features helped us avoid a major delay on our downtown tower project. Incredible platform.',
    avatar: 'JR',
    rating: 5,
  },
  {
    name: 'Emily Chen',
    role: 'Director of Operations, Skyline Corp',
    content: 'Finally, a construction platform that feels modern. Our contractors love the mobile-friendly progress reporting.',
    avatar: 'EC',
    rating: 5,
  },
];
