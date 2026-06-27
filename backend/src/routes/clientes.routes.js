import { Router } from "express";
import * as clienteController from "../controllers/clientes.controller.js";
import { authenticate } from "../middleware/auth.js";

export const clienteRoutes = Router();

clienteRoutes.use(authenticate);

clienteRoutes.post("/", clienteController.criar);
clienteRoutes.get("/", clienteController.listar);
clienteRoutes.put("/:id", clienteController.atualizar);
clienteRoutes.delete("/:id", clienteController.deletar);
