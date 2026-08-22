import { Router } from "express";
import * as funcionariosController from "../controllers/funcionarios.controller.js";
import { authenticate, requireAdmin } from "../middleware/auth.js";
import { validateBody } from "../middleware/validate.js";

export const funcionariosRoutes = Router();

funcionariosRoutes.use(authenticate);

funcionariosRoutes.post("/", requireAdmin, validateBody("criarFuncionario"), funcionariosController.criar);
funcionariosRoutes.get("/", requireAdmin, funcionariosController.listar);
funcionariosRoutes.put("/:id", requireAdmin, funcionariosController.atualizar);
funcionariosRoutes.delete("/:id", requireAdmin, funcionariosController.deletar);
