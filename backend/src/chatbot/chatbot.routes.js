import { Router } from "express";
import * as chatbotController from "./chatbot.controller.js";
import { authenticate, requireAdmin } from "../middleware/auth.js";
import { validateBody } from "../middleware/validate.js";

export const chatbotRoutes = Router();

chatbotRoutes.use(authenticate);

chatbotRoutes.get("/status", requireAdmin, chatbotController.getStatus);
chatbotRoutes.post("/connect", requireAdmin, chatbotController.connect);
chatbotRoutes.post("/disconnect", requireAdmin, chatbotController.disconnect);
chatbotRoutes.get("/sessions", requireAdmin, chatbotController.listSessions);
chatbotRoutes.get("/sessions/unread", requireAdmin, chatbotController.getUnreadCount);
chatbotRoutes.get("/sessions/:id", requireAdmin, chatbotController.getSession);
chatbotRoutes.get("/sessions/:id/mensagens", requireAdmin, chatbotController.getMensagens);
chatbotRoutes.post("/sessions/:id/reply", requireAdmin, validateBody("enviarRespostaChatbot"), chatbotController.sendReply);
chatbotRoutes.post("/sessions/:id/reset", requireAdmin, chatbotController.resetSession);
