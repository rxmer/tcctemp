import { Router } from "express";
import * as financeiroController from "../controllers/financeiro.controller.js";
import { authenticate, requireAdmin } from "../middleware/auth.js";
import { validateBody, validateQuery } from "../middleware/validate.js";

export const financeiroRoutes = Router();

financeiroRoutes.use(authenticate);

financeiroRoutes.get("/resumo", requireAdmin, validateQuery("financeiro"), financeiroController.resumo);

financeiroRoutes.get("/contas", requireAdmin, validateQuery("financeiro"), financeiroController.listarContas);
financeiroRoutes.post("/contas", requireAdmin, validateBody("criarContaPagar"), financeiroController.criarConta);
financeiroRoutes.put("/contas/:id", requireAdmin, validateBody("atualizarContaPagar"), financeiroController.atualizarConta);
financeiroRoutes.patch("/contas/:id/pagar", requireAdmin, financeiroController.pagarConta);
financeiroRoutes.delete("/contas/:id", requireAdmin, financeiroController.deletarConta);

financeiroRoutes.get("/faturamentos", requireAdmin, validateQuery("financeiro"), financeiroController.listarFaturamentos);
financeiroRoutes.patch("/faturamentos/:id/receber", requireAdmin, validateBody("receberFaturamento"), financeiroController.receberFaturamento);
