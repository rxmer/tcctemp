import { Router } from "express";
import multer from "multer";
import * as chatbotController from "./chatbot.controller.js";
import { authenticate } from "../middleware/auth.js";
import { validateBody } from "../middleware/validate.js";

export const chatbotRoutes = Router();

const uploadAudio = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 25 * 1024 * 1024 },
});

chatbotRoutes.use(authenticate);

chatbotRoutes.get("/status", chatbotController.getStatus);
chatbotRoutes.post("/connect", chatbotController.connect);
chatbotRoutes.post("/disconnect", chatbotController.disconnect);
chatbotRoutes.get("/sessions", chatbotController.listSessions);
chatbotRoutes.get("/sessions/unread", chatbotController.getUnreadCount);
chatbotRoutes.get("/sessions/:id", chatbotController.getSession);
chatbotRoutes.get("/sessions/:id/mensagens", chatbotController.getMensagens);
chatbotRoutes.post("/sessions/:id/reply", validateBody("enviarRespostaChatbot"), chatbotController.sendReply);
chatbotRoutes.post("/sessions/:id/reply-audio", uploadAudio.single("audio"), chatbotController.sendReplyAudio);
chatbotRoutes.post("/sessions/:id/reset", chatbotController.resetSession);
