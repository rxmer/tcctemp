import { Router } from "express";
import * as agendamentoController from "../controllers/agendamentos.controller.js";
import { authenticate, requireAdmin } from "../middleware/auth.js";

export const agendamentoRoutes = Router();

agendamentoRoutes.use(authenticate);

agendamentoRoutes.post("/", requireAdmin, agendamentoController.criar);
agendamentoRoutes.get("/", agendamentoController.listar);
agendamentoRoutes.put("/:id", agendamentoController.atualizar);
agendamentoRoutes.delete("/:id", requireAdmin, agendamentoController.deletar);
