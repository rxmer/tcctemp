import { Router } from "express";
import * as chatbotController from "./chatbot.controller.js";
import { authenticate, requireAdmin } from "../middleware/auth.js";

export const chatbotRoutes = Router();

chatbotRoutes.use(authenticate);

chatbotRoutes.get("/status", chatbotController.getStatus);
chatbotRoutes.post("/connect", requireAdmin, chatbotController.connect);
chatbotRoutes.post("/disconnect", requireAdmin, chatbotController.disconnect);
chatbotRoutes.get("/sessions", chatbotController.listSessions);
chatbotRoutes.get("/sessions/:id", chatbotController.getSession);
chatbotRoutes.post("/sessions/:id/reply", requireAdmin, chatbotController.sendReply);
chatbotRoutes.post("/sessions/:id/reset", requireAdmin, chatbotController.resetSession);
