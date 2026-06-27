import { Router } from "express";
import * as financeiroController from "../controllers/financeiro.controller.js";
import { authenticate } from "../middleware/auth.js";

export const financeiroRoutes = Router();

financeiroRoutes.use(authenticate);

financeiroRoutes.get("/resumo", financeiroController.resumo);

financeiroRoutes.get("/contas", financeiroController.listarContas);
financeiroRoutes.post("/contas", financeiroController.criarConta);
financeiroRoutes.put("/contas/:id", financeiroController.atualizarConta);
financeiroRoutes.patch("/contas/:id/pagar", financeiroController.pagarConta);
financeiroRoutes.delete("/contas/:id", financeiroController.deletarConta);

financeiroRoutes.get("/faturamentos", financeiroController.listarFaturamentos);
financeiroRoutes.patch("/faturamentos/:id/receber", financeiroController.receberFaturamento);
