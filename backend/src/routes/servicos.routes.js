import { Router } from "express";
import * as servicosController from "../controllers/servicos.controller.js";
import { authenticate, requireAdmin } from "../middleware/auth.js";
import { validateBody } from "../middleware/validate.js";

export const servicosRoutes = Router();

servicosRoutes.use(authenticate);

servicosRoutes.post("/", requireAdmin, servicosController.criar);
servicosRoutes.get("/", servicosController.listar);
servicosRoutes.put("/:id", requireAdmin, validateBody("atualizarServico"), servicosController.atualizar);
servicosRoutes.delete("/:id", requireAdmin, servicosController.deletar);
servicosRoutes.patch("/:id/toggle", requireAdmin, servicosController.toggleAtivo);
