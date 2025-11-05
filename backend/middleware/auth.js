module.exports = function (req, res, next) {
  console.log('Auth middleware called');
  console.log('Session exists:', !!req.session);
  console.log('Session ID:', req.sessionID);
  console.log('Session data:', req.session);
  console.log('User ID in session:', req.session?.userId);
  console.log('User role:', req.session?.role);
  
  if (process.env.ALLOW_INSECURE === 'true' || process.env.NODE_ENV === 'development') {
    console.log('Development bypass enabled');
    return next();
  }
  
  if (!req.session || !req.session.userId) {
    console.log('No valid session found');
    return res.status(401).json({ 
      message: 'Unauthorized - Please login first',
      code: 'NO_SESSION'
    });
  }
  
  const sessionAge = Date.now() - (req.session.createdAt || 0);
  const maxAge = 24 * 60 * 60 * 1000; // 24 hours in milliseconds
  
  if (sessionAge > maxAge) {
    console.log('Session expired');
    req.session.destroy();
    return res.status(401).json({ 
      message: 'Session expired - Please login again',
      code: 'SESSION_EXPIRED'
    });
  }
  
  if (req.session.userStatus && req.session.userStatus !== 'active') {
    console.log('User account is not active');
    return res.status(403).json({ 
      message: 'Account is disabled - Contact administrator',
      code: 'ACCOUNT_DISABLED'
    });
  }
  
  console.log('User authenticated successfully:', {
    userId: req.session.userId,
    role: req.session.role,
    sessionAge: Math.round(sessionAge / 1000 / 60) + ' minutes'
  });
  
  return next();
};
