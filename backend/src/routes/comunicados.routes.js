import { Router } from "express";
import rateLimit from "express-rate-limit";
import * as comunicadosController from "../controllers/comunicados.controller.js";
import { authenticate, requireAdmin } from "../middleware/auth.js";
import { validateBody } from "../middleware/validate.js";

const comunicadosLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 10,
  message: { error: "Muitos comunicados enviados. Tente novamente mais tarde." },
  standardHeaders: true,
  legacyHeaders: false,
});

export const comunicadosRoutes = Router();

comunicadosRoutes.use(authenticate, requireAdmin);

comunicadosRoutes.post("/", comunicadosLimiter, validateBody("criarComunicado"), comunicadosController.criar);
comunicadosRoutes.get("/", comunicadosController.listar);
