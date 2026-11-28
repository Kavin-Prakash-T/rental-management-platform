import ApiError from "../utils/ApiError.js";

export const cronAuthMiddleware = (req, _res, next) => {
  const configuredSecret = process.env.CRON_SECRET;

  if (!configuredSecret) {
    return next(ApiError.internal("CRON_SECRET is not configured on the server."));
  }

  const authHeader = req.headers.authorization;
  let bearerToken = null;
  if (authHeader && authHeader.startsWith("Bearer ")) {
    bearerToken = authHeader.split(" ")[1];
  }

  const headerSecret = req.headers["x-cron-secret"];
  const querySecret = req.query.secret;

  const providedSecret = bearerToken || headerSecret || querySecret;

  if (!providedSecret || providedSecret !== configuredSecret) {
    return next(ApiError.unauthorized("Unauthorized cron request. Invalid or missing secret."));
  }

  next();
};
