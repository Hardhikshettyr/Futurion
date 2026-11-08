function authorizeRoles(...allowedRoles) {
  return function authorize(request, response, next) {
    if (!request.auth?.user || !allowedRoles.includes(request.auth.user.role)) {
      return response.status(403).json({
        success: false,
        code: "FORBIDDEN",
        message: "You do not have permission to perform this action",
      });
    }

    return next();
  };
}

module.exports = { authorizeRoles };
