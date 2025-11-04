const securityLogger = (req, res, next) => {
  const startTime = Date.now();
  const originalSend = res.send;
  
  const logData = {
    timestamp: new Date().toISOString(),
    method: req.method,
    url: req.url,
    ip: req.ip || req.connection.remoteAddress,
    userAgent: req.get('User-Agent'),
    userId: req.session?.userId || 'anonymous',
    sessionId: req.sessionID
  };

  res.send = function(data) {
    const duration = Date.now() - startTime;
    const responseData = {
      ...logData,
      statusCode: res.statusCode,
      duration: duration + 'ms',
      responseSize: data ? data.length : 0
    };

    if (res.statusCode >= 400) {
      console.warn('SECURITY WARNING:', responseData);
    } else if (res.statusCode >= 300) {
      console.info('SECURITY INFO:', responseData);
    } else {
      console.log('REQUEST:', responseData);
    }

    originalSend.call(this, data);
  };

  next();
};

const logAuthEvent = (event, req, additionalData = {}) => {
  const logData = {
    timestamp: new Date().toISOString(),
    event: event,
    ip: req.ip || req.connection.remoteAddress,
    userAgent: req.get('User-Agent'),
    userId: req.session?.userId || 'unknown',
    sessionId: req.sessionID,
    ...additionalData
  };

  console.log('AUTH EVENT:', logData);
};

const logSuspiciousActivity = (activity, req, details = {}) => {
  const logData = {
    timestamp: new Date().toISOString(),
    activity: activity,
    severity: 'HIGH',
    ip: req.ip || req.connection.remoteAddress,
    userAgent: req.get('User-Agent'),
    userId: req.session?.userId || 'unknown',
    sessionId: req.sessionID,
    details: details
  };

  console.error('SUSPICIOUS ACTIVITY:', logData);
};

module.exports = {
  securityLogger,
  logAuthEvent,
  logSuspiciousActivity
};
