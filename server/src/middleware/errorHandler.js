export function notFoundHandler(req, res) {
  res.status(404).json({ message: `Route not found: ${req.method} ${req.originalUrl}` });
}

export function errorHandler(err, _req, res, _next) {
  const statusCode = err.statusCode && err.statusCode >= 400 ? err.statusCode : 500;
  if (process.env.NODE_ENV !== 'test' && statusCode >= 500) {
    console.error(err);
  }
  res.status(statusCode).json({
    message: err.message || 'Internal server error',
  });
}
