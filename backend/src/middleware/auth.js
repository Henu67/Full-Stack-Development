import jwt from 'jsonwebtoken';

// Verifies the Bearer token on protected routes and attaches the decoded
// payload ({ _id }) to req.user.
export const verifyToken = (req, res, next) => {
  const token = req.header('Authorization')?.split(' ')[1]; // "Bearer <token>"

  if (!token) {
    return res.status(401).json({ message: 'Access denied. No token provided.' });
  }

  try {
    req.user = jwt.verify(token, process.env.JWT_SECRET);
    next();
  } catch (error) {
    return res.status(401).json({ message: 'Invalid or expired token.' });
  }
};
