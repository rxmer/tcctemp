import { Router } from "express";
import * as chatbotController from "./chatbot.controller.js";
import { authenticate } from "../middleware/auth.js";

export const chatbotRoutes = Router();

chatbotRoutes.use(authenticate);

chatbotRoutes.get("/status", chatbotController.getStatus);
chatbotRoutes.post("/connect", chatbotController.connect);
chatbotRoutes.post("/disconnect", chatbotController.disconnect);
chatbotRoutes.get("/sessions", chatbotController.listSessions);
chatbotRoutes.get("/sessions/:id", chatbotController.getSession);
chatbotRoutes.post("/sessions/:id/reply", chatbotController.sendReply);
chatbotRoutes.post("/sessions/:id/reset", chatbotController.resetSession);
