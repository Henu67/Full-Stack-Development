// Wraps an async route handler so rejected promises are forwarded to
// Express's error-handling middleware instead of needing try/catch
// in every controller function.
export const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};
