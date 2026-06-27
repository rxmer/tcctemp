import { Router } from "express";
import * as veiculosController from "../controllers/veiculos.controller.js";
import { authenticate } from "../middleware/auth.js";

export const veiculosRoutes = Router();

veiculosRoutes.use(authenticate);

veiculosRoutes.post("/", veiculosController.criar);
veiculosRoutes.get("/", veiculosController.listar);
veiculosRoutes.put("/:id", veiculosController.atualizar);
veiculosRoutes.delete("/:id", veiculosController.deletar);
