import { Router } from "express";
import * as financeiroController from "../controllers/financeiro.controller.js";
import { authenticate, requireAdmin } from "../middleware/auth.js";

export const financeiroRoutes = Router();

financeiroRoutes.use(authenticate);

financeiroRoutes.get("/resumo", requireAdmin, financeiroController.resumo);

financeiroRoutes.get("/contas", requireAdmin, financeiroController.listarContas);
financeiroRoutes.post("/contas", requireAdmin, financeiroController.criarConta);
financeiroRoutes.put("/contas/:id", requireAdmin, financeiroController.atualizarConta);
financeiroRoutes.patch("/contas/:id/pagar", requireAdmin, financeiroController.pagarConta);
financeiroRoutes.delete("/contas/:id", requireAdmin, financeiroController.deletarConta);

financeiroRoutes.get("/faturamentos", requireAdmin, financeiroController.listarFaturamentos);
financeiroRoutes.patch("/faturamentos/:id/receber", requireAdmin, financeiroController.receberFaturamento);
