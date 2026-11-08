function notFoundHandler(request, response) {
  response.status(404).json({
    success: false,
    message: `Route not found: ${request.method} ${request.originalUrl}`,
  });
}

function errorHandler(error, _request, response, _next) {
  const requestedStatusCode = error.statusCode || error.status;
  const statusCode =
    Number.isInteger(requestedStatusCode) && requestedStatusCode >= 400
      ? requestedStatusCode
      : 500;

  console.error(error);

  response.status(statusCode).json({
    success: false,
    ...(statusCode < 500 && error.code ? { code: error.code } : {}),
    message:
      statusCode >= 500
        ? "Internal server error"
        : error.message || "Internal server error",
  });
}

module.exports = { errorHandler, notFoundHandler };
