-- BuildPlan AI Database Schema (MySQL 8)

-- Roles
CREATE TABLE IF NOT EXISTS roles (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(50) UNIQUE NOT NULL,
  description TEXT,
  permissions JSON DEFAULT ('[]'),
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Companies
CREATE TABLE IF NOT EXISTS companies (
  id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
  name VARCHAR(255) NOT NULL,
  registration_number VARCHAR(100),
  address TEXT,
  city VARCHAR(100),
  country VARCHAR(100) DEFAULT 'USA',
  phone VARCHAR(50),
  email VARCHAR(255),
  website VARCHAR(255),
  logo_url TEXT,
  status VARCHAR(50) DEFAULT 'active',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Users
CREATE TABLE IF NOT EXISTS users (
  id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  first_name VARCHAR(100) NOT NULL,
  last_name VARCHAR(100) NOT NULL,
  phone VARCHAR(50),
  avatar_url TEXT,
  role_id INT NOT NULL,
  company_id CHAR(36),
  is_verified TINYINT(1) DEFAULT 0,
  is_active TINYINT(1) DEFAULT 1,
  email_verification_token VARCHAR(255),
  password_reset_token VARCHAR(255),
  password_reset_expires DATETIME,
  last_login DATETIME,
  job_title VARCHAR(120),
  department VARCHAR(120),
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (role_id) REFERENCES roles(id),
  FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Sessions
CREATE TABLE IF NOT EXISTS sessions (
  id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
  user_id CHAR(36) NOT NULL,
  ip_address VARCHAR(45),
  user_agent TEXT,
  is_active TINYINT(1) DEFAULT 1,
  expires_at DATETIME NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Refresh Tokens
CREATE TABLE IF NOT EXISTS refresh_tokens (
  id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
  user_id CHAR(36) NOT NULL,
  token_hash VARCHAR(255) NOT NULL,
  session_id CHAR(36),
  expires_at DATETIME NOT NULL,
  revoked TINYINT(1) DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (session_id) REFERENCES sessions(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Projects
CREATE TABLE IF NOT EXISTS projects (
  id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
  name VARCHAR(255) NOT NULL,
  description TEXT,
  project_code VARCHAR(50) UNIQUE,
  status VARCHAR(50) DEFAULT 'draft',
  approval_status VARCHAR(50) DEFAULT 'pending',
  priority VARCHAR(20) DEFAULT 'medium',
  budget DECIMAL(15, 2),
  actual_cost DECIMAL(15, 2) DEFAULT 0,
  start_date DATE,
  end_date DATE,
  location TEXT,
  latitude DECIMAL(10, 8),
  longitude DECIMAL(11, 8),
  project_type VARCHAR(100),
  building_type VARCHAR(100),
  total_area_sqft DECIMAL(12, 2),
  floors INT DEFAULT 1,
  progress_percentage DECIMAL(5, 2) DEFAULT 0,
  created_by CHAR(36),
  company_id CHAR(36),
  approved_by CHAR(36),
  approved_at DATETIME,
  archived_at DATETIME,
  metadata JSON DEFAULT ('{}'),
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (created_by) REFERENCES users(id),
  FOREIGN KEY (company_id) REFERENCES companies(id),
  FOREIGN KEY (approved_by) REFERENCES users(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Project Files
CREATE TABLE IF NOT EXISTS project_files (
  id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
  project_id CHAR(36) NOT NULL,
  uploaded_by CHAR(36),
  file_name VARCHAR(255) NOT NULL,
  original_name VARCHAR(255) NOT NULL,
  file_path TEXT NOT NULL,
  file_type VARCHAR(100),
  file_size INT,
  category VARCHAR(100) DEFAULT 'general',
  description TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
  FOREIGN KEY (uploaded_by) REFERENCES users(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Project Images
CREATE TABLE IF NOT EXISTS project_images (
  id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
  project_id CHAR(36) NOT NULL,
  uploaded_by CHAR(36),
  image_name VARCHAR(255) NOT NULL,
  image_path TEXT NOT NULL,
  thumbnail_path TEXT,
  caption TEXT,
  image_type VARCHAR(50) DEFAULT 'progress',
  taken_at DATETIME,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
  FOREIGN KEY (uploaded_by) REFERENCES users(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Project Tasks
CREATE TABLE IF NOT EXISTS project_tasks (
  id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
  project_id CHAR(36) NOT NULL,
  parent_task_id CHAR(36),
  title VARCHAR(255) NOT NULL,
  description TEXT,
  status VARCHAR(50) DEFAULT 'pending',
  priority VARCHAR(20) DEFAULT 'medium',
  start_date DATE,
  end_date DATE,
  estimated_hours DECIMAL(8, 2),
  actual_hours DECIMAL(8, 2) DEFAULT 0,
  progress_percentage DECIMAL(5, 2) DEFAULT 0,
  assigned_to CHAR(36),
  created_by CHAR(36),
  dependencies JSON DEFAULT ('[]'),
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
  FOREIGN KEY (parent_task_id) REFERENCES project_tasks(id) ON DELETE SET NULL,
  FOREIGN KEY (assigned_to) REFERENCES users(id),
  FOREIGN KEY (created_by) REFERENCES users(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Contractors
CREATE TABLE IF NOT EXISTS contractors (
  id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
  user_id CHAR(36) NOT NULL,
  company_id CHAR(36),
  specialty VARCHAR(100),
  license_number VARCHAR(100),
  experience_years INT DEFAULT 0,
  hourly_rate DECIMAL(10, 2),
  rating DECIMAL(3, 2) DEFAULT 0,
  total_projects INT DEFAULT 0,
  availability VARCHAR(50) DEFAULT 'available',
  certifications JSON DEFAULT ('[]'),
  bio TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (company_id) REFERENCES companies(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Assignments
CREATE TABLE IF NOT EXISTS assignments (
  id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
  project_id CHAR(36) NOT NULL,
  contractor_id CHAR(36) NOT NULL,
  assigned_by CHAR(36),
  role_on_project VARCHAR(100),
  status VARCHAR(50) DEFAULT 'active',
  start_date DATE,
  end_date DATE,
  notes TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_assignments_project_contractor (project_id, contractor_id),
  FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
  FOREIGN KEY (contractor_id) REFERENCES contractors(id) ON DELETE CASCADE,
  FOREIGN KEY (assigned_by) REFERENCES users(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Materials
CREATE TABLE IF NOT EXISTS materials (
  id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
  project_id CHAR(36) NOT NULL,
  requested_by CHAR(36),
  name VARCHAR(255) NOT NULL,
  description TEXT,
  category VARCHAR(100),
  quantity DECIMAL(12, 2) NOT NULL,
  unit VARCHAR(50) NOT NULL,
  unit_cost DECIMAL(12, 2),
  total_cost DECIMAL(15, 2),
  supplier VARCHAR(255),
  status VARCHAR(50) DEFAULT 'requested',
  delivery_date DATE,
  notes TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
  FOREIGN KEY (requested_by) REFERENCES users(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Cost Estimations
CREATE TABLE IF NOT EXISTS cost_estimations (
  id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
  project_id CHAR(36) NOT NULL,
  created_by CHAR(36),
  title VARCHAR(255) NOT NULL,
  total_estimated_cost DECIMAL(15, 2),
  labor_cost DECIMAL(15, 2),
  material_cost DECIMAL(15, 2),
  equipment_cost DECIMAL(15, 2),
  contingency_cost DECIMAL(15, 2),
  overhead_cost DECIMAL(15, 2),
  breakdown JSON DEFAULT ('[]'),
  ai_generated TINYINT(1) DEFAULT 0,
  confidence_score DECIMAL(5, 2),
  notes TEXT,
  version INT DEFAULT 1,
  status VARCHAR(50) DEFAULT 'draft',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
  FOREIGN KEY (created_by) REFERENCES users(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Risk Predictions
CREATE TABLE IF NOT EXISTS risk_predictions (
  id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
  project_id CHAR(36) NOT NULL,
  created_by CHAR(36),
  risk_type VARCHAR(100) NOT NULL,
  risk_level VARCHAR(20) NOT NULL,
  probability DECIMAL(5, 2),
  impact_score DECIMAL(5, 2),
  description TEXT,
  mitigation_plan TEXT,
  ai_generated TINYINT(1) DEFAULT 0,
  status VARCHAR(50) DEFAULT 'identified',
  identified_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  resolved_at DATETIME,
  metadata JSON DEFAULT ('{}'),
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
  FOREIGN KEY (created_by) REFERENCES users(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Building Designs
CREATE TABLE IF NOT EXISTS building_designs (
  id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
  project_id CHAR(36) NOT NULL,
  created_by CHAR(36),
  name VARCHAR(255) NOT NULL,
  design_type VARCHAR(100),
  description TEXT,
  specifications JSON DEFAULT ('{}'),
  ai_generated TINYINT(1) DEFAULT 0,
  status VARCHAR(50) DEFAULT 'draft',
  preview_url TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
  FOREIGN KEY (created_by) REFERENCES users(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Floor Plans
CREATE TABLE IF NOT EXISTS floor_plans (
  id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
  building_design_id CHAR(36) NOT NULL,
  project_id CHAR(36) NOT NULL,
  floor_number INT NOT NULL,
  name VARCHAR(255),
  area_sqft DECIMAL(12, 2),
  rooms JSON DEFAULT ('[]'),
  layout_data JSON DEFAULT ('{}'),
  file_path TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (building_design_id) REFERENCES building_designs(id) ON DELETE CASCADE,
  FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Blueprints
CREATE TABLE IF NOT EXISTS blueprints (
  id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
  project_id CHAR(36) NOT NULL,
  building_design_id CHAR(36),
  created_by CHAR(36),
  name VARCHAR(255) NOT NULL,
  blueprint_type VARCHAR(100),
  version VARCHAR(20) DEFAULT '1.0',
  file_path TEXT,
  thumbnail_path TEXT,
  description TEXT,
  status VARCHAR(50) DEFAULT 'active',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
  FOREIGN KEY (building_design_id) REFERENCES building_designs(id) ON DELETE SET NULL,
  FOREIGN KEY (created_by) REFERENCES users(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- AI Conversations
CREATE TABLE IF NOT EXISTS ai_conversations (
  id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
  user_id CHAR(36) NOT NULL,
  project_id CHAR(36),
  title VARCHAR(255),
  conversation_type VARCHAR(50) DEFAULT 'chat',
  messages JSON DEFAULT ('[]'),
  context JSON DEFAULT ('{}'),
  is_active TINYINT(1) DEFAULT 1,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Notifications
CREATE TABLE IF NOT EXISTS notifications (
  id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
  user_id CHAR(36) NOT NULL,
  title VARCHAR(255) NOT NULL,
  message TEXT NOT NULL,
  type VARCHAR(50) DEFAULT 'info',
  category VARCHAR(50),
  reference_type VARCHAR(50),
  reference_id CHAR(36),
  is_read TINYINT(1) DEFAULT 0,
  read_at DATETIME,
  metadata JSON DEFAULT ('{}'),
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Reports
CREATE TABLE IF NOT EXISTS reports (
  id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
  project_id CHAR(36),
  created_by CHAR(36),
  title VARCHAR(255) NOT NULL,
  report_type VARCHAR(100) NOT NULL,
  content JSON DEFAULT ('{}'),
  summary TEXT,
  file_path TEXT,
  status VARCHAR(50) DEFAULT 'draft',
  generated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
  FOREIGN KEY (created_by) REFERENCES users(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Progress Updates
CREATE TABLE IF NOT EXISTS progress_updates (
  id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
  project_id CHAR(36) NOT NULL,
  task_id CHAR(36),
  reported_by CHAR(36),
  progress_percentage DECIMAL(5, 2),
  description TEXT,
  work_completed TEXT,
  work_planned TEXT,
  hours_worked DECIMAL(6, 2),
  weather_conditions VARCHAR(100),
  workers_count INT,
  photos JSON DEFAULT ('[]'),
  status VARCHAR(50) DEFAULT 'submitted',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
  FOREIGN KEY (task_id) REFERENCES project_tasks(id) ON DELETE SET NULL,
  FOREIGN KEY (reported_by) REFERENCES users(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Daily Logs
CREATE TABLE IF NOT EXISTS daily_logs (
  id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
  project_id CHAR(36) NOT NULL,
  contractor_id CHAR(36),
  logged_by CHAR(36),
  log_date DATE NOT NULL DEFAULT (CURRENT_DATE),
  weather VARCHAR(100),
  temperature DECIMAL(5, 2),
  workers_on_site INT DEFAULT 0,
  work_summary TEXT,
  issues_encountered TEXT,
  safety_incidents TEXT,
  equipment_used JSON DEFAULT ('[]'),
  materials_used JSON DEFAULT ('[]'),
  photos JSON DEFAULT ('[]'),
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
  FOREIGN KEY (contractor_id) REFERENCES contractors(id),
  FOREIGN KEY (logged_by) REFERENCES users(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Issue Reports
CREATE TABLE IF NOT EXISTS issue_reports (
  id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
  project_id CHAR(36) NOT NULL,
  reported_by CHAR(36),
  assigned_to CHAR(36),
  title VARCHAR(255) NOT NULL,
  description TEXT NOT NULL,
  issue_type VARCHAR(100),
  severity VARCHAR(20) DEFAULT 'medium',
  status VARCHAR(50) DEFAULT 'open',
  location TEXT,
  photos JSON DEFAULT ('[]'),
  resolution TEXT,
  resolved_at DATETIME,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
  FOREIGN KEY (reported_by) REFERENCES users(id),
  FOREIGN KEY (assigned_to) REFERENCES users(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Messages
CREATE TABLE IF NOT EXISTS messages (
  id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
  project_id CHAR(36),
  sender_id CHAR(36) NOT NULL,
  recipient_id CHAR(36),
  subject VARCHAR(255),
  body TEXT NOT NULL,
  is_read TINYINT(1) DEFAULT 0,
  read_at DATETIME,
  attachments JSON DEFAULT ('[]'),
  parent_message_id CHAR(36),
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
  FOREIGN KEY (sender_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (recipient_id) REFERENCES users(id) ON DELETE SET NULL,
  FOREIGN KEY (parent_message_id) REFERENCES messages(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Audit Logs
CREATE TABLE IF NOT EXISTS audit_logs (
  id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
  user_id CHAR(36),
  action VARCHAR(100) NOT NULL,
  entity_type VARCHAR(100),
  entity_id CHAR(36),
  old_values JSON,
  new_values JSON,
  ip_address VARCHAR(45),
  user_agent TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Settings
CREATE TABLE IF NOT EXISTS settings (
  id INT AUTO_INCREMENT PRIMARY KEY,
  `key` VARCHAR(100) UNIQUE NOT NULL,
  value JSON NOT NULL,
  description TEXT,
  category VARCHAR(50) DEFAULT 'general',
  updated_by CHAR(36),
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (updated_by) REFERENCES users(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Per-user security & notification preferences
CREATE TABLE IF NOT EXISTS user_security (
  user_id CHAR(36) PRIMARY KEY,
  totp_secret VARCHAR(255),
  totp_enabled TINYINT(1) DEFAULT 0,
  notify_email TINYINT(1) DEFAULT 1,
  notify_sms TINYINT(1) DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Landing testimonials (admin-approved for public display)
CREATE TABLE IF NOT EXISTS testimonials (
  id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
  author_name VARCHAR(120) NOT NULL,
  author_role VARCHAR(255),
  quote TEXT NOT NULL,
  email VARCHAR(255),
  status VARCHAR(20) DEFAULT 'pending',
  approved_at DATETIME,
  rejected_at DATETIME,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE INDEX idx_testimonials_status ON testimonials(status);

-- Contact form submissions (admin replies by email)
CREATE TABLE IF NOT EXISTS contact_messages (
  id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
  name VARCHAR(120) NOT NULL,
  email VARCHAR(255) NOT NULL,
  company VARCHAR(255),
  subject VARCHAR(255) NOT NULL,
  message TEXT NOT NULL,
  status VARCHAR(20) DEFAULT 'new',
  admin_reply TEXT,
  replied_at DATETIME,
  replied_by CHAR(36),
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (replied_by) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE INDEX idx_contact_messages_status ON contact_messages(status);

-- Indexes
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_role ON users(role_id);
CREATE INDEX idx_projects_status ON projects(status);
CREATE INDEX idx_projects_company ON projects(company_id);
CREATE INDEX idx_project_tasks_project ON project_tasks(project_id);
CREATE INDEX idx_assignments_project ON assignments(project_id);
CREATE INDEX idx_assignments_contractor ON assignments(contractor_id);
CREATE INDEX idx_notifications_user ON notifications(user_id);
CREATE INDEX idx_notifications_read ON notifications(is_read);
CREATE INDEX idx_messages_project ON messages(project_id);
CREATE INDEX idx_messages_recipient ON messages(recipient_id);
CREATE INDEX idx_audit_logs_user ON audit_logs(user_id);
CREATE INDEX idx_audit_logs_entity ON audit_logs(entity_type, entity_id);
CREATE INDEX idx_refresh_tokens_user ON refresh_tokens(user_id);
CREATE INDEX idx_daily_logs_project_date ON daily_logs(project_id, log_date);
