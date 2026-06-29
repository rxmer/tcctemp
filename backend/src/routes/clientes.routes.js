import { Router } from "express";
import * as clienteController from "../controllers/clientes.controller.js";
import { authenticate, requireAdmin } from "../middleware/auth.js";
import { validateBody } from "../middleware/validate.js";

export const clienteRoutes = Router();

clienteRoutes.use(authenticate);

clienteRoutes.post("/", requireAdmin, validateBody("criarCliente"), clienteController.criar);
clienteRoutes.get("/", clienteController.listar);
clienteRoutes.put("/:id", requireAdmin, clienteController.atualizar);
clienteRoutes.delete("/:id", requireAdmin, clienteController.deletar);
