import { Router } from "express";
import * as osController from "../controllers/ordens_servico.controller.js";
import { authenticate, requireAdmin } from "../middleware/auth.js";

export const ordemServicoRoutes = Router();

ordemServicoRoutes.use(authenticate);

ordemServicoRoutes.post("/", osController.criar);
ordemServicoRoutes.get("/", osController.listar);
ordemServicoRoutes.get("/:id", osController.buscarPorId);
ordemServicoRoutes.put("/:id", osController.atualizar);
ordemServicoRoutes.delete("/:id", osController.deletar);

ordemServicoRoutes.post("/:id/itens", osController.adicionarItem);
ordemServicoRoutes.delete("/:id/itens/:itemId", osController.removerItem);
