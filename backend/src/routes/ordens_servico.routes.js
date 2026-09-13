import { Router } from "express";
import * as osController from "../controllers/ordens_servico.controller.js";
import { authenticate, requireAdmin } from "../middleware/auth.js";
import { validateBody, validateQuery } from "../middleware/validate.js";

export const ordemServicoRoutes = Router();

ordemServicoRoutes.use(authenticate);

ordemServicoRoutes.post("/", validateBody("criarOS"), osController.criar);
ordemServicoRoutes.get("/", validateQuery("ordensServicos"), osController.listar);
ordemServicoRoutes.get("/:id", osController.buscarPorId);
ordemServicoRoutes.put("/:id", validateBody("atualizarOS"), osController.atualizar);
ordemServicoRoutes.delete("/:id", requireAdmin, osController.deletar);

ordemServicoRoutes.post("/:id/itens", validateBody("adicionarItemOS"), osController.adicionarItem);
ordemServicoRoutes.delete("/:id/itens/:itemId", requireAdmin, osController.removerItem);
