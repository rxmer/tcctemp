import { Router } from "express";
import { authenticate } from "../middleware/auth.js";
import * as dashboardController from "../controllers/dashboard.controller.js";

export const dashboardRoutes = Router();

dashboardRoutes.use(authenticate);

dashboardRoutes.get("/resumo", dashboardController.resumo);
