import ApiError from "../utils/ApiError.js";

const STATE_CHANGING_METHODS = ["POST", "PUT", "PATCH", "DELETE"];

const csrfProtection = (req, _res, next) => {
  if (!STATE_CHANGING_METHODS.includes(req.method)) {
    return next();
  }

  const hasAuthCookie = Boolean(req.cookies?.token);

  if (hasAuthCookie) {
    const clientCsrfToken = req.headers["x-csrf-token"];
    const cookieCsrfToken = req.cookies?.csrfToken;

    if (!clientCsrfToken || !cookieCsrfToken || clientCsrfToken !== cookieCsrfToken) {
      return next(ApiError.forbidden("Invalid or missing CSRF token."));
    }
  }

  return next();
};

export default csrfProtection;
