import { Router } from "express";
import * as agendamentoController from "../controllers/agendamentos.controller.js";
import { authenticate, requireAdmin } from "../middleware/auth.js";
import { validateBody } from "../middleware/validate.js";

export const agendamentoRoutes = Router();

agendamentoRoutes.use(authenticate);

agendamentoRoutes.post("/", validateBody("criarAgendamento"), agendamentoController.criar);
agendamentoRoutes.get("/", agendamentoController.listar);
agendamentoRoutes.put("/:id", validateBody("atualizarAgendamento"), agendamentoController.atualizar);
agendamentoRoutes.delete("/:id", requireAdmin, agendamentoController.deletar);
