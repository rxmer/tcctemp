import { Router } from "express";
import * as veiculosController from "../controllers/veiculos.controller.js";
import { authenticate, requireAdmin } from "../middleware/auth.js";
import { validateBody } from "../middleware/validate.js";

export const veiculosRoutes = Router();

veiculosRoutes.use(authenticate);

veiculosRoutes.post("/", validateBody("criarVeiculo"), veiculosController.criar);
veiculosRoutes.get("/", veiculosController.listar);
veiculosRoutes.put("/:id", validateBody("atualizarVeiculo"), veiculosController.atualizar);
veiculosRoutes.delete("/:id", requireAdmin, veiculosController.deletar);
