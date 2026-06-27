import { Router } from "express";
import * as relatoriosController from "../controllers/relatorios.controller.js";
import { authenticate } from "../middleware/auth.js";

export const relatoriosRoutes = Router();

relatoriosRoutes.use(authenticate);

relatoriosRoutes.get("/geral", relatoriosController.geral);
relatoriosRoutes.get("/agendamentos", relatoriosController.agendamentos);
relatoriosRoutes.get("/servicos", relatoriosController.servicos);
relatoriosRoutes.get("/financeiro", relatoriosController.financeiro);
relatoriosRoutes.get("/status", relatoriosController.status);
relatoriosRoutes.get("/exportar/excel", relatoriosController.exportarExcel);
relatoriosRoutes.get("/exportar/pdf", relatoriosController.exportarPDF);
