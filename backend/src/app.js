import "express-async-errors";
import express from "express";
import cors from "cors";
import helmet from "helmet";
import { routes } from "./routes/index.js";
import { errorHandler } from "./middleware/errorHandler.js";

const app = express();

app.use(helmet());
app.use(cors({ origin: process.env.CORS_ORIGIN ?? "http://localhost:5173" }));
app.use(express.json());

app.use("/api", routes);

app.get("/health", (_req, res) => res.json({ ok: true }));

app.use(errorHandler);

export { app };
