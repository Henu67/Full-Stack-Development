// Catches anything thrown/forwarded via next(err) — including from
// asyncHandler — and returns a consistent JSON error shape.
export function errorHandler(err, req, res, next) { // eslint-disable-line no-unused-vars
  console.error(err);

  const statusCode = err.statusCode || (res.statusCode !== 200 ? res.statusCode : 500);

  res.status(statusCode).json({
    message: err.message || 'Server error',
    ...(process.env.NODE_ENV !== 'production' && { stack: err.stack }),
  });
}

export function notFound(req, res) {
  res.status(404).json({ message: `Route not found: ${req.method} ${req.originalUrl}` });
}
