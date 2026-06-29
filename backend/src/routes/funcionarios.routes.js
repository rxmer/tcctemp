import { Router } from "express";
import * as funcionariosController from "../controllers/funcionarios.controller.js";
import { authenticate, requireAdmin } from "../middleware/auth.js";

export const funcionariosRoutes = Router();

funcionariosRoutes.use(authenticate);

funcionariosRoutes.post("/", requireAdmin, funcionariosController.criar);
funcionariosRoutes.get("/", funcionariosController.listar);
