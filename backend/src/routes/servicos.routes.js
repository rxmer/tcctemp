import { Router } from "express";
import * as servicosController from "../controllers/servicos.controller.js";
import { authenticate } from "../middleware/auth.js";

export const servicosRoutes = Router();

servicosRoutes.use(authenticate);

servicosRoutes.post("/", servicosController.criar);
servicosRoutes.get("/", servicosController.listar);
servicosRoutes.put("/:id", servicosController.atualizar);
servicosRoutes.delete("/:id", servicosController.deletar);
servicosRoutes.patch("/:id/toggle", servicosController.toggleAtivo);
