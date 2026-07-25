const env = require('../config/env');

class AppError extends Error {
  constructor(message, statusCode = 500, code = null) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.isOperational = true;
  }
}

const notFound = (req, res, next) => {
  next(new AppError(`Route ${req.method} ${req.originalUrl} not found`, 404, 'NOT_FOUND'));
};

const errorHandler = (err, req, res, _next) => {
  const statusCode = err.statusCode || 500;
  const response = {
    success: false,
    message: err.message || 'Internal server error',
    ...(err.code && { code: err.code }),
  };

  if (env.nodeEnv === 'development') {
    response.stack = err.stack;
    response.details = err.details || null;
  }

  if (err.name === 'ValidationError') {
    response.errors = err.errors;
  }

  console.error(`[${new Date().toISOString()}] ${req.method} ${req.originalUrl} - ${statusCode}: ${err.message}`);

  res.status(statusCode).json(response);
};

module.exports = { AppError, notFound, errorHandler };
