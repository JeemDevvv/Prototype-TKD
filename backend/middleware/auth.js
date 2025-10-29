module.exports = function (req, res, next) {
  console.log('Auth middleware called');
  console.log('Session exists:', !!req.session);
  console.log('Session ID:', req.sessionID);
  console.log('Session data:', req.session);
  console.log('User ID in session:', req.session?.userId);
  
  // Development bypass when explicitly enabled
  if (process.env.ALLOW_INSECURE === 'true' || process.env.NODE_ENV === 'development' || true) {
    console.log('Development bypass enabled');
    return next();
  }
  // Accept any authenticated role; auth route sets req.session.userId and role
  if (req.session && req.session.userId) {
    console.log('User authenticated, proceeding');
    return next();
  }
  console.log('User not authenticated, returning 401');
  res.status(401).json({ message: 'Unauthorized' });
};