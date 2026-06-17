import { Router } from "express";
import * as funcionariosController from "../controllers/funcionarios.controller.js";
import { authenticate } from "../middleware/auth.js";

export const funcionariosRoutes = Router();

funcionariosRoutes.use(authenticate);

funcionariosRoutes.post("/", funcionariosController.criar);
funcionariosRoutes.get("/", funcionariosController.listar);
