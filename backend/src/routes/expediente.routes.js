import { Router } from "express";
import * as expedienteController from "../controllers/expediente.controller.js";
import { authenticate } from "../middleware/auth.js";

export const expedienteRoutes = Router();

expedienteRoutes.use(authenticate);

expedienteRoutes.get("/", expedienteController.listar);
expedienteRoutes.put("/", expedienteController.upsertAll);
expedienteRoutes.put("/:dia_semana", expedienteController.upsert);
