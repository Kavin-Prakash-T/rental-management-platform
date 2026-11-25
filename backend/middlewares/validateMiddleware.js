import ApiError from "../utils/ApiError.js";

const formatZodErrors = (error) => {
  return error.issues.map((issue) => ({
    field: issue.path.join("."),
    message: issue.message,
  }));
};

const validate = (schemas) => async (req, _res, next) => {
  try {
    const isDirectZodSchema = schemas && typeof schemas.safeParseAsync === "function";
    const targets = isDirectZodSchema ? { body: schemas } : schemas;

    const validationTargets = ["body", "query", "params"];
    const errors = [];

    for (const target of validationTargets) {
      if (targets[target]) {
        const result = await targets[target].safeParseAsync(req[target] || {});
        if (!result.success) {
          errors.push(...formatZodErrors(result.error));
        } else {
          Object.defineProperty(req, target, {
            value: result.data,
            writable: true,
            configurable: true,
            enumerable: true,
          });
        }
      }
    }

    if (errors.length > 0) {
      return next(ApiError.badRequest("Validation failed", errors));
    }

    return next();
  } catch (err) {
    return next(err);
  }
};

export default validate;
