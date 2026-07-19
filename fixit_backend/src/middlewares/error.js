const errorHandler = (err, req, res, next) => {
  console.error(`[Error Handler] ${err.stack || err.message || err}`);

  const status = err.status || 500;
  const message = err.message || 'Internal Server Error';

  res.status(status).json({
    success: false,
    status,
    message,
    error: process.env.NODE_ENV === 'production' ? undefined : { stack: err.stack }
  });
};

module.exports = errorHandler;
