import { Router } from "express";
import * as configuracaoController from "../controllers/configuracao-empresa.controller.js";
import { authenticate, requireAdmin } from "../middleware/auth.js";

export const configuracaoEmpresaRoutes = Router();

configuracaoEmpresaRoutes.use(authenticate, requireAdmin);

configuracaoEmpresaRoutes.get("/", configuracaoController.buscar);
configuracaoEmpresaRoutes.put("/", configuracaoController.salvar);
