import { Router } from "express";
import * as authController from "../controllers/auth.controller.js";
import { authenticate } from "../middleware/auth.js";

export const authRoutes = Router();

authRoutes.post("/signup", authController.signup);
authRoutes.get("/me", authenticate, authController.me);
