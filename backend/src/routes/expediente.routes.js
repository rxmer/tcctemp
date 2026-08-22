import { Router } from "express";
import * as expedienteController from "../controllers/expediente.controller.js";
import { authenticate, requireAdmin } from "../middleware/auth.js";
import { validateBody } from "../middleware/validate.js";

export const expedienteRoutes = Router();

expedienteRoutes.use(authenticate, requireAdmin);

expedienteRoutes.get("/", expedienteController.listar);
expedienteRoutes.put("/", validateBody("upsertExpedienteAll"), expedienteController.upsertAll);
expedienteRoutes.put("/:dia_semana", validateBody("upsertExpedienteDia"), expedienteController.upsert);
