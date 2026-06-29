import { Router } from "express";
import * as datasBloqueadasController from "../controllers/datas-bloqueadas.controller.js";
import { authenticate, requireAdmin } from "../middleware/auth.js";

export const datasBloqueadasRoutes = Router();

datasBloqueadasRoutes.use(authenticate, requireAdmin);

datasBloqueadasRoutes.get("/", datasBloqueadasController.listar);
datasBloqueadasRoutes.post("/", datasBloqueadasController.criar);
datasBloqueadasRoutes.delete("/:id", datasBloqueadasController.remover);
datasBloqueadasRoutes.get("/verificar", datasBloqueadasController.verificar);
