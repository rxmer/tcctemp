import { Router } from "express";
import { authRoutes } from "./auth.routes.js";
import { funcionariosRoutes } from "./funcionarios.routes.js";
import { servicosRoutes } from "./servicos.routes.js";

export const routes = Router();

routes.use("/auth", authRoutes);
routes.use("/funcionarios", funcionariosRoutes);
routes.use("/servicos", servicosRoutes);
