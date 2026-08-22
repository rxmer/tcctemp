import { Router } from "express";
import * as configuracaoController from "../controllers/configuracao-empresa.controller.js";
import { authenticate, requireAdmin } from "../middleware/auth.js";
import { validateBody } from "../middleware/validate.js";

export const configuracaoEmpresaRoutes = Router();

configuracaoEmpresaRoutes.use(authenticate, requireAdmin);

configuracaoEmpresaRoutes.get("/", configuracaoController.buscar);
configuracaoEmpresaRoutes.put("/", validateBody("salvarConfiguracao"), configuracaoController.salvar);
