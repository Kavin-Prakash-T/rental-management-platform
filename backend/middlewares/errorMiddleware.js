import ApiError from "../utils/ApiError.js";

export const notFoundHandler = (req, _res, next) => {
  next(ApiError.notFound(`Route not found: ${req.method} ${req.originalUrl}`));
};

export const errorHandler = (err, _req, res, _next) => {
  let error = err;

  if (err instanceof SyntaxError && err.status === 400 && "body" in err) {
    error = ApiError.badRequest("Malformed JSON in request body");
  } else if (err.name === "CastError") {
    const message = `Invalid resource identifier for field: ${err.path}`;
    error = ApiError.badRequest(message, [{ field: err.path, message: `Invalid value '${err.value}'` }]);
  } else if (err.code === 11000) {
    const field = Object.keys(err.keyValue || {})[0] || "field";
    const value = err.keyValue ? err.keyValue[field] : "entered value";
    const message = `Duplicate value entered for ${field}: '${value}'. It must be unique.`;
    error = ApiError.conflict(message, [{ field, message }]);
  } else if (err.name === "ValidationError") {
    const errors = Object.values(err.errors || {}).map((item) => ({
      field: item.path,
      message: item.message,
    }));
    error = ApiError.badRequest("Validation failed", errors);
  } else if (err.name === "ZodError") {
    const errors = (err.issues || []).map((issue) => ({
      field: issue.path.join("."),
      message: issue.message,
    }));
    error = ApiError.badRequest("Validation failed", errors);
  } else if (!(error instanceof ApiError)) {
    const statusCode = error.statusCode || 500;
    const message = error.message || "Internal Server Error";
    error = new ApiError(statusCode, message, [], err.stack);
  }

  const isProduction = process.env.NODE_ENV === "production";

  const responsePayload = {
    success: false,
    message: error.message,
    errors: error.errors || [],
    ...(isProduction ? {} : { stack: error.stack }),
  };

  return res.status(error.statusCode || 500).json(responsePayload);
};
