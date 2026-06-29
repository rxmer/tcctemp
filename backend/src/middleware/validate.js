import { validate, schemas } from "../utils/validation.js";

export function validateBody(schemaKey) {
  return (req, _res, next) => {
    try {
      req.body = validate(schemas[schemaKey], req.body);
      next();
    } catch (err) {
      _res.status(err.status || err.statusCode || 400).json({ error: err.message });
    }
  };
}
