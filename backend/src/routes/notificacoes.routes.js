import { Router } from "express";
import * as notificacoesController from "../controllers/notificacoes.controller.js";
import { authenticate, requireAdmin } from "../middleware/auth.js";

export const notificacoesRoutes = Router();

notificacoesRoutes.use(authenticate);

notificacoesRoutes.get("/", notificacoesController.listar);
notificacoesRoutes.get("/contagem", notificacoesController.contar);
notificacoesRoutes.patch("/:id/lida", notificacoesController.marcarLida);
notificacoesRoutes.post("/marcar-todas-lidas", notificacoesController.marcarTodasLidas);
