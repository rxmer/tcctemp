import { Router } from "express";
import rateLimit from "express-rate-limit";
import * as authController from "../controllers/auth.controller.js";
import { authenticate } from "../middleware/auth.js";
import { validateBody } from "../middleware/validate.js";

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { error: "Muitas tentativas. Tente novamente em 15 minutos." },
  standardHeaders: true,
  legacyHeaders: false,
});

export const authRoutes = Router();

authRoutes.post("/signup", authLimiter, validateBody("criarConta"), authController.signup);
authRoutes.get("/me", authenticate, authController.me);
