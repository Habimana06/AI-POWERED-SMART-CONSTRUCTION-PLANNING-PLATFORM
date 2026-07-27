const express = require('express');
const http = require('http');
const cors = require('cors');
const path = require('path');
const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');

const env = require('./config/env');
const routes = require('./routes');
const { pool } = require('./config/database');
const { notFound, errorHandler } = require('./middleware/errorHandler');
const notificationService = require('./services/notificationService');
const { isSmtpConfigured } = require('./services/emailService');

const app = express();
const server = http.createServer(app);

const allowedOrigins = env.frontendUrls;

const io = new Server(server, {
  cors: {
    origin: allowedOrigins,
    methods: ['GET', 'POST'],
    credentials: true,
  },
});

notificationService.init(io);

app.use(cors({ origin: allowedOrigins, credentials: true }));
app.use(express.json({ limit: '15mb' }));
app.use(express.urlencoded({ extended: true }));
app.use('/uploads', express.static(path.join(process.cwd(), env.uploadDir)));

app.use('/api', routes);

app.use(notFound);
app.use(errorHandler);

io.use((socket, next) => {
  const token = socket.handshake.auth?.token || socket.handshake.headers?.authorization?.split(' ')[1];
  if (!token) return next(new Error('Authentication required'));

  try {
    const decoded = jwt.verify(token, env.jwt.secret);
    socket.userId = decoded.userId;
    next();
  } catch {
    next(new Error('Invalid token'));
  }
});

io.on('connection', (socket) => {
  socket.join(`user:${socket.userId}`);
  console.log(`Socket connected: user ${socket.userId}`);

  socket.on('join:project', (projectId) => {
    socket.join(`project:${projectId}`);
  });

  socket.on('leave:project', (projectId) => {
    socket.leave(`project:${projectId}`);
  });

  socket.on('disconnect', () => {
    console.log(`Socket disconnected: user ${socket.userId}`);
  });
});

async function ensureUserSecurityTable() {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS user_security (
        user_id CHAR(36) PRIMARY KEY,
        totp_secret VARCHAR(255),
        totp_enabled TINYINT(1) DEFAULT 0,
        notify_email TINYINT(1) DEFAULT 1,
        notify_sms TINYINT(1) DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `);
  } catch (err) {
    console.warn('Could not ensure user_security table:', err.message);
  }
}

const start = async () => {
  try {
    await pool.query('SELECT NOW()');
    console.log('MySQL connected successfully');
    await ensureUserSecurityTable();
  } catch (err) {
    console.error('MySQL connection failed:', err.message);
    console.warn('Server starting anyway — database may become available later');
  }

  server.listen(env.port, () => {
    console.log(`${env.appName} API running on port ${env.port}`);
    console.log(`Environment: ${env.nodeEnv}`);
    console.log(`Email (SMTP): ${isSmtpConfigured() ? 'configured' : 'NOT configured — set SMTP_USER/SMTP_PASS in .env'}`);
    console.log(`Notifications: bell → email mirror ${env.notifications.mirrorBellEmail ? 'ON' : 'OFF'}`);
    console.log(`Health check: http://localhost:${env.port}/api/health`);
  });
};

start();

module.exports = { app, server, io };
